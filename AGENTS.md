# AGENTS.md

Repository guidance for `codexfast`.

## Project Scope

- This repo ships a single-file macOS patcher for `Codex.app`.
- The published entrypoint is generated as [`bin/codexfast`](./bin/codexfast).
- Maintain TypeScript source under [`src/`](./src/) and regenerate the entrypoint with [`scripts/build-codexfast.mts`](./scripts/build-codexfast.mts).
- The main regression test is [`test/re-sign-flow.sh`](./test/re-sign-flow.sh).

## Docs Index

- Start with [`docs/README.md`](./docs/README.md) for the long-lived docs index.
- Read [`docs/feature-scope.md`](./docs/feature-scope.md) when you need the current supported feature paths before diving into bundle-specific implementation details.
- Read [`docs/compatibility-matrix.md`](./docs/compatibility-matrix.md) before changing the whitelist or describing a Codex build as supported.
- Read [`docs/patch-targets.md`](./docs/patch-targets.md) before changing regexes, target specs, or restore mapping.
- Read [`docs/troubleshooting.md`](./docs/troubleshooting.md) when the app fails to launch, a UI path breaks, `Plugins` remains partially unavailable, or repeated patch runs behave unexpectedly.
- Read [`docs/real-app-validation.md`](./docs/real-app-validation.md) when claiming real installed-app compatibility.
- Read [`docs/version-adaptation-playbook.md`](./docs/version-adaptation-playbook.md) when adapting to a new `Codex.app` build.
- Read [`docs/release-process.md`](./docs/release-process.md) when preparing a version bump, release commit, or package publish.
- Read the relevant file under [`docs/bundle-notes/`](./docs/bundle-notes/) when adapting to a Codex bundle or investigating a gate/signature change.
- Keep `docs/` focused on reusable conclusions. Do not store raw conversation transcripts or throwaway debugging logs there.

## Working Rules

- Keep the generated CLI self-contained. New runtime dependencies should be avoided unless they are required.
- Treat `bin/codexfast` as generated. Edit `src/*`, run `pnpm build`, and commit the regenerated entrypoint together with its source.
- Preserve the packed `app.asar` workflow. Do not reintroduce a persistent `Contents/Resources/app` unpacked layout.
- Do not commit extracted Codex bundle files, temporary workspaces, or local inspection artifacts.
- Use project-relative paths in docs and code; do not commit personal machine absolute paths.
- Treat changes to patch signatures and restore logic as high risk. Update tests in the same change.
- Keep user-facing script output in English unless the task explicitly requires another language.

## Validation

- Run `pnpm build:check`, `pnpm typecheck`, and `pnpm test` after changing patch, restore, archive, integrity-hash, or re-sign logic.
- If package metadata changes, also check `package.json` and `bin/codexfast`.
- Do not claim macOS app behavior is fixed unless the regression test passes and the real-world limitation is stated clearly.
- Update the relevant files under `docs/` when compatibility knowledge, bundle notes, or release process knowledge changes.

## Commit Rules

- Use Conventional Commit format for every commit message: `<type>: <summary>`.
- Prefer these types in this repo:
  - `fix:` for bug fixes, patch-signature corrections, restore behavior fixes, and compatibility-scope corrections.
  - `feat:` for newly supported Codex builds or newly exposed feature paths.
  - `docs:` for documentation-only changes.
  - `test:` for test-only changes.
  - `chore:` for release commits and repository maintenance.
- Release commits must use `chore: release x.y.z`.
- Do not use free-form commit subjects such as `Add Codex 26.422 support`; write `feat: add Codex 26.422 support` instead.

## Maintenance Checklist

Use this checklist for every future Codex bundle adaptation or patch-signature update.

- Confirm the target `CFBundleShortVersionString` + `CFBundleVersion` pair has been validated before adding it to the strict whitelist.
- Confirm the current feature set still matches [`docs/feature-scope.md`](./docs/feature-scope.md).
- Confirm the patch mapping and restore intent still match [`docs/patch-targets.md`](./docs/patch-targets.md).
- Confirm `pnpm test` still covers:
  - the Settings-side Fast control
  - the composer `/fast` slash command
  - the composer-side `Speed` menu, whether exposed through add-context or Intelligence UI
  - the Plugins sidebar auth-method gate
  - the GPT-5.5 model-list bridge and model query selector injection targets
  - unsupported-version blocking before unpack, backup, and re-sign
  - restore symmetry for all patched paths
- Confirm status output still reports:
  - each supported target independently
  - detected app version
  - detected build
  - compatibility state
- Do not ship a change that enables only part of the combined Fast feature set.
- Do not describe Plugins as supported unless the sidebar gate patch still works cleanly.
- Before claiming real-app support, run the manual checklist in [`docs/real-app-validation.md`](./docs/real-app-validation.md).
- When adapting to a new build, follow [`docs/version-adaptation-playbook.md`](./docs/version-adaptation-playbook.md).
- If a build loses any supported path, update the compatibility docs and README notes before calling the release fully compatible.

## Release Notes

- The published package name is `codexfast`.
- `npx codexfast` should remain the shortest supported invocation path.
- README updates are required when usage, platform support, signing behavior, or recovery steps change.

## Safety

- This repo modifies a locally installed `/Applications/Codex.app`. Be explicit when a change affects a real app copy.
- Preserve recovery paths: `app.asar1`, file-level backups, restore flow, and manual `codesign` fallback guidance.
- Prefer surgical diffs. Avoid unrelated refactors in the embedded Node patcher unless they directly support the requested fix.
