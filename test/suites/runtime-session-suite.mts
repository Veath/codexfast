import { createHash } from "node:crypto";
import { createServer } from "node:http";
import type { Socket } from "node:net";
import { waitForRuntimeBrowserConnection } from "../../src/cli-cdp.mts";
import { startRuntimePatchSession } from "../../src/cli-runtime-launch.mts";
import { fail } from "../helpers/assertions.mts";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function encodeServerTextFrame(value: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  if (body.length < 126) {
    return Buffer.concat([Buffer.from([0x81, body.length]), body]);
  }
  if (body.length <= 0xffff) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
    return Buffer.concat([header, body]);
  }
  throw new Error("test WebSocket frame is unexpectedly large");
}

function decodeClientTextFrames(buffer: Buffer): {
  messages: string[];
  remaining: Buffer;
} {
  const messages: string[] = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const secondByte = buffer[offset + 1];
    let payloadLength = secondByte & 0x7f;
    let headerLength = 2;
    if (payloadLength === 126) {
      if (offset + 4 > buffer.length) {
        break;
      }
      payloadLength = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (offset + 10 > buffer.length) {
        break;
      }
      const largeLength = buffer.readBigUInt64BE(offset + 2);
      if (largeLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("test WebSocket frame is too large");
      }
      payloadLength = Number(largeLength);
      headerLength = 10;
    }
    const masked = (secondByte & 0x80) !== 0;
    const maskLength = masked ? 4 : 0;
    const frameLength = headerLength + maskLength + payloadLength;
    if (offset + frameLength > buffer.length) {
      break;
    }
    if ((firstByte & 0x0f) === 1) {
      const maskOffset = offset + headerLength;
      const payloadOffset = maskOffset + maskLength;
      const payload = Buffer.from(
        buffer.subarray(payloadOffset, payloadOffset + payloadLength),
      );
      if (masked) {
        const mask = buffer.subarray(maskOffset, maskOffset + 4);
        for (let index = 0; index < payload.length; index += 1) {
          payload[index] ^= mask[index % 4];
        }
      }
      messages.push(payload.toString("utf8"));
    }
    offset += frameLength;
  }
  return { messages, remaining: buffer.subarray(offset) };
}

function acceptWebSocket(socket: Socket, key: string): void {
  const accept = createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    "",
  ].join("\r\n"));
}

async function runRuntimePartialHttpAbortSuite(): Promise<void> {
  const responseClosed = deferred<void>();
  const retryStarted = deferred<void>();
  const sockets = new Set<Socket>();
  let requestCount = 0;
  const server = createServer((request, response) => {
    if (request.url !== "/json/version") {
      response.writeHead(404).end();
      return;
    }
    requestCount += 1;
    if (requestCount > 1) {
      retryStarted.resolve();
      return;
    }
    response.writeHead(200, {
      "content-type": "application/json",
      "content-length": "1024",
    });
    response.write("{");
    const socket = response.socket;
    socket?.once("close", () => responseClosed.resolve());
    setTimeout(() => socket?.destroy(), 10);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("error", () => undefined);
    socket.once("close", () => sockets.delete(socket));
  });

  const startupController = new AbortController();
  let pendingConnection: Promise<unknown> | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      fail("expected the partial HTTP test server to allocate a TCP port");
    }
    pendingConnection = waitForRuntimeBrowserConnection(
      address.port,
      startupController.signal,
    );
    await withTimeout(
      responseClosed.promise,
      1_000,
      "timed out waiting for the partial CDP HTTP response to close",
    );
    await withTimeout(
      retryStarted.promise,
      1_000,
      "partial CDP HTTP response did not settle and retry",
    );
    startupController.abort();
    try {
      await withTimeout(
        pendingConnection,
        1_000,
        "CDP HTTP connection remained pending after aborting a partial response",
      );
      fail("expected aborting a partial CDP HTTP response to reject");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("CDP connection attempt aborted")) {
        fail(
          "expected a partial CDP HTTP response to remain abortable",
          message,
        );
      }
    }
  } finally {
    startupController.abort();
    void pendingConnection?.catch(() => undefined);
    for (const socket of sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function runRuntimeInitialAutoAttachTimeoutSuite(): Promise<void> {
  const expectedTimeoutMessage =
    "Timed out enabling renderer auto-attach during initial runtime patch setup.";
  const sockets = new Set<Socket>();
  let debugPort = 0;
  let sawAutoAttach = false;
  const server = createServer((request, response) => {
    if (request.url !== "/json/version") {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      webSocketDebuggerUrl:
        `ws://127.0.0.1:${String(debugPort)}/devtools/browser/codexfast-initial-auto-attach-timeout-test`,
    }));
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("error", () => undefined);
    socket.once("close", () => sockets.delete(socket));
  });
  server.on("upgrade", (request, rawSocket) => {
    const socket = rawSocket as Socket;
    const key = request.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }
    let commandBuffer = Buffer.alloc(0);
    acceptWebSocket(socket, key);
    socket.on("data", (chunk: Buffer) => {
      commandBuffer = Buffer.concat([commandBuffer, chunk]);
      const decoded = decodeClientTextFrames(commandBuffer);
      commandBuffer = Buffer.from(decoded.remaining);
      for (const source of decoded.messages) {
        const message = JSON.parse(source) as {
          id?: number;
          method?: string;
        };
        if (typeof message.id !== "number" || !message.method) {
          continue;
        }
        if (message.method === "Target.setAutoAttach") {
          sawAutoAttach = true;
          continue;
        }
        socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
      }
    });
  });

  const startupController = new AbortController();
  let session: Awaited<ReturnType<typeof startRuntimePatchSession>> | null =
    null;
  let closeSession = (): void => undefined;
  let startError: unknown = null;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen({ host: "127.0.0.1", port: 0 }, () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      fail("expected initial auto-attach timeout fixture to bind a loopback port");
    }
    debugPort = address.port;
    try {
      session = await withTimeout(
        startRuntimePatchSession(
          debugPort,
          `function applyRuntimePatchesToBody(_resourcePath, body) {
  return { content: body, matchedLabels: [], patchedLabels: [], alreadyPatchedLabels: [] };
}`,
          [],
          startupController.signal,
        ),
        7_000,
        "initial renderer auto-attach remained pending beyond its bounded timeout",
      );
      closeSession = session.close;
    } catch (error) {
      startError = error;
    }
    if (session) {
      fail("expected an unanswered initial Target.setAutoAttach command to fail startup");
    }
    const message = startError instanceof Error
      ? startError.message
      : String(startError);
    if (!message.includes(expectedTimeoutMessage)) {
      fail(
        "expected initial renderer auto-attach to fail with its bounded timeout",
        message,
      );
    }
    if (!sawAutoAttach) {
      fail("expected the initial auto-attach timeout fixture to observe Target.setAutoAttach");
    }
  } finally {
    startupController.abort();
    closeSession();
    for (const socket of sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function runRuntimeInitialPausedHandlerDrainTimeoutSuite(): Promise<void> {
  const expectedTimeoutMessage =
    "Timed out waiting for paused runtime fetch handlers during initial runtime patch setup.";
  const sockets = new Set<Socket>();
  let debugPort = 0;
  let sentPausedRequests = false;
  let sawHungBodyRequest = false;
  let sawCompletingContinue = false;
  const server = createServer((request, response) => {
    if (request.url !== "/json/version") {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      webSocketDebuggerUrl:
        `ws://127.0.0.1:${String(debugPort)}/devtools/browser/codexfast-initial-handler-drain-timeout-test`,
    }));
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("error", () => undefined);
    socket.once("close", () => sockets.delete(socket));
  });
  server.on("upgrade", (request, rawSocket) => {
    const socket = rawSocket as Socket;
    const key = request.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }
    let commandBuffer = Buffer.alloc(0);
    acceptWebSocket(socket, key);
    socket.on("data", (chunk: Buffer) => {
      commandBuffer = Buffer.concat([commandBuffer, chunk]);
      const decoded = decodeClientTextFrames(commandBuffer);
      commandBuffer = Buffer.from(decoded.remaining);
      for (const source of decoded.messages) {
        const message = JSON.parse(source) as {
          id?: number;
          method?: string;
          sessionId?: string;
          params?: { requestId?: string };
        };
        if (typeof message.id !== "number" || !message.method) {
          continue;
        }
        if (message.method === "Target.setAutoAttach") {
          socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
          setImmediate(() => {
            if (socket.destroyed) {
              return;
            }
            socket.write(encodeServerTextFrame({
              method: "Target.attachedToTarget",
              params: {
                sessionId: "initial-handler-drain-page",
                targetInfo: { type: "page", url: "app://-/index.html" },
                waitingForDebugger: true,
              },
            }));
          });
          continue;
        }
        if (message.method === "Fetch.getResponseBody") {
          if (message.params?.requestId === "hanging-request") {
            sawHungBodyRequest = true;
            continue;
          }
          socket.write(encodeServerTextFrame({
            id: message.id,
            result: {
              body: "const codexfastInitialDrainFixture = true;",
              base64Encoded: false,
            },
          }));
          continue;
        }
        if (message.method === "Fetch.continueRequest") {
          if (message.params?.requestId === "completing-request") {
            sawCompletingContinue = true;
          }
          socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
          continue;
        }
        socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
        if (
          message.method === "Runtime.runIfWaitingForDebugger" &&
          !sentPausedRequests
        ) {
          sentPausedRequests = true;
          setImmediate(() => {
            if (socket.destroyed) {
              return;
            }
            for (const requestId of [
              "hanging-request",
              "completing-request",
            ]) {
              socket.write(encodeServerTextFrame({
                method: "Fetch.requestPaused",
                sessionId: "initial-handler-drain-page",
                params: {
                  requestId,
                  request: {
                    url: `app://-/assets/${requestId}.js`,
                  },
                  responseStatusCode: 200,
                },
              }));
            }
          });
        }
      }
    });
  });

  const startupController = new AbortController();
  let session: Awaited<ReturnType<typeof startRuntimePatchSession>> | null =
    null;
  let closeSession = (): void => undefined;
  let startError: unknown = null;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen({ host: "127.0.0.1", port: 0 }, () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      fail("expected initial handler-drain timeout fixture to bind a loopback port");
    }
    debugPort = address.port;
    try {
      session = await withTimeout(
        startRuntimePatchSession(
          debugPort,
          `function applyRuntimePatchesToBody(_resourcePath, body) {
  return { content: body, matchedLabels: [], patchedLabels: [], alreadyPatchedLabels: [] };
}`,
          [],
          startupController.signal,
        ),
        8_000,
        "initial paused request handler drain remained pending beyond its bounded timeout",
      );
      closeSession = session.close;
    } catch (error) {
      startError = error;
    }
    if (session) {
      fail("expected a hung initial paused request handler to fail startup");
    }
    const message = startError instanceof Error
      ? startError.message
      : String(startError);
    if (!message.includes(expectedTimeoutMessage)) {
      fail(
        "expected initial paused request handler draining to fail with its bounded timeout",
        message,
      );
    }
    if (!sawHungBodyRequest || !sawCompletingContinue) {
      fail(
        "expected the handler-drain fixture to include one hung request and one completing request",
        `hung=${String(sawHungBodyRequest)} completing=${String(sawCompletingContinue)}`,
      );
    }
  } finally {
    startupController.abort();
    closeSession();
    for (const socket of sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function runRuntimeReconnectCancellationSuite(): Promise<void> {
  const reconnectUpgradeStarted = deferred<Socket>();
  const reconnectSocketClosed = deferred<void>();
  const sockets = new Set<Socket>();
  let debugPort = 0;
  let upgradeCount = 0;
  let sessionReady = false;
  let reconnectCommandCount = 0;
  let initialSocket: Socket | null = null;
  let initialBuffer = Buffer.alloc(0);

  const server = createServer((request, response) => {
    if (request.url !== "/json/version") {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      webSocketDebuggerUrl:
        `ws://127.0.0.1:${String(debugPort)}/devtools/browser/codexfast-test`,
    }));
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("error", () => undefined);
    socket.once("close", () => sockets.delete(socket));
  });

  server.on("upgrade", (request, rawSocket) => {
    const socket = rawSocket as Socket;
    const key = request.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }
    upgradeCount += 1;
    if (upgradeCount === 2) {
      socket.on("data", (chunk: Buffer) => {
        const decoded = decodeClientTextFrames(chunk);
        reconnectCommandCount += decoded.messages.length;
      });
      socket.once("end", () => {
        socket.destroy();
        reconnectSocketClosed.resolve();
      });
      socket.once("close", () => reconnectSocketClosed.resolve());
      reconnectUpgradeStarted.resolve(socket);
      return;
    }
    if (upgradeCount !== 1) {
      socket.destroy();
      return;
    }

    initialSocket = socket;
    acceptWebSocket(socket, key);
    socket.on("data", (chunk: Buffer) => {
      initialBuffer = Buffer.concat([initialBuffer, chunk]);
      const decoded = decodeClientTextFrames(initialBuffer);
      initialBuffer = Buffer.from(decoded.remaining);
      for (const source of decoded.messages) {
        const message = JSON.parse(source) as {
          id?: number;
          method?: string;
        };
        if (typeof message.id !== "number" || !message.method) {
          continue;
        }
        if (sessionReady && message.method === "Fetch.enable") {
          socket.destroy();
          continue;
        }
        if (message.method === "Fetch.getResponseBody") {
          socket.write(encodeServerTextFrame({
            id: message.id,
            result: {
              body: "const codexfastReconnectFixture = true;",
              base64Encoded: false,
            },
          }));
          continue;
        }
        socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
        if (message.method === "Target.setAutoAttach") {
          setImmediate(() => {
            if (socket.destroyed) {
              return;
            }
            socket.write(encodeServerTextFrame({
              method: "Fetch.requestPaused",
              sessionId: "initial-page",
              params: {
                requestId: "initial-request",
                request: { url: "app://-/assets/reconnect-fixture.js" },
                responseStatusCode: 200,
              },
            }));
          });
        }
      }
    });
  });

  const startupController = new AbortController();
  let session: Awaited<ReturnType<typeof startRuntimePatchSession>> | null =
    null;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen({ host: "127.0.0.1", port: 0 }, () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      fail("expected runtime-session fixture to bind a loopback port");
    }
    debugPort = address.port;
    session = await withTimeout(
      startRuntimePatchSession(
        debugPort,
        `function applyRuntimePatchesToBody(_resourcePath, body) {
  return { content: body, matchedLabels: [], patchedLabels: [], alreadyPatchedLabels: [] };
}`,
        [],
        startupController.signal,
      ),
      5_000,
      "timed out establishing the initial runtime patch session",
    );
    sessionReady = true;
    const connectedInitialSocket = initialSocket as Socket | null;
    if (!connectedInitialSocket) {
      fail("expected the initial runtime patch WebSocket to be connected");
    }
    connectedInitialSocket.write(encodeServerTextFrame({
      method: "Target.attachedToTarget",
      params: {
        sessionId: "reconnect-trigger",
        targetInfo: { type: "page", url: "app://-/index.html" },
        waitingForDebugger: false,
      },
    }));

    await withTimeout(
      reconnectUpgradeStarted.promise,
      2_000,
      "timed out waiting for the runtime patch reconnect handshake",
    );
    const closedAt = Date.now();
    session.close();
    session = null;
    await withTimeout(
      reconnectSocketClosed.promise,
      750,
      "runtime patch session close did not cancel the reconnect WebSocket handshake",
    );
    const elapsedMs = Date.now() - closedAt;
    if (elapsedMs >= 750) {
      fail(
        "expected runtime patch session close to cancel reconnect promptly",
        `reconnect socket remained open for ${String(elapsedMs)} ms`,
      );
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    if (reconnectCommandCount !== 0) {
      fail(
        "expected a closed runtime patch session not to attach a replacement CDP connection",
        `replacement connection received ${String(reconnectCommandCount)} command(s)`,
      );
    }
    if (upgradeCount !== 2) {
      fail(
        "expected runtime patch session close to stop further reconnect attempts",
        `observed ${String(upgradeCount)} WebSocket upgrade attempts`,
      );
    }
  } finally {
    startupController.abort();
    session?.close();
    for (const socket of sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function runRuntimeReconnectInterceptionFailureSuite(): Promise<void> {
  const reconnectFailureMessage =
    "simulated reconnect Fetch.enable failure";
  const sockets = new Set<Socket>();
  const output: string[] = [];
  const originalConsoleLog = console.log;
  let debugPort = 0;
  let upgradeCount = 0;
  let sessionReady = false;
  let reconnectInterceptionFailures = 0;
  let initialSocket: Socket | null = null;

  const server = createServer((request, response) => {
    if (request.url !== "/json/version") {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      webSocketDebuggerUrl:
        `ws://127.0.0.1:${String(debugPort)}/devtools/browser/codexfast-reconnect-failure-test`,
    }));
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("error", () => undefined);
    socket.once("close", () => sockets.delete(socket));
  });
  server.on("upgrade", (request, rawSocket) => {
    const socket = rawSocket as Socket;
    const key = request.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }
    upgradeCount += 1;
    const connectionNumber = upgradeCount;
    let commandBuffer = Buffer.alloc(0);
    let pendingAutoAttachId: number | null = null;
    let pendingFailureFetchId: number | null = null;
    let pendingSuccessRunIfWaitingId: number | null = null;
    const flushReconnectInterceptionOutcome = (): void => {
      if (
        connectionNumber === 1 ||
        pendingAutoAttachId === null ||
        pendingFailureFetchId === null ||
        pendingSuccessRunIfWaitingId === null
      ) {
        return;
      }
      socket.write(encodeServerTextFrame({
        id: pendingSuccessRunIfWaitingId,
        result: {},
      }));
      socket.write(encodeServerTextFrame({
        id: pendingFailureFetchId,
        error: { message: reconnectFailureMessage },
      }));
      // Keep Target.setAutoAttach pending. The failed renderer setup closes the
      // connection and rejects that command with a generic WebSocket error;
      // reconnect error reporting must preserve the renderer failure that
      // caused the close.
      reconnectInterceptionFailures += 1;
      pendingSuccessRunIfWaitingId = null;
      pendingFailureFetchId = null;
      pendingAutoAttachId = null;
    };
    acceptWebSocket(socket, key);
    if (connectionNumber === 1) {
      initialSocket = socket;
    }
    socket.on("data", (chunk: Buffer) => {
      commandBuffer = Buffer.concat([commandBuffer, chunk]);
      const decoded = decodeClientTextFrames(commandBuffer);
      commandBuffer = Buffer.from(decoded.remaining);
      for (const source of decoded.messages) {
        const message = JSON.parse(source) as {
          id?: number;
          method?: string;
          sessionId?: string;
        };
        if (typeof message.id !== "number" || !message.method) {
          continue;
        }
        if (message.method === "Fetch.getResponseBody") {
          socket.write(encodeServerTextFrame({
            id: message.id,
            result: {
              body: "const codexfastReconnectFailureFixture = true;",
              base64Encoded: false,
            },
          }));
          continue;
        }
        if (connectionNumber === 1) {
          if (
            sessionReady &&
            message.method === "Fetch.enable" &&
            message.sessionId === "initial-reconnect-trigger"
          ) {
            socket.write(encodeServerTextFrame({
              id: message.id,
              error: { message: reconnectFailureMessage },
            }));
            continue;
          }
          socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
          if (message.method === "Target.setAutoAttach") {
            setImmediate(() => {
              if (socket.destroyed) {
                return;
              }
              socket.write(encodeServerTextFrame({
                method: "Fetch.requestPaused",
                sessionId: "initial-page",
                params: {
                  requestId: "initial-request",
                  request: {
                    url: "app://-/assets/reconnect-failure-fixture.js",
                  },
                  responseStatusCode: 200,
                },
              }));
            });
          }
          continue;
        }
        if (message.method === "Target.setAutoAttach") {
          pendingAutoAttachId = message.id;
          socket.write(encodeServerTextFrame({
            method: "Target.attachedToTarget",
            params: {
              sessionId: `reconnect-success-${String(connectionNumber)}`,
              targetInfo: { type: "page", url: "app://-/index.html" },
              waitingForDebugger: true,
            },
          }));
          socket.write(encodeServerTextFrame({
            method: "Target.attachedToTarget",
            params: {
              sessionId: `reconnect-failure-${String(connectionNumber)}`,
              targetInfo: { type: "page", url: "app://-/secondary.html" },
              waitingForDebugger: true,
            },
          }));
          continue;
        }
        if (
          message.method === "Fetch.enable" &&
          message.sessionId ===
            `reconnect-success-${String(connectionNumber)}`
        ) {
          socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
          continue;
        }
        if (
          message.method === "Fetch.enable" &&
          message.sessionId ===
            `reconnect-failure-${String(connectionNumber)}`
        ) {
          pendingFailureFetchId = message.id;
          flushReconnectInterceptionOutcome();
          continue;
        }
        if (
          message.method === "Runtime.runIfWaitingForDebugger" &&
          message.sessionId ===
            `reconnect-success-${String(connectionNumber)}`
        ) {
          pendingSuccessRunIfWaitingId = message.id;
          flushReconnectInterceptionOutcome();
          continue;
        }
        socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
      }
    });
  });

  const startupController = new AbortController();
  let session: Awaited<ReturnType<typeof startRuntimePatchSession>> | null =
    null;
  console.log = (...values: unknown[]): void => {
    output.push(values.map((value) => String(value)).join(" "));
  };
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen({ host: "127.0.0.1", port: 0 }, () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      fail("expected reconnect-failure fixture to bind a loopback port");
    }
    debugPort = address.port;
    session = await withTimeout(
      startRuntimePatchSession(
        debugPort,
        `function applyRuntimePatchesToBody(_resourcePath, body) {
  return { content: body, matchedLabels: [], patchedLabels: [], alreadyPatchedLabels: [] };
}`,
        [],
        startupController.signal,
      ),
      5_000,
      "timed out establishing the reconnect-failure runtime patch session",
    );
    sessionReady = true;
    const connectedInitialSocket = initialSocket as Socket | null;
    if (!connectedInitialSocket) {
      fail("expected the reconnect-failure initial WebSocket to be connected");
    }
    connectedInitialSocket.write(encodeServerTextFrame({
      method: "Target.attachedToTarget",
      params: {
        sessionId: "initial-reconnect-trigger",
        targetInfo: { type: "page", url: "app://-/index.html" },
        waitingForDebugger: false,
      },
    }));

    const lostError = await withTimeout(
      session.lost,
      8_000,
      "timed out waiting for failed renderer interception to exhaust reconnects",
    );
    if (!lostError.message.includes(reconnectFailureMessage)) {
      fail(
        "expected the failed reconnect interception error to be preserved",
        lostError.message,
      );
    }
    if (output.some((line) =>
      line.includes("Runtime patch session reconnected."))) {
      fail(
        "expected failed renderer interception not to report a successful reconnect",
        output.join("\n"),
      );
    }
    if (reconnectInterceptionFailures !== 3) {
      fail(
        "expected renderer interception failure on every reconnect attempt",
        `observed ${String(reconnectInterceptionFailures)} failure(s)`,
      );
    }
    if (upgradeCount !== 4) {
      fail(
        "expected the initial connection plus three bounded reconnect attempts",
        `observed ${String(upgradeCount)} WebSocket upgrade(s)`,
      );
    }
  } finally {
    console.log = originalConsoleLog;
    startupController.abort();
    session?.close();
    for (const socket of sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function runRuntimeReconnectHungSecondaryRendererSuite(): Promise<void> {
  const reconnectTriggerMessage =
    "simulated reconnect trigger before hung secondary renderer";
  const sockets = new Set<Socket>();
  const output: string[] = [];
  const originalConsoleLog = console.log;
  let debugPort = 0;
  let upgradeCount = 0;
  let sessionReady = false;
  let hungSecondaryRendererAttempts = 0;
  let initialSocket: Socket | null = null;

  const server = createServer((request, response) => {
    if (request.url !== "/json/version") {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      webSocketDebuggerUrl:
        `ws://127.0.0.1:${String(debugPort)}/devtools/browser/codexfast-reconnect-hung-secondary-test`,
    }));
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("error", () => undefined);
    socket.once("close", () => sockets.delete(socket));
  });
  server.on("upgrade", (request, rawSocket) => {
    const socket = rawSocket as Socket;
    const key = request.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }
    upgradeCount += 1;
    const connectionNumber = upgradeCount;
    let commandBuffer = Buffer.alloc(0);
    acceptWebSocket(socket, key);
    if (connectionNumber === 1) {
      initialSocket = socket;
    }
    socket.on("data", (chunk: Buffer) => {
      commandBuffer = Buffer.concat([commandBuffer, chunk]);
      const decoded = decodeClientTextFrames(commandBuffer);
      commandBuffer = Buffer.from(decoded.remaining);
      for (const source of decoded.messages) {
        const message = JSON.parse(source) as {
          id?: number;
          method?: string;
          sessionId?: string;
        };
        if (typeof message.id !== "number" || !message.method) {
          continue;
        }
        if (message.method === "Fetch.getResponseBody") {
          socket.write(encodeServerTextFrame({
            id: message.id,
            result: {
              body: "const codexfastReconnectHungSecondaryFixture = true;",
              base64Encoded: false,
            },
          }));
          continue;
        }
        if (connectionNumber === 1) {
          if (
            sessionReady &&
            message.method === "Fetch.enable" &&
            message.sessionId === "initial-hung-reconnect-trigger"
          ) {
            socket.write(encodeServerTextFrame({
              id: message.id,
              error: { message: reconnectTriggerMessage },
            }));
            continue;
          }
          socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
          if (message.method === "Target.setAutoAttach") {
            setImmediate(() => {
              if (socket.destroyed) {
                return;
              }
              socket.write(encodeServerTextFrame({
                method: "Fetch.requestPaused",
                sessionId: "initial-page",
                params: {
                  requestId: "initial-request",
                  request: {
                    url: "app://-/assets/reconnect-hung-secondary-fixture.js",
                  },
                  responseStatusCode: 200,
                },
              }));
            });
          }
          continue;
        }
        const primarySession =
          `reconnect-primary-${String(connectionNumber)}`;
        const secondarySession =
          `reconnect-hung-secondary-${String(connectionNumber)}`;
        if (message.method === "Target.setAutoAttach") {
          socket.write(encodeServerTextFrame({
            method: "Target.attachedToTarget",
            params: {
              sessionId: primarySession,
              targetInfo: { type: "page", url: "app://-/index.html" },
              waitingForDebugger: true,
            },
          }));
          socket.write(encodeServerTextFrame({
            method: "Target.attachedToTarget",
            params: {
              sessionId: secondarySession,
              targetInfo: { type: "page", url: "app://-/secondary.html" },
              waitingForDebugger: false,
            },
          }));
          socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
          continue;
        }
        if (
          message.method === "Page.enable" &&
          message.sessionId === secondarySession
        ) {
          hungSecondaryRendererAttempts += 1;
          continue;
        }
        socket.write(encodeServerTextFrame({ id: message.id, result: {} }));
      }
    });
  });

  const startupController = new AbortController();
  let session: Awaited<ReturnType<typeof startRuntimePatchSession>> | null =
    null;
  console.log = (...values: unknown[]): void => {
    output.push(values.map((value) => String(value)).join(" "));
  };
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen({ host: "127.0.0.1", port: 0 }, () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      fail("expected hung-secondary fixture to bind a loopback port");
    }
    debugPort = address.port;
    session = await withTimeout(
      startRuntimePatchSession(
        debugPort,
        `function applyRuntimePatchesToBody(_resourcePath, body) {
  return { content: body, matchedLabels: [], patchedLabels: [], alreadyPatchedLabels: [] };
}`,
        [],
        startupController.signal,
      ),
      5_000,
      "timed out establishing the hung-secondary runtime patch session",
    );
    sessionReady = true;
    const connectedInitialSocket = initialSocket as Socket | null;
    if (!connectedInitialSocket) {
      fail("expected the hung-secondary initial WebSocket to be connected");
    }
    connectedInitialSocket.write(encodeServerTextFrame({
      method: "Target.attachedToTarget",
      params: {
        sessionId: "initial-hung-reconnect-trigger",
        targetInfo: { type: "page", url: "app://-/index.html" },
        waitingForDebugger: false,
      },
    }));

    const lostError = await withTimeout(
      session.lost,
      25_000,
      "timed out waiting for hung secondary renderers to exhaust reconnects",
    );
    if (!lostError.message.includes(
      "Timed out restoring renderer interception for session reconnect-hung-secondary-",
    )) {
      fail(
        "expected the hung secondary renderer timeout to be preserved",
        lostError.message,
      );
    }
    if (output.some((line) =>
      line.includes("Runtime patch session reconnected."))) {
      fail(
        "expected a hung secondary renderer not to report a successful reconnect",
        output.join("\n"),
      );
    }
    if (hungSecondaryRendererAttempts !== 3) {
      fail(
        "expected a hung secondary renderer on every reconnect attempt",
        `observed ${String(hungSecondaryRendererAttempts)} hung setup(s)`,
      );
    }
    if (upgradeCount !== 4) {
      fail(
        "expected the initial connection plus three bounded reconnect attempts for a hung secondary renderer",
        `observed ${String(upgradeCount)} WebSocket upgrade(s)`,
      );
    }
  } finally {
    console.log = originalConsoleLog;
    startupController.abort();
    session?.close();
    for (const socket of sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

export async function runRuntimeSessionSuite(): Promise<void> {
  await runRuntimePartialHttpAbortSuite();
  await runRuntimeInitialAutoAttachTimeoutSuite();
  await runRuntimeInitialPausedHandlerDrainTimeoutSuite();
  await runRuntimeReconnectCancellationSuite();
  await runRuntimeReconnectInterceptionFailureSuite();
  await runRuntimeReconnectHungSecondaryRendererSuite();
}
