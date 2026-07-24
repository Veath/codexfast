# ChatGPT 5828 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict runtime-launch compatibility for `ChatGPT.app` `26.721.31836` (`build 5828`) without changing the npm package version or publishing a release.

**Architecture:** Reuse the existing renderer and main-process patch signatures, add only the exact version/build key to compatibility and runtime feature-policy sets, and keep unknown future builds blocked. Validate the generated single-file launcher and the real extracted build while leaving `/Applications/ChatGPT.app` untouched.

**Tech Stack:** TypeScript, Node.js 18+, pnpm, shell regression harness, Electron `app.asar` inspection, CDP runtime patch source.

## Global Constraints

- Do not change `package.json` version or publish the package.
- Treat `src/*` as source and regenerate `bin/codexfast` with `pnpm build`.
- Keep public launch runtime-only and fail-closed.
- Do not modify `app.asar`, `Info.plist`, the application bundle, or its code signature.
- Keep the exact whitelist; do not allow a version range or an unknown future build.
- Keep GPT-5.6 and Plugins on official application paths for build 5828.
- Do not change patch regexes unless validation contradicts the approved design evidence.
- Use Conventional Commit subjects.

---

### Task 1: Add failing build-5828 regression coverage

**Files:**
- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`

**Interfaces:**
- Consumes: `prepareFakeApp(appPath, version, build)`, `runScriptCommand`, and `runtimePatcherSourceForVersion(patcherSource, versionKey)`.
- Produces: regression coverage for strict compatibility, initial-target policy, official Plugins filtering, and official GPT-5.6 filtering for `26.721.31836+5828`.

- [ ] **Step 1: Add the strict compatibility fixture**

Insert after the build-5813 fixture in `test/runtime-launch-flow.mts`:

```ts
  const nonRunningLaunch2672131836App = join(tmpDir, "NonRunningLaunch2672131836.app");
  const nonRunningLaunch2672131836Output = join(tmpDir, "non-running-launch-26721-31836-output.txt");
  prepareFakeApp(nonRunningLaunch2672131836App, "26.721.31836", "5828");
  runScriptCommand(nonRunningLaunch2672131836App, ["launch"], nonRunningLaunch2672131836Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2672131836Output), "Compatibility: supported", "expected build 5828 to pass the strict support gate", readOutput(nonRunningLaunch2672131836Output));
  assertContains(readOutput(nonRunningLaunch2672131836Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5828 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2672131836Output));
  assertContains(readOutput(nonRunningLaunch2672131836Output), "Contents/MacOS/ChatGPT", "expected build 5828 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2672131836Output));
  assertNoLaunchCalls(nonRunningLaunch2672131836Output);
  assertNoBundleMutationTools(nonRunningLaunch2672131836Output);
```

- [ ] **Step 2: Add the required-initial-target fixture**

Insert after the build-5813 pending-target fixture:

```ts
  const launchPendingTargets2672131836App = join(tmpDir, "LaunchPendingTargets2672131836.app");
  const launchPendingTargets2672131836Output = join(tmpDir, "launch-pending-targets-26721-31836-output.txt");
  prepareFakeApp(launchPendingTargets2672131836App, "26.721.31836", "5828");
  runScriptCommand(launchPendingTargets2672131836App, ["launch"], launchPendingTargets2672131836Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2672131836Output), "Runtime patch interception did not observe required targets: none.", "expected build 5828 not to require the legacy Plugins access target", readOutput(launchPendingTargets2672131836Output));
  assertNotContains(readOutput(launchPendingTargets2672131836Output), "Plugins access", "expected build 5828 missing-target output not to name Plugins access", readOutput(launchPendingTargets2672131836Output));
  assertNoLaunchCalls(launchPendingTargets2672131836Output);
  assertNoBundleMutationTools(launchPendingTargets2672131836Output);
```

- [ ] **Step 3: Add official Plugins and GPT-5.6 policy assertions**

Append build 5828 to the official Plugins table in `test/suites/runtime-patch-suite.mts`:

```ts
    ["26.721.31836+5828", "5828"],
```

Add after the build-5813 GPT-5.6 assertions:

```ts
  const officialGpt56Build5828Result = applyOfficialGpt56PatcherForVersion("26.721.31836+5828")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5828Result.content, "GPT56_LIST_DISABLED", "expected build 5828 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5828Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5828 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5828Result.content, "SPEED_ENABLED", "expected build 5828 to retain non-GPT runtime patches");
```

- [ ] **Step 4: Run the narrow regression to verify RED**

Run:

```bash
bash test/re-sign-flow.sh
```

Expected: non-zero exit. The new build-5828 fixture reports `Compatibility: unsupported`, or the official Plugins assertion observes an enabled compatibility patch. The failure must be caused by the missing build-5828 production entries, not a syntax or fixture error.

---

### Task 2: Add the minimal production compatibility entries

**Files:**
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Modify: `bin/codexfast` through `pnpm build`
- Test: `test/runtime-launch-flow.mts`
- Test: `test/suites/runtime-patch-suite.mts`

**Interfaces:**
- Consumes: exact version key `26.721.31836+5828` and the failing regression fixtures from Task 1.
- Produces: supported launch gating and official Plugins policy for build 5828 while preserving the numeric official GPT-5.6 threshold.

- [ ] **Step 1: Add the exact strict-whitelist entry**

Append to `SUPPORTED_APP_VERSIONS` in `src/supported-app-versions.mts`:

```ts
  "26.721.31836+5828": "ChatGPT.app 26.721.31836 build 5828",
```

- [ ] **Step 2: Add both official Plugins policy entries**

Append the exact key to both `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys` in `src/cli-runtime-launch.mts`:

```ts
  "26.721.31836+5828",
```

Do not change `usesOfficialGpt56`; its numeric threshold already covers build 5828 once the exact whitelist admits the build.

- [ ] **Step 3: Regenerate the single-file launcher**

Run:

```bash
pnpm build
```

Expected: exit 0 and `bin/codexfast` contains the new whitelist and both runtime Plugins policy entries.

- [ ] **Step 4: Run the narrow regression to verify GREEN**

Run:

```bash
bash test/re-sign-flow.sh
```

Expected: exit 0, including the build-5828 compatibility, initial-target, official Plugins, and official GPT-5.6 assertions.

- [ ] **Step 5: Inspect the source and generated diff**

Run:

```bash
git diff --check
git diff -- src/supported-app-versions.mts src/cli-runtime-launch.mts test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts bin/codexfast
```

Expected: only build-5828 additions and the generated single-file equivalent; no target regex changes.

- [ ] **Step 6: Commit the tested compatibility code**

```bash
git add src/supported-app-versions.mts src/cli-runtime-launch.mts test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts bin/codexfast
git commit -m "feat: add ChatGPT build 5828 support"
```

---

### Task 3: Validate the real extracted build without mutating the app

**Files:**
- Read: `/Applications/ChatGPT.app/Contents/Info.plist`
- Read: `/Applications/ChatGPT.app/Contents/Resources/app.asar`
- Read: extracted temporary `webview/assets/*.js`
- Read: extracted temporary `.vite/build/*.js`

**Interfaces:**
- Consumes: installed build 5828, `runtimePatcherSourceForVersion`, the generated embedded patcher source, `patchMainProcessAutomaticUpdateSource`, and `patchMainProcessSettingsSchemaSource`.
- Produces: exact target filenames, changed renderer/main-process module counts, parse results, hashes, and the manual validation boundary for the bundle note.

- [ ] **Step 1: Record installed metadata, hashes, signature, and running-state boundary**

Run:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /Applications/ChatGPT.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' /Applications/ChatGPT.app/Contents/Info.plist
shasum -a 256 /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
pgrep -fal '/Applications/ChatGPT.app/Contents/MacOS/ChatGPT' || true
```

Expected: version `26.721.31836`, build `5828`, app hash `674dab67fe39f9912493f640c1dd80f222f6062ad0f50b182a6cc87eebd0d3dc`, plist hash `f7805c553f1acd482a8ceb95bb60449e15b7cd8e8064de027ed067a84eedd316`, a valid signature, and a running ChatGPT process that prevents an in-session full-quit smoke test.

- [ ] **Step 2: Extract to a fresh temporary directory and inspect targets**

Run in one shell so `inspect_dir` remains available to later validation commands:

```bash
inspect_dir=$(mktemp -d /tmp/codexfast-5828.XXXXXX)
npx --yes @electron/asar extract /Applications/ChatGPT.app/Contents/Resources/app.asar "$inspect_dir"
pnpm inspect:bundle-targets "$inspect_dir"
```

Expected guarded matches:

- `speed-setting-destructured-option-count`
- `speed-service-tier-allowance-26601`
- `speed-service-tier-request-allowance-26707`
- `speed-service-tier-conversation-fallback-26707`
- `intelligence-speed-menu-options-boolean` or `intelligence-speed-menu-options-boolean-code`
- `service-tier-slash-command`
- `disable-automatic-updates-schema`
- `disable-automatic-updates-setting-26707-app-name`

- [ ] **Step 3: Apply the build-5828 version-filtered renderer patcher in memory**

Run this with `CODEXFAST_INSPECT_DIR` set to the temporary directory from Step 2:

```bash
CODEXFAST_INSPECT_DIR="$inspect_dir" pnpm exec tsx -e '
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { runtimePatcherSourceForVersion } from "./src/cli-runtime-launch.mts";

const root = process.env.CODEXFAST_INSPECT_DIR;
if (!root) throw new Error("CODEXFAST_INSPECT_DIR is required");
const cli = readFileSync("bin/codexfast", "utf8");
const literal = cli.match(/^const __PATCHER_SOURCE__ = (.+);$/m)?.[1];
if (!literal) throw new Error("generated patcher source not found");
const patcherSource = JSON.parse(literal);
const filteredSource = runtimePatcherSourceForVersion(patcherSource, "26.721.31836+5828");
const apply = new Function(`${filteredSource}\nreturn applyRuntimePatchesToBody;`)();
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? walk(path) : entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
});
const files = [join(root, "webview", "assets"), join(root, ".vite", "build")].flatMap(walk);
const changed = [];
const labels = new Set();
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const result = apply(`app://-/${relative(root, file)}`, source);
  if (result.content === source) continue;
  const parsed = ts.createSourceFile(file, result.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if ((parsed.parseDiagnostics ?? []).length > 0) throw new Error(`parse failure: ${relative(root, file)}`);
  result.patchedLabels.forEach((label) => labels.add(label));
  changed.push(relative(root, file));
}
const required = [
  "Speed setting",
  "Speed service tier allowance",
  "Speed service tier request allowance",
  "Speed service tier conversation fallback",
  "Fast slash command",
  "Composer Intelligence Speed menu",
  "Disable automatic updates schema",
  "Disable automatic updates setting",
];
for (const label of required) if (!labels.has(label)) throw new Error(`missing patched label: ${label}`);
for (const label of labels) {
  if (label.startsWith("Plugin") || label === "GPT-5.x model list" || label === "GPT-5.6 model query selector") {
    throw new Error(`unexpected compatibility patch: ${label}`);
  }
}
const expectedChanged = [
  "webview/assets/app-initial-C-fROkKo.js",
  "webview/assets/general-settings-DaCT8Zmh.js",
  ".vite/build/child-process-snapshot-worker.js",
  ".vite/build/src-DChWimf7.js",
  ".vite/build/worker.js",
];
for (const path of expectedChanged) if (!changed.includes(path)) throw new Error(`missing changed module: ${path}`);
console.log(JSON.stringify({ changed, labels: [...labels].sort() }, null, 2));
'
```

Expected: exactly the eight required label families appear, the five known modules are changed, all changed sources parse, and no Plugins or GPT-5.6 compatibility target is applied.

- [ ] **Step 4: Validate main-process schema and Sparkle hooks by source signature**

Run:

```bash
CODEXFAST_INSPECT_DIR="$inspect_dir" pnpm exec tsx -e '
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { patchMainProcessAutomaticUpdateSource, patchMainProcessSettingsSchemaSource } from "./src/cli-update-settings.mts";

const root = process.env.CODEXFAST_INSPECT_DIR;
if (!root) throw new Error("CODEXFAST_INSPECT_DIR is required");
const buildDir = join(root, ".vite", "build");
const changed = [];
for (const entry of readdirSync(buildDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
  const file = join(buildDir, entry.name);
  const source = readFileSync(file, "utf8");
  const patched = patchMainProcessAutomaticUpdateSource(patchMainProcessSettingsSchemaSource(source));
  if (patched === source) continue;
  const parsed = ts.createSourceFile(file, patched, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if ((parsed.parseDiagnostics ?? []).length > 0) throw new Error(`parse failure: ${entry.name}`);
  if (!patched.includes("disableAutomaticUpdates")) throw new Error(`missing settings injection: ${entry.name}`);
  if (source.includes("setAutomaticBackgroundDownloadsEnabledForMac")) {
    if (!patched.includes("codexfastAutomaticUpdatesDisabled")) throw new Error(`missing Sparkle guard: ${entry.name}`);
    if (!patched.includes("checkForUpdates") || !patched.includes("installUpdatesIfAvailable")) throw new Error(`manual update methods missing: ${entry.name}`);
  }
  changed.push(relative(root, file));
}
const expected = [
  ".vite/build/child-process-snapshot-worker.js",
  ".vite/build/src-DChWimf7.js",
  ".vite/build/window-all-closed-Bz3ZcBls.js",
  ".vite/build/worker.js",
];
for (const path of expected) if (!changed.includes(path)) throw new Error(`missing main-process patch: ${path}`);
console.log(JSON.stringify(changed, null, 2));
'
```

Expected: the three settings-schema copies and `.vite/build/window-all-closed-Bz3ZcBls.js` are changed in memory. The updater source contains `codexfastAutomaticUpdatesDisabled`, and manual `checkForUpdates` plus `installUpdatesIfAvailable` methods remain present.

- [ ] **Step 5: Recheck installed hashes and signature**

```bash
shasum -a 256 /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
```

Expected: byte-for-byte identical `app.asar` and `Info.plist` hashes and a valid signature.

---

### Task 4: Document build 5828 and its validation boundary

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/real-app-validation.md`
- Modify: `docs/troubleshooting.md`
- Create: `docs/bundle-notes/2026-07-24-chatgpt-app-26.721.31836-build-5828.md`

**Interfaces:**
- Consumes: exact filenames, hashes, changed counts, and validation results from Task 3.
- Produces: newest-first public compatibility claims and reusable bundle-specific adaptation knowledge.

- [ ] **Step 1: Update public compatibility summaries**

Make `README.md` lead with:

```md
Latest verified local build: `ChatGPT.app` / `Codex.app` `26.721.31836` (`build 5828`).

Also verified for `ChatGPT.app` / `Codex.app` `26.721.30844` (`build 5813`) and `26.715.72359` (`build 5718`).
```

Make `README.zh-CN.md` lead with:

```md
最新完成本地验证的版本：`ChatGPT.app` / `Codex.app` `26.721.31836`（`build 5828`）。

另已验证支持 `ChatGPT.app` / `Codex.app` `26.721.30844`（`build 5813`）和 `26.715.72359`（`build 5718`）。
```

Keep every older supported build in the existing newest-first lists.

- [ ] **Step 2: Update compatibility and feature docs**

Add the newest compatibility-matrix row:

```md
| `26.721.31836` | `5828` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, official GPT-5.6, official Plugins support, Disable automatic updates | `2026-07-24` | Verified by direct installed-bundle inspection, version-filtered extracted-bundle patching, JavaScript parse checks, and regression coverage against `/Applications/ChatGPT.app` with bundle id `com.openai.codex`. Existing Fast and automatic-update signatures match the consolidated renderer assets, and the callback-aware Sparkle hook matches `.vite/build/window-all-closed-Bz3ZcBls.js`. Installed bundle hashes and signature remained unchanged. ChatGPT was running, so a fresh real runtime launch was not performed. |
```

In `docs/feature-scope.md`:

- add `26.721.31836` to the configured-tier single-source list;
- state that it continues to use the Intelligence Speed submenu;
- add it to the official Plugins path list;
- add a build-specific automatic-update bullet naming `app-initial-C-fROkKo.js`, `general-settings-DaCT8Zmh.js`, and `.vite/build/window-all-closed-Bz3ZcBls.js`.

In `docs/patch-targets.md`, add a build-specific note naming those same three files and state that existing target signatures match, GPT-5.6 and Plugins use official paths, and manual update actions remain available.

- [ ] **Step 3: Update operational docs**

Add build 5828 to the relevant lists and checks in `docs/real-app-validation.md` and `docs/troubleshooting.md`:

- the build-specific renderer/updater validation row;
- the no-legacy-Plugins initial-target list;
- the official Plugins troubleshooting list;
- the automatic-update source-signature notes.

Record that the fresh launch and UI click-through remain manual because the validating session was hosted by the running ChatGPT application.

- [ ] **Step 4: Add the changelog entry and bundle note**

Under `## [Unreleased]` in `CHANGELOG.md`, add to the existing `### Added` section:

```md
- Added local compatibility for `ChatGPT.app` `26.721.31836` (`build 5828`) after direct installed-bundle inspection confirmed the existing Fast and automatic-update target family remains compatible with the consolidated renderer assets while GPT-5.6 and Plugins continue to use official application paths.
```

Create `docs/bundle-notes/2026-07-24-chatgpt-app-26.721.31836-build-5828.md` with the following facts:

```md
# ChatGPT.app 26.721.31836 build 5828

## Bundle metadata

- Installed app: `/Applications/ChatGPT.app`
- Bundle identifier: `com.openai.codex`
- `CFBundleShortVersionString`: `26.721.31836`
- `CFBundleVersion`: `5828`
- Strict compatibility key: `26.721.31836+5828`
- `app.asar` SHA-256: `674dab67fe39f9912493f640c1dd80f222f6062ad0f50b182a6cc87eebd0d3dc`
- `Info.plist` SHA-256: `f7805c553f1acd482a8ceb95bb60449e15b7cd8e8064de027ed067a84eedd316`

## Renderer findings

- Settings Fast and automatic-update row: `webview/assets/general-settings-DaCT8Zmh.js`
- Shared Fast allowance, request allowance, configured-tier fallback, `/fast`, and Intelligence Speed: `webview/assets/app-initial-C-fROkKo.js`
- Desktop-settings schema copies: `.vite/build/child-process-snapshot-worker.js`, `.vite/build/src-DChWimf7.js`, and `.vite/build/worker.js`
- Callback-aware Sparkle updater: `.vite/build/window-all-closed-Bz3ZcBls.js`
- GPT-5.6 and Plugins: official application paths; compatibility targets are skipped
- Version-filtered patch labels: `Speed setting`, `Speed service tier allowance`, `Speed service tier request allowance`, `Speed service tier conversation fallback`, `Fast slash command`, `Composer Intelligence Speed menu`, `Disable automatic updates schema`, and `Disable automatic updates setting`

## Validation boundary

- Direct installed-bundle inspection, version-filtered extracted-bundle patching, JavaScript parse checks, main-process source-signature validation, regression coverage, hash comparisons, and signature verification were performed.
- No installed application files were written.
- ChatGPT was running and hosted the validation session, so a fresh interactive runtime-launch smoke pass and UI click-through were not performed.
```

- [ ] **Step 5: Check documentation consistency**

Run:

```bash
pnpm check:version-drift
git diff --check
rg -n "26\.721\.31836|5828" README.md README.zh-CN.md CHANGELOG.md docs src test bin/codexfast
```

Expected: build 5828 appears in every required compatibility surface, compatibility lists are newest-first, version drift exits 0, and no whitespace errors are reported.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md README.zh-CN.md CHANGELOG.md docs/compatibility-matrix.md docs/feature-scope.md docs/patch-targets.md docs/real-app-validation.md docs/troubleshooting.md docs/bundle-notes/2026-07-24-chatgpt-app-26.721.31836-build-5828.md
git commit -m "docs: document ChatGPT build 5828 support"
```

---

### Task 5: Run final repository verification

**Files:**
- Verify: all modified source, generated CLI, tests, and docs

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: fresh evidence that generated output, types, version drift, regressions, package contents, and installed-app integrity satisfy the approved design.

- [ ] **Step 1: Run required validation commands**

```bash
pnpm build:check
pnpm typecheck
pnpm check:version-drift
pnpm test
pnpm pack --dry-run
```

Expected: every command exits 0 with no test failures, and the dry-run package contains the expected generated CLI plus public package files.

- [ ] **Step 2: Confirm package metadata is unchanged and generated CLI is synchronized**

```bash
node -p "require('./package.json').version"
git diff v0.62.0 -- package.json bin/codexfast
```

Expected: package version remains `0.62.0`; `package.json` is unchanged; `bin/codexfast` contains only generated build-5828 compatibility updates.

- [ ] **Step 3: Reconfirm installed-app integrity**

```bash
shasum -a 256 /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
```

Expected: the hashes remain `674dab67fe39f9912493f640c1dd80f222f6062ad0f50b182a6cc87eebd0d3dc` and `f7805c553f1acd482a8ceb95bb60449e15b7cd8e8064de027ed067a84eedd316`, and the signature is valid.

- [ ] **Step 4: Audit final history and worktree**

```bash
git status --short
git log -6 --oneline --decorate
```

Expected: clean worktree and Conventional Commit subjects for the design, plan, compatibility code, and compatibility documentation.

- [ ] **Step 5: Report the manual validation boundary**

Report that source/build/tests, extracted-bundle patching, parse checks, hashes, and signature validation were completed. State explicitly that a fully quit fresh `codexfast launch` and UI click-through were not performed because the active ChatGPT process hosts this session; point to `docs/real-app-validation.md` for that manual follow-up.
