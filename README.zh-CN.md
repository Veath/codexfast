# codexfast

[English README](./README.md)

这个仓库包含一个单文件 macOS 脚本，用于在 `Codex.app` 中显示并切换 Speed 设置项。

这个脚本主要面向使用 custom API 配置的 Codex 用户。

脚本在重建或修改应用资源后，会自动对本地 `Codex.app` 执行重新签名。

脚本文件：

- `codexfast.sh`

## 快速开始

可以直接通过 npm 调用：

```bash
npx codexfast
```

这会直接启动交互菜单。

## 作用

这个脚本会定位 `Codex.app` 的前端资源，检查当前版本是否仍然包含可识别的 Speed 设置项代码，并提供 3 个动作：

- 查看当前状态
- 开启 Speed 设置项
- 恢复原始状态

当脚本改动本地安装应用后，它会把修改后的内容重新打包回 `app.asar`，再自动执行一次本地 ad-hoc 重签名，避免 `Codex.app` 因签名失效而无法启动。

脚本是单文件自包含实现，适合单独分享和直接运行。

## 适用人群

这个脚本主要给使用 custom API 的 Codex 用户使用。

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
- 开启、恢复、以及旧版遗留解包布局迁移这几类动作，后面都会自动执行本地 ad-hoc 重签名
- 这个本地重签会替换当前安装副本原本的厂商签名

菜单项：

- `1) 查看当前状态`
- `2) 开启 Speed 设置项`
- `3) 恢复原始状态`

推荐流程：

1. 先执行 `查看当前状态`
2. 只有在成功识别目标文件时，再执行 `开启 Speed 设置项`

`查看当前状态` 会检查：

- 是否存在 `Codex.app` 资源目录
- 是否能找到 `app.asar`，并通过临时工作区完成检查
- 解包后的归档内容里是否存在目标目录 `app/webview/assets`
- 当前前端 bundle 中是否还能识别出 Speed 设置项的目标代码
- 当前状态是“未开启”还是“已开启”
- 是否已经存在备份文件

如果脚本发现旧版脚本留下的 `Resources/app` 解包布局，它会先把这个目录重新打包回 `app.asar`，删除 `Resources/app`，然后自动重签应用。

如果脚本输出 `Speed setting target file not found`，通常说明当前 Codex 构建已经变化，不应该继续盲目打补丁。

## 版本兼容说明

已经实际检查并验证的版本：

- `Codex.app` version: `26.415.40636`
- build: `1799`

这个版本与脚本兼容，原因是：

- 当前 `app.asar` 内仍然存在 `app/webview/assets`
- Speed 设置项相关文案仍然存在
- 脚本使用的目标正则仍能命中当前 bundle
- 当前命中的目标文件是 `general-settings-BZQqrI-r.js`
- 当前“未开启”状态仍然可以被改写成“已开启”状态

在这个版本上的实际验证结果：

- 能找到目标文件
- 能识别当前状态为未开启
- 模拟替换后，可以把代码从 guarded 状态切换到 patched 状态

这说明脚本对上述版本是兼容的。

## 兼容性边界

这个脚本不是基于官方 API，而是通过匹配前端打包产物中的代码特征做补丁，因此 Codex 更新后可能失效。

建议：

- 每次 Codex 更新后先运行一次 `查看当前状态`
- 只有在脚本仍能识别目标文件时，再执行 `开启 Speed 设置项`
- 如果 bundle 结构、变量名或压缩结果变化，正则可能需要更新

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

如果你之前运行的是会遗留 `Resources/app` 的旧版异常脚本，导致 `Codex.app` 打不开，可以这样恢复：

1. 删除 `/Applications/Codex.app/Contents/Resources/app`
2. 将 `/Applications/Codex.app/Contents/Resources/app.asar1` 改回 `app.asar`
3. 重新打开 `Codex.app`

如果你想检查脚本运行后的本地签名状态，优先使用：

```bash
codesign --verify --deep --strict /Applications/Codex.app
```

不要把 `spctl --assess` 在本地 ad-hoc 重签后的 `rejected` 直接当成失败。对这种本地重签应用来说，这是预期现象，并不等于应用一定无法启动。
