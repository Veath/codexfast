# ChatGPT 26.810.41047 Build 6570 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add exact compatibility for the locally installed `ChatGPT.app` `26.810.41047+6570`, then validate the generated launcher and a temporary extracted bundle without touching the running app.

**Architecture:** Extend the exact whitelist and the two official-Plugins runtime policy sets. Reuse the existing Fast, update-setting, main-process updater, and official GPT-5.6 behavior because direct inspection shows their signatures still match; do not add a redundant Intelligence Speed target.

**Tech Stack:** TypeScript/TSX, generated single-file Node CLI, shell/TypeScript regressions, Electron ASAR extraction, pnpm, Node syntax checks, and macOS read-only hash/signature checks.

## Global Constraints

- Keep public `launch` runtime-only; never modify, re-sign, or repack `/Applications/ChatGPT.app`.
- Add only exact compatibility key `26.810.41047+6570`; unknown future builds remain blocked.
- Keep GPT-5.6 and Plugins on official application paths for build 6570.
- Do not close, terminate, restart, or relaunch the currently running Codex/ChatGPT.app process.
- Modify only the working tree; do not commit, tag, push, publish, or create a release.

---

### Task 1: Add failing 6570 compatibility regressions

**Files:**
- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`

**Interfaces:**
- Consumes: generated `bin/codexfast`, fake app metadata helpers, and `runtimePatcherSourceForVersion`.
- Produces: exact support-gate, ChatGPT executable fallback, no-Plugins-initial-target, and official-Plugins filtering expectations for `26.810.41047+6570`.

- [ ] **Step 1: Add the strict support-gate fixture**

  Add a fake `ChatGPT.app` with version `26.810.41047` and build `6570`. Assert the launcher reports `Compatibility: supported`, then reaches the missing-executable failure without invoking launch or bundle mutation tools. Include the `Contents/MacOS/ChatGPT` fallback assertion in the existing executable-path coverage.

- [ ] **Step 2: Add the initial-target policy fixture**

  Add a pending-target launch case for `26.810.41047+6570`. Assert the required target list is `none` and does not include `Plugins access`.

- [ ] **Step 3: Extend official Plugins filtering coverage**

  Add `26.810.41047+6570` to the existing table-driven `runtimePatcherSourceForVersion` test. Assert `PLUGIN_DISABLED` is absent from the patched output while `SPEED_ENABLED` remains present.

- [ ] **Step 4: Run the focused regression and verify RED**

  Run `bash test/re-sign-flow.sh`.

  Expected: FAIL because `26.810.41047+6570` is not yet in the whitelist or official-Plugins policy sets.

### Task 2: Implement exact version policy and regenerate the CLI

**Files:**
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Regenerate: `bin/codexfast`

**Interfaces:**
- Consumes: exact compatibility keys used by launcher metadata and runtime target filtering.
- Produces: supported `26.810.41047+6570` with Plugins compatibility targets skipped and all non-Plugins targets retained.

- [ ] **Step 1: Add the exact whitelist entry**

  Add:

  ```ts
  "26.810.41047+6570": "ChatGPT.app 26.810.41047 build 6570",
  ```

- [ ] **Step 2: Add 6570 to both official Plugins sets**

  Add `"26.810.41047+6570"` to `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys`.

- [ ] **Step 3: Regenerate the entrypoint**

  Run `pnpm build` and confirm `bin/codexfast` contains the exact key and both filtering entries.

- [ ] **Step 4: Re-run the focused regression and verify GREEN**

  Run `bash test/re-sign-flow.sh`.

  Expected: PASS, including the new support gate and official Plugins filtering case.

### Task 3: Synchronize compatibility documentation

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/real-app-validation.md`
- Modify: `docs/troubleshooting.md`
- Create: `docs/bundle-notes/2026-08-14-chatgpt-app-26.810.41047-build-6570.md`

**Interfaces:**
- Consumes: extracted-bundle paths and validation results from Tasks 1, 2, and 4.
- Produces: newest-first public support claims and reusable bundle-specific notes aligned with the exact whitelist.

- [ ] **Step 1: Update README compatibility summaries**

  Make `26.810.41047` (`build 6570`) the latest verified build in both README files, retain `26.803.61601` as the preceding build, and state that future builds remain blocked until separately verified.

- [ ] **Step 2: Update long-lived docs**

  Record the new renderer and `.vite/build` chunk names, official GPT-5.6/Plugins paths, and the fact that Intelligence Speed has no historical availability gate in this build.

- [ ] **Step 3: Add the bundle note and changelog entry**

  Add an Unreleased compatibility entry and document read-only inspection, target states, expected runtime target labels, and the no-mutation boundary in the new bundle note.

- [ ] **Step 4: Check documentation hygiene**

  Run `git diff --check` and scan changed docs for personal machine paths other than the repository's standard public validation path.

### Task 4: Run full automated and extracted-bundle verification

**Files:**
- Inspect: temporary extraction of `/Applications/ChatGPT.app/Contents/Resources/app.asar`
- Inspect: `/Applications/ChatGPT.app/Contents/Info.plist`
- Inspect: `/Applications/ChatGPT.app/Contents/Resources/app.asar`

**Interfaces:**
- Consumes: regenerated `bin/codexfast` and installed `26.810.41047+6570` bundle.
- Produces: fresh test/build evidence, patch target inventory, syntax/idempotency checks, and unchanged installed-bundle hashes/signature.

- [ ] **Step 1: Run static verification**

  Run `pnpm build:check`, `pnpm typecheck`, `pnpm check:version-drift`, and `pnpm test`; every command must exit 0.

- [ ] **Step 2: Extract a fresh temporary copy**

  Use `pnpm dlx @electron/asar extract /Applications/ChatGPT.app/Contents/Resources/app.asar <temporary-dir>` and inspect it with `pnpm exec tsx scripts/inspect-bundle-targets.mts <temporary-dir>`. Confirm Fast, `/fast`, Settings update, renderer schema, and updater signatures are present; confirm Plugins and GPT-5.6 targets are skipped by the 6570 version filter.

- [ ] **Step 3: Apply the version-filtered patcher to the temporary copy**

  Apply `runtimePatcherSourceForVersion` with `26.810.41047+6570` to each JavaScript response body or equivalent extracted module. Assert expected Fast, `/fast`, Settings update, schema, and updater changes; assert Plugins and official GPT-5.6 compatibility targets are untouched.

- [ ] **Step 4: Validate syntax and idempotency**

  Run Node ESM syntax checks on every changed temporary JavaScript file. Apply the same version-filtered patcher a second time and assert no additional content changes.

- [ ] **Step 5: Verify installed-bundle safety without app lifecycle changes**

  Record SHA-256 hashes for installed `app.asar` and `Info.plist`, run `codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app`, and compare hashes/signature after all read-only checks. Do not run `launch`, quit the app, or relaunch it.
