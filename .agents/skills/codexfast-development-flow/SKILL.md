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
   - Do not trust a missing runtime match as proof that a feature target is gone. For every expected feature path, search the extracted bundle by stable needles such as `settings.agent.speed.label`, `composer.speedSlashCommand.title`, `composer.intelligenceDropdown.speed.title`, `featureRequirements?.fast_mode`, `sidebarElectron.pluginsDisabledTooltip`, `skills.pluginsAuthBlockedToast.title`, `pluginDeepLinkAuthBlocked`, `openai-curated-marketplaces-hidden`, `skills.appsPage.pluginsLimitedCatalog`, `4218407052`, `plugins.install.connectorUnavailable`, `plugins.installModal.about`, `directoryApps`, `appsNeedingAuth`, `use_hidden_models`, `availableModels:new Set`, `enabledReasoningEfforts`, `107580212`, `1186680773`, and nearby `serviceTierSettings` / auth-method gates.
   - For Fast support, verify the source hook that computes service-tier allowance and request-tier fallback, the request helper that computes `serviceTier` for send/edit/resume paths, the selected model metadata, and the visible consumers. Settings, `/fast`, and composer Speed controls are not sufficient if `use-service-tier-settings-*.js` or an equivalent shared hook still collapses custom API users to standard, if a helper near `Failed to read service tier for request` still gates non-ChatGPT/custom-provider paths with `:!1` or `authMethod != null`, if stale conversation-level service-tier state overrides Settings Fast, if latest-turn `params.serviceTier` from stop/edit/resend flows locks the current conversation to Standard, or if the selected model's `serviceTiers` / `additionalSpeedTiers` are missing after account switching.
   - If Settings Fast, `/fast`, and the composer Speed menu disappear together after account switching, inspect the current `read-config-for-host` model / `service_tier` and compare it with `list-models-for-host` metadata. On `26.623.70822`, the model-list handler can live in `app-initial~app-main~automations-page-*.js` as ``"list-models-for-host":n9((e,t)=>e.sendRequest(`model/list`,t))``. If official `gpt-5.5` is present without `serviceTiers` while another model such as `gpt-5.4` still has `{ id: "priority", name: "Fast" }`, fix `src/targets/models.mts` model-list augmentation rather than removing the `availableOptions.length` guard from speed controls.
   - For GPT-5.6 support, verify three distinct layers before changing `src/targets/models.mts`:
     - The patched `list-models-for-host` result or raw TanStack Query cache contains `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna` with Fast metadata. Sol and Terra support `low`, `medium`, `high`, `xhigh`, `max`, and `ultra`; Luna stops at `max` and must not advertise `ultra`.
     - The downstream query selector keeps those entries after remote model filtering. On `26.707.31428`, dynamic config `107580212` can set `use_hidden_models: true` and restrict `available_models`, while the selector separately filters `enabledReasoningEfforts` and Ultra through config `1186680773`.
     - The visible composer model-picker props/menu contains the three entries and the correct per-model effort options.
   - If the raw Query cache contains GPT-5.6 but the visible model menu does not, do not add another model-list wrapper. Inspect the selector near `select:({data:...})=>...availableModels:new Set(...)`, compare its selected `models` with the raw `["models","list",hostId,authMethod,limit]` cache, and add or update the dedicated GPT-5.6 query-selector target. Preserve Ultra until per-model filtering so Sol/Terra can expose it without adding it to Luna.
   - For Plugins catalog support, trace both the backend result and the UI consumption path. A successful `list-plugins` response with `openai-curated` plugins is not enough if `use-plugins-*.js` later excludes marketplace names, applies build-flavor filtering, or `plugins-page-selectors-*.js` selects only bundled sections. Inspect `Ne(t.marketplaces, ...)`, `He({buildFlavor,...})`, vertical-catalog flags such as `4218407052`, and selector defaults when the page shows only a sparse list.
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
   - For GPT-5.6, cover model-list injection and existing-entry normalization, Sol/Terra Max+Ultra, Luna Max without Ultra, downstream model/effort selector filtering, generated JavaScript validity, and repeated-patch idempotency.
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
- GPT-5.5 model-list metadata still supplies Fast service tiers when the official app entry omits them; switching accounts with GPT-5.5 selected must not hide Settings Fast, `/fast`, or the composer Speed menu.
- GPT-5.6 model-list metadata and the downstream query selector both work: Sol/Terra/Luna remain visible under `use_hidden_models`, Max/Ultra survive the enabled-effort filter, and Luna still excludes Ultra.
- The shared Fast service-tier allowance/source hook still lets custom API users, including custom `model_provider` configs whose account `authMethod` is `null`, compute, persist, and send the selected Fast tier while preserving official ChatGPT `fast_mode` requirements.
- The Fast request service-tier helper still lets send/edit/resume paths compute and send Fast for non-ChatGPT/custom-provider paths while preserving official ChatGPT `fast_mode` requirements.
- The shared Fast service-tier fallback path still ignores stale conversation-level service-tier state, so reopened conversations fall back to the configured Settings tier instead of forcing Standard.
- The shared Fast service-tier fallback path still ignores stale latest-turn `params.serviceTier`, so stopping a Fast response, editing the message, and resending in the same conversation does not force Standard or lock speed changes until restart.
- Composer `/fast` patch still works.
- Composer-side `Speed` menu patch still works for the target bundle:
  - `Add files and more / +` Speed submenu on builds that still expose the add-context path.
  - Composer `Intelligence` dropdown Speed submenu on newer builds where the add-context Speed entry moved.
- Every Plugins gate required by the target build still works, including sidebar access, page content, plugin detail redirects, curated catalog visibility, install-button availability, install-modal content, plugin detail app-connect content, and post-install app connect where present.
- Curated catalog validation checks the visible page, not only the backend. For builds with curated catalog support, the page must not collapse to only bundled addable plugins such as Computer Use and LaTeX after `list-plugins` returns the OpenAI curated marketplace.
- Unsupported versions are blocked before runtime launch starts Codex.
- Generated CLI extraction still runs the embedded runtime patch engine.
- Public help and the interactive menu must not advertise `status`, `apply`, `restore`, `install-watcher`, or `uninstall-watcher`.
- Public `launch` removes legacy auto-repair watcher files when present.

## Common Mistakes

- Updating source target regexes without regenerating and inspecting the generated CLI.
- Treating a missing target as product behavior. First prove whether the bundle still contains the feature needle in a moved file or with a renamed minified hook.
- Validating Fast support only by making controls visible. Trace the selected tier back to the shared service-tier hook, the request helper used by send/edit/resume commands, the request/config path, and conversation reload fallback so Fast is not silently normalized back to standard after relaunch, history restore, or edit/resend with changed reasoning effort.
- Assuming official GPT-5.5 visibility means complete model metadata. The app can return a visible `gpt-5.5` entry with no `serviceTiers` / `additionalSpeedTiers`, which collapses Fast options and hides Settings Fast, `/fast`, and composer Speed after account switching.
- Treating GPT-5.6 entries in the raw Query cache as proof that the UI is unlocked. `use_hidden_models` can apply `107580212.available_models` after `model/list`, and the effort selector can remove Max/Ultra independently; compare raw cache data with the visible model-picker props/menu.
- Enabling Ultra globally without preserving per-model metadata filtering. The selector may pass Ultra through, but Luna must remain without Ultra because its `supportedReasoningEfforts` stops at `max`.
- Assuming `serviceTierForRequest` covers every send path. Newer bundles can also call a helper near `Failed to read service tier for request`; if that helper returns false for non-ChatGPT paths or requires `authMethod != null`, UI can show Fast while outgoing requests still omit `service_tier`, and custom `model_provider` configs can look unselected even after `service_tier = "priority"` is written.
- Treating latest-turn `params.serviceTier` as safe request state. Stop/edit/resend flows can leave stale Standard there; tests must prove `serviceTierForRequest` falls back to the configured Settings tier.
- Validating Plugins catalog support only by calling `list-plugins`. Trace the returned marketplaces through `use-plugins-*.js` and `plugins-page-selectors-*.js`; a later exclusion can still hide `openai-curated` from the actual page.
- Assuming old Plugins sidebar/page/detail gates are required on every new build. Some builds remove those gates but add new catalog or install gates, so required initial targets must stay build-specific.
- Writing a fixture assertion that passes on both guarded and patched code. For hidden-control fixes, assert both the patched replacement and the removal of the original guard, for example `if(!n)return null;` is gone.
- Describing a Codex build as supported before adding tests and whitelist coverage.
- Updating only one README and leaving English/Chinese docs out of sync.
- Publishing behavior changes without moving the maintenance checklist forward.
- Validating runtime launch only against extracted fixture files or source imports; generated CLI extraction and CDP timing can fail independently.
- Expecting a rebuilt `bin/codexfast` to hot-update an already running app. Fully quit the current app and launcher, relaunch with the regenerated CLI, and confirm patched targets include both `GPT-5.x model list` and `GPT-5.6 model query selector` before validating the visible menu.
