import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const DISABLE_AUTOMATIC_UPDATES_ENV = "CODEXFAST_DISABLE_AUTOMATIC_UPDATES";
const MAIN_PROCESS_AUTOMATIC_UPDATE_SIGNATURE =
  "let f=JB();f>0&&setInterval(d,f).unref(),d()";
const MAIN_PROCESS_AUTOMATIC_UPDATE_REPLACEMENT =
  "let f=JB();process.env.CODEXFAST_DISABLE_AUTOMATIC_UPDATES!==`1`&&(f>0&&setInterval(d,f).unref(),d())";
const MAIN_PROCESS_SETTINGS_SCHEMA_SIGNATURE =
  /(preventSleepWhileRunning:([A-Za-z_$][\w$]*)\(\{agentAccess:`read-write`,default:!1,description:`Whether the machine stays awake while Codex is running`,key:`preventSleepWhileRunning`,schema:([A-Za-z_$][\w$]*)\}\),)/;
const MAIN_PROCESS_SETTINGS_SCHEMA_REPLACEMENT =
  "$1disableAutomaticUpdates:$2({agentAccess:`read-write`,default:!1,description:`Whether background automatic update checks are disabled`,key:`disableAutomaticUpdates`,schema:$3}),";

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
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = stripTomlComment(rawLine).trim();
    const match = /^disableAutomaticUpdates\s*=\s*(true|false)\s*$/u.exec(line);
    if (match) {
      return match[1] === "true";
    }
  }
  return false;
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
  return source.replace(
    MAIN_PROCESS_AUTOMATIC_UPDATE_SIGNATURE,
    MAIN_PROCESS_AUTOMATIC_UPDATE_REPLACEMENT,
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
    "const automaticUpdateSignature = \"let f=JB();f>0&&setInterval(d,f).unref(),d()\";",
    "const automaticUpdateReplacement = \"let f=JB();process.env.CODEXFAST_DISABLE_AUTOMATIC_UPDATES!==`1`&&(f>0&&setInterval(d,f).unref(),d())\";",
    "const settingsSchemaSignature = /(preventSleepWhileRunning:([A-Za-z_$][\\w$]*)\\(\\{agentAccess:`read-write`,default:!1,description:`Whether the machine stays awake while Codex is running`,key:`preventSleepWhileRunning`,schema:([A-Za-z_$][\\w$]*)\\}\\),)/;",
    "const settingsSchemaReplacement = \"$1disableAutomaticUpdates:$2({agentAccess:`read-write`,default:!1,description:`Whether background automatic update checks are disabled`,key:`disableAutomaticUpdates`,schema:$3}),\";",
    "const settingsSchemaFilePattern = /[\\\\/]\\.vite[\\\\/]build[\\\\/]src-[^\\\\/]+\\.js$/;",
    "const automaticUpdateFilePattern = /[\\\\/]\\.vite[\\\\/]build[\\\\/]workspace-root-drop-handler-[^\\\\/]+\\.js$/;",
    "Module._extensions[\".js\"] = function codexfastMainProcessHook(module, filename) {",
    "  const shouldPatchSettingsSchema = settingsSchemaFilePattern.test(filename);",
    "  const shouldPatchAutomaticUpdates = process.env.CODEXFAST_DISABLE_AUTOMATIC_UPDATES === \"1\" && automaticUpdateFilePattern.test(filename);",
    "  if (shouldPatchSettingsSchema || shouldPatchAutomaticUpdates) {",
    "    const source = fs.readFileSync(filename, \"utf8\");",
    "    let patchedSource = source;",
    "    if (shouldPatchSettingsSchema) patchedSource = patchedSource.replace(settingsSchemaSignature, settingsSchemaReplacement);",
    "    if (shouldPatchAutomaticUpdates) patchedSource = patchedSource.replace(automaticUpdateSignature, automaticUpdateReplacement);",
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
  const automaticUpdatesDisabled = isAutomaticUpdatesDisabledInConfig(env);
  const nodeOptions = env.NODE_OPTIONS?.trim();
  return {
    ...env,
    ...(automaticUpdatesDisabled ? { [DISABLE_AUTOMATIC_UPDATES_ENV]: "1" } : {}),
    NODE_OPTIONS: [
      nodeOptions || null,
      formatNodeRequireOption(hookPath),
    ].filter((value): value is string => value != null && value.length > 0).join(" "),
  };
}
