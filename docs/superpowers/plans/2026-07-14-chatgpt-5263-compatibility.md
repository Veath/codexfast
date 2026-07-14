# ChatGPT.app 26.707.71524 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict, complete support for the locally installed `ChatGPT.app` `26.707.71524+5263`, verify the real bundle without modifying it, and publish `codexfast` `0.52.0`.

**Architecture:** Reuse the existing guarded Fast, Settings, updater, and official GPT-5.6 behavior. Add the exact build key to compatibility and official-Plugins filtering, cover those missing behaviors with RED tests first, regenerate the single-file launcher, then verify against both fixtures and the extracted build-5263 bundle before release.

**Tech Stack:** TypeScript, Node.js, generated single-file CLI, shell regression harness, pnpm, npm registry, GitHub CLI.

---

## File Map

- Modify `test/suites/runtime-patch-suite.mts`: build-5263 Plugins filtering, official GPT-5.6 threshold coverage, and exact Settings characterization.
- Modify `test/runtime-launch-flow.mts`: strict support-gate and no-legacy-Plugins requirement fixtures.
- Modify `src/cli-runtime-launch.mts`: exact build-5263 Plugins target filtering and required-label behavior.
- Modify `src/supported-app-versions.mts`: exact `26.707.71524+5263` whitelist entry.
- Modify `README.md` and `README.zh-CN.md`: newest-first compatibility list.
- Modify `CHANGELOG.md`: unreleased compatibility entry, then release section.
- Modify `docs/feature-scope.md`: build-5263 Fast, Speed, and official Plugins scope.
- Modify `docs/compatibility-matrix.md`: exact supported row.
- Modify `docs/patch-targets.md`: build-specific mapping and affected feature lists.
- Modify `docs/troubleshooting.md` and `docs/real-app-validation.md`: no-legacy-Plugins and validation guidance.
- Create `docs/bundle-notes/2026-07-14-chatgpt-app-26.707.71524-build-5263.md`: reusable bundle facts.
- Regenerate `bin/codexfast`: shipped CLI derived from source.
- Modify `package.json`: release bump from `0.51.0` to `0.52.0` only after compatibility verification.

### Task 1: Add RED coverage for build-5263 official paths

**Files:**
- Modify: `test/suites/runtime-patch-suite.mts`
- Test: `test/runtime-launch-flow.mts`

- [ ] **Step 1: Add build 5263 to the official Plugins filtering fixture**

Change the tuple list to:

```ts
  for (const [versionKey, buildLabel] of [
    ["26.707.31428+5059", "5059"],
    ["26.707.61608+5200", "5200"],
    ["26.707.71524+5263", "5263"],
  ] as const) {
```

Keep the existing assertions:

```ts
    assertContains(result.content, "PLUGIN_DISABLED", `expected build ${buildLabel} to use official Plugins paths`);
    assertContains(result.content, "SPEED_ENABLED", `expected build ${buildLabel} to retain non-Plugins runtime patches`);
```

- [ ] **Step 2: Add explicit build-5263 official GPT-5.6 coverage**

Insert after the build-5200 GPT assertions:

```ts
  const officialGpt56Build5263Result = applyOfficialGpt56PatcherForVersion("26.707.71524+5263")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5263Result.content, "GPT56_LIST_DISABLED", "expected build 5263 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5263Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5263 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5263Result.content, "SPEED_ENABLED", "expected build 5263 to retain non-GPT runtime patches");
```

- [ ] **Step 3: Add the exact build-5263 Settings characterization fixture**

Insert after the build-5200 Settings test:

```ts
  const generalSettings2670771524Body =
    "function _a(){let e=(0,Q.c)(10),t=F(V),{platform:r}=j(),i=r!==`windows`,a=H(),o=L(n.preventSleepWhileRunning);if(!i)return null;let s;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(R,{...W.preventSleepWhileRunning}),e[0]=s):s=e[0];let c;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,$.jsx)(R,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:f}}),e[1]=c):c=e[1];let l=o??!1,u;e[2]===t?u=e[3]:(u=e=>{I(t,n.preventSleepWhileRunning,e)},e[2]=t,e[3]=u);let d;e[4]===a?d=e[5]:(d=a.formatMessage(W.preventSleepWhileRunning),e[4]=a,e[5]=d);let p;return e[6]!==l||e[7]!==u||e[8]!==d?(p=(0,$.jsx)(U,{label:s,description:c,control:(0,$.jsx)(tr,{checked:l,onChange:u,ariaLabel:d})}),e[6]=l,e[7]=u,e[8]=d,e[9]=p):p=e[9],p}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings2670771524Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-B9im2sCE.js",
    generalSettings2670771524Body,
  );
  assertContains(
    generalSettings2670771524Result.content,
    "n.disableAutomaticUpdates",
    "expected build 5263 Settings to read the automatic-update setting",
  );
  assertContains(
    generalSettings2670771524Result.content,
    "I(codexfastSettingsState,n.disableAutomaticUpdates,codexfastNextValue)",
    "expected build 5263 Settings to persist the automatic-update setting",
  );
  assertContains(
    generalSettings2670771524Result.content,
    "values:{appName:f}",
    "expected build 5263 Settings to preserve app-name-aware prevent-sleep copy",
  );
  assertContains(
    generalSettings2670771524Result.content,
    "codexfastCache=(0,Q.c)(17)",
    "expected build 5263 Settings replacement to use collision-safe prefixed locals",
  );
  assertContains(
    generalSettings2670771524Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected build 5263 Settings to report its target",
  );
  assertNotContains(
    generalSettings2670771524Result.content,
    "let l=o??!1,u;",
    "expected build 5263 Settings patch to replace the original row locals",
  );
  new Function(generalSettings2670771524Result.content);
  const generalSettings2670771524SecondPass = applyRuntimePatchesToBody(
    "webview/assets/general-settings-B9im2sCE.js",
    generalSettings2670771524Result.content,
  );
  if (generalSettings2670771524SecondPass.content !== generalSettings2670771524Result.content) {
    fail("expected the build-5263 Settings patch to be idempotent");
  }
```

- [ ] **Step 4: Run the regression entrypoint and verify RED**

Run:

```bash
corepack pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: non-zero with `expected build 5263 to use official Plugins paths`. The result still contains `PLUGIN_ENABLED`, proving the exact build is not yet in the Plugins skip set. The GPT-5.6 and Settings characterization assertions should not be the failure.

- [ ] **Step 5: Add the minimal Plugins filtering implementation**

Add this exact key to `runtimePatchNoPluginTargetsVersionKeys` in `src/cli-runtime-launch.mts`:

```ts
  "26.707.71524+5263",
```

- [ ] **Step 6: Run the regression entrypoint and verify GREEN**

Run:

```bash
corepack pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: exit 0 and `runtime launch flow test passed`.

### Task 2: Add RED coverage for strict compatibility and initial labels

**Files:**
- Modify: `test/runtime-launch-flow.mts`
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Regenerate: `bin/codexfast`

- [ ] **Step 1: Add the unsupported-to-supported build-5263 launch fixture**

Insert after the build-5200 non-running fixture:

```ts
  const nonRunningLaunch2670771524App = join(tmpDir, "NonRunningLaunch2670771524.app");
  const nonRunningLaunch2670771524Output = join(tmpDir, "non-running-launch-26707-71524-output.txt");
  prepareFakeApp(nonRunningLaunch2670771524App, "26.707.71524", "5263");
  runScriptCommand(nonRunningLaunch2670771524App, ["launch"], nonRunningLaunch2670771524Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2670771524Output), "Compatibility: supported", "expected build 5263 to pass the strict support gate", readOutput(nonRunningLaunch2670771524Output));
  assertContains(readOutput(nonRunningLaunch2670771524Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5263 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2670771524Output));
  assertContains(readOutput(nonRunningLaunch2670771524Output), "Contents/MacOS/ChatGPT", "expected supported build 5263 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2670771524Output));
  assertNoLaunchCalls(nonRunningLaunch2670771524Output);
  assertNoBundleMutationTools(nonRunningLaunch2670771524Output);
```

- [ ] **Step 2: Add the no-legacy-Plugins-required fixture**

Insert after the build-5200 pending-target fixture:

```ts
  const launchPendingTargets2670771524App = join(tmpDir, "LaunchPendingTargets2670771524.app");
  const launchPendingTargets2670771524Output = join(tmpDir, "launch-pending-targets-26707-71524-output.txt");
  prepareFakeApp(launchPendingTargets2670771524App, "26.707.71524", "5263");
  runScriptCommand(launchPendingTargets2670771524App, ["launch"], launchPendingTargets2670771524Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2670771524Output), "Runtime patch interception did not observe required targets: none.", "expected build 5263 not to require the legacy Plugins access target", readOutput(launchPendingTargets2670771524Output));
  assertNotContains(readOutput(launchPendingTargets2670771524Output), "Plugins access", "expected build 5263 missing-target output not to name Plugins access", readOutput(launchPendingTargets2670771524Output));
  assertNoLaunchCalls(launchPendingTargets2670771524Output);
  assertNoBundleMutationTools(launchPendingTargets2670771524Output);
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
corepack pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: non-zero at `expected build 5263 to pass the strict support gate`; output for the fake app says `Compatibility: unsupported`.

- [ ] **Step 4: Add the exact whitelist key**

Append to `SUPPORTED_APP_VERSIONS` in `src/supported-app-versions.mts`:

```ts
  "26.707.71524+5263": "ChatGPT.app 26.707.71524 build 5263",
```

- [ ] **Step 5: Remove the legacy initial-label requirement for build 5263**

Add to `runtimePatchNoPluginsAccessRequiredVersionKeys` in `src/cli-runtime-launch.mts`:

```ts
  "26.707.71524+5263",
```

- [ ] **Step 6: Regenerate the public CLI**

Run:

```bash
corepack pnpm build
```

Expected: exit 0 and `bin/codexfast` contains `26.707.71524+5263` in both embedded compatibility and runtime filtering data.

- [ ] **Step 7: Run the test and verify GREEN**

Run:

```bash
corepack pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: exit 0 and `runtime launch flow test passed`.

### Task 3: Document build-5263 compatibility

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/troubleshooting.md`
- Modify: `docs/real-app-validation.md`
- Create: `docs/bundle-notes/2026-07-14-chatgpt-app-26.707.71524-build-5263.md`

- [ ] **Step 1: Prepend build 5263 to both README compatibility lists**

Use these exact prefixes:

```md
Verified for `ChatGPT.app` / `Codex.app` `26.707.71524` (`build 5263`), `26.707.61608` (`build 5200`),
```

```md
已验证支持 `ChatGPT.app` / `Codex.app` `26.707.71524`（`build 5263`）、`26.707.61608`（`build 5200`）、
```

Preserve the rest of each existing newest-first list unchanged.

- [ ] **Step 2: Add the unreleased changelog entry**

Under `## [Unreleased]`, add:

```md
### Added

- Added support for `ChatGPT.app` `26.707.71524` (`build 5263`) after direct installed-bundle inspection, reusing the guarded `26.707` Fast and automatic-update target family while keeping GPT-5.6 and Plugins on official application paths.
```

- [ ] **Step 3: Add build 5263 to the feature-scope lists**

In `docs/feature-scope.md`, add `26.707.71524` after `26.707.61608` in:

- the configured Settings tier source-of-truth sentence;
- the composer Intelligence Speed build list;
- the official Plugins build list.

Keep the GPT-5.6 threshold paragraph unchanged because it already applies numerically to later separately whitelisted builds.

- [ ] **Step 4: Add the exact compatibility-matrix row**

Append after build 5200:

```md
| `26.707.71524` | `5263` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, official GPT-5.6, official Plugins support | `2026-07-14` | Verified by direct installed-bundle inspection and regression coverage against `/Applications/ChatGPT.app` with bundle id `com.openai.codex`. Existing guarded `26.707` Fast allowance, request-tier, configured-tier fallback, `/fast`, Intelligence Speed, and automatic-update Settings targets remain valid. GPT-5.6 and Plugins use official app paths. The Settings row is in `general-settings-B9im2sCE.js`, and Sparkle is in `.vite/build/sqlite-B1YNeAip.js`, still patched through source-signature discovery while manual update actions remain available. |
```

- [ ] **Step 5: Update patch-target mappings**

In `docs/patch-targets.md`, add `26.707.71524` after `26.707.61608` in the Fast allowance, request-tier, conversation-fallback, and Intelligence Speed rows. Append this build note before `## Update Rules`:

```md
- On `26.707.71524` build `5263`, GPT-5.6 and Plugins continue to use official app paths. Settings-side Fast and the automatic-update row are in `general-settings-B9im2sCE.js`; the shared allowance and configured-tier fallback are in `app-initial~app-main~onboarding-page-qmFVRsFx.js`; the request-tier helper is in `app-initial~app-main~onboarding-page~hotkey-window-thread-page~quick-chat-window-page~chatg~gwqc41kz-CnQKtQ6U.js`; `/fast` and the Intelligence Speed gate are in `app-initial~app-main~new-thread-panel-page~appgen-library-page~hotkey-window-thread-page~ho~iufn7mg3-BWgIh_w6.js`. The automatic-update row reuses `disable-automatic-updates-setting-26707-platform-locals`, and the active Sparkle module is `.vite/build/sqlite-B1YNeAip.js`, still patched through source-signature discovery while manual update actions remain available.
```

- [ ] **Step 6: Update troubleshooting and real-app validation lists**

Add `26.707.71524` after `26.707.61608` in the no-legacy-Plugins-required sentence in both:

- `docs/troubleshooting.md`
- `docs/real-app-validation.md`

- [ ] **Step 7: Create the build note**

Create `docs/bundle-notes/2026-07-14-chatgpt-app-26.707.71524-build-5263.md` with:

```md
# ChatGPT.app 26.707.71524 build 5263

## Bundle identity

- Installed app: `/Applications/ChatGPT.app`
- Bundle id: `com.openai.codex`
- `CFBundleShortVersionString`: `26.707.71524`
- `CFBundleVersion`: `5263`
- Strict compatibility key: `26.707.71524+5263`

## Compatibility conclusions

- Settings Fast and the automatic-update Settings row are guarded in `webview/assets/general-settings-B9im2sCE.js`; the row reuses `disable-automatic-updates-setting-26707-platform-locals`.
- The shared Fast allowance and configured-tier fallback remain guarded in `webview/assets/app-initial~app-main~onboarding-page-qmFVRsFx.js`.
- The request-tier helper remains guarded in the `gwqc41kz` shared chunk, while `/fast` and the Intelligence Speed gate remain guarded in the `iufn7mg3` shared chunk.
- Plugins remains supported by the official app path, so runtime launch skips every Plugins target and does not require the legacy `Plugins access` initial label.
- GPT-5.6 remains supported by the official app path because this build is newer than the `26.707.41301+5103` threshold. Runtime launch skips the GPT-5.6 model-list and query-selector compatibility targets only after the exact build passes the strict whitelist.
- The active Sparkle manager is `.vite/build/sqlite-B1YNeAip.js`. Existing source-signature discovery still recognizes its background interval, automatic-download callback, and forced-install scheduler while leaving manual update actions available.

## Validation boundary

- The installed `app.asar` was extracted to a temporary directory for read-only inspection.
- Regression coverage includes the exact whitelist, official Plugins/GPT-5.6 filtering, build-5263 Settings syntax and idempotency, generated CLI behavior, and source-signature updater/schema patching.
- Real-launch validation is recorded separately and must leave `app.asar`, `Info.plist`, and the application signature unchanged.
```

- [ ] **Step 8: Check documentation consistency**

Run:

```bash
rg -n "26\.707\.71524|5263|B9im2sCE|B1YNeAip" README.md README.zh-CN.md CHANGELOG.md docs src test
git diff --check
```

Expected: all build references agree on `26.707.71524+5263`; `git diff --check` exits 0.

### Task 4: Verify source, generated CLI, and the real bundle

**Files:**
- Verify: `src/*`
- Verify: `bin/codexfast`
- Verify: extracted build under `/tmp/codexfast-5263.*/app`
- Verify: `/Applications/ChatGPT.app` hashes and signature without modification

- [ ] **Step 1: Run the standard source and generated-CLI gates**

Run:

```bash
corepack pnpm build
corepack pnpm build:check
corepack pnpm typecheck
corepack pnpm check:version-drift
corepack pnpm test
git diff --check
corepack pnpm pack --dry-run
```

Expected: every command exits 0; `pnpm test` prints `runtime launch flow test passed`.

- [ ] **Step 2: Re-run target inspection on the extracted bundle**

Run with the current temporary extraction path:

```bash
corepack pnpm inspect:bundle-targets /tmp/codexfast-5263.DvEveQ/app
```

Expected guarded targets:

- `speed-setting-destructured-option-count`
- `speed-service-tier-allowance-26601`
- `speed-service-tier-request-allowance-26707`
- `speed-service-tier-conversation-fallback-26707`
- `intelligence-speed-menu-options-boolean-code`
- `service-tier-slash-command`
- `disable-automatic-updates-schema`
- `disable-automatic-updates-setting-26707-platform-locals`

- [ ] **Step 3: Verify build-filtered real renderer patches**

Use the generated `bin/codexfast` embedded patcher plus `runtimePatcherSourceForVersion` for `26.707.71524+5263`. Apply it to the five inspected renderer files and assert:

```text
general-settings-B9im2sCE.js
  Speed setting
  Disable automatic updates setting

app-initial~app-main~onboarding-page-qmFVRsFx.js
  Speed service tier allowance
  Speed service tier conversation fallback

app-initial~app-main~onboarding-page~hotkey-window-thread-page~quick-chat-window-page~chatg~gwqc41kz-CnQKtQ6U.js
  Speed service tier request allowance

app-initial~app-main~new-thread-panel-page~appgen-library-page~hotkey-window-thread-page~ho~iufn7mg3-BWgIh_w6.js
  Composer Intelligence Speed menu
  Fast slash command

app-initial~app-main~page-kMhXWEru.js
  no GPT-5.x compatibility patch
```

Assert that no patched label begins with `Plugin` or `Plugins`, and parse every changed renderer result with TypeScript's JavaScript parser.

- [ ] **Step 4: Verify the real updater and schema sources**

Apply `patchMainProcessAutomaticUpdateSource` to `.vite/build/sqlite-B1YNeAip.js` and assert the result contains:

```text
codexfastAutomaticUpdateCheck
async checkForUpdates()
async installUpdatesIfAvailable()
scheduleForcedUpdateInstall(){if(
```

Scan `.vite/build/*.js` with `patchMainProcessSettingsSchemaSource` and assert at least one changed source contains `disableAutomaticUpdates`.

- [ ] **Step 5: Recheck installed-app immutability**

Run:

```bash
shasum -a 256 /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app
```

Expected hashes:

```text
d28f31b4bbb04c519be65c2af8277d8c5faf77b4239ee89b928f0a7423dacd84  /Applications/ChatGPT.app/Contents/Resources/app.asar
1d8ab7635e7429a967147502f9978d6b75a72e1e668c123764cb8750154b892a  /Applications/ChatGPT.app/Contents/Info.plist
```

Expected: codesign reports `valid on disk` and `satisfies its Designated Requirement`.

- [ ] **Step 6: Attempt real launch only when it will not interrupt an active session**

Run:

```bash
pgrep -x Codex
pgrep -x ChatGPT
```

If both return 1, run `node bin/codexfast launch`, observe `Detected version: 26.707.71524`, `Detected build: 5263`, `Compatibility: supported`, and `Runtime launch completed`, then close the launched validation session cleanly and repeat the immutability checks.

If either process is active, do not kill it. Record that live launch was skipped to avoid interrupting the user, and rely on the full regression suite plus direct real-bundle and signature proof.

### Task 5: Commit the compatibility adaptation

**Files:**
- Stage only the build-5263 source, tests, generated CLI, docs, and bundle note.

- [ ] **Step 1: Inspect the focused diff**

Run:

```bash
git status --short
git diff -- src/supported-app-versions.mts src/cli-runtime-launch.mts test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts bin/codexfast README.md README.zh-CN.md CHANGELOG.md docs/feature-scope.md docs/compatibility-matrix.md docs/patch-targets.md docs/troubleshooting.md docs/real-app-validation.md docs/bundle-notes/2026-07-14-chatgpt-app-26.707.71524-build-5263.md
```

Expected: no unrelated changes.

- [ ] **Step 2: Commit the compatibility change**

Run:

```bash
git add src/supported-app-versions.mts src/cli-runtime-launch.mts test/runtime-launch-flow.mts test/suites/runtime-patch-suite.mts bin/codexfast README.md README.zh-CN.md CHANGELOG.md docs/feature-scope.md docs/compatibility-matrix.md docs/patch-targets.md docs/troubleshooting.md docs/real-app-validation.md docs/bundle-notes/2026-07-14-chatgpt-app-26.707.71524-build-5263.md
git commit -m "feat: support ChatGPT build 5263"
```

- [ ] **Step 3: Verify the compatibility commit**

Run:

```bash
git show --stat --oneline HEAD
git status --short --branch
```

Expected: the compatibility commit is focused; the branch is ahead of `origin/main` only by the design, plan, and compatibility commits.

### Task 6: Prepare and publish codexfast 0.52.0

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Regenerate: `bin/codexfast`

- [ ] **Step 1: Preflight npm, GitHub, and tag state**

Run:

```bash
npm_config_registry=https://registry.npmjs.org corepack pnpm view codexfast version versions --json
git tag --list v0.52.0
gh release view v0.52.0
git status --short --branch
```

Expected before release:

- npm latest is `0.51.0` and `0.52.0` is absent;
- local tag `v0.52.0` is absent;
- `gh release view v0.52.0` reports no release;
- the worktree is clean.

- [ ] **Step 2: Move the changelog entry into the release section**

Replace the unreleased addition with:

```md
## [Unreleased]

## [0.52.0] - 2026-07-14

### Added

- Added support for `ChatGPT.app` `26.707.71524` (`build 5263`) after direct installed-bundle inspection, reusing the guarded `26.707` Fast and automatic-update target family while keeping GPT-5.6 and Plugins on official application paths.
```

- [ ] **Step 3: Bump the package version**

Change `package.json`:

```json
"version": "0.52.0"
```

- [ ] **Step 4: Regenerate and run the full release gate**

Run:

```bash
corepack pnpm build
corepack pnpm build:check
corepack pnpm typecheck
corepack pnpm check:version-drift
corepack pnpm test
git diff --check
corepack pnpm pack --dry-run
node bin/codexfast version
```

Expected: all commands exit 0; the version command prints `codexfast 0.52.0`.

- [ ] **Step 5: Commit and tag the release**

Run:

```bash
git add package.json CHANGELOG.md bin/codexfast
git commit -m "chore: release 0.52.0"
git tag v0.52.0
git push origin main
git push origin v0.52.0
```

- [ ] **Step 6: Publish to the official npm registry**

Run:

```bash
corepack pnpm publish --registry https://registry.npmjs.org --access public
```

Expected: `+ codexfast@0.52.0`.

- [ ] **Step 7: Create and verify the GitHub release**

Run:

```bash
gh release create v0.52.0 --title "v0.52.0" --notes "## Added

- Added support for ChatGPT.app 26.707.71524 (build 5263) after direct installed-bundle inspection, reusing the guarded 26.707 Fast and automatic-update target family while keeping GPT-5.6 and Plugins on official application paths."
gh release view v0.52.0 --json tagName,name,isDraft,isPrerelease,url,body
```

Expected: the release is published, not a draft or prerelease, and its body matches the changelog entry.

- [ ] **Step 8: Verify published package and remote state**

Run repository-bound checks from the repo:

```bash
npm_config_registry=https://registry.npmjs.org corepack pnpm view codexfast version dist.tarball dist.integrity --json
gh release view v0.52.0 --json tagName,url
git rev-parse HEAD
git rev-parse v0.52.0
git status --short --branch
```

Then run the package smoke test outside the repo:

```bash
cd /tmp
corepack pnpm dlx codexfast@0.52.0 version
```

Expected:

- npm latest is `0.52.0`;
- `main` and `v0.52.0` point to the release commit;
- the repo is clean and synchronized with `origin/main`;
- the external smoke test prints `codexfast 0.52.0`.
