import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import {
  calculateAsarHeaderHash,
  removeStaleArchiveTempFiles,
  replaceArchiveAtomically,
  snapshotArchive,
  type ArchiveSnapshot,
} from './cli-asar-transaction.mts';
import {
  runCdpFrameSelfTest,
} from './cli-cdp.mts';
import {
  isHelpCommand,
  isHiddenLegacyCleanupCommand,
  isPublicLaunchCommand,
  isRuntimeSelftestCommand,
  isVersionCommand,
  resolveLegacySelftestAction,
} from './cli-command-policy.mts';
import { checkRequirements } from './cli-app-environment.mts';
import { createCodexfastContext } from './cli-context.mts';
import {
  printActionHeaderBlock,
  printExitBlock,
  printExitCode,
} from './cli-output.mts';
import {
  runLegacyEmbeddedTool,
  type LegacyPatchFlowOptions,
} from './cli-legacy-patch-flow.mts';
import {
  createLegacyAppMutations,
  type LegacyAppMutationOptions,
} from './cli-legacy-app-mutations.mts';
import {
  runRuntimePatchBodySourceSelfTest,
  runRuntimeUrlSelfTest,
} from './cli-runtime-patcher.mts';
import { runRuntimeLaunch } from './cli-runtime-launch.mts';
import {
  createWatcherFlow,
  type WatcherFlowOptions,
} from './cli-watcher.mts';
import {
  asError,
  printLine,
  resolveCommand,
  run,
} from './cli-utils.mts';

declare const __PATCHER_SOURCE__: string;
declare const __PACKAGE_VERSION__: string;
declare const __SUPPORTED_APP_VERSIONS__: Record<string, string>;

const SUPPORTED_APP_VERSIONS = __SUPPORTED_APP_VERSIONS__;
const context = createCodexfastContext();
const backupSuffix = '.codexfast.bak';
const legacyBackupSuffix = '.speed-setting.bak';
const asarPackage = "@electron/asar@3.4.1";
const staleArchiveTempFileMs = 10 * 60 * 1000;
const supportedAppVersionKeys = Object.keys(SUPPORTED_APP_VERSIONS).join(', ');
const launchAgentLabel = 'com.codexfast.watcher';
const launchAgentFileName = `${launchAgentLabel}.plist`;
const SPARKLE_PUBLIC_ED_KEY_BRIDGES: Record<string, string> = {
  '26.506.31421+2620': 'mNfr1v9t63BfgDtlw4C8lRvSY6uMggIXABDOCi3tS6k=',
};

function printActionHeader(action: string): void {
  printActionHeaderBlock(action, {
    resources: context.paths.resources,
    version: context.metadata.version,
    build: context.metadata.build,
    compatibility: context.metadata.compatibility,
  });
}

function validateActionRequest(action: string): boolean {
  if (
    (action === 'apply' || action === 'repair') &&
    !context.metadata.supported
  ) {
    if (action === 'repair') {
      printLine('Repair skipped because this Codex.app build is unsupported.');
      printLine('No app files were modified.');
      printLine(`Supported versions: ${supportedAppVersionKeys}`);
      printExitBlock(0);
      return false;
    }
    printLine(
      'Enable custom API features is blocked for this Codex.app version.',
    );
    printLine('This script only allows apply on verified compatible builds.');
    printLine(`Supported versions: ${supportedAppVersionKeys}`);
    printExitBlock(1);
    return false;
  }
  return true;
}

function printUsage(): void {
  printLine(`codexfast ${__PACKAGE_VERSION__}`);
  printLine('');
  printLine('Usage:');
  printLine('  codexfast');
  printLine('  codexfast <command>');
  printLine('');
  printLine('Commands:');
  printLine(
    '  launch             Launch Codex with runtime patches (recommended)',
  );
  printLine('  version            Print the codexfast version');
  printLine('  help               Show this help');
}

function printVersion(): void {
  printLine(`codexfast ${__PACKAGE_VERSION__}`);
}

function runRuntimeLaunchCommand(): Promise<number> {
  return runRuntimeLaunch({
    context,
    patcherSource: __PATCHER_SOURCE__,
    supportedAppVersionKeys,
    printActionHeader,
    removeLegacyWatcherFiles: (options) =>
      createWatcherFlow(watcherFlowOptions()).removeLegacyWatcherFiles(options),
  });
}

function watcherFlowOptions(): WatcherFlowOptions {
  return {
    context,
    launchAgentLabel,
    launchAgentFileName,
    printActionHeader,
  };
}

function legacyAppMutationOptions(): LegacyAppMutationOptions {
  return {
    asarPackage,
    context,
    sparklePublicEdKeyBridges: SPARKLE_PUBLIC_ED_KEY_BRIDGES,
    staleArchiveTempFileMs,
  };
}

function legacyPatchFlowOptions(): LegacyPatchFlowOptions {
  const watcherFlow = createWatcherFlow(watcherFlowOptions());
  const appMutations = createLegacyAppMutations(legacyAppMutationOptions());
  return {
    context,
    patcherSource: __PATCHER_SOURCE__,
    backupSuffix,
    legacyBackupSuffix,
    printActionHeader,
    validateActionRequest,
    removeWatcherFiles: watcherFlow.removeWatcherFiles,
    migrateLegacyUnpackedLayout: appMutations.migrateLegacyUnpackedLayout,
    restoreFromArchiveBackup: appMutations.restoreFromArchiveBackup,
    printOfficialReinstallGuidanceAfterRestore:
      appMutations.printOfficialReinstallGuidanceAfterRestore,
    unpackAppAsarToTemp: appMutations.unpackAppAsarToTemp,
    cleanupTempWorkspace: appMutations.cleanupTempWorkspace,
    ensureArchiveBackup: appMutations.ensureArchiveBackup,
    createArchiveSnapshot: appMutations.createArchiveSnapshot,
    packTempAppToAsar: appMutations.packTempAppToAsar,
    commitArchiveWithIntegrity: appMutations.commitArchiveWithIntegrity,
    syncSparklePublicEdKeyForInAppUpdates:
      appMutations.syncSparklePublicEdKeyForInAppUpdates,
    resignAppBundle: appMutations.resignAppBundle,
  };
}

async function showMenu(): Promise<number> {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      run('clear', []);
      printLine('codexfast');
      printLine('');
      printLine('1) Launch Codex with runtime patches (recommended)');
      printLine('q) Quit');
      printLine('');

      const choice = (await rl.question('Select an option: ')).trim();
      switch (choice) {
        case '1':
          await runRuntimeLaunchCommand();
          await rl.question('Press Enter to continue...');
          break;
        case 'q':
        case 'Q':
          return 0;
        default:
          printLine('Unknown option.');
          await rl.question('Press Enter to continue...');
      }
    }
  } finally {
    rl.close();
    createLegacyAppMutations(legacyAppMutationOptions()).cleanupTempWorkspace();
  }
}

async function main(): Promise<number> {
  // Keep accepting the old watcher marker so existing launchd plists can reach
  // the cleanup-only compatibility path, but do not advertise it for new use.
  const args = process.argv.slice(2).filter((arg) => arg !== '--quiet');
  const command = args[0] ?? '';
  const legacySelftestAction = resolveLegacySelftestAction(command);

  if (isRuntimeSelftestCommand(command) && command === '__selftest-cdp-frame') {
    return runCdpFrameSelfTest();
  }
  if (
    isRuntimeSelftestCommand(command) &&
    command === '__selftest-runtime-url'
  ) {
    return runRuntimeUrlSelfTest();
  }
  if (
    isRuntimeSelftestCommand(command) &&
    command === '__selftest-runtime-patch-body'
  ) {
    return runRuntimePatchBodySourceSelfTest(__PATCHER_SOURCE__);
  }
  if (legacySelftestAction === '__invalid__') {
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
    return createWatcherFlow(watcherFlowOptions()).cleanupLegacyWatcherCommand();
  }
  if (command && !isPublicLaunchCommand(command) && !legacySelftestAction) {
    printUsage();
    return 1;
  }

  const effectiveCommand = legacySelftestAction || command;
  if (
    !checkRequirements({
      command: effectiveCommand,
      context,
      cleanupStaleArchiveTempFiles:
        createLegacyAppMutations(legacyAppMutationOptions())
          .cleanupStaleArchiveTempFiles,
      supportedAppVersionKeys,
      supportedAppVersions: SUPPORTED_APP_VERSIONS,
    })
  ) {
    createLegacyAppMutations(legacyAppMutationOptions()).cleanupTempWorkspace();
    return 1;
  }

  if (legacySelftestAction) {
    return runLegacyEmbeddedTool(
      legacyPatchFlowOptions(),
      legacySelftestAction,
    );
  }

  if (isPublicLaunchCommand(command)) {
    return await runRuntimeLaunchCommand();
  }

  return showMenu();
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    createLegacyAppMutations(legacyAppMutationOptions()).cleanupTempWorkspace();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
