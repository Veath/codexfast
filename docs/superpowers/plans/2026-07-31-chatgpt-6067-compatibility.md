# ChatGPT 6067 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict runtime-launch compatibility for `ChatGPT.app` `26.727.40816` (`build 6067`) without changing package version `0.65.0` or publishing npm.

**Architecture:** Reuse the build-5973 renderer and main-process signatures already validated against the extracted build-6067 bundle. Add only the exact version/build key to the compatibility whitelist and official-Plugins policy sets, while retaining the existing numeric official GPT-5.6 threshold.

**Tech Stack:** TypeScript, Node.js 18+, pnpm, shell regression harness, Electron ASAR inspection, CDP runtime patch source.

## Global Constraints

- Do not change `package.json` version `0.65.0` or publish the package.
- Treat `src/*` as source and regenerate `bin/codexfast` with `pnpm build`.
- Keep public launch runtime-only and fail-closed.
- Do not modify `app.asar`, `Info.plist`, the installed application bundle, or its code signature.
- Keep the exact whitelist; do not accept a version range or unknown future build.
- Keep GPT-5.6 and Plugins on official application paths for build 6067.
- Do not change patch regexes, replacements, dependencies, or public launcher behavior.
- Do not claim an interactive runtime-launch or UI smoke test; ChatGPT remains running because it hosts the active session.

---

### Task 1: Add build-6067 regression coverage and minimal compatibility entries

**Files:**
- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Regenerate: `bin/codexfast`

**Interfaces:**
- Consumes: `prepareFakeApp`, `runScriptCommand`, `runtimePatcherSourceForVersion`, exact version key `26.727.40816+6067`.
- Produces: strict launch admission for build 6067, no legacy initial Plugins requirement, official Plugins filtering, official GPT-5.6 filtering, and an updated generated CLI.

- [ ] **Step 1: Add the failing strict-admission and required-target tests**

  Add this block after the build-5973 non-running launch case in `test/runtime-launch-flow.mts`:

  ```ts
  const nonRunningLaunch2672740816App = join(tmpDir, "NonRunningLaunch2672740816.app");
  const nonRunningLaunch2672740816Output = join(tmpDir, "non-running-launch-26727-40816-output.txt");
  prepareFakeApp(nonRunningLaunch2672740816App, "26.727.40816", "6067");
  runScriptCommand(nonRunningLaunch2672740816App, ["launch"], nonRunningLaunch2672740816Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2672740816Output), "Compatibility: supported", "expected build 6067 to pass the strict support gate", readOutput(nonRunningLaunch2672740816Output));
  assertContains(readOutput(nonRunningLaunch2672740816Output), "Runtime launch failed: Codex executable not found:", "expected supported build 6067 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2672740816Output));
  assertContains(readOutput(nonRunningLaunch2672740816Output), "Contents/MacOS/ChatGPT", "expected build 6067 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2672740816Output));
  assertNoLaunchCalls(nonRunningLaunch2672740816Output);
  assertNoBundleMutationTools(nonRunningLaunch2672740816Output);
  ```

  Add this block after the build-5973 pending-target case:

  ```ts
  const launchPendingTargets2672740816App = join(tmpDir, "LaunchPendingTargets2672740816.app");
  const launchPendingTargets2672740816Output = join(tmpDir, "launch-pending-targets-26727-40816-output.txt");
  prepareFakeApp(launchPendingTargets2672740816App, "26.727.40816", "6067");
  runScriptCommand(launchPendingTargets2672740816App, ["launch"], launchPendingTargets2672740816Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2672740816Output), "Runtime patch interception did not observe required targets: none.", "expected build 6067 not to require the legacy Plugins access target", readOutput(launchPendingTargets2672740816Output));
  assertNotContains(readOutput(launchPendingTargets2672740816Output), "Plugins access", "expected build 6067 missing-target output not to name Plugins access", readOutput(launchPendingTargets2672740816Output));
  assertNoLaunchCalls(launchPendingTargets2672740816Output);
  assertNoBundleMutationTools(launchPendingTargets2672740816Output);
  ```

- [ ] **Step 2: Add official Plugins and GPT-5.6 policy assertions**

  Add build 6067 to the official Plugins policy table in `test/suites/runtime-patch-suite.mts`:

  ```ts
  ["26.727.40816+6067", "6067"],
  ```

  Add this exact official GPT-5.6 case after the build-5973 assertions:

  ```ts
  const officialGpt56Build6067Result = applyOfficialGpt56PatcherForVersion("26.727.40816+6067")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build6067Result.content, "GPT56_LIST_DISABLED", "expected build 6067 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build6067Result.content, "GPT56_SELECTOR_DISABLED", "expected build 6067 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build6067Result.content, "SPEED_ENABLED", "expected build 6067 to retain non-GPT runtime patches");
  ```

- [ ] **Step 3: Run the regression entrypoint and verify RED**

  Run:

  ```bash
  bash test/re-sign-flow.sh
  ```

  Expected: non-zero exit. The build-6067 fake app reports `Compatibility: unsupported`, and the official Plugins policy assertion observes `PLUGIN_ENABLED` because build 6067 is not yet in the production policy set. The official GPT-5.6 assertions already pass through the numeric threshold.

- [ ] **Step 4: Add the minimal production compatibility entries**

  Add the exact whitelist entry at the end of `SUPPORTED_APP_VERSIONS` in `src/supported-app-versions.mts`:

  ```ts
  "26.727.40816+6067": "ChatGPT.app 26.727.40816 build 6067",
  ```

  Add this exact key after build 5973 in both `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys` in `src/cli-runtime-launch.mts`:

  ```ts
  "26.727.40816+6067",
  ```

- [ ] **Step 5: Regenerate the self-contained CLI**

  Run:

  ```bash
  pnpm build
  ```

  Expected: `bin/codexfast` changes only where the embedded whitelist and the two embedded Plugins policy sets gain build 6067.

- [ ] **Step 6: Run the regression entrypoint and verify GREEN**

  Run:

  ```bash
  bash test/re-sign-flow.sh
  ```

  Expected: exit 0; build 6067 reaches only the fake app's missing-executable boundary, does not require legacy `Plugins access`, skips Plugins compatibility targets, skips GPT-5.6 compatibility targets, and retains non-Plugins/non-GPT patches.

- [ ] **Step 7: Commit the tested compatibility change**

  ```bash
  git add test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts src/supported-app-versions.mts src/cli-runtime-launch.mts bin/codexfast
  git commit -m "feat: add ChatGPT build 6067 support"
  ```

---

### Task 2: Synchronize compatibility documentation

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/real-app-validation.md`
- Modify: `docs/troubleshooting.md`
- Create: `docs/bundle-notes/2026-07-31-chatgpt-app-26.727.40816-build-6067.md`

**Interfaces:**
- Consumes: installed metadata/hashes, extracted target filenames, eight-label patch evidence, parse results, and the accepted non-interactive validation boundary.
- Produces: synchronized public and maintainer documentation for the exact supported build.

- [ ] **Step 1: Update public compatibility summaries**

  In `README.md`, make the newest line:

  ```md
  Latest verified local build: `ChatGPT.app` / `Codex.app` `26.727.40816` (`build 6067`).
  ```

  Move `26.721.81911` (`build 5973`) to the beginning of the following “Also verified” line. Make the equivalent newest-first change in `README.zh-CN.md`:

  ```md
  最新完成本地验证的版本：`ChatGPT.app` / `Codex.app` `26.727.40816`（`build 6067`）。
  ```

- [ ] **Step 2: Record the unreleased change and compatibility matrix row**

  Under `## [Unreleased]` in `CHANGELOG.md`, add:

  ```md
  ### Added

  - Added local compatibility for `ChatGPT.app` `26.727.40816` (`build 6067`) after direct installed-bundle inspection confirmed the build-5973 Fast and automatic-update target family remains compatible while GPT-5.6 and Plugins continue to use official application paths.
  ```

  Append a supported row to `docs/compatibility-matrix.md` with date `2026-07-31`, the full supported feature list, renderer targets `app-initial-DRyZ1Lin.js` and `general-settings-BtLJps-O.js`, updater target `.vite/build/window-all-closed-Coc41Tfs.js`, unchanged installed hashes/signature, and the explicit statement that a fresh runtime launch was not performed.

- [ ] **Step 3: Update reusable feature, target, validation, and troubleshooting knowledge**

  Add `26.727.40816` to every current-build list that already ends at `26.721.81911` in `docs/feature-scope.md`, `docs/patch-targets.md`, `docs/real-app-validation.md`, and `docs/troubleshooting.md`. Add build-specific paragraphs stating:

  - `webview/assets/app-initial-DRyZ1Lin.js` carries service-tier allowance, request allowance, configured-tier fallback, `/fast`, Intelligence Speed, and the renderer settings schema.
  - `webview/assets/general-settings-BtLJps-O.js` carries Settings Fast and the app-name-aware automatic-update row.
  - `.vite/build/child-process-snapshot-worker.js`, `.vite/build/src-CLstCQVF.js`, and `.vite/build/worker.js` carry main-process schema copies.
  - `.vite/build/window-all-closed-Coc41Tfs.js` matches callback-aware updater discovery while manual update methods remain present.
  - GPT-5.6 and Plugins remain on official paths, so compatibility targets for those paths are filtered.

- [ ] **Step 4: Add the build-specific bundle note**

  Create `docs/bundle-notes/2026-07-31-chatgpt-app-26.727.40816-build-6067.md` with these exact metadata values:

  ```md
  - Bundle identifier: `com.openai.codex`
  - `CFBundleShortVersionString`: `26.727.40816`
  - `CFBundleVersion`: `6067`
  - `app.asar` SHA-256: `0e4f824024d0838dd7548751c02d3a7d21917c4fc3edf74c9e98d88ea9e3127d`
  - `Info.plist` SHA-256: `e40cb2f4a9089144a179d42497994cb81557c95b51a0c77e0942654e6d01c6a2`
  ```

  Record the two renderer target files, four main-process target files, all eight labels, zero parse diagnostics, preserved manual updater methods, official Plugins/GPT-5.6 policy, valid pre/post signature, and the accepted no-live-relaunch boundary.

- [ ] **Step 5: Verify documentation/source version parity**

  Run:

  ```bash
  pnpm check:version-drift
  git diff --check
  ```

  Expected: both commands exit 0, and the matrix contains exactly the same version/build set as `src/supported-app-versions.mts`.

- [ ] **Step 6: Commit synchronized documentation**

  ```bash
  git add README.md README.zh-CN.md CHANGELOG.md docs/compatibility-matrix.md docs/feature-scope.md docs/patch-targets.md docs/real-app-validation.md docs/troubleshooting.md docs/bundle-notes/2026-07-31-chatgpt-app-26.727.40816-build-6067.md
  git commit -m "docs: document ChatGPT build 6067 support"
  ```

---

### Task 3: Verify the completed adaptation and installed-app safety boundary

**Files:**
- Verify: all changed source, generated, test, and documentation files.
- Read only: `/Applications/ChatGPT.app/Contents/Resources/app.asar` and `/Applications/ChatGPT.app/Contents/Info.plist`.

**Interfaces:**
- Consumes: Tasks 1–2 and extracted bundle directory `/tmp/codexfast-6067-inspect.AsAW3i` while it remains available.
- Produces: fresh build, type, regression, package, bundle-parse, hash, signature, and repository-cleanliness evidence.

- [ ] **Step 1: Run the repository validation suite**

  Run each command independently and require exit 0:

  ```bash
  pnpm build:check
  pnpm typecheck
  pnpm check:version-drift
  bash test/re-sign-flow.sh
  pnpm test
  pnpm pack --dry-run
  ```

- [ ] **Step 2: Re-run extracted-bundle target discovery**

  Run:

  ```bash
  pnpm inspect:bundle-targets /tmp/codexfast-6067-inspect.AsAW3i
  ```

  Expected guarded targets:

  - `general-settings-BtLJps-O.js`: Speed setting and automatic-update setting.
  - `app-initial-DRyZ1Lin.js`: service-tier allowance, request allowance, conversation fallback, Intelligence Speed menu, `/fast`, and automatic-update schema.

- [ ] **Step 3: Re-run in-memory policy-filtered patch and parse validation**

  Apply all non-Plugins and non-official-GPT-5.6 target specs to extracted `webview/assets/*.js`, apply `patchMainProcessSettingsSchemaSource` and `patchMainProcessAutomaticUpdateSource` to extracted `.vite/build/*.js`, and parse each changed result with `typescript.createSourceFile(...).parseDiagnostics`.

  Expected literal result:

  ```text
  Renderer changes: 2
  Renderer labels: Speed setting; Speed service tier allowance; Speed service tier request allowance; Speed service tier conversation fallback; Composer Intelligence Speed menu; Fast slash command; Disable automatic updates schema; Disable automatic updates setting
  Main-process changes: 4
  Parse diagnostics: 0
  Manual checkForUpdates preserved: true
  Manual installUpdatesIfAvailable preserved: true
  ```

- [ ] **Step 4: Recheck installed application safety evidence**

  Run:

  ```bash
  shasum -a 256 /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
  codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
  ```

  Expected hashes remain:

  ```text
  0e4f824024d0838dd7548751c02d3a7d21917c4fc3edf74c9e98d88ea9e3127d  /Applications/ChatGPT.app/Contents/Resources/app.asar
  e40cb2f4a9089144a179d42497994cb81557c95b51a0c77e0942654e6d01c6a2  /Applications/ChatGPT.app/Contents/Info.plist
  ```

  Expected signature result: `valid on disk` and `satisfies its Designated Requirement`.

- [ ] **Step 5: Inspect final repository state**

  Run:

  ```bash
  git diff --check
  git status --short
  git log -4 --oneline
  ```

  Expected: no unstaged or uncommitted files; the latest commits are the documentation commit, compatibility implementation commit, implementation-plan commit, and already-approved design commit. Report the omitted interactive UI smoke test as a validation boundary, not as a pass.
