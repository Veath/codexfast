import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import { SUPPORTED_APP_VERSIONS } from "../src/supported-app-versions.mts";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const sourceDir = join(rootDir, "src");
const outputPath = join(rootDir, "bin", "codexfast");
const checkOnly = process.argv.includes("--check");
const minimumNodeVersion = "18.12.0";

const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
};

function inlineLocalModuleSource(source: string): string {
  return source.replace(/^export /gm, "");
}

function inlinePatcherTargetModuleSource(source: string): string {
  return inlineLocalModuleSource(source)
    .replace(/^import [^;]+;\r?\n/gm, "")
    .replace(/^\{[^}]+};\r?\n/gm, "");
}

function inlineCliModuleSource(source: string): string {
  return inlineLocalModuleSource(source).replace(/^import [^;]+;\r?\n/gm, "");
}

function stripCliModuleImports(source: string): string {
  const cliModulePattern = String.raw`\.\/cli-(?:app-environment|asar-transaction|cdp|command-policy|context|legacy-app-mutations|legacy-patch-flow|output|runtime-launch|runtime-patcher|utils|watcher)\.mts`;
  return source
    .replace(
      new RegExp(
        String.raw`^import\s+(?:type\s+)?\{[^}]*\}\s+from ['"]${cliModulePattern}['"];\r?\n`,
        "gm",
      ),
      "",
    )
    .replace(
      new RegExp(
        String.raw`^import\s+(?:type\s+)?[^{};\n]+from ['"]${cliModulePattern}['"];\r?\n`,
        "gm",
      ),
      "",
    );
}

function insertAfterImports(source: string, insertedSource: string): string {
  const importBlock = source.match(/^(?:import [^;]+;\r?\n)+/);
  const insertIndex = importBlock ? importBlock[0].length : 0;
  return `${source.slice(0, insertIndex)}\n${insertedSource}\n${source.slice(insertIndex)}`;
}

const patcherTargetsSource = [
  "targets/builders.mts",
  "targets/speed.mts",
  "targets/plugins.mts",
  "targets/models.mts",
  "patcher-targets.mts",
].map((fileName) => inlinePatcherTargetModuleSource(readFileSync(join(sourceDir, fileName), "utf8"))).join("\n");
const patchEngineSource = inlineLocalModuleSource(readFileSync(join(sourceDir, "patch-engine.mts"), "utf8"))
  .replace(/^import \{[^]*?\} from "\.\/patcher-targets\.mts";\r?\n\r?\n?/, "");
const patcherEngineSource = readFileSync(join(sourceDir, "patcher.mts"), "utf8")
  .replace(/^import \{[^]*?\} from "\.\/patch-engine\.mts";\r?\n/, "")
  .replace(/^import \{[^]*?\} from "\.\/patcher-targets\.mts";\r?\n\r?\n?/, "")
  .replace(/^(?:(?:\/\/ Build marker: stripped by scripts\/build-codexfast\.mts and re-added at the top\r?\n\/\/ of the concatenated patcher source\.\r?\n)?)"use strict";\r?\n\r?\n?/, "");
const patcherSource = ts.transpileModule(`"use strict";\n\n${patcherTargetsSource}\n${patchEngineSource}\n${patcherEngineSource}`, {
  compilerOptions,
}).outputText;
const packageVersion = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")).version as string;
const cliModuleSource = [
  "cli-asar-transaction.mts",
  "cli-app-environment.mts",
  "cli-cdp.mts",
  "cli-command-policy.mts",
  "cli-context.mts",
  "cli-legacy-app-mutations.mts",
  "cli-legacy-patch-flow.mts",
  "cli-output.mts",
  "cli-runtime-launch.mts",
  "cli-runtime-patcher.mts",
  "cli-utils.mts",
  "cli-watcher.mts",
].map((fileName) => inlineCliModuleSource(readFileSync(join(sourceDir, fileName), "utf8"))).join("\n");
const cliSource = insertAfterImports(
  stripCliModuleImports(readFileSync(join(sourceDir, "cli.mts"), "utf8")),
  cliModuleSource,
)
  .replace(
    "declare const __PATCHER_SOURCE__: string;",
    `const __PATCHER_SOURCE__ = ${JSON.stringify(patcherSource)};`,
  )
  .replace(
    "declare const __PACKAGE_VERSION__: string;",
    `const __PACKAGE_VERSION__ = ${JSON.stringify(packageVersion)};`,
  )
  .replace(
    [
      "declare const __SUPPORTED_APP_VERSIONS__: Record<string, string>;",
      "",
      "const SUPPORTED_APP_VERSIONS = __SUPPORTED_APP_VERSIONS__;",
    ].join("\n"),
    `const SUPPORTED_APP_VERSIONS = ${JSON.stringify(SUPPORTED_APP_VERSIONS)};`,
  );
const transpiledCliSource = ts.transpileModule(cliSource, {
  compilerOptions,
}).outputText.replace(/^"use strict";\r?\n/, "");
const nodeVersionGuard = `const MIN_NODE_VERSION = "${minimumNodeVersion}";
function isNodeVersionSupported(currentVersion, minimumVersion) {
  const currentParts = currentVersion.split(".").map(Number);
  const minimumParts = minimumVersion.split(".").map(Number);
  for (let index = 0; index < minimumParts.length; index += 1) {
    const currentPart = currentParts[index] || 0;
    const minimumPart = minimumParts[index] || 0;
    if (currentPart !== minimumPart) {
      return currentPart > minimumPart;
    }
  }
  return true;
}
if (!isNodeVersionSupported(process.versions.node, MIN_NODE_VERSION)) {
  console.error("codexfast requires Node.js >= " + MIN_NODE_VERSION + ". Current version: " + process.versions.node + ".");
  process.exit(1);
}
`;
const generated = `#!/usr/bin/env node
// This file is generated by scripts/build-codexfast.mts. Do not edit it directly.
"use strict";
${nodeVersionGuard}${transpiledCliSource}`;

if (checkOnly) {
  const current = readFileSync(outputPath, "utf8");
  if (current !== generated) {
    console.error("bin/codexfast is out of date. Run `pnpm build`.");
    process.exit(1);
  }
  process.exit(0);
}

writeFileSync(outputPath, generated);
chmodSync(outputPath, 0o755);
