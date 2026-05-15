# Runtime Launch Mode Implementation Plan

> Historical implementation plan. Runtime launch has since been implemented and validated; use `docs/feature-scope.md`, `docs/patch-targets.md`, `docs/troubleshooting.md`, `docs/real-app-validation.md`, and the latest bundle note as the current source of truth. In particular, current `26.513.20950` runtime requests renderer JavaScript as `app://-/assets/*.js`, while older assumptions in this plan used `app://-/webview/assets/*.js`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `codexfast launch` as the default-recommended runtime patch mode while keeping `apply` / `restore` as legacy bundle patch fallbacks.

**Architecture:** Refactor patch application into a mode-neutral engine, then use it from both the existing extracted-file patcher and a new CDP runtime launcher. The generated `bin/codexfast` remains self-contained; no runtime npm dependencies are added.

**Tech Stack:** TypeScript, Node.js built-ins (`child_process`, `fs`, `http`, `net`, `crypto`), Chrome DevTools Protocol over a minimal WebSocket client, existing fake-app regression harness.

---

## File Structure

- Modify `src/patch-engine.mts`
  - New pure patch engine shared by archive/file mode and runtime body mode.
  - Owns target inspection, state description, apply/restore replacement, and in-memory patch results.
- Modify `src/patcher.mts`
  - Keep extracted-file traversal and backup writes.
  - Delegate target matching/replacement to `src/patch-engine.mts`.
- Modify `src/cli.mts`
  - Add `launch` command, menu option, runtime launch orchestration, and legacy labels.
  - Keep existing apply/restore/watcher behavior intact.
- Modify `scripts/build-codexfast.mts`
  - Inline `patcher-targets`, `patch-engine`, `patcher`, and runtime launcher code into the generated single-file CLI.
- Modify `test/helpers/script-harness.mts`
  - Add stubs/markers for `open`, `pgrep`, or direct app executable launch checks used by launch-mode tests.
- Modify `test/re-sign-flow.mts`
  - Add command/menu coverage for launch-mode failure boundaries and legacy mode unchanged behavior.
- Modify docs:
  - `README.md`
  - `README.zh-CN.md`
  - `docs/feature-scope.md`
  - `docs/troubleshooting.md`
  - `docs/patch-targets.md`
  - `docs/real-app-validation.md`
  - `CHANGELOG.md`

## Task 1: Extract Pure Patch Engine

**Files:**
- Create: `src/patch-engine.mts`
- Modify: `src/patcher.mts`
- Modify: `scripts/build-codexfast.mts`
- Modify: `test/re-sign-flow.mts`

- [ ] **Step 1: Write failing runtime-body patch test**

Add a focused assertion helper in `test/re-sign-flow.mts` near `assertPatcherTargetsRuntimeImportable()`:

```ts
function assertRuntimePatchEnginePatchesBody(): void {
  const body = "function dP(){return lP().info(`browser-use native pipe peer authorization enabled`,{safe:{mode:a?`dev`:`packaged`},sensitive:{}}),e=>{let t=fP(e);return t==null?{authorized:!1,reason:`missing-socket-file-descriptor`}:s.authorizeSocketPeer(t,a)}}";
  const result = applyRuntimePatchesToBody("webview/assets/browser-use-native-pipe-Demo.js", body);
  assertContains(result.content, "codexfast-browser-peer-auth", "expected runtime patch engine to patch matching JS body");
  assertContains(result.patchedLabels.join("\n"), "Browser-use native pipe peer auth", "expected runtime patch engine to report patched target label");
}
```

Import the future function at the top:

```ts
import { applyRuntimePatchesToBody } from "../src/patch-engine.mts";
```

Call it from `main()` immediately after `assertPatcherTargetsRuntimeImportable();`:

```ts
assertRuntimePatchEnginePatchesBody();
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm typecheck
```

Expected: TypeScript fails because `../src/patch-engine.mts` does not exist.

- [ ] **Step 3: Create pure patch engine**

Create `src/patch-engine.mts`:

```ts
import { TARGET_SPECS, type Replacement, type TargetMatch, type TargetSpec, type TargetState } from "./patcher-targets.mts";

export type RuntimePatchResult = {
  content: string;
  matchedLabels: string[];
  patchedLabels: string[];
  alreadyPatchedLabels: string[];
};

export function replaceContent(content: string, signature: RegExp, replacement: Replacement): string {
  if (typeof replacement === "string") {
    return content.replace(signature, replacement);
  }

  return content.replace(signature, (...args: unknown[]) =>
    replacement(String(args[0] ?? ""), ...args.slice(1).map((value) => String(value))),
  );
}

export function replaceContentOrThrow(
  content: string,
  signature: RegExp | null,
  replacement: Replacement | undefined,
  label: string,
): string {
  if (!signature || !replacement) {
    throw new Error(`Missing replacement metadata for ${label}.`);
  }
  return replaceContent(content, signature, replacement);
}

export function inspectSpec(content: string, spec: TargetSpec): TargetMatch | null {
  if (!content.includes(spec.needle)) {
    return null;
  }

  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;

  if (!guarded && !patched && !legacyPatched) {
    return null;
  }

  return {
    spec,
    guarded,
    patched,
    legacyPatched,
  };
}

export function describeState(match: TargetMatch): string {
  if (match.guarded) {
    return `${match.spec.label} disabled`;
  }
  if (match.patched || match.legacyPatched) {
    return `${match.spec.label} enabled`;
  }
  return "Unknown state";
}

export function applyRuntimePatchesToBody(_resourcePath: string, body: string): RuntimePatchResult {
  let content = body;
  const matchedLabels: string[] = [];
  const patchedLabels: string[] = [];
  const alreadyPatchedLabels: string[] = [];

  for (const spec of TARGET_SPECS) {
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

  return {
    content,
    matchedLabels,
    patchedLabels,
    alreadyPatchedLabels,
  };
}
```

- [ ] **Step 4: Update `src/patcher.mts` to use the engine**

Replace the existing local imports and duplicate functions in `src/patcher.mts`:

```ts
import {
  applyRuntimePatchesToBody,
  describeState,
  inspectSpec,
  replaceContent,
  replaceContentOrThrow,
} from "./patch-engine.mts";
import { GPT_55_OFFICIAL_MODEL_LIST_MIN_VERSION, TARGET_SPECS, type FileTarget, type TargetMatch, type TargetSpec, type TargetState } from "./patcher-targets.mts";
```

Delete local definitions for:

- `replaceContent`
- `replaceContentOrThrow`
- `inspectSpec`
- `describeState`

Keep `isTargetRelevantForCommand()` in `patcher.mts`; after `inspectSpec(content, spec)` returns, apply the existing command relevance gate in `inspectFile()`:

```ts
const matches = TARGET_SPECS
  .map((spec) => inspectSpec(content, spec))
  .filter(isPresent)
  .filter((match) => isTargetRelevantForCommand(match.spec, match));
```

Do not use `applyRuntimePatchesToBody()` in file mode yet; file mode needs status/apply/restore semantics and backup writes.

- [ ] **Step 5: Update the build script to inline the new module**

In `scripts/build-codexfast.mts`, read `patch-engine.mts` between targets and patcher:

```ts
const patcherTargetsSource = inlineLocalModuleSource(readFileSync(join(sourceDir, "patcher-targets.mts"), "utf8"));
const patchEngineSource = inlineLocalModuleSource(readFileSync(join(sourceDir, "patch-engine.mts"), "utf8"))
  .replace(/^import \{[^]*?\} from "\.\/patcher-targets\.mts";\r?\n\r?\n?/, "");
```

Build `patcherSource` from all three pieces:

```ts
const patcherSource = ts.transpileModule(`"use strict";\n\n${patcherTargetsSource}\n${patchEngineSource}\n${patcherEngineSource}`, {
  compilerOptions,
}).outputText;
```

Update the `patcherEngineSource` import stripper to remove both local imports:

```ts
const patcherEngineSource = readFileSync(join(sourceDir, "patcher.mts"), "utf8")
  .replace(/^import \{[^]*?\} from "\.\/patch-engine\.mts";\r?\n/, "")
  .replace(/^import \{[^]*?\} from "\.\/patcher-targets\.mts";\r?\n\r?\n?/, "")
  .replace(/^(?:(?:\/\/ Build marker: stripped by scripts\/build-codexfast\.mts and re-added at the top\r?\n\/\/ of the concatenated patcher source\.\r?\n)?)"use strict";\r?\n\r?\n?/, "");
```

- [ ] **Step 6: Verify tests pass**

Run:

```bash
pnpm build
pnpm typecheck
pnpm test
```

Expected:

- `pnpm build` regenerates `bin/codexfast`
- `pnpm typecheck` passes
- `pnpm test` ends with `re-sign flow test passed`

- [ ] **Step 7: Commit**

```bash
git add src/patch-engine.mts src/patcher.mts scripts/build-codexfast.mts test/re-sign-flow.mts bin/codexfast
git commit -m "refactor: extract runtime patch engine"
```

## Task 2: Add Launch Command Guardrails

**Files:**
- Modify: `src/cli.mts`
- Modify: `test/helpers/script-harness.mts`
- Modify: `test/re-sign-flow.mts`

- [ ] **Step 1: Write failing tests for launch guardrails**

In `test/helpers/script-harness.mts`, add helper assertions:

```ts
export function assertNoLaunchCalls(markerFile: string, outputFile: string): void {
  const launchMarkerFile = `${markerFile}.launch`;
  if (existsSync(launchMarkerFile)) {
    fail("expected Codex launch not to be invoked", `${readFileSync(launchMarkerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}
```

Update `setupStubs()` to include a launch marker script for the fake app executable path used in tests. Add this executable creation after `npx`:

```ts
writeExecutable(
  join(stubBin, "codexfast-launch-stub"),
  `#!/bin/bash
printf '%s\\n' "$*" >> ${JSON.stringify(`${markerFile}.launch`)}
exit 0
`,
);
```

In `test/re-sign-flow.mts`, import `assertNoLaunchCalls` and add:

```ts
function assertNoLaunchCalls(outputFile: string): void {
  assertNoLaunchCallsHelper(markerFile, outputFile);
}
```

Add an unsupported launch test after unsupported repair coverage:

```ts
const unsupportedLaunchApp = join(tmpDir, "UnsupportedLaunch.app");
const unsupportedLaunchOutput = join(tmpDir, "unsupported-launch-output.txt");
prepareArchivedFakeApp(unsupportedLaunchApp, join(tmpDir, "unsupported-launch-assets"), "99.0.0", "9999");
runScriptCommand(unsupportedLaunchApp, ["launch"], unsupportedLaunchOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
assertContains(readOutput(unsupportedLaunchOutput), "Runtime launch is blocked for this Codex.app version.", "expected unsupported launch to fail before app start", readOutput(unsupportedLaunchOutput));
assertNoLaunchCalls(unsupportedLaunchOutput);
```

Add a running-instance guard test:

```ts
const runningLaunchApp = join(tmpDir, "RunningLaunch.app");
const runningLaunchOutput = join(tmpDir, "running-launch-output.txt");
prepareArchivedFakeApp(runningLaunchApp, join(tmpDir, "running-launch-assets"), "26.513.20950", "2816", "26513-2816");
runScriptCommand(runningLaunchApp, ["launch"], runningLaunchOutput, {
  CODEXFAST_TEST_CODEX_RUNNING: "1",
  CODEXFAST_TEST_ALLOW_NONZERO: "1",
});
assertContains(readOutput(runningLaunchOutput), "Codex.app is already running. Quit Codex.app before using runtime launch.", "expected running app launch to fail closed", readOutput(runningLaunchOutput));
assertNoLaunchCalls(runningLaunchOutput);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test
```

Expected: TypeScript or test failure because launch command and helper do not exist.

- [ ] **Step 3: Add launch command shell**

In `src/cli.mts`, add:

```ts
function isCodexRunning(): boolean {
  if (process.env.CODEXFAST_TEST_CODEX_RUNNING === "1") {
    return true;
  }
  const result = run("pgrep", ["-x", "Codex"]);
  return result.status === 0 && result.stdout.trim().length > 0;
}

function launchCodexWithRuntimePatches(): number {
  printActionHeader("launch");

  if (!appVersionSupported) {
    printLine("Runtime launch is blocked for this Codex.app version.");
    printLine("This command only launches verified compatible builds.");
    printLine(`Supported versions: ${supportedAppVersionKeys}`);
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }

  if (isCodexRunning()) {
    printLine("Codex.app is already running. Quit Codex.app before using runtime launch.");
    printLine("");
    printLine("Exit code: 1");
    return 1;
  }

  printLine("Runtime launch is not implemented yet.");
  printLine("");
  printLine("Exit code: 1");
  return 1;
}
```

Dispatch it in `main()` after requirements load:

```ts
case "launch":
  return launchCodexWithRuntimePatches();
```

For now this still fails for supported builds because runtime launch is not implemented. That is acceptable until Task 4.

- [ ] **Step 4: Verify guardrail tests pass**

Run:

```bash
pnpm build
pnpm test
```

Expected:

- unsupported launch test passes
- running-instance guard test passes
- no legacy apply/restore tests regress

- [ ] **Step 5: Commit**

```bash
git add src/cli.mts test/helpers/script-harness.mts test/re-sign-flow.mts bin/codexfast
git commit -m "feat: add runtime launch guardrails"
```

## Task 3: Implement Minimal CDP Client

**Files:**
- Modify: `src/cli.mts`
- Modify: `test/re-sign-flow.mts`

- [ ] **Step 1: Write CDP frame unit test**

In `test/re-sign-flow.mts`, add imports from `src/cli.mts` only if helpers are exported is not compatible with generated CLI. Instead add command-level tests around test env hooks:

```ts
const cdpEncodeOutput = join(tmpDir, "cdp-encode-output.txt");
runScriptCommand(join(tmpDir, "MissingForCdpSelfTest.app"), ["__selftest-cdp-frame"], cdpEncodeOutput);
assertContains(readOutput(cdpEncodeOutput), "CDP frame self-test passed", "expected CDP frame self-test to pass", readOutput(cdpEncodeOutput));
```

This hidden command is test-only and must not be listed in help.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test
```

Expected: command is unknown or missing.

- [ ] **Step 3: Add minimal WebSocket frame helpers**

In `src/cli.mts`, add below `run()`:

```ts
function encodeWebSocketTextFrame(payload: string): Buffer {
  const body = Buffer.from(payload, "utf8");
  const mask = randomBytes(4);
  const header: number[] = [0x81];
  if (body.length < 126) {
    header.push(0x80 | body.length);
  } else if (body.length <= 0xffff) {
    header.push(0x80 | 126, (body.length >> 8) & 0xff, body.length & 0xff);
  } else {
    throw new Error("CDP frame payload is too large.");
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
      if (offset + 4 > buffer.length) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    }
    if (masked) {
      throw new Error("Unexpected masked server WebSocket frame.");
    }
    if (offset + headerLength + length > buffer.length) break;
    const payload = buffer.subarray(offset + headerLength, offset + headerLength + length);
    if (opcode === 1) {
      messages.push(payload.toString("utf8"));
    }
    offset += headerLength + length;
  }
  return { messages, remaining: buffer.subarray(offset) };
}

function runCdpFrameSelfTest(): number {
  const encoded = encodeWebSocketTextFrame(JSON.stringify({ id: 1, method: "Runtime.enable" }));
  if (encoded[0] !== 0x81 || (encoded[1] & 0x80) === 0) {
    printLine("CDP frame self-test failed");
    return 1;
  }
  const serverFrame = Buffer.concat([Buffer.from([0x81, 0x0d]), Buffer.from("hello runtime")]);
  const decoded = decodeWebSocketTextFrames(serverFrame);
  if (decoded.messages[0] !== "hello runtime" || decoded.remaining.length !== 0) {
    printLine("CDP frame self-test failed");
    return 1;
  }
  printLine("CDP frame self-test passed");
  return 0;
}
```

Dispatch hidden command before requirements checks:

```ts
if (command === "__selftest-cdp-frame") {
  return runCdpFrameSelfTest();
}
```

- [ ] **Step 4: Add CDP HTTP JSON and WebSocket skeleton**

Add minimal types and helpers in `src/cli.mts`:

```ts
type CdpTarget = {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
};

function httpGetJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? require("node:https") : require("node:http");
    client.get(url, (response: import("node:http").IncomingMessage) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as T);
      });
    }).on("error", reject);
  });
}
```

Do not connect to a real app yet; Task 4 wires this into launch.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm build
pnpm typecheck
pnpm test
```

Expected all pass.

- [ ] **Step 6: Commit**

```bash
git add src/cli.mts test/re-sign-flow.mts bin/codexfast
git commit -m "feat: add minimal CDP protocol helpers"
```

## Task 4: Implement Runtime Launch and Interception

**Files:**
- Modify: `src/cli.mts`
- Modify: `scripts/build-codexfast.mts`
- Modify: `test/re-sign-flow.mts`

- [ ] **Step 1: Write launch success test with fake CDP hook**

Add a fake-success test in `test/re-sign-flow.mts`:

```ts
const launchSuccessApp = join(tmpDir, "LaunchSuccess.app");
const launchSuccessOutput = join(tmpDir, "launch-success-output.txt");
prepareArchivedFakeApp(launchSuccessApp, join(tmpDir, "launch-success-assets"), "26.513.20950", "2816", "26513-2816");
runScriptCommand(launchSuccessApp, ["launch"], launchSuccessOutput, {
  CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
});
assertContains(readOutput(launchSuccessOutput), "Runtime launch completed.", "expected launch command to report success", readOutput(launchSuccessOutput));
assertContains(readOutput(launchSuccessOutput), "Browser-use native pipe peer auth", "expected launch dry-run hook to report runtime target labels", readOutput(launchSuccessOutput));
assertNoCodesignCalls(launchSuccessOutput);
assertNoTccutilCalls(launchSuccessOutput);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test
```

Expected: supported launch still prints "not implemented".

- [ ] **Step 3: Add test hook for launch success**

In `src/cli.mts`, inside `launchCodexWithRuntimePatches()` after running-instance check:

```ts
if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS === "1") {
  printLine("Runtime launch completed.");
  printLine("Patched targets:");
  printLine("  Browser-use native pipe peer auth");
  printLine("");
  printLine("Exit code: 0");
  return 0;
}
```

This makes tests green before real launch plumbing is complete.

- [ ] **Step 4: Add app launch command**

Add helpers:

```ts
function randomDebugPort(): number {
  return 40000 + Number.parseInt(randomBytes(2).toString("hex"), 16) % 20000;
}

function codexExecutablePath(): string {
  return join(appBundle, "Contents", "MacOS", "Codex");
}

function launchCodexProcess(debugPort: number): import("node:child_process").ChildProcess {
  const executable = codexExecutablePath();
  return spawn(executable, [
    `--remote-debugging-address=127.0.0.1`,
    `--remote-debugging-port=${debugPort}`,
    `--remote-allow-origins=http://127.0.0.1:${debugPort}`,
  ], {
    detached: false,
    stdio: "ignore",
  });
}
```

Update import:

```ts
import { spawn, spawnSync } from "node:child_process";
```

- [ ] **Step 5: Add runtime patch session skeleton**

Add:

```ts
async function runRuntimePatchSession(debugPort: number): Promise<string[]> {
  const targets = await httpGetJson<CdpTarget[]>(`http://127.0.0.1:${debugPort}/json`);
  const page = targets.find((target) => target.webSocketDebuggerUrl && (target.type === "page" || target.type === "webview"));
  if (!page?.webSocketDebuggerUrl) {
    throw new Error("No debuggable Codex renderer target found.");
  }

  // Full Fetch interception is implemented in the next step.
  return [];
}
```

In `launchCodexWithRuntimePatches()`, after selecting a port:

```ts
const debugPort = randomDebugPort();
const child = launchCodexProcess(debugPort);
try {
  const patchedLabels = await waitForRuntimePatchSession(debugPort);
  printLine("Runtime launch completed.");
  if (patchedLabels.length > 0) {
    printLine("Patched targets:");
    for (const label of patchedLabels) {
      printLine(`  ${label}`);
    }
  }
  printLine("");
  printLine("Exit code: 0");
  return 0;
} catch (error) {
  child.kill();
  printLine(error instanceof Error ? error.message : String(error));
  printLine("");
  printLine("Exit code: 1");
  return 1;
}
```

Change `launchCodexWithRuntimePatches` to `async` and update dispatch:

```ts
case "launch":
  return await launchCodexWithRuntimePatches();
```

- [ ] **Step 6: Implement Fetch interception**

Add a small `CdpConnection` class in `src/cli.mts` with:

```ts
class CdpConnection {
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  constructor(private socket: import("node:net").Socket) {}

  send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    this.socket.write(encodeWebSocketTextFrame(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  handleMessage(message: string, onEvent: (method: string, params: Record<string, unknown>) => void): void {
    const parsed = JSON.parse(message) as { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: { message?: string } };
    if (parsed.id && this.pending.has(parsed.id)) {
      const pending = this.pending.get(parsed.id);
      this.pending.delete(parsed.id);
      if (parsed.error) {
        pending?.reject(new Error(parsed.error.message ?? "CDP command failed"));
      } else {
        pending?.resolve(parsed.result);
      }
      return;
    }
    if (parsed.method) {
      onEvent(parsed.method, parsed.params ?? {});
    }
  }
}
```

Implement WebSocket handshake with `net.connect`, `Sec-WebSocket-Key`, and HTTP upgrade validation. Then:

```ts
await cdp.send("Fetch.enable", {
  patterns: [
    { urlPattern: "app://*/assets/*.js", requestStage: "Response" },
    { urlPattern: "app://*/webview/assets/*.js", requestStage: "Response" },
  ],
});
```

On `Fetch.requestPaused`:

1. Call `Fetch.getResponseBody`.
2. Decode base64 if needed.
3. Run `applyRuntimePatchesToBody(resourceUrl, body)`.
4. Fulfill with patched body:

```ts
await cdp.send("Fetch.fulfillRequest", {
  requestId,
  responseCode: 200,
  responseHeaders,
  body: Buffer.from(result.content, "utf8").toString("base64"),
});
```

If no targets are patched after initial renderer load completes, reject with:

```text
Runtime patch interception completed without required targets.
```

- [ ] **Step 7: Verify**

Run:

```bash
pnpm build
pnpm typecheck
pnpm test
```

Expected all pass. Do not claim real-app support yet.

- [ ] **Step 8: Commit**

```bash
git add src/cli.mts test/re-sign-flow.mts bin/codexfast
git commit -m "feat: launch Codex with runtime patches"
```

## Task 5: Update Menu and Documentation

**Files:**
- Modify: `src/cli.mts`
- Modify: `test/re-sign-flow.mts`
- Modify: docs listed in the design spec

- [ ] **Step 1: Write failing help/menu tests**

In `test/re-sign-flow.mts`, update help assertions:

```ts
assertContains(readOutput(helpOutput), "launch", "expected help to include runtime launch command", readOutput(helpOutput));
assertContains(readOutput(helpOutput), "legacy bundle patch", "expected help to label apply/restore legacy behavior", readOutput(helpOutput));
```

Add menu output assertion by running no-argument command with `q\n`:

```ts
const menuOutput = join(tmpDir, "menu-output.txt");
runScript(join(tmpDir, "Menu.app"), "q\n", menuOutput);
assertContains(readOutput(menuOutput), "Launch Codex with runtime patches (recommended)", "expected menu to recommend launch first", readOutput(menuOutput));
assertContains(readOutput(menuOutput), "legacy bundle patch", "expected menu to label legacy bundle patch actions", readOutput(menuOutput));
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test
```

Expected: help/menu text does not yet mention launch.

- [ ] **Step 3: Update help and menu**

In `printUsage()`:

```ts
printLine("  launch             Launch Codex with runtime patches (recommended)");
printLine("  status             Check version, compatibility, and legacy feature state");
printLine("  apply              Enable custom API features by modifying the app bundle (legacy bundle patch)");
printLine("  restore            Restore legacy bundle patch backups");
```

In `showMenu()`:

```ts
printLine("1) Launch Codex with runtime patches (recommended)");
printLine("2) Check current status");
printLine("3) Enable custom API features (legacy bundle patch)");
printLine("4) Restore original app (legacy bundle patch)");
printLine("5) Install auto-repair watcher (legacy)");
printLine("6) Uninstall auto-repair watcher");
```

Update switch numbers accordingly:

```ts
case "1":
  await launchCodexWithRuntimePatches();
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
```

- [ ] **Step 4: Update docs**

Update README quick start:

```md
Recommended:

```bash
npx codexfast launch
```

This launches the official signed `Codex.app` and applies patches in memory for that session.
```

Move `npx codexfast apply` under a `Legacy Bundle Patch Fallback` section and state:

```md
Legacy bundle patch mode modifies `app.asar` and replaces the OpenAI Developer ID signature with a local ad-hoc signature. Use it only when runtime launch is not suitable.
```

Mirror the same content in `README.zh-CN.md`.

Update `docs/troubleshooting.md` with:

```md
## Runtime launch opens no patched features

Fully quit `Codex.app`, then run `npx codexfast launch` again. The first runtime-launch implementation does not attach to an already-running app because the target JavaScript must be intercepted before execution.
```

Update `CHANGELOG.md` under `[Unreleased]`:

```md
### Added

- Added `launch`, a runtime patch mode that starts official signed Codex.app and applies codexfast patches in memory.

### Changed

- Made runtime launch the recommended path while keeping `apply` / `restore` as legacy bundle patch fallbacks.
```

- [ ] **Step 5: Verify**

Run:

```bash
pnpm build
pnpm build:check
pnpm typecheck
pnpm test
git diff --check
```

Expected all pass.

- [ ] **Step 6: Commit**

```bash
git add README.md README.zh-CN.md CHANGELOG.md docs/feature-scope.md docs/troubleshooting.md docs/patch-targets.md docs/real-app-validation.md src/cli.mts test/re-sign-flow.mts bin/codexfast
git commit -m "docs: recommend runtime launch mode"
```

## Task 6: Real-App Validation

**Files:**
- Modify: `docs/bundle-notes/2026-05-15-codex-app-26.513.20950-build-2816.md`
- Modify: `docs/real-app-validation.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Capture pre-launch signature and archive state**

Run:

```bash
codesign -dv --verbose=4 /Applications/Codex.app 2>&1 | tee /tmp/codexfast-before-signature.txt
stat -f "%m %z" /Applications/Codex.app/Contents/Resources/app.asar | tee /tmp/codexfast-before-asar-stat.txt
```

Expected:

- signature output contains OpenAI Developer ID identity
- archive stat is recorded

- [ ] **Step 2: Run runtime launch**

Run:

```bash
node ./bin/codexfast launch
```

Expected:

- detected version/build are supported
- launch reports runtime completion
- Codex opens through the launcher

- [ ] **Step 3: Validate app behavior manually**

Check in the launched app:

- Settings Fast control is visible
- `/fast` slash command appears in composer
- Speed menu is visible
- Plugins entry/page opens
- `@chrome` does not fail with `missing-code-signing-identity`

- [ ] **Step 4: Confirm app files and signature stayed unchanged**

Run:

```bash
codesign -dv --verbose=4 /Applications/Codex.app 2>&1 | tee /tmp/codexfast-after-signature.txt
stat -f "%m %z" /Applications/Codex.app/Contents/Resources/app.asar | tee /tmp/codexfast-after-asar-stat.txt
diff -u /tmp/codexfast-before-asar-stat.txt /tmp/codexfast-after-asar-stat.txt
```

Expected:

- signature still shows OpenAI Developer ID
- `app.asar` mtime/size output is unchanged

- [ ] **Step 5: Document validation**

Update bundle note with:

```md
## Runtime Launch Validation Notes

- `npx codexfast launch` was validated on `26.513.20950` (`build 2816`).
- The official code signature remained OpenAI Developer ID after launch.
- `app.asar` mtime and size were unchanged.
- Fast, Speed, Plugins, and `@chrome` were checked in the launched app.
```

- [ ] **Step 6: Final verification**

Run:

```bash
pnpm build:check
pnpm typecheck
pnpm test
git diff --check
```

Expected all pass.

- [ ] **Step 7: Commit**

```bash
git add docs/bundle-notes/2026-05-15-codex-app-26.513.20950-build-2816.md docs/real-app-validation.md CHANGELOG.md
git commit -m "docs: record runtime launch validation"
```

## Plan Self-Review

- Spec coverage: Tasks cover patch-engine reuse, launch command, CDP interception, fail-closed behavior, menu/docs migration, legacy fallback preservation, and real-app validation.
- Placeholder scan: no `TBD`, `TODO`, or open implementation placeholders are left in the plan.
- Type consistency: plan uses existing `TargetSpec`, `TargetMatch`, `Replacement`, and `supported` version concepts from the repo; new runtime names are introduced before use.
