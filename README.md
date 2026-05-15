# codexfast - enable Fast mode, GPT-5.5, and Plugins in OpenAI Codex.app

[中文说明](./README.zh-CN.md)

**A macOS runtime launcher and legacy patch script for OpenAI `Codex.app` that re-enables hidden custom API features on verified compatible builds.**

`codexfast` is a single-file OpenAI Codex.app launcher for custom API users on macOS. The recommended path is runtime launch mode, which opens Codex with temporary runtime patches for hidden Fast mode features such as the Settings Fast control, the composer `/fast` slash command, the composer Speed menu, GPT-5.5 model-list compatibility where needed, and Plugins access. Legacy bundle patching remains available as a fallback.

- **Fast settings** control in Settings
- **Composer `/fast`** slash command
- **Speed submenu** in the composer
- **GPT-5.5** model-list compatibility for custom-API users where the supported build still needs it
- **Plugins access** for custom-API users
- **Browser-use native pipe compatibility** for locally ad-hoc signed apps

```bash
npx codexfast launch
```

Verified for `Codex.app` `26.513.20950` (`build 2816`), `26.506.31421` (`build 2620`), `26.506.21252` (`build 2575`), `26.429.61741` (`build 2429`), `26.429.30905` (`build 2345`), `26.429.20946` (`build 2312`), `26.422.71525` (`build 2210`), `26.422.62136` (`builds 2180, 2176`), `26.422.30944` (`build 2080`), `26.422.21637` (`build 2056`), `26.417.41555` (`build 1858`), and `26.415.40636` (`build 1799`). Feature scope: [`docs/feature-scope.md`](./docs/feature-scope.md).

## What It Does

Menu actions on the installed app:

1. **Launch Codex with runtime patches** — recommended; opens Codex with temporary runtime patches for this session
2. **Check current status** — detect version, compatibility, and whether each legacy bundle target is enabled
3. **Apply legacy bundle patches** — fallback path for modifying the installed bundle
4. **Restore legacy bundle patch backups** — roll back legacy bundle changes
5. **Install auto-repair watcher** — re-apply legacy bundle patches after a supported Codex update replaces `app.asar`
6. **Uninstall auto-repair watcher** — remove the launchd watcher

Runtime launch does not modify `app.asar`, `Info.plist`, the app bundle, or the app signature. Legacy bundle patching still unpacks `app.asar`, rewrites the frontend assets, repacks, updates the `ElectronAsarIntegrity` hash in `Info.plist`, and ad-hoc re-signs so `Codex.app` still launches.

## How It Works

`Codex.app` already contains the Fast, `/fast`, Speed, model-list, and Plugins UI paths in its packaged frontend bundle, but some of those paths are hidden or disabled for custom API users by local gate checks. `codexfast` does not add a new backend service or call a private OpenAI API.

The recommended `launch` command starts Codex with a local Chrome DevTools Protocol endpoint for that launched session, intercepts matching renderer JavaScript responses, and applies the same narrow patch rules in memory. When the launched session exits, those runtime patches are gone. This mode does not rewrite the installed app bundle and does not replace the original code signature.

The legacy `apply` fallback changes the installed app bundle on verified builds.

The patcher reads the installed app version and build from `Info.plist`, then allows `launch` and legacy `apply` only when that exact version/build is in the strict compatibility whitelist. For a supported build, legacy `apply` unpacks `Contents/Resources/app.asar` into a temporary directory, searches `webview/assets/*.js` for stable feature needles, and applies narrow code-signature replacements that remove the custom-API gates or force the local UI availability flag on.

The unpack/repack step is required because Codex ships its renderer code inside the packed Electron archive `app.asar`; patching loose files under `Contents/Resources/app` would leave the app in a non-standard layout and can conflict with future updates. `codexfast` works in a temporary extraction directory and replaces only the packed `app.asar` archive.

Before replacing the archive, it keeps recovery paths: an archive backup at `app.asar1` plus file-level `*.codexfast.bak` backups inside the repacked bundle. After repacking, it updates Electron's ASAR integrity hash in `Info.plist`. Because changing `app.asar` invalidates the app's original code signature, it then performs a local ad-hoc `codesign` so macOS can launch the modified app. This local signature passes `codesign` verification, but it replaces the vendor notarization, so macOS privacy permissions such as screen recording may need to be granted again. Restore reverses this by preferring the archive backup, then file backups, then inline restore rules.

For patched `26.506.31421` (`build 2620`) installs, `apply` and watcher `repair` also back up `SUPublicEDKey` and update it to the public EdDSA key used by `26.513.20950` (`build 2816`). This preserves Sparkle's in-app update validation path after the app has been locally ad-hoc signed. Restore puts the original key back when the backup is present.

For browser-use / `@chrome` communication, supported builds also include a narrow native pipe peer-auth compatibility patch. It wraps the local `authorizeSocketPeer` result and only maps the `missing-code-signing-identity` rejection caused by local ad-hoc signing to an authorized result. Other native pipe peer-auth failures remain rejected. This lowers the local native pipe peer verification strength for that one compatibility reason; it is not equivalent to restoring OpenAI's Developer ID signature.

## Usage

macOS only. Requires `Codex.app` at `/Applications`, Node.js `>=18.12.0`, `npm`, and the built-in `codesign`.

Recommended runtime launch:

```bash
npx codexfast launch
```

Or from a clone of this repo:

```bash
./bin/codexfast launch
```

Print help or the installed package version:

```bash
npx codexfast help
npx codexfast version
```

The script opens an interactive menu:

```text
1) Launch Codex with runtime patches (recommended)
2) Check current status
3) Apply legacy bundle patches (fallback)
4) Restore legacy bundle patch backups
5) Install auto-repair watcher
6) Uninstall auto-repair watcher
q) Quit
```

The same actions are also available as non-interactive commands: `launch`, `status`, `apply`, `restore`, `install-watcher`, and `uninstall-watcher`.

### Command Reference

| Command | Purpose |
| --- | --- |
| `npx codexfast launch` | Launch Codex with runtime patches for the current session. This is the recommended path and does not modify the installed bundle or app signature. |
| `npx codexfast status` | Inspect the installed `Codex.app`, print the detected version/build, compatibility state, and target patch status without changing the app. |
| `npx codexfast apply` | Legacy fallback: apply the supported patch set to a compatible build, create backups, refresh Electron ASAR integrity, ad-hoc re-sign, and reset the screen-recording permission record. |
| `npx codexfast restore` | Legacy fallback: remove the auto-repair watcher if installed, restore the vendor bundle from backup or inline restore rules, re-sign if needed, and reset the screen-recording permission record after a successful restore. |
| `npx codexfast install-watcher` | Legacy fallback: install the per-user macOS `launchd` auto-repair watcher that monitors `app.asar` and runs the latest published `repair` after supported Codex updates. |
| `npx codexfast uninstall-watcher` | Remove the auto-repair watcher plist and local watcher runtime. This cleanup command does not require a healthy `Codex.app` installation. |

### Launch Codex

Run `npx codexfast launch` or choose **1) Launch Codex with runtime patches (recommended)**. Codex must not already be running. This opens Codex with a local CDP endpoint and applies runtime patches only to the launched session.

No bundle files are rewritten, no backups are created, and the original app signature is left untouched. Fully quit that launched Codex session to return to the unmodified app behavior.

### View Status

Choose **2) Check current status** before using legacy bundle patching. Status checks the installed `Codex.app`, reports the detected version/build, shows whether the build is `supported`, and lists whether each legacy bundle target is enabled.

Use this after every Codex update. If compatibility is not `supported`, do not enable the patch on that build.

### Legacy Bundle Patch Fallback

Choose **3) Apply legacy bundle patches (fallback)** only when you need persistent bundle patching and status reports a supported build. This enables the supported feature set by modifying the installed app bundle:

- Fast control in Settings
- `/fast` slash command in the composer
- Speed menu in the composer
- GPT-5.5 in the model list where the supported build still needs the compatibility patch
- Plugins access for custom-API users
- Browser-use native pipe peer-auth compatibility for locally ad-hoc signed apps

The first enable run creates backups, updates `app.asar`, refreshes the Electron ASAR integrity hash, and runs an ad-hoc re-sign. Because re-signing changes the app identity used by macOS privacy checks, apply resets the `Codex.app` screen-recording permission record. Restart `Codex.app` after the script finishes and allow Screen & System Audio Recording when macOS asks.

### Disable or Restore Legacy Bundle Patches

Choose **4) Restore legacy bundle patch backups** to turn legacy bundle patches off. Restore first removes the auto-repair watcher if it is installed, then rolls `Codex.app` back to the vendor bundle when the archive backup is available and re-signs if needed. After a successful restore re-sign, the script also resets the `Codex.app` screen-recording permission record so macOS asks for a fresh decision on next launch.

Restore keeps this rollback behavior and still re-signs locally. It cannot recover the official OpenAI Developer ID signature by itself. After a successful restore, the script prints the current-version official download URL so you can choose whether to reinstall the official app manually.

Use restore before troubleshooting, before testing a fresh Codex update, or whenever you want to return to the original app behavior. If you want auto-repair again after restoring, reinstall the watcher explicitly.

### Auto-Repair Watcher

Choose **5) Install auto-repair watcher** or run:

```bash
npx codexfast install-watcher
```

This installs a per-user macOS `launchd` agent at `~/Library/LaunchAgents/com.codexfast.watcher.plist`. The agent watches `/Applications/Codex.app/Contents/Resources/app.asar` and runs `npx --yes codexfast@latest repair` when Codex replaces the archive during an app update.

The watcher only applies changes when the newly installed version/build is already in the strict compatibility whitelist. Unsupported builds are skipped quietly and leave the app untouched.

`repair` is idempotent. If Codex is already patched, it reports that no changes were needed and leaves `app.asar`, `Info.plist`, and the app signature untouched, so the watcher does not loop on its own repair writes. If Codex is already running when the on-disk archive is repaired, fully quit and reopen Codex to load the patched frontend bundle.

To remove the watcher:

```bash
npx codexfast uninstall-watcher
```

## Compatibility

The script does not use an official API — it matches code signatures in frontend build output, so it can break after a Codex update.

- Verified on `Codex.app` `26.513.20950` (`build 2816`)
- Verified on `Codex.app` `26.506.31421` (`build 2620`)
- Verified on `Codex.app` `26.506.21252` (`build 2575`)
- Verified on `Codex.app` `26.429.61741` (`build 2429`)
- Verified on `Codex.app` `26.429.30905` (`build 2345`)
- Verified on `Codex.app` `26.429.20946` (`build 2312`)
- Verified on `Codex.app` `26.422.71525` (`build 2210`)
- Verified on `Codex.app` `26.422.62136` (`builds 2180, 2176`)
- Verified on `Codex.app` `26.422.30944` (`build 2080`)
- Verified on `Codex.app` `26.422.21637` (`build 2056`)
- Verified on `Codex.app` `26.417.41555` (`build 1858`)
- Verified on `Codex.app` `26.415.40636` (`build 1799`)
- **Launch** and legacy **Apply** are blocked unless the installed version/build is whitelisted
- **Auto-repair** also skips unsupported version/build pairs quietly and does not modify the app
- **View status** and **Restore** work on any version
- The GPT-5.5 model-list patch only injects the UI catalog entry on supported builds that still need it. `Codex.app` `26.422.30944` and later builds are expected to expose GPT-5.5 through the official app path, so `codexfast` skips that apply target from `26.422.30944` onward. Your configured provider must still support `gpt-5.5`
- For Plugins, the script removes the custom-API gates needed to open the Plugins sidebar/page path on supported builds. On `26.429.20946`, `26.429.30905`, `26.429.61741`, `26.506.21252`, `26.506.31421`, and `26.513.20950`, it also removes the aggregate connector-unavailable install block and keeps install-modal plugin details visible. Actual plugin behavior can still depend on plugin state, connector runtime behavior, or admin restrictions

Re-run **Check current status** after every Codex update.

## Backup and Restore

First apply creates two backups:

- `app.asar1` — archive-level backup of the original bundle
- `*.codexfast.bak` — file-level fallback. Restore also recognizes the legacy `*.speed-setting.bak` suffix from earlier releases.

**Restore** removes the auto-repair watcher before changing `app.asar`, then prefers `app.asar1`, falls back to `.bak`, then inline restoration. A future Codex auto-update may overwrite the patched state.

> The local ad-hoc re-sign passes `codesign` integrity checks but replaces the vendor notarization. `spctl --assess` returning `rejected` is expected — use `codesign --verify --deep --strict --verbose=2 /Applications/Codex.app` to verify instead.

## Troubleshooting

**Script fails immediately** — check `/Applications/Codex.app` exists, plus `node -v` reports `18.12.0` or later, `npm -v`, and `codesign -h`.

**Re-sign step fails (macOS refused write)** — run manually:

```bash
codesign --force --deep --sign - /Applications/Codex.app
```

**macOS keeps asking to record this computer's screen and audio** — apply and restore reset the screen-recording permission record after re-signing. Fully quit `Codex.app`, reopen it, and allow Screen & System Audio Recording in System Settings when prompted.

**In-app update fails after apply** — older `codexfast` versions only ad-hoc re-signed the app after patching. For the `26.506.31421` (`build 2620`) to `26.513.20950` (`build 2816`) update path, current `codexfast` also bridges Sparkle's `SUPublicEDKey` before re-signing. Run the latest `npx codexfast apply` or install the watcher so `repair` can do the same. If OpenAI rotates the Sparkle key again in a future build, codexfast needs another build-specific bridge.

**Target not found / version unsupported** — do not continue, do not hand-patch. The build likely needs a new adaptation.

**Runtime launch shows `Codex failed to start` / `ERR_FAILED`** — fully quit Codex and rerun the latest `npx codexfast launch`. A failed runtime launch should not modify `app.asar`, `Info.plist`, the app bundle, backups, the app signature, or macOS privacy permissions. If this persists on a supported build, use `npx codexfast status` and report the detected version/build plus the launch output; use legacy `apply` only when you explicitly need persistent bundle patching.

**Plugins visible but a specific plugin is still unusable** — run **Check current status** first. On `26.429.20946`, `26.429.30905`, `26.429.61741`, `26.506.21252`, `26.506.31421`, and `26.513.20950`, `Plugin install availability enabled` means the top-level connector-unavailable install block is patched, and `Plugin install modal content enabled` means the empty install-modal detail card gate is patched. Remaining failures usually come from plugin state, connector runtime behavior, or admin-side restrictions.

**GPT-5.5 visible but requests fail** — the UI entry is present, but your custom API provider still needs to accept `model: "gpt-5.5"`.

**`Codex.app` won't open after an old broken run** (left `Resources/app` behind or wrote a bad integrity hash):

1. Delete `/Applications/Codex.app/Contents/Resources/app`
2. Rename `app.asar1` back to `app.asar`
3. Reopen `Codex.app`

## License

MIT. See [`LICENSE`](./LICENSE).
