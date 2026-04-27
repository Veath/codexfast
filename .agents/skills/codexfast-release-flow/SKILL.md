---
name: codexfast-release-flow
description: Use when preparing, validating, committing, publishing, or verifying a codexfast npm release from the codexfast repository.
---

# Codexfast Release Flow

## Overview

Use this skill when shipping a `codexfast` release.

The goal is to turn the current repo state into a verified npm package without losing changelog accuracy or publishing the wrong version.

## When To Use

- Bumping the package version
- Converting `Unreleased` changes into a dated release entry
- Preparing a release commit
- Running package registry and publish checks
- Publishing `codexfast` to npm
- Verifying whether a version is already live

Do not use this skill for feature implementation. Use `codexfast-development-flow` first, then return here when the code is ready to ship.

## Version Selection

`codexfast` uses `vx.y.z` Git tags, where `v` is only the tag prefix and `x.y.z` is the npm SemVer version.

Choose the version before editing release metadata:

- Use a patch release, such as `0.5.4`, only for fixes to behavior that was already shipped and claimed supported:
  - patch-signature corrections for an already supported Codex build
  - restore, backup, integrity, re-sign, status, or packaging fixes
  - documentation corrections that do not change supported behavior
- Use a minor release, such as `0.6.0`, for any new supported capability or compatibility surface:
  - newly supported `Codex.app` version/build pairs
  - new patch targets, feature paths, UI gates, or user-visible commands
  - behavior that expands the supported custom-API feature set
- If one release contains both a feature and a fix, choose the higher level: minor.
- Even while the package is `0.x`, do not treat new compatibility support as patch-level maintenance. New Codex build support is a compatibility expansion and should be minor.
- Do not skip version numbers just to repair release confusion. Once a version is published to npm or tagged publicly, leave it immutable and choose the next correct version.

## Release Workflow

1. Confirm the repo is ready.
   - Review `git status --short --branch`.
   - Make sure the intended feature work, docs, and tests are already in place.

2. Prepare release metadata.
   - Classify the release using the Version Selection rules before changing files.
   - Bump `package.json` to the target version.
   - Move the active unreleased notes in `CHANGELOG.md` into a dated version section.
   - Keep README references aligned if usage or release behavior changed.

3. Run release verification.
   - Run `pnpm typecheck`.
   - Run `pnpm test`.
   - Run `pnpm pack --dry-run`.
   - Before publishing, check the registry state with:
     - `pnpm view codexfast version versions --json`

4. Commit the release state.
   - Use a conventional commit, usually `chore: release x.y.z` unless the user asked for a different message.

5. Prepare the Git tag.
   - Confirm the release tag exists as `vx.y.z`.
   - Confirm the tag points at the intended release commit, not a later docs-only commit.
   - Push any missing release tag to `origin` before creating or editing the GitHub release.

6. Publish.
   - Run `pnpm publish`.
   - If npm rejects the publish, read the exact registry error before changing anything.

7. Create or update the GitHub release.
   - Use `gh release create` or `gh release edit`.
   - Make sure every published tag has release notes on GitHub, not just a tag with no release body.
   - Keep the GitHub release title and notes aligned with the changelog entry for that version.
   - Default behavior: do not upload extra release assets.
   - If release assets are needed, prefer the `pnpm pack` tarball for that exact version and confirm it matches the published npm artifact before uploading.

8. Verify the publish result.
   - Re-check `pnpm view codexfast version versions --json`.
   - Re-check `gh release list`.
   - If npm says the version already exists, compare the published tarball metadata with local packaging:
     - `pnpm view codexfast@x.y.z dist.shasum dist.integrity --json`
     - `pnpm pack --dry-run`
   - Only describe the release as successful if:
     - the npm registry confirms it or the existing published tarball matches the local artifact exactly
     - the expected GitHub tag exists remotely
     - the expected GitHub release entry exists with notes

## Publish Error Handling

- `E403` with “version already exists”:
  - Do not force re-publish.
  - Compare registry `dist.shasum` and `dist.integrity` against local `pnpm pack --dry-run`.
  - If they match, report that the release is already live.
  - If they do not match, bump to a new version and publish that instead.

- Tag exists but GitHub release is missing or empty:
  - Do not retag a different commit silently.
  - Confirm the tag target first.
  - Then create or edit the GitHub release body for that tag.

- `E403` mentioning 2FA or token policy:
  - The account or token is not allowed to publish yet.
  - Do not bump versions blindly until auth is fixed.

## Final Checks

- `package.json` version matches the intended release.
- `CHANGELOG.md` has the correct dated section.
- The shell regression passed before publish.
- The npm package contents look correct.
- Registry state is verified after publish.
- The expected `vx.y.z` tag exists on `origin`.
- The GitHub release entry exists and contains notes.
- If any manual release asset was uploaded, it matches the exact package version and artifact checksum expectations.

## Common Mistakes

- Publishing without checking whether the target version already exists.
- Publishing to npm but forgetting to push the release tag.
- Having GitHub tags without corresponding GitHub release notes.
- Uploading a manual GitHub release asset that does not match the npm package for the same version.
- Forgetting to move `Unreleased` notes into a concrete version section.
- Claiming publish success from `pnpm publish` start logs instead of registry confirmation.
- Forgetting that docs and changelog are part of the release payload, not optional cleanup.
- Treating new `Codex.app` build support, new patch targets, or new feature paths as patch releases.
- Retagging or republishing an already public version to hide a previous version-selection mistake.
