# Release Process

This document describes the release flow for `codexfast`.

## Preconditions

- Intended code and docs changes are already complete.
- `README.md`, `README.zh-CN.md`, `CHANGELOG.md`, and `AGENTS.md` are aligned with the shipped behavior.

## Steps

1. Check repo state.
   - `git status --short --branch`

2. Prepare release metadata.
   - Bump `package.json` to the target version.
   - Move the active release notes in `CHANGELOG.md` into a dated version section.

3. Verify before publish.
   - `bash test/re-sign-flow.sh`
   - `npm pack --dry-run`

4. Check registry state before publish.
   - `npm view codexfast version versions --json`

5. Commit the release state.
   - Prefer `chore: release x.y.z` unless the user requests a different commit message.

6. Publish.
   - `npm publish`

7. Verify the publish result.
   - `npm view codexfast version versions --json`
   - If npm reports that the version already exists, compare:
     - `npm view codexfast@x.y.z dist.shasum dist.integrity --json`
     - local `npm pack --dry-run` output

## Publish Error Rules

- If npm returns `E403` because the version already exists:
  - Do not force publish.
  - Compare the registry artifact hash against the local package.
  - If they match, treat the release as already live.
  - If they do not match, bump to a new version and publish that instead.

- If npm returns `E403` because of 2FA or token policy:
  - Fix auth first.
  - Do not keep bumping versions until publishing credentials are valid.
