# Changelog

All notable changes to `codexfast` will be documented in this file.

This project follows a simple release-oriented changelog format.

## [Unreleased]

### Added

- Added support for `Codex.app` `26.623.31921` (`build 4452`) after direct installed-bundle inspection confirmed the `26.623.31443` Fast, `/fast`, Speed, and official Plugins support scope still applies.

### Changed

- Skipped Plugins runtime targets for `26.623.31921` (`build 4452`) because Plugins remains supported through the official app path.

### Fixed

- Made the `26.623` Settings > General automatic-update row target tolerate renamed minified settings helpers while still injecting the `Disable automatic updates` switch.
- Made the launcher-side automatic-update hook tolerate renamed minified Sparkle interval helpers, restoring background-check suppression on newer supported Codex builds while preserving manual update actions.

## [0.40.0] - 2026-06-26

### Added

- Added support for `Codex.app` `26.623.31443` (`build 4441`) after direct installed-bundle inspection confirmed the Fast, `/fast`, Speed, and automatic-update target family still applies with renamed assets and an updated General settings row shape.

### Changed

- Skipped Plugins runtime targets for `26.623.31443` (`build 4441`) because the latest app supports Plugins through the official app path.

### Fixed

- Fixed the Fast conversation fallback matcher so paused/edit/resend flows are patched when the bundle uses nullish `!=null` service-tier checks instead of `!==void 0`, preventing stale turn state from overriding Settings Fast.
- Fixed the Fast request-tier fallback so explicit non-standard next-turn Fast selections are preserved after stop/edit/resend flows, including when reasoning effort is changed before resending, while stale Standard conversation state and latest-turn service-tier params are still ignored.
- Fixed the Fast request service-tier helper so non-ChatGPT auth methods can still compute and send the configured Fast tier on send/edit/resume paths that bypass the shared `serviceTierForRequest` hook.

## [0.39.0] - 2026-06-24

### Added

- Added support for `Codex.app` `26.616.81150` (`build 4306`) after direct installed-bundle inspection confirmed the `26.616.71553` Fast, `/fast`, Speed, and Plugins catalog target mapping still applies.

### Changed

- Made the Settings > General `Disable automatic updates` row use locale-aware label and description copy instead of falling back to English-only text in non-English app locales.

## [0.38.0] - 2026-06-23

### Added

- Added support for `Codex.app` `26.616.71553` (`build 4265`) after direct installed-bundle inspection confirmed the `26.616.51431` Fast, `/fast`, Speed, and Plugins catalog target mapping still applies with renamed assets.

### Fixed

- Updated the `26.616.71553` post-install app-connect target to match the new callback-shaped `ON_USE` close shortcut and single-app auto-open guard.

### Changed

- Refined the Settings > General `Disable automatic updates` description to avoid restart- or launcher-specific wording.

## [0.37.1] - 2026-06-22

### Fixed

- Updated the `Disable automatic updates` launcher hook so toggling the setting during a `codexfast launch` session suppresses later Sparkle background checks without requiring a full Codex relaunch.

## [0.37.0] - 2026-06-22

### Added

- Added a Settings > General `Disable automatic updates` switch. When enabled before `codexfast launch`, the launcher skips Sparkle background update checks for that session while preserving manual `Check for Updates` and update install actions.

## [0.36.0] - 2026-06-22

### Added

- Added support for `Codex.app` `26.616.51431` (`build 4212`) after direct installed-bundle inspection confirmed the `26.616.31447` Fast, `/fast`, and Plugins catalog target mapping still applies with renamed assets.

## [0.35.1] - 2026-06-19

### Fixed

- Fixed the `26.616.31447` Plugins catalog query so custom API sessions also include the local full plugin cache root, restoring app-connect plugins such as Gmail when the default API catalog only returns `openai-api-curated`.

## [0.35.0] - 2026-06-19

### Added

- Added support for `Codex.app` `26.616.31447` (`build 4133`) after direct installed-bundle inspection confirmed the current Fast, `/fast`, and Plugins catalog target family still applies with renamed assets.

### Fixed

- Fixed the composer `Intelligence` Speed menu target for builds where locale message ids are split out of the composer asset by matching the code-level `composer.openModelPicker` path.

## [0.34.1] - 2026-06-18

### Fixed

- Fixed service-tier fallback on service-tier bundles so stale latest-turn `params.serviceTier` from stop/edit/resend flows no longer forces a Fast conversation back to Standard or locks the current conversation speed until restart.

## [0.34.0] - 2026-06-18

### Added

- Added support for `Codex.app` `26.611.62324` (`build 4028`) after direct installed-bundle inspection confirmed the `26.611.61753` target mapping still matches with renamed assets.

## [0.33.0] - 2026-06-17

### Added

- Added support for `Codex.app` `26.611.61753` (`build 4008`) after direct installed-bundle inspection confirmed the `26.611.61049` target mapping still matches.

## [0.32.0] - 2026-06-17

### Added

- Added support for `Codex.app` `26.611.61049` (`build 3996`) after direct installed-bundle inspection confirmed the current Fast, `/fast`, Speed, and Plugins catalog target family still applies with two updated Plugins signatures.

## [0.31.0] - 2026-06-16

### Added

- Added support for `Codex.app` `26.609.71450` (`build 3965`) after direct installed-bundle inspection confirmed the `26.609.41114` target mapping still matches.

## [0.30.0] - 2026-06-13

### Added

- Added support for `Codex.app` `26.609.41114` (`build 3888`) after direct installed-bundle inspection confirmed the `26.609.30741` target mapping still matches with renamed assets.

### Fixed

- Fixed `26.601`/`26.602`/`26.608`/`26.609`-style Fast service-tier reloads so reopened conversations fall back to the configured Settings Fast tier instead of letting stale conversation-level Standard state override the Settings value.

## [0.29.0] - 2026-06-12

### Added

- Added support for `Codex.app` `26.609.30741` (`build 3808`) after direct installed-bundle inspection confirmed the `26.608.12217` target mapping still matches with renamed assets.

### Fixed

- Fixed the `26.609.30741` Plugins catalog path so the `4218407052` vertical-catalog branch no longer filters out the `openai-curated` marketplace after `list-plugins` returns it.

## [0.28.0] - 2026-06-10

### Added

- Added support for `Codex.app` `26.608.12217` (`build 3722`) after direct installed-bundle inspection confirmed the `26.602.71036` target mapping still matches with renamed assets.

## [0.27.0] - 2026-06-09

### Added

- Added support for `Codex.app` `26.602.71036` (`build 3685`) after direct installed-bundle inspection confirmed the `26.602.40724` target mapping still matches with renamed assets.

## [0.26.1] - 2026-06-08

### Fixed

- Fixed Fast mode switching for custom API users on `26.601`/`26.602`-style bundles by patching the shared service-tier allowance hook, not only the Settings, `/fast`, and composer menu consumers.

## [0.26.0] - 2026-06-06

### Added

- Added support for `Codex.app` `26.602.40724` (`build 3593`) after direct installed-bundle inspection confirmed the `26.602.30954` target mapping still matches, with only the shared plugin marketplace prefetch asset renamed.

## [0.25.0] - 2026-06-05

### Added

- Added support for `Codex.app` `26.602.30954` (`build 3575`) after direct installed-bundle inspection confirmed the `26.601` target family still matches with renamed assets.

### Fixed

- Fixed the `26.602` post-install app-connect patch to capture the minified install-session setter name instead of assuming the earlier `F({apps:...})` shape.

## [0.24.0] - 2026-06-03

### Added

- Added support for `Codex.app` `26.601.21317` (`build 3511`) after direct installed-bundle inspection confirmed updated Settings Fast, composer `Intelligence` Speed, plugin install modal, plugin app-connect, and shared plugin marketplace prefetch signatures.

### Changed

- Runtime launch no longer requires the legacy `Plugins access` initial target for `26.601.21317` because the inspected bundle no longer contains the old sidebar/page/detail custom-API gates.
- `26.601.21317` now keeps the curated OpenAI plugin catalog visible for custom API users instead of showing only the limited catalog placeholder.
- `26.601.21317` now keeps plugin-declared app rows visible on plugin detail pages even when the directory app list is unavailable, so installed plugins can still show the app connect area.
- `26.601.21317` now keeps the post-install app connection flow open for `ON_USE` plugins with pending app auth, so a single required app can show its `Connect <App>` permission modal after plugin install.

## [0.23.1] - 2026-06-02

### Fixed

- Fixed runtime launch on supported builds by attaching to renderer targets through browser-level CDP before they run, enabling `Fetch` interception before JavaScript executes, and failing closed if `Plugins access` is not observed before reporting completion.

## [0.23.0] - 2026-06-02

### Added

- Added support for `Codex.app` `26.527.60818` (`build 3437`) after direct installed-bundle inspection confirmed the existing 26.527 patch signatures still match except for the updated Plugins sidebar helper names.

## [0.22.1] - 2026-06-01

### Fixed

- Fixed a probabilistic runtime launch failure on slower `26.527.31326` startups where initial JavaScript traffic was still active but no patch target had been observed before the old fixed target-discovery deadline.

## [0.22.0] - 2026-05-30

### Added

- Added support for `Codex.app` `26.527.31326` (`build 3390`) after direct installed-bundle inspection confirmed updated Settings Fast and Plugins sidebar patch signatures.

## [0.21.0] - 2026-05-27

### Added

- Added support for `Codex.app` `26.519.81530` (`build 3178`) after direct installed-bundle inspection confirmed the existing 26.519 patch signatures still match the updated bundle filenames.

## [0.20.0] - 2026-05-23

### Added

- Added support for `Codex.app` `26.519.41501` (`build 3044`) after direct installed-bundle inspection confirmed the existing 26.519 patch signatures still match the updated bundle filenames.

## [0.19.0] - 2026-05-22

### Added

- Added support for `Codex.app` `26.519.31651` (`build 3017`) after direct installed-bundle inspection confirmed the existing 26.519 patch signatures still match the updated bundle filenames.

## [0.18.0] - 2026-05-22

### Added

- Added support for `Codex.app` `26.519.22136` (`build 3003`) after direct installed-bundle inspection confirmed the updated Settings Fast, service-tier slash command, composer `Intelligence` Speed menu, and Plugins target shapes.

## [0.17.1] - 2026-05-18

### Fixed

- Fixed runtime launch so quitting the `codexfast launch` terminal process no longer sends terminal process-group signals to the launched Codex app.

### Changed

- Reduced the generated CLI source to the runtime launcher, runtime patch engine, app-environment checks, command policy, and legacy watcher cleanup shim while preserving the single-file `bin/codexfast` output.

### Removed

- Removed the legacy bundle patch flow, including internal `status`, `apply`, `restore`, archive rewrite, ASAR helper, Sparkle bridge, re-sign, and legacy file-patch self-test code.
- Removed legacy watcher install/uninstall code. The hidden `repair` command now only removes old watcher files for compatibility.

### Documentation

- Removed the `recommended` label from the public runtime launch menu and README examples.
- Updated maintenance guidance for the runtime-only launcher, generated CLI boundary, TypeScript regression runner, and supported-version drift check.

## [0.17.0] - 2026-05-17

### Added

- Added support for `Codex.app` `26.513.31313` (`build 2867`) after direct installed-bundle inspection confirmed the updated Settings Fast, `/fast`, composer `Intelligence` Speed menu, Plugins, and composer `@` plugin mention target shapes.

### Changed

- Runtime launch no longer terminates Codex after the patch session is lost following a successful startup; Codex keeps running, while later lazy-loaded chunks may require a full relaunch to be patched.
- Runtime launch now prints patched target labels before the foreground-session instructions.

### Removed

- Removed macOS ScreenCapture permission reset logic; current public launch does not re-sign the app.
- Removed the browser-use native pipe peer-auth compatibility target from the current implementation. Users with old locally ad-hoc signed apps should reinstall official Codex.app to recover the OpenAI Developer ID signature.

## [0.16.0] - 2026-05-15

### Added

- Added a browser-use native pipe peer-auth compatibility target that only allows `missing-code-signing-identity` and reports `Browser-use native pipe peer auth` independently in runtime launch output and internal target checks.

### Changed

- Help, the interactive menu, and README docs now expose `codexfast launch` as the public runtime path and remove the legacy `status`, `apply`, `restore`, `install-watcher`, and `uninstall-watcher` entries.
- Internal legacy restore now prints the current-version official Codex.app download URL after a successful restore so recovered installs can choose whether to reinstall and recover the OpenAI Developer ID signature.

### Fixed

- Fixed runtime launch interception for `Codex.app` `26.513.20950` by waiting for the initial renderer load to settle before enabling Fetch interception and reloading the page.
- Fixed the generated single-file runtime patch engine extraction so `launch` can apply the embedded patch rules instead of silently continuing intercepted responses.
- Kept runtime launch interception alive for the lifetime of the launched Codex process so lazy-loaded Settings Fast and Plugins page-content chunks can be patched after the initial window appears.
- Added runtime launch heartbeat and bounded CDP reconnects so dropped runtime patch sessions retry at most three times before reporting `Runtime patch session lost`.
- Matched both current `app://-/assets/*.js` runtime URLs and legacy `app://-/webview/assets/*.js` runtime URLs.
- Removed legacy auto-repair watcher files automatically during `launch`, and kept old watcher-triggered `repair` as a cleanup-only compatibility path.

## [0.15.1] - 2026-05-15

### Fixed

- Fixed the `26.513.20950` composer `@` plugin mention list getting stuck on the remote `shared-with-me` plugin catalog under API-key auth, while preserving local and already available plugin results.

## [0.15.0] - 2026-05-15

### Added

- Added support for `Codex.app` `26.513.20950` (`build 2816`) after direct installed-bundle inspection confirmed the updated Settings Fast, `/fast`, composer `Intelligence` Speed menu, and Plugins target shapes.
- Added a Sparkle public EdDSA key bridge for patched `26.506.31421` (`build 2620`) installs so `apply` and watcher `repair` preserve the in-app update path to `26.513.20950` (`build 2816`) after local ad-hoc re-signing.

### Changed

- Simplified `status`, `apply`, and `restore` output to report feature states and actions without internal target, backup, or temporary file paths.

## [0.14.0] - 2026-05-09

### Added

- Added support for `Codex.app` `26.506.31421` (`build 2620`) after direct installed-bundle inspection and real app apply/status validation confirmed the updated asset names and Plugins sidebar gate shape.

### Changed

- Changed new watcher installs to write a small `codexfast@latest` runner instead of copying the current CLI snapshot.
- Removed the watcher-only `repair` command from the public command reference.

## [0.13.1] - 2026-05-08

### Changed

- Restore now removes the auto-repair watcher before modifying `app.asar`, preventing a watched restore from being immediately re-patched by `repair`.
- New auto-repair watcher installs now call `repair` directly; the legacy `--quiet` marker remains accepted for existing watcher plists and user scripts.
- Documented the non-interactive command reference for `status`, `apply`, `repair`, `restore`, `install-watcher`, and `uninstall-watcher`.

## [0.13.0] - 2026-05-08

### Added

- Added support for `Codex.app` `26.506.21252` (`build 2575`) after direct installed-bundle inspection and real app apply/status validation confirmed the updated Settings Fast, `/fast`, composer `Intelligence` Speed menu, and Plugins target shapes.
- Added non-interactive `status`, `apply`, `repair`, `restore`, `install-watcher`, and `uninstall-watcher` commands.
- Added `help` and `version` commands that work before app-environment checks.
- Added an optional per-user macOS `launchd` watcher that monitors `Codex.app`'s `app.asar` and runs quiet repair after supported app updates.

### Changed

- Made apply-style runs skip archive rewrite and re-sign when all targets are already patched, preventing watcher self-trigger loops.
- Made quiet repair skip unsupported Codex builds without notifications, dialogs, backups, unpacking, archive writes, or re-signing.

## [0.12.0] - 2026-05-06

### Added

- Added support for `Codex.app` `26.429.61741` (`build 2429`) after direct installed-bundle inspection and real app apply/status validation confirmed it matches the current `26.429.30905` Settings Fast, `/fast`, composer `Intelligence` Speed menu, and Plugins target shapes.

## [0.11.0] - 2026-05-02

### Added

- Added support for `Codex.app` `26.429.30905` (`build 2345`) after direct installed-bundle inspection and real app apply/status validation confirmed the current Settings Fast, `/fast`, composer `Intelligence` Speed menu, and Plugins targets.

## [0.10.1] - 2026-05-01

### Fixed

- Fixed `Codex.app` `26.429.20946` (`build 2312`) plugin install buttons being blocked by the aggregate `connector-unavailable` state while preserving the admin-disabled plugin restriction.
- Fixed the `26.429.20946` plugin install modal hiding its basic plugin information for `ON_INSTALL` app plugins when disclosure data is unavailable.

## [0.10.0] - 2026-05-01

### Fixed

- Expanded `Codex.app` `26.429.20946` (`build 2312`) Plugins support beyond the sidebar entry so the `/skills` Plugins page content and plugin detail deep links are no longer blocked by the API-key auth gate.

## [0.9.0] - 2026-05-01

### Added

- Added support for `Codex.app` `26.429.20946` (`build 2312`) after direct installed-bundle inspection and real app apply/status validation confirmed the current Settings Fast, `/fast`, composer `Intelligence` Speed menu, and Plugins targets.

## [0.8.0] - 2026-04-29

### Added

- Added support for `Codex.app` `26.422.71525` (`build 2210`) after direct installed-bundle inspection and real app apply/status validation confirmed the current Settings Fast, `/fast`, composer `Intelligence` Speed menu, and Plugins targets.

## [0.7.0] - 2026-04-28

### Added

- Added support for `Codex.app` `26.422.62136` (`build 2180`) after direct installed-bundle inspection confirmed the same Settings Fast, `/fast`, composer `Intelligence` Speed menu, and Plugins target shapes as build `2176`.

## [0.6.0] - 2026-04-28

### Added

- Added support for `Codex.app` `26.422.62136` (`build 2176`) after direct installed-bundle inspection confirmed the Settings Fast, `/fast`, composer `Intelligence` Speed menu, and Plugins targets.

### Changed

- Migrated the re-sign regression flow from a long shell script to a typed TypeScript test runner with separate bundle fixtures, while preserving the `bash test/re-sign-flow.sh` compatibility entrypoint.
- Expanded the Settings-side Fast signature to cover the newer `xe()` service-tier hook shape.
- Expanded the 26.422 composer `Intelligence` Speed menu signature to cover the newer `Zp(...)` service-tier hook shape while preserving the older `Jp(...)` shape.
- Split fake app, fake asar, and script harness helpers out of the re-sign runner to keep future bundle cases smaller.
- Replaced the maintained shell entrypoint with TypeScript sources under `src/`, and now generate the npm `bin/codexfast` entrypoint directly.
- Declared and enforced Node.js `>=18.12.0` for the generated CLI.
- Run TypeScript build and regression entrypoints through `tsx` so repository verification also works on Node.js `18.12.0`.
- Pinned the runtime ASAR helper to `@electron/asar@3.4.1` so `npx codexfast` does not pull a Node 22-only `@electron/asar` release on Node 18.
- Verify the app signature after ad-hoc re-signing, and keep restore compatible with legacy `*.speed-setting.bak` file backups.
- Normalize legacy inline Speed setting patches without emitting invalid replacement groups, and cover direct upgrade from an older applied state.
- Reuse the current Node.js executable for the embedded patcher so the runtime cannot drift to an older `node` earlier in `PATH`.
- Print an exit code after archive-backup restore and mention Restore original app when signature verification fails.
- Reset the macOS ScreenCapture privacy permission record after successful apply and restore re-signing so users get a fresh authorization prompt for the ad-hoc signed app.
- Standardized repository development and release verification commands on `pnpm`.
- Avoid seeding new file backups from legacy-patched content when an older `*.speed-setting.bak` backup already exists.
- Replace `app.asar` through a target-directory temporary archive, and roll back the previous archive if the Electron ASAR integrity update fails.
- Clean temporary workspaces on early unpack and legacy migration failures, and skip TCC reset when `CFBundleIdentifier` is unavailable.
- Remove stale `.codexfast.*.app.asar.tmp` archives during startup checks and report when integrity rollback cannot fully restore the previous state.
- Preserve recently written archive temp files during cleanup and use random archive temp names to avoid interfering with another active `codexfast` process.
- Block unsupported apply requests before legacy layout migration, and report a missing extracted `webview/assets` directory without surfacing a raw stack trace.

### Documentation

- Recorded the `26.422.62136` (`build 2176`) support status, including the new Settings-side Fast target shape.

## [0.5.3] - 2026-04-25

### Changed

- `Codex.app` `26.422.30944` and later builds now skip the GPT-5.5 model-list and query-selector apply targets because GPT-5.5 is expected to be visible through the official app path from that version onward.
- Restore still recognizes the earlier `0.5.2` GPT-5.5 patch markers on `26.422.30944` and later builds so users can recover from a previously patched app even when the archive backup is unavailable.

### Documentation

- Removed outdated README search terms.
- Documented the required Conventional Commit message format for future repository commits.

## [0.5.2] - 2026-04-25

### Added

- Added support for `Codex.app` `26.422.30944` (`build 2080`) after installed-bundle status detection confirmed the existing 26.422 patch signatures still match.

### Changed

- Expanded the shell regression flow to cover the `26.422.30944` (`build 2080`) compatibility whitelist gate.

### Documentation

- Recorded the 26.422 build 2080 support status in the compatibility matrix, README files, patch target notes, and bundle notes.

## [0.5.1] - 2026-04-24

### Added

- Added 26.422 `GPT-5.5 model list` and `GPT-5.5 model query selector` patch targets that inject a Codex-shaped `gpt-5.5` UI catalog entry and preserve it after the app filters raw models into `modelsByType.models`.

### Changed

- Expanded the shell regression flow to cover apply and restore behavior for the GPT-5.5 model-list and query-selector injections.

### Documentation

- Improved README search terms and npm package metadata for GitHub, Google, and npm discoverability.
- Expanded README usage instructions for viewing status, enabling features, and restoring the original app state.
- Documented the GPT-5.5 model-list patch scope and provider-support boundary.

## [0.5.0] - 2026-04-24

### Added

- Added support for `Codex.app` `26.422.21637` (`build 2056`), including patch signatures and strict compatibility gating while keeping prior supported builds covered.
- Added support for the 26.422 composer `Intelligence` dropdown Speed menu, replacing the older add-context Speed target for that build.

### Documentation

- Recorded the 26.422 supported build in the compatibility matrix, README files, patch target notes, and bundle notes.

## [0.4.1] - 2026-04-21

### Fixed

- Adapted the bundle patch signatures for `Codex.app` `26.417.41555` (`build 1858`) while keeping `26.415.40636` (`build 1799`) supported.
- Fixed the 26.417 `Plugins access` patch so it also exposes the unified sidebar `Plugins` label state, and normalizes the earlier partial patch shape on re-apply.

### Documentation

- Recorded the new supported build in the compatibility matrix, README files, patch target notes, and bundle notes.

## [0.4.0] - 2026-04-20

### Added

- Added patch support for the custom-API `Plugins` sidebar gate so the Plugins entry can be exposed for API-key users on compatible Codex builds.
- Added maintenance checklist coverage for Plugins access alongside the existing Fast-related feature paths.
- Added strict app-version compatibility gating based on `CFBundleShortVersionString` and `CFBundleVersion`.

### Changed

- Expanded the shell regression test flow to cover apply and restore behavior for the Plugins sidebar gate target.
- Updated README documentation to describe the broader custom-API feature set and the Plugins availability boundary.
- `Enable custom API features` now refuses to run on unsupported `Codex.app` versions, while status and restore remain available.

## [0.3.0] - 2026-04-20

### Added

- Added patch support for the `Add files and more / +` composer menu `Speed` submenu.
- Added maintenance checklist coverage for the add-context `Speed` menu alongside Settings-side Fast control and composer `/fast`.

### Changed

- Expanded the shell regression test flow to cover apply and restore behavior for the add-context `Speed` menu target.

## [0.2.0] - 2026-04-20

### Added

- Added patch support for the composer `/fast` slash command, so future adaptations treat Settings-side Fast control and prompt-side Fast control as one feature set.
- Added repository maintenance guidance in `AGENTS.md`, including a checklist for verifying both `Settings > Fast` and composer `/fast`.

### Changed

- Expanded the regression test flow to cover both Fast-related targets during apply and restore.

## [0.1.5] - 2026-04-20

### Fixed

- Avoided generating invalid Settings-side JavaScript during patching.

## [0.1.4] - 2026-04-20

### Fixed

- Switched Electron ASAR integrity handling to the correct ASAR header hash flow.
- Improved ASAR integrity verification coverage in the shell test flow.

## [0.1.3] - 2026-04-20

### Fixed

- Updated `Info.plist` Electron ASAR integrity metadata after rebuilding `app.asar`.

## [0.1.2] - 2026-04-20

### Fixed

- Repacked modified resources back into `app.asar` instead of leaving a persistent unpacked app layout.

### Documentation

- Aligned README recovery and restore behavior with the current script flow.

## [0.1.1] - 2026-04-20

### Fixed

- Automatically re-signed the local `Codex.app` bundle after patching.
- Added manual re-sign fallback guidance for permission-related failures.

### Changed

- Converted all script prompts and menu text to English.

## [0.1.0] - 2026-04-20

### Added

- Initial single-file macOS script for exposing the Codex Speed setting.
- English and Chinese README documentation.
- npm CLI entrypoint with `npx codexfast` support.
- Shell-based regression test coverage for the app patch and re-sign flow.

### Changed

- Renamed the script and package to `codexfast`.
