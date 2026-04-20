# Feature Scope

This document defines the user-facing feature paths currently exposed by `codexfast`.

Use it when you need a quick answer to "what does this repo actually enable?" before reading bundle-specific notes.

## Current Feature Set

### Settings-side Fast control

- Exposes the Fast-related control in Codex Settings on supported builds.
- This is the Settings/UI path for the Fast feature set.

### Composer `/fast` slash command

- Exposes the `/fast` slash command in the composer.
- This is the prompt-side command path for enabling or disabling Fast mode during composition.

### `Add files and more / +` Speed submenu

- Exposes the `Speed` submenu under the composer attachment/context menu.
- On supported builds this submenu should surface `Standard` and `Fast`.

### Plugins sidebar access for custom API users

- Exposes the `Plugins` sidebar/page access path for custom API users on supported builds.
- This removes the sidebar auth-method gate for API-key users.
- This does not guarantee that every plugin install or connector flow is available. Connector availability, plugin state, or admin-side restrictions may still block a specific plugin.

## Scope Rules

- `Settings-side Fast control`, composer `/fast`, and the add-context `Speed` submenu should be treated as one combined Fast feature set.
- `Plugins` support should not be described as available unless the sidebar gate patch still works cleanly on the target build.
- Compatibility claims must also match `docs/compatibility-matrix.md` and the strict whitelist in `codexfast.sh`.
