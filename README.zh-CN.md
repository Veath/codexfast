# codexfast

[English README](./README.md)

**在 macOS 上重新启用 `Codex.app` 里被隐藏的 custom API 能力。**

面向 custom API 用户的单文件 patcher，自动完成版本兼容检查、`app.asar` 重打包和本地 ad-hoc 重签名，不需要手动改应用包。

- **Fast 设置项**（Settings 中）
- **`/fast` 输入框命令**
- **Speed 子菜单**（`Add files and more / +` 中）
- **Plugins 入口**（custom API 用户可用）

```bash
npx codexfast
```

已验证兼容：`Codex.app` `26.415.40636`（`build 1799`）。能力定义见 [`docs/feature-scope.md`](./docs/feature-scope.md)。

## 作用

这个脚本会检查 `Codex.app` 的前端资源，确认当前版本是否仍然包含可识别的 hidden custom API 能力路径，并提供 3 个动作：

- 查看当前状态
- 开启 custom API 相关能力
- 恢复原始状态

在兼容版本上启用后，`codexfast` 会恢复当前支持的能力集合；具体定义见 [`docs/feature-scope.md`](./docs/feature-scope.md)。

当脚本改动本地安装应用后，它会把修改后的内容重新打包回 `app.asar`，同步更新 `Info.plist` 里的 Electron ASAR header integrity hash，再自动执行一次本地 ad-hoc 重签名，尽量保证 `Codex.app` 仍然可以正常启动。

脚本是单文件自包含实现，适合单独分享、审阅和直接运行。

## 适用人群

这个项目主要给使用 custom API 的 Codex 用户使用，尤其适合那些希望恢复桌面端隐藏能力入口的人。

它并不是主要面向只使用默认官方托管配置、没有自定义 API 相关需求的用户。

## 平台支持

当前支持情况：

- macOS：支持
- Windows：暂不支持

这个脚本当前针对的是 macOS 下 `/Applications/Codex.app/Contents/Resources` 这套应用目录结构，并假设本地使用 Bash 方式执行。

所以 Windows 用户目前不能直接使用这一版脚本。

## 使用方式

前置条件：

- `Codex.app` 安装在 `/Applications/Codex.app`
- 命令行可用 `node`
- 命令行可用 `npm`
- macOS 自带 `codesign`

通过 npm 调用：

```bash
npx codexfast
```

这也是最推荐的大多数用户入口。

在本仓库里本地运行：

```bash
chmod +x ./codexfast.sh
./codexfast.sh
```

请在终端里执行。

如果你是直接使用这个仓库，本地脚本文件就是最终执行入口。

## 自检模式

脚本已经内置自检流程，不需要手动改文件。

需要注意：

- 脚本在检查或打补丁时，会使用临时工作目录解包 `app.asar`
- 它会把改动重新打包回 `app.asar`，不会再把 `Resources/app` 目录长期留在应用里
- 它还会同步更新 `Info.plist` 中的 `ElectronAsarIntegrity`，使其匹配重建后 `app.asar` 的 header hash
- 开启、恢复、以及旧版遗留解包布局迁移这几类动作，后面都会自动执行本地 ad-hoc 重签名
- 这个本地重签会替换当前安装副本原本的厂商签名

菜单项：

- `1) 查看当前状态`
- `2) 开启 custom API 相关能力`
- `3) 恢复原始状态`

推荐流程：

1. 先执行 `查看当前状态`
2. 只有在成功识别目标文件、并且版本显示为 `supported` 时，再执行 `开启 custom API 相关能力`

`查看当前状态` 会检查：

- 是否能从 `Info.plist` 读取当前 `Codex.app` 的版本号和 build 号
- 当前版本/build 组合是否在脚本内置的已验证兼容白名单里
- 是否存在 `Codex.app` 资源目录
- 是否能找到 `app.asar`，并通过临时工作区完成检查
- 解包后的归档内容里是否存在目标目录 `app/webview/assets`
- 当前前端 bundle 中是否还能识别出这些隐藏能力对应的目标代码
- 当前状态是“未开启”还是“已开启”
- 是否已经存在备份文件

如果脚本发现旧版脚本留下的 `Resources/app` 解包布局，它会先把这个目录重新打包回 `app.asar`，删除 `Resources/app`，然后自动重签应用。

如果脚本输出 `Feature target file not found`，通常说明当前 Codex 构建已经变化，不应该继续盲目打补丁。

如果脚本输出 `Compatibility: unsupported`，那么 `开启 custom API 相关能力` 会被故意拦截。这是一个严格的安全门禁，用来避免对未验证版本直接打补丁。

## 版本兼容说明

已经实际检查并验证的版本：

- `Codex.app` version: `26.415.40636`
- build: `1799`

这个版本与脚本兼容，原因是：

- 当前 `app.asar` 内仍然存在 `app/webview/assets`
- Fast 和 Plugins 相关文案仍然存在
- 脚本使用的目标正则仍能命中当前 bundle
- 当前这些 guarded 状态仍然可以被改写成 enabled 状态

在这个版本上的实际验证结果：

- 能找到 Settings 里的 Fast 目标
- 能找到 `/fast` 目标
- 能找到 `Add files and more / +` 里的 `Speed` 菜单目标
- 能找到 Plugins 侧边栏 gate 目标
- 模拟替换后，可以把这些代码从 guarded 状态切换到 patched 状态

这说明脚本对上述版本是兼容的。

## 兼容性边界

这个脚本不是基于官方 API，而是通过匹配前端打包产物中的代码特征做补丁，因此 Codex 更新后可能失效。

建议：

- 每次 Codex 更新后先运行一次 `查看当前状态`
- 只有在脚本仍能识别目标文件、并且显示 `Compatibility: supported` 时，再执行 `开启 custom API 相关能力`
- 如果 bundle 结构、变量名或压缩结果变化，正则可能需要更新

对 Plugins 来说，这个脚本做的是移除 custom API 用户的侧边栏鉴权 gate。插件最终是否真的可安装、可使用，仍然可能取决于连接器可用性、插件自身状态、或者应用内部的管理侧限制。

兼容策略：

- 脚本会从 `Codex.app/Contents/Info.plist` 读取 `CFBundleShortVersionString` 和 `CFBundleVersion`
- 只有命中脚本内显式白名单的版本/build 组合，才允许执行 `开启 custom API 相关能力`
- 即使当前版本不受支持，`查看当前状态` 和 `恢复原始状态` 仍然可以使用

## 备份与恢复

首次修改时，脚本会创建同名文件级备份，后缀为：

```text
.speed-setting.bak
```

恢复逻辑会优先使用归档级备份 `app.asar1`；如果没有归档级备份，则回退到文件级 `.speed-setting.bak` 备份；如果两种备份都没有，但检测到已修改状态，也会尝试按内联规则恢复。

无论是开启还是恢复，脚本都会保持应用处于 `app.asar` 打包布局，并在动作完成后自动重新签名应用。

## 注意事项

- 首次执行开启动作时，脚本会创建 `app.asar1`，作为原始应用归档级备份
- 当脚本需要检查或打补丁时，它会先在临时目录中解包 `app.asar`，再把结果重新打包回 `app.asar`
- 在重建或修改 `Codex.app` 内文件后，脚本会执行 `codesign --force --deep --sign - /Applications/Codex.app`
- 这个脚本会直接修改本地已安装应用的资源文件
- 未来 Codex 自动更新后，补丁状态可能会被覆盖
- 本地 ad-hoc 重签足以通过 `codesign` 完整性校验，但不会保留原本官方 notarized 厂商签名

## 故障排查

如果脚本一启动就失败，先检查：

- `/Applications/Codex.app` 是否存在
- `node -v`
- `npm -v`
- `codesign -h`

如果自动重签步骤因为 macOS 拒绝写入而失败，脚本现在会直接打印这条可手动执行的回退命令：

```bash
codesign --force --deep --sign - /Applications/Codex.app
```

如果脚本提示找不到目标文件：

- 不要继续执行开启动作
- 说明当前 Codex 构建很可能需要重新适配

如果脚本提示当前版本不受支持：

- 不要手动强行修改应用 bundle
- 只有在完成新版本全链路验证后，再更新脚本里的兼容版本列表

如果 Plugins 已经显示出来，但某个插件仍然不能安装或使用：

- 检查你当前环境里的 connector / app integration 是否可用
- 检查该插件是否被 admin 禁用，或者上游本身不可用
- 不要把所有插件问题都归因到 auth-method gate

如果你之前运行的是会遗留 `Resources/app` 或错误写入 `ElectronAsarIntegrity` 的旧版异常脚本，导致 `Codex.app` 打不开，可以这样恢复：

1. 删除 `/Applications/Codex.app/Contents/Resources/app`
2. 将 `/Applications/Codex.app/Contents/Resources/app.asar1` 改回 `app.asar`
3. 重新打开 `Codex.app`

如果你想检查脚本运行后的本地签名状态，优先使用：

```bash
codesign --verify --deep --strict /Applications/Codex.app
```

不要把 `spctl --assess` 在本地 ad-hoc 重签后的 `rejected` 直接当成失败。对这种本地重签应用来说，这是预期现象，并不等于应用一定无法启动。
