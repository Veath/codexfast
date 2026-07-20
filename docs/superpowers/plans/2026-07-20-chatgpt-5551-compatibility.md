# ChatGPT.app Build 5551 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict, complete local support for `/Applications/ChatGPT.app` `26.715.31925+5551` without modifying the installed application, committing, or releasing.

**Architecture:** Reuse the verified build-5488 renderer and updater signatures. Extend only the exact version/build gate and official-Plugins filtering sets, regenerate the single-file launcher, and prove the unchanged patch family against the extracted build-5551 bundle.

**Tech Stack:** TypeScript, generated single-file Node.js CLI, runtime JavaScript regex patching, shell regression harness, pnpm.

---

## File Map

- Modify `test/runtime-launch-flow.mts`: build-5551 strict gate and required-initial-label coverage.
- Modify `test/suites/runtime-patch-suite.mts`: build-5551 official Plugins and GPT-5.6 filtering coverage.
- Modify `src/supported-app-versions.mts`: strict compatibility key.
- Modify `src/cli-runtime-launch.mts`: official-Plugins skip keys.
- Regenerate `bin/codexfast`: generated public launcher.
- Update compatibility documentation and add a build-5551 bundle note.

### Task 1: Add failing build-5551 regression coverage

**Files:**
- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`

- [ ] Add a fake app with version `26.715.31925`, build `5551`, and assert the generated CLI reports `Compatibility: supported` before reaching the deliberately missing executable.
- [ ] Add build `26.715.31925+5551` to the pending-target fixture and assert the required initial labels are `none`, without `Plugins access`.
- [ ] Add `26.715.31925+5551` to the official Plugins filtering table and assert a Plugins target stays disabled while an unrelated Speed target patches.
- [ ] Add an official GPT-5.6 assertion for `26.715.31925+5551`: model-list and query-selector compatibility targets remain disabled while Speed still patches.
- [ ] Run `corepack pnpm build && corepack pnpm exec tsx test/runtime-launch-flow.mts` and require a non-zero result caused by the missing support/filtering keys.

### Task 2: Implement the minimal exact-build adaptation

**Files:**
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Regenerate: `bin/codexfast`

- [ ] Append `"26.715.31925+5551": "ChatGPT.app 26.715.31925 build 5551"` to `SUPPORTED_APP_VERSIONS`.
- [ ] Add `26.715.31925+5551` to `runtimePatchNoPluginsAccessRequiredVersionKeys`.
- [ ] Add `26.715.31925+5551` to `runtimePatchNoPluginTargetsVersionKeys`.
- [ ] Do not change target regexes or `runtimePatchOfficialGpt56ThresholdVersionKey`.
- [ ] Run `corepack pnpm build && corepack pnpm exec tsx test/runtime-launch-flow.mts` and require `runtime launch flow test passed`.

### Task 3: Document build-5551 compatibility

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/real-app-validation.md`
- Create: `docs/bundle-notes/2026-07-20-chatgpt-app-26.715.31925-build-5551.md`

- [ ] Add `26.715.31925+5551` newest-first to public compatibility lists.
- [ ] Record the existing row-local-`h` target in `general-settings-Boi5S8Wz.js` and callback-aware updater match in `.vite/build/window-all-closed-CZr9g6FK.js`.
- [ ] Record official Plugins/GPT-5.6 paths, full Fast coverage, exact hashes, extracted-bundle parse results, and the real-launch validation boundary.
- [ ] Run `rg -n "26\\.715\\.31925|5551|Boi5S8Wz|window-all-closed-CZr9g6FK" README.md README.zh-CN.md CHANGELOG.md docs src test` and `git diff --check`.

### Task 4: Verify source, generated CLI, and installed-app immutability

**Files:**
- Verify: all modified files
- Verify: `/tmp/codexfast-5551.scCnZ4/app`
- Verify: `/Applications/ChatGPT.app`

- [ ] Run `corepack pnpm build:check`, `corepack pnpm typecheck`, `corepack pnpm check:version-drift`, `corepack pnpm test`, `git diff --check`, and `corepack pnpm pack --dry-run`.
- [ ] Apply the generated version-filtered patcher for `26.715.31925+5551` to all extracted JavaScript assets. Require the complete Fast and automatic-update labels, no Plugins/GPT-5.6 compatibility labels, and `parseDiagnostics=0`.
- [ ] Apply the main-process settings and updater helpers across `.vite/build/*.js`. Require the schema matches, updater hook matches `window-all-closed-CZr9g6FK.js`, manual update methods remain, and `parseDiagnostics=0`.
- [ ] Recheck SHA-256 hashes and `codesign --verify --deep --strict` for `/Applications/ChatGPT.app`.
- [ ] If ChatGPT is fully quit, run a fresh `node bin/codexfast launch` smoke pass; otherwise report the real-launch limitation explicitly without terminating the user's app.
- [ ] Inspect `git status --short`, `git diff --stat`, and the focused diff. Do not commit, publish, tag, push, or release.
