import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { fail } from "./assertions.mts";

type AsarNode = { files?: Record<string, AsarNode>; size?: number; offset?: string };

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

export function writeFakeAsar(sourcePath: string, archivePath: string): void {
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

export function readFakeAsarFile(archivePath: string, relativePath = "webview/assets/general-settings.js"): string {
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

export function readFakeAsarHeaderHash(archivePath: string): string {
  const archive = readFileSync(archivePath);
  const headerStringSize = archive.readUInt32LE(12);
  const headerString = archive.subarray(16, 16 + headerStringSize).toString("utf8");
  return createHash("sha256").update(headerString).digest("hex");
}

export function extractFakeAsar(archivePath: string, outputDir: string): void {
  const archive = readFileSync(archivePath);
  const headerBufferSize = archive.readUInt32LE(4);
  const headerStringSize = archive.readUInt32LE(12);
  const header = JSON.parse(archive.subarray(16, 16 + headerStringSize).toString("utf8")) as AsarNode;

  function walk(node: AsarNode, segments: string[] = []): void {
    for (const [name, value] of Object.entries(node.files ?? {})) {
      const nextSegments = [...segments, name];
      if (value.files) {
        walk(value, nextSegments);
        continue;
      }

      const destination = join(outputDir, ...nextSegments);
      mkdirSync(dirname(destination), { recursive: true });
      const fileOffset = 8 + headerBufferSize + Number(value.offset);
      writeFileSync(destination, archive.subarray(fileOffset, fileOffset + Number(value.size)));
    }
  }

  walk(header);
}

export function assertFakeAsarJsParses(archivePath: string): void {
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
