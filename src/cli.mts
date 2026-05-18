import { createHash, randomBytes } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { calculateAsarHeaderHash, removeStaleArchiveTempFiles, replaceArchiveAtomically, snapshotArchive, type ArchiveSnapshot } from "./cli-asar-transaction.mts";
import { CdpConnection, cdpCommandWithTimeout, runCdpFrameSelfTest, waitForRuntimePatchConnection } from "./cli-cdp.mts";
import { isHelpCommand, isHiddenLegacyCleanupCommand, isPublicLaunchCommand, isRuntimeSelftestCommand, isVersionCommand, resolveLegacySelftestAction } from "./cli-command-policy.mts";
import { createCodexfastContext, emptyTempWorkspace } from "./cli-context.mts";
import { printActionHeaderBlock, printExitBlock, printExitCode } from "./cli-output.mts";
import { asError, debugRuntime, escapeXml, printLine, resolveCommand, resolvePlistBuddy, run, sleep } from "./cli-utils.mts";

declare const __PATCHER_SOURCE__: string;
declare const __PACKAGE_VERSION__: string;
declare const __SUPPORTED_APP_VERSIONS__: Record<string, string>;

const SUPPORTED_APP_VERSIONS = __SUPPORTED_APP_VERSIONS__;
const context = createCodexfastContext();
const backupSuffix = ".codexfast.bak";
const legacyBackupSuffix = ".speed-setting.bak";
const asarPackage = "@electron/asar@3.4.1";
const staleArchiveTempFileMs = 10 * 60 * 1000;
const supportedAppVersionKeys = Object.keys(SUPPORTED_APP_VERSIONS).join(", ");
const launchAgentLabel = "com.codexfast.watcher";
const launchAgentFileName = `${launchAgentLabel}.plist`;
const SPARKLE_PUBLIC_ED_KEY_BRIDGES: Record<string, string> = {
  "26.506.31421+2620": "mNfr1v9t63BfgDtlw4C8lRvSY6uMggIXABDOCi3tS6k=",
};

type PatcherRun = {
  status: number;
  stdout: string;
  stderr: string;
};

type ApplySummary = {
  changed: number;
  alreadyPatched: number;
};

type MetadataChangeResult = {
  changed: boolean;
  ok: boolean;
};

type RuntimePatchResult = {
  content: string;
  matchedLabels: string[];
  patchedLabels: string[];
  alreadyPatchedLabels: string[];
};

type FetchHeader = {
  name: string;
  value: string;
};

type FetchRequestPausedParams = {
  requestId: string;
  request: {
    url: string;
  };
  responseHeaders?: FetchHeader[];
  responseStatusCode?: number;
};

type RuntimePatchSessionHandle = {
  patchedLabels: string[];
  close: () => void;
  lost: Promise<Error>;
};

const runtimePatchSessionTimeoutMs = 12_000;
const runtimePatchSettleMs = 750;
const runtimePatchInitialLoadSettleMs = 1_000;
const runtimePatchHeartbeatIntervalMs = 5_000;
const runtimePatchHeartbeatTimeoutMs = 2_000;
const runtimePatchReconnectMaxAttempts = 3;
const runtimePatchReconnectDelayMs = 1_000;

function userHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || "";
}

function launchAgentsDir(): string {
  return join(userHomeDir(), "Library", "LaunchAgents");
}

function codexfastSupportDir(): string {
  return join(userHomeDir(), "Library", "Application Support", "codexfast");
}

function watcherPlistPath(): string {
  return join(launchAgentsDir(), launchAgentFileName);
}

function watcherCliPath(): string {
  return join(codexfastSupportDir(), "codexfast-watcher.js");
}

function launchctlDomain(): string {
  const getuid = process.getuid;
  if (typeof getuid !== "function") {
    throw new Error("Cannot resolve the launchctl GUI domain on this platform.");
  }
  return `gui/${getuid()}`;
}

function readBundlePlistValue(key: string, fallback = "unknown"): string {
  const result = run(context.toolchain.plistBuddy, ["-c", `Print :${key}`, context.paths.infoPlist]);
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function loadAppCompatibilityMetadata(): void {
  context.metadata.version = readBundlePlistValue("CFBundleShortVersionString");
  context.metadata.build = readBundlePlistValue("CFBundleVersion");
  context.metadata.versionKey = `${context.metadata.version}+${context.metadata.build}`;
  context.metadata.supported = Object.prototype.hasOwnProperty.call(SUPPORTED_APP_VERSIONS, context.metadata.versionKey);
  context.metadata.compatibility = context.metadata.supported ? `supported (${SUPPORTED_APP_VERSIONS[context.metadata.versionKey]})` : "unsupported";
}

function cleanupTempWorkspace(): void {
  if (context.temp.root && existsSync(context.temp.root)) {
    rmSync(context.temp.root, { recursive: true, force: true });
  }
  context.temp.root = "";
  context.temp.appDir = "";
  context.temp.assetsDir = "";
  context.temp.asar = "";
}

function createTempWorkspace(): boolean {
  cleanupTempWorkspace();
  try {
    context.temp.root = mkdtempSync(join(tmpdir(), "codexfast."));
    context.temp.appDir = join(context.temp.root, "app");
    context.temp.assetsDir = join(context.temp.appDir, "webview", "assets");
    context.temp.asar = join(context.temp.root, "app.asar");
    return true;
  } catch {
    printLine("Failed to create a temporary workspace.");
    return false;
  }
}

function runAsar(args: string[]): boolean {
  const result = run(context.toolchain.npm, ["exec", "--yes", "--package", asarPackage, "--", "asar", ...args]);
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    return false;
  }
  return true;
}

function readAsarIntegrityHash(): string {
  const result = run(context.toolchain.plistBuddy, ["-c", "Print :ElectronAsarIntegrity:Resources/app.asar:hash", context.paths.infoPlist]);
  return result.status === 0 ? result.stdout.trim() : "";
}

function writeAsarIntegrityHash(hash: string, options: { failureMessage?: string; verificationFailureMessage?: string } = {}): boolean {
  const setResult = run(context.toolchain.plistBuddy, ["-c", `Set :ElectronAsarIntegrity:Resources/app.asar:hash ${hash}`, context.paths.infoPlist]);
  if (setResult.status !== 0) {
    printLine(options.failureMessage ?? "Failed to update ElectronAsarIntegrity hash in Info.plist.");
    return false;
  }
  if (readAsarIntegrityHash() !== hash) {
    printLine(options.verificationFailureMessage ?? "ElectronAsarIntegrity hash verification failed after updating Info.plist.");
    return false;
  }
  return true;
}

function readSparklePublicEdKey(): string {
  return readBundlePlistValue("SUPublicEDKey", "");
}

function writeSparklePublicEdKey(value: string): boolean {
  const setResult = run(context.toolchain.plistBuddy, ["-c", `Set :SUPublicEDKey ${value}`, context.paths.infoPlist]);
  if (setResult.status !== 0) {
    const addResult = run(context.toolchain.plistBuddy, ["-c", `Add :SUPublicEDKey string ${value}`, context.paths.infoPlist]);
    if (addResult.status !== 0) {
      return false;
    }
  }
  return readSparklePublicEdKey() === value;
}

function syncSparklePublicEdKeyForInAppUpdates(): MetadataChangeResult {
  const targetKey = SPARKLE_PUBLIC_ED_KEY_BRIDGES[context.metadata.versionKey];
  if (!targetKey) {
    return { changed: false, ok: true };
  }

  const currentKey = readSparklePublicEdKey();
  if (currentKey === targetKey) {
    return { changed: false, ok: true };
  }

  try {
    if (!existsSync(context.paths.sparklePublicEdKeyBackup)) {
      writeFileSync(context.paths.sparklePublicEdKeyBackup, currentKey, "utf8");
    }
  } catch {
    printLine("Failed to back up the Sparkle public EdDSA key.");
    return { changed: false, ok: false };
  }

  if (!writeSparklePublicEdKey(targetKey)) {
    printLine("Failed to update the Sparkle public EdDSA key for in-app updates.");
    return { changed: false, ok: false };
  }

  printLine("Updated Sparkle public EdDSA key for in-app updates.");
  return { changed: true, ok: true };
}

function restoreSparklePublicEdKeyBackup(): MetadataChangeResult {
  if (!existsSync(context.paths.sparklePublicEdKeyBackup)) {
    return { changed: false, ok: true };
  }

  let originalKey = "";
  try {
    originalKey = readFileSync(context.paths.sparklePublicEdKeyBackup, "utf8").trim();
  } catch {
    printLine("Failed to read the Sparkle public EdDSA key backup.");
    return { changed: false, ok: false };
  }

  if (!writeSparklePublicEdKey(originalKey)) {
    printLine("Failed to restore the Sparkle public EdDSA key backup.");
    return { changed: false, ok: false };
  }

  try {
    rmSync(context.paths.sparklePublicEdKeyBackup, { force: true });
  } catch {
    printLine("Failed to remove the Sparkle public EdDSA key backup.");
    return { changed: true, ok: false };
  }

  printLine("Restored Sparkle public EdDSA key backup.");
  return { changed: true, ok: true };
}

function updateAsarIntegrityMetadata(): boolean {
  const currentHash = calculateAsarHeaderHash(context.paths.asar);
  if (!currentHash) {
    printLine("Failed to calculate the Electron ASAR header hash for app.asar.");
    return false;
  }

  if (!readAsarIntegrityHash()) {
    printLine("ElectronAsarIntegrity entry not found in Info.plist. Skipping metadata update.");
    return true;
  }

  if (!writeAsarIntegrityHash(currentHash)) {
    return false;
  }

  printLine("Updated ElectronAsarIntegrity hash in Info.plist.");
  return true;
}

function createArchiveSnapshot(): ArchiveSnapshot | null {
  if (!context.temp.root && !createTempWorkspace()) {
    return null;
  }

  const snapshot = snapshotArchive(context.temp.root, context.paths.asar, readAsarIntegrityHash());
  if (!snapshot) {
    printLine("Failed to snapshot the current app.asar before replacing it.");
    return null;
  }
  return snapshot;
}

function restoreArchiveSnapshot(snapshot: ArchiveSnapshot): boolean {
  let archiveRestored = false;
  if (snapshot.archivePath) {
    printLine("Reverting to the pre-change app.asar after failed integrity update.");
    archiveRestored = replaceAppAsarFrom(snapshot.archivePath, "Failed to restore the previous app.asar after integrity update failure.");
  } else {
    printLine("Removing app.asar created during failed integrity update.");
    try {
      rmSync(context.paths.asar, { force: true });
      archiveRestored = true;
    } catch {
      printLine("Failed to remove app.asar after integrity update failure.");
    }
  }

  let integrityRestored = true;
  if (snapshot.integrityHash && readAsarIntegrityHash() !== snapshot.integrityHash) {
    integrityRestored = writeAsarIntegrityHash(snapshot.integrityHash, {
      failureMessage: "Failed to restore previous ElectronAsarIntegrity hash in Info.plist.",
      verificationFailureMessage: "ElectronAsarIntegrity hash verification failed after restoring previous Info.plist hash.",
    });
  }

  return archiveRestored && integrityRestored;
}

function ensureArchiveBackup(): boolean {
  if (existsSync(context.paths.asarBackup)) {
    printLine(`Archive backup already exists: ${context.paths.asarBackup}`);
    return true;
  }
  try {
    writeFileSync(context.paths.asarBackup, readFileSync(context.paths.asar));
    printLine(`Created archive backup: ${context.paths.asarBackup}`);
    return true;
  } catch {
    printLine("Failed to create app.asar backup.");
    return false;
  }
}

function unpackAppAsarToTemp(): boolean {
  if (!createTempWorkspace()) {
    return false;
  }
  if (!runAsar(["e", context.paths.asar, context.temp.appDir])) {
    printLine("Failed to unpack app.asar.");
    return false;
  }
  if (!existsSync(context.temp.assetsDir)) {
    printLine(`Assets directory not found: ${context.temp.assetsDir}`);
    return false;
  }
  return true;
}

function packTempAppToAsar(): boolean {
  if (!context.temp.asar) {
    printLine("Temporary archive path is not available.");
    return false;
  }
  if (!runAsar(["p", context.temp.appDir, context.temp.asar])) {
    printLine("Failed to repack app.asar.");
    return false;
  }
  return true;
}

function replaceAppAsarFrom(sourceArchive: string, failureMessage: string): boolean {
  const tempFileName = `.codexfast.${process.pid}.${randomBytes(6).toString("hex")}.app.asar.tmp`;
  if (replaceArchiveAtomically(sourceArchive, context.paths.asar, context.paths.resources, tempFileName)) {
    return true;
  }
  printLine(failureMessage);
  return false;
}

function commitArchiveWithIntegrity(sourceArchive: string, snapshot: ArchiveSnapshot): boolean {
  if (!replaceAppAsarFrom(sourceArchive, "Failed to replace app.asar with the repacked archive.")) {
    return false;
  }
  if (updateAsarIntegrityMetadata()) {
    return true;
  }
  if (!restoreArchiveSnapshot(snapshot)) {
    printLine("Bundle may be in an inconsistent state. Re-run restore or reinstall Codex.app.");
  }
  return false;
}

function cleanupStaleArchiveTempFiles(): void {
  removeStaleArchiveTempFiles(context.paths.resources, Date.now() - staleArchiveTempFileMs);
}

function migrateLegacyUnpackedLayout(): boolean {
  const unpackedAppDir = join(context.paths.resources, "app");
  if (!existsSync(unpackedAppDir)) {
    return true;
  }

  printLine("Detected legacy unpacked Resources/app layout. Repacking into app.asar.");
  if (!createTempWorkspace()) {
    return false;
  }
  try {
    if (!existsSync(context.paths.asarBackup) && existsSync(context.paths.asar)) {
      if (!ensureArchiveBackup()) {
        return false;
      }
    }

    const snapshot = createArchiveSnapshot();
    if (!snapshot) {
      return false;
    }

    if (!runAsar(["p", unpackedAppDir, context.temp.asar])) {
      printLine("Failed to repack legacy Resources/app directory.");
      return false;
    }

    if (!commitArchiveWithIntegrity(context.temp.asar, snapshot)) {
      return false;
    }
    rmSync(unpackedAppDir, { recursive: true, force: true });
    return resignAppBundle("Legacy unpacked layout was migrated. Re-signing now.");
  } finally {
    cleanupTempWorkspace();
  }
}

function restoreFromArchiveBackup(): boolean {
  if (!existsSync(context.paths.asarBackup)) {
    return false;
  }

  if (!createTempWorkspace()) {
    return false;
  }
  try {
    const snapshot = createArchiveSnapshot();
    if (!snapshot) {
      return false;
    }
    printLine(`Restoring app.asar from archive backup: ${context.paths.asarBackup}`);
    if (!commitArchiveWithIntegrity(context.paths.asarBackup, snapshot)) {
      return false;
    }
    const metadataChange = restoreSparklePublicEdKeyBackup();
    if (!metadataChange.ok) {
      return false;
    }
    if (!resignAppBundle("Original archive was restored. Re-signing now.")) {
      return false;
    }
    return true;
  } finally {
    cleanupTempWorkspace();
  }
}

function printManualResignGuidance(): void {
  printLine("Manual fallback:");
  printLine(`  codesign --force --deep --sign - ${context.paths.bundle}`);
  printLine(`  codesign --verify --deep --strict --verbose=2 ${context.paths.bundle}`);
  printLine("If verification still fails, run Restore original app or reinstall Codex.app.");
}

function officialCodexDownloadUrl(): string | null {
  if (!context.metadata.version || context.metadata.version === "unknown") {
    return null;
  }
  return `https://persistent.oaistatic.com/codex-app-prod/Codex-darwin-arm64-${context.metadata.version}.zip`;
}

function printOfficialReinstallGuidanceAfterRestore(): void {
  printLine("");
  printLine("Official signature recovery:");
  printLine("  Restore keeps the existing codexfast rollback behavior and re-signs locally.");
  printLine("  To recover the OpenAI Developer ID signature, reinstall the official Codex.app build manually.");
  const downloadUrl = officialCodexDownloadUrl();
  if (downloadUrl) {
    printLine(`  Current-version download: ${downloadUrl}`);
  } else {
    printLine("  Appcast: https://persistent.oaistatic.com/codex-app-prod/appcast.xml");
  }
}

function resignAppBundle(reason: string): boolean {
  printLine(reason);
  printLine("Running local ad-hoc re-sign...");
  const result = run(context.toolchain.codesign, ["--force", "--deep", "--sign", "-", context.paths.bundle]);
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    printLine("Failed to re-sign Codex.app.");
    printManualResignGuidance();
    return false;
  }

  const verifyResult = run(context.toolchain.codesign, ["--verify", "--deep", "--strict", "--verbose=2", context.paths.bundle]);
  if (verifyResult.status !== 0) {
    process.stdout.write(verifyResult.stdout);
    process.stderr.write(verifyResult.stderr);
    printLine("Failed to verify the re-signed Codex.app.");
    printManualResignGuidance();
    return false;
  }

  printLine("Re-sign completed.");
  return true;
}

function checkRequirements(options: { command?: string } = {}): boolean {
  if (!existsSync(context.paths.resources)) {
    printLine(`Codex resources directory not found: ${context.paths.resources}`);
    printLine(`Make sure Codex.app is installed at ${context.paths.bundle}.`);
    return false;
  }

  context.toolchain.node = process.execPath;
  context.toolchain.plistBuddy = resolvePlistBuddy() ?? "";

  if (!context.toolchain.plistBuddy) {
    printLine("PlistBuddy not found.");
    printLine("This macOS environment cannot update ElectronAsarIntegrity in Info.plist.");
    return false;
  }

  cleanupStaleArchiveTempFiles();

  loadAppCompatibilityMetadata();

  if ((options.command === "repair" && !context.metadata.supported) || options.command === "launch") {
    return true;
  }

  context.toolchain.npm = resolveCommand("npm") ?? "";
  context.toolchain.npx = resolveCommand("npx") ?? "";
  context.toolchain.codesign = resolveCommand("codesign") ?? "";

  if (!context.toolchain.npm) {
    printLine("npm not found.");
    printLine("Make sure npm is available in your shell.");
    return false;
  }
  if (options.command === "install-watcher" && !context.toolchain.npx) {
    printLine("npx not found.");
    printLine("Make sure npx is available in your shell.");
    return false;
  }
  if (!context.toolchain.codesign) {
    printLine("codesign not found.");
    printLine("This macOS environment cannot perform local re-signing.");
    return false;
  }

  return true;
}

function printActionHeader(action: string): void {
  printActionHeaderBlock(action, {
    resources: context.paths.resources,
    version: context.metadata.version,
    build: context.metadata.build,
    compatibility: context.metadata.compatibility,
  });
}

function validateActionRequest(action: string): boolean {
  if ((action === "apply" || action === "repair") && !context.metadata.supported) {
    if (action === "repair") {
      printLine("Repair skipped because this Codex.app build is unsupported.");
      printLine("No app files were modified.");
      printLine(`Supported versions: ${supportedAppVersionKeys}`);
      printExitBlock(0);
      return false;
    }
    printLine("Enable custom API features is blocked for this Codex.app version.");
    printLine("This script only allows apply on verified compatible builds.");
    printLine(`Supported versions: ${supportedAppVersionKeys}`);
    printExitBlock(1);
    return false;
  }
  return true;
}

function removeWatcherFiles(options: { quietLaunchctl?: boolean; reportRemoved?: boolean } = {}): boolean {
  const hadWatcherFiles = existsSync(watcherPlistPath()) || existsSync(watcherCliPath());
  runLaunchctl(["bootout", launchctlDomain(), watcherPlistPath()], { quiet: options.quietLaunchctl });
  try {
    rmSync(watcherPlistPath(), { force: true });
    rmSync(watcherCliPath(), { force: true });
  } catch {
    return false;
  }
  if (hadWatcherFiles && options.reportRemoved) {
    printLine("Removed auto-repair watcher before restore.");
  }
  return true;
}

function removeLegacyWatcherFiles(options: { quietLaunchctl?: boolean; reportRemoved?: boolean } = {}): boolean {
  const hadWatcherFiles = existsSync(watcherPlistPath()) || existsSync(watcherCliPath());
  if (!removeWatcherFiles({ quietLaunchctl: options.quietLaunchctl })) {
    return false;
  }
  if (hadWatcherFiles && options.reportRemoved) {
    printLine("Removed legacy auto-repair watcher.");
  }
  return true;
}

function cleanupLegacyWatcherCommand(): number {
  if (!removeLegacyWatcherFiles({ quietLaunchctl: true, reportRemoved: true })) {
    printLine("Failed to remove legacy auto-repair watcher.");
    return printExitBlock(1).exitCode;
  }
  return printExitBlock(0).exitCode;
}

function parseApplySummary(output: string): ApplySummary | null {
  const match = output.match(/summary: changed=(\d+), alreadyPatched=(\d+)/);
  if (!match) {
    return null;
  }
  return {
    changed: Number(match[1]),
    alreadyPatched: Number(match[2]),
  };
}

function runEmbeddedPatcher(action: string): PatcherRun {
  const patcherAction = action === "repair" ? "apply" : action;
  const result = run(context.toolchain.node, ["-", patcherAction, context.temp.assetsDir, backupSuffix, legacyBackupSuffix, context.metadata.versionKey], {
    input: __PATCHER_SOURCE__,
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result;
}

function finalizeModifiedArchive(action: string): boolean {
  if ((action === "apply" || action === "repair") && !ensureArchiveBackup()) {
    return false;
  }
  const snapshot = createArchiveSnapshot();
  if (!snapshot) {
    return false;
  }
  if (!packTempAppToAsar()) {
    return false;
  }
  if (!commitArchiveWithIntegrity(context.temp.asar, snapshot)) {
    return false;
  }
  if (action === "apply" || action === "repair") {
    const metadataChange = syncSparklePublicEdKeyForInAppUpdates();
    if (!metadataChange.ok) {
      return false;
    }
  }
  if (!resignAppBundle("Codex.app resources were modified. Re-signing now.")) {
    return false;
  }
  return true;
}

function runEmbeddedTool(action: string): number {
  let exitCode = 1;
  printActionHeader(action);

  if (!validateActionRequest(action)) {
    return action === "repair" ? 0 : 1;
  }

  if (action === "restore" && !removeWatcherFiles({ quietLaunchctl: true, reportRemoved: true })) {
    printLine("Warning: failed to remove the auto-repair watcher before restore.");
    printLine("Run uninstall-watcher manually if restore is re-applied automatically.");
  }

  if (!migrateLegacyUnpackedLayout()) {
    return 1;
  }
  if (!existsSync(context.paths.asar)) {
    printLine(`app.asar not found: ${context.paths.asar}`);
    return 1;
  }

  if (action === "restore" && existsSync(context.paths.asarBackup)) {
    exitCode = restoreFromArchiveBackup() ? 0 : 1;
    if (exitCode === 0) {
      printOfficialReinstallGuidanceAfterRestore();
    }
    printExitBlock(exitCode);
    return exitCode;
  }

  if (!unpackAppAsarToTemp()) {
    cleanupTempWorkspace();
    return printExitBlock(1).exitCode;
  }

  const patcherRun = runEmbeddedPatcher(action);
  exitCode = patcherRun.status;

  if (exitCode === 0 && action !== "status") {
    if (action === "apply" || action === "repair") {
      const summary = parseApplySummary(patcherRun.stdout);
      if (summary && summary.changed === 0) {
        const metadataChange = syncSparklePublicEdKeyForInAppUpdates();
        if (!metadataChange.ok) {
          exitCode = 1;
        } else if (metadataChange.changed) {
          if (!resignAppBundle("Codex.app metadata was modified. Re-signing now.")) {
            exitCode = 1;
          }
        } else {
          printLine("No patch changes were needed; leaving app.asar and signature untouched.");
        }
      } else if (!finalizeModifiedArchive(action)) {
        exitCode = 1;
      }
    } else if (!finalizeModifiedArchive(action)) {
      exitCode = 1;
    }
  }

  cleanupTempWorkspace();
  if (action === "restore" && exitCode === 0) {
    printOfficialReinstallGuidanceAfterRestore();
  }
  printExitBlock(exitCode);
  return exitCode;
}

type CodexRunningCheck =
  | { ok: true; running: boolean }
  | { ok: false; message: string };

function checkCodexRunning(): CodexRunningCheck {
  if (process.env.CODEXFAST_TEST_CODEX_RUNNING === "1") {
    return { ok: true, running: true };
  }

  const pgrepBin = resolveCommand("pgrep");
  if (!pgrepBin) {
    return { ok: false, message: "Cannot determine whether Codex.app is running because pgrep was not found." };
  }

  const result = run(pgrepBin, ["-x", "Codex"]);
  if (result.status === 0) {
    return { ok: true, running: true };
  }
  if (result.status === 1) {
    return { ok: true, running: false };
  }
  return { ok: false, message: `Cannot determine whether Codex.app is running because pgrep failed with exit code ${result.status}.` };
}

function randomDebugPort(): number {
  return 40_000 + randomBytes(2).readUInt16BE(0) % 20_000;
}

function codexExecutablePath(): string {
  return join(context.paths.bundle, "Contents", "MacOS", "Codex");
}

function launchCodexProcess(debugPort: number): ChildProcess {
  const executable = codexExecutablePath();
  if (!existsSync(executable)) {
    throw new Error(`Codex executable not found: ${executable}`);
  }

  const child = spawn(
    executable,
    [
      `--remote-debugging-port=${debugPort}`,
      "--remote-debugging-address=127.0.0.1",
    ],
    {
      detached: true,
      stdio: "ignore",
      env: process.env,
    },
  );
  child.on("error", () => undefined);
  child.unref();
  return child;
}

function terminateRuntimeLaunchProcess(child: ChildProcess): void {
  if (!child.pid || child.killed) {
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill();
  }
}

let runtimePatchBodyFunction: ((resourcePath: string, body: string) => RuntimePatchResult) | null = null;

function applyRuntimePatchesToResponseBody(resourcePath: string, body: string): RuntimePatchResult {
  if (!runtimePatchBodyFunction) {
    const tailMarker = "\nlet exitCode = 1;\n";
    const tailIndex = __PATCHER_SOURCE__.lastIndexOf(tailMarker);
    if (tailIndex === -1) {
      throw new Error("Embedded runtime patch engine entrypoint was not found.");
    }
    const patcherMarkerIndexes = ['\nconst fs = require("node:fs");\n', '\nconst fs = require("fs");\n']
      .map((marker) => __PATCHER_SOURCE__.indexOf(marker))
      .filter((index) => index >= 0);
    const patcherIndex = patcherMarkerIndexes.length > 0 ? Math.min(...patcherMarkerIndexes) : -1;
    const engineEnd = patcherIndex === -1 ? tailIndex : patcherIndex;
    const engineSource = __PATCHER_SOURCE__.slice(0, engineEnd);
    const factory = new Function(`${engineSource}\nreturn applyRuntimePatchesToBody;`) as () => unknown;
    const candidate = factory();
    if (typeof candidate !== "function") {
      throw new Error("Embedded runtime patch engine is unavailable.");
    }
    runtimePatchBodyFunction = candidate as (resourcePath: string, body: string) => RuntimePatchResult;
  }
  return runtimePatchBodyFunction(resourcePath, body);
}

function isRuntimeJavaScriptResource(resourceUrl: string): boolean {
  return /^app:\/\/[^?#]+\/(?:webview\/)?assets\/[^/?#]+\.js(?:[?#].*)?$/.test(resourceUrl);
}

function runRuntimeUrlSelfTest(): number {
  const acceptedUrls = [
    "app://-/assets/index-DxnGmFpS.js",
    "app://-/assets/index-DxnGmFpS.js?v=1",
    "app://-/webview/assets/index.js",
    "app://codex.local/webview/assets/chunk.js#hash",
  ];
  const rejectedUrls = [
    "app://-/index.html",
    "app://-/assets/style.css",
    "https://example.com/assets/index.js",
    "app://-/assets/nested/index.js",
  ];

  for (const url of acceptedUrls) {
    if (!isRuntimeJavaScriptResource(url)) {
      printLine(`Runtime URL self-test failed: expected accepted ${url}`);
      return 1;
    }
  }

  for (const url of rejectedUrls) {
    if (isRuntimeJavaScriptResource(url)) {
      printLine(`Runtime URL self-test failed: expected rejected ${url}`);
      return 1;
    }
  }

  printLine("Runtime URL self-test passed");
  return 0;
}

function runRuntimePatchBodySelfTest(): number {
  const body = "settings.agent.speed.label;n=se(),{serviceTierSettings:r,setServiceTier:i}=fe();if(!n)return null;let o;";
  let result: RuntimePatchResult;
  try {
    result = applyRuntimePatchesToResponseBody("app://-/assets/general-settings-demo.js", body);
  } catch (error) {
    printLine(`Runtime patch body self-test failed: ${asError(error).message}`);
    return 1;
  }

  if (!result.content.includes("{serviceTierSettings:r,setServiceTier:i}=fe();let o;") || !result.patchedLabels.includes("Speed setting")) {
    printLine("Runtime patch body self-test failed");
    return 1;
  }

  printLine("Runtime patch body self-test passed");
  return 0;
}

function responseHeadersForFulfill(headers: FetchHeader[] | undefined): FetchHeader[] {
  const forwarded: FetchHeader[] = [];
  for (const header of headers ?? []) {
    const name = header.name.toLowerCase();
    if (name === "content-type" || name === "charset") {
      forwarded.push({ name: header.name, value: header.value });
    }
  }
  if (!forwarded.some((header) => header.name.toLowerCase() === "content-type")) {
    forwarded.push({ name: "content-type", value: "application/javascript; charset=utf-8" });
  }
  return forwarded;
}

async function continueFetchRequest(cdp: CdpConnection, requestId: string): Promise<void> {
  await cdp.send("Fetch.continueRequest", { requestId });
}

async function handleFetchRequestPaused(
  cdp: CdpConnection,
  params: FetchRequestPausedParams,
): Promise<string[]> {
  const resourceUrl = params.request.url;
  if (!isRuntimeJavaScriptResource(resourceUrl)) {
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }
  debugRuntime(`paused ${resourceUrl}`);

  let bodyResult: { body?: string; base64Encoded?: boolean };
  try {
    bodyResult = await cdp.send("Fetch.getResponseBody", { requestId: params.requestId });
  } catch {
    debugRuntime(`getResponseBody failed ${resourceUrl}`);
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }

  if (typeof bodyResult.body !== "string") {
    debugRuntime(`missing body ${resourceUrl}`);
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }

  const body = bodyResult.base64Encoded ? Buffer.from(bodyResult.body, "base64").toString("utf8") : bodyResult.body;
  let patchResult: RuntimePatchResult;
  try {
    patchResult = applyRuntimePatchesToResponseBody(resourceUrl, body);
  } catch (error) {
    debugRuntime(`patch failed ${resourceUrl}: ${asError(error).message}`);
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }
  const labels = [...patchResult.patchedLabels, ...patchResult.alreadyPatchedLabels];
  if (patchResult.matchedLabels.length > 0) {
    debugRuntime(`matched ${resourceUrl}: ${patchResult.matchedLabels.join(", ")}`);
  }

  if (patchResult.content === body) {
    await continueFetchRequest(cdp, params.requestId);
    return labels;
  }

  await cdp.send("Fetch.fulfillRequest", {
    requestId: params.requestId,
    responseCode: params.responseStatusCode ?? 200,
    responseHeaders: responseHeadersForFulfill(params.responseHeaders),
    body: Buffer.from(patchResult.content, "utf8").toString("base64"),
  });
  return labels;
}

function runtimePatchSessionLostMessage(error: Error): string {
  return `Runtime patch session lost after ${runtimePatchReconnectMaxAttempts} reconnect attempts: ${error.message}`;
}

function printRuntimePatchSessionLost(error: Error): void {
  printLine(error.message);
  printLine("Codex.app will keep running without further runtime patching.");
  printLine("Lazy-loaded features that were not patched before this point may stay unavailable until you fully quit Codex and relaunch with codexfast.");
}

function printRuntimeLaunchReady(patchedLabels: string[]): void {
  printLine("Patched targets:");
  for (const label of patchedLabels) {
    printLine(`  ${label}`);
  }
  printLine("");
  printLine("Runtime launch completed.");
  printLine("Keep this codexfast launch process running while you use Codex.");
  printLine("Quit Codex to end the runtime patch session.");
}

function waitForRuntimeInitialPageLoad(cdp: CdpConnection): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const resolveOnce = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve();
    };

    timeout = setTimeout(resolveOnce, runtimePatchInitialLoadSettleMs);
    cdp.on("Page.loadEventFired", resolveOnce);
    cdp.on("Page.frameStoppedLoading", resolveOnce);
  });
}

async function enableRuntimePatchInterception(cdp: CdpConnection, options: { waitForInitialLoad: boolean; reload: boolean }): Promise<void> {
  await cdp.send("Page.enable");
  debugRuntime("Page.enable ok");
  if (options.waitForInitialLoad) {
    await waitForRuntimeInitialPageLoad(cdp);
    debugRuntime("initial page load settled");
  }
  await cdp.send("Fetch.enable", {
    patterns: [
      {
        urlPattern: "app://*/assets/*.js",
        requestStage: "Response",
      },
      {
        urlPattern: "app://*/webview/assets/*.js",
        requestStage: "Response",
      },
    ],
  });
  debugRuntime("Fetch.enable ok");
  if (options.reload) {
    await cdp.send("Page.reload", { ignoreCache: true });
    debugRuntime("Page.reload ok");
  }
}

async function startRuntimePatchSession(debugPort: number): Promise<RuntimePatchSessionHandle> {
  let cdp = await waitForRuntimePatchConnection(debugPort);
  const observedLabels = new Set<string>();
  const pausedRequestHandlers = new Set<Promise<void>>();
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let failSession: (error: Error) => void = () => undefined;
  let keepSessionOpen = false;
  let initialCompleted = false;
  let closed = false;
  let reconnecting = false;
  let connectionGeneration = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let resolveLost: (error: Error) => void = () => undefined;
  let markInitialObserved: () => void = () => undefined;
  const lost = new Promise<Error>((resolve) => {
    resolveLost = resolve;
  });

  const stopHeartbeat = (): void => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const markSessionLost = (error: Error): void => {
    if (closed) {
      return;
    }
    closed = true;
    stopHeartbeat();
    cdp.close();
    resolveLost(error);
  };

  const reconnectRuntimePatchSession = async (reason: Error): Promise<void> => {
    if (closed || reconnecting) {
      return;
    }
    reconnecting = true;
    cdp.close();
    let lastError = reason;

    for (let attempt = 1; attempt <= runtimePatchReconnectMaxAttempts; attempt += 1) {
      if (closed) {
        reconnecting = false;
        return;
      }
      if (attempt > 1) {
        await sleep(runtimePatchReconnectDelayMs);
      }
      printLine(`Runtime patch session reconnecting (${attempt}/${runtimePatchReconnectMaxAttempts})...`);
      try {
        const nextCdp = await waitForRuntimePatchConnection(debugPort);
        connectionGeneration += 1;
        cdp = nextCdp;
        registerRuntimeFetchHandler(connectionGeneration);
        await enableRuntimePatchInterception(cdp, { waitForInitialLoad: false, reload: true });
        printLine("Runtime patch session reconnected.");
        reconnecting = false;
        return;
      } catch (error) {
        lastError = asError(error);
        cdp.close();
      }
    }

    reconnecting = false;
    markSessionLost(new Error(runtimePatchSessionLostMessage(lastError)));
  };

  const handleConnectionFailure = (generation: number, error: Error): void => {
    if (closed || generation !== connectionGeneration) {
      return;
    }
    if (!initialCompleted) {
      failSession(error);
      return;
    }
    void reconnectRuntimePatchSession(error);
  };

  const registerRuntimeFetchHandler = (generation: number): void => {
    const attachedCdp = cdp;
    attachedCdp.onEventError((error) => {
      handleConnectionFailure(generation, error);
    });
    attachedCdp.on("Fetch.requestPaused", (params: unknown) => {
      const task = handleFetchRequestPaused(attachedCdp, params as FetchRequestPausedParams)
        .then((labels) => {
          let sawNewLabel = false;
          for (const label of labels) {
            if (!observedLabels.has(label)) {
              sawNewLabel = true;
            }
            observedLabels.add(label);
          }
          if (!initialCompleted && labels.length > 0) {
            markInitialObserved();
          }
          if (initialCompleted && sawNewLabel) {
            debugRuntime(`patched labels now active: ${[...observedLabels].join(", ")}`);
          }
        });
      pausedRequestHandlers.add(task);
      task.then(
        () => pausedRequestHandlers.delete(task),
        () => pausedRequestHandlers.delete(task),
      );
      return task;
    });
  };

  const startHeartbeat = (): void => {
    heartbeatTimer = setInterval(() => {
      if (closed || reconnecting) {
        return;
      }
      if (cdp.isClosed()) {
        void reconnectRuntimePatchSession(new Error("CDP WebSocket connection closed."));
        return;
      }
      void cdpCommandWithTimeout(cdp.send("Page.getFrameTree"), runtimePatchHeartbeatTimeoutMs, "Timed out waiting for CDP heartbeat.")
        .catch((error: unknown) => {
          void reconnectRuntimePatchSession(asError(error));
        });
    }, runtimePatchHeartbeatIntervalMs);
  };

  try {
    const initialSession = new Promise<string[]>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let completed = false;
      let finishStarted = false;

      const clearSessionTimers = (): void => {
        if (settleTimer) {
          clearTimeout(settleTimer);
          settleTimer = null;
        }
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      };

      const fail = (error: Error): void => {
        if (completed) {
          return;
        }
        completed = true;
        clearSessionTimers();
        reject(error);
      };
      failSession = fail;

      const finish = (): void => {
        if (completed || finishStarted) {
          return;
        }
        finishStarted = true;
        clearSessionTimers();
        void (async () => {
          try {
            while (pausedRequestHandlers.size > 0) {
              await Promise.all([...pausedRequestHandlers]);
            }
          } catch (error) {
            fail(asError(error));
            return;
          }
          if (completed) {
            return;
          }
          if (observedLabels.size === 0) {
            fail(new Error("Runtime patch interception completed without required targets."));
            return;
          }
          completed = true;
          initialCompleted = true;
          resolve([...observedLabels]);
        })();
      };

      const markObserved = (): void => {
        if (completed || settleTimer) {
          return;
        }
        settleTimer = setTimeout(finish, runtimePatchSettleMs);
      };
      markInitialObserved = markObserved;

      timeout = setTimeout(finish, runtimePatchSessionTimeoutMs);
    });
    void initialSession.catch(() => undefined);
    registerRuntimeFetchHandler(connectionGeneration);

    try {
      await enableRuntimePatchInterception(cdp, { waitForInitialLoad: true, reload: true });
    } catch (error) {
      failSession(asError(error));
    }

    const patchedLabels = await initialSession;
    keepSessionOpen = true;
    startHeartbeat();
    return {
      patchedLabels,
      close: () => {
        closed = true;
        stopHeartbeat();
        cdp.close();
      },
      lost,
    };
  } finally {
    if (!keepSessionOpen) {
      closed = true;
      stopHeartbeat();
      cdp.close();
    }
  }
}

async function waitForRuntimePatchSession(debugPort: number): Promise<RuntimePatchSessionHandle> {
  return startRuntimePatchSession(debugPort);
}

function waitForRuntimeLaunchProcessExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exitCode: number): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(exitCode);
    };

    child.once("error", () => finish(1));
    child.once("exit", (code) => finish(code ?? 0));
  });
}

async function runRuntimeLaunch(): Promise<number> {
  printActionHeader("launch");

  if (!context.metadata.supported) {
    printLine("Runtime launch is blocked for this Codex.app version.");
    printLine(`Supported versions: ${supportedAppVersionKeys}`);
    return printExitBlock(1).exitCode;
  }

  if (!removeLegacyWatcherFiles({ quietLaunchctl: true, reportRemoved: true })) {
    printLine("Failed to remove legacy auto-repair watcher.");
    return printExitBlock(1).exitCode;
  }

  const runningCheck = checkCodexRunning();
  if (!runningCheck.ok) {
    printLine(runningCheck.message);
    return printExitBlock(1).exitCode;
  }

  if (runningCheck.running) {
    printLine("Codex.app is already running. Quit Codex.app before using runtime launch.");
    return printExitBlock(1).exitCode;
  }

  if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS === "1") {
    printRuntimeLaunchReady(["Speed setting"]);
    if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SESSION_LOST === "1") {
      printRuntimePatchSessionLost(new Error(runtimePatchSessionLostMessage(new Error("simulated CDP heartbeat failure"))));
      return printExitBlock(0).exitCode;
    }
    return printExitCode(0).exitCode;
  }

  let child: ChildProcess | null = null;
  let session: RuntimePatchSessionHandle | null = null;
  try {
    const debugPort = randomDebugPort();
    child = launchCodexProcess(debugPort);
    const childExit = waitForRuntimeLaunchProcessExit(child);
    session = await waitForRuntimePatchSession(debugPort);
    printRuntimeLaunchReady(session.patchedLabels);
    const outcome = await Promise.race([
      childExit.then((exitCode) => ({ type: "child-exit" as const, exitCode })),
      session.lost.then((error) => ({ type: "session-lost" as const, error })),
    ]);
    if (outcome.type === "session-lost") {
      session.close();
      session = null;
      printRuntimePatchSessionLost(outcome.error);
      return printExitBlock(0).exitCode;
    }
    session.close();
    session = null;
    printExitCode(outcome.exitCode);
    return outcome.exitCode;
  } catch (error) {
    if (session) {
      session.close();
      session = null;
    }
    if (child && !child.killed) {
      terminateRuntimeLaunchProcess(child);
    }
    printLine(`Runtime launch failed: ${asError(error).message}`);
  }

  return printExitBlock(1).exitCode;
}

function watcherRunnerSource(): string {
  return `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

const result = spawnSync(${JSON.stringify(context.toolchain.npx)}, ["--yes", "codexfast@latest", "repair"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
`;
}

function writeWatcherRunner(): boolean {
  if (!context.toolchain.npx) {
    context.toolchain.npx = resolveCommand("npx") ?? "";
  }
  if (!context.toolchain.npx) {
    printLine("npx not found.");
    printLine("Make sure npx is available in your shell.");
    return false;
  }
  try {
    mkdirSync(codexfastSupportDir(), { recursive: true });
    writeFileSync(watcherCliPath(), watcherRunnerSource(), "utf8");
    chmodSync(watcherCliPath(), 0o755);
    return true;
  } catch {
    printLine("Failed to install the watcher runner.");
    return false;
  }
}

function watcherPlist(): string {
  const environmentEntries = [
    ["CODEXFAST_APP_BUNDLE", context.paths.bundle],
    ["PATH", process.env.PATH ?? "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"],
  ];
  const environmentXml = environmentEntries
    .map(([key, value]) => `      <key>${escapeXml(key)}</key>\n      <string>${escapeXml(value)}</string>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(launchAgentLabel)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(process.execPath)}</string>
    <string>${escapeXml(watcherCliPath())}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
${environmentXml}
  </dict>
  <key>WatchPaths</key>
  <array>
    <string>${escapeXml(context.paths.asar)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>60</integer>
</dict>
</plist>
`;
}

function runLaunchctl(args: string[], options: { quiet?: boolean } = {}): boolean {
  const launchctlBin = resolveCommand("launchctl");
  if (!launchctlBin) {
    if (!options.quiet) {
      printLine("launchctl not found.");
    }
    return false;
  }
  const result = run(launchctlBin, args);
  if (result.status !== 0) {
    if (!options.quiet) {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
    }
    return false;
  }
  return true;
}

function installWatcher(): number {
  printActionHeader("install-watcher");
  if (!existsSync(context.paths.asar)) {
    printLine(`app.asar not found: ${context.paths.asar}`);
    return printExitBlock(1).exitCode;
  }
  if (!writeWatcherRunner()) {
    return printExitBlock(1).exitCode;
  }
  try {
    mkdirSync(launchAgentsDir(), { recursive: true });
    writeFileSync(watcherPlistPath(), watcherPlist());
  } catch {
    printLine("Failed to write the launchd watcher plist.");
    return printExitBlock(1).exitCode;
  }

  runLaunchctl(["bootout", launchctlDomain(), watcherPlistPath()], { quiet: true });
  if (!runLaunchctl(["bootstrap", launchctlDomain(), watcherPlistPath()])) {
    printLine("Watcher plist was written, but launchctl failed to load it.");
    return printExitBlock(1).exitCode;
  }
  printLine(`Installed watcher: ${watcherPlistPath()}`);
  return printExitBlock(0).exitCode;
}

function uninstallWatcher(): number {
  printActionHeader("uninstall-watcher");
  if (!removeWatcherFiles()) {
    printLine("Failed to remove all watcher files.");
    return printExitBlock(1).exitCode;
  }
  printLine("Uninstalled watcher.");
  return printExitBlock(0).exitCode;
}

function printUsage(): void {
  printLine(`codexfast ${__PACKAGE_VERSION__}`);
  printLine("");
  printLine("Usage:");
  printLine("  codexfast");
  printLine("  codexfast <command>");
  printLine("");
  printLine("Commands:");
  printLine("  launch             Launch Codex with runtime patches (recommended)");
  printLine("  version            Print the codexfast version");
  printLine("  help               Show this help");
}

function printVersion(): void {
  printLine(`codexfast ${__PACKAGE_VERSION__}`);
}

async function showMenu(): Promise<number> {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      run("clear", []);
      printLine("codexfast");
      printLine("");
      printLine("1) Launch Codex with runtime patches (recommended)");
      printLine("q) Quit");
      printLine("");

      const choice = (await rl.question("Select an option: ")).trim();
      switch (choice) {
        case "1":
          await runRuntimeLaunch();
          await rl.question("Press Enter to continue...");
          break;
        case "q":
        case "Q":
          return 0;
        default:
          printLine("Unknown option.");
          await rl.question("Press Enter to continue...");
      }
    }
  } finally {
    rl.close();
    cleanupTempWorkspace();
  }
}

async function main(): Promise<number> {
  // Keep accepting the old watcher marker so existing launchd plists can reach
  // the cleanup-only compatibility path, but do not advertise it for new use.
  const args = process.argv.slice(2).filter((arg) => arg !== "--quiet");
  const command = args[0] ?? "";
  const legacySelftestAction = resolveLegacySelftestAction(command);

  if (isRuntimeSelftestCommand(command) && command === "__selftest-cdp-frame") {
    return runCdpFrameSelfTest();
  }
  if (isRuntimeSelftestCommand(command) && command === "__selftest-runtime-url") {
    return runRuntimeUrlSelfTest();
  }
  if (isRuntimeSelftestCommand(command) && command === "__selftest-runtime-patch-body") {
    return runRuntimePatchBodySelfTest();
  }
  if (legacySelftestAction === "__invalid__") {
    printUsage();
    return 1;
  }

  if (isHelpCommand(command)) {
    printUsage();
    return 0;
  }
  if (isVersionCommand(command)) {
    printVersion();
    return 0;
  }
  if (isHiddenLegacyCleanupCommand(command)) {
    return cleanupLegacyWatcherCommand();
  }
  if (command && !isPublicLaunchCommand(command) && !legacySelftestAction) {
    printUsage();
    return 1;
  }

  const effectiveCommand = legacySelftestAction || command;
  if (!checkRequirements({ command: effectiveCommand })) {
    cleanupTempWorkspace();
    return 1;
  }

  if (legacySelftestAction) {
    return runEmbeddedTool(legacySelftestAction);
  }

  if (isPublicLaunchCommand(command)) {
    return await runRuntimeLaunch();
  }

  return showMenu();
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    cleanupTempWorkspace();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
