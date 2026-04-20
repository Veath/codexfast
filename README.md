# codexfast

[中文说明](./README.zh-CN.md)

This repository contains a single-file macOS script for exposing hidden custom-API features inside `Codex.app`.

This script is intended for Codex users who run with a custom API configuration.

Current feature coverage:

- Settings-side Fast control
- Composer `/fast` slash command
- `Add files and more / +` Speed submenu
- Plugins access for custom API users

It automatically re-signs the local app bundle after rebuilding or modifying app resources.

Script file:

- `codexfast.sh`

## Quick Start

Run directly with npm:

```bash
npx codexfast
```

This launches the interactive menu.

## What It Does

The script locates the frontend assets inside `Codex.app`, checks whether the current app version still contains the expected hidden custom-API feature paths, and provides three actions:

- View current status
- Enable custom API features
- Restore the original state

When enabled on a compatible bundle, the script currently exposes:

- the Settings-side Fast control
- the composer `/fast` slash command
- the add-context `Speed` submenu in the composer menu
- the Plugins sidebar/page access path for custom API users

After the script changes the installed app bundle, it repacks the modified files back into `app.asar`, updates Electron's `Info.plist` ASAR header integrity hash, and performs a local ad-hoc re-sign so `Codex.app` can still launch on macOS.

The script is fully self-contained in one file, so it can be shared and run on its own.

## Intended Audience

This script is meant for users who use Codex with a custom API setup.

It is not primarily aimed at users who only use the default hosted configuration without any custom API-related setup.

## Platform Support

Current support:

- macOS: supported
- Windows: not supported

This script currently targets the macOS app layout at `/Applications/Codex.app/Contents/Resources` and assumes a Bash-based local execution flow.

Windows users are not supported by this version yet.

## Usage

Requirements:

- `Codex.app` is installed at `/Applications/Codex.app`
- `node` is available in the shell
- `npm` is available in the shell
- macOS built-in `codesign` is available

Use from npm:

```bash
npx codexfast
```

Run locally from this repository:

```bash
chmod +x ./codexfast.sh
./codexfast.sh
```

Run it from a shell.

If you are using the repository directly, the local script path is the source of truth.

## Self-Check Mode

The script already includes its own self-check flow. No manual file edits are required.

Important behavior:

- The script uses a temporary workspace when it needs to inspect or patch `app.asar`
- It repacks the modified files back into `app.asar` instead of leaving a persistent `Resources/app` directory behind
- It also updates `ElectronAsarIntegrity` in `Info.plist` to match the rebuilt `app.asar` header hash
- After apply, restore, or legacy-layout migration, the script automatically performs a local ad-hoc re-sign
- This local re-sign replaces the original vendor signature on your installed app copy

Menu items:

- `1) View current status`
- `2) Enable custom API features`
- `3) Restore original state`

Recommended flow:

1. Run `View current status` first.
2. Only run `Enable custom API features` if the target files are detected successfully and the app version is reported as `supported`.

`View current status` checks:

- Whether the detected `Codex.app` version and build can be read from `Info.plist`
- Whether that version/build pair is currently on the script's verified compatibility whitelist
- Whether the `Codex.app` resources directory exists
- Whether `app.asar` can be found and inspected through the temporary workspace
- Whether the target directory `app/webview/assets` exists inside the unpacked archive
- Whether the current frontend bundle still contains recognizable hidden-feature targets
- Whether the current state is "disabled" or "enabled"
- Whether a backup file already exists

If the script detects the legacy unpacked `Resources/app` layout from an older script version, it repacks that directory back into `app.asar`, removes `Resources/app`, and then re-signs the app bundle automatically.

If the script prints `Feature target file not found`, the current Codex build has likely changed and the patch should not be applied blindly.

If the script prints `Compatibility: unsupported`, `Enable custom API features` is blocked on purpose. This is a strict safety gate to avoid patching unverified Codex builds.

## Version Compatibility

Version verified directly during inspection:

- `Codex.app` version: `26.415.40636`
- build: `1799`

This version is compatible with the script because:

- `app/webview/assets` still exists inside the current `app.asar`
- the hidden Fast and Plugins text keys are still present
- the script's target regexes still match the current bundle
- the current guarded states can still be transformed into enabled states

Observed validation result on this version:

- the Settings-side Fast target was found
- the composer `/fast` target was found
- the add-context `Speed` menu target was found
- the Plugins sidebar gate target was found
- simulated replacements successfully moved those targets from guarded state to patched state

That means the script is compatible with the version above.

## Compatibility Limits

This script does not use an official API. It patches frontend build output by matching code signatures, so compatibility can break after a Codex update.

Recommended practice:

- Run `View current status` after every Codex update
- Only run `Enable custom API features` when the script still detects the target files and reports `Compatibility: supported`
- If bundle structure, variable names, or minified output changes, the regex may need to be updated

For Plugins specifically, this script removes the custom-API sidebar auth-method gate. Actual plugin availability can still depend on connector availability, plugin package state, or admin-side restrictions inside the app.

Compatibility policy:

- The script reads `CFBundleShortVersionString` and `CFBundleVersion` from `Codex.app/Contents/Info.plist`
- `Enable custom API features` is allowed only for version/build pairs that are explicitly whitelisted in the script
- `View current status` and `Restore original state` remain available even when the current version is unsupported

## Backup and Restore

On the first modification, the script creates a same-name file-level backup with this suffix:

```text
.speed-setting.bak
```

Restore first prefers the archive-level `app.asar1` backup when it exists. If no archive backup exists, it falls back to the file-level `.speed-setting.bak` backup. If neither backup exists but a patched state is detected, the script still tries to restore inline.

After apply or restore, the script keeps the installed app in the packed `app.asar` layout and re-signs the modified app bundle automatically.

## Notes

- On first apply, the script creates `app.asar1` as an archive-level backup of the original app bundle
- When the script needs to inspect or patch the app, it unpacks `app.asar` into a temporary directory and repacks the result back into `app.asar`
- After rebuilding or changing files under `Codex.app`, the script runs `codesign --force --deep --sign - /Applications/Codex.app`
- This script directly modifies the installed local app resources
- A future Codex auto-update may overwrite the patched state
- A local ad-hoc re-sign is enough for `codesign` integrity checks, but it does not preserve the original notarized vendor signature

## Troubleshooting

If the script fails immediately, check:

- Whether `/Applications/Codex.app` exists
- `node -v`
- `npm -v`
- `codesign -h`

If the automatic re-sign step fails because macOS refuses the write, the script now prints the exact manual fallback command:

```bash
codesign --force --deep --sign - /Applications/Codex.app
```

If the script says it cannot find the target file:

- Do not continue with the enable action
- The current Codex build likely needs a new adaptation

If the script says the current version is unsupported:

- Do not force manual edits into the app bundle
- Update the script only after validating the new Codex version against all supported feature paths

If Plugins becomes visible but a plugin still cannot be installed or used:

- Check whether the connector or app integration is available in your environment
- Check whether the plugin itself is disabled by admin or unavailable upstream
- Do not assume that every plugin failure is caused by the auth-method gate

If `Codex.app` no longer opens after using an older broken script version that left `Resources/app` behind or wrote the wrong `ElectronAsarIntegrity` hash:

1. Delete `/Applications/Codex.app/Contents/Resources/app`
2. Rename `/Applications/Codex.app/Contents/Resources/app.asar1` back to `app.asar`
3. Reopen `Codex.app`

If you want to inspect the local signature state after running this script, prefer:

```bash
codesign --verify --deep --strict /Applications/Codex.app
```

Do not treat `spctl --assess` as a failure signal after the script's local ad-hoc re-sign. A locally re-signed app can be launchable while `spctl` still reports `rejected`.
