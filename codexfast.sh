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
  printf '\nPress Enter to return to the menu...'
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

  print_line "Running local ad-hoc re-sign: ${APP_BUNDLE}"

  if ! "${CODESIGN_BIN}" --force --deep --sign - "${APP_BUNDLE}" >/dev/null 2>&1; then
    print_line "Re-sign failed."
    print_line "Restore the original app.asar or reinstall Codex.app."
    return 1
  fi

  if ! "${CODESIGN_BIN}" --verify --deep --strict --verbose=2 "${APP_BUNDLE}" >/dev/null 2>&1; then
    print_line "codesign verification failed after re-signing."
    print_line "Restore the original app.asar or reinstall Codex.app."
    return 1
  fi

  print_line "Re-sign complete. codesign verification passed."
  print_line "Note: local ad-hoc signing replaces the original vendor signature. spctl may report rejected, which is expected."
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
        print_line "Failed to rename app.asar."
        return 1
      }
      APP_STRUCTURE_CHANGED=1
    fi
    return 0
  fi

  if [ -f "${APP_ASAR_BACKUP}" ]; then
    print_line "Unpacked directory not found: ${APP_DIR}"
    return 1
  fi

  if [ ! -f "${APP_ASAR}" ]; then
    print_line "app.asar not found: ${APP_ASAR}"
    return 1
  fi

  if [ -z "${NPM_BIN}" ]; then
    print_line "npm not found. Cannot unpack app.asar."
    return 1
  fi

  (
    cd "${APP_RESOURCES}" || exit 1
    "${NPM_BIN}" exec --yes --package @electron/asar -- asar e ./app.asar app || exit 1
    mv ./app.asar ./app.asar1
  ) || {
    print_line "Failed to unpack or rename app.asar."
    return 1
  }

  APP_STRUCTURE_CHANGED=1
  return 0
}

check_requirements() {
  if [ ! -d "${APP_RESOURCES}" ]; then
    print_line "Codex resources directory not found: ${APP_RESOURCES}"
    print_line "Make sure Codex.app is installed at ${APP_BUNDLE}."
    return 1
  fi

  NODE_BIN="$(resolve_node)" || {
    print_line "External Node runtime not found."
    print_line "Make sure node is available in your shell."
    return 1
  }

  NPM_BIN="$(resolve_npm)" || {
    print_line "npm not found."
    print_line "Make sure npm is available in your shell."
    return 1
  }

  CODESIGN_BIN="$(resolve_codesign)" || {
    print_line "codesign not found."
    print_line "This macOS environment cannot perform local re-signing."
    return 1
  }

  if ! prepare_app_resources; then
    return 1
  fi

  if [ "${APP_STRUCTURE_CHANGED}" -eq 1 ]; then
    if ! resign_app_bundle "App bundle resources changed. Running an initial local re-sign first."; then
      return 1
    fi
  fi

  if [ ! -d "${ASSETS_DIR}" ]; then
    print_line "Assets directory not found: ${ASSETS_DIR}"
    return 1
  fi

  return 0
}

run_embedded_tool() {
  local action="$1"

  print_line ""
  print_line "Action: ${action}"
  print_line "Resources: ${APP_RESOURCES}"
  print_line "Mode: self-contained single file"
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
    return "Speed setting disabled";
  }
  if (target.patched || target.legacyPatched) {
    return "Speed setting enabled";
  }
  return "Unknown state";
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
    console.log(`Speed setting target file not found: ${assetsDir}`);
    return 1;
  }

  for (const target of targets) {
    console.log(`Current state: ${describeState(target)}`);
    console.log(`Target file: ${path.relative(process.cwd(), target.filePath)}`);
    console.log(
      `Backup file: ${fs.existsSync(target.backupPath) ? path.relative(process.cwd(), target.backupPath) : "missing"}`,
    );
  }

  return 0;
}

function apply() {
  const targets = findTargets(assetsDir);
  if (targets.length === 0) {
    console.log(`Speed setting target file not found: ${assetsDir}`);
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
    console.log(`Speed setting target file not found: ${assetsDir}`);
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
    console.log(`No backup or modified target is available to restore.`);
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
    console.log(`Unknown command: ${command}`);
    exitCode = 1;
}

process.exit(exitCode);
NODE

  local exit_code=$?

  if [ "${exit_code}" -eq 0 ]; then
    case "${action}" in
      apply|restore)
        if ! resign_app_bundle "Codex.app resources were modified. Re-signing now."; then
          exit_code=1
        fi
        ;;
    esac
  fi

  print_line ""
  print_line "Exit code: ${exit_code}"
  return "${exit_code}"
}

show_menu() {
  clear
  print_line "Codexfast"
  print_line "Fixed target: ${APP_RESOURCES}"
  print_line "Note: this .sh file is fully self-contained and can be shared on its own."
  print_line "A local ad-hoc re-sign runs automatically after resource changes."
  print_line ""
  print_line "1) View current status"
  print_line "2) Enable Speed setting"
  print_line "3) Restore original state"
  print_line "q) Quit"
  print_line ""
  printf 'Choose an option: '
}

main() {
  if ! check_requirements; then
    print_line ""
    printf 'Press Enter to close...'
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
        print_line "Invalid option: ${choice}"
        pause
        ;;
    esac
  done
}

main "$@"
