# codexfast - runtime patches for OpenAI Codex.app

[中文说明](./README.zh-CN.md)

**A macOS runtime launcher for OpenAI `Codex.app` that re-enables hidden custom API features on verified compatible builds without modifying the installed app bundle.**

`codexfast` launches Codex with temporary runtime patches for the current session. It keeps the original `app.asar`, `Info.plist`, app bundle, and app signature untouched.

- **Fast settings** control in Settings
- **Composer `/fast`** slash command
- **Speed submenu** in the composer
- **Disable automatic updates** switch in Settings > General

```bash
npx codexfast launch
```

Verified for `Codex.app` `26.623.141536` (`build 4753`), `26.623.101652` (`build 4674`), `26.623.81905` (`build 4598`), `26.623.70822` (`build 4559`), `26.623.61825` (`build 4548`), `26.623.42026` (`build 4514`), `26.623.31921` (`build 4452`), `26.623.31443` (`build 4441`), `26.616.81150` (`build 4306`), `26.616.71553` (`build 4265`), `26.616.51431` (`build 4212`), `26.616.31447` (`build 4133`), `26.611.62324` (`build 4028`), `26.611.61753` (`build 4008`), `26.611.61049` (`build 3996`), `26.609.71450` (`build 3965`), `26.609.41114` (`build 3888`), `26.609.30741` (`build 3808`), `26.608.12217` (`build 3722`), `26.602.71036` (`build 3685`), `26.602.40724` (`build 3593`), `26.602.30954` (`build 3575`), `26.601.21317` (`build 3511`), `26.527.60818` (`build 3437`), `26.527.31326` (`build 3390`), `26.519.81530` (`build 3178`), `26.519.41501` (`build 3044`), `26.519.31651` (`build 3017`), `26.519.22136` (`build 3003`), `26.513.31313` (`build 2867`), `26.513.20950` (`build 2816`), `26.506.31421` (`build 2620`), `26.506.21252` (`build 2575`), `26.429.61741` (`build 2429`), `26.429.30905` (`build 2345`), `26.429.20946` (`build 2312`), `26.422.71525` (`build 2210`), `26.422.62136` (`builds 2180, 2176`), `26.422.30944` (`build 2080`), `26.422.21637` (`build 2056`), `26.417.41555` (`build 1858`), and `26.415.40636` (`build 1799`). Feature scope: [`docs/feature-scope.md`](./docs/feature-scope.md).

## How It Works

`Codex.app` already contains the Fast, `/fast`, Speed, and updater UI paths in its packaged frontend bundle. `codexfast` patches only the local gates still needed for a verified build. It does not add a backend service or call a private OpenAI API.

`codexfast launch` starts Codex with a local Chrome DevTools Protocol endpoint, attaches through the browser-level CDP target before renderer JavaScript runs, intercepts matching renderer JavaScript responses for that launched session, and applies narrow patch rules in memory. Keep the `codexfast launch` process running while you use Codex; Settings and patched feature chunks can load lazily, so the runtime interceptor must stay attached after the first window appears.

The Settings > General `Disable automatic updates` switch is stored in Codex desktop configuration as `[desktop].disableAutomaticUpdates`. `codexfast` injects a process-local main-process hook that reads the latest configuration before each Sparkle background update check and automatic forced install scheduling pass, so enabling the switch during a `codexfast launch` session suppresses later automatic update activity in that same session. Manual `Check for Updates` and update install actions remain available, and the injected Settings row uses locale-aware copy for common Codex app locales.

The launcher sends a lightweight browser-level CDP heartbeat, tries up to three bounded reconnects if the runtime patch session drops, and reports `Runtime patch session lost` instead of silently continuing unpatched. If reconnects are exhausted, `codexfast` closes the launched Codex process and exits non-zero so the session cannot keep running without runtime patching. If the launch process itself is killed externally, fully quit Codex and relaunch with `codexfast` before relying on patched lazy-loaded features.

If an older codexfast version installed the launchd auto-repair watcher, `launch` removes that legacy watcher before starting Codex.

## Usage

macOS only. Requires `Codex.app` at `/Applications` and Node.js `>=18.12.0`.

Recommended runtime launch:

```bash
npx codexfast launch
```

Or from a clone of this repo:

```bash
./bin/codexfast launch
```

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
- Runtime launch does not rewrite `app.asar`, `Info.plist`, the app bundle, backups, the app signature, or macOS privacy permissions
- The automatic-update switch disables later background update checks and forced automatic install scheduling during the current `codexfast launch` session; manual update checks and installs remain available

## Troubleshooting

**Script fails immediately** - check `/Applications/Codex.app` exists and `node -v` reports `18.12.0` or later.

**Runtime launch shows `Codex failed to start` / `ERR_FAILED`** - fully quit Codex and rerun the latest `npx codexfast launch`. A failed runtime launch should not modify `app.asar`, `Info.plist`, the app bundle, backups, the app signature, or macOS privacy permissions.

**Settings Fast or a patched feature is still missing after `launch`** - confirm the `codexfast launch` terminal process is still running. Closing it ends CDP interception, so lazy-loaded chunks cannot be patched later in the session.

**Automatic updates still checked once after changing the setting** - the updater can run a startup/background check before the Settings page is opened, and a check that already started cannot be undone. After the switch is enabled, later background checks and forced automatic install scheduling in the same `codexfast launch` session are skipped.

**Runtime patch session lost after reconnect attempts** - codexfast closes the launched Codex process because runtime patching is no longer active. Fully quit any remaining Codex process and rerun `npx codexfast launch` to start a fresh patched session.

**An older auto-repair watcher was installed** - run `npx codexfast launch` once. The launcher removes `~/Library/LaunchAgents/com.codexfast.watcher.plist` and the old local watcher runtime before starting Codex.

## License

MIT. See [`LICENSE`](./LICENSE).
