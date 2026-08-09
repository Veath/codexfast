# codexfast - OpenAI Codex 桌面端 runtime patch launcher

[English README](./README.md)

**一个面向 OpenAI Codex 桌面端的 runtime launcher：在已验证兼容的 macOS 版本上临时启用 custom API 用户需要的隐藏能力，并提供实验性的 Windows Store/MSIX 启动路径，同时不修改已安装应用。**

`codexfast` 会启动一个带 runtime patch 的 Codex 会话。它不会修改原始 `app.asar`、应用元数据、已安装 app/MSIX package 或代码签名。

在已验证的 macOS build 上，当前功能范围包括：

- Settings 里的 **Fast** 控制项
- 输入框里的 **`/fast`** slash command
- composer 里的 **Speed** 菜单
- 面向 custom API 用户的 **GPT-5.5 / GPT-5.6 模型目录**兼容：旧版支持 build 注入 Sol/Terra/Luna 元数据，当前 build 使用官方 GPT-5.6 路径
- macOS Settings > General 里的 **Disable automatic updates** 开关

```bash
npx codexfast launch
```

Windows 支持目前是实验性的，并且只面向 Microsoft Store 安装的官方 `OpenAI.Codex` MSIX 包。npm 包现已允许在 Windows 安装，便于对精确 package version 做真机验证；未列入 Windows 白名单的版本会在启动前被拦截。在完成 Windows 真机验收清单之前，不能把任何 Windows build 描述为已支持。详见[实验性 Windows 支持](./docs/windows-experimental.md)。

官方 x64 MSIX `26.803.5235.0` 已完成离线 manifest/bundle 检查、六个必需 Fast patch 和 JavaScript parse 检查，但尚未完成真实 Windows AUMID/CDP 启动和 Fast 请求 E2E，因此状态是 `offline-validated`，不是已支持。arm64 尚未验证。

下面的已验证 build 列表只记录 macOS 验证结果。

最新完成本地验证的版本：`ChatGPT.app` / `Codex.app` `26.803.41515`（`build 6321`）。

另已验证支持 `ChatGPT.app` / `Codex.app` `26.730.61639`（`build 6234`）和 `26.730.61309`（`build 6223`）。

另已验证支持 `ChatGPT.app` / `Codex.app` `26.727.51351`（`build 6119`）、`26.727.40816`（`build 6067`）、`26.721.81911`（`build 5973`）、`26.721.41059`（`build 5848`）、`26.721.31836`（`build 5828`）、`26.721.30844`（`build 5813`）、`26.715.72359`（`build 5718`）和 `26.715.72028`（`build 5706`）。

已验证支持 `ChatGPT.app` / `Codex.app` `26.715.70719`（`build 5650`）、`26.715.61943`（`build 5628`）、`26.715.52143`（`build 5591`）、`26.715.31925`（`build 5551`）、`26.715.21425`（`build 5488`）、`26.707.91948`（`build 5440`）、`26.707.72221`（`build 5307`）、`26.707.71524`（`build 5263`）、`26.707.61608`（`build 5200`）、`26.707.41301`（`build 5103`）、`26.707.31428`（`build 5059`）、`26.623.141536`（`build 4753`）、`26.623.101652`（`build 4674`）、`26.623.81905`（`build 4598`）、`26.623.70822`（`build 4559`）、`26.623.61825`（`build 4548`）、`26.623.42026`（`build 4514`）、`26.623.31921`（`build 4452`）、`26.623.31443`（`build 4441`）、`26.616.81150`（`build 4306`）、`26.616.71553`（`build 4265`）、`26.616.51431`（`build 4212`）、`26.616.31447`（`build 4133`）、`26.611.62324`（`build 4028`）、`26.611.61753`（`build 4008`）、`26.611.61049`（`build 3996`）、`26.609.71450`（`build 3965`）、`26.609.41114`（`build 3888`）、`26.609.30741`（`build 3808`）、`26.608.12217`（`build 3722`）、`26.602.71036`（`build 3685`）、`26.602.40724`（`build 3593`）、`26.602.30954`（`build 3575`）、`26.601.21317`（`build 3511`）、`26.527.60818`（`build 3437`）、`26.527.31326`（`build 3390`）、`26.519.81530`（`build 3178`）、`26.519.41501`（`build 3044`）、`26.519.31651`（`build 3017`）、`26.519.22136`（`build 3003`）、`26.513.31313`（`build 2867`）、`26.513.20950`（`build 2816`）、`26.506.31421`（`build 2620`）、`26.506.21252`（`build 2575`）、`26.429.61741`（`build 2429`）、`26.429.30905`（`build 2345`）、`26.429.20946`（`build 2312`）、`26.422.71525`（`build 2210`）、`26.422.62136`（`builds 2180, 2176`）、`26.422.30944`（`build 2080`）、`26.422.21637`（`build 2056`）、`26.417.41555`（`build 1858`）和 `26.415.40636`（`build 1799`）。功能范围见 [`docs/feature-scope.md`](./docs/feature-scope.md)。

## 工作方式

Codex 桌面端的前端 bundle 里已经包含 Fast、`/fast`、Speed 和 updater 相关 UI 路径。`codexfast` 只 patch 已验证 build 上仍然需要的本地 gate。它不新增后端服务，也不调用 OpenAI 私有 API。

`codexfast launch` 会用本地 Chrome DevTools Protocol endpoint 启动 Codex，通过 browser-level CDP target 在 renderer JavaScript 执行前挂载拦截，拦截当前会话里匹配的 renderer JavaScript 响应，并在内存里应用窄范围 patch。使用 Codex 时需要保持 `codexfast launch` 进程运行；Settings 和被 patch 的功能 chunk 都可能懒加载，首次窗口打开后仍然需要 runtime interceptor。

在 macOS 上，Settings > General 里的 `Disable automatic updates` 开关会写入 Codex desktop 配置 `[desktop].disableAutomaticUpdates`。`codexfast` 会给当前进程注入 main-process hook，按源码签名在 `.vite/build/*.js` 中发现 updater 和 desktop settings 模块，并在每次 Sparkle 后台更新检查和自动强制安装调度前读取最新配置。因此即使 bundle chunk 改名，在一次 `codexfast launch` 会话中打开开关后，后续自动更新行为仍会被跳过；手动 `Check for Updates` 和安装更新动作仍然可用。注入到 Settings 的这一行会按常见 Codex app 语言显示对应文案。Windows 不注入这一 updater control，Microsoft Store/Windows 的更新行为保持不变。

`26.707.41301+5103` 是官方 GPT-5.6 阈值。该 build 以及数值上更新的 build 只有在各自加入严格 version/build 白名单后，才会跳过 GPT-5.6 model-list 注入和 query-selector 放行；未知后续版本仍会被拦截。

launcher 会发送轻量 browser-level CDP heartbeat。runtime patch session 断开时最多做三次 bounded reconnect，仍失败则打印 `Runtime patch session lost`。macOS 会关闭本次启动的进程；Windows 只有在重新验证记录的 PID、启动时间和 package executable path 后才尝试 fail-closed cleanup，并继续确认准入 executable path 上已没有残留进程。如果无法证明 identity 或退出结果，Windows 会报告 cleanup 未确认，而不会按宽泛 image name 终止进程。两种平台都会以非 0 退出。如果 Windows 权威 root 在 patch session 仍活跃时消失，codexfast 不会在 bounded exact-path 确认前关闭拦截；只有准入路径上没有残留进程时才返回成功，否则以非 0 退出并要求手工完全退出。这个轮询 monitor 无法取得已消失进程原本的 Windows exit code。

在 macOS 上，如果旧版 codexfast 安装过 launchd auto-repair watcher，`launch` 会在启动 Codex 前自动移除这个 legacy watcher。

## 使用

需要 Node.js `>=18.12.0`。

如果你只需要让 Codex 的新请求使用 Fast service tier，可以先不使用
`codexfast`，直接在共享的 Codex 配置中设置：

Windows 上个人配置文件通常是 `$HOME\.codex\config.toml`（一般对应
`C:\Users\<你的用户名>\.codex\config.toml`）；Codex 的不同使用界面共享这份
用户级配置。

```toml
service_tier = "fast"

[features]
fast_mode = true
```

OpenAI 官方[基础配置文档](https://learn.chatgpt.com/docs/config-file/config-basic)说明了
共享用户配置文件的位置，[配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)
说明 `fast` 会映射到请求值 `priority`，并且 `features.fast_mode` 已稳定、默认开启。
当当前 model/provider 声明支持 Fast 时，这是最简单的路径；但它不保证桌面端会显示
所有 UI 控制。`codexfast` 负责下面所述、经过 build 验证的 Settings Fast、`/fast`、
composer Speed 和 request-path bundle gate。

### macOS

需要 `/Applications/Codex.app` 或 `/Applications/ChatGPT.app`。只有 macOS 兼容白名单里的精确 version/build 组合才能启动。

推荐：

```bash
npx codexfast launch
```

从仓库 clone 运行：

```bash
./bin/codexfast launch
```

### Windows（实验性）

需要为当前 Windows 用户安装 Microsoft Store 官方 `OpenAI.Codex` MSIX 包。不支持 loose、portable、重新打包或手工解压的可执行文件。

当前实验性启动候选是 x64 `26.803.5235.0`，兼容键为 `win32:x64:26.803.5235+0`。它已进入严格 launcher 白名单，以便执行 Windows 真机检查；但文档状态仍是 `offline-validated`，不是 `supported`。准入还要求精确的 Store package family `OpenAI.Codex_2p2nqsd0c76g0`、publisher ID `2p2nqsd0c76g0`、Store signature kind，以及经过验证的 `App` / `app/ChatGPT.exe` / `Windows.FullTrustApplication` manifest entry。由此得到的 AUMID 是 `OpenAI.Codex_2p2nqsd0c76g0!App`；这条已安装 package 路径仍需在真实 Windows 上确认。

完全退出 Codex 后，在 PowerShell 或 Windows Terminal 中运行：

```powershell
npx codexfast launch
```

launcher 会通过 `Get-AppxPackage` 查找当前用户的 package，并通过 `Get-AppxPackageManifest` 获取 manifest 元数据。Node 不会直接打开 WindowsApps 下受保护的 `AppxManifest.xml`、`app.asar` 或 executable。它会校验精确的 Store/PFN/manifest identity，让 Windows 分配一个空闲 loopback 端口，再激活已验证 AUMID；任何没有保持在 `127.0.0.1` 和该精确端口上的 CDP WebSocket URL 都会被拒绝。只有启动时间不早于本次 activation attempt、executable path 精确匹配准入 package，并且经过 Windows 原生规则解析的 command line 中恰好有一个本次 CDP port 参数、一个 loopback-address 参数且没有其他 `--remote-debugging-*` 开关时，返回 PID 才会成为权威 identity。使用 Codex 时需要保持终端进程运行。Windows 会在 compatibility 和 interception 边界 fail closed：精确 package version 必须进入 Windows 白名单，browser-level CDP 必须成功挂载，并且要观察到预期的 `app://` JavaScript traffic。`Runtime launch completed` 只表示 interception 已建立；Settings 和 composer chunk 会懒加载，因此这条消息本身不能证明 Windows 完整 Fast 链路，仍需完成真机验收清单。

Windows 的已运行检测会匹配准入 package 的精确 `app/ChatGPT.exe` 路径，而不是宽泛的 `ChatGPT.exe` image name。runtime monitor 使用可取消的异步 PowerShell/CIM 查询，不会周期性阻塞 CDP interception；monitor 失败会进入正常的 fail-closed cleanup。cleanup 会重新校验权威 PID identity，通过原生 API 打开并终止那个精确 process handle，而不是再次依赖可能被复用的 PID；只有后续 exact-path snapshot 为空时，才报告已验证的启动进程退出且准入路径上没有 Codex 进程残留。session ready 后的正常权威 root 消失只做只读确认：codexfast 不会在 bounded exact-path polling 前关闭 interceptor，也不会终止第二个 PID；只有准入路径确认为空时才返回成功（`0`），轮询 monitor 不会恢复原始 exit code。如果仍有准入路径进程，或发现 PID reuse、启动时间漂移、executable path 漂移，则以非 0 退出并要求手工恢复。这个确认不代表名称不同的 helper executable 也已退出；如果仍有 Codex helper，请在重新启动前手工完全退出。缺少权威 activation PID 时，带短间隔的 bounded snapshot 仍只用于诊断：codexfast 会报告可能残留的进程，即使 activation-failure 快照为空也会把 cleanup 标记为未确认，并要求用户手工完全退出 Codex 后再重试。

从仓库 clone 运行时，直接使用 Node：

```powershell
node .\bin\codexfast launch
```

Windows 首版的验收目标是完整的 Fast 链路：Settings Fast、`/fast`、composer Speed 菜单，以及实际发送 `service_tier: "priority"` 的请求路径。Windows 自动更新控制不在首版范围内。详见[实验性 Windows 支持](./docs/windows-experimental.md)和[真机验证清单](./docs/real-app-validation.md)。

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
- Runtime launch 不会改写 `app.asar`、应用元数据、已安装 app/MSIX package、备份、代码签名或 macOS 隐私权限
- Windows 只面向官方 `OpenAI.Codex` Store/MSIX 分发；即使未知 package version 的数字看起来和某个已支持 macOS build 相似，也仍然会被拦截
- 自动更新开关仅支持 macOS。它会在当前 `codexfast launch` 会话中禁用后续后台更新检查和自动强制安装调度；手动更新检查和安装仍然可用
- `26.707.41301+5103` 以及后续单独加入白名单的版本使用官方 GPT-5.6 model list 和 selector，不再应用兼容注入

## 排查

**macOS 脚本立即失败** - 检查 `/Applications/Codex.app` 或 `/Applications/ChatGPT.app` 是否存在，以及 `node -v` 是否为 `18.12.0` 或更高。

**Windows 提示找不到 `OpenAI.Codex`** - 确认 Store/MSIX package 安装在运行终端的同一个 Windows 用户下：

```powershell
Get-AppxPackage -Name OpenAI.Codex |
  Select-Object Name, Version, PackageFamilyName, PublisherId, SignatureKind, InstallLocation
```

**Windows package version 被拦截** - 对未验证 MSIX version 来说，这是预期的 fail-closed 行为。请按 [Windows 验收命令](./docs/windows-experimental.md#collect-validation-data)记录 package 和 manifest 信息；不要绕过白名单，也不要在真机验证前把该 build 描述为已支持。

**Windows package 或 process identity 校验失败** - 不要取得 WindowsApps 所有权，也不要修改 ACL。请保留完整错误，并采集只读 AppX/manifest 输出。当 Store identity、manifest 元数据、进程启动时间或 executable path 无法验证时，package admission 和 cleanup 会有意停止。

**Runtime launch 显示 `Codex failed to start` / `ERR_FAILED`** - 完全退出 Codex，然后重新运行最新的 `npx codexfast launch`。失败的 runtime launch 不应该修改 `app.asar`、应用元数据、已安装 app/MSIX package、备份、代码签名或 macOS 隐私权限。

**`launch` 后 Settings Fast 或被 patch 的功能仍然缺失** - 确认 `codexfast launch` 终端进程仍在运行。关闭它会结束 CDP interception，后续懒加载的 chunk 就无法继续被 patch。

**macOS 修改开关后仍出现一次自动更新检查** - updater 可能在打开 Settings 页面前已经触发一次启动/后台检查，已经开始的检查无法撤回。打开开关后，同一次 `codexfast launch` 会话里的后续后台检查和自动强制安装调度会被跳过。Windows 不提供这个 codexfast 设置。

**出现 `Runtime patch session lost after reconnect attempts`** - macOS 上，codexfast 会关闭本次启动的 process group。Windows 上，它会先复核记录的 activation PID、启动时间和精确 package executable path，通过原生 process handle 终止这个精确进程，并确认该精确 package path 已不再运行。如果无法确认 identity 或退出结果，它会报告 fail-closed cleanup 未确认，而不会扩大终止范围。请手工完全退出任何残留的 Codex 进程，然后重新运行 `npx codexfast launch` 启动新的 patched session。

**macOS 以前安装过 auto-repair watcher** - 执行一次 `npx codexfast launch`。launcher 会在启动 Codex 前移除 `~/Library/LaunchAgents/com.codexfast.watcher.plist` 和旧的本地 watcher runtime。

## License

MIT. See [`LICENSE`](./LICENSE).
