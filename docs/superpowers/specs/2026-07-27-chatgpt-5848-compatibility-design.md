# ChatGPT 5848 Compatibility Design

## Goal

Add strict runtime-launch compatibility for the locally installed
`ChatGPT.app` `26.721.41059` (`build 5848`) without changing the npm package
version or publishing a release.

## Evidence

- The installed bundle identifier is `com.openai.codex`, with
  `CFBundleShortVersionString` `26.721.41059` and `CFBundleVersion` `5848`.
- The current `0.63.0` launcher does not whitelist the exact key
  `26.721.41059+5848`, so it blocks the build before runtime launch.
- Direct extraction and inspection found the guarded Settings Fast, shared
  service-tier allowance, request-tier allowance, configured-tier conversation
  fallback, `/fast`, Intelligence Speed, automatic-update Settings row, and
  desktop settings schema targets.
- Applying the build-5828 feature policy and target family in memory to the
  extracted build-5848 bundle changed five JavaScript modules and produced the
  eight required labels: `Speed setting`, `Speed service tier allowance`,
  `Speed service tier request allowance`,
  `Speed service tier conversation fallback`, `Fast slash command`,
  `Composer Intelligence Speed menu`, `Disable automatic updates schema`, and
  `Disable automatic updates setting`. Every changed module parsed as valid
  JavaScript.
- The active renderer targets are in
  `webview/assets/app-initial-BHB6SClA.js` and
  `webview/assets/general-settings-D7HslvR1.js`. Main-process schema copies are
  in `.vite/build/child-process-snapshot-worker.js`,
  `.vite/build/src-BPbHdvxe.js`, and `.vite/build/worker.js`.
- The callback-aware Sparkle source signature moved to
  `.vite/build/window-all-closed-a9FCmS92.js`. The existing source-signature
  patch injects the automatic-update guard while retaining
  `checkForUpdates` and `installUpdatesIfAvailable` for manual actions.
- GPT-5.6 and Plugins continue to use the official application paths for this
  repository's supported custom-API feature scope, matching build 5828.
- The installed application passed deep strict code-signature validation before
  adaptation work, and no installed bundle file was written during inspection.

## Considered Approaches

1. Add only the exact build key to the existing compatibility and feature
   policy sets. This preserves fail-closed behavior and reuses signatures
   validated against the extracted bundle. This is the selected approach.
2. Treat every `26.721.*` build as compatible. This would reduce future edits
   but violate the repository's exact whitelist and could launch an unvalidated
   future bundle.
3. Add build-specific patch regexes. The existing target family already
   matches and produces parseable output, so new regexes would increase risk
   without adding compatibility.

## Code Changes

- Add `26.721.41059+5848` to `src/supported-app-versions.mts`.
- Add the exact key to the runtime sets that omit the legacy Plugins initial
  target and skip Plugins compatibility targets in
  `src/cli-runtime-launch.mts`.
- Keep the numeric official GPT-5.6 threshold unchanged. Build 5848 is newer
  than `26.707.41301+5103`, so it must use the official model list and selector
  after the exact whitelist admits it.
- Do not change patch regexes, replacements, dependencies, package metadata,
  package version, or public launcher behavior.
- Regenerate `bin/codexfast` from the TypeScript sources.

## Test Strategy

Follow test-driven development:

1. Add failing build-5848 assertions for strict compatibility, required initial
   targets, official Plugins behavior, and official GPT-5.6 behavior.
2. Run the narrow regression and confirm failure is caused by the missing
   build-5848 production entries.
3. Add the minimal production entries and regenerate the single-file launcher.
4. Re-run the narrow regression, then run `pnpm build:check`,
   `pnpm typecheck`, `pnpm check:version-drift`, and `pnpm test`.

Apply the version-filtered patcher in memory to the extracted real bundle and
parse every changed JavaScript module. Validate main-process settings-schema
and Sparkle interception by source signature, including preservation of manual
update methods. Recheck installed bundle metadata and the deep strict code
signature after validation.

## Documentation

Update `README.md`, `README.zh-CN.md`, `CHANGELOG.md`, the compatibility matrix,
feature scope, patch-target mapping, real-app validation guidance, and
troubleshooting guidance. Add a bundle note recording exact metadata, active
target filenames, changed-label evidence, signature results, and the manual
validation boundary. Keep compatibility lists newest-first.

## Safety and Validation Boundary

The launcher remains runtime-only and fail-closed. No adaptation or validation
step may modify `app.asar`, `Info.plist`, the installed application bundle, or
its code signature. Extracted bundle contents remain temporary inspection
artifacts and are not committed.

The running ChatGPT application hosts the current agent session, so this work
will not forcibly quit it for an interactive runtime-launch smoke test. The
implementation will complete extracted-bundle validation, regression tests,
metadata checks, and signature verification. A fresh `codexfast launch` pass
and UI click-through from `docs/real-app-validation.md` remain an explicitly
documented manual boundary.
