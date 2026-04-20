# Patch Targets

This document maps each exposed feature path to its current bundle target and patch intent.

Use it before changing regexes, adding a new feature target, or adapting to a new Codex build.

## Current Targets

| Feature | Target label | Current file | Needle | Patch intent |
| --- | --- | --- | --- | --- |
| Settings-side Fast control | `Speed setting` | `general-settings-BZQqrI-r.js` | `settings.agent.speed.label` | Remove the guarded Fast-settings early return. |
| Composer `/fast` slash command | `Fast slash command` | `index-n7COQvZQ.js` | `composer.speedSlashCommand.title` | Force the slash command entry to be enabled. |
| `Add files and more / +` Speed submenu | `Add-context Speed menu` | `use-model-settings-DEaRTAXy.js` | `composer.addContext.speed.option.fast.description` | Force the menu gate to enabled so the `Speed` submenu renders. |
| Plugins sidebar access | `Plugins access` | `index-n7COQvZQ.js` | `sidebarElectron.pluginsDisabledTooltip` | Remove the API-key sidebar auth-method gate in the matched local assignment. |

## Current Restore Rules

- `Speed setting`
  - Restore the guarded `if(!x)return null;` shape, or file backup if present
- `Fast slash command`
  - Restore the original enabled variable instead of a forced `!0`
- `Add-context Speed menu`
  - Restore the `Cr()` gate
- `Plugins access`
  - Restore the original `authMethod === "apikey"` local assignment

## Update Rules

- If a feature target moves to a new bundle file, update this document and the relevant bundle note together.
- If a patch changes from "force enabled" to another strategy, record the new intent here.
- Keep this file high-level. Put build-specific notes in `docs/bundle-notes/`.
