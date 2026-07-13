# ChatGPT.app 26.707.61608 Compatibility Design

## Goal

Adapt `codexfast` to the locally installed `/Applications/ChatGPT.app`
`26.707.61608` build `5200` while preserving the complete supported feature
set, the strict exact-build compatibility gate, and the runtime-only launcher.

This change covers local compatibility and verification only. It does not
include a release, package-version bump, tag, publish, or compatibility commit.

## Observed Build

- Installed app: `/Applications/ChatGPT.app`
- Bundle identifier: `com.openai.codex`
- `CFBundleShortVersionString`: `26.707.61608`
- `CFBundleVersion`: `5200`
- Compatibility key: `26.707.61608+5200`
- Current launcher result: blocked as unsupported before app startup
- Extracted bundle used for inspection: a temporary copy of the installed
  `app.asar`; the installed application was not modified

## Bundle Findings

The build remains in the newer `26.707` compatibility family:

- Settings-side Fast has a guarded target in
  `webview/assets/general-settings-CD58xyBw.js`.
- The shared Fast service-tier allowance and configured-tier fallback targets
  remain guarded in `webview/assets/app-initial~app-main~onboarding-page-*.js`.
- The request-tier helper target remains guarded in the newer shared
  `app-initial~app-main~pull-request-code-review~...js` chunk.
- The `/fast` service-tier slash command and Intelligence Speed control remain
  guarded in `webview/assets/app-initial~app-main~page-CMpPiY3-.js`.
- GPT-5.6 model-list and query-selector signatures are still present, but this
  build is newer than the official GPT-5.6 threshold
  `26.707.41301+5103`; runtime version filtering must continue to skip those
  compatibility targets.
- The legacy Plugins access targets remain absent. Plugins continues to use the
  official application path, so every Plugins runtime target must be skipped.
- The desktop settings schema remains discoverable by source signature.
- The active Sparkle updater moved to `.vite/build/sqlite-WcOhlxIC.js`, but the
  current source-signature discovery still matches its automatic background
  check, automatic-download callback, and forced-install scheduler shapes.

The confirmed target drift is the Settings > General renderer row used to add
`Disable automatic updates`. The build-5200 function keeps the same behavior
and copy as build 5103 but shifts the minified row locals from the previously
recognized layouts. Existing targets see the stable description needle but do
not recognize the complete guarded signature, so a whitelist-only change would
leave the visible setting unavailable.

## Chosen Approach

Add exact build-5200 compatibility plus one narrow Settings signature variant.

The implementation will:

1. Add `26.707.61608+5200` to the strict supported-version map.
2. Add the same key to the no-legacy-Plugins-required and no-Plugins-targets
   runtime sets.
3. Continue using the existing numeric official-GPT-5.6 threshold. No new model
   injection or selector widening will be added for build 5200.
4. Add a dedicated Settings target for the observed build-5200 local-variable
   layout, reusing the existing collision-safe replacement with
   `codexfast`-prefixed locals.
5. Keep the content-driven main-process automatic-update hook unchanged unless
   a direct patch application against `sqlite-WcOhlxIC.js` disproves the
   current signature match.
6. Regenerate `bin/codexfast` from TypeScript source.

The Settings matcher will stay anchored to the complete Prevent Sleep row
shape, including the settings state, platform hook, internationalization hook,
settings read/write calls, row component, and toggle component. It will not be
replaced with a broad description-only or filename-only mutation.

## Alternatives Rejected

### Whitelist only

Adding build 5200 only to the supported-version map would make launch proceed,
but the inspected Settings row is currently needle-only. This would ship a
partial compatibility result in which automatic-update suppression exists in
the main process but its Settings control is missing.

### Broad generic `26.707` Settings regex

A matcher that accepts arbitrary local ordering would reduce the number of
bundle-specific variants, but it would also increase the chance of replacing a
similar function with different semantics. Settings replacements have caused
real minified-local collisions before, so the new matcher should describe the
observed layout precisely.

### Re-enable GPT-5.6 or Plugins compatibility patches

The bundle contains old-compatible needles for some of these paths, but both
features use official application behavior in this build. Applying the legacy
targets would duplicate or override official behavior and is outside the
supported design.

## Test Design

Tests will be added before production changes.

### Strict compatibility and runtime filtering

`test/runtime-launch-flow.mts` will cover:

- build `26.707.61608+5200` initially failing the strict support gate;
- the supported fixture proceeding past compatibility after implementation;
- build 5200 not requiring the legacy `Plugins access` initial label;
- runtime filtering skipping all Plugins targets;
- runtime filtering skipping `gpt5x-model-list-options` and
  `gpt56-model-query-selector` while retaining unrelated Fast and update
  targets.

### Settings signature

`test/suites/runtime-patch-suite.mts` will include the exact build-5200 Prevent
Sleep function shape extracted from `general-settings-CD58xyBw.js`. It will
assert that:

- `disableAutomaticUpdates` is read from the desktop settings namespace;
- changes are persisted through the correct settings writer;
- the app-name-aware Prevent Sleep copy is preserved;
- the generated replacement uses collision-safe `codexfast` locals;
- the replacement reports `Disable automatic updates setting`;
- the result parses as JavaScript;
- a second patch pass is byte-for-byte idempotent.

The new test must fail against the current source because no existing Settings
target recognizes the shifted local layout.

### Real extracted bundle

After the source test passes, the runtime patch engine will be applied directly
to the extracted build-5200 assets. Verification will confirm:

- guarded Fast targets patch successfully;
- the new Settings target patches `general-settings-CD58xyBw.js`;
- patched renderer output parses and remains idempotent;
- Plugins and GPT-5.6 compatibility targets are removed by build-specific
  runtime filtering;
- `patchMainProcessAutomaticUpdateSource` patches
  `.vite/build/sqlite-WcOhlxIC.js` and preserves manual update methods;
- `patchMainProcessSettingsSchemaSource` patches the real schema source.

## Documentation Changes

The compatibility update will be recorded in:

- `README.md`
- `README.zh-CN.md`
- `CHANGELOG.md` under the active unreleased section
- `docs/feature-scope.md`
- `docs/compatibility-matrix.md`
- `docs/patch-targets.md`
- `docs/troubleshooting.md`
- `docs/real-app-validation.md`
- a new build note under `docs/bundle-notes/`

Documentation will state that build 5200 uses official GPT-5.6 and Plugins
paths, retains the global Settings tier rule for existing `26.707`
conversations, and uses a new Settings renderer signature while the automatic
update main-process hook remains source-signature driven.

## Verification

The implementation is complete only after fresh successful runs of:

- `pnpm build`
- `pnpm build:check`
- `pnpm typecheck`
- `pnpm check:version-drift`
- `pnpm test`
- `git diff --check`

The extracted real bundle will be checked separately as described above.

If no exact `Codex` or `ChatGPT` application process is running, a real
`node bin/codexfast launch` pass may be performed. It must report the detected
build as supported, complete required runtime interception without reporting
Plugins or GPT-5.6 compatibility targets, and leave `app.asar`, `Info.plist`,
and the application signature unchanged. The launched validation process will
be closed cleanly after evidence is collected.

If a real launch could interrupt an active user session, validation will stop
at regression tests, direct extracted-bundle patch proof, immutable file
metadata checks, and `codesign` verification, with that limitation reported
explicitly.

## Safety and Scope Boundaries

- Do not modify `/Applications/ChatGPT.app`.
- Do not reintroduce archive rewriting, re-signing, restore paths, or persistent
  extracted application layouts.
- Do not change the official GPT-5.6 threshold.
- Do not enable any legacy Plugins target for build 5200.
- Do not refactor unrelated patch targets.
- Do not bump the package version, commit, tag, publish, or create a release in
  this task.
