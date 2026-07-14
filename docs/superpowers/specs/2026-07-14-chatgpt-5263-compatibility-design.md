# ChatGPT.app 26.707.71524 Compatibility and Release Design

## Goal

Adapt `codexfast` to the locally installed `/Applications/ChatGPT.app`
`26.707.71524` build `5263`, preserve the complete supported feature set and
runtime-only launcher, then commit and publish the result as `codexfast`
`0.52.0`.

## Observed Build

- Installed app: `/Applications/ChatGPT.app`
- Bundle identifier: `com.openai.codex`
- `CFBundleShortVersionString`: `26.707.71524`
- `CFBundleVersion`: `5263`
- Compatibility key: `26.707.71524+5263`
- Current launcher result: blocked as unsupported before app startup
- Extracted bundle: a temporary copy of the installed `app.asar`
- Installed bundle safety baseline:
  - `app.asar` SHA-256:
    `d28f31b4bbb04c519be65c2af8277d8c5faf77b4239ee89b928f0a7423dacd84`
  - `Info.plist` SHA-256:
    `1d8ab7635e7429a967147502f9978d6b75a72e1e668c123764cb8750154b892a`
  - `codesign --verify --deep --strict` succeeds

The installed application was not modified during inspection.

## Bundle Findings

Build 5263 remains in the newer `26.707` compatibility family and reuses the
existing guarded target shapes:

- Settings-side Fast and the automatic-update Settings row match
  `webview/assets/general-settings-B9im2sCE.js`. The current
  `disable-automatic-updates-setting-26707-platform-locals` target recognizes
  the exact function shape, so no new Settings regex is required.
- The shared Fast service-tier allowance and global configured-tier fallback
  remain guarded in
  `webview/assets/app-initial~app-main~onboarding-page-qmFVRsFx.js`.
- The request-tier helper remains guarded in
  `webview/assets/app-initial~app-main~onboarding-page~hotkey-window-thread-page~quick-chat-window-page~chatg~gwqc41kz-CnQKtQ6U.js`.
- The `/fast` service-tier slash command and Intelligence Speed menu remain
  guarded in
  `webview/assets/app-initial~app-main~new-thread-panel-page~appgen-library-page~hotkey-window-thread-page~ho~iufn7mg3-BWgIh_w6.js`.
- GPT-5.6 continues to use the official application path. The existing numeric
  threshold beginning at `26.707.41301+5103` already skips model-list injection
  and query-selector widening for build 5263.
- Plugins continues to use the official application path. The current runtime
  filtering is exact-key based, so build 5263 would still apply legacy Plugins
  catalog and app-connect targets unless the new compatibility key is added to
  the Plugins skip set.
- The active Sparkle updater is `.vite/build/sqlite-B1YNeAip.js`. Existing
  source-signature discovery patches its automatic background check,
  automatic-download callback, and forced-install scheduler while preserving
  manual `checkForUpdates` and `installUpdatesIfAvailable` methods.
- The desktop settings schema remains source-signature discoverable in the
  current `.vite/build` output.

Direct application of the current patch engine produced syntactically valid
renderer output for the Fast and automatic-update targets. The only required
runtime compatibility change found during inspection is exact build handling:
strict support plus official Plugins filtering.

## Chosen Approach

Use a narrow exact-build adaptation.

The implementation will:

1. Add `26.707.71524+5263` to the strict supported-version map.
2. Add the same key to both the no-legacy-Plugins-required set and the
   no-Plugins-targets set.
3. Retain the existing numeric official-GPT-5.6 threshold without adding a new
   build-specific GPT matcher or set entry.
4. Reuse the existing Fast, Settings, automatic-update, and model target
   signatures unchanged.
5. Add exact regression coverage for compatibility gating, Plugins filtering,
   official GPT-5.6 filtering, and the observed build-5263 Settings shape.
6. Update the compatibility documentation and add a build-specific bundle
   note.
7. Regenerate `bin/codexfast` from TypeScript source.
8. Commit the compatibility change, prepare release `0.52.0`, publish it to
   npm, and create the matching GitHub release.

## Alternatives Rejected

### Whitelist only

Adding build 5263 only to `src/supported-app-versions.mts` would allow launch
but would leave the new exact key outside the Plugins skip set. The launcher
would then patch official Plugins catalog and app-connect paths, which is not
the supported behavior for the current `26.707` family.

### Range-based Plugins filtering

Automatically treating every later `26.707` build as an official Plugins build
would reduce maintenance, but it would weaken the repository's strict
version-plus-build validation model. A future build could reintroduce a gate or
change the supported path without being inspected.

### New target regexes

The real build already matches the current guarded Fast, Settings, request,
fallback, slash-command, Speed-menu, updater, and schema signatures. Adding
duplicate target variants would increase interception risk without addressing
an observed mismatch.

## Test Design

Tests will be changed before production code.

### Failing compatibility and filtering tests

`test/runtime-launch-flow.mts` and
`test/suites/runtime-patch-suite.mts` will first assert that:

- `26.707.71524+5263` passes the strict compatibility gate;
- build 5263 does not require the legacy `Plugins access` initial label;
- build 5263 skips every Plugins target while retaining unrelated Fast and
  update targets;
- build 5263 skips `gpt5x-model-list-options` and
  `gpt56-model-query-selector` through the existing official-GPT-5.6 threshold.

Against the current source, the compatibility assertion and Plugins filtering
assertion must fail before production changes are made.

### Existing target characterization

Regression coverage will include the observed build-5263 Settings function
shape and verify that the existing target:

- reads and writes `disableAutomaticUpdates` through the desktop settings
  namespace;
- preserves app-name-aware Prevent Sleep copy;
- uses collision-safe `codexfast` replacement locals;
- produces valid JavaScript;
- reports `Disable automatic updates setting`;
- remains byte-for-byte stable on a second application to that Settings
  function.

This is characterization coverage for an already matching signature, not a
reason to add a new production target.

### Real extracted bundle

After the source changes, direct bundle verification will confirm:

- the Settings Fast and automatic-update row patch in
  `general-settings-B9im2sCE.js`;
- the shared Fast allowance and configured-tier fallback patch in
  `app-initial~app-main~onboarding-page-qmFVRsFx.js`;
- the request-tier helper patch in the `gwqc41kz` chunk;
- the `/fast` and Intelligence Speed patches in the `iufn7mg3` chunk;
- Plugins and GPT-5.6 compatibility targets are omitted by build-specific
  runtime filtering;
- `.vite/build/sqlite-B1YNeAip.js` receives the automatic-update hook while
  manual update methods remain available;
- the real desktop settings schema source receives
  `disableAutomaticUpdates`;
- patched renderer output parses successfully.

## Documentation Changes

The compatibility update will be recorded in:

- `README.md`
- `README.zh-CN.md`
- `CHANGELOG.md`
- `docs/feature-scope.md`
- `docs/compatibility-matrix.md`
- `docs/patch-targets.md`
- `docs/troubleshooting.md`
- `docs/real-app-validation.md`
- `docs/bundle-notes/2026-07-14-chatgpt-app-26.707.71524-build-5263.md`

Documentation will state that build 5263 uses official GPT-5.6 and Plugins
paths, retains the configured Settings tier as the source of truth for existing
`26.707` conversations, reuses the platform-locals Settings target, and keeps
the source-signature-driven automatic-update hook.

## Verification

The compatibility implementation is complete only after fresh successful runs
of:

- `pnpm build`
- `pnpm build:check`
- `pnpm typecheck`
- `pnpm check:version-drift`
- `pnpm test`
- `git diff --check`
- `pnpm pack --dry-run`

Real-bundle checks will run separately against the extracted build-5263 assets.

If no exact `Codex` or `ChatGPT` application process is active, a real
`node bin/codexfast launch` pass will verify runtime interception. The launch
must report build 5263 as supported, avoid Plugins and GPT-5.6 compatibility
targets, and leave `app.asar`, `Info.plist`, and the application signature
unchanged.

If the application is active and a real launch would interrupt the user's
session, validation will stop at the full automated suite, direct real-bundle
patch proof, immutable file hashes, and signature verification. That limitation
will be stated explicitly before release.

## Commit and Release Flow

After compatibility verification:

1. Commit the focused compatibility implementation using Conventional Commit
   format.
2. Confirm npm and GitHub do not already contain `0.52.0` / `v0.52.0`.
3. Move the unreleased changelog entries into a dated `0.52.0` section and bump
   `package.json`.
4. Regenerate `bin/codexfast` and rerun the full release verification gate.
5. Commit `chore: release 0.52.0`.
6. Push `main` and tag `v0.52.0`.
7. Publish `codexfast@0.52.0` to the official npm registry.
8. Create and verify the GitHub release.
9. Verify npm `latest`, the remote tag and release, and a package invocation
   from outside the repository.

## Safety and Scope Boundaries

- Do not modify `/Applications/ChatGPT.app`.
- Do not reintroduce archive rewriting, re-signing, restore paths, or persistent
  extracted application layouts.
- Do not change the official GPT-5.6 threshold.
- Do not enable legacy Plugins targets for build 5263.
- Do not add a new patch signature without a real bundle mismatch.
- Do not refactor unrelated runtime patch logic.
- Do not publish until compatibility and release verification both pass.
