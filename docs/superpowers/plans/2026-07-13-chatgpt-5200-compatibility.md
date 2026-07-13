# ChatGPT.app 26.707.61608 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict, complete support for the locally installed `ChatGPT.app` `26.707.61608+5200`, including its shifted Settings automatic-update row signature.

**Architecture:** Preserve the exact version/build whitelist and existing runtime target filtering. Add one build-specific Settings matcher that reuses the collision-safe `26.707` replacement, while keeping official GPT-5.6 and Plugins paths unpatched. Validate both generated-CLI behavior and direct application against the extracted real bundle.

**Tech Stack:** TypeScript, Node.js, pnpm, shell regression harness, Electron ASAR inspection, runtime JavaScript source rewriting.

---

## File Map

- Modify `test/runtime-launch-flow.mts`: strict support gate and no-legacy-Plugins requirement for build 5200.
- Modify `test/suites/runtime-patch-suite.mts`: exact build-5200 Settings fixture, Plugins filtering, and official GPT-5.6 filtering.
- Modify `src/supported-app-versions.mts`: exact `26.707.61608+5200` whitelist entry.
- Modify `src/cli-runtime-launch.mts`: build-5200 Plugins skip membership; retain the existing official GPT-5.6 threshold.
- Modify `src/targets/updates.mts`: narrow shifted-local Settings matcher using the existing collision-safe replacement.
- Modify `README.md` and `README.zh-CN.md`: newest verified build listing.
- Modify `CHANGELOG.md`: unreleased compatibility entry.
- Modify `docs/feature-scope.md`: include build 5200 in the relevant `26.707` feature paths.
- Modify `docs/compatibility-matrix.md`: verified build row.
- Modify `docs/patch-targets.md`: build-specific assets and Settings matcher.
- Modify `docs/troubleshooting.md` and `docs/real-app-validation.md`: current no-Plugins-required build inventory and updater discovery wording.
- Create `docs/bundle-notes/2026-07-13-chatgpt-app-26.707.61608-build-5200.md`: reusable bundle facts.
- Regenerate `bin/codexfast`: self-contained published CLI generated from `src/*`.

The approved scope explicitly excludes commits, tags, package-version changes, publishing, and releases.

### Task 1: Add failing build-5200 compatibility and filtering coverage

**Files:**
- Modify: `test/runtime-launch-flow.mts:471-480`
- Modify: `test/runtime-launch-flow.mts:721-731`
- Modify: `test/suites/runtime-patch-suite.mts:1362-1481`

- [ ] **Step 1: Add the strict launch-gate fixture**

Insert after the build-5103 fixture in `test/runtime-launch-flow.mts`:

```ts
  const nonRunningLaunch2670761608App = join(tmpDir, "NonRunningLaunch2670761608.app");
  const nonRunningLaunch2670761608Output = join(tmpDir, "non-running-launch-26707-61608-output.txt");
  prepareFakeApp(nonRunningLaunch2670761608App, "26.707.61608", "5200");
  runScriptCommand(nonRunningLaunch2670761608App, ["launch"], nonRunningLaunch2670761608Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2670761608Output), "Compatibility: supported", "expected build 5200 to pass the strict support gate", readOutput(nonRunningLaunch2670761608Output));
  assertContains(readOutput(nonRunningLaunch2670761608Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5200 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2670761608Output));
  assertContains(readOutput(nonRunningLaunch2670761608Output), "Contents/MacOS/ChatGPT", "expected supported build 5200 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2670761608Output));
  assertNoLaunchCalls(nonRunningLaunch2670761608Output);
  assertNoBundleMutationTools(nonRunningLaunch2670761608Output);
```

- [ ] **Step 2: Add the required-initial-target fixture**

Insert after the build-5103 pending-target fixture:

```ts
  const launchPendingTargets2670761608App = join(tmpDir, "LaunchPendingTargets2670761608.app");
  const launchPendingTargets2670761608Output = join(tmpDir, "launch-pending-targets-26707-61608-output.txt");
  prepareFakeApp(launchPendingTargets2670761608App, "26.707.61608", "5200");
  runScriptCommand(launchPendingTargets2670761608App, ["launch"], launchPendingTargets2670761608Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2670761608Output), "Runtime patch interception did not observe required targets: none.", "expected build 5200 not to require the legacy Plugins access target", readOutput(launchPendingTargets2670761608Output));
  assertNotContains(readOutput(launchPendingTargets2670761608Output), "Plugins access", "expected build 5200 missing-target output not to name Plugins access", readOutput(launchPendingTargets2670761608Output));
  assertNoLaunchCalls(launchPendingTargets2670761608Output);
  assertNoBundleMutationTools(launchPendingTargets2670761608Output);
```

- [ ] **Step 3: Add an exact build-5200 Plugins filtering assertion**

Refactor the existing build-5059 synthetic Plugins source into a reusable raw source string and apply it to both builds:

```ts
  const officialPluginsPatcherSource = `
const TARGET_SPECS = [
  {id: "plugins-catalog-visibility-26601", label: "Plugins catalog visibility", needle: "plugin-needle", guardedSignature: /PLUGIN_DISABLED/, patchedSignature: /PLUGIN_ENABLED/, legacyPatchedSignature: null, applyReplacement: "PLUGIN_ENABLED"},
  {id: "speed-setting", label: "Speed setting", needle: "speed-needle", guardedSignature: /SPEED_DISABLED/, patchedSignature: /SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;
  if (!guarded && !patched && !legacyPatched) return null;
  return {spec, guarded, patched, legacyPatched};
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
  const applyOfficialPluginsPatcherForVersion = (versionKey: string) =>
    new Function(`${runtimePatcherSourceForVersion(officialPluginsPatcherSource, versionKey)}\nreturn applyRuntimePatchesToBody;`)() as (
      resourcePath: string,
      body: string,
    ) => { content: string; patchedLabels: string[] };
  for (const [versionKey, buildLabel] of [
    ["26.707.31428+5059", "5059"],
    ["26.707.61608+5200", "5200"],
  ] as const) {
    const result = applyOfficialPluginsPatcherForVersion(versionKey)(
      "app://-/assets/demo.js",
      "plugin-needle PLUGIN_DISABLED speed-needle SPEED_DISABLED",
    );
    assertContains(result.content, "PLUGIN_DISABLED", `expected build ${buildLabel} to use official Plugins paths`);
    assertContains(result.content, "SPEED_ENABLED", `expected build ${buildLabel} to retain non-Plugins runtime patches`);
  }
```

Replace the current one-off `versionFilteredPatcherSource5059` block with this code so the existing 5059 assertion remains covered.

- [ ] **Step 4: Add build 5200 to the official GPT-5.6 threshold assertions**

Add between the threshold and later-version checks:

```ts
  const officialGpt56Build5200Result = applyOfficialGpt56PatcherForVersion("26.707.61608+5200")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5200Result.content, "GPT56_LIST_DISABLED", "expected build 5200 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5200Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5200 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5200Result.content, "SPEED_ENABLED", "expected build 5200 to retain non-GPT runtime patches");
```

- [ ] **Step 5: Run the regression entrypoint and verify RED**

Run:

```bash
bash test/re-sign-flow.sh
```

Expected: non-zero. The build-5200 launch fixture reports `Compatibility: unsupported`, and the build-5200 Plugins assertion shows `PLUGIN_ENABLED` until the exact skip key is added. Do not change production code until these failures are observed.

### Task 2: Add the exact compatibility and runtime skip gates

**Files:**
- Modify: `src/supported-app-versions.mts:46`
- Modify: `src/cli-runtime-launch.mts:85-130`

- [ ] **Step 1: Add the strict whitelist entry**

Append after build 5103:

```ts
  "26.707.61608+5200": "ChatGPT.app 26.707.61608 build 5200",
```

- [ ] **Step 2: Add build 5200 to both Plugins sets**

Append this key to `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys`:

```ts
  "26.707.61608+5200",
```

Do not change:

```ts
const runtimePatchOfficialGpt56ThresholdVersionKey = "26.707.41301+5103";
```

The threshold is intentionally older than the new strict whitelist entry.

- [ ] **Step 3: Rebuild the generated CLI**

Run:

```bash
corepack pnpm build
```

Expected: exit 0 and `bin/codexfast` regenerated from the modified source.

- [ ] **Step 4: Re-run the compatibility/filtering test**

Run:

```bash
bash test/re-sign-flow.sh
```

Expected: the build-5200 compatibility and Plugins/GPT filtering assertions pass. The suite may still fail only after the next task adds the deliberately failing Settings fixture.

### Task 3: Add the exact failing build-5200 Settings regression

**Files:**
- Modify: `test/suites/runtime-patch-suite.mts:452-491`

- [ ] **Step 1: Add the extracted Settings fixture**

Insert after the build-5103 Settings test:

```ts
  const generalSettings2670761608Body =
    "function _a(){let e=(0,Q.c)(10),t=p(c),{platform:n}=ot(),r=n!==`windows`,i=B(),a=R(j.preventSleepWhileRunning);if(!r)return null;let o;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(H,{...W.preventSleepWhileRunning}),e[0]=o):o=e[0];let s;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(H,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:bn}}),e[1]=s):s=e[1];let l=a??!1,u;e[2]===t?u=e[3]:(u=e=>{V(t,j.preventSleepWhileRunning,e)},e[2]=t,e[3]=u);let d;e[4]===i?d=e[5]:(d=i.formatMessage(W.preventSleepWhileRunning),e[4]=i,e[5]=d);let f;return e[6]!==l||e[7]!==u||e[8]!==d?(f=(0,$.jsx)(L,{label:o,description:s,control:(0,$.jsx)(G,{checked:l,onChange:u,ariaLabel:d})}),e[6]=l,e[7]=u,e[8]=d,e[9]=f):f=e[9],f}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings2670761608Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-CD58xyBw.js",
    generalSettings2670761608Body,
  );
  assertContains(
    generalSettings2670761608Result.content,
    "j.disableAutomaticUpdates",
    "expected build 5200 Settings to read the automatic-update setting",
  );
  assertContains(
    generalSettings2670761608Result.content,
    "V(codexfastSettingsState,j.disableAutomaticUpdates,codexfastNextValue)",
    "expected build 5200 Settings to persist the automatic-update setting",
  );
  assertContains(
    generalSettings2670761608Result.content,
    "values:{appName:bn}",
    "expected build 5200 Settings to preserve app-name-aware prevent-sleep copy",
  );
  assertContains(
    generalSettings2670761608Result.content,
    "codexfastCache=(0,Q.c)(17)",
    "expected build 5200 Settings replacement to use collision-safe prefixed locals",
  );
  assertContains(
    generalSettings2670761608Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected build 5200 Settings to report its target",
  );
  assertNotContains(
    generalSettings2670761608Result.content,
    "let l=a??!1,u;",
    "expected build 5200 Settings patch to replace the shifted original row locals",
  );
  new Function(generalSettings2670761608Result.content);
  const generalSettings2670761608SecondPass = applyRuntimePatchesToBody(
    "webview/assets/general-settings-CD58xyBw.js",
    generalSettings2670761608Result.content,
  );
  if (generalSettings2670761608SecondPass.content !== generalSettings2670761608Result.content) {
    fail("expected the build-5200 Settings patch to be idempotent");
  }
```

- [ ] **Step 2: Run the targeted generated runtime flow and verify RED**

Run:

```bash
corepack pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: non-zero with `expected build 5200 Settings to read the automatic-update setting`. This proves the new fixture exercises the currently missing signature.

### Task 4: Add the narrow shifted-local Settings target

**Files:**
- Modify: `src/targets/updates.mts:25-28`
- Modify: `src/targets/updates.mts:131-145`

- [ ] **Step 1: Add the guarded signature**

Add after `GENERAL_SETTINGS_GUARDED_SIGNATURE_26707_PLATFORM_LOCALS`:

```ts
const GENERAL_SETTINGS_GUARDED_SIGNATURE_26707_SHIFTED_LOCALS =
  /function ([A-Za-z_$][\w$]*)\(\)\{let e=\(0,([A-Za-z_$][\w$]*)\.c\)\(10\),t=([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\),\{platform:n\}=([A-Za-z_$][\w$]*)\(\),r=n!==`windows`,i=([A-Za-z_$][\w$]*)\(\),a=([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\.preventSleepWhileRunning\);if\(!r\)return null;let o;e\[0\]===Symbol\.for\(`react\.memo_cache_sentinel`\)\?\(o=\(0,([A-Za-z_$][\w$]*)\.jsx\)\(([A-Za-z_$][\w$]*),\{\.\.\.([A-Za-z_$][\w$]*)\.preventSleepWhileRunning\}\),e\[0\]=o\):o=e\[0\];let s;e\[1\]===Symbol\.for\(`react\.memo_cache_sentinel`\)\?\(s=\(0,[A-Za-z_$][\w$]*\.jsx\)\([A-Za-z_$][\w$]*,\{id:`settings\.general\.power\.preventSleepWhileRunning\.description`,defaultMessage:`Keep your computer awake while \{appName\} is running a task`,description:`Description for preventing sleep while a task runs`,values:\{appName:([A-Za-z_$][\w$]*)\}\}\),e\[1\]=s\):s=e\[1\];let l=a\?\?!1,u;e\[2\]===t\?u=e\[3\]:\(u=e=>\{([A-Za-z_$][\w$]*)\(t,[A-Za-z_$][\w$]*\.preventSleepWhileRunning,e\)\},e\[2\]=t,e\[3\]=u\);let d;e\[4\]===i\?d=e\[5\]:\(d=i\.formatMessage\([A-Za-z_$][\w$]*\.preventSleepWhileRunning\),e\[4\]=i,e\[5\]=d\);let f;return e\[6\]!==l\|\|e\[7\]!==u\|\|e\[8\]!==d\?\(f=\(0,[A-Za-z_$][\w$]*\.jsx\)\(([A-Za-z_$][\w$]*),\{label:o,description:s,control:\(0,[A-Za-z_$][\w$]*\.jsx\)\(([A-Za-z_$][\w$]*),\{checked:l,onChange:u,ariaLabel:d\}\)\}\),e\[6\]=l,e\[7\]=u,e\[8\]=d,e\[9\]=f\):f=e\[9\],f\}/;
```

Capture order intentionally matches `GENERAL_SETTINGS_REPLACEMENT_26707_APP_NAME`: function name, cache namespace, settings-state function/argument, platform hook, intl hook, settings read/namespace, JSX namespace, message component/messages namespace, app name, settings writer, row component, and toggle component.

- [ ] **Step 2: Register the target**

Append inside `UPDATE_TARGET_SPECS`:

```ts
  {
    id: "disable-automatic-updates-setting-26707-shifted-locals",
    label: "Disable automatic updates setting",
    needle: GENERAL_SETTINGS_NEEDLE,
    guardedSignature: GENERAL_SETTINGS_GUARDED_SIGNATURE_26707_SHIFTED_LOCALS,
    patchedSignature: GENERAL_SETTINGS_PATCHED_SIGNATURE_26623,
    applyReplacement: GENERAL_SETTINGS_REPLACEMENT_26707_APP_NAME,
  },
```

- [ ] **Step 3: Run the targeted test and verify GREEN**

Run:

```bash
corepack pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: exit 0 and `runtime launch flow test passed`.

- [ ] **Step 4: Inspect the real extracted target state**

Run:

```bash
corepack pnpm inspect:bundle-targets /tmp/codexfast-5200.L3wRku/app
```

Expected: `disable-automatic-updates-setting-26707-shifted-locals` reports `guarded` against `webview/assets/general-settings-CD58xyBw.js`.

### Task 5: Update compatibility documentation

**Files:**
- Modify: `README.md:19`
- Modify: `README.zh-CN.md:19`
- Modify: `CHANGELOG.md:7`
- Modify: `docs/feature-scope.md:23-63`
- Modify: `docs/compatibility-matrix.md:62`
- Modify: `docs/patch-targets.md:27-93`
- Modify: `docs/troubleshooting.md:12,49-53`
- Modify: `docs/real-app-validation.md:13,63`
- Create: `docs/bundle-notes/2026-07-13-chatgpt-app-26.707.61608-build-5200.md`

- [ ] **Step 1: Add the newest build to both READMEs**

Prepend these exact fragments to the verified-build sentences:

```md
`26.707.61608` (`build 5200`),
```

```md
`26.707.61608`（`build 5200`）、
```

Keep the compatibility list newest-first. The existing GPT-5.6 threshold paragraph remains unchanged because build 5200 is simply a later separately whitelisted build.

- [ ] **Step 2: Add the unreleased changelog entries**

Under `## [Unreleased]`, add:

```md
### Added

- Added support for `ChatGPT.app` `26.707.61608` (`build 5200`) after direct installed-bundle inspection.

### Fixed

- Added the build-5200 Settings > General automatic-update row target for the shifted minified-local layout.
```

- [ ] **Step 3: Extend feature scope lists**

Add `26.707.61608` after `26.707.41301` in the global Settings-tier, Intelligence Speed, and official Plugins build lists. Keep the official GPT-5.6 paragraph threshold-based and unchanged.

- [ ] **Step 4: Add the compatibility matrix row**

Append:

```md
| `26.707.61608` | `5200` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, official GPT-5.6, official Plugins support | `2026-07-13` | Verified by direct installed-bundle inspection and regression coverage against `/Applications/ChatGPT.app` with bundle id `com.openai.codex`. Existing `26.707` Fast allowance, request-tier, configured-tier fallback, `/fast`, and Intelligence Speed targets remain guarded. GPT-5.6 and Plugins use official app paths. The Settings row moved to `general-settings-CD58xyBw.js` and requires the shifted-locals target; Sparkle is in `.vite/build/sqlite-WcOhlxIC.js` and remains discoverable by source signature. |
```

- [ ] **Step 5: Update patch-target mapping**

Add `26.707.61608` to the relevant Fast, request-tier, fallback, Intelligence Speed, and official-path lists. Append this build-specific note:

```md
- On `26.707.61608` build `5200`, GPT-5.6 and Plugins continue to use official app paths. Settings-side Fast is in `general-settings-CD58xyBw.js`; the shared allowance and configured-tier fallback remain in `app-initial~app-main~onboarding-page-D9sPBwim.js`; the request-tier helper remains in `app-initial~app-main~pull-request-code-review~onboarding-page~hotkey-window-thread-page~cha~b76hmflu-CeoeefuW.js`; `/fast` and the Intelligence Speed gate are in `app-initial~app-main~page-CMpPiY3-.js`. The automatic-update row uses `disable-automatic-updates-setting-26707-shifted-locals`, and the active Sparkle module is `.vite/build/sqlite-WcOhlxIC.js`, still patched through source-signature discovery while manual update actions remain available.
```

- [ ] **Step 6: Update troubleshooting and real-app validation**

Add `26.707.31428`, `26.707.41301`, and `26.707.61608` to the no-legacy-Plugins-required sentence in `docs/troubleshooting.md` so it matches `docs/real-app-validation.md` and source sets. Replace the updater troubleshooting instruction that names only `workspace-root-drop-handler-*.js` with:

```md
2. Inspect the real extracted `.vite/build/*.js` modules by source signature for every automatic path that calls the raw background check function or schedules an already-downloaded update for forced installation. Current builds can move the active Sparkle manager between chunks such as `workspace-root-drop-handler-*.js` and `sqlite-*.js`.
```

Add `26.707.61608` to the corresponding no-legacy-Plugins-required sentence in `docs/real-app-validation.md`. Keep the existing threshold-based GPT-5.6 validation sentence.

- [ ] **Step 7: Create the bundle note**

Create `docs/bundle-notes/2026-07-13-chatgpt-app-26.707.61608-build-5200.md` with:

```md
# ChatGPT.app 26.707.61608 build 5200

## Bundle identity

- Installed app: `/Applications/ChatGPT.app`
- Bundle id: `com.openai.codex`
- `CFBundleShortVersionString`: `26.707.61608`
- `CFBundleVersion`: `5200`
- Strict compatibility key: `26.707.61608+5200`

## Compatibility conclusions

- Settings Fast, the shared service-tier allowance, the request-tier helper, the configured-tier conversation fallback, `/fast`, and the Intelligence Speed menu retain guarded runtime targets.
- Plugins remains supported by the official app path, so runtime launch skips every Plugins target and does not require the legacy `Plugins access` initial label.
- GPT-5.6 remains supported by the official app path because this build is newer than the `26.707.41301+5103` threshold. Runtime launch skips the GPT-5.6 model-list and query-selector compatibility targets only after the exact build passes the strict whitelist.
- The General Settings row moved to `webview/assets/general-settings-CD58xyBw.js`. Its Prevent Sleep function uses a shifted minified-local layout handled by `disable-automatic-updates-setting-26707-shifted-locals`.
- The active Sparkle manager is `.vite/build/sqlite-WcOhlxIC.js`. The existing source-signature hook still recognizes its background interval, automatic-download callback, and forced-install scheduler while leaving manual update actions available.

## Validation boundary

- The installed `app.asar` was extracted to a temporary directory for read-only inspection.
- Regression coverage includes the exact whitelist, official Plugins/GPT-5.6 filtering, build-5200 Settings syntax and idempotency, generated CLI behavior, and source-signature updater/schema patching.
- Real-launch validation is recorded separately and must leave `app.asar`, `Info.plist`, and the application signature unchanged.
```

- [ ] **Step 8: Check documentation consistency**

Run:

```bash
rg -n "26\.707\.61608|5200|shifted-locals|sqlite-WcOhlxIC" README.md README.zh-CN.md CHANGELOG.md docs src test
git diff --check
```

Expected: all new-build references agree on `26.707.61608+5200`; `git diff --check` exits 0.

### Task 6: Regenerate and verify the real build

**Files:**
- Regenerate: `bin/codexfast`
- Verify: all files changed by Tasks 1-5

- [ ] **Step 1: Regenerate the shipped CLI**

Run:

```bash
corepack pnpm build
```

Expected: exit 0; generated `bin/codexfast` includes `26.707.61608+5200` and the shifted-local Settings target.

- [ ] **Step 2: Run direct real-bundle renderer proof**

Run:

```bash
corepack pnpm exec tsx -e 'import { readFileSync } from "node:fs"; import ts from "typescript"; import { applyRuntimePatchesToBody } from "./src/patch-engine.mts"; const path="/tmp/codexfast-5200.L3wRku/app/webview/assets/general-settings-CD58xyBw.js"; const body=readFileSync(path,"utf8"); const first=applyRuntimePatchesToBody("app://-/assets/general-settings-CD58xyBw.js",body); if(!first.patchedLabels.includes("Disable automatic updates setting")) throw new Error("missing build-5200 Settings patch"); const parsed=ts.createSourceFile("general-settings-CD58xyBw.js",first.content,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS); if(parsed.parseDiagnostics.length>0) throw new Error(ts.flattenDiagnosticMessageText(parsed.parseDiagnostics[0].messageText,"\n")); const second=applyRuntimePatchesToBody("app://-/assets/general-settings-CD58xyBw.js",first.content); if(second.content!==first.content) throw new Error("build-5200 Settings patch is not idempotent"); console.log("REAL_BUNDLE_5200_SETTINGS_OK");'
```

Expected: `REAL_BUNDLE_5200_SETTINGS_OK`.

- [ ] **Step 3: Run direct main-process updater/schema proof**

Run:

```bash
corepack pnpm exec tsx -e 'import { readFileSync } from "node:fs"; import { patchMainProcessAutomaticUpdateSource, patchMainProcessSettingsSchemaSource } from "./src/cli-update-settings.mts"; const updater=readFileSync("/tmp/codexfast-5200.L3wRku/app/.vite/build/sqlite-WcOhlxIC.js","utf8"); const patchedUpdater=patchMainProcessAutomaticUpdateSource(updater); if(patchedUpdater===updater||!patchedUpdater.includes("codexfastAutomaticUpdateCheck")||!patchedUpdater.includes("async checkForUpdates()")||!patchedUpdater.includes("async installUpdatesIfAvailable()")) throw new Error("build-5200 updater proof failed"); const schema=readFileSync("/tmp/codexfast-5200.L3wRku/app/.vite/build/child-process-snapshot-worker.js","utf8"); const patchedSchema=patchMainProcessSettingsSchemaSource(schema); if(patchedSchema===schema||!patchedSchema.includes("disableAutomaticUpdates")) throw new Error("build-5200 schema proof failed"); console.log("REAL_BUNDLE_5200_UPDATE_HOOK_OK");'
```

Expected: `REAL_BUNDLE_5200_UPDATE_HOOK_OK`.

- [ ] **Step 4: Run the full repository verification gate**

Run each command fresh:

```bash
corepack pnpm build:check
corepack pnpm typecheck
corepack pnpm check:version-drift
corepack pnpm test
git diff --check
```

Expected: every command exits 0. `check:version-drift` reports the new supported-build total, and the test output ends with `runtime launch flow test passed`.

- [ ] **Step 5: Verify the installed bundle is still immutable and valid**

Run:

```bash
stat -f '%N %z %m' /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
```

Expected: `app.asar` remains `195163520` bytes and `Info.plist` remains `19030` bytes unless the user updated the application again during implementation; any metadata change requires re-reading the version/build and restarting adaptation. `codesign` reports `valid on disk` and `satisfies its Designated Requirement`.

- [ ] **Step 6: Run a real launch only when no app session is active**

Check exact main processes:

```bash
pgrep -x Codex || true
pgrep -x ChatGPT || true
```

If both produce no PID, run:

```bash
node bin/codexfast launch
```

Expected startup evidence:

```text
Detected version: 26.707.61608
Detected build: 5200
Compatibility: supported
```

The runtime output must not report `Plugins access`, `GPT-5.x model list`, or `GPT-5.6 model query selector`. Close the launched validation session cleanly after collecting evidence, then repeat the `stat` and `codesign` commands. If an exact app process is already active, skip this step and report the real-launch limitation instead of interrupting it.

- [ ] **Step 7: Review the final scoped diff**

Run:

```bash
git status --short
git diff --stat
git diff -- src/supported-app-versions.mts src/cli-runtime-launch.mts src/targets/updates.mts test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts README.md README.zh-CN.md CHANGELOG.md docs bin/codexfast
```

Expected: only the approved compatibility source, tests, generated CLI, design/plan documents, and reusable docs are changed. No commit, tag, publish, or release action is performed.
