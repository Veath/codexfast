# ChatGPT 26.810.52044 Build 6662 Compatibility Implementation Plan

> **For agentic workers:** Execute this plan inline in the current session with the repository's existing test harness.

**Goal:** Add exact support for the locally installed `ChatGPT.app` `26.810.52044+6662` and preserve Fast request behavior for custom API users.

**Architecture:** Extend the source-of-truth compatibility map and runtime policy sets, add a narrowly scoped target for the new request helper signature, regenerate the single-file launcher, and document the verified bundle locations and official GPT-5.6/Plugins paths.

**Tech Stack:** TypeScript/tsx, generated Node CLI, shell regression harness, Electron ASAR extraction, Node JavaScript parse checks.

**Spec:** `docs/superpowers/specs/2026-08-18-chatgpt-6662-compatibility-design.md`

## Global Constraints

- Keep public launch runtime-only and never mutate `/Applications/ChatGPT.app`.
- Add only the exact `26.810.52044+6662` whitelist key; unknown builds remain blocked.
- Keep GPT-5.6 and Plugins on official app paths for this build.
- Regenerate `bin/codexfast` from `src/`.

### Task 1: Regression Coverage

**Files:**
- Modify: `test/suites/runtime-patch-suite.mts`
- Modify: `test/runtime-launch-flow.mts`

- [ ] Add a failing fixture assertion for the new `Failed to read service tier for request` helper shape with `N2t(e,t,{priority:\`critical\`})`; assert the patched result returns `!0` for non-ChatGPT auth while preserving the official feature check.
- [ ] Add `26.810.52044+6662` to the table-driven official GPT-5.6/Plugins policy cases and the supported-version launch gate cases.
- [ ] Run `bash test/re-sign-flow.sh`; expect failure only because the new target and version key are not implemented yet.

### Task 2: Runtime Target and Version Support

**Files:**
- Modify: `src/targets/speed.mts`
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`

- [ ] Add a target spec that matches the new three-argument request helper and changes only `return!1` to `return!0`.
- [ ] Add `26.810.52044+6662` to the strict whitelist and both official-Plugins/no-initial-target policy sets.
- [ ] Run the focused regression suite and confirm the new fixture turns green and repeated patching is idempotent.

### Task 3: Generated CLI and Documentation

**Files:**
- Regenerate: `bin/codexfast`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/compatibility-matrix.md`
- Modify: `docs/feature-scope.md`
- Modify: `docs/patch-targets.md`
- Modify: `docs/real-app-validation.md`
- Modify: `docs/troubleshooting.md`
- Create: `docs/bundle-notes/2026-08-18-chatgpt-app-26.810.52044-build-6662.md`

- [ ] Record the new build as supported only after extracted-bundle validation, with the new `app-initial-BCLYDefw.js`, `general-settings-yzMrcfmm.js`, and `window-all-closed-DqXEFZQJ.js` locations.
- [ ] State that GPT-5.6 and Plugins use official paths and that the automatic-update row is absent from the current renderer while schema/hook interception remains supported.
- [ ] Run `pnpm build` and verify `pnpm build:check`.

### Task 4: Full Verification

- [ ] Run `pnpm typecheck`, `pnpm check:version-drift`, and `pnpm test`.
- [ ] Extract `/Applications/ChatGPT.app/Contents/Resources/app.asar` to `/tmp`, apply the generated patch engine to relevant JavaScript files, assert required labels and JavaScript parse validity, and confirm the installed app hashes/signature are unchanged.
