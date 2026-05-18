import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { printExitBlock } from "./cli-output.mts";
import { printLine, resolveCommand, run } from "./cli-utils.mts";

export type WatcherFlowOptions = {
  launchAgentFileName: string;
};

function userHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || "";
}

function launchAgentsDir(): string {
  return join(userHomeDir(), "Library", "LaunchAgents");
}

function codexfastSupportDir(): string {
  return join(userHomeDir(), "Library", "Application Support", "codexfast");
}

function launchctlDomain(): string {
  const getuid = process.getuid;
  if (typeof getuid !== "function") {
    throw new Error(
      "Cannot resolve the launchctl GUI domain on this platform.",
    );
  }
  return `gui/${getuid()}`;
}

export function createWatcherFlow(options: WatcherFlowOptions) {
  const { launchAgentFileName } = options;

  const watcherPlistPath = (): string =>
    join(launchAgentsDir(), launchAgentFileName);

  const watcherCliPath = (): string =>
    join(codexfastSupportDir(), "codexfast-watcher.js");

  const runLaunchctl = (
    args: string[],
    runOptions: { quiet?: boolean } = {},
  ): boolean => {
    const launchctlBin = resolveCommand("launchctl");
    if (!launchctlBin) {
      if (!runOptions.quiet) {
        printLine("launchctl not found.");
      }
      return false;
    }
    const result = run(launchctlBin, args);
    if (result.status !== 0) {
      if (!runOptions.quiet) {
        process.stdout.write(result.stdout);
        process.stderr.write(result.stderr);
      }
      return false;
    }
    return true;
  };

  const removeWatcherFiles = (
    removeOptions: {
      quietLaunchctl?: boolean;
    } = {},
  ): boolean => {
    runLaunchctl(["bootout", launchctlDomain(), watcherPlistPath()], {
      quiet: removeOptions.quietLaunchctl,
    });
    try {
      rmSync(watcherPlistPath(), { force: true });
      rmSync(watcherCliPath(), { force: true });
    } catch {
      return false;
    }
    return true;
  };

  const removeLegacyWatcherFiles = (
    removeOptions: {
      quietLaunchctl?: boolean;
      reportRemoved?: boolean;
    } = {},
  ): boolean => {
    const hadWatcherFiles =
      existsSync(watcherPlistPath()) || existsSync(watcherCliPath());
    if (!removeWatcherFiles({ quietLaunchctl: removeOptions.quietLaunchctl })) {
      return false;
    }
    if (hadWatcherFiles && removeOptions.reportRemoved) {
      printLine("Removed legacy auto-repair watcher.");
    }
    return true;
  };

  const cleanupLegacyWatcherCommand = (): number => {
    if (
      !removeLegacyWatcherFiles({ quietLaunchctl: true, reportRemoved: true })
    ) {
      printLine("Failed to remove legacy auto-repair watcher.");
      return printExitBlock(1).exitCode;
    }
    return printExitBlock(0).exitCode;
  };

  return {
    cleanupLegacyWatcherCommand,
    removeLegacyWatcherFiles,
  };
}
