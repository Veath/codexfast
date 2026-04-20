#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

STUB_BIN="${TMP_DIR}/bin"
MARKER_FILE="${TMP_DIR}/codesign.log"

mkdir -p "${STUB_BIN}"

cat > "${STUB_BIN}/clear" <<'EOF'
#!/bin/bash
exit 0
EOF

cat > "${STUB_BIN}/codesign" <<EOF
#!/bin/bash
if [ "\${CODEXFAST_TEST_CODESIGN_FAIL:-0}" = "1" ] && [ "\$1" = "--force" ]; then
  printf '%s\n' "codesign: permission denied" >&2
  exit 1
fi
printf '%s\n' "\$*" >> "${MARKER_FILE}"
exit 0
EOF

cat > "${STUB_BIN}/npm" <<'EOF'
#!/bin/bash
if [ "$1" = "exec" ]; then
  mkdir -p app/webview/assets
  cat > app/webview/assets/general-settings.js <<'ASSET'
const label="settings.agent.speed.label";x=_e(),{serviceTierSettings:y,setServiceTier:z}=Ce();if(!x)return null;let view="general";
ASSET
  exit 0
fi
exit 0
EOF

chmod +x "${STUB_BIN}/clear" "${STUB_BIN}/codesign" "${STUB_BIN}/npm"

run_script() {
  local app_dir="$1"
  local input="$2"
  local output_file="$3"

  printf '%b' "${input}" | \
    PATH="${STUB_BIN}:$PATH" \
    CODEXFAST_APP_BUNDLE="${app_dir}" \
    "${ROOT_DIR}/codexfast.sh" > "${output_file}" 2>&1 || {
      cat "${output_file}"
      exit 1
    }
}

run_script_with_codesign_failure() {
  local app_dir="$1"
  local input="$2"
  local output_file="$3"

  printf '%b' "${input}" | \
    PATH="${STUB_BIN}:$PATH" \
    CODEXFAST_APP_BUNDLE="${app_dir}" \
    CODEXFAST_TEST_CODESIGN_FAIL=1 \
    "${ROOT_DIR}/codexfast.sh" > "${output_file}" 2>&1 || {
      cat "${output_file}"
      exit 1
    }
}

assert_codesign_calls() {
  local expected_min="$1"
  local output_file="$2"

  if [ ! -f "${MARKER_FILE}" ]; then
    echo "expected codesign to be invoked"
    cat "${output_file}"
    exit 1
  fi

  local call_count
  call_count="$(wc -l < "${MARKER_FILE}" | tr -d ' ')"
  if [ "${call_count}" -lt "${expected_min}" ]; then
    echo "expected codesign to run at least ${expected_min} times, got ${call_count}"
    cat "${MARKER_FILE}"
    cat "${output_file}"
    exit 1
  fi
}

FAKE_APP_EXISTING="${TMP_DIR}/Existing.app"
FAKE_RESOURCES_EXISTING="${FAKE_APP_EXISTING}/Contents/Resources"
FAKE_ASSETS_EXISTING="${FAKE_RESOURCES_EXISTING}/app/webview/assets"
TARGET_FILE_EXISTING="${FAKE_ASSETS_EXISTING}/general-settings.js"
OUTPUT_EXISTING="${TMP_DIR}/apply-restore-output.txt"

mkdir -p "${FAKE_ASSETS_EXISTING}"
cat > "${TARGET_FILE_EXISTING}" <<'EOF'
const label="settings.agent.speed.label";x=_e(),{serviceTierSettings:y,setServiceTier:z}=Ce();if(!x)return null;let view="general";
EOF

run_script "${FAKE_APP_EXISTING}" '2\n\n3\n\nq\n' "${OUTPUT_EXISTING}"
assert_codesign_calls 2 "${OUTPUT_EXISTING}"

if ! grep -q 'if(!x)return null;' "${TARGET_FILE_EXISTING}"; then
  echo "expected restore to put the guarded code back"
  cat "${TARGET_FILE_EXISTING}"
  exit 1
fi

rm -f "${MARKER_FILE}"

FAKE_APP_PACKED="${TMP_DIR}/Packed.app"
FAKE_RESOURCES_PACKED="${FAKE_APP_PACKED}/Contents/Resources"
OUTPUT_PACKED="${TMP_DIR}/status-output.txt"

mkdir -p "${FAKE_RESOURCES_PACKED}"
touch "${FAKE_RESOURCES_PACKED}/app.asar"

run_script "${FAKE_APP_PACKED}" '1\n\nq\n' "${OUTPUT_PACKED}"
assert_codesign_calls 1 "${OUTPUT_PACKED}"

if [ ! -f "${FAKE_RESOURCES_PACKED}/app.asar1" ]; then
  echo "expected app.asar to be renamed after unpack"
  cat "${OUTPUT_PACKED}"
  exit 1
fi

if [ ! -f "${FAKE_RESOURCES_PACKED}/app/webview/assets/general-settings.js" ]; then
  echo "expected unpacked assets to exist after npm stub extraction"
  cat "${OUTPUT_PACKED}"
  exit 1
fi

FAKE_APP_FAILING="${TMP_DIR}/Failing.app"
FAKE_RESOURCES_FAILING="${FAKE_APP_FAILING}/Contents/Resources"
FAKE_ASSETS_FAILING="${FAKE_RESOURCES_FAILING}/app/webview/assets"
OUTPUT_FAILING="${TMP_DIR}/failing-output.txt"

mkdir -p "${FAKE_ASSETS_FAILING}"
cat > "${FAKE_ASSETS_FAILING}/general-settings.js" <<'EOF'
const label="settings.agent.speed.label";x=_e(),{serviceTierSettings:y,setServiceTier:z}=Ce();if(!x)return null;let view="general";
EOF

run_script_with_codesign_failure "${FAKE_APP_FAILING}" '2\n\nq\n' "${OUTPUT_FAILING}"

if ! grep -q 'codesign --force --deep --sign - '"${FAKE_APP_FAILING}" "${OUTPUT_FAILING}"; then
  echo "expected manual re-sign guidance in failure output"
  cat "${OUTPUT_FAILING}"
  exit 1
fi

if ! grep -q 'Exit code: 1' "${OUTPUT_FAILING}"; then
  echo "expected a failed action exit code when codesign fails"
  cat "${OUTPUT_FAILING}"
  exit 1
fi

echo "re-sign flow test passed"
