# Compatibility Matrix

This file tracks verified `Codex.app` builds for `codexfast`.

## Fields

- `Version`: `CFBundleShortVersionString`
- `Build`: `CFBundleVersion`
- `Status`: `supported`, `unsupported`, or `investigating`
- `Features`: supported feature paths for that build
- `Verified`: date of direct verification
- `Notes`: short reason or limitation

## Matrix

| Version | Build | Status | Features | Verified | Notes |
| --- | --- | --- | --- | --- | --- |
| `26.415.40636` | `1799` | `supported` | Settings Fast, `/fast`, Add-context Speed menu, Plugins access | `2026-04-20` | Matches the current strict whitelist in `codexfast.sh`. |
| `26.417.41555` | `1858` | `supported` | Settings Fast, `/fast`, Add-context Speed menu, Plugins access | `2026-04-21` | Verified by direct bundle inspection, `bash test/re-sign-flow.sh`, and rerun real-app smoke validation including the sidebar `Plugins` entry fix. |

## Update Rules

- Add a row only after direct bundle inspection and regression updates.
- If a build is not whitelisted yet, mark it `investigating` or `unsupported`.
- When support status changes, update both this file and the whitelist in `codexfast.sh`.
