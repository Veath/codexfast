# ChatGPT.app 26.715.21425 Compatibility Design

## Goal

Adapt `codexfast` to the locally installed `/Applications/ChatGPT.app`
`26.715.21425` build `5488` while preserving the complete supported feature
set and the runtime-only launcher. The task ends with local verification and
does not include a commit, package version bump, publish, tag, or release.

## Observed Build

- Installed app: `/Applications/ChatGPT.app`
- Bundle identifier: `com.openai.codex`
- `CFBundleShortVersionString`: `26.715.21425`
- `CFBundleVersion`: `5488`
- Compatibility key: `26.715.21425+5488`
- Installed application state: running during inspection
- Extracted bundle: `/tmp/codexfast-5488.emdeSu/app`
- `app.asar` SHA-256:
  `5db4c67090c0521fa717e83e46cb0a6175cb6c16fb89064223753bdf05cff0aa`
- `Info.plist` SHA-256:
  `70be56cb90908278d5b1e996ef4a1b953b52be0cebfd6d9b7c4293ee3b24547f`
- `codesign --verify --deep --strict` succeeds.

The installed application was not modified during inspection.

## Bundle Findings

Build `5488` remains compatible with the current Fast feature family.

- Settings Fast is guarded in
  `webview/assets/general-settings-B8bUS3xL.js` and matches the existing
  destructured option-count target.
- The shared Fast allowance and configured-tier fallback are guarded in the
  `l46phxln` shared chunk.
- The request-tier helper is guarded in the `b0wqjrxp` shared chunk.
- The `/fast` service-tier command and Intelligence Speed menu are guarded in
  the `unq8yzli` shared chunk.
- Applying the build-5440 filtered runtime strategy to the extracted bundle
  patches all required Fast renderer targets with zero JavaScript parse
  diagnostics.
- GPT-5.6 remains available through the official application path because this
  build is newer than the `26.707.41301+5103` threshold.
- Plugins remains available through the official application path for this
  supported build family. Runtime launch must skip Plugins compatibility
  targets and must not require the legacy `Plugins access` initial label.
- The automatic-update Settings row moved to a new minified shape in
  `general-settings-B8bUS3xL.js`. The prevent-sleep row now ends in cached row
  local `h`; none of the existing dedicated 26.707 Settings signatures match.
- The desktop settings schema remains compatible with the existing source
  signature.
- The Sparkle updater moved to
  `.vite/build/window-all-closed-DXvqe7lL.js`. Its background check now uses a
  local callback defined inside `initializeMacSparkle()` and schedules it only
  when the production-appcast branch is inactive. The existing updater hook
  assumes an older callback and interval shape, so no automatic-update runtime
  hook is currently inserted.
- The forced-install method retains the existing
  `scheduleForcedUpdateInstall()` entry shape.

## Chosen Approach

Use a narrow exact-build adaptation:

1. Add `26.715.21425+5488` to the strict supported-version map.
2. Add the same key to the no-legacy-Plugins-required and no-Plugins-targets
   sets.
3. Keep the numeric official-GPT-5.6 threshold unchanged.
4. Add a dedicated Settings target for the observed row-local-`h` shape and
   reuse the existing collision-safe, app-name-aware replacement.
5. Add a dedicated main-process updater signature for the observed inline
   background callback and conditional interval setup.
6. Preserve the production-appcast condition when replacing the automatic
   download trigger with the dynamically configured background-check wrapper.
7. Continue patching `scheduleForcedUpdateInstall()` so automatic forced
   installs are skipped while the setting is enabled.
8. Preserve manual update checks and manual update installation actions.
9. Add exact regression coverage before production changes.
10. Update compatibility documentation and add a build-specific bundle note.
11. Regenerate `bin/codexfast` from TypeScript source.
12. Stop after local verification without committing or releasing.

## Alternatives Rejected

### Generalize all current Settings and updater signatures

Broad capture-based expressions would reduce target duplication, but they
would expand high-risk matching across every previously supported build. The
new shapes are sufficiently distinct to justify dedicated compatibility
signatures.

### Whitelist only

Adding build `5488` only to the supported-version map would allow launch but
would omit the `Disable automatic updates` Settings row and leave background
checks and automatic forced installs uncontrolled.

### Range-based compatibility

Automatically supporting future `26.715` builds would weaken the strict
version-plus-build policy. Unknown builds remain blocked until their real
bundles are inspected.

## Runtime Data Flow

The Settings row reads and writes `desktop.disableAutomaticUpdates` through
the existing desktop settings store. The main-process hook reads the latest
`config.toml` immediately before each automatic background check, automatic
download-triggered background check, and forced-install scheduling pass.

When the setting is enabled:

- scheduled and startup background checks return without invoking Sparkle;
- enabling automatic background downloads does not trigger a background
  check;
- forced automatic installation scheduling is cleared and no relaunch notice
  is created;
- manual `Check for Updates` and manual installation calls remain unchanged.

When the setting is disabled, the original update flow and the build-5488
production-appcast condition are preserved.

## Failure Handling

- Unknown version/build pairs remain blocked before runtime launch.
- If a required renderer target is not observed, runtime launch fails closed.
- If the main-process source does not match the exact updater signature, the
  source remains unchanged instead of applying a partial updater patch.
- Config read or TOML parse failures default to automatic updates enabled,
  matching current safe behavior.
- No validation step modifies `app.asar`, `Info.plist`, or the application
  signature.

## Test Design

Tests are changed before production code.

- `test/runtime-launch-flow.mts` will assert that build `5488` passes the
  strict gate, does not require the legacy Plugins initial label, and retains
  fail-closed behavior for unknown builds.
- `test/suites/runtime-patch-suite.mts` will characterize the exact build-5488
  Settings function and assert setting reads, writes, app-name-aware copy,
  collision-safe locals, target reporting, valid JavaScript, and second-pass
  idempotency.
- The runtime patch suite will assert that build `5488` skips Plugins and
  GPT-5.6 compatibility targets while retaining unrelated Fast targets.
- A new updater fixture will reproduce the build-5488 inline callback,
  production-appcast guard, automatic-download trigger, and forced-install
  scheduler. It will prove the background wrapper is inserted dynamically,
  the original production condition remains present, forced scheduling is
  gated, manual update methods remain unchanged, and the generated source is
  valid JavaScript.
- Hook-source tests will assert the generated `NODE_OPTIONS` hook contains the
  build-5488 signature and replacement logic, not only the source-level helper.
- Direct extracted-bundle validation will apply the version-filtered renderer
  patcher across all JavaScript assets and require zero parse diagnostics.
- Main-process validation will require settings-schema and updater-hook matches
  with zero parse diagnostics in the extracted bundle.

## Documentation

Update the compatibility lists and build-specific conclusions in:

- `README.md`
- `README.zh-CN.md`
- `CHANGELOG.md`
- `docs/feature-scope.md`
- `docs/compatibility-matrix.md`
- `docs/patch-targets.md`
- `docs/troubleshooting.md`
- `docs/real-app-validation.md`
- `docs/bundle-notes/2026-07-17-chatgpt-app-26.715.21425-build-5488.md`

## Verification

Local completion requires fresh successful runs of:

- `corepack pnpm build`
- `corepack pnpm build:check`
- `corepack pnpm typecheck`
- `corepack pnpm check:version-drift`
- `corepack pnpm test`
- `git diff --check`
- `corepack pnpm pack --dry-run`

The extracted real bundle must confirm all required Fast and automatic-update
targets, official Plugins/GPT-5.6 filtering, valid generated JavaScript,
updater hook insertion, schema insertion, and Settings-target idempotency.

Because ChatGPT is running, the task will not terminate it and will not run a
real `codexfast launch` pass. The installed `app.asar`, `Info.plist`, and
application signature must remain unchanged after verification.

## Safety Boundaries

- Do not modify `/Applications/ChatGPT.app`.
- Do not reintroduce archive rewriting, re-signing, restore paths, or
  persistent extracted application layouts.
- Do not change the official GPT-5.6 threshold.
- Do not enable legacy Plugins targets for build `5488`.
- Do not broaden old Settings or updater signatures when dedicated exact
  shapes are sufficient.
- Do not refactor unrelated runtime patch logic.
- Do not terminate the running ChatGPT process.
- Do not commit, bump the package version, publish, tag, or create a release.
