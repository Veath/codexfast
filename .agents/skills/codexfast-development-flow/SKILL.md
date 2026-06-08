---
name: codexfast-development-flow
description: Use when iterating on codexfast features, bundle-patch signatures, compatibility gates, recovery behavior, or repo documentation in the codexfast repository.
---

# Codexfast Development Flow

## Overview

Use this skill for day-to-day `codexfast` feature work.

This repo is high risk because it launches and can test runtime patches against a real `/Applications/Codex.app` bundle. Public `launch` must leave the app bundle untouched. Legacy bundle mutation, file-patch, archive rewrite, re-sign, and restore flows have been removed.

## When To Use

- Adding or updating a patch target in `src/targets/*` or `src/patcher-targets.mts`
- Adapting to a new Codex bundle version
- Changing compatibility gating or bundle metadata handling
- Updating runtime launch, CDP interception, generated CLI composition, or hidden watcher cleanup
- Updating repo docs because behavior, support scope, or release guidance changed

Do not use this skill for release-only work. Use `codexfast-release-flow` for that.

## Core Rules

- Keep the generated CLI self-contained.
- Edit `src/*` as the source of truth, then run `pnpm build` to regenerate `bin/codexfast`.
- Preserve the runtime-only launcher. Do not reintroduce bundle unpack/repack, archive rewrite, persistent `Contents/Resources/app`, local `codesign`, or restore paths.
- Treat patch-signature and runtime interception changes as one unit.
- Do not add new public watcher commands. Current `launch` removes legacy auto-repair watcher files installed by older releases.
- Do not claim app behavior is fixed from code inspection alone. The regression suite must pass.

## Workflow

1. Inspect the current repo state.
   - Read `AGENTS.md`, `src/cli.mts`, the relevant `src/cli-*.mts` module, `src/patcher-targets.mts`, the relevant `src/targets/*` module, `test/runtime-launch-flow.mts`, `test/re-sign-flow.sh`, and the relevant README sections.
   - Use `src/targets/speed.mts`, `src/targets/plugins.mts`, and `src/targets/models.mts` for feature-specific target definitions; keep shared target builders in `src/targets/builders.mts`.
   - For runtime launch behavior, inspect `src/cli-runtime-launch.mts`, `src/cli-runtime-patcher.mts`, `src/cli-cdp.mts`, and `src/cli.mts` together because the generated CLI inlines those modules.
   - For app environment or watcher behavior, inspect `src/cli-app-environment.mts`, `src/cli-watcher.mts`, and `src/cli.mts` together.
   - If the change is bundle-specific, identify the exact gated text key, target file shape, and runtime URL shape first.
   - Do not trust a missing runtime match as proof that a feature target is gone. For every expected feature path, search the extracted bundle by stable needles such as `settings.agent.speed.label`, `composer.speedSlashCommand.title`, `composer.intelligenceDropdown.speed.title`, `featureRequirements?.fast_mode`, `sidebarElectron.pluginsDisabledTooltip`, `skills.pluginsAuthBlockedToast.title`, `pluginDeepLinkAuthBlocked`, `openai-curated-marketplaces-hidden`, `skills.appsPage.pluginsLimitedCatalog`, `plugins.install.connectorUnavailable`, `plugins.installModal.about`, `directoryApps`, `appsNeedingAuth`, and nearby `serviceTierSettings` / auth-method gates.
   - For Fast support, verify the source hook that computes service-tier allowance as well as the visible consumers. Settings, `/fast`, and composer Speed controls are not sufficient if `use-service-tier-settings-*.js` or an equivalent shared hook still collapses custom API users to standard.
   - Distinguish "target absent" from "target present but regex stale". A target is absent only after broad non-locale JS search shows the user-facing needle and adjacent gate are no longer present anywhere in `webview/assets`.
   - For runtime launch work, inspect the real CDP request URLs as well as the extracted archive paths. Current `26.513.20950` serves renderer JavaScript as `app://-/assets/*.js`, while older assumptions used `app://-/webview/assets/*.js`.
   - For runtime launch interception issues, verify the browser-level CDP auto-attach path first: `Target.setAutoAttach` must use `waitForDebuggerOnStart` and flattened sessions, `Fetch.enable` must run in the renderer `sessionId` before `Runtime.runIfWaitingForDebugger`, and the heartbeat should stay browser-level rather than page-level.

2. Make the smallest viable code change.
   - Keep patch logic narrow.
   - Prefer adding a new target spec over refactoring unrelated logic.
   - For compatibility gating, update the whitelist and surface the detected version/build clearly in output.
   - If changing the generated entrypoint, edit the source pieces, update `scripts/build-codexfast.mts` when a new `src/cli-*.mts` module must be inlined, and regenerate `bin/codexfast`.

3. Update regression coverage in the same change.
   - Extend `test/runtime-launch-flow.mts` for every new target, runtime path, hidden watcher cleanup path, or compatibility guard. Keep `test/re-sign-flow.sh` as the compatibility entrypoint.
   - Cover both positive and negative cases when relevant.
   - When changing runtime launch, cover generated single-file behavior. A source-level `patch-engine` import is not enough because the embedded runtime engine is extracted from generated `__PATCHER_SOURCE__`.

4. Update repo docs in the same change.
   - Update `README.md` when usage, compatibility policy, supported features, or recovery guidance changes.
   - Update `README.zh-CN.md` with the same behavior changes.
   - Keep README compatibility lists newest-first when adding or reordering verified Codex builds.
   - Keep public README usage focused on `launch`, `help`, and `version`.
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
- The shared Fast service-tier allowance/source hook still lets custom API users compute, persist, and send the selected Fast tier while preserving official ChatGPT `fast_mode` requirements.
- Composer `/fast` patch still works.
- Composer-side `Speed` menu patch still works for the target bundle:
  - `Add files and more / +` Speed submenu on builds that still expose the add-context path.
  - Composer `Intelligence` dropdown Speed submenu on newer builds where the add-context Speed entry moved.
- Every Plugins gate required by the target build still works, including sidebar access, page content, plugin detail redirects, curated catalog visibility, install-button availability, install-modal content, plugin detail app-connect content, and post-install app connect where present.
- Unsupported versions are blocked before runtime launch starts Codex.
- Generated CLI extraction still runs the embedded runtime patch engine.
- Public help and the interactive menu must not advertise `status`, `apply`, `restore`, `install-watcher`, or `uninstall-watcher`.
- Public `launch` removes legacy auto-repair watcher files when present.

## Common Mistakes

- Updating source target regexes without regenerating and inspecting the generated CLI.
- Treating a missing target as product behavior. First prove whether the bundle still contains the feature needle in a moved file or with a renamed minified hook.
- Validating Fast support only by making controls visible. Trace the selected tier back to the shared service-tier hook and request/config path so Fast is not silently normalized back to standard.
- Assuming old Plugins sidebar/page/detail gates are required on every new build. Some builds remove those gates but add new catalog or install gates, so required initial targets must stay build-specific.
- Writing a fixture assertion that passes on both guarded and patched code. For hidden-control fixes, assert both the patched replacement and the removal of the original guard, for example `if(!n)return null;` is gone.
- Describing a Codex build as supported before adding tests and whitelist coverage.
- Updating only one README and leaving English/Chinese docs out of sync.
- Publishing behavior changes without moving the maintenance checklist forward.
- Validating runtime launch only against extracted fixture files or source imports; generated CLI extraction and CDP timing can fail independently.
