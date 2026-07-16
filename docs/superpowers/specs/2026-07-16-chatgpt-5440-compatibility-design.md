# ChatGPT.app 26.707.91948 Compatibility Design

## Goal

Adapt `codexfast` to the locally installed `/Applications/ChatGPT.app`
`26.707.91948` build `5440` while preserving the complete supported feature
set and the runtime-only launcher. The task ends with local verification and
does not include a commit, package version bump, publish, tag, or release.

## Observed Build

- Installed app: `/Applications/ChatGPT.app`
- Bundle identifier: `com.openai.codex`
- `CFBundleShortVersionString`: `26.707.91948`
- `CFBundleVersion`: `5440`
- Compatibility key: `26.707.91948+5440`
- Installed application state: running during inspection
- Extracted bundle: `/tmp/codexfast-5440.Te9eCq/app`
- `app.asar` SHA-256:
  `85b11c8d93d377f82161ba9b7b1af6f95b2a0490f01993dbc4d3a107dce77591`
- `Info.plist` SHA-256:
  `924d45e359a67f3be396a0933b7553c6f3ae3ee5b858fe46fa2ac6f8f69a1065`
- `codesign --verify --deep --strict` succeeds

The installed application was not modified during inspection.

## Bundle Findings

Build `5440` remains in the newer `26.707` compatibility family.

- Settings Fast is guarded in
  `webview/assets/general-settings-DMO9G9gL.js` and matches the existing
  destructured option-count target.
- The shared Fast allowance and configured-tier fallback are guarded in
  `webview/assets/app-initial~app-main~quick-chat-window-page~chatgpt-conversation-page-Bv7yLYDT.js`.
- The request-tier helper is guarded in the `jgoqfqy2` shared chunk.
- The `/fast` service-tier slash command and Intelligence Speed menu are
  guarded in the `iufn7mg3` shared chunk.
- Applying the build-5307 filtered runtime strategy to the extracted bundle
  patches every required Fast renderer target with zero JavaScript parse
  diagnostics.
- GPT-5.6 continues to use the official application path because this build
  is newer than the `26.707.41301+5103` threshold.
- Plugins continues to use the official application path for this supported
  build family, so runtime launch must skip all Plugins targets and must not
  require the legacy `Plugins access` initial label.
- The automatic-update Settings row moved to a new minified local-variable
  shape in `general-settings-DMO9G9gL.js`. It matches the prior app-name-aware
  function except that the final cached row variable is `f` instead of `d`.
  Existing target signatures therefore see only the stable needle and do not
  inject the UI row.
- The desktop settings schema still matches in current `.vite/build` chunks.
- The Sparkle updater remains source-signature compatible in
  `.vite/build/sqlite-B1YNeAip.js`. The current background-check,
  automatic-download, and forced-install patches produce valid JavaScript and
  preserve manual update actions.

## Chosen Approach

Use a narrow exact-build adaptation:

1. Add `26.707.91948+5440` to the strict supported-version map.
2. Add the same key to the no-legacy-Plugins-required and no-Plugins-targets
   sets.
3. Keep the numeric official-GPT-5.6 threshold unchanged.
4. Add a dedicated Settings target for the observed build-5440 row-local
   shape and reuse the existing app-name-aware replacement.
5. Leave all existing target signatures unchanged.
6. Add exact regression coverage before production changes.
7. Update compatibility documentation and add a build-specific bundle note.
8. Regenerate `bin/codexfast` from TypeScript source.
9. Stop after local verification without committing or releasing.

## Alternatives Rejected

### Generalize the existing 26.707 Settings signature

Capturing any final row-local name would reduce target duplication, but it
would broaden a high-risk signature for every previously supported matching
bundle. A dedicated target keeps the compatibility change surgical.

### Whitelist only

Adding build `5440` only to the supported-version map would allow launch but
would not inject the `Disable automatic updates` row and would leave official
Plugins paths subject to unnecessary compatibility patches.

### Range-based compatibility

Automatically supporting later `26.707` builds would weaken the repository's
strict version-plus-build policy. Unknown future builds remain blocked until
their real bundles are inspected.

## Test Design

Tests are changed before production code.

- `test/runtime-launch-flow.mts` will assert that build `5440` passes the
  strict gate, does not require the legacy Plugins initial label, and retains
  fail-closed behavior for unknown builds.
- `test/suites/runtime-patch-suite.mts` will characterize the exact build-5440
  Settings function and assert setting reads, writes, app-name copy,
  collision-safe locals, target reporting, valid JavaScript, and second-pass
  idempotency.
- The runtime patch suite will assert that build `5440` skips Plugins and
  GPT-5.6 compatibility targets while retaining unrelated Fast targets.
- Direct extracted-bundle validation will apply the version-filtered patcher
  once across all JavaScript assets and require zero parse diagnostics. The
  exact build-5440 Settings renderer target must also be byte-for-byte stable
  on a second application.
- Main-process validation will require schema and updater hook matches with
  zero parse diagnostics.

## Documentation

Update the compatibility lists and build-specific conclusions in:

- `README.md`
- `README.zh-CN.md`
- `CHANGELOG.md`
- `docs/feature-scope.md`
- `docs/compatibility-matrix.md`
- `docs/patch-targets.md`
- `docs/troubleshooting.md`
- `docs/real-app-validation.md`
- `docs/bundle-notes/2026-07-16-chatgpt-app-26.707.91948-build-5440.md`

## Verification

Local completion requires fresh successful runs of:

- `corepack pnpm build`
- `corepack pnpm build:check`
- `corepack pnpm typecheck`
- `corepack pnpm check:version-drift`
- `corepack pnpm test`
- `git diff --check`
- `corepack pnpm pack --dry-run`

The extracted real bundle must confirm all required Fast and automatic-update
targets, official Plugins/GPT-5.6 filtering, valid generated JavaScript,
updater hook insertion, schema insertion, and build-5440 Settings-target
idempotency.

Because ChatGPT is currently running, the task will not terminate it. A real
`codexfast launch` pass is skipped unless the app is already fully quit before
final verification. The installed `app.asar`, `Info.plist`, and application
signature must remain unchanged.

## Safety Boundaries

- Do not modify `/Applications/ChatGPT.app`.
- Do not reintroduce archive rewriting, re-signing, restore paths, or
  persistent extracted application layouts.
- Do not change the official GPT-5.6 threshold.
- Do not enable legacy Plugins targets for build `5440`.
- Do not broaden old Settings signatures when a dedicated exact shape is
  sufficient.
- Do not refactor unrelated runtime patch logic.
- Do not commit, bump the package version, publish, tag, or create a release.
