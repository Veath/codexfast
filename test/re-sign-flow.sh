#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

STUB_BIN="${TMP_DIR}/bin"
MARKER_FILE="${TMP_DIR}/codesign.log"
GUARDED_CONTENT='const label="settings.agent.speed.label";x=_e(),{serviceTierSettings:y,setServiceTier:z}=Ce();if(!x)return null;let view="general";'

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
set -euo pipefail

if [ "$1" != "exec" ]; then
  exit 0
fi

while [ "$1" != "--" ]; do
  shift
done
shift

if [ "$1" != "asar" ]; then
  exit 0
fi

mode="$2"
source_path="$3"
target_path="$4"

case "${mode}" in
  e)
    node - "${source_path}" "${target_path}" <<'NODE'
const fs = require("fs");
const path = require("path");

const [, , archivePath, outputDir] = process.argv;
const archive = fs.readFileSync(archivePath);
const headerBufferSize = archive.readUInt32LE(4);
const headerStringSize = archive.readUInt32LE(12);
const headerString = archive.subarray(16, 16 + headerStringSize).toString("utf8");
const header = JSON.parse(headerString);
const relativePath = "webview/assets/general-settings.js";
const fileInfo = header.files.webview.files.assets.files["general-settings.js"];
const fileOffset = 8 + headerBufferSize + Number(fileInfo.offset);
const fileBuffer = archive.subarray(fileOffset, fileOffset + fileInfo.size);

fs.mkdirSync(path.join(outputDir, "webview/assets"), { recursive: true });
fs.writeFileSync(path.join(outputDir, relativePath), fileBuffer);
NODE
    ;;
  p)
    node - "${source_path}/webview/assets/general-settings.js" "${target_path}" <<'NODE'
const fs = require("fs");

const [, , sourceFilePath, archivePath] = process.argv;
const fileBuffer = fs.readFileSync(sourceFilePath);
const headerString = JSON.stringify({
  files: {
    webview: {
      files: {
        assets: {
          files: {
            "general-settings.js": {
              size: fileBuffer.length,
              offset: "0",
            },
          },
        },
      },
    },
  },
});

const align4 = (value) => value + ((4 - (value % 4)) % 4);
const headerStringBuffer = Buffer.from(headerString, "utf8");
const headerPayloadSize = align4(4 + headerStringBuffer.length);
const headerBuffer = Buffer.alloc(4 + headerPayloadSize);
headerBuffer.writeUInt32LE(headerPayloadSize, 0);
headerBuffer.writeUInt32LE(headerStringBuffer.length, 4);
headerStringBuffer.copy(headerBuffer, 8);

const sizeBuffer = Buffer.alloc(8);
sizeBuffer.writeUInt32LE(4, 0);
sizeBuffer.writeUInt32LE(headerBuffer.length, 4);

fs.writeFileSync(archivePath, Buffer.concat([sizeBuffer, headerBuffer, fileBuffer]));
NODE
    ;;
esac
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

assert_no_persistent_unpack_dir() {
  local resources_dir="$1"
  local output_file="$2"

  if [ -d "${resources_dir}/app" ]; then
    echo "expected no persistent Resources/app directory"
    cat "${output_file}"
    exit 1
  fi
}

write_info_plist() {
  local app_dir="$1"
  local hash_value="$2"

  mkdir -p "${app_dir}/Contents"
  cat > "${app_dir}/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>ElectronAsarIntegrity</key>
  <dict>
    <key>Resources/app.asar</key>
    <dict>
      <key>algorithm</key>
      <string>SHA256</string>
      <key>hash</key>
      <string>${hash_value}</string>
    </dict>
  </dict>
</dict>
</plist>
EOF
}

read_info_plist_hash() {
  /usr/libexec/PlistBuddy -c 'Print :ElectronAsarIntegrity:Resources/app.asar:hash' "$1/Contents/Info.plist"
}

write_fake_asar() {
  local source_file="$1"
  local archive_path="$2"

  node - "${source_file}" "${archive_path}" <<'NODE'
const fs = require("fs");

const [, , sourceFilePath, archivePath] = process.argv;
const fileBuffer = fs.readFileSync(sourceFilePath);
const headerString = JSON.stringify({
  files: {
    webview: {
      files: {
        assets: {
          files: {
            "general-settings.js": {
              size: fileBuffer.length,
              offset: "0",
            },
          },
        },
      },
    },
  },
});

const align4 = (value) => value + ((4 - (value % 4)) % 4);
const headerStringBuffer = Buffer.from(headerString, "utf8");
const headerPayloadSize = align4(4 + headerStringBuffer.length);
const headerBuffer = Buffer.alloc(4 + headerPayloadSize);
headerBuffer.writeUInt32LE(headerPayloadSize, 0);
headerBuffer.writeUInt32LE(headerStringBuffer.length, 4);
headerStringBuffer.copy(headerBuffer, 8);

const sizeBuffer = Buffer.alloc(8);
sizeBuffer.writeUInt32LE(4, 0);
sizeBuffer.writeUInt32LE(headerBuffer.length, 4);

fs.writeFileSync(archivePath, Buffer.concat([sizeBuffer, headerBuffer, fileBuffer]));
NODE
}

read_fake_asar_file() {
  local archive_path="$1"

  node - "${archive_path}" <<'NODE'
const fs = require("fs");

const [, , archivePath] = process.argv;
const archive = fs.readFileSync(archivePath);
const headerBufferSize = archive.readUInt32LE(4);
const headerStringSize = archive.readUInt32LE(12);
const headerString = archive.subarray(16, 16 + headerStringSize).toString("utf8");
const header = JSON.parse(headerString);
const fileInfo = header.files.webview.files.assets.files["general-settings.js"];
const fileOffset = 8 + headerBufferSize + Number(fileInfo.offset);
process.stdout.write(archive.subarray(fileOffset, fileOffset + fileInfo.size).toString("utf8"));
NODE
}

read_fake_asar_header_hash() {
  local archive_path="$1"

  node - "${archive_path}" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");

const [, , archivePath] = process.argv;
const archive = fs.readFileSync(archivePath);
const headerStringSize = archive.readUInt32LE(12);
const headerString = archive.subarray(16, 16 + headerStringSize).toString("utf8");
process.stdout.write(crypto.createHash("sha256").update(headerString).digest("hex"));
NODE
}

FAKE_APP_EXISTING="${TMP_DIR}/Existing.app"
FAKE_RESOURCES_EXISTING="${FAKE_APP_EXISTING}/Contents/Resources"
OUTPUT_EXISTING="${TMP_DIR}/apply-restore-output.txt"

mkdir -p "${FAKE_RESOURCES_EXISTING}"
printf '%s\n' "${GUARDED_CONTENT}" > "${TMP_DIR}/existing-general-settings.js"
write_fake_asar "${TMP_DIR}/existing-general-settings.js" "${FAKE_RESOURCES_EXISTING}/app.asar"
write_info_plist "${FAKE_APP_EXISTING}" "$(read_fake_asar_header_hash "${FAKE_RESOURCES_EXISTING}/app.asar")"

run_script "${FAKE_APP_EXISTING}" '2\n\n3\n\nq\n' "${OUTPUT_EXISTING}"
assert_codesign_calls 2 "${OUTPUT_EXISTING}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_EXISTING}" "${OUTPUT_EXISTING}"

if [ ! -f "${FAKE_RESOURCES_EXISTING}/app.asar1" ]; then
  echo "expected archive backup to be created on apply"
  cat "${OUTPUT_EXISTING}"
  exit 1
fi

if ! read_fake_asar_file "${FAKE_RESOURCES_EXISTING}/app.asar" | grep -q 'if(!x)return null;'; then
  echo "expected restore to bring app.asar back to the guarded state"
  read_fake_asar_file "${FAKE_RESOURCES_EXISTING}/app.asar"
  exit 1
fi

if [ "$(read_info_plist_hash "${FAKE_APP_EXISTING}")" != "$(read_fake_asar_header_hash "${FAKE_RESOURCES_EXISTING}/app.asar")" ]; then
  echo "expected ElectronAsarIntegrity hash to match restored app.asar header"
  cat "${FAKE_APP_EXISTING}/Contents/Info.plist"
  exit 1
fi

rm -f "${MARKER_FILE}"

FAKE_APP_LEGACY="${TMP_DIR}/Legacy.app"
FAKE_RESOURCES_LEGACY="${FAKE_APP_LEGACY}/Contents/Resources"
FAKE_APP_DIR_LEGACY="${FAKE_RESOURCES_LEGACY}/app/webview/assets"
OUTPUT_LEGACY="${TMP_DIR}/legacy-output.txt"

mkdir -p "${FAKE_APP_DIR_LEGACY}"
printf '%s\n' "${GUARDED_CONTENT}" > "${FAKE_APP_DIR_LEGACY}/general-settings.js"
printf '%s\n' "${GUARDED_CONTENT}" > "${TMP_DIR}/legacy-general-settings.js"
write_fake_asar "${TMP_DIR}/legacy-general-settings.js" "${FAKE_RESOURCES_LEGACY}/app.asar1"
write_info_plist "${FAKE_APP_LEGACY}" "legacy-placeholder-hash"

run_script "${FAKE_APP_LEGACY}" '1\n\nq\n' "${OUTPUT_LEGACY}"
assert_codesign_calls 1 "${OUTPUT_LEGACY}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_LEGACY}" "${OUTPUT_LEGACY}"

if [ ! -f "${FAKE_RESOURCES_LEGACY}/app.asar" ]; then
  echo "expected legacy unpacked layout to be repacked into app.asar"
  cat "${OUTPUT_LEGACY}"
  exit 1
fi

if ! read_fake_asar_file "${FAKE_RESOURCES_LEGACY}/app.asar" | grep -q 'if(!x)return null;'; then
  echo "expected repacked app.asar to preserve the current JS content"
  read_fake_asar_file "${FAKE_RESOURCES_LEGACY}/app.asar"
  exit 1
fi

if [ "$(read_info_plist_hash "${FAKE_APP_LEGACY}")" != "$(read_fake_asar_header_hash "${FAKE_RESOURCES_LEGACY}/app.asar")" ]; then
  echo "expected ElectronAsarIntegrity hash to match migrated app.asar header"
  cat "${FAKE_APP_LEGACY}/Contents/Info.plist"
  exit 1
fi

rm -f "${MARKER_FILE}"

FAKE_APP_FAILING="${TMP_DIR}/Failing.app"
FAKE_RESOURCES_FAILING="${FAKE_APP_FAILING}/Contents/Resources"
OUTPUT_FAILING="${TMP_DIR}/failing-output.txt"

mkdir -p "${FAKE_RESOURCES_FAILING}"
printf '%s\n' "${GUARDED_CONTENT}" > "${TMP_DIR}/failing-general-settings.js"
write_fake_asar "${TMP_DIR}/failing-general-settings.js" "${FAKE_RESOURCES_FAILING}/app.asar"
write_info_plist "${FAKE_APP_FAILING}" "$(read_fake_asar_header_hash "${FAKE_RESOURCES_FAILING}/app.asar")"

run_script_with_codesign_failure "${FAKE_APP_FAILING}" '2\n\nq\n' "${OUTPUT_FAILING}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_FAILING}" "${OUTPUT_FAILING}"

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
