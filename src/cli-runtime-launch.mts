import { createServer } from "node:net";
import {
  CdpConnection,
  cdpCommandWithTimeout,
  waitForRuntimeBrowserConnection,
} from "./cli-cdp.mts";
import type { CodexfastContext } from "./cli-context.mts";
import { printExitBlock, printExitCode } from "./cli-output.mts";
import {
  getPlatformAdapter,
  type RuntimeLaunchProcess,
} from "./cli-platform.mts";
import {
  applyRuntimePatchesToResponseBodyWithSource,
  isRuntimeJavaScriptResource,
  type RuntimePatchResult,
} from "./cli-runtime-patcher.mts";
import {
  asError,
  debugRuntime,
  printLine,
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

type RuntimeLaunchProcessOutcome =
  | { type: "process-exit"; exitCode: number }
  | { type: "process-monitor-error"; error: Error };

type RuntimePatchSessionStartOutcome =
  | { type: "session-ready"; session: RuntimePatchSessionHandle }
  | { type: "session-start-error"; error: Error };

export type RuntimeLaunchOptions = {
  context: CodexfastContext;
  patcherSource: string;
  supportedAppVersionKeys: string;
  printActionHeader: (action: string) => void;
  removeLegacyWatcherFiles: (options?: {
    quietLaunchctl?: boolean;
    reportRemoved?: boolean;
  }) => boolean;
  allocateDebugPort?: () => Promise<number>;
};

const runtimePatchInitialTargetTimeoutMs = 45_000;
const runtimePatchInitialCommandTimeoutMs = 5_000;
const runtimePatchInitialHandlerDrainTimeoutMs = 5_000;
const runtimePatchNoTargetIdleMs = 2_500;
const runtimePatchSettleMs = 750;
const runtimePatchInitialLoadSettleMs = 1_000;
const runtimePatchHeartbeatIntervalMs = 5_000;
const runtimePatchHeartbeatTimeoutMs = 2_000;
const runtimePatchReconnectMaxAttempts = 3;
const runtimePatchReconnectDelayMs = 1_000;
const runtimePatchReconnectInterceptionTimeoutMs = 5_000;
const runtimePatchDefaultRequiredInitialLabels = ["Plugins access"];
const runtimePatchWindowsRequiredInitialLabels = [
  "Speed service tier allowance",
  "Speed service tier request allowance",
  "Speed service tier conversation fallback",
  "Composer Intelligence Speed menu",
  "Fast slash command",
];
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
  "26.616.31447+4133",
  "26.616.51431+4212",
  "26.616.71553+4265",
  "26.616.81150+4306",
  "26.623.31443+4441",
  "26.623.31921+4452",
  "26.623.42026+4514",
  "26.623.61825+4548",
  "26.623.70822+4559",
  "26.623.81905+4598",
  "26.623.101652+4674",
  "26.623.141536+4753",
  "26.707.31428+5059",
  "26.707.41301+5103",
  "26.707.61608+5200",
  "26.707.71524+5263",
  "26.707.72221+5307",
  "26.707.91948+5440",
  "26.715.21425+5488",
  "26.715.31925+5551",
  "26.715.52143+5591",
  "26.715.61943+5628",
  "26.715.70719+5650",
  "26.715.72028+5706",
  "26.715.72359+5718",
  "26.721.30844+5813",
  "26.721.31836+5828",
  "26.721.41059+5848",
  "26.721.81911+5973",
  "26.727.40816+6067",
  "26.727.51351+6119",
  "26.730.61309+6223",
  "26.730.61639+6234",
  "26.803.41515+6321",
]);
const runtimePatchNoPluginTargetsVersionKeys = new Set([
  "26.623.31443+4441",
  "26.623.31921+4452",
  "26.623.42026+4514",
  "26.623.61825+4548",
  "26.623.70822+4559",
  "26.623.81905+4598",
  "26.623.101652+4674",
  "26.623.141536+4753",
  "26.707.31428+5059",
  "26.707.41301+5103",
  "26.707.61608+5200",
  "26.707.71524+5263",
  "26.707.72221+5307",
  "26.707.91948+5440",
  "26.715.21425+5488",
  "26.715.31925+5551",
  "26.715.52143+5591",
  "26.715.61943+5628",
  "26.715.70719+5650",
  "26.715.72028+5706",
  "26.715.72359+5718",
  "26.721.30844+5813",
  "26.721.31836+5828",
  "26.721.41059+5848",
  "26.721.81911+5973",
  "26.727.40816+6067",
  "26.727.51351+6119",
  "26.730.61309+6223",
  "26.730.61639+6234",
  "26.803.41515+6321",
]);
const runtimePatchPluginTargetIdPrefixes = [
  "plugin",
  "plugins",
  "composer-plugin",
  "shared-plugin",
];
const runtimePatchAutomaticUpdateTargetIdPrefixes = [
  "disable-automatic-updates",
];
const runtimePatchModelTargetIdPrefixes = ["gpt"];
const runtimePatchOfficialGpt56ThresholdVersionKey = "26.707.41301+5103";
const runtimePatchOfficialGpt56TargetIds = new Set([
  "gpt5x-model-list-options",
  "gpt56-model-query-selector",
]);

function waitForRuntimePatchReconnectDelay(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, runtimePatchReconnectDelayMs);
    const onAbort = (): void => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
const runtimePatchRequiredInitialReloadMaxAttempts = 1;

function compareNumericVersionKeys(left: string, right: string): number {
  const parse = (value: string): { version: number[]; build: number } => {
    const [versionText, buildText = "0"] = value.split("+", 2);
    return {
      version: versionText.split(".").map((segment) => Number.parseInt(segment, 10)),
      build: Number.parseInt(buildText, 10),
    };
  };
  const leftValue = parse(left);
  const rightValue = parse(right);
  const length = Math.max(leftValue.version.length, rightValue.version.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftValue.version[index] ?? 0) -
      (rightValue.version[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return leftValue.build - rightValue.build;
}

function usesOfficialGpt56(versionKey: string): boolean {
  return compareNumericVersionKeys(
    versionKey,
    runtimePatchOfficialGpt56ThresholdVersionKey,
  ) >= 0;
}

export function allocateLoopbackDebugPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      callback();
    };
    server.unref();
    server.once("error", (error) => finish(() => reject(error)));
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      const address = server.address();
      if (!address || typeof address === "string" || address.port <= 0) {
        server.close(() => {
          finish(() => reject(new Error("Failed to reserve a loopback CDP port.")));
        });
        return;
      }
      const port = address.port;
      server.close((error) => {
        if (error) {
          finish(() => reject(error));
          return;
        }
        finish(() => resolve(port));
      });
    });
  });
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

function printRuntimePatchSessionLost(
  error: Error,
  platform: CodexfastContext["platform"] = "darwin",
  windowsAdmittedPathCleanupConfirmed = false,
): void {
  printLine(error.message);
  if (platform === "win32") {
    printLine(windowsAdmittedPathCleanupConfirmed
      ? "The verified launched Codex process exited and no admitted-path Codex process remains."
      : "Fail-closed cleanup could not be confirmed. Fully quit Codex manually before relaunching.");
    if (windowsAdmittedPathCleanupConfirmed) {
      printLine(
        "Differently named Codex helper processes are outside this experimental cleanup check; fully quit any remaining Codex helpers before relaunching.",
      );
    }
    printLine("Relaunch with codexfast to start a patched session.");
    return;
  }
  printLine(
    "Codex.app will be closed because runtime patching is no longer active.",
  );
  printLine(
    "Fully quit Codex and relaunch with codexfast to start a patched session.",
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

function confirmRuntimeLaunchExit(
  platformAdapter: ReturnType<typeof getPlatformAdapter>,
  launched: RuntimeLaunchProcess,
): boolean {
  launched.stopMonitoring();
  const confirmation = platformAdapter.confirmRuntimeLaunchProcessExited(
    launched,
  );
  if (confirmation.ok) {
    return true;
  }
  printLine(confirmation.message);
  printLine(
    "Fail-closed cleanup could not be confirmed. Fully quit Codex manually before retrying.",
  );
  return false;
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
  platform: CodexfastContext["platform"] = "darwin",
): string[] {
  if (platform === "win32") {
    return runtimePatchWindowsRequiredInitialLabels;
  }
  if (runtimePatchNoPluginsAccessRequiredVersionKeys.has(versionKey)) {
    return [];
  }
  return runtimePatchDefaultRequiredInitialLabels;
}

export function runtimePatcherSourceForVersion(
  patcherSource: string,
  versionKey: string,
  platform: CodexfastContext["platform"] = "darwin",
): string {
  const skipPluginTargets =
    platform === "win32" ||
    runtimePatchNoPluginTargetsVersionKeys.has(versionKey);
  const skipAutomaticUpdateTargets = platform === "win32";
  const skipModelTargets = platform === "win32";
  const skipOfficialGpt56Targets = usesOfficialGpt56(versionKey);
  if (
    !skipPluginTargets &&
    !skipAutomaticUpdateTargets &&
    !skipModelTargets &&
    !skipOfficialGpt56Targets
  ) {
    return patcherSource;
  }

  const skippedPrefixes = JSON.stringify([
    ...(skipPluginTargets ? runtimePatchPluginTargetIdPrefixes : []),
    ...(skipAutomaticUpdateTargets
      ? runtimePatchAutomaticUpdateTargetIdPrefixes
      : []),
    ...(skipModelTargets ? runtimePatchModelTargetIdPrefixes : []),
  ]);
  const skippedIds = JSON.stringify(
    skipOfficialGpt56Targets ? [...runtimePatchOfficialGpt56TargetIds] : [],
  );
  return `${patcherSource}
const __codexfastSkippedTargetIdPrefixes = ${skippedPrefixes};
const __codexfastSkippedTargetIds = new Set(${skippedIds});
const __codexfastShouldSkipTarget = (spec) => __codexfastSkippedTargetIds.has(spec.id) || __codexfastSkippedTargetIdPrefixes.some((prefix) => spec.id.startsWith(prefix));
applyRuntimePatchesToBody = function(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    if (__codexfastShouldSkipTarget(spec)) {
      continue;
    }
    const match = inspectSpec(content, spec);
    if (!match) {
      continue;
    }
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
      continue;
    }
    if (match.legacyPatched) {
      content = replaceContentOrThrow(content, spec.legacyPatchedSignature, spec.normalizeReplacement, spec.label);
      patchedLabels.push(spec.label);
      continue;
    }
    if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return { content, matchedLabels, patchedLabels, alreadyPatchedLabels };
};`;
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
      {
        urlPattern: "app://*/.vite/build/*.js",
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

export async function startRuntimePatchSession(
  debugPort: number,
  patcherSource: string,
  requiredInitialLabels: string[],
  signal?: AbortSignal,
): Promise<RuntimePatchSessionHandle> {
  let cdp = await waitForRuntimeBrowserConnection(debugPort, signal);
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
  let resolveReconnectInterceptionReady: (() => void) | null = null;
  let rejectReconnectInterceptionReady: ((error: Error) => void) | null = null;
  let reconnectInterceptionTasks: Set<Promise<void>> | null = null;
  let reconnectInterceptionError: Error | null = null;
  const reconnectController = new AbortController();
  let connectionGeneration = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let resolveLost: (error: Error) => void = () => undefined;
  let markInitialObserved: () => void = () => undefined;
  let markInitialJavaScriptTraffic: () => void = () => undefined;
  const lost = new Promise<Error>((resolve) => {
    resolveLost = resolve;
  });
  const abortSessionStart = (): void => {
    failSession(new Error("Runtime patch session start aborted."));
    cdp.close();
  };
  signal?.addEventListener("abort", abortSessionStart, { once: true });
  if (signal?.aborted) {
    abortSessionStart();
  }

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
    reconnectController.abort();
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
        await waitForRuntimePatchReconnectDelay(reconnectController.signal);
      }
      if (closed) {
        reconnecting = false;
        return;
      }
      printLine(
        `Runtime patch session reconnecting (${attempt}/${runtimePatchReconnectMaxAttempts})...`,
      );
      try {
        const nextCdp = await waitForRuntimeBrowserConnection(
          debugPort,
          reconnectController.signal,
        );
        if (closed || reconnectController.signal.aborted) {
          nextCdp.close();
          reconnecting = false;
          return;
        }
        connectionGeneration += 1;
        cdp = nextCdp;
        reconnectInterceptionError = null;
        reconnectInterceptionTasks = new Set<Promise<void>>();
        attachedPageSessions.clear();
        activePageSessionId = null;
        let reconnectInterceptionSettled = false;
        const reconnectInterceptionReady = new Promise<void>(
          (resolve, reject) => {
            resolveReconnectInterceptionReady = () => {
              if (reconnectInterceptionSettled) {
                return;
              }
              reconnectInterceptionSettled = true;
              resolve();
            };
            rejectReconnectInterceptionReady = (error: Error) => {
              if (reconnectInterceptionSettled) {
                return;
              }
              reconnectInterceptionSettled = true;
              reject(error);
            };
          },
        );
        void reconnectInterceptionReady.catch(() => undefined);
        const abortReconnectInterception = (): void => {
          rejectReconnectInterceptionReady?.(
            new Error("Runtime patch session reconnect aborted."),
          );
        };
        reconnectController.signal.addEventListener(
          "abort",
          abortReconnectInterception,
          { once: true },
        );
        if (reconnectController.signal.aborted) {
          abortReconnectInterception();
        }
        const clearReconnectInterceptionAttempt = (): void => {
          reconnectController.signal.removeEventListener(
            "abort",
            abortReconnectInterception,
          );
          resolveReconnectInterceptionReady = null;
          rejectReconnectInterceptionReady = null;
        };
        registerRuntimeFetchHandler(connectionGeneration);
        registerRuntimeTargetHandler(connectionGeneration);
        try {
          await cdpCommandWithTimeout(
            enableRuntimePatchAutoAttach(cdp),
            runtimePatchReconnectInterceptionTimeoutMs,
            "Timed out enabling renderer auto-attach after CDP reconnect.",
          );
          await cdpCommandWithTimeout(
            reconnectInterceptionReady,
            runtimePatchReconnectInterceptionTimeoutMs,
            "Timed out waiting for renderer interception after CDP reconnect.",
          );
          while ((reconnectInterceptionTasks?.size ?? 0) > 0) {
            const observedTasks = [...(reconnectInterceptionTasks ?? [])];
            reconnectInterceptionTasks?.clear();
            await Promise.all(observedTasks);
          }
          if (reconnectInterceptionError) {
            throw reconnectInterceptionError;
          }
          if (nextCdp.isClosed()) {
            throw new Error(
              "CDP WebSocket connection closed while restoring renderer interception.",
            );
          }
        } finally {
          clearReconnectInterceptionAttempt();
        }
        if (closed) {
          nextCdp.close();
          reconnectInterceptionTasks = null;
          reconnecting = false;
          return;
        }
        printLine("Runtime patch session reconnected.");
        reconnectInterceptionTasks = null;
        reconnecting = false;
        return;
      } catch (error) {
        // A renderer setup failure closes the reconnect CDP connection. That
        // close can reject an earlier, still-pending command such as
        // Target.setAutoAttach with a generic WebSocket-closed error. Preserve
        // the renderer failure that caused the close for this attempt.
        lastError = reconnectInterceptionTasks !== null &&
            reconnectInterceptionError
          ? reconnectInterceptionError
          : asError(error);
        cdp.close();
        reconnectInterceptionTasks = null;
        reconnectInterceptionError = null;
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
    if (reconnecting) {
      reconnectInterceptionError ??= error;
      rejectReconnectInterceptionReady?.(error);
      cdp.close();
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
    attachedCdp.on("Target.attachedToTarget", (params: unknown) => {
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
          return attachedCdp.send(
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
      const setupTask = (async (): Promise<void> => {
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
      })();
      if (
        reconnecting &&
        generation === connectionGeneration &&
        reconnectInterceptionTasks
      ) {
        const boundedSetupTask = cdpCommandWithTimeout(
          setupTask,
          runtimePatchReconnectInterceptionTimeoutMs,
          `Timed out restoring renderer interception for session ${attached.sessionId} after CDP reconnect.`,
        );
        reconnectInterceptionTasks.add(boundedSetupTask);
        resolveReconnectInterceptionReady?.();
        return boundedSetupTask;
      }
      return setupTask;
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
            await cdpCommandWithTimeout(
              (async (): Promise<void> => {
                while (pausedRequestHandlers.size > 0) {
                  await Promise.all([...pausedRequestHandlers]);
                }
              })(),
              runtimePatchInitialHandlerDrainTimeoutMs,
              "Timed out waiting for paused runtime fetch handlers during initial runtime patch setup.",
            );
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
      await cdpCommandWithTimeout(
        enableRuntimePatchAutoAttach(cdp),
        runtimePatchInitialCommandTimeoutMs,
        "Timed out enabling renderer auto-attach during initial runtime patch setup.",
      );
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
        reconnectController.abort();
        signal?.removeEventListener("abort", abortSessionStart);
        cdp.close();
      },
      lost,
    };
  } finally {
    if (!keepSessionOpen) {
      closed = true;
      stopHeartbeat();
      reconnectController.abort();
      signal?.removeEventListener("abort", abortSessionStart);
      cdp.close();
    }
  }
}

function waitForRuntimePatchSession(
  debugPort: number,
  patcherSource: string,
  requiredInitialLabels: string[],
  signal?: AbortSignal,
): Promise<RuntimePatchSessionHandle> {
  return startRuntimePatchSession(
    debugPort,
    patcherSource,
    requiredInitialLabels,
    signal,
  );
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
    allocateDebugPort = allocateLoopbackDebugPort,
  } = options;
  const platformAdapter = getPlatformAdapter(context.platform);

  printActionHeader("launch");

  if (!context.metadata.supported) {
    printLine(context.platform === "win32"
      ? "Runtime launch is blocked for this Codex Windows package version and architecture."
      : "Runtime launch is blocked for this Codex.app version.");
    printLine(context.platform === "win32"
      ? `Offline-validated experimental candidates: ${supportedAppVersionKeys}`
      : `Supported versions: ${supportedAppVersionKeys}`);
    return printExitBlock(1).exitCode;
  }

  if (
    !removeLegacyWatcherFiles({ quietLaunchctl: true, reportRemoved: true })
  ) {
    printLine("Failed to remove legacy auto-repair watcher.");
    return printExitBlock(1).exitCode;
  }

  const runningCheck = platformAdapter.checkCodexRunning(context);
  if (!runningCheck.ok) {
    printLine(runningCheck.message);
    return printExitBlock(1).exitCode;
  }

  if (runningCheck.running) {
    printLine(context.platform === "win32"
      ? "Codex is already running. Fully quit Codex before using runtime launch."
      : "Codex.app is already running. Quit Codex.app before using runtime launch.");
    return printExitBlock(1).exitCode;
  }

  const exercisePlatformLaunch =
    process.env.CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH === "1";
  if (
    process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS === "1" &&
    !exercisePlatformLaunch
  ) {
    printRuntimeLaunchReady(["Speed setting"]);
    if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SESSION_LOST === "1") {
      printRuntimePatchSessionLost(
        new Error(
          runtimePatchSessionLostMessage(
            new Error("simulated CDP heartbeat failure"),
          ),
        ),
        context.platform,
      );
      return printExitBlock(1).exitCode;
    }
    return printExitCode(0).exitCode;
  }

  if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS === "1") {
    const requiredInitialLabels = runtimePatchRequiredInitialLabelsForVersion(
      context.metadata.versionKey,
      context.platform,
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

  let launched: RuntimeLaunchProcess | null = null;
  let session: RuntimePatchSessionHandle | null = null;
  let processExitedBeforeSession = false;
  try {
    const debugPort = await allocateDebugPort();
    launched = platformAdapter.launchCodexProcess(context, debugPort);
    const processOutcome = launched.exited.then<
      RuntimeLaunchProcessOutcome,
      RuntimeLaunchProcessOutcome
    >(
      (exitCode) => ({ type: "process-exit", exitCode }),
      (error: unknown) => ({
        type: "process-monitor-error",
        error: asError(error),
      }),
    );
    if (
      exercisePlatformLaunch &&
      process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS === "1"
    ) {
      printRuntimeLaunchReady(["Speed setting"]);
      if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SESSION_LOST === "1") {
        launched.stopMonitoring();
        const termination = platformAdapter.terminateRuntimeLaunchProcess(
          launched,
        );
        if (!termination.ok) {
          printLine(termination.message);
        }
        printRuntimePatchSessionLost(
          new Error(
            runtimePatchSessionLostMessage(
              new Error("simulated CDP heartbeat failure"),
            ),
          ),
          context.platform,
          termination.ok,
        );
        return printExitBlock(1).exitCode;
      }
      if (
        process.env
          .CODEXFAST_TEST_RUNTIME_PROCESS_EXIT_AFTER_SESSION_READY === "1"
      ) {
        const readyProcessOutcome = await processOutcome;
        if (readyProcessOutcome.type === "process-monitor-error") {
          throw readyProcessOutcome.error;
        }
        if (!confirmRuntimeLaunchExit(platformAdapter, launched)) {
          return printExitBlock(1).exitCode;
        }
        printExitCode(readyProcessOutcome.exitCode);
        return readyProcessOutcome.exitCode;
      }
      return printExitCode(0).exitCode;
    }
    const sessionStartController = new AbortController();
    const sessionStartOutcome = waitForRuntimePatchSession(
      debugPort,
      runtimePatcherSourceForVersion(
        patcherSource,
        context.metadata.versionKey,
        context.platform,
      ),
      runtimePatchRequiredInitialLabelsForVersion(
        context.metadata.versionKey,
        context.platform,
      ),
      sessionStartController.signal,
    ).then<
      RuntimePatchSessionStartOutcome,
      RuntimePatchSessionStartOutcome
    >(
      (startedSession) => ({
        type: "session-ready",
        session: startedSession,
      }),
      (error: unknown) => ({
        type: "session-start-error",
        error: asError(error),
      }),
    );
    const startupOutcome = await Promise.race([
      processOutcome,
      sessionStartOutcome,
    ]);
    if (startupOutcome.type !== "session-ready") {
      sessionStartController.abort();
      const settledSessionStart = await sessionStartOutcome;
      if (settledSessionStart.type === "session-ready") {
        settledSessionStart.session.close();
      }
      if (startupOutcome.type === "process-exit") {
        processExitedBeforeSession = true;
        throw new Error(
          context.platform === "win32"
            ? "Codex exited before runtime patching was established (original Windows exit code unavailable)."
            : `Codex exited before runtime patching was established (exit code ${String(startupOutcome.exitCode)}).`,
        );
      }
      throw startupOutcome.error;
    }
    session = startupOutcome.session;
    printRuntimeLaunchReady(session.patchedLabels);
    const outcome = await Promise.race([
      processOutcome,
      session.lost.then((error) => ({ type: "session-lost" as const, error })),
    ]);
    if (outcome.type === "process-monitor-error") {
      throw outcome.error;
    }
    if (outcome.type === "session-lost") {
      session.close();
      session = null;
      let windowsAdmittedPathCleanupConfirmed = false;
      if (launched) {
        launched.stopMonitoring();
        const termination = platformAdapter.terminateRuntimeLaunchProcess(
          launched,
        );
        windowsAdmittedPathCleanupConfirmed = termination.ok;
        if (!termination.ok) {
          printLine(termination.message);
        }
      }
      printRuntimePatchSessionLost(
        outcome.error,
        context.platform,
        windowsAdmittedPathCleanupConfirmed,
      );
      return printExitBlock(1).exitCode;
    }
    const processExitConfirmed = confirmRuntimeLaunchExit(
      platformAdapter,
      launched,
    );
    session.close();
    session = null;
    if (!processExitConfirmed) {
      return printExitBlock(1).exitCode;
    }
    printExitCode(outcome.exitCode);
    return outcome.exitCode;
  } catch (error) {
    if (session) {
      session.close();
      session = null;
    }
    if (
      launched &&
      (!processExitedBeforeSession || context.platform === "win32")
    ) {
      launched.stopMonitoring();
      const termination = platformAdapter.terminateRuntimeLaunchProcess(
        launched,
      );
      if (!termination.ok) {
        printLine(termination.message);
        if (context.platform === "win32") {
          printLine(
            "Fail-closed cleanup could not be confirmed. Fully quit Codex manually before retrying.",
          );
        }
      }
    }
    printLine(`Runtime launch failed: ${asError(error).message}`);
  } finally {
    launched?.stopMonitoring();
  }

  return printExitBlock(1).exitCode;
}
