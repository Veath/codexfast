import { createHash, randomBytes } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

declare const __PATCHER_SOURCE__: string;
declare const __PACKAGE_VERSION__: string;
declare const __SUPPORTED_APP_VERSIONS__: Record<string, string>;

const SUPPORTED_APP_VERSIONS = __SUPPORTED_APP_VERSIONS__;
const appBundle = process.env.CODEXFAST_APP_BUNDLE ?? "/Applications/Codex.app";
const appResources = join(appBundle, "Contents", "Resources");
const appInfoPlist = join(appBundle, "Contents", "Info.plist");
const appAsar = join(appResources, "app.asar");
const appAsarBackup = join(appResources, "app.asar1");
const sparklePublicEdKeyBackup = join(appResources, "SUPublicEDKey.codexfast.bak");
const backupSuffix = ".codexfast.bak";
const legacyBackupSuffix = ".speed-setting.bak";
const asarPackage = "@electron/asar@3.4.1";
const staleArchiveTempFileMs = 10 * 60 * 1000;
const supportedAppVersionKeys = Object.keys(SUPPORTED_APP_VERSIONS).join(", ");
const launchAgentLabel = "com.codexfast.watcher";
const launchAgentFileName = `${launchAgentLabel}.plist`;
const SPARKLE_PUBLIC_ED_KEY_BRIDGES: Record<string, string> = {
  "26.506.31421+2620": "mNfr1v9t63BfgDtlw4C8lRvSY6uMggIXABDOCi3tS6k=",
};

let tempRoot = "";
let tempAppDir = "";
let tempAssetsDir = "";
let tempAsar = "";
let appVersion = "unknown";
let appBuild = "unknown";
let appVersionKey = "unknown+unknown";
let appCompatibility = "unsupported";
let appVersionSupported = false;
let nodeBin = "";
let npmBin = "";
let npxBin = "";
let codesignBin = "";
let plistBuddyBin = "";
let tccutilBin = "";

type ArchiveSnapshot = {
  archivePath: string | null;
  integrityHash: string;
};

type PatcherRun = {
  status: number;
  stdout: string;
  stderr: string;
};

type ApplySummary = {
  changed: number;
  alreadyPatched: number;
};

type MetadataChangeResult = {
  changed: boolean;
  ok: boolean;
};

type CdpTarget = {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
};

type RuntimePatchResult = {
  content: string;
  matchedLabels: string[];
  patchedLabels: string[];
  alreadyPatchedLabels: string[];
};

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

type CdpPendingCommand = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type CdpEventHandler = (params: unknown) => void | Promise<void>;
type CdpEventErrorHandler = (error: Error) => void;

type CdpMessage = {
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    message?: string;
  };
};

const runtimePatchConnectTimeoutMs = 12_000;
const runtimePatchSessionTimeoutMs = 12_000;
const runtimePatchSettleMs = 750;
const runtimePatchHttpTimeoutMs = 3_000;

function printLine(message = ""): void {
  console.log(message);
}

function resolveCommand(name: string): string | null {
  const result = spawnSync("sh", ["-c", 'command -v -- "$1"', "sh", name], { encoding: "utf8" });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim() || null;
}

function resolvePlistBuddy(): string | null {
  return existsSync("/usr/libexec/PlistBuddy") ? "/usr/libexec/PlistBuddy" : null;
}

function run(command: string, args: string[], options: { input?: string; env?: NodeJS.ProcessEnv } = {}): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    input: options.input,
    encoding: "utf8",
    env: options.env ?? process.env,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

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

function decodeWebSocketTextFrames(buffer: Buffer): { messages: string[]; remaining: Buffer } {
  const messages: string[] = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
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
      const extendedLength = buffer.readBigUInt64BE(offset + 2);
      if (extendedLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("CDP frame payload is too large.");
      }
      length = Number(extendedLength);
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
      messages.push(payload.toString("utf8"));
    }
    offset += headerLength + length;
  }

  return { messages, remaining: buffer.subarray(offset) };
}

function runCdpFrameSelfTest(): number {
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
  if (decoded.messages[0] !== "hello runtime" || decoded.remaining.length !== 0) {
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
  if (largeDecoded.messages[0] !== largePayload || largeDecoded.remaining.length !== 0) {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

class CdpConnection {
  private nextCommandId = 1;
  private pending = new Map<number, CdpPendingCommand>();
  private eventHandlers = new Map<string, CdpEventHandler[]>();
  private eventErrorHandlers: CdpEventErrorHandler[] = [];
  private buffer: Buffer = Buffer.alloc(0);

  private constructor(private socket: net.Socket, initialBuffer = Buffer.alloc(0)) {
    this.socket.on("data", (chunk: Buffer) => {
      this.readFrames(chunk);
    });
    this.socket.on("error", (error: Error) => {
      this.rejectPending(error);
    });
    this.socket.on("close", () => {
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

  send<T = unknown>(method: string, params?: unknown): Promise<T> {
    const id = this.nextCommandId;
    this.nextCommandId += 1;
    const payload = params === undefined ? JSON.stringify({ id, method }) : JSON.stringify({ id, method, params });
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value: unknown) => resolve(value as T),
        reject,
      });
      this.socket.write(encodeWebSocketTextFrame(payload));
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
    this.socket.end();
    this.socket.destroy();
  }

  private readFrames(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const decoded = decodeWebSocketTextFrames(this.buffer);
    this.buffer = decoded.remaining;
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
      for (const handler of this.eventHandlers.get(parsed.method) ?? []) {
        Promise.resolve(handler(parsed.params)).catch((error: unknown) => {
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function userHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || "";
}

function launchAgentsDir(): string {
  return join(userHomeDir(), "Library", "LaunchAgents");
}

function codexfastSupportDir(): string {
  return join(userHomeDir(), "Library", "Application Support", "codexfast");
}

function watcherPlistPath(): string {
  return join(launchAgentsDir(), launchAgentFileName);
}

function watcherCliPath(): string {
  return join(codexfastSupportDir(), "codexfast-watcher.js");
}

function launchctlDomain(): string {
  const getuid = process.getuid;
  if (typeof getuid !== "function") {
    throw new Error("Cannot resolve the launchctl GUI domain on this platform.");
  }
  return `gui/${getuid()}`;
}

function readBundlePlistValue(key: string, fallback = "unknown"): string {
  const result = run(plistBuddyBin, ["-c", `Print :${key}`, appInfoPlist]);
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function loadAppCompatibilityMetadata(): void {
  appVersion = readBundlePlistValue("CFBundleShortVersionString");
  appBuild = readBundlePlistValue("CFBundleVersion");
  appVersionKey = `${appVersion}+${appBuild}`;
  appVersionSupported = Object.prototype.hasOwnProperty.call(SUPPORTED_APP_VERSIONS, appVersionKey);
  appCompatibility = appVersionSupported ? `supported (${SUPPORTED_APP_VERSIONS[appVersionKey]})` : "unsupported";
}

function cleanupTempWorkspace(): void {
  if (tempRoot && existsSync(tempRoot)) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
  tempRoot = "";
  tempAppDir = "";
  tempAssetsDir = "";
  tempAsar = "";
}

function createTempWorkspace(): boolean {
  cleanupTempWorkspace();
  try {
    tempRoot = mkdtempSync(join(tmpdir(), "codexfast."));
    tempAppDir = join(tempRoot, "app");
    tempAssetsDir = join(tempAppDir, "webview", "assets");
    tempAsar = join(tempRoot, "app.asar");
    return true;
  } catch {
    printLine("Failed to create a temporary workspace.");
    return false;
  }
}

function runAsar(args: string[]): boolean {
  const result = run(npmBin, ["exec", "--yes", "--package", asarPackage, "--", "asar", ...args]);
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    return false;
  }
  return true;
}

function readAsarIntegrityHash(): string {
  const result = run(plistBuddyBin, ["-c", "Print :ElectronAsarIntegrity:Resources/app.asar:hash", appInfoPlist]);
  return result.status === 0 ? result.stdout.trim() : "";
}

function writeAsarIntegrityHash(hash: string, options: { failureMessage?: string; verificationFailureMessage?: string } = {}): boolean {
  const setResult = run(plistBuddyBin, ["-c", `Set :ElectronAsarIntegrity:Resources/app.asar:hash ${hash}`, appInfoPlist]);
  if (setResult.status !== 0) {
    printLine(options.failureMessage ?? "Failed to update ElectronAsarIntegrity hash in Info.plist.");
    return false;
  }
  if (readAsarIntegrityHash() !== hash) {
    printLine(options.verificationFailureMessage ?? "ElectronAsarIntegrity hash verification failed after updating Info.plist.");
    return false;
  }
  return true;
}

function readSparklePublicEdKey(): string {
  return readBundlePlistValue("SUPublicEDKey", "");
}

function writeSparklePublicEdKey(value: string): boolean {
  const setResult = run(plistBuddyBin, ["-c", `Set :SUPublicEDKey ${value}`, appInfoPlist]);
  if (setResult.status !== 0) {
    const addResult = run(plistBuddyBin, ["-c", `Add :SUPublicEDKey string ${value}`, appInfoPlist]);
    if (addResult.status !== 0) {
      return false;
    }
  }
  return readSparklePublicEdKey() === value;
}

function syncSparklePublicEdKeyForInAppUpdates(): MetadataChangeResult {
  const targetKey = SPARKLE_PUBLIC_ED_KEY_BRIDGES[appVersionKey];
  if (!targetKey) {
    return { changed: false, ok: true };
  }

  const currentKey = readSparklePublicEdKey();
  if (currentKey === targetKey) {
    return { changed: false, ok: true };
  }

  try {
    if (!existsSync(sparklePublicEdKeyBackup)) {
      writeFileSync(sparklePublicEdKeyBackup, currentKey, "utf8");
    }
  } catch {
    printLine("Failed to back up the Sparkle public EdDSA key.");
    return { changed: false, ok: false };
  }

  if (!writeSparklePublicEdKey(targetKey)) {
    printLine("Failed to update the Sparkle public EdDSA key for in-app updates.");
    return { changed: false, ok: false };
  }

  printLine("Updated Sparkle public EdDSA key for in-app updates.");
  return { changed: true, ok: true };
}

function restoreSparklePublicEdKeyBackup(): MetadataChangeResult {
  if (!existsSync(sparklePublicEdKeyBackup)) {
    return { changed: false, ok: true };
  }

  let originalKey = "";
  try {
    originalKey = readFileSync(sparklePublicEdKeyBackup, "utf8").trim();
  } catch {
    printLine("Failed to read the Sparkle public EdDSA key backup.");
    return { changed: false, ok: false };
  }

  if (!writeSparklePublicEdKey(originalKey)) {
    printLine("Failed to restore the Sparkle public EdDSA key backup.");
    return { changed: false, ok: false };
  }

  try {
    rmSync(sparklePublicEdKeyBackup, { force: true });
  } catch {
    printLine("Failed to remove the Sparkle public EdDSA key backup.");
    return { changed: true, ok: false };
  }

  printLine("Restored Sparkle public EdDSA key backup.");
  return { changed: true, ok: true };
}

function calculateAsarHeaderHash(archivePath = appAsar): string | null {
  try {
    const archive = readFileSync(archivePath);
    const headerStringSize = archive.readUInt32LE(12);
    const headerString = archive.subarray(16, 16 + headerStringSize).toString("utf8");
    return createHash("sha256").update(headerString).digest("hex");
  } catch {
    return null;
  }
}

function updateAsarIntegrityMetadata(): boolean {
  const currentHash = calculateAsarHeaderHash();
  if (!currentHash) {
    printLine("Failed to calculate the Electron ASAR header hash for app.asar.");
    return false;
  }

  if (!readAsarIntegrityHash()) {
    printLine("ElectronAsarIntegrity entry not found in Info.plist. Skipping metadata update.");
    return true;
  }

  if (!writeAsarIntegrityHash(currentHash)) {
    return false;
  }

  printLine("Updated ElectronAsarIntegrity hash in Info.plist.");
  return true;
}

function createArchiveSnapshot(): ArchiveSnapshot | null {
  if (!tempRoot && !createTempWorkspace()) {
    return null;
  }

  const integrityHash = readAsarIntegrityHash();
  if (!existsSync(appAsar)) {
    return { archivePath: null, integrityHash };
  }

  const archivePath = join(tempRoot, "previous.app.asar");
  try {
    copyFileSync(appAsar, archivePath);
    return { archivePath, integrityHash };
  } catch {
    printLine("Failed to snapshot the current app.asar before replacing it.");
    return null;
  }
}

function restoreArchiveSnapshot(snapshot: ArchiveSnapshot): boolean {
  let archiveRestored = false;
  if (snapshot.archivePath) {
    printLine("Reverting to the pre-change app.asar after failed integrity update.");
    archiveRestored = replaceAppAsarFrom(snapshot.archivePath, "Failed to restore the previous app.asar after integrity update failure.");
  } else {
    printLine("Removing app.asar created during failed integrity update.");
    try {
      rmSync(appAsar, { force: true });
      archiveRestored = true;
    } catch {
      printLine("Failed to remove app.asar after integrity update failure.");
    }
  }

  let integrityRestored = true;
  if (snapshot.integrityHash && readAsarIntegrityHash() !== snapshot.integrityHash) {
    integrityRestored = writeAsarIntegrityHash(snapshot.integrityHash, {
      failureMessage: "Failed to restore previous ElectronAsarIntegrity hash in Info.plist.",
      verificationFailureMessage: "ElectronAsarIntegrity hash verification failed after restoring previous Info.plist hash.",
    });
  }

  return archiveRestored && integrityRestored;
}

function ensureArchiveBackup(): boolean {
  if (existsSync(appAsarBackup)) {
    printLine(`Archive backup already exists: ${appAsarBackup}`);
    return true;
  }
  try {
    writeFileSync(appAsarBackup, readFileSync(appAsar));
    printLine(`Created archive backup: ${appAsarBackup}`);
    return true;
  } catch {
    printLine("Failed to create app.asar backup.");
    return false;
  }
}

function unpackAppAsarToTemp(): boolean {
  if (!createTempWorkspace()) {
    return false;
  }
  if (!runAsar(["e", appAsar, tempAppDir])) {
    printLine("Failed to unpack app.asar.");
    return false;
  }
  if (!existsSync(tempAssetsDir)) {
    printLine(`Assets directory not found: ${tempAssetsDir}`);
    return false;
  }
  return true;
}

function packTempAppToAsar(): boolean {
  if (!tempAsar) {
    printLine("Temporary archive path is not available.");
    return false;
  }
  if (!runAsar(["p", tempAppDir, tempAsar])) {
    printLine("Failed to repack app.asar.");
    return false;
  }
  return true;
}

function replaceAppAsarFrom(sourceArchive: string, failureMessage: string): boolean {
  const targetTempAsar = join(appResources, `.codexfast.${process.pid}.${randomBytes(6).toString("hex")}.app.asar.tmp`);
  try {
    rmSync(targetTempAsar, { force: true });
    copyFileSync(sourceArchive, targetTempAsar);
    renameSync(targetTempAsar, appAsar);
    return true;
  } catch {
    rmSync(targetTempAsar, { force: true });
    printLine(failureMessage);
    return false;
  }
}

function commitArchiveWithIntegrity(sourceArchive: string, snapshot: ArchiveSnapshot): boolean {
  if (!replaceAppAsarFrom(sourceArchive, "Failed to replace app.asar with the repacked archive.")) {
    return false;
  }
  if (updateAsarIntegrityMetadata()) {
    return true;
  }
  if (!restoreArchiveSnapshot(snapshot)) {
    printLine("Bundle may be in an inconsistent state. Re-run restore or reinstall Codex.app.");
  }
  return false;
}

function cleanupStaleArchiveTempFiles(): void {
  if (!existsSync(appResources)) {
    return;
  }
  const staleBeforeMs = Date.now() - staleArchiveTempFileMs;
  for (const entry of readdirSync(appResources)) {
    if (!entry.startsWith(".codexfast.") || !entry.endsWith(".app.asar.tmp")) {
      continue;
    }
    const tempFile = join(appResources, entry);
    try {
      if (statSync(tempFile).mtimeMs < staleBeforeMs) {
        rmSync(tempFile, { force: true });
      }
    } catch {
      rmSync(tempFile, { force: true });
    }
  }
}

function migrateLegacyUnpackedLayout(): boolean {
  const unpackedAppDir = join(appResources, "app");
  if (!existsSync(unpackedAppDir)) {
    return true;
  }

  printLine("Detected legacy unpacked Resources/app layout. Repacking into app.asar.");
  if (!createTempWorkspace()) {
    return false;
  }
  try {
    if (!existsSync(appAsarBackup) && existsSync(appAsar)) {
      if (!ensureArchiveBackup()) {
        return false;
      }
    }

    const snapshot = createArchiveSnapshot();
    if (!snapshot) {
      return false;
    }

    if (!runAsar(["p", unpackedAppDir, tempAsar])) {
      printLine("Failed to repack legacy Resources/app directory.");
      return false;
    }

    if (!commitArchiveWithIntegrity(tempAsar, snapshot)) {
      return false;
    }
    rmSync(unpackedAppDir, { recursive: true, force: true });
    return resignAppBundle("Legacy unpacked layout was migrated. Re-signing now.");
  } finally {
    cleanupTempWorkspace();
  }
}

function restoreFromArchiveBackup(): boolean {
  if (!existsSync(appAsarBackup)) {
    return false;
  }

  if (!createTempWorkspace()) {
    return false;
  }
  try {
    const snapshot = createArchiveSnapshot();
    if (!snapshot) {
      return false;
    }
    printLine(`Restoring app.asar from archive backup: ${appAsarBackup}`);
    if (!commitArchiveWithIntegrity(appAsarBackup, snapshot)) {
      return false;
    }
    const metadataChange = restoreSparklePublicEdKeyBackup();
    if (!metadataChange.ok) {
      return false;
    }
    if (!resignAppBundle("Original archive was restored. Re-signing now.")) {
      return false;
    }
    resetScreenRecordingPermission();
    return true;
  } finally {
    cleanupTempWorkspace();
  }
}

function printManualResignGuidance(): void {
  printLine("Manual fallback:");
  printLine(`  codesign --force --deep --sign - ${appBundle}`);
  printLine(`  codesign --verify --deep --strict --verbose=2 ${appBundle}`);
  printLine("If verification still fails, run Restore original app or reinstall Codex.app.");
}

function officialCodexDownloadUrl(): string | null {
  if (!appVersion || appVersion === "unknown") {
    return null;
  }
  return `https://persistent.oaistatic.com/codex-app-prod/Codex-darwin-arm64-${appVersion}.zip`;
}

function printOfficialReinstallGuidanceAfterRestore(): void {
  printLine("");
  printLine("Official signature recovery:");
  printLine("  Restore keeps the existing codexfast rollback behavior and re-signs locally.");
  printLine("  To recover the OpenAI Developer ID signature, reinstall the official Codex.app build manually.");
  const downloadUrl = officialCodexDownloadUrl();
  if (downloadUrl) {
    printLine(`  Current-version download: ${downloadUrl}`);
  } else {
    printLine("  Appcast: https://persistent.oaistatic.com/codex-app-prod/appcast.xml");
  }
}

function resignAppBundle(reason: string): boolean {
  printLine(reason);
  printLine("Running local ad-hoc re-sign...");
  const result = run(codesignBin, ["--force", "--deep", "--sign", "-", appBundle]);
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    printLine("Failed to re-sign Codex.app.");
    printManualResignGuidance();
    return false;
  }

  const verifyResult = run(codesignBin, ["--verify", "--deep", "--strict", "--verbose=2", appBundle]);
  if (verifyResult.status !== 0) {
    process.stdout.write(verifyResult.stdout);
    process.stderr.write(verifyResult.stderr);
    printLine("Failed to verify the re-signed Codex.app.");
    printManualResignGuidance();
    return false;
  }

  printLine("Re-sign completed.");
  return true;
}

function resetScreenRecordingPermission(): void {
  const bundleIdentifier = readBundlePlistValue("CFBundleIdentifier", "");
  if (!bundleIdentifier) {
    printLine("Could not reset macOS screen recording permission because CFBundleIdentifier was not found.");
    return;
  }

  const manualCommand = `tccutil reset ScreenCapture ${bundleIdentifier}`;
  if (!tccutilBin) {
    printLine("Could not reset macOS screen recording permission because tccutil was not found.");
    printLine(`Run manually if Codex keeps asking for screen recording permission: ${manualCommand}`);
    return;
  }

  const result = run(tccutilBin, ["reset", "ScreenCapture", bundleIdentifier]);
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    printLine("Failed to reset macOS screen recording permission.");
    printLine(`Run manually if Codex keeps asking for screen recording permission: ${manualCommand}`);
    return;
  }

  printLine(`Reset macOS screen recording permission for ${bundleIdentifier}.`);
  printLine("Open Codex.app again and allow Screen & System Audio Recording when prompted.");
}

function checkRequirements(options: { command?: string } = {}): boolean {
  if (!existsSync(appResources)) {
    printLine(`Codex resources directory not found: ${appResources}`);
    printLine(`Make sure Codex.app is installed at ${appBundle}.`);
    return false;
  }

  nodeBin = process.execPath;
  plistBuddyBin = resolvePlistBuddy() ?? "";

  if (!plistBuddyBin) {
    printLine("PlistBuddy not found.");
    printLine("This macOS environment cannot update ElectronAsarIntegrity in Info.plist.");
    return false;
  }

  cleanupStaleArchiveTempFiles();

  loadAppCompatibilityMetadata();

  if ((options.command === "repair" && !appVersionSupported) || options.command === "launch") {
    return true;
  }

  npmBin = resolveCommand("npm") ?? "";
  npxBin = resolveCommand("npx") ?? "";
  codesignBin = resolveCommand("codesign") ?? "";
  tccutilBin = resolveCommand("tccutil") ?? "";

  if (!npmBin) {
    printLine("npm not found.");
    printLine("Make sure npm is available in your shell.");
    return false;
  }
  if (options.command === "install-watcher" && !npxBin) {
    printLine("npx not found.");
    printLine("Make sure npx is available in your shell.");
    return false;
  }
  if (!codesignBin) {
    printLine("codesign not found.");
    printLine("This macOS environment cannot perform local re-signing.");
    return false;
  }

  return true;
}

function printActionHeader(action: string): void {
  printLine("");
  printLine(`Action: ${action}`);
  printLine(`Resources: ${appResources}`);
  printLine(`Detected version: ${appVersion}`);
  printLine(`Detected build: ${appBuild}`);
  printLine(`Compatibility: ${appCompatibility}`);
  printLine("Mode: self-contained single file");
  printLine("");
}

function validateActionRequest(action: string): boolean {
  if ((action === "apply" || action === "repair") && !appVersionSupported) {
    if (action === "repair") {
      printLine("Repair skipped because this Codex.app build is unsupported.");
      printLine("No app files were modified.");
      printLine(`Supported versions: ${supportedAppVersionKeys}`);
      printLine("");
      printLine("Exit code: 0");
      return false;
    }
    printLine("Enable custom API features is blocked for this Codex.app version.");
    printLine("This script only allows apply on verified compatible builds.");
    printLine(`Supported versions: ${supportedAppVersionKeys}`);
    printLine("");
    printLine("Exit code: 1");
    return false;
  }
  return true;
}

function removeWatcherFiles(options: { quietLaunchctl?: boolean; reportRemoved?: boolean } = {}): boolean {
  const hadWatcherFiles = existsSync(watcherPlistPath()) || existsSync(watcherCliPath());
  runLaunchctl(["bootout", launchctlDomain(), watcherPlistPath()], { quiet: options.quietLaunchctl });
  try {
    rmSync(watcherPlistPath(), { force: true });
    rmSync(watcherCliPath(), { force: true });
  } catch {
    return false;
  }
  if (hadWatcherFiles && options.reportRemoved) {
    printLine("Removed auto-repair watcher before restore.");
  }
  return true;
}

function parseApplySummary(output: string): ApplySummary | null {
  const match = output.match(/summary: changed=(\d+), alreadyPatched=(\d+)/);
  if (!match) {
    return null;
  }
  return {
    changed: Number(match[1]),
    alreadyPatched: Number(match[2]),
  };
}

function runEmbeddedPatcher(action: string): PatcherRun {
  const patcherAction = action === "repair" ? "apply" : action;
  const result = run(nodeBin, ["-", patcherAction, tempAssetsDir, backupSuffix, legacyBackupSuffix, appVersionKey], {
    input: __PATCHER_SOURCE__,
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result;
}

function finalizeModifiedArchive(action: string): boolean {
  if ((action === "apply" || action === "repair") && !ensureArchiveBackup()) {
    return false;
  }
  const snapshot = createArchiveSnapshot();
  if (!snapshot) {
    return false;
  }
  if (!packTempAppToAsar()) {
    return false;
  }
  if (!commitArchiveWithIntegrity(tempAsar, snapshot)) {
    return false;
  }
  if (action === "apply" || action === "repair") {
    const metadataChange = syncSparklePublicEdKeyForInAppUpdates();
    if (!metadataChange.ok) {
      return false;
    }
  }
  if (!resignAppBundle("Codex.app resources were modified. Re-signing now.")) {
    return false;
  }
  if (action === "apply" || action === "repair" || action === "restore") {
    resetScreenRecordingPermission();
  }
  return true;
}

function runEmbeddedTool(action: string): number {
  let exitCode = 1;
  printActionHeader(action);

  if (!validateActionRequest(action)) {
    return action === "repair" ? 0 : 1;
  }

  if (action === "restore" && !removeWatcherFiles({ quietLaunchctl: true, reportRemoved: true })) {
    printLine("Warning: failed to remove the auto-repair watcher before restore.");
    printLine("Run uninstall-watcher manually if restore is re-applied automatically.");
  }

  if (!migrateLegacyUnpackedLayout()) {
    return 1;
  }
  if (!existsSync(appAsar)) {
    printLine(`app.asar not found: ${appAsar}`);
    return 1;
  }

  if (action === "restore" && existsSync(appAsarBackup)) {
    exitCode = restoreFromArchiveBackup() ? 0 : 1;
    if (exitCode === 0) {
      printOfficialReinstallGuidanceAfterRestore();
    }
    printLine("");
    printLine(`Exit code: ${exitCode}`);
    return exitCode;
  }

  if (!unpackAppAsarToTemp()) {
    cleanupTempWorkspace();
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }

  const patcherRun = runEmbeddedPatcher(action);
  exitCode = patcherRun.status;

  if (exitCode === 0 && action !== "status") {
    if (action === "apply" || action === "repair") {
      const summary = parseApplySummary(patcherRun.stdout);
      if (summary && summary.changed === 0) {
        const metadataChange = syncSparklePublicEdKeyForInAppUpdates();
        if (!metadataChange.ok) {
          exitCode = 1;
        } else if (metadataChange.changed) {
          if (!resignAppBundle("Codex.app metadata was modified. Re-signing now.")) {
            exitCode = 1;
          } else {
            resetScreenRecordingPermission();
          }
        } else {
          printLine("No patch changes were needed; leaving app.asar and signature untouched.");
        }
      } else if (!finalizeModifiedArchive(action)) {
        exitCode = 1;
      }
    } else if (!finalizeModifiedArchive(action)) {
      exitCode = 1;
    }
  }

  cleanupTempWorkspace();
  if (action === "restore" && exitCode === 0) {
    printOfficialReinstallGuidanceAfterRestore();
  }
  printLine("");
  printLine(`Exit code: ${exitCode}`);
  return exitCode;
}

type CodexRunningCheck =
  | { ok: true; running: boolean }
  | { ok: false; message: string };

function checkCodexRunning(): CodexRunningCheck {
  if (process.env.CODEXFAST_TEST_CODEX_RUNNING === "1") {
    return { ok: true, running: true };
  }

  const pgrepBin = resolveCommand("pgrep");
  if (!pgrepBin) {
    return { ok: false, message: "Cannot determine whether Codex.app is running because pgrep was not found." };
  }

  const result = run(pgrepBin, ["-x", "Codex"]);
  if (result.status === 0) {
    return { ok: true, running: true };
  }
  if (result.status === 1) {
    return { ok: true, running: false };
  }
  return { ok: false, message: `Cannot determine whether Codex.app is running because pgrep failed with exit code ${result.status}.` };
}

function randomDebugPort(): number {
  return 40_000 + randomBytes(2).readUInt16BE(0) % 20_000;
}

function codexExecutablePath(): string {
  return join(appBundle, "Contents", "MacOS", "Codex");
}

function launchCodexProcess(debugPort: number): ChildProcess {
  const executable = codexExecutablePath();
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
      detached: false,
      stdio: "ignore",
      env: process.env,
    },
  );
  child.on("error", () => undefined);
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

let runtimePatchBodyFunction: ((resourcePath: string, body: string) => RuntimePatchResult) | null = null;

function applyRuntimePatchesToResponseBody(resourcePath: string, body: string): RuntimePatchResult {
  if (!runtimePatchBodyFunction) {
    const tailMarker = "\nlet exitCode = 1;\n";
    const tailIndex = __PATCHER_SOURCE__.lastIndexOf(tailMarker);
    if (tailIndex === -1) {
      throw new Error("Embedded runtime patch engine entrypoint was not found.");
    }
    const patcherMarker = '\nconst fs = require("node:fs");\n';
    const patcherIndex = __PATCHER_SOURCE__.indexOf(patcherMarker);
    const engineEnd = patcherIndex === -1 ? tailIndex : patcherIndex;
    const engineSource = __PATCHER_SOURCE__.slice(0, engineEnd);
    const factory = new Function(`${engineSource}\nreturn applyRuntimePatchesToBody;`) as () => unknown;
    const candidate = factory();
    if (typeof candidate !== "function") {
      throw new Error("Embedded runtime patch engine is unavailable.");
    }
    runtimePatchBodyFunction = candidate as (resourcePath: string, body: string) => RuntimePatchResult;
  }
  return runtimePatchBodyFunction(resourcePath, body);
}

function isRuntimeJavaScriptResource(resourceUrl: string): boolean {
  return /^app:\/\/.*\/webview\/assets\/[^/?#]+\.js(?:[?#].*)?$/.test(resourceUrl);
}

function responseHeadersForFulfill(headers: FetchHeader[] | undefined): FetchHeader[] {
  const forwarded: FetchHeader[] = [];
  for (const header of headers ?? []) {
    const name = header.name.toLowerCase();
    if (name === "content-type" || name === "charset") {
      forwarded.push({ name: header.name, value: header.value });
    }
  }
  if (!forwarded.some((header) => header.name.toLowerCase() === "content-type")) {
    forwarded.push({ name: "content-type", value: "application/javascript; charset=utf-8" });
  }
  return forwarded;
}

async function continueFetchRequest(cdp: CdpConnection, requestId: string): Promise<void> {
  await cdp.send("Fetch.continueRequest", { requestId });
}

async function handleFetchRequestPaused(
  cdp: CdpConnection,
  params: FetchRequestPausedParams,
): Promise<string[]> {
  const resourceUrl = params.request.url;
  if (!isRuntimeJavaScriptResource(resourceUrl)) {
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }

  let bodyResult: { body?: string; base64Encoded?: boolean };
  try {
    bodyResult = await cdp.send("Fetch.getResponseBody", { requestId: params.requestId });
  } catch {
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }

  if (typeof bodyResult.body !== "string") {
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }

  const body = bodyResult.base64Encoded ? Buffer.from(bodyResult.body, "base64").toString("utf8") : bodyResult.body;
  let patchResult: RuntimePatchResult;
  try {
    patchResult = applyRuntimePatchesToResponseBody(resourceUrl, body);
  } catch {
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }
  const labels = [...patchResult.patchedLabels, ...patchResult.alreadyPatchedLabels];

  if (patchResult.content === body) {
    await continueFetchRequest(cdp, params.requestId);
    return labels;
  }

  await cdp.send("Fetch.fulfillRequest", {
    requestId: params.requestId,
    responseCode: params.responseStatusCode ?? 200,
    responseHeaders: responseHeadersForFulfill(params.responseHeaders),
    body: Buffer.from(patchResult.content, "utf8").toString("base64"),
  });
  return labels;
}

async function findDebuggableRendererTarget(debugPort: number): Promise<CdpTarget | null> {
  const targets = await httpGetJson<CdpTarget[]>(`http://127.0.0.1:${debugPort}/json/list`);
  return (
    targets.find((target) => target.webSocketDebuggerUrl && target.url.startsWith("app://") && target.type !== "browser") ??
    targets.find((target) => target.webSocketDebuggerUrl && target.type !== "browser") ??
    null
  );
}

async function waitForRuntimePatchConnection(debugPort: number): Promise<CdpConnection> {
  const deadline = Date.now() + runtimePatchConnectTimeoutMs;
  let lastError: Error | null = null;
  let debuggerResponded = false;
  let rendererTargetFound = false;

  while (Date.now() < deadline) {
    try {
      const target = await findDebuggableRendererTarget(debugPort);
      if (target?.webSocketDebuggerUrl) {
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

async function runRuntimePatchSession(debugPort: number): Promise<string[]> {
  const cdp = await waitForRuntimePatchConnection(debugPort);
  const observedLabels = new Set<string>();
  const pausedRequestHandlers = new Set<Promise<void>>();
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let failSession: (error: Error) => void = () => undefined;

  try {
    const session = new Promise<string[]>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let completed = false;
      let finishStarted = false;

      const clearSessionTimers = (): void => {
        if (settleTimer) {
          clearTimeout(settleTimer);
          settleTimer = null;
        }
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
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
          if (observedLabels.size === 0) {
            fail(new Error("Runtime patch interception completed without required targets."));
            return;
          }
          completed = true;
          resolve([...observedLabels]);
        })();
      };

      const markObserved = (): void => {
        if (completed || settleTimer) {
          return;
        }
        settleTimer = setTimeout(finish, runtimePatchSettleMs);
      };

      timeout = setTimeout(finish, runtimePatchSessionTimeoutMs);
      cdp.onEventError(fail);
      cdp.on("Fetch.requestPaused", (params: unknown) => {
        if (completed) {
          return;
        }
        const task = handleFetchRequestPaused(cdp, params as FetchRequestPausedParams)
          .then((labels) => {
            for (const label of labels) {
              observedLabels.add(label);
            }
            if (labels.length > 0) {
              markObserved();
            }
          });
        pausedRequestHandlers.add(task);
        task.then(
          () => pausedRequestHandlers.delete(task),
          () => pausedRequestHandlers.delete(task),
        );
        return task;
      });
    });
    void session.catch(() => undefined);

    try {
      await cdp.send("Fetch.enable", {
        patterns: [
          {
            urlPattern: "app://*/webview/assets/*.js",
            requestStage: "Response",
          },
        ],
      });
      await cdp.send("Page.enable");
      await cdp.send("Page.reload", { ignoreCache: true });
    } catch (error) {
      failSession(asError(error));
    }

    return await session;
  } finally {
    cdp.close();
  }
}

async function waitForRuntimePatchSession(debugPort: number): Promise<string[]> {
  return runRuntimePatchSession(debugPort);
}

async function runRuntimeLaunch(): Promise<number> {
  printActionHeader("launch");

  if (!appVersionSupported) {
    printLine("Runtime launch is blocked for this Codex.app version.");
    printLine(`Supported versions: ${supportedAppVersionKeys}`);
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }

  const runningCheck = checkCodexRunning();
  if (!runningCheck.ok) {
    printLine(runningCheck.message);
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }

  if (runningCheck.running) {
    printLine("Codex.app is already running. Quit Codex.app before using runtime launch.");
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }

  if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS === "1") {
    printLine("Runtime launch completed.");
    printLine("Patched targets:");
    printLine("  Browser-use native pipe peer auth");
    printLine("");
    printLine("Exit code: 0");
    return 0;
  }

  let child: ChildProcess | null = null;
  try {
    const debugPort = randomDebugPort();
    child = launchCodexProcess(debugPort);
    const patchedLabels = await waitForRuntimePatchSession(debugPort);
    printLine("Runtime launch completed.");
    printLine("Patched targets:");
    for (const label of patchedLabels) {
      printLine(`  ${label}`);
    }
    child.unref();
    printLine("");
    printLine("Exit code: 0");
    return 0;
  } catch (error) {
    if (child && !child.killed) {
      terminateRuntimeLaunchProcess(child);
    }
    printLine(`Runtime launch failed: ${asError(error).message}`);
  }

  printLine("");
  printLine("Exit code: 1");
  return 1;
}

function watcherRunnerSource(): string {
  return `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

const result = spawnSync(${JSON.stringify(npxBin)}, ["--yes", "codexfast@latest", "repair"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
`;
}

function writeWatcherRunner(): boolean {
  if (!npxBin) {
    npxBin = resolveCommand("npx") ?? "";
  }
  if (!npxBin) {
    printLine("npx not found.");
    printLine("Make sure npx is available in your shell.");
    return false;
  }
  try {
    mkdirSync(codexfastSupportDir(), { recursive: true });
    writeFileSync(watcherCliPath(), watcherRunnerSource(), "utf8");
    chmodSync(watcherCliPath(), 0o755);
    return true;
  } catch {
    printLine("Failed to install the watcher runner.");
    return false;
  }
}

function watcherPlist(): string {
  const environmentEntries = [
    ["CODEXFAST_APP_BUNDLE", appBundle],
    ["PATH", process.env.PATH ?? "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"],
  ];
  const environmentXml = environmentEntries
    .map(([key, value]) => `      <key>${escapeXml(key)}</key>\n      <string>${escapeXml(value)}</string>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(launchAgentLabel)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(process.execPath)}</string>
    <string>${escapeXml(watcherCliPath())}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
${environmentXml}
  </dict>
  <key>WatchPaths</key>
  <array>
    <string>${escapeXml(appAsar)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>60</integer>
</dict>
</plist>
`;
}

function runLaunchctl(args: string[], options: { quiet?: boolean } = {}): boolean {
  const launchctlBin = resolveCommand("launchctl");
  if (!launchctlBin) {
    if (!options.quiet) {
      printLine("launchctl not found.");
    }
    return false;
  }
  const result = run(launchctlBin, args);
  if (result.status !== 0) {
    if (!options.quiet) {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
    }
    return false;
  }
  return true;
}

function installWatcher(): number {
  printActionHeader("install-watcher");
  if (!existsSync(appAsar)) {
    printLine(`app.asar not found: ${appAsar}`);
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }
  if (!writeWatcherRunner()) {
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }
  try {
    mkdirSync(launchAgentsDir(), { recursive: true });
    writeFileSync(watcherPlistPath(), watcherPlist());
  } catch {
    printLine("Failed to write the launchd watcher plist.");
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }

  runLaunchctl(["bootout", launchctlDomain(), watcherPlistPath()], { quiet: true });
  if (!runLaunchctl(["bootstrap", launchctlDomain(), watcherPlistPath()])) {
    printLine("Watcher plist was written, but launchctl failed to load it.");
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }
  printLine(`Installed watcher: ${watcherPlistPath()}`);
  printLine("");
  printLine("Exit code: 0");
  return 0;
}

function uninstallWatcher(): number {
  printActionHeader("uninstall-watcher");
  if (!removeWatcherFiles()) {
    printLine("Failed to remove all watcher files.");
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }
  printLine("Uninstalled watcher.");
  printLine("");
  printLine("Exit code: 0");
  return 0;
}

function printUsage(): void {
  printLine(`codexfast ${__PACKAGE_VERSION__}`);
  printLine("");
  printLine("Usage:");
  printLine("  codexfast");
  printLine("  codexfast <command>");
  printLine("");
  printLine("Commands:");
  printLine("  status             Check version, compatibility, and feature state");
  printLine("  launch             Launch Codex with runtime patches (recommended)");
  printLine("  apply              Apply legacy bundle patches (fallback)");
  printLine("  repair             Safely re-apply missing patches; no-op on unsupported or already patched builds");
  printLine("  restore            Restore legacy bundle patch backups");
  printLine("  install-watcher    Install the macOS launchd auto-repair watcher");
  printLine("  uninstall-watcher  Remove the auto-repair watcher");
  printLine("  version            Print the codexfast version");
  printLine("  help               Show this help");
}

function printVersion(): void {
  printLine(`codexfast ${__PACKAGE_VERSION__}`);
}

async function showMenu(): Promise<number> {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      run("clear", []);
      printLine("codexfast");
      printLine("");
      printLine("1) Launch Codex with runtime patches (recommended)");
      printLine("2) Check current status");
      printLine("3) Apply legacy bundle patches (fallback)");
      printLine("4) Restore legacy bundle patch backups");
      printLine("5) Install auto-repair watcher");
      printLine("6) Uninstall auto-repair watcher");
      printLine("q) Quit");
      printLine("");

      const choice = (await rl.question("Select an option: ")).trim();
      switch (choice) {
        case "1":
          runEmbeddedTool("launch");
          await rl.question("Press Enter to continue...");
          break;
        case "2":
          runEmbeddedTool("status");
          await rl.question("Press Enter to continue...");
          break;
        case "3":
          runEmbeddedTool("apply");
          await rl.question("Press Enter to continue...");
          break;
        case "4":
          runEmbeddedTool("restore");
          await rl.question("Press Enter to continue...");
          break;
        case "5":
          installWatcher();
          await rl.question("Press Enter to continue...");
          break;
        case "6":
          uninstallWatcher();
          await rl.question("Press Enter to continue...");
          break;
        case "q":
        case "Q":
          return 0;
        default:
          printLine("Unknown option.");
          await rl.question("Press Enter to continue...");
      }
    }
  } finally {
    rl.close();
    cleanupTempWorkspace();
  }
}

async function main(): Promise<number> {
  // Keep accepting the old watcher marker so existing launchd plists and user
  // scripts keep working, but do not advertise it for new installs.
  const args = process.argv.slice(2).filter((arg) => arg !== "--quiet");
  const command = args[0] ?? "";

  if (command === "__selftest-cdp-frame") {
    return runCdpFrameSelfTest();
  }

  if (command === "-h" || command === "--help" || command === "help") {
    printUsage();
    return 0;
  }
  if (command === "-v" || command === "--version" || command === "version") {
    printVersion();
    return 0;
  }
  if (command === "uninstall-watcher") {
    return uninstallWatcher();
  }

  if (!checkRequirements({ command })) {
    cleanupTempWorkspace();
    return 1;
  }

  if (command) {
    switch (command) {
      case "status":
      case "apply":
      case "repair":
      case "restore":
        return runEmbeddedTool(command);
      case "launch":
        return await runRuntimeLaunch();
      case "install-watcher":
        return installWatcher();
      default:
        printUsage();
        return 1;
    }
  }

  return showMenu();
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    cleanupTempWorkspace();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
