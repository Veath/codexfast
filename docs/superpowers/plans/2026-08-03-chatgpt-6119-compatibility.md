# ChatGPT 6119 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict runtime-launch compatibility for `ChatGPT.app` `26.727.51351` (`build 6119`) without changing package version `0.66.0` or publishing npm.

**Architecture:** Reuse the build-6067 renderer and main-process signatures already validated against the extracted build-6119 bundle. Add only the exact version/build key to the compatibility whitelist and official-Plugins policy sets, while retaining the existing numeric official GPT-5.6 threshold.

**Tech Stack:** TypeScript, Node.js 18+, pnpm, shell regression harness, Electron ASAR inspection, CDP runtime patch source.

## Global Constraints

- Do not change `package.json` version `0.66.0` or publish the package.
- Treat `src/*` as source and regenerate `bin/codexfast` with `pnpm build`.
- Keep public launch runtime-only and fail-closed.
- Do not modify `app.asar`, `Info.plist`, the installed application bundle, or its code signature.
- Keep the exact whitelist; do not accept a version range or unknown future build.
- Keep GPT-5.6 and Plugins on official application paths for build 6119.
- Do not change patch regexes, replacements, dependencies, or public launcher behavior.
- Do not claim an interactive runtime-launch or UI smoke test; ChatGPT remains running.

---

### Task 1: Add build-6119 regression coverage and minimal compatibility entries

**Files:**
- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Regenerate: `bin/codexfast`

**Interfaces:**
- Consumes: `prepareFakeApp`, `runScriptCommand`, `runtimePatcherSourceForVersion`, exact version key `26.727.51351+6119`.
- Produces: strict launch admission for build 6119, no legacy initial Plugins requirement, official Plugins filtering, official GPT-5.6 filtering, and an updated generated CLI.

- [ ] **Step 1: Add the failing strict-admission and required-target tests**

  Add after the build-6067 non-running launch case in `test/runtime-launch-flow.mts`:

  ```ts
  const nonRunningLaunch2672751351App = join(tmpDir, "NonRunningLaunch2672751351.app");
  const nonRunningLaunch2672751351Output = join(tmpDir, "non-running-launch-26727-51351-output.txt");
  prepareFakeApp(nonRunningLaunch2672751351App, "26.727.51351", "6119");
  runScriptCommand(nonRunningLaunch2672751351App, ["launch"], nonRunningLaunch2672751351Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2672751351Output), "Compatibility: supported", "expected build 6119 to pass the strict support gate", readOutput(nonRunningLaunch2672751351Output));
  assertContains(readOutput(nonRunningLaunch2672751351Output), "Runtime launch failed: Codex executable not found:", "expected supported build 6119 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2672751351Output));
  assertContains(readOutput(nonRunningLaunch2672751351Output), "Contents/MacOS/ChatGPT", "expected build 6119 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2672751351Output));
  assertNoLaunchCalls(nonRunningLaunch2672751351Output);
  assertNoBundleMutationTools(nonRunningLaunch2672751351Output);
  ```

  Add after the build-6067 pending-target case:

  ```ts
  const launchPendingTargets2672751351App = join(tmpDir, "LaunchPendingTargets2672751351.app");
  const launchPendingTargets2672751351Output = join(tmpDir, "launch-pending-targets-26727-51351-output.txt");
  prepareFakeApp(launchPendingTargets2672751351App, "26.727.51351", "6119");
  runScriptCommand(launchPendingTargets2672751351App, ["launch"], launchPendingTargets2672751351Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2672751351Output), "Runtime patch interception did not observe required targets: none.", "expected build 6119 not to require the legacy Plugins access target", readOutput(launchPendingTargets2672751351Output));
  assertNotContains(readOutput(launchPendingTargets2672751351Output), "Plugins access", "expected build 6119 missing-target output not to name Plugins access", readOutput(launchPendingTargets2672751351Output));
  assertNoLaunchCalls(launchPendingTargets2672751351Output);
  assertNoBundleMutationTools(launchPendingTargets2672751351Output);
  ```

- [ ] **Step 2: Add official Plugins and GPT-5.6 policy assertions**

  Add build 6119 to the official Plugins policy table in `test/suites/runtime-patch-suite.mts`:

  ```ts
    ["26.727.51351+6119", "6119"],
  ```

  Add after the build-6067 GPT-5.6 assertions:

  ```ts
  const officialGpt56Build6119Result = applyOfficialGpt56PatcherForVersion("26.727.51351+6119")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build6119Result.content, "GPT56_LIST_DISABLED", "expected build 6119 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build6119Result.content, "GPT56_SELECTOR_DISABLED", "expected build 6119 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build6119Result.content, "SPEED_ENABLED", "expected build 6119 to retain non-GPT runtime patches");
  ```

- [ ] **Step 3: Run the regression entrypoint and verify RED**

  Run:

  ```bash
  bash test/re-sign-flow.sh
  ```

  Expected: non-zero exit. The build-6119 fake app reports `Compatibility: unsupported`; after that test is isolated or production admission remains absent, the official Plugins policy assertion would observe `PLUGIN_ENABLED` because build 6119 is not yet in the production policy set. The GPT-5.6 assertions already pass through the numeric threshold.

- [ ] **Step 4: Add the minimal production compatibility entries**

  Append to `SUPPORTED_APP_VERSIONS` in `src/supported-app-versions.mts`:

  ```ts
  "26.727.51351+6119": "ChatGPT.app 26.727.51351 build 6119",
  ```

  Add after build 6067 in both `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys` in `src/cli-runtime-launch.mts`:

  ```ts
  "26.727.51351+6119",
  ```

- [ ] **Step 5: Regenerate the self-contained CLI**

  Run:

  ```bash
  pnpm build
  ```

  Expected: `bin/codexfast` changes only where the embedded whitelist and two embedded Plugins policy sets gain build 6119.

- [ ] **Step 6: Run the regression entrypoint and verify GREEN**

  Run:

  ```bash
  bash test/re-sign-flow.sh
  ```

  Expected: exit 0; build 6119 reaches only the fake app's missing-executable boundary, does not require legacy `Plugins access`, skips Plugins compatibility targets, skips GPT-5.6 compatibility targets, and retains non-Plugins/non-GPT patches.

- [ ] **Step 7: Commit the tested compatibility change**

  ```bash
  git add test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts src/supported-app-versions.mts src/cli-runtime-launch.mts bin/codexfast
  git commit -m "feat: add ChatGPT build 6119 support"
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
- Create: `docs/bundle-notes/2026-08-03-chatgpt-app-26.727.51351-build-6119.md`

**Interfaces:**
- Consumes: installed metadata and hashes, extracted target filenames, eight-label patch evidence, parse results, and the accepted non-interactive validation boundary.
- Produces: synchronized public and maintainer documentation for the exact supported build.

- [ ] **Step 1: Update public compatibility summaries**

  Make the newest line in `README.md`:

  ```md
  Latest verified local build: `ChatGPT.app` / `Codex.app` `26.727.51351` (`build 6119`).
  ```

  Move build 6067 into the following `Also verified` paragraph, newest first. Make the equivalent Chinese lines:

  ```md
  最新完成本地验证的版本：`ChatGPT.app` / `Codex.app` `26.727.51351`（`build 6119`）。
  ```

  Add under `CHANGELOG.md`'s `## [Unreleased]`:

  ```md
  ### Added

  - Added local compatibility for `ChatGPT.app` `26.727.51351` (`build 6119`) after direct installed-bundle inspection confirmed the build-6067 Fast and automatic-update target family remains compatible while GPT-5.6 and Plugins continue to use official application paths.
  ```

- [ ] **Step 2: Update maintained compatibility knowledge**

  Add this newest row to `docs/compatibility-matrix.md`:

  ```md
  | `26.727.51351` | `6119` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, official GPT-5.6, official Plugins support, Disable automatic updates | `2026-08-03` | Verified by direct installed-bundle inspection, version-filtered extracted-bundle patching, JavaScript parse checks, and regression coverage against `/Applications/ChatGPT.app` with bundle id `com.openai.codex`. Existing Fast and automatic-update signatures match `app-initial-iBPGfcXU.js` and `general-settings-BBCiVbba.js`, and the callback-aware Sparkle hook remains in `.vite/build/window-all-closed-Coc41Tfs.js`. Installed bundle hashes remained unchanged and the signature remained valid. ChatGPT was running, so a fresh real runtime launch was not performed. |
  ```

  Add `26.727.51351` beside `26.727.40816` in the Settings-tier, Intelligence Speed, official Plugins, required-initial-target, troubleshooting, and official-path lists in `docs/feature-scope.md`, `docs/real-app-validation.md`, and `docs/troubleshooting.md`.

  Add the build-specific mapping to `docs/feature-scope.md` and `docs/patch-targets.md` using these exact files:

  ```md
  `webview/assets/app-initial-iBPGfcXU.js`
  `webview/assets/general-settings-BBCiVbba.js`
  `.vite/build/child-process-snapshot-worker.js`
  `.vite/build/src-CLstCQVF.js`
  `.vite/build/worker.js`
  `.vite/build/window-all-closed-Coc41Tfs.js`
  ```

  State that GPT-5.6 and Plugins use official application paths, all existing Fast/update signatures match, and manual update actions remain available.

- [ ] **Step 3: Add the build-specific bundle note**

  Create `docs/bundle-notes/2026-08-03-chatgpt-app-26.727.51351-build-6119.md` with:

  - Metadata: bundle identifier, exact version/build, the two pre-adaptation SHA-256 hashes, and signature validation result.
  - Target mapping: the six renderer/main-process filenames listed in Step 2 and their mapped feature labels.
  - Validation: initial fail-closed reproduction, two changed renderer modules, eight labels, four changed main-process modules, zero parse diagnostics, preserved manual update methods, unchanged hashes, and valid signature.
  - Boundary: no forced quit or interactive UI click-through.

- [ ] **Step 4: Check documentation consistency**

  Run:

  ```bash
  rg -n "26\.727\.51351|6119" README.md README.zh-CN.md CHANGELOG.md docs
  git diff --check
  ```

  Expected: every public and maintainer compatibility surface names the exact pair consistently, newest-first README ordering is preserved, and no whitespace errors are reported.

- [ ] **Step 5: Commit synchronized documentation**

  ```bash
  git add README.md README.zh-CN.md CHANGELOG.md docs/compatibility-matrix.md docs/feature-scope.md docs/patch-targets.md docs/real-app-validation.md docs/troubleshooting.md docs/bundle-notes/2026-08-03-chatgpt-app-26.727.51351-build-6119.md
  git commit -m "docs: document ChatGPT build 6119 support"
  ```

---

### Task 3: Verify the completed adaptation and installed-app safety boundary

**Files:**
- Verify: all changed source, generated, test, and documentation files.
- Read only: `/Applications/ChatGPT.app/Contents/Resources/app.asar` and `/Applications/ChatGPT.app/Contents/Info.plist`.

**Interfaces:**
- Consumes: Tasks 1-2 and extracted bundle directory `/tmp/codexfast-6119.dmbP4j` while it remains available.
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
  pnpm inspect:bundle-targets /tmp/codexfast-6119.dmbP4j
  ```

  Expected guarded targets: `general-settings-BBCiVbba.js` contains Settings Fast and the automatic-update setting; `app-initial-iBPGfcXU.js` contains service-tier allowance, request allowance, conversation fallback, Intelligence Speed, `/fast`, and the renderer automatic-update schema.

- [ ] **Step 3: Re-run in-memory policy-filtered patch and parse validation**

  Apply all non-Plugins and non-official-GPT-5.6 target specs to extracted `webview/assets/*.js`, apply `patchMainProcessSettingsSchemaSource` and `patchMainProcessAutomaticUpdateSource` to extracted `.vite/build/*.js`, and parse each changed result with `typescript.createSourceFile(...).parseDiagnostics`.

  Require this result:

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

  Require the original hashes:

  ```text
  a529edd72e10b08931c0d695b5e3e6a0be7f51874610dafc04f578436ab7d74d  /Applications/ChatGPT.app/Contents/Resources/app.asar
  eb794f1980b153a5f91ed80a91bbfcfffa2d374fda7bcfa7ce4c82a327427215  /Applications/ChatGPT.app/Contents/Info.plist
  ```

  Require the signature output to report `valid on disk` and `satisfies its Designated Requirement`.

- [ ] **Step 5: Inspect final repository state**

  Run:

  ```bash
  git diff --check
  git status --short
  git log -5 --oneline
  ```

  Expected: no unstaged or uncommitted files; the newest commits are the documentation, compatibility implementation, implementation-plan, and design commits. Report the omitted interactive UI smoke test as a validation boundary, not as a pass.
