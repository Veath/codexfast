# ChatGPT 6119 Compatibility Design

## Goal

Add strict local runtime-launch compatibility for `/Applications/ChatGPT.app` version `26.727.51351` (`build 6119`) without changing npm package version `0.66.0` or publishing a release.

## Evidence

- The installed app reports bundle identifier `com.openai.codex`, version `26.727.51351`, and build `6119`.
- Deep code-signature metadata identifies the signed application as OpenAI team `2DC432GLL2` before adaptation.
- The installed `app.asar` SHA-256 is `a529edd72e10b08931c0d695b5e3e6a0be7f51874610dafc04f578436ab7d74d`; the installed `Info.plist` SHA-256 is `eb794f1980b153a5f91ed80a91bbfcfffa2d374fda7bcfa7ce4c82a327427215`.
- The current `codexfast 0.66.0` launcher fails closed before watcher cleanup, runtime interception, or application launch because `26.727.51351+6119` is absent from the exact compatibility whitelist.
- Read-only ASAR extraction found the active renderer targets in `webview/assets/app-initial-iBPGfcXU.js` and `webview/assets/general-settings-BBCiVbba.js`.
- Applying the build-6067 feature policy in memory changes those two renderer modules and reports all eight required labels: Settings Fast, service-tier allowance, request allowance, conversation fallback, `/fast`, Intelligence Speed, automatic-update schema, and automatic-update setting.
- The desktop settings schema remains discoverable in `.vite/build/child-process-snapshot-worker.js`, `.vite/build/src-CLstCQVF.js`, and `.vite/build/worker.js`.
- The callback-aware automatic-update source signature remains in `.vite/build/window-all-closed-Coc41Tfs.js`; the patched result preserves manual `checkForUpdates` and `installUpdatesIfAvailable` paths.
- Every in-memory-patched renderer and main-process module has zero JavaScript parse diagnostics.
- GPT-5.6 remains above the official-support threshold. Plugins continue to use the same official application policy as build 6067, so legacy GPT-5.6 and Plugins compatibility targets must remain filtered.

## Considered Approaches

1. Add only the exact build key and reuse the build-6067 policy. This preserves fail-closed behavior and is selected.
2. Add build-specific patch signatures. Existing signatures already match all required paths and produce parseable output, so this would add unnecessary matching risk.
3. Accept all `26.727.*` builds. This would admit uninspected future bundles and violate the strict compatibility policy.

## Design

- Add `26.727.51351+6119` to `src/supported-app-versions.mts`.
- Add the exact key to both official-Plugins policy sets in `src/cli-runtime-launch.mts`.
- Keep the numeric official GPT-5.6 threshold unchanged.
- Add regression coverage for strict launch admission, required-initial-target policy, official Plugins filtering, and official GPT-5.6 filtering.
- Write the compatibility regression before production changes and observe it fail for the missing whitelist and Plugins-policy entries.
- Regenerate `bin/codexfast` from TypeScript source.
- Update the English and Chinese READMEs, changelog, compatibility matrix, feature and target docs, validation and troubleshooting guidance, and add a build-specific bundle note.
- Do not change patch regexes, dependencies, package metadata, package version, public launcher behavior, or the installed application bundle.

## Validation

- Run `pnpm build:check`, `pnpm typecheck`, `pnpm check:version-drift`, `bash test/re-sign-flow.sh`, and `pnpm test`.
- Run `pnpm pack --dry-run` without publishing.
- Reapply the version-filtered patcher to the extracted bundle in memory and confirm two changed renderer modules, all eight required labels, four changed main-process modules, and zero parse diagnostics.
- Confirm the updater patch still preserves manual update-check and install methods.
- Recheck installed `app.asar` and `Info.plist` hashes and the deep strict application signature after repository validation.
- Inspect the generated `bin/codexfast` and final repository diff for version drift or unrelated changes.

## Validation Boundary

The installed ChatGPT application remains running and will not be forcibly quit for an interactive `codexfast launch` or UI click-through. Extracted-bundle validation, automated regressions, installed metadata hashes, and code-signature verification define this adaptation's non-interactive validation boundary. The manual checklist in `docs/real-app-validation.md` remains required before claiming a completed live UI smoke test.
