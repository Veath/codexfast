# ChatGPT.app 26.715.31925 Compatibility Design

## Goal

Adapt `codexfast` to the locally installed `/Applications/ChatGPT.app`
`26.715.31925` build `5551` while preserving the complete supported feature
set and the runtime-only launcher. This task ends with local verification and
does not include a commit, package version bump, publish, tag, or release.

## Observed Build

- Installed app: `/Applications/ChatGPT.app`
- Bundle identifier: `com.openai.codex`
- `CFBundleShortVersionString`: `26.715.31925`
- `CFBundleVersion`: `5551`
- Compatibility key: `26.715.31925+5551`
- Extracted bundle: `/tmp/codexfast-5551.scCnZ4/app`
- `app.asar` SHA-256:
  `0c9dd677134340cb944e7642b8bc2504c7b73c7dc334d9d756547858171eea41`
- `Info.plist` SHA-256:
  `d251f26282d263fb8593a8b6dd25e195ab1c6e1955a4d2542b08f48bbf4b688e`
- `codesign --verify --deep --strict` succeeds.

The installed application was not modified during inspection.

## Bundle Findings

Build `5551` remains compatible with the build-`5488` target family.

- Settings Fast and the automatic-update row are guarded in
  `webview/assets/general-settings-Boi5S8Wz.js`; the existing row-local-`h`
  Settings target matches.
- The shared Fast allowance and configured-tier fallback remain guarded in the
  `l46phxln` shared chunk.
- The request-tier helper remains guarded in the `b0wqjrxp` shared chunk.
- `/fast` and the Intelligence Speed menu remain guarded in the `unq8yzli`
  shared chunk.
- Applying the generated build-`5488` filtered runtime strategy to all 4,981
  extracted JavaScript files patches the complete Fast and automatic-update
  renderer set with zero JavaScript parse diagnostics.
- GPT-5.6 remains available through the official application path because this
  build is newer than the `26.707.41301+5103` threshold.
- Plugins remains available through the official application path for this
  build family. Runtime launch must skip Plugins compatibility targets and the
  legacy required `Plugins access` initial label.
- The desktop settings schema still matches the stable source signature.
- The Sparkle updater is
  `.vite/build/window-all-closed-CZr9g6FK.js`; the existing callback-aware
  automatic-update hook matches, preserves manual update methods, and produces
  zero JavaScript parse diagnostics.

## Approaches Considered

### Chosen: exact-build whitelist and filtering update

Add `26.715.31925+5551` to the strict supported-version map and both official
Plugins skip sets. Keep all patch signatures and the official GPT-5.6 threshold
unchanged. This is the smallest change supported by direct bundle evidence.

### Rejected: whitelist only

Adding only the compatibility key would allow launch but would also run legacy
Plugins compatibility targets against a build whose official application path
already provides Plugins.

### Rejected: support all future 26.715 builds

Range-based support would weaken the repository's strict version-plus-build
policy and could run stale runtime interception against an uninspected bundle.

## Implementation

1. Add failing tests for the exact support gate and the version-specific
   official Plugins filtering behavior.
2. Add `26.715.31925+5551` to `src/supported-app-versions.mts`.
3. Add the exact key to both no-legacy-Plugins sets in
   `src/cli-runtime-launch.mts`.
4. Keep renderer and main-process patch signatures unchanged.
5. Regenerate `bin/codexfast` from TypeScript source.
6. Update compatibility documentation and add a build-specific bundle note.
7. Run repository, extracted-bundle, signature, and immutability verification.

## Failure Handling

- Unknown version/build pairs remain blocked before runtime launch.
- Required renderer targets remain fail-closed.
- The new build skips only the Plugins target family and official GPT-5.6
  compatibility targets; Fast and automatic-update targets remain active.
- Any real-bundle parse diagnostic or missing required feature label blocks
  completion.

## Verification

Completion requires fresh successful runs of:

- `corepack pnpm build`
- `corepack pnpm build:check`
- `corepack pnpm typecheck`
- `corepack pnpm check:version-drift`
- `corepack pnpm test`
- `git diff --check`
- `corepack pnpm pack --dry-run`

The generated build-`5551` patcher must reproduce the observed renderer and
main-process results with zero parse diagnostics, skip Plugins/GPT-5.6
compatibility labels, preserve manual update actions, and leave installed
`app.asar`, `Info.plist`, and the application signature unchanged.

## Safety Boundaries

- Do not modify `/Applications/ChatGPT.app`.
- Do not add or widen patch signatures without bundle evidence.
- Do not change the official GPT-5.6 threshold.
- Do not reintroduce persistent app-bundle mutation or re-signing.
- Do not commit, bump the package version, publish, tag, or release.
