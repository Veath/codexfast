# AGENTS.md

Repository guidance for `codexfast`.

## Project Scope

- This repo ships a single-file macOS patch script for `Codex.app`.
- The primary entrypoint is [`codexfast.sh`](/Users/veath/abc/code/github.com/Veath/codexfast/codexfast.sh).
- The npm shim is [`bin/codexfast`](/Users/veath/abc/code/github.com/Veath/codexfast/bin/codexfast).
- The main regression test is [`test/re-sign-flow.sh`](/Users/veath/abc/code/github.com/Veath/codexfast/test/re-sign-flow.sh).

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

## Release Notes

- The published package name is `codexfast`.
- `npx codexfast` should remain the shortest supported invocation path.
- README updates are required when usage, platform support, signing behavior, or recovery steps change.

## Safety

- This repo modifies a locally installed `/Applications/Codex.app`. Be explicit when a change affects a real app copy.
- Preserve recovery paths: `app.asar1`, file-level backups, restore flow, and manual `codesign` fallback guidance.
- Prefer surgical diffs. Avoid unrelated refactors in the embedded Node patcher unless they directly support the requested fix.
