# ChatGPT Build 6234 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict runtime-launch compatibility for `ChatGPT.app` `26.730.61639` (`build 6234`) without changing package version `0.68.0` or disturbing the running application.

**Architecture:** Reuse the build-6223 renderer and main-process signatures already validated against the extracted build-6234 bundle. Add only the exact version/build key to compatibility and official-Plugins policy data, retain the numeric official GPT-5.6 threshold, and regenerate the self-contained launcher.

**Tech Stack:** TypeScript, Node.js 18+, pnpm, shell regression harness, Electron ASAR inspection, CDP runtime patch source.

## Global Constraints

- Do not change `package.json` version `0.68.0` or publish the package.
- Treat `src/*` as source and regenerate `bin/codexfast` with `pnpm build`.
- Keep public launch runtime-only, exact-whitelisted, and fail-closed.
- Do not modify `app.asar`, `Info.plist`, the installed application bundle, or its signature.
- Do not change patch regexes, replacements, dependencies, runtime URL matching, or launcher behavior.
- Keep GPT-5.6 and Plugins on official application paths for build 6234.
- Do not quit, restart, launch, or otherwise disturb the running ChatGPT application.
- Do not claim an interactive runtime-launch or UI smoke test.

---

### Task 1: Add build-6234 regression coverage and compatibility policy

**Files:**

- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Regenerate: `bin/codexfast`

**Interfaces:**

- Consumes: `prepareFakeApp`, `runScriptCommand`, `runtimePatcherSourceForVersion`, and version key `26.730.61639+6234`.
- Produces: exact launch admission, no legacy `Plugins access` initial requirement, official Plugins/GPT-5.6 filtering, and the regenerated CLI.

- [ ] **Step 1: Add the failing launch-admission test**

  Add after the build-6223 case in `test/runtime-launch-flow.mts`:

  ```ts
  const nonRunningLaunch2673061639App = join(tmpDir, "NonRunningLaunch2673061639.app");
  const nonRunningLaunch2673061639Output = join(tmpDir, "non-running-launch-26730-61639-output.txt");
  prepareFakeApp(nonRunningLaunch2673061639App, "26.730.61639", "6234");
  runScriptCommand(nonRunningLaunch2673061639App, ["launch"], nonRunningLaunch2673061639Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2673061639Output), "Compatibility: supported", "expected build 6234 to pass the strict support gate", readOutput(nonRunningLaunch2673061639Output));
  assertContains(readOutput(nonRunningLaunch2673061639Output), "Runtime launch failed: Codex executable not found:", "expected supported build 6234 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2673061639Output));
  assertContains(readOutput(nonRunningLaunch2673061639Output), "Contents/MacOS/ChatGPT", "expected build 6234 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2673061639Output));
  assertNoLaunchCalls(nonRunningLaunch2673061639Output);
  assertNoBundleMutationTools(nonRunningLaunch2673061639Output);
  ```

- [ ] **Step 2: Run the regression entrypoint and verify RED**

  Run `bash test/re-sign-flow.sh`.

  Expected: non-zero exit with the build-6234 fixture reporting `Compatibility: unsupported`; this proves the new assertion detects the missing exact whitelist entry.

- [ ] **Step 3: Add the remaining build-6234 policy tests**

  Add this pending-target fixture beside the build-6223 case:

  ```ts
  const launchPendingTargets2673061639App = join(tmpDir, "LaunchPendingTargets2673061639.app");
  const launchPendingTargets2673061639Output = join(tmpDir, "launch-pending-targets-26730-61639-output.txt");
  prepareFakeApp(launchPendingTargets2673061639App, "26.730.61639", "6234");
  runScriptCommand(launchPendingTargets2673061639App, ["launch"], launchPendingTargets2673061639Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2673061639Output), "Runtime patch interception did not observe required targets: none.", "expected build 6234 not to require the legacy Plugins access target", readOutput(launchPendingTargets2673061639Output));
  assertNotContains(readOutput(launchPendingTargets2673061639Output), "Plugins access", "expected build 6234 missing-target output not to name Plugins access", readOutput(launchPendingTargets2673061639Output));
  assertNoLaunchCalls(launchPendingTargets2673061639Output);
  assertNoBundleMutationTools(launchPendingTargets2673061639Output);
  ```

  Add this row to the official Plugins policy table in `test/suites/runtime-patch-suite.mts`:

  ```ts
    ["26.730.61639+6234", "6234"],
  ```

  Add an official GPT-5.6 case:

  ```ts
  const officialGpt56Build6234Result = applyOfficialGpt56PatcherForVersion("26.730.61639+6234")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build6234Result.content, "GPT56_LIST_DISABLED", "expected build 6234 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build6234Result.content, "GPT56_SELECTOR_DISABLED", "expected build 6234 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build6234Result.content, "SPEED_ENABLED", "expected build 6234 to retain non-GPT runtime patches");
  ```

- [ ] **Step 4: Add the minimal production entries**

  Append to `SUPPORTED_APP_VERSIONS`:

  ```ts
  "26.730.61639+6234": "ChatGPT.app 26.730.61639 build 6234",
  ```

  Add `"26.730.61639+6234"` after build 6223 in both `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys`.

- [ ] **Step 5: Regenerate and verify GREEN**

  Run `pnpm build`, then `bash test/re-sign-flow.sh`.

  Expected: build 6234 passes exact admission, requires no legacy Plugins initial label, skips Plugins/GPT-5.6 compatibility targets, retains Speed patches, and the full regression entrypoint exits 0.

- [ ] **Step 6: Commit the tested compatibility change**

  ```bash
  git add test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts src/supported-app-versions.mts src/cli-runtime-launch.mts bin/codexfast
  git commit -m "feat: add ChatGPT build 6234 support"
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
- Create: `docs/bundle-notes/2026-08-05-chatgpt-app-26.730.61639-build-6234.md`

**Interfaces:**

- Consumes: installed metadata and hashes, extracted target filenames, eight-label patch evidence, parse results, and the non-interactive validation boundary.
- Produces: synchronized public and maintainer documentation for the exact supported build.

- [ ] **Step 1: Update public compatibility summaries**

  Make the newest English and Chinese lines:

  ```md
  Latest verified local build: `ChatGPT.app` / `Codex.app` `26.730.61639` (`build 6234`).
  最新完成本地验证的版本：`ChatGPT.app` / `Codex.app` `26.730.61639`（`build 6234`）。
  ```

  Move build 6223 into the following newest-first `Also verified` paragraphs. Add under `CHANGELOG.md` `## [Unreleased]`:

  ```md
  ### Added

  - Added local compatibility for `ChatGPT.app` `26.730.61639` (`build 6234`) after direct installed-bundle inspection confirmed the build-6223 Fast and automatic-update target family remains compatible while GPT-5.6 and Plugins continue to use official application paths.
  ```

- [ ] **Step 2: Update maintained compatibility knowledge**

  Add build 6234 newest-first to the compatibility matrix and all current-build lists in feature scope, patch targets, real-app validation, and troubleshooting. Record:

  - `webview/assets/app-initial-CKNQDTeE.js`: Fast allowance, request allowance, configured-tier fallback, `/fast`, Intelligence Speed, renderer settings schema.
  - `webview/assets/general-settings-2iEePJwo.js`: Settings Fast and automatic-update row.
  - `.vite/build/child-process-snapshot-worker.js`, `.vite/build/src-Bn_6ASpg.js`, `.vite/build/worker.js`: settings schemas.
  - `.vite/build/window-all-closed-DJDXIcEI.js`: callback-aware updater hook with manual update actions preserved.
  - GPT-5.6 and Plugins use official application paths.
  - Validation did not include a live launch because ChatGPT remained running.

- [ ] **Step 3: Add the build-specific bundle note**

  Create `docs/bundle-notes/2026-08-05-chatgpt-app-26.730.61639-build-6234.md` with metadata, target mapping, validation results, and boundary sections. Include the exact hashes:

  ```text
  3fea92820c0fb7a69473e7a8308a8e5b8e91524289a84181a33533ec6cb51d45  app.asar
  3174ebb256487330ddd56a263ed9700ddb458189ec502804847251072866e9ce  Info.plist
  ```

- [ ] **Step 4: Check and commit documentation**

  Run:

  ```bash
  rg -n "26\.730\.61639|6234" README.md README.zh-CN.md CHANGELOG.md docs
  git diff --check
  ```

  Then commit:

  ```bash
  git add README.md README.zh-CN.md CHANGELOG.md docs/compatibility-matrix.md docs/feature-scope.md docs/patch-targets.md docs/real-app-validation.md docs/troubleshooting.md docs/bundle-notes/2026-08-05-chatgpt-app-26.730.61639-build-6234.md
  git commit -m "docs: document ChatGPT build 6234 support"
  ```

---

### Task 3: Validate without disturbing ChatGPT

**Files:**

- Read only: `package.json`, `bin/codexfast`, repository diff, extracted `/tmp/codexfast-6234.RUr0iU`, and installed application metadata.

**Interfaces:**

- Consumes: Tasks 1 and 2.
- Produces: fresh evidence for source/generated consistency, regressions, extracted-bundle patch validity, unchanged installed hashes, and valid signature.

- [ ] **Step 1: Run repository validation**

  Require exit 0 from each command:

  ```bash
  pnpm build:check
  pnpm typecheck
  pnpm check:version-drift
  bash test/re-sign-flow.sh
  pnpm test
  pnpm pack --dry-run
  ```

- [ ] **Step 2: Revalidate the extracted renderer and main-process modules**

  Apply `runtimePatcherSourceForVersion` for `26.730.61639+6234` to all extracted JavaScript files:

  ```bash
  pnpm exec tsx -e 'import {readFileSync,readdirSync} from "node:fs"; import {join,relative} from "node:path"; import ts from "typescript"; import {runtimePatcherSourceForVersion} from "./src/cli-runtime-launch.mts"; const root="/tmp/codexfast-6234.RUr0iU"; const generated=readFileSync("bin/codexfast","utf8"); const match=generated.match(/const __PATCHER_SOURCE__ = (".*");/); if(!match) throw new Error("patcher source not found"); const patcher=JSON.parse(match[1]); const filtered=runtimePatcherSourceForVersion(patcher,"26.730.61639+6234"); const apply=new Function(`${filtered}\nreturn applyRuntimePatchesToBody;`)(); const files:string[]=[]; const walk=(dir:string)=>{for(const entry of readdirSync(dir,{withFileTypes:true})){const file=join(dir,entry.name); if(entry.isDirectory()) walk(file); else if(entry.isFile()&&entry.name.endsWith(".js")) files.push(file)}}; walk(root); const rows=[]; const labels=new Set<string>(); let diagnostics=0; for(const file of files){const body=readFileSync(file,"utf8"); const result=apply(file,body); if(result.patchedLabels.length||result.alreadyPatchedLabels.length){for(const label of result.patchedLabels) labels.add(label); diagnostics+=ts.createSourceFile(file,result.content,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length; rows.push({file:relative(root,file),patched:[...new Set(result.patchedLabels)]});}} console.log(JSON.stringify({files:files.length,labels:[...labels].sort(),parseDiagnostics:diagnostics,rows},null,2));'
  ```

  Require the eight labels listed in the design, no Plugins/GPT-5.6 compatibility labels, and zero TypeScript JavaScript parse diagnostics.

  Apply `patchMainProcessSettingsSchemaSource` and `patchMainProcessAutomaticUpdateSource` to `.vite/build/*.js`:

  ```bash
  pnpm exec tsx -e 'import {readFileSync,readdirSync} from "node:fs"; import {join,relative} from "node:path"; import ts from "typescript"; import {patchMainProcessAutomaticUpdateSource,patchMainProcessSettingsSchemaSource} from "./src/cli-update-settings.mts"; const root="/tmp/codexfast-6234.RUr0iU/.vite/build"; const files=readdirSync(root).filter(name=>name.endsWith(".js")); const rows=[]; let diagnostics=0; for(const name of files){const file=join(root,name),body=readFileSync(file,"utf8"); const schema=patchMainProcessSettingsSchemaSource(body); const updated=patchMainProcessAutomaticUpdateSource(schema); if(updated!==body){diagnostics+=ts.createSourceFile(file,updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length; rows.push({file:relative(root,file),schemaChanged:schema!==body,updaterChanged:updated!==schema,automaticCheck:updated.includes("codexfastAutomaticUpdateCheck"),reader:updated.includes("codexfastReadDisableAutomaticUpdates"),manualCheck:updated.includes("checkForUpdates"),manualInstall:updated.includes("installUpdatesIfAvailable")});}} console.log(JSON.stringify({files:files.length,changed:rows.length,parseDiagnostics:diagnostics,rows},null,2));'
  ```

  Require three schema modules, updater module `window-all-closed-DJDXIcEI.js`, `codexfastAutomaticUpdateCheck`, `codexfastReadDisableAutomaticUpdates`, preserved `checkForUpdates`, preserved `installUpdatesIfAvailable`, and zero parse diagnostics.

- [ ] **Step 3: Verify installed integrity and final repository state**

  Run:

  ```bash
  shasum -a 256 /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
  codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
  git diff --check
  git status --short
  git log -5 --oneline --decorate
  ```

  Require the original hashes, a valid designated requirement, no uncommitted changes, and no package-version or dependency changes. Report explicitly that no interactive launch or UI smoke test was performed.
