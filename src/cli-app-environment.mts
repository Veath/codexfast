import { existsSync } from "node:fs";
import type { CodexfastContext } from "./cli-context.mts";
import { printLine, resolvePlistBuddy, run } from "./cli-utils.mts";

export type CheckRequirementsOptions = {
  context: CodexfastContext;
  supportedAppVersions: Record<string, string>;
};

function readBundlePlistValueForContext(
  context: CodexfastContext,
  key: string,
  fallback = "unknown",
): string {
  const result = run(context.toolchain.plistBuddy, [
    "-c",
    `Print :${key}`,
    context.paths.infoPlist,
  ]);
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function loadAppCompatibilityMetadataForContext(
  context: CodexfastContext,
  supportedAppVersions: Record<string, string>,
): void {
  context.metadata.version = readBundlePlistValueForContext(
    context,
    "CFBundleShortVersionString",
  );
  context.metadata.build = readBundlePlistValueForContext(
    context,
    "CFBundleVersion",
  );
  context.metadata.versionKey = `${context.metadata.version}+${context.metadata.build}`;
  context.metadata.supported = Object.prototype.hasOwnProperty.call(
    supportedAppVersions,
    context.metadata.versionKey,
  );
  context.metadata.compatibility = context.metadata.supported
    ? `supported (${supportedAppVersions[context.metadata.versionKey]})`
    : "unsupported";
}

export function checkRequirements(
  options: CheckRequirementsOptions,
): boolean {
  const {
    context,
    supportedAppVersions,
  } = options;

  if (!existsSync(context.paths.resources)) {
    printLine(
      `Codex resources directory not found: ${context.paths.resources}`,
    );
    printLine(`Make sure Codex.app is installed at ${context.paths.bundle}.`);
    return false;
  }

  context.toolchain.plistBuddy = resolvePlistBuddy() ?? "";

  if (!context.toolchain.plistBuddy) {
    printLine("PlistBuddy not found.");
    printLine(
      "This macOS environment cannot read Codex.app metadata.",
    );
    return false;
  }

  loadAppCompatibilityMetadataForContext(context, supportedAppVersions);

  return true;
}
