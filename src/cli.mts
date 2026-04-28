import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawnSync } from "node:child_process";

declare const __PATCHER_SOURCE__: string;

const SUPPORTED_APP_VERSIONS: Record<string, string> = {
  "26.415.40636+1799": "Codex.app 26.415.40636 build 1799",
  "26.417.41555+1858": "Codex.app 26.417.41555 build 1858",
  "26.422.21637+2056": "Codex.app 26.422.21637 build 2056",
  "26.422.30944+2080": "Codex.app 26.422.30944 build 2080",
};

const appBundle = process.env.CODEXFAST_APP_BUNDLE ?? "/Applications/Codex.app";
const appResources = join(appBundle, "Contents", "Resources");
const appInfoPlist = join(appBundle, "Contents", "Info.plist");
const appAsar = join(appResources, "app.asar");
const appAsarBackup = join(appResources, "app.asar1");
const backupSuffix = ".codexfast.bak";
const legacyBackupSuffix = ".speed-setting.bak";
const asarPackage = "@electron/asar@3.4.1";
const supportedAppVersionKeys = Object.keys(SUPPORTED_APP_VERSIONS).join(", ");

let tempRoot = "";
let tempAppDir = "";
let tempAssetsDir = "";
let tempAsar = "";
let appVersion = "unknown";
let appBuild = "unknown";
let appVersionKey = "unknown+unknown";
let appCompatibility = "unsupported";
let appVersionSupported = false;
let nodeBin = "";
let npmBin = "";
let codesignBin = "";
let plistBuddyBin = "";
let tccutilBin = "";

function printLine(message = ""): void {
  console.log(message);
}

function resolveCommand(name: string): string | null {
  const result = spawnSync("sh", ["-c", 'command -v -- "$1"', "sh", name], { encoding: "utf8" });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim() || null;
}

function resolvePlistBuddy(): string | null {
  return existsSync("/usr/libexec/PlistBuddy") ? "/usr/libexec/PlistBuddy" : null;
}

function run(command: string, args: string[], options: { input?: string; env?: NodeJS.ProcessEnv } = {}): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    input: options.input,
    encoding: "utf8",
    env: options.env ?? process.env,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function readBundlePlistValue(key: string, fallback = "unknown"): string {
  const result = run(plistBuddyBin, ["-c", `Print :${key}`, appInfoPlist]);
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function loadAppCompatibilityMetadata(): void {
  appVersion = readBundlePlistValue("CFBundleShortVersionString");
  appBuild = readBundlePlistValue("CFBundleVersion");
  appVersionKey = `${appVersion}+${appBuild}`;
  appVersionSupported = Object.prototype.hasOwnProperty.call(SUPPORTED_APP_VERSIONS, appVersionKey);
  appCompatibility = appVersionSupported ? `supported (${SUPPORTED_APP_VERSIONS[appVersionKey]})` : "unsupported";
}

function cleanupTempWorkspace(): void {
  if (tempRoot && existsSync(tempRoot)) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
  tempRoot = "";
  tempAppDir = "";
  tempAssetsDir = "";
  tempAsar = "";
}

function createTempWorkspace(): boolean {
  cleanupTempWorkspace();
  try {
    tempRoot = mkdtempSync(join(tmpdir(), "codexfast."));
    tempAppDir = join(tempRoot, "app");
    tempAssetsDir = join(tempAppDir, "webview", "assets");
    tempAsar = join(tempRoot, "app.asar");
    return true;
  } catch {
    printLine("Failed to create a temporary workspace.");
    return false;
  }
}

function runAsar(args: string[]): boolean {
  const result = run(npmBin, ["exec", "--yes", "--package", asarPackage, "--", "asar", ...args]);
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    return false;
  }
  return true;
}

function readAsarIntegrityHash(): string {
  const result = run(plistBuddyBin, ["-c", "Print :ElectronAsarIntegrity:Resources/app.asar:hash", appInfoPlist]);
  return result.status === 0 ? result.stdout.trim() : "";
}

function calculateAsarHeaderHash(archivePath = appAsar): string | null {
  try {
    const archive = readFileSync(archivePath);
    const headerStringSize = archive.readUInt32LE(12);
    const headerString = archive.subarray(16, 16 + headerStringSize).toString("utf8");
    return createHash("sha256").update(headerString).digest("hex");
  } catch {
    return null;
  }
}

function updateAsarIntegrityMetadata(): boolean {
  const currentHash = calculateAsarHeaderHash();
  if (!currentHash) {
    printLine("Failed to calculate the Electron ASAR header hash for app.asar.");
    return false;
  }

  if (!readAsarIntegrityHash()) {
    printLine("ElectronAsarIntegrity entry not found in Info.plist. Skipping metadata update.");
    return true;
  }

  const setResult = run(plistBuddyBin, ["-c", `Set :ElectronAsarIntegrity:Resources/app.asar:hash ${currentHash}`, appInfoPlist]);
  if (setResult.status !== 0) {
    printLine("Failed to update ElectronAsarIntegrity hash in Info.plist.");
    return false;
  }

  if (readAsarIntegrityHash() !== currentHash) {
    printLine("ElectronAsarIntegrity hash verification failed after updating Info.plist.");
    return false;
  }

  printLine("Updated ElectronAsarIntegrity hash in Info.plist.");
  return true;
}

function ensureArchiveBackup(): boolean {
  if (existsSync(appAsarBackup)) {
    printLine(`Archive backup already exists: ${appAsarBackup}`);
    return true;
  }
  try {
    writeFileSync(appAsarBackup, readFileSync(appAsar));
    printLine(`Created archive backup: ${appAsarBackup}`);
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
  if (!runAsar(["e", appAsar, tempAppDir])) {
    printLine("Failed to unpack app.asar.");
    return false;
  }
  return true;
}

function packTempAppToAsar(): boolean {
  if (!tempAsar) {
    printLine("Temporary archive path is not available.");
    return false;
  }
  if (!runAsar(["p", tempAppDir, tempAsar])) {
    printLine("Failed to repack app.asar.");
    return false;
  }
  return replaceAppAsarFromTemp();
}

function replaceAppAsarFromTemp(): boolean {
  try {
    renameSync(tempAsar, appAsar);
    return true;
  } catch {
    printLine("Failed to replace app.asar with the repacked archive.");
    return false;
  }
}

function migrateLegacyUnpackedLayout(): boolean {
  const unpackedAppDir = join(appResources, "app");
  if (!existsSync(unpackedAppDir)) {
    return true;
  }

  printLine("Detected legacy unpacked Resources/app layout. Repacking into app.asar.");
  if (!createTempWorkspace()) {
    return false;
  }
  if (!existsSync(appAsarBackup) && existsSync(appAsar)) {
    if (!ensureArchiveBackup()) {
      return false;
    }
  }

  if (!runAsar(["p", unpackedAppDir, tempAsar])) {
    printLine("Failed to repack legacy Resources/app directory.");
    return false;
  }

  if (!replaceAppAsarFromTemp()) {
    return false;
  }
  rmSync(unpackedAppDir, { recursive: true, force: true });
  if (!updateAsarIntegrityMetadata()) {
    return false;
  }
  return resignAppBundle("Legacy unpacked layout was migrated. Re-signing now.");
}

function restoreFromArchiveBackup(): boolean {
  if (!existsSync(appAsarBackup)) {
    return false;
  }
  try {
    writeFileSync(appAsar, readFileSync(appAsarBackup));
    printLine(`Restored app.asar from archive backup: ${appAsarBackup}`);
  } catch {
    printLine("Failed to restore app.asar from archive backup.");
    return false;
  }

  if (!updateAsarIntegrityMetadata()) {
    return false;
  }
  if (!resignAppBundle("Original archive was restored. Re-signing now.")) {
    return false;
  }
  resetScreenRecordingPermission();
  return true;
}

function printManualResignGuidance(): void {
  printLine("Manual fallback:");
  printLine(`  codesign --force --deep --sign - ${appBundle}`);
  printLine(`  codesign --verify --deep --strict --verbose=2 ${appBundle}`);
  printLine("If verification still fails, run Restore original app or reinstall Codex.app.");
}

function resignAppBundle(reason: string): boolean {
  printLine(reason);
  printLine("Running local ad-hoc re-sign...");
  const result = run(codesignBin, ["--force", "--deep", "--sign", "-", appBundle]);
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    printLine("Failed to re-sign Codex.app.");
    printManualResignGuidance();
    return false;
  }

  const verifyResult = run(codesignBin, ["--verify", "--deep", "--strict", "--verbose=2", appBundle]);
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

function resetScreenRecordingPermission(): void {
  const bundleIdentifier = readBundlePlistValue("CFBundleIdentifier", "com.openai.codex");
  const manualCommand = `tccutil reset ScreenCapture ${bundleIdentifier}`;
  if (!tccutilBin) {
    printLine("Could not reset macOS screen recording permission because tccutil was not found.");
    printLine(`Run manually if Codex keeps asking for screen recording permission: ${manualCommand}`);
    return;
  }

  const result = run(tccutilBin, ["reset", "ScreenCapture", bundleIdentifier]);
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    printLine("Failed to reset macOS screen recording permission.");
    printLine(`Run manually if Codex keeps asking for screen recording permission: ${manualCommand}`);
    return;
  }

  printLine(`Reset macOS screen recording permission for ${bundleIdentifier}.`);
  printLine("Open Codex.app again and allow Screen & System Audio Recording when prompted.");
}

function checkRequirements(): boolean {
  if (!existsSync(appResources)) {
    printLine(`Codex resources directory not found: ${appResources}`);
    printLine(`Make sure Codex.app is installed at ${appBundle}.`);
    return false;
  }

  nodeBin = process.execPath;
  npmBin = resolveCommand("npm") ?? "";
  codesignBin = resolveCommand("codesign") ?? "";
  plistBuddyBin = resolvePlistBuddy() ?? "";
  tccutilBin = resolveCommand("tccutil") ?? "";

  if (!npmBin) {
    printLine("npm not found.");
    printLine("Make sure npm is available in your shell.");
    return false;
  }
  if (!codesignBin) {
    printLine("codesign not found.");
    printLine("This macOS environment cannot perform local re-signing.");
    return false;
  }
  if (!plistBuddyBin) {
    printLine("PlistBuddy not found.");
    printLine("This macOS environment cannot update ElectronAsarIntegrity in Info.plist.");
    return false;
  }

  if (!migrateLegacyUnpackedLayout()) {
    return false;
  }
  if (!existsSync(appAsar)) {
    printLine(`app.asar not found: ${appAsar}`);
    return false;
  }

  loadAppCompatibilityMetadata();
  return true;
}

function printActionHeader(action: string): void {
  printLine("");
  printLine(`Action: ${action}`);
  printLine(`Resources: ${appResources}`);
  printLine(`Detected version: ${appVersion}`);
  printLine(`Detected build: ${appBuild}`);
  printLine(`Compatibility: ${appCompatibility}`);
  printLine("Mode: self-contained single file");
  printLine("");
}

function validateActionRequest(action: string): boolean {
  if (action === "apply" && !appVersionSupported) {
    printLine("Enable custom API features is blocked for this Codex.app version.");
    printLine("This script only allows apply on verified compatible builds.");
    printLine(`Supported versions: ${supportedAppVersionKeys}`);
    printLine("");
    printLine("Exit code: 1");
    return false;
  }
  return true;
}

function runEmbeddedPatcher(action: string): number {
  const result = run(nodeBin, ["-", action, tempAssetsDir, backupSuffix, legacyBackupSuffix, appVersionKey], {
    input: __PATCHER_SOURCE__,
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result.status;
}

function finalizeModifiedArchive(action: string): boolean {
  if (action === "apply" && !ensureArchiveBackup()) {
    return false;
  }
  if (!packTempAppToAsar()) {
    return false;
  }
  if (!updateAsarIntegrityMetadata()) {
    return false;
  }
  if (!resignAppBundle("Codex.app resources were modified. Re-signing now.")) {
    return false;
  }
  if (action === "apply" || action === "restore") {
    resetScreenRecordingPermission();
  }
  return true;
}

function runEmbeddedTool(action: string): number {
  let exitCode = 1;
  printActionHeader(action);

  if (!validateActionRequest(action)) {
    return 1;
  }

  if (action === "restore" && existsSync(appAsarBackup)) {
    exitCode = restoreFromArchiveBackup() ? 0 : 1;
    printLine("");
    printLine(`Exit code: ${exitCode}`);
    return exitCode;
  }

  if (!unpackAppAsarToTemp()) {
    return 1;
  }

  exitCode = runEmbeddedPatcher(action);

  if (exitCode === 0 && action !== "status") {
    if (!finalizeModifiedArchive(action)) {
      exitCode = 1;
    }
  }

  cleanupTempWorkspace();
  printLine("");
  printLine(`Exit code: ${exitCode}`);
  return exitCode;
}

async function showMenu(): Promise<number> {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      run("clear", []);
      printLine("codexfast");
      printLine("");
      printLine("1) Check current status");
      printLine("2) Enable custom API features");
      printLine("3) Restore original app");
      printLine("q) Quit");
      printLine("");

      const choice = (await rl.question("Select an option: ")).trim();
      switch (choice) {
        case "1":
          runEmbeddedTool("status");
          await rl.question("Press Enter to continue...");
          break;
        case "2":
          runEmbeddedTool("apply");
          await rl.question("Press Enter to continue...");
          break;
        case "3":
          runEmbeddedTool("restore");
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
  if (!checkRequirements()) {
    cleanupTempWorkspace();
    return 1;
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
