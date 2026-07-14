# ChatGPT.app Build 5307 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add locally verified `codexfast` support for `ChatGPT.app` `26.707.72221+5307` without changing patch signatures, committing, or releasing.

**Architecture:** Keep the strict exact-version gate. Reuse the existing `26.707` Fast, Settings, GPT-5.6 threshold, and automatic-update patch family; add build 5307 only to the supported-version map and the two exact Plugins skip sets. Characterize the real build-5307 Settings shape in tests, regenerate the single-file CLI, update compatibility docs, and verify against the extracted installed bundle without modifying the application.

**Tech Stack:** TypeScript 6, Node.js 18+, pnpm 10, shell regression harness, Electron ASAR inspection, macOS `codesign` and `shasum`.

---

## File Map

- `test/runtime-launch-flow.mts`: strict support-gate and required-initial-label regression coverage.
- `test/suites/runtime-patch-suite.mts`: build-filtered Plugins/GPT-5.6 behavior and Settings target characterization.
- `src/supported-app-versions.mts`: exact supported `version+build` whitelist.
- `src/cli-runtime-launch.mts`: exact Plugins target filtering and initial-label requirements.
- `bin/codexfast`: generated single-file CLI; regenerate from `src/*`.
- `README.md`, `README.zh-CN.md`, `CHANGELOG.md`: public compatibility and unreleased change notes.
- `docs/feature-scope.md`, `docs/compatibility-matrix.md`, `docs/patch-targets.md`: supported feature paths and build mapping.
- `docs/troubleshooting.md`, `docs/real-app-validation.md`: launch expectations for official Plugins builds.
- `docs/bundle-notes/2026-07-14-chatgpt-app-26.707.72221-build-5307.md`: reusable real-bundle findings.

### Task 1: Add failing build-5307 regression coverage

**Files:**

- Modify: `test/runtime-launch-flow.mts:491-499`
- Modify: `test/runtime-launch-flow.mts:765-775`
- Modify: `test/suites/runtime-patch-suite.mts:537-579`
- Modify: `test/suites/runtime-patch-suite.mts:1495-1500`
- Modify: `test/suites/runtime-patch-suite.mts:1566-1572`

- [ ] **Step 1: Add the strict launch-gate test**

Insert after the build-5263 non-running launch block in `test/runtime-launch-flow.mts`:

```ts
  const nonRunningLaunch2670772221App = join(tmpDir, "NonRunningLaunch2670772221.app");
  const nonRunningLaunch2670772221Output = join(tmpDir, "non-running-launch-26707-72221-output.txt");
  prepareFakeApp(nonRunningLaunch2670772221App, "26.707.72221", "5307");
  runScriptCommand(nonRunningLaunch2670772221App, ["launch"], nonRunningLaunch2670772221Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2670772221Output), "Compatibility: supported", "expected build 5307 to pass the strict support gate", readOutput(nonRunningLaunch2670772221Output));
  assertContains(readOutput(nonRunningLaunch2670772221Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5307 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2670772221Output));
  assertContains(readOutput(nonRunningLaunch2670772221Output), "Contents/MacOS/ChatGPT", "expected supported build 5307 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2670772221Output));
  assertNoLaunchCalls(nonRunningLaunch2670772221Output);
  assertNoBundleMutationTools(nonRunningLaunch2670772221Output);
```

- [ ] **Step 2: Add the no-legacy-Plugins-required test**

Insert after the build-5263 pending-target block in `test/runtime-launch-flow.mts`:

```ts
  const launchPendingTargets2670772221App = join(tmpDir, "LaunchPendingTargets2670772221.app");
  const launchPendingTargets2670772221Output = join(tmpDir, "launch-pending-targets-26707-72221-output.txt");
  prepareFakeApp(launchPendingTargets2670772221App, "26.707.72221", "5307");
  runScriptCommand(launchPendingTargets2670772221App, ["launch"], launchPendingTargets2670772221Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2670772221Output), "Runtime patch interception did not observe required targets: none.", "expected build 5307 not to require the legacy Plugins access target", readOutput(launchPendingTargets2670772221Output));
  assertNotContains(readOutput(launchPendingTargets2670772221Output), "Plugins access", "expected build 5307 missing-target output not to name Plugins access", readOutput(launchPendingTargets2670772221Output));
  assertNoLaunchCalls(launchPendingTargets2670772221Output);
  assertNoBundleMutationTools(launchPendingTargets2670772221Output);
```

- [ ] **Step 3: Characterize the real build-5307 Settings shape**

Insert after the build-5263 Settings test in `test/suites/runtime-patch-suite.mts`:

```ts
  const generalSettings2670772221Body =
    "function _a(){let e=(0,Q.c)(10),t=z(R),{platform:n}=Bt(),r=n!==`windows`,i=L(),a=I(D.preventSleepWhileRunning);if(!r)return null;let o;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(B,{...U.preventSleepWhileRunning}),e[0]=o):o=e[0];let s;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(B,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:Zt}}),e[1]=s):s=e[1];let c=a??!1,l;e[2]===t?l=e[3]:(l=e=>{x(t,D.preventSleepWhileRunning,e)},e[2]=t,e[3]=l);let u;e[4]===i?u=e[5]:(u=i.formatMessage(U.preventSleepWhileRunning),e[4]=i,e[5]=u);let d;return e[6]!==c||e[7]!==l||e[8]!==u?(d=(0,$.jsx)(H,{label:o,description:s,control:(0,$.jsx)(G,{checked:c,onChange:l,ariaLabel:u})}),e[6]=c,e[7]=l,e[8]=u,e[9]=d):d=e[9],d}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings2670772221Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-C0l3c9YI.js",
    generalSettings2670772221Body,
  );
  assertContains(generalSettings2670772221Result.content, "D.disableAutomaticUpdates", "expected build 5307 Settings to read the automatic-update setting");
  assertContains(generalSettings2670772221Result.content, "x(codexfastSettingsState,D.disableAutomaticUpdates,codexfastNextValue)", "expected build 5307 Settings to persist the automatic-update setting");
  assertContains(generalSettings2670772221Result.content, "values:{appName:Zt}", "expected build 5307 Settings to preserve app-name-aware prevent-sleep copy");
  assertContains(generalSettings2670772221Result.content, "codexfastCache=(0,Q.c)(17)", "expected build 5307 Settings replacement to use collision-safe prefixed locals");
  assertContains(generalSettings2670772221Result.patchedLabels.join("\n"), "Disable automatic updates setting", "expected build 5307 Settings to report its target");
  assertNotContains(generalSettings2670772221Result.content, "let c=a??!1,l;", "expected build 5307 Settings patch to replace the original row locals");
  new Function(generalSettings2670772221Result.content);
  const generalSettings2670772221SecondPass = applyRuntimePatchesToBody(
    "webview/assets/general-settings-C0l3c9YI.js",
    generalSettings2670772221Result.content,
  );
  if (generalSettings2670772221SecondPass.content !== generalSettings2670772221Result.content) {
    fail("expected the build-5307 Settings patch to be idempotent");
  }
```

- [ ] **Step 4: Add build 5307 to official Plugins filtering coverage**

Extend the version table in `test/suites/runtime-patch-suite.mts`:

```ts
  for (const [versionKey, buildLabel] of [
    ["26.707.31428+5059", "5059"],
    ["26.707.61608+5200", "5200"],
    ["26.707.71524+5263", "5263"],
    ["26.707.72221+5307", "5307"],
  ] as const) {
```

- [ ] **Step 5: Add build 5307 to official GPT-5.6 threshold coverage**

Insert after the build-5263 GPT-5.6 assertions:

```ts
  const officialGpt56Build5307Result = applyOfficialGpt56PatcherForVersion("26.707.72221+5307")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5307Result.content, "GPT56_LIST_DISABLED", "expected build 5307 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5307Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5307 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5307Result.content, "SPEED_ENABLED", "expected build 5307 to retain non-GPT runtime patches");
```

- [ ] **Step 6: Run the focused regression test and verify RED**

Run:

```bash
bash test/re-sign-flow.sh
```

Expected: non-zero because build 5307 is unsupported and/or its exact key does not skip Plugins targets. The Settings characterization should pass because the existing target already recognizes the real shape.

### Task 2: Add the minimal exact-build production support

**Files:**

- Modify: `src/supported-app-versions.mts:45-49`
- Modify: `src/cli-runtime-launch.mts:85-127`
- Modify: `bin/codexfast` through `corepack pnpm build`

- [ ] **Step 1: Add the strict supported-version entry**

Append after build 5263 in `src/supported-app-versions.mts`:

```ts
  "26.707.72221+5307": "ChatGPT.app 26.707.72221 build 5307",
```

- [ ] **Step 2: Remove the legacy initial-label requirement**

Append to `runtimePatchNoPluginsAccessRequiredVersionKeys`:

```ts
  "26.707.72221+5307",
```

- [ ] **Step 3: Skip legacy Plugins runtime targets**

Append to `runtimePatchNoPluginTargetsVersionKeys`:

```ts
  "26.707.72221+5307",
```

Do not change `runtimePatchOfficialGpt56ThresholdVersionKey`; numeric comparison already classifies build 5307 as official GPT-5.6.

- [ ] **Step 4: Regenerate the shipped single-file CLI**

Run:

```bash
corepack pnpm build
```

Expected: exit 0; `bin/codexfast` contains `26.707.72221+5307` in the embedded support map and both Plugins filtering sets.

- [ ] **Step 5: Run the focused regression test and verify GREEN**

Run:

```bash
bash test/re-sign-flow.sh
```

Expected: exit 0 and final output `runtime launch flow test passed`.

### Task 3: Document build-5307 compatibility

**Files:**

- Modify: `README.md:19`
- Modify: `README.zh-CN.md:19`
- Modify: `CHANGELOG.md:7`
- Modify: `docs/feature-scope.md:23,34,43`
- Modify: `docs/compatibility-matrix.md:64`
- Modify: `docs/patch-targets.md:27-32,95`
- Modify: `docs/troubleshooting.md:12`
- Modify: `docs/real-app-validation.md:13`
- Create: `docs/bundle-notes/2026-07-14-chatgpt-app-26.707.72221-build-5307.md`

- [ ] **Step 1: Prepend build 5307 to both README compatibility lists**

Start the English list with:

```md
Verified for `ChatGPT.app` / `Codex.app` `26.707.72221` (`build 5307`), `26.707.71524` (`build 5263`),
```

Start the Chinese list with:

```md
已验证支持 `ChatGPT.app` / `Codex.app` `26.707.72221`（`build 5307`）、`26.707.71524`（`build 5263`）、
```

- [ ] **Step 2: Add the unreleased changelog entry**

Under `## [Unreleased]`, add:

```md
### Added

- Added support for `ChatGPT.app` `26.707.72221` (`build 5307`) after direct installed-bundle inspection, reusing the guarded `26.707` Fast and automatic-update target family while keeping GPT-5.6 and Plugins on official application paths.
```

- [ ] **Step 3: Extend feature-scope build lists**

In `docs/feature-scope.md`, add `26.707.72221` after `26.707.71524` in the three statements covering configured Settings tier authority, composer Intelligence Speed support, and official Plugins support.

- [ ] **Step 4: Add the compatibility-matrix row**

Append after build 5263:

```md
| `26.707.72221` | `5307` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, official GPT-5.6, official Plugins support | `2026-07-14` | Verified by direct installed-bundle inspection and regression coverage against `/Applications/ChatGPT.app` with bundle id `com.openai.codex`. Existing guarded `26.707` Fast allowance, request-tier, configured-tier fallback, `/fast`, Intelligence Speed, and automatic-update targets remain valid. GPT-5.6 and Plugins use official app paths. The Settings row is in `general-settings-C0l3c9YI.js`, and Sparkle remains in `.vite/build/sqlite-B1YNeAip.js`, patched through source-signature discovery while manual update actions remain available. |
```

- [ ] **Step 5: Update the patch-target mapping**

In `docs/patch-targets.md`, add `26.707.72221` after `26.707.71524` in the Fast allowance, request-tier allowance, conversation fallback, and composer Speed rows. Append before `## Update Rules`:

```md
- On `26.707.72221` build `5307`, GPT-5.6 and Plugins continue to use official app paths. Settings-side Fast and the automatic-update row are in `general-settings-C0l3c9YI.js`; the shared allowance and configured-tier fallback are in `app-initial~app-main~onboarding-page-CIkoyvFz.js`; the request-tier helper is in `app-initial~app-main~new-thread-panel-page~onboarding-page~appgen-library-page~hotkey-windo~nrw3o0ql-CI1_Z0oj.js`; `/fast` and the Intelligence Speed gate are in `app-initial~app-main~new-thread-panel-page~appgen-library-page~hotkey-window-thread-page~ho~iufn7mg3-JRP-9S5c.js`. The automatic-update row reuses `disable-automatic-updates-setting-26707-app-name`, and the active Sparkle module remains `.vite/build/sqlite-B1YNeAip.js`, patched through source-signature discovery while manual update actions remain available.
```

- [ ] **Step 6: Update launch troubleshooting and validation lists**

Add `26.707.72221` after `26.707.71524` in the no-legacy-Plugins-required sentence in both `docs/troubleshooting.md` and `docs/real-app-validation.md`.

- [ ] **Step 7: Create the build-specific bundle note**

Create `docs/bundle-notes/2026-07-14-chatgpt-app-26.707.72221-build-5307.md` with:

```md
# ChatGPT.app 26.707.72221 build 5307

## Bundle identity

- Installed app: `/Applications/ChatGPT.app`
- Bundle id: `com.openai.codex`
- `CFBundleShortVersionString`: `26.707.72221`
- `CFBundleVersion`: `5307`
- Strict compatibility key: `26.707.72221+5307`

## Compatibility conclusions

- Settings Fast and the automatic-update Settings row are guarded in `webview/assets/general-settings-C0l3c9YI.js`; the row reuses `disable-automatic-updates-setting-26707-app-name`.
- The shared Fast allowance and configured-tier fallback remain guarded in `webview/assets/app-initial~app-main~onboarding-page-CIkoyvFz.js`.
- The request-tier helper remains guarded in the `nrw3o0ql` shared chunk, while `/fast` and the Intelligence Speed gate remain guarded in the `iufn7mg3` shared chunk.
- Plugins remains supported by the official app path, so runtime launch skips every Plugins target and does not require the legacy `Plugins access` initial label.
- GPT-5.6 remains supported by the official app path because this build is newer than the `26.707.41301+5103` threshold.
- The active Sparkle manager remains `.vite/build/sqlite-B1YNeAip.js`. Existing source-signature discovery recognizes its background interval, automatic-download callback, and forced-install scheduler while leaving manual update actions available.

## Validation boundary

- The installed `app.asar` was extracted to a temporary directory for read-only inspection.
- Regression coverage includes the exact whitelist, official Plugins/GPT-5.6 filtering, build-5307 Settings syntax and idempotency, generated CLI behavior, and source-signature updater/schema patching.
- ChatGPT was active during adaptation, so the process was not terminated for a real launch pass. Installed bundle hashes and the application signature were rechecked instead.
```

- [ ] **Step 8: Check documentation consistency**

Run:

```bash
rg -n "26\.707\.72221|5307|C0l3c9YI|CIkoyvFz|CI1_Z0oj|JRP-9S5c" README.md README.zh-CN.md CHANGELOG.md docs src test
git diff --check
```

Expected: all references agree on `26.707.72221+5307`; `git diff --check` exits 0.

### Task 4: Run complete source, generated CLI, and real-bundle verification

**Files:**

- Verify: `src/*`
- Verify: `test/*`
- Verify: `bin/codexfast`
- Verify: `/tmp/codexfast-5307.G7k26Q/app`
- Verify: `/Applications/ChatGPT.app` without modification

- [ ] **Step 1: Run standard repository verification**

Run each command separately and require exit code 0:

```bash
corepack pnpm build
corepack pnpm build:check
corepack pnpm typecheck
corepack pnpm check:version-drift
corepack pnpm test
git diff --check
corepack pnpm pack --dry-run
```

Expected: `pnpm test` ends with `runtime launch flow test passed`; `pnpm pack --dry-run` includes the generated `bin/codexfast` and public package files only.

- [ ] **Step 2: Re-run target inspection against build 5307**

Run:

```bash
corepack pnpm inspect:bundle-targets /tmp/codexfast-5307.G7k26Q/app
```

Expected guarded target ids include:

```text
speed-setting-destructured-option-count
speed-service-tier-allowance-26601
speed-service-tier-request-allowance-26707
speed-service-tier-conversation-fallback-26707
intelligence-speed-menu-options-boolean-code
service-tier-slash-command
disable-automatic-updates-schema
disable-automatic-updates-setting-26707-app-name
```

- [ ] **Step 3: Verify filtered real renderer patches and syntax**

Run a `corepack pnpm exec tsx -e` diagnostic that reads the six inspected renderer files, skips target ids beginning with `plugin`, `plugins`, `composer-plugin`, or `shared-plugin`, skips `gpt5x-model-list-options` and `gpt56-model-query-selector`, applies all remaining matching specs, and parses every result with `typescript.createSourceFile`.

Expected labels:

```text
general-settings-C0l3c9YI.js => Speed setting; Disable automatic updates setting
app-initial~app-main~onboarding-page-CIkoyvFz.js => Speed service tier allowance; Speed service tier conversation fallback
app-initial~app-main~new-thread-panel-page~onboarding-page~appgen-library-page~hotkey-windo~nrw3o0ql-CI1_Z0oj.js => Speed service tier request allowance
app-initial~app-main~new-thread-panel-page~appgen-library-page~hotkey-window-thread-page~ho~iufn7mg3-JRP-9S5c.js => Composer Intelligence Speed menu; Fast slash command
app-initial~app-main~page-Cmd9LUYY.js => no compatibility patch
app-initial~app-main~onboarding-page~projects-index-page~hotkey-window-thread-page~quick-ch~iiv1g666-BjNKtmac.js => no compatibility patch
```

Every result must report `parseDiagnostics=0`; no patched label may begin with `Plugin` or `Plugins`.

- [ ] **Step 4: Verify updater and settings-schema sources**

Apply `patchMainProcessAutomaticUpdateSource` to `/tmp/codexfast-5307.G7k26Q/app/.vite/build/sqlite-B1YNeAip.js`. Assert the patched source differs and contains:

```text
codexfastAutomaticUpdateCheck
async checkForUpdates()
async installUpdatesIfAvailable()
scheduleForcedUpdateInstall(){if(
```

Scan `.vite/build/*.js` with `patchMainProcessSettingsSchemaSource` and require at least one changed source containing `disableAutomaticUpdates`.

- [ ] **Step 5: Recheck installed-app immutability**

Run:

```bash
shasum -a 256 /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
```

Expected hashes:

```text
b5da51e5df6e996076e4cb19045cec46dd4c08cf61c19cdbc5cb426b8413b73c  /Applications/ChatGPT.app/Contents/Resources/app.asar
188e2f0273989bedb68f7057bc689787e497036f4cbb000208ef3b5d15db55f5  /Applications/ChatGPT.app/Contents/Info.plist
```

Expected signature result: `/Applications/ChatGPT.app: valid on disk` and `satisfies its Designated Requirement`.

- [ ] **Step 6: Respect the active application session**

Run:

```bash
pgrep -x Codex
pgrep -x ChatGPT
```

If either process is active, do not terminate it and do not run a real launch pass. Report that live launch validation was skipped to avoid interrupting the user. If both processes are absent, run `node bin/codexfast launch`, verify build `5307` is supported and runtime interception completes, close the validation session cleanly, then repeat the hash and signature checks.

- [ ] **Step 7: Inspect final scope and stop without committing**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Expected: only build-5307 source, tests, generated CLI, compatibility docs, bundle note, design, and plan files are changed. Do not run `git add`, `git commit`, version bump, publish, tag, push, or release commands.
