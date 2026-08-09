# codexfast - runtime patches for OpenAI Codex desktop

[中文说明](./README.zh-CN.md)

**A runtime launcher for OpenAI Codex desktop that re-enables hidden custom API features on verified compatible macOS builds, with an experimental Windows Store/MSIX path, without modifying the installed application.**

`codexfast` launches Codex with temporary runtime patches for the current session. It keeps the original `app.asar`, application metadata, installed app/MSIX package, and code signature untouched.

On verified macOS builds, the current feature set includes:

- **Fast settings** control in Settings
- **Composer `/fast`** slash command
- **Speed submenu** in the composer
- **GPT-5.5 and GPT-5.6 model catalog** compatibility for custom API users, including injected Sol/Terra/Luna metadata on older supported builds and the official GPT-5.6 path on current builds
- **Disable automatic updates** switch in Settings > General on macOS

```bash
npx codexfast launch
```

Windows support is experimental and limited to the official Microsoft Store/MSIX package named `OpenAI.Codex`. The npm package can be installed on Windows so exact package versions can be tested, but an unlisted Windows version is blocked before launch and no Windows build should be treated as supported until it completes the Windows real-app checklist. See [Experimental Windows Support](./docs/windows-experimental.md).

The official x64 MSIX `26.803.5235.0` has passed offline manifest/bundle inspection, all six required Fast patches, and JavaScript parse checks. It has not completed real Windows AUMID/CDP launch or Fast request E2E, so its status is `offline-validated`, not supported. arm64 is not yet validated.

The verified build list below records macOS validation only.

Latest verified local build: `ChatGPT.app` / `Codex.app` `26.803.41515` (`build 6321`).

Also verified for `ChatGPT.app` / `Codex.app` `26.730.61639` (`build 6234`) and `26.730.61309` (`build 6223`).

Also verified for `ChatGPT.app` / `Codex.app` `26.727.51351` (`build 6119`), `26.727.40816` (`build 6067`), `26.721.81911` (`build 5973`), `26.721.41059` (`build 5848`), `26.721.31836` (`build 5828`), `26.721.30844` (`build 5813`), `26.715.72359` (`build 5718`), and `26.715.72028` (`build 5706`).

Verified for `ChatGPT.app` / `Codex.app` `26.715.70719` (`build 5650`), `26.715.61943` (`build 5628`), `26.715.52143` (`build 5591`), `26.715.31925` (`build 5551`), `26.715.21425` (`build 5488`), `26.707.91948` (`build 5440`), `26.707.72221` (`build 5307`), `26.707.71524` (`build 5263`), `26.707.61608` (`build 5200`), `26.707.41301` (`build 5103`), `26.707.31428` (`build 5059`), `26.623.141536` (`build 4753`), `26.623.101652` (`build 4674`), `26.623.81905` (`build 4598`), `26.623.70822` (`build 4559`), `26.623.61825` (`build 4548`), `26.623.42026` (`build 4514`), `26.623.31921` (`build 4452`), `26.623.31443` (`build 4441`), `26.616.81150` (`build 4306`), `26.616.71553` (`build 4265`), `26.616.51431` (`build 4212`), `26.616.31447` (`build 4133`), `26.611.62324` (`build 4028`), `26.611.61753` (`build 4008`), `26.611.61049` (`build 3996`), `26.609.71450` (`build 3965`), `26.609.41114` (`build 3888`), `26.609.30741` (`build 3808`), `26.608.12217` (`build 3722`), `26.602.71036` (`build 3685`), `26.602.40724` (`build 3593`), `26.602.30954` (`build 3575`), `26.601.21317` (`build 3511`), `26.527.60818` (`build 3437`), `26.527.31326` (`build 3390`), `26.519.81530` (`build 3178`), `26.519.41501` (`build 3044`), `26.519.31651` (`build 3017`), `26.519.22136` (`build 3003`), `26.513.31313` (`build 2867`), `26.513.20950` (`build 2816`), `26.506.31421` (`build 2620`), `26.506.21252` (`build 2575`), `26.429.61741` (`build 2429`), `26.429.30905` (`build 2345`), `26.429.20946` (`build 2312`), `26.422.71525` (`build 2210`), `26.422.62136` (`builds 2180, 2176`), `26.422.30944` (`build 2080`), `26.422.21637` (`build 2056`), `26.417.41555` (`build 1858`), and `26.415.40636` (`build 1799`). Feature scope: [`docs/feature-scope.md`](./docs/feature-scope.md).

## How It Works

The Codex desktop frontend bundle already contains the Fast, `/fast`, Speed, and updater UI paths. `codexfast` patches only the local gates still needed for a verified build. It does not add a backend service or call a private OpenAI API.

`codexfast launch` starts Codex with a local Chrome DevTools Protocol endpoint, attaches through the browser-level CDP target before renderer JavaScript runs, intercepts matching renderer JavaScript responses for that launched session, and applies narrow patch rules in memory. Keep the `codexfast launch` process running while you use Codex; Settings and patched feature chunks can load lazily, so the runtime interceptor must stay attached after the first window appears.

On macOS, the Settings > General `Disable automatic updates` switch is stored in Codex desktop configuration as `[desktop].disableAutomaticUpdates`. `codexfast` injects a process-local main-process hook that discovers updater and desktop-settings modules by source signature across `.vite/build/*.js`, then reads the latest configuration before each Sparkle background update check and automatic forced install scheduling pass. Enabling the switch during a `codexfast launch` session therefore suppresses later automatic update activity even when bundle chunk names move. Manual `Check for Updates` and update install actions remain available, and the injected Settings row uses locale-aware copy for common Codex app locales. This updater control is not injected on Windows; Store/Windows update behavior remains unchanged.

`26.707.41301+5103` is the official GPT-5.6 threshold. That build and numerically later builds skip the GPT-5.6 model-list injection and query-selector widening only after they have been separately added to the strict exact-version/build whitelist; unknown future builds remain blocked.

The launcher sends a lightweight browser-level CDP heartbeat, tries up to three bounded reconnects if the runtime patch session drops, and reports `Runtime patch session lost` instead of silently continuing unpatched. If reconnects are exhausted, macOS closes the launched process; Windows attempts fail-closed cleanup only after revalidating the recorded PID, start time, and package executable path, then confirms that no admitted-path process remains. If Windows cannot prove either identity or exit, it reports that cleanup was not confirmed rather than killing by a broad image name. The launcher exits non-zero in either case. If the authoritative Windows root disappears while the patch session is active, codexfast does not close interception before bounded exact-path confirmation and returns success only when no admitted-path process remains; otherwise it exits non-zero and requires a full manual quit. The polling monitor cannot recover the disappeared process's original Windows exit code.

On macOS, if an older codexfast version installed the launchd auto-repair watcher, `launch` removes that legacy watcher before starting Codex.

## Usage

Requires Node.js `>=18.12.0`.

If you only need new Codex turns to request the Fast service tier, first try the
shared Codex configuration without `codexfast`:

On Windows, the personal file is normally `$HOME\.codex\config.toml` (usually
`C:\Users\<you>\.codex\config.toml`); Codex uses the same user-level file across
its surfaces.

```toml
service_tier = "fast"

[features]
fast_mode = true
```

The official [OpenAI configuration basics](https://learn.chatgpt.com/docs/config-file/config-basic)
documents the shared user-level file, while the
[configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
states that `fast` maps to the request value `priority`, and that
`features.fast_mode` is stable and enabled by default. This direct setting is
the simplest path when the active model/provider advertises Fast support. It
does not guarantee that every desktop UI control is exposed; `codexfast` is for
the verified Settings Fast, `/fast`, composer Speed, and request-path bundle
gates described below.

### macOS

Requires `Codex.app` or `ChatGPT.app` at `/Applications`. Only exact version/build pairs in the macOS compatibility whitelist can launch.

Recommended runtime launch:

```bash
npx codexfast launch
```

Or from a clone of this repo:

```bash
./bin/codexfast launch
```

### Windows (experimental)

Requires the official Microsoft Store/MSIX package named `OpenAI.Codex`, installed for the current Windows user. Loose, portable, repackaged, and manually extracted executables are not supported.

Current experimental launch candidate: x64 `26.803.5235.0`, compatibility key `win32:x64:26.803.5235+0`. It is admitted by the strict launcher whitelist so the real Windows checks can run, but its documentation status remains `offline-validated`, not `supported`. Admission also requires the exact Store package family `OpenAI.Codex_2p2nqsd0c76g0`, publisher ID `2p2nqsd0c76g0`, Store signature kind, and the verified `App` / `app/ChatGPT.exe` / `Windows.FullTrustApplication` manifest entry. The resulting AUMID is `OpenAI.Codex_2p2nqsd0c76g0!App`; this installed-package path still requires confirmation on a real Windows machine.

Run from PowerShell or Windows Terminal after fully quitting Codex:

```powershell
npx codexfast launch
```

The launcher discovers the current user's package through `Get-AppxPackage` and obtains manifest metadata through `Get-AppxPackageManifest`. Node does not open the protected `AppxManifest.xml`, `app.asar`, or executable directly under WindowsApps. It validates the exact Store/PFN/manifest identity, asks Windows for a free loopback port, activates the verified AUMID, and rejects CDP WebSocket URLs that do not remain on `127.0.0.1` and that exact port. The returned PID is accepted only when its start time is not older than the current activation attempt, its executable path matches the admitted package, and its native-parsed command line contains exactly one selected CDP port argument, exactly one loopback-address argument, and no other `--remote-debugging-*` switch. Keep the terminal process running while using Codex. Windows launch remains fail-closed at the compatibility and interception boundary: an exact package version must be present in the Windows whitelist, browser-level CDP must attach, and expected `app://` JavaScript traffic must be observed. `Runtime launch completed` means interception is active; because Settings and composer chunks are lazy, it does not by itself prove the complete Windows Fast chain. That claim still requires the real-app checklist.

Windows running detection matches the admitted package's exact `app/ChatGPT.exe` path, not the broad `ChatGPT.exe` image name. Runtime monitoring uses cancellable asynchronous PowerShell/CIM queries so it does not block CDP interception, and monitor failures enter the normal fail-closed cleanup path. Cleanup revalidates the authoritative PID identity, opens and terminates that exact process through a native verified handle rather than a reusable PID, and requires a later exact-path snapshot to be empty before reporting that the verified launched process exited and no admitted-path Codex process remains. A normal authoritative-root disappearance after session readiness is read-only: codexfast does not terminate a second PID and does not close the interceptor before bounded exact-path polling confirms that no admitted-path process remains. Only then does it return success (`0`); the polling monitor does not recover the process's original exit code. A residual exact-path process, PID reuse, start-time drift, or executable-path drift makes the launcher exit non-zero and require manual recovery. This confirmation does not claim that differently named helper executables have exited; if any Codex helper remains, fully quit it manually before relaunching. Bounded exact-path snapshots without an authoritative activation PID remain diagnostic only: codexfast reports possible residual processes, treats even empty activation-failure snapshots as cleanup unconfirmed, and requires the user to fully quit Codex manually before retrying.

From a repository clone, use Node directly:

```powershell
node .\bin\codexfast launch
```

The initial Windows acceptance target is the complete combined Fast path: Settings Fast, `/fast`, the composer Speed menu, and the request path that sends `service_tier: "priority"`. Windows automatic-update control is not included. See [Experimental Windows Support](./docs/windows-experimental.md) and [Real-App Validation](./docs/real-app-validation.md).

Print help or the installed package version:

```bash
npx codexfast help
npx codexfast version
```

The interactive menu exposes the same launch path:

```text
1) Launch Codex with runtime patches
q) Quit
```

### Command Reference

| Command | Purpose |
| --- | --- |
| `npx codexfast launch` | Launch Codex with runtime patches for the current foreground session. Keep this command running while you use Codex. |
| `npx codexfast help` | Show help. |
| `npx codexfast version` | Print the codexfast version. |

## Compatibility

The script matches code signatures in frontend build output, so it can break after a Codex update.

- `launch` is blocked unless the installed version/build is whitelisted
- Runtime launch does not rewrite `app.asar`, application metadata, the installed app/MSIX package, backups, code signatures, or macOS privacy permissions
- On Windows, only the official `OpenAI.Codex` Store/MSIX distribution is in scope; unknown package versions remain blocked even if their numeric version resembles a supported macOS build
- The automatic-update switch is macOS-only. It disables later background update checks and forced automatic install scheduling during the current `codexfast launch` session; manual update checks and installs remain available
- Build `26.707.41301+5103` and later separately whitelisted builds use the official GPT-5.6 model list and selector instead of the compatibility injection

## Troubleshooting

**macOS script fails immediately** - check `/Applications/Codex.app` or `/Applications/ChatGPT.app` exists and `node -v` reports `18.12.0` or later.

**Windows reports that `OpenAI.Codex` was not found** - confirm the Store/MSIX package is installed for the same Windows user running the terminal:

```powershell
Get-AppxPackage -Name OpenAI.Codex |
  Select-Object Name, Version, PackageFamilyName, PublisherId, SignatureKind, InstallLocation
```

**Windows package version is blocked** - this is the expected fail-closed behavior for an unverified MSIX version. Record the package and manifest details using [the Windows validation commands](./docs/windows-experimental.md#collect-validation-data); do not bypass the whitelist or describe the build as supported before real-app validation.

**Windows package or process identity validation fails** - do not take ownership of WindowsApps or change its ACLs. Preserve the exact error and collect the read-only AppX/manifest output. Package admission and cleanup intentionally stop when Store identity, manifest metadata, process start time, or executable path cannot be verified.

**Runtime launch shows `Codex failed to start` / `ERR_FAILED`** - fully quit Codex and rerun the latest `npx codexfast launch`. A failed runtime launch should not modify `app.asar`, application metadata, the installed app/MSIX package, backups, code signatures, or macOS privacy permissions.

**Settings Fast or a patched feature is still missing after `launch`** - confirm the `codexfast launch` terminal process is still running. Closing it ends CDP interception, so lazy-loaded chunks cannot be patched later in the session.

**Automatic updates still checked once after changing the setting on macOS** - the updater can run a startup/background check before the Settings page is opened, and a check that already started cannot be undone. After the switch is enabled, later background checks and forced automatic install scheduling in the same `codexfast launch` session are skipped. This setting is not provided by codexfast on Windows.

**Runtime patch session lost after reconnect attempts** - on macOS, codexfast closes the launched process group. On Windows, it rechecks the recorded activation PID, start time, and exact package executable path, terminates the exact native process handle, and confirms that the exact package path is no longer running. If identity or exit cannot be confirmed, it reports that fail-closed cleanup was not confirmed instead of broadening the termination scope. Fully quit any remaining Codex process and rerun `npx codexfast launch` to start a fresh patched session.

**An older macOS auto-repair watcher was installed** - run `npx codexfast launch` once. The launcher removes `~/Library/LaunchAgents/com.codexfast.watcher.plist` and the old local watcher runtime before starting Codex.

## License

MIT. See [`LICENSE`](./LICENSE).
