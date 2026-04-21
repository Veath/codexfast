# codexfast

[English README](./README.md)

**一个面向 `Codex.app` 的 macOS patch 脚本，用于在已验证兼容的版本上重新启用被隐藏的 custom API 能力。**

`codexfast` 是一个面向 custom API 用户的单文件 patcher，用来恢复 `Codex.app` 中被隐藏的能力，包括 Settings 里的 Fast 设置项、输入框 `/fast` 命令、`Add files and more / +` 下的 Speed 子菜单，以及 Plugins 入口。

- **Fast 设置项**（Settings 中）
- **`/fast` 输入框命令**
- **Speed 子菜单**（`Add files and more / +` 中）
- **Plugins 入口**（custom API 用户可用）

```bash
npx codexfast
```

已验证兼容：`Codex.app` `26.415.40636`（`build 1799`）和 `26.417.41555`（`build 1858`）。能力定义见 [`docs/feature-scope.md`](./docs/feature-scope.md)。

## 作用

脚本在安装好的 `Codex.app` 上提供三个菜单动作：

1. **查看当前状态** — 检查版本、目标文件，以及当前是否可以安全打补丁
2. **开启 custom API 相关能力** — 恢复上面列出的能力集合
3. **恢复原始状态** — 回退到原始应用 bundle

打补丁流程：解包 `app.asar`，改写前端资源，重新打包，更新 `Info.plist` 中的 `ElectronAsarIntegrity` hash，再做一次本地 ad-hoc 重签名，保持 `Codex.app` 可以正常启动。

## 使用方式

仅支持 macOS。需要：`Codex.app` 安装在 `/Applications`，命令行可用 `node`、`npm` 和系统自带的 `codesign`。

```bash
npx codexfast
```

或在本仓库里直接运行：

```bash
./codexfast.sh
```

先执行 **查看当前状态**，只有在兼容性显示为 `supported` 时再执行开启动作。

## 兼容性

本脚本不走官方 API，而是通过匹配前端打包产物的代码特征做补丁，Codex 更新后可能失效。

- 已验证版本：`Codex.app` `26.415.40636`（`build 1799`）
- 已验证版本：`Codex.app` `26.417.41555`（`build 1858`）
- **开启动作** 只允许在白名单里的 version/build 上执行
- **查看状态** 和 **恢复** 在任何版本都可用
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

**`Codex.app` 在之前异常脚本运行后无法打开**（残留 `Resources/app` 或错误的 integrity hash）：

1. 删除 `/Applications/Codex.app/Contents/Resources/app`
2. 将 `app.asar1` 改回 `app.asar`
3. 重新打开 `Codex.app`
