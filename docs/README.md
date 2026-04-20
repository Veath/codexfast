# Docs Index

This directory stores long-lived repository knowledge for `codexfast`.

Use these docs for decisions, troubleshooting, and bundle adaptations that future agents will need to revisit. Do not use this directory as a transcript dump.

## Documents

- [`feature-scope.md`](./feature-scope.md)
  - The current user-facing feature paths exposed by `codexfast`.
- [`compatibility-matrix.md`](./compatibility-matrix.md)
  - Verified `Codex.app` version/build pairs, support status, and supported feature paths.
- [`release-process.md`](./release-process.md)
  - The repo's release checklist for version bumps, changelog updates, verification, commit, and npm publish.
- [`bundle-notes/`](./bundle-notes/)
  - Bundle-specific adaptation notes for inspected Codex builds.

## Writing Rules

- Record reusable conclusions, not raw chat history.
- Prefer concrete facts: bundle version, build number, target files, gate signatures, verification results, and release outcomes.
- Keep each document focused so agents can load the minimum needed context.
