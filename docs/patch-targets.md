# Patch Targets

This document maps each exposed feature path to its current bundle target and patch intent.

Use it before changing regexes, adding a new feature target, or adapting to a new Codex build.

## Current Targets

| Feature | Target label | Current file | Needle | Patch intent |
| --- | --- | --- | --- | --- |
| Settings-side Fast control | `Speed setting` | `general-settings-*.js` | `settings.agent.speed.label` | Remove the guarded Fast-settings early return. |
| Composer `/fast` slash command | `Fast slash command` | `index-*.js` | `composer.speedSlashCommand.title` | Force the slash command entry to be enabled. |
| Composer Speed menu on `26.415.40636` and `26.417.41555` | `Add-context Speed menu` | `use-model-settings-*.js` | `composer.addContext.speed.option.fast.description` | Force the menu gate to enabled so the `Speed` submenu renders. |
| Composer Speed menu on `26.422.21637` | `Composer Intelligence Speed menu` | `index-*.js` | `composer.intelligenceDropdown.speed.title` | Force the Intelligence dropdown speed gate to enabled so the `Speed` submenu renders. |
| Plugins sidebar access | `Plugins access` | `index-*.js` or a nearby sidebar asset | `sidebarElectron.pluginsDisabledTooltip` | Remove the API-key gate for both the disabled Plugins nav item and any adjacent unified Skills/Plugins label state in the matched local assignments. |
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
  - Restore the original gate local assignment (`_f()`)
- `Plugins access`
  - Restore the original auth-method-derived disabled-nav and label assignments for the matched build
- `GPT-5.5 model list`
  - Restore the original `list-models-for-host` bridge handler without the `codexfast-gpt55` injection wrapper
- `GPT-5.5 model query selector`
  - Restore the original `modelsByType` selector return without the `codexfast-gpt55-select` injection wrapper

## Update Rules

- If a feature target moves to a new bundle file, update this document and the relevant bundle note together.
- If a patch changes from "force enabled" to another strategy, record the new intent here.
- Keep this file high-level. Put build-specific notes in `docs/bundle-notes/`.
