# ChatGPT 5848 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict runtime-launch compatibility for `ChatGPT.app` `26.721.41059` (`build 5848`) without changing package version `0.63.0` or publishing npm.

**Architecture:** Reuse the build-5828 renderer and main-process signatures already validated against the extracted build-5848 bundle. Add only the exact version/build key to the compatibility whitelist and official-Plugins policy sets, keep the numeric official GPT-5.6 threshold unchanged, and leave unknown builds blocked.

**Tech Stack:** TypeScript, Node.js 18+, pnpm, shell regression harness, Electron ASAR inspection, CDP runtime patch source.

## Global Constraints

- Do not change `package.json` version `0.63.0` or publish the package.
- Treat `src/*` as source and regenerate `bin/codexfast` with `pnpm build`.
- Keep public launch runtime-only and fail-closed.
- Do not modify `app.asar`, `Info.plist`, the installed application bundle, or its code signature.
- Keep the exact whitelist; do not accept a version range or unknown future build.
- Keep GPT-5.6 and Plugins on official application paths for build 5848.
- Do not change patch regexes, replacements, dependencies, or public launcher behavior.
- Use Conventional Commit subjects.

---

### Task 1: Add failing build-5848 regression coverage

**Files:**
- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`

**Interfaces:**
- Consumes: `prepareFakeApp(appPath, version, build)`, `runScriptCommand`, `runtimePatcherSourceForVersion(patcherSource, versionKey)`.
- Produces: regression coverage for strict compatibility, initial-target policy, official Plugins filtering, and official GPT-5.6 filtering for `26.721.41059+5848`.

- [ ] **Step 1: Add the strict compatibility fixture**

Insert after the build-5828 fixture in `test/runtime-launch-flow.mts`:

```ts
  const nonRunningLaunch2672141059App = join(tmpDir, "NonRunningLaunch2672141059.app");
  const nonRunningLaunch2672141059Output = join(tmpDir, "non-running-launch-26721-41059-output.txt");
  prepareFakeApp(nonRunningLaunch2672141059App, "26.721.41059", "5848");
  runScriptCommand(nonRunningLaunch2672141059App, ["launch"], nonRunningLaunch2672141059Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2672141059Output), "Compatibility: supported", "expected build 5848 to pass the strict support gate", readOutput(nonRunningLaunch2672141059Output));
  assertContains(readOutput(nonRunningLaunch2672141059Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5848 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2672141059Output));
  assertContains(readOutput(nonRunningLaunch2672141059Output), "Contents/MacOS/ChatGPT", "expected build 5848 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2672141059Output));
  assertNoLaunchCalls(nonRunningLaunch2672141059Output);
  assertNoBundleMutationTools(nonRunningLaunch2672141059Output);
```

- [ ] **Step 2: Add the required-initial-target fixture**

Insert after the build-5828 pending-target fixture:

```ts
  const launchPendingTargets2672141059App = join(tmpDir, "LaunchPendingTargets2672141059.app");
  const launchPendingTargets2672141059Output = join(tmpDir, "launch-pending-targets-26721-41059-output.txt");
  prepareFakeApp(launchPendingTargets2672141059App, "26.721.41059", "5848");
  runScriptCommand(launchPendingTargets2672141059App, ["launch"], launchPendingTargets2672141059Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2672141059Output), "Runtime patch interception did not observe required targets: none.", "expected build 5848 not to require the legacy Plugins access target", readOutput(launchPendingTargets2672141059Output));
  assertNotContains(readOutput(launchPendingTargets2672141059Output), "Plugins access", "expected build 5848 missing-target output not to name Plugins access", readOutput(launchPendingTargets2672141059Output));
  assertNoLaunchCalls(launchPendingTargets2672141059Output);
  assertNoBundleMutationTools(launchPendingTargets2672141059Output);
```

- [ ] **Step 3: Add official Plugins and GPT-5.6 policy assertions**

Append this entry to the official Plugins table in `test/suites/runtime-patch-suite.mts`:

```ts
    ["26.721.41059+5848", "5848"],
```

Add after the build-5828 GPT-5.6 assertions:

```ts
  const officialGpt56Build5848Result = applyOfficialGpt56PatcherForVersion("26.721.41059+5848")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5848Result.content, "GPT56_LIST_DISABLED", "expected build 5848 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5848Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5848 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5848Result.content, "SPEED_ENABLED", "expected build 5848 to retain non-GPT runtime patches");
```

- [ ] **Step 4: Run the narrow regression to verify RED**

Run:

```bash
bash test/re-sign-flow.sh
```

Expected: non-zero exit because build 5848 reports `Compatibility: unsupported` or the official Plugins assertion observes a compatibility patch. The failure must come from missing production entries, not test syntax.

---

### Task 2: Add minimal production compatibility entries

**Files:**
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Modify: `bin/codexfast` through `pnpm build`
- Test: `test/runtime-launch-flow.mts`
- Test: `test/suites/runtime-patch-suite.mts`

**Interfaces:**
- Consumes: exact key `26.721.41059+5848` and Task 1 regressions.
- Produces: supported launch gating and official Plugins behavior while preserving official GPT-5.6 filtering.

- [ ] **Step 1: Add the exact whitelist entry**

Append to `SUPPORTED_APP_VERSIONS`:

```ts
  "26.721.41059+5848": "ChatGPT.app 26.721.41059 build 5848",
```

- [ ] **Step 2: Add both official Plugins policy entries**

Append the exact key to both `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys`:

```ts
  "26.721.41059+5848",
```

Do not change `usesOfficialGpt56`; its numeric threshold already covers build 5848 once the whitelist admits the build.

- [ ] **Step 3: Regenerate the single-file launcher**

Run:

```bash
pnpm build
```

Expected: exit 0; `bin/codexfast` contains the new whitelist and both policy entries.

- [ ] **Step 4: Run the narrow regression to verify GREEN**

Run:

```bash
bash test/re-sign-flow.sh
```

Expected: exit 0, including all new build-5848 assertions.

- [ ] **Step 5: Inspect the source and generated diff**

Run:

```bash
git diff --check
git diff -- src/supported-app-versions.mts src/cli-runtime-launch.mts test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts bin/codexfast
```

Expected: only build-5848 additions and generated equivalents; no target regex changes.

- [ ] **Step 6: Commit tested compatibility code**

```bash
git add src/supported-app-versions.mts src/cli-runtime-launch.mts test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts bin/codexfast
git commit -m "feat: add ChatGPT build 5848 support"
```

---

### Task 3: Validate the extracted installed bundle

**Files:**
- Read: `/Applications/ChatGPT.app/Contents/Info.plist`
- Read: `/Applications/ChatGPT.app/Contents/Resources/app.asar`
- Read: temporary extracted `webview/assets/*.js`
- Read: temporary extracted `.vite/build/*.js`

**Interfaces:**
- Consumes: installed build 5848, `runtimePatcherSourceForVersion`, `patchMainProcessAutomaticUpdateSource`, and `patchMainProcessSettingsSchemaSource`.
- Produces: exact filenames, patched-label set, JavaScript parse results, bundle metadata, and signature evidence for documentation.

- [ ] **Step 1: Record exact installed metadata and signature**

Run:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /Applications/ChatGPT.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
pgrep -fal '/Applications/ChatGPT.app/Contents/MacOS/ChatGPT' || true
```

Expected: version `26.721.41059`, build `5848`, valid signature, and a running ChatGPT process that defines the manual launch boundary.

- [ ] **Step 2: Extract to a fresh temporary directory and inspect all target signatures**

Run in one shell so `inspect_dir` remains available for Steps 3 and 4:

```bash
inspect_dir=$(mktemp -d /tmp/codexfast-5848.XXXXXX)
npx --yes @electron/asar extract /Applications/ChatGPT.app/Contents/Resources/app.asar "$inspect_dir"
pnpm inspect:bundle-targets "$inspect_dir"
```

Expected: guarded targets for Settings Fast, allowance, request allowance, conversation fallback, `/fast`, Intelligence Speed, update schema, and update Settings row.

- [ ] **Step 3: Apply the build-5848 version-filtered patcher in memory**

Use `runtimePatcherSourceForVersion(patcherSource, "26.721.41059+5848")` across extracted `webview/assets` and `.vite/build` JavaScript. Parse each changed result with `typescript.createSourceFile`.

Expected changed files:

```text
webview/assets/app-initial-BHB6SClA.js
webview/assets/general-settings-D7HslvR1.js
.vite/build/child-process-snapshot-worker.js
.vite/build/src-BPbHdvxe.js
.vite/build/worker.js
```

Expected labels:

```text
Composer Intelligence Speed menu
Disable automatic updates schema
Disable automatic updates setting
Fast slash command
Speed service tier allowance
Speed service tier conversation fallback
Speed service tier request allowance
Speed setting
```

- [ ] **Step 4: Validate main-process source-signature interception**

Apply `patchMainProcessSettingsSchemaSource` and `patchMainProcessAutomaticUpdateSource` to extracted `.vite/build/*.js`, then parse changed sources.

Expected: the three schema files above plus `.vite/build/window-all-closed-a9FCmS92.js`; the updater file contains `codexfastAutomaticUpdatesDisabled`, `checkForUpdates`, and `installUpdatesIfAvailable`.

---

### Task 4: Update compatibility documentation

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/real-app-validation.md`
- Modify: `docs/troubleshooting.md`
- Create: `docs/bundle-notes/2026-07-27-chatgpt-app-26.721.41059-build-5848.md`

**Interfaces:**
- Consumes: exact build evidence from Task 3.
- Produces: newest-first compatibility documentation synchronized with the strict whitelist.

- [ ] **Step 1: Verify documentation drift is RED**

Run:

```bash
pnpm check:version-drift
```

Expected: non-zero exit naming missing `26.721.41059+5848` documentation.

- [ ] **Step 2: Update public compatibility lists and changelog**

Set the latest verified build in both READMEs to `26.721.41059` / `5848`, move `26.721.31836` / `5828` into the next newest list, and add under `CHANGELOG.md` `Unreleased`:

```markdown
### Added

- Added local compatibility for `ChatGPT.app` `26.721.41059` (`build 5848`) after direct installed-bundle inspection confirmed the build-5828 Fast and automatic-update target family remains compatible while GPT-5.6 and Plugins continue to use official application paths.
```

- [ ] **Step 3: Update long-lived compatibility docs**

Add the newest compatibility matrix row:

```markdown
| `26.721.41059` | `5848` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, official GPT-5.6, official Plugins support, Disable automatic updates | `2026-07-27` | Verified by direct installed-bundle inspection, version-filtered extracted-bundle patching, JavaScript parse checks, and regression coverage against `/Applications/ChatGPT.app` with bundle id `com.openai.codex`. Existing Fast and automatic-update signatures match renamed consolidated assets, and the callback-aware Sparkle hook matches `.vite/build/window-all-closed-a9FCmS92.js`. Installed bundle files were not modified. ChatGPT was running, so a fresh real runtime launch was not performed. |
```

Add build 5848 alongside build 5828 in `docs/feature-scope.md`, `docs/patch-targets.md`, `docs/real-app-validation.md`, and `docs/troubleshooting.md`, preserving their existing wording and newest-first ordering.

- [ ] **Step 4: Add the build-specific bundle note**

Create `docs/bundle-notes/2026-07-27-chatgpt-app-26.721.41059-build-5848.md` with sections `Metadata`, `Target mapping`, `Validation`, and `Validation boundary`. Record the filenames and eight-label set from Task 3, official GPT-5.6/Plugins paths, valid deep strict signature, and the absence of an interactive runtime-launch pass.

- [ ] **Step 5: Verify documentation drift is GREEN**

Run:

```bash
pnpm check:version-drift
```

Expected: `supported-version drift check passed (59 builds)`.

- [ ] **Step 6: Commit compatibility documentation**

```bash
git add README.md README.zh-CN.md CHANGELOG.md docs/compatibility-matrix.md docs/feature-scope.md docs/patch-targets.md docs/real-app-validation.md docs/troubleshooting.md docs/bundle-notes/2026-07-27-chatgpt-app-26.721.41059-build-5848.md
git commit -m "docs: document ChatGPT build 5848 support"
```

---

### Task 5: Run final verification and close the adaptation

**Files:**
- Verify: all changed source, generated, test, and documentation files
- Read: `/Applications/ChatGPT.app` signature and metadata

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: fresh evidence that source, generated CLI, types, regressions, documentation drift, package contents, and installed-app safety checks pass.

- [ ] **Step 1: Run the mandatory repository verification suite**

```bash
pnpm build:check
pnpm typecheck
pnpm check:version-drift
pnpm test
```

Expected: all commands exit 0 with no test failures.

- [ ] **Step 2: Verify package contents without publishing**

```bash
pnpm pack --dry-run
```

Expected: exit 0; package version remains `0.63.0` and includes generated `bin/codexfast` plus public documentation.

- [ ] **Step 3: Recheck installed metadata and signature**

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /Applications/ChatGPT.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
```

Expected: version `26.721.41059`, build `5848`, and a valid deep strict signature.

- [ ] **Step 4: Check final repository state**

```bash
git diff --check
git status --short
git log -5 --oneline
```

Expected: no uncommitted implementation files; recent commits include design, plan, feature, and documentation commits. Report the interactive launch/UI validation boundary explicitly.
