# Version Adaptation Playbook

Use this playbook when a new `Codex.app` build appears and `codexfast` needs to adapt safely.

## Goal

Determine whether the new build can be supported, update patch logic if needed, and only then add it to the strict whitelist.

## Steps

1. Identify the build.
   - Read `CFBundleShortVersionString`
   - Read `CFBundleVersion`
   - Record the pair in `docs/compatibility-matrix.md` as `investigating` if it is new

2. Run the script in status mode first.
   - Check detected version/build
   - Check whether the build is currently `supported` or `unsupported`
   - Confirm which targets still resolve

3. Inspect the bundle before patching.
   - Read `docs/feature-scope.md`
   - Read `docs/patch-targets.md`
   - Read the closest prior note under `docs/bundle-notes/`
   - Identify changed filenames, needles, or gated shapes in the new bundle

4. Update the script narrowly.
   - Keep new regexes or target specs as small as possible
   - Preserve apply/restore symmetry
   - Do not widen support claims before validation

5. Update tests in the same change.
   - Extend `test/re-sign-flow.sh` for every changed target or new guard
   - Keep unsupported-version blocking coverage intact

6. Update docs in the same change.
   - `docs/compatibility-matrix.md`
   - `docs/patch-targets.md` if target mapping changed
   - a new note under `docs/bundle-notes/`
   - `README.md` and `README.zh-CN.md` if support scope changed materially

7. Verify.
   - `bash test/re-sign-flow.sh`
   - Manual checks from `docs/real-app-validation.md` when claiming real-app support

8. Only after verification, add the build to the strict whitelist in `codexfast.sh`.

## Stop Conditions

- Do not add a build to the whitelist before test coverage and at least one successful validation pass.
- Do not describe a build as supported if any feature path in `docs/feature-scope.md` is still broken.
