#!/bin/bash

set -u

APP_BUNDLE="${CODEXFAST_APP_BUNDLE:-/Applications/Codex.app}"
APP_RESOURCES="${APP_BUNDLE}/Contents/Resources"
APP_DIR="${APP_RESOURCES}/app"
APP_ASAR="${APP_RESOURCES}/app.asar"
APP_ASAR_BACKUP="${APP_RESOURCES}/app.asar1"
ASSETS_DIR="${APP_DIR}/webview/assets"
BACKUP_SUFFIX=".speed-setting.bak"
NPM_BIN=""
APP_STRUCTURE_CHANGED=0

print_line() {
  printf '%s\n' "$1"
}

pause() {
  printf '\n按 Enter 返回菜单...'
  read -r _
}

resolve_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  return 1
}

resolve_npm() {
  if command -v npm >/dev/null 2>&1; then
    command -v npm
    return 0
  fi

  return 1
}

resolve_codesign() {
  if command -v codesign >/dev/null 2>&1; then
    command -v codesign
    return 0
  fi

  return 1
}

resign_app_bundle() {
  local reason="${1:-}"

  if [ -n "${reason}" ]; then
    print_line ""
    print_line "${reason}"
  fi

  print_line "执行本地 ad-hoc 重新签名：${APP_BUNDLE}"

  if ! "${CODESIGN_BIN}" --force --deep --sign - "${APP_BUNDLE}" >/dev/null 2>&1; then
    print_line "重新签名失败。"
    print_line "请恢复原始 app.asar，或重新安装 Codex.app。"
    return 1
  fi

  if ! "${CODESIGN_BIN}" --verify --deep --strict --verbose=2 "${APP_BUNDLE}" >/dev/null 2>&1; then
    print_line "重新签名后的 codesign 校验失败。"
    print_line "请恢复原始 app.asar，或重新安装 Codex.app。"
    return 1
  fi

  print_line "重新签名完成，codesign 校验通过。"
  print_line "提示：本地 ad-hoc 签名会替换原始厂商签名，spctl 可能显示 rejected，这是预期现象。"
  return 0
}

prepare_app_resources() {
  APP_STRUCTURE_CHANGED=0

  if [ -d "${APP_DIR}" ]; then
    if [ -f "${APP_ASAR}" ] && [ ! -f "${APP_ASAR_BACKUP}" ]; then
      (
        cd "${APP_RESOURCES}" || exit 1
        mv ./app.asar ./app.asar1
      ) || {
        print_line "重命名 app.asar 失败。"
        return 1
      }
      APP_STRUCTURE_CHANGED=1
    fi
    return 0
  fi

  if [ -f "${APP_ASAR_BACKUP}" ]; then
    print_line "未找到解压后的目录：${APP_DIR}"
    return 1
  fi

  if [ ! -f "${APP_ASAR}" ]; then
    print_line "未找到 app.asar：${APP_ASAR}"
    return 1
  fi

  if [ -z "${NPM_BIN}" ]; then
    print_line "未找到 npm，无法解压 app.asar。"
    return 1
  fi

  (
    cd "${APP_RESOURCES}" || exit 1
    "${NPM_BIN}" exec --yes --package @electron/asar -- asar e ./app.asar app || exit 1
    mv ./app.asar ./app.asar1
  ) || {
    print_line "解压或重命名 app.asar 失败。"
    return 1
  }

  APP_STRUCTURE_CHANGED=1
  return 0
}

check_requirements() {
  if [ ! -d "${APP_RESOURCES}" ]; then
    print_line "未找到 Codex 资源目录：${APP_RESOURCES}"
    print_line "请确认 Codex.app 安装在 ${APP_BUNDLE}。"
    return 1
  fi

  NODE_BIN="$(resolve_node)" || {
    print_line "未找到外部 Node 运行时。"
    print_line "请先确保命令行里的 node 可用。"
    return 1
  }

  NPM_BIN="$(resolve_npm)" || {
    print_line "未找到 npm。"
    print_line "请先确保命令行里的 npm 可用。"
    return 1
  }

  CODESIGN_BIN="$(resolve_codesign)" || {
    print_line "未找到 codesign。"
    print_line "当前 macOS 环境无法完成本地重新签名。"
    return 1
  }

  if ! prepare_app_resources; then
    return 1
  fi

  if [ "${APP_STRUCTURE_CHANGED}" -eq 1 ]; then
    if ! resign_app_bundle "检测到应用资源结构发生变化，先执行一次本地重签名。"; then
      return 1
    fi
  fi

  if [ ! -d "${ASSETS_DIR}" ]; then
    print_line "未找到资源目录：${ASSETS_DIR}"
    return 1
  fi

  return 0
}

run_embedded_tool() {
  local action="$1"

  print_line ""
  print_line "执行：${action}"
  print_line "资源目录：${APP_RESOURCES}"
  print_line "模式：单文件自包含"
  print_line ""

  "${NODE_BIN}" - "${action}" "${ASSETS_DIR}" "${BACKUP_SUFFIX}" <<'NODE'
"use strict";

const fs = require("fs");
const path = require("path");

const [, , command, assetsDirArg, backupSuffix] = process.argv;
const assetsDir = path.resolve(assetsDirArg);
const SPEED_LABEL_NEEDLE = "settings.agent.speed.label";
const GUARDED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=_e\(\),(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ce\(\);)if\(!\1\)return null;/;
const PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=!0,(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ce\(\);)let /;
const NORMALIZED_PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=_e\(\),(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ce\(\);)let /;

function walkJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }

  return results;
}

function inspectFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  if (!content.includes(SPEED_LABEL_NEEDLE)) {
    return null;
  }

  const guarded = GUARDED_SIGNATURE.test(content);
  const patched = NORMALIZED_PATCHED_SIGNATURE.test(content);
  const legacyPatched = PATCHED_SIGNATURE.test(content);

  if (!guarded && !patched && !legacyPatched) {
    return null;
  }

  return {
    filePath,
    backupPath: `${filePath}${backupSuffix}`,
    content,
    guarded,
    patched,
    legacyPatched,
  };
}

function findTargets(dir) {
  return walkJsFiles(dir).map(inspectFile).filter(Boolean);
}

function describeState(target) {
  if (target.guarded) {
    return "未开启 Speed 设置项";
  }
  if (target.patched || target.legacyPatched) {
    return "已开启 Speed 设置项";
  }
  return "状态未知";
}

function writeBackupIfNeeded(target) {
  if (fs.existsSync(target.backupPath)) {
    return;
  }
  fs.writeFileSync(target.backupPath, target.content, "utf8");
}

function status() {
  const targets = findTargets(assetsDir);
  if (targets.length === 0) {
    console.log(`未找到 Speed 设置项目标文件：${assetsDir}`);
    return 1;
  }

  for (const target of targets) {
    console.log(`当前状态：${describeState(target)}`);
    console.log(`目标文件：${path.relative(process.cwd(), target.filePath)}`);
    console.log(
      `备份文件：${fs.existsSync(target.backupPath) ? path.relative(process.cwd(), target.backupPath) : "不存在"}`,
    );
  }

  return 0;
}

function apply() {
  const targets = findTargets(assetsDir);
  if (targets.length === 0) {
    console.log(`未找到 Speed 设置项目标文件：${assetsDir}`);
    return 1;
  }

  let changed = 0;
  let alreadyPatched = 0;

  for (const target of targets) {
    if (target.guarded) {
      writeBackupIfNeeded(target);
      const next = target.content.replace(GUARDED_SIGNATURE, "$1=_e(),$2let ");
      fs.writeFileSync(target.filePath, next, "utf8");
      console.log(`patched: ${path.relative(process.cwd(), target.filePath)}`);
      changed += 1;
      continue;
    }

    if (target.legacyPatched) {
      const next = target.content.replace(PATCHED_SIGNATURE, "$1=_e(),$2let ");
      fs.writeFileSync(target.filePath, next, "utf8");
      console.log(`normalized: ${path.relative(process.cwd(), target.filePath)}`);
      changed += 1;
      continue;
    }

    if (target.patched) {
      console.log(`already patched: ${path.relative(process.cwd(), target.filePath)}`);
      alreadyPatched += 1;
    }
  }

  console.log(`summary: changed=${changed}, alreadyPatched=${alreadyPatched}`);
  return 0;
}

function restore() {
  const targets = findTargets(assetsDir);
  if (targets.length === 0) {
    console.log(`未找到 Speed 设置项目标文件：${assetsDir}`);
    return 1;
  }

  let restored = 0;

  for (const target of targets) {
    if (fs.existsSync(target.backupPath)) {
      fs.writeFileSync(target.filePath, fs.readFileSync(target.backupPath, "utf8"), "utf8");
      console.log(`restored backup: ${path.relative(process.cwd(), target.filePath)}`);
      restored += 1;
      continue;
    }

    if (target.patched || target.legacyPatched) {
      const next = target.content.replace(
        target.patched ? NORMALIZED_PATCHED_SIGNATURE : PATCHED_SIGNATURE,
        "$1=_e(),$2if(!$1)return null;let ",
      );
      fs.writeFileSync(target.filePath, next, "utf8");
      console.log(`restored inline: ${path.relative(process.cwd(), target.filePath)}`);
      restored += 1;
    }
  }

  if (restored === 0) {
    console.log(`没有可恢复的备份或已修改目标`);
    return 1;
  }

  console.log(`summary: restored=${restored}`);
  return 0;
}

let exitCode = 1;
switch (command) {
  case "status":
    exitCode = status();
    break;
  case "apply":
    exitCode = apply();
    break;
  case "restore":
    exitCode = restore();
    break;
  default:
    console.log(`未知命令：${command}`);
    exitCode = 1;
}

process.exit(exitCode);
NODE

  local exit_code=$?

  if [ "${exit_code}" -eq 0 ]; then
    case "${action}" in
      apply|restore)
        if ! resign_app_bundle "已修改 Codex.app 资源，正在重新签名。"; then
          exit_code=1
        fi
        ;;
    esac
  fi

  print_line ""
  print_line "退出码：${exit_code}"
  return "${exit_code}"
}

show_menu() {
  clear
  print_line "Codexfast"
  print_line "固定目标：${APP_RESOURCES}"
  print_line "说明：这个 .sh 是单文件自包含，可单独分享。"
  print_line "修改资源后会自动执行本地 ad-hoc 重签名。"
  print_line ""
  print_line "1) 查看当前状态"
  print_line "2) 开启 Speed 设置项"
  print_line "3) 恢复原始状态"
  print_line "q) 退出"
  print_line ""
  printf '请选择：'
}

main() {
  if ! check_requirements; then
    print_line ""
    printf '按 Enter 关闭...'
    read -r _
    exit 1
  fi

  while true; do
    show_menu
    read -r choice

    case "${choice}" in
      1)
        run_embedded_tool "status"
        pause
        ;;
      2)
        run_embedded_tool "apply"
        pause
        ;;
      3)
        run_embedded_tool "restore"
        pause
        ;;
      q|Q)
        exit 0
        ;;
      *)
        print_line ""
        print_line "无效选项：${choice}"
        pause
        ;;
    esac
  done
}

main "$@"
