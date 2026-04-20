# AGENTS.md

Repository guidance for `codexfast`.

## Project Scope

- This repo ships a single-file macOS patch script for `Codex.app`.
- The primary entrypoint is [`codexfast.sh`](/Users/veath/abc/code/github.com/Veath/codexfast/codexfast.sh).
- The npm shim is [`bin/codexfast`](/Users/veath/abc/code/github.com/Veath/codexfast/bin/codexfast).
- The main regression test is [`test/re-sign-flow.sh`](/Users/veath/abc/code/github.com/Veath/codexfast/test/re-sign-flow.sh).

## Docs Index

- Start with [`docs/README.md`](/Users/veath/abc/code/github.com/Veath/codexfast/docs/README.md) for the long-lived docs index.
- Read [`docs/feature-scope.md`](/Users/veath/abc/code/github.com/Veath/codexfast/docs/feature-scope.md) when you need the current supported feature paths before diving into bundle-specific implementation details.
- Read [`docs/compatibility-matrix.md`](/Users/veath/abc/code/github.com/Veath/codexfast/docs/compatibility-matrix.md) before changing the whitelist or describing a Codex build as supported.
- Read [`docs/patch-targets.md`](/Users/veath/abc/code/github.com/Veath/codexfast/docs/patch-targets.md) before changing regexes, target specs, or restore mapping.
- Read [`docs/troubleshooting.md`](/Users/veath/abc/code/github.com/Veath/codexfast/docs/troubleshooting.md) when the app fails to launch, a UI path breaks, `Plugins` remains partially unavailable, or repeated patch runs behave unexpectedly.
- Read [`docs/real-app-validation.md`](/Users/veath/abc/code/github.com/Veath/codexfast/docs/real-app-validation.md) when claiming real installed-app compatibility.
- Read [`docs/version-adaptation-playbook.md`](/Users/veath/abc/code/github.com/Veath/codexfast/docs/version-adaptation-playbook.md) when adapting to a new `Codex.app` build.
- Read [`docs/release-process.md`](/Users/veath/abc/code/github.com/Veath/codexfast/docs/release-process.md) when preparing a version bump, release commit, or npm publish.
- Read the relevant file under [`docs/bundle-notes/`](/Users/veath/abc/code/github.com/Veath/codexfast/docs/bundle-notes/) when adapting to a Codex bundle or investigating a gate/signature change.
- Keep `docs/` focused on reusable conclusions. Do not store raw conversation transcripts or throwaway debugging logs there.

## Working Rules

- Keep the script self-contained. New runtime dependencies should be avoided unless they are required.
- Preserve the packed `app.asar` workflow. Do not reintroduce a persistent `Contents/Resources/app` unpacked layout.
- Do not commit extracted Codex bundle files, temporary workspaces, or local inspection artifacts.
- Treat changes to patch signatures and restore logic as high risk. Update tests in the same change.
- Keep user-facing script output in English unless the task explicitly requires another language.

## Validation

- Run `bash test/re-sign-flow.sh` after changing patch, restore, archive, integrity-hash, or re-sign logic.
- If npm packaging changes, also check `package.json` and `bin/codexfast`.
- Do not claim macOS app behavior is fixed unless the shell test passes and the real-world limitation is stated clearly.
- Update the relevant files under `docs/` when compatibility knowledge, bundle notes, or release process knowledge changes.

## Maintenance Checklist

Use this checklist for every future Codex bundle adaptation or patch-signature update.

- Confirm the Settings entry still exists in the target bundle and the Speed setting patch signature still matches.
- Confirm the composer slash command entry still exists in the target bundle and the Fast slash command patch signature still matches.
- Confirm the `Add files and more / +` panel entry still exists in the target bundle and the Add-context Speed menu patch signature still matches.
- Confirm the Plugins sidebar gate still exists in the target bundle and the Plugins-access patch signature still matches.
- Confirm the target `CFBundleShortVersionString` + `CFBundleVersion` pair has been validated and added to the strict compatibility whitelist before allowing apply for that build.
- Verify `bash test/re-sign-flow.sh` still covers all targets:
  - apply enables the Settings-side Fast control
  - apply enables the composer `/fast` slash command
  - apply enables the add-context `Speed` submenu in the composer menu
  - apply removes the Plugins sidebar auth-method gate for custom API users
  - apply is blocked for unsupported app versions before unpacking, backup creation, or re-signing
  - restore returns all patched paths to their original guarded state
- Verify status output can report all targets independently:
  - `Speed setting`
  - `Fast slash command`
- `Add-context Speed menu`
- `Plugins access`
- Verify status output also reports:
  - detected app version
  - detected build
  - compatibility state
- If patch logic changes, make sure restore logic remains symmetrical for all targets.
- Do not ship a change that only enables one path. `Settings > Fast`, composer `/fast`, and the add-context `Speed` menu must be treated as one combined Fast feature set, and Plugins access must not be described as supported if the sidebar gate no longer patches cleanly.
- After any real-app validation, manually smoke-test these behaviors on the installed app copy:
  - `Codex.app` launches successfully after patching
  - opening Settings does not crash or show an error
  - the Fast-related Settings control is visible and usable
  - opening `Add files and more / +` shows the `Speed` submenu
  - opening the `Speed` submenu shows `Standard` and `Fast`
  - selecting `Standard` or `Fast` from the add-context menu does not break the UI
  - typing `/fast` in the composer shows the slash command item
  - selecting `/fast` can enable and disable Fast mode without breaking the UI
  - the `Plugins` sidebar entry is visible for custom API users
  - opening `Plugins` does not fail only because of the auth-method gate
  - at least one plugin install or connect flow is not blocked solely by `authMethod === "apikey"`
- If a new Codex build removes or renames any target path, update the README compatibility notes and do not describe the release as fully compatible until all supported paths work.

## Release Notes

- The published package name is `codexfast`.
- `npx codexfast` should remain the shortest supported invocation path.
- README updates are required when usage, platform support, signing behavior, or recovery steps change.

## Safety

- This repo modifies a locally installed `/Applications/Codex.app`. Be explicit when a change affects a real app copy.
- Preserve recovery paths: `app.asar1`, file-level backups, restore flow, and manual `codesign` fallback guidance.
- Prefer surgical diffs. Avoid unrelated refactors in the embedded Node patcher unless they directly support the requested fix.
