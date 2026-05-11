import { GPT_55_OFFICIAL_MODEL_LIST_MIN_VERSION, TARGET_SPECS, type FileTarget, type Replacement, type TargetMatch, type TargetSpec, type TargetState } from "./patcher-targets.mts";

// Build marker: stripped by scripts/build-codexfast.mts and re-added at the top
// of the concatenated patcher source.
"use strict";

// This module is transpiled to CommonJS by scripts/build-codexfast.mts and
// executed via `node -`, where stdin defaults to CommonJS. Do not import it directly as ESM.
const fs: typeof import("node:fs") = require("fs");
const path: typeof import("node:path") = require("path");

const [, , command, assetsDirArg, backupSuffix, legacyBackupSuffix = "", appVersionKey = "unknown"] = process.argv;
const assetsDir = path.resolve(assetsDirArg);
const backupSuffixes = [backupSuffix, legacyBackupSuffix].filter((suffix, index, suffixes) => suffix && suffixes.indexOf(suffix) === index);

function replaceContent(content: string, signature: RegExp, replacement: Replacement): string {
  if (typeof replacement === "string") {
    return content.replace(signature, replacement);
  }

  return content.replace(signature, (...args: unknown[]) =>
    replacement(String(args[0] ?? ""), ...args.slice(1).map((value) => String(value))),
  );
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
      console.log(`Status: ${describeState(match)}`);
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
        console.log(`patched: ${match.spec.label}`);
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
        console.log(`normalized: ${match.spec.label}`);
        changed += 1;
        updated = true;
        continue;
      }

      if (match.patched) {
        console.log(`already patched: ${match.spec.label}`);
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
        console.log(`restored backup: ${match.spec.label}`);
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

      console.log(`restored inline: ${match.spec.label}`);
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
