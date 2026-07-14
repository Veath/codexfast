# ChatGPT.app 26.707.72221 Compatibility Design

## Goal

Adapt `codexfast` to the locally installed `/Applications/ChatGPT.app`
`26.707.72221` build `5307` while preserving the complete supported feature
set and the runtime-only launcher. This task ends with local verification; it
does not include a commit, package version bump, npm publish, or GitHub release.

## Observed Build

- Installed app: `/Applications/ChatGPT.app`
- Bundle identifier: `com.openai.codex`
- `CFBundleShortVersionString`: `26.707.72221`
- `CFBundleVersion`: `5307`
- Compatibility key: `26.707.72221+5307`
- Current launcher result: blocked as unsupported before app startup
- Extracted bundle: `/tmp/codexfast-5307.G7k26Q/app`
- Installed bundle safety baseline:
  - `app.asar` SHA-256:
    `b5da51e5df6e996076e4cb19045cec46dd4c08cf61c19cdbc5cb426b8413b73c`
  - `Info.plist` SHA-256:
    `188e2f0273989bedb68f7057bc689787e497036f4cbb000208ef3b5d15db55f5`
  - `codesign --verify --deep --strict` succeeds

The installed application was not modified during inspection.

## Bundle Findings

Build 5307 remains in the newer `26.707` compatibility family and reuses the
existing guarded target shapes:

- Settings-side Fast and the automatic-update Settings row match
  `webview/assets/general-settings-C0l3c9YI.js`. The current
  `disable-automatic-updates-setting-26707-app-name` target recognizes the
  exact function shape, so no new Settings regex is required.
- The shared Fast service-tier allowance and configured-tier fallback remain
  guarded in
  `webview/assets/app-initial~app-main~onboarding-page-CIkoyvFz.js`.
- The request-tier helper remains guarded in
  `webview/assets/app-initial~app-main~new-thread-panel-page~onboarding-page~appgen-library-page~hotkey-windo~nrw3o0ql-CI1_Z0oj.js`.
- The `/fast` service-tier slash command and Intelligence Speed menu remain
  guarded in
  `webview/assets/app-initial~app-main~new-thread-panel-page~appgen-library-page~hotkey-window-thread-page~ho~iufn7mg3-JRP-9S5c.js`.
- GPT-5.6 continues to use the official application path. The existing numeric
  threshold beginning at `26.707.41301+5103` already skips model-list injection
  and query-selector widening for build 5307.
- Plugins continues to use the official application path. Runtime Plugins
  filtering is exact-key based, so build 5307 must be added to the existing
  no-Plugins sets.
- The active Sparkle updater remains `.vite/build/sqlite-B1YNeAip.js`.
  Existing source-signature discovery patches its automatic background check,
  automatic-download callback, and forced-install scheduler while preserving
  manual update methods.
- The desktop settings schema remains source-signature discoverable in three
  current `.vite/build` files.

Direct application of the build-filtered patch strategy produced valid
JavaScript with zero parse diagnostics for all required renderer targets. The
only production compatibility changes required are the strict build whitelist
and exact official-Plugins filtering entries.

## Chosen Approach

Use a narrow exact-build adaptation:

1. Add `26.707.72221+5307` to the strict supported-version map.
2. Add the same key to the no-legacy-Plugins-required and no-Plugins-targets
   sets.
3. Retain the existing numeric official-GPT-5.6 threshold unchanged.
4. Reuse all existing Fast, Settings, automatic-update, Plugins, and model
   target signatures unchanged.
5. Add exact regression coverage for compatibility gating, Plugins filtering,
   official GPT-5.6 filtering, and the observed build-5307 Settings shape.
6. Update compatibility documentation and add a build-specific bundle note.
7. Regenerate `bin/codexfast` from TypeScript source.
8. Stop after local verification without committing or releasing.

## Alternatives Rejected

### Whitelist only

Adding build 5307 only to `src/supported-app-versions.mts` would allow launch
but would leave the exact key outside the Plugins skip sets. The launcher would
then patch official Plugins catalog and app-connect paths unnecessarily.

### Range-based compatibility

Automatically supporting all later `26.707` builds would weaken the strict
version-plus-build policy. Future bundles must remain blocked until their real
targets have been inspected.

### New target regexes

The real build already matches the current Fast, Settings, request, fallback,
slash-command, Speed-menu, updater, and schema signatures. Adding duplicate
target variants would increase interception risk without fixing an observed
mismatch.

## Test Design

Tests will be changed before production code.

### Failing compatibility and filtering tests

`test/runtime-launch-flow.mts` and
`test/suites/runtime-patch-suite.mts` will first assert that:

- `26.707.72221+5307` passes the strict compatibility gate;
- build 5307 does not require the legacy `Plugins access` initial label;
- build 5307 skips all Plugins targets while retaining unrelated Fast targets;
- build 5307 skips `gpt5x-model-list-options` and
  `gpt56-model-query-selector` through the existing numeric threshold.

The compatibility and Plugins assertions must fail against the current source
before production changes are made.

### Settings characterization

Regression coverage will include the observed build-5307 Settings function
shape and verify that the existing target:

- reads and writes `disableAutomaticUpdates` through the desktop settings
  namespace;
- preserves app-name-aware Prevent Sleep copy;
- uses collision-safe `codexfast` replacement locals;
- produces valid JavaScript;
- reports `Disable automatic updates setting`;
- is byte-for-byte stable when applied a second time.

This characterizes an already matching target and does not require a new
production signature.

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
- `docs/bundle-notes/2026-07-14-chatgpt-app-26.707.72221-build-5307.md`

Documentation will state that build 5307 uses official GPT-5.6 and Plugins
paths, uses the global configured Settings tier for existing conversations,
reuses the app-name Settings target, and keeps source-signature-driven
automatic-update suppression.

## Verification

The implementation is locally complete only after fresh successful runs of:

- `corepack pnpm build`
- `corepack pnpm build:check`
- `corepack pnpm typecheck`
- `corepack pnpm check:version-drift`
- `corepack pnpm test`
- `git diff --check`
- `corepack pnpm pack --dry-run`

Direct checks against the extracted build must confirm the required Fast and
automatic-update renderer labels, official Plugins/GPT-5.6 filtering, valid
patched JavaScript, updater hook insertion, and settings-schema insertion.

The installed `app.asar` and `Info.plist` hashes and application signature must
match the recorded baseline after verification. Because ChatGPT is currently
running, the task will not terminate it. A real `node bin/codexfast launch`
pass will be skipped unless the application is already fully quit before the
final verification stage; this limitation will be reported explicitly.

## Safety and Scope Boundaries

- Do not modify `/Applications/ChatGPT.app`.
- Do not reintroduce archive rewriting, re-signing, restore paths, or persistent
  extracted application layouts.
- Do not change the official GPT-5.6 threshold.
- Do not enable legacy Plugins targets for build 5307.
- Do not add a patch signature without a real bundle mismatch.
- Do not refactor unrelated runtime patch logic.
- Do not commit, bump the package version, publish, tag, or create a release.
