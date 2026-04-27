import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, chmodSync, copyFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

type AssetProfile = "standard" | "26417" | "26417-partial" | "26422";
type AsarNode = { files?: Record<string, AsarNode>; size?: number; offset?: string };

const rootDir = resolve(process.env.CODEXFAST_TEST_ROOT ?? process.cwd());
const tmpDir = mkdtempSync(join(tmpdir(), "codexfast-test."));
const stubBin = join(tmpDir, "bin");
const markerFile = join(tmpDir, "codesign.log");
const fixturesDir = join(rootDir, "test", "fixtures");

function fail(message: string, detail?: string): never {
  console.error(message);
  if (detail) {
    console.error(detail);
  }
  process.exit(1);
}

function writeExecutable(path: string, content: string): void {
  writeFileSync(path, content);
  chmodSync(path, 0o755);
}

function setupStubs(): void {
  mkdirSync(stubBin, { recursive: true });
  writeExecutable(join(stubBin, "clear"), "#!/bin/bash\nexit 0\n");
  writeExecutable(
    join(stubBin, "codesign"),
    `#!/bin/bash
if [ "\${CODEXFAST_TEST_CODESIGN_FAIL:-0}" = "1" ] && [ "$1" = "--force" ]; then
  printf '%s\\n' "codesign: permission denied" >&2
  exit 1
fi
printf '%s\\n' "$*" >> ${JSON.stringify(markerFile)}
exit 0
`,
  );
  writeExecutable(
    join(stubBin, "npm"),
    `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const marker = args.indexOf("--");
if (marker === -1) process.exit(0);
const asarArgs = args.slice(marker + 1);
if (asarArgs[0] !== "asar") process.exit(0);

function walkFiles(dir, segments = [], files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, [...segments, entry.name], files);
    else if (entry.isFile()) files.push({ segments: [...segments, entry.name], buffer: fs.readFileSync(fullPath) });
  }
  return files;
}

function writeAsar(sourcePath, archivePath) {
  const files = walkFiles(sourcePath);
  let nextOffset = 0;
  const headerRoot = { files: {} };
  for (const file of files) {
    let current = headerRoot;
    for (const segment of file.segments.slice(0, -1)) {
      current.files[segment] ??= { files: {} };
      current = current.files[segment];
    }
    current.files[file.segments.at(-1)] = { size: file.buffer.length, offset: String(nextOffset) };
    nextOffset += file.buffer.length;
  }
  const headerStringBuffer = Buffer.from(JSON.stringify(headerRoot), "utf8");
  const align4 = (value) => value + ((4 - (value % 4)) % 4);
  const headerPayloadSize = align4(4 + headerStringBuffer.length);
  const headerBuffer = Buffer.alloc(4 + headerPayloadSize);
  headerBuffer.writeUInt32LE(headerPayloadSize, 0);
  headerBuffer.writeUInt32LE(headerStringBuffer.length, 4);
  headerStringBuffer.copy(headerBuffer, 8);
  const sizeBuffer = Buffer.alloc(8);
  sizeBuffer.writeUInt32LE(4, 0);
  sizeBuffer.writeUInt32LE(headerBuffer.length, 4);
  fs.writeFileSync(archivePath, Buffer.concat([sizeBuffer, headerBuffer, ...files.map((file) => file.buffer)]));
}

function extractAsar(archivePath, outputDir) {
  const archive = fs.readFileSync(archivePath);
  const headerBufferSize = archive.readUInt32LE(4);
  const headerStringSize = archive.readUInt32LE(12);
  const header = JSON.parse(archive.subarray(16, 16 + headerStringSize).toString("utf8"));
  const files = [];
  function walk(node, segments = []) {
    for (const [name, value] of Object.entries(node.files ?? {})) {
      const nextSegments = [...segments, name];
      if (value.files) walk(value, nextSegments);
      else files.push({ relativePath: nextSegments.join("/"), offset: Number(value.offset), size: value.size });
    }
  }
  walk(header);
  for (const file of files) {
    const destination = path.join(outputDir, file.relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, archive.subarray(8 + headerBufferSize + file.offset, 8 + headerBufferSize + file.offset + file.size));
  }
}

const [, mode, sourcePath, targetPath] = asarArgs;
if (mode === "p") writeAsar(sourcePath, targetPath);
if (mode === "e") extractAsar(sourcePath, targetPath);
`,
  );
}

function walkFiles(sourcePath: string, segments: string[] = [], files: { segments: string[]; buffer: Buffer }[] = []): { segments: string[]; buffer: Buffer }[] {
  for (const entry of readdirSync(sourcePath, { withFileTypes: true })) {
    const fullPath = join(sourcePath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, [...segments, entry.name], files);
    } else if (entry.isFile()) {
      files.push({ segments: [...segments, entry.name], buffer: readFileSync(fullPath) });
    }
  }
  return files;
}

function writeFakeAsar(sourcePath: string, archivePath: string): void {
  const sourceStat = statSync(sourcePath);
  const files = sourceStat.isDirectory()
    ? walkFiles(sourcePath)
    : [{ segments: ["webview", "assets", "general-settings.js"], buffer: readFileSync(sourcePath) }];
  let nextOffset = 0;
  const headerRoot: AsarNode = { files: {} };

  for (const file of files) {
    let current = headerRoot;
    for (const segment of file.segments.slice(0, -1)) {
      current.files ??= {};
      current.files[segment] ??= { files: {} };
      current = current.files[segment];
    }
    current.files ??= {};
    current.files[file.segments[file.segments.length - 1]] = { size: file.buffer.length, offset: String(nextOffset) };
    nextOffset += file.buffer.length;
  }

  const headerStringBuffer = Buffer.from(JSON.stringify(headerRoot), "utf8");
  const align4 = (value: number) => value + ((4 - (value % 4)) % 4);
  const headerPayloadSize = align4(4 + headerStringBuffer.length);
  const headerBuffer = Buffer.alloc(4 + headerPayloadSize);
  headerBuffer.writeUInt32LE(headerPayloadSize, 0);
  headerBuffer.writeUInt32LE(headerStringBuffer.length, 4);
  headerStringBuffer.copy(headerBuffer, 8);
  const sizeBuffer = Buffer.alloc(8);
  sizeBuffer.writeUInt32LE(4, 0);
  sizeBuffer.writeUInt32LE(headerBuffer.length, 4);
  writeFileSync(archivePath, Buffer.concat([sizeBuffer, headerBuffer, ...files.map((file) => file.buffer)]));
}

function readFakeAsarFile(archivePath: string, relativePath = "webview/assets/general-settings.js"): string {
  const archive = readFileSync(archivePath);
  const headerBufferSize = archive.readUInt32LE(4);
  const headerStringSize = archive.readUInt32LE(12);
  const header = JSON.parse(archive.subarray(16, 16 + headerStringSize).toString("utf8")) as AsarNode;
  let current: AsarNode | undefined = header;
  for (const segment of relativePath.split("/")) {
    current = current?.files?.[segment];
  }
  if (!current || current.offset === undefined || current.size === undefined) {
    fail(`missing fake asar file: ${relativePath}`);
  }
  const fileOffset = 8 + headerBufferSize + Number(current.offset);
  return archive.subarray(fileOffset, fileOffset + current.size).toString("utf8");
}

function readFakeAsarHeaderHash(archivePath: string): string {
  const archive = readFileSync(archivePath);
  const headerStringSize = archive.readUInt32LE(12);
  const headerString = archive.subarray(16, 16 + headerStringSize).toString("utf8");
  return createHash("sha256").update(headerString).digest("hex");
}

function assertFakeAsarJsParses(archivePath: string): void {
  const archive = readFileSync(archivePath);
  const headerBufferSize = archive.readUInt32LE(4);
  const headerStringSize = archive.readUInt32LE(12);
  const header = JSON.parse(archive.subarray(16, 16 + headerStringSize).toString("utf8")) as AsarNode;
  function walk(node: AsarNode): void {
    for (const value of Object.values(node.files ?? {})) {
      if (value.files) {
        walk(value);
      } else {
        const fileOffset = 8 + headerBufferSize + Number(value.offset);
        new vm.Script(archive.subarray(fileOffset, fileOffset + Number(value.size)).toString("utf8"));
      }
    }
  }
  walk(header);
}

function writeInfoPlist(appDir: string, hashValue: string, appVersion = "26.415.40636", appBuild = "1799"): void {
  mkdirSync(join(appDir, "Contents"), { recursive: true });
  writeFileSync(
    join(appDir, "Contents", "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleShortVersionString</key>
  <string>${appVersion}</string>
  <key>CFBundleVersion</key>
  <string>${appBuild}</string>
  <key>ElectronAsarIntegrity</key>
  <dict>
    <key>Resources/app.asar</key>
    <dict>
      <key>algorithm</key>
      <string>SHA256</string>
      <key>hash</key>
      <string>${hashValue}</string>
    </dict>
  </dict>
</dict>
</plist>
`,
  );
}

function readInfoPlistHash(appDir: string): string {
  const plist = readFileSync(join(appDir, "Contents", "Info.plist"), "utf8");
  const match = plist.match(/<key>hash<\/key>\s*<string>([^<]+)<\/string>/);
  return match?.[1] ?? fail(`missing ElectronAsarIntegrity hash in ${appDir}`);
}

function copyDirectory(sourceDir: string, destinationDir: string): void {
  mkdirSync(destinationDir, { recursive: true });
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name);
    const destinationPath = join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

function writeAssets(assetsDir: string, profile: AssetProfile): void {
  copyDirectory(join(fixturesDir, profile, "webview", "assets"), assetsDir);
}

function prepareArchivedFakeApp(appDir: string, assetsRoot: string, appVersion = "26.415.40636", appBuild = "1799", assetProfile: AssetProfile = "standard"): void {
  const resourcesDir = join(appDir, "Contents", "Resources");
  const archivePath = join(resourcesDir, "app.asar");
  mkdirSync(resourcesDir, { recursive: true });
  writeAssets(join(assetsRoot, "webview", "assets"), assetProfile);
  writeFakeAsar(assetsRoot, archivePath);
  writeInfoPlist(appDir, readFakeAsarHeaderHash(archivePath), appVersion, appBuild);
}

function prepareLegacyFakeApp(appDir: string, unpackedAssetsDir: string, archivedAssetsRoot: string, appBuildHashPlaceholder: string): void {
  const resourcesDir = join(appDir, "Contents", "Resources");
  const unpackedRoot = join(resourcesDir, "app", "webview", "assets");
  mkdirSync(unpackedRoot, { recursive: true });
  writeAssets(unpackedAssetsDir, "standard");
  for (const file of ["general-settings.js", "index.js", "use-model-settings.js", "sidebar.js"]) {
    copyFileSync(join(unpackedAssetsDir, file), join(unpackedRoot, file));
  }
  writeAssets(join(archivedAssetsRoot, "webview", "assets"), "standard");
  writeFakeAsar(archivedAssetsRoot, join(resourcesDir, "app.asar1"));
  writeInfoPlist(appDir, appBuildHashPlaceholder);
}

function runScript(appDir: string, input: string, outputFile: string, extraEnv: Record<string, string> = {}): void {
  const result = spawnSync(join(rootDir, "codexfast.sh"), {
    input,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv,
      PATH: `${stubBin}:${process.env.PATH ?? ""}`,
      CODEXFAST_APP_BUNDLE: appDir,
    },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  writeFileSync(outputFile, output);
  if (result.status !== 0) {
    fail(`codexfast exited with ${result.status}`, output);
  }
}

function runScriptWithCodesignFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_CODESIGN_FAIL: "1" });
}

function readOutput(outputFile: string): string {
  return readFileSync(outputFile, "utf8");
}

function assertCodesignCalls(expectedMin: number, outputFile: string): void {
  if (!existsSync(markerFile)) {
    fail("expected codesign to be invoked", readOutput(outputFile));
  }
  const callCount = readFileSync(markerFile, "utf8").trim().split("\n").filter(Boolean).length;
  if (callCount < expectedMin) {
    fail(`expected codesign to run at least ${expectedMin} times, got ${callCount}`, `${readFileSync(markerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}

function resetCodesignCalls(): void {
  if (existsSync(markerFile)) {
    unlinkSync(markerFile);
  }
}

function assertNoPersistentUnpackDir(resourcesDir: string, outputFile: string): void {
  if (existsSync(join(resourcesDir, "app"))) {
    fail("expected no persistent Resources/app directory", readOutput(outputFile));
  }
}

function assertContains(source: string, expected: string | RegExp, message: string, detail = source): void {
  const matches = typeof expected === "string" ? source.includes(expected) : expected.test(source);
  if (!matches) {
    fail(message, detail);
  }
}

function assertNotContains(source: string, unexpected: string | RegExp, message: string, detail = source): void {
  const matches = typeof unexpected === "string" ? source.includes(unexpected) : unexpected.test(source);
  if (matches) {
    fail(message, detail);
  }
}

function archiveFile(archivePath: string, relativePath?: string): string {
  return readFakeAsarFile(archivePath, relativePath);
}

function assertApplyState(archivePath: string): void {
  assertContains(archiveFile(archivePath), 'let view="general";', "expected apply to remove the guarded Speed settings return");
  assertContains(archiveFile(archivePath, "webview/assets/index.js"), "enabled:!0", "expected apply to enable the Fast slash command");
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings.js"), "D=!0", "expected apply to enable the add-context Speed menu");
  assertContains(archiveFile(archivePath, "webview/assets/sidebar.js"), "j=!1", "expected apply to remove the Plugins sidebar api-key gate");
}

function assertGuardedState(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath), "if(!x)return null;", `expected ${context} to preserve the guarded Speed settings state`);
  assertContains(archiveFile(archivePath, "webview/assets/index.js"), "enabled:n", `expected ${context} to preserve the guarded Fast slash command state`);
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings.js"), "D=Cr()", `expected ${context} to preserve the guarded add-context Speed menu state`);
  assertContains(archiveFile(archivePath, "webview/assets/sidebar.js"), "j=T===`apikey`", `expected ${context} to preserve the guarded Plugins sidebar state`);
}

function assertApplyState26417(archivePath: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-D2eks1ok.js"), "let o;", "expected 26.417 apply to remove the guarded Speed settings return");
  assertContains(archiveFile(archivePath, "webview/assets/index-CxBol07n.js"), "enabled:!0", "expected 26.417 apply to enable the Fast slash command");
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings-ldiRRtPt.js"), "D=!0", "expected 26.417 apply to enable the add-context Speed menu");
  const sidebar = archiveFile(archivePath, "webview/assets/sidebar-CxBol07n.js");
  assertContains(sidebar, "j=!1", "expected 26.417 apply to remove the Plugins sidebar api-key gate");
  assertContains(sidebar, /j=!1,M=D([,;])/, "expected 26.417 apply to expose the Plugins nav label for api-key users");
}

function assertGuardedState26417(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-D2eks1ok.js"), "if(!n)return null;", `expected ${context} to preserve the 26.417 guarded Speed settings state`);
  assertContains(archiveFile(archivePath, "webview/assets/index-CxBol07n.js"), "enabled:n", `expected ${context} to preserve the 26.417 guarded Fast slash command state`);
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings-ldiRRtPt.js"), "D=cr()", `expected ${context} to preserve the 26.417 guarded add-context Speed menu state`);
  const sidebar = archiveFile(archivePath, "webview/assets/sidebar-CxBol07n.js");
  assertContains(sidebar, "j=O&&A", `expected ${context} to preserve the 26.417 guarded Plugins sidebar state`);
  assertContains(sidebar, "M=D&&!A", `expected ${context} to preserve the 26.417 guarded Plugins nav label state`);
}

function assertApplyState26422(archivePath: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-CnVD4YyB.js"), "let a;", "expected 26.422 apply to remove the guarded Speed settings return");
  const index = archiveFile(archivePath, "webview/assets/index-gATb9Tvd.js");
  assertContains(index, "enabled:!0", "expected 26.422 apply to enable the Fast slash command");
  assertContains(index, "g=!0", "expected 26.422 apply to enable the composer Intelligence Speed menu");
  assertContains(index, "A=!1", "expected 26.422 apply to remove the Plugins sidebar api-key gate");
  assertContains(index, /ee=Ha\(\{hostId:me\}\)[,;]/, "expected 26.422 apply to expose the Plugins nav label for api-key users");
  assertContains(index, "codexfast-gpt55", "expected 26.422 apply to inject GPT-5.5 into the model list");
  assertContains(archiveFile(archivePath, "webview/assets/font-settings-C9TXXljS.js"), "codexfast-gpt55-select", "expected 26.422 apply to keep GPT-5.5 visible after the model query filter");
}

function assertApplyState26422WithoutGptPatch(archivePath: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-CnVD4YyB.js"), "let a;", "expected 26.422 build 2080 apply to remove the guarded Speed settings return");
  const index = archiveFile(archivePath, "webview/assets/index-gATb9Tvd.js");
  assertContains(index, "enabled:!0", "expected 26.422 build 2080 apply to enable the Fast slash command");
  assertContains(index, "g=!0", "expected 26.422 build 2080 apply to enable the composer Intelligence Speed menu");
  assertContains(index, "A=!1", "expected 26.422 build 2080 apply to remove the Plugins sidebar api-key gate");
  assertNotContains(index, "codexfast-gpt55", "expected 26.422 build 2080 apply to leave the model list handler on the official path");
  assertNotContains(archiveFile(archivePath, "webview/assets/font-settings-C9TXXljS.js"), "codexfast-gpt55-select", "expected 26.422 build 2080 apply to leave the model query selector on the official path");
}

function assertGuardedState26422(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-CnVD4YyB.js"), "if(!n)return null;", `expected ${context} to preserve the 26.422 guarded Speed settings state`);
  const index = archiveFile(archivePath, "webview/assets/index-gATb9Tvd.js");
  assertContains(index, "enabled:n", `expected ${context} to preserve the 26.422 guarded Fast slash command state`);
  assertContains(index, "g=_f()", `expected ${context} to preserve the 26.422 guarded composer Intelligence Speed menu state`);
  assertContains(index, "A=O&&k", `expected ${context} to preserve the 26.422 guarded Plugins sidebar state`);
  assertContains(index, "ee=Ha({hostId:me})&&!k", `expected ${context} to preserve the 26.422 guarded Plugins nav label state`);
  assertContains(index, '"list-models-for-host":i9((e,{hostId:t,...n})=>e.sendRequest(`model/list`,n))', `expected ${context} to preserve the guarded model list handler`);
  assertNotContains(index, "codexfast-gpt55", `expected ${context} to remove the GPT-5.5 model list injection`);
  const fontSettings = archiveFile(archivePath, "webview/assets/font-settings-C9TXXljS.js");
  assertContains(fontSettings, "r??=n.models.find(e=>e.model===d.defaultModel)??null,{modelsByType:n,defaultModel:r}", `expected ${context} to preserve the guarded model query selector`);
  assertNotContains(fontSettings, "codexfast-gpt55-select", `expected ${context} to remove the GPT-5.5 model query selector injection`);
}

function assertIntegrityMatches(appDir: string, archivePath: string, message: string): void {
  if (readInfoPlistHash(appDir) !== readFakeAsarHeaderHash(archivePath)) {
    fail(message, readFileSync(join(appDir, "Contents", "Info.plist"), "utf8"));
  }
}

function runApplyRestoreCase(caseConfig: {
  name: string;
  appDir: string;
  assetsRoot: string;
  appVersion?: string;
  appBuild?: string;
  assetProfile?: AssetProfile;
  applyAssert: (archivePath: string) => void;
  restoreAssert: (archivePath: string, context: string) => void;
  restoreContext: string;
  statusAssert?: (output: string) => void;
  postApplyAssert?: (output: string) => void;
}): void {
  const resourcesDir = join(caseConfig.appDir, "Contents", "Resources");
  const archivePath = join(resourcesDir, "app.asar");
  const applyOutput = join(tmpDir, `${caseConfig.name}-apply.txt`);
  const statusOutput = join(tmpDir, `${caseConfig.name}-status.txt`);
  const restoreOutput = join(tmpDir, `${caseConfig.name}-restore.txt`);
  prepareArchivedFakeApp(caseConfig.appDir, caseConfig.assetsRoot, caseConfig.appVersion, caseConfig.appBuild, caseConfig.assetProfile);

  runScript(caseConfig.appDir, "2\n\nq\n", applyOutput);
  assertCodesignCalls(1, applyOutput);
  assertNoPersistentUnpackDir(resourcesDir, applyOutput);
  assertFakeAsarJsParses(archivePath);
  caseConfig.applyAssert(archivePath);
  caseConfig.postApplyAssert?.(readOutput(applyOutput));

  if (caseConfig.statusAssert) {
    runScript(caseConfig.appDir, "1\n\nq\n", statusOutput);
    caseConfig.statusAssert(readOutput(statusOutput));
  }

  runScript(caseConfig.appDir, "3\n\nq\n", restoreOutput);
  assertCodesignCalls(2, restoreOutput);
  assertNoPersistentUnpackDir(resourcesDir, restoreOutput);
  assertFakeAsarJsParses(archivePath);
  caseConfig.restoreAssert(archivePath, caseConfig.restoreContext);
  assertIntegrityMatches(caseConfig.appDir, archivePath, `expected ElectronAsarIntegrity hash to match restored ${caseConfig.restoreContext} app.asar header`);
  resetCodesignCalls();
}

function main(): void {
  setupStubs();

  runApplyRestoreCase({
    name: "existing",
    appDir: join(tmpDir, "Existing.app"),
    assetsRoot: join(tmpDir, "existing-assets"),
    applyAssert: (archivePath) => {
      assertApplyState(archivePath);
      if (!existsSync(join(tmpDir, "Existing.app", "Contents", "Resources", "app.asar1"))) {
        fail("expected archive backup to be created on apply");
      }
    },
    restoreAssert: assertGuardedState,
    restoreContext: "restore",
  });

  runApplyRestoreCase({
    name: "supported-26417",
    appDir: join(tmpDir, "Supported26417.app"),
    assetsRoot: join(tmpDir, "supported-26417-assets"),
    appVersion: "26.417.41555",
    appBuild: "1858",
    assetProfile: "26417",
    applyAssert: assertApplyState26417,
    restoreAssert: assertGuardedState26417,
    restoreContext: "26.417 restore",
  });

  const partial26417App = join(tmpDir, "Supported26417Partial.app");
  const partial26417Resources = join(partial26417App, "Contents", "Resources");
  const partial26417Output = join(tmpDir, "apply-26417-partial-output.txt");
  prepareArchivedFakeApp(partial26417App, join(tmpDir, "supported-26417-partial-assets"), "26.417.41555", "1858", "26417-partial");
  runScript(partial26417App, "2\n\nq\n", partial26417Output);
  assertCodesignCalls(1, partial26417Output);
  assertNoPersistentUnpackDir(partial26417Resources, partial26417Output);
  assertFakeAsarJsParses(join(partial26417Resources, "app.asar"));
  assertApplyState26417(join(partial26417Resources, "app.asar"));
  resetCodesignCalls();

  runApplyRestoreCase({
    name: "supported-26422",
    appDir: join(tmpDir, "Supported26422.app"),
    assetsRoot: join(tmpDir, "supported-26422-assets"),
    appVersion: "26.422.21637",
    appBuild: "2056",
    assetProfile: "26422",
    applyAssert: assertApplyState26422,
    restoreAssert: assertGuardedState26422,
    restoreContext: "26.422 restore",
    statusAssert: (output) => {
      assertNotContains(output, "Current state: GPT-5.5 model query selector disabled", "expected 26.422 status to report the GPT-5.5 model query selector as enabled after apply", output);
      assertContains(output, "Current state: GPT-5.5 model query selector enabled", "expected 26.422 status to include the GPT-5.5 model query selector target", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26422-2080",
    appDir: join(tmpDir, "Supported26422Build2080.app"),
    assetsRoot: join(tmpDir, "supported-26422-2080-assets"),
    appVersion: "26.422.30944",
    appBuild: "2080",
    assetProfile: "26422",
    applyAssert: assertApplyState26422WithoutGptPatch,
    restoreAssert: assertGuardedState26422,
    restoreContext: "26.422 build 2080 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.422 build 2080 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => assertNotContains(output, "GPT-5.5 model", "expected 26.422 build 2080 status to omit unpatched GPT-5.5 compatibility targets", output),
  });

  const inlineApp = join(tmpDir, "Supported26422Build2080InlineRestore.app");
  const inlineResources = join(inlineApp, "Contents", "Resources");
  const inlineArchive = join(inlineResources, "app.asar");
  prepareArchivedFakeApp(inlineApp, join(tmpDir, "supported-26422-2080-inline-assets"), "26.422.21637", "2056", "26422");
  runScript(inlineApp, "2\n\nq\n", join(tmpDir, "apply-26422-2080-inline-output.txt"));
  assertApplyState26422(inlineArchive);
  rmSync(join(inlineResources, "app.asar1"), { force: true });
  writeInfoPlist(inlineApp, readFakeAsarHeaderHash(inlineArchive), "26.422.30944", "2080");
  const inlineRestoreOutput = join(tmpDir, "restore-26422-2080-inline-output.txt");
  runScript(inlineApp, "3\n\nq\n", inlineRestoreOutput);
  assertNoPersistentUnpackDir(inlineResources, inlineRestoreOutput);
  assertFakeAsarJsParses(inlineArchive);
  assertGuardedState26422(inlineArchive, "26.422 build 2080 inline restore from 0.5.2 state");
  resetCodesignCalls();

  const futureGptSkipApp = join(tmpDir, "FutureGptSkip.app");
  const futureGptSkipOutput = join(tmpDir, "status-future-gpt-skip-output.txt");
  prepareArchivedFakeApp(futureGptSkipApp, join(tmpDir, "future-gpt-skip-assets"), "26.500.0", "9999", "26422");
  runScript(futureGptSkipApp, "1\n\nq\n", futureGptSkipOutput);
  assertNotContains(readOutput(futureGptSkipOutput), "GPT-5.5 model", "expected post-26.422.30944 status to omit unpatched GPT-5.5 compatibility targets", readOutput(futureGptSkipOutput));
  resetCodesignCalls();

  const legacyApp = join(tmpDir, "Legacy.app");
  const legacyResources = join(legacyApp, "Contents", "Resources");
  const legacyOutput = join(tmpDir, "legacy-output.txt");
  prepareLegacyFakeApp(legacyApp, join(tmpDir, "legacy-unpacked-assets"), join(tmpDir, "legacy-assets"), "legacy-placeholder-hash");
  runScript(legacyApp, "1\n\nq\n", legacyOutput);
  assertCodesignCalls(1, legacyOutput);
  assertNoPersistentUnpackDir(legacyResources, legacyOutput);
  assertFakeAsarJsParses(join(legacyResources, "app.asar"));
  if (!existsSync(join(legacyResources, "app.asar"))) {
    fail("expected legacy unpacked layout to be repacked into app.asar", readOutput(legacyOutput));
  }
  assertGuardedState(join(legacyResources, "app.asar"), "legacy repack");
  assertIntegrityMatches(legacyApp, join(legacyResources, "app.asar"), "expected ElectronAsarIntegrity hash to match migrated app.asar header");
  resetCodesignCalls();

  const unsupportedApp = join(tmpDir, "Unsupported.app");
  const unsupportedResources = join(unsupportedApp, "Contents", "Resources");
  const unsupportedOutput = join(tmpDir, "unsupported-output.txt");
  prepareArchivedFakeApp(unsupportedApp, join(tmpDir, "unsupported-assets"), "99.0.0", "9999");
  runScript(unsupportedApp, "2\n\nq\n", unsupportedOutput);
  assertNoPersistentUnpackDir(unsupportedResources, unsupportedOutput);
  const unsupportedText = readOutput(unsupportedOutput);
  assertNotContains(unsupportedText, "Running local ad-hoc re-sign", "expected unsupported versions to be blocked before re-signing", unsupportedText);
  if (existsSync(join(unsupportedResources, "app.asar1"))) {
    fail("expected unsupported versions to be blocked before creating app.asar1", unsupportedText);
  }
  assertContains(unsupportedText, "Compatibility: unsupported", "expected unsupported compatibility status in output", unsupportedText);
  assertContains(unsupportedText, "Enable custom API features is blocked for this Codex.app version.", "expected apply to be blocked for unsupported versions", unsupportedText);
  assertContains(archiveFile(join(unsupportedResources, "app.asar")), "if(!x)return null;", "expected unsupported version to leave app.asar unchanged");
  resetCodesignCalls();

  const failingApp = join(tmpDir, "Failing.app");
  const failingResources = join(failingApp, "Contents", "Resources");
  const failingOutput = join(tmpDir, "failing-output.txt");
  prepareArchivedFakeApp(failingApp, join(tmpDir, "failing-assets"));
  runScriptWithCodesignFailure(failingApp, "2\n\nq\n", failingOutput);
  assertNoPersistentUnpackDir(failingResources, failingOutput);
  assertFakeAsarJsParses(join(failingResources, "app.asar"));
  const failingText = readOutput(failingOutput);
  assertContains(failingText, `codesign --force --deep --sign - ${failingApp}`, "expected manual re-sign guidance in failure output", failingText);
  assertContains(failingText, "Exit code: 1", "expected a failed action exit code when codesign fails", failingText);

  console.log("re-sign flow test passed");
}

try {
  main();
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
