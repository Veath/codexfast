# ChatGPT 5718 Compatibility Design

## Goal

Add strict runtime-launch compatibility for the locally installed
`ChatGPT.app` `26.715.72359` (`build 5718`) without changing the npm package
version or publishing a release.

## Evidence

- The installed bundle reports `CFBundleShortVersionString` `26.715.72359`
  and `CFBundleVersion` `5718`.
- The current launcher blocks the exact key `26.715.72359+5718` before
  runtime launch because it is not in the strict whitelist.
- Direct extraction and inspection of the installed `app.asar` locates the
  existing guarded targets for Settings Fast, shared service-tier allowance,
  configured-tier fallback, request-tier allowance, `/fast`, Intelligence
  Speed, the automatic-update setting, and the desktop settings schema.
- The callback-aware Sparkle source signature remains in
  `.vite/build/window-all-closed-DoNbesKf.js`.
- GPT-5.6 and Plugins continue to be available through the official
  application paths, matching the preceding supported 26.715 builds.

## Approach

Use the existing 26.715 patch signatures and add only the exact build key to
the strict compatibility and runtime feature-policy sets. Do not introduce a
5718-specific target regex unless extracted-bundle validation proves an
existing matcher is insufficient. Do not replace the exact whitelist with a
version range because unknown future bundles must remain blocked.

## Code Changes

- Add `26.715.72359+5718` to `src/supported-app-versions.mts`.
- Mark the build as not requiring the legacy Plugins initial target and as
  using the official Plugins target family in `src/cli-runtime-launch.mts`.
- Keep the existing numeric official GPT-5.6 threshold behavior; add explicit
  regression coverage showing build 5718 skips compatibility injection while
  retaining non-GPT runtime patches.
- Regenerate `bin/codexfast` from TypeScript source.

## Test Strategy

Follow test-driven development:

1. Add build-5718 compatibility, missing-target, official Plugins, and
   official GPT-5.6 assertions before changing production source.
2. Run the narrow regression entrypoint and confirm it fails because build
   5718 is unsupported or not yet included in the expected policy sets.
3. Make the minimal source changes and regenerate the single-file launcher.
4. Re-run the narrow tests, then run `pnpm build:check`, `pnpm typecheck`,
   `pnpm check:version-drift`, and `pnpm test`.

Apply the version-filtered renderer patcher to every extracted JavaScript
asset from the real build and parse every changed module. Validate the
main-process settings-schema and Sparkle interception by source signature,
including preservation of manual update methods.

## Documentation

Update the compatibility matrix, feature scope, patch-target mapping, real-app
validation notes, troubleshooting guidance, both README files, and the active
CHANGELOG section. Add a build-specific note recording exact metadata, target
locations, hashes, inspection results, and validation boundaries.

## Safety and Validation Boundary

The public launcher remains runtime-only and fail-closed. No step may modify
`app.asar`, `Info.plist`, the application bundle, or its signature. Compare the
installed bundle hashes and verify the code signature before and after
validation.

The current agent session is hosted by the running ChatGPT application, so it
cannot fully quit that application and then preserve the same session for an
interactive launch smoke test. Extracted-bundle validation, regression tests,
hash checks, and signature verification will be completed; the fresh launch
and UI click-through will remain an explicitly documented manual boundary.
