#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

STUB_BIN="${TMP_DIR}/bin"
MARKER_FILE="${TMP_DIR}/codesign.log"
GUARDED_CONTENT='const label="settings.agent.speed.label";function demo(){let cache=(0,Q.c)(35),fmt=j(),x=_e(),{serviceTierSettings:y,setServiceTier:z}=Ce();if(!x)return null;let view="general";return {cache,fmt,view,y,z};}'
SLASH_COMMAND_GUARDED_CONTENT='const label="composer.speedSlashCommand.title";function OG(){let e=(0,Q.c)(24),t=ea(),n=Lf(),{serviceTierSettings:r,setServiceTier:i}=Zf(),a;e[0]===r.serviceTier?a=e[1]:(a=N(r.serviceTier),e[0]=r.serviceTier,e[1]=a);let o=a===`fast`,s;e[2]===o?s=e[3]:(s=e=>{let{className:t}=e;return(0,$.jsx)(o?Wv:EG,{className:X(t,o?`text-token-link-foreground`:void 0)})},e[2]=o,e[3]=s);let c=s,l;e[4]===t?l=e[5]:(l=t.formatMessage(DG.title),e[4]=t,e[5]=l);let u;e[6]!==t||e[7]!==o?(u=t.formatMessage(o?DG.disableDescription:DG.commandDescription),e[6]=t,e[7]=o,e[8]=u):u=e[8];let d;e[9]!==o||e[10]!==i?(d=async()=>{await i(o?null:`fast`,`slash_command`)},e[9]=o,e[10]=i,e[11]=d):d=e[11];let f;e[12]!==n||e[13]!==o||e[14]!==r.isLoading||e[15]!==i?(f=[n,o,r.isLoading,i],e[12]=n,e[13]=o,e[14]=r.isLoading,e[15]=i,e[16]=f):f=e[16];let p;return e[17]!==c||e[18]!==n||e[19]!==l||e[20]!==u||e[21]!==d||e[22]!==f?(p={id:`speed`,title:l,description:u,requiresEmptyComposer:!1,enabled:n,Icon:c,onSelect:d,dependencies:f},e[17]=c,e[18]=n,e[19]=l,e[20]=u,e[21]=d,e[22]=f,e[23]=p):p=e[23],DI(p),null}'
ADD_CONTEXT_SPEED_GUARDED_CONTENT='const label="composer.addContext.speed.option.fast.description";const IE=[];function zE(){let l=Sn(),D=Cr(),{serviceTierSettings:O,setServiceTier:k}=Ir(r);return D?(0,q.jsx)(Qa.FlyoutSubmenuItem,{LeftIcon:Coe,label:(0,q.jsx)(W,{...FE.label}),contentClassName:`min-w-[160px]`,disabled:O.isLoading,children:IE.map(e=>{let t=e.value===O.serviceTier;return(0,q.jsx)(Qa.Item,{disabled:O.isLoading,RightIcon:t?to:void 0,SubText:(0,q.jsx)(`span`,{className:`text-token-description-foreground`,children:(0,q.jsx)(W,{...FE[e.description]})}),onSelect:()=>{k(e.value,`composer_menu`),x()},children:(0,q.jsx)(W,{...FE[e.label]})},e.label)})}):null}'
PLUGINS_SIDEBAR_GUARDED_CONTENT='const label="sidebarElectron.pluginsDisabledTooltip";function sidebar(){let e=ea(),{authMethod:T}=Nf(),D=Gf(),O=Hl(),k=cf(`533078438`),j=T===`apikey`,M=k&&j,N=O&&!j;return {e,D,O,k,j,M,N};}'
GUARDED_CONTENT_26417='const label="settings.agent.speed.label";function an(){let e=(0,Q.c)(35),t=C(),n=ae(),{serviceTierSettings:r,setServiceTier:a}=se();if(!n)return null;let o;e[0]===r.serviceTier?o=e[1]:(o=i(r.serviceTier),e[0]=r.serviceTier,e[1]=o);let s=o;return {t,n,s,a};}'
ADD_CONTEXT_SPEED_GUARDED_CONTENT_26417='const label="composer.addContext.speed.option.fast.description";const gD=zr.map(e=>({label:_D(e),description:vD(e),value:e}));function yD({conversationId:r}){let l=Cn(),u=oe(_),d=mD(),f=(0,K.useRef)(!1),p=Tt(uee),{isOpen:m,setIsOpen:h,tooltipOpen:g,triggerRef:v,onTriggerBlur:y,onTriggerPointerLeave:b,handleSelectAndClose:x}=pD(),S=Yl(r),{activeMode:C,modes:w,setSelectedMode:T,isLoading:E}=fD(r),D=cr(),{serviceTierSettings:O,setServiceTier:k}=jr(r),A=o===`connected`,j=C.mode===`plan`,M=O.serviceTier===`fast`;return D?(0,q.jsx)(Qa.FlyoutSubmenuItem,{disabled:O.isLoading,children:gD.map(e=>(0,q.jsx)(Qa.Item,{onSelect:()=>{k(e.value,`composer_menu`),x()}},e.label))}):null}'
PLUGINS_SIDEBAR_GUARDED_CONTENT_26417='const label="sidebarElectron.pluginsDisabledTooltip";function jT(){let e=je(k),t=Pm(),n=nr(fw),r=Bg(),{remoteProjects:i,setSelectedRemoteProjectId:a}=Vp(),o=tg(()=>{r()}),s=ur(Jy),c=d(),l=x(),f=le(),{isDragActive:p,dropHandlers:m}=LT({onDropRoot:VT}),h=u(`/local/:conversationId`),g=u(`/remote/:conversationId`),_=u(`/worktree-init-v2/:pendingId`),[v,y]=(0,Z.useOptimistic)(aC({localId:h?.params.conversationId??null,remoteId:g?.params.conversationId??null,pendingId:_?.params.pendingId??null}),(e,t)=>t),b=tg(e=>{e!==v&&(0,Z.startTransition)(()=>{y(e)})}),S=WT(v),w=pa(),{authMethod:T}=$f(),D=Fs(),O=hf(`533078438`),A=T===`apikey`,j=O&&A,M=D&&!A;return {e,t,n,r,O,A,j,M};}'
PLUGINS_SIDEBAR_PARTIAL_PATCHED_CONTENT_26417='const label="sidebarElectron.pluginsDisabledTooltip";function jT(){let e=je(k),t=Pm(),n=nr(fw),r=Bg(),{remoteProjects:i,setSelectedRemoteProjectId:a}=Vp(),o=tg(()=>{r()}),s=ur(Jy),c=d(),l=x(),f=le(),{isDragActive:p,dropHandlers:m}=LT({onDropRoot:VT}),h=u(`/local/:conversationId`),g=u(`/remote/:conversationId`),_=u(`/worktree-init-v2/:pendingId`),[v,y]=(0,Z.useOptimistic)(aC({localId:h?.params.conversationId??null,remoteId:g?.params.conversationId??null,pendingId:_?.params.pendingId??null}),(e,t)=>t),b=tg(e=>{e!==v&&(0,Z.startTransition)(()=>{y(e)})}),S=WT(v),w=pa(),{authMethod:T}=$f(),D=Fs(),O=hf(`533078438`),A=T===`apikey`,j=!1,M=D&&!A;return {e,t,n,r,O,A,j,M};}'
GUARDED_CONTENT_26422='const label="settings.agent.speed.label";function Tn(){let e=(0,Q.c)(35),t=k(),n=P(),{serviceTierSettings:r,setServiceTier:i}=be();if(!n)return null;let a;e[0]===r.serviceTier?a=e[1]:(a=c(r.serviceTier),e[0]=r.serviceTier,e[1]=a);return {t,n,a,r,i};}'
SLASH_COMMAND_GUARDED_CONTENT_26422='const slashLabel26422="composer.speedSlashCommand.title";function FY(){let e=(0,Q.c)(24),t=ka(),n=_f(),{serviceTierSettings:r,setServiceTier:i}=Jp(),a;e[0]===r.serviceTier?a=e[1]:(a=ye(r.serviceTier),e[0]=r.serviceTier,e[1]=a);let o=a===`fast`,s;e[2]===o?s=e[3]:(s=e=>{let{className:t}=e;return(0,$.jsx)(o?ub:NY,{className:X(t,o?`text-token-link-foreground`:void 0)})},e[2]=o,e[3]=s);let c=s,l;e[4]===t?l=e[5]:(l=t.formatMessage(PY.title),e[4]=t,e[5]=l);let u;e[6]!==t||e[7]!==o?(u=t.formatMessage(o?PY.disableDescription:PY.commandDescription),e[6]=t,e[7]=o,e[8]=u):u=e[8];let d;e[9]!==o||e[10]!==i?(d=async()=>{await i(o?null:`fast`,`slash_command`)},e[9]=o,e[10]=i,e[11]=d):d=e[11];let f;e[12]!==n||e[13]!==o||e[14]!==r.isLoading||e[15]!==i?(f=[n,o,r.isLoading,i],e[12]=n,e[13]=o,e[14]=r.isLoading,e[15]=i,e[16]=f):f=e[16];let p;return e[17]!==c||e[18]!==n||e[19]!==l||e[20]!==u||e[21]!==d||e[22]!==f?(p={id:`speed`,title:l,description:u,requiresEmptyComposer:!1,enabled:n,Icon:c,onSelect:d,dependencies:f},e[17]=c,e[18]=n,e[19]=l,e[20]=u,e[21]=d,e[22]=f,e[23]=p):p=e[23],Iz(p),null}'
INTELLIGENCE_SPEED_GUARDED_CONTENT_26422='const intelligenceSpeedLabel26422="composer.intelligenceDropdown.speed.title";function menu(){let t=(0,Q.c)(74),{serviceTierSettings:m,setServiceTier:h}=Jp(n),g=_f(),_=z(eU,n),N=m.serviceTier,U=done;let ge;t[56]!==U||t[57]!==g||t[58]!==N||t[59]!==m.isLoading||t[60]!==h?(ge=g?(0,$.jsx)(cU,{selectedServiceTier:N,isLoading:m.isLoading,setServiceTier:h,onSelectComplete:U}):null,t[56]=U,t[57]=g,t[58]=N,t[59]=m.isLoading,t[60]=h,t[61]=ge):ge=t[61];return ge}'
PLUGINS_SIDEBAR_GUARDED_CONTENT_26422='const pluginsLabel26422="sidebarElectron.pluginsDisabledTooltip";function xA(){let e=R(Qe),T=ka(),{authMethod:D}=zp(),O=$f(`533078438`),k=D===`apikey`,A=O&&k,j=T.formatMessage({id:`sidebarElectron.addGenericWorkspaceRoot`}),M=T.formatMessage({id:`sidebarElectron.newThread`}),N=T.formatMessage({id:`sidebarElectron.recentChats`}),P=T.formatMessage({id:`sidebarElectron.pinnedThreads`}),F=Sg(()=>{}),I=$f(`3326157269`),L=W_(),z=J(DD),B=J(kS),V=tx(),H=Py(),U=Ng(),W=Cp(),G=!H,{remoteConnections:K}=jp(),q=g_(K),ee=Ha({hostId:me})&&!k,te=W&&q.length>0;return {e,T,D,O,k,A,ee,te};}'

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
const files = [];

function walk(node, segments = []) {
  for (const [name, value] of Object.entries(node.files ?? {})) {
    const nextSegments = [...segments, name];
    if (value.files) {
      walk(value, nextSegments);
      continue;
    }
    files.push({
      relativePath: nextSegments.join("/"),
      offset: Number(value.offset),
      size: value.size,
    });
  }
}

walk(header);

for (const file of files) {
  const fileOffset = 8 + headerBufferSize + file.offset;
  const fileBuffer = archive.subarray(fileOffset, fileOffset + file.size);
  const destination = path.join(outputDir, file.relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, fileBuffer);
}
NODE
    ;;
  p)
    node - "${source_path}" "${target_path}" <<'NODE'
const fs = require("fs");
const path = require("path");

const [, , sourcePath, archivePath] = process.argv;
const files = [];

function walk(dir, segments = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, [...segments, entry.name]);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    files.push({
      segments: [...segments, entry.name],
      buffer: fs.readFileSync(fullPath),
    });
  }
}

walk(sourcePath);

let nextOffset = 0;
const headerRoot = { files: {} };

for (const file of files) {
  let current = headerRoot;
  for (const segment of file.segments.slice(0, -1)) {
    current.files[segment] ??= { files: {} };
    current = current.files[segment];
  }
  current.files[file.segments[file.segments.length - 1]] = {
    size: file.buffer.length,
    offset: String(nextOffset),
  };
  nextOffset += file.buffer.length;
}

const headerString = JSON.stringify(headerRoot);

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

fs.writeFileSync(archivePath, Buffer.concat([sizeBuffer, headerBuffer, ...files.map((file) => file.buffer)]));
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

run_script_expect_failure() {
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
  local app_version="${3:-26.415.40636}"
  local app_build="${4:-1799}"

  mkdir -p "${app_dir}/Contents"
  cat > "${app_dir}/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleShortVersionString</key>
  <string>${app_version}</string>
  <key>CFBundleVersion</key>
  <string>${app_build}</string>
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
  local source_path="$1"
  local archive_path="$2"

  node - "${source_path}" "${archive_path}" <<'NODE'
const fs = require("fs");
const path = require("path");

const [, , sourcePath, archivePath] = process.argv;
const sourceStat = fs.statSync(sourcePath);
const files = [];

function walk(dir, segments = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, [...segments, entry.name]);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    files.push({
      segments: [...segments, entry.name],
      buffer: fs.readFileSync(fullPath),
    });
  }
}

if (sourceStat.isDirectory()) {
  walk(sourcePath);
} else {
  files.push({
    segments: ["webview", "assets", "general-settings.js"],
    buffer: fs.readFileSync(sourcePath),
  });
}

let nextOffset = 0;
const headerRoot = { files: {} };

for (const file of files) {
  let current = headerRoot;
  for (const segment of file.segments.slice(0, -1)) {
    current.files[segment] ??= { files: {} };
    current = current.files[segment];
  }
  current.files[file.segments[file.segments.length - 1]] = {
    size: file.buffer.length,
    offset: String(nextOffset),
  };
  nextOffset += file.buffer.length;
}

const headerString = JSON.stringify(headerRoot);

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

fs.writeFileSync(archivePath, Buffer.concat([sizeBuffer, headerBuffer, ...files.map((file) => file.buffer)]));
NODE
}

read_fake_asar_file() {
  local archive_path="$1"
  local relative_path="${2:-webview/assets/general-settings.js}"

  node - "${archive_path}" "${relative_path}" <<'NODE'
const fs = require("fs");

const [, , archivePath, relativePath] = process.argv;
const archive = fs.readFileSync(archivePath);
const headerBufferSize = archive.readUInt32LE(4);
const headerStringSize = archive.readUInt32LE(12);
const headerString = archive.subarray(16, 16 + headerStringSize).toString("utf8");
const header = JSON.parse(headerString);

const segments = relativePath.split("/");
let current = header;
for (const segment of segments) {
  current = current.files[segment];
}

const fileInfo = current;
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

assert_fake_asar_js_parses() {
  local archive_path="$1"

  node - "${archive_path}" <<'NODE'
const fs = require("fs");
const vm = require("vm");

const [, , archivePath] = process.argv;
const archive = fs.readFileSync(archivePath);
const headerBufferSize = archive.readUInt32LE(4);
const headerStringSize = archive.readUInt32LE(12);
const headerString = archive.subarray(16, 16 + headerStringSize).toString("utf8");
const header = JSON.parse(headerString);

function walk(node) {
  for (const value of Object.values(node.files ?? {})) {
    if (value.files) {
      walk(value);
      continue;
    }
    const fileOffset = 8 + headerBufferSize + Number(value.offset);
    const source = archive.subarray(fileOffset, fileOffset + value.size).toString("utf8");
    new vm.Script(source);
  }
}

walk(header);
NODE
}

write_standard_assets() {
  local assets_dir="$1"

  mkdir -p "${assets_dir}"
  printf '%s\n' "${GUARDED_CONTENT}" > "${assets_dir}/general-settings.js"
  printf '%s\n' "${SLASH_COMMAND_GUARDED_CONTENT}" > "${assets_dir}/index.js"
  printf '%s\n' "${ADD_CONTEXT_SPEED_GUARDED_CONTENT}" > "${assets_dir}/use-model-settings.js"
  printf '%s\n' "${PLUGINS_SIDEBAR_GUARDED_CONTENT}" > "${assets_dir}/sidebar.js"
}

write_26417_assets() {
  local assets_dir="$1"

  mkdir -p "${assets_dir}"
  printf '%s\n' "${GUARDED_CONTENT_26417}" > "${assets_dir}/general-settings-D2eks1ok.js"
  printf '%s\n' "${SLASH_COMMAND_GUARDED_CONTENT}" > "${assets_dir}/index-CxBol07n.js"
  printf '%s\n' "${ADD_CONTEXT_SPEED_GUARDED_CONTENT_26417}" > "${assets_dir}/use-model-settings-ldiRRtPt.js"
  printf '%s\n' "${PLUGINS_SIDEBAR_GUARDED_CONTENT_26417}" > "${assets_dir}/sidebar-CxBol07n.js"
}

write_26417_partial_patched_assets() {
  local assets_dir="$1"

  mkdir -p "${assets_dir}"
  printf '%s\n' "${GUARDED_CONTENT_26417}" > "${assets_dir}/general-settings-D2eks1ok.js"
  printf '%s\n' "${SLASH_COMMAND_GUARDED_CONTENT}" > "${assets_dir}/index-CxBol07n.js"
  printf '%s\n' "${ADD_CONTEXT_SPEED_GUARDED_CONTENT_26417}" > "${assets_dir}/use-model-settings-ldiRRtPt.js"
  printf '%s\n' "${PLUGINS_SIDEBAR_PARTIAL_PATCHED_CONTENT_26417}" > "${assets_dir}/sidebar-CxBol07n.js"
}

write_26422_assets() {
  local assets_dir="$1"

  mkdir -p "${assets_dir}"
  printf '%s\n' "${GUARDED_CONTENT_26422}" > "${assets_dir}/general-settings-CnVD4YyB.js"
  printf '%s\n' "${SLASH_COMMAND_GUARDED_CONTENT_26422}" > "${assets_dir}/index-gATb9Tvd.js"
  printf '%s\n' "${INTELLIGENCE_SPEED_GUARDED_CONTENT_26422}" >> "${assets_dir}/index-gATb9Tvd.js"
  printf '%s\n' "${PLUGINS_SIDEBAR_GUARDED_CONTENT_26422}" >> "${assets_dir}/index-gATb9Tvd.js"
}

prepare_archived_fake_app() {
  local app_dir="$1"
  local assets_root="$2"
  local app_version="${3:-26.415.40636}"
  local app_build="${4:-1799}"
  local asset_profile="${5:-standard}"
  local resources_dir="${app_dir}/Contents/Resources"
  local archive_path="${resources_dir}/app.asar"

  mkdir -p "${resources_dir}"
  case "${asset_profile}" in
    standard)
      write_standard_assets "${assets_root}/webview/assets"
      ;;
    26417)
      write_26417_assets "${assets_root}/webview/assets"
      ;;
    26417-partial)
      write_26417_partial_patched_assets "${assets_root}/webview/assets"
      ;;
    26422)
      write_26422_assets "${assets_root}/webview/assets"
      ;;
    *)
      echo "unknown asset profile: ${asset_profile}"
      exit 1
      ;;
  esac
  write_fake_asar "${assets_root}" "${archive_path}"
  write_info_plist "${app_dir}" "$(read_fake_asar_header_hash "${archive_path}")" "${app_version}" "${app_build}"
}

prepare_legacy_fake_app() {
  local app_dir="$1"
  local unpacked_assets_dir="$2"
  local archived_assets_root="$3"
  local app_build_hash_placeholder="$4"
  local resources_dir="${app_dir}/Contents/Resources"
  local unpacked_root="${resources_dir}/app/webview/assets"

  mkdir -p "${unpacked_root}"
  write_standard_assets "${unpacked_assets_dir}"
  cp "${unpacked_assets_dir}/general-settings.js" "${unpacked_root}/general-settings.js"
  cp "${unpacked_assets_dir}/index.js" "${unpacked_root}/index.js"
  cp "${unpacked_assets_dir}/use-model-settings.js" "${unpacked_root}/use-model-settings.js"
  cp "${unpacked_assets_dir}/sidebar.js" "${unpacked_root}/sidebar.js"
  write_standard_assets "${archived_assets_root}/webview/assets"
  write_fake_asar "${archived_assets_root}" "${resources_dir}/app.asar1"
  write_info_plist "${app_dir}" "${app_build_hash_placeholder}"
}

assert_apply_state() {
  local archive_path="$1"

  if ! read_fake_asar_file "${archive_path}" | grep -q 'let view="general";'; then
    echo "expected apply to remove the guarded Speed settings return"
    read_fake_asar_file "${archive_path}"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index.js" | grep -q 'enabled:!0'; then
    echo "expected apply to enable the Fast slash command"
    read_fake_asar_file "${archive_path}" "webview/assets/index.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/use-model-settings.js" | grep -q 'D=!0'; then
    echo "expected apply to enable the add-context Speed menu"
    read_fake_asar_file "${archive_path}" "webview/assets/use-model-settings.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/sidebar.js" | grep -q 'j=!1'; then
    echo "expected apply to remove the Plugins sidebar api-key gate"
    read_fake_asar_file "${archive_path}" "webview/assets/sidebar.js"
    exit 1
  fi
}

assert_guarded_state() {
  local archive_path="$1"
  local context="$2"

  if ! read_fake_asar_file "${archive_path}" | grep -q 'if(!x)return null;'; then
    echo "expected ${context} to preserve the guarded Speed settings state"
    read_fake_asar_file "${archive_path}"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index.js" | grep -q 'enabled:n'; then
    echo "expected ${context} to preserve the guarded Fast slash command state"
    read_fake_asar_file "${archive_path}" "webview/assets/index.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/use-model-settings.js" | grep -q 'D=Cr()'; then
    echo "expected ${context} to preserve the guarded add-context Speed menu state"
    read_fake_asar_file "${archive_path}" "webview/assets/use-model-settings.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/sidebar.js" | grep -q 'j=T===`apikey`'; then
    echo "expected ${context} to preserve the guarded Plugins sidebar state"
    read_fake_asar_file "${archive_path}" "webview/assets/sidebar.js"
    exit 1
  fi
}

assert_apply_state_26417() {
  local archive_path="$1"

  if ! read_fake_asar_file "${archive_path}" "webview/assets/general-settings-D2eks1ok.js" | grep -q 'let o;'; then
    echo "expected 26.417 apply to remove the guarded Speed settings return"
    read_fake_asar_file "${archive_path}" "webview/assets/general-settings-D2eks1ok.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index-CxBol07n.js" | grep -q 'enabled:!0'; then
    echo "expected 26.417 apply to enable the Fast slash command"
    read_fake_asar_file "${archive_path}" "webview/assets/index-CxBol07n.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/use-model-settings-ldiRRtPt.js" | grep -q 'D=!0'; then
    echo "expected 26.417 apply to enable the add-context Speed menu"
    read_fake_asar_file "${archive_path}" "webview/assets/use-model-settings-ldiRRtPt.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/sidebar-CxBol07n.js" | grep -q 'j=!1'; then
    echo "expected 26.417 apply to remove the Plugins sidebar api-key gate"
    read_fake_asar_file "${archive_path}" "webview/assets/sidebar-CxBol07n.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/sidebar-CxBol07n.js" | grep -Eq 'j=!1,M=D([,;])'; then
    echo "expected 26.417 apply to expose the Plugins nav label for api-key users"
    read_fake_asar_file "${archive_path}" "webview/assets/sidebar-CxBol07n.js"
    exit 1
  fi
}

assert_guarded_state_26417() {
  local archive_path="$1"
  local context="$2"

  if ! read_fake_asar_file "${archive_path}" "webview/assets/general-settings-D2eks1ok.js" | grep -q 'if(!n)return null;'; then
    echo "expected ${context} to preserve the 26.417 guarded Speed settings state"
    read_fake_asar_file "${archive_path}" "webview/assets/general-settings-D2eks1ok.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index-CxBol07n.js" | grep -q 'enabled:n'; then
    echo "expected ${context} to preserve the 26.417 guarded Fast slash command state"
    read_fake_asar_file "${archive_path}" "webview/assets/index-CxBol07n.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/use-model-settings-ldiRRtPt.js" | grep -q 'D=cr()'; then
    echo "expected ${context} to preserve the 26.417 guarded add-context Speed menu state"
    read_fake_asar_file "${archive_path}" "webview/assets/use-model-settings-ldiRRtPt.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/sidebar-CxBol07n.js" | grep -q 'j=O&&A'; then
    echo "expected ${context} to preserve the 26.417 guarded Plugins sidebar state"
    read_fake_asar_file "${archive_path}" "webview/assets/sidebar-CxBol07n.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/sidebar-CxBol07n.js" | grep -q 'M=D&&!A'; then
    echo "expected ${context} to preserve the 26.417 guarded Plugins nav label state"
    read_fake_asar_file "${archive_path}" "webview/assets/sidebar-CxBol07n.js"
    exit 1
  fi
}

assert_apply_state_26422() {
  local archive_path="$1"

  if ! read_fake_asar_file "${archive_path}" "webview/assets/general-settings-CnVD4YyB.js" | grep -q 'let a;'; then
    echo "expected 26.422 apply to remove the guarded Speed settings return"
    read_fake_asar_file "${archive_path}" "webview/assets/general-settings-CnVD4YyB.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js" | grep -q 'enabled:!0'; then
    echo "expected 26.422 apply to enable the Fast slash command"
    read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js" | grep -q 'g=!0'; then
    echo "expected 26.422 apply to enable the composer Intelligence Speed menu"
    read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js" | grep -q 'A=!1'; then
    echo "expected 26.422 apply to remove the Plugins sidebar api-key gate"
    read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js" | grep -q 'ee=Ha({hostId:me})[,;]'; then
    echo "expected 26.422 apply to expose the Plugins nav label for api-key users"
    read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js"
    exit 1
  fi
}

assert_guarded_state_26422() {
  local archive_path="$1"
  local context="$2"

  if ! read_fake_asar_file "${archive_path}" "webview/assets/general-settings-CnVD4YyB.js" | grep -q 'if(!n)return null;'; then
    echo "expected ${context} to preserve the 26.422 guarded Speed settings state"
    read_fake_asar_file "${archive_path}" "webview/assets/general-settings-CnVD4YyB.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js" | grep -q 'enabled:n'; then
    echo "expected ${context} to preserve the 26.422 guarded Fast slash command state"
    read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js" | grep -q 'g=_f()'; then
    echo "expected ${context} to preserve the 26.422 guarded composer Intelligence Speed menu state"
    read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js" | grep -q 'A=O&&k'; then
    echo "expected ${context} to preserve the 26.422 guarded Plugins sidebar state"
    read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js"
    exit 1
  fi

  if ! read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js" | grep -q 'ee=Ha({hostId:me})&&!k'; then
    echo "expected ${context} to preserve the 26.422 guarded Plugins nav label state"
    read_fake_asar_file "${archive_path}" "webview/assets/index-gATb9Tvd.js"
    exit 1
  fi
}

FAKE_APP_EXISTING="${TMP_DIR}/Existing.app"
FAKE_RESOURCES_EXISTING="${FAKE_APP_EXISTING}/Contents/Resources"
OUTPUT_EXISTING_APPLY="${TMP_DIR}/apply-output.txt"
OUTPUT_EXISTING_RESTORE="${TMP_DIR}/restore-output.txt"

prepare_archived_fake_app "${FAKE_APP_EXISTING}" "${TMP_DIR}/existing-assets"

run_script "${FAKE_APP_EXISTING}" '2\n\nq\n' "${OUTPUT_EXISTING_APPLY}"
assert_codesign_calls 1 "${OUTPUT_EXISTING_APPLY}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_EXISTING}" "${OUTPUT_EXISTING_APPLY}"
assert_fake_asar_js_parses "${FAKE_RESOURCES_EXISTING}/app.asar"

if [ ! -f "${FAKE_RESOURCES_EXISTING}/app.asar1" ]; then
  echo "expected archive backup to be created on apply"
  cat "${OUTPUT_EXISTING_APPLY}"
  exit 1
fi

assert_apply_state "${FAKE_RESOURCES_EXISTING}/app.asar"

run_script "${FAKE_APP_EXISTING}" '3\n\nq\n' "${OUTPUT_EXISTING_RESTORE}"
assert_codesign_calls 2 "${OUTPUT_EXISTING_RESTORE}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_EXISTING}" "${OUTPUT_EXISTING_RESTORE}"
assert_fake_asar_js_parses "${FAKE_RESOURCES_EXISTING}/app.asar"

assert_guarded_state "${FAKE_RESOURCES_EXISTING}/app.asar" "restore"

if [ "$(read_info_plist_hash "${FAKE_APP_EXISTING}")" != "$(read_fake_asar_header_hash "${FAKE_RESOURCES_EXISTING}/app.asar")" ]; then
  echo "expected ElectronAsarIntegrity hash to match restored app.asar header"
  cat "${FAKE_APP_EXISTING}/Contents/Info.plist"
  exit 1
fi

rm -f "${MARKER_FILE}"

FAKE_APP_26417="${TMP_DIR}/Supported26417.app"
FAKE_RESOURCES_26417="${FAKE_APP_26417}/Contents/Resources"
OUTPUT_26417_APPLY="${TMP_DIR}/apply-26417-output.txt"
OUTPUT_26417_RESTORE="${TMP_DIR}/restore-26417-output.txt"

prepare_archived_fake_app "${FAKE_APP_26417}" "${TMP_DIR}/supported-26417-assets" "26.417.41555" "1858" "26417"

run_script "${FAKE_APP_26417}" '2\n\nq\n' "${OUTPUT_26417_APPLY}"
assert_codesign_calls 1 "${OUTPUT_26417_APPLY}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_26417}" "${OUTPUT_26417_APPLY}"
assert_fake_asar_js_parses "${FAKE_RESOURCES_26417}/app.asar"
assert_apply_state_26417 "${FAKE_RESOURCES_26417}/app.asar"

run_script "${FAKE_APP_26417}" '3\n\nq\n' "${OUTPUT_26417_RESTORE}"
assert_codesign_calls 2 "${OUTPUT_26417_RESTORE}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_26417}" "${OUTPUT_26417_RESTORE}"
assert_fake_asar_js_parses "${FAKE_RESOURCES_26417}/app.asar"
assert_guarded_state_26417 "${FAKE_RESOURCES_26417}/app.asar" "26.417 restore"

if [ "$(read_info_plist_hash "${FAKE_APP_26417}")" != "$(read_fake_asar_header_hash "${FAKE_RESOURCES_26417}/app.asar")" ]; then
  echo "expected ElectronAsarIntegrity hash to match restored 26.417 app.asar header"
  cat "${FAKE_APP_26417}/Contents/Info.plist"
  exit 1
fi

rm -f "${MARKER_FILE}"

FAKE_APP_26417_PARTIAL="${TMP_DIR}/Supported26417Partial.app"
FAKE_RESOURCES_26417_PARTIAL="${FAKE_APP_26417_PARTIAL}/Contents/Resources"
OUTPUT_26417_PARTIAL_APPLY="${TMP_DIR}/apply-26417-partial-output.txt"

prepare_archived_fake_app "${FAKE_APP_26417_PARTIAL}" "${TMP_DIR}/supported-26417-partial-assets" "26.417.41555" "1858" "26417-partial"

run_script "${FAKE_APP_26417_PARTIAL}" '2\n\nq\n' "${OUTPUT_26417_PARTIAL_APPLY}"
assert_codesign_calls 1 "${OUTPUT_26417_PARTIAL_APPLY}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_26417_PARTIAL}" "${OUTPUT_26417_PARTIAL_APPLY}"
assert_fake_asar_js_parses "${FAKE_RESOURCES_26417_PARTIAL}/app.asar"
assert_apply_state_26417 "${FAKE_RESOURCES_26417_PARTIAL}/app.asar"

rm -f "${MARKER_FILE}"

FAKE_APP_26422="${TMP_DIR}/Supported26422.app"
FAKE_RESOURCES_26422="${FAKE_APP_26422}/Contents/Resources"
OUTPUT_26422_APPLY="${TMP_DIR}/apply-26422-output.txt"
OUTPUT_26422_RESTORE="${TMP_DIR}/restore-26422-output.txt"

prepare_archived_fake_app "${FAKE_APP_26422}" "${TMP_DIR}/supported-26422-assets" "26.422.21637" "2056" "26422"

run_script "${FAKE_APP_26422}" '2\n\nq\n' "${OUTPUT_26422_APPLY}"
assert_codesign_calls 1 "${OUTPUT_26422_APPLY}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_26422}" "${OUTPUT_26422_APPLY}"
assert_fake_asar_js_parses "${FAKE_RESOURCES_26422}/app.asar"
assert_apply_state_26422 "${FAKE_RESOURCES_26422}/app.asar"

run_script "${FAKE_APP_26422}" '3\n\nq\n' "${OUTPUT_26422_RESTORE}"
assert_codesign_calls 2 "${OUTPUT_26422_RESTORE}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_26422}" "${OUTPUT_26422_RESTORE}"
assert_fake_asar_js_parses "${FAKE_RESOURCES_26422}/app.asar"
assert_guarded_state_26422 "${FAKE_RESOURCES_26422}/app.asar" "26.422 restore"

if [ "$(read_info_plist_hash "${FAKE_APP_26422}")" != "$(read_fake_asar_header_hash "${FAKE_RESOURCES_26422}/app.asar")" ]; then
  echo "expected ElectronAsarIntegrity hash to match restored 26.422 app.asar header"
  cat "${FAKE_APP_26422}/Contents/Info.plist"
  exit 1
fi

rm -f "${MARKER_FILE}"

FAKE_APP_LEGACY="${TMP_DIR}/Legacy.app"
FAKE_RESOURCES_LEGACY="${FAKE_APP_LEGACY}/Contents/Resources"
FAKE_APP_DIR_LEGACY="${FAKE_RESOURCES_LEGACY}/app/webview/assets"
OUTPUT_LEGACY="${TMP_DIR}/legacy-output.txt"

prepare_legacy_fake_app "${FAKE_APP_LEGACY}" "${TMP_DIR}/legacy-unpacked-assets" "${TMP_DIR}/legacy-assets" "legacy-placeholder-hash"

run_script "${FAKE_APP_LEGACY}" '1\n\nq\n' "${OUTPUT_LEGACY}"
assert_codesign_calls 1 "${OUTPUT_LEGACY}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_LEGACY}" "${OUTPUT_LEGACY}"
assert_fake_asar_js_parses "${FAKE_RESOURCES_LEGACY}/app.asar"

if [ ! -f "${FAKE_RESOURCES_LEGACY}/app.asar" ]; then
  echo "expected legacy unpacked layout to be repacked into app.asar"
  cat "${OUTPUT_LEGACY}"
  exit 1
fi

assert_guarded_state "${FAKE_RESOURCES_LEGACY}/app.asar" "legacy repack"

if [ "$(read_info_plist_hash "${FAKE_APP_LEGACY}")" != "$(read_fake_asar_header_hash "${FAKE_RESOURCES_LEGACY}/app.asar")" ]; then
  echo "expected ElectronAsarIntegrity hash to match migrated app.asar header"
  cat "${FAKE_APP_LEGACY}/Contents/Info.plist"
  exit 1
fi

rm -f "${MARKER_FILE}"

FAKE_APP_UNSUPPORTED="${TMP_DIR}/Unsupported.app"
FAKE_RESOURCES_UNSUPPORTED="${FAKE_APP_UNSUPPORTED}/Contents/Resources"
OUTPUT_UNSUPPORTED="${TMP_DIR}/unsupported-output.txt"

prepare_archived_fake_app "${FAKE_APP_UNSUPPORTED}" "${TMP_DIR}/unsupported-assets" "99.0.0" "9999"

run_script_expect_failure "${FAKE_APP_UNSUPPORTED}" '2\n\nq\n' "${OUTPUT_UNSUPPORTED}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_UNSUPPORTED}" "${OUTPUT_UNSUPPORTED}"

if grep -q 'Running local ad-hoc re-sign' "${OUTPUT_UNSUPPORTED}"; then
  echo "expected unsupported versions to be blocked before re-signing"
  cat "${OUTPUT_UNSUPPORTED}"
  exit 1
fi

if [ -f "${FAKE_RESOURCES_UNSUPPORTED}/app.asar1" ]; then
  echo "expected unsupported versions to be blocked before creating app.asar1"
  cat "${OUTPUT_UNSUPPORTED}"
  exit 1
fi

if ! grep -q 'Compatibility: unsupported' "${OUTPUT_UNSUPPORTED}"; then
  echo "expected unsupported compatibility status in output"
  cat "${OUTPUT_UNSUPPORTED}"
  exit 1
fi

if ! grep -q 'Enable custom API features is blocked for this Codex.app version.' "${OUTPUT_UNSUPPORTED}"; then
  echo "expected apply to be blocked for unsupported versions"
  cat "${OUTPUT_UNSUPPORTED}"
  exit 1
fi

if ! read_fake_asar_file "${FAKE_RESOURCES_UNSUPPORTED}/app.asar" | grep -q 'if(!x)return null;'; then
  echo "expected unsupported version to leave app.asar unchanged"
  read_fake_asar_file "${FAKE_RESOURCES_UNSUPPORTED}/app.asar"
  exit 1
fi

rm -f "${MARKER_FILE}"

FAKE_APP_FAILING="${TMP_DIR}/Failing.app"
FAKE_RESOURCES_FAILING="${FAKE_APP_FAILING}/Contents/Resources"
OUTPUT_FAILING="${TMP_DIR}/failing-output.txt"

prepare_archived_fake_app "${FAKE_APP_FAILING}" "${TMP_DIR}/failing-assets"

run_script_with_codesign_failure "${FAKE_APP_FAILING}" '2\n\nq\n' "${OUTPUT_FAILING}"
assert_no_persistent_unpack_dir "${FAKE_RESOURCES_FAILING}" "${OUTPUT_FAILING}"
assert_fake_asar_js_parses "${FAKE_RESOURCES_FAILING}/app.asar"

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
