# ChatGPT 26.810.41047 Build 6570 Compatibility Design

## Goal

Adapt `codexfast` to the locally installed `ChatGPT.app` `26.810.41047` (build `6570`) while preserving the runtime-only launcher and the complete supported feature set. Modify only the working tree, run automated and extracted-bundle validation, and do not commit or publish the result.

## Evidence

- The installed application reports compatibility key `26.810.41047+6570`, bundle identifier `com.openai.codex`, and executable `ChatGPT`.
- The current launcher detects the exact version and fails closed because the key is absent from the strict whitelist.
- Renderer Fast, service-tier allowance, request-tier allowance, configured-tier fallback, `/fast`, and renderer settings-schema signatures still match in `webview/assets/app-initial-iMhn6nFd.js`.
- Settings Fast and the automatic-update row signatures still match in `webview/assets/general-settings-mYHA2JS4.js`.
- Main-process settings-schema signatures still match in `.vite/build/child-process-snapshot-worker.js`, `.vite/build/src-BlUt09P1.js`, and `.vite/build/worker.js`.
- The active updater moved to `.vite/build/window-all-closed-B4DXN-uV.js`; the existing source-signature-discovered automatic-update hook still matches it.
- The Intelligence Speed component no longer contains the historical availability gate. It renders from the available service-tier options, so the existing service-tier patches supply the required data without a new Intelligence-specific replacement.
- GPT-5.6 and Plugins remain available through official application paths for this compatibility scope. Although generic inspection can still recognize older Plugins signatures in shared chunks, they must remain excluded from runtime patching.

## Approach

Use an exact-build compatibility extension. Add only `26.810.41047+6570` to the strict whitelist and to both official-Plugins runtime policy sets. Reuse the existing target signatures because extracted-bundle inspection found no required target-shape change. Do not add a future-version threshold or a redundant Intelligence Speed target.

## Code and Test Changes

- Add the exact compatibility key to `src/supported-app-versions.mts`.
- Add the exact key to the no-Plugins-initial-target and no-Plugins-runtime-target sets in `src/cli-runtime-launch.mts`.
- Add test-first coverage in `test/runtime-launch-flow.mts` for the strict support gate, ChatGPT executable fallback, fail-closed behavior, and absence of a legacy Plugins initial requirement.
- Extend the official Plugins version-filter regression in `test/suites/runtime-patch-suite.mts` to prove build 6570 skips Plugins compatibility targets while retaining non-Plugins patches.
- Regenerate `bin/codexfast` from TypeScript source.

## Documentation

Update `README.md`, `README.zh-CN.md`, `CHANGELOG.md`, `docs/compatibility-matrix.md`, `docs/feature-scope.md`, `docs/patch-targets.md`, `docs/real-app-validation.md`, and `docs/troubleshooting.md`. Add `docs/bundle-notes/2026-08-14-chatgpt-app-26.810.41047-build-6570.md` with exact chunk locations, official feature paths, and the installed-bundle safety boundary.

## Verification and Safety

- Run the focused regression in red state before production changes and again in green state afterward.
- Run `pnpm build`, `pnpm build:check`, `pnpm typecheck`, `pnpm check:version-drift`, and `pnpm test`.
- Apply the version-filtered patcher to a fresh temporary extraction of the installed `app.asar`.
- Verify that only expected renderer and main-process modules change, Plugins and official GPT-5.6 targets remain skipped, patched JavaScript parses, and a second patch pass is idempotent.
- Compare installed `app.asar` and `Info.plist` hashes before and after read-only validation and verify the application code signature.
- Do not close, terminate, restart, or relaunch any currently allowed Codex/ChatGPT.app process. A real runtime-launch pass is explicitly outside this session's automated scope because it would require the app to be fully quit.
- Do not commit, tag, push, publish, or create a release.
