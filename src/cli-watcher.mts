import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CodexfastContext } from "./cli-context.mts";
import { printExitBlock } from "./cli-output.mts";
import { escapeXml, printLine, resolveCommand, run } from "./cli-utils.mts";

export type WatcherFlowOptions = {
  context: CodexfastContext;
  launchAgentLabel: string;
  launchAgentFileName: string;
  printActionHeader: (action: string) => void;
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
  const { context, launchAgentFileName, launchAgentLabel, printActionHeader } =
    options;

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
      reportRemoved?: boolean;
    } = {},
  ): boolean => {
    const hadWatcherFiles =
      existsSync(watcherPlistPath()) || existsSync(watcherCliPath());
    runLaunchctl(["bootout", launchctlDomain(), watcherPlistPath()], {
      quiet: removeOptions.quietLaunchctl,
    });
    try {
      rmSync(watcherPlistPath(), { force: true });
      rmSync(watcherCliPath(), { force: true });
    } catch {
      return false;
    }
    if (hadWatcherFiles && removeOptions.reportRemoved) {
      printLine("Removed auto-repair watcher before restore.");
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

  const watcherRunnerSource = (): string => `#!/usr/bin/env node
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

  const writeWatcherRunner = (): boolean => {
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
  };

  const watcherPlist = (): string => {
    const environmentEntries = [
      ["CODEXFAST_APP_BUNDLE", context.paths.bundle],
      [
        "PATH",
        process.env.PATH ??
          "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin",
      ],
    ];
    const environmentXml = environmentEntries
      .map(
        ([key, value]) =>
          `      <key>${escapeXml(key)}</key>\n      <string>${escapeXml(value)}</string>`,
      )
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
  };

  const installWatcher = (): number => {
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

    runLaunchctl(["bootout", launchctlDomain(), watcherPlistPath()], {
      quiet: true,
    });
    if (!runLaunchctl(["bootstrap", launchctlDomain(), watcherPlistPath()])) {
      printLine("Watcher plist was written, but launchctl failed to load it.");
      return printExitBlock(1).exitCode;
    }
    printLine(`Installed watcher: ${watcherPlistPath()}`);
    return printExitBlock(0).exitCode;
  };

  const uninstallWatcher = (): number => {
    printActionHeader("uninstall-watcher");
    if (!removeWatcherFiles()) {
      printLine("Failed to remove all watcher files.");
      return printExitBlock(1).exitCode;
    }
    printLine("Uninstalled watcher.");
    return printExitBlock(0).exitCode;
  };

  return {
    cleanupLegacyWatcherCommand,
    installWatcher,
    removeLegacyWatcherFiles,
    removeWatcherFiles,
    uninstallWatcher,
  };
}
