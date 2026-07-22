# ChatGPT 5718 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict runtime-launch compatibility for `ChatGPT.app` `26.715.72359` (`build 5718`) without changing the npm package version or publishing a release.

**Architecture:** Reuse the existing 26.715 renderer and main-process patch signatures, add only the exact version/build key to compatibility and runtime feature-policy sets, and keep unknown future builds blocked. Validate the generated single-file launcher and the real extracted build while leaving `/Applications/ChatGPT.app` untouched.

**Tech Stack:** TypeScript, Node.js 18+, pnpm, shell regression harness, Electron `app.asar` inspection, CDP runtime patch source.

## Global Constraints

- Do not change `package.json` version or publish the package.
- Treat `src/*` as source and regenerate `bin/codexfast` with `pnpm build`.
- Keep public launch runtime-only and fail-closed.
- Do not modify `app.asar`, `Info.plist`, the application bundle, or its code signature.
- Keep the exact whitelist; do not allow a version range or an unknown future build.
- Keep GPT-5.6 and Plugins on official application paths for build 5718.
- Use Conventional Commit subjects.

---

### Task 1: Add failing build-5718 regression coverage

**Files:**
- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`

**Interfaces:**
- Consumes: `prepareFakeApp(appPath, version, build)`, `runScriptCommand`, `runtimePatcherSourceForVersion`.
- Produces: regression coverage for strict compatibility, initial target policy, official Plugins filtering, and official GPT-5.6 filtering for `26.715.72359+5718`.

- [ ] **Step 1: Add the strict compatibility fixture**

Insert after the build-5706 fixture in `test/runtime-launch-flow.mts`:

```ts
  const nonRunningLaunch2671572359App = join(tmpDir, "NonRunningLaunch2671572359.app");
  const nonRunningLaunch2671572359Output = join(tmpDir, "non-running-launch-26715-72359-output.txt");
  prepareFakeApp(nonRunningLaunch2671572359App, "26.715.72359", "5718");
  runScriptCommand(nonRunningLaunch2671572359App, ["launch"], nonRunningLaunch2671572359Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2671572359Output), "Compatibility: supported", "expected build 5718 to pass the strict support gate", readOutput(nonRunningLaunch2671572359Output));
  assertContains(readOutput(nonRunningLaunch2671572359Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5718 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2671572359Output));
  assertContains(readOutput(nonRunningLaunch2671572359Output), "Contents/MacOS/ChatGPT", "expected build 5718 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2671572359Output));
  assertNoLaunchCalls(nonRunningLaunch2671572359Output);
  assertNoBundleMutationTools(nonRunningLaunch2671572359Output);
```

- [ ] **Step 2: Add the required-initial-target fixture**

Insert after the build-5706 pending-target fixture:

```ts
  const launchPendingTargets2671572359App = join(tmpDir, "LaunchPendingTargets2671572359.app");
  const launchPendingTargets2671572359Output = join(tmpDir, "launch-pending-targets-26715-72359-output.txt");
  prepareFakeApp(launchPendingTargets2671572359App, "26.715.72359", "5718");
  runScriptCommand(launchPendingTargets2671572359App, ["launch"], launchPendingTargets2671572359Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2671572359Output), "Runtime patch interception did not observe required targets: none.", "expected build 5718 not to require the legacy Plugins access target", readOutput(launchPendingTargets2671572359Output));
  assertNotContains(readOutput(launchPendingTargets2671572359Output), "Plugins access", "expected build 5718 missing-target output not to name Plugins access", readOutput(launchPendingTargets2671572359Output));
  assertNoLaunchCalls(launchPendingTargets2671572359Output);
  assertNoBundleMutationTools(launchPendingTargets2671572359Output);
```

- [ ] **Step 3: Add official Plugins and GPT-5.6 policy assertions**

Append `5718` to the official Plugins table:

```ts
    ["26.715.72359+5718", "5718"],
```

Add after the build-5706 GPT-5.6 assertions:

```ts
  const officialGpt56Build5718Result = applyOfficialGpt56PatcherForVersion("26.715.72359+5718")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5718Result.content, "GPT56_LIST_DISABLED", "expected build 5718 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5718Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5718 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5718Result.content, "SPEED_ENABLED", "expected build 5718 to retain non-GPT runtime patches");
```

- [ ] **Step 4: Run the narrow regression to verify RED**

Run:

```bash
bash test/re-sign-flow.sh
```

Expected: non-zero exit. The new build-5718 fixture reports `Compatibility: unsupported`, or the official Plugins assertion observes an enabled compatibility patch. The failure must be caused by the missing build-5718 production entries, not a syntax or fixture error.

---

### Task 2: Add the minimal production compatibility entries

**Files:**
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Modify: `bin/codexfast` through `pnpm build`
- Test: `test/runtime-launch-flow.mts`
- Test: `test/suites/runtime-patch-suite.mts`

**Interfaces:**
- Consumes: exact version key `26.715.72359+5718` and the regression fixtures from Task 1.
- Produces: supported launch gating and official Plugins policy for build 5718; preserves the existing numeric official GPT-5.6 threshold.

- [ ] **Step 1: Add the exact strict-whitelist entry**

Append to `SUPPORTED_APP_VERSIONS` in `src/supported-app-versions.mts`:

```ts
  "26.715.72359+5718": "ChatGPT.app 26.715.72359 build 5718",
```

- [ ] **Step 2: Add both official Plugins policy entries**

Append the exact key to both `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys` in `src/cli-runtime-launch.mts`:

```ts
  "26.715.72359+5718",
```

Do not change `usesOfficialGpt56`; its numeric threshold already covers build 5718 once the build passes the exact whitelist.

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

Expected: exit 0, including the build-5718 compatibility, initial-target, official Plugins, and official GPT-5.6 assertions.

- [ ] **Step 5: Inspect the source and generated diff**

Run:

```bash
git diff --check
git diff -- src/supported-app-versions.mts src/cli-runtime-launch.mts test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts bin/codexfast
```

Expected: only build-5718 additions and the generated single-file equivalent; no target regex changes.

- [ ] **Step 6: Commit the tested compatibility code**

```bash
git add src/supported-app-versions.mts src/cli-runtime-launch.mts test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts bin/codexfast
git commit -m "feat: add ChatGPT build 5718 support"
```

---

### Task 3: Validate the real extracted build without mutating the app

**Files:**
- Read: `/Applications/ChatGPT.app/Contents/Info.plist`
- Read: `/Applications/ChatGPT.app/Contents/Resources/app.asar`
- Read: extracted temporary `webview/assets/*.js`
- Read: extracted temporary `.vite/build/*.js`

**Interfaces:**
- Consumes: installed build 5718, `runtimePatcherSourceForVersion`, the generated embedded patcher source, `patchMainProcessAutomaticUpdateSource`, and `patchMainProcessSettingsSchemaSource`.
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

Expected: version `26.715.72359`, build `5718`, valid signature, and a running ChatGPT process that prevents an in-session full-quit smoke test.

- [ ] **Step 2: Extract to a fresh temporary directory and inspect targets**

Run:

```bash
inspect_dir=$(mktemp -d /tmp/codexfast-5718.XXXXXX)
npx --yes @electron/asar extract /Applications/ChatGPT.app/Contents/Resources/app.asar "$inspect_dir"
pnpm inspect:bundle-targets "$inspect_dir"
```

Expected guarded matches:

- `speed-setting-destructured-option-count`
- `speed-service-tier-allowance-26601`
- `speed-service-tier-request-allowance-26707`
- `speed-service-tier-conversation-fallback-26707`
- `intelligence-speed-menu-options-boolean` or its code-needle twin
- `service-tier-slash-command`
- `disable-automatic-updates-schema`
- `disable-automatic-updates-setting-26715-row-local-h`

- [ ] **Step 3: Apply the version-filtered renderer patcher in memory**

Run this with `CODEXFAST_INSPECT_DIR` set to the temporary directory from Step 2:

```bash
CODEXFAST_INSPECT_DIR="$inspect_dir" pnpm exec tsx -e '
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { runtimePatcherSourceForVersion } from "./src/cli-runtime-launch.mts";

const root = process.env.CODEXFAST_INSPECT_DIR;
if (!root) throw new Error("CODEXFAST_INSPECT_DIR is required");
const cli = readFileSync("bin/codexfast", "utf8");
const literal = cli.match(/^const __PATCHER_SOURCE__ = (.+);$/m)?.[1];
if (!literal) throw new Error("generated patcher source not found");
const patcherSource = JSON.parse(literal);
const filteredSource = runtimePatcherSourceForVersion(patcherSource, "26.715.72359+5718");
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
  new Function(result.content);
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
console.log(JSON.stringify({ changed, labels: [...labels].sort() }, null, 2));
'
```

The validation script must print each changed relative path and the unique patched labels, then assert that the changed-label set contains exactly the build-required families:

```text
Speed setting
Speed service tier allowance
Speed service tier request allowance
Speed service tier conversation fallback
Fast slash command
Composer Intelligence Speed menu
Disable automatic updates schema
Disable automatic updates setting
```

It must also assert that no patched label starts with `Plugin` and neither `GPT-5.x model list` nor `GPT-5.6 model query selector` is reported.

- [ ] **Step 4: Validate main-process schema and Sparkle hooks by source signature**

Run:

```bash
CODEXFAST_INSPECT_DIR="$inspect_dir" pnpm exec tsx -e '
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
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
  if (!patched.includes("disableAutomaticUpdates")) throw new Error(`missing settings injection: ${entry.name}`);
  if (source.includes("setAutomaticBackgroundDownloadsEnabledForMac")) {
    if (!patched.includes("codexfastAutomaticUpdatesDisabled")) throw new Error(`missing Sparkle guard: ${entry.name}`);
    if (!patched.includes("checkForUpdates") || !patched.includes("installUpdatesIfAvailable")) {
      throw new Error(`manual update methods missing: ${entry.name}`);
    }
  }
  changed.push(relative(root, file));
}
if (!changed.includes(".vite/build/window-all-closed-DoNbesKf.js")) {
  throw new Error("active Sparkle module was not patched");
}
console.log(JSON.stringify(changed, null, 2));
'
```

The output must show the settings-schema copies plus `.vite/build/window-all-closed-DoNbesKf.js`, and the patched source must contain:

```text
disableAutomaticUpdates
codexfastAutomaticUpdatesDisabled
checkForUpdates
installUpdatesIfAvailable
```

The first two strings prove injection; the last two prove manual updater methods remain present. Confirm the updater match remains in `.vite/build/window-all-closed-DoNbesKf.js`.

- [ ] **Step 5: Recheck installed hashes and signature**

Run the same `shasum` and `codesign --verify --deep --strict --verbose=2` commands from Step 1.

Expected: byte-for-byte identical `app.asar` and `Info.plist` hashes and a valid signature.

---

### Task 4: Document build 5718 and its validation boundary

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/real-app-validation.md`
- Modify: `docs/troubleshooting.md`
- Create: `docs/bundle-notes/2026-07-22-chatgpt-app-26.715.72359-build-5718.md`

**Interfaces:**
- Consumes: exact filenames, hashes, changed counts, and results from Task 3.
- Produces: newest-first public compatibility claims and reusable bundle-specific adaptation knowledge.

- [ ] **Step 1: Update public compatibility summaries**

Make `README.md` lead with:

```md
Latest verified local build: `ChatGPT.app` / `Codex.app` `26.715.72359` (`build 5718`).

Also verified for `ChatGPT.app` / `Codex.app` `26.715.72028` (`build 5706`).
```

Make `README.zh-CN.md` lead with:

```md
最新完成本地验证的版本：`ChatGPT.app` / `Codex.app` `26.715.72359`（`build 5718`）。

另已验证支持 `ChatGPT.app` / `Codex.app` `26.715.72028`（`build 5706`）。
```

Move build 5650 into the older multi-build list without dropping any existing build.

- [ ] **Step 2: Update compatibility and feature docs**

Add a supported compatibility-matrix row for `26.715.72359` / `5718` with:

```text
Settings Fast, `/fast`, Intelligence Speed menu, official GPT-5.6, official Plugins, Disable automatic updates
```

Add build 5718 to the configured-tier single-source list in `docs/feature-scope.md`, state that it retains the 26.715 Fast/update behavior under renamed renderer assets, and add it to the official Plugins path list.

Add a `docs/patch-targets.md` build-specific note using the Task 3 filenames and explicitly stating that existing target signatures still match.

- [ ] **Step 3: Update operational docs**

Add build 5718 to:

- the build-specific row/updater check in `docs/real-app-validation.md`;
- the no-legacy-Plugins initial-target list;
- the official Plugins troubleshooting list;
- the `@chrome` official Plugins path list;
- the automatic-update troubleshooting build notes.

State that the fresh launch/UI click-through remains manual because the validating session was hosted by the running app.

- [ ] **Step 4: Add the changelog entry and bundle note**

Under `## [Unreleased]` in `CHANGELOG.md`, add:

```md
### Added

- Added local compatibility for `ChatGPT.app` `26.715.72359` (`build 5718`) after direct installed-bundle inspection confirmed the existing 26.715 Fast and automatic-update target family remains compatible while GPT-5.6 and Plugins continue to use official application paths.
```

Create the bundle note with these sections and the exact Task 3 evidence:

```md
# ChatGPT.app 26.715.72359 build 5718

## Bundle metadata
## Renderer findings
## Validation boundary
```

Record exact SHA-256 values, target filenames, changed module counts, parse results, signature checks, and the omitted interactive launch/UI smoke test.

- [ ] **Step 5: Check documentation consistency**

Run:

```bash
pnpm check:version-drift
git diff --check
rg -n "26\.715\.72359|5718" README.md README.zh-CN.md CHANGELOG.md docs src test bin/codexfast
```

Expected: build 5718 appears in every required compatibility surface and version drift exits 0.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md README.zh-CN.md CHANGELOG.md docs/compatibility-matrix.md docs/feature-scope.md docs/patch-targets.md docs/real-app-validation.md docs/troubleshooting.md docs/bundle-notes/2026-07-22-chatgpt-app-26.715.72359-build-5718.md
git commit -m "docs: document ChatGPT build 5718 support"
```

---

### Task 5: Run final repository verification

**Files:**
- Verify: all modified source, generated CLI, tests, and docs

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: fresh evidence that generated output, types, version drift, and all regressions pass.

- [ ] **Step 1: Run required validation commands**

```bash
pnpm build:check
pnpm typecheck
pnpm check:version-drift
pnpm test
```

Expected: every command exits 0 with no test failures.

- [ ] **Step 2: Confirm package metadata is unchanged and generated CLI is synchronized**

```bash
git diff v0.60.0 -- package.json bin/codexfast
node -p "require('./package.json').version"
```

Expected: package version remains `0.60.0`; `bin/codexfast` contains only generated compatibility updates.

- [ ] **Step 3: Audit final history and worktree**

```bash
git status --short
git log -5 --oneline --decorate
```

Expected: clean worktree and Conventional Commit subjects for the design, plan, compatibility code, and documentation. No release commit, tag, push, or publish action occurs.
