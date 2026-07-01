# Troubleshooting

This document collects the recurring failure modes for the current public `codexfast` runtime launcher.

## Runtime launch does not patch the app

Expected behavior:

- `npx codexfast launch` is the public runtime path.
- It starts Codex with a local CDP endpoint and applies runtime patches only to that launched session.
- Keep the `codexfast launch` process running while you use Codex. Settings and Plugins load some chunks lazily, and those later requests still need the runtime interceptor.
- During initial startup, the launcher connects to the browser-level CDP target, auto-attaches to renderer targets with `waitForDebuggerOnStart`, enables `Fetch` interception in the renderer session, and then lets the renderer continue. If a required target for the current build is still not observed, launch retries one renderer reload and then fails closed instead of repeatedly refreshing the app. Older builds require `Plugins access`; `26.601.21317`, `26.602.30954`, `26.602.40724`, `26.602.71036`, `26.608.12217`, `26.609.30741`, `26.609.41114`, `26.609.71450`, `26.611.61049`, `26.611.61753`, `26.611.62324`, `26.616.31447`, `26.616.51431`, `26.616.71553`, `26.616.81150`, `26.623.31443`, `26.623.31921`, `26.623.42026`, `26.623.61825`, and `26.623.70822` do not require that legacy target because the old sidebar/page/detail gates are absent or Plugins is supported by the official app path.
- The launcher sends a lightweight browser-level CDP heartbeat. If the runtime patch session drops, it reconnects at most three times, re-enables browser auto-attach, and then reports `Runtime patch session lost` if reconnects are exhausted.
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

If Settings Fast, `/fast`, and the composer Speed menu all disappear after account switching:

1. Confirm `npx codexfast launch` is still running and the expected Fast patch labels were reported. If the launcher is gone, lazy chunks can load without runtime patches.
2. Inspect the app config through the live bridge, especially the current `read-config-for-host` model and `service_tier` values.
3. Inspect `list-models-for-host` and compare the selected model's `serviceTiers` / `additionalSpeedTiers` with another known Fast-capable model. On the `26.623.70822` failure mode, account switching left `model = "gpt-5.5"` and `service_tier = "default"`, while official `gpt-5.5` had no Fast service-tier metadata and `gpt-5.4` still had `{ id: "priority", name: "Fast" }`.
4. If the selected model is visible but lacks Fast metadata, inspect `src/targets/models.mts` and the runtime match for `GPT-5.5 model list`, not only `src/targets/speed.mts`. Current `26.623.70822` bundles can expose the bridge handler from `app-initial~app-main~automations-page-*.js` as ``"list-models-for-host":n9((e,t)=>e.sendRequest(`model/list`,t))``.
5. Do not remove the `availableOptions.length` guard as a shortcut. That guard intentionally hides one-option speed controls; when all three Fast entry points vanish together, missing selected-model tier metadata is a likely root cause.

If a Fast conversation falls back to Standard after stopping, editing, and resending:

1. Inspect the shared service-tier hook in `use-service-tier-settings-*.js`.
2. Confirm `serviceTierForRequest` preserves explicit non-standard `latestThreadSettings.serviceTier` values, but does not let Standard/null conversation state or latest-turn `params.serviceTier` override the configured Settings tier.
3. Confirm send/edit/resume paths that compute `serviceTier` through the request helper do not block non-ChatGPT auth methods with the original `fast_mode`-only gate, especially after changing reasoning effort before resending.

If `Disable automatic updates` is enabled but Codex still updates:

1. Confirm `~/.codex/config.toml` contains `[desktop].disableAutomaticUpdates = true` or a supported legacy top-level value.
2. Inspect the real extracted `.vite/build/workspace-root-drop-handler-*.js` file for every automatic path that calls the raw background check function. Newer bundles can call it through both the interval/immediate startup shape and `setAutomaticBackgroundDownloadsEnabledForMac`.
3. Confirm manual `checkForUpdates` and `installUpdatesIfAvailable` remain untouched; do not use `CODEX_SPARKLE_ENABLED=false` or another global updater disable as a shortcut.

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

- `codexfast` removes the known custom-API Plugins gates for supported builds. On newer builds this can include sidebar access, page content, plugin detail redirects, curated catalog visibility, install-button availability, plugin detail app-connect content, install-modal content, and post-install app connect behavior.
- It does not guarantee that every plugin, connector runtime, or app integration is available after those gates are patched.
- On `26.623.31443` (`build 4441`), `26.623.31921` (`build 4452`), `26.623.42026` (`build 4514`), `26.623.61825` (`build 4548`), and `26.623.70822` (`build 4559`), codexfast skips Plugins runtime targets because Plugins is supported by the official app path for this repo's target use case. For those builds, inspect upstream plugin state or connector behavior before looking for codexfast Plugins patch misses.

Check:

- The launch process is still running.
- If Plugins opens but shows only the limited-catalog placeholder, such as `More plugins coming soon`, or only bundled addable plugins such as Computer Use and LaTeX, inspect the build-specific curated catalog gate. On `26.601.21317`, `26.602.30954`, `26.602.40724`, `26.602.71036`, `26.608.12217`, `26.609.30741`, `26.609.41114`, `26.609.71450`, `26.611.61049`, `26.611.61753`, `26.611.62324`, and `26.616.31447`, the stable needles are `openai-curated-marketplaces-hidden` and `skills.appsPage.pluginsLimitedCatalog` in `use-plugins-*.js`. On `26.609.30741`, `26.609.41114`, `26.609.71450`, `26.611.61049`, `26.611.61753`, `26.611.62324`, and `26.616.31447`, also check that the `4218407052` vertical-catalog branch is not excluding the `openai-curated` marketplace after `list-plugins` returns it.
- If Plugins opens but specific app-connect plugins such as Gmail or Google Calendar are missing while `~/.codex/.tmp/plugins/.agents/plugins/marketplace.json` contains them, compare the default `list-plugins` response with a `list-plugins` call that includes `cwds: ["<codexHome>/.tmp/plugins"]`. On `26.616.31447`, the Plugins catalog local-cache target should add that root so the app-server returns the full local `openai-curated` catalog instead of only `openai-api-curated`.
- If an installed plugin detail page does not show the app connect area, inspect the detail app-connect fallback gate. On `26.601.21317`, `26.602.30954`, `26.602.40724`, `26.602.71036`, `26.608.12217`, `26.609.30741`, `26.609.41114`, `26.609.71450`, `26.611.61049`, `26.611.61753`, `26.611.62324`, and `26.616.31447`, the stable needle is `directoryApps` in `check-plugin-availability-*.js`.
- If plugin install succeeds but does not open the expected `Connect <App>` permission modal for a plugin with one pending required app, inspect the post-install app connect gate. On `26.601.21317`, `26.602.30954`, `26.602.40724`, `26.602.71036`, `26.608.12217`, `26.609.30741`, `26.609.41114`, `26.609.71450`, `26.611.61049`, `26.611.61753`, `26.611.62324`, and `26.616.31447`, the stable needle is `appsNeedingAuth` in `use-plugin-install-flow-*.js`.
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
