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
- Running npm packaging and publish checks
- Publishing `codexfast` to npm
- Verifying whether a version is already live

Do not use this skill for feature implementation. Use `codexfast-development-flow` first, then return here when the code is ready to ship.

## Release Workflow

1. Confirm the repo is ready.
   - Review `git status --short --branch`.
   - Make sure the intended feature work, docs, and tests are already in place.

2. Prepare release metadata.
   - Bump `package.json` to the target version.
   - Move the active unreleased notes in `CHANGELOG.md` into a dated version section.
   - Keep README references aligned if usage or release behavior changed.

3. Run release verification.
   - Run `bash test/re-sign-flow.sh`.
   - Run `npm pack --dry-run`.
   - Before publishing, check the registry state with:
     - `npm view codexfast version versions --json`

4. Commit the release state.
   - Use a conventional commit, usually `chore: release x.y.z` unless the user asked for a different message.

5. Publish.
   - Run `npm publish`.
   - If npm rejects the publish, read the exact registry error before changing anything.

6. Verify the publish result.
   - Re-check `npm view codexfast version versions --json`.
   - If npm says the version already exists, compare the published tarball metadata with local packaging:
     - `npm view codexfast@x.y.z dist.shasum dist.integrity --json`
     - `npm pack --dry-run`
   - Only describe the release as successful if the registry confirms it or the existing published tarball matches the local artifact exactly.

## Publish Error Handling

- `E403` with “version already exists”:
  - Do not force re-publish.
  - Compare registry `dist.shasum` and `dist.integrity` against local `npm pack --dry-run`.
  - If they match, report that the release is already live.
  - If they do not match, bump to a new version and publish that instead.

- `E403` mentioning 2FA or token policy:
  - The account or token is not allowed to publish yet.
  - Do not bump versions blindly until auth is fixed.

## Final Checks

- `package.json` version matches the intended release.
- `CHANGELOG.md` has the correct dated section.
- The shell regression passed before publish.
- The npm package contents look correct.
- Registry state is verified after publish.

## Common Mistakes

- Publishing without checking whether the target version already exists.
- Forgetting to move `Unreleased` notes into a concrete version section.
- Claiming publish success from `npm publish` start logs instead of registry confirmation.
- Forgetting that docs and changelog are part of the release payload, not optional cleanup.
