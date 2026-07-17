# ChatGPT.app Build 5488 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict, complete local support for `/Applications/ChatGPT.app` `26.715.21425+5488` without modifying the installed application, committing, or releasing.

**Architecture:** Extend the exact version/build gate and official-Plugins skip sets. Add one dedicated renderer Settings target for the observed row-local-`h` shape, plus a fallback main-process updater signature that captures the real background callback and preserves the production-appcast condition while routing automatic checks through the dynamic config gate.

**Tech Stack:** TypeScript, generated single-file Node.js CLI, runtime JavaScript regex patching, shell regression harness, pnpm.

---

## File Map

- Modify `test/runtime-launch-flow.mts`: build-5488 strict gate and required-initial-label coverage.
- Modify `test/suites/runtime-patch-suite.mts`: build-5488 Settings, updater, generated-hook, Plugins, and GPT-5.6 characterization.
- Modify `src/supported-app-versions.mts`: strict compatibility key.
- Modify `src/cli-runtime-launch.mts`: official-Plugins skip sets.
- Modify `src/targets/updates.mts`: dedicated row-local-`h` Settings signature.
- Modify `src/cli-update-settings.mts`: build-5488 callback-aware updater signatures and generated-hook parity.
- Regenerate `bin/codexfast`: published single-file launcher generated from `src/`.
- Update compatibility documentation and add the build-5488 bundle note.
- Keep `package.json` at `0.54.0`; do not commit or publish.

### Task 1: Add failing build-5488 regression coverage

**Files:**
- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`

- [ ] **Step 1: Add the unsupported-to-supported launch fixture**

Add a fake app with version `26.715.21425`, build `5488`. Assert output contains `Compatibility: supported`, reaches only the missing executable failure, lists `Contents/MacOS/ChatGPT`, makes no launch call, and invokes no bundle mutation tools.

- [ ] **Step 2: Add no-legacy-Plugins-required coverage**

Add the build-5488 pending-target fixture and assert the missing-target message reports `none` without naming `Plugins access`.

- [ ] **Step 3: Characterize the exact build-5488 Settings shape**

Use this exact fixture:

```ts
const generalSettings2671521425Body =
  "function sa(){let e=(0,Q.c)(10),t=n(m),{platform:r}=Ze(),i=r!==`windows`,a=R(),o=u(E.preventSleepWhileRunning);if(!i)return null;let s;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(L,{...G.preventSleepWhileRunning}),e[0]=s):s=e[0];let l;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(l=(0,$.jsx)(L,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:Vt}}),e[1]=l):l=e[1];let d=o??!1,f;e[2]===t?f=e[3]:(f=e=>{c(t,E.preventSleepWhileRunning,e)},e[2]=t,e[3]=f);let p;e[4]===a?p=e[5]:(p=a.formatMessage(G.preventSleepWhileRunning),e[4]=a,e[5]=p);let h;return e[6]!==d||e[7]!==f||e[8]!==p?(h=(0,$.jsx)(U,{label:s,description:l,control:(0,$.jsx)(V,{checked:d,onChange:f,ariaLabel:p})}),e[6]=d,e[7]=f,e[8]=p,e[9]=h):h=e[9],h}settings.general.power.preventSleepWhileRunning.description";
```

Assert the result reads `E.disableAutomaticUpdates`, writes it through `c(codexfastSettingsState,E.disableAutomaticUpdates,codexfastNextValue)`, preserves `values:{appName:Vt}`, uses `codexfastCache=(0,Q.c)(17)`, reports `Disable automatic updates setting`, removes `let h;return`, parses as JavaScript, and is byte-stable on the second patch pass.

- [ ] **Step 4: Add the build-5488 updater fixture**

Use a fixture containing the real structural sequence:

```ts
const mainProcessUpdaterBodyWithConditionalCallback =
  "let f=()=>{try{d&&!this.isUpdateReady&&this.updateLifecycleState===`idle`&&this.setUpdateLifecycleState(`checking`),l.checkForUpdatesInBackground()}catch(e){this.isUpdateReady||this.setUpdateLifecycleState(`idle`)}};if(this.setAutomaticBackgroundDownloadsEnabledForMac=e=>{l.setAutomaticBackgroundDownloadsEnabled(e),e&&!t&&f()},this.updater={checkForUpdates:async()=>{d&&!this.isUpdateReady&&this.updateLifecycleState===`idle`&&this.setUpdateLifecycleState(`checking`),l.checkForUpdates()},installUpdatesIfAvailable:async()=>{l.installUpdatesIfAvailable()}},!t){let e=HV();e>0&&setInterval(f,e).unref(),f()}}scheduleForcedUpdateInstall(){this.forcedUpdateTimer&&=(clearTimeout(this.forcedUpdateTimer),null);let e=this.getRelaunchNotificationPolicy();if(!this.isUpdateReady){this.setRelaunchNotice(null);return}}";
```

Assert the patched result contains `codexfastAutomaticUpdateCheck`, preserves `!t`, replaces `e&&!t&&f()` with `e&&!t&&codexfastAutomaticUpdateCheck()`, removes the raw scheduled `setInterval(f,e)` call, gates `scheduleForcedUpdateInstall()`, preserves manual `checkForUpdates` and `installUpdatesIfAvailable`, and parses as JavaScript.

- [ ] **Step 5: Add generated-hook parity and official-path coverage**

Assert `createMainProcessAutomaticUpdateHookSource()` includes the callback-aware interval signature, conditional automatic-download signature, and replacement functions. Add `26.715.21425+5488` to the official Plugins table and add an explicit official GPT-5.6 threshold assertion for the build.

- [ ] **Step 6: Run the focused suite and verify RED**

Run:

```bash
corepack pnpm build
corepack pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: non-zero because build `5488` is unsupported, its Settings and updater signatures do not match, and its Plugins filtering key is absent.

### Task 2: Implement the minimal exact-build adaptation

**Files:**
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Modify: `src/targets/updates.mts`
- Modify: `src/cli-update-settings.mts`
- Regenerate: `bin/codexfast`

- [ ] **Step 1: Add the strict compatibility and official-path keys**

Append:

```ts
"26.715.21425+5488": "ChatGPT.app 26.715.21425 build 5488",
```

Add the same exact key to `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys`. Do not change `runtimePatchOfficialGpt56ThresholdVersionKey`.

- [ ] **Step 2: Add the row-local-`h` Settings target**

Copy `GENERAL_SETTINGS_GUARDED_SIGNATURE_26707_ROW_LOCAL_F`, changing only the exact original row locals to match the observed build-5488 shape: checked value `d`, change handler `f`, aria value `p`, and final row local `h`. Register it as:

```ts
{
  id: "disable-automatic-updates-setting-26715-row-local-h",
  label: "Disable automatic updates setting",
  needle: GENERAL_SETTINGS_NEEDLE,
  guardedSignature: GENERAL_SETTINGS_GUARDED_SIGNATURE_26715_ROW_LOCAL_H,
  patchedSignature: GENERAL_SETTINGS_PATCHED_SIGNATURE_26623,
  applyReplacement: GENERAL_SETTINGS_REPLACEMENT_26707_APP_NAME,
},
```

- [ ] **Step 3: Add callback-aware updater signatures**

Add these source-level signatures:

```ts
const MAIN_PROCESS_AUTOMATIC_UPDATE_CALLBACK_SIGNATURE =
  /let ([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\(\);\1>0&&setInterval\(([A-Za-z_$][\w$]*),\1\)\.unref\(\),\3\(\)/;
const MAIN_PROCESS_AUTOMATIC_DOWNLOAD_CONDITIONAL_GATE_SIGNATURE =
  /this\.setAutomaticBackgroundDownloadsEnabledForMac=([A-Za-z_$][\w$]*)=>\{([A-Za-z_$][\w$]*\.setAutomaticBackgroundDownloadsEnabled\(\1\)),\1&&!([A-Za-z_$][\w$]*)&&([A-Za-z_$][\w$]*)\(\)\},this\.updater=/;
```

Keep the historical signatures unchanged. In `patchMainProcessAutomaticUpdateSource()`, try the historical interval replacement first, then the callback-aware fallback. The fallback replacement must call the captured callback from `codexfastAutomaticUpdateCheck`. After either interval match, replace both automatic-download gate variants and the forced-install scheduler. The conditional replacement must preserve `!<productionAppcastVar>`.

- [ ] **Step 4: Mirror the updater logic in the generated hook**

Add serialized callback-aware and conditional-gate signatures, replacement functions, fallback matching, and `shouldPatchAutomaticUpdates` detection to `createMainProcessAutomaticUpdateHookSource()`. The generated hook must compile the patched module only when either historical or callback-aware updater signature matches.

- [ ] **Step 5: Regenerate and verify GREEN**

Run:

```bash
corepack pnpm build
corepack pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: exit `0` and `runtime launch flow test passed`.

### Task 3: Document build-5488 compatibility

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/troubleshooting.md`
- Modify: `docs/real-app-validation.md`
- Create: `docs/bundle-notes/2026-07-17-chatgpt-app-26.715.21425-build-5488.md`

- [ ] **Step 1: Add build `5488` newest-first to compatibility lists**

Document `26.715.21425` build `5488` before build `5440`, with official GPT-5.6 and Plugins paths, guarded Fast support, the row-local-`h` Settings target in `general-settings-B8bUS3xL.js`, and callback-aware Sparkle discovery in `.vite/build/window-all-closed-DXvqe7lL.js`.

- [ ] **Step 2: Add the changelog entry**

Under `Unreleased`, state that local compatibility was added after direct installed-bundle inspection, including the shifted Settings row and callback-aware automatic-update hook while preserving manual update actions.

- [ ] **Step 3: Add the bundle note**

Record the exact version/build, hashes, extracted path, target asset names, official Plugins/GPT-5.6 conclusion, updater drift, test coverage, running-app limitation, and immutability checks. Do not include personal paths outside the temporary extracted-bundle path and installed application path already used by the repository's real-app documentation.

- [ ] **Step 4: Check documentation consistency**

Run:

```bash
rg -n "26\.715\.21425|5488|B8bUS3xL|window-all-closed-DXvqe7lL" README.md README.zh-CN.md CHANGELOG.md docs src test
git diff --check
```

Expected: all exact-version references agree and `git diff --check` exits `0`.

### Task 4: Verify source, generated CLI, and the real extracted bundle

**Files:**
- Verify: all modified files
- Verify: `/tmp/codexfast-5488.emdeSu/app`
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

- [ ] **Step 2: Apply the generated version-filtered patcher to the real bundle**

Apply the embedded generated patcher filtered for `26.715.21425+5488` to every extracted JavaScript asset. Require all Fast labels, `Disable automatic updates setting`, and `Disable automatic updates schema`; require no Plugins or GPT-5.6 compatibility labels and zero parse diagnostics. Reapply the Settings patch to its patched body and require byte equality.

- [ ] **Step 3: Validate main-process sources**

Apply `patchMainProcessSettingsSchemaSource()` and `patchMainProcessAutomaticUpdateSource()` across `.vite/build/*.js`. Require schema matches, `window-all-closed-DXvqe7lL.js` with `updaterChanged=true`, `codexfastAutomaticUpdateCheck`, `codexfastReadDisableAutomaticUpdates`, preserved manual update methods, and zero parse diagnostics.

- [ ] **Step 4: Recheck installed-app immutability**

```bash
shasum -a 256 /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
```

Expected hashes:

```text
5db4c67090c0521fa717e83e46cb0a6175cb6c16fb89064223753bdf05cff0aa  app.asar
70be56cb90908278d5b1e996ef4a1b953b52be0cebfd6d9b7c4293ee3b24547f  Info.plist
```

Because ChatGPT is running, do not terminate it and do not run a real `codexfast launch` pass.

- [ ] **Step 5: Inspect final scope**

Run:

```bash
git status --short
git diff --stat
git diff -- src/supported-app-versions.mts src/cli-runtime-launch.mts src/targets/updates.mts src/cli-update-settings.mts test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts
```

Expected: only build-5488 source, tests, generated CLI, compatibility docs, bundle note, design, and plan files are changed. Do not run `git add`, `git commit`, version bump, publish, tag, push, or release commands.
