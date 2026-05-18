# Troubleshooting

This document collects the recurring failure modes for the current public `codexfast` runtime launcher.

## Runtime launch does not patch the app

Expected behavior:

- `npx codexfast launch` is the public runtime path.
- It starts Codex with a local CDP endpoint and applies runtime patches only to that launched session.
- Keep the `codexfast launch` process running while you use Codex. Settings and Plugins load some chunks lazily, and those later requests still need the runtime interceptor.
- The launcher sends a lightweight CDP heartbeat. If the runtime patch session drops, it reconnects at most three times, re-enables `Page` and `Fetch`, reloads the renderer, and then reports `Runtime patch session lost` if reconnects are exhausted.
- It does not modify `app.asar`, `Info.plist`, the app bundle, the app signature, backups, or macOS privacy permissions.
- It removes the legacy launchd auto-repair watcher if an older codexfast version installed one.

If launch is blocked:

1. Fully quit any running `Codex.app` instance.
2. Re-run `npx codexfast launch`.
3. Use the detected version/build printed by launch when recording an unsupported build for adaptation.

If Settings Fast or Plugins content is still missing after launch:

1. Confirm the terminal process that ran `npx codexfast launch` is still running.
2. Fully quit Codex, rerun `npx codexfast launch`, and keep that process open while navigating to Settings and Plugins.
3. If the process is still running and the build is supported, inspect runtime debug output for lazy chunk matches such as `general-settings-*.js` and `skills-page-*.js`.

If launch reports `Runtime patch session lost after 3 reconnect attempts`:

1. Fully quit Codex and confirm no `Codex` main process remains.
2. Re-run `npx codexfast launch`.
3. Do not keep using that launched session as proof of runtime patch behavior; reconnects were exhausted, so later lazy chunks may not be patched.

If Codex shows `Codex failed to start` with `ERR_FAILED` while runtime launch is being tested:

1. Fully quit Codex and confirm no `Codex` main process remains.
2. Re-run the latest `npx codexfast launch`.
3. Confirm the failed launch did not change `Contents/Resources/app.asar`, `Info.plist`, the app signature, backups, or macOS privacy permissions.
4. If the failure persists on a supported build, inspect the CDP runtime asset URL shape. Current `26.513.20950` requests renderer JavaScript as `app://-/assets/*.js`, while older assumptions used `app://-/webview/assets/*.js`.
5. Confirm the generated single-file CLI can run its embedded runtime patch engine; do not rely only on source-level `patch-engine` imports.

## Legacy auto-repair watcher cleanup

Older codexfast versions exposed `install-watcher` and installed a per-user launchd agent at:

- `~/Library/LaunchAgents/com.codexfast.watcher.plist`
- `~/Library/Application Support/codexfast/codexfast-watcher.js`

Current public `launch` removes those files before starting Codex. The old watcher-facing `repair` command is kept only as a compatibility cleanup path so an already-installed watcher can remove itself instead of re-applying legacy bundle patches.

## `Plugins` is visible but plugin install or use still fails

Expected boundary:

- `codexfast` removes the known custom-API Plugins gates for supported builds. On newer builds this can include sidebar access, page content, plugin detail redirects, install-button availability, and install-modal content.
- It does not guarantee that every plugin, connector runtime, or app integration is available after those gates are patched.

Check:

- The launch process is still running.
- Connector/app integration availability.
- Plugin package state.
- Admin-side or upstream restrictions.

## `@chrome` reports `Browser is not available: extension`

Relevant boundary:

- Current public `codexfast launch` keeps the official app bundle and signature untouched.
- It no longer includes the old native pipe peer-auth compatibility patch from the legacy bundle-patch path.
- If this error appears because the installed app was modified and locally ad-hoc signed by an older codexfast run, runtime launch cannot recover the original OpenAI Developer ID signature.

Recovery:

- Fully quit and relaunch Codex through `npx codexfast launch`.
- If the installed app was previously modified and ad-hoc signed by an older bundle patch flow, reinstall the official Codex.app build to recover the OpenAI Developer ID signature.

## `Compatibility: unsupported`

Meaning:

- The current `CFBundleShortVersionString` + `CFBundleVersion` pair is not on the strict whitelist in `src/supported-app-versions.mts`.
- Public `launch` is blocked for unsupported builds.

What to do:

1. Do not patch manually.
2. Record the build in `docs/compatibility-matrix.md` as `investigating` or `unsupported`.
3. Follow `docs/version-adaptation-playbook.md`.

## Repeated old bundle patch leftovers

Current `codexfast` no longer includes legacy bundle patch, archive rewrite, re-sign, or restore flows. If an old run left `Resources/app`, `app.asar1`, or `*.codexfast.bak` files behind, do not use the current launcher to repair the app bundle:

- Reinstall the official Codex.app build to recover a clean bundle and OpenAI Developer ID signature.
- Use `npx codexfast launch` after reinstalling; it applies runtime patches without writing the app bundle.
- The hidden `repair` compatibility command only removes old watcher files. It does not inspect, patch, restore, or re-sign Codex.app.
