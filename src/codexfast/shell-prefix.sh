#!/bin/bash

set -u

APP_BUNDLE="${CODEXFAST_APP_BUNDLE:-/Applications/Codex.app}"
APP_RESOURCES="${APP_BUNDLE}/Contents/Resources"
APP_DIR="${APP_RESOURCES}/app"
APP_ASAR="${APP_RESOURCES}/app.asar"
APP_ASAR_BACKUP="${APP_RESOURCES}/app.asar1"
APP_INFO_PLIST="${APP_BUNDLE}/Contents/Info.plist"
BACKUP_SUFFIX=".speed-setting.bak"
SUPPORTED_APP_VERSION_KEYS="26.415.40636+1799 26.417.41555+1858 26.422.21637+2056 26.422.30944+2080"
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

print_action_header() {
  local action="$1"

  print_line ""
  print_line "Action: ${action}"
  print_line "Resources: ${APP_RESOURCES}"
  print_line "Detected version: ${APP_VERSION}"
  print_line "Detected build: ${APP_BUILD}"
  print_line "Compatibility: ${APP_COMPATIBILITY}"
  print_line "Mode: self-contained single file"
  print_line ""
}

validate_action_request() {
  local action="$1"

  if [ "${action}" = "apply" ] && [ "${APP_VERSION_SUPPORTED}" -ne 1 ]; then
    print_line "Enable custom API features is blocked for this Codex.app version."
    print_line "This script only allows apply on verified compatible builds."
    print_line "Supported versions: ${SUPPORTED_APP_VERSION_KEYS}"
    print_line ""
    print_line "Exit code: 1"
    return 1
  fi

  return 0
}

run_embedded_patcher() {
  local action="$1"

  "${NODE_BIN}" - "${action}" "${TEMP_ASSETS_DIR}" "${BACKUP_SUFFIX}" "${APP_VERSION_KEY}" <<'NODE'
