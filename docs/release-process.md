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

6. Prepare the Git tag.
   - Ensure the release tag exists as `vx.y.z`.
   - Ensure the tag points to the intended release commit.
   - Push any missing release tag to `origin`.

7. Publish.
   - `npm publish`

8. Create or update the GitHub release.
   - Use `gh release create` or `gh release edit`.
   - Keep the release title and notes aligned with the changelog entry.

9. Verify the publish result.
   - `npm view codexfast version versions --json`
   - `gh release list`
   - If npm reports that the version already exists, compare:
     - `npm view codexfast@x.y.z dist.shasum dist.integrity --json`
     - local `npm pack --dry-run` output

## Publish Error Rules

- If npm returns `E403` because the version already exists:
  - Do not force publish.
  - Compare the registry artifact hash against the local package.
  - If they match, treat the release as already live.
  - If they do not match, bump to a new version and publish that instead.

- If the tag exists but the GitHub release is missing or empty:
  - Confirm the tag points to the right commit.
  - Create or edit the GitHub release for that tag instead of silently moving the tag.

- If npm returns `E403` because of 2FA or token policy:
  - Fix auth first.
  - Do not keep bumping versions until publishing credentials are valid.
