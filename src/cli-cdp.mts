import { createHash, randomBytes } from "node:crypto";
import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import { asError, debugRuntime, printLine, sleep } from "./cli-utils.mts";

export type CdpTarget = {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
};

type CdpPendingCommand = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type CdpEventHandler = (
  params: unknown,
  message: CdpMessage,
) => void | Promise<void>;
type CdpEventErrorHandler = (error: Error) => void;

type CdpMessage = {
  id?: number;
  method?: string;
  params?: unknown;
  sessionId?: string;
  result?: unknown;
  error?: {
    message?: string;
  };
};

type CdpVersion = {
  webSocketDebuggerUrl?: string;
};

const runtimePatchConnectTimeoutMs = 12_000;
const runtimePatchHttpTimeoutMs = 3_000;

function encodeWebSocketTextFrame(payload: string): Buffer {
  const body = Buffer.from(payload, "utf8");
  if (body.length > Number.MAX_SAFE_INTEGER) {
    throw new Error("CDP frame payload is too large.");
  }
  const mask = randomBytes(4);
  const header: number[] = [0x81];
  if (body.length < 126) {
    header.push(0x80 | body.length);
  } else if (body.length <= 0xffff) {
    header.push(0x80 | 126, (body.length >> 8) & 0xff, body.length & 0xff);
  } else {
    const lengthBuffer = Buffer.alloc(8);
    lengthBuffer.writeBigUInt64BE(BigInt(body.length), 0);
    header.push(0x80 | 127, ...lengthBuffer);
  }

  const masked = Buffer.alloc(body.length);
  for (let index = 0; index < body.length; index += 1) {
    masked[index] = body[index] ^ mask[index % 4];
  }
  return Buffer.concat([Buffer.from(header), mask, masked]);
}

function decodeWebSocketTextFrames(buffer: Buffer, fragments: Buffer[] = []): { messages: string[]; remaining: Buffer; fragments: Buffer[] } {
  const messages: string[] = [];
  let offset = 0;
  let pendingFragments = fragments;
  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const finalFrame = (firstByte & 0x80) !== 0;
    const opcode = firstByte & 0x0f;
    const secondByte = buffer[offset + 1];
    const masked = (secondByte & 0x80) !== 0;
    let length = secondByte & 0x7f;
    let headerLength = 2;
    if (length === 126) {
      if (offset + 4 > buffer.length) {
        break;
      }
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (offset + 10 > buffer.length) {
        break;
      }
      const bigLength = buffer.readBigUInt64BE(offset + 2);
      if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("CDP frame payload is too large.");
      }
      length = Number(bigLength);
      headerLength = 10;
    }

    if (masked) {
      throw new Error("Unexpected masked server WebSocket frame.");
    }
    if (offset + headerLength + length > buffer.length) {
      break;
    }

    const payload = buffer.subarray(offset + headerLength, offset + headerLength + length);
    if (opcode === 1) {
      if (finalFrame) {
        messages.push(payload.toString("utf8"));
      } else {
        pendingFragments = [payload];
      }
    } else if (opcode === 0 && pendingFragments.length > 0) {
      pendingFragments.push(payload);
      if (finalFrame) {
        messages.push(Buffer.concat(pendingFragments).toString("utf8"));
        pendingFragments = [];
      }
    } else if (opcode === 8) {
      pendingFragments = [];
    }
    offset += headerLength + length;
  }

  return { messages, remaining: buffer.subarray(offset), fragments: pendingFragments };
}

export function runCdpFrameSelfTest(): number {
  const payload = JSON.stringify({ id: 1, method: "Runtime.enable" });
  const encoded = encodeWebSocketTextFrame(payload);
  if (encoded[0] !== 0x81 || (encoded[1] & 0x80) === 0) {
    printLine("CDP frame self-test failed");
    return 1;
  }

  const clientPayloadLength = encoded[1] & 0x7f;
  const clientMaskOffset = clientPayloadLength === 126 ? 4 : 2;
  const clientPayloadOffset = clientMaskOffset + 4;
  const clientMask = encoded.subarray(clientMaskOffset, clientPayloadOffset);
  const clientBody = encoded.subarray(clientPayloadOffset);
  const unmasked = Buffer.alloc(clientBody.length);
  for (let index = 0; index < clientBody.length; index += 1) {
    unmasked[index] = clientBody[index] ^ clientMask[index % 4];
  }
  if (unmasked.toString("utf8") !== payload) {
    printLine("CDP frame self-test failed");
    return 1;
  }

  const serverFrame = Buffer.concat([Buffer.from([0x81, 0x0d]), Buffer.from("hello runtime")]);
  const decoded = decodeWebSocketTextFrames(serverFrame);
  if (decoded.messages[0] !== "hello runtime" || decoded.remaining.length !== 0 || decoded.fragments.length !== 0) {
    printLine("CDP frame self-test failed");
    return 1;
  }

  const fragmentedServerFrames = Buffer.concat([
    Buffer.from([0x01, 0x06]),
    Buffer.from("hello "),
    Buffer.from([0x80, 0x07]),
    Buffer.from("runtime"),
  ]);
  const fragmentedDecoded = decodeWebSocketTextFrames(fragmentedServerFrames);
  if (fragmentedDecoded.messages[0] !== "hello runtime" || fragmentedDecoded.remaining.length !== 0 || fragmentedDecoded.fragments.length !== 0) {
    printLine("CDP frame self-test failed");
    return 1;
  }

  const largePayload = "x".repeat(70 * 1024);
  const largeEncoded = encodeWebSocketTextFrame(largePayload);
  if ((largeEncoded[1] & 0x7f) !== 127) {
    printLine("CDP frame self-test failed");
    return 1;
  }
  const largeMask = largeEncoded.subarray(10, 14);
  const largeBody = largeEncoded.subarray(14);
  const largeUnmasked = Buffer.alloc(largeBody.length);
  for (let index = 0; index < largeBody.length; index += 1) {
    largeUnmasked[index] = largeBody[index] ^ largeMask[index % 4];
  }
  if (largeEncoded.readBigUInt64BE(2) !== BigInt(Buffer.byteLength(largePayload)) || largeUnmasked.toString("utf8") !== largePayload) {
    printLine("CDP frame self-test failed");
    return 1;
  }

  const largeServerLength = Buffer.alloc(8);
  largeServerLength.writeBigUInt64BE(BigInt(Buffer.byteLength(largePayload)), 0);
  const largeServerFrame = Buffer.concat([Buffer.from([0x81, 0x7f]), largeServerLength, Buffer.from(largePayload)]);
  const largeDecoded = decodeWebSocketTextFrames(largeServerFrame);
  if (largeDecoded.messages[0] !== largePayload || largeDecoded.remaining.length !== 0 || largeDecoded.fragments.length !== 0) {
    printLine("CDP frame self-test failed");
    return 1;
  }

  const oversizedServerLength = Buffer.alloc(8);
  oversizedServerLength.writeBigUInt64BE(BigInt(Number.MAX_SAFE_INTEGER) + 1n, 0);
  try {
    decodeWebSocketTextFrames(Buffer.concat([Buffer.from([0x81, 0x7f]), oversizedServerLength]));
    printLine("CDP frame self-test failed");
    return 1;
  } catch (error) {
    if (!asError(error).message.includes("too large")) {
      printLine("CDP frame self-test failed");
      return 1;
    }
  }

  printLine("CDP frame self-test passed");
  return 0;
}

function httpGetJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    let settled = false;
    let request: http.ClientRequest | null = null;
    const timeout = setTimeout(() => {
      request?.destroy(new Error(`Timed out fetching ${url}.`));
    }, runtimePatchHttpTimeoutMs);
    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    request = client
      .get(url, (response: http.IncomingMessage) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer | string) => {
          chunks.push(Buffer.from(chunk));
        });
        response.on("end", () => {
          if ((response.statusCode ?? 500) >= 400) {
            finish(() => reject(new Error(`HTTP ${response.statusCode}`)));
            return;
          }

          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
            finish(() => resolve(parsed));
          } catch (error) {
            finish(() => reject(error));
          }
        });
      })
      .on("error", (error: Error) => finish(() => reject(error)));
  });
}

export class CdpConnection {
  private nextCommandId = 1;
  private pending = new Map<number, CdpPendingCommand>();
  private eventHandlers = new Map<string, CdpEventHandler[]>();
  private eventErrorHandlers: CdpEventErrorHandler[] = [];
  private buffer: Buffer = Buffer.alloc(0);
  private textFrameFragments: Buffer[] = [];
  private closed = false;

  private constructor(private socket: net.Socket, initialBuffer = Buffer.alloc(0)) {
    this.socket.on("data", (chunk: Buffer) => {
      this.readFrames(chunk);
    });
    this.socket.on("error", (error: Error) => {
      this.closed = true;
      this.rejectPending(error);
    });
    this.socket.on("close", () => {
      this.closed = true;
      this.rejectPending(new Error("CDP WebSocket connection closed."));
    });
    if (initialBuffer.length > 0) {
      this.readFrames(initialBuffer);
    }
  }

  static connect(webSocketUrl: string): Promise<CdpConnection> {
    return new Promise((resolve, reject) => {
      const url = new URL(webSocketUrl);
      if (url.protocol !== "ws:") {
        reject(new Error(`Unsupported CDP WebSocket protocol: ${url.protocol}`));
        return;
      }

      const port = Number(url.port || "80");
      const key = randomBytes(16).toString("base64");
      const expectedAccept = createHash("sha1")
        .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
        .digest("base64");
      const socket = net.connect({ host: url.hostname, port });
      let handshakeBuffer = Buffer.alloc(0);
      let settled = false;

      const fail = (error: Error): void => {
        if (settled) {
          return;
        }
        settled = true;
        socket.destroy();
        reject(error);
      };

      const timeout = setTimeout(() => {
        fail(new Error("Timed out during CDP WebSocket handshake."));
      }, 3_000);

      socket.once("connect", () => {
        const path = `${url.pathname}${url.search}`;
        socket.write(
          [
            `GET ${path} HTTP/1.1`,
            `Host: ${url.host}`,
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Key: ${key}`,
            "Sec-WebSocket-Version: 13",
            "",
            "",
          ].join("\r\n"),
        );
      });

      socket.on("data", (chunk: Buffer) => {
        if (settled) {
          return;
        }
        handshakeBuffer = Buffer.concat([handshakeBuffer, chunk]);
        const headerEnd = handshakeBuffer.indexOf("\r\n\r\n");
        if (headerEnd === -1) {
          return;
        }

        clearTimeout(timeout);
        const headerText = handshakeBuffer.subarray(0, headerEnd).toString("utf8");
        const remaining = handshakeBuffer.subarray(headerEnd + 4);
        const statusLine = headerText.split(/\r?\n/, 1)[0] ?? "";
        const acceptHeader = headerText
          .split(/\r?\n/)
          .find((line) => line.toLowerCase().startsWith("sec-websocket-accept:"))
          ?.split(":")
          .slice(1)
          .join(":")
          .trim();

        if (!/^HTTP\/1\.1 101\b/.test(statusLine) || acceptHeader !== expectedAccept) {
          fail(new Error("CDP WebSocket handshake was rejected."));
          return;
        }

        settled = true;
        socket.removeAllListeners("data");
        socket.removeAllListeners("error");
        resolve(new CdpConnection(socket, remaining));
      });

      socket.once("error", (error: Error) => {
        clearTimeout(timeout);
        fail(error);
      });
    });
  }

  send<T = unknown>(
    method: string,
    params?: unknown,
    sessionId?: string,
  ): Promise<T> {
    if (this.closed || this.socket.destroyed) {
      return Promise.reject(new Error("CDP WebSocket connection closed."));
    }
    const id = this.nextCommandId;
    this.nextCommandId += 1;
    const message =
      params === undefined ? { id, method, sessionId } : { id, method, params, sessionId };
    if (sessionId === undefined) {
      delete message.sessionId;
    }
    const payload = JSON.stringify(message);
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value: unknown) => resolve(value as T),
        reject,
      });
      try {
        this.socket.write(encodeWebSocketTextFrame(payload));
      } catch (error) {
        this.pending.delete(id);
        reject(asError(error));
      }
    });
  }

  on(method: string, handler: CdpEventHandler): void {
    const handlers = this.eventHandlers.get(method) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(method, handlers);
  }

  onEventError(handler: CdpEventErrorHandler): void {
    this.eventErrorHandlers.push(handler);
  }

  close(): void {
    this.closed = true;
    this.socket.end();
    this.socket.destroy();
    this.rejectPending(new Error("CDP WebSocket connection closed."));
  }

  isClosed(): boolean {
    return this.closed || this.socket.destroyed;
  }

  private readFrames(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const decoded = decodeWebSocketTextFrames(this.buffer, this.textFrameFragments);
    this.buffer = decoded.remaining;
    this.textFrameFragments = decoded.fragments;
    for (const message of decoded.messages) {
      this.handleMessage(message);
    }
  }

  private handleMessage(message: string): void {
    let parsed: CdpMessage;
    try {
      parsed = JSON.parse(message) as CdpMessage;
    } catch {
      return;
    }

    if (typeof parsed.id === "number") {
      const pending = this.pending.get(parsed.id);
      if (!pending) {
        return;
      }
      this.pending.delete(parsed.id);
      if (parsed.error) {
        pending.reject(new Error(parsed.error.message ?? "CDP command failed."));
      } else {
        pending.resolve(parsed.result);
      }
      return;
    }

    if (parsed.method) {
      debugRuntime(`event ${parsed.method}`);
      for (const handler of this.eventHandlers.get(parsed.method) ?? []) {
        Promise.resolve(handler(parsed.params, parsed)).catch((error: unknown) => {
          this.emitEventError(asError(error));
        });
      }
    }
  }

  private emitEventError(error: Error): void {
    for (const handler of this.eventErrorHandlers) {
      handler(error);
    }
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

export async function waitForRuntimeBrowserConnection(
  debugPort: number,
): Promise<CdpConnection> {
  const deadline = Date.now() + runtimePatchConnectTimeoutMs;
  let lastError: Error | null = null;
  let debuggerResponded = false;

  while (Date.now() < deadline) {
    try {
      const version = await httpGetJson<CdpVersion>(
        `http://127.0.0.1:${debugPort}/json/version`,
      );
      debuggerResponded = true;
      if (version.webSocketDebuggerUrl) {
        debugRuntime("connecting browser target");
        try {
          return await CdpConnection.connect(version.webSocketDebuggerUrl);
        } catch (error) {
          lastError = asError(error);
        }
      }
    } catch (error) {
      lastError = asError(error);
    }
    await sleep(100);
  }

  const detail = lastError ? `: ${lastError.message}` : "";
  const reason = debuggerResponded
    ? "CDP browser target unavailable"
    : "CDP browser endpoint unavailable";
  throw new Error(`${reason} after bounded retries${detail}`);
}

async function findDebuggableRendererTarget(debugPort: number): Promise<CdpTarget | null> {
  const targets = await httpGetJson<CdpTarget[]>(`http://127.0.0.1:${debugPort}/json/list`);
  return (
    targets.find((target) => target.webSocketDebuggerUrl && target.url.startsWith("app://") && target.type !== "browser") ??
    targets.find((target) => target.webSocketDebuggerUrl && target.type !== "browser") ??
    null
  );
}

export async function waitForRuntimePatchConnection(debugPort: number): Promise<CdpConnection> {
  const deadline = Date.now() + runtimePatchConnectTimeoutMs;
  let lastError: Error | null = null;
  let debuggerResponded = false;
  let rendererTargetFound = false;

  while (Date.now() < deadline) {
    try {
      const target = await findDebuggableRendererTarget(debugPort);
      if (target?.webSocketDebuggerUrl) {
        debugRuntime(`connecting target type=${target.type} url=${target.url}`);
        debuggerResponded = true;
        rendererTargetFound = true;
        try {
          return await CdpConnection.connect(target.webSocketDebuggerUrl);
        } catch (error) {
          lastError = asError(error);
        }
      } else {
        debuggerResponded = true;
      }
    } catch (error) {
      lastError = asError(error);
    }
    await sleep(250);
  }

  if (debuggerResponded && !rendererTargetFound) {
    throw new Error("No debuggable renderer target found.");
  }
  const detail = lastError ? `: ${lastError.message}` : "";
  throw new Error(`CDP connection unavailable after bounded retries${detail}`);
}

export function cdpCommandWithTimeout<T>(command: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    command.then(
      (value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        reject(asError(error));
      },
    );
  });
}
