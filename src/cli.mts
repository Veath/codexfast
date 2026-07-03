import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import {
  runCdpFrameSelfTest,
} from './cli-cdp.mts';
import {
  isHelpCommand,
  isHiddenLegacyCleanupCommand,
  isPublicLaunchCommand,
  isRuntimeSelftestCommand,
  isVersionCommand,
} from './cli-command-policy.mts';
import { checkRequirements } from './cli-app-environment.mts';
import { createCodexfastContext } from './cli-context.mts';
import {
  printActionHeaderBlock,
} from './cli-output.mts';
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
  printLine,
  run,
} from './cli-utils.mts';

declare const __PATCHER_SOURCE__: string;
declare const __PACKAGE_VERSION__: string;
declare const __SUPPORTED_APP_VERSIONS__: Record<string, string>;

const SUPPORTED_APP_VERSIONS = __SUPPORTED_APP_VERSIONS__;
const context = createCodexfastContext();
const supportedAppVersionKeys = Object.keys(SUPPORTED_APP_VERSIONS).join(', ');
const launchAgentFileName = 'com.codexfast.watcher.plist';

function printActionHeader(action: string): void {
  printActionHeaderBlock(action, {
    codexfastVersion: __PACKAGE_VERSION__,
    resources: context.paths.resources,
    version: context.metadata.version,
    build: context.metadata.build,
    compatibility: context.metadata.compatibility,
  });
}

function printUsage(): void {
  printLine(`codexfast ${__PACKAGE_VERSION__}`);
  printLine('');
  printLine('Usage:');
  printLine('  codexfast');
  printLine('  codexfast <command>');
  printLine('');
  printLine('Commands:');
  printLine('  launch             Launch Codex with runtime patches');
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
    launchAgentFileName,
  };
}

async function showMenu(): Promise<number> {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      run('clear', []);
      printLine('codexfast');
      printLine('');
      printLine('1) Launch Codex with runtime patches');
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
  }
}

async function main(): Promise<number> {
  // Keep accepting the old watcher marker so existing launchd plists can reach
  // the cleanup-only compatibility path, but do not advertise it for new use.
  const args = process.argv.slice(2).filter((arg) => arg !== '--quiet');
  const command = args[0] ?? '';

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
  if (command && !isPublicLaunchCommand(command)) {
    printUsage();
    return 1;
  }

  if (
    !checkRequirements({
      context,
      supportedAppVersions: SUPPORTED_APP_VERSIONS,
    })
  ) {
    return 1;
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
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
