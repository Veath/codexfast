import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPPORTED_APP_VERSIONS } from "../src/supported-app-versions.mts";

type VersionBuild = {
  key: string;
  platform: "darwin" | "win32";
  architecture: string | null;
  version: string;
  build: string;
  displayVersion: string;
};

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceVersions = Object.keys(SUPPORTED_APP_VERSIONS).map(parseVersionKey);

function parseVersionKey(key: string): VersionBuild {
  const windowsMatch = /^win32:([^:]+):([^+]+)\+([^+]+)$/u.exec(key);
  if (windowsMatch) {
    const [, architecture, version, build] = windowsMatch;
    return {
      key,
      platform: "win32",
      architecture: architecture.toLowerCase(),
      version,
      build,
      displayVersion: `${version}.${build}`,
    };
  }
  const [version, build] = key.split("+");
  if (!version || !build) {
    throw new Error(`Invalid supported version key: ${key}`);
  }
  return {
    key,
    platform: "darwin",
    architecture: null,
    version,
    build,
    displayVersion: version,
  };
}

function readRepoFile(path: string): string {
  return readFileSync(resolve(rootDir, path), "utf8");
}

function parseCompatibilityMatrixKeys(markdown: string): Set<string> {
  const keys = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    const macMatch = line.match(
      /^\| `([^`]+)` \| `([^`]+)` \| `supported` \|/u,
    );
    if (macMatch) {
      keys.add(`${macMatch[1]}+${macMatch[2]}`);
      continue;
    }
    const windowsMatch = line.match(
      /^\| `OpenAI\.Codex` \| `([^`]+)` \| `([^`]+)` \| .* \| `(offline-validated|supported)` \|/u,
    );
    if (!windowsMatch) {
      continue;
    }
    const packageVersion = /^(\d+(?:\.\d+){2})\.(\d+)$/u.exec(
      windowsMatch[1],
    );
    if (!packageVersion) {
      throw new Error(
        `Invalid Windows package version in compatibility matrix: ${windowsMatch[1]}`,
      );
    }
    keys.add(
      `win32:${windowsMatch[2].toLowerCase()}:${packageVersion[1]}+${packageVersion[2]}`,
    );
  }
  return keys;
}

function assertSetEquals(name: string, actual: Set<string>, expected: Set<string>): void {
  const missing = [...expected].filter((key) => !actual.has(key));
  const extra = [...actual].filter((key) => !expected.has(key));
  if (missing.length === 0 && extra.length === 0) {
    return;
  }
  if (missing.length > 0) {
    console.error(`${name} is missing: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    console.error(`${name} has extra entries: ${extra.join(", ")}`);
  }
  process.exitCode = 1;
}

function assertReadmeMentions(path: string, versions: VersionBuild[]): void {
  const content = readRepoFile(path);
  for (const entry of versions) {
    const mentionsVersion = content.includes(entry.displayVersion);
    const mentionsBuild = entry.platform === "win32" ||
      content.includes(entry.build);
    const mentionsArchitecture = entry.architecture == null ||
      content.toLowerCase().includes(entry.architecture);
    if (!mentionsVersion || !mentionsBuild || !mentionsArchitecture) {
      console.error(`${path} does not mention whitelisted build ${entry.key}`);
      process.exitCode = 1;
    }
  }
}

const expectedKeys = new Set(sourceVersions.map((entry) => entry.key));
const matrixKeys = parseCompatibilityMatrixKeys(readRepoFile("docs/compatibility-matrix.md"));

assertSetEquals("docs/compatibility-matrix.md", matrixKeys, expectedKeys);
assertReadmeMentions("README.md", sourceVersions);
assertReadmeMentions("README.zh-CN.md", sourceVersions);

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}

console.log(`supported-version drift check passed (${sourceVersions.length} builds)`);
