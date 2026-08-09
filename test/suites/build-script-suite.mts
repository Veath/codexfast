import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertDistributionEntrypoint,
  inlineSupportedAppVersions,
  normalizeLineEndings,
} from "../../scripts/build-codexfast-utils.mts";

const rootDir = resolve(fileURLToPath(new URL("../..", import.meta.url)));

type NpmPackDryRunReport = {
  filename: string;
  files: Array<{ path: string }>;
};

function rootTarballs(): string[] {
  return readdirSync(rootDir)
    .filter((entry) => entry.endsWith(".tgz"))
    .sort();
}

function markdownLinkDestinations(source: string): string[] {
  const destinations: string[] = [];
  for (
    const match of source.matchAll(
      /!?\[[^\]]*\]\(\s*(<[^>\n]+>|[^)\s]+)(?:\s+[^)\n]*)?\)/gu,
    )
  ) {
    destinations.push(match[1]);
  }
  for (
    const match of source.matchAll(
      /^\s{0,3}\[[^\]]+\]:\s*(<[^>\n]+>|\S+)/gmu,
    )
  ) {
    destinations.push(match[1]);
  }
  return destinations;
}

function packedRelativeLinkTarget(
  markdownPath: string,
  rawDestination: string,
): string | undefined {
  const destination = rawDestination.startsWith("<") &&
      rawDestination.endsWith(">")
    ? rawDestination.slice(1, -1)
    : rawDestination;
  if (
    destination === "" ||
    destination.startsWith("#") ||
    destination.startsWith("/") ||
    destination.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/iu.test(destination)
  ) {
    return undefined;
  }

  const pathOnly = destination.split(/[?#]/u, 1)[0];
  let decodedPath = pathOnly;
  try {
    decodedPath = decodeURIComponent(pathOnly);
  } catch {
    // Leave malformed percent escapes untouched so the missing target fails clearly.
  }
  return posix.normalize(
    posix.join(posix.dirname(markdownPath), decodedPath || posix.basename(markdownPath)),
  );
}

function assertPackedMarkdownLinksResolve(): void {
  const tarballsBefore = rootTarballs();
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const packResult = spawnSync(
    npmCommand,
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      cwd: rootDir,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  assert.deepEqual(
    rootTarballs(),
    tarballsBefore,
    "expected the npm pack dry run not to create a .tgz archive",
  );
  if (packResult.error) {
    throw packResult.error;
  }
  assert.equal(
    packResult.status,
    0,
    `expected npm pack dry run to succeed:\n${packResult.stderr}`,
  );

  const reports = JSON.parse(packResult.stdout) as NpmPackDryRunReport[];
  assert.equal(reports.length, 1, "expected one npm pack dry-run report");
  const report = reports[0];
  assert.ok(report, "expected npm pack dry run to describe the package");
  assert.ok(report.filename.endsWith(".tgz"), "expected npm to report an archive filename");

  const packedPaths = new Set(report.files.map((file) => file.path));
  assert.ok(
    packedPaths.has("docs/README.md"),
    "expected the published docs index to be included in the npm package",
  );
  for (
    const markdownPath of [...packedPaths]
      .filter((packedPath) => packedPath.endsWith(".md"))
      .sort()
  ) {
    const source = readFileSync(resolve(rootDir, markdownPath), "utf8");
    for (const destination of markdownLinkDestinations(source)) {
      const target = packedRelativeLinkTarget(markdownPath, destination);
      if (target == null) {
        continue;
      }
      assert.ok(
        packedPaths.has(target),
        `${markdownPath} links to ${destination}, but ${target} is not included in the npm package`,
      );
    }
  }
}

export function runBuildScriptSuite(): void {
  const source = normalizeLineEndings(
    readFileSync(resolve(rootDir, "src", "cli.mts"), "utf8"),
  );
  const generatedCliRaw = readFileSync(
    resolve(rootDir, "bin", "codexfast"),
    "utf8",
  );
  const generatedCli = normalizeLineEndings(generatedCliRaw);
  const supportedAppVersions = {
    "win32:x64:26.803.5235+0": "Windows CRLF $& regression fixture",
  };
  const expectedDeclaration =
    `const SUPPORTED_APP_VERSIONS = ${JSON.stringify(supportedAppVersions)};`;

  for (const lineEnding of ["\n", "\r\n"]) {
    const input = source.replace(/\n/gu, lineEnding);
    const output = inlineSupportedAppVersions(input, supportedAppVersions);
    assert.ok(
      output.includes(expectedDeclaration),
      `expected supported versions to be inlined with ${JSON.stringify(lineEnding)} source line endings`,
    );
    assert.ok(
      !output.includes("__SUPPORTED_APP_VERSIONS__"),
      "expected the supported-version placeholder to be removed",
    );
  }

  const declarationBlock = [
    "declare const __SUPPORTED_APP_VERSIONS__: Record<string, string>;",
    "",
    "const SUPPORTED_APP_VERSIONS = __SUPPORTED_APP_VERSIONS__;",
  ].join("\r\n");
  assert.throws(
    () =>
      inlineSupportedAppVersions("const missing = true;", supportedAppVersions),
    /found 0/u,
    "expected a missing declaration block to fail closed",
  );
  assert.throws(
    () => inlineSupportedAppVersions(
      `${declarationBlock}\r\n${declarationBlock}`,
      supportedAppVersions,
    ),
    /found 2/u,
    "expected duplicate declaration blocks to fail closed",
  );
  assert.equal(
    normalizeLineEndings("first\r\nsecond\rthird\n"),
    "first\nsecond\nthird\n",
    "expected generated-file checks to ignore checkout line-ending differences",
  );

  assert.doesNotThrow(() =>
    assertDistributionEntrypoint(generatedCliRaw)
  );
  assert.throws(
    () => assertDistributionEntrypoint(
      "#!/usr/bin/env node\r\nconsole.log('broken');\r\n",
    ),
    /LF-terminated/u,
    "expected a CRLF shebang to fail the distribution check",
  );
  assert.throws(
    () => assertDistributionEntrypoint(
      "#!/usr/bin/env node\nconsole.log('broken');\r\n",
    ),
    /LF line endings only/u,
    "expected CRLF after a valid shebang to fail the distribution check",
  );
  assert.throws(
    () => assertDistributionEntrypoint("#!/usr/bin/node\n"),
    /#!\/usr\/bin\/env node/u,
    "expected a non-portable shebang to fail the distribution check",
  );

  const gitAttributes = readFileSync(
    resolve(rootDir, ".gitattributes"),
    "utf8",
  );
  assert.match(
    gitAttributes,
    /^\/bin\/codexfast text eol=lf$/mu,
    "expected Git checkouts to preserve the distribution entrypoint as LF",
  );
  const packageJson = JSON.parse(
    readFileSync(resolve(rootDir, "package.json"), "utf8"),
  ) as { files?: string[]; scripts?: Record<string, string> };
  assert.ok(
    packageJson.files?.includes("docs/README.md"),
    "expected package.json to explicitly publish the docs index",
  );
  assert.deepEqual(
    packageJson.scripts?.prepack?.split(/\s*&&\s*/u),
    [
      "tsx scripts/build-codexfast.mts",
      "tsx scripts/build-codexfast.mts --check-distribution",
    ],
    "expected prepack to rebuild and strictly validate the distribution entrypoint",
  );
  assertPackedMarkdownLinksResolve();

  for (const [label, cliSource] of [
    ["src/cli.mts", source],
    ["bin/codexfast", generatedCli],
  ] as const) {
    assert.doesNotMatch(
      cliSource,
      /\brun\s*\(\s*["']clear(?:\.exe)?["']/u,
      `expected ${label} not to execute the platform-resolved clear command`,
    );
    assert.doesNotMatch(
      cliSource,
      /\bspawnSync\b\s*\)?\s*\(\s*["']clear(?:\.exe)?["']/u,
      `expected ${label} not to spawn clear.exe`,
    );
    assert.doesNotMatch(
      cliSource,
      /\bclear\.exe\b/iu,
      `expected ${label} not to resolve or execute clear.exe`,
    );
    assert.ok(
      cliSource.includes(String.raw`\x1b[2J\x1b[H`),
      `expected ${label} to clear the interactive screen with ANSI output`,
    );
  }
}
