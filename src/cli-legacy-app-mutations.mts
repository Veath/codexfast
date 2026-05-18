import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  calculateAsarHeaderHash,
  removeStaleArchiveTempFiles,
  replaceArchiveAtomically,
  snapshotArchive,
  type ArchiveSnapshot,
} from "./cli-asar-transaction.mts";
import type { CodexfastContext } from "./cli-context.mts";
import { printLine, run } from "./cli-utils.mts";

export type MetadataChangeResult = {
  changed: boolean;
  ok: boolean;
};

export type LegacyAppMutationOptions = {
  asarPackage: string;
  context: CodexfastContext;
  sparklePublicEdKeyBridges: Record<string, string>;
  staleArchiveTempFileMs: number;
};

export function createLegacyAppMutations(options: LegacyAppMutationOptions) {
  const {
    asarPackage,
    context,
    sparklePublicEdKeyBridges,
    staleArchiveTempFileMs,
  } = options;

  function readBundlePlistValue(key: string, fallback = 'unknown'): string {
    const result = run(context.toolchain.plistBuddy, [
      '-c',
      `Print :${key}`,
      context.paths.infoPlist,
    ]);
    return result.status === 0 ? result.stdout.trim() : fallback;
  }
  
  function cleanupTempWorkspace(): void {
    if (context.temp.root && existsSync(context.temp.root)) {
      rmSync(context.temp.root, { recursive: true, force: true });
    }
    context.temp.root = '';
    context.temp.appDir = '';
    context.temp.assetsDir = '';
    context.temp.asar = '';
  }
  
  function createTempWorkspace(): boolean {
    cleanupTempWorkspace();
    try {
      context.temp.root = mkdtempSync(join(tmpdir(), 'codexfast.'));
      context.temp.appDir = join(context.temp.root, 'app');
      context.temp.assetsDir = join(context.temp.appDir, 'webview', 'assets');
      context.temp.asar = join(context.temp.root, 'app.asar');
      return true;
    } catch {
      printLine('Failed to create a temporary workspace.');
      return false;
    }
  }
  
  function runAsar(args: string[]): boolean {
    const result = run(context.toolchain.npm, [
      'exec',
      '--yes',
      '--package',
      asarPackage,
      '--',
      'asar',
      ...args,
    ]);
    if (result.status !== 0) {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      return false;
    }
    return true;
  }
  
  function readAsarIntegrityHash(): string {
    const result = run(context.toolchain.plistBuddy, [
      '-c',
      'Print :ElectronAsarIntegrity:Resources/app.asar:hash',
      context.paths.infoPlist,
    ]);
    return result.status === 0 ? result.stdout.trim() : '';
  }
  
  function writeAsarIntegrityHash(
    hash: string,
    options: {
      failureMessage?: string;
      verificationFailureMessage?: string;
    } = {},
  ): boolean {
    const setResult = run(context.toolchain.plistBuddy, [
      '-c',
      `Set :ElectronAsarIntegrity:Resources/app.asar:hash ${hash}`,
      context.paths.infoPlist,
    ]);
    if (setResult.status !== 0) {
      printLine(
        options.failureMessage ??
          'Failed to update ElectronAsarIntegrity hash in Info.plist.',
      );
      return false;
    }
    if (readAsarIntegrityHash() !== hash) {
      printLine(
        options.verificationFailureMessage ??
          'ElectronAsarIntegrity hash verification failed after updating Info.plist.',
      );
      return false;
    }
    return true;
  }
  
  function readSparklePublicEdKey(): string {
    return readBundlePlistValue('SUPublicEDKey', '');
  }
  
  function writeSparklePublicEdKey(value: string): boolean {
    const setResult = run(context.toolchain.plistBuddy, [
      '-c',
      `Set :SUPublicEDKey ${value}`,
      context.paths.infoPlist,
    ]);
    if (setResult.status !== 0) {
      const addResult = run(context.toolchain.plistBuddy, [
        '-c',
        `Add :SUPublicEDKey string ${value}`,
        context.paths.infoPlist,
      ]);
      if (addResult.status !== 0) {
        return false;
      }
    }
    return readSparklePublicEdKey() === value;
  }
  
  function syncSparklePublicEdKeyForInAppUpdates(): MetadataChangeResult {
    const targetKey = sparklePublicEdKeyBridges[context.metadata.versionKey];
    if (!targetKey) {
      return { changed: false, ok: true };
    }
  
    const currentKey = readSparklePublicEdKey();
    if (currentKey === targetKey) {
      return { changed: false, ok: true };
    }
  
    try {
      if (!existsSync(context.paths.sparklePublicEdKeyBackup)) {
        writeFileSync(context.paths.sparklePublicEdKeyBackup, currentKey, 'utf8');
      }
    } catch {
      printLine('Failed to back up the Sparkle public EdDSA key.');
      return { changed: false, ok: false };
    }
  
    if (!writeSparklePublicEdKey(targetKey)) {
      printLine(
        'Failed to update the Sparkle public EdDSA key for in-app updates.',
      );
      return { changed: false, ok: false };
    }
  
    printLine('Updated Sparkle public EdDSA key for in-app updates.');
    return { changed: true, ok: true };
  }
  
  function restoreSparklePublicEdKeyBackup(): MetadataChangeResult {
    if (!existsSync(context.paths.sparklePublicEdKeyBackup)) {
      return { changed: false, ok: true };
    }
  
    let originalKey = '';
    try {
      originalKey = readFileSync(
        context.paths.sparklePublicEdKeyBackup,
        'utf8',
      ).trim();
    } catch {
      printLine('Failed to read the Sparkle public EdDSA key backup.');
      return { changed: false, ok: false };
    }
  
    if (!writeSparklePublicEdKey(originalKey)) {
      printLine('Failed to restore the Sparkle public EdDSA key backup.');
      return { changed: false, ok: false };
    }
  
    try {
      rmSync(context.paths.sparklePublicEdKeyBackup, { force: true });
    } catch {
      printLine('Failed to remove the Sparkle public EdDSA key backup.');
      return { changed: true, ok: false };
    }
  
    printLine('Restored Sparkle public EdDSA key backup.');
    return { changed: true, ok: true };
  }
  
  function updateAsarIntegrityMetadata(): boolean {
    const currentHash = calculateAsarHeaderHash(context.paths.asar);
    if (!currentHash) {
      printLine(
        'Failed to calculate the Electron ASAR header hash for app.asar.',
      );
      return false;
    }
  
    if (!readAsarIntegrityHash()) {
      printLine(
        'ElectronAsarIntegrity entry not found in Info.plist. Skipping metadata update.',
      );
      return true;
    }
  
    if (!writeAsarIntegrityHash(currentHash)) {
      return false;
    }
  
    printLine('Updated ElectronAsarIntegrity hash in Info.plist.');
    return true;
  }
  
  function createArchiveSnapshot(): ArchiveSnapshot | null {
    if (!context.temp.root && !createTempWorkspace()) {
      return null;
    }
  
    const snapshot = snapshotArchive(
      context.temp.root,
      context.paths.asar,
      readAsarIntegrityHash(),
    );
    if (!snapshot) {
      printLine('Failed to snapshot the current app.asar before replacing it.');
      return null;
    }
    return snapshot;
  }
  
  function restoreArchiveSnapshot(snapshot: ArchiveSnapshot): boolean {
    let archiveRestored = false;
    if (snapshot.archivePath) {
      printLine(
        'Reverting to the pre-change app.asar after failed integrity update.',
      );
      archiveRestored = replaceAppAsarFrom(
        snapshot.archivePath,
        'Failed to restore the previous app.asar after integrity update failure.',
      );
    } else {
      printLine('Removing app.asar created during failed integrity update.');
      try {
        rmSync(context.paths.asar, { force: true });
        archiveRestored = true;
      } catch {
        printLine('Failed to remove app.asar after integrity update failure.');
      }
    }
  
    let integrityRestored = true;
    if (
      snapshot.integrityHash &&
      readAsarIntegrityHash() !== snapshot.integrityHash
    ) {
      integrityRestored = writeAsarIntegrityHash(snapshot.integrityHash, {
        failureMessage:
          'Failed to restore previous ElectronAsarIntegrity hash in Info.plist.',
        verificationFailureMessage:
          'ElectronAsarIntegrity hash verification failed after restoring previous Info.plist hash.',
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
      printLine('Failed to create app.asar backup.');
      return false;
    }
  }
  
  function unpackAppAsarToTemp(): boolean {
    if (!createTempWorkspace()) {
      return false;
    }
    if (!runAsar(['e', context.paths.asar, context.temp.appDir])) {
      printLine('Failed to unpack app.asar.');
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
      printLine('Temporary archive path is not available.');
      return false;
    }
    if (!runAsar(['p', context.temp.appDir, context.temp.asar])) {
      printLine('Failed to repack app.asar.');
      return false;
    }
    return true;
  }
  
  function replaceAppAsarFrom(
    sourceArchive: string,
    failureMessage: string,
  ): boolean {
    const tempFileName = `.codexfast.${process.pid}.${randomBytes(6).toString('hex')}.app.asar.tmp`;
    if (
      replaceArchiveAtomically(
        sourceArchive,
        context.paths.asar,
        context.paths.resources,
        tempFileName,
      )
    ) {
      return true;
    }
    printLine(failureMessage);
    return false;
  }
  
  function commitArchiveWithIntegrity(
    sourceArchive: string,
    snapshot: ArchiveSnapshot,
  ): boolean {
    if (
      !replaceAppAsarFrom(
        sourceArchive,
        'Failed to replace app.asar with the repacked archive.',
      )
    ) {
      return false;
    }
    if (updateAsarIntegrityMetadata()) {
      return true;
    }
    if (!restoreArchiveSnapshot(snapshot)) {
      printLine(
        'Bundle may be in an inconsistent state. Re-run restore or reinstall Codex.app.',
      );
    }
    return false;
  }
  
  function cleanupStaleArchiveTempFiles(): void {
    removeStaleArchiveTempFiles(
      context.paths.resources,
      Date.now() - staleArchiveTempFileMs,
    );
  }
  
  function migrateLegacyUnpackedLayout(): boolean {
    const unpackedAppDir = join(context.paths.resources, 'app');
    if (!existsSync(unpackedAppDir)) {
      return true;
    }
  
    printLine(
      'Detected legacy unpacked Resources/app layout. Repacking into app.asar.',
    );
    if (!createTempWorkspace()) {
      return false;
    }
    try {
      if (
        !existsSync(context.paths.asarBackup) &&
        existsSync(context.paths.asar)
      ) {
        if (!ensureArchiveBackup()) {
          return false;
        }
      }
  
      const snapshot = createArchiveSnapshot();
      if (!snapshot) {
        return false;
      }
  
      if (!runAsar(['p', unpackedAppDir, context.temp.asar])) {
        printLine('Failed to repack legacy Resources/app directory.');
        return false;
      }
  
      if (!commitArchiveWithIntegrity(context.temp.asar, snapshot)) {
        return false;
      }
      rmSync(unpackedAppDir, { recursive: true, force: true });
      return resignAppBundle(
        'Legacy unpacked layout was migrated. Re-signing now.',
      );
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
      printLine(
        `Restoring app.asar from archive backup: ${context.paths.asarBackup}`,
      );
      if (!commitArchiveWithIntegrity(context.paths.asarBackup, snapshot)) {
        return false;
      }
      const metadataChange = restoreSparklePublicEdKeyBackup();
      if (!metadataChange.ok) {
        return false;
      }
      if (!resignAppBundle('Original archive was restored. Re-signing now.')) {
        return false;
      }
      return true;
    } finally {
      cleanupTempWorkspace();
    }
  }
  
  function printManualResignGuidance(): void {
    printLine('Manual fallback:');
    printLine(`  codesign --force --deep --sign - ${context.paths.bundle}`);
    printLine(
      `  codesign --verify --deep --strict --verbose=2 ${context.paths.bundle}`,
    );
    printLine(
      'If verification still fails, run Restore original app or reinstall Codex.app.',
    );
  }
  
  function officialCodexDownloadUrl(): string | null {
    if (!context.metadata.version || context.metadata.version === 'unknown') {
      return null;
    }
    return `https://persistent.oaistatic.com/codex-app-prod/Codex-darwin-arm64-${context.metadata.version}.zip`;
  }
  
  function printOfficialReinstallGuidanceAfterRestore(): void {
    printLine('');
    printLine('Official signature recovery:');
    printLine(
      '  Restore keeps the existing codexfast rollback behavior and re-signs locally.',
    );
    printLine(
      '  To recover the OpenAI Developer ID signature, reinstall the official Codex.app build manually.',
    );
    const downloadUrl = officialCodexDownloadUrl();
    if (downloadUrl) {
      printLine(`  Current-version download: ${downloadUrl}`);
    } else {
      printLine(
        '  Appcast: https://persistent.oaistatic.com/codex-app-prod/appcast.xml',
      );
    }
  }
  
  function resignAppBundle(reason: string): boolean {
    printLine(reason);
    printLine('Running local ad-hoc re-sign...');
    const result = run(context.toolchain.codesign, [
      '--force',
      '--deep',
      '--sign',
      '-',
      context.paths.bundle,
    ]);
    if (result.status !== 0) {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      printLine('Failed to re-sign Codex.app.');
      printManualResignGuidance();
      return false;
    }
  
    const verifyResult = run(context.toolchain.codesign, [
      '--verify',
      '--deep',
      '--strict',
      '--verbose=2',
      context.paths.bundle,
    ]);
    if (verifyResult.status !== 0) {
      process.stdout.write(verifyResult.stdout);
      process.stderr.write(verifyResult.stderr);
      printLine('Failed to verify the re-signed Codex.app.');
      printManualResignGuidance();
      return false;
    }
  
    printLine('Re-sign completed.');
    return true;
  }
  
  

  return {
    cleanupStaleArchiveTempFiles,
    cleanupTempWorkspace,
    commitArchiveWithIntegrity,
    createArchiveSnapshot,
    ensureArchiveBackup,
    migrateLegacyUnpackedLayout,
    packTempAppToAsar,
    printOfficialReinstallGuidanceAfterRestore,
    resignAppBundle,
    restoreFromArchiveBackup,
    syncSparklePublicEdKeyForInAppUpdates,
    unpackAppAsarToTemp,
  };
}
