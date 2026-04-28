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
| `26.415.40636` | `1799` | `supported` | Settings Fast, `/fast`, Add-context Speed menu, Plugins access | `2026-04-20` | Matches the current strict whitelist in `src/cli.mts`. |
| `26.417.41555` | `1858` | `supported` | Settings Fast, `/fast`, Add-context Speed menu, Plugins access | `2026-04-21` | Verified by direct bundle inspection, `bash test/re-sign-flow.sh`, and rerun real-app smoke validation including the sidebar `Plugins` entry fix. |
| `26.422.21637` | `2056` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, GPT-5.5 model list, Plugins access | `2026-04-24` | Verified by direct bundle inspection, real app status detection, and `bash test/re-sign-flow.sh`. The composer Speed path moved to the `Intelligence` dropdown. |
| `26.422.30944` | `2080` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, Plugins access | `2026-04-25` | Verified by direct installed-bundle status detection, user validation that GPT-5.5 is already visible through the official path, and regression coverage. `codexfast` skips GPT-5.5 apply targets from this version onward but can still restore older `0.5.2` GPT-5.5 patch markers. |
| `26.422.62136` | `2176` | `supported` | Settings Fast, `/fast`, Intelligence Speed menu, Plugins access | `2026-04-28` | Verified by direct installed-bundle inspection, real app status/apply detection, and regression coverage. The Settings target moved to `general-settings-C7RhZXaE.js` with an `xe()` service-tier hook, and GPT-5.5 remains on the official app path. |

## Update Rules

- Add a row only after direct bundle inspection and regression updates.
- If a build is not whitelisted yet, mark it `investigating` or `unsupported`.
- When support status changes, update both this file and the whitelist in `src/cli.mts`.
