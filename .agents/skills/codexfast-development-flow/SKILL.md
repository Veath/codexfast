---
name: codexfast-development-flow
description: Use when iterating on codexfast features, bundle-patch signatures, compatibility gates, recovery behavior, or repo documentation in the codexfast repository.
---

# Codexfast Development Flow

## Overview

Use this skill for day-to-day `codexfast` feature work.

This repo is high risk because it patches a real `/Applications/Codex.app` bundle. Every code change should preserve apply and restore symmetry, packed `app.asar` behavior, and the recovery path.

## When To Use

- Adding or updating a patch target in `codexfast.sh`
- Adapting to a new Codex bundle version
- Changing compatibility gating or bundle metadata handling
- Updating restore, re-sign, backup, or archive logic
- Updating repo docs because behavior, support scope, or release guidance changed

Do not use this skill for release-only work. Use `codexfast-release-flow` for that.

## Core Rules

- Keep the script self-contained.
- Edit `src/*` as the source of truth, then run `pnpm build` to regenerate `codexfast.sh`.
- Preserve the packed `app.asar` workflow.
- Do not leave a persistent `Contents/Resources/app` directory behind.
- Treat patch-signature and restore changes as one unit. If apply changes, restore must stay symmetrical.
- Do not claim app behavior is fixed from code inspection alone. The shell regression must pass.

## Workflow

1. Inspect the current repo state.
   - Read `AGENTS.md`, `codexfast.sh`, `test/re-sign-flow.sh`, and the relevant README sections.
   - If the change is bundle-specific, identify the exact gated text key, target file shape, and restore path first.

2. Make the smallest viable code change.
   - Keep patch logic narrow.
   - Prefer adding a new target spec over refactoring unrelated logic.
   - For compatibility gating, update the whitelist and surface the detected version/build clearly in output.
   - If changing the generated entrypoint, edit the source pieces and regenerate `codexfast.sh`.

3. Update regression coverage in the same change.
   - Extend `test/re-sign-flow.sh` for every new target, restore path, or compatibility guard.
   - Cover both positive and negative cases when relevant.

4. Update repo docs in the same change.
   - Update `README.md` when usage, compatibility policy, supported features, or recovery guidance changes.
   - Update `README.zh-CN.md` with the same behavior changes.
   - Update `AGENTS.md` when the maintenance checklist or validation expectations change.
   - Update `CHANGELOG.md` under the active unreleased or target release section.

5. Verify before calling the work done.
   - Run `pnpm build:check`.
   - Run `pnpm typecheck`.
   - Run `pnpm test` or `bash test/re-sign-flow.sh`.
   - If package metadata changed, also inspect `package.json` and `bin/codexfast`.
   - If packaging or docs changed materially, run `pnpm pack --dry-run`.

## Codexfast-Specific Checklist

- Settings-side Fast patch still works.
- Composer `/fast` patch still works.
- Composer-side `Speed` menu patch still works for the target bundle:
  - `Add files and more / +` Speed submenu on builds that still expose the add-context path.
  - Composer `Intelligence` dropdown Speed submenu on newer builds where the add-context Speed entry moved.
- Plugins sidebar gate patch still works.
- Unsupported versions are blocked before unpack, backup creation, or re-sign.
- Restore still works even when apply is blocked for unsupported versions.
- Status output still shows:
  - detected app version
  - detected build
  - compatibility state

## Common Mistakes

- Updating apply regexes without updating restore logic.
- Describing a Codex build as supported before adding tests and whitelist coverage.
- Updating only one README and leaving English/Chinese docs out of sync.
- Publishing behavior changes without moving the maintenance checklist forward.
