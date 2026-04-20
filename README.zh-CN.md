# Codex App Speed Setting

[English README](./README.md)

这个仓库包含一个单文件 macOS 脚本，用于在 `Codex.app` 中显示并切换 Speed 设置项。

这个脚本主要面向使用 custom API 配置的 Codex 用户。

脚本文件：

- `codex-speed-setting.command`

## 作用

这个脚本会定位 `Codex.app` 的前端资源，检查当前版本是否仍然包含可识别的 Speed 设置项代码，并提供 3 个动作：

- 查看当前状态
- 开启 Speed 设置项
- 恢复原始状态

脚本是单文件自包含实现，适合单独分享和直接运行。

## 适用人群

这个脚本主要给使用 custom API 的 Codex 用户使用。

它并不是主要面向只使用默认官方托管配置、没有自定义 API 相关需求的用户。

## 使用方式

前置条件：

- `Codex.app` 安装在 `/Applications/Codex.app`
- 命令行可用 `node`
- 命令行可用 `npx`

运行方式：

```bash
chmod +x ./codex-speed-setting.command
./codex-speed-setting.command
```

也可以直接在 Finder 中双击 `.command` 文件启动。

## 自检模式

脚本已经内置自检流程，不需要手动改文件。

菜单项：

- `1) 查看当前状态`
- `2) 开启 Speed 设置项`
- `3) 恢复原始状态`

推荐流程：

1. 先执行 `查看当前状态`
2. 只有在成功识别目标文件时，再执行 `开启 Speed 设置项`

`查看当前状态` 会检查：

- 是否存在 `Codex.app` 资源目录
- 是否能找到或解包 `app.asar`
- 是否存在目标目录 `app/webview/assets`
- 当前前端 bundle 中是否还能识别出 Speed 设置项的目标代码
- 当前状态是“未开启”还是“已开启”
- 是否已经存在备份文件

如果脚本输出 `未找到 Speed 设置项目标文件`，通常说明当前 Codex 构建已经变化，不应该继续盲目打补丁。

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

首次修改时，脚本会创建同名备份文件，后缀为：

```text
.speed-setting.bak
```

恢复逻辑会优先使用备份文件；如果没有备份，但检测到已修改状态，也会尝试按内联规则恢复。

## 注意事项

- 首次运行时，如果只有 `app.asar` 而没有解包后的 `app/` 目录，脚本会尝试解包，并把 `app.asar` 重命名为 `app.asar1`
- 这个脚本会直接修改本地已安装应用的资源文件
- 未来 Codex 自动更新后，补丁状态可能会被覆盖

## 故障排查

如果脚本一启动就失败，先检查：

- `/Applications/Codex.app` 是否存在
- `node -v`
- `npx -v`

如果脚本提示找不到目标文件：

- 不要继续执行开启动作
- 说明当前 Codex 构建很可能需要重新适配
