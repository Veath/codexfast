# codexfast - enable Fast mode, GPT-5.5, and Plugins in OpenAI Codex.app

[中文说明](./README.zh-CN.md)

**A macOS patch script for OpenAI `Codex.app` that re-enables hidden custom API features on verified compatible builds.**

`codexfast` is a single-file OpenAI Codex.app patcher for custom API users on macOS. It restores hidden Fast mode features such as the Settings Fast control, the composer `/fast` slash command, the composer Speed menu, GPT-5.5 model-list compatibility where needed, and Plugins access.

- **Fast settings** control in Settings
- **Composer `/fast`** slash command
- **Speed submenu** in the composer
- **GPT-5.5** model-list compatibility for custom-API users where the supported build still needs it
- **Plugins access** for custom-API users

```bash
npx codexfast
```

Verified for `Codex.app` `26.415.40636` (`build 1799`), `26.417.41555` (`build 1858`), `26.422.21637` (`build 2056`), and `26.422.30944` (`build 2080`). Feature scope: [`docs/feature-scope.md`](./docs/feature-scope.md).

## What It Does

Three menu actions on the installed app:

1. **View current status** — detect version, target files, and whether patching is safe
2. **Enable custom API features** — restore the feature set above
3. **Restore original state** — roll back to the vendor bundle

Patching unpacks `app.asar`, rewrites the frontend assets, repacks, updates the `ElectronAsarIntegrity` hash in `Info.plist`, and ad-hoc re-signs so `Codex.app` still launches.

## Usage

macOS only. Requires `Codex.app` at `/Applications`, Node.js `>=22.12.0`, `npm`, and the built-in `codesign`.

Run the patcher:

```bash
npx codexfast
```

Or from a clone of this repo:

```bash
./bin/codexfast
```

The script opens an interactive menu:

```text
1) View current status
2) Enable custom API features
3) Restore original state
q) Quit
```

### View Status

Choose **1) View current status** before changing anything. Status checks the installed `Codex.app`, reports the detected version/build, shows whether the build is `supported`, and lists the patch targets found in the app bundle.

Use this after every Codex update. If compatibility is not `supported`, do not enable the patch on that build.

### Enable Features

Choose **2) Enable custom API features** when status reports a supported build. This enables the supported feature set:

- Fast control in Settings
- `/fast` slash command in the composer
- Speed menu in the composer
- GPT-5.5 in the model list where the supported build still needs the compatibility patch
- Plugins sidebar access for custom-API users

The first enable run creates backups, updates `app.asar`, refreshes the Electron ASAR integrity hash, and runs an ad-hoc re-sign. Because re-signing changes the app identity used by macOS privacy checks, apply also resets the `Codex.app` screen-recording permission record. Restart `Codex.app` after the script finishes and allow Screen & System Audio Recording when macOS asks.

### Disable or Restore

Choose **3) Restore original state** to turn the patch off. Restore rolls `Codex.app` back to the vendor bundle when the archive backup is available, then re-signs if needed.

Use restore before troubleshooting, before testing a fresh Codex update, or whenever you want to return to the original app behavior.

## Compatibility

The script does not use an official API — it matches code signatures in frontend build output, so it can break after a Codex update.

- Verified on `Codex.app` `26.415.40636` (`build 1799`)
- Verified on `Codex.app` `26.417.41555` (`build 1858`)
- Verified on `Codex.app` `26.422.21637` (`build 2056`)
- Verified on `Codex.app` `26.422.30944` (`build 2080`)
- **Enable** is blocked unless the installed version/build is whitelisted
- **View status** and **Restore** work on any version
- The GPT-5.5 model-list patch only injects the UI catalog entry on supported builds that still need it. `Codex.app` `26.422.30944` and later builds are expected to expose GPT-5.5 through the official app path, so `codexfast` skips that apply target from `26.422.30944` onward. Your configured provider must still support `gpt-5.5`
- For Plugins, the script only removes the custom-API sidebar gate — actual plugin availability can still depend on connectors, plugin state, or admin restrictions

Re-run **View current status** after every Codex update.

## Backup and Restore

First apply creates two backups:

- `app.asar1` — archive-level backup of the original bundle
- `*.codexfast.bak` — file-level fallback. Restore also recognizes the legacy `*.speed-setting.bak` suffix from earlier releases.

**Restore** prefers `app.asar1`, falls back to `.bak`, then inline restoration. A future Codex auto-update may overwrite the patched state.

> The local ad-hoc re-sign passes `codesign` integrity checks but replaces the vendor notarization. `spctl --assess` returning `rejected` is expected — use `codesign --verify --deep --strict --verbose=2 /Applications/Codex.app` to verify instead.

## Troubleshooting

**Script fails immediately** — check `/Applications/Codex.app` exists, plus `node -v` reports `22.12.0` or later, `npm -v`, and `codesign -h`.

**Re-sign step fails (macOS refused write)** — run manually:

```bash
codesign --force --deep --sign - /Applications/Codex.app
```

**macOS keeps asking to record this computer's screen and audio** — apply resets the screen-recording permission record after re-signing. Fully quit `Codex.app`, reopen it, and allow Screen & System Audio Recording in System Settings when prompted.

**Target not found / version unsupported** — do not continue, do not hand-patch. The build likely needs a new adaptation.

**Plugins visible but still unusable** — not caused by this script. Check connector availability, plugin state, or admin-side restrictions.

**GPT-5.5 visible but requests fail** — the UI entry is present, but your custom API provider still needs to accept `model: "gpt-5.5"`.

**`Codex.app` won't open after an old broken run** (left `Resources/app` behind or wrote a bad integrity hash):

1. Delete `/Applications/Codex.app/Contents/Resources/app`
2. Rename `app.asar1` back to `app.asar`
3. Reopen `Codex.app`

## License

MIT. See [`LICENSE`](./LICENSE).
