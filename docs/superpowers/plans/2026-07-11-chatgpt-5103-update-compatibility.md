# ChatGPT.app 26.707.41301 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support `ChatGPT.app` `26.707.41301+5103`, use official GPT-5.6 behavior from that threshold onward, and restore reliable automatic-update suppression while preserving manual updates.

**Architecture:** Keep the strict exact-build compatibility gate, then apply a numeric version/build threshold only to GPT-5.6 target filtering. Make the injected main-process hook discover updater and Settings-schema modules by code signature inside `.vite/build/*.js`, and add one narrow renderer target for the build-5103 General Settings row.

**Tech Stack:** TypeScript, Node.js module loader hooks, regular-expression bundle patching, generated single-file CLI, shell-driven regression tests.

---

## File Map

- `src/supported-app-versions.mts`: exact compatibility whitelist.
- `src/cli-runtime-launch.mts`: build-family filtering and the official GPT-5.6 threshold.
- `src/cli-update-settings.mts`: process-local main-process hook and Sparkle suppression.
- `src/targets/updates.mts`: Settings > General renderer target for build 5103.
- `test/suites/runtime-patch-suite.mts`: target, threshold, updater, syntax, and idempotency regressions.
- `test/runtime-launch-flow.mts`: generated CLI support-gate and launch-policy regressions.
- `test/suites/generated-cli-suite.mts`: assertions against the generated single-file launcher.
- `docs/compatibility-matrix.md`, `docs/feature-scope.md`, `docs/patch-targets.md`: long-lived compatibility behavior.
- `docs/bundle-notes/2026-07-11-chatgpt-app-26.707.41301-build-5103.md`: verified bundle facts.
- `README.md`, `README.zh-CN.md`, `CHANGELOG.md`: public compatibility and behavior notes.
- `bin/codexfast`: generated output; never edit directly.

### Task 1: Add the build-5103 gate and official GPT-5.6 threshold

**Files:**
- Modify: `test/suites/runtime-patch-suite.mts:1300-1385`
- Modify: `test/runtime-launch-flow.mts:699-710`
- Modify: `src/cli-runtime-launch.mts:85-128,368-419`
- Modify: `src/supported-app-versions.mts:45-50`

- [ ] **Step 1: Write failing runtime-filter tests**

Extend the synthetic `runtimePatcherSourceForVersion` coverage in `runRuntimePatchSuite()` with explicit GPT-5.6 target ids:

```ts
const officialGpt56PatcherSource = `
const TARGET_SPECS = [
  {id:"gpt5x-model-list-options",label:"GPT-5.x model list",needle:"gpt56-list",guardedSignature:/GPT56_LIST_DISABLED/,patchedSignature:/GPT56_LIST_ENABLED/,legacyPatchedSignature:null,applyReplacement:"GPT56_LIST_ENABLED"},
  {id:"gpt56-model-query-selector",label:"GPT-5.6 model query selector",needle:"gpt56-selector",guardedSignature:/GPT56_SELECTOR_DISABLED/,patchedSignature:/GPT56_SELECTOR_ENABLED/,legacyPatchedSignature:null,applyReplacement:"GPT56_SELECTOR_ENABLED"},
  {id:"speed-setting",label:"Speed setting",needle:"speed-needle",guardedSignature:/SPEED_DISABLED/,patchedSignature:/SPEED_ENABLED/,legacyPatchedSignature:null,applyReplacement:"SPEED_ENABLED"},
];
function replaceContent(content, signature, replacement) { return content.replace(signature, replacement); }
function replaceContentOrThrow(content, signature, replacement) { return replaceContent(content, signature, replacement); }
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  return guarded || patched ? {spec, guarded, patched, legacyPatched:false} : null;
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`;

const applyForVersion = (versionKey: string) =>
  new Function(`${runtimePatcherSourceForVersion(officialGpt56PatcherSource, versionKey)}\nreturn applyRuntimePatchesToBody;`)() as
    (resourcePath: string, body: string) => { content: string; patchedLabels: string[] };

const body = "gpt56-list GPT56_LIST_DISABLED gpt56-selector GPT56_SELECTOR_DISABLED speed-needle SPEED_DISABLED";

const thresholdResult = applyForVersion("26.707.41301+5103")("app://-/assets/demo.js", body);
assertContains(thresholdResult.content, "GPT56_LIST_DISABLED", "expected build 5103 to use the official GPT-5.6 model list");
assertContains(thresholdResult.content, "GPT56_SELECTOR_DISABLED", "expected build 5103 to use the official GPT-5.6 selector");
assertContains(thresholdResult.content, "SPEED_ENABLED", "expected build 5103 to retain non-GPT runtime patches");

const laterResult = applyForVersion("26.708.10000+5200")("app://-/assets/demo.js", body);
assertContains(laterResult.content, "GPT56_LIST_DISABLED", "expected later builds to use the official GPT-5.6 model list");
assertContains(laterResult.content, "GPT56_SELECTOR_DISABLED", "expected later builds to use the official GPT-5.6 selector");

const olderResult = applyForVersion("26.707.31428+5059")("app://-/assets/demo.js", body);
assertContains(olderResult.content, "GPT56_LIST_ENABLED", "expected pre-threshold builds to retain GPT-5.6 model-list compatibility");
assertContains(olderResult.content, "GPT56_SELECTOR_ENABLED", "expected pre-threshold builds to retain GPT-5.6 selector compatibility");
```

- [ ] **Step 2: Write failing generated-launch support tests**

Add a fake build-5103 app in `test/runtime-launch-flow.mts`:

```ts
const nonRunningLaunch2670741301App = join(tmpDir, "NonRunningLaunch2670741301.app");
const nonRunningLaunch2670741301Output = join(tmpDir, "non-running-launch-26707-41301-output.txt");
prepareFakeApp(nonRunningLaunch2670741301App, "26.707.41301", "5103");
runScriptCommand(nonRunningLaunch2670741301App, ["launch"], nonRunningLaunch2670741301Output, {
  CODEXFAST_TEST_ALLOW_NONZERO: "1",
});
assertContains(readOutput(nonRunningLaunch2670741301Output), "Compatibility: supported", "expected build 5103 to pass the strict support gate");
assertContains(readOutput(nonRunningLaunch2670741301Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5103 fixture to fail only at its missing executable");
assertNoLaunchCalls(nonRunningLaunch2670741301Output);
assertNoBundleMutationTools(nonRunningLaunch2670741301Output);
```

Add the corresponding pending-target assertion proving this build does not require legacy Plugins access:

```ts
const launchPendingTargets2670741301App = join(tmpDir, "LaunchPendingTargets2670741301.app");
const launchPendingTargets2670741301Output = join(tmpDir, "launch-pending-targets-26707-41301-output.txt");
prepareFakeApp(launchPendingTargets2670741301App, "26.707.41301", "5103");
runScriptCommand(launchPendingTargets2670741301App, ["launch"], launchPendingTargets2670741301Output, {
  CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
  CODEXFAST_TEST_ALLOW_NONZERO: "1",
});
assertContains(readOutput(launchPendingTargets2670741301Output), "Runtime patch interception did not observe required targets: none.", "expected build 5103 not to require the legacy Plugins access target");
assertNotContains(readOutput(launchPendingTargets2670741301Output), "Plugins access", "expected build 5103 missing-target output not to name Plugins access");
assertNoLaunchCalls(launchPendingTargets2670741301Output);
assertNoBundleMutationTools(launchPendingTargets2670741301Output);
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: FAIL because `26.707.41301+5103` is unsupported and the GPT-5.6 targets are still patched at and above the threshold.

- [ ] **Step 4: Implement numeric threshold filtering and whitelist support**

Add to `src/cli-runtime-launch.mts`:

```ts
const runtimePatchOfficialGpt56ThresholdVersionKey = "26.707.41301+5103";
const runtimePatchOfficialGpt56TargetIds = new Set([
  "gpt5x-model-list-options",
  "gpt56-model-query-selector",
]);

function compareNumericVersionKeys(left: string, right: string): number {
  const parse = (value: string): { version: number[]; build: number } => {
    const [versionText, buildText = "0"] = value.split("+", 2);
    return {
      version: versionText.split(".").map((segment) => Number.parseInt(segment, 10)),
      build: Number.parseInt(buildText, 10),
    };
  };
  const leftValue = parse(left);
  const rightValue = parse(right);
  const length = Math.max(leftValue.version.length, rightValue.version.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftValue.version[index] ?? 0) - (rightValue.version[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftValue.build - rightValue.build;
}

function usesOfficialGpt56(versionKey: string): boolean {
  return compareNumericVersionKeys(
    versionKey,
    runtimePatchOfficialGpt56ThresholdVersionKey,
  ) >= 0;
}
```

Refactor `runtimePatcherSourceForVersion()` so its generated `__codexfastShouldSkipTarget` checks both the exact Plugins-prefix policy and, when `usesOfficialGpt56(versionKey)` is true, `runtimePatchOfficialGpt56TargetIds`.

Add `26.707.41301+5103` to both Plugins build sets and to `SUPPORTED_APP_VERSIONS`:

```ts
"26.707.41301+5103": "ChatGPT.app 26.707.41301 build 5103",
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
pnpm build
pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: PASS, including the older/threshold/later GPT-5.6 filtering cases.

- [ ] **Step 6: Commit**

```bash
git add src/cli-runtime-launch.mts src/supported-app-versions.mts test/suites/runtime-patch-suite.mts test/runtime-launch-flow.mts bin/codexfast
git commit -m "feat: support ChatGPT build 5103"
```

### Task 2: Make main-process module discovery content-driven

**Files:**
- Modify: `test/suites/runtime-patch-suite.mts:1-190`
- Modify: `test/suites/generated-cli-suite.mts:18-22`
- Modify: `src/cli-update-settings.mts:134-173`

- [ ] **Step 1: Write failing hook-discovery regressions**

Add `createMainProcessAutomaticUpdateHookSource` to the existing import and assert the generated hook no longer depends on historical chunk names:

```ts
const automaticUpdateHookSource = createMainProcessAutomaticUpdateHookSource();
assertContains(
  automaticUpdateHookSource,
  "const viteBuildFilePattern = /[\\\\/]\\.vite[\\\\/]build[\\\\/][^\\\\/]+\\.js$/;",
  "expected the main-process hook to inspect any JavaScript module under .vite/build",
);
assertContains(
  automaticUpdateHookSource,
  "const shouldPatchAutomaticUpdates = automaticUpdateSignature.test(source);",
  "expected updater discovery to be based on the real source signature",
);
assertContains(
  automaticUpdateHookSource,
  "const shouldPatchSettingsSchema = settingsSchemaSignature.test(source);",
  "expected Settings schema discovery to be based on the real source signature",
);
assertNotContains(
  automaticUpdateHookSource,
  "workspace-root-drop-handler-",
  "expected updater discovery not to depend on a historical chunk basename",
);
assertNotContains(
  automaticUpdateHookSource,
  "src-[^\\\\/]+",
  "expected Settings schema discovery not to depend on a historical chunk basename",
);
```

Extend the existing real-shape source fixture so its logical filename is `sqlite-BqLffnB9.js`, then retain assertions that:

```ts
assertContains(patchedAutomaticUpdateSource, "codexfastAutomaticUpdateCheck", "expected the build-5103 Sparkle source to gate background checks");
assertContains(patchedAutomaticUpdateSource, "scheduleForcedUpdateInstall(){if((", "expected the build-5103 Sparkle source to gate forced installs");
assertContains(patchedAutomaticUpdateSource, "checkForUpdates:async", "expected manual update checks to remain available");
assertContains(patchedAutomaticUpdateSource, "installUpdatesIfAvailable:async", "expected manual installs to remain available");
```

Add generated CLI assertions for `viteBuildFilePattern` and absence of `workspace-root-drop-handler-`.

- [ ] **Step 2: Run the focused suite and verify RED**

Run:

```bash
pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: FAIL because the generated hook still contains two basename-specific patterns.

- [ ] **Step 3: Implement source-signature discovery**

Replace the two file patterns and loader branch in `createMainProcessAutomaticUpdateHookSource()` with:

```ts
"const viteBuildFilePattern = /[\\/]\\.vite[\\/]build[\\/][^\\/]+\\.js$/;",
"Module._extensions[\".js\"] = function codexfastMainProcessHook(module, filename) {",
"  if (viteBuildFilePattern.test(filename)) {",
"    const source = fs.readFileSync(filename, \"utf8\");",
"    const shouldPatchSettingsSchema = settingsSchemaSignature.test(source);",
"    const shouldPatchAutomaticUpdates = automaticUpdateSignature.test(source);",
"    if (shouldPatchSettingsSchema || shouldPatchAutomaticUpdates) {",
"      let patchedSource = source;",
"      if (shouldPatchSettingsSchema) patchedSource = patchedSource.replace(settingsSchemaSignature, settingsSchemaReplacement);",
"      if (shouldPatchAutomaticUpdates) {",
"        const nextSource = patchedSource.replace(automaticUpdateSignature, automaticUpdateReplacement);",
"        patchedSource = nextSource === patchedSource ? nextSource : nextSource.replace(automaticDownloadGateSignature, automaticDownloadGateReplacement).replace(forcedUpdateScheduleSignature, forcedUpdateScheduleReplacement);",
"      }",
"      module._compile(patchedSource, filename);",
"      return;",
"    }",
"  }",
"  return originalJsLoader(module, filename);",
"};",
```

This keeps untouched `.vite/build` files on Node's original loader path and compiles only modules containing a target signature.

- [ ] **Step 4: Build and verify GREEN**

Run:

```bash
pnpm build
pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: PASS; generated CLI includes content-driven discovery and no historical updater basename.

- [ ] **Step 5: Commit**

```bash
git add src/cli-update-settings.mts test/suites/runtime-patch-suite.mts test/suites/generated-cli-suite.mts bin/codexfast
git commit -m "fix: discover moved automatic update modules"
```

### Task 3: Patch the build-5103 General Settings row

**Files:**
- Modify: `test/suites/runtime-patch-suite.mts:360-430`
- Modify: `src/targets/updates.mts:25-27,140-220`

- [ ] **Step 1: Add the exact failing build-5103 fixture**

Add this source fixture to `runRuntimePatchSuite()`:

```ts
const generalSettings2670741301Body = "function _a(){let e=(0,Q.c)(10),t=F(V),{platform:r}=j(),i=r!==`windows`,a=H(),o=L(n.preventSleepWhileRunning);if(!i)return null;let s;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(R,{...W.preventSleepWhileRunning}),e[0]=s):s=e[0];let c;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,$.jsx)(R,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:f}}),e[1]=c):c=e[1];let l=o??!1,u;e[2]===t?u=e[3]:(u=e=>{I(t,n.preventSleepWhileRunning,e)},e[2]=t,e[3]=u);let d;e[4]===a?d=e[5]:(d=a.formatMessage(W.preventSleepWhileRunning),e[4]=a,e[5]=d);let p;return e[6]!==l||e[7]!==u||e[8]!==d?(p=(0,$.jsx)(U,{label:s,description:c,control:(0,$.jsx)(Bn,{checked:l,onChange:u,ariaLabel:d})}),e[6]=l,e[7]=u,e[8]=d,e[9]=p):p=e[9],p}";
const generalSettings2670741301Result = applyRuntimePatchesToBody(
  "webview/assets/general-settings-BBi3jMJr.js",
  generalSettings2670741301Body,
);
assertContains(generalSettings2670741301Result.content, "n.disableAutomaticUpdates", "expected build 5103 Settings to read the automatic-update setting");
assertContains(generalSettings2670741301Result.content, "I(codexfastSettingsState,n.disableAutomaticUpdates", "expected build 5103 Settings to persist the automatic-update setting");
assertContains(generalSettings2670741301Result.content, "values:{appName:f}", "expected build 5103 Settings to preserve app-name-aware prevent-sleep copy");
assertContains(generalSettings2670741301Result.patchedLabels.join("\n"), "Disable automatic updates setting", "expected build 5103 Settings to report the target");
assertNotContains(generalSettings2670741301Result.content, "let o,s", "expected the replacement not to reintroduce minified local collisions");
new Function(generalSettings2670741301Result.content);

const generalSettings2670741301SecondPass = applyRuntimePatchesToBody(
  "webview/assets/general-settings-BBi3jMJr.js",
  generalSettings2670741301Result.content,
);
if (generalSettings2670741301SecondPass.content !== generalSettings2670741301Result.content) {
  fail("expected the build-5103 Settings patch to be idempotent");
}
```

- [ ] **Step 2: Run the focused suite and verify RED**

Run:

```bash
pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: FAIL because the current 26.707 signature hard-codes the previous platform local layout.

- [ ] **Step 3: Add a narrow build-5103 target**

In `src/targets/updates.mts`, add a signature that captures only stable dependency identifiers while accepting the new platform local names. Use the existing `GENERAL_SETTINGS_REPLACEMENT_26707_APP_NAME` callback with this capture order:

```ts
const GENERAL_SETTINGS_GUARDED_SIGNATURE_26707_PLATFORM_LOCALS =
  /function ([A-Za-z_$][\w$]*)\(\)\{let [A-Za-z_$][\w$]*=\(0,([A-Za-z_$][\w$]*)\.c\)\(10\),[A-Za-z_$][\w$]*=([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\),\{platform:[A-Za-z_$][\w$]*\}=([A-Za-z_$][\w$]*)\(\),[A-Za-z_$][\w$]*=[A-Za-z_$][\w$]*!==`windows`,[A-Za-z_$][\w$]*=([A-Za-z_$][\w$]*)\(\),[A-Za-z_$][\w$]*=([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\.preventSleepWhileRunning\);if\(![A-Za-z_$][\w$]*\)return null;let [A-Za-z_$][\w$]*;[^]*?\(0,([A-Za-z_$][\w$]*)\.jsx\)\(([A-Za-z_$][\w$]*),\{\.\.\.([A-Za-z_$][\w$]*)\.preventSleepWhileRunning\}\)[^]*?values:\{appName:([A-Za-z_$][\w$]*)\}[^]*?([A-Za-z_$][\w$]*)\([A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*\.preventSleepWhileRunning,[A-Za-z_$][\w$]*\)[^]*?\(0,[A-Za-z_$][\w$]*\.jsx\)\(([A-Za-z_$][\w$]*),\{label:[^]*?control:\(0,[A-Za-z_$][\w$]*\.jsx\)\(([A-Za-z_$][\w$]*),\{checked:[^]*?\}\)\}\)[^]*?\}/;
```

Register it after `disable-automatic-updates-setting-26707-app-name`:

```ts
{
  id: "disable-automatic-updates-setting-26707-platform-locals",
  label: "Disable automatic updates setting",
  needle: GENERAL_SETTINGS_NEEDLE,
  guardedSignature: GENERAL_SETTINGS_GUARDED_SIGNATURE_26707_PLATFORM_LOCALS,
  patchedSignature: GENERAL_SETTINGS_PATCHED_SIGNATURE_26623,
  applyReplacement: GENERAL_SETTINGS_REPLACEMENT_26707_APP_NAME,
},
```

The capture order is exactly: function name, cache namespace, Settings-state function, Settings-state argument, platform hook, intl hook, Settings reader, Settings namespace, JSX namespace, message component, message namespace, app-name value, Settings writer, row component, and toggle component. Do not add captures for minified local variables.

- [ ] **Step 4: Build and verify GREEN**

Run:

```bash
pnpm build
pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: PASS, valid generated JavaScript, idempotent second application, and no TDZ-prone locals.

- [ ] **Step 5: Commit**

```bash
git add src/targets/updates.mts test/suites/runtime-patch-suite.mts bin/codexfast
git commit -m "fix: patch build 5103 update setting"
```

### Task 4: Update compatibility and maintenance documentation

**Files:**
- Create: `docs/bundle-notes/2026-07-11-chatgpt-app-26.707.41301-build-5103.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/real-app-validation.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add the bundle note**

Document these verified facts:

```markdown
# ChatGPT.app 26.707.41301 build 5103

- App path: `/Applications/ChatGPT.app`
- Bundle id: `com.openai.codex`
- Version key: `26.707.41301+5103`
- Plugins: official path; runtime plugin targets skipped
- GPT-5.6: official path from this build onward; model-list injection and query-selector widening skipped
- Settings asset: `webview/assets/general-settings-BBi3jMJr.js`
- Sparkle manager: `.vite/build/sqlite-BqLffnB9.js`
- Automatic-update root cause: the process hook selected the previous updater chunk by basename and never inspected the moved Sparkle module
- Validation boundary: extracted-bundle and regression validation completed; record separately whether a fresh real-app launch was possible
```

- [ ] **Step 2: Update long-lived docs and README copy**

State consistently that:

- build 5103 is the newest verified build;
- strict whitelist behavior remains unchanged;
- `26.707.41301+5103` and later supported builds use official GPT-5.6 paths;
- older supported builds keep the compatibility injection;
- automatic-update suppression is signature-discovered across `.vite/build` chunks;
- manual `Check for Updates` and installs remain available.

Keep compatibility lists newest-first.

- [ ] **Step 3: Add the unreleased changelog entry**

Under `## [Unreleased]`, add:

```markdown
### Added

- Added support for `ChatGPT.app` `26.707.41301` (`build 5103`) after direct installed-bundle inspection.

### Changed

- Use the official GPT-5.6 model list and selector on build 5103 and later supported builds instead of injecting GPT-5.6 entries or widening the selector.

### Fixed

- Discover Sparkle updater and desktop-settings schema modules by source signature across `.vite/build/*.js`, so automatic background checks and forced installs remain suppressed after chunk renames while manual updates stay available.
- Added the build-5103 Settings > General automatic-update row target.
```

- [ ] **Step 4: Validate docs and commit**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

Commit:

```bash
git add CHANGELOG.md README.md README.zh-CN.md docs
git commit -m "docs: document ChatGPT build 5103"
```

### Task 5: Regenerate and verify the complete change

**Files:**
- Verify: `bin/codexfast`
- Verify: extracted build at the path stored in `/tmp/codexfast-current-extracted-path`

- [ ] **Step 1: Run required repository validation**

Run:

```bash
pnpm build
pnpm build:check
pnpm typecheck
pnpm test
git diff --check
pnpm pack --dry-run
```

Expected: every command exits `0`; `pnpm test` covers generated CLI behavior and the complete runtime patch suite.

- [ ] **Step 2: Reinspect the extracted build**

Run:

```bash
extracted=$(sed -n '1p' /tmp/codexfast-current-extracted-path)
pnpm inspect:bundle-targets "$extracted"
```

Expected:

- the new build-5103 Settings target reports `guarded` against `general-settings-BBi3jMJr.js` before direct patch application;
- Fast, `/fast`, Speed, request allowance, conversation fallback, updater schema, model-list, and selector signatures remain identifiable;
- runtime version filtering, rather than target deletion, is responsible for skipping GPT-5.6 patches at the threshold.

- [ ] **Step 3: Apply shipped runtime patches read-only to real bundle assets**

Use `applyRuntimePatchesToBody` or the generated runtime patch source against copies/read buffers from:

```text
webview/assets/general-settings-BBi3jMJr.js
webview/assets/app-initial~app-main~page-hSvsQcNf.js
webview/assets/app-initial~app-main~new-thread-panel-page~onboarding-page~projects-index-page~appgen-libra~ggy53w99-CqMu8hJo.js
.vite/build/sqlite-BqLffnB9.js
```

Expected:

- Settings contains the localized update row and valid JavaScript;
- Fast-related renderer targets still patch;
- GPT-5.6 model-list and selector bodies remain byte-for-byte unchanged after build-5103 version filtering;
- the Sparkle source gains dynamic background/forced-install gates;
- manual check/install methods remain present.

- [ ] **Step 4: Confirm the installed app remains untouched**

Run:

```bash
codesign --verify --deep --strict /Applications/ChatGPT.app
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /Applications/ChatGPT.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' /Applications/ChatGPT.app/Contents/Info.plist
```

Expected: signature verification succeeds and metadata remains `26.707.41301` / `5103`.

- [ ] **Step 5: Evaluate fresh-session validation safely**

Run:

```bash
pgrep -fl '^(Codex|ChatGPT)$'
ps ax -o pid=,command= | rg '/Applications/(Codex|ChatGPT)\.app/'
```

If active Codex/ChatGPT work would be interrupted, do not terminate it. Record that real fresh-session launch validation was not performed. If the app is fully quit naturally, run:

```bash
node bin/codexfast launch
```

and complete `docs/real-app-validation.md`, including Settings, manual updates, Fast controls, and unchanged bundle/signature checks.

- [ ] **Step 6: Commit any final generated or verification-driven corrections**

Only if verification changed tracked files:

```bash
git add bin/codexfast src test docs README.md README.zh-CN.md CHANGELOG.md
git commit -m "fix: complete build 5103 compatibility"
```

Otherwise leave the verified implementation commits unchanged and report the exact validation boundary.
