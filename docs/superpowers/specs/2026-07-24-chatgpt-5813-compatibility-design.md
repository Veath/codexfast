# ChatGPT 5813 Compatibility Design

## Goal

Add strict runtime-launch compatibility for the locally installed
`ChatGPT.app` `26.721.30844` (`build 5813`) without changing the npm package
version or publishing a release.

## Evidence

- The installed bundle identifier is `com.openai.codex`, with
  `CFBundleShortVersionString` `26.721.30844` and `CFBundleVersion` `5813`.
- The current `0.61.0` launcher detects the exact key
  `26.721.30844+5813` and blocks it as unsupported before starting ChatGPT.
- The installed `app.asar` SHA-256 is
  `29dac6cff7bc1aa39c64b4f12c0e47b07bccd0db11767ebc94c1196389b90619`.
  The installed `Info.plist` SHA-256 is
  `3567b5c1dcce3894531eec6e96d0e4bebc3b1c7b474e20175f9d3f19d5f9cf8f`,
  and the installed application passes deep strict code-signature validation.
- Direct extraction and inspection locates existing guarded targets for
  Settings Fast, the shared service-tier allowance, request-tier allowance,
  configured-tier conversation fallback, `/fast`, Intelligence Speed, the
  automatic-update setting, and the desktop settings schema.
- Applying the existing build-5718 feature policy and target family in memory
  changes five JavaScript modules and produces exactly eight required labels:
  `Speed setting`, `Speed service tier allowance`,
  `Speed service tier request allowance`,
  `Speed service tier conversation fallback`, `Fast slash command`,
  `Composer Intelligence Speed menu`, `Disable automatic updates schema`, and
  `Disable automatic updates setting`. Every changed module parses as valid
  JavaScript.
- The active renderer targets are consolidated into
  `webview/assets/app-initial-BTphDPeq.js` and
  `webview/assets/general-settings-3znNSOBs.js`. The main-process schema copies
  are in `.vite/build/child-process-snapshot-worker.js`,
  `.vite/build/src-DfDAEPNR.js`, and `.vite/build/worker.js`.
- The callback-aware Sparkle source signature moved to
  `.vite/build/window-all-closed-BwlaNiSa.js`; the existing source-signature
  patcher still injects its automatic-update guard while preserving
  `checkForUpdates` and `installUpdatesIfAvailable`.
- GPT-5.6 and Plugins continue to use the official application paths for this
  repository's supported custom-API feature scope, matching the preceding
  supported 26.715 builds.

## Considered Approaches

1. Add only the exact build key to the existing compatibility and feature
   policy sets. This preserves fail-closed behavior and reuses signatures
   already proven against the extracted bundle. This is the selected approach.
2. Treat all `26.721.*` builds as compatible. This would reduce future edits
   but violate the repository's exact-version whitelist and could launch an
   unvalidated future bundle.
3. Add build-specific target regexes or refactor the target family. The
   existing target family already matches and parses cleanly, so additional
   signatures would increase patch risk without adding coverage.

## Code Changes

- Add `26.721.30844+5813` to `src/supported-app-versions.mts`.
- Add the exact key to the runtime sets that omit the legacy Plugins initial
  target and skip Plugins compatibility targets in
  `src/cli-runtime-launch.mts`.
- Keep the existing numeric official GPT-5.6 threshold unchanged; build 5813
  is already newer than `26.707.41301+5103` and must skip GPT-5.6 compatibility
  injection while retaining all non-GPT targets.
- Do not change patch regexes, target replacements, dependencies, or public
  launcher behavior.
- Regenerate `bin/codexfast` from the TypeScript sources.

## Test Strategy

Follow test-driven development:

1. Add build-5813 strict compatibility, missing-initial-target, official
   Plugins, and official GPT-5.6 assertions before changing production source.
2. Run the narrow regression entrypoint and confirm the new assertions fail
   because build 5813 is absent from the whitelist or runtime policy sets.
3. Make the minimal source changes and regenerate the single-file launcher.
4. Re-run the narrow tests, then run `pnpm build:check`, `pnpm typecheck`,
   `pnpm check:version-drift`, and `pnpm test`.

Apply the version-filtered renderer patcher to every JavaScript asset in the
extracted real bundle and parse each changed module. Validate the main-process
settings-schema and Sparkle interception by source signature, including the
preservation of manual update methods. Recheck the installed hashes and code
signature after validation.

## Documentation

Update `README.md`, `README.zh-CN.md`, `CHANGELOG.md`, the compatibility
matrix, feature scope, patch-target mapping, real-app validation notes, and
troubleshooting guidance. Add a build-specific bundle note with exact metadata,
hashes, target filenames, changed-label evidence, signature results, and the
manual validation boundary. Keep compatibility lists newest-first.

## Safety and Validation Boundary

The launcher remains runtime-only and fail-closed. No adaptation or validation
step may modify `app.asar`, `Info.plist`, the installed application bundle, or
its code signature. Extracted bundle contents remain temporary inspection
artifacts and are not committed.

The current agent session is hosted by the running ChatGPT application, so it
cannot fully quit that application and preserve the same session for an
interactive launch and UI click-through. Extracted-bundle validation,
regression tests, hash comparisons, and signature verification will be
completed. A fresh `codexfast launch` pass and the UI checks from
`docs/real-app-validation.md` remain an explicitly documented manual boundary.
