# codexfast - runtime patches for OpenAI Codex.app

[中文说明](./README.zh-CN.md)

**A macOS runtime launcher for OpenAI `Codex.app` that re-enables hidden custom API features on verified compatible builds without modifying the installed app bundle.**

`codexfast` launches Codex with temporary runtime patches for the current session. It keeps the original `app.asar`, `Info.plist`, app bundle, and app signature untouched.

- **Fast settings** control in Settings
- **Composer `/fast`** slash command
- **Speed submenu** in the composer
- **GPT-5.5** model-list compatibility for custom-API users where the supported build still needs it
- **Plugins access** for custom-API users

```bash
npx codexfast launch
```

Verified for `Codex.app` `26.527.31326` (`build 3390`), `26.519.81530` (`build 3178`), `26.519.41501` (`build 3044`), `26.519.31651` (`build 3017`), `26.519.22136` (`build 3003`), `26.513.31313` (`build 2867`), `26.513.20950` (`build 2816`), `26.506.31421` (`build 2620`), `26.506.21252` (`build 2575`), `26.429.61741` (`build 2429`), `26.429.30905` (`build 2345`), `26.429.20946` (`build 2312`), `26.422.71525` (`build 2210`), `26.422.62136` (`builds 2180, 2176`), `26.422.30944` (`build 2080`), `26.422.21637` (`build 2056`), `26.417.41555` (`build 1858`), and `26.415.40636` (`build 1799`). Feature scope: [`docs/feature-scope.md`](./docs/feature-scope.md).

## How It Works

`Codex.app` already contains the Fast, `/fast`, Speed, model-list, and Plugins UI paths in its packaged frontend bundle, but some of those paths are hidden or disabled for custom API users by local gate checks. `codexfast` does not add a backend service or call a private OpenAI API.

`codexfast launch` starts Codex with a local Chrome DevTools Protocol endpoint, intercepts matching renderer JavaScript responses for that launched session, and applies narrow patch rules in memory. Keep the `codexfast launch` process running while you use Codex; Settings and Plugins load some feature chunks lazily, so the runtime interceptor must stay attached after the first window appears.

The launcher sends a lightweight CDP heartbeat, tries up to three bounded reconnects if the runtime patch session drops, and reports `Runtime patch session lost` instead of silently continuing unpatched. If the launch process exits or the runtime patch session disconnects after Codex has started, Codex keeps running. Lazy-loaded features that were not patched before that point may stay unavailable until you fully quit Codex and relaunch with `codexfast`.

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
- The GPT-5.5 model-list patch only injects the UI catalog entry on supported builds that still need it. Your configured provider must still support `gpt-5.5`
- For Plugins, the script removes the custom-API gates needed to open the Plugins sidebar/page path on supported builds. Actual plugin behavior can still depend on plugin state, connector runtime behavior, or admin restrictions

## Troubleshooting

**Script fails immediately** - check `/Applications/Codex.app` exists and `node -v` reports `18.12.0` or later.

**Runtime launch shows `Codex failed to start` / `ERR_FAILED`** - fully quit Codex and rerun the latest `npx codexfast launch`. A failed runtime launch should not modify `app.asar`, `Info.plist`, the app bundle, backups, the app signature, or macOS privacy permissions.

**Settings Fast or Plugins content is still missing after `launch`** - confirm the `codexfast launch` terminal process is still running. Closing it ends CDP interception, so lazy-loaded Settings and Plugins chunks cannot be patched later in the session.

**Runtime patch session lost after reconnect attempts** - Codex keeps running, but no further lazy-loaded chunks can be patched by that launch process. Fully quit Codex and rerun `npx codexfast launch` when you need a fresh patched session.

**Plugins visible but a specific plugin is still unusable** - codexfast only removes known local custom-API gates. Remaining failures usually come from plugin state, connector runtime behavior, or admin-side restrictions.

**GPT-5.5 visible but requests fail** - the UI entry is present, but your custom API provider still needs to accept `model: "gpt-5.5"`.

**An older auto-repair watcher was installed** - run `npx codexfast launch` once. The launcher removes `~/Library/LaunchAgents/com.codexfast.watcher.plist` and the old local watcher runtime before starting Codex.

## License

MIT. See [`LICENSE`](./LICENSE).
