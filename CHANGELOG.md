# Changelog

All notable changes to `codexfast` will be documented in this file.

This project follows a simple release-oriented changelog format.

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
