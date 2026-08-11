# ChatGPT 26.803.61601 Build 6396 Compatibility Design

## Goal

Adapt `codexfast` to the locally installed `ChatGPT.app` `26.803.61601` (build `6396`), preserve the runtime-only launcher and the complete supported feature set, then release the compatibility expansion as `codexfast` `0.71.0`.

## Evidence

- The installed bundle reports compatibility key `26.803.61601+6396` and bundle identifier `com.openai.codex`.
- Renderer Fast, service-tier allowance, request-tier allowance, configured-tier fallback, `/fast`, Intelligence Speed, and renderer settings-schema signatures still match in `webview/assets/app-initial-BYOVlUBL.js`.
- Settings Fast and the automatic-update row signatures still match in `webview/assets/general-settings-Dz0zP8tf.js`.
- Main-process settings-schema signatures still match in `.vite/build/child-process-snapshot-worker.js`, `.vite/build/src-Cz_uUmVl.js`, and `.vite/build/worker.js`.
- The active updater remains `.vite/build/window-all-closed-9IR0zY5D.js`. The existing nested callback-aware hook still replaces `setInterval(()=>void p(),e)`, gates automatic download triggers and forced-install scheduling dynamically, and preserves manual update methods.
- GPT-5.6 remains present in the official model paths. Plugins retain the official application path used by the immediately preceding supported build.

## Approach

Use an exact-build compatibility extension. Add only `26.803.61601+6396` to the strict whitelist and to the two official-Plugins runtime policy sets. Reuse the existing target signatures because direct extracted-bundle inspection found no target-shape change. Do not introduce threshold-based future-build support or duplicate build-specific regexes.

## Code and Test Changes

- Add the exact compatibility key to `src/supported-app-versions.mts`.
- Add the exact key to the no-Plugins-initial-target and no-Plugins-runtime-target sets in `src/cli-runtime-launch.mts`.
- Add test-first coverage in `test/runtime-launch-flow.mts` for the strict support gate, ChatGPT executable fallback, fail-closed behavior, and the lack of a legacy Plugins initial requirement.
- Extend the official Plugins version-filter regression in `test/suites/runtime-patch-suite.mts` to prove build 6396 skips Plugins compatibility targets while retaining non-Plugins patches. Include build 6321 in the same table to close the immediately preceding coverage gap.
- Regenerate `bin/codexfast` from TypeScript source.

## Documentation

Update `README.md`, `README.zh-CN.md`, `CHANGELOG.md`, `docs/compatibility-matrix.md`, `docs/feature-scope.md`, `docs/patch-targets.md`, `docs/real-app-validation.md`, and `docs/troubleshooting.md`. Add a build note at `docs/bundle-notes/2026-08-11-chatgpt-app-26.803.61601-build-6396.md` with exact chunk locations and the installed-bundle safety boundary.

## Verification and Safety

- Run the focused regression in red state before production changes, then again in green state.
- Run `pnpm build`, `pnpm build:check`, `pnpm typecheck`, `pnpm check:version-drift`, and `pnpm test`.
- Apply the version-filtered patcher to an extracted temporary copy, check that only expected modules change, and validate generated JavaScript syntax.
- Fully quit the currently running ChatGPT process before the real launcher pass. Confirm the runtime reports expected target labels.
- Compare pre/post SHA-256 hashes for `app.asar` and `Info.plist`, and re-run strict code-signature verification. The installed bundle must remain unchanged.

## Release

New build support is a compatibility expansion, so use minor version `0.71.0`. Commit the compatibility change with a Conventional Commit, then prepare a separate `chore: release 0.71.0` commit. Create and push tag `v0.71.0`, publish to npm, create the GitHub release from the changelog entry, and verify npm registry, remote tag, and GitHub release state.
