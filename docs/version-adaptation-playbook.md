# Version Adaptation Playbook

Use this playbook when a new `Codex.app` build appears and `codexfast` needs to adapt safely.

## Goal

Determine whether the new build can be supported, update patch logic if needed, and only then add it to the strict whitelist.

## Steps

1. Identify the build.
   - Read `CFBundleShortVersionString`
   - Read `CFBundleVersion`
   - Record the pair in `docs/compatibility-matrix.md` as `investigating` if it is new

2. Run the public launcher first.
   - Run `npx codexfast launch` with Codex fully quit
   - Check the detected version/build printed by launch
   - Check whether launch reports the build as `supported` or `unsupported`

3. Inspect the bundle before patching.
   - Read `docs/feature-scope.md`
   - Read `docs/patch-targets.md`
   - Read the closest prior note under `docs/bundle-notes/`
   - Identify changed filenames, needles, or gated shapes in the new bundle
   - For Fast support, inspect both visible consumers and the source of service-tier state. Settings, `/fast`, and composer Speed targets are incomplete if the shared service-tier hook still blocks custom API users from computing or sending the selected Fast tier.
   - For runtime launch changes, confirm the actual CDP request URLs for renderer JavaScript, not only the archive paths inside `app.asar`

4. Update the script narrowly.
   - Keep new regexes or target specs as small as possible
   - Put feature-specific target definitions in `src/targets/speed.mts`, `src/targets/plugins.mts`, or `src/targets/models.mts`
   - Keep shared target builder helpers in `src/targets/builders.mts` and aggregate exported targets through `src/patcher-targets.mts`
   - Preserve runtime launch fail-closed behavior without writing the app bundle
   - Do not widen support claims before validation

5. Update tests in the same change.
   - Extend `test/runtime-launch-flow.mts` for every changed target, runtime path, or new guard
   - Keep `test/re-sign-flow.sh` as the shell compatibility entrypoint
   - Keep unsupported-version blocking coverage intact
   - When runtime launch changes, cover generated single-file behavior, not only source-level patch helpers

6. Update docs in the same change.
   - `docs/compatibility-matrix.md`
   - `docs/patch-targets.md` if target mapping changed
   - a new note under `docs/bundle-notes/`
   - `README.md` and `README.zh-CN.md` if support scope changed materially

7. Verify.
   - `pnpm build:check`
   - `pnpm typecheck`
   - `pnpm check:version-drift`
   - `bash test/re-sign-flow.sh`
   - `pnpm test` before merging or releasing the adaptation
   - Manual checks from `docs/real-app-validation.md` when claiming real-app support
   - For runtime launch support, verify launch success on the installed app and confirm `app.asar`, `Info.plist`, and the app signature are unchanged

8. Only after verification, add the build to the strict whitelist in `src/supported-app-versions.mts`.

## Stop Conditions

- Do not add a build to the whitelist before test coverage and at least one successful validation pass.
- Do not describe a build as supported if any feature path in `docs/feature-scope.md` is still broken.
