# codexfast

[中文说明](./README.zh-CN.md)

**Re-enable hidden custom-API features in `Codex.app` on macOS.**

A single-file patcher for custom-API Codex users. It auto-checks version compatibility, repacks `app.asar`, and performs a local ad-hoc re-sign — no manual bundle editing.

- **Fast settings** control in Settings
- **Composer `/fast`** slash command
- **Speed submenu** under `Add files and more / +`
- **Plugins access** for custom-API users

```bash
npx codexfast
```

Verified for `Codex.app` `26.415.40636` (`build 1799`) and `26.417.41555` (`build 1858`). Feature scope: [`docs/feature-scope.md`](./docs/feature-scope.md).

## What It Does

Three menu actions on the installed app:

1. **View current status** — detect version, target files, and whether patching is safe
2. **Enable custom API features** — restore the feature set above
3. **Restore original state** — roll back to the vendor bundle

Patching unpacks `app.asar`, rewrites the frontend assets, repacks, updates the `ElectronAsarIntegrity` hash in `Info.plist`, and ad-hoc re-signs so `Codex.app` still launches.

## Usage

macOS only. Requires `Codex.app` at `/Applications`, plus `node`, `npm`, and the built-in `codesign`.

```bash
npx codexfast
```

Or from a clone of this repo:

```bash
./codexfast.sh
```

Always run **View current status** first. Only enable when compatibility is `supported`.

## Compatibility

The script does not use an official API — it matches code signatures in frontend build output, so it can break after a Codex update.

- Verified on `Codex.app` `26.415.40636` (`build 1799`)
- Verified on `Codex.app` `26.417.41555` (`build 1858`)
- **Enable** is blocked unless the installed version/build is whitelisted
- **View status** and **Restore** work on any version
- For Plugins, the script only removes the custom-API sidebar gate — actual plugin availability can still depend on connectors, plugin state, or admin restrictions

Re-run **View current status** after every Codex update.

## Backup and Restore

First apply creates two backups:

- `app.asar1` — archive-level backup of the original bundle
- `*.speed-setting.bak` — file-level fallback

**Restore** prefers `app.asar1`, falls back to `.bak`, then inline restoration. A future Codex auto-update may overwrite the patched state.

> The local ad-hoc re-sign passes `codesign` integrity checks but replaces the vendor notarization. `spctl --assess` returning `rejected` is expected — use `codesign --verify --deep --strict /Applications/Codex.app` to verify instead.

## Troubleshooting

**Script fails immediately** — check `/Applications/Codex.app` exists, plus `node -v`, `npm -v`, `codesign -h`.

**Re-sign step fails (macOS refused write)** — run manually:

```bash
codesign --force --deep --sign - /Applications/Codex.app
```

**Target not found / version unsupported** — do not continue, do not hand-patch. The build likely needs a new adaptation.

**Plugins visible but still unusable** — not caused by this script. Check connector availability, plugin state, or admin-side restrictions.

**`Codex.app` won't open after an old broken run** (left `Resources/app` behind or wrote a bad integrity hash):

1. Delete `/Applications/Codex.app/Contents/Resources/app`
2. Rename `app.asar1` back to `app.asar`
3. Reopen `Codex.app`
