# codexfast

[中文说明](./README.zh-CN.md)

This repository contains a single-file macOS script for exposing and toggling the Speed setting inside `Codex.app`.

This script is intended for Codex users who run with a custom API configuration.

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

The script locates the frontend assets inside `Codex.app`, checks whether the current app version still contains the expected Speed-setting code path, and provides three actions:

- View current status
- Enable the Speed setting
- Restore the original state

After the script changes the installed app bundle, it repacks the modified files back into `app.asar`, updates Electron's `Info.plist` ASAR integrity hash, and performs a local ad-hoc re-sign so `Codex.app` can still launch on macOS.

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
- It also updates `ElectronAsarIntegrity` in `Info.plist` to match the rebuilt `app.asar`
- After apply, restore, or legacy-layout migration, the script automatically performs a local ad-hoc re-sign
- This local re-sign replaces the original vendor signature on your installed app copy

Menu items:

- `1) View current status`
- `2) Enable Speed setting`
- `3) Restore original state`

Recommended flow:

1. Run `View current status` first.
2. Only run `Enable Speed setting` if the target file is detected successfully.

`View current status` checks:

- Whether the `Codex.app` resources directory exists
- Whether `app.asar` can be found and inspected through the temporary workspace
- Whether the target directory `app/webview/assets` exists inside the unpacked archive
- Whether the current frontend bundle still contains a recognizable Speed-setting target
- Whether the current state is "disabled" or "enabled"
- Whether a backup file already exists

If the script detects the legacy unpacked `Resources/app` layout from an older script version, it repacks that directory back into `app.asar`, removes `Resources/app`, and then re-signs the app bundle automatically.

If the script prints `Speed setting target file not found`, the current Codex build has likely changed and the patch should not be applied blindly.

## Version Compatibility

Version verified directly during inspection:

- `Codex.app` version: `26.415.40636`
- build: `1799`

This version is compatible with the script because:

- `app/webview/assets` still exists inside the current `app.asar`
- Speed-setting text keys are still present
- The script's target regex still matches the current bundle
- The matched target file is `general-settings-BZQqrI-r.js`
- The current "disabled" state can still be transformed into the "enabled" state

Observed validation result on this version:

- Target file was found
- Current state was identified as disabled
- A simulated replacement successfully moved the code from guarded to patched state

That means the script is compatible with the version above.

## Compatibility Limits

This script does not use an official API. It patches frontend build output by matching code signatures, so compatibility can break after a Codex update.

Recommended practice:

- Run `View current status` after every Codex update
- Only run `Enable Speed setting` when the script still detects the target file
- If bundle structure, variable names, or minified output changes, the regex may need to be updated

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

If `Codex.app` no longer opens after using an older broken script version that left `Resources/app` behind:

1. Delete `/Applications/Codex.app/Contents/Resources/app`
2. Rename `/Applications/Codex.app/Contents/Resources/app.asar1` back to `app.asar`
3. Reopen `Codex.app`

If you want to inspect the local signature state after running this script, prefer:

```bash
codesign --verify --deep --strict /Applications/Codex.app
```

Do not treat `spctl --assess` as a failure signal after the script's local ad-hoc re-sign. A locally re-signed app can be launchable while `spctl` still reports `rejected`.
