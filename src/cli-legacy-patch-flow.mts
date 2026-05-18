import { existsSync } from "node:fs";
import type { ArchiveSnapshot } from "./cli-asar-transaction.mts";
import type { CodexfastContext } from "./cli-context.mts";
import { printExitBlock } from "./cli-output.mts";
import { printLine, run } from "./cli-utils.mts";

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

export type LegacyPatchFlowOptions = {
  context: CodexfastContext;
  patcherSource: string;
  backupSuffix: string;
  legacyBackupSuffix: string;
  printActionHeader: (action: string) => void;
  validateActionRequest: (action: string) => boolean;
  removeWatcherFiles: (options?: {
    quietLaunchctl?: boolean;
    reportRemoved?: boolean;
  }) => boolean;
  migrateLegacyUnpackedLayout: () => boolean;
  restoreFromArchiveBackup: () => boolean;
  printOfficialReinstallGuidanceAfterRestore: () => void;
  unpackAppAsarToTemp: () => boolean;
  cleanupTempWorkspace: () => void;
  ensureArchiveBackup: () => boolean;
  createArchiveSnapshot: () => ArchiveSnapshot | null;
  packTempAppToAsar: () => boolean;
  commitArchiveWithIntegrity: (
    sourceArchive: string,
    snapshot: ArchiveSnapshot,
  ) => boolean;
  syncSparklePublicEdKeyForInAppUpdates: () => MetadataChangeResult;
  resignAppBundle: (reason: string) => boolean;
};

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

function runEmbeddedPatcher(
  options: LegacyPatchFlowOptions,
  action: string,
): PatcherRun {
  const patcherAction = action === "repair" ? "apply" : action;
  const result = run(
    options.context.toolchain.node,
    [
      "-",
      patcherAction,
      options.context.temp.assetsDir,
      options.backupSuffix,
      options.legacyBackupSuffix,
      options.context.metadata.versionKey,
    ],
    {
      input: options.patcherSource,
    },
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result;
}

function finalizeModifiedArchive(
  options: LegacyPatchFlowOptions,
  action: string,
): boolean {
  if (
    (action === "apply" || action === "repair") &&
    !options.ensureArchiveBackup()
  ) {
    return false;
  }
  const snapshot = options.createArchiveSnapshot();
  if (!snapshot) {
    return false;
  }
  if (!options.packTempAppToAsar()) {
    return false;
  }
  if (
    !options.commitArchiveWithIntegrity(options.context.temp.asar, snapshot)
  ) {
    return false;
  }
  if (action === "apply" || action === "repair") {
    const metadataChange = options.syncSparklePublicEdKeyForInAppUpdates();
    if (!metadataChange.ok) {
      return false;
    }
  }
  if (
    !options.resignAppBundle("Codex.app resources were modified. Re-signing now.")
  ) {
    return false;
  }
  return true;
}

export function runLegacyEmbeddedTool(
  options: LegacyPatchFlowOptions,
  action: string,
): number {
  let exitCode = 1;
  options.printActionHeader(action);

  if (!options.validateActionRequest(action)) {
    return action === "repair" ? 0 : 1;
  }

  if (
    action === "restore" &&
    !options.removeWatcherFiles({ quietLaunchctl: true, reportRemoved: true })
  ) {
    printLine(
      "Warning: failed to remove the auto-repair watcher before restore.",
    );
    printLine(
      "Run uninstall-watcher manually if restore is re-applied automatically.",
    );
  }

  if (!options.migrateLegacyUnpackedLayout()) {
    return 1;
  }
  if (!existsSync(options.context.paths.asar)) {
    printLine(`app.asar not found: ${options.context.paths.asar}`);
    return 1;
  }

  if (
    action === "restore" &&
    existsSync(options.context.paths.asarBackup)
  ) {
    exitCode = options.restoreFromArchiveBackup() ? 0 : 1;
    if (exitCode === 0) {
      options.printOfficialReinstallGuidanceAfterRestore();
    }
    printExitBlock(exitCode);
    return exitCode;
  }

  if (!options.unpackAppAsarToTemp()) {
    options.cleanupTempWorkspace();
    return printExitBlock(1).exitCode;
  }

  const patcherRun = runEmbeddedPatcher(options, action);
  exitCode = patcherRun.status;

  if (exitCode === 0 && action !== "status") {
    if (action === "apply" || action === "repair") {
      const summary = parseApplySummary(patcherRun.stdout);
      if (summary && summary.changed === 0) {
        const metadataChange = options.syncSparklePublicEdKeyForInAppUpdates();
        if (!metadataChange.ok) {
          exitCode = 1;
        } else if (metadataChange.changed) {
          if (
            !options.resignAppBundle(
              "Codex.app metadata was modified. Re-signing now.",
            )
          ) {
            exitCode = 1;
          }
        } else {
          printLine(
            "No patch changes were needed; leaving app.asar and signature untouched.",
          );
        }
      } else if (!finalizeModifiedArchive(options, action)) {
        exitCode = 1;
      }
    } else if (!finalizeModifiedArchive(options, action)) {
      exitCode = 1;
    }
  }

  options.cleanupTempWorkspace();
  if (action === "restore" && exitCode === 0) {
    options.printOfficialReinstallGuidanceAfterRestore();
  }
  printExitBlock(exitCode);
  return exitCode;
}
