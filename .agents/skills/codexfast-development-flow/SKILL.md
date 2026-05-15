---
name: codexfast-development-flow
description: Use when iterating on codexfast features, bundle-patch signatures, compatibility gates, recovery behavior, or repo documentation in the codexfast repository.
---

# Codexfast Development Flow

## Overview

Use this skill for day-to-day `codexfast` feature work.

This repo is high risk because it patches a real `/Applications/Codex.app` bundle. Every code change should preserve apply and restore symmetry, packed `app.asar` behavior, and the recovery path.

## When To Use

- Adding or updating a patch target in `src/patcher.mts`
- Adapting to a new Codex bundle version
- Changing compatibility gating or bundle metadata handling
- Updating restore, re-sign, backup, or archive logic
- Updating repo docs because behavior, support scope, or release guidance changed

Do not use this skill for release-only work. Use `codexfast-release-flow` for that.

## Core Rules

- Keep the generated CLI self-contained.
- Edit `src/*` as the source of truth, then run `pnpm build` to regenerate `bin/codexfast`.
- Preserve the packed `app.asar` workflow.
- Do not leave a persistent `Contents/Resources/app` directory behind.
- Treat patch-signature and restore changes as one unit. If apply changes, restore must stay symmetrical.
- If adding background repair or update watchers, unsupported builds must fail quietly with CLI/log output only: do not show macOS notifications, do not show dialogs, and do not modify the app.
- Do not claim app behavior is fixed from code inspection alone. The regression suite must pass.

## Workflow

1. Inspect the current repo state.
   - Read `AGENTS.md`, `src/cli.mts`, `src/patcher.mts`, `test/re-sign-flow.sh`, and the relevant README sections.
   - If the change is bundle-specific, identify the exact gated text key, target file shape, and restore path first.
   - Do not trust `status`/matcher output as proof that a feature target is gone. For every expected feature path, search the extracted bundle by stable needles such as `settings.agent.speed.label`, `composer.speedSlashCommand.title`, `composer.intelligenceDropdown.speed.title`, `sidebarElectron.pluginsDisabledTooltip`, `skills.pluginsAuthBlockedToast.title`, `pluginDeepLinkAuthBlocked`, `plugins.install.connectorUnavailable`, `plugins.installModal.about`, and nearby `serviceTierSettings` / auth-method gates.
   - Distinguish "target absent" from "target present but regex stale". A target is absent only after broad non-locale JS search shows the user-facing needle and adjacent gate are no longer present anywhere in `webview/assets`.
   - For runtime launch work, inspect the real CDP request URLs as well as the extracted archive paths. Current `26.513.20950` serves renderer JavaScript as `app://-/assets/*.js`, while older assumptions used `app://-/webview/assets/*.js`.

2. Make the smallest viable code change.
   - Keep patch logic narrow.
   - Prefer adding a new target spec over refactoring unrelated logic.
   - For compatibility gating, update the whitelist and surface the detected version/build clearly in output.
   - If changing the generated entrypoint, edit the source pieces and regenerate `bin/codexfast`.

3. Update regression coverage in the same change.
   - Extend `test/re-sign-flow.sh` for every new target, restore path, or compatibility guard.
   - Cover both positive and negative cases when relevant.
   - When changing runtime launch, cover generated single-file behavior. A source-level `patch-engine` import is not enough because the embedded runtime engine is extracted from generated `__PATCHER_SOURCE__`.

4. Update repo docs in the same change.
   - Update `README.md` when usage, compatibility policy, supported features, or recovery guidance changes.
   - Update `README.zh-CN.md` with the same behavior changes.
   - Keep README compatibility lists newest-first when adding or reordering verified Codex builds.
   - When documenting the patching mechanism, explicitly cover packed `app.asar` unpack/repack, why persistent `Contents/Resources/app` loose files are avoided, `ElectronAsarIntegrity`, local ad-hoc `codesign`, notarization/privacy-permission effects, and restore paths.
   - Update `AGENTS.md` when the maintenance checklist or validation expectations change.
   - Update `CHANGELOG.md` under the active unreleased or target release section.

5. Verify before calling the work done.
   - Run `pnpm build:check`.
   - Run `pnpm typecheck`.
   - Run `pnpm test` or `bash test/re-sign-flow.sh`.
   - If package metadata changed, also inspect `package.json` and `bin/codexfast`.
   - If packaging or docs changed materially, run `pnpm pack --dry-run`.
   - For runtime launch changes, run a real installed-app `launch` pass when possible, then confirm `app.asar`, `Info.plist`, and the app signature are unchanged.

## Codexfast-Specific Checklist

- Settings-side Fast patch still works.
- Composer `/fast` patch still works.
- Composer-side `Speed` menu patch still works for the target bundle:
  - `Add files and more / +` Speed submenu on builds that still expose the add-context path.
  - Composer `Intelligence` dropdown Speed submenu on newer builds where the add-context Speed entry moved.
- Every Plugins gate required by the target build still works, including sidebar access, page content, plugin detail redirects, install-button availability, and install-modal content where present.
- Unsupported versions are blocked before unpack, backup creation, or re-sign.
- Restore still works even when apply is blocked for unsupported versions.
- Status output still shows:
  - detected app version
  - detected build
  - compatibility state

## Common Mistakes

- Updating apply regexes without updating restore logic.
- Treating a missing `status` target as product behavior. First prove whether the bundle still contains the feature needle in a moved file or with a renamed minified hook.
- Writing a fixture assertion that passes on both guarded and patched code. For hidden-control fixes, assert both the patched replacement and the removal of the original guard, for example `if(!n)return null;` is gone.
- Describing a Codex build as supported before adding tests and whitelist coverage.
- Updating only one README and leaving English/Chinese docs out of sync.
- Publishing behavior changes without moving the maintenance checklist forward.
- Validating runtime launch only against extracted fixture files or source imports; generated CLI extraction and CDP timing can fail independently.
