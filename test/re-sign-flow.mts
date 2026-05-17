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
  assertApplyState26513Build2867,
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
  assertGuardedState26513Build2867,
} from "./helpers/patch-state-assertions.mts";
import { assertCodesignCallContains as assertCodesignCallContainsHelper, assertCodesignCalls as assertCodesignCallsHelper, assertLaunchctlCallContains as assertLaunchctlCallContainsHelper, assertNoCodesignCalls as assertNoCodesignCallsHelper, assertNoLaunchCalls as assertNoLaunchCallsHelper, assertNoNpmCalls as assertNoNpmCallsHelper, assertNoTccutilCalls as assertNoTccutilCallsHelper, assertNpmCallContains as assertNpmCallContainsHelper, readOutput, resetCodesignCalls as resetCodesignCallsHelper, resetNpmCalls as resetNpmCallsHelper, resetTccutilCalls as resetTccutilCallsHelper, runScript as runScriptHelper, setupStubs as setupStubsHelper } from "./helpers/script-harness.mts";
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

function runLegacyTool(appDir: string, action: string, outputFile: string, extraEnv: Record<string, string> = {}): void {
  runScriptCommand(appDir, [`__selftest-legacy-${action}`], outputFile, extraEnv);
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
  assertContains(generatedCli, "runtimePatchReconnectMaxAttempts = 3", "expected generated CLI to bound runtime launch reconnect attempts");
  assertContains(generatedCli, '"Page.getFrameTree"', "expected generated CLI to heartbeat the CDP runtime patch session");
  assertContains(generatedCli, "Runtime patch session lost after", "expected generated CLI to report exhausted runtime patch reconnects clearly");
  assertNotContains(generatedCli, "tccutil", "expected generated CLI not to reset macOS ScreenCapture permissions");
  assertNotContains(generatedCli, "ScreenCapture", "expected generated CLI not to contain ScreenCapture reset logic");
  assertNotContains(generatedCli, "codexfast-browser-peer-auth", "expected generated CLI not to contain browser-use native pipe peer-auth compatibility patch");
  assertNotContains(generatedCli, "missing-code-signing-identity", "expected generated CLI not to authorize missing-code-signing-identity peer-auth failures");
  assertNotContains(generatedCli, "__SUPPORTED_APP_VERSIONS__", "expected generated CLI to inline supported app versions without placeholder names");
}

function assertPatcherTargetsRuntimeImportable(): void {
  assertContains(
    TARGET_SPECS.map((spec) => spec.id).join("\n"),
    "speed-setting",
    "expected patcher target specs to be importable at runtime",
  );
  assertNotContains(
    TARGET_SPECS.map((spec) => spec.id).join("\n"),
    "browser-use-native-pipe-peer-auth",
    "expected browser-use native pipe peer-auth compatibility target to be removed",
  );
}

function assertOutputOrder(output: string, earlier: string, later: string, message: string): void {
  const earlierIndex = output.indexOf(earlier);
  const laterIndex = output.indexOf(later);
  if (earlierIndex === -1 || laterIndex === -1 || earlierIndex >= laterIndex) {
    fail(message, output);
  }
}

function assertRuntimePatchEnginePatchesBody(): void {
  const speedBody = "settings.agent.speed.label;n=se(),{serviceTierSettings:r,setServiceTier:i}=fe();if(!n)return null;let o;";
  const speedResult = applyRuntimePatchesToBody("webview/assets/general-settings-demo.js", speedBody);
  assertContains(speedResult.content, "{serviceTierSettings:r,setServiceTier:i}=fe();let o;", "expected runtime patch engine to keep patching matching Speed settings bodies");
  assertContains(speedResult.patchedLabels.join("\n"), "Speed setting", "expected runtime patch engine to report patched Speed setting target");

  const nativePipeBody = "function dP(){return lP().info(`browser-use native pipe peer authorization enabled`,{safe:{mode:a?`dev`:`packaged`},sensitive:{}}),e=>{let t=fP(e);return t==null?{authorized:!1,reason:`missing-socket-file-descriptor`}:s.authorizeSocketPeer(t,a)}}";
  const nativePipeResult = applyRuntimePatchesToBody("webview/assets/browser-use-native-pipe-Demo.js", nativePipeBody);
  if (nativePipeResult.content !== nativePipeBody) {
    fail("expected runtime patch engine to leave browser-use native pipe peer auth unchanged", nativePipeResult.content);
  }
  assertNotContains(nativePipeResult.patchedLabels.join("\n"), "Browser-use native pipe peer auth", "expected runtime patch engine not to report removed native pipe target");
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

  runLegacyTool(caseConfig.appDir, "apply", applyOutput);
  assertNpmCallContains("--package @electron/asar@3.4.1", applyOutput);
  assertCodesignCalls(1, applyOutput);
  assertNoTccutilCalls(applyOutput);
  assertNotContains(readOutput(applyOutput), "Reset macOS screen recording permission", "expected apply not to reset macOS ScreenCapture permissions", readOutput(applyOutput));
  assertNoPersistentUnpackDir(resourcesDir, applyOutput);
  assertFakeAsarJsParses(archivePath);
  caseConfig.applyAssert(archivePath);
  assertNoPatcherInternalPaths(readOutput(applyOutput), `${caseConfig.name} apply output`);
  caseConfig.postApplyAssert?.(readOutput(applyOutput));
  resetNativeToolCalls();

  if (caseConfig.statusAssert) {
    runLegacyTool(caseConfig.appDir, "status", statusOutput);
    assertNoPatcherInternalPaths(readOutput(statusOutput), `${caseConfig.name} status output`);
    caseConfig.statusAssert(readOutput(statusOutput));
  }

  runLegacyTool(caseConfig.appDir, "restore", restoreOutput);
  assertCodesignCalls(1, restoreOutput);
  assertNoTccutilCalls(restoreOutput);
  assertNotContains(readOutput(restoreOutput), "Reset macOS screen recording permission", "expected restore not to reset macOS ScreenCapture permissions", readOutput(restoreOutput));
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
  assertContains(readOutput(helpOutput), "version", "expected help to include version command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "status", "expected help not to advertise legacy status command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "apply", "expected help not to advertise legacy apply command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "repair", "expected help not to advertise legacy repair command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "restore", "expected help not to advertise legacy restore command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "watcher", "expected help not to advertise legacy watcher commands", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "--quiet", "expected help not to advertise the legacy quiet marker", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "__selftest-cdp-frame", "expected help not to list the hidden CDP self-test command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "__selftest-runtime-url", "expected help not to list the hidden runtime URL self-test command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "__selftest-runtime-patch-body", "expected help not to list the hidden runtime patch body self-test command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "__selftest-legacy-apply", "expected help not to list hidden legacy self-test commands", readOutput(helpOutput));

  const menuOutput = join(tmpDir, "menu-output.txt");
  prepareArchivedFakeApp(join(tmpDir, "Menu.app"), join(tmpDir, "menu-assets"));
  runScript(join(tmpDir, "Menu.app"), "q\n", menuOutput);
  assertContains(readOutput(menuOutput), "1) Launch Codex with runtime patches (recommended)", "expected no-arg menu to recommend runtime launch mode", readOutput(menuOutput));
  assertNotContains(readOutput(menuOutput), "2) Check current status", "expected no-arg menu to remove legacy status option", readOutput(menuOutput));
  assertNotContains(readOutput(menuOutput), "Apply legacy bundle patches", "expected no-arg menu to remove legacy apply option", readOutput(menuOutput));
  assertNotContains(readOutput(menuOutput), "Restore legacy bundle patch backups", "expected no-arg menu to remove legacy restore option", readOutput(menuOutput));
  assertNotContains(readOutput(menuOutput), "auto-repair watcher", "expected no-arg menu to remove watcher options", readOutput(menuOutput));

  for (const legacyCommand of ["status", "apply", "restore", "install-watcher", "uninstall-watcher"]) {
    const legacyCommandOutput = join(tmpDir, `legacy-command-${legacyCommand}.txt`);
    runScriptCommand(join(tmpDir, `MissingFor${legacyCommand}.app`), [legacyCommand], legacyCommandOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
    assertContains(readOutput(legacyCommandOutput), "Commands:", `expected removed command ${legacyCommand} to print help`, readOutput(legacyCommandOutput));
    assertNotContains(readOutput(legacyCommandOutput), `Action: ${legacyCommand}`, `expected removed command ${legacyCommand} not to run`, readOutput(legacyCommandOutput));
  }

  const versionOutput = join(tmpDir, "version-output.txt");
  runScriptCommand(join(tmpDir, "MissingForVersion.app"), ["version"], versionOutput);
  if (readOutput(versionOutput).trim() !== `codexfast ${packageVersion}`) {
    fail("expected version command to print only the current package version", readOutput(versionOutput));
  }

  const cdpEncodeOutput = join(tmpDir, "cdp-encode-output.txt");
  runScriptCommand(join(tmpDir, "MissingForCdpSelfTest.app"), ["__selftest-cdp-frame"], cdpEncodeOutput);
  assertContains(readOutput(cdpEncodeOutput), "CDP frame self-test passed", "expected CDP frame self-test to cover large frames", readOutput(cdpEncodeOutput));

  const runtimeUrlOutput = join(tmpDir, "runtime-url-output.txt");
  runScriptCommand(join(tmpDir, "MissingForRuntimeUrlSelfTest.app"), ["__selftest-runtime-url"], runtimeUrlOutput);
  assertContains(readOutput(runtimeUrlOutput), "Runtime URL self-test passed", "expected runtime URL self-test to cover current and legacy asset URLs", readOutput(runtimeUrlOutput));

  const runtimePatchBodyOutput = join(tmpDir, "runtime-patch-body-output.txt");
  runScriptCommand(join(tmpDir, "MissingForRuntimePatchBodySelfTest.app"), ["__selftest-runtime-patch-body"], runtimePatchBodyOutput);
  assertContains(readOutput(runtimePatchBodyOutput), "Runtime patch body self-test passed", "expected generated CLI runtime patch engine to patch JS bodies", readOutput(runtimePatchBodyOutput));

  const repairCleanupOutput = join(tmpDir, "repair-cleanup-output.txt");
  const repairCleanupHome = join(tmpDir, "repair-cleanup-home");
  const repairCleanupPlist = join(repairCleanupHome, "Library", "LaunchAgents", "com.codexfast.watcher.plist");
  const repairCleanupRuntime = join(repairCleanupHome, "Library", "Application Support", "codexfast", "codexfast-watcher.js");
  mkdirSync(join(repairCleanupHome, "Library", "LaunchAgents"), { recursive: true });
  mkdirSync(join(repairCleanupHome, "Library", "Application Support", "codexfast"), { recursive: true });
  writeFileSync(repairCleanupPlist, "stale watcher plist");
  writeFileSync(repairCleanupRuntime, "stale watcher runtime");
  runScriptCommand(join(tmpDir, "MissingForRepairCleanup.app"), ["repair"], repairCleanupOutput, { HOME: repairCleanupHome });
  if (existsSync(repairCleanupPlist) || existsSync(repairCleanupRuntime)) {
    fail("expected hidden repair compatibility command to remove watcher files even when Codex.app is missing", readOutput(repairCleanupOutput));
  }
  assertContains(readOutput(repairCleanupOutput), "Removed legacy auto-repair watcher.", "expected hidden repair compatibility command to report watcher cleanup", readOutput(repairCleanupOutput));
  assertNotContains(readOutput(repairCleanupOutput), "Codex resources directory not found", "expected hidden repair compatibility command to skip Codex.app resource checks", readOutput(repairCleanupOutput));

  const unsupportedRepairNoToolsApp = join(tmpDir, "UnsupportedRepairNoTools.app");
  const unsupportedRepairNoToolsOutput = join(tmpDir, "unsupported-repair-no-tools-output.txt");
  const noToolsPath = join(tmpDir, "no-tools-path");
  mkdirSync(noToolsPath, { recursive: true });
  prepareArchivedFakeApp(unsupportedRepairNoToolsApp, join(tmpDir, "unsupported-repair-no-tools-assets"), "99.0.0", "9999");
  runLegacyTool(unsupportedRepairNoToolsApp, "repair", unsupportedRepairNoToolsOutput, { PATH: noToolsPath });
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
  assertContains(readOutput(launchSuccessOutput), "Keep this codexfast launch process running while you use Codex.", "expected launch command to describe the foreground runtime session", readOutput(launchSuccessOutput));
  assertOutputOrder(readOutput(launchSuccessOutput), "Patched targets:", "Runtime launch completed.", "expected launch output to list patched targets before session instructions");
  assertOutputOrder(readOutput(launchSuccessOutput), "  Speed setting", "Keep this codexfast launch process running while you use Codex.", "expected launch output to list patched labels before foreground-session instructions");
  assertNotContains(readOutput(launchSuccessOutput), "Browser-use native pipe peer auth", "expected launch dry-run hook not to report removed native pipe target", readOutput(launchSuccessOutput));
  assertNoCodesignCalls(launchSuccessOutput);
  assertNoTccutilCalls(launchSuccessOutput);

  const launchSessionLostApp = join(tmpDir, "LaunchSessionLost.app");
  const launchSessionLostOutput = join(tmpDir, "launch-session-lost-output.txt");
  prepareArchivedFakeApp(launchSessionLostApp, join(tmpDir, "launch-session-lost-assets"), "26.513.20950", "2816", "26513-2816");
  runScriptCommand(launchSessionLostApp, ["launch"], launchSessionLostOutput, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_SESSION_LOST: "1",
    CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
  });
  assertContains(readOutput(launchSessionLostOutput), "Runtime launch completed.", "expected launch session-lost hook to reach a ready session first", readOutput(launchSessionLostOutput));
  assertContains(readOutput(launchSessionLostOutput), "Runtime patch session lost after 3 reconnect attempts:", "expected launch to report exhausted runtime reconnect attempts", readOutput(launchSessionLostOutput));
  assertContains(readOutput(launchSessionLostOutput), "Codex.app will keep running without further runtime patching.", "expected exhausted runtime reconnect attempts to leave Codex running", readOutput(launchSessionLostOutput));
  assertContains(readOutput(launchSessionLostOutput), "Exit code: 0", "expected exhausted runtime reconnect attempts not to fail launch after Codex is running", readOutput(launchSessionLostOutput));
  assertNoCodesignCalls(launchSessionLostOutput);
  assertNoTccutilCalls(launchSessionLostOutput);

  const menuLaunchSuccessApp = join(tmpDir, "MenuLaunchSuccess.app");
  const menuLaunchSuccessOutput = join(tmpDir, "menu-launch-success-output.txt");
  prepareArchivedFakeApp(menuLaunchSuccessApp, join(tmpDir, "menu-launch-success-assets"), "26.513.20950", "2816", "26513-2816");
  runScript(menuLaunchSuccessApp, "1\n\nq\n", menuLaunchSuccessOutput, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
  });
  assertContains(readOutput(menuLaunchSuccessOutput), "Runtime launch completed.", "expected menu launch option to report success", readOutput(menuLaunchSuccessOutput));
  assertContains(readOutput(menuLaunchSuccessOutput), "Keep this codexfast launch process running while you use Codex.", "expected menu launch option to describe the foreground runtime session", readOutput(menuLaunchSuccessOutput));
  assertOutputOrder(readOutput(menuLaunchSuccessOutput), "Patched targets:", "Runtime launch completed.", "expected menu launch output to list patched targets before session instructions");
  assertOutputOrder(readOutput(menuLaunchSuccessOutput), "  Speed setting", "Keep this codexfast launch process running while you use Codex.", "expected menu launch output to list patched labels before foreground-session instructions");
  assertNotContains(readOutput(menuLaunchSuccessOutput), "Browser-use native pipe peer auth", "expected menu launch option not to report removed native pipe target", readOutput(menuLaunchSuccessOutput));
  assertNoCodesignCalls(menuLaunchSuccessOutput);
  assertNoTccutilCalls(menuLaunchSuccessOutput);

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
  runLegacyTool(partial26417App, "apply", partial26417Output);
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
      assertNotContains(output, "Browser-use native pipe peer auth", "expected 26.513 build 2816 status to omit removed browser-use native pipe target", output);
      assertNotContains(output, "Target file:", "expected 26.513 build 2816 status to omit internal target paths", output);
      assertNotContains(output, "Backup file:", "expected 26.513 build 2816 status to omit internal backup paths", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.513 build 2816 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26513-2867",
    appDir: join(tmpDir, "Supported26513Build2867.app"),
    assetsRoot: join(tmpDir, "supported-26513-2867-assets"),
    appVersion: "26.513.31313",
    appBuild: "2867",
    assetProfile: "26513-2867",
    applyAssert: assertApplyState26513Build2867,
    restoreAssert: assertGuardedState26513Build2867,
    restoreContext: "26.513 build 2867 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.513 build 2867 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => {
      assertContains(output, "Status: Speed setting enabled", "expected 26.513 build 2867 status to report the Settings Speed target after apply", output);
      assertContains(output, "Status: Fast slash command enabled", "expected 26.513 build 2867 status to report the Fast slash command after apply", output);
      assertContains(output, "Status: Composer Intelligence Speed menu enabled", "expected 26.513 build 2867 status to report the Intelligence Speed target after apply", output);
      assertContains(output, "Status: Plugins access enabled", "expected 26.513 build 2867 status to report Plugins after apply", output);
      assertContains(output, "Status: Plugins page content enabled", "expected 26.513 build 2867 status to report Plugins page content after apply", output);
      assertContains(output, "Status: Plugin detail access enabled", "expected 26.513 build 2867 status to report Plugin detail access after apply", output);
      assertContains(output, "Status: Plugin install availability enabled", "expected 26.513 build 2867 status to report Plugin install availability after apply", output);
      assertContains(output, "Status: Plugin install modal content enabled", "expected 26.513 build 2867 status to report Plugin install modal content after apply", output);
      assertContains(output, "Status: Composer plugin mentions enabled", "expected 26.513 build 2867 status to report Composer plugin mentions after apply", output);
      assertNotContains(output, "GPT-5.5 model", "expected 26.513 build 2867 status to omit unpatched GPT-5.5 compatibility targets", output);
    },
  });

  const sparkleBridgeApp = join(tmpDir, "SparkleBridge.app");
  const sparkleBridgeResources = join(sparkleBridgeApp, "Contents", "Resources");
  const sparkleBridgeApplyOutput = join(tmpDir, "sparkle-bridge-apply-output.txt");
  const sparkleBridgeRestoreOutput = join(tmpDir, "sparkle-bridge-restore-output.txt");
  prepareArchivedFakeApp(sparkleBridgeApp, join(tmpDir, "sparkle-bridge-assets"), "26.506.31421", "2620", "26506-2620");
  runLegacyTool(sparkleBridgeApp, "apply", sparkleBridgeApplyOutput);
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
  runLegacyTool(sparkleBridgeApp, "restore", sparkleBridgeRestoreOutput);
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
  runLegacyTool(sparkleBridgeAlreadyPatchedApp, "apply", join(tmpDir, "sparkle-bridge-already-patched-first-output.txt"));
  writeInfoPlist(
    sparkleBridgeAlreadyPatchedApp,
    readInfoPlistHash(sparkleBridgeAlreadyPatchedApp),
    "26.506.31421",
    "2620",
    "com.openai.codex",
  );
  resetNativeToolCalls();
  runLegacyTool(sparkleBridgeAlreadyPatchedApp, "repair", sparkleBridgeAlreadyPatchedOutput);
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
  runLegacyTool(quietUnsupportedRepairApp, "repair", quietUnsupportedRepairOutput);
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
  runLegacyTool(idempotentRepairApp, "repair", repairFirstOutput);
  assertCodesignCalls(1, repairFirstOutput);
  assertNoTccutilCalls(repairFirstOutput);
  assertApplyState26429Build2345(idempotentRepairArchive);
  assertIntegrityMatches(idempotentRepairApp, idempotentRepairArchive, "expected first repair to update ElectronAsarIntegrity");
  const repairedArchive = readFileSync(idempotentRepairArchive);
  const repairedHash = readInfoPlistHash(idempotentRepairApp);
  resetNativeToolCalls();
  runLegacyTool(idempotentRepairApp, "repair", repairSecondOutput);
  assertNoCodesignCalls(repairSecondOutput);
  assertNoTccutilCalls(repairSecondOutput);
  if (!readFileSync(idempotentRepairArchive).equals(repairedArchive)) {
    fail("expected second repair to leave already patched app.asar unchanged", readOutput(repairSecondOutput));
  }
  if (readInfoPlistHash(idempotentRepairApp) !== repairedHash) {
    fail("expected second repair to leave ElectronAsarIntegrity unchanged", readOutput(repairSecondOutput));
  }
  assertContains(readOutput(repairSecondOutput), "No patch changes were needed; leaving app.asar and signature untouched.", "expected second repair to report no archive rewrite", readOutput(repairSecondOutput));

  const launchCleanupWatcherApp = join(tmpDir, "LaunchCleanupWatcher.app");
  const launchCleanupWatcherOutput = join(tmpDir, "launch-cleanup-watcher-output.txt");
  const launchCleanupWatcherHome = join(tmpDir, "launch-cleanup-watcher-home");
  const launchCleanupWatcherPlist = join(launchCleanupWatcherHome, "Library", "LaunchAgents", "com.codexfast.watcher.plist");
  const launchCleanupWatcherRuntime = join(launchCleanupWatcherHome, "Library", "Application Support", "codexfast", "codexfast-watcher.js");
  prepareArchivedFakeApp(launchCleanupWatcherApp, join(tmpDir, "launch-cleanup-watcher-assets"), "26.513.20950", "2816", "26513-2816");
  mkdirSync(join(launchCleanupWatcherHome, "Library", "LaunchAgents"), { recursive: true });
  mkdirSync(join(launchCleanupWatcherHome, "Library", "Application Support", "codexfast"), { recursive: true });
  writeFileSync(launchCleanupWatcherPlist, "stale watcher plist");
  writeFileSync(launchCleanupWatcherRuntime, "stale watcher runtime");
  resetNativeToolCalls();
  runScriptCommand(launchCleanupWatcherApp, ["launch"], launchCleanupWatcherOutput, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
    HOME: launchCleanupWatcherHome,
  });
  if (existsSync(launchCleanupWatcherPlist) || existsSync(launchCleanupWatcherRuntime)) {
    fail("expected launch to remove stale auto-repair watcher files", readOutput(launchCleanupWatcherOutput));
  }
  assertContains(readOutput(launchCleanupWatcherOutput), "Removed legacy auto-repair watcher.", "expected launch to report stale watcher cleanup", readOutput(launchCleanupWatcherOutput));
  assertLaunchctlCallContains("bootout", launchCleanupWatcherOutput);
  assertNoCodesignCalls(launchCleanupWatcherOutput);
  assertNoTccutilCalls(launchCleanupWatcherOutput);

  const restoreUninstallsWatcherApp = join(tmpDir, "RestoreUninstallsWatcher.app");
  const restoreUninstallsWatcherArchive = join(restoreUninstallsWatcherApp, "Contents", "Resources", "app.asar");
  const restoreUninstallsWatcherHome = join(tmpDir, "restore-uninstalls-watcher-home");
  const restoreUninstallsWatcherApplyOutput = join(tmpDir, "restore-uninstalls-watcher-apply-output.txt");
  const restoreUninstallsWatcherOutput = join(tmpDir, "restore-uninstalls-watcher-output.txt");
  prepareArchivedFakeApp(restoreUninstallsWatcherApp, join(tmpDir, "restore-uninstalls-watcher-assets"), "26.429.61741", "2429", "26429-2345");
  const restoreUninstallsWatcherPlist = join(restoreUninstallsWatcherHome, "Library", "LaunchAgents", "com.codexfast.watcher.plist");
  const restoreUninstallsWatcherRuntime = join(restoreUninstallsWatcherHome, "Library", "Application Support", "codexfast", "codexfast-watcher.js");
  mkdirSync(join(restoreUninstallsWatcherHome, "Library", "LaunchAgents"), { recursive: true });
  mkdirSync(join(restoreUninstallsWatcherHome, "Library", "Application Support", "codexfast"), { recursive: true });
  writeFileSync(restoreUninstallsWatcherPlist, "stale watcher plist");
  writeFileSync(restoreUninstallsWatcherRuntime, "stale watcher runtime");
  if (!existsSync(restoreUninstallsWatcherPlist) || !existsSync(restoreUninstallsWatcherRuntime)) {
    fail("expected stale watcher files before restore", "");
  }
  runLegacyTool(restoreUninstallsWatcherApp, "apply", restoreUninstallsWatcherApplyOutput, { HOME: restoreUninstallsWatcherHome });
  assertApplyState26429Build2345(restoreUninstallsWatcherArchive);
  runLegacyTool(restoreUninstallsWatcherApp, "restore", restoreUninstallsWatcherOutput, { HOME: restoreUninstallsWatcherHome });
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
  runLegacyTool(inlineApp, "apply", join(tmpDir, "apply-26422-2080-inline-output.txt"));
  assertApplyState26422(inlineArchive);
  rmSync(join(inlineResources, "app.asar1"), { force: true });
  writeInfoPlist(inlineApp, readFakeAsarHeaderHash(inlineArchive), "26.422.30944", "2080");
  const inlineRestoreOutput = join(tmpDir, "restore-26422-2080-inline-output.txt");
  runLegacyTool(inlineApp, "restore", inlineRestoreOutput);
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
  runLegacyTool(legacyBackupApp, "apply", join(tmpDir, "legacy-file-backup-apply-output.txt"));
  assertApplyState(legacyBackupArchive);
  rmSync(join(legacyBackupResources, "app.asar1"), { force: true });
  extractFakeAsar(legacyBackupArchive, legacyBackupExtracted);
  renameBackupSuffixes(legacyBackupExtracted, ".codexfast.bak", ".speed-setting.bak");
  writeFakeAsar(legacyBackupExtracted, legacyBackupArchive);
  writeInfoPlist(legacyBackupApp, readFakeAsarHeaderHash(legacyBackupArchive));
  runLegacyTool(legacyBackupApp, "restore", legacyBackupOutput);
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
  runLegacyTool(legacyMixedBackupApp, "apply", legacyMixedApplyOutput);
  assertFakeAsarJsParses(legacyMixedBackupArchive);
  assertApplyState26422(legacyMixedBackupArchive);
  rmSync(join(legacyMixedBackupResources, "app.asar1"), { force: true });
  runLegacyTool(legacyMixedBackupApp, "restore", legacyMixedRestoreOutput);
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
  runLegacyTool(legacyInlineApplyApp, "apply", legacyInlineApplyOutput);
  assertNoPersistentUnpackDir(legacyInlineApplyResources, legacyInlineApplyOutput);
  assertFakeAsarJsParses(legacyInlineApplyArchive);
  assertApplyState(legacyInlineApplyArchive);
  assertNotContains(archiveFile(legacyInlineApplyArchive), "$3", "expected legacy inline speed-setting normalization to avoid literal replacement groups");
  resetCodesignCalls();

  const futureGptSkipApp = join(tmpDir, "FutureGptSkip.app");
  const futureGptSkipOutput = join(tmpDir, "status-future-gpt-skip-output.txt");
  prepareArchivedFakeApp(futureGptSkipApp, join(tmpDir, "future-gpt-skip-assets"), "26.500.0", "9999", "26422");
  runLegacyTool(futureGptSkipApp, "status", futureGptSkipOutput);
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
  runLegacyTool(staleTempApp, "status", staleTempOutput);
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
  runLegacyTool(legacyApp, "status", legacyOutput);
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
  runLegacyTool(packFailApp, "apply", packFailOutput, { CODEXFAST_TEST_ASAR_PACK_FAIL: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
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
  runLegacyTool(legacyPackFailApp, "status", legacyPackFailOutput, { CODEXFAST_TEST_ASAR_PACK_FAIL: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
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
  runLegacyTool(extractFailApp, "apply", extractFailOutput, { CODEXFAST_TEST_ASAR_EXTRACT_FAIL: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
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
  runLegacyTool(integrityFailApp, "apply", integrityFailOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
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
  runLegacyTool(restoreIntegrityFailApp, "apply", restoreIntegrityApplyOutput);
  const restoreIntegrityPatchedArchive = readFileSync(restoreIntegrityFailArchive);
  const restoreIntegrityPatchedHash = readInfoPlistHash(restoreIntegrityFailApp);
  chmodSync(join(restoreIntegrityFailApp, "Contents", "Info.plist"), 0o444);
  runLegacyTool(restoreIntegrityFailApp, "restore", restoreIntegrityOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
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

  const unsupportedApp = join(tmpDir, "Unsupported.app");
  const unsupportedResources = join(unsupportedApp, "Contents", "Resources");
  const unsupportedOutput = join(tmpDir, "unsupported-output.txt");
  prepareArchivedFakeApp(unsupportedApp, join(tmpDir, "unsupported-assets"), "99.0.0", "9999");
  runLegacyTool(unsupportedApp, "apply", unsupportedOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
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
  runLegacyTool(unsupportedLegacyApp, "apply", unsupportedLegacyOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
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
  runLegacyTool(missingAssetsApp, "status", missingAssetsOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(missingAssetsOutput), "Assets directory not found:", "expected missing assets to be reported without a stack trace", readOutput(missingAssetsOutput));
  assertContains(readOutput(missingAssetsOutput), "Exit code: 1", "expected missing assets to return exit code 1", readOutput(missingAssetsOutput));
  assertNotContains(readOutput(missingAssetsOutput), "ENOENT", "expected missing assets to avoid raw readdirSync ENOENT", readOutput(missingAssetsOutput));
  resetCodesignCalls();

  const failingApp = join(tmpDir, "Failing.app");
  const failingResources = join(failingApp, "Contents", "Resources");
  const failingOutput = join(tmpDir, "failing-output.txt");
  prepareArchivedFakeApp(failingApp, join(tmpDir, "failing-assets"));
  runLegacyTool(failingApp, "apply", failingOutput, { CODEXFAST_TEST_CODESIGN_FAIL: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
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
  runLegacyTool(verifyFailingApp, "apply", verifyFailingOutput, { CODEXFAST_TEST_CODESIGN_VERIFY_FAIL: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
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
