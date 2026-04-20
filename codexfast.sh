#!/bin/bash

set -u

APP_BUNDLE="${CODEXFAST_APP_BUNDLE:-/Applications/Codex.app}"
APP_RESOURCES="${APP_BUNDLE}/Contents/Resources"
APP_DIR="${APP_RESOURCES}/app"
APP_ASAR="${APP_RESOURCES}/app.asar"
APP_ASAR_BACKUP="${APP_RESOURCES}/app.asar1"
APP_INFO_PLIST="${APP_BUNDLE}/Contents/Info.plist"
BACKUP_SUFFIX=".speed-setting.bak"
SUPPORTED_APP_VERSION_KEYS="26.415.40636+1799"
NPM_BIN=""
TEMP_ROOT=""
TEMP_APP_DIR=""
TEMP_ASSETS_DIR=""
APP_VERSION="unknown"
APP_BUILD="unknown"
APP_VERSION_KEY="unknown"
APP_COMPATIBILITY="unsupported"
APP_VERSION_SUPPORTED=0

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

resolve_plistbuddy() {
  if [ -x /usr/libexec/PlistBuddy ]; then
    printf '%s\n' /usr/libexec/PlistBuddy
    return 0
  fi

  return 1
}

print_manual_resign_guidance() {
  print_line "If the failure was caused by write permissions, run this command manually in Terminal:"
  print_line "codesign --force --deep --sign - ${APP_BUNDLE}"
}

read_bundle_plist_value() {
  local key="$1"

  "${PLIST_BUDDY_BIN}" -c "Print :${key}" "${APP_INFO_PLIST}" 2>/dev/null
}

load_app_compatibility_metadata() {
  local detected_version=""
  local detected_build=""

  APP_VERSION="unknown"
  APP_BUILD="unknown"
  APP_VERSION_KEY="unknown"
  APP_COMPATIBILITY="unsupported"
  APP_VERSION_SUPPORTED=0

  if [ ! -f "${APP_INFO_PLIST}" ]; then
    return 0
  fi

  detected_version="$(read_bundle_plist_value "CFBundleShortVersionString")" || detected_version=""
  detected_build="$(read_bundle_plist_value "CFBundleVersion")" || detected_build=""

  if [ -n "${detected_version}" ]; then
    APP_VERSION="${detected_version}"
  fi

  if [ -n "${detected_build}" ]; then
    APP_BUILD="${detected_build}"
  fi

  if [ -n "${detected_version}" ] && [ -n "${detected_build}" ]; then
    APP_VERSION_KEY="${detected_version}+${detected_build}"
  fi

  case " ${SUPPORTED_APP_VERSION_KEYS} " in
    *" ${APP_VERSION_KEY} "*)
      APP_COMPATIBILITY="supported"
      APP_VERSION_SUPPORTED=1
      ;;
  esac
}

cleanup_temp_workspace() {
  if [ -n "${TEMP_ROOT}" ] && [ -d "${TEMP_ROOT}" ]; then
    rm -rf "${TEMP_ROOT}"
  fi

  TEMP_ROOT=""
  TEMP_APP_DIR=""
  TEMP_ASSETS_DIR=""
}

trap cleanup_temp_workspace EXIT

create_temp_workspace() {
  cleanup_temp_workspace

  TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/codexfast.XXXXXX")" || {
    print_line "Failed to create a temporary workspace."
    return 1
  }

  TEMP_APP_DIR="${TEMP_ROOT}/app"
  TEMP_ASSETS_DIR="${TEMP_APP_DIR}/webview/assets"
  return 0
}

run_asar() {
  "${NPM_BIN}" exec --yes --package @electron/asar -- asar "$@"
}

read_asar_integrity_hash() {
  "${PLIST_BUDDY_BIN}" -c "Print :ElectronAsarIntegrity:Resources/app.asar:hash" "${APP_INFO_PLIST}" 2>/dev/null
}

calculate_asar_header_hash() {
  "${NODE_BIN}" - "${APP_ASAR}" <<'NODE'
"use strict";

const crypto = require("crypto");
const fs = require("fs");

const [, , asarPath] = process.argv;
const fd = fs.openSync(asarPath, "r");

try {
  const sizeBuffer = Buffer.alloc(8);
  if (fs.readSync(fd, sizeBuffer, 0, sizeBuffer.length, 0) !== sizeBuffer.length) {
    throw new Error("Unable to read ASAR header size.");
  }

  const headerBufferSize = sizeBuffer.readUInt32LE(4);
  const headerBuffer = Buffer.alloc(headerBufferSize);
  if (fs.readSync(fd, headerBuffer, 0, headerBuffer.length, 8) !== headerBuffer.length) {
    throw new Error("Unable to read ASAR header.");
  }

  const headerStringSize = headerBuffer.readUInt32LE(4);
  const headerStart = 8;
  const headerEnd = headerStart + headerStringSize;
  if (headerEnd > headerBuffer.length) {
    throw new Error("Invalid ASAR header length.");
  }

  const headerString = headerBuffer.subarray(headerStart, headerEnd).toString("utf8");
  process.stdout.write(crypto.createHash("sha256").update(headerString).digest("hex"));
} finally {
  fs.closeSync(fd);
}
NODE
}

update_asar_integrity_metadata() {
  local current_hash=""

  if [ ! -f "${APP_INFO_PLIST}" ]; then
    print_line "Info.plist not found: ${APP_INFO_PLIST}"
    return 1
  fi

  current_hash="$(calculate_asar_header_hash)" || {
    print_line "Failed to calculate the Electron ASAR header hash for app.asar."
    return 1
  }
  if [ -z "${current_hash}" ]; then
    print_line "Failed to calculate the Electron ASAR header hash for app.asar."
    return 1
  fi

  if ! "${PLIST_BUDDY_BIN}" -c "Set :ElectronAsarIntegrity:Resources/app.asar:algorithm SHA256" "${APP_INFO_PLIST}" >/dev/null 2>&1; then
    print_line "Failed to update ElectronAsarIntegrity algorithm in Info.plist."
    return 1
  fi

  if ! "${PLIST_BUDDY_BIN}" -c "Set :ElectronAsarIntegrity:Resources/app.asar:hash ${current_hash}" "${APP_INFO_PLIST}" >/dev/null 2>&1; then
    print_line "Failed to update ElectronAsarIntegrity hash in Info.plist."
    return 1
  fi

  if [ "$(read_asar_integrity_hash)" != "${current_hash}" ]; then
    print_line "ElectronAsarIntegrity hash verification failed after updating Info.plist."
    return 1
  fi

  return 0
}

ensure_archive_backup() {
  if [ -f "${APP_ASAR_BACKUP}" ]; then
    return 0
  fi

  if ! cp "${APP_ASAR}" "${APP_ASAR_BACKUP}"; then
    print_line "Failed to create the app.asar backup archive."
    return 1
  fi

  return 0
}

unpack_app_asar_to_temp() {
  if [ ! -f "${APP_ASAR}" ]; then
    print_line "app.asar not found: ${APP_ASAR}"
    return 1
  fi

  if ! create_temp_workspace; then
    return 1
  fi

  if ! run_asar e "${APP_ASAR}" "${TEMP_APP_DIR}"; then
    print_line "Failed to unpack app.asar into the temporary workspace."
    cleanup_temp_workspace
    return 1
  fi

  if [ ! -d "${TEMP_ASSETS_DIR}" ]; then
    print_line "Assets directory not found in the temporary workspace: ${TEMP_ASSETS_DIR}"
    cleanup_temp_workspace
    return 1
  fi

  return 0
}

pack_temp_app_to_asar() {
  local packed_archive="${TEMP_ROOT}/app.asar"

  if ! run_asar p "${TEMP_APP_DIR}" "${packed_archive}"; then
    print_line "Failed to repack the temporary app directory into app.asar."
    return 1
  fi

  if ! mv "${packed_archive}" "${APP_ASAR}"; then
    print_line "Failed to replace the installed app.asar."
    return 1
  fi

  return 0
}

migrate_legacy_unpacked_layout() {
  if [ ! -d "${APP_DIR}" ]; then
    return 0
  fi

  print_line ""
  print_line "Detected the legacy unpacked app layout. Converting it back to app.asar."

  if [ -f "${APP_ASAR}" ] && [ ! -f "${APP_ASAR_BACKUP}" ]; then
    if ! cp "${APP_ASAR}" "${APP_ASAR_BACKUP}"; then
      print_line "Failed to preserve the existing app.asar before migration."
      return 1
    fi
  fi

  if ! create_temp_workspace; then
    return 1
  fi

  TEMP_APP_DIR="${APP_DIR}"
  TEMP_ASSETS_DIR="${TEMP_APP_DIR}/webview/assets"

  if ! pack_temp_app_to_asar; then
    cleanup_temp_workspace
    return 1
  fi

  if ! rm -rf "${APP_DIR}"; then
    print_line "Failed to remove the legacy unpacked app directory."
    cleanup_temp_workspace
    return 1
  fi

  cleanup_temp_workspace

  if ! update_asar_integrity_metadata; then
    return 1
  fi

  if ! resign_app_bundle "Legacy unpacked layout converted. Re-signing the app bundle."; then
    return 1
  fi

  return 0
}

restore_from_archive_backup() {
  print_line ""
  print_line "Restoring the original app.asar from the archive backup."

  if ! cp "${APP_ASAR_BACKUP}" "${APP_ASAR}"; then
    print_line "Failed to restore app.asar from app.asar1."
    return 1
  fi

  if ! update_asar_integrity_metadata; then
    return 1
  fi

  if ! resign_app_bundle "Original archive restored. Re-signing the app bundle."; then
    return 1
  fi

  print_line ""
  print_line "Exit code: 0"
  return 0
}

resign_app_bundle() {
  local reason="${1:-}"
  local codesign_output=""

  if [ -n "${reason}" ]; then
    print_line ""
    print_line "${reason}"
  fi

  print_line "Running local ad-hoc re-sign: ${APP_BUNDLE}"

  if ! codesign_output="$("${CODESIGN_BIN}" --force --deep --sign - "${APP_BUNDLE}" 2>&1)"; then
    print_line "Re-sign failed."
    if [ -n "${codesign_output}" ]; then
      print_line "${codesign_output}"
    fi
    print_manual_resign_guidance
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

  PLIST_BUDDY_BIN="$(resolve_plistbuddy)" || {
    print_line "PlistBuddy not found."
    print_line "This macOS environment cannot update ElectronAsarIntegrity in Info.plist."
    return 1
  }

  if ! migrate_legacy_unpacked_layout; then
    return 1
  fi

  if [ ! -f "${APP_ASAR}" ]; then
    print_line "app.asar not found: ${APP_ASAR}"
    return 1
  fi

  load_app_compatibility_metadata

  return 0
}

run_embedded_tool() {
  local action="$1"
  local exit_code=1

  print_line ""
  print_line "Action: ${action}"
  print_line "Resources: ${APP_RESOURCES}"
  print_line "Detected version: ${APP_VERSION}"
  print_line "Detected build: ${APP_BUILD}"
  print_line "Compatibility: ${APP_COMPATIBILITY}"
  print_line "Mode: self-contained single file"
  print_line ""

  if [ "${action}" = "apply" ] && [ "${APP_VERSION_SUPPORTED}" -ne 1 ]; then
    print_line "Enable custom API features is blocked for this Codex.app version."
    print_line "This script only allows apply on verified compatible builds."
    print_line "Supported versions: ${SUPPORTED_APP_VERSION_KEYS}"
    print_line ""
    print_line "Exit code: 1"
    return 1
  fi

  if [ "${action}" = "restore" ] && [ -f "${APP_ASAR_BACKUP}" ]; then
    restore_from_archive_backup
    return $?
  fi

  if ! unpack_app_asar_to_temp; then
    return 1
  fi

  "${NODE_BIN}" - "${action}" "${TEMP_ASSETS_DIR}" "${BACKUP_SUFFIX}" <<'NODE'
"use strict";

const fs = require("fs");
const path = require("path");

const [, , command, assetsDirArg, backupSuffix] = process.argv;
const assetsDir = path.resolve(assetsDirArg);
const SPEED_LABEL_NEEDLE = "settings.agent.speed.label";
const SPEED_SLASH_COMMAND_NEEDLE = "composer.speedSlashCommand.title";
const ADD_CONTEXT_SPEED_NEEDLE = "composer.addContext.speed.option.fast.description";
const PLUGINS_SIDEBAR_NEEDLE = "sidebarElectron.pluginsDisabledTooltip";
const GUARDED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=_e\(\),(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ce\(\);)if\(!\1\)return null;/;
const PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=!0,(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ce\(\);)let /;
const NORMALIZED_PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=_e\(\),(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ce\(\);)let /;
const SLASH_COMMAND_GUARDED_SIGNATURE =
  /(id:`speed`,title:[^,]+,description:[^,]+,requiresEmptyComposer:!1,enabled:)([A-Za-z_$][\w$]*)(,Icon:[^,]+,onSelect:[^,]+,dependencies:[A-Za-z_$][\w$]*})/;
const SLASH_COMMAND_PATCHED_SIGNATURE =
  /(id:`speed`,title:[^,]+,description:[^,]+,requiresEmptyComposer:!1,enabled:)!0(,Icon:[^,]+,onSelect:[^,]+,dependencies:[A-Za-z_$][\w$]*})/;
const ADD_CONTEXT_SPEED_GUARDED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=Cr\(\),(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ir\([^)]+\)[;,])/;
const ADD_CONTEXT_SPEED_PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=!0,(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ir\([^)]+\)[;,])/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE =
  /(cf\(`533078438`\),)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)===`apikey`,/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE =
  /(cf\(`533078438`\),)([A-Za-z_$][\w$]*)=!1,/;

const TARGET_SPECS = [
  {
    id: "speed-setting",
    label: "Speed setting",
    needle: SPEED_LABEL_NEEDLE,
    guardedSignature: GUARDED_SIGNATURE,
    patchedSignature: NORMALIZED_PATCHED_SIGNATURE,
    legacyPatchedSignature: PATCHED_SIGNATURE,
    applyReplacement: "$1=_e(),$2",
    normalizeReplacement: "$1=_e(),$2let ",
    restoreReplacement: "$1=_e(),$2if(!$1)return null;let ",
  },
  {
    id: "fast-slash-command",
    label: "Fast slash command",
    needle: SPEED_SLASH_COMMAND_NEEDLE,
    guardedSignature: SLASH_COMMAND_GUARDED_SIGNATURE,
    patchedSignature: SLASH_COMMAND_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1!0$3",
  },
  {
    id: "add-context-speed-menu",
    label: "Add-context Speed menu",
    needle: ADD_CONTEXT_SPEED_NEEDLE,
    guardedSignature: ADD_CONTEXT_SPEED_GUARDED_SIGNATURE,
    patchedSignature: ADD_CONTEXT_SPEED_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1=!0,$2",
    restoreReplacement: "$1=Cr(),$2",
  },
  {
    id: "plugins-access",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1$2=!1,",
    restoreReplacement: "$1$2=$3===`apikey`,",
  },
];

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

function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) {
    return null;
  }

  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;

  if (!guarded && !patched && !legacyPatched) {
    return null;
  }

  return {
    spec,
    guarded,
    patched,
    legacyPatched,
  };
}

function inspectFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const matches = TARGET_SPECS.map((spec) => inspectSpec(content, spec)).filter(Boolean);

  if (matches.length === 0) {
    return null;
  }

  return {
    filePath,
    backupPath: `${filePath}${backupSuffix}`,
    content,
    matches,
  };
}

function findTargets(dir) {
  return walkJsFiles(dir).map(inspectFile).filter(Boolean);
}

function describeState(match) {
  if (match.guarded) {
    return `${match.spec.label} disabled`;
  }
  if (match.patched || match.legacyPatched) {
    return `${match.spec.label} enabled`;
  }
  return "Unknown state";
}

function writeBackupIfNeeded(fileTarget) {
  if (fs.existsSync(fileTarget.backupPath)) {
    return;
  }
  fs.writeFileSync(fileTarget.backupPath, fileTarget.content, "utf8");
}

function resolveSlashCommandEnabledVariable(content) {
  const match = content.match(/function OG\(\)\{let [^;]*?,([A-Za-z_$][\w$]*)=Lf\(\),/);
  return match?.[1] ?? "n";
}

function status() {
  const targets = findTargets(assetsDir);
  if (targets.length === 0) {
    console.log(`Feature target file not found: ${assetsDir}`);
    return 1;
  }

  for (const target of targets) {
    for (const match of target.matches) {
      console.log(`Current state: ${describeState(match)}`);
      console.log(`Target: ${match.spec.label}`);
      console.log(`Target file: ${path.relative(process.cwd(), target.filePath)}`);
      console.log(
        `Backup file: ${fs.existsSync(target.backupPath) ? path.relative(process.cwd(), target.backupPath) : "missing"}`,
      );
    }
  }

  return 0;
}

function apply() {
  const targets = findTargets(assetsDir);
  if (targets.length === 0) {
    console.log(`Feature target file not found: ${assetsDir}`);
    return 1;
  }

  let changed = 0;
  let alreadyPatched = 0;

  for (const target of targets) {
    let next = target.content;
    let updated = false;

    for (const match of target.matches) {
      if (match.guarded) {
        writeBackupIfNeeded(target);
        next = next.replace(match.spec.guardedSignature, match.spec.applyReplacement);
        console.log(`patched: ${match.spec.label} (${path.relative(process.cwd(), target.filePath)})`);
        changed += 1;
        updated = true;
        continue;
      }

      if (match.legacyPatched) {
        next = next.replace(match.spec.legacyPatchedSignature, match.spec.normalizeReplacement);
        console.log(`normalized: ${match.spec.label} (${path.relative(process.cwd(), target.filePath)})`);
        changed += 1;
        updated = true;
        continue;
      }

      if (match.patched) {
        console.log(`already patched: ${match.spec.label} (${path.relative(process.cwd(), target.filePath)})`);
        alreadyPatched += 1;
      }
    }

    if (updated) {
      fs.writeFileSync(target.filePath, next, "utf8");
    }
  }

  console.log(`summary: changed=${changed}, alreadyPatched=${alreadyPatched}`);
  return 0;
}

function restore() {
  const targets = findTargets(assetsDir);
  if (targets.length === 0) {
    console.log(`Feature target file not found: ${assetsDir}`);
    return 1;
  }

  let restored = 0;

  for (const target of targets) {
    if (fs.existsSync(target.backupPath)) {
      fs.writeFileSync(target.filePath, fs.readFileSync(target.backupPath, "utf8"), "utf8");
      for (const match of target.matches) {
        console.log(`restored backup: ${match.spec.label} (${path.relative(process.cwd(), target.filePath)})`);
        restored += 1;
      }
      continue;
    }

    let next = target.content;
    let updated = false;

    for (const match of target.matches) {
      if (!(match.patched || match.legacyPatched)) {
        continue;
      }

      if (match.spec.id === "fast-slash-command") {
        const enabledVariable = resolveSlashCommandEnabledVariable(next);
        next = next.replace(match.spec.patchedSignature, `$1${enabledVariable}$2`);
      } else {
        next = next.replace(
          match.patched ? match.spec.patchedSignature : match.spec.legacyPatchedSignature,
          match.spec.restoreReplacement,
        );
      }

      console.log(`restored inline: ${match.spec.label} (${path.relative(process.cwd(), target.filePath)})`);
      restored += 1;
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(target.filePath, next, "utf8");
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

  exit_code=$?

  if [ "${exit_code}" -eq 0 ]; then
    case "${action}" in
      apply)
        if ! ensure_archive_backup; then
          exit_code=1
        elif ! pack_temp_app_to_asar; then
          exit_code=1
        elif ! update_asar_integrity_metadata; then
          exit_code=1
        elif ! resign_app_bundle "Codex.app resources were modified. Re-signing now."; then
          exit_code=1
        fi
        ;;
      restore)
        if ! pack_temp_app_to_asar; then
          exit_code=1
        elif ! update_asar_integrity_metadata; then
          exit_code=1
        elif ! resign_app_bundle "Codex.app resources were modified. Re-signing now."; then
          exit_code=1
        fi
        ;;
    esac
  fi

  cleanup_temp_workspace

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
  print_line "2) Enable custom API features"
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
