# Patch Targets

This document maps each exposed feature path to its current bundle target and patch intent.

Use it before changing regexes, adding a new feature target, or adapting to a new Codex build.

## Current Targets

`launch` uses these target definitions for the public runtime path. Runtime launch applies matching replacements in memory through the local CDP session and leaves the app bundle untouched. The older file-patch path still uses the same target definitions in internal regression coverage, but it is no longer exposed as a public command.

For file-patch regression coverage, target files are inspected inside `app/webview/assets` after extracting `app.asar`. For runtime launch, the same renderer assets may be requested with different `app://` URL shapes. Current `26.513.20950` uses `app://-/assets/*.js`; older assumptions used `app://-/webview/assets/*.js`. Runtime matchers must account for both when CDP Fetch interception changes.

Source layout:

- `src/targets/speed.mts` owns Settings Fast, `/fast`, and composer Speed target definitions.
- `src/targets/plugins.mts` owns Plugins sidebar, page, detail, install, modal, and composer mention target definitions.
- `src/targets/models.mts` owns GPT-5.5 model-list bridge targets.
- `src/targets/builders.mts` owns shared target-spec builders.
- `src/patcher-targets.mts` aggregates the feature target modules for both runtime launch and internal file-patch coverage.
- `src/patcher.mts` remains the legacy file-patch orchestration layer; do not put new target metadata there.

| Feature | Target label | Current file | Needle | Patch intent |
| --- | --- | --- | --- | --- |
| Settings-side Fast control | `Speed setting` | `general-settings-*.js` | `settings.agent.speed.label` | Remove the guarded Fast-settings early return. |
| Composer `/fast` slash command | `Fast slash command` | `index-*.js` or `composer-*.js` | `composer.speedSlashCommand.title` | Force the slash command entry to be enabled. |
| Composer Speed menu on `26.415.40636` and `26.417.41555` | `Add-context Speed menu` | `use-model-settings-*.js` | `composer.addContext.speed.option.fast.description` | Force the menu gate to enabled so the `Speed` submenu renders. |
| Composer Speed menu on `26.422.21637`, `26.422.30944`, `26.422.62136`, `26.422.71525`, `26.429.20946`, `26.429.30905`, `26.429.61741`, `26.506.21252`, `26.506.31421`, `26.513.20950`, and `26.513.31313` | `Composer Intelligence Speed menu` | `index-*.js` or `composer-*.js` | `composer.intelligenceDropdown.speed.title` | Force the Intelligence dropdown speed gate to enabled so the `Speed` submenu renders. |
| Plugins sidebar access | `Plugins access` | `index-*.js` or a nearby sidebar asset | `sidebarElectron.pluginsDisabledTooltip` | Remove the API-key gate for both the disabled Plugins nav item and any adjacent unified Skills/Plugins label state in the matched local assignments. |
| Plugins page content on `26.429.20946`, `26.429.30905`, `26.429.61741`, `26.506.21252`, `26.506.31421`, `26.513.20950`, and `26.513.31313` | `Plugins page content` | `skills-page-*.js` | `skills.pluginsAuthBlockedToast.title` | Force the `/skills` route to render the Plugins page content instead of falling back to the skills-only view for API-key users. |
| Plugin detail deep links on `26.429.20946`, `26.429.30905`, `26.429.61741`, `26.506.21252`, `26.506.31421`, `26.513.20950`, and `26.513.31313` | `Plugin detail access` | `plugin-detail-page-*.js` | `pluginDeepLinkAuthBlocked` | Remove the API-key redirect that sends plugin detail deep links back to `/skills`. |
| Plugin install buttons on `26.429.20946`, `26.429.30905`, `26.429.61741`, `26.506.21252`, `26.506.31421`, `26.513.20950`, and `26.513.31313` | `Plugin install availability` | `use-plugin-install-flow-*.js`, `plugins-availability-*.js`, or `check-plugin-availability-*.js` | `plugins.install.connectorUnavailable` or `connector-unavailable` | Stop the aggregate `connector-unavailable` state from disabling the top-level install action while preserving the `disabled-by-admin` block. |
| Plugin install modal details on `26.429.20946`, `26.429.30905`, `26.429.61741`, `26.506.21252`, `26.506.31421`, `26.513.20950`, and `26.513.31313` | `Plugin install modal content` | `use-plugin-install-flow-*.js` or `plugins-availability-*.js` | `plugins.installModal.about` | Keep the modal's basic plugin information visible for `ON_INSTALL` app plugins instead of relying only on connector disclosure data. |
| Composer `@` plugin mentions on `26.513.20950` and `26.513.31313` | `Composer plugin mentions` | `prosemirror-*.js` | `composer.atMentionList.pluginsLoading` | Remove the extra `shared-with-me` remote marketplace request so plugin mentions can use local and already available plugin results under API-key auth. |
| GPT-5.5 model-list entry on `26.422.21637` | `GPT-5.5 model list` | `index-*.js` | `"list-models-for-host"` | Wrap the app bridge model-list handler so it appends a Codex-shaped `gpt-5.5` entry when the returned list does not already include it. |
| GPT-5.5 model-list entry on `26.422.21637` | `GPT-5.5 model query selector` | `font-settings-*.js` | `modelsByType` | Append the same Codex-shaped `gpt-5.5` entry after the model query selector filters raw models into `modelsByType.models`. |

## Current Restore Rules

- `Speed setting`
  - Restore the guarded `if(!x)return null;` shape, or file backup if present
- `Fast slash command`
  - Restore the original enabled variable instead of a forced `!0`
- `Add-context Speed menu`
  - Restore the original gate local assignment (`Cr()` or `cr()` depending on build)
- `Composer Intelligence Speed menu`
  - Restore the original gate local assignment (`_f()`, `gf()`, `qs(...)`, or `va(...)` depending on build)
- `Plugins access`
  - Restore the original auth-method-derived disabled-nav and label assignments for the matched build
- `Plugins page content`
  - Restore the original API-key-derived page-content gate local assignment
- `Plugin detail access`
  - Restore the original API-key redirect guard around plugin detail deep links
- `Plugin install availability`
  - Restore the original aggregate `connector-unavailable` install block while preserving the existing admin-disabled branch
- `Plugin install modal content`
  - Restore the original `ON_INSTALL` disclosure-only modal content gate
- `Composer plugin mentions`
  - Restore the original `shared-with-me` additional marketplace option
- `GPT-5.5 model list`
  - Restore the original `list-models-for-host` bridge handler without the `codexfast-gpt55` injection wrapper
- `GPT-5.5 model query selector`
  - Restore the original `modelsByType` selector return without the `codexfast-gpt55-select` injection wrapper

## Build-Specific Skips

- On `26.422.30944` and later builds, `codexfast` does not apply the `GPT-5.5 model list` or `GPT-5.5 model query selector` targets because GPT-5.5 is expected to be visible through the official app path from that version onward.
- Restore still recognizes those GPT-5.5 patch markers on `26.422.30944` and later builds to recover apps that were patched by `codexfast` `0.5.2`.
- On `26.422.62136`, the Settings-side Fast target remains in `general-settings-*.js`, but the service-tier hook changed to `xe()`.
- On `26.422.71525`, the Settings-side Fast target remains in `general-settings-*.js`, but the availability/service-tier hook shape changed to `N()` with `ye()`. The composer Intelligence Speed gate changed from `_f()` to `gf()` with `Yp()`, and the Plugins experiment helper changed from `$f("533078438")` to `Qf("533078438")`.
- On `26.429.20946`, the Settings-side Fast target remains in `general-settings-*.js`, but the availability/service-tier hook shape changed to `de()` with `Ve()`. The `/fast` slash command and Intelligence Speed target moved to `composer-*.js`; Intelligence Speed now renders from a `qs(...)` gate. Plugins uses `ms("533078438")` with `ed(authMethod)` in the sidebar, and also has separate `/skills` page-content, plugin-detail redirect, plugin-install availability, and plugin-install modal content gates.
- On `26.429.30905`, the `26.429.20946` target mapping still applies with renamed asset files. The Intelligence Speed gate still uses `qs(...)`, but the adjacent `zr(...)` selector local changed, so the matcher accepts that minified selector name instead of a single hard-coded local.
- On `26.429.61741`, the `26.429.30905` target mapping still applies with the same inspected asset file names and gate signatures.
- On `26.506.21252`, the Settings-side Fast target moved to `general-settings-BNOywoSY.js` and now uses `ie()` for availability with `de()` as the service-tier hook. The `/fast` slash command and Intelligence Speed target moved to `composer-D82P7v-B.js`; Intelligence Speed now renders from a `va(...)` gate next to `fi(_T,n)`. Plugins sidebar access moved to `app-main-DOFYRRSd.js` and uses `rs("533078438")`, `Xc(authMethod)`, and `Se({hostId:eo})`. Plugin install gates moved to `plugins-availability-DMayGLTU.js`.
- On `26.506.31421`, the `26.506.21252` target mapping still applies with renamed assets. The Plugins sidebar access target now uses `Qo("533078438")` and `Nc({hostId:Ya})` while retaining the `Xc(authMethod)` API-key gate.
- On `26.513.20950`, the Settings-side Fast target moved to `general-settings-Bvwhh0-i.js` and now uses `se()` for availability with `fe()` as the service-tier hook. The `/fast` slash command and Intelligence Speed target moved to `composer-CL8HPtlL.js`; Intelligence Speed now renders through an inline `ve=v?...:null` assignment. Plugins sidebar access moved to `app-main-Dsg36Y4q.js` and uses `Is("533078438")`, `Ml(authMethod)`, and `hl({hostId:Io})`. Plugin install availability moved to `check-plugin-availability-Cl1_8Dsf.js`. Composer `@` plugin mentions moved through `prosemirror-DbRBBq50.js` and request `additionalMarketplaceKinds:[\`shared-with-me\`]`.
- On `26.513.31313`, the `26.513.20950` target mapping still applies with renamed assets. Intelligence Speed still uses the inline `ve=v?...:null` assignment, but the render component local changed from `KR` to `qR`. Plugins sidebar access uses `ec("533078438")`, `Xl(authMethod)`, and `Nl({hostId:Qo})`. Composer `@` plugin mentions now request `additionalMarketplaceKinds:s?[\`shared-with-me\`]:[]`, where `s` is the `N("1269116100")` feature flag result.

## Update Rules

- If a feature target moves to a new bundle file, update this document and the relevant bundle note together.
- If a patch changes from "force enabled" to another strategy, record the new intent here.
- Keep this file high-level. Put build-specific notes in `docs/bundle-notes/`.
