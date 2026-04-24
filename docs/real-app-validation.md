# Real-App Validation

This checklist is for manual smoke-testing on an installed `Codex.app` copy after a real patch adaptation.

Run these checks after any meaningful bundle change, patch-signature update, or compatibility-whitelist expansion.

## Core App Checks

- `Codex.app` launches successfully after patching
- `Codex.app` still launches after a restart
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

## Plugins

- The `Plugins` sidebar entry is visible for custom API users
- Opening `Plugins` does not fail only because of the auth-method gate
- At least one plugin install or connect path is not blocked solely by `authMethod === "apikey"`

## Model List

- `GPT-5.5` appears in the app model picker for custom API users
- Selecting `GPT-5.5` writes the expected model setting
- A custom API provider request using `model: "gpt-5.5"` still succeeds independently of the UI catalog injection

## Recovery Checks

- `Restore original state` completes successfully
- `Codex.app` still launches after restore
- The app remains in packed `app.asar` layout after both apply and restore

## Notes

- Record the validated build in `docs/compatibility-matrix.md`.
- Add or update a bundle note when the validated build differs from the previous supported build.
