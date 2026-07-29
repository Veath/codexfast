# ChatGPT 5973 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict runtime-launch compatibility for `ChatGPT.app` `26.721.81911` (`build 5973`) without changing package version `0.64.0` or publishing npm.

**Architecture:** Reuse the build-5848 renderer and main-process signatures already validated against the extracted build-5973 bundle. Add only the exact version/build key to the compatibility whitelist and official-Plugins policy sets, while retaining the existing official GPT-5.6 threshold.

**Tech Stack:** TypeScript, Node.js 18+, pnpm, shell regression harness, Electron ASAR inspection, CDP runtime patch source.

## Global Constraints

- Do not change `package.json` version `0.64.0` or publish the package.
- Treat `src/*` as source and regenerate `bin/codexfast` with `pnpm build`.
- Keep public launch runtime-only and fail-closed.
- Do not modify `app.asar`, `Info.plist`, the installed application bundle, or its code signature.
- Keep the exact whitelist; do not accept a version range or unknown future build.
- Keep GPT-5.6 and Plugins on official application paths for build 5973.
- Do not change patch regexes, replacements, dependencies, or public launcher behavior.

---

### Task 1: Add failing build-5973 regression coverage

**Files:**
- Modify: `test/runtime-launch-flow.mts`
- Modify: `test/suites/runtime-patch-suite.mts`

**Interfaces:**
- Consumes: `prepareFakeApp`, `runScriptCommand`, and `runtimePatcherSourceForVersion`.
- Produces: regression coverage for strict compatibility and official Plugins/GPT-5.6 policy.

- [ ] Add a fake app with version `26.721.81911`, build `5973`, and assert launch reaches only the missing-executable boundary.
- [ ] Add a pending-target fixture and assert the build does not require legacy `Plugins access`.
- [ ] Add `26.721.81911+5973` to the official Plugins policy table and explicit official GPT-5.6 assertions.
- [ ] Run `bash test/re-sign-flow.sh`; expect failure because the production whitelist and policy sets do not yet contain build 5973.

### Task 2: Add minimal production compatibility entries

**Files:**
- Modify: `src/supported-app-versions.mts`
- Modify: `src/cli-runtime-launch.mts`
- Regenerate: `bin/codexfast`

**Interfaces:**
- Consumes: exact key `26.721.81911+5973`.
- Produces: strict launch admission and official Plugins policy while preserving official GPT-5.6 filtering.

- [ ] Add `"26.721.81911+5973": "ChatGPT.app 26.721.81911 build 5973"` to the whitelist.
- [ ] Add the exact key to `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys`.
- [ ] Run `pnpm build`.
- [ ] Run `bash test/re-sign-flow.sh`; expect all new assertions to pass.

### Task 3: Update compatibility documentation

**Files:**
- Modify: `README.md`, `README.zh-CN.md`, `CHANGELOG.md`
- Modify: `docs/compatibility-matrix.md`, `docs/feature-scope.md`, `docs/patch-targets.md`
- Modify: `docs/real-app-validation.md`, `docs/troubleshooting.md`
- Create: `docs/bundle-notes/2026-07-29-chatgpt-app-26.721.81911-build-5973.md`

**Interfaces:**
- Consumes: extracted-bundle evidence and exact build metadata.
- Produces: synchronized compatibility documentation and bundle-specific reusable findings.

- [ ] Record build 5973 as the newest supported exact build in both READMEs and the compatibility matrix.
- [ ] Extend feature, patch-target, validation, and troubleshooting build lists without changing behavior claims.
- [ ] Add the build note with exact target filenames, eight-label evidence, official GPT-5.6/Plugins paths, signature status, and manual launch boundary.
- [ ] Run `pnpm check:version-drift`; expect it to pass.

### Task 4: Verify the completed adaptation

**Files:**
- Verify: all changed source, generated, test, and documentation files.
- Read: `/Applications/ChatGPT.app` metadata, hashes, and signature.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: fresh build, type, regression, bundle parse, and installed-app safety evidence.

- [ ] Run `pnpm build:check`, `pnpm typecheck`, `pnpm check:version-drift`, and `pnpm test`.
- [ ] Run `pnpm pack --dry-run` without publishing.
- [ ] Reapply the version-filtered patcher to the extracted bundle and confirm five changed modules, eight labels, and zero parse errors.
- [ ] Recheck installed `app.asar` and `Info.plist` hashes plus deep strict signature.
- [ ] Run `git diff --check` and inspect the final diff for unrelated changes.
