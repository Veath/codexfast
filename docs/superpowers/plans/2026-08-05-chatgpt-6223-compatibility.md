# ChatGPT 6223 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict runtime-launch compatibility for `ChatGPT.app` `26.730.61309` (`build 6223`) without changing package version `0.67.0` or publishing npm.

**Architecture:** Reuse the build-6119 renderer and main-process signatures already validated against the extracted build-6223 bundle. Add only the exact version/build key to the compatibility whitelist and official-Plugins policy sets, while retaining the existing numeric official GPT-5.6 threshold.

**Tech Stack:** TypeScript, Node.js 18+, pnpm, shell regression harness, Electron ASAR inspection, CDP runtime patch source.

## Global Constraints

- Do not change `package.json` version `0.67.0` or publish the package.
- Treat `src/*` as source and regenerate `bin/codexfast` with `pnpm build`.
- Keep public launch runtime-only and fail-closed.
- Do not modify `app.asar`, `Info.plist`, the installed application bundle, or its code signature.
- Keep the exact whitelist; do not accept a version range or unknown future build.
- Keep GPT-5.6 and Plugins on official application paths for build 6223.
- Do not change patch regexes, replacements, dependencies, or public launcher behavior.
- Do not quit, restart, or otherwise disturb the running ChatGPT application.
- Do not claim an interactive runtime-launch or UI smoke test.

---

### Task 1: Add build-6223 regression coverage and minimal compatibility entries

**Files:**

- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Regenerate: `bin/codexfast`

**Interfaces:**

- Consumes: `prepareFakeApp`, `runScriptCommand`, `runtimePatcherSourceForVersion`, exact version key `26.730.61309+6223`.
- Produces: strict launch admission for build 6223, no legacy initial Plugins requirement, official Plugins filtering, official GPT-5.6 filtering, and an updated generated CLI.

- [ ] **Step 1: Add the failing strict-admission and required-target tests**

  Add after the build-6119 non-running launch case in `test/runtime-launch-flow.mts`:

  ```ts
  const nonRunningLaunch2673061309App = join(tmpDir, "NonRunningLaunch2673061309.app");
  const nonRunningLaunch2673061309Output = join(tmpDir, "non-running-launch-26730-61309-output.txt");
  prepareFakeApp(nonRunningLaunch2673061309App, "26.730.61309", "6223");
  runScriptCommand(nonRunningLaunch2673061309App, ["launch"], nonRunningLaunch2673061309Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2673061309Output), "Compatibility: supported", "expected build 6223 to pass the strict support gate", readOutput(nonRunningLaunch2673061309Output));
  assertContains(readOutput(nonRunningLaunch2673061309Output), "Runtime launch failed: Codex executable not found:", "expected supported build 6223 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2673061309Output));
  assertContains(readOutput(nonRunningLaunch2673061309Output), "Contents/MacOS/ChatGPT", "expected build 6223 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2673061309Output));
  assertNoLaunchCalls(nonRunningLaunch2673061309Output);
  assertNoBundleMutationTools(nonRunningLaunch2673061309Output);
  ```

  Add after the build-6119 pending-target case:

  ```ts
  const launchPendingTargets2673061309App = join(tmpDir, "LaunchPendingTargets2673061309.app");
  const launchPendingTargets2673061309Output = join(tmpDir, "launch-pending-targets-26730-61309-output.txt");
  prepareFakeApp(launchPendingTargets2673061309App, "26.730.61309", "6223");
  runScriptCommand(launchPendingTargets2673061309App, ["launch"], launchPendingTargets2673061309Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2673061309Output), "Runtime patch interception did not observe required targets: none.", "expected build 6223 not to require the legacy Plugins access target", readOutput(launchPendingTargets2673061309Output));
  assertNotContains(readOutput(launchPendingTargets2673061309Output), "Plugins access", "expected build 6223 missing-target output not to name Plugins access", readOutput(launchPendingTargets2673061309Output));
  assertNoLaunchCalls(launchPendingTargets2673061309Output);
  assertNoBundleMutationTools(launchPendingTargets2673061309Output);
  ```

- [ ] **Step 2: Add official Plugins and GPT-5.6 policy assertions**

  Add build 6223 to the official Plugins policy table in `test/suites/runtime-patch-suite.mts`:

  ```ts
    ["26.730.61309+6223", "6223"],
  ```

  Add after the build-6119 GPT-5.6 assertions:

  ```ts
  const officialGpt56Build6223Result = applyOfficialGpt56PatcherForVersion("26.730.61309+6223")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build6223Result.content, "GPT56_LIST_DISABLED", "expected build 6223 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build6223Result.content, "GPT56_SELECTOR_DISABLED", "expected build 6223 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build6223Result.content, "SPEED_ENABLED", "expected build 6223 to retain non-GPT runtime patches");
  ```

- [ ] **Step 3: Run the regression entrypoint and verify RED**

  Run:

  ```bash
  bash test/re-sign-flow.sh
  ```

  Expected: non-zero exit. The build-6223 fake app reports `Compatibility: unsupported`. After isolating that assertion or adding only admission temporarily, the official Plugins policy case would still observe `PLUGIN_ENABLED`; the GPT-5.6 assertions already pass through the numeric threshold.

- [ ] **Step 4: Add the minimal production compatibility entries**

  Append to `SUPPORTED_APP_VERSIONS` in `src/supported-app-versions.mts`:

  ```ts
  "26.730.61309+6223": "ChatGPT.app 26.730.61309 build 6223",
  ```

  Add after build 6119 in both `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys` in `src/cli-runtime-launch.mts`:

  ```ts
  "26.730.61309+6223",
  ```

- [ ] **Step 5: Regenerate the self-contained CLI**

  Run:

  ```bash
  pnpm build
  ```

  Expected: `bin/codexfast` changes only where the embedded whitelist and two embedded Plugins policy sets gain build 6223.

- [ ] **Step 6: Run the regression entrypoint and verify GREEN**

  Run:

  ```bash
  bash test/re-sign-flow.sh
  ```

  Expected: exit 0; build 6223 reaches only the fake app's missing-executable boundary, does not require legacy `Plugins access`, skips Plugins compatibility targets, skips GPT-5.6 compatibility targets, and retains non-Plugins/non-GPT patches.

- [ ] **Step 7: Commit the tested compatibility change**

  ```bash
  git add test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts src/supported-app-versions.mts src/cli-runtime-launch.mts bin/codexfast
  git commit -m "feat: add ChatGPT build 6223 support"
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
- Create: `docs/bundle-notes/2026-08-05-chatgpt-app-26.730.61309-build-6223.md`

**Interfaces:**

- Consumes: installed metadata and hashes, extracted target filenames, eight-label patch evidence, parse results, and the accepted non-interactive validation boundary.
- Produces: synchronized public and maintainer documentation for the exact supported build.

- [ ] **Step 1: Update public compatibility summaries**

  Make the newest line in `README.md`:

  ```md
  Latest verified local build: `ChatGPT.app` / `Codex.app` `26.730.61309` (`build 6223`).
  ```

  Move build 6119 into the following `Also verified` paragraph, newest first. Make the equivalent Chinese lines:

  ```md
  最新完成本地验证的版本：`ChatGPT.app` / `Codex.app` `26.730.61309`（`build 6223`）。
  ```

  Add under `CHANGELOG.md`'s `## [Unreleased]`:

  ```md
  ### Added

  - Added local compatibility for `ChatGPT.app` `26.730.61309` (`build 6223`) after direct installed-bundle inspection confirmed the build-6119 Fast and automatic-update target family remains compatible while GPT-5.6 and Plugins continue to use official application paths.
  ```

- [ ] **Step 2: Update maintained compatibility knowledge**

  Add this newest row to `docs/compatibility-matrix.md`:

  ```md
  | `26.730.61309` | `6223` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, official GPT-5.6, official Plugins support, Disable automatic updates | `2026-08-05` | Verified by direct installed-bundle inspection, version-filtered extracted-bundle patching, JavaScript parse checks, and regression coverage against `/Applications/ChatGPT.app` with bundle id `com.openai.codex`. Existing Fast and automatic-update signatures match `app-initial-YjNFxVhk.js` and `general-settings-DzOMKOoh.js`, and the callback-aware Sparkle hook matches `.vite/build/window-all-closed-DJDXIcEI.js`. Installed bundle hashes remained unchanged and the signature remained valid. ChatGPT was running and was not disturbed, so a fresh real runtime launch was not performed. |
  ```

  Add `26.730.61309` after `26.727.51351` in the Settings-tier, Intelligence Speed, official Plugins, required-initial-target, troubleshooting, and official-path lists in `docs/feature-scope.md`, `docs/real-app-validation.md`, and `docs/troubleshooting.md`.

  Add the build-specific mapping to `docs/feature-scope.md` and `docs/patch-targets.md` using these exact files:

  ```md
  `webview/assets/app-initial-YjNFxVhk.js`
  `webview/assets/general-settings-DzOMKOoh.js`
  `.vite/build/child-process-snapshot-worker.js`
  `.vite/build/src-Bn_6ASpg.js`
  `.vite/build/worker.js`
  `.vite/build/window-all-closed-DJDXIcEI.js`
  ```

  State that GPT-5.6 and Plugins use official application paths, all existing Fast/update signatures match, and manual update actions remain available.

- [ ] **Step 3: Add the build-specific bundle note**

  Create `docs/bundle-notes/2026-08-05-chatgpt-app-26.730.61309-build-6223.md` with these sections and facts:

  ```md
  # ChatGPT.app 26.730.61309 Build 6223

  ## Metadata

  - Bundle: `/Applications/ChatGPT.app`
  - Bundle identifier: `com.openai.codex`
  - `CFBundleShortVersionString`: `26.730.61309`
  - `CFBundleVersion`: `6223`
  - `app.asar` SHA-256 before adaptation: `9de942a9a058fca20b78d171032e0fe65ccb1063868f175ff7eb4e159efc2c38`
  - `Info.plist` SHA-256 before adaptation: `9bce048543fdc13905666a272b9f85dffafffa35201614ac13a27870097fca3a`
  - Deep strict code-signature validation passed before adaptation.

  ## Target Mapping

  - `webview/assets/app-initial-YjNFxVhk.js`: shared Fast allowance, request allowance, configured-tier fallback, `/fast`, Intelligence Speed, and renderer settings schema.
  - `webview/assets/general-settings-DzOMKOoh.js`: Settings Fast and Disable automatic updates row.
  - `.vite/build/child-process-snapshot-worker.js`, `.vite/build/src-Bn_6ASpg.js`, and `.vite/build/worker.js`: desktop settings schema copies discovered by source signature.
  - `.vite/build/window-all-closed-DJDXIcEI.js`: callback-aware automatic-update hook discovered by source signature.

  GPT-5.6 and Plugins use the official application paths for this repository's supported custom-API feature scope.

  ## Validation

  - The unmodified `codexfast 0.67.0` launcher reproduced the expected fail-closed result because `26.730.61309+6223` was absent from the exact whitelist.
  - Version-filtered in-memory patching changed the required renderer modules and produced all eight required labels.
  - Main-process patching changed three settings-schema modules and the active updater module with zero parse diagnostics.
  - The updater patch preserved `checkForUpdates` and `installUpdatesIfAvailable`.
  - Installed hashes remained unchanged and deep strict signature validation passed.

  ## Validation Boundary

  ChatGPT remained running and was not quit, restarted, or operated for a fresh `codexfast launch`; no interactive UI smoke test is claimed.
  ```

- [ ] **Step 4: Check documentation consistency**

  Run:

  ```bash
  rg -n "26\.730\.61309|6223" README.md README.zh-CN.md CHANGELOG.md docs
  git diff --check
  ```

  Expected: the exact version/build appears in both READMEs, the changelog, compatibility matrix, feature/target/validation/troubleshooting docs, design and plan, and the new bundle note; `git diff --check` exits 0.

- [ ] **Step 5: Commit the documentation change**

  ```bash
  git add README.md README.zh-CN.md CHANGELOG.md docs/compatibility-matrix.md docs/feature-scope.md docs/patch-targets.md docs/real-app-validation.md docs/troubleshooting.md docs/bundle-notes/2026-08-05-chatgpt-app-26.730.61309-build-6223.md
  git commit -m "docs: document ChatGPT build 6223 support"
  ```

---

### Task 3: Run full validation without disturbing ChatGPT

**Files:**

- Read only: `package.json`, `bin/codexfast`, repository diff, `/Applications/ChatGPT.app/Contents/Resources/app.asar`, and `/Applications/ChatGPT.app/Contents/Info.plist`.
- Read only: extracted bundle under `/tmp/codexfast-6223.3fY84M` while it remains available.

**Interfaces:**

- Consumes: Task 1's generated CLI and Task 2's compatibility documentation.
- Produces: evidence that source, generated output, regressions, package contents, extracted-bundle patches, installed hashes, and code signature all remain valid within the non-interactive boundary.

- [ ] **Step 1: Run repository validation**

  Run each command independently and require exit 0:

  ```bash
  pnpm build:check
  pnpm typecheck
  pnpm check:version-drift
  bash test/re-sign-flow.sh
  pnpm test
  pnpm pack --dry-run
  ```

- [ ] **Step 2: Revalidate the extracted renderer bundle with build-6223 policy**

  Run:

  ```bash
  pnpm exec tsx -e 'import {readFileSync,readdirSync} from "node:fs"; import {join,relative} from "node:path"; import ts from "typescript"; import {runtimePatcherSourceForVersion} from "./src/cli-runtime-launch.mts"; const root="/tmp/codexfast-6223.3fY84M"; const generated=readFileSync("bin/codexfast","utf8"); const match=generated.match(/const __PATCHER_SOURCE__ = (".*");/); if(!match) throw new Error("patcher source not found"); const patcher=JSON.parse(match[1]); const filtered=runtimePatcherSourceForVersion(patcher,"26.730.61309+6223"); const apply=new Function(`${filtered}\nreturn applyRuntimePatchesToBody;`)(); const files:string[]=[]; const walk=(dir:string)=>{for(const entry of readdirSync(dir,{withFileTypes:true})){const file=join(dir,entry.name); if(entry.isDirectory()) walk(file); else if(entry.isFile()&&entry.name.endsWith(".js")) files.push(file)}}; walk(root); const rows=[]; const labels=new Set<string>(); let diagnostics=0; for(const file of files){const body=readFileSync(file,"utf8"); const result=apply(file,body); if(result.patchedLabels.length||result.alreadyPatchedLabels.length){for(const label of result.patchedLabels) labels.add(label); diagnostics+=ts.createSourceFile(file,result.content,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length; rows.push({file:relative(root,file),patched:[...new Set(result.patchedLabels)]});}} console.log(JSON.stringify({files:files.length,labels:[...labels].sort(),parseDiagnostics:diagnostics,rows},null,2));'
  ```

  Require:

  ```text
  unique labels:
  - Speed setting
  - Speed service tier allowance
  - Speed service tier request allowance
  - Speed service tier conversation fallback
  - Composer Intelligence Speed menu
  - Fast slash command
  - Disable automatic updates schema
  - Disable automatic updates setting
  parseDiagnostics: 0
  plugin/GPT-5.6 compatibility labels: 0
  ```

- [ ] **Step 3: Revalidate extracted main-process modules**

  Run:

  ```bash
  pnpm exec tsx -e 'import {readFileSync,readdirSync} from "node:fs"; import {join,relative} from "node:path"; import ts from "typescript"; import {patchMainProcessAutomaticUpdateSource,patchMainProcessSettingsSchemaSource} from "./src/cli-update-settings.mts"; const root="/tmp/codexfast-6223.3fY84M/.vite/build"; const files=readdirSync(root).filter(name=>name.endsWith(".js")); const rows=[]; let diagnostics=0; for(const name of files){const file=join(root,name),body=readFileSync(file,"utf8"); const schema=patchMainProcessSettingsSchemaSource(body); const updated=patchMainProcessAutomaticUpdateSource(schema); if(updated!==body){diagnostics+=ts.createSourceFile(file,updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length; rows.push({file:relative(root,file),schemaChanged:schema!==body,updaterChanged:updated!==schema,automaticCheck:updated.includes("codexfastAutomaticUpdateCheck"),reader:updated.includes("codexfastReadDisableAutomaticUpdates"),manualCheck:updated.includes("checkForUpdates"),manualInstall:updated.includes("installUpdatesIfAvailable")});}} console.log(JSON.stringify({files:files.length,changed:rows.length,parseDiagnostics:diagnostics,rows},null,2));'
  ```

  Require:

  ```text
  schema modules:
  - child-process-snapshot-worker.js
  - src-Bn_6ASpg.js
  - worker.js
  updater module:
  - window-all-closed-DJDXIcEI.js
  updater contains codexfastAutomaticUpdateCheck: true
  updater contains codexfastReadDisableAutomaticUpdates: true
  updater retains checkForUpdates: true
  updater retains installUpdatesIfAvailable: true
  parseDiagnostics: 0
  ```

- [ ] **Step 4: Verify installed bundle integrity without launching or stopping it**

  Run:

  ```bash
  shasum -a 256 /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
  codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
  ```

  Require the hashes to remain exactly:

  ```text
  9de942a9a058fca20b78d171032e0fe65ccb1063868f175ff7eb4e159efc2c38  /Applications/ChatGPT.app/Contents/Resources/app.asar
  9bce048543fdc13905666a272b9f85dffafffa35201614ac13a27870097fca3a  /Applications/ChatGPT.app/Contents/Info.plist
  ```

  Require code-signature output to end with:

  ```text
  /Applications/ChatGPT.app: valid on disk
  /Applications/ChatGPT.app: satisfies its Designated Requirement
  ```

- [ ] **Step 5: Inspect final history and worktree**

  Run:

  ```bash
  git diff HEAD~2..HEAD --stat
  git log -4 --oneline --decorate
  git status --short
  ```

  Expected: the two implementation commits are present after the design and plan commits; the worktree is clean; no package version, dependency, patch-signature, or installed-bundle changes appear.
