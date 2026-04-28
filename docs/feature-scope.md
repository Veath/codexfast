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

### Composer Speed menu

- Exposes the composer-side `Speed` menu.
- On `26.415.40636` and `26.417.41555`, this is the `Add files and more / +` Speed submenu.
- On `26.422.21637`, `26.422.30944`, and `26.422.62136`, this is the composer `Intelligence` dropdown Speed submenu.
- On supported builds this menu should surface `Standard` and `Fast`.

### Plugins sidebar access for custom API users

- Exposes the `Plugins` sidebar/page access path for custom API users on supported builds.
- This removes the sidebar auth-method gate for API-key users.
- This does not guarantee that every plugin install or connector flow is available. Connector availability, plugin state, or admin-side restrictions may still block a specific plugin.

### GPT-5.5 model-list entry for custom API users

- Exposes `GPT-5.5` in the app model list on supported builds when the bundled model catalog does not include it.
- On `26.422.21637`, the app filters the raw `model/list` response into `modelsByType` before rendering menus, so the patch also preserves the injected entry after that query selector filter.
- On `26.422.30944` and later builds, GPT-5.5 is expected to be visible through the official app path. `codexfast` skips GPT-5.5 apply targets from that version onward, while restore still recognizes earlier `0.5.2` GPT-5.5 patch markers.
- This injects the UI catalog metadata only. The configured custom API provider must still accept `gpt-5.5` at request time.
- This does not replace the app's model execution path or make Codex merge arbitrary custom provider `/v1/models` responses into the UI catalog.

## Scope Rules

- `Settings-side Fast control`, composer `/fast`, and the composer-side `Speed` menu should be treated as one combined Fast feature set.
- `Plugins` support should not be described as available unless the sidebar gate patch still works cleanly on the target build.
- `GPT-5.5` model-list support should not be described as provider support. It is only a UI catalog entry.
- Compatibility claims must also match `docs/compatibility-matrix.md` and the strict whitelist in `src/cli.mts`.
