import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const MAIN_PROCESS_AUTOMATIC_UPDATE_SIGNATURE =
  /let ([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\(\);\1>0&&setInterval\(d,\1\)\.unref\(\),d\(\)/;
const MAIN_PROCESS_AUTOMATIC_DOWNLOAD_GATE_SIGNATURE =
  /this\.setAutomaticBackgroundDownloadsEnabledForMac=([A-Za-z_$][\w$]*)=>\{([A-Za-z_$][\w$]*\.setAutomaticBackgroundDownloadsEnabled\(\1\)),\1&&d\(\)\},this\.updater=/;
const MAIN_PROCESS_FORCED_UPDATE_SCHEDULE_SIGNATURE =
  /scheduleForcedUpdateInstall\(\)\{this\.forcedUpdateTimer&&=\(clearTimeout\(this\.forcedUpdateTimer\),null\);/;
const MAIN_PROCESS_SETTINGS_SCHEMA_SIGNATURE =
  /(preventSleepWhileRunning:([A-Za-z_$][\w$]*)\(\{agentAccess:`read-write`,default:!1,description:`Whether the machine stays awake while Codex is running`,key:`preventSleepWhileRunning`,schema:([A-Za-z_$][\w$]*)\}\),)/;
const MAIN_PROCESS_SETTINGS_SCHEMA_REPLACEMENT =
  "$1disableAutomaticUpdates:$2({agentAccess:`read-write`,default:!1,description:`Whether automatic update checks and forced installs are disabled`,key:`disableAutomaticUpdates`,schema:$3}),";
const MAIN_PROCESS_AUTOMATIC_UPDATE_READER_EXPRESSION =
  "t=>{let n=null,r=null,i=``;for(let a of t.split(/\\r?\\n/)){let t=a,o=null,s=!1,c=!1;for(let n=0;n<t.length;n++){let r=t[n];if(c){c=!1;continue}if(r===`\\\\`&&o!=null){c=!0;continue}if((r===`\\\"`||r===`'`)&&(o==null||o===r)){o=o==null?r:null;continue}if(r===`#`&&o==null){t=t.slice(0,n);break}}let l=t.trim();if(!l)continue;let u=/^\\[([^\\[\\]]+)\\]$/.exec(l);if(u){i=u[1].trim();continue}let d=/^disableAutomaticUpdates\\s*=\\s*(true|false)\\s*$/.exec(l);if(!d)continue;i===`desktop`?n=d[1]===`true`:i===``&&r==null&&(r=d[1]===`true`)}return n??r??!1}";
const MAIN_PROCESS_AUTOMATIC_UPDATE_READER =
  `codexfastReadDisableAutomaticUpdates=${MAIN_PROCESS_AUTOMATIC_UPDATE_READER_EXPRESSION}`;
const MAIN_PROCESS_AUTOMATIC_UPDATE_DISABLED_CHECK =
  `()=>{try{let e=require(\`node:path\`),t=require(\`node:fs\`).readFileSync(e.join(process.env.CODEX_HOME||e.join(require(\`node:os\`).homedir(),\`.codex\`),\`config.toml\`),\`utf8\`);return (${MAIN_PROCESS_AUTOMATIC_UPDATE_READER_EXPRESSION})(t)}catch{return!1}}`;
const MAIN_PROCESS_FORCED_UPDATE_SCHEDULE_REPLACEMENT =
  `scheduleForcedUpdateInstall(){if((${MAIN_PROCESS_AUTOMATIC_UPDATE_DISABLED_CHECK})()){this.forcedUpdateTimer&&=(clearTimeout(this.forcedUpdateTimer),null),this.setRelaunchNotice(null);return}this.forcedUpdateTimer&&=(clearTimeout(this.forcedUpdateTimer),null);`;

function stripTomlComment(line: string): string {
  let quote: string | null = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && quote !== null) {
      escaped = true;
      continue;
    }
    if ((char === '"' || char === "'") && (quote === null || quote === char)) {
      quote = quote === null ? char : null;
      continue;
    }
    if (char === "#" && quote === null) {
      return line.slice(0, index);
    }
  }
  return line;
}

export function isAutomaticUpdatesDisabledInConfigContent(content: string): boolean {
  let currentTable = "";
  let legacyValue: boolean | null = null;
  let desktopValue: boolean | null = null;

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = stripTomlComment(rawLine).trim();
    if (!line) {
      continue;
    }

    const tableMatch = /^\[([^\[\]]+)\]$/u.exec(line);
    if (tableMatch) {
      currentTable = tableMatch[1].trim();
      continue;
    }

    const match = /^disableAutomaticUpdates\s*=\s*(true|false)\s*$/u.exec(line);
    if (match) {
      const value = match[1] === "true";
      if (currentTable === "desktop") {
        desktopValue = value;
      } else if (currentTable === "" && legacyValue === null) {
        legacyValue = value;
      }
    }
  }
  return desktopValue ?? legacyValue ?? false;
}

export function resolveCodexHome(env: NodeJS.ProcessEnv = process.env): string | null {
  const configuredHome = env.CODEX_HOME?.trim();
  if (configuredHome) {
    return configuredHome;
  }
  const home = env.HOME?.trim() || homedir();
  return home ? join(home, ".codex") : null;
}

export function isAutomaticUpdatesDisabledInConfig(env: NodeJS.ProcessEnv = process.env): boolean {
  const codexHome = resolveCodexHome(env);
  if (!codexHome) {
    return false;
  }
  const configPath = join(codexHome, "config.toml");
  if (!existsSync(configPath)) {
    return false;
  }
  try {
    return isAutomaticUpdatesDisabledInConfigContent(readFileSync(configPath, "utf8"));
  } catch {
    return false;
  }
}

export function patchMainProcessAutomaticUpdateSource(source: string): string {
  const patchedSource = source.replace(
    MAIN_PROCESS_AUTOMATIC_UPDATE_SIGNATURE,
    (_match, intervalVar: string, readIntervalVar: string) =>
      `let ${intervalVar}=${readIntervalVar}(),${MAIN_PROCESS_AUTOMATIC_UPDATE_READER},codexfastAutomaticUpdatesDisabled=${MAIN_PROCESS_AUTOMATIC_UPDATE_DISABLED_CHECK},codexfastAutomaticUpdateCheck=()=>{if(codexfastAutomaticUpdatesDisabled())return;d()};${intervalVar}>0&&setInterval(codexfastAutomaticUpdateCheck,${intervalVar}).unref(),codexfastAutomaticUpdateCheck()`,
  );
  if (patchedSource === source) {
    return source;
  }
  const patchedAutomaticDownloadGate = patchedSource.replace(
    MAIN_PROCESS_AUTOMATIC_DOWNLOAD_GATE_SIGNATURE,
    (
      _match,
      enabledVar: string,
      setAutomaticBackgroundDownloadsEnabledCall: string,
    ) =>
      `this.setAutomaticBackgroundDownloadsEnabledForMac=${enabledVar}=>{${setAutomaticBackgroundDownloadsEnabledCall},${enabledVar}&&codexfastAutomaticUpdateCheck()},this.updater=`,
  );
  return patchedAutomaticDownloadGate.replace(
    MAIN_PROCESS_FORCED_UPDATE_SCHEDULE_SIGNATURE,
    MAIN_PROCESS_FORCED_UPDATE_SCHEDULE_REPLACEMENT,
  );
}

export function patchMainProcessSettingsSchemaSource(source: string): string {
  return source.replace(
    MAIN_PROCESS_SETTINGS_SCHEMA_SIGNATURE,
    MAIN_PROCESS_SETTINGS_SCHEMA_REPLACEMENT,
  );
}

export function createMainProcessAutomaticUpdateHookSource(): string {
  return [
    "\"use strict\";",
    "const Module = require(\"node:module\");",
    "const fs = require(\"node:fs\");",
    "const originalJsLoader = Module._extensions[\".js\"];",
    "const automaticUpdateSignature = /let ([A-Za-z_$][\\w$]*)=([A-Za-z_$][\\w$]*)\\(\\);\\1>0&&setInterval\\(d,\\1\\)\\.unref\\(\\),d\\(\\)/;",
    "const automaticDownloadGateSignature = /this\\.setAutomaticBackgroundDownloadsEnabledForMac=([A-Za-z_$][\\w$]*)=>\\{([A-Za-z_$][\\w$]*\\.setAutomaticBackgroundDownloadsEnabled\\(\\1\\)),\\1&&d\\(\\)\\},this\\.updater=/;",
    "const forcedUpdateScheduleSignature = /scheduleForcedUpdateInstall\\(\\)\\{this\\.forcedUpdateTimer&&=\\(clearTimeout\\(this\\.forcedUpdateTimer\\),null\\);/;",
    `const automaticUpdateReader = ${JSON.stringify(MAIN_PROCESS_AUTOMATIC_UPDATE_READER)};`,
    `const automaticUpdateDisabledCheck = ${JSON.stringify(MAIN_PROCESS_AUTOMATIC_UPDATE_DISABLED_CHECK)};`,
    `const forcedUpdateScheduleReplacement = ${JSON.stringify(MAIN_PROCESS_FORCED_UPDATE_SCHEDULE_REPLACEMENT)};`,
    "function automaticUpdateReplacement(_match, intervalVar, readIntervalVar) {",
    "  return `let ${intervalVar}=${readIntervalVar}(),${automaticUpdateReader},codexfastAutomaticUpdatesDisabled=${automaticUpdateDisabledCheck},codexfastAutomaticUpdateCheck=()=>{if(codexfastAutomaticUpdatesDisabled())return;d()};${intervalVar}>0&&setInterval(codexfastAutomaticUpdateCheck,${intervalVar}).unref(),codexfastAutomaticUpdateCheck()`;",
    "}",
    "function automaticDownloadGateReplacement(_match, enabledVar, setAutomaticBackgroundDownloadsEnabledCall) {",
    "  return `this.setAutomaticBackgroundDownloadsEnabledForMac=${enabledVar}=>{${setAutomaticBackgroundDownloadsEnabledCall},${enabledVar}&&codexfastAutomaticUpdateCheck()},this.updater=`;",
    "}",
    "const settingsSchemaSignature = /(preventSleepWhileRunning:([A-Za-z_$][\\w$]*)\\(\\{agentAccess:`read-write`,default:!1,description:`Whether the machine stays awake while Codex is running`,key:`preventSleepWhileRunning`,schema:([A-Za-z_$][\\w$]*)\\}\\),)/;",
    "const settingsSchemaReplacement = \"$1disableAutomaticUpdates:$2({agentAccess:`read-write`,default:!1,description:`Whether automatic update checks and forced installs are disabled`,key:`disableAutomaticUpdates`,schema:$3}),\";",
    "const settingsSchemaFilePattern = /[\\\\/]\\.vite[\\\\/]build[\\\\/]src-[^\\\\/]+\\.js$/;",
    "const automaticUpdateFilePattern = /[\\\\/]\\.vite[\\\\/]build[\\\\/]workspace-root-drop-handler-[^\\\\/]+\\.js$/;",
    "Module._extensions[\".js\"] = function codexfastMainProcessHook(module, filename) {",
    "  const shouldPatchSettingsSchema = settingsSchemaFilePattern.test(filename);",
    "  const shouldPatchAutomaticUpdates = automaticUpdateFilePattern.test(filename);",
    "  if (shouldPatchSettingsSchema || shouldPatchAutomaticUpdates) {",
    "    const source = fs.readFileSync(filename, \"utf8\");",
    "    let patchedSource = source;",
    "    if (shouldPatchSettingsSchema) patchedSource = patchedSource.replace(settingsSchemaSignature, settingsSchemaReplacement);",
    "    if (shouldPatchAutomaticUpdates) {",
    "      const nextSource = patchedSource.replace(automaticUpdateSignature, automaticUpdateReplacement);",
    "      patchedSource = nextSource === patchedSource ? nextSource : nextSource.replace(automaticDownloadGateSignature, automaticDownloadGateReplacement).replace(forcedUpdateScheduleSignature, forcedUpdateScheduleReplacement);",
    "    }",
    "    module._compile(patchedSource, filename);",
    "    return;",
    "  }",
    "  return originalJsLoader(module, filename);",
    "};",
    "",
  ].join("\n");
}

export function writeMainProcessAutomaticUpdateHook(codexHome: string): string {
  const hookPath = join(codexHome, ".tmp", "codexfast", "main-process-hook.cjs");
  mkdirSync(dirname(hookPath), { recursive: true });
  writeFileSync(hookPath, createMainProcessAutomaticUpdateHookSource(), "utf8");
  return hookPath;
}

function formatNodeRequireOption(modulePath: string): string {
  const escapedPath = modulePath
    .replace(/\\/gu, "\\\\")
    .replace(/"/gu, "\\\"");
  return `--require="${escapedPath}"`;
}

export function childEnvWithAutomaticUpdateSetting(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const codexHome = resolveCodexHome(env);
  if (!codexHome) {
    return env;
  }
  const hookPath = writeMainProcessAutomaticUpdateHook(codexHome);
  const nodeOptions = env.NODE_OPTIONS?.trim();
  return {
    ...env,
    NODE_OPTIONS: [
      nodeOptions || null,
      formatNodeRequireOption(hookPath),
    ].filter((value): value is string => value != null && value.length > 0).join(" "),
  };
}
