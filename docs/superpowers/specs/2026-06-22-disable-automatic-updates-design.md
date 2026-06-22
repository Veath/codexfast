# Disable Automatic Updates Setting Design

## Final Scope

Add a `Disable automatic updates` setting to `Settings > General`.

When the setting is enabled, `codexfast launch` should stop Codex from starting its background automatic update lifecycle for the current runtime-patched session. Manual update actions, including `Check for Updates` and startup-error recovery buttons, remain available.

## Goals

- Give users an in-app setting for disabling background update checks, downloads, and update prompts.
- Keep manual update checks available.
- Preserve the runtime-only launcher model: do not modify `app.asar`, `Info.plist`, the app bundle, or the app signature.
- Keep the generated `bin/codexfast` self-contained.
- Keep patch matching narrow and covered by regression tests.

## Non-Goals

- Do not block all updater APIs.
- Do not remove or disable user-triggered `Check for Updates`.
- Do not introduce a persistent app-bundle mutation or a separate background watcher.
- Do not change the strict `CFBundleShortVersionString` plus `CFBundleVersion` compatibility gate.

## Current Bundle Findings

The inspected `26.616.51431` bundle still contains Sparkle update metadata in `package.json`:

- `codexSparkleFeedUrl`
- `codexSparklePublicKey`

The main bootstrap path initializes the updater before importing the main desktop app:

```text
await sparkleManager.initialize()
```

The same bootstrap file keeps manual recovery actions available through `sparkleManager.checkForUpdates()` and `sparkleManager.installUpdatesIfAvailable()` when startup fails. The new patch must not remove those manual calls.

## Recommended Approach

Add two runtime targets:

- Settings target: inject the General setting row and bind it to a desktop setting value.
- Updater target: gate only the automatic updater initialization path on that setting value.

This keeps the behavior user-visible and reversible while preserving manual update paths.

## Architecture

### Target layout

Add a new `src/targets/updates.mts` module and include it from `src/patcher-targets.mts`.

The target module owns update-specific signatures so the existing Speed, Plugins, and Models target files stay focused.

### Settings UI patch

The General settings target should patch the renderer settings bundle that owns `Settings > General`. It should add a switch row using the same local setting-row, group, and storage patterns as nearby General settings.

The setting key should be stable and desktop-scoped. Suggested key:

```text
disableAutomaticUpdates
```

Default value:

```text
false
```

Suggested user-facing label:

```text
Disable automatic updates
```

The setting should be phrased as a disable switch so the default app behavior remains unchanged when `codexfast` is present but the user has not opted out.

### Updater initialization patch

The updater target should patch the Electron bootstrap/main bundle so automatic initialization is skipped when the setting is enabled:

```text
if (!disableAutomaticUpdates) {
  await sparkleManager.initialize()
}
```

The patch should leave manual calls such as `sparkleManager.checkForUpdates()` and `sparkleManager.installUpdatesIfAvailable()` intact.

If the setting store is not ready or the setting cannot be read, the patch should fail open to the official default behavior and allow automatic updates. This avoids silently blocking updates because of a settings-read failure.

### Runtime coverage

The existing CDP runtime patcher already intercepts renderer JavaScript. Because the updater initialization lives in `.vite/build/bootstrap.js`, implementation must either:

- extend runtime interception to cover the main-process bootstrap asset before it executes, or
- prove the relevant updater initialization is reachable from an already intercepted runtime body.

If bootstrap interception is not possible in the current launcher timing, the implementation should stop and revise the design before shipping a UI-only switch.

## Failure Behavior

- Unsupported Codex builds remain blocked before runtime launch.
- If the update setting target is missing on a supported build, runtime launch should fail closed rather than showing a switch that cannot work.
- If the updater target is missing on a supported build, runtime launch should fail closed rather than giving a false sense that updates are disabled.
- If the setting value cannot be read during updater startup, automatic updates stay enabled.

## Documentation Changes

Update:

- `README.md`
- `README.zh-CN.md`
- `docs/feature-scope.md`
- `docs/patch-targets.md`
- the relevant `docs/bundle-notes/` file for the inspected build
- `CHANGELOG.md`

Docs should say the feature disables background automatic updates only. They should also state that manual update checks remain available.

## Test Strategy

Add focused runtime patch tests for:

- the General setting row is injected and reported under a new target label
- default behavior does not disable automatic updates
- enabled setting skips only `sparkleManager.initialize()`
- manual `checkForUpdates()` remains in the patched content
- manual `installUpdatesIfAvailable()` remains in the patched content

Update generated CLI tests so `bin/codexfast` contains the new target specs after `pnpm build`.

Run the standard validation after implementation:

```bash
pnpm build:check
pnpm typecheck
pnpm test
```

For real-app validation, run `codexfast launch` against the installed supported build and confirm the app bundle, `app.asar`, `Info.plist`, and signature are unchanged.

## Open Decisions

- Exact renderer settings-bundle signature must be confirmed during implementation by inspecting the real `general-settings-*.js` / settings bundle for the target build.
- Exact bootstrap interception strategy must be validated before the feature is considered implemented.
