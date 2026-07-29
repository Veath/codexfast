# ChatGPT 5973 Compatibility Design

## Goal

Add strict local runtime-launch compatibility for `/Applications/ChatGPT.app` version `26.721.81911` (`build 5973`) without changing the npm package version or publishing a release.

## Evidence

- The installed app reports bundle identifier `com.openai.codex`, version `26.721.81911`, and build `5973`.
- Deep strict code-signature validation passes before adaptation.
- The current `codexfast 0.64.0` launcher fails closed only because `26.721.81911+5973` is absent from the exact compatibility whitelist.
- Read-only extraction found the active renderer targets in `webview/assets/app-initial-CRKqnyc3.js` and `webview/assets/general-settings-CcPMYysK.js`.
- Applying the build-5848 feature policy in memory changes five JavaScript modules and reports all eight required labels: Settings Fast, service-tier allowance, request allowance, conversation fallback, `/fast`, Intelligence Speed, automatic-update schema, and automatic-update setting.
- Every changed renderer and main-process module parses as valid JavaScript.
- The callback-aware automatic-update source signature remains in `.vite/build/window-all-closed-a9FCmS92.js` and preserves manual update methods.
- GPT-5.6 and Plugins continue to expose official application paths, so their legacy compatibility targets must remain filtered.

## Considered Approaches

1. Add only the exact build key and reuse the build-5848 policy. This preserves fail-closed behavior and is selected.
2. Accept all `26.721.*` builds. This would admit uninspected future bundles and violate the strict compatibility policy.
3. Add build-specific patch signatures. Existing signatures already match and produce parseable output, so this would add unnecessary risk.

## Design

- Add `26.721.81911+5973` to `src/supported-app-versions.mts`.
- Add the exact key to both official-Plugins policy sets in `src/cli-runtime-launch.mts`.
- Keep the numeric official GPT-5.6 threshold unchanged.
- Add regression coverage for strict launch admission, required-initial-target policy, official Plugins filtering, and official GPT-5.6 filtering.
- Regenerate `bin/codexfast` from TypeScript source.
- Update the English and Chinese READMEs, changelog, compatibility matrix, feature and target docs, validation and troubleshooting guidance, and add a build-specific bundle note.
- Do not change patch regexes, dependencies, package metadata, package version, or public launcher behavior.

## Validation Boundary

Run the repository build, type, drift, and regression suites; reapply the version-filtered patcher to the extracted bundle; parse every changed JavaScript module; and recheck installed metadata, hashes, and signature. Because ChatGPT is currently running and hosts the active session, do not forcibly quit it for an interactive runtime-launch smoke test. Record that UI click-through remains manual.
