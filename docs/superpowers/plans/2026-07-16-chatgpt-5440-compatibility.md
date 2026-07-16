# ChatGPT.app 26.707.91948 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict, complete local support for `/Applications/ChatGPT.app` `26.707.91948+5440` without modifying the installed application or publishing a release.

**Architecture:** Extend the exact version/build gate and official-Plugins skip sets, then add one dedicated renderer Settings target for the observed build-5440 row-local shape. Reuse every existing Fast, GPT-5.6 threshold, automatic-update replacement, and main-process source-signature hook.

**Tech Stack:** TypeScript, generated single-file Node.js CLI, runtime JavaScript regex patching, shell regression harness, pnpm.

---

## File Map

- Modify `test/runtime-launch-flow.mts`: exact build-5440 launch gate and required-initial-label coverage.
- Modify `test/suites/runtime-patch-suite.mts`: exact Settings characterization plus official Plugins/GPT-5.6 filtering coverage.
- Modify `src/supported-app-versions.mts`: strict compatibility key.
- Modify `src/cli-runtime-launch.mts`: exact official-Plugins skip sets.
- Modify `src/targets/updates.mts`: dedicated build-5440 Settings signature.
- Regenerate `bin/codexfast`: published single-file launcher generated from `src/`.
- Modify compatibility documentation and create the build-5440 bundle note.
- Keep `package.json` at `0.53.0`; do not commit or publish.

### Task 1: Add failing build-5440 launch coverage

**Files:**
- Modify: `test/runtime-launch-flow.mts`

- [ ] **Step 1: Add the unsupported-to-supported launch fixture**

Insert after the build-5307 non-running launch fixture:

```ts
const nonRunningLaunch2670791948App = join(tmpDir, "NonRunningLaunch2670791948.app");
const nonRunningLaunch2670791948Output = join(tmpDir, "non-running-launch-26707-91948-output.txt");
prepareFakeApp(nonRunningLaunch2670791948App, "26.707.91948", "5440");
runScriptCommand(nonRunningLaunch2670791948App, ["launch"], nonRunningLaunch2670791948Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
assertContains(readOutput(nonRunningLaunch2670791948Output), "Compatibility: supported", "expected build 5440 to pass the strict support gate", readOutput(nonRunningLaunch2670791948Output));
assertContains(readOutput(nonRunningLaunch2670791948Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5440 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2670791948Output));
assertContains(readOutput(nonRunningLaunch2670791948Output), "Contents/MacOS/ChatGPT", "expected supported build 5440 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2670791948Output));
assertNoLaunchCalls(nonRunningLaunch2670791948Output);
assertNoBundleMutationTools(nonRunningLaunch2670791948Output);
```

- [ ] **Step 2: Add no-legacy-Plugins-required coverage**

Insert after the build-5307 pending-target fixture:

```ts
const launchPendingTargets2670791948App = join(tmpDir, "LaunchPendingTargets2670791948.app");
const launchPendingTargets2670791948Output = join(tmpDir, "launch-pending-targets-26707-91948-output.txt");
prepareFakeApp(launchPendingTargets2670791948App, "26.707.91948", "5440");
runScriptCommand(launchPendingTargets2670791948App, ["launch"], launchPendingTargets2670791948Output, {
  CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
  CODEXFAST_TEST_ALLOW_NONZERO: "1",
});
assertContains(readOutput(launchPendingTargets2670791948Output), "Runtime patch interception did not observe required targets: none.", "expected build 5440 not to require the legacy Plugins access target", readOutput(launchPendingTargets2670791948Output));
assertNotContains(readOutput(launchPendingTargets2670791948Output), "Plugins access", "expected build 5440 missing-target output not to name Plugins access", readOutput(launchPendingTargets2670791948Output));
assertNoLaunchCalls(launchPendingTargets2670791948Output);
assertNoBundleMutationTools(launchPendingTargets2670791948Output);
```

- [ ] **Step 3: Build the current generated CLI and prove the new fixtures fail**

Run:

```bash
corepack pnpm build
bash test/re-sign-flow.sh
```

Expected: FAIL because `26.707.91948+5440` is absent from the strict whitelist and Plugins-required skip set.

### Task 2: Add failing renderer patch coverage

**Files:**
- Modify: `test/suites/runtime-patch-suite.mts`

- [ ] **Step 1: Add the exact build-5440 Settings fixture**

Insert after the build-5307 Settings test:

```ts
const generalSettings2670791948Body =
  "function xa(){let e=(0,Q.c)(10),t=d(h),{platform:n}=Wt(),r=n!==`windows`,i=g(),a=V(R.preventSleepWhileRunning);if(!r)return null;let o;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(C,{...W.preventSleepWhileRunning}),e[0]=o):o=e[0];let s;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(C,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:jt}}),e[1]=s):s=e[1];let c=a??!1,l;e[2]===t?l=e[3]:(l=e=>{z(t,R.preventSleepWhileRunning,e)},e[2]=t,e[3]=l);let u;e[4]===i?u=e[5]:(u=i.formatMessage(W.preventSleepWhileRunning),e[4]=i,e[5]=u);let f;return e[6]!==c||e[7]!==l||e[8]!==u?(f=(0,$.jsx)(H,{label:o,description:s,control:(0,$.jsx)(Vn,{checked:c,onChange:l,ariaLabel:u})}),e[6]=c,e[7]=l,e[8]=u,e[9]=f):f=e[9],f}settings.general.power.preventSleepWhileRunning.description";
const generalSettings2670791948Result = applyRuntimePatchesToBody(
  "webview/assets/general-settings-DMO9G9gL.js",
  generalSettings2670791948Body,
);
assertContains(generalSettings2670791948Result.content, "R.disableAutomaticUpdates", "expected build 5440 Settings to read the automatic-update setting");
assertContains(generalSettings2670791948Result.content, "z(codexfastSettingsState,R.disableAutomaticUpdates,codexfastNextValue)", "expected build 5440 Settings to persist the automatic-update setting");
assertContains(generalSettings2670791948Result.content, "values:{appName:jt}", "expected build 5440 Settings to preserve app-name-aware prevent-sleep copy");
assertContains(generalSettings2670791948Result.content, "codexfastCache=(0,Q.c)(17)", "expected build 5440 Settings replacement to use collision-safe prefixed locals");
assertContains(generalSettings2670791948Result.patchedLabels.join("\n"), "Disable automatic updates setting", "expected build 5440 Settings to report its target");
assertNotContains(generalSettings2670791948Result.content, "let f;return", "expected build 5440 Settings patch to replace the original row local");
new Function(generalSettings2670791948Result.content);
const generalSettings2670791948SecondPass = applyRuntimePatchesToBody(
  "webview/assets/general-settings-DMO9G9gL.js",
  generalSettings2670791948Result.content,
);
if (generalSettings2670791948SecondPass.content !== generalSettings2670791948Result.content) {
  fail("expected the build-5440 Settings patch to be idempotent");
}
```

- [ ] **Step 2: Add build 5440 to official Plugins characterization**

Extend the existing table:

```ts
["26.707.91948+5440", "5440"],
```

Expected result remains `PLUGIN_DISABLED` with `SPEED_ENABLED`.

- [ ] **Step 3: Add official GPT-5.6 threshold coverage**

```ts
const officialGpt56Build5440Result = applyOfficialGpt56PatcherForVersion("26.707.91948+5440")(
  "app://-/assets/demo.js",
  officialGpt56Body,
);
assertContains(officialGpt56Build5440Result.content, "GPT56_LIST_DISABLED", "expected build 5440 to use the official GPT-5.6 model list");
assertContains(officialGpt56Build5440Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5440 to use the official GPT-5.6 selector");
assertContains(officialGpt56Build5440Result.content, "SPEED_ENABLED", "expected build 5440 to retain non-GPT runtime patches");
```

- [ ] **Step 4: Run the runtime suite and prove the Settings and Plugins cases fail**

Run:

```bash
corepack pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: FAIL because the current Settings target hardcodes the final row local as `d`, and build `5440` is not in the official-Plugins skip set.

### Task 3: Implement the minimal exact-build adaptation

**Files:**
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Modify: `src/targets/updates.mts`

- [ ] **Step 1: Add the strict compatibility key**

Append to `SUPPORTED_APP_VERSIONS`:

```ts
"26.707.91948+5440": "ChatGPT.app 26.707.91948 build 5440",
```

- [ ] **Step 2: Add exact official-Plugins filtering**

Append `"26.707.91948+5440"` to both:

```ts
runtimePatchNoPluginsAccessRequiredVersionKeys
runtimePatchNoPluginTargetsVersionKeys
```

Do not change `runtimePatchOfficialGpt56ThresholdVersionKey`.

- [ ] **Step 3: Add the dedicated Settings signature**

Add `GENERAL_SETTINGS_GUARDED_SIGNATURE_26707_ROW_LOCAL_F` beside the other
26.707 signatures. It is the existing app-name signature with the final row
local fixed to the observed `f` shape:

```ts
const GENERAL_SETTINGS_GUARDED_SIGNATURE_26707_ROW_LOCAL_F =
  /function ([A-Za-z_$][\w$]*)\(\)\{let e=\(0,([A-Za-z_$][\w$]*)\.c\)\(10\),t=([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\),\{platform:n\}=([A-Za-z_$][\w$]*)\(\),r=n!==`windows`,i=([A-Za-z_$][\w$]*)\(\),a=([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\.preventSleepWhileRunning\);if\(!r\)return null;let o;e\[0\]===Symbol\.for\(`react\.memo_cache_sentinel`\)\?\(o=\(0,([A-Za-z_$][\w$]*)\.jsx\)\(([A-Za-z_$][\w$]*),\{\.\.\.([A-Za-z_$][\w$]*)\.preventSleepWhileRunning\}\),e\[0\]=o\):o=e\[0\];let s;e\[1\]===Symbol\.for\(`react\.memo_cache_sentinel`\)\?\(s=\(0,[A-Za-z_$][\w$]*\.jsx\)\([A-Za-z_$][\w$]*,\{id:`settings\.general\.power\.preventSleepWhileRunning\.description`,defaultMessage:`Keep your computer awake while \{appName\} is running a task`,description:`Description for preventing sleep while a task runs`,values:\{appName:([A-Za-z_$][\w$]*)\}\}\),e\[1\]=s\):s=e\[1\];let c=a\?\?!1,l;e\[2\]===t\?l=e\[3\]:\(l=e=>\{([A-Za-z_$][\w$]*)\(t,[A-Za-z_$][\w$]*\.preventSleepWhileRunning,e\)\},e\[2\]=t,e\[3\]=l\);let u;e\[4\]===i\?u=e\[5\]:\(u=i\.formatMessage\([A-Za-z_$][\w$]*\.preventSleepWhileRunning\),e\[4\]=i,e\[5\]=u\);let f;return e\[6\]!==c\|\|e\[7\]!==l\|\|e\[8\]!==u\?\(f=\(0,[A-Za-z_$][\w$]*\.jsx\)\(([A-Za-z_$][\w$]*),\{label:o,description:s,control:\(0,[A-Za-z_$][\w$]*\.jsx\)\(([A-Za-z_$][\w$]*),\{checked:c,onChange:l,ariaLabel:u\}\)\}\),e\[6\]=c,e\[7\]=l,e\[8\]=u,e\[9\]=f\):f=e\[9\],f\}/;
```

- [ ] **Step 4: Register the dedicated target**

Add to `UPDATE_TARGET_SPECS`:

```ts
{
  id: "disable-automatic-updates-setting-26707-row-local-f",
  label: "Disable automatic updates setting",
  needle: GENERAL_SETTINGS_NEEDLE,
  guardedSignature: GENERAL_SETTINGS_GUARDED_SIGNATURE_26707_ROW_LOCAL_F,
  patchedSignature: GENERAL_SETTINGS_PATCHED_SIGNATURE_26623,
  applyReplacement: GENERAL_SETTINGS_REPLACEMENT_26707_APP_NAME,
},
```

- [ ] **Step 5: Regenerate and run the focused regression**

Run:

```bash
corepack pnpm build
corepack pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: PASS.

### Task 4: Update compatibility documentation

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/troubleshooting.md`
- Modify: `docs/real-app-validation.md`
- Create: `docs/bundle-notes/2026-07-16-chatgpt-app-26.707.91948-build-5440.md`

- [ ] **Step 1: Add build `5440` newest-first to both README compatibility lists**

Use the exact pair:

```text
26.707.91948 (build 5440)
```

- [ ] **Step 2: Add an Unreleased changelog entry**

```markdown
- Added local compatibility for `ChatGPT.app` `26.707.91948` (`build 5440`) after direct installed-bundle inspection, including the shifted automatic-update Settings row while retaining official GPT-5.6 and Plugins paths.
```

- [ ] **Step 3: Extend feature and validation build lists**

Add `26.707.91948` after `26.707.72221` in these exact places:

- `docs/feature-scope.md`: global Settings-tier authority, Intelligence Speed,
  and official Plugins paragraphs.
- `docs/troubleshooting.md`: no-legacy-Plugins-required startup list and
  official-Plugins build list.
- `docs/real-app-validation.md`: no-legacy-Plugins-required startup list.

- [ ] **Step 4: Add the compatibility matrix row**

```markdown
| `26.707.91948` | `5440` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, official GPT-5.6, official Plugins support | `2026-07-16` | Verified by direct installed-bundle inspection and regression coverage against `/Applications/ChatGPT.app` with bundle id `com.openai.codex`. The Fast chain remains compatible; the automatic-update Settings row uses the new row-local-`f` target in `general-settings-DMO9G9gL.js`; Sparkle remains source-signature compatible in `.vite/build/sqlite-B1YNeAip.js`. |
```

- [ ] **Step 5: Add patch-target and bundle-note conclusions**

Create the bundle note with this complete content outline:

```markdown
# ChatGPT.app 26.707.91948 build 5440

- strict key `26.707.91948+5440`
- Fast files `general-settings-DMO9G9gL.js`, the `Bv7yLYDT` allowance/fallback chunk, the `jgoqfqy2` request chunk, and the `DtuASjaM` slash-command/Speed chunk
- official Plugins and GPT-5.6 paths
- automatic-update row target `disable-automatic-updates-setting-26707-row-local-f`
- Sparkle source-signature match in `.vite/build/sqlite-B1YNeAip.js`
- running-app limitation for the live launch pass
```

- [ ] **Step 6: Check documentation consistency**

Run:

```bash
corepack pnpm check:version-drift
git diff --check
```

Expected: PASS.

### Task 5: Verify source, generated CLI, and the real extracted bundle

**Files:**
- Verify: all modified files
- Verify: `/tmp/codexfast-5440.Te9eCq/app`
- Verify: `/Applications/ChatGPT.app`

- [ ] **Step 1: Run repository verification**

```bash
corepack pnpm build:check
corepack pnpm typecheck
corepack pnpm check:version-drift
corepack pnpm test
git diff --check
corepack pnpm pack --dry-run
```

Expected: every command exits `0`.

- [ ] **Step 2: Apply the generated version-filtered patcher to every real JavaScript asset**

Run:

```bash
corepack pnpm exec tsx -e 'import {readFileSync,readdirSync} from "node:fs"; import {join,relative} from "node:path"; import ts from "typescript"; import {runtimePatcherSourceForVersion} from "./src/cli-runtime-launch.mts"; const root="/tmp/codexfast-5440.Te9eCq/app"; const generated=readFileSync("bin/codexfast","utf8"); const match=generated.match(/const __PATCHER_SOURCE__ = (".*");/); if(!match) throw new Error("patcher source not found"); const patcher=JSON.parse(match[1]); const filtered=runtimePatcherSourceForVersion(patcher,"26.707.91948+5440"); const apply=new Function(`${filtered}\nreturn applyRuntimePatchesToBody;`)(); const files=[]; const walk=(dir)=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name); if(e.isDirectory()) walk(p); else if(e.isFile()&&e.name.endsWith(".js")) files.push(p)}}; walk(root); let diagnostics=0; const rows=[]; for(const file of files){const body=readFileSync(file,"utf8"); const result=apply(file,body); if(result.patchedLabels.length||result.alreadyPatchedLabels.length){if(result.content!==body) diagnostics+=ts.createSourceFile(file,result.content,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length; rows.push({file:relative(root,file),patched:[...new Set(result.patchedLabels)],already:[...new Set(result.alreadyPatchedLabels)]});}} console.log(JSON.stringify({files:files.length,matchedFiles:rows.length,parseDiagnostics:diagnostics,rows},null,2));'
```

Require:

```text
Speed setting
Speed service tier allowance
Speed service tier request allowance
Speed service tier conversation fallback
Fast slash command
Composer Intelligence Speed menu
Disable automatic updates setting
Disable automatic updates schema
parseDiagnostics=0
```

Also require no Plugins, `GPT-5.x model list`, or `GPT-5.6 model query selector`
labels from the filtered patcher. Apply the patcher a second time only to the
patched `webview/assets/general-settings-DMO9G9gL.js` body and require exact
byte equality. Do not require whole-bundle second-pass equality: the existing
schema target intentionally leaves its `preventSleepWhileRunning` needle in
the patched source and is applied to a fresh original module response in real
runtime use.

- [ ] **Step 3: Validate main-process sources**

Run:

```bash
corepack pnpm exec tsx -e 'import {readFileSync,readdirSync} from "node:fs"; import {join,relative} from "node:path"; import ts from "typescript"; import {patchMainProcessAutomaticUpdateSource,patchMainProcessSettingsSchemaSource} from "./src/cli-update-settings.mts"; const root="/tmp/codexfast-5440.Te9eCq/app/.vite/build"; const files=readdirSync(root).filter(x=>x.endsWith(".js")); const rows=[]; let diagnostics=0; for(const name of files){const file=join(root,name),body=readFileSync(file,"utf8"); const schema=patchMainProcessSettingsSchemaSource(body); const updated=patchMainProcessAutomaticUpdateSource(schema); if(updated!==body){diagnostics+=ts.createSourceFile(file,updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length; rows.push({file:relative(root,file),schemaChanged:schema!==body,updaterChanged:updated!==schema,check:updated.includes("codexfastAutomaticUpdateCheck"),reader:updated.includes("codexfastReadDisableAutomaticUpdates")});}} console.log(JSON.stringify({files:files.length,changed:rows.length,parseDiagnostics:diagnostics,rows},null,2));'
```

Require:

```text
sqlite-B1YNeAip.js updaterChanged=true
codexfastAutomaticUpdateCheck present
codexfastReadDisableAutomaticUpdates present
schema matches present
parseDiagnostics=0
```

- [ ] **Step 4: Recheck installed-app immutability**

```bash
shasum -a 256 /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
```

Expected hashes:

```text
85b11c8d93d377f82161ba9b7b1af6f95b2a0490f01993dbc4d3a107dce77591  app.asar
924d45e359a67f3be396a0933b7553c6f3ae3ee5b858fe46fa2ac6f8f69a1065  Info.plist
```

Expected signature result: valid on disk and satisfies its Designated Requirement.

- [ ] **Step 5: Record the live-launch limitation and stop**

If ChatGPT remains active, do not terminate it. Report that local source,
generated CLI, extracted-bundle, syntax, build-5440 Settings idempotency, hash, and signature
verification passed, while the real fresh-process `codexfast launch` smoke test
was skipped because the application was already running.

Do not commit, bump the package version, publish, tag, or create a release.
