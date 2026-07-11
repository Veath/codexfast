# ChatGPT.app 26.707.41301 Compatibility Design

## Goal

Add strict runtime-launch support for the locally installed `ChatGPT.app`
`26.707.41301` build `5103`, use the app's official GPT-5.6 support, and make
`[desktop].disableAutomaticUpdates = true` reliably suppress automatic Sparkle
activity without removing manual update actions.

## Verified Bundle Facts

- The installed application is `/Applications/ChatGPT.app`.
- Its bundle identifier remains `com.openai.codex`.
- Its version key is `26.707.41301+5103`.
- The application contains official GPT-5.6 Sol and Terra product paths. From
  this build onward, `codexfast` must not inject GPT-5.6 catalog entries or
  widen the downstream GPT-5.6 selector.
- Existing Fast service-tier, request allowance, conversation fallback,
  `/fast`, and composer Intelligence Speed signatures remain present.
- Plugins remains supported through the official application path, so the
  existing no-Plugins-patches policy continues for this build.
- The Settings automatic-update row moved to
  `webview/assets/general-settings-BBi3jMJr.js` and its current function shape
  does not match the existing Settings-row target.
- The Sparkle manager moved to `.vite/build/sqlite-BqLffnB9.js`. The updater
  scheduling signatures still match the source-level patch function, but the
  generated main-process hook only considers
  `workspace-root-drop-handler-*.js`, so it never reads or patches the new
  updater module.
- The backend Settings schema is also no longer guaranteed to live in the
  previously assumed `src-*.js` chunk.

## Compatibility Policy

`26.707.41301+5103` will be added to the exact version/build whitelist. It will
also be added to the build families that:

- do not require the legacy Plugins initial target;
- skip all Plugins runtime targets; and
- skip the GPT-5.6 model-list injection and GPT-5.6 query-selector targets.

The GPT-5.6 skip uses `26.707.41301+5103` as an inclusive threshold. This build
and every later build that is separately added to the strict compatibility
whitelist will use the official GPT-5.6 paths. Unknown future builds remain
blocked until they are inspected and whitelisted; the threshold does not relax
the compatibility gate. Older supported builds retain their existing GPT-5.6
compatibility patches.

The remaining runtime targets continue to be evaluated normally. In
particular, the Fast controls and service-tier request/fallback paths stay
active for custom API and custom `model_provider` users.

## Automatic-Update Hook Design

The main-process hook will stop selecting candidate modules by historical
chunk basename. Instead, it will consider JavaScript modules under
`.vite/build/`, read their source, and decide whether to patch based on the
existing narrow code signatures.

For each candidate module:

1. If the Settings schema signature is present, add the
   `disableAutomaticUpdates` schema entry.
2. If the Sparkle background-check signature is present, wrap the initial and
   interval-driven background check with a live read of
   `[desktop].disableAutomaticUpdates`.
3. If the automatic-background-download callback signature is present, gate
   its automatic check trigger with the same live reader.
4. If the forced-install scheduler signature is present, clear any pending
   forced-install timer and return while automatic updates are disabled.
5. Preserve the public/manual `checkForUpdates` and
   `installUpdatesIfAvailable` methods unchanged.

The hook remains process-local through `NODE_OPTIONS --require`. It does not
modify the application bundle, its archive, metadata, or signature.

This content-driven selection avoids another regression when the bundler moves
the same updater implementation to a differently named chunk.

## Settings UI Design

A new narrowly scoped target will match the current build-5103
`preventSleepWhileRunning` row shape. The replacement will follow the existing
26.707 app-name-aware implementation and continue to:

- render `Disable automatic updates` directly after the prevent-sleep row;
- read and write `settingsNamespace.disableAutomaticUpdates` through the
  existing Settings store;
- use codexfast-prefixed local names to avoid temporal-dead-zone and minified
  namespace collisions;
- preserve locale-aware label and description text; and
- keep the existing platform behavior, including hiding the row on Windows.

No unrelated General Settings rows will be changed.

## GPT-5.6 Runtime Design

The version-aware runtime patcher will exclude these target ids for
`26.707.41301+5103` and every later supported version/build:

- `gpt5x-model-list-options`
- `gpt56-model-query-selector`

This prevents `codexfast` from adding Sol, Terra, or Luna entries, replacing
official reasoning metadata, or widening the official remote allowlist. The
application's official GPT-5.6 catalog and selector behavior become the source
of truth from this threshold onward.

The threshold comparison will parse the dotted application version into
numeric segments and compare the numeric build when the application version is
equal. It will only affect builds that have already passed the strict whitelist
check.

The change does not remove the target definitions because they remain required
for older compatible builds.

## Regression Coverage

Tests will be added before production changes and must first fail for the
current implementation.

Coverage will prove that:

- build `26.707.41301+5103` is recognized as supported;
- Plugins targets are skipped for build 5103, while the two GPT-5.6 targets are
  skipped for build 5103 and representative later supported version keys;
- an older supported version below the threshold still applies the GPT-5.6
  compatibility targets;
- Fast, `/fast`, Speed, Settings, and updater targets remain eligible;
- the generated main-process hook discovers updater and schema signatures in
  arbitrarily named `.vite/build/*.js` chunks, including `sqlite-*.js`;
- background checks, automatic-download-triggered checks, and forced installs
  are gated by the live desktop setting;
- manual check/install methods remain present;
- the build-5103 General Settings function is patched without copied
  single-letter locals or syntax errors;
- applying runtime patches twice remains idempotent; and
- the generated `bin/codexfast` contains the new behavior.

After implementation, validation will run:

- `pnpm build`
- `pnpm build:check`
- `pnpm typecheck`
- `pnpm test`
- `git diff --check`
- a read-only patch application against the extracted build-5103 bundle
- `pnpm pack --dry-run` if package-facing documentation or metadata changes
  materially

## Documentation

The change will update the compatibility matrix, feature scope, patch-target
documentation, English and Chinese READMEs, bundle notes when useful, and the
unreleased changelog. Documentation will state that GPT-5.6 uses the official
application path from build 5103 onward and that automatic-update suppression
remains a runtime-session feature which preserves manual update actions.

## Real-App Validation Boundary

The installed app is currently in use by Codex/ChatGPT child processes. A real
fresh-session launch requires fully quitting those processes, which would
interrupt active work. Automated regression coverage and read-only extracted
bundle validation can be completed without doing so. Final reporting must
state clearly whether a fresh installed-app launch was performed.

## Non-Goals

- Do not disable or remove Sparkle globally.
- Do not block manual update checks or installs.
- Do not modify `/Applications/ChatGPT.app` or any installed app file.
- Do not remove GPT-5.6 compatibility patches needed by older builds.
- Do not refactor unrelated patch targets or runtime launch infrastructure.
