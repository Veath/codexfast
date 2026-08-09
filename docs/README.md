# Docs Index

This directory stores long-lived repository knowledge for `codexfast`.

Use these docs for decisions, troubleshooting, and bundle adaptations that future agents will need to revisit. Do not use this directory as a transcript dump.

## Documents

- [`feature-scope.md`](./feature-scope.md)
  - The current user-facing feature paths exposed by `codexfast`.
- [`compatibility-matrix.md`](./compatibility-matrix.md)
  - Verified macOS `Codex.app` and Windows Store/MSIX version/build pairs, support status, and supported feature paths.
- [`patch-targets.md`](https://github.com/Veath/codexfast/blob/main/docs/patch-targets.md)
  - High-level mapping from exposed features to the current runtime patch targets.
- [`../src/`](https://github.com/Veath/codexfast/tree/main/src)
  - TypeScript source for the generated `bin/codexfast` entrypoint.
- [`troubleshooting.md`](https://github.com/Veath/codexfast/blob/main/docs/troubleshooting.md)
  - Common failure modes, expected boundaries, and recovery steps.
- [`real-app-validation.md`](./real-app-validation.md)
  - Manual smoke-test checklist for real installed macOS app and Windows Store/MSIX validation.
- [`windows-experimental.md`](./windows-experimental.md)
  - Experimental Store/MSIX launcher scope, validation commands, and Windows safety boundaries.
- [`version-adaptation-playbook.md`](https://github.com/Veath/codexfast/blob/main/docs/version-adaptation-playbook.md)
  - Step-by-step flow for adapting `codexfast` to a new Codex build safely.
- [`release-process.md`](https://github.com/Veath/codexfast/blob/main/docs/release-process.md)
  - The repo's release checklist for version bumps, changelog updates, verification, commit, and package publish.
- [`bundle-notes/`](https://github.com/Veath/codexfast/tree/main/docs/bundle-notes)
  - Bundle-specific adaptation notes for inspected Codex builds.

## Writing Rules

- Record reusable conclusions, not raw chat history.
- Prefer concrete facts: bundle version, build number, target files, gate signatures, verification results, and release outcomes.
- Keep each document focused so agents can load the minimum needed context.
