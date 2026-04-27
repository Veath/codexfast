import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const sourceDir = join(rootDir, "src");
const outputPath = join(rootDir, "codexfast.sh");
const checkOnly = process.argv.includes("--check");

const generated = [
  readFileSync(join(sourceDir, "shell-prefix.sh"), "utf8"),
  readFileSync(join(sourceDir, "patcher.mjs"), "utf8"),
  "\nNODE\n",
  readFileSync(join(sourceDir, "shell-suffix.sh"), "utf8"),
].join("");

if (checkOnly) {
  const current = readFileSync(outputPath, "utf8");
  if (current !== generated) {
    console.error("codexfast.sh is out of date. Run `pnpm build`.");
    process.exit(1);
  }
  process.exit(0);
}

writeFileSync(outputPath, generated);
chmodSync(outputPath, 0o755);
