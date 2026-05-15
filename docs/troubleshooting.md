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

- `codexfast` removes the known custom-API Plugins gates for supported builds. On newer builds this can include sidebar access, page content, plugin detail redirects, install-button availability, and install-modal content.
- It does not guarantee that every plugin, connector runtime, or app integration is available after those gates are patched.

Check:

- `View current status` reports every expected Plugins target as `enabled` for the current supported build
- Connector/app integration availability
- Plugin package state
- Admin-side or upstream restrictions

## `@chrome` reports `Browser is not available: extension`

Likely cause after running `codexfast apply`:

- `codexfast` modifies `app.asar` and then ad-hoc re-signs `Codex.app`.
- That local signature replaces the OpenAI Developer ID identity.
- The browser-use native pipe can reject the local socket peer with `missing-code-signing-identity`.

Expected boundary:

- Current `codexfast` includes a narrow compatibility target named `Browser-use native pipe peer auth`.
- The patch only allows the `missing-code-signing-identity` peer-auth rejection caused by local ad-hoc signing.
- It does not disable every native pipe peer check, and other peer-auth failures remain rejected.
- This lowers local native pipe peer verification strength for that one compatibility reason. It is not equivalent to restoring the official OpenAI Developer ID signature.

Check:

- Run `npx codexfast status`.
- Confirm the output includes `Status: Browser-use native pipe peer auth enabled`.
- Fully quit and reopen both `Codex.app` and Chrome after applying the patch.

Recovery:

- Run `npx codexfast restore` to remove the compatibility wrapper and restore the backed-up app archive or inline target shape.
- Restore still re-signs locally; it cannot recover the official OpenAI Developer ID signature by itself.
- After successful restore, `codexfast` prints the current-version official download URL. Reinstall from that URL if you want to recover the official signature.

## `Compatibility: unsupported`

Meaning:

- The current `CFBundleShortVersionString` + `CFBundleVersion` pair is not on the strict whitelist in `src/supported-app-versions.mts`.
- `repair` and the launchd watcher treat this as a no-op: they do not notify, unpack, back up, write `app.asar`, re-sign, or write a log file.

What to do:

1. Do not patch manually.
2. Record the build in `docs/compatibility-matrix.md` as `investigating` or `unsupported`.
3. Follow `docs/version-adaptation-playbook.md`.

## Auto-repair watcher does not re-apply after a Codex update

Check:

- The watcher is installed at `~/Library/LaunchAgents/com.codexfast.watcher.plist`
- `View current status` reports the new Codex version/build as `supported`

Expected behavior:

- Supported builds run `npx --yes codexfast@latest repair` when `/Applications/Codex.app/Contents/Resources/app.asar` changes.
- Unsupported builds are skipped quietly and leave the app untouched.
- Already patched builds report no changes and leave `app.asar`, `Info.plist`, and the app signature untouched.
- The watcher needs `npx` and registry access when it runs so it can use the latest published compatibility logic.

If needed, reinstall the watcher:

```bash
npx codexfast install-watcher
```

## In-app update fails after `apply`

Expected boundary:

- `apply` modifies `app.asar` and ad-hoc re-signs `Codex.app`.
- That local signature replaces the vendor Developer ID identity, so Sparkle cannot rely on code-signing identity continuity for update validation.
- For the `26.506.31421` (`build 2620`) to `26.513.20950` (`build 2816`) update path, current `codexfast` backs up `SUPublicEDKey` and updates it to the `26.513.20950` public EdDSA key before re-signing.

What to do:

1. Run the latest `npx codexfast apply` on `26.506.31421` (`build 2620`), or install the watcher so `repair` can apply the same metadata bridge.
2. Confirm the output includes `Updated Sparkle public EdDSA key for in-app updates.` when the bridge is newly applied.
3. If the build is newer than `26.513.20950` and OpenAI rotated Sparkle keys again, adapt the build-specific bridge before claiming in-app updates are supported.

Recovery:

- Run `npx codexfast restore` to restore the backed-up `SUPublicEDKey` and original archive when the backup is present.

## `codesign` fails

Check:

- Write permissions for `/Applications/Codex.app`
- Whether the script printed the manual fallback command

Manual fallback:

```bash
codesign --force --deep --sign - /Applications/Codex.app
```

If re-sign still fails, restore the archive backup or reinstall `Codex.app`.

## macOS repeatedly asks for screen and audio recording permission

Expected behavior:

- `apply` modifies `app.asar` and then ad-hoc re-signs `Codex.app`.
- Re-signing changes the code-signing identity macOS uses for privacy permissions.
- After a successful `apply` or `restore`, `codexfast` runs `tccutil reset ScreenCapture <bundle id>` so macOS asks for a fresh Screen & System Audio Recording decision on the next launch.
- `restore` removes the auto-repair watcher before changing `app.asar`, so a restored app is not immediately re-patched by `repair`.

What to do:

1. Fully quit `Codex.app` with `Command+Q`.
2. Reopen `Codex.app`.
3. Allow Screen & System Audio Recording when macOS prompts, or enable it in System Settings.

If the reset command fails, run it manually:

```bash
tccutil reset ScreenCapture com.openai.codex
```

## Repeated `Enable custom API features` runs

Expected behavior:

- Already enabled targets should report `already patched`
- Newly added targets in a newer script version may report `patched`
- Legacy enabled forms may report `normalized`

Expected files:

- One archive backup: `app.asar1`
- One same-name backup per patched JS target: `*.codexfast.bak`
- Legacy file backups from earlier releases may still use `*.speed-setting.bak`; restore recognizes both suffixes.

The script should not accumulate repeated unpack directories or unlimited duplicate backup files.
