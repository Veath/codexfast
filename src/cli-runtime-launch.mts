import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CdpConnection,
  cdpCommandWithTimeout,
  waitForRuntimeBrowserConnection,
} from "./cli-cdp.mts";
import type { CodexfastContext } from "./cli-context.mts";
import { printExitBlock, printExitCode } from "./cli-output.mts";
import {
  applyRuntimePatchesToResponseBodyWithSource,
  isRuntimeJavaScriptResource,
  type RuntimePatchResult,
} from "./cli-runtime-patcher.mts";
import {
  asError,
  debugRuntime,
  printLine,
  resolveCommand,
  run,
  sleep,
} from "./cli-utils.mts";

type FetchHeader = {
  name: string;
  value: string;
};

type FetchRequestPausedParams = {
  requestId: string;
  request: {
    url: string;
  };
  responseHeaders?: FetchHeader[];
  responseStatusCode?: number;
};

type TargetAttachedToTargetParams = {
  sessionId: string;
  targetInfo: {
    type: string;
    url: string;
  };
  waitingForDebugger?: boolean;
};

type RuntimePatchSessionHandle = {
  patchedLabels: string[];
  close: () => void;
  lost: Promise<Error>;
};

type RuntimeFetchPatchOutcome = {
  labels: string[];
  sawJavaScript: boolean;
};

type CodexRunningCheck =
  | { ok: true; running: boolean }
  | { ok: false; message: string };

export type RuntimeLaunchOptions = {
  context: CodexfastContext;
  patcherSource: string;
  supportedAppVersionKeys: string;
  printActionHeader: (action: string) => void;
  removeLegacyWatcherFiles: (options?: {
    quietLaunchctl?: boolean;
    reportRemoved?: boolean;
  }) => boolean;
};

const runtimePatchInitialTargetTimeoutMs = 45_000;
const runtimePatchNoTargetIdleMs = 2_500;
const runtimePatchSettleMs = 750;
const runtimePatchInitialLoadSettleMs = 1_000;
const runtimePatchHeartbeatIntervalMs = 5_000;
const runtimePatchHeartbeatTimeoutMs = 2_000;
const runtimePatchReconnectMaxAttempts = 3;
const runtimePatchReconnectDelayMs = 1_000;
const runtimePatchDefaultRequiredInitialLabels = ["Plugins access"];
const runtimePatchNoPluginsAccessRequiredVersionKeys = new Set([
  "26.601.21317+3511",
  "26.602.30954+3575",
  "26.602.40724+3593",
  "26.602.71036+3685",
  "26.608.12217+3722",
  "26.609.30741+3808",
  "26.609.41114+3888",
  "26.609.71450+3965",
  "26.611.61049+3996",
  "26.611.61753+4008",
  "26.611.62324+4028",
]);
const runtimePatchRequiredInitialReloadMaxAttempts = 1;

function checkCodexRunning(): CodexRunningCheck {
  if (process.env.CODEXFAST_TEST_CODEX_RUNNING === "1") {
    return { ok: true, running: true };
  }

  const pgrepBin = resolveCommand("pgrep");
  if (!pgrepBin) {
    return {
      ok: false,
      message:
        "Cannot determine whether Codex.app is running because pgrep was not found.",
    };
  }

  const result = run(pgrepBin, ["-x", "Codex"]);
  if (result.status === 0) {
    return { ok: true, running: true };
  }
  if (result.status === 1) {
    return { ok: true, running: false };
  }
  return {
    ok: false,
    message: `Cannot determine whether Codex.app is running because pgrep failed with exit code ${result.status}.`,
  };
}

function randomDebugPort(): number {
  return 40_000 + (randomBytes(2).readUInt16BE(0) % 20_000);
}

function codexExecutablePath(context: CodexfastContext): string {
  return join(context.paths.bundle, "Contents", "MacOS", "Codex");
}

function launchCodexProcess(
  context: CodexfastContext,
  debugPort: number,
): ChildProcess {
  const executable = codexExecutablePath(context);
  if (!existsSync(executable)) {
    throw new Error(`Codex executable not found: ${executable}`);
  }

  const child = spawn(
    executable,
    [
      `--remote-debugging-port=${debugPort}`,
      "--remote-debugging-address=127.0.0.1",
    ],
    {
      detached: true,
      stdio: "ignore",
      env: process.env,
    },
  );
  child.on("error", () => undefined);
  child.unref();
  return child;
}

function terminateRuntimeLaunchProcess(child: ChildProcess): void {
  if (!child.pid || child.killed) {
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill();
  }
}

function responseHeadersForFulfill(
  headers: FetchHeader[] | undefined,
): FetchHeader[] {
  const forwarded: FetchHeader[] = [];
  for (const header of headers ?? []) {
    const name = header.name.toLowerCase();
    if (name === "content-type" || name === "charset") {
      forwarded.push({ name: header.name, value: header.value });
    }
  }
  if (
    !forwarded.some((header) => header.name.toLowerCase() === "content-type")
  ) {
    forwarded.push({
      name: "content-type",
      value: "application/javascript; charset=utf-8",
    });
  }
  return forwarded;
}

async function continueFetchRequest(
  cdp: CdpConnection,
  requestId: string,
  sessionId?: string,
): Promise<void> {
  await cdp.send("Fetch.continueRequest", { requestId }, sessionId);
}

async function handleFetchRequestPaused(
  cdp: CdpConnection,
  patcherSource: string,
  params: FetchRequestPausedParams,
  sessionId?: string,
): Promise<RuntimeFetchPatchOutcome> {
  const resourceUrl = params.request.url;
  if (!isRuntimeJavaScriptResource(resourceUrl)) {
    await continueFetchRequest(cdp, params.requestId, sessionId);
    return { labels: [], sawJavaScript: false };
  }
  debugRuntime(`paused ${resourceUrl}`);

  let bodyResult: { body?: string; base64Encoded?: boolean };
  try {
    bodyResult = await cdp.send("Fetch.getResponseBody", {
      requestId: params.requestId,
    }, sessionId);
  } catch {
    debugRuntime(`getResponseBody failed ${resourceUrl}`);
    await continueFetchRequest(cdp, params.requestId, sessionId);
    return { labels: [], sawJavaScript: true };
  }

  if (typeof bodyResult.body !== "string") {
    debugRuntime(`missing body ${resourceUrl}`);
    await continueFetchRequest(cdp, params.requestId, sessionId);
    return { labels: [], sawJavaScript: true };
  }

  const body = bodyResult.base64Encoded
    ? Buffer.from(bodyResult.body, "base64").toString("utf8")
    : bodyResult.body;
  let patchResult: RuntimePatchResult;
  try {
    patchResult = applyRuntimePatchesToResponseBodyWithSource(
      patcherSource,
      resourceUrl,
      body,
    );
  } catch (error) {
    debugRuntime(`patch failed ${resourceUrl}: ${asError(error).message}`);
    await continueFetchRequest(cdp, params.requestId, sessionId);
    return { labels: [], sawJavaScript: true };
  }
  const labels = [
    ...patchResult.patchedLabels,
    ...patchResult.alreadyPatchedLabels,
  ];
  if (patchResult.matchedLabels.length > 0) {
    debugRuntime(
      `matched ${resourceUrl}: ${patchResult.matchedLabels.join(", ")}`,
    );
  }

  if (patchResult.content === body) {
    await continueFetchRequest(cdp, params.requestId, sessionId);
    return { labels, sawJavaScript: true };
  }

  await cdp.send("Fetch.fulfillRequest", {
    requestId: params.requestId,
    responseCode: params.responseStatusCode ?? 200,
    responseHeaders: responseHeadersForFulfill(params.responseHeaders),
    body: Buffer.from(patchResult.content, "utf8").toString("base64"),
  }, sessionId);
  return { labels, sawJavaScript: true };
}

function runtimePatchSessionLostMessage(error: Error): string {
  return `Runtime patch session lost after ${runtimePatchReconnectMaxAttempts} reconnect attempts: ${error.message}`;
}

function printRuntimePatchSessionLost(error: Error): void {
  printLine(error.message);
  printLine("Codex.app will keep running without further runtime patching.");
  printLine(
    "Lazy-loaded features that were not patched before this point may stay unavailable until you fully quit Codex and relaunch with codexfast.",
  );
}

function printRuntimeLaunchReady(patchedLabels: string[]): void {
  printLine("Patched targets:");
  for (const label of patchedLabels) {
    printLine(`  ${label}`);
  }
  printLine("");
  printLine("Runtime launch completed.");
  printLine("Keep this codexfast launch process running while you use Codex.");
  printLine("Quit Codex to end the runtime patch session.");
}

function waitForRuntimeInitialPageLoad(cdp: CdpConnection): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const resolveOnce = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve();
    };

    timeout = setTimeout(resolveOnce, runtimePatchInitialLoadSettleMs);
    cdp.on("Page.loadEventFired", resolveOnce);
    cdp.on("Page.frameStoppedLoading", resolveOnce);
  });
}

function missingRuntimePatchRequiredInitialLabels(
  observedLabels: Set<string>,
  requiredLabels: string[],
): string[] {
  return requiredLabels.filter(
    (label) => !observedLabels.has(label),
  );
}

function runtimePatchRequiredInitialLabelsForVersion(
  versionKey: string,
): string[] {
  if (runtimePatchNoPluginsAccessRequiredVersionKeys.has(versionKey)) {
    return [];
  }
  return runtimePatchDefaultRequiredInitialLabels;
}

async function enableRuntimePatchInterception(
  cdp: CdpConnection,
  options: { sessionId: string; waitForInitialLoad: boolean; reload: boolean },
): Promise<void> {
  await cdp.send("Fetch.enable", {
    patterns: [
      {
        urlPattern: "app://*/assets/*.js",
        requestStage: "Response",
      },
      {
        urlPattern: "app://*/webview/assets/*.js",
        requestStage: "Response",
      },
    ],
  }, options.sessionId);
  debugRuntime("Fetch.enable ok");
  if (options.waitForInitialLoad || options.reload) {
    await cdp.send("Page.enable", undefined, options.sessionId);
    debugRuntime("Page.enable ok");
  }
  if (options.waitForInitialLoad) {
    await waitForRuntimeInitialPageLoad(cdp);
    debugRuntime("initial page load settled");
  }
  if (options.reload) {
    await cdp.send("Page.reload", { ignoreCache: true }, options.sessionId);
    debugRuntime("Page.reload ok");
  }
}

async function enableRuntimePatchAutoAttach(cdp: CdpConnection): Promise<void> {
  await cdp.send("Target.setAutoAttach", {
    autoAttach: true,
    waitForDebuggerOnStart: true,
    flatten: true,
  });
  debugRuntime("Target.setAutoAttach ok");
}

async function startRuntimePatchSession(
  debugPort: number,
  patcherSource: string,
  requiredInitialLabels: string[],
): Promise<RuntimePatchSessionHandle> {
  let cdp = await waitForRuntimeBrowserConnection(debugPort);
  const observedLabels = new Set<string>();
  const pausedRequestHandlers = new Set<Promise<void>>();
  const attachedPageSessions = new Set<string>();
  let activePageSessionId: string | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let failSession: (error: Error) => void = () => undefined;
  let keepSessionOpen = false;
  let initialCompleted = false;
  let closed = false;
  let reconnecting = false;
  let connectionGeneration = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let resolveLost: (error: Error) => void = () => undefined;
  let markInitialObserved: () => void = () => undefined;
  let markInitialJavaScriptTraffic: () => void = () => undefined;
  const lost = new Promise<Error>((resolve) => {
    resolveLost = resolve;
  });

  const stopHeartbeat = (): void => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const markSessionLost = (error: Error): void => {
    if (closed) {
      return;
    }
    closed = true;
    stopHeartbeat();
    cdp.close();
    resolveLost(error);
  };

  const reconnectRuntimePatchSession = async (reason: Error): Promise<void> => {
    if (closed || reconnecting) {
      return;
    }
    reconnecting = true;
    cdp.close();
    let lastError = reason;

    for (
      let attempt = 1;
      attempt <= runtimePatchReconnectMaxAttempts;
      attempt += 1
    ) {
      if (closed) {
        reconnecting = false;
        return;
      }
      if (attempt > 1) {
        await sleep(runtimePatchReconnectDelayMs);
      }
      printLine(
        `Runtime patch session reconnecting (${attempt}/${runtimePatchReconnectMaxAttempts})...`,
      );
      try {
        const nextCdp = await waitForRuntimeBrowserConnection(debugPort);
        connectionGeneration += 1;
        cdp = nextCdp;
        registerRuntimeFetchHandler(connectionGeneration);
        registerRuntimeTargetHandler(connectionGeneration);
        await enableRuntimePatchAutoAttach(cdp);
        printLine("Runtime patch session reconnected.");
        reconnecting = false;
        return;
      } catch (error) {
        lastError = asError(error);
        cdp.close();
      }
    }

    reconnecting = false;
    markSessionLost(new Error(runtimePatchSessionLostMessage(lastError)));
  };

  const handleConnectionFailure = (generation: number, error: Error): void => {
    if (closed || generation !== connectionGeneration) {
      return;
    }
    if (!initialCompleted) {
      failSession(error);
      return;
    }
    void reconnectRuntimePatchSession(error);
  };

  const registerRuntimeFetchHandler = (generation: number): void => {
    const attachedCdp = cdp;
    attachedCdp.onEventError((error) => {
      handleConnectionFailure(generation, error);
    });
    attachedCdp.on("Fetch.requestPaused", (params: unknown, message) => {
      const task = handleFetchRequestPaused(
        attachedCdp,
        patcherSource,
        params as FetchRequestPausedParams,
        message.sessionId,
      ).then((outcome) => {
        const { labels } = outcome;
        let sawNewLabel = false;
        for (const label of labels) {
          if (!observedLabels.has(label)) {
            sawNewLabel = true;
          }
          observedLabels.add(label);
        }
        if (!initialCompleted && labels.length > 0) {
          markInitialObserved();
        } else if (!initialCompleted && outcome.sawJavaScript) {
          markInitialJavaScriptTraffic();
        }
        if (initialCompleted && sawNewLabel) {
          debugRuntime(
            `patched labels now active: ${[...observedLabels].join(", ")}`,
          );
        }
      });
      pausedRequestHandlers.add(task);
      task.then(
        () => pausedRequestHandlers.delete(task),
        () => pausedRequestHandlers.delete(task),
      );
      return task;
    });
  };

  const registerRuntimeTargetHandler = (generation: number): void => {
    const attachedCdp = cdp;
    attachedCdp.on("Target.attachedToTarget", async (params: unknown) => {
      if (closed || generation !== connectionGeneration) {
        return;
      }
      const attached = params as TargetAttachedToTargetParams;
      const targetType = attached.targetInfo?.type ?? "";
      const targetUrl = attached.targetInfo?.url ?? "";
      if (targetType === "browser") {
        return;
      }
      if (targetType !== "page" && !targetUrl.startsWith("app://")) {
        if (attached.waitingForDebugger) {
          await attachedCdp.send(
            "Runtime.runIfWaitingForDebugger",
            undefined,
            attached.sessionId,
          );
        }
        return;
      }

      activePageSessionId = attached.sessionId;
      attachedPageSessions.add(attached.sessionId);
      debugRuntime(
        `attached target type=${targetType} url=${targetUrl || "<pending>"} session=${attached.sessionId}`,
      );
      await enableRuntimePatchInterception(attachedCdp, {
        sessionId: attached.sessionId,
        waitForInitialLoad: false,
        reload: !attached.waitingForDebugger,
      });
      if (attached.waitingForDebugger) {
        await attachedCdp.send(
          "Runtime.runIfWaitingForDebugger",
          undefined,
          attached.sessionId,
        );
        debugRuntime("Runtime.runIfWaitingForDebugger ok");
      }
    });
    attachedCdp.on("Target.detachedFromTarget", (params: unknown) => {
      const detached = params as { sessionId?: string };
      if (!detached.sessionId) {
        return;
      }
      attachedPageSessions.delete(detached.sessionId);
      if (activePageSessionId === detached.sessionId) {
        activePageSessionId = [...attachedPageSessions][0] ?? null;
      }
    });
  };

  const startHeartbeat = (): void => {
    heartbeatTimer = setInterval(() => {
      if (closed || reconnecting) {
        return;
      }
      if (cdp.isClosed()) {
        void reconnectRuntimePatchSession(
          new Error("CDP WebSocket connection closed."),
        );
        return;
      }
      void cdpCommandWithTimeout(
        cdp.send("Browser.getVersion"),
        runtimePatchHeartbeatTimeoutMs,
        "Timed out waiting for CDP heartbeat.",
      ).catch((error: unknown) => {
        void reconnectRuntimePatchSession(asError(error));
      });
    }, runtimePatchHeartbeatIntervalMs);
  };

  try {
    const initialSession = new Promise<string[]>((resolve, reject) => {
      let hardTimeout: ReturnType<typeof setTimeout> | null = null;
      let noTargetIdleTimer: ReturnType<typeof setTimeout> | null = null;
      let completed = false;
      let finishStarted = false;
      let sawInitialJavaScript = false;

      const clearSessionTimers = (): void => {
        if (settleTimer) {
          clearTimeout(settleTimer);
          settleTimer = null;
        }
        if (hardTimeout) {
          clearTimeout(hardTimeout);
          hardTimeout = null;
        }
        if (noTargetIdleTimer) {
          clearTimeout(noTargetIdleTimer);
          noTargetIdleTimer = null;
        }
      };

      const fail = (error: Error): void => {
        if (completed) {
          return;
        }
        completed = true;
        clearSessionTimers();
        reject(error);
      };
      failSession = fail;

      const finish = (): void => {
        if (completed || finishStarted) {
          return;
        }
        finishStarted = true;
        clearSessionTimers();
        void (async () => {
          try {
            while (pausedRequestHandlers.size > 0) {
              await Promise.all([...pausedRequestHandlers]);
            }
          } catch (error) {
            fail(asError(error));
            return;
          }
          if (completed) {
            return;
          }
          if (!sawInitialJavaScript) {
            fail(
              new Error(
                "Runtime patch interception timed out before JavaScript responses were observed.",
              ),
            );
            return;
          }
          const missingRequiredLabels =
            missingRuntimePatchRequiredInitialLabels(
              observedLabels,
              requiredInitialLabels,
            );
          if (missingRequiredLabels.length > 0) {
            const retryLine =
              requiredInitialReloadAttempts === 1
                ? "Retried renderer reload 1 time while waiting for required targets."
                : `Retried renderer reload ${requiredInitialReloadAttempts} times while waiting for required targets.`;
            printLine(retryLine);
            fail(
              new Error(
                `Runtime patch interception did not observe required targets: ${missingRequiredLabels.join(", ")}.`,
              ),
            );
            return;
          }
          completed = true;
          initialCompleted = true;
          resolve([...observedLabels]);
        })();
      };
      let requiredInitialReloadAttempts = 0;

      const retryInitialTargetLoad = (): void => {
        if (
          completed ||
          finishStarted ||
          missingRuntimePatchRequiredInitialLabels(
            observedLabels,
            requiredInitialLabels,
          ).length === 0
        ) {
          return;
        }
        if (
          requiredInitialReloadAttempts >=
          runtimePatchRequiredInitialReloadMaxAttempts
        ) {
          finish();
          return;
        }
        requiredInitialReloadAttempts += 1;
        debugRuntime(
          `retrying renderer reload for required runtime targets (${requiredInitialReloadAttempts}/${runtimePatchRequiredInitialReloadMaxAttempts})`,
        );
        if (!activePageSessionId) {
          finish();
          return;
        }
        void cdp
          .send("Page.reload", { ignoreCache: true }, activePageSessionId)
          .then(() => {
            debugRuntime("Page.reload retry for required runtime targets ok");
          })
          .catch((error: unknown) => {
            fail(asError(error));
          });
      };

      const markJavaScriptTraffic = (): void => {
        if (completed || finishStarted) {
          return;
        }
        sawInitialJavaScript = true;
        if (
          missingRuntimePatchRequiredInitialLabels(
            observedLabels,
            requiredInitialLabels,
          ).length === 0
        ) {
          if (!settleTimer) {
            settleTimer = setTimeout(finish, runtimePatchSettleMs);
          }
          return;
        }
        if (noTargetIdleTimer) {
          clearTimeout(noTargetIdleTimer);
        }
        noTargetIdleTimer = setTimeout(
          retryInitialTargetLoad,
          runtimePatchNoTargetIdleMs,
        );
      };

      const markObserved = (): void => {
        if (completed || settleTimer) {
          return;
        }
        sawInitialJavaScript = true;
        if (
          missingRuntimePatchRequiredInitialLabels(
            observedLabels,
            requiredInitialLabels,
          ).length > 0
        ) {
          markJavaScriptTraffic();
          return;
        }
        if (noTargetIdleTimer) {
          clearTimeout(noTargetIdleTimer);
          noTargetIdleTimer = null;
        }
        settleTimer = setTimeout(finish, runtimePatchSettleMs);
      };
      markInitialObserved = markObserved;
      markInitialJavaScriptTraffic = markJavaScriptTraffic;

      hardTimeout = setTimeout(finish, runtimePatchInitialTargetTimeoutMs);
    });
    void initialSession.catch(() => undefined);
    registerRuntimeFetchHandler(connectionGeneration);
    registerRuntimeTargetHandler(connectionGeneration);

    try {
      await enableRuntimePatchAutoAttach(cdp);
    } catch (error) {
      failSession(asError(error));
    }

    const patchedLabels = await initialSession;
    keepSessionOpen = true;
    startHeartbeat();
    return {
      patchedLabels,
      close: () => {
        closed = true;
        stopHeartbeat();
        cdp.close();
      },
      lost,
    };
  } finally {
    if (!keepSessionOpen) {
      closed = true;
      stopHeartbeat();
      cdp.close();
    }
  }
}

function waitForRuntimePatchSession(
  debugPort: number,
  patcherSource: string,
  requiredInitialLabels: string[],
): Promise<RuntimePatchSessionHandle> {
  return startRuntimePatchSession(
    debugPort,
    patcherSource,
    requiredInitialLabels,
  );
}

function waitForRuntimeLaunchProcessExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exitCode: number): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(exitCode);
    };

    child.once("error", () => finish(1));
    child.once("exit", (code) => finish(code ?? 0));
  });
}

export async function runRuntimeLaunch(
  options: RuntimeLaunchOptions,
): Promise<number> {
  const {
    context,
    patcherSource,
    printActionHeader,
    removeLegacyWatcherFiles,
    supportedAppVersionKeys,
  } = options;

  printActionHeader("launch");

  if (!context.metadata.supported) {
    printLine("Runtime launch is blocked for this Codex.app version.");
    printLine(`Supported versions: ${supportedAppVersionKeys}`);
    return printExitBlock(1).exitCode;
  }

  if (
    !removeLegacyWatcherFiles({ quietLaunchctl: true, reportRemoved: true })
  ) {
    printLine("Failed to remove legacy auto-repair watcher.");
    return printExitBlock(1).exitCode;
  }

  const runningCheck = checkCodexRunning();
  if (!runningCheck.ok) {
    printLine(runningCheck.message);
    return printExitBlock(1).exitCode;
  }

  if (runningCheck.running) {
    printLine(
      "Codex.app is already running. Quit Codex.app before using runtime launch.",
    );
    return printExitBlock(1).exitCode;
  }

  if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS === "1") {
    printRuntimeLaunchReady(["Speed setting"]);
    if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SESSION_LOST === "1") {
      printRuntimePatchSessionLost(
        new Error(
          runtimePatchSessionLostMessage(
            new Error("simulated CDP heartbeat failure"),
          ),
        ),
      );
      return printExitBlock(0).exitCode;
    }
    return printExitCode(0).exitCode;
  }

  if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS === "1") {
    const requiredInitialLabels = runtimePatchRequiredInitialLabelsForVersion(
      context.metadata.versionKey,
    );
    const missingRequiredTargets = requiredInitialLabels.length > 0
      ? requiredInitialLabels.join(", ")
      : "none";
    printLine(
      "Retried renderer reload 1 time while waiting for required targets.",
    );
    printLine(
      `Runtime launch failed: Runtime patch interception did not observe required targets: ${missingRequiredTargets}.`,
    );
    return printExitBlock(1).exitCode;
  }

  let child: ChildProcess | null = null;
  let session: RuntimePatchSessionHandle | null = null;
  try {
    const debugPort = randomDebugPort();
    child = launchCodexProcess(context, debugPort);
    const childExit = waitForRuntimeLaunchProcessExit(child);
    session = await waitForRuntimePatchSession(
      debugPort,
      patcherSource,
      runtimePatchRequiredInitialLabelsForVersion(context.metadata.versionKey),
    );
    printRuntimeLaunchReady(session.patchedLabels);
    const outcome = await Promise.race([
      childExit.then((exitCode) => ({ type: "child-exit" as const, exitCode })),
      session.lost.then((error) => ({ type: "session-lost" as const, error })),
    ]);
    if (outcome.type === "session-lost") {
      session.close();
      session = null;
      printRuntimePatchSessionLost(outcome.error);
      return printExitBlock(0).exitCode;
    }
    session.close();
    session = null;
    printExitCode(outcome.exitCode);
    return outcome.exitCode;
  } catch (error) {
    if (session) {
      session.close();
      session = null;
    }
    if (child && !child.killed) {
      terminateRuntimeLaunchProcess(child);
    }
    printLine(`Runtime launch failed: ${asError(error).message}`);
  }

  return printExitBlock(1).exitCode;
}
