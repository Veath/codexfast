import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertContains, assertNotContains, fail } from "./helpers/assertions.mts";
import { prepareFakeApp as prepareFakeAppHelper } from "./helpers/fake-app.mts";
import {
  assertNoCodesignCalls as assertNoCodesignCallsHelper,
  assertNoLaunchCalls as assertNoLaunchCallsHelper,
  assertNoNpmCalls as assertNoNpmCallsHelper,
  assertNoTccutilCalls as assertNoTccutilCallsHelper,
  readOutput,
  runScript as runScriptHelper,
  setupStubs as setupStubsHelper,
} from "./helpers/script-harness.mts";
import { runGeneratedCliSuite } from "./suites/generated-cli-suite.mts";
import { runRuntimePatchSuite } from "./suites/runtime-patch-suite.mts";

const rootDir = resolve(process.env.CODEXFAST_TEST_ROOT ?? process.cwd());
const tmpDir = mkdtempSync(join(tmpdir(), "codexfast-test."));
const stubBin = join(tmpDir, "bin");
const markerFile = join(tmpDir, "native-tools.log");
const packageVersion = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")).version as string;

function setupStubs(): void {
  setupStubsHelper(stubBin, markerFile);
}

function prepareFakeApp(
  appDir: string,
  appVersion = "26.415.40636",
  appBuild = "1799",
): void {
  prepareFakeAppHelper({
    appDir,
    appVersion,
    appBuild,
  });
}

function runScript(
  appDir: string,
  input: string,
  outputFile: string,
  extraEnv: Record<string, string> = {},
): void {
  runScriptHelper({ rootDir, stubBin, appDir, input, outputFile, extraEnv });
}

function runScriptCommand(
  appDir: string,
  args: string[],
  outputFile: string,
  extraEnv: Record<string, string> = {},
): void {
  runScriptHelper({
    rootDir,
    stubBin,
    appDir,
    input: "",
    outputFile,
    args,
    extraEnv,
  });
}

function assertNoCodesignCalls(outputFile: string): void {
  assertNoCodesignCallsHelper(markerFile, outputFile);
}

function assertNoTccutilCalls(outputFile: string): void {
  assertNoTccutilCallsHelper(markerFile, outputFile);
}

function assertNoNpmCalls(outputFile: string): void {
  assertNoNpmCallsHelper(markerFile, outputFile);
}

function assertNoLaunchCalls(outputFile: string): void {
  assertNoLaunchCallsHelper(markerFile, outputFile);
}

function assertNoBundleMutationTools(outputFile: string): void {
  assertNoCodesignCalls(outputFile);
  assertNoNpmCalls(outputFile);
  assertNoTccutilCalls(outputFile);
}

function assertOutputOrder(
  output: string,
  earlier: string,
  later: string,
  message: string,
): void {
  const earlierIndex = output.indexOf(earlier);
  const laterIndex = output.indexOf(later);
  if (earlierIndex === -1 || laterIndex === -1 || earlierIndex >= laterIndex) {
    fail(message, output);
  }
}

function main(): void {
  runGeneratedCliSuite(rootDir);
  runRuntimePatchSuite();
  setupStubs();

  const helpOutput = join(tmpDir, "help-output.txt");
  runScriptCommand(join(tmpDir, "MissingForHelp.app"), ["help"], helpOutput);
  assertContains(readOutput(helpOutput), `codexfast ${packageVersion}`, "expected help to print the current package version", readOutput(helpOutput));
  assertContains(readOutput(helpOutput), "Commands:", "expected help to list commands", readOutput(helpOutput));
  assertContains(readOutput(helpOutput), "launch             Launch Codex with runtime patches", "expected help to list runtime launch mode", readOutput(helpOutput));
  assertContains(readOutput(helpOutput), "version", "expected help to include version command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "status", "expected help not to advertise legacy status command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "apply", "expected help not to advertise legacy apply command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "repair", "expected help not to advertise hidden repair cleanup command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "restore", "expected help not to advertise legacy restore command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "watcher", "expected help not to advertise legacy watcher commands", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "--quiet", "expected help not to advertise the legacy quiet marker", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "__selftest-cdp-frame", "expected help not to list the hidden CDP self-test command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "__selftest-runtime-url", "expected help not to list the hidden runtime URL self-test command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "__selftest-runtime-patch-body", "expected help not to list the hidden runtime patch body self-test command", readOutput(helpOutput));
  assertNotContains(readOutput(helpOutput), "__selftest-legacy", "expected help not to list removed legacy self-test commands", readOutput(helpOutput));

  const menuOutput = join(tmpDir, "menu-output.txt");
  prepareFakeApp(join(tmpDir, "Menu.app"));
  runScript(join(tmpDir, "Menu.app"), "q\n", menuOutput);
  assertContains(readOutput(menuOutput), "1) Launch Codex with runtime patches", "expected no-arg menu to list runtime launch mode", readOutput(menuOutput));
  assertNotContains(readOutput(menuOutput), "2) Check current status", "expected no-arg menu to remove legacy status option", readOutput(menuOutput));
  assertNotContains(readOutput(menuOutput), "Apply legacy bundle patches", "expected no-arg menu to remove legacy apply option", readOutput(menuOutput));
  assertNotContains(readOutput(menuOutput), "Restore legacy bundle patch backups", "expected no-arg menu to remove legacy restore option", readOutput(menuOutput));
  assertNotContains(readOutput(menuOutput), "auto-repair watcher", "expected no-arg menu to remove watcher options", readOutput(menuOutput));
  assertNoBundleMutationTools(menuOutput);

  for (const removedCommand of ["status", "apply", "restore", "install-watcher", "uninstall-watcher", "__selftest-legacy-apply"]) {
    const removedCommandOutput = join(tmpDir, `removed-command-${removedCommand}.txt`);
    runScriptCommand(join(tmpDir, `MissingFor${removedCommand}.app`), [removedCommand], removedCommandOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
    assertContains(readOutput(removedCommandOutput), "Commands:", `expected removed command ${removedCommand} to print help`, readOutput(removedCommandOutput));
    assertNotContains(readOutput(removedCommandOutput), `Action: ${removedCommand}`, `expected removed command ${removedCommand} not to run`, readOutput(removedCommandOutput));
    assertNoBundleMutationTools(removedCommandOutput);
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
  assertNoBundleMutationTools(repairCleanupOutput);

  const unsupportedLaunchApp = join(tmpDir, "UnsupportedLaunch.app");
  const unsupportedLaunchOutput = join(tmpDir, "unsupported-launch-output.txt");
  prepareFakeApp(unsupportedLaunchApp, "99.0.0", "9999");
  runScriptCommand(unsupportedLaunchApp, ["launch"], unsupportedLaunchOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(unsupportedLaunchOutput), "Action: launch", "expected launch to print an action header", readOutput(unsupportedLaunchOutput));
  assertContains(readOutput(unsupportedLaunchOutput), "Compatibility: unsupported", "expected unsupported launch to print compatibility", readOutput(unsupportedLaunchOutput));
  assertContains(readOutput(unsupportedLaunchOutput), "Runtime launch is blocked for this Codex.app version.", "expected unsupported launch to fail closed", readOutput(unsupportedLaunchOutput));
  assertContains(readOutput(unsupportedLaunchOutput), "Exit code: 1", "expected unsupported launch to return exit code 1", readOutput(unsupportedLaunchOutput));
  assertNoLaunchCalls(unsupportedLaunchOutput);
  assertNoBundleMutationTools(unsupportedLaunchOutput);

  const launchSuccessApp = join(tmpDir, "LaunchSuccess.app");
  const launchSuccessOutput = join(tmpDir, "launch-success-output.txt");
  prepareFakeApp(launchSuccessApp, "26.519.22136", "3003");
  runScriptCommand(launchSuccessApp, ["launch"], launchSuccessOutput, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
  });
  assertContains(readOutput(launchSuccessOutput), "Runtime launch completed.", "expected launch command to report success", readOutput(launchSuccessOutput));
  assertContains(readOutput(launchSuccessOutput), "Keep this codexfast launch process running while you use Codex.", "expected launch command to describe the foreground runtime session", readOutput(launchSuccessOutput));
  assertOutputOrder(readOutput(launchSuccessOutput), "Patched targets:", "Runtime launch completed.", "expected launch output to list patched targets before session instructions");
  assertOutputOrder(readOutput(launchSuccessOutput), "  Speed setting", "Keep this codexfast launch process running while you use Codex.", "expected launch output to list patched labels before foreground-session instructions");
  assertNotContains(readOutput(launchSuccessOutput), "Browser-use native pipe peer auth", "expected launch dry-run hook not to report removed native pipe target", readOutput(launchSuccessOutput));
  assertNoBundleMutationTools(launchSuccessOutput);

  const launchPendingTargetsApp = join(tmpDir, "LaunchPendingTargets.app");
  const launchPendingTargetsOutput = join(tmpDir, "launch-pending-targets-output.txt");
  prepareFakeApp(launchPendingTargetsApp, "26.527.60818", "3437");
  runScriptCommand(launchPendingTargetsApp, ["launch"], launchPendingTargetsOutput, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargetsOutput), "Runtime launch failed: Runtime patch interception did not observe required targets:", "expected launch not to report success before required initial targets are patched", readOutput(launchPendingTargetsOutput));
  assertContains(readOutput(launchPendingTargetsOutput), "Retried renderer reload 1 time while waiting for required targets.", "expected missing required target output to document the bounded reload retry", readOutput(launchPendingTargetsOutput));
  assertContains(readOutput(launchPendingTargetsOutput), "Plugins access", "expected missing required target output to name Plugins access", readOutput(launchPendingTargetsOutput));
  assertNotContains(readOutput(launchPendingTargetsOutput), "Runtime launch completed.", "expected missing required targets not to report launch completion", readOutput(launchPendingTargetsOutput));
  assertNotContains(readOutput(launchPendingTargetsOutput), "No supported target chunks loaded yet.", "expected launch not to treat missing required initial targets as a lazy success state", readOutput(launchPendingTargetsOutput));
  assertContains(readOutput(launchPendingTargetsOutput), "Exit code: 1", "expected missing required target launch simulation to return exit code 1", readOutput(launchPendingTargetsOutput));
  assertNoBundleMutationTools(launchPendingTargetsOutput);

  const launchSessionLostApp = join(tmpDir, "LaunchSessionLost.app");
  const launchSessionLostOutput = join(tmpDir, "launch-session-lost-output.txt");
  prepareFakeApp(launchSessionLostApp, "26.519.22136", "3003");
  runScriptCommand(launchSessionLostApp, ["launch"], launchSessionLostOutput, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_SESSION_LOST: "1",
    CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
  });
  assertContains(readOutput(launchSessionLostOutput), "Runtime launch completed.", "expected launch session-lost hook to reach a ready session first", readOutput(launchSessionLostOutput));
  assertContains(readOutput(launchSessionLostOutput), "Runtime patch session lost after 3 reconnect attempts:", "expected launch to report exhausted runtime reconnect attempts", readOutput(launchSessionLostOutput));
  assertContains(readOutput(launchSessionLostOutput), "Codex.app will keep running without further runtime patching.", "expected exhausted runtime reconnect attempts to leave Codex running", readOutput(launchSessionLostOutput));
  assertContains(readOutput(launchSessionLostOutput), "Exit code: 0", "expected exhausted runtime reconnect attempts not to fail launch after Codex is running", readOutput(launchSessionLostOutput));
  assertNoBundleMutationTools(launchSessionLostOutput);

  const menuLaunchSuccessApp = join(tmpDir, "MenuLaunchSuccess.app");
  const menuLaunchSuccessOutput = join(tmpDir, "menu-launch-success-output.txt");
  prepareFakeApp(menuLaunchSuccessApp, "26.519.22136", "3003");
  runScript(menuLaunchSuccessApp, "1\n\nq\n", menuLaunchSuccessOutput, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
  });
  assertContains(readOutput(menuLaunchSuccessOutput), "Runtime launch completed.", "expected menu launch option to report success", readOutput(menuLaunchSuccessOutput));
  assertContains(readOutput(menuLaunchSuccessOutput), "Keep this codexfast launch process running while you use Codex.", "expected menu launch option to describe the foreground runtime session", readOutput(menuLaunchSuccessOutput));
  assertOutputOrder(readOutput(menuLaunchSuccessOutput), "Patched targets:", "Runtime launch completed.", "expected menu launch output to list patched targets before session instructions");
  assertOutputOrder(readOutput(menuLaunchSuccessOutput), "  Speed setting", "Keep this codexfast launch process running while you use Codex.", "expected menu launch output to list patched labels before foreground-session instructions");
  assertNotContains(readOutput(menuLaunchSuccessOutput), "Browser-use native pipe peer auth", "expected menu launch option not to report removed native pipe target", readOutput(menuLaunchSuccessOutput));
  assertNoBundleMutationTools(menuLaunchSuccessOutput);

  const nonRunningLaunchApp = join(tmpDir, "NonRunningLaunch.app");
  const nonRunningLaunchOutput = join(tmpDir, "non-running-launch-output.txt");
  prepareFakeApp(nonRunningLaunchApp, "26.527.60818", "3437");
  runScriptCommand(nonRunningLaunchApp, ["launch"], nonRunningLaunchOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunchOutput), "Action: launch", "expected launch to print an action header", readOutput(nonRunningLaunchOutput));
  assertContains(readOutput(nonRunningLaunchOutput), "Compatibility: supported", "expected supported launch to print compatibility", readOutput(nonRunningLaunchOutput));
  assertContains(readOutput(nonRunningLaunchOutput), "Runtime launch failed: Codex executable not found:", "expected supported fake app launch to fail closed before app start", readOutput(nonRunningLaunchOutput));
  assertContains(readOutput(nonRunningLaunchOutput), "Exit code: 1", "expected supported non-running launch to return exit code 1", readOutput(nonRunningLaunchOutput));
  assertNoLaunchCalls(nonRunningLaunchOutput);
  assertNoBundleMutationTools(nonRunningLaunchOutput);

  const nonRunningLaunch26601App = join(tmpDir, "NonRunningLaunch26601.app");
  const nonRunningLaunch26601Output = join(tmpDir, "non-running-launch-26601-output.txt");
  prepareFakeApp(nonRunningLaunch26601App, "26.601.21317", "3511");
  runScriptCommand(nonRunningLaunch26601App, ["launch"], nonRunningLaunch26601Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch26601Output), "Compatibility: supported", "expected 26.601 launch gate to be supported", readOutput(nonRunningLaunch26601Output));
  assertContains(readOutput(nonRunningLaunch26601Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.601 fake app launch to fail closed before app start", readOutput(nonRunningLaunch26601Output));
  assertNoLaunchCalls(nonRunningLaunch26601Output);
  assertNoBundleMutationTools(nonRunningLaunch26601Output);

  const nonRunningLaunch26602App = join(tmpDir, "NonRunningLaunch26602.app");
  const nonRunningLaunch26602Output = join(tmpDir, "non-running-launch-26602-output.txt");
  prepareFakeApp(nonRunningLaunch26602App, "26.602.30954", "3575");
  runScriptCommand(nonRunningLaunch26602App, ["launch"], nonRunningLaunch26602Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch26602Output), "Compatibility: supported", "expected 26.602 launch gate to be supported", readOutput(nonRunningLaunch26602Output));
  assertContains(readOutput(nonRunningLaunch26602Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.602 fake app launch to fail closed before app start", readOutput(nonRunningLaunch26602Output));
  assertNoLaunchCalls(nonRunningLaunch26602Output);
  assertNoBundleMutationTools(nonRunningLaunch26602Output);

  const nonRunningLaunch2660240724App = join(tmpDir, "NonRunningLaunch2660240724.app");
  const nonRunningLaunch2660240724Output = join(tmpDir, "non-running-launch-26602-40724-output.txt");
  prepareFakeApp(nonRunningLaunch2660240724App, "26.602.40724", "3593");
  runScriptCommand(nonRunningLaunch2660240724App, ["launch"], nonRunningLaunch2660240724Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2660240724Output), "Compatibility: supported", "expected 26.602.40724 launch gate to be supported", readOutput(nonRunningLaunch2660240724Output));
  assertContains(readOutput(nonRunningLaunch2660240724Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.602.40724 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2660240724Output));
  assertNoLaunchCalls(nonRunningLaunch2660240724Output);
  assertNoBundleMutationTools(nonRunningLaunch2660240724Output);

  const missingPgrepLaunchApp = join(tmpDir, "MissingPgrepLaunch.app");
  const missingPgrepLaunchOutput = join(tmpDir, "missing-pgrep-launch-output.txt");
  prepareFakeApp(missingPgrepLaunchApp, "26.519.22136", "3003");
  runScriptCommand(missingPgrepLaunchApp, ["launch"], missingPgrepLaunchOutput, { CODEXFAST_TEST_ALLOW_NONZERO: "1", PATH: stubBin });
  assertContains(readOutput(missingPgrepLaunchOutput), "Action: launch", "expected launch to print an action header", readOutput(missingPgrepLaunchOutput));
  assertContains(readOutput(missingPgrepLaunchOutput), "Compatibility: supported", "expected supported launch to print compatibility", readOutput(missingPgrepLaunchOutput));
  assertContains(readOutput(missingPgrepLaunchOutput), "Cannot determine whether Codex.app is running because pgrep was not found.", "expected launch to fail closed when pgrep is unavailable", readOutput(missingPgrepLaunchOutput));
  assertContains(readOutput(missingPgrepLaunchOutput), "Exit code: 1", "expected missing-pgrep launch to return exit code 1", readOutput(missingPgrepLaunchOutput));
  assertNoLaunchCalls(missingPgrepLaunchOutput);
  assertNoBundleMutationTools(missingPgrepLaunchOutput);

  const runningLaunchApp = join(tmpDir, "RunningLaunch.app");
  const runningLaunchOutput = join(tmpDir, "running-launch-output.txt");
  prepareFakeApp(runningLaunchApp);
  runScriptCommand(runningLaunchApp, ["launch"], runningLaunchOutput, { CODEXFAST_TEST_CODEX_RUNNING: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(runningLaunchOutput), "Action: launch", "expected launch to print an action header", readOutput(runningLaunchOutput));
  assertContains(readOutput(runningLaunchOutput), "Compatibility: supported", "expected supported launch to print compatibility", readOutput(runningLaunchOutput));
  assertContains(readOutput(runningLaunchOutput), "Codex.app is already running. Quit Codex.app before using runtime launch.", "expected launch to fail closed when Codex.app is running", readOutput(runningLaunchOutput));
  assertContains(readOutput(runningLaunchOutput), "Exit code: 1", "expected running launch to return exit code 1", readOutput(runningLaunchOutput));
  assertNoLaunchCalls(runningLaunchOutput);
  assertNoBundleMutationTools(runningLaunchOutput);

  console.log("runtime launch flow test passed");
}

try {
  main();
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
