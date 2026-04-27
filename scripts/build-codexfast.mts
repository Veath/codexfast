import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const sourceDir = join(rootDir, "src");
const outputPath = join(rootDir, "bin", "codexfast");
const checkOnly = process.argv.includes("--check");

const patcherSource = readFileSync(join(sourceDir, "patcher.mts"), "utf8");
const cliSource = readFileSync(join(sourceDir, "cli.mts"), "utf8").replace(
  "declare const __PATCHER_SOURCE__: string;",
  `const __PATCHER_SOURCE__ = ${JSON.stringify(patcherSource)};`,
);
const generated = `#!/usr/bin/env node\n${ts.transpileModule(cliSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText}`;

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
