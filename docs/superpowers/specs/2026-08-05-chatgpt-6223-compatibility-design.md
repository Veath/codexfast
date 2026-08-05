# ChatGPT 6223 Compatibility Design

## Goal

Add strict local runtime-launch compatibility for `/Applications/ChatGPT.app` version `26.730.61309` (`build 6223`) without changing the npm package version or publishing a release.

## Evidence

- The installed app reports bundle identifier `com.openai.codex`, version `26.730.61309`, and build `6223`.
- The installed `app.asar` SHA-256 is `9de942a9a058fca20b78d171032e0fe65ccb1063868f175ff7eb4e159efc2c38`.
- The installed `Info.plist` SHA-256 is `9bce048543fdc13905666a272b9f85dffafffa35201614ac13a27870097fca3a`.
- Deep strict code-signature validation passed before adaptation.
- The current `codexfast 0.67.0` launcher fails closed because `26.730.61309+6223` is absent from the exact compatibility whitelist.
- Read-only ASAR extraction found the renderer targets in `webview/assets/app-initial-YjNFxVhk.js` and `webview/assets/general-settings-DzOMKOoh.js`.
- Applying the build-6119 feature policy in memory changes the required renderer paths and reports all eight labels: Settings Fast, service-tier allowance, request allowance, conversation fallback, `/fast`, Intelligence Speed, automatic-update schema, and automatic-update setting.
- The desktop settings schema remains discoverable in `.vite/build/child-process-snapshot-worker.js`, `.vite/build/src-Bn_6ASpg.js`, and `.vite/build/worker.js`.
- The callback-aware automatic-update source signature remains in `.vite/build/window-all-closed-DJDXIcEI.js`; the patched result retains the manual `checkForUpdates` and `installUpdatesIfAvailable` paths.
- Every in-memory-patched renderer and main-process module has zero JavaScript parse diagnostics.
- GPT-5.6 and Plugins remain available through the official application paths for this repository's supported custom-API scope.

## Considered Approaches

1. Add only the exact build key and reuse the build-6119 policy. This preserves fail-closed behavior and is selected.
2. Add build-specific patch signatures. Existing signatures already match every required path, so this would add unnecessary matching risk.
3. Accept all `26.730.*` builds. This would admit uninspected future bundles and violate the strict compatibility policy.

## Design

- Add `26.730.61309+6223` to `src/supported-app-versions.mts`.
- Add the exact key to both official-Plugins policy sets in `src/cli-runtime-launch.mts`.
- Keep the numeric official GPT-5.6 threshold unchanged.
- Add regression coverage for strict launch admission, required-initial-target policy, official Plugins filtering, and official GPT-5.6 filtering.
- Write the compatibility regression before production changes and observe it fail for the missing whitelist and Plugins-policy entries.
- Regenerate `bin/codexfast` from TypeScript source.
- Update the English and Chinese READMEs, changelog, compatibility matrix, feature and target docs, validation and troubleshooting guidance, and add a build-specific bundle note.
- Do not change patch regexes, dependencies, package metadata, package version, public launcher behavior, or the installed application bundle.

## Error Handling and Safety

- Preserve the exact whitelist so unknown versions continue to fail before launch.
- Preserve runtime-only patching; do not modify, re-sign, unpack in place, or replace the installed bundle.
- Keep GPT-5.6 and Plugins compatibility targets filtered for build 6223 because the official application paths are used.
- Treat any missing required label, JavaScript parse diagnostic, regression failure, changed installed hash, or invalid signature as a failed adaptation.

## Validation

- Run `pnpm build:check`, `pnpm typecheck`, `pnpm check:version-drift`, `bash test/re-sign-flow.sh`, and `pnpm test`.
- Run `pnpm pack --dry-run` without publishing.
- Reapply the version-filtered patcher to the extracted bundle in memory and confirm the complete eight-label set and zero JavaScript parse diagnostics.
- Apply the main-process settings and updater helpers to extracted `.vite/build/*.js` and confirm three schema copies, one updater module, preserved manual update methods, and zero parse diagnostics.
- Recheck installed `app.asar` and `Info.plist` hashes and the deep strict application signature after repository validation.
- Inspect the generated `bin/codexfast` and final diff for version drift or unrelated changes.

## Validation Boundary

The installed ChatGPT application is running and must not be quit, restarted, or otherwise disturbed. This adaptation will not perform an interactive `codexfast launch` or UI click-through. Extracted-bundle validation, automated regressions, installed metadata hashes, and code-signature verification define the accepted validation boundary; documentation must not claim a completed live UI smoke test.
