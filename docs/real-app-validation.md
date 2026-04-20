# Real-App Validation

This checklist is for manual smoke-testing on an installed `Codex.app` copy after a real patch adaptation.

Run these checks after any meaningful bundle change, patch-signature update, or compatibility-whitelist expansion.

## Core App Checks

- `Codex.app` launches successfully after patching
- `Codex.app` still launches after a restart
- Opening Settings does not crash or show an error

## Fast Feature Set

- The Fast-related Settings control is visible and usable
- Opening `Add files and more / +` shows the `Speed` submenu
- Opening the `Speed` submenu shows `Standard` and `Fast`
- Selecting `Standard` or `Fast` from the add-context menu does not break the UI
- Typing `/fast` in the composer shows the slash command item
- Selecting `/fast` can enable and disable Fast mode without breaking the UI

## Plugins

- The `Plugins` sidebar entry is visible for custom API users
- Opening `Plugins` does not fail only because of the auth-method gate
- At least one plugin install or connect path is not blocked solely by `authMethod === "apikey"`

## Recovery Checks

- `Restore original state` completes successfully
- `Codex.app` still launches after restore
- The app remains in packed `app.asar` layout after both apply and restore

## Notes

- Record the validated build in `docs/compatibility-matrix.md`.
- Add or update a bundle note when the validated build differs from the previous supported build.
