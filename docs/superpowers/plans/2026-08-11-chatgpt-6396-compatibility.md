# ChatGPT 26.803.61601 Build 6396 Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support the locally installed `ChatGPT.app` `26.803.61601` (build `6396`) and publish the verified compatibility expansion as `codexfast` `0.71.0`.

**Architecture:** Extend the strict exact-build whitelist and the two official-Plugins runtime policy sets without changing target regexes. Prove the policy with generated-launcher regressions, document the inspected bundle layout, validate the runtime against an extracted copy and the installed app, then follow the repository release flow.

**Tech Stack:** TypeScript/TSX, generated single-file Node CLI, shell/TypeScript regressions, Electron ASAR inspection, pnpm, npm, git, and GitHub CLI.

## Global Constraints

- Keep public `launch` runtime-only; never modify, re-sign, or repack `/Applications/ChatGPT.app`.
- Add only exact compatibility key `26.803.61601+6396`; unknown future builds remain blocked.
- Reuse existing patch signatures because extracted-bundle inspection found no target-shape change.
- Keep GPT-5.6 and Plugins on official application paths for build 6396.
- Preserve manual updater actions while dynamically gating background checks and forced automatic installation.
- Release new-build compatibility as minor version `0.71.0`.

---

### Task 1: Lock build 6396 behavior with failing regressions

**Files:**
- Modify: `test/runtime-launch-flow.mts:670`
- Modify: `test/runtime-launch-flow.mts:1160`
- Modify: `test/suites/runtime-patch-suite.mts:1718`

**Interfaces:**
- Consumes: generated `bin/codexfast`, `prepareFakeApp(appPath, version, build)`, and `runtimePatcherSourceForVersion(source, versionKey)`.
- Produces: regression expectations for exact key `26.803.61601+6396` and its official Plugins policy.

- [ ] **Step 1: Add the strict support-gate fixture**

  Add a fake app with version `26.803.61601` and build `6396`. Assert `Compatibility: supported`, the missing-executable failure, the `Contents/MacOS/ChatGPT` fallback, no launch calls, and no bundle mutation tools.

- [ ] **Step 2: Add the initial-target policy fixture**

  Add a pending-target launch fixture for the same key. Assert the missing-target message ends with `none.` and does not name `Plugins access`.

- [ ] **Step 3: Extend official Plugins filtering coverage**

  Add these literal table entries to the existing official Plugins loop:

  ```ts
  ["26.803.41515+6321", "6321"],
  ["26.803.61601+6396", "6396"],
  ```

  The loop must continue asserting `PLUGIN_DISABLED` and `SPEED_ENABLED`.

- [ ] **Step 4: Run the regression and verify RED**

  Run: `bash test/re-sign-flow.sh`

  Expected: FAIL because build 6396 is currently unsupported and absent from both official Plugins policy sets.

---

### Task 2: Add the exact build policy and regenerate the launcher

**Files:**
- Modify: `src/supported-app-versions.mts:67`
- Modify: `src/cli-runtime-launch.mts:130`
- Modify: `src/cli-runtime-launch.mts:162`
- Modify: `bin/codexfast` (generated)

**Interfaces:**
- Consumes: exact compatibility keys read by `createCodexfastContext` and runtime version-filter construction.
- Produces: strict support for `26.803.61601+6396` with Plugins compatibility targets skipped and all non-Plugins targets retained.

- [ ] **Step 1: Add the exact whitelist entry**

  Add:

  ```ts
  "26.803.61601+6396": "ChatGPT.app 26.803.61601 build 6396",
  ```

- [ ] **Step 2: Add build 6396 to both official Plugins sets**

  Add `"26.803.61601+6396"` after build 6321 in `runtimePatchNoPluginsAccessRequiredVersionKeys` and `runtimePatchNoPluginTargetsVersionKeys`.

- [ ] **Step 3: Regenerate the entrypoint**

  Run: `pnpm build`

  Expected: exit 0 and `bin/codexfast` contains the new compatibility key and policy entries.

- [ ] **Step 4: Run the regression and verify GREEN**

  Run: `bash test/re-sign-flow.sh`

  Expected: PASS, including build 6396 support and version-filter behavior.

---

### Task 3: Record compatibility knowledge and commit the feature

**Files:**
- Modify: `README.md:19`
- Modify: `README.zh-CN.md:19`
- Modify: `CHANGELOG.md:7`
- Modify: `docs/compatibility-matrix.md:82`
- Modify: `docs/feature-scope.md:26`
- Modify: `docs/feature-scope.md:39`
- Modify: `docs/feature-scope.md:50`
- Modify: `docs/feature-scope.md:71`
- Modify: `docs/patch-targets.md:116`
- Modify: `docs/real-app-validation.md:26`
- Modify: `docs/real-app-validation.md:34`
- Modify: `docs/troubleshooting.md:16`
- Modify: `docs/troubleshooting.md:69`
- Create: `docs/bundle-notes/2026-08-11-chatgpt-app-26.803.61601-build-6396.md`

**Interfaces:**
- Consumes: observed chunk paths and validation evidence from the extracted installed bundle.
- Produces: newest-first public compatibility claims aligned with the whitelist and release changelog.

- [ ] **Step 1: Update public compatibility summaries**

  Make build `6396` the latest verified build in both READMEs. Keep build `6321` listed as the preceding supported build.

- [ ] **Step 2: Update long-lived compatibility docs**

  Record `app-initial-BYOVlUBL.js`, `general-settings-Dz0zP8tf.js`, the unchanged three main-process schema files, and `window-all-closed-9IR0zY5D.js`. State that GPT-5.6 and Plugins remain official paths.

- [ ] **Step 3: Add the bundle note and unreleased changelog entry**

  Add an `Added` entry under `Unreleased` for exact build `6396`. In the bundle note, record read-only installed-bundle inspection and the no-mutation boundary.

- [ ] **Step 4: Check the documentation diff**

  Run: `git diff --check`

  Expected: exit 0 with no whitespace errors or personal absolute paths in committed documentation, except the standard public `/Applications/ChatGPT.app` validation path.

- [ ] **Step 5: Commit the compatibility feature**

  Run:

  ```bash
  git add src test bin README.md README.zh-CN.md CHANGELOG.md docs
  git commit -m "feat: add ChatGPT build 6396 support"
  ```

---

### Task 4: Validate the extracted bundle and installed runtime

**Files:**
- Inspect: temporary extracted `app.asar` copy
- Inspect: `/Applications/ChatGPT.app/Contents/Resources/app.asar`
- Inspect: `/Applications/ChatGPT.app/Contents/Info.plist`

**Interfaces:**
- Consumes: regenerated `bin/codexfast` and installed build 6396.
- Produces: evidence that expected modules patch, JavaScript remains valid, real launch succeeds, and the installed bundle stays unchanged.

- [ ] **Step 1: Run static verification**

  Run:

  ```bash
  pnpm build:check
  pnpm typecheck
  pnpm check:version-drift
  pnpm test
  ```

  Expected: every command exits 0.

- [ ] **Step 2: Apply patches to a fresh temporary extracted copy**

  Apply the version-filtered runtime patcher for `26.803.61601+6396`. Assert the expected Fast, `/fast`, Intelligence Speed, automatic-update row/schema, and updater targets change; assert Plugins and GPT-5.6 compatibility targets remain untouched.

- [ ] **Step 3: Validate changed JavaScript syntax**

  Run Node syntax validation on each patched temporary module, treating renderer files as ECMAScript modules. Expected: every changed file parses.

- [ ] **Step 4: Record installed-bundle safety hashes and signature**

  Record SHA-256 for `app.asar` and `Info.plist`, then run `codesign --verify --deep --strict --verbose=2 /Applications/ChatGPT.app`.

- [ ] **Step 5: Quit and launch the real app**

  Fully quit the current ChatGPT process, run `bin/codexfast launch`, and confirm the launcher reports compatibility `supported` plus expected patched target labels.

- [ ] **Step 6: Verify installed-bundle immutability**

  Recompute both hashes and repeat strict signature verification. Expected: hashes match the recorded values and the signature remains valid.

---

### Task 5: Release codexfast 0.71.0

**Files:**
- Modify: `package.json:3`
- Modify: `CHANGELOG.md:5`
- Modify: `bin/codexfast` (generated version metadata)

**Interfaces:**
- Consumes: verified feature commit and `Unreleased` changelog entry.
- Produces: npm package `codexfast@0.71.0`, tag `v0.71.0`, and a GitHub release with matching notes.

- [ ] **Step 1: Prepare release metadata**

  Change `package.json` version to `0.71.0`, move the unreleased entry to `## [0.71.0] - 2026-08-11`, and regenerate `bin/codexfast` with `pnpm build`.

- [ ] **Step 2: Run fresh release verification**

  Run:

  ```bash
  pnpm build:check
  pnpm typecheck
  pnpm test
  pnpm pack --dry-run
  pnpm view codexfast version versions --json
  ```

  Expected: all local checks pass and registry latest remains `0.70.0` before publish.

- [ ] **Step 3: Commit the release**

  Run:

  ```bash
  git add package.json CHANGELOG.md bin/codexfast
  git commit -m "chore: release 0.71.0"
  ```

- [ ] **Step 4: Create and push the release state**

  Create annotated tag `v0.71.0`, push `main`, and push the tag. Confirm the remote tag points to the release commit.

- [ ] **Step 5: Publish and create the GitHub release**

  Run `pnpm publish`, then create GitHub release `v0.71.0` titled `codexfast 0.71.0` using the `0.71.0` changelog entry as its body. Do not upload extra assets.

- [ ] **Step 6: Verify the published release**

  Re-run `pnpm view codexfast version versions --json`, inspect `git ls-remote --tags origin refs/tags/v0.71.0`, and run `gh release view v0.71.0`. Expected: npm latest is `0.71.0`, the remote tag exists at the intended release commit, and the GitHub release contains matching notes.
