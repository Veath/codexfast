# Changelog

All notable changes to `codexfast` will be documented in this file.

This project follows a simple release-oriented changelog format.

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
