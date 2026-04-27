import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fail } from "./assertions.mts";

function writeExecutable(path: string, content: string): void {
  writeFileSync(path, content);
  chmodSync(path, 0o755);
}

export function setupStubs(stubBin: string, markerFile: string): void {
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
if [ "\${CODEXFAST_TEST_CODESIGN_VERIFY_FAIL:-0}" = "1" ] && [ "$1" = "--verify" ]; then
  printf '%s\\n' "codesign: invalid signature" >&2
  exit 1
fi
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
  if (process.env.CODEXFAST_TEST_ASAR_PACK_FAIL === "1" && archivePath.includes("codexfast.")) {
    console.error("asar pack failed");
    process.exit(1);
  }
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

export function runScript(options: {
  rootDir: string;
  stubBin: string;
  appDir: string;
  input: string;
  outputFile: string;
  extraEnv?: Record<string, string>;
}): void {
  const result = spawnSync(join(options.rootDir, "bin", "codexfast"), {
    input: options.input,
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.extraEnv,
      PATH: `${options.stubBin}:${process.env.PATH ?? ""}`,
      CODEXFAST_APP_BUNDLE: options.appDir,
    },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  writeFileSync(options.outputFile, output);
  if (result.status !== 0 && options.extraEnv?.CODEXFAST_TEST_ALLOW_NONZERO !== "1") {
    fail(`codexfast exited with ${result.status}`, output);
  }
}

export function readOutput(outputFile: string): string {
  return readFileSync(outputFile, "utf8");
}

export function assertCodesignCalls(expectedMin: number, markerFile: string, outputFile: string): void {
  if (!existsSync(markerFile)) {
    fail("expected codesign to be invoked", readOutput(outputFile));
  }
  const callCount = readFileSync(markerFile, "utf8").trim().split("\n").filter(Boolean).length;
  if (callCount < expectedMin) {
    fail(`expected codesign to run at least ${expectedMin} times, got ${callCount}`, `${readFileSync(markerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}

export function assertCodesignCallContains(expected: string, markerFile: string, outputFile: string): void {
  if (!existsSync(markerFile)) {
    fail("expected codesign to be invoked", readOutput(outputFile));
  }
  const calls = readFileSync(markerFile, "utf8");
  if (!calls.includes(expected)) {
    fail(`expected codesign call to include ${expected}`, `${calls}\n${readOutput(outputFile)}`);
  }
}

export function resetCodesignCalls(markerFile: string): void {
  if (existsSync(markerFile)) {
    unlinkSync(markerFile);
  }
}
