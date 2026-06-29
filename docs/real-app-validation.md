# Real-App Validation

This checklist is for manual smoke-testing on an installed `Codex.app` copy after a real runtime-launch adaptation.

Run these checks after any meaningful bundle change, runtime patch-signature update, or compatibility-whitelist expansion.

## Runtime Launch Checks

Use these checks when validating `launch` behavior. Do not mark a build as real-app validated from regression tests alone.

- `npx codexfast launch` starts Codex when Codex is not already running
- The launched session opens with runtime patches active
- The launch output reports the required initial target labels for the current build before it reports `Runtime launch completed`; older builds include `Plugins access`, while `26.601.21317`, `26.602.30954`, `26.602.40724`, `26.602.71036`, `26.608.12217`, `26.609.30741`, `26.609.41114`, `26.609.71450`, `26.611.61049`, `26.611.61753`, `26.611.62324`, `26.616.31447`, `26.616.51431`, `26.616.71553`, `26.616.81150`, `26.623.31443`, `26.623.31921`, `26.623.42026`, and `26.623.61825` do not require that legacy target because the old sidebar/page/detail gates are absent or Plugins is supported by the official app path
- The `codexfast launch` process remains running while the launched Codex session is open
- The runtime patch session heartbeat stays quiet during normal use, and no `Runtime patch session lost` message appears
- If the launch process exits or the runtime patch session is lost after Codex has started, Codex keeps running without further runtime patching
- With the launch process still running, opening Settings activates the Settings-side Fast control even if the Settings chunk loads after the initial window
- With the launch process still running, opening Plugins shows plugin page content even if the Plugins chunk loads after the initial window
- `app.asar`, `Info.plist`, and the app code signature are unchanged after launch exits
- If launch fails before runtime patching starts, the app signature and `app.asar` are still unchanged and no Codex main process is left running
- Launch reports a clear failure when `Codex.app` is already running
- Launch is blocked when the detected version/build is unsupported

## Core App Checks

- `Codex.app` launches successfully through `codexfast launch`
- `Codex.app` still launches normally after a full quit and regular restart
- Opening Settings does not crash or show an error

## Fast Feature Set

- The Fast-related Settings control is visible and usable
- Open the build-specific composer-side `Speed` entry:
  - On `26.415.40636` and `26.417.41555`, open `Add files and more / +` and verify the `Speed` submenu is present
  - On `26.422.21637` and newer matching bundles, open the composer `Intelligence` dropdown and verify the `Speed` submenu is present
- Opening the `Speed` submenu shows `Standard` and `Fast`
- Selecting `Standard` or `Fast` from the build-specific composer-side menu does not break the UI
- Typing `/fast` in the composer shows the slash command item
- Selecting `/fast` can enable and disable Fast mode without breaking the UI
- On service-tier bundles, the selected Fast tier persists and is used by the composer request/config path for custom API users; it must not be normalized back to `null` or standard by the shared service-tier allowance hook
- On service-tier bundles, stopping a running Fast response, editing the queued/resumable message, and resending in the same conversation must not leave the request tier locked to Standard

## Plugins

- The `Plugins` sidebar entry is visible for custom API users
- Opening `Plugins` does not fail only because of the auth-method gate
- On builds with separate Plugins page/detail gates, plugin cards and plugin detail views show plugin-related content instead of falling back to skills-only or redirecting to `/skills`
- On builds with curated catalog gates, the full curated OpenAI plugin catalog remains visible for custom API users instead of showing only the limited-catalog placeholder such as `More plugins coming soon` or only bundled addable plugins such as Computer Use and LaTeX
- On builds with category-based Plugins pages, curated OpenAI categories such as Productivity, Developer Tools, Communication, or similar category sections are visible, and known curated plugins such as Linear, Slack, Gmail, Google Calendar, or Figma can appear through browse or search when the local catalog contains them
- On builds with install-flow gates, at least one plugin install button is not blocked solely by aggregate connector-unavailable state
- On builds with plugin detail app-connect gates, an installed plugin that declares an app shows the app connect area on the plugin detail page even if the directory app list is unavailable
- On builds with install-modal content gates, the install modal shows basic plugin details such as About, Includes, or Capabilities instead of an empty information card
- On builds with post-install app connect gates, installing a plugin that has one pending required app opens the app's `Connect <App>` permission modal instead of closing the install flow after only a success toast
- At least one plugin install or connect path is not blocked solely by `authMethod === "apikey"` or another patched custom-API gate

## Model List

- `GPT-5.5` appears in the app model picker for custom API users
- Selecting `GPT-5.5` writes the expected model setting
- A custom API provider request using `model: "gpt-5.5"` still succeeds independently of the UI catalog injection

## Recovery Checks

- Launch removes any legacy auto-repair watcher files if they were present before launch
- The installed app bundle is unchanged after launch

## Notes

- Record the validated build in `docs/compatibility-matrix.md`.
- Add or update a bundle note when the validated build differs from the previous supported build.
