# codexfast - OpenAI Codex.app runtime patch launcher

[English README](./README.md)

**一个面向 OpenAI `Codex.app` 的 macOS runtime launcher，用于在已验证兼容的版本上临时启用 custom API 用户需要的隐藏能力，并且不修改已安装 app bundle。**

`codexfast` 会启动一个带 runtime patch 的 Codex 会话。它不会修改原始 `app.asar`、`Info.plist`、app bundle 或 app 签名。

- Settings 里的 **Fast** 控制项
- 输入框里的 **`/fast`** slash command
- composer 里的 **Speed** 菜单
- Settings > General 里的 **Disable automatic updates** 开关

```bash
npx codexfast launch
```

已验证支持 `Codex.app` `26.623.61825`（`build 4548`）、`26.623.42026`（`build 4514`）、`26.623.31921`（`build 4452`）、`26.623.31443`（`build 4441`）、`26.616.81150`（`build 4306`）、`26.616.71553`（`build 4265`）、`26.616.51431`（`build 4212`）、`26.616.31447`（`build 4133`）、`26.611.62324`（`build 4028`）、`26.611.61753`（`build 4008`）、`26.611.61049`（`build 3996`）、`26.609.71450`（`build 3965`）、`26.609.41114`（`build 3888`）、`26.609.30741`（`build 3808`）、`26.608.12217`（`build 3722`）、`26.602.71036`（`build 3685`）、`26.602.40724`（`build 3593`）、`26.602.30954`（`build 3575`）、`26.601.21317`（`build 3511`）、`26.527.60818`（`build 3437`）、`26.527.31326`（`build 3390`）、`26.519.81530`（`build 3178`）、`26.519.41501`（`build 3044`）、`26.519.31651`（`build 3017`）、`26.519.22136`（`build 3003`）、`26.513.31313`（`build 2867`）、`26.513.20950`（`build 2816`）、`26.506.31421`（`build 2620`）、`26.506.21252`（`build 2575`）、`26.429.61741`（`build 2429`）、`26.429.30905`（`build 2345`）、`26.429.20946`（`build 2312`）、`26.422.71525`（`build 2210`）、`26.422.62136`（`builds 2180, 2176`）、`26.422.30944`（`build 2080`）、`26.422.21637`（`build 2056`）、`26.417.41555`（`build 1858`）和 `26.415.40636`（`build 1799`）。功能范围见 [`docs/feature-scope.md`](./docs/feature-scope.md)。

## 工作方式

`Codex.app` 的前端 bundle 里已经包含 Fast、`/fast`、Speed 和 updater 相关 UI 路径。`codexfast` 只 patch 已验证 build 上仍然需要的本地 gate。它不新增后端服务，也不调用 OpenAI 私有 API。

`codexfast launch` 会用本地 Chrome DevTools Protocol endpoint 启动 Codex，通过 browser-level CDP target 在 renderer JavaScript 执行前挂载拦截，拦截当前会话里匹配的 renderer JavaScript 响应，并在内存里应用窄范围 patch。使用 Codex 时需要保持 `codexfast launch` 进程运行；Settings 和被 patch 的功能 chunk 都可能懒加载，首次窗口打开后仍然需要 runtime interceptor。

Settings > General 里的 `Disable automatic updates` 开关会写入 Codex desktop 配置 `[desktop].disableAutomaticUpdates`。`codexfast` 会给当前进程注入 main-process hook，并在每次 Sparkle 后台更新检查前读取最新配置，所以在一次 `codexfast launch` 会话中打开开关后，后续后台检查会被跳过；手动 `Check for Updates` 和安装更新动作仍然可用。注入到 Settings 的这一行会按常见 Codex app 语言显示对应文案。

launcher 会发送轻量 browser-level CDP heartbeat。runtime patch session 断开时最多做三次 bounded reconnect，仍失败则打印 `Runtime patch session lost`，不会静默继续跑一个未 patch 的会话。如果 launch 进程退出，或者 Codex 启动后 runtime patch session 断开，Codex 会继续运行；但断开后才懒加载的功能 chunk 可能不会再被 patch，需要完全退出 Codex 并重新用 `codexfast` 启动。

如果旧版 codexfast 安装过 launchd auto-repair watcher，`launch` 会在启动 Codex 前自动移除这个 legacy watcher。

## 使用

仅支持 macOS。需要 `/Applications/Codex.app` 和 Node.js `>=18.12.0`。

推荐：

```bash
npx codexfast launch
```

从仓库 clone 运行：

```bash
./bin/codexfast launch
```

查看帮助或版本：

```bash
npx codexfast help
npx codexfast version
```

交互菜单只保留 launch：

```text
1) Launch Codex with runtime patches
q) Quit
```

### 命令

| Command | 说明 |
| --- | --- |
| `npx codexfast launch` | 启动当前前台 Codex runtime patch 会话。使用 Codex 时保持该命令运行。 |
| `npx codexfast help` | 显示帮助。 |
| `npx codexfast version` | 显示 codexfast 版本。 |

## 兼容性

脚本匹配的是 Codex 前端构建产物里的代码签名，所以 Codex 更新后可能失效。

- `launch` 只允许在白名单里的 version/build 上执行
- Runtime launch 不会改写 `app.asar`、`Info.plist`、app bundle、备份、app 签名或 macOS 隐私权限
- 自动更新开关会在当前 `codexfast launch` 会话中禁用后续后台更新检查；手动更新检查仍然可用

## 排查

**脚本立即失败** - 检查 `/Applications/Codex.app` 是否存在，以及 `node -v` 是否为 `18.12.0` 或更高。

**Runtime launch 显示 `Codex failed to start` / `ERR_FAILED`** - 完全退出 Codex，然后重新运行最新的 `npx codexfast launch`。失败的 runtime launch 不应该修改 `app.asar`、`Info.plist`、app bundle、备份、app 签名或 macOS 隐私权限。

**`launch` 后 Settings Fast 或被 patch 的功能仍然缺失** - 确认 `codexfast launch` 终端进程仍在运行。关闭它会结束 CDP interception，后续懒加载的 chunk 就无法继续被 patch。

**修改开关后仍出现一次自动更新检查** - updater 可能在打开 Settings 页面前已经触发一次启动/后台检查，已经开始的检查无法撤回。打开开关后，同一次 `codexfast launch` 会话里的后续后台检查会被跳过。

**出现 `Runtime patch session lost after reconnect attempts`** - Codex 会继续运行，但该 launch 进程无法继续 patch 后续懒加载 chunk。需要新的 patched session 时，完全退出 Codex，然后重新运行 `npx codexfast launch`。

**以前安装过 auto-repair watcher** - 执行一次 `npx codexfast launch`。launcher 会在启动 Codex 前移除 `~/Library/LaunchAgents/com.codexfast.watcher.plist` 和旧的本地 watcher runtime。

## License

MIT. See [`LICENSE`](./LICENSE).
