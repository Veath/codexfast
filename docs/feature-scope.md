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
- On `26.422.21637`, `26.422.30944`, `26.422.62136`, `26.422.71525`, `26.429.20946`, `26.429.30905`, `26.429.61741`, `26.506.21252`, `26.506.31421`, and `26.513.20950`, this is the composer `Intelligence` dropdown Speed submenu.
- On supported builds this menu should surface `Standard` and `Fast`.

### Sparkle in-app update bridge

- On patched `26.506.31421` (`build 2620`) installs, `apply` and watcher `repair` update the app's `SUPublicEDKey` to the public EdDSA key used by `26.513.20950` (`build 2816`) and keep a `SUPublicEDKey.codexfast.bak` backup.
- This is a build-specific compatibility bridge for Sparkle update validation after local ad-hoc signing. It does not replace Sparkle or guarantee future key rotations without another adaptation.
- `restore` writes the backed-up key back when the backup exists.

### Plugins sidebar access for custom API users

- Exposes the `Plugins` sidebar/page access path for custom API users on supported builds.
- This removes the relevant auth-method gates for API-key users. On newer builds this includes the sidebar entry, the `/skills` Plugins page content gate, plugin detail deep-link redirects, the aggregate connector-unavailable install block, and the install-modal disclosure-only content gate when present.
- On `26.513.20950`, this also keeps the composer `@` plugin mention list from requesting the remote `shared-with-me` plugin catalog, so local and already available plugin mentions can load under API-key auth.
- This does not guarantee that every plugin or connector flow is available. Plugin state, connector runtime behavior, or admin-side restrictions may still block a specific plugin.
- This does not unlock the remote ChatGPT shared plugin marketplace; that catalog still requires ChatGPT authentication.

### GPT-5.5 model-list entry for custom API users

- Exposes `GPT-5.5` in the app model list on supported builds when the bundled model catalog does not include it.
- On `26.422.21637`, the app filters the raw `model/list` response into `modelsByType` before rendering menus, so the patch also preserves the injected entry after that query selector filter.
- On `26.422.30944` and later builds, GPT-5.5 is expected to be visible through the official app path. `codexfast` skips GPT-5.5 apply targets from that version onward, while restore still recognizes earlier `0.5.2` GPT-5.5 patch markers.
- This injects the UI catalog metadata only. The configured custom API provider must still accept `gpt-5.5` at request time.
- This does not replace the app's model execution path or make Codex merge arbitrary custom provider `/v1/models` responses into the UI catalog.

## Scope Rules

- `Settings-side Fast control`, composer `/fast`, and the composer-side `Speed` menu should be treated as one combined Fast feature set.
- `Plugins` support should not be described as available unless the sidebar/page gates still work cleanly on the target build.
- `GPT-5.5` model-list support should not be described as provider support. It is only a UI catalog entry.
- Compatibility claims must also match `docs/compatibility-matrix.md` and the strict whitelist in `src/supported-app-versions.mts`.
