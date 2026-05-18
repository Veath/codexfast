---
name: codexfast-development-flow
description: Use when iterating on codexfast features, bundle-patch signatures, compatibility gates, recovery behavior, or repo documentation in the codexfast repository.
---

# Codexfast Development Flow

## Overview

Use this skill for day-to-day `codexfast` feature work.

This repo is high risk because it launches and can internally test patches against a real `/Applications/Codex.app` bundle. Public `launch` must leave the app bundle untouched. Internal legacy file-patch code should still preserve apply and restore symmetry, packed `app.asar` behavior, and the recovery path.

## When To Use

- Adding or updating a patch target in `src/targets/*` or `src/patcher-targets.mts`
- Adapting to a new Codex bundle version
- Changing compatibility gating or bundle metadata handling
- Updating internal restore, re-sign, backup, or archive logic
- Updating repo docs because behavior, support scope, or release guidance changed

Do not use this skill for release-only work. Use `codexfast-release-flow` for that.

## Core Rules

- Keep the generated CLI self-contained.
- Edit `src/*` as the source of truth, then run `pnpm build` to regenerate `bin/codexfast`.
- Preserve the packed `app.asar` workflow.
- Do not leave a persistent `Contents/Resources/app` directory behind.
- Treat patch-signature and internal restore changes as one unit. If a file-patch target changes, restore must stay symmetrical.
- Do not add new public watcher commands. Current `launch` removes legacy auto-repair watcher files installed by older releases.
- Do not claim app behavior is fixed from code inspection alone. The regression suite must pass.

## Workflow

1. Inspect the current repo state.
   - Read `AGENTS.md`, `src/cli.mts`, `src/patcher-targets.mts`, the relevant `src/targets/*` module, `test/re-sign-flow.mts`, `test/re-sign-flow.sh`, and the relevant README sections.
   - Use `src/targets/speed.mts`, `src/targets/plugins.mts`, and `src/targets/models.mts` for feature-specific target definitions; keep shared target builders in `src/targets/builders.mts`.
   - Treat `src/patcher.mts` as legacy file-patch orchestration, not the primary home for new target metadata.
   - For runtime launch behavior, inspect `src/cli-cdp.mts`, `src/cli-asar-transaction.mts`, and `src/cli.mts` together because the generated CLI inlines those modules.
   - If the change is bundle-specific, identify the exact gated text key, target file shape, runtime URL shape, and internal restore path first.
   - Do not trust `status`/matcher output as proof that a feature target is gone. For every expected feature path, search the extracted bundle by stable needles such as `settings.agent.speed.label`, `composer.speedSlashCommand.title`, `composer.intelligenceDropdown.speed.title`, `sidebarElectron.pluginsDisabledTooltip`, `skills.pluginsAuthBlockedToast.title`, `pluginDeepLinkAuthBlocked`, `plugins.install.connectorUnavailable`, `plugins.installModal.about`, and nearby `serviceTierSettings` / auth-method gates.
   - Distinguish "target absent" from "target present but regex stale". A target is absent only after broad non-locale JS search shows the user-facing needle and adjacent gate are no longer present anywhere in `webview/assets`.
   - For runtime launch work, inspect the real CDP request URLs as well as the extracted archive paths. Current `26.513.20950` serves renderer JavaScript as `app://-/assets/*.js`, while older assumptions used `app://-/webview/assets/*.js`.

2. Make the smallest viable code change.
   - Keep patch logic narrow.
   - Prefer adding a new target spec over refactoring unrelated logic.
   - For compatibility gating, update the whitelist and surface the detected version/build clearly in output.
   - If changing the generated entrypoint, edit the source pieces and regenerate `bin/codexfast`.

3. Update regression coverage in the same change.
   - Extend `test/re-sign-flow.mts` for every new target, runtime path, restore path, or compatibility guard. Keep `test/re-sign-flow.sh` as the compatibility entrypoint.
   - Cover both positive and negative cases when relevant.
   - When changing runtime launch, cover generated single-file behavior. A source-level `patch-engine` import is not enough because the embedded runtime engine is extracted from generated `__PATCHER_SOURCE__`.

4. Update repo docs in the same change.
   - Update `README.md` when usage, compatibility policy, supported features, or recovery guidance changes.
   - Update `README.zh-CN.md` with the same behavior changes.
   - Keep README compatibility lists newest-first when adding or reordering verified Codex builds.
   - When documenting legacy file-patch mechanics, explicitly cover packed `app.asar` unpack/repack, why persistent `Contents/Resources/app` loose files are avoided, `ElectronAsarIntegrity`, local ad-hoc `codesign`, notarization/privacy-permission effects, and restore paths. Keep public README usage focused on `launch`, `help`, and `version`.
   - Update `AGENTS.md` when the maintenance checklist or validation expectations change.
   - Update `CHANGELOG.md` under the active unreleased or target release section.

5. Verify before calling the work done.
   - Run `pnpm build:check`.
   - Run `pnpm typecheck`.
   - Run `pnpm test` or, for a narrow local check, `bash test/re-sign-flow.sh`.
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
- Internal restore coverage still works for supported file-patch regression fixtures.
- Public help and the interactive menu must not advertise `status`, `apply`, `restore`, `install-watcher`, or `uninstall-watcher`.
- Public `launch` removes legacy auto-repair watcher files when present.

## Common Mistakes

- Updating file-patch regexes without updating internal restore logic.
- Treating a missing target as product behavior. First prove whether the bundle still contains the feature needle in a moved file or with a renamed minified hook.
- Writing a fixture assertion that passes on both guarded and patched code. For hidden-control fixes, assert both the patched replacement and the removal of the original guard, for example `if(!n)return null;` is gone.
- Describing a Codex build as supported before adding tests and whitelist coverage.
- Updating only one README and leaving English/Chinese docs out of sync.
- Publishing behavior changes without moving the maintenance checklist forward.
- Validating runtime launch only against extracted fixture files or source imports; generated CLI extraction and CDP timing can fail independently.
