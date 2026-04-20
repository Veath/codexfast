# Troubleshooting

This document collects the recurring failure modes for `codexfast` and the expected recovery path.

## `Codex.app` does not open after patching

Check:

- Whether `codesign` completed successfully in the script output
- Whether the app was re-signed after the latest resource change
- Whether an older broken workflow left a persistent `Contents/Resources/app` directory behind

Recovery:

1. Quit `Codex.app`.
2. Delete `/Applications/Codex.app/Contents/Resources/app` if it exists.
3. Restore `/Applications/Codex.app/Contents/Resources/app.asar1` back to `app.asar` if needed.
4. Re-open `Codex.app`.

## Settings opens with an error or the UI breaks

Likely causes:

- The Settings-side Fast patch signature no longer matches the current bundle shape
- A partial patch was applied on a build that should have been adapted first

What to do:

1. Run `View current status`.
2. Confirm the current build is `supported`.
3. If needed, run `Restore original state`.
4. Re-check the bundle against `docs/patch-targets.md` and the latest bundle note before changing patch logic.

## `Plugins` is visible but plugin install or use still fails

Expected boundary:

- `codexfast` only removes the sidebar auth-method gate for custom API users.
- It does not guarantee that every plugin, connector, or app integration is available.

Check:

- Connector/app integration availability
- Plugin package state
- Admin-side or upstream restrictions

## `Compatibility: unsupported`

Meaning:

- The current `CFBundleShortVersionString` + `CFBundleVersion` pair is not on the strict whitelist in `codexfast.sh`.

What to do:

1. Do not patch manually.
2. Record the build in `docs/compatibility-matrix.md` as `investigating` or `unsupported`.
3. Follow `docs/version-adaptation-playbook.md`.

## `codesign` fails

Check:

- Write permissions for `/Applications/Codex.app`
- Whether the script printed the manual fallback command

Manual fallback:

```bash
codesign --force --deep --sign - /Applications/Codex.app
```

If re-sign still fails, restore the archive backup or reinstall `Codex.app`.

## Repeated `Enable custom API features` runs

Expected behavior:

- Already enabled targets should report `already patched`
- Newly added targets in a newer script version may report `patched`
- Legacy enabled forms may report `normalized`

Expected files:

- One archive backup: `app.asar1`
- One same-name backup per patched JS target: `*.speed-setting.bak`

The script should not accumulate repeated unpack directories or unlimited duplicate backup files.
