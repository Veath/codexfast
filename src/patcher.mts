"use strict";

// This module is transpiled to CommonJS by scripts/build-codexfast.mts and
// executed via `node -`, where stdin defaults to CommonJS. Do not import it directly as ESM.
const fs: typeof import("node:fs") = require("fs");
const path: typeof import("node:path") = require("path");

const [, , command, assetsDirArg, backupSuffix, legacyBackupSuffix = "", appVersionKey = "unknown"] = process.argv;
const assetsDir = path.resolve(assetsDirArg);
const backupSuffixes = [backupSuffix, legacyBackupSuffix].filter((suffix, index, suffixes) => suffix && suffixes.indexOf(suffix) === index);
const SPEED_LABEL_NEEDLE = "settings.agent.speed.label";
const SPEED_SLASH_COMMAND_NEEDLE = "composer.speedSlashCommand.title";
const ADD_CONTEXT_SPEED_NEEDLE = "composer.addContext.speed.option.fast.description";
const INTELLIGENCE_SPEED_NEEDLE = "composer.intelligenceDropdown.speed.title";
const PLUGINS_SIDEBAR_NEEDLE = "sidebarElectron.pluginsDisabledTooltip";
const MODEL_LIST_NEEDLE = "\"list-models-for-host\"";
const MODEL_QUERY_NEEDLE = "modelsByType";
const GPT_55_OFFICIAL_MODEL_LIST_MIN_VERSION = "26.422.30944";
const GPT_55_MODEL_ENTRY =
  "{id:`gpt-5.5`,model:`gpt-5.5`,upgrade:null,upgradeInfo:null,availabilityNux:null,displayName:`GPT-5.5`,description:`Frontier model for complex coding, research, and real-world work.`,hidden:!1,supportedReasoningEfforts:[{reasoningEffort:`low`,description:`Fast responses with lighter reasoning`},{reasoningEffort:`medium`,description:`Balances speed and reasoning depth for everyday tasks`},{reasoningEffort:`high`,description:`Greater reasoning depth for complex problems`},{reasoningEffort:`xhigh`,description:`Extra high reasoning depth for complex problems`}],defaultReasoningEffort:`medium`,inputModalities:[`text`],supportsPersonality:!0,additionalSpeedTiers:[`fast`],isDefault:!1}";
const GUARDED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=((?:_e|ae|P)\(\),)(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(?:Ce|se|be)\(\);)if\(!\1\)return null;/;
const PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=!0,(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(Ce|se|be)\(\);)let /;
const NORMALIZED_PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=((?:_e|ae|P)\(\),)(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(?:Ce|se|be)\(\);)let /;
const SLASH_COMMAND_GUARDED_SIGNATURE =
  /(id:`speed`,title:[^,]+,description:[^,]+,requiresEmptyComposer:!1,enabled:)([A-Za-z_$][\w$]*)(,Icon:[^,]+,onSelect:[^,]+,dependencies:[A-Za-z_$][\w$]*})/;
const SLASH_COMMAND_PATCHED_SIGNATURE =
  /(id:`speed`,title:[^,]+,description:[^,]+,requiresEmptyComposer:!1,enabled:)!0(,Icon:[^,]+,onSelect:[^,]+,dependencies:[A-Za-z_$][\w$]*})/;
const ADD_CONTEXT_SPEED_GUARDED_SIGNATURE_OLD =
  /([A-Za-z_$][\w$]*)=Cr\(\),(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ir\([^)]+\)[;,])/;
const ADD_CONTEXT_SPEED_PATCHED_SIGNATURE_OLD =
  /([A-Za-z_$][\w$]*)=!0,(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ir\([^)]+\)[;,])/;
const ADD_CONTEXT_SPEED_GUARDED_SIGNATURE_NEW =
  /([A-Za-z_$][\w$]*)=cr\(\),(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=jr\([^)]+\)[;,])/;
const ADD_CONTEXT_SPEED_PATCHED_SIGNATURE_NEW =
  /([A-Za-z_$][\w$]*)=!0,(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=jr\([^)]+\)[;,])/;
const INTELLIGENCE_SPEED_GUARDED_SIGNATURE =
  /(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Jp\([^)]+\),)([A-Za-z_$][\w$]*)=_f\(\),/;
const INTELLIGENCE_SPEED_PATCHED_SIGNATURE =
  /(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Jp\([^)]+\),)([A-Za-z_$][\w$]*)=!0,/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_OLD =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,[^]*?cf\(`533078438`\),)([A-Za-z_$][\w$]*)=\2===`apikey`,/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_OLD =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,[^]*?cf\(`533078438`\),)([A-Za-z_$][\w$]*)=!1,/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_NEW =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,[^]*?)([A-Za-z_$][\w$]*)=Fs\(\),([A-Za-z_$][\w$]*)=hf\(`533078438`\),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=\4&&\5,([A-Za-z_$][\w$]*)=\3&&!?\5([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_NEW =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,[^]*?)([A-Za-z_$][\w$]*)=Fs\(\),([A-Za-z_$][\w$]*)=hf\(`533078438`\),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=!1,([A-Za-z_$][\w$]*)=\3([,;])/;
const PLUGINS_SIDEBAR_LEGACY_PATCHED_SIGNATURE_NEW =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,[^]*?)([A-Za-z_$][\w$]*)=Fs\(\),([A-Za-z_$][\w$]*)=hf\(`533078438`\),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=!1,([A-Za-z_$][\w$]*)=\3&&!?\5([,;])/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26422 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=(\$f\(`533078438`\)),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=\3&&\5,([^]*?)([A-Za-z_$][\w$]*)=(Ha\(\{hostId:[^}]+\}\))&&!\5([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26422 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=(\$f\(`533078438`\)),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=!1,([^]*?)([A-Za-z_$][\w$]*)=(Ha\(\{hostId:[^}]+\}\))([,;])/;
const PLUGINS_SIDEBAR_LEGACY_PATCHED_SIGNATURE_26422 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=(\$f\(`533078438`\)),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=!1,([^]*?)([A-Za-z_$][\w$]*)=(Ha\(\{hostId:[^}]+\}\))&&!\5([,;])/;
const MODEL_LIST_GUARDED_SIGNATURE =
  /("list-models-for-host":i9\()\(([A-Za-z_$][\w$]*),\{hostId:([A-Za-z_$][\w$]*),\.\.\.([A-Za-z_$][\w$]*)\}\)=>\2\.sendRequest\(`model\/list`,\4\)(\))/;
const MODEL_LIST_PATCHED_SIGNATURE =
  /("list-models-for-host":i9\()async\(([A-Za-z_$][\w$]*),\{hostId:([A-Za-z_$][\w$]*),\.\.\.([A-Za-z_$][\w$]*)\}\)=>\/\*codexfast-gpt55\*\/\{let ([A-Za-z_$][\w$]*)=await \2\.sendRequest\(`model\/list`,\4\);return Array\.isArray\(\5\.data\)&&!\5\.data\.some\(e=>e\.model===`gpt-5\.5`\)\?\{\.\.\.\5,data:\[\.\.\.\5\.data,\{id:`gpt-5\.5`[^]*?isDefault:!1\}\]\}:\5\}(\))/;
const MODEL_QUERY_GUARDED_SIGNATURE =
  /(\}\}\),)([A-Za-z_$][\w$]*)\?\?=([A-Za-z_$][\w$]*)\.models\.find\(e=>e\.model===([A-Za-z_$][\w$]*)\.defaultModel\)\?\?null,\{modelsByType:\3,defaultModel:\2\}/;
const MODEL_QUERY_PATCHED_SIGNATURE =
  /(\}\}\),)\/\*codexfast-gpt55-select\*\/([A-Za-z_$][\w$]*)\.models\.some\(e=>e\.model===`gpt-5\.5`\)\|\|\2\.models\.push\(\{id:`gpt-5\.5`[^]*?isDefault:!1\}\),([A-Za-z_$][\w$]*)\?\?=\2\.models\.find\(e=>e\.model===([A-Za-z_$][\w$]*)\.defaultModel\)\?\?null,\{modelsByType:\2,defaultModel:\3\}/;

type ReplacementCallback = (match: string, ...captures: string[]) => string;
type Replacement = string | ReplacementCallback;

type TargetSpec = {
  id: string;
  label: string;
  needle: string;
  guardedSignature: RegExp;
  patchedSignature: RegExp;
  legacyPatchedSignature: RegExp | null;
  applyReplacement: Replacement;
  normalizeReplacement?: Replacement;
  restoreReplacement?: Replacement;
};

type TargetState = {
  guarded: boolean;
  patched: boolean;
  legacyPatched: boolean;
};

type TargetMatch = TargetState & {
  spec: TargetSpec;
};

type FileTarget = {
  filePath: string;
  backupPath: string;
  backupPaths: string[];
  content: string;
  matches: TargetMatch[];
};

const TARGET_SPECS: TargetSpec[] = [
  {
    id: "speed-setting",
    label: "Speed setting",
    needle: SPEED_LABEL_NEEDLE,
    guardedSignature: GUARDED_SIGNATURE,
    patchedSignature: NORMALIZED_PATCHED_SIGNATURE,
    legacyPatchedSignature: PATCHED_SIGNATURE,
    applyReplacement: "$1=$2$3",
    normalizeReplacement: normalizeLegacySpeedSetting,
    restoreReplacement: restoreSpeedSetting,
  },
  {
    id: "add-context-speed-menu-old",
    label: "Add-context Speed menu",
    needle: ADD_CONTEXT_SPEED_NEEDLE,
    guardedSignature: ADD_CONTEXT_SPEED_GUARDED_SIGNATURE_OLD,
    patchedSignature: ADD_CONTEXT_SPEED_PATCHED_SIGNATURE_OLD,
    legacyPatchedSignature: null,
    applyReplacement: "$1=!0,$2",
    restoreReplacement: "$1=Cr(),$2",
  },
  {
    id: "add-context-speed-menu-new",
    label: "Add-context Speed menu",
    needle: ADD_CONTEXT_SPEED_NEEDLE,
    guardedSignature: ADD_CONTEXT_SPEED_GUARDED_SIGNATURE_NEW,
    patchedSignature: ADD_CONTEXT_SPEED_PATCHED_SIGNATURE_NEW,
    legacyPatchedSignature: null,
    applyReplacement: "$1=!0,$2",
    restoreReplacement: "$1=cr(),$2",
  },
  {
    id: "intelligence-speed-menu",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1$2=!0,",
    restoreReplacement: "$1$2=_f(),",
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
    id: "plugins-access-old",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_OLD,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_OLD,
    legacyPatchedSignature: null,
    applyReplacement: "$1$3=!1,",
    restoreReplacement: "$1$3=$2===`apikey`,",
  },
  {
    id: "plugins-access-new",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_NEW,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_NEW,
    legacyPatchedSignature: PLUGINS_SIDEBAR_LEGACY_PATCHED_SIGNATURE_NEW,
    applyReplacement: "$1$3=Fs(),$4=hf(`533078438`),$5=$2===`apikey`,$6=!1,$7=$3$8",
    normalizeReplacement: "$1$3=Fs(),$4=hf(`533078438`),$5=$2===`apikey`,$6=!1,$7=$3$8",
    restoreReplacement:
      "$1$3=Fs(),$4=hf(`533078438`),$5=$2===`apikey`,$6=$4&&$5,$7=$3&&!$5$8",
  },
  {
    id: "plugins-access-26422",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26422,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26422,
    legacyPatchedSignature: PLUGINS_SIDEBAR_LEGACY_PATCHED_SIGNATURE_26422,
    applyReplacement: "$1$3=$4,$5=$2===`apikey`,$6=!1,$7$8=$9$10",
    normalizeReplacement: "$1$3=$4,$5=$2===`apikey`,$6=!1,$7$8=$9$10",
    restoreReplacement: "$1$3=$4,$5=$2===`apikey`,$6=$3&&$5,$7$8=$9&&!$5$10",
  },
  {
    id: "gpt55-model-list",
    label: "GPT-5.5 model list",
    needle: MODEL_LIST_NEEDLE,
    guardedSignature: MODEL_LIST_GUARDED_SIGNATURE,
    patchedSignature: MODEL_LIST_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: (_match: string, prefix: string, managerVar: string, hostVar: string, paramsVar: string, suffix: string) =>
      `${prefix}async(${managerVar},{hostId:${hostVar},...${paramsVar}})=>/*codexfast-gpt55*/{let r=await ${managerVar}.sendRequest(\`model/list\`,${paramsVar});return Array.isArray(r.data)&&!r.data.some(e=>e.model===\`gpt-5.5\`)?{...r,data:[...r.data,${GPT_55_MODEL_ENTRY}]}:r}${suffix}`,
    restoreReplacement: (_match: string, prefix: string, managerVar: string, hostVar: string, paramsVar: string, _resultVar: string, suffix: string) =>
      `${prefix}(${managerVar},{hostId:${hostVar},...${paramsVar}})=>${managerVar}.sendRequest(\`model/list\`,${paramsVar})${suffix}`,
  },
  {
    id: "gpt55-model-query-selector",
    label: "GPT-5.5 model query selector",
    needle: MODEL_QUERY_NEEDLE,
    guardedSignature: MODEL_QUERY_GUARDED_SIGNATURE,
    patchedSignature: MODEL_QUERY_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: (_match: string, prefix: string, defaultVar: string, modelsByTypeVar: string, configVar: string) =>
      `${prefix}/*codexfast-gpt55-select*/${modelsByTypeVar}.models.some(e=>e.model===\`gpt-5.5\`)||${modelsByTypeVar}.models.push(${GPT_55_MODEL_ENTRY}),${defaultVar}??=${modelsByTypeVar}.models.find(e=>e.model===${configVar}.defaultModel)??null,{modelsByType:${modelsByTypeVar},defaultModel:${defaultVar}}`,
    restoreReplacement: (_match: string, prefix: string, modelsByTypeVar: string, defaultVar: string, configVar: string) =>
      `${prefix}${defaultVar}??=${modelsByTypeVar}.models.find(e=>e.model===${configVar}.defaultModel)??null,{modelsByType:${modelsByTypeVar},defaultModel:${defaultVar}}`,
  },
];

function replaceContent(content: string, signature: RegExp, replacement: Replacement): string {
  if (typeof replacement === "string") {
    return content.replace(signature, replacement);
  }

  return content.replace(signature, (...args: unknown[]) =>
    replacement(String(args[0] ?? ""), ...args.slice(1).map((value) => String(value))),
  );
}

function resolveSpeedAvailabilityCall(serviceTierFactory: string): string {
  const availabilityCalls: Record<string, string> = {
    Ce: "_e",
    se: "ae",
    be: "P",
  };
  const availabilityCall = availabilityCalls[serviceTierFactory];
  if (!availabilityCall) {
    throw new Error(`Unsupported Speed setting service-tier factory: ${serviceTierFactory}.`);
  }
  return availabilityCall;
}

function normalizeLegacySpeedSetting(
  _match: string,
  enabledVariable: string,
  serviceTierSetup: string,
  serviceTierFactory: string,
): string {
  return `${enabledVariable}=${resolveSpeedAvailabilityCall(serviceTierFactory)}(),${serviceTierSetup}let `;
}

function restoreSpeedSetting(
  _match: string,
  enabledVariable: string,
  availabilityOrServiceTierSetup: string,
  serviceTierSetupOrFactory: string,
): string {
  if (availabilityOrServiceTierSetup.endsWith(",")) {
    return `${enabledVariable}=${availabilityOrServiceTierSetup}${serviceTierSetupOrFactory}if(!${enabledVariable})return null;let `;
  }
  return `${enabledVariable}=${resolveSpeedAvailabilityCall(
    serviceTierSetupOrFactory,
  )}(),${availabilityOrServiceTierSetup}if(!${enabledVariable})return null;let `;
}

function replaceContentOrThrow(
  content: string,
  signature: RegExp | null,
  replacement: Replacement | undefined,
  label: string,
): string {
  if (!signature || !replacement) {
    throw new Error(`Missing replacement metadata for ${label}.`);
  }
  return replaceContent(content, signature, replacement);
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function walkJsFiles(dir: string): string[] {
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

function inspectSpec(content: string, spec: TargetSpec): TargetMatch | null {
  if (!content.includes(spec.needle)) {
    return null;
  }

  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;

  if (!guarded && !patched && !legacyPatched) {
    return null;
  }

  if (!isTargetRelevantForCommand(spec, { guarded, patched, legacyPatched })) {
    return null;
  }

  return {
    spec,
    guarded,
    patched,
    legacyPatched,
  };
}

function isGpt55ModelTarget(spec: TargetSpec): boolean {
  return spec.id === "gpt55-model-list" || spec.id === "gpt55-model-query-selector";
}

function parseVersionParts(value: string): number[] {
  const version = value.split("+", 1)[0];
  return version.split(".").map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

function compareVersions(left: string, right: string): number {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1;
    }
  }

  return 0;
}

function hasOfficialGpt55ModelList(): boolean {
  return compareVersions(appVersionKey, GPT_55_OFFICIAL_MODEL_LIST_MIN_VERSION) >= 0;
}

function isTargetRelevantForCommand(spec: TargetSpec, state: TargetState): boolean {
  if (!isGpt55ModelTarget(spec) || !hasOfficialGpt55ModelList()) {
    return true;
  }

  if (command === "apply") {
    return state.patched || state.legacyPatched;
  }

  if (command === "status" || command === "restore") {
    return state.patched || state.legacyPatched;
  }

  return true;
}

function inspectFile(filePath: string): FileTarget | null {
  const content = fs.readFileSync(filePath, "utf8");
  const matches = TARGET_SPECS.map((spec) => inspectSpec(content, spec)).filter(isPresent);

  if (matches.length === 0) {
    return null;
  }

  return {
    filePath,
    backupPath: `${filePath}${backupSuffix}`,
    backupPaths: backupSuffixes.map((suffix) => `${filePath}${suffix}`),
    content,
    matches,
  };
}

function findTargets(dir: string): FileTarget[] {
  return walkJsFiles(dir).map(inspectFile).filter(isPresent);
}

function describeState(match: TargetMatch): string {
  if (match.guarded) {
    return `${match.spec.label} disabled`;
  }
  if (match.patched || match.legacyPatched) {
    return `${match.spec.label} enabled`;
  }
  return "Unknown state";
}

function writeBackupIfNeeded(fileTarget: FileTarget): void {
  if (findExistingBackupPath(fileTarget)) {
    return;
  }
  fs.writeFileSync(fileTarget.backupPath, fileTarget.content, "utf8");
}

function findExistingBackupPath(fileTarget: FileTarget): string | undefined {
  return fileTarget.backupPaths.find((backupPath) => fs.existsSync(backupPath));
}

function resolveSlashCommandEnabledVariable(content: string): string {
  const match = content.match(/function OG\(\)\{let [^;]*?,([A-Za-z_$][\w$]*)=Lf\(\),/);
  return match?.[1] ?? "n";
}

function status(): number {
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
      const existingBackupPath = findExistingBackupPath(target);
      console.log(
        `Backup file: ${existingBackupPath ? path.relative(process.cwd(), existingBackupPath) : "missing"}`,
      );
    }
  }

  return 0;
}

function apply(): number {
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
        next = replaceContent(next, match.spec.guardedSignature, match.spec.applyReplacement);
        console.log(`patched: ${match.spec.label} (${path.relative(process.cwd(), target.filePath)})`);
        changed += 1;
        updated = true;
        continue;
      }

      if (match.legacyPatched) {
        next = replaceContentOrThrow(
          next,
          match.spec.legacyPatchedSignature,
          match.spec.normalizeReplacement,
          match.spec.label,
        );
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

function restore(): number {
  const targets = findTargets(assetsDir);
  if (targets.length === 0) {
    console.log(`Feature target file not found: ${assetsDir}`);
    return 1;
  }

  let restored = 0;

  for (const target of targets) {
    const existingBackupPath = findExistingBackupPath(target);
    if (existingBackupPath) {
      fs.writeFileSync(target.filePath, fs.readFileSync(existingBackupPath, "utf8"), "utf8");
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
        next = replaceContentOrThrow(
          next,
          match.patched ? match.spec.patchedSignature : match.spec.legacyPatchedSignature,
          match.spec.restoreReplacement,
          match.spec.label,
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
