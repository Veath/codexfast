# ChatGPT 26.803.41515 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Adapt codexfast to the locally installed `ChatGPT.app` `26.803.41515` (build `6321`) while preserving the runtime-only launcher and dynamic automatic-update setting.

**Architecture:** Reuse the existing 26.730+ renderer target family and official GPT-5.6/Plugins policy. Add one narrowly scoped main-process updater signature for the new `setAutomaticBackgroundDownloadsEnabledForMac` initialization shape, then add exact whitelist, regression, generated CLI, and documentation coverage.

**Tech Stack:** TypeScript/TSX source, generated single-file CLI, shell/TypeScript regression suites, extracted Electron ASAR inspection.

## Global Constraints

- Keep public `launch` runtime-only; never modify, re-sign, or repack the installed app.
- Add only the exact `26.803.41515+6321` compatibility key; unknown future builds remain blocked.
- Preserve manual `checkForUpdates` and `installUpdatesIfAvailable` actions while gating background checks and forced installs from live config.
- Keep GPT-5.6 and Plugins targets skipped for this build because the app uses official paths.

### Task 1: Lock the new updater shape with a failing regression

**Files:**
- Modify: `test/suites/runtime-patch-suite.mts`

- [x] Add a fixture matching the 26.803 `p` callback / `setInterval(()=>void p(),e)` shape and assert the dynamic config gate, conditional download trigger, forced-install guard, manual update preservation, and generated JavaScript validity.
- [x] Run the focused regression and confirm it fails because the current updater matcher does not recognize the new shape.

### Task 2: Add the minimal updater compatibility signature

**Files:**
- Modify: `src/cli-update-settings.mts`

- [x] Add a callback-aware updater signature/replacement that wraps `p(!1)` in `codexfastAutomaticUpdateCheck`, changes the download trigger to the same gate, and leaves manual methods unchanged.
- [x] Mirror the signature and replacement in `createMainProcessAutomaticUpdateHookSource` so the generated launcher patches dynamically loaded `.vite/build` chunks.
- [x] Run the focused regression and confirm it passes.

### Task 3: Add exact build compatibility and regenerate the CLI

**Files:**
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Modify: `test/runtime-launch-flow.mts`
- Modify: `bin/codexfast` (generated)

- [x] Add `26.803.41515+6321` to the strict whitelist and both official Plugins policy sets.
- [x] Add supported/pending-target fake-app coverage for build 6321, including ChatGPT executable fallback and GPT-5.6/Plugins skip behavior.
- [x] Run `pnpm build` to regenerate the self-contained entrypoint.

### Task 4: Record verified bundle compatibility

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/real-app-validation.md`
- Modify: `docs/troubleshooting.md`
- Create: `docs/bundle-notes/2026-08-08-chatgpt-app-26.803.41515-build-6321.md`

- [x] Document the exact verified version/build, renderer chunk locations, new updater shape, official GPT-5.6/Plugins paths, and no-installed-bundle-mutation boundary in English and Chinese docs.

### Task 5: Verify the generated runtime

- [x] Run `pnpm build:check`, `pnpm typecheck`, `pnpm check:version-drift`, and `pnpm test`.
- [x] Reapply the version-filtered patcher to the extracted 6321 bundle, parse all changed JavaScript, and confirm the main-process hook patches the updater and schemas without changing the installed app.
