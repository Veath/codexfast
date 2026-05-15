import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertContains, assertNotContains, fail } from "./helpers/assertions.mts";
import { assertFakeAsarJsParses, extractFakeAsar, readFakeAsarHeaderHash, writeFakeAsar } from "./helpers/fake-asar.mts";
import { type AssetProfile, prepareArchivedFakeApp as prepareArchivedFakeAppHelper, prepareLegacyFakeApp as prepareLegacyFakeAppHelper, readInfoPlistHash, readInfoPlistSparklePublicEdKey, writeInfoPlist } from "./helpers/fake-app.mts";
import {
  archiveFile,
  assertApplyState,
  assertApplyState26417,
  assertApplyState26422,
  assertApplyState26422Build2176Or2180,
  assertApplyState26422Build2210,
  assertApplyState26422WithoutGptPatch,
  assertApplyState26429Build2312,
  assertApplyState26429Build2345,
  assertApplyState26506Build2575,
  assertApplyState26506Build2620,
  assertApplyState26513Build2816,
  assertGuardedState,
  assertGuardedState26417,
  assertGuardedState26422,
  assertGuardedState26422Build2176Or2180,
  assertGuardedState26422Build2210,
  assertGuardedState26429Build2312,
  assertGuardedState26429Build2345,
  assertGuardedState26506Build2575,
  assertGuardedState26506Build2620,
  assertGuardedState26513Build2816,
} from "./helpers/patch-state-assertions.mts";
import { assertCodesignCallContains as assertCodesignCallContainsHelper, assertCodesignCalls as assertCodesignCallsHelper, assertLaunchctlCallContains as assertLaunchctlCallContainsHelper, assertNoCodesignCalls as assertNoCodesignCallsHelper, assertNoLaunchCalls as assertNoLaunchCallsHelper, assertNoNpmCalls as assertNoNpmCallsHelper, assertNoTccutilCalls as assertNoTccutilCallsHelper, assertNpmCallContains as assertNpmCallContainsHelper, assertTccutilCallContains as assertTccutilCallContainsHelper, readOutput, resetCodesignCalls as resetCodesignCallsHelper, resetNpmCalls as resetNpmCallsHelper, resetTccutilCalls as resetTccutilCallsHelper, runScript as runScriptHelper, setupStubs as setupStubsHelper } from "./helpers/script-harness.mts";
import { applyRuntimePatchesToBody } from "../src/patch-engine.mts";
import { TARGET_SPECS } from "../src/patcher-targets.mts";


const rootDir = resolve(process.env.CODEXFAST_TEST_ROOT ?? process.cwd());
const tmpDir = mkdtempSync(join(tmpdir(), "codexfast-test."));
const stubBin = join(tmpDir, "bin");
const markerFile = join(tmpDir, "codesign.log");
const fixturesDir = join(rootDir, "test", "fixtures");
const packageVersion = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")).version as string;
const codex26513SparklePublicEdKey = "mNfr1v9t63BfgDtlw4C8lRvSY6uMggIXABDOCi3tS6k=";

function setupStubs(): void {
  setupStubsHelper(stubBin, markerFile);
}

function prepareArchivedFakeApp(appDir: string, assetsRoot: string, appVersion = "26.415.40636", appBuild = "1799", assetProfile: AssetProfile = "standard"): void {
  prepareArchivedFakeAppHelper({ appDir, assetsRoot, fixturesDir, appVersion, appBuild, assetProfile });
}

function prepareLegacyFakeApp(appDir: string, unpackedAssetsDir: string, archivedAssetsRoot: string, appBuildHashPlaceholder: string): void {
  prepareLegacyFakeAppHelper({ appDir, unpackedAssetsDir, archivedAssetsRoot, fixturesDir, appBuildHashPlaceholder });
}

function runScript(appDir: string, input: string, outputFile: string, extraEnv: Record<string, string> = {}): void {
  runScriptHelper({ rootDir, stubBin, appDir, input, outputFile, extraEnv });
}

function runScriptCommand(appDir: string, args: string[], outputFile: string, extraEnv: Record<string, string> = {}): void {
  runScriptHelper({ rootDir, stubBin, appDir, input: "", outputFile, args, extraEnv });
}

function runScriptWithCodesignFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_CODESIGN_FAIL: "1" });
}

function runScriptWithCodesignVerifyFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_CODESIGN_VERIFY_FAIL: "1" });
}

function runScriptWithAsarPackFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_ASAR_PACK_FAIL: "1" });
}

function runScriptWithAsarExtractFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_ASAR_EXTRACT_FAIL: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
}

function runScriptWithStartupAsarPackFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_ASAR_PACK_FAIL: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
}

function runScriptAllowFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
}

function assertCodesignCalls(expectedMin: number, outputFile: string): void {
  assertCodesignCallsHelper(expectedMin, markerFile, outputFile);
}

function assertCodesignCallContains(expected: string, outputFile: string): void {
  assertCodesignCallContainsHelper(expected, markerFile, outputFile);
}

function assertNoCodesignCalls(outputFile: string): void {
  assertNoCodesignCallsHelper(markerFile, outputFile);
}

function resetCodesignCalls(): void {
  resetCodesignCallsHelper(markerFile);
}

function assertTccutilCallContains(expected: string, outputFile: string): void {
  assertTccutilCallContainsHelper(expected, markerFile, outputFile);
}

function assertNoTccutilCalls(outputFile: string): void {
  assertNoTccutilCallsHelper(markerFile, outputFile);
}

function assertNpmCallContains(expected: string, outputFile: string): void {
  assertNpmCallContainsHelper(expected, markerFile, outputFile);
}

function assertNoNpmCalls(outputFile: string): void {
  assertNoNpmCallsHelper(markerFile, outputFile);
}

function assertNoLaunchCalls(outputFile: string): void {
  assertNoLaunchCallsHelper(markerFile, outputFile);
}

function resetNpmCalls(): void {
  resetNpmCallsHelper(markerFile);
}

function assertLaunchctlCallContains(expected: string, outputFile: string): void {
  assertLaunchctlCallContainsHelper(expected, markerFile, outputFile);
}

function assertNoPatcherInternalPaths(output: string, context: string): void {
  for (const line of output.split(/\r?\n/)) {
    if (/^(patched|normalized|already patched|restored backup|restored inline): .+\(.+\)$/.test(line)) {
      fail(`expected ${context} to omit patcher file paths`, output);
    }
  }
  assertNotContains(output, "Target file:", `expected ${context} to omit target file paths`, output);
  assertNotContains(output, "Backup file:", `expected ${context} to omit backup file paths`, output);
}

function resetTccutilCalls(): void {
  resetTccutilCallsHelper(markerFile);
}

function resetNativeToolCalls(): void {
  resetCodesignCalls();
  resetTccutilCalls();
  resetNpmCalls();
}

function assertNoPersistentUnpackDir(resourcesDir: string, outputFile: string): void {
  if (existsSync(join(resourcesDir, "app"))) {
    fail("expected no persistent Resources/app directory", readOutput(outputFile));
  }
}

function listCodexfastTempDirs(): Set<string> {
  return new Set(readdirSync(tmpdir()).filter((entry) => entry.startsWith("codexfast.")).map((entry) => join(tmpdir(), entry)));
}

function assertNoNewCodexfastTempDirs(before: Set<string>, outputFile: string): void {
  const after = listCodexfastTempDirs();
  const leaked = [...after].filter((entry) => !before.has(entry));
  if (leaked.length > 0) {
    fail(`expected no leaked codexfast temp directories, found ${leaked.join(", ")}`, readOutput(outputFile));
  }
}

function assertIntegrityMatches(appDir: string, archivePath: string, message: string): void {
  if (readInfoPlistHash(appDir) !== readFakeAsarHeaderHash(archivePath)) {
    fail(message, readFileSync(join(appDir, "Contents", "Info.plist"), "utf8"));
  }
}

function assertGeneratedCliRuntimeRequirements(): void {
  const generatedCli = readFileSync(join(rootDir, "bin", "codexfast"), "utf8");
  assertContains(generatedCli, 'const MIN_NODE_VERSION = "18.12.0";', "expected generated CLI to enforce Node.js 18.12.0 or later");
  assertContains(generatedCli, '"@electron/asar@3.4.1"', "expected generated CLI to pin the Node 18-compatible asar package");
  assertNotContains(generatedCli, "__SUPPORTED_APP_VERSIONS__", "expected generated CLI to inline supported app versions without placeholder names");
}

function assertPatcherTargetsRuntimeImportable(): void {
  assertContains(
    TARGET_SPECS.map((spec) => spec.id).join("\n"),
    "speed-setting",
    "expected patcher target specs to be importable at runtime",
  );
}

function assertRuntimePatchEnginePatchesBody(): void {
  const body = "function dP(){return lP().info(`browser-use native pipe peer authorization enabled`,{safe:{mode:a?`dev`:`packaged`},sensitive:{}}),e=>{let t=fP(e);return t==null?{authorized:!1,reason:`missing-socket-file-descriptor`}:s.authorizeSocketPeer(t,a)}}";
  const result = applyRuntimePatchesToBody("webview/assets/browser-use-native-pipe-Demo.js", body);
  assertContains(result.content, "codexfast-browser-peer-auth", "expected runtime patch engine to patch matching JS body");
  assertContains(result.patchedLabels.join("\n"), "Browser-use native pipe peer auth", "expected runtime patch engine to report patched target label");
}

function renameBackupSuffixes(dir: string, fromSuffix: string, toSuffix: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      renameBackupSuffixes(fullPath, fromSuffix, toSuffix);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(fromSuffix)) {
      renameSync(fullPath, `${fullPath.slice(0, -fromSuffix.length)}${toSuffix}`);
    }
  }
}

function runApplyRestoreCase(caseConfig: {
  name: string;
  appDir: string;
  assetsRoot: string;
  appVersion?: string;
  appBuild?: string;
  assetProfile?: AssetProfile;
  applyAssert: (archivePath: string) => void;
  restoreAssert: (archivePath: string, context: string) => void;
  restoreContext: string;
  statusAssert?: (output: string) => void;
  postApplyAssert?: (output: string) => void;
}): void {
  const resourcesDir = join(caseConfig.appDir, "Contents", "Resources");
  const archivePath = join(resourcesDir, "app.asar");
  const applyOutput = join(tmpDir, `${caseConfig.name}-apply.txt`);
  const statusOutput = join(tmpDir, `${caseConfig.name}-status.txt`);
  const restoreOutput = join(tmpDir, `${caseConfig.name}-restore.txt`);
  prepareArchivedFakeApp(caseConfig.appDir, caseConfig.assetsRoot, caseConfig.appVersion, caseConfig.appBuild, caseConfig.assetProfile);

  runScript(caseConfig.appDir, "3\n\nq\n", applyOutput);
  assertNpmCallContains("--package @electron/asar@3.4.1", applyOutput);
  assertCodesignCalls(1, applyOutput);
  assertTccutilCallContains("reset ScreenCapture com.openai.codex", applyOutput);
  assertContains(readOutput(applyOutput), "Reset macOS screen recording permission for com.openai.codex.", "expected apply to report TCC reset", readOutput(applyOutput));
  assertNoPersistentUnpackDir(resourcesDir, applyOutput);
  assertFakeAsarJsParses(archivePath);
  caseConfig.applyAssert(archivePath);
  assertNoPatcherInternalPaths(readOutput(applyOutput), `${caseConfig.name} apply output`);
  caseConfig.postApplyAssert?.(readOutput(applyOutput));
  resetNativeToolCalls();

  if (caseConfig.statusAssert) {
    runScript(caseConfig.appDir, "2\n\nq\n", statusOutput);
    assertNoPatcherInternalPaths(readOutput(statusOutput), `${caseConfig.name} status output`);
    caseConfig.statusAssert(readOutput(statusOutput));
  }

  runScript(caseConfig.appDir, "4\n\nq\n", restoreOutput);
  assertCodesignCalls(1, restoreOutput);
  assertTccutilCallContains("reset ScreenCapture com.openai.codex", restoreOutput);
  assertContains(readOutput(restoreOutput), "Reset macOS screen recording permission for com.openai.codex.", "expected restore to report TCC reset", readOutput(restoreOutput));
  assertNoPersistentUnpackDir(resourcesDir, restoreOutput);
  assertFakeAsarJsParses(archivePath);
  caseConfig.restoreAssert(archivePath, caseConfig.restoreContext);
  assertNoPatcherInternalPaths(readOutput(restoreOutput), `${caseConfig.name} restore output`);
  assertIntegrityMatches(caseConfig.appDir, archivePath, `expected ElectronAsarIntegrity hash to match restored ${caseConfig.restoreContext} app.asar header`);
  assertContains(readOutput(restoreOutput), "Exit code: 0", "expected archive restore to print a successful exit code", readOutput(restoreOutput));
  assertContains(readOutput(restoreOutput), "Official signature recovery:", "expected restore to explain official signature recovery", readOutput(restoreOutput));
  assertContains(readOutput(restoreOutput), "OpenAI Developer ID signature", "expected restore to explain that official signature recovery needs reinstall", readOutput(restoreOutput));
  assertContains(
    readOutput(restoreOutput),
    `Current-version download: https://persistent.oaistatic.com/codex-app-prod/Codex-darwin-arm64-${caseConfig.appVersion ?? "26.415.40636"}.zip`,
    "expected restore to print the current-version official download URL",
    readOutput(restoreOutput),
  );
  resetNativeToolCalls();
}

function main(): void {
  assertGeneratedCliRuntimeRequirements();
  assertPatcherTargetsRuntimeImportable();
  assertRuntimePatchEnginePatchesBody();
  setupStubs();

  const helpOutput = join(tmpDir, "help-output.txt");
  runScriptCommand(join(tmpDir, "MissingForHelp.app"), ["help"], helpOutput);
  assertContains(readOutput(helpOutput), `codexfast ${packageVersion}`, "expected help to print the current package version", readOutput(helpOutput));
  assertContains(readOutput(helpOutput), "Commands:", "expected help to list commands", readOutput(helpOutput));
  assertContains(readOutput(helpOutput), "launch             Launch Codex with runtime patches (recommended)", "expected help to recommend runtime launch mode", readOutput(helpOutput));
  assertContains(readOutput(helpOutput), "apply              Apply legacy bundle patches (fallback)", "expected help to label apply as legacy fallback", readOutput(helpOutput));
  assertContains(readOutput(helpOutput), "restore            Restore legacy bundle patch backups", "expected help to label restore as legacy bundle restore", readOutput(helpOutput));
  assertContains(readOutput(helpOutput), "install-watcher", "expected help to include watcher install command", readOutput(helpOutput));
  assertContains(readOutput(helpOutput), "version", "expected help to include version command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "--quiet", "expected help not to advertise the legacy quiet marker", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "__selftest-cdp-frame", "expected help not to list the hidden CDP self-test command", readOutput(helpOutput));

  const menuOutput = join(tmpDir, "menu-output.txt");
  prepareArchivedFakeApp(join(tmpDir, "Menu.app"), join(tmpDir, "menu-assets"));
  runScript(join(tmpDir, "Menu.app"), "q\n", menuOutput);
  assertContains(readOutput(menuOutput), "1) Launch Codex with runtime patches (recommended)", "expected no-arg menu to recommend runtime launch mode", readOutput(menuOutput));
  assertContains(readOutput(menuOutput), "3) Apply legacy bundle patches (fallback)", "expected no-arg menu to label apply as legacy fallback", readOutput(menuOutput));
  assertContains(readOutput(menuOutput), "4) Restore legacy bundle patch backups", "expected no-arg menu to label restore as legacy bundle restore", readOutput(menuOutput));

  const versionOutput = join(tmpDir, "version-output.txt");
  runScriptCommand(join(tmpDir, "MissingForVersion.app"), ["version"], versionOutput);
  if (readOutput(versionOutput).trim() !== `codexfast ${packageVersion}`) {
    fail("expected version command to print only the current package version", readOutput(versionOutput));
  }

  const cdpEncodeOutput = join(tmpDir, "cdp-encode-output.txt");
  runScriptCommand(join(tmpDir, "MissingForCdpSelfTest.app"), ["__selftest-cdp-frame"], cdpEncodeOutput);
  assertContains(readOutput(cdpEncodeOutput), "CDP frame self-test passed", "expected CDP frame self-test to cover large frames", readOutput(cdpEncodeOutput));

  const uninstallMissingAppOutput = join(tmpDir, "uninstall-missing-app-output.txt");
  const uninstallMissingHome = join(tmpDir, "uninstall-missing-home");
  const uninstallMissingPlist = join(uninstallMissingHome, "Library", "LaunchAgents", "com.codexfast.watcher.plist");
  const uninstallMissingRuntime = join(uninstallMissingHome, "Library", "Application Support", "codexfast", "codexfast-watcher.js");
  mkdirSync(join(uninstallMissingHome, "Library", "LaunchAgents"), { recursive: true });
  mkdirSync(join(uninstallMissingHome, "Library", "Application Support", "codexfast"), { recursive: true });
  writeFileSync(uninstallMissingPlist, "stale watcher plist");
  writeFileSync(uninstallMissingRuntime, "stale watcher runtime");
  runScriptCommand(join(tmpDir, "MissingForUninstall.app"), ["uninstall-watcher"], uninstallMissingAppOutput, { HOME: uninstallMissingHome });
  if (existsSync(uninstallMissingPlist) || existsSync(uninstallMissingRuntime)) {
    fail("expected uninstall-watcher to remove watcher files even when Codex.app is missing", readOutput(uninstallMissingAppOutput));
  }
  assertContains(readOutput(uninstallMissingAppOutput), "Uninstalled watcher.", "expected uninstall-watcher to complete without app checks", readOutput(uninstallMissingAppOutput));
  assertNotContains(readOutput(uninstallMissingAppOutput), "Codex resources directory not found", "expected uninstall-watcher to skip Codex.app resource checks", readOutput(uninstallMissingAppOutput));

  const unsupportedRepairNoToolsApp = join(tmpDir, "UnsupportedRepairNoTools.app");
  const unsupportedRepairNoToolsOutput = join(tmpDir, "unsupported-repair-no-tools-output.txt");
  const noToolsPath = join(tmpDir, "no-tools-path");
  mkdirSync(noToolsPath, { recursive: true });
  prepareArchivedFakeApp(unsupportedRepairNoToolsApp, join(tmpDir, "unsupported-repair-no-tools-assets"), "99.0.0", "9999");
  runScriptCommand(unsupportedRepairNoToolsApp, ["repair", "--quiet"], unsupportedRepairNoToolsOutput, { PATH: noToolsPath });
  assertContains(readOutput(unsupportedRepairNoToolsOutput), "Compatibility: unsupported", "expected repair to read unsupported compatibility before patch prerequisites", readOutput(unsupportedRepairNoToolsOutput));
  assertContains(readOutput(unsupportedRepairNoToolsOutput), "Repair skipped because this Codex.app build is unsupported.", "expected unsupported repair to skip without patch prerequisites", readOutput(unsupportedRepairNoToolsOutput));
  assertNotContains(readOutput(unsupportedRepairNoToolsOutput), "npm not found", "expected unsupported repair to skip before npm checks", readOutput(unsupportedRepairNoToolsOutput));
  assertNotContains(readOutput(unsupportedRepairNoToolsOutput), "codesign not found", "expected unsupported repair to skip before codesign checks", readOutput(unsupportedRepairNoToolsOutput));

  const unsupportedLaunchApp = join(tmpDir, "UnsupportedLaunch.app");
  const unsupportedLaunchOutput = join(tmpDir, "unsupported-launch-output.txt");
  prepareArchivedFakeApp(unsupportedLaunchApp, join(tmpDir, "unsupported-launch-assets"), "99.0.0", "9999");
  runScriptCommand(unsupportedLaunchApp, ["launch"], unsupportedLaunchOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(unsupportedLaunchOutput), "Action: launch", "expected launch to print an action header", readOutput(unsupportedLaunchOutput));
  assertContains(readOutput(unsupportedLaunchOutput), "Compatibility: unsupported", "expected unsupported launch to print compatibility", readOutput(unsupportedLaunchOutput));
  assertContains(readOutput(unsupportedLaunchOutput), "Runtime launch is blocked for this Codex.app version.", "expected unsupported launch to fail closed", readOutput(unsupportedLaunchOutput));
  assertContains(readOutput(unsupportedLaunchOutput), "Exit code: 1", "expected unsupported launch to return exit code 1", readOutput(unsupportedLaunchOutput));
  assertNoLaunchCalls(unsupportedLaunchOutput);

  const launchSuccessApp = join(tmpDir, "LaunchSuccess.app");
  const launchSuccessOutput = join(tmpDir, "launch-success-output.txt");
  prepareArchivedFakeApp(launchSuccessApp, join(tmpDir, "launch-success-assets"), "26.513.20950", "2816", "26513-2816");
  runScriptCommand(launchSuccessApp, ["launch"], launchSuccessOutput, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
  });
  assertContains(readOutput(launchSuccessOutput), "Runtime launch completed.", "expected launch command to report success", readOutput(launchSuccessOutput));
  assertContains(readOutput(launchSuccessOutput), "Browser-use native pipe peer auth", "expected launch dry-run hook to report runtime target labels", readOutput(launchSuccessOutput));
  assertNoCodesignCalls(launchSuccessOutput);
  assertNoTccutilCalls(launchSuccessOutput);

  const nonRunningLaunchApp = join(tmpDir, "NonRunningLaunch.app");
  const nonRunningLaunchOutput = join(tmpDir, "non-running-launch-output.txt");
  prepareArchivedFakeApp(nonRunningLaunchApp, join(tmpDir, "non-running-launch-assets"), "26.513.20950", "2816", "26513-2816");
  runScriptCommand(nonRunningLaunchApp, ["launch"], nonRunningLaunchOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunchOutput), "Action: launch", "expected launch to print an action header", readOutput(nonRunningLaunchOutput));
  assertContains(readOutput(nonRunningLaunchOutput), "Compatibility: supported", "expected supported launch to print compatibility", readOutput(nonRunningLaunchOutput));
  assertContains(readOutput(nonRunningLaunchOutput), "Runtime launch failed: Codex executable not found:", "expected supported fake app launch to fail closed before app start", readOutput(nonRunningLaunchOutput));
  assertContains(readOutput(nonRunningLaunchOutput), "Exit code: 1", "expected supported non-running launch to return exit code 1", readOutput(nonRunningLaunchOutput));
  assertNoLaunchCalls(nonRunningLaunchOutput);

  const missingPgrepLaunchApp = join(tmpDir, "MissingPgrepLaunch.app");
  const missingPgrepLaunchOutput = join(tmpDir, "missing-pgrep-launch-output.txt");
  prepareArchivedFakeApp(missingPgrepLaunchApp, join(tmpDir, "missing-pgrep-launch-assets"), "26.513.20950", "2816", "26513-2816");
  runScriptCommand(missingPgrepLaunchApp, ["launch"], missingPgrepLaunchOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1", PATH: stubBin });
  assertContains(readOutput(missingPgrepLaunchOutput), "Action: launch", "expected launch to print an action header", readOutput(missingPgrepLaunchOutput));
  assertContains(readOutput(missingPgrepLaunchOutput), "Compatibility: supported", "expected supported launch to print compatibility", readOutput(missingPgrepLaunchOutput));
  assertContains(readOutput(missingPgrepLaunchOutput), "Cannot determine whether Codex.app is running because pgrep was not found.", "expected launch to fail closed when pgrep is unavailable", readOutput(missingPgrepLaunchOutput));
  assertContains(readOutput(missingPgrepLaunchOutput), "Exit code: 1", "expected missing-pgrep launch to return exit code 1", readOutput(missingPgrepLaunchOutput));
  assertNoLaunchCalls(missingPgrepLaunchOutput);

  const runningLaunchApp = join(tmpDir, "RunningLaunch.app");
  const runningLaunchOutput = join(tmpDir, "running-launch-output.txt");
  prepareArchivedFakeApp(runningLaunchApp, join(tmpDir, "running-launch-assets"));
  runScriptCommand(runningLaunchApp, ["launch"], runningLaunchOutput, { CODEXFAST_TEST_CODEX_RUNNING: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(runningLaunchOutput), "Action: launch", "expected launch to print an action header", readOutput(runningLaunchOutput));
  assertContains(readOutput(runningLaunchOutput), "Compatibility: supported", "expected supported launch to print compatibility", readOutput(runningLaunchOutput));
  assertContains(readOutput(runningLaunchOutput), "Codex.app is already running. Quit Codex.app before using runtime launch.", "expected launch to fail closed when Codex.app is running", readOutput(runningLaunchOutput));
  assertContains(readOutput(runningLaunchOutput), "Exit code: 1", "expected running launch to return exit code 1", readOutput(runningLaunchOutput));
  assertNoLaunchCalls(runningLaunchOutput);

  runApplyRestoreCase({
    name: "existing",
    appDir: join(tmpDir, "Existing.app"),
    assetsRoot: join(tmpDir, "existing-assets"),
    applyAssert: (archivePath) => {
      assertApplyState(archivePath);
      if (!existsSync(join(tmpDir, "Existing.app", "Contents", "Resources", "app.asar1"))) {
        fail("expected archive backup to be created on apply");
      }
    },
    restoreAssert: assertGuardedState,
    restoreContext: "restore",
  });

  runApplyRestoreCase({
    name: "supported-26417",
    appDir: join(tmpDir, "Supported26417.app"),
    assetsRoot: join(tmpDir, "supported-26417-assets"),
    appVersion: "26.417.41555",
    appBuild: "1858",
    assetProfile: "26417",
    applyAssert: assertApplyState26417,
    restoreAssert: assertGuardedState26417,
    restoreContext: "26.417 restore",
  });

  const partial26417App = join(tmpDir, "Supported26417Partial.app");
  const partial26417Resources = join(partial26417App, "Contents", "Resources");
  const partial26417Output = join(tmpDir, "apply-26417-partial-output.txt");
  prepareArchivedFakeApp(partial26417App, join(tmpDir, "supported-26417-partial-assets"), "26.417.41555", "1858", "26417-partial");
  runScript(partial26417App, "3\n\nq\n", partial26417Output);
  assertCodesignCalls(1, partial26417Output);
  assertNoPersistentUnpackDir(partial26417Resources, partial26417Output);
  assertFakeAsarJsParses(join(partial26417Resources, "app.asar"));
  assertApplyState26417(join(partial26417Resources, "app.asar"));
  resetCodesignCalls();

  runApplyRestoreCase({
    name: "supported-26422",
    appDir: join(tmpDir, "Supported26422.app"),
    assetsRoot: join(tmpDir, "supported-26422-assets"),
    appVersion: "26.422.21637",
    appBuild: "2056",
    assetProfile: "26422",
    applyAssert: assertApplyState26422,
    restoreAssert: assertGuardedState26422,
    restoreContext: "26.422 restore",
    statusAssert: (output) => {
      assertNotContains(output, "Status: GPT-5.5 model query selector disabled", "expected 26.422 status to report the GPT-5.5 model query selector as enabled after apply", output);
      assertContains(output, "Status: GPT-5.5 model query selector enabled", "expected 26.422 status to include the GPT-5.5 model query selector target", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26422-2080",
    appDir: join(tmpDir, "Supported26422Build2080.app"),
    assetsRoot: join(tmpDir, "supported-26422-2080-assets"),
    appVersion: "26.422.30944",
    appBuild: "2080",
    assetProfile: "26422",
    applyAssert: assertApplyState26422WithoutGptPatch,
    restoreAssert: assertGuardedState26422,
    restoreContext: "26.422 build 2080 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.422 build 2080 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => assertNotContains(output, "GPT-5.5 model", "expected 26.422 build 2080 status to omit unpatched GPT-5.5 compatibility targets", output),
  });

  runApplyRestoreCase({
    name: "supported-26422-2176",
    appDir: join(tmpDir, "Supported26422Build2176.app"),
    assetsRoot: join(tmpDir, "supported-26422-2176-assets"),
    appVersion: "26.422.62136",
    appBuild: "2176",
    assetProfile: "26422-2176",
    applyAssert: assertApplyState26422Build2176Or2180,
    restoreAssert: assertGuardedState26422Build2176Or2180,
    restoreContext: "26.422 build 2176 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.422 build 2176 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => {
      assertContains(output, "Status: Composer Intelligence Speed menu enabled", "expected 26.422 build 2176 status to report the Intelligence Speed target after apply", output);
      assertContains(output, "Status: Plugins access enabled", "expected 26.422 build 2176 status to report Plugins after apply", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.422 build 2176 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26422-2180",
    appDir: join(tmpDir, "Supported26422Build2180.app"),
    assetsRoot: join(tmpDir, "supported-26422-2180-assets"),
    appVersion: "26.422.62136",
    appBuild: "2180",
    assetProfile: "26422-2176",
    applyAssert: assertApplyState26422Build2176Or2180,
    restoreAssert: assertGuardedState26422Build2176Or2180,
    restoreContext: "26.422 build 2180 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.422 build 2180 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => {
      assertContains(output, "Status: Composer Intelligence Speed menu enabled", "expected 26.422 build 2180 status to report the Intelligence Speed target after apply", output);
      assertContains(output, "Status: Plugins access enabled", "expected 26.422 build 2180 status to report Plugins after apply", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.422 build 2180 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26422-2210",
    appDir: join(tmpDir, "Supported26422Build2210.app"),
    assetsRoot: join(tmpDir, "supported-26422-2210-assets"),
    appVersion: "26.422.71525",
    appBuild: "2210",
    assetProfile: "26422-2210",
    applyAssert: assertApplyState26422Build2210,
    restoreAssert: assertGuardedState26422Build2210,
    restoreContext: "26.422 build 2210 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.422 build 2210 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => {
      assertContains(output, "Status: Composer Intelligence Speed menu enabled", "expected 26.422 build 2210 status to report the Intelligence Speed target after apply", output);
      assertContains(output, "Status: Plugins access enabled", "expected 26.422 build 2210 status to report Plugins after apply", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.422 build 2210 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26429-2312",
    appDir: join(tmpDir, "Supported26429Build2312.app"),
    assetsRoot: join(tmpDir, "supported-26429-2312-assets"),
    appVersion: "26.429.20946",
    appBuild: "2312",
    assetProfile: "26429-2312",
    applyAssert: assertApplyState26429Build2312,
    restoreAssert: assertGuardedState26429Build2312,
    restoreContext: "26.429 build 2312 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.429 build 2312 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => {
      assertContains(output, "Status: Composer Intelligence Speed menu enabled", "expected 26.429 build 2312 status to report the Intelligence Speed target after apply", output);
      assertContains(output, "Status: Plugins access enabled", "expected 26.429 build 2312 status to report Plugins after apply", output);
      assertContains(output, "Status: Plugins page content enabled", "expected 26.429 build 2312 status to report Plugins page content after apply", output);
      assertContains(output, "Status: Plugin detail access enabled", "expected 26.429 build 2312 status to report Plugin detail access after apply", output);
      assertContains(output, "Status: Plugin install availability enabled", "expected 26.429 build 2312 status to report Plugin install availability after apply", output);
      assertContains(output, "Status: Plugin install modal content enabled", "expected 26.429 build 2312 status to report Plugin install modal content after apply", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.429 build 2312 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26429-2345",
    appDir: join(tmpDir, "Supported26429Build2345.app"),
    assetsRoot: join(tmpDir, "supported-26429-2345-assets"),
    appVersion: "26.429.30905",
    appBuild: "2345",
    assetProfile: "26429-2345",
    applyAssert: assertApplyState26429Build2345,
    restoreAssert: assertGuardedState26429Build2345,
    restoreContext: "26.429 build 2345 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.429 build 2345 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => {
      assertContains(output, "Status: Composer Intelligence Speed menu enabled", "expected 26.429 build 2345 status to report the Intelligence Speed target after apply", output);
      assertContains(output, "Status: Plugins access enabled", "expected 26.429 build 2345 status to report Plugins after apply", output);
      assertContains(output, "Status: Plugins page content enabled", "expected 26.429 build 2345 status to report Plugins page content after apply", output);
      assertContains(output, "Status: Plugin detail access enabled", "expected 26.429 build 2345 status to report Plugin detail access after apply", output);
      assertContains(output, "Status: Plugin install availability enabled", "expected 26.429 build 2345 status to report Plugin install availability after apply", output);
      assertContains(output, "Status: Plugin install modal content enabled", "expected 26.429 build 2345 status to report Plugin install modal content after apply", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.429 build 2345 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26429-2429",
    appDir: join(tmpDir, "Supported26429Build2429.app"),
    assetsRoot: join(tmpDir, "supported-26429-2429-assets"),
    appVersion: "26.429.61741",
    appBuild: "2429",
    assetProfile: "26429-2345",
    applyAssert: assertApplyState26429Build2345,
    restoreAssert: assertGuardedState26429Build2345,
    restoreContext: "26.429 build 2429 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.429 build 2429 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => {
      assertContains(output, "Status: Composer Intelligence Speed menu enabled", "expected 26.429 build 2429 status to report the Intelligence Speed target after apply", output);
      assertContains(output, "Status: Plugins access enabled", "expected 26.429 build 2429 status to report Plugins after apply", output);
      assertContains(output, "Status: Plugins page content enabled", "expected 26.429 build 2429 status to report Plugins page content after apply", output);
      assertContains(output, "Status: Plugin detail access enabled", "expected 26.429 build 2429 status to report Plugin detail access after apply", output);
      assertContains(output, "Status: Plugin install availability enabled", "expected 26.429 build 2429 status to report Plugin install availability after apply", output);
      assertContains(output, "Status: Plugin install modal content enabled", "expected 26.429 build 2429 status to report Plugin install modal content after apply", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.429 build 2429 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26506-2575",
    appDir: join(tmpDir, "Supported26506Build2575.app"),
    assetsRoot: join(tmpDir, "supported-26506-2575-assets"),
    appVersion: "26.506.21252",
    appBuild: "2575",
    assetProfile: "26506",
    applyAssert: assertApplyState26506Build2575,
    restoreAssert: assertGuardedState26506Build2575,
    restoreContext: "26.506 build 2575 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.506 build 2575 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => {
      assertContains(output, "Status: Speed setting enabled", "expected 26.506 build 2575 status to report the Settings Speed target after apply", output);
      assertContains(output, "Status: Fast slash command enabled", "expected 26.506 build 2575 status to report the Fast slash command after apply", output);
      assertContains(output, "Status: Composer Intelligence Speed menu enabled", "expected 26.506 build 2575 status to report the Intelligence Speed target after apply", output);
      assertContains(output, "Status: Plugins access enabled", "expected 26.506 build 2575 status to report Plugins after apply", output);
      assertContains(output, "Status: Plugins page content enabled", "expected 26.506 build 2575 status to report Plugins page content after apply", output);
      assertContains(output, "Status: Plugin detail access enabled", "expected 26.506 build 2575 status to report Plugin detail access after apply", output);
      assertContains(output, "Status: Plugin install availability enabled", "expected 26.506 build 2575 status to report Plugin install availability after apply", output);
      assertContains(output, "Status: Plugin install modal content enabled", "expected 26.506 build 2575 status to report Plugin install modal content after apply", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.506 build 2575 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26506-2620",
    appDir: join(tmpDir, "Supported26506Build2620.app"),
    assetsRoot: join(tmpDir, "supported-26506-2620-assets"),
    appVersion: "26.506.31421",
    appBuild: "2620",
    assetProfile: "26506-2620",
    applyAssert: assertApplyState26506Build2620,
    restoreAssert: assertGuardedState26506Build2620,
    restoreContext: "26.506 build 2620 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.506 build 2620 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => {
      assertContains(output, "Status: Speed setting enabled", "expected 26.506 build 2620 status to report the Settings Speed target after apply", output);
      assertContains(output, "Status: Fast slash command enabled", "expected 26.506 build 2620 status to report the Fast slash command after apply", output);
      assertContains(output, "Status: Composer Intelligence Speed menu enabled", "expected 26.506 build 2620 status to report the Intelligence Speed target after apply", output);
      assertContains(output, "Status: Plugins access enabled", "expected 26.506 build 2620 status to report Plugins after apply", output);
      assertContains(output, "Status: Plugins page content enabled", "expected 26.506 build 2620 status to report Plugins page content after apply", output);
      assertContains(output, "Status: Plugin detail access enabled", "expected 26.506 build 2620 status to report Plugin detail access after apply", output);
      assertContains(output, "Status: Plugin install availability enabled", "expected 26.506 build 2620 status to report Plugin install availability after apply", output);
      assertContains(output, "Status: Plugin install modal content enabled", "expected 26.506 build 2620 status to report Plugin install modal content after apply", output);
      assertNotContains(output, "Target file:", "expected 26.506 build 2620 status to omit internal target paths", output);
      assertNotContains(output, "Backup file:", "expected 26.506 build 2620 status to omit internal backup paths", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.506 build 2620 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26513-2816",
    appDir: join(tmpDir, "Supported26513Build2816.app"),
    assetsRoot: join(tmpDir, "supported-26513-2816-assets"),
    appVersion: "26.513.20950",
    appBuild: "2816",
    assetProfile: "26513-2816",
    applyAssert: assertApplyState26513Build2816,
    restoreAssert: assertGuardedState26513Build2816,
    restoreContext: "26.513 build 2816 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.513 build 2816 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => {
      assertContains(output, "Status: Speed setting enabled", "expected 26.513 build 2816 status to report the Settings Speed target after apply", output);
      assertContains(output, "Status: Fast slash command enabled", "expected 26.513 build 2816 status to report the Fast slash command after apply", output);
      assertContains(output, "Status: Composer Intelligence Speed menu enabled", "expected 26.513 build 2816 status to report the Intelligence Speed target after apply", output);
      assertContains(output, "Status: Plugins access enabled", "expected 26.513 build 2816 status to report Plugins after apply", output);
      assertContains(output, "Status: Plugins page content enabled", "expected 26.513 build 2816 status to report Plugins page content after apply", output);
      assertContains(output, "Status: Plugin detail access enabled", "expected 26.513 build 2816 status to report Plugin detail access after apply", output);
      assertContains(output, "Status: Plugin install availability enabled", "expected 26.513 build 2816 status to report Plugin install availability after apply", output);
      assertContains(output, "Status: Plugin install modal content enabled", "expected 26.513 build 2816 status to report Plugin install modal content after apply", output);
      assertContains(output, "Status: Composer plugin mentions enabled", "expected 26.513 build 2816 status to report Composer plugin mentions after apply", output);
      assertContains(output, "Status: Browser-use native pipe peer auth enabled", "expected 26.513 build 2816 status to report browser-use native pipe peer auth after apply", output);
      assertNotContains(output, "Target file:", "expected 26.513 build 2816 status to omit internal target paths", output);
      assertNotContains(output, "Backup file:", "expected 26.513 build 2816 status to omit internal backup paths", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.513 build 2816 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  const sparkleBridgeApp = join(tmpDir, "SparkleBridge.app");
  const sparkleBridgeResources = join(sparkleBridgeApp, "Contents", "Resources");
  const sparkleBridgeApplyOutput = join(tmpDir, "sparkle-bridge-apply-output.txt");
  const sparkleBridgeRestoreOutput = join(tmpDir, "sparkle-bridge-restore-output.txt");
  prepareArchivedFakeApp(sparkleBridgeApp, join(tmpDir, "sparkle-bridge-assets"), "26.506.31421", "2620", "26506-2620");
  runScriptCommand(sparkleBridgeApp, ["apply"], sparkleBridgeApplyOutput);
  assertContains(
    readOutput(sparkleBridgeApplyOutput),
    "Updated Sparkle public EdDSA key for in-app updates.",
    "expected apply to bridge Sparkle public key for the next official update",
    readOutput(sparkleBridgeApplyOutput),
  );
  if (readInfoPlistSparklePublicEdKey(sparkleBridgeApp) !== codex26513SparklePublicEdKey) {
    fail("expected apply to write the next official Sparkle public key", readFileSync(join(sparkleBridgeApp, "Contents", "Info.plist"), "utf8"));
  }
  assertCodesignCalls(1, sparkleBridgeApplyOutput);
  resetNativeToolCalls();
  runScriptCommand(sparkleBridgeApp, ["restore"], sparkleBridgeRestoreOutput);
  if (readInfoPlistSparklePublicEdKey(sparkleBridgeApp) === codex26513SparklePublicEdKey) {
    fail("expected restore to restore the original Sparkle public key", readFileSync(join(sparkleBridgeApp, "Contents", "Info.plist"), "utf8"));
  }
  if (existsSync(join(sparkleBridgeResources, "SUPublicEDKey.codexfast.bak"))) {
    fail("expected restore to remove the Sparkle public key backup", readOutput(sparkleBridgeRestoreOutput));
  }
  assertCodesignCalls(1, sparkleBridgeRestoreOutput);
  resetNativeToolCalls();

  const sparkleBridgeAlreadyPatchedApp = join(tmpDir, "SparkleBridgeAlreadyPatched.app");
  const sparkleBridgeAlreadyPatchedOutput = join(tmpDir, "sparkle-bridge-already-patched-output.txt");
  prepareArchivedFakeApp(
    sparkleBridgeAlreadyPatchedApp,
    join(tmpDir, "sparkle-bridge-already-patched-assets"),
    "26.506.31421",
    "2620",
    "26506-2620",
  );
  runScriptCommand(sparkleBridgeAlreadyPatchedApp, ["apply"], join(tmpDir, "sparkle-bridge-already-patched-first-output.txt"));
  writeInfoPlist(
    sparkleBridgeAlreadyPatchedApp,
    readInfoPlistHash(sparkleBridgeAlreadyPatchedApp),
    "26.506.31421",
    "2620",
    "com.openai.codex",
  );
  resetNativeToolCalls();
  runScriptCommand(sparkleBridgeAlreadyPatchedApp, ["repair", "--quiet"], sparkleBridgeAlreadyPatchedOutput);
  assertContains(
    readOutput(sparkleBridgeAlreadyPatchedOutput),
    "Updated Sparkle public EdDSA key for in-app updates.",
    "expected repair to bridge Sparkle public key even when feature patches are already present",
    readOutput(sparkleBridgeAlreadyPatchedOutput),
  );
  assertCodesignCalls(1, sparkleBridgeAlreadyPatchedOutput);
  resetNativeToolCalls();

  const quietUnsupportedRepairApp = join(tmpDir, "QuietUnsupportedRepair.app");
  const quietUnsupportedRepairResources = join(quietUnsupportedRepairApp, "Contents", "Resources");
  const quietUnsupportedRepairArchive = join(quietUnsupportedRepairResources, "app.asar");
  const quietUnsupportedRepairOutput = join(tmpDir, "quiet-unsupported-repair-output.txt");
  prepareArchivedFakeApp(quietUnsupportedRepairApp, join(tmpDir, "quiet-unsupported-repair-assets"), "99.0.0", "9999");
  const quietUnsupportedArchiveBefore = readFileSync(quietUnsupportedRepairArchive);
  const quietUnsupportedHashBefore = readInfoPlistHash(quietUnsupportedRepairApp);
  resetNativeToolCalls();
  runScriptCommand(quietUnsupportedRepairApp, ["repair", "--quiet"], quietUnsupportedRepairOutput);
  assertNoCodesignCalls(quietUnsupportedRepairOutput);
  assertNoNpmCalls(quietUnsupportedRepairOutput);
  assertNoTccutilCalls(quietUnsupportedRepairOutput);
  if (existsSync(join(quietUnsupportedRepairResources, "app.asar1"))) {
    fail("expected quiet unsupported repair to skip backup creation", readOutput(quietUnsupportedRepairOutput));
  }
  if (!readFileSync(quietUnsupportedRepairArchive).equals(quietUnsupportedArchiveBefore)) {
    fail("expected quiet unsupported repair to leave app.asar unchanged", readOutput(quietUnsupportedRepairOutput));
  }
  if (readInfoPlistHash(quietUnsupportedRepairApp) !== quietUnsupportedHashBefore) {
    fail("expected quiet unsupported repair to leave ElectronAsarIntegrity unchanged", readOutput(quietUnsupportedRepairOutput));
  }
  assertContains(readOutput(quietUnsupportedRepairOutput), "Compatibility: unsupported", "expected quiet unsupported repair to log compatibility", readOutput(quietUnsupportedRepairOutput));
  assertContains(readOutput(quietUnsupportedRepairOutput), "Repair skipped because this Codex.app build is unsupported.", "expected quiet unsupported repair to log a skip", readOutput(quietUnsupportedRepairOutput));
  assertNotContains(readOutput(quietUnsupportedRepairOutput), "notification", "expected quiet unsupported repair not to mention notifications", readOutput(quietUnsupportedRepairOutput));
  assertNotContains(readOutput(quietUnsupportedRepairOutput), "dialog", "expected quiet unsupported repair not to mention dialogs", readOutput(quietUnsupportedRepairOutput));

  const idempotentRepairApp = join(tmpDir, "IdempotentRepair.app");
  const idempotentRepairResources = join(idempotentRepairApp, "Contents", "Resources");
  const idempotentRepairArchive = join(idempotentRepairResources, "app.asar");
  const repairFirstOutput = join(tmpDir, "repair-first-output.txt");
  const repairSecondOutput = join(tmpDir, "repair-second-output.txt");
  prepareArchivedFakeApp(idempotentRepairApp, join(tmpDir, "idempotent-repair-assets"), "26.429.61741", "2429", "26429-2345");
  resetNativeToolCalls();
  runScriptCommand(idempotentRepairApp, ["repair", "--quiet"], repairFirstOutput);
  assertCodesignCalls(1, repairFirstOutput);
  assertTccutilCallContains("reset ScreenCapture com.openai.codex", repairFirstOutput);
  assertApplyState26429Build2345(idempotentRepairArchive);
  assertIntegrityMatches(idempotentRepairApp, idempotentRepairArchive, "expected first repair to update ElectronAsarIntegrity");
  const repairedArchive = readFileSync(idempotentRepairArchive);
  const repairedHash = readInfoPlistHash(idempotentRepairApp);
  resetNativeToolCalls();
  runScriptCommand(idempotentRepairApp, ["repair", "--quiet"], repairSecondOutput);
  assertNoCodesignCalls(repairSecondOutput);
  assertNoTccutilCalls(repairSecondOutput);
  if (!readFileSync(idempotentRepairArchive).equals(repairedArchive)) {
    fail("expected second repair to leave already patched app.asar unchanged", readOutput(repairSecondOutput));
  }
  if (readInfoPlistHash(idempotentRepairApp) !== repairedHash) {
    fail("expected second repair to leave ElectronAsarIntegrity unchanged", readOutput(repairSecondOutput));
  }
  assertContains(readOutput(repairSecondOutput), "No patch changes were needed; leaving app.asar and signature untouched.", "expected second repair to report no archive rewrite", readOutput(repairSecondOutput));

  const watcherApp = join(tmpDir, "WatcherInstall.app");
  const watcherOutput = join(tmpDir, "watcher-install-output.txt");
  const watcherHome = join(tmpDir, "watcher-home");
  prepareArchivedFakeApp(watcherApp, join(tmpDir, "watcher-install-assets"), "26.429.61741", "2429", "26429-2345");
  resetNativeToolCalls();
  runScriptCommand(watcherApp, ["install-watcher"], watcherOutput, { HOME: watcherHome });
  const watcherPlist = join(watcherHome, "Library", "LaunchAgents", "com.codexfast.watcher.plist");
  const watcherRuntime = join(watcherHome, "Library", "Application Support", "codexfast", "codexfast-watcher.js");
  if (!existsSync(watcherPlist)) {
    fail("expected install-watcher to create a launchd plist", readOutput(watcherOutput));
  }
  if (!existsSync(watcherRuntime)) {
    fail("expected install-watcher to create a watcher runner", readOutput(watcherOutput));
  }
  const watcherPlistText = readFileSync(watcherPlist, "utf8");
  const watcherRuntimeText = readFileSync(watcherRuntime, "utf8");
  assertContains(watcherPlistText, "<key>WatchPaths</key>", "expected watcher plist to use WatchPaths", watcherPlistText);
  assertContains(watcherPlistText, join(watcherApp, "Contents", "Resources", "app.asar"), "expected watcher plist to watch app.asar", watcherPlistText);
  assertContains(watcherPlistText, watcherRuntime, "expected watcher plist to run the local watcher runner", watcherPlistText);
  assertNotContains(watcherPlistText, "<string>repair</string>", "expected watcher plist not to pass repair as a runner argument", watcherPlistText);
  assertNotContains(watcherPlistText, "--quiet", "expected new watcher plists not to use the legacy quiet marker", watcherPlistText);
  assertContains(watcherRuntimeText, "codexfast@latest", "expected watcher runner to use the latest published codexfast package", watcherRuntimeText);
  assertContains(watcherRuntimeText, "repair", "expected watcher runner to run repair", watcherRuntimeText);
  assertNotContains(watcherRuntimeText, "__PATCHER_SOURCE__", "expected watcher runner not to copy the full generated CLI snapshot", watcherRuntimeText);
  assertContains(watcherPlistText, "<key>ThrottleInterval</key>", "expected watcher plist to throttle relaunches", watcherPlistText);
  assertNotContains(watcherPlistText, "StandardOutPath", "expected watcher plist not to write stdout to a log file", watcherPlistText);
  assertNotContains(watcherPlistText, "StandardErrorPath", "expected watcher plist not to write stderr to a log file", watcherPlistText);
  assertNotContains(watcherPlistText, "watcher.log", "expected watcher plist not to create a watcher log file", watcherPlistText);
  assertLaunchctlCallContains("bootstrap", watcherOutput);

  const restoreUninstallsWatcherApp = join(tmpDir, "RestoreUninstallsWatcher.app");
  const restoreUninstallsWatcherArchive = join(restoreUninstallsWatcherApp, "Contents", "Resources", "app.asar");
  const restoreUninstallsWatcherHome = join(tmpDir, "restore-uninstalls-watcher-home");
  const restoreUninstallsWatcherInstallOutput = join(tmpDir, "restore-uninstalls-watcher-install-output.txt");
  const restoreUninstallsWatcherApplyOutput = join(tmpDir, "restore-uninstalls-watcher-apply-output.txt");
  const restoreUninstallsWatcherOutput = join(tmpDir, "restore-uninstalls-watcher-output.txt");
  prepareArchivedFakeApp(restoreUninstallsWatcherApp, join(tmpDir, "restore-uninstalls-watcher-assets"), "26.429.61741", "2429", "26429-2345");
  runScriptCommand(restoreUninstallsWatcherApp, ["install-watcher"], restoreUninstallsWatcherInstallOutput, { HOME: restoreUninstallsWatcherHome });
  const restoreUninstallsWatcherPlist = join(restoreUninstallsWatcherHome, "Library", "LaunchAgents", "com.codexfast.watcher.plist");
  const restoreUninstallsWatcherRuntime = join(restoreUninstallsWatcherHome, "Library", "Application Support", "codexfast", "codexfast-watcher.js");
  if (!existsSync(restoreUninstallsWatcherPlist) || !existsSync(restoreUninstallsWatcherRuntime)) {
    fail("expected install-watcher to create files before restore", readOutput(restoreUninstallsWatcherInstallOutput));
  }
  runScriptCommand(restoreUninstallsWatcherApp, ["apply"], restoreUninstallsWatcherApplyOutput, { HOME: restoreUninstallsWatcherHome });
  assertApplyState26429Build2345(restoreUninstallsWatcherArchive);
  runScriptCommand(restoreUninstallsWatcherApp, ["restore"], restoreUninstallsWatcherOutput, { HOME: restoreUninstallsWatcherHome });
  if (existsSync(restoreUninstallsWatcherPlist) || existsSync(restoreUninstallsWatcherRuntime)) {
    fail("expected restore to remove the auto-repair watcher before restoring app.asar", readOutput(restoreUninstallsWatcherOutput));
  }
  assertGuardedState26429Build2345(restoreUninstallsWatcherArchive, "restore after uninstalling watcher");
  assertContains(readOutput(restoreUninstallsWatcherOutput), "Removed auto-repair watcher before restore.", "expected restore to report watcher removal", readOutput(restoreUninstallsWatcherOutput));
  resetNativeToolCalls();

  const inlineApp = join(tmpDir, "Supported26422Build2080InlineRestore.app");
  const inlineResources = join(inlineApp, "Contents", "Resources");
  const inlineArchive = join(inlineResources, "app.asar");
  prepareArchivedFakeApp(inlineApp, join(tmpDir, "supported-26422-2080-inline-assets"), "26.422.21637", "2056", "26422");
  runScript(inlineApp, "3\n\nq\n", join(tmpDir, "apply-26422-2080-inline-output.txt"));
  assertApplyState26422(inlineArchive);
  rmSync(join(inlineResources, "app.asar1"), { force: true });
  writeInfoPlist(inlineApp, readFakeAsarHeaderHash(inlineArchive), "26.422.30944", "2080");
  const inlineRestoreOutput = join(tmpDir, "restore-26422-2080-inline-output.txt");
  runScript(inlineApp, "4\n\nq\n", inlineRestoreOutput);
  assertNoPersistentUnpackDir(inlineResources, inlineRestoreOutput);
  assertFakeAsarJsParses(inlineArchive);
  assertGuardedState26422(inlineArchive, "26.422 build 2080 inline restore from 0.5.2 state");
  resetCodesignCalls();

  const legacyBackupApp = join(tmpDir, "LegacyFileBackup.app");
  const legacyBackupResources = join(legacyBackupApp, "Contents", "Resources");
  const legacyBackupArchive = join(legacyBackupResources, "app.asar");
  const legacyBackupOutput = join(tmpDir, "legacy-file-backup-restore-output.txt");
  const legacyBackupExtracted = join(tmpDir, "legacy-file-backup-extracted");
  prepareArchivedFakeApp(legacyBackupApp, join(tmpDir, "legacy-file-backup-assets"));
  runScript(legacyBackupApp, "3\n\nq\n", join(tmpDir, "legacy-file-backup-apply-output.txt"));
  assertApplyState(legacyBackupArchive);
  rmSync(join(legacyBackupResources, "app.asar1"), { force: true });
  extractFakeAsar(legacyBackupArchive, legacyBackupExtracted);
  renameBackupSuffixes(legacyBackupExtracted, ".codexfast.bak", ".speed-setting.bak");
  writeFakeAsar(legacyBackupExtracted, legacyBackupArchive);
  writeInfoPlist(legacyBackupApp, readFakeAsarHeaderHash(legacyBackupArchive));
  runScript(legacyBackupApp, "4\n\nq\n", legacyBackupOutput);
  assertFakeAsarJsParses(legacyBackupArchive);
  assertGuardedState(legacyBackupArchive, "legacy file backup restore");
  assertContains(readOutput(legacyBackupOutput), "restored backup: Speed setting", "expected restore to use legacy file-level backup suffix", readOutput(legacyBackupOutput));
  resetCodesignCalls();

  const legacyMixedBackupApp = join(tmpDir, "LegacyMixedBackup.app");
  const legacyMixedBackupResources = join(legacyMixedBackupApp, "Contents", "Resources");
  const legacyMixedBackupArchive = join(legacyMixedBackupResources, "app.asar");
  const legacyMixedBackupExtracted = join(tmpDir, "legacy-mixed-backup-extracted");
  const legacyMixedApplyOutput = join(tmpDir, "legacy-mixed-backup-apply-output.txt");
  const legacyMixedRestoreOutput = join(tmpDir, "legacy-mixed-backup-restore-output.txt");
  prepareArchivedFakeApp(legacyMixedBackupApp, join(tmpDir, "legacy-mixed-backup-assets"), "26.422.21637", "2056", "26422");
  extractFakeAsar(legacyMixedBackupArchive, legacyMixedBackupExtracted);
  const legacyMixedIndexFile = join(legacyMixedBackupExtracted, "webview", "assets", "index-gATb9Tvd.js");
  const legacyMixedOriginalIndex = readFileSync(legacyMixedIndexFile, "utf8");
  writeFileSync(`${legacyMixedIndexFile}.speed-setting.bak`, legacyMixedOriginalIndex);
  writeFileSync(legacyMixedIndexFile, legacyMixedOriginalIndex.replace("A=O&&k,", "A=!1,"));
  writeFakeAsar(legacyMixedBackupExtracted, legacyMixedBackupArchive);
  writeInfoPlist(legacyMixedBackupApp, readFakeAsarHeaderHash(legacyMixedBackupArchive), "26.422.21637", "2056");
  runScript(legacyMixedBackupApp, "3\n\nq\n", legacyMixedApplyOutput);
  assertFakeAsarJsParses(legacyMixedBackupArchive);
  assertApplyState26422(legacyMixedBackupArchive);
  rmSync(join(legacyMixedBackupResources, "app.asar1"), { force: true });
  runScript(legacyMixedBackupApp, "4\n\nq\n", legacyMixedRestoreOutput);
  assertFakeAsarJsParses(legacyMixedBackupArchive);
  assertGuardedState26422(legacyMixedBackupArchive, "legacy mixed file backup restore");
  assertContains(readOutput(legacyMixedRestoreOutput), "restored backup: Fast slash command", "expected restore to use existing legacy file backup without seeding a polluted new backup", readOutput(legacyMixedRestoreOutput));
  resetCodesignCalls();

  const legacyInlineApplyApp = join(tmpDir, "LegacyInlineApply.app");
  const legacyInlineApplyResources = join(legacyInlineApplyApp, "Contents", "Resources");
  const legacyInlineApplyArchive = join(legacyInlineApplyResources, "app.asar");
  const legacyInlineApplyExtracted = join(tmpDir, "legacy-inline-apply-extracted");
  const legacyInlineApplyOutput = join(tmpDir, "legacy-inline-apply-output.txt");
  prepareArchivedFakeApp(legacyInlineApplyApp, join(tmpDir, "legacy-inline-apply-assets"));
  extractFakeAsar(legacyInlineApplyArchive, legacyInlineApplyExtracted);
  const legacyInlineSpeedFile = join(legacyInlineApplyExtracted, "webview", "assets", "general-settings.js");
  writeFileSync(
    legacyInlineSpeedFile,
    readFileSync(legacyInlineSpeedFile, "utf8").replace(
      "x=_e(),{serviceTierSettings:y,setServiceTier:z}=Ce();if(!x)return null;let ",
      "x=!0,{serviceTierSettings:y,setServiceTier:z}=Ce();let ",
    ),
  );
  writeFakeAsar(legacyInlineApplyExtracted, legacyInlineApplyArchive);
  writeInfoPlist(legacyInlineApplyApp, readFakeAsarHeaderHash(legacyInlineApplyArchive));
  runScript(legacyInlineApplyApp, "3\n\nq\n", legacyInlineApplyOutput);
  assertNoPersistentUnpackDir(legacyInlineApplyResources, legacyInlineApplyOutput);
  assertFakeAsarJsParses(legacyInlineApplyArchive);
  assertApplyState(legacyInlineApplyArchive);
  assertNotContains(archiveFile(legacyInlineApplyArchive), "$3", "expected legacy inline speed-setting normalization to avoid literal replacement groups");
  resetCodesignCalls();

  const futureGptSkipApp = join(tmpDir, "FutureGptSkip.app");
  const futureGptSkipOutput = join(tmpDir, "status-future-gpt-skip-output.txt");
  prepareArchivedFakeApp(futureGptSkipApp, join(tmpDir, "future-gpt-skip-assets"), "26.500.0", "9999", "26422");
  runScript(futureGptSkipApp, "2\n\nq\n", futureGptSkipOutput);
  assertNotContains(readOutput(futureGptSkipOutput), "GPT-5.5 model", "expected post-26.422.30944 status to omit unpatched GPT-5.5 compatibility targets", readOutput(futureGptSkipOutput));
  resetCodesignCalls();

  const staleTempApp = join(tmpDir, "StaleTemp.app");
  const staleTempResources = join(staleTempApp, "Contents", "Resources");
  const staleTempOutput = join(tmpDir, "stale-temp-output.txt");
  const staleTempFile = join(staleTempResources, ".codexfast.12345.app.asar.tmp");
  const activeTempFile = join(staleTempResources, ".codexfast.67890.app.asar.tmp");
  prepareArchivedFakeApp(staleTempApp, join(tmpDir, "stale-temp-assets"));
  writeFileSync(staleTempFile, "stale");
  writeFileSync(activeTempFile, "active");
  const staleTime = new Date(Date.now() - 20 * 60 * 1000);
  utimesSync(staleTempFile, staleTime, staleTime);
  runScript(staleTempApp, "2\n\nq\n", staleTempOutput);
  if (existsSync(staleTempFile)) {
    fail("expected stale app.asar temp file to be removed during startup checks", readOutput(staleTempOutput));
  }
  if (!existsSync(activeTempFile)) {
    fail("expected recent app.asar temp file to be preserved during startup checks", readOutput(staleTempOutput));
  }
  resetCodesignCalls();

  const legacyApp = join(tmpDir, "Legacy.app");
  const legacyResources = join(legacyApp, "Contents", "Resources");
  const legacyOutput = join(tmpDir, "legacy-output.txt");
  prepareLegacyFakeApp(legacyApp, join(tmpDir, "legacy-unpacked-assets"), join(tmpDir, "legacy-assets"), "legacy-placeholder-hash");
  runScript(legacyApp, "2\n\nq\n", legacyOutput);
  assertCodesignCalls(1, legacyOutput);
  assertNoPersistentUnpackDir(legacyResources, legacyOutput);
  assertFakeAsarJsParses(join(legacyResources, "app.asar"));
  if (!existsSync(join(legacyResources, "app.asar"))) {
    fail("expected legacy unpacked layout to be repacked into app.asar", readOutput(legacyOutput));
  }
  assertGuardedState(join(legacyResources, "app.asar"), "legacy repack");
  assertIntegrityMatches(legacyApp, join(legacyResources, "app.asar"), "expected ElectronAsarIntegrity hash to match migrated app.asar header");
  resetCodesignCalls();

  const packFailApp = join(tmpDir, "PackFail.app");
  const packFailResources = join(packFailApp, "Contents", "Resources");
  const packFailArchive = join(packFailResources, "app.asar");
  const packFailOutput = join(tmpDir, "pack-fail-output.txt");
  prepareArchivedFakeApp(packFailApp, join(tmpDir, "pack-fail-assets"));
  const packFailOriginalArchive = readFileSync(packFailArchive);
  const packFailOriginalHash = readInfoPlistHash(packFailApp);
  runScriptWithAsarPackFailure(packFailApp, "3\n\nq\n", packFailOutput);
  assertNoPersistentUnpackDir(packFailResources, packFailOutput);
  if (!readFileSync(packFailArchive).equals(packFailOriginalArchive)) {
    fail("expected failed temp pack to leave installed app.asar unchanged", readOutput(packFailOutput));
  }
  if (readInfoPlistHash(packFailApp) !== packFailOriginalHash) {
    fail("expected failed temp pack to leave ElectronAsarIntegrity unchanged", readOutput(packFailOutput));
  }
  const packFailText = readOutput(packFailOutput);
  assertContains(packFailText, "Failed to repack app.asar.", "expected pack failure to be reported", packFailText);
  assertContains(packFailText, "Exit code: 1", "expected a failed action exit code when asar pack fails", packFailText);
  assertNotContains(packFailText, "Running local ad-hoc re-sign", "expected failed pack to stop before re-signing", packFailText);
  resetCodesignCalls();

  const legacyPackFailApp = join(tmpDir, "LegacyPackFail.app");
  const legacyPackFailResources = join(legacyPackFailApp, "Contents", "Resources");
  const legacyPackFailArchive = join(legacyPackFailResources, "app.asar");
  const legacyPackFailUnpackedDir = join(legacyPackFailResources, "app");
  const legacyPackFailOutput = join(tmpDir, "legacy-pack-fail-output.txt");
  prepareLegacyFakeApp(legacyPackFailApp, join(tmpDir, "legacy-pack-fail-unpacked-assets"), join(tmpDir, "legacy-pack-fail-assets"), "legacy-pack-fail-placeholder-hash");
  writeFileSync(legacyPackFailArchive, readFileSync(join(legacyPackFailResources, "app.asar1")));
  const legacyPackFailOriginalArchive = readFileSync(legacyPackFailArchive);
  const legacyPackFailOriginalHash = readInfoPlistHash(legacyPackFailApp);
  const legacyPackFailTempDirs = listCodexfastTempDirs();
  runScriptWithStartupAsarPackFailure(legacyPackFailApp, "2\n\nq\n", legacyPackFailOutput);
  assertNoNewCodexfastTempDirs(legacyPackFailTempDirs, legacyPackFailOutput);
  if (!existsSync(legacyPackFailUnpackedDir)) {
    fail("expected failed legacy temp pack to preserve Resources/app", readOutput(legacyPackFailOutput));
  }
  if (!readFileSync(legacyPackFailArchive).equals(legacyPackFailOriginalArchive)) {
    fail("expected failed legacy temp pack to leave installed app.asar unchanged", readOutput(legacyPackFailOutput));
  }
  if (readInfoPlistHash(legacyPackFailApp) !== legacyPackFailOriginalHash) {
    fail("expected failed legacy temp pack to leave ElectronAsarIntegrity unchanged", readOutput(legacyPackFailOutput));
  }
  assertContains(readOutput(legacyPackFailOutput), "Failed to repack legacy Resources/app directory.", "expected legacy pack failure to be reported", readOutput(legacyPackFailOutput));
  resetCodesignCalls();

  const extractFailApp = join(tmpDir, "ExtractFail.app");
  const extractFailOutput = join(tmpDir, "extract-fail-output.txt");
  prepareArchivedFakeApp(extractFailApp, join(tmpDir, "extract-fail-assets"));
  const extractFailTempDirs = listCodexfastTempDirs();
  runScriptWithAsarExtractFailure(extractFailApp, "3\n\nq\n", extractFailOutput);
  assertNoNewCodexfastTempDirs(extractFailTempDirs, extractFailOutput);
  assertContains(readOutput(extractFailOutput), "Failed to unpack app.asar.", "expected extract failure to be reported", readOutput(extractFailOutput));
  assertContains(readOutput(extractFailOutput), "Exit code: 1", "expected failed extract to return exit code 1", readOutput(extractFailOutput));
  resetCodesignCalls();

  const integrityFailApp = join(tmpDir, "IntegrityFail.app");
  const integrityFailResources = join(integrityFailApp, "Contents", "Resources");
  const integrityFailArchive = join(integrityFailResources, "app.asar");
  const integrityFailOutput = join(tmpDir, "integrity-fail-output.txt");
  prepareArchivedFakeApp(integrityFailApp, join(tmpDir, "integrity-fail-assets"));
  const integrityFailOriginalArchive = readFileSync(integrityFailArchive);
  const integrityFailOriginalHash = readInfoPlistHash(integrityFailApp);
  chmodSync(join(integrityFailApp, "Contents", "Info.plist"), 0o444);
  runScriptAllowFailure(integrityFailApp, "3\n\nq\n", integrityFailOutput);
  chmodSync(join(integrityFailApp, "Contents", "Info.plist"), 0o644);
  if (!readFileSync(integrityFailArchive).equals(integrityFailOriginalArchive)) {
    fail("expected failed integrity update during apply to restore the previous app.asar", readOutput(integrityFailOutput));
  }
  if (readInfoPlistHash(integrityFailApp) !== integrityFailOriginalHash) {
    fail("expected failed integrity update during apply to preserve the previous ElectronAsarIntegrity hash", readOutput(integrityFailOutput));
  }
  assertContains(readOutput(integrityFailOutput), "ElectronAsarIntegrity hash verification failed after updating Info.plist.", "expected integrity failure to be reported", readOutput(integrityFailOutput));
  assertContains(readOutput(integrityFailOutput), "Exit code: 1", "expected failed integrity update to return exit code 1", readOutput(integrityFailOutput));
  resetCodesignCalls();

  const restoreIntegrityFailApp = join(tmpDir, "RestoreIntegrityFail.app");
  const restoreIntegrityFailResources = join(restoreIntegrityFailApp, "Contents", "Resources");
  const restoreIntegrityFailArchive = join(restoreIntegrityFailResources, "app.asar");
  const restoreIntegrityApplyOutput = join(tmpDir, "restore-integrity-fail-apply-output.txt");
  const restoreIntegrityOutput = join(tmpDir, "restore-integrity-fail-output.txt");
  prepareArchivedFakeApp(restoreIntegrityFailApp, join(tmpDir, "restore-integrity-fail-assets"));
  runScript(restoreIntegrityFailApp, "3\n\nq\n", restoreIntegrityApplyOutput);
  const restoreIntegrityPatchedArchive = readFileSync(restoreIntegrityFailArchive);
  const restoreIntegrityPatchedHash = readInfoPlistHash(restoreIntegrityFailApp);
  chmodSync(join(restoreIntegrityFailApp, "Contents", "Info.plist"), 0o444);
  runScriptAllowFailure(restoreIntegrityFailApp, "4\n\nq\n", restoreIntegrityOutput);
  chmodSync(join(restoreIntegrityFailApp, "Contents", "Info.plist"), 0o644);
  if (!readFileSync(restoreIntegrityFailArchive).equals(restoreIntegrityPatchedArchive)) {
    fail("expected failed integrity update during archive restore to restore the previous app.asar", readOutput(restoreIntegrityOutput));
  }
  if (readInfoPlistHash(restoreIntegrityFailApp) !== restoreIntegrityPatchedHash) {
    fail("expected failed integrity update during archive restore to preserve the previous ElectronAsarIntegrity hash", readOutput(restoreIntegrityOutput));
  }
  assertContains(readOutput(restoreIntegrityOutput), "ElectronAsarIntegrity hash verification failed after updating Info.plist.", "expected restore integrity failure to be reported", readOutput(restoreIntegrityOutput));
  assertContains(readOutput(restoreIntegrityOutput), "Exit code: 1", "expected failed restore integrity update to return exit code 1", readOutput(restoreIntegrityOutput));
  resetCodesignCalls();

  const missingBundleIdApp = join(tmpDir, "MissingBundleId.app");
  const missingBundleIdResources = join(missingBundleIdApp, "Contents", "Resources");
  const missingBundleIdArchive = join(missingBundleIdResources, "app.asar");
  const missingBundleIdOutput = join(tmpDir, "missing-bundle-id-output.txt");
  prepareArchivedFakeApp(missingBundleIdApp, join(tmpDir, "missing-bundle-id-assets"));
  writeInfoPlist(missingBundleIdApp, readFakeAsarHeaderHash(missingBundleIdArchive), "26.415.40636", "1799", null);
  resetTccutilCalls();
  runScript(missingBundleIdApp, "3\n\nq\n", missingBundleIdOutput);
  assertNoTccutilCalls(missingBundleIdOutput);
  assertContains(readOutput(missingBundleIdOutput), "Could not reset macOS screen recording permission because CFBundleIdentifier was not found.", "expected missing bundle id to skip TCC reset", readOutput(missingBundleIdOutput));
  resetCodesignCalls();

  const unsupportedApp = join(tmpDir, "Unsupported.app");
  const unsupportedResources = join(unsupportedApp, "Contents", "Resources");
  const unsupportedOutput = join(tmpDir, "unsupported-output.txt");
  prepareArchivedFakeApp(unsupportedApp, join(tmpDir, "unsupported-assets"), "99.0.0", "9999");
  runScript(unsupportedApp, "3\n\nq\n", unsupportedOutput);
  assertNoPersistentUnpackDir(unsupportedResources, unsupportedOutput);
  const unsupportedText = readOutput(unsupportedOutput);
  assertNotContains(unsupportedText, "Running local ad-hoc re-sign", "expected unsupported versions to be blocked before re-signing", unsupportedText);
  if (existsSync(join(unsupportedResources, "app.asar1"))) {
    fail("expected unsupported versions to be blocked before creating app.asar1", unsupportedText);
  }
  assertContains(unsupportedText, "Compatibility: unsupported", "expected unsupported compatibility status in output", unsupportedText);
  assertContains(unsupportedText, "Enable custom API features is blocked for this Codex.app version.", "expected apply to be blocked for unsupported versions", unsupportedText);
  assertContains(archiveFile(join(unsupportedResources, "app.asar")), "if(!x)return null;", "expected unsupported version to leave app.asar unchanged");
  resetCodesignCalls();

  const unsupportedLegacyApp = join(tmpDir, "UnsupportedLegacy.app");
  const unsupportedLegacyResources = join(unsupportedLegacyApp, "Contents", "Resources");
  const unsupportedLegacyOutput = join(tmpDir, "unsupported-legacy-output.txt");
  prepareLegacyFakeApp(unsupportedLegacyApp, join(tmpDir, "unsupported-legacy-unpacked-assets"), join(tmpDir, "unsupported-legacy-assets"), "unsupported-legacy-placeholder-hash");
  writeInfoPlist(unsupportedLegacyApp, "unsupported-legacy-placeholder-hash", "99.0.0", "9999");
  runScript(unsupportedLegacyApp, "3\n\nq\n", unsupportedLegacyOutput);
  const unsupportedLegacyText = readOutput(unsupportedLegacyOutput);
  assertContains(unsupportedLegacyText, "Compatibility: unsupported", "expected unsupported legacy compatibility status in output", unsupportedLegacyText);
  assertContains(unsupportedLegacyText, "Enable custom API features is blocked for this Codex.app version.", "expected unsupported legacy apply to be blocked", unsupportedLegacyText);
  assertNotContains(unsupportedLegacyText, "Detected legacy unpacked Resources/app layout.", "expected unsupported legacy apply to be blocked before legacy migration", unsupportedLegacyText);
  assertNotContains(unsupportedLegacyText, "Running local ad-hoc re-sign", "expected unsupported legacy apply to be blocked before re-signing", unsupportedLegacyText);
  if (!existsSync(join(unsupportedLegacyResources, "app"))) {
    fail("expected unsupported legacy apply to preserve Resources/app", unsupportedLegacyText);
  }
  if (existsSync(join(unsupportedLegacyResources, "app.asar"))) {
    fail("expected unsupported legacy apply not to create app.asar", unsupportedLegacyText);
  }
  resetCodesignCalls();

  const missingAssetsApp = join(tmpDir, "MissingAssets.app");
  const missingAssetsResources = join(missingAssetsApp, "Contents", "Resources");
  const missingAssetsSource = join(tmpDir, "missing-assets-source");
  const missingAssetsOutput = join(tmpDir, "missing-assets-output.txt");
  mkdirSync(missingAssetsResources, { recursive: true });
  mkdirSync(join(missingAssetsSource, "other"), { recursive: true });
  writeFileSync(join(missingAssetsSource, "other", "noop.js"), "const noop=true;");
  writeFakeAsar(missingAssetsSource, join(missingAssetsResources, "app.asar"));
  writeInfoPlist(missingAssetsApp, readFakeAsarHeaderHash(join(missingAssetsResources, "app.asar")));
  runScriptAllowFailure(missingAssetsApp, "2\n\nq\n", missingAssetsOutput);
  assertContains(readOutput(missingAssetsOutput), "Assets directory not found:", "expected missing assets to be reported without a stack trace", readOutput(missingAssetsOutput));
  assertContains(readOutput(missingAssetsOutput), "Exit code: 1", "expected missing assets to return exit code 1", readOutput(missingAssetsOutput));
  assertNotContains(readOutput(missingAssetsOutput), "ENOENT", "expected missing assets to avoid raw readdirSync ENOENT", readOutput(missingAssetsOutput));
  resetCodesignCalls();

  const failingApp = join(tmpDir, "Failing.app");
  const failingResources = join(failingApp, "Contents", "Resources");
  const failingOutput = join(tmpDir, "failing-output.txt");
  prepareArchivedFakeApp(failingApp, join(tmpDir, "failing-assets"));
  runScriptWithCodesignFailure(failingApp, "3\n\nq\n", failingOutput);
  assertNoPersistentUnpackDir(failingResources, failingOutput);
  assertFakeAsarJsParses(join(failingResources, "app.asar"));
  const failingText = readOutput(failingOutput);
  assertContains(failingText, `codesign --force --deep --sign - ${failingApp}`, "expected manual re-sign guidance in failure output", failingText);
  assertContains(failingText, "Exit code: 1", "expected a failed action exit code when codesign fails", failingText);
  resetCodesignCalls();

  const verifyFailingApp = join(tmpDir, "VerifyFailing.app");
  const verifyFailingResources = join(verifyFailingApp, "Contents", "Resources");
  const verifyFailingOutput = join(tmpDir, "verify-failing-output.txt");
  prepareArchivedFakeApp(verifyFailingApp, join(tmpDir, "verify-failing-assets"));
  runScriptWithCodesignVerifyFailure(verifyFailingApp, "3\n\nq\n", verifyFailingOutput);
  assertNoPersistentUnpackDir(verifyFailingResources, verifyFailingOutput);
  assertFakeAsarJsParses(join(verifyFailingResources, "app.asar"));
  assertCodesignCallContains(`--verify --deep --strict --verbose=2 ${verifyFailingApp}`, verifyFailingOutput);
  const verifyFailingText = readOutput(verifyFailingOutput);
  assertContains(verifyFailingText, "Failed to verify the re-signed Codex.app.", "expected verify failure to be reported", verifyFailingText);
  assertContains(verifyFailingText, `codesign --verify --deep --strict --verbose=2 ${verifyFailingApp}`, "expected manual verify guidance in failure output", verifyFailingText);
  assertContains(verifyFailingText, "Restore original app", "expected verify failure guidance to mention restoring the original app", verifyFailingText);
  assertContains(verifyFailingText, "Exit code: 1", "expected a failed action exit code when codesign verify fails", verifyFailingText);

  console.log("re-sign flow test passed");
}

try {
  main();
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
