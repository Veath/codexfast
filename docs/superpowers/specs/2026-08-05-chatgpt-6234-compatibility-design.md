# ChatGPT Build 6234 Compatibility Design

## Goal

Add exact runtime-launch compatibility for the locally installed `ChatGPT.app` `26.730.61639` (`build 6234`) while preserving the runtime-only, fail-closed launcher and leaving the installed application untouched.

## Inspected Bundle

- Bundle identifier: `com.openai.codex`
- Version key: `26.730.61639+6234`
- `app.asar` SHA-256: `3fea92820c0fb7a69473e7a8308a8e5b8e91524289a84181a33533ec6cb51d45`
- `Info.plist` SHA-256: `3174ebb256487330ddd56a263ed9700ddb458189ec502804847251072866e9ce`
- Deep strict code-signature validation passed before adaptation.
- ChatGPT is running and must not be quit, restarted, or disturbed during this work.

## Compatibility Decision

Reuse the build-6223 compatibility policy and existing patch signatures. Read-only ASAR extraction showed that applying the build-6223 policy to build 6234 produces the complete eight-label target set with zero JavaScript parse diagnostics:

- `Speed setting`
- `Speed service tier allowance`
- `Speed service tier request allowance`
- `Speed service tier conversation fallback`
- `Composer Intelligence Speed menu`
- `Fast slash command`
- `Disable automatic updates schema`
- `Disable automatic updates setting`

The matching renderer files are `webview/assets/app-initial-CKNQDTeE.js` and `webview/assets/general-settings-2iEePJwo.js`. Main-process settings schemas remain in `.vite/build/child-process-snapshot-worker.js`, `.vite/build/src-Bn_6ASpg.js`, and `.vite/build/worker.js`; the updater remains in `.vite/build/window-all-closed-DJDXIcEI.js`.

GPT-5.6 remains on the official application path through the existing numeric threshold. Plugins remains on the official application path for this repository's supported use case, so build 6234 must skip legacy Plugins targets and must not require `Plugins access` during initial interception.

## Implementation

Add `26.730.61639+6234` to the exact supported-version map and to both official-Plugins policy sets in `src/cli-runtime-launch.mts`. Do not change target regexes, replacements, runtime URL matching, package metadata, or dependencies. Regenerate `bin/codexfast` from TypeScript source.

Add regression coverage before production changes for strict launch admission, the empty legacy Plugins initial-target requirement, official Plugins filtering, and official GPT-5.6 filtering while retaining non-Plugins runtime patches.

Synchronize `README.md`, `README.zh-CN.md`, `CHANGELOG.md`, compatibility documentation, feature and target mappings, real-app validation guidance, troubleshooting guidance, and a build-specific bundle note.

## Validation Boundary

Run the full repository build, typecheck, version-drift, regression, test, and dry-run package checks. Reapply the version-filtered patcher to the extracted bundle in memory, parse every changed JavaScript module, and verify the main-process update hook still preserves manual update actions.

Finally, confirm the installed `app.asar` and `Info.plist` hashes are unchanged and deep strict code-signature validation still passes. Do not run `codexfast launch` or perform an interactive UI smoke test while ChatGPT remains running, and do not claim that boundary was completed.
