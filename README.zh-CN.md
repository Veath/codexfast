# codexfast - 为 OpenAI Codex.app 开启 Fast mode、GPT-5.5 和 Plugins

[English README](./README.md)

**一个面向 OpenAI `Codex.app` 的 macOS patch 脚本，用于在已验证兼容的版本上重新启用被隐藏的 custom API 能力。**

`codexfast` 是一个面向 macOS custom API 用户的 OpenAI Codex.app 单文件 patcher，用来恢复被隐藏的 Fast mode 能力，包括 Settings 里的 Fast 设置项、输入框 `/fast` 命令、composer 里的 Speed 菜单、GPT-5.5 模型列表项，以及 Plugins 入口。

- **Fast 设置项**（Settings 中）
- **`/fast` 输入框命令**
- **Speed 子菜单**（composer 中）
- **GPT-5.5** 模型列表项（custom API 用户可用）
- **Plugins 入口**（custom API 用户可用）

```bash
npx codexfast
```

搜索关键词：OpenAI Codex.app、Codex Fast mode、GPT-5.5 model list、`/fast`、Speed menu、Plugins、custom API、macOS、`npx codexfast`。

已验证兼容：`Codex.app` `26.415.40636`（`build 1799`）、`26.417.41555`（`build 1858`）和 `26.422.21637`（`build 2056`）。能力定义见 [`docs/feature-scope.md`](./docs/feature-scope.md)。

## 作用

脚本在安装好的 `Codex.app` 上提供三个菜单动作：

1. **查看当前状态** — 检查版本、目标文件，以及当前是否可以安全打补丁
2. **开启 custom API 相关能力** — 恢复上面列出的能力集合
3. **恢复原始状态** — 回退到原始应用 bundle

打补丁流程：解包 `app.asar`，改写前端资源，重新打包，更新 `Info.plist` 中的 `ElectronAsarIntegrity` hash，再做一次本地 ad-hoc 重签名，保持 `Codex.app` 可以正常启动。

## 使用方式

仅支持 macOS。需要：`Codex.app` 安装在 `/Applications`，命令行可用 `node`、`npm` 和系统自带的 `codesign`。

运行 patcher：

```bash
npx codexfast
```

或在本仓库里直接运行：

```bash
./codexfast.sh
```

脚本会打开一个交互菜单：

```text
1) View current status
2) Enable custom API features
3) Restore original state
q) Quit
```

### 查看状态

先选择 **1) View current status**。状态检查会读取当前安装的 `Codex.app`，显示检测到的版本和 build，告诉你兼容性是否为 `supported`，并列出 app bundle 里找到的 patch 目标。

每次 Codex 更新后都先跑一次查看状态。如果兼容性不是 `supported`，不要在这个版本上开补丁。

### 开启功能

当状态显示当前 build 已支持时，选择 **2) Enable custom API features**。这会开启当前支持的能力集合：

- Settings 里的 Fast 控制项
- composer 里的 `/fast` slash command
- composer 里的 Speed 菜单
- 模型列表里的 GPT-5.5
- custom API 用户的 Plugins 侧边栏入口

第一次开启时脚本会创建备份，更新 `app.asar`，刷新 Electron ASAR integrity hash，并执行本地 ad-hoc 重签名。脚本完成后重启 `Codex.app`。

### 关闭或恢复

选择 **3) Restore original state** 可以关闭补丁。恢复流程会优先把 `Codex.app` 回滚到备份的原始 vendor bundle，必要时重新签名。

排查问题、测试新的 Codex 更新，或想回到官方原始行为时，都可以先执行恢复。

## 兼容性

本脚本不走官方 API，而是通过匹配前端打包产物的代码特征做补丁，Codex 更新后可能失效。

- 已验证版本：`Codex.app` `26.415.40636`（`build 1799`）
- 已验证版本：`Codex.app` `26.417.41555`（`build 1858`）
- 已验证版本：`Codex.app` `26.422.21637`（`build 2056`）
- **开启动作** 只允许在白名单里的 version/build 上执行
- **查看状态** 和 **恢复** 在任何版本都可用
- GPT-5.5 模型列表补丁只注入 UI catalog 项，并保证它在 Codex 过滤模型查询后仍可见；你的 custom API provider 仍然必须支持 `gpt-5.5`
- Plugins 仅移除 custom API 用户的侧边栏鉴权 gate；插件最终是否可用仍取决于 connector 可用性、插件自身状态以及应用内管理侧限制

每次 Codex 更新后都建议重新跑一次 **查看当前状态**。

## 备份与恢复

第一次开启时会留下两份备份：

- `app.asar1` — 归档级备份（原始 bundle）
- `*.speed-setting.bak` — 文件级回退备份

**恢复** 会优先使用 `app.asar1`，其次 `.bak`，最后尝试按内联规则恢复。Codex 未来的自动更新可能覆盖补丁状态。

> 本地 ad-hoc 重签名能通过 `codesign` 完整性校验，但会替换原本的厂商 notarization。`spctl --assess` 报 `rejected` 是预期现象，验证签名请使用 `codesign --verify --deep --strict /Applications/Codex.app`。

## 故障排查

**脚本一启动就失败** — 确认 `/Applications/Codex.app` 是否存在，再跑一下 `node -v`、`npm -v`、`codesign -h`。

**自动重签名失败（macOS 拒绝写入）** — 手动执行：

```bash
codesign --force --deep --sign - /Applications/Codex.app
```

**找不到目标文件 / 版本不被支持** — 不要继续，也不要手动改 bundle。当前构建可能需要重新适配。

**Plugins 已可见但插件仍无法使用** — 与本脚本无关，请检查 connector 可用性、插件自身状态或管理侧限制。

**GPT-5.5 已可见但请求失败** — UI 项已经存在，但你的 custom API provider 仍需接受 `model: "gpt-5.5"`。

**`Codex.app` 在之前异常脚本运行后无法打开**（残留 `Resources/app` 或错误的 integrity hash）：

1. 删除 `/Applications/Codex.app/Contents/Resources/app`
2. 将 `app.asar1` 改回 `app.asar`
3. 重新打开 `Codex.app`
