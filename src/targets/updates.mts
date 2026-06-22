import { defineTargetSpecs } from "./builders.mts";

const SETTINGS_SCHEMA_NEEDLE = "preventSleepWhileRunning";
const GENERAL_SETTINGS_NEEDLE = "settings.general.power.preventSleepWhileRunning.description";

const SETTINGS_SCHEMA_GUARDED_SIGNATURE =
  /(preventSleepWhileRunning:([A-Za-z_$][\w$]*)\(\{agentAccess:`read-write`,default:!1,description:`Whether the machine stays awake while Codex is running`,key:`preventSleepWhileRunning`,schema:([A-Za-z_$][\w$]*)\}\),)/;
const SETTINGS_SCHEMA_PATCHED_SIGNATURE =
  /disableAutomaticUpdates:[A-Za-z_$][\w$]*\(\{agentAccess:`read-write`,default:!1,description:`Whether background automatic update checks are disabled`,key:`disableAutomaticUpdates`,schema:[A-Za-z_$][\w$]*\}\)/;

const GENERAL_SETTINGS_GUARDED_SIGNATURE =
  /function Kr\(\)\{let e=\(0,\$\.c\)\(10\),t=a\(s\),\{platform:n\}=Ee\(\),r=n!==`windows`,i=N\(\),o=z\(j\.preventSleepWhileRunning\);if\(!r\)return null;let c,l;e\[0\]===Symbol\.for\(`react\.memo_cache_sentinel`\)\?\(c=\(0,Z\.jsx\)\(P,\{\.\.\.G\.preventSleepWhileRunning\}\),l=\(0,Z\.jsx\)\(P,\{id:`settings\.general\.power\.preventSleepWhileRunning\.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`\}\),e\[0\]=c,e\[1\]=l\):\(c=e\[0\],l=e\[1\]\);let u=o\?\?!1,d;e\[2\]===t\?d=e\[3\]:\(d=e=>\{B\(t,j\.preventSleepWhileRunning,e\)\},e\[2\]=t,e\[3\]=d\);let f;e\[4\]===i\?f=e\[5\]:\(f=i\.formatMessage\(G\.preventSleepWhileRunning\),e\[4\]=i,e\[5\]=f\);let p;return e\[6\]!==u\|\|e\[7\]!==d\|\|e\[8\]!==f\?\(p=\(0,Z\.jsx\)\(J,\{label:c,description:l,control:\(0,Z\.jsx\)\(q,\{checked:u,onChange:d,ariaLabel:f\}\)\}\),e\[6\]=u,e\[7\]=d,e\[8\]=f,e\[9\]=p\):p=e\[9\],p\}/;
const GENERAL_SETTINGS_PATCHED_SIGNATURE =
  /defaultMessage:`Disable automatic updates`[^]*?B\(t,j\.disableAutomaticUpdates,e\)/;

const GENERAL_SETTINGS_REPLACEMENT =
  "function Kr(){let e=(0,$.c)(20),t=a(s),{platform:n}=Ee(),r=n!==`windows`,i=N(),o=z(j.preventSleepWhileRunning),codexfastDisableAutomaticUpdates=z(j.disableAutomaticUpdates);if(!r)return null;let c,l;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,Z.jsx)(P,{...G.preventSleepWhileRunning}),l=(0,Z.jsx)(P,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`}),e[0]=c,e[1]=l):(c=e[0],l=e[1]);let u=o??!1,d;e[2]===t?d=e[3]:(d=e=>{B(t,j.preventSleepWhileRunning,e)},e[2]=t,e[3]=d);let f;e[4]===i?f=e[5]:(f=i.formatMessage(G.preventSleepWhileRunning),e[4]=i,e[5]=f);let p;e[6]!==u||e[7]!==d||e[8]!==f?(p=(0,Z.jsx)(J,{label:c,description:l,control:(0,Z.jsx)(q,{checked:u,onChange:d,ariaLabel:f})}),e[6]=u,e[7]=d,e[8]=f,e[9]=p):p=e[9];let codexfastUpdateLabel,codexfastUpdateDescription,codexfastUpdateAria;e[10]===Symbol.for(`react.memo_cache_sentinel`)?(codexfastUpdateLabel=(0,Z.jsx)(P,{id:`settings.general.updates.disableAutomaticUpdates.label`,defaultMessage:`Disable automatic updates`,description:`Label for disabling background automatic updates`}),codexfastUpdateDescription=(0,Z.jsx)(P,{id:`settings.general.updates.disableAutomaticUpdates.description`,defaultMessage:`Stop background update checks the next time Codex is launched with codexfast. Manual Check for Updates remains available.`,description:`Description for disabling background automatic updates`}),e[10]=codexfastUpdateLabel,e[11]=codexfastUpdateDescription):(codexfastUpdateLabel=e[10],codexfastUpdateDescription=e[11]);let codexfastUpdateChecked=codexfastDisableAutomaticUpdates??!1,codexfastUpdateOnChange;e[12]===t?codexfastUpdateOnChange=e[13]:(codexfastUpdateOnChange=e=>{B(t,j.disableAutomaticUpdates,e)},e[12]=t,e[13]=codexfastUpdateOnChange);e[14]===i?codexfastUpdateAria=e[15]:(codexfastUpdateAria=i.formatMessage({id:`settings.general.updates.disableAutomaticUpdates.label`,defaultMessage:`Disable automatic updates`,description:`Label for disabling background automatic updates`}),e[14]=i,e[15]=codexfastUpdateAria);let codexfastUpdateRow;return e[16]!==codexfastUpdateChecked||e[17]!==codexfastUpdateOnChange||e[18]!==codexfastUpdateAria?(codexfastUpdateRow=(0,Z.jsx)(J,{label:codexfastUpdateLabel,description:codexfastUpdateDescription,control:(0,Z.jsx)(q,{checked:codexfastUpdateChecked,onChange:codexfastUpdateOnChange,ariaLabel:codexfastUpdateAria})}),e[16]=codexfastUpdateChecked,e[17]=codexfastUpdateOnChange,e[18]=codexfastUpdateAria,e[19]=codexfastUpdateRow):codexfastUpdateRow=e[19],(0,Z.jsxs)(Z.Fragment,{children:[p,codexfastUpdateRow]})}";

export const UPDATE_TARGET_SPECS = defineTargetSpecs(
  {
    id: "disable-automatic-updates-schema",
    label: "Disable automatic updates schema",
    needle: SETTINGS_SCHEMA_NEEDLE,
    guardedSignature: SETTINGS_SCHEMA_GUARDED_SIGNATURE,
    patchedSignature: SETTINGS_SCHEMA_PATCHED_SIGNATURE,
    applyReplacement:
      "$1disableAutomaticUpdates:$2({agentAccess:`read-write`,default:!1,description:`Whether background automatic update checks are disabled`,key:`disableAutomaticUpdates`,schema:$3}),",
  },
  {
    id: "disable-automatic-updates-setting",
    label: "Disable automatic updates setting",
    needle: GENERAL_SETTINGS_NEEDLE,
    guardedSignature: GENERAL_SETTINGS_GUARDED_SIGNATURE,
    patchedSignature: GENERAL_SETTINGS_PATCHED_SIGNATURE,
    applyReplacement: GENERAL_SETTINGS_REPLACEMENT,
  },
);
