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
  assertContains(readOutput(unsupportedLaunchOutput), `codexfast version: ${packageVersion}`, "expected launch to print the current codexfast version in the action header", readOutput(unsupportedLaunchOutput));
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
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
    CODEXFAST_TEST_RUNTIME_LAUNCH_SESSION_LOST: "1",
    CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
  });
  assertContains(readOutput(launchSessionLostOutput), "Runtime launch completed.", "expected launch session-lost hook to reach a ready session first", readOutput(launchSessionLostOutput));
  assertContains(readOutput(launchSessionLostOutput), "Runtime patch session lost after 3 reconnect attempts:", "expected launch to report exhausted runtime reconnect attempts", readOutput(launchSessionLostOutput));
  assertContains(readOutput(launchSessionLostOutput), "Codex.app will be closed because runtime patching is no longer active.", "expected exhausted runtime reconnect attempts to fail closed instead of leaving an unpatched Codex session running", readOutput(launchSessionLostOutput));
  assertNotContains(readOutput(launchSessionLostOutput), "Codex.app will keep running without further runtime patching.", "expected exhausted runtime reconnect attempts not to describe an unpatched Codex session as usable", readOutput(launchSessionLostOutput));
  assertContains(readOutput(launchSessionLostOutput), "Exit code: 1", "expected exhausted runtime reconnect attempts to fail launch after runtime patching is lost", readOutput(launchSessionLostOutput));
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

  const nonRunningLaunch2660271036App = join(tmpDir, "NonRunningLaunch2660271036.app");
  const nonRunningLaunch2660271036Output = join(tmpDir, "non-running-launch-26602-71036-output.txt");
  prepareFakeApp(nonRunningLaunch2660271036App, "26.602.71036", "3685");
  runScriptCommand(nonRunningLaunch2660271036App, ["launch"], nonRunningLaunch2660271036Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2660271036Output), "Compatibility: supported", "expected 26.602.71036 launch gate to be supported", readOutput(nonRunningLaunch2660271036Output));
  assertContains(readOutput(nonRunningLaunch2660271036Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.602.71036 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2660271036Output));
  assertNoLaunchCalls(nonRunningLaunch2660271036Output);
  assertNoBundleMutationTools(nonRunningLaunch2660271036Output);

  const nonRunningLaunch2660812217App = join(tmpDir, "NonRunningLaunch2660812217.app");
  const nonRunningLaunch2660812217Output = join(tmpDir, "non-running-launch-26608-12217-output.txt");
  prepareFakeApp(nonRunningLaunch2660812217App, "26.608.12217", "3722");
  runScriptCommand(nonRunningLaunch2660812217App, ["launch"], nonRunningLaunch2660812217Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2660812217Output), "Compatibility: supported", "expected 26.608.12217 launch gate to be supported", readOutput(nonRunningLaunch2660812217Output));
  assertContains(readOutput(nonRunningLaunch2660812217Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.608.12217 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2660812217Output));
  assertNoLaunchCalls(nonRunningLaunch2660812217Output);
  assertNoBundleMutationTools(nonRunningLaunch2660812217Output);

  const nonRunningLaunch2660930741App = join(tmpDir, "NonRunningLaunch2660930741.app");
  const nonRunningLaunch2660930741Output = join(tmpDir, "non-running-launch-26609-30741-output.txt");
  prepareFakeApp(nonRunningLaunch2660930741App, "26.609.30741", "3808");
  runScriptCommand(nonRunningLaunch2660930741App, ["launch"], nonRunningLaunch2660930741Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2660930741Output), "Compatibility: supported", "expected 26.609.30741 launch gate to be supported", readOutput(nonRunningLaunch2660930741Output));
  assertContains(readOutput(nonRunningLaunch2660930741Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.609.30741 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2660930741Output));
  assertNoLaunchCalls(nonRunningLaunch2660930741Output);
  assertNoBundleMutationTools(nonRunningLaunch2660930741Output);

  const nonRunningLaunch2660941114App = join(tmpDir, "NonRunningLaunch2660941114.app");
  const nonRunningLaunch2660941114Output = join(tmpDir, "non-running-launch-26609-41114-output.txt");
  prepareFakeApp(nonRunningLaunch2660941114App, "26.609.41114", "3888");
  runScriptCommand(nonRunningLaunch2660941114App, ["launch"], nonRunningLaunch2660941114Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2660941114Output), "Compatibility: supported", "expected 26.609.41114 launch gate to be supported", readOutput(nonRunningLaunch2660941114Output));
  assertContains(readOutput(nonRunningLaunch2660941114Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.609.41114 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2660941114Output));
  assertNoLaunchCalls(nonRunningLaunch2660941114Output);
  assertNoBundleMutationTools(nonRunningLaunch2660941114Output);

  const nonRunningLaunch2660971450App = join(tmpDir, "NonRunningLaunch2660971450.app");
  const nonRunningLaunch2660971450Output = join(tmpDir, "non-running-launch-26609-71450-output.txt");
  prepareFakeApp(nonRunningLaunch2660971450App, "26.609.71450", "3965");
  runScriptCommand(nonRunningLaunch2660971450App, ["launch"], nonRunningLaunch2660971450Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2660971450Output), "Compatibility: supported", "expected 26.609.71450 launch gate to be supported", readOutput(nonRunningLaunch2660971450Output));
  assertContains(readOutput(nonRunningLaunch2660971450Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.609.71450 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2660971450Output));
  assertNoLaunchCalls(nonRunningLaunch2660971450Output);
  assertNoBundleMutationTools(nonRunningLaunch2660971450Output);

  const nonRunningLaunch2661161049App = join(tmpDir, "NonRunningLaunch2661161049.app");
  const nonRunningLaunch2661161049Output = join(tmpDir, "non-running-launch-26611-61049-output.txt");
  prepareFakeApp(nonRunningLaunch2661161049App, "26.611.61049", "3996");
  runScriptCommand(nonRunningLaunch2661161049App, ["launch"], nonRunningLaunch2661161049Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2661161049Output), "Compatibility: supported", "expected 26.611.61049 launch gate to be supported", readOutput(nonRunningLaunch2661161049Output));
  assertContains(readOutput(nonRunningLaunch2661161049Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.611.61049 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2661161049Output));
  assertNoLaunchCalls(nonRunningLaunch2661161049Output);
  assertNoBundleMutationTools(nonRunningLaunch2661161049Output);

  const nonRunningLaunch2661161753App = join(tmpDir, "NonRunningLaunch2661161753.app");
  const nonRunningLaunch2661161753Output = join(tmpDir, "non-running-launch-26611-61753-output.txt");
  prepareFakeApp(nonRunningLaunch2661161753App, "26.611.61753", "4008");
  runScriptCommand(nonRunningLaunch2661161753App, ["launch"], nonRunningLaunch2661161753Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2661161753Output), "Compatibility: supported", "expected 26.611.61753 launch gate to be supported", readOutput(nonRunningLaunch2661161753Output));
  assertContains(readOutput(nonRunningLaunch2661161753Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.611.61753 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2661161753Output));
  assertNoLaunchCalls(nonRunningLaunch2661161753Output);
  assertNoBundleMutationTools(nonRunningLaunch2661161753Output);

  const nonRunningLaunch2661162324App = join(tmpDir, "NonRunningLaunch2661162324.app");
  const nonRunningLaunch2661162324Output = join(tmpDir, "non-running-launch-26611-62324-output.txt");
  prepareFakeApp(nonRunningLaunch2661162324App, "26.611.62324", "4028");
  runScriptCommand(nonRunningLaunch2661162324App, ["launch"], nonRunningLaunch2661162324Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2661162324Output), "Compatibility: supported", "expected 26.611.62324 launch gate to be supported", readOutput(nonRunningLaunch2661162324Output));
  assertContains(readOutput(nonRunningLaunch2661162324Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.611.62324 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2661162324Output));
  assertNoLaunchCalls(nonRunningLaunch2661162324Output);
  assertNoBundleMutationTools(nonRunningLaunch2661162324Output);

  const nonRunningLaunch2661631447App = join(tmpDir, "NonRunningLaunch2661631447.app");
  const nonRunningLaunch2661631447Output = join(tmpDir, "non-running-launch-26616-31447-output.txt");
  prepareFakeApp(nonRunningLaunch2661631447App, "26.616.31447", "4133");
  runScriptCommand(nonRunningLaunch2661631447App, ["launch"], nonRunningLaunch2661631447Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2661631447Output), "Compatibility: supported", "expected 26.616.31447 launch gate to be supported", readOutput(nonRunningLaunch2661631447Output));
  assertContains(readOutput(nonRunningLaunch2661631447Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.616.31447 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2661631447Output));
  assertNoLaunchCalls(nonRunningLaunch2661631447Output);
  assertNoBundleMutationTools(nonRunningLaunch2661631447Output);

  const nonRunningLaunch2661651431App = join(tmpDir, "NonRunningLaunch2661651431.app");
  const nonRunningLaunch2661651431Output = join(tmpDir, "non-running-launch-26616-51431-output.txt");
  prepareFakeApp(nonRunningLaunch2661651431App, "26.616.51431", "4212");
  runScriptCommand(nonRunningLaunch2661651431App, ["launch"], nonRunningLaunch2661651431Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2661651431Output), "Compatibility: supported", "expected 26.616.51431 launch gate to be supported", readOutput(nonRunningLaunch2661651431Output));
  assertContains(readOutput(nonRunningLaunch2661651431Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.616.51431 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2661651431Output));
  assertNoLaunchCalls(nonRunningLaunch2661651431Output);
  assertNoBundleMutationTools(nonRunningLaunch2661651431Output);

  const nonRunningLaunch2661671553App = join(tmpDir, "NonRunningLaunch2661671553.app");
  const nonRunningLaunch2661671553Output = join(tmpDir, "non-running-launch-26616-71553-output.txt");
  prepareFakeApp(nonRunningLaunch2661671553App, "26.616.71553", "4265");
  runScriptCommand(nonRunningLaunch2661671553App, ["launch"], nonRunningLaunch2661671553Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2661671553Output), "Compatibility: supported", "expected 26.616.71553 launch gate to be supported", readOutput(nonRunningLaunch2661671553Output));
  assertContains(readOutput(nonRunningLaunch2661671553Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.616.71553 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2661671553Output));
  assertNoLaunchCalls(nonRunningLaunch2661671553Output);
  assertNoBundleMutationTools(nonRunningLaunch2661671553Output);

  const nonRunningLaunch2661681150App = join(tmpDir, "NonRunningLaunch2661681150.app");
  const nonRunningLaunch2661681150Output = join(tmpDir, "non-running-launch-26616-81150-output.txt");
  prepareFakeApp(nonRunningLaunch2661681150App, "26.616.81150", "4306");
  runScriptCommand(nonRunningLaunch2661681150App, ["launch"], nonRunningLaunch2661681150Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2661681150Output), "Compatibility: supported", "expected 26.616.81150 launch gate to be supported", readOutput(nonRunningLaunch2661681150Output));
  assertContains(readOutput(nonRunningLaunch2661681150Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.616.81150 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2661681150Output));
  assertNoLaunchCalls(nonRunningLaunch2661681150Output);
  assertNoBundleMutationTools(nonRunningLaunch2661681150Output);

  const nonRunningLaunch2662331443App = join(tmpDir, "NonRunningLaunch2662331443.app");
  const nonRunningLaunch2662331443Output = join(tmpDir, "non-running-launch-26623-31443-output.txt");
  prepareFakeApp(nonRunningLaunch2662331443App, "26.623.31443", "4441");
  runScriptCommand(nonRunningLaunch2662331443App, ["launch"], nonRunningLaunch2662331443Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2662331443Output), "Compatibility: supported", "expected 26.623.31443 launch gate to be supported", readOutput(nonRunningLaunch2662331443Output));
  assertContains(readOutput(nonRunningLaunch2662331443Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.623.31443 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2662331443Output));
  assertNoLaunchCalls(nonRunningLaunch2662331443Output);
  assertNoBundleMutationTools(nonRunningLaunch2662331443Output);

  const nonRunningLaunch2662331921App = join(tmpDir, "NonRunningLaunch2662331921.app");
  const nonRunningLaunch2662331921Output = join(tmpDir, "non-running-launch-26623-31921-output.txt");
  prepareFakeApp(nonRunningLaunch2662331921App, "26.623.31921", "4452");
  runScriptCommand(nonRunningLaunch2662331921App, ["launch"], nonRunningLaunch2662331921Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2662331921Output), "Compatibility: supported", "expected 26.623.31921 launch gate to be supported", readOutput(nonRunningLaunch2662331921Output));
  assertContains(readOutput(nonRunningLaunch2662331921Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.623.31921 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2662331921Output));
  assertNoLaunchCalls(nonRunningLaunch2662331921Output);
  assertNoBundleMutationTools(nonRunningLaunch2662331921Output);

  const nonRunningLaunch2662342026App = join(tmpDir, "NonRunningLaunch2662342026.app");
  const nonRunningLaunch2662342026Output = join(tmpDir, "non-running-launch-26623-42026-output.txt");
  prepareFakeApp(nonRunningLaunch2662342026App, "26.623.42026", "4514");
  runScriptCommand(nonRunningLaunch2662342026App, ["launch"], nonRunningLaunch2662342026Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2662342026Output), "Compatibility: supported", "expected 26.623.42026 launch gate to be supported", readOutput(nonRunningLaunch2662342026Output));
  assertContains(readOutput(nonRunningLaunch2662342026Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.623.42026 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2662342026Output));
  assertNoLaunchCalls(nonRunningLaunch2662342026Output);
  assertNoBundleMutationTools(nonRunningLaunch2662342026Output);

  const nonRunningLaunch2662361825App = join(tmpDir, "NonRunningLaunch2662361825.app");
  const nonRunningLaunch2662361825Output = join(tmpDir, "non-running-launch-26623-61825-output.txt");
  prepareFakeApp(nonRunningLaunch2662361825App, "26.623.61825", "4548");
  runScriptCommand(nonRunningLaunch2662361825App, ["launch"], nonRunningLaunch2662361825Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2662361825Output), "Compatibility: supported", "expected 26.623.61825 launch gate to be supported", readOutput(nonRunningLaunch2662361825Output));
  assertContains(readOutput(nonRunningLaunch2662361825Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.623.61825 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2662361825Output));
  assertNoLaunchCalls(nonRunningLaunch2662361825Output);
  assertNoBundleMutationTools(nonRunningLaunch2662361825Output);

  const nonRunningLaunch2662370822App = join(tmpDir, "NonRunningLaunch2662370822.app");
  const nonRunningLaunch2662370822Output = join(tmpDir, "non-running-launch-26623-70822-output.txt");
  prepareFakeApp(nonRunningLaunch2662370822App, "26.623.70822", "4559");
  runScriptCommand(nonRunningLaunch2662370822App, ["launch"], nonRunningLaunch2662370822Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2662370822Output), "Compatibility: supported", "expected 26.623.70822 launch gate to be supported", readOutput(nonRunningLaunch2662370822Output));
  assertContains(readOutput(nonRunningLaunch2662370822Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.623.70822 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2662370822Output));
  assertNoLaunchCalls(nonRunningLaunch2662370822Output);
  assertNoBundleMutationTools(nonRunningLaunch2662370822Output);

  const nonRunningLaunch2662381905App = join(tmpDir, "NonRunningLaunch2662381905.app");
  const nonRunningLaunch2662381905Output = join(tmpDir, "non-running-launch-26623-81905-output.txt");
  prepareFakeApp(nonRunningLaunch2662381905App, "26.623.81905", "4598");
  runScriptCommand(nonRunningLaunch2662381905App, ["launch"], nonRunningLaunch2662381905Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2662381905Output), "Compatibility: supported", "expected 26.623.81905 launch gate to be supported", readOutput(nonRunningLaunch2662381905Output));
  assertContains(readOutput(nonRunningLaunch2662381905Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.623.81905 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2662381905Output));
  assertNoLaunchCalls(nonRunningLaunch2662381905Output);
  assertNoBundleMutationTools(nonRunningLaunch2662381905Output);

  const nonRunningLaunch26623101652App = join(tmpDir, "NonRunningLaunch26623101652.app");
  const nonRunningLaunch26623101652Output = join(tmpDir, "non-running-launch-26623-101652-output.txt");
  prepareFakeApp(nonRunningLaunch26623101652App, "26.623.101652", "4674");
  runScriptCommand(nonRunningLaunch26623101652App, ["launch"], nonRunningLaunch26623101652Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch26623101652Output), "Compatibility: supported", "expected 26.623.101652 launch gate to be supported", readOutput(nonRunningLaunch26623101652Output));
  assertContains(readOutput(nonRunningLaunch26623101652Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.623.101652 fake app launch to fail closed before app start", readOutput(nonRunningLaunch26623101652Output));
  assertNoLaunchCalls(nonRunningLaunch26623101652Output);
  assertNoBundleMutationTools(nonRunningLaunch26623101652Output);

  const nonRunningLaunch26623141536App = join(tmpDir, "NonRunningLaunch26623141536.app");
  const nonRunningLaunch26623141536Output = join(tmpDir, "non-running-launch-26623-141536-output.txt");
  prepareFakeApp(nonRunningLaunch26623141536App, "26.623.141536", "4753");
  runScriptCommand(nonRunningLaunch26623141536App, ["launch"], nonRunningLaunch26623141536Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch26623141536Output), "Compatibility: supported", "expected 26.623.141536 launch gate to be supported", readOutput(nonRunningLaunch26623141536Output));
  assertContains(readOutput(nonRunningLaunch26623141536Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.623.141536 fake app launch to fail closed before app start", readOutput(nonRunningLaunch26623141536Output));
  assertNoLaunchCalls(nonRunningLaunch26623141536Output);
  assertNoBundleMutationTools(nonRunningLaunch26623141536Output);

  const nonRunningLaunch2670731428App = join(tmpDir, "NonRunningLaunch2670731428.app");
  const nonRunningLaunch2670731428Output = join(tmpDir, "non-running-launch-26707-31428-output.txt");
  prepareFakeApp(nonRunningLaunch2670731428App, "26.707.31428", "5059");
  runScriptCommand(nonRunningLaunch2670731428App, ["launch"], nonRunningLaunch2670731428Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2670731428Output), "Compatibility: supported", "expected 26.707.31428 launch gate to be supported", readOutput(nonRunningLaunch2670731428Output));
  assertContains(readOutput(nonRunningLaunch2670731428Output), "Runtime launch failed: Codex executable not found:", "expected supported 26.707.31428 fake app launch to fail closed before app start", readOutput(nonRunningLaunch2670731428Output));
  assertContains(readOutput(nonRunningLaunch2670731428Output), "Contents/MacOS/ChatGPT", "expected supported 26.707.31428 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2670731428Output));
  assertNoLaunchCalls(nonRunningLaunch2670731428Output);
  assertNoBundleMutationTools(nonRunningLaunch2670731428Output);

  const nonRunningLaunch2670741301App = join(tmpDir, "NonRunningLaunch2670741301.app");
  const nonRunningLaunch2670741301Output = join(tmpDir, "non-running-launch-26707-41301-output.txt");
  prepareFakeApp(nonRunningLaunch2670741301App, "26.707.41301", "5103");
  runScriptCommand(nonRunningLaunch2670741301App, ["launch"], nonRunningLaunch2670741301Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2670741301Output), "Compatibility: supported", "expected build 5103 to pass the strict support gate", readOutput(nonRunningLaunch2670741301Output));
  assertContains(readOutput(nonRunningLaunch2670741301Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5103 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2670741301Output));
  assertContains(readOutput(nonRunningLaunch2670741301Output), "Contents/MacOS/ChatGPT", "expected supported build 5103 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2670741301Output));
  assertNoLaunchCalls(nonRunningLaunch2670741301Output);
  assertNoBundleMutationTools(nonRunningLaunch2670741301Output);

  const nonRunningLaunch2670761608App = join(tmpDir, "NonRunningLaunch2670761608.app");
  const nonRunningLaunch2670761608Output = join(tmpDir, "non-running-launch-26707-61608-output.txt");
  prepareFakeApp(nonRunningLaunch2670761608App, "26.707.61608", "5200");
  runScriptCommand(nonRunningLaunch2670761608App, ["launch"], nonRunningLaunch2670761608Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2670761608Output), "Compatibility: supported", "expected build 5200 to pass the strict support gate", readOutput(nonRunningLaunch2670761608Output));
  assertContains(readOutput(nonRunningLaunch2670761608Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5200 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2670761608Output));
  assertContains(readOutput(nonRunningLaunch2670761608Output), "Contents/MacOS/ChatGPT", "expected supported build 5200 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2670761608Output));
  assertNoLaunchCalls(nonRunningLaunch2670761608Output);
  assertNoBundleMutationTools(nonRunningLaunch2670761608Output);

  const nonRunningLaunch2670771524App = join(tmpDir, "NonRunningLaunch2670771524.app");
  const nonRunningLaunch2670771524Output = join(tmpDir, "non-running-launch-26707-71524-output.txt");
  prepareFakeApp(nonRunningLaunch2670771524App, "26.707.71524", "5263");
  runScriptCommand(nonRunningLaunch2670771524App, ["launch"], nonRunningLaunch2670771524Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2670771524Output), "Compatibility: supported", "expected build 5263 to pass the strict support gate", readOutput(nonRunningLaunch2670771524Output));
  assertContains(readOutput(nonRunningLaunch2670771524Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5263 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2670771524Output));
  assertContains(readOutput(nonRunningLaunch2670771524Output), "Contents/MacOS/ChatGPT", "expected supported build 5263 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2670771524Output));
  assertNoLaunchCalls(nonRunningLaunch2670771524Output);
  assertNoBundleMutationTools(nonRunningLaunch2670771524Output);

  const nonRunningLaunch2670772221App = join(tmpDir, "NonRunningLaunch2670772221.app");
  const nonRunningLaunch2670772221Output = join(tmpDir, "non-running-launch-26707-72221-output.txt");
  prepareFakeApp(nonRunningLaunch2670772221App, "26.707.72221", "5307");
  runScriptCommand(nonRunningLaunch2670772221App, ["launch"], nonRunningLaunch2670772221Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2670772221Output), "Compatibility: supported", "expected build 5307 to pass the strict support gate", readOutput(nonRunningLaunch2670772221Output));
  assertContains(readOutput(nonRunningLaunch2670772221Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5307 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2670772221Output));
  assertContains(readOutput(nonRunningLaunch2670772221Output), "Contents/MacOS/ChatGPT", "expected supported build 5307 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2670772221Output));
  assertNoLaunchCalls(nonRunningLaunch2670772221Output);
  assertNoBundleMutationTools(nonRunningLaunch2670772221Output);

  const nonRunningLaunch2670791948App = join(tmpDir, "NonRunningLaunch2670791948.app");
  const nonRunningLaunch2670791948Output = join(tmpDir, "non-running-launch-26707-91948-output.txt");
  prepareFakeApp(nonRunningLaunch2670791948App, "26.707.91948", "5440");
  runScriptCommand(nonRunningLaunch2670791948App, ["launch"], nonRunningLaunch2670791948Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2670791948Output), "Compatibility: supported", "expected build 5440 to pass the strict support gate", readOutput(nonRunningLaunch2670791948Output));
  assertContains(readOutput(nonRunningLaunch2670791948Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5440 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2670791948Output));
  assertContains(readOutput(nonRunningLaunch2670791948Output), "Contents/MacOS/ChatGPT", "expected supported build 5440 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2670791948Output));
  assertNoLaunchCalls(nonRunningLaunch2670791948Output);
  assertNoBundleMutationTools(nonRunningLaunch2670791948Output);

  const nonRunningLaunch2671521425App = join(tmpDir, "NonRunningLaunch2671521425.app");
  const nonRunningLaunch2671521425Output = join(tmpDir, "non-running-launch-26715-21425-output.txt");
  prepareFakeApp(nonRunningLaunch2671521425App, "26.715.21425", "5488");
  runScriptCommand(nonRunningLaunch2671521425App, ["launch"], nonRunningLaunch2671521425Output, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
  assertContains(readOutput(nonRunningLaunch2671521425Output), "Compatibility: supported", "expected build 5488 to pass the strict support gate", readOutput(nonRunningLaunch2671521425Output));
  assertContains(readOutput(nonRunningLaunch2671521425Output), "Runtime launch failed: Codex executable not found:", "expected supported build 5488 fixture to fail only at its missing executable", readOutput(nonRunningLaunch2671521425Output));
  assertContains(readOutput(nonRunningLaunch2671521425Output), "Contents/MacOS/ChatGPT", "expected supported build 5488 launch failure to list the ChatGPT executable fallback path", readOutput(nonRunningLaunch2671521425Output));
  assertNoLaunchCalls(nonRunningLaunch2671521425Output);
  assertNoBundleMutationTools(nonRunningLaunch2671521425Output);

  const launchPendingTargets26608App = join(tmpDir, "LaunchPendingTargets26608.app");
  const launchPendingTargets26608Output = join(tmpDir, "launch-pending-targets-26608-output.txt");
  prepareFakeApp(launchPendingTargets26608App, "26.608.12217", "3722");
  runScriptCommand(launchPendingTargets26608App, ["launch"], launchPendingTargets26608Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets26608Output), "Runtime patch interception did not observe required targets: none.", "expected 26.608 launch not to require the removed Plugins access target", readOutput(launchPendingTargets26608Output));
  assertNotContains(readOutput(launchPendingTargets26608Output), "Plugins access", "expected 26.608 missing required target output not to name Plugins access", readOutput(launchPendingTargets26608Output));
  assertNoLaunchCalls(launchPendingTargets26608Output);
  assertNoBundleMutationTools(launchPendingTargets26608Output);

  const launchPendingTargets26609App = join(tmpDir, "LaunchPendingTargets26609.app");
  const launchPendingTargets26609Output = join(tmpDir, "launch-pending-targets-26609-output.txt");
  prepareFakeApp(launchPendingTargets26609App, "26.609.30741", "3808");
  runScriptCommand(launchPendingTargets26609App, ["launch"], launchPendingTargets26609Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets26609Output), "Runtime patch interception did not observe required targets: none.", "expected 26.609 launch not to require the removed Plugins access target", readOutput(launchPendingTargets26609Output));
  assertNotContains(readOutput(launchPendingTargets26609Output), "Plugins access", "expected 26.609 missing required target output not to name Plugins access", readOutput(launchPendingTargets26609Output));
  assertNoLaunchCalls(launchPendingTargets26609Output);
  assertNoBundleMutationTools(launchPendingTargets26609Output);

  const launchPendingTargets2660941114App = join(tmpDir, "LaunchPendingTargets2660941114.app");
  const launchPendingTargets2660941114Output = join(tmpDir, "launch-pending-targets-26609-41114-output.txt");
  prepareFakeApp(launchPendingTargets2660941114App, "26.609.41114", "3888");
  runScriptCommand(launchPendingTargets2660941114App, ["launch"], launchPendingTargets2660941114Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2660941114Output), "Runtime patch interception did not observe required targets: none.", "expected 26.609.41114 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2660941114Output));
  assertNotContains(readOutput(launchPendingTargets2660941114Output), "Plugins access", "expected 26.609.41114 missing required target output not to name Plugins access", readOutput(launchPendingTargets2660941114Output));
  assertNoLaunchCalls(launchPendingTargets2660941114Output);
  assertNoBundleMutationTools(launchPendingTargets2660941114Output);

  const launchPendingTargets2660971450App = join(tmpDir, "LaunchPendingTargets2660971450.app");
  const launchPendingTargets2660971450Output = join(tmpDir, "launch-pending-targets-26609-71450-output.txt");
  prepareFakeApp(launchPendingTargets2660971450App, "26.609.71450", "3965");
  runScriptCommand(launchPendingTargets2660971450App, ["launch"], launchPendingTargets2660971450Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2660971450Output), "Runtime patch interception did not observe required targets: none.", "expected 26.609.71450 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2660971450Output));
  assertNotContains(readOutput(launchPendingTargets2660971450Output), "Plugins access", "expected 26.609.71450 missing required target output not to name Plugins access", readOutput(launchPendingTargets2660971450Output));
  assertNoLaunchCalls(launchPendingTargets2660971450Output);
  assertNoBundleMutationTools(launchPendingTargets2660971450Output);

  const launchPendingTargets2661161049App = join(tmpDir, "LaunchPendingTargets2661161049.app");
  const launchPendingTargets2661161049Output = join(tmpDir, "launch-pending-targets-26611-61049-output.txt");
  prepareFakeApp(launchPendingTargets2661161049App, "26.611.61049", "3996");
  runScriptCommand(launchPendingTargets2661161049App, ["launch"], launchPendingTargets2661161049Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2661161049Output), "Runtime patch interception did not observe required targets: none.", "expected 26.611.61049 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2661161049Output));
  assertNotContains(readOutput(launchPendingTargets2661161049Output), "Plugins access", "expected 26.611.61049 missing required target output not to name Plugins access", readOutput(launchPendingTargets2661161049Output));
  assertNoLaunchCalls(launchPendingTargets2661161049Output);
  assertNoBundleMutationTools(launchPendingTargets2661161049Output);

  const launchPendingTargets2661161753App = join(tmpDir, "LaunchPendingTargets2661161753.app");
  const launchPendingTargets2661161753Output = join(tmpDir, "launch-pending-targets-26611-61753-output.txt");
  prepareFakeApp(launchPendingTargets2661161753App, "26.611.61753", "4008");
  runScriptCommand(launchPendingTargets2661161753App, ["launch"], launchPendingTargets2661161753Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2661161753Output), "Runtime patch interception did not observe required targets: none.", "expected 26.611.61753 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2661161753Output));
  assertNotContains(readOutput(launchPendingTargets2661161753Output), "Plugins access", "expected 26.611.61753 missing required target output not to name Plugins access", readOutput(launchPendingTargets2661161753Output));
  assertNoLaunchCalls(launchPendingTargets2661161753Output);
  assertNoBundleMutationTools(launchPendingTargets2661161753Output);

  const launchPendingTargets2661162324App = join(tmpDir, "LaunchPendingTargets2661162324.app");
  const launchPendingTargets2661162324Output = join(tmpDir, "launch-pending-targets-26611-62324-output.txt");
  prepareFakeApp(launchPendingTargets2661162324App, "26.611.62324", "4028");
  runScriptCommand(launchPendingTargets2661162324App, ["launch"], launchPendingTargets2661162324Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2661162324Output), "Runtime patch interception did not observe required targets: none.", "expected 26.611.62324 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2661162324Output));
  assertNotContains(readOutput(launchPendingTargets2661162324Output), "Plugins access", "expected 26.611.62324 missing required target output not to name Plugins access", readOutput(launchPendingTargets2661162324Output));
  assertNoLaunchCalls(launchPendingTargets2661162324Output);
  assertNoBundleMutationTools(launchPendingTargets2661162324Output);

  const launchPendingTargets2661631447App = join(tmpDir, "LaunchPendingTargets2661631447.app");
  const launchPendingTargets2661631447Output = join(tmpDir, "launch-pending-targets-26616-31447-output.txt");
  prepareFakeApp(launchPendingTargets2661631447App, "26.616.31447", "4133");
  runScriptCommand(launchPendingTargets2661631447App, ["launch"], launchPendingTargets2661631447Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2661631447Output), "Runtime patch interception did not observe required targets: none.", "expected 26.616.31447 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2661631447Output));
  assertNotContains(readOutput(launchPendingTargets2661631447Output), "Plugins access", "expected 26.616.31447 missing required target output not to name Plugins access", readOutput(launchPendingTargets2661631447Output));
  assertNoLaunchCalls(launchPendingTargets2661631447Output);
  assertNoBundleMutationTools(launchPendingTargets2661631447Output);

  const launchPendingTargets2661651431App = join(tmpDir, "LaunchPendingTargets2661651431.app");
  const launchPendingTargets2661651431Output = join(tmpDir, "launch-pending-targets-26616-51431-output.txt");
  prepareFakeApp(launchPendingTargets2661651431App, "26.616.51431", "4212");
  runScriptCommand(launchPendingTargets2661651431App, ["launch"], launchPendingTargets2661651431Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2661651431Output), "Runtime patch interception did not observe required targets: none.", "expected 26.616.51431 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2661651431Output));
  assertNotContains(readOutput(launchPendingTargets2661651431Output), "Plugins access", "expected 26.616.51431 missing required target output not to name Plugins access", readOutput(launchPendingTargets2661651431Output));
  assertNoLaunchCalls(launchPendingTargets2661651431Output);
  assertNoBundleMutationTools(launchPendingTargets2661651431Output);

  const launchPendingTargets2661671553App = join(tmpDir, "LaunchPendingTargets2661671553.app");
  const launchPendingTargets2661671553Output = join(tmpDir, "launch-pending-targets-26616-71553-output.txt");
  prepareFakeApp(launchPendingTargets2661671553App, "26.616.71553", "4265");
  runScriptCommand(launchPendingTargets2661671553App, ["launch"], launchPendingTargets2661671553Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2661671553Output), "Runtime patch interception did not observe required targets: none.", "expected 26.616.71553 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2661671553Output));
  assertNotContains(readOutput(launchPendingTargets2661671553Output), "Plugins access", "expected 26.616.71553 missing required target output not to name Plugins access", readOutput(launchPendingTargets2661671553Output));
  assertNoLaunchCalls(launchPendingTargets2661671553Output);
  assertNoBundleMutationTools(launchPendingTargets2661671553Output);

  const launchPendingTargets2661681150App = join(tmpDir, "LaunchPendingTargets2661681150.app");
  const launchPendingTargets2661681150Output = join(tmpDir, "launch-pending-targets-26616-81150-output.txt");
  prepareFakeApp(launchPendingTargets2661681150App, "26.616.81150", "4306");
  runScriptCommand(launchPendingTargets2661681150App, ["launch"], launchPendingTargets2661681150Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2661681150Output), "Runtime patch interception did not observe required targets: none.", "expected 26.616.81150 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2661681150Output));
  assertNotContains(readOutput(launchPendingTargets2661681150Output), "Plugins access", "expected 26.616.81150 missing required target output not to name Plugins access", readOutput(launchPendingTargets2661681150Output));
  assertNoLaunchCalls(launchPendingTargets2661681150Output);
  assertNoBundleMutationTools(launchPendingTargets2661681150Output);

  const launchPendingTargets2662331443App = join(tmpDir, "LaunchPendingTargets2662331443.app");
  const launchPendingTargets2662331443Output = join(tmpDir, "launch-pending-targets-26623-31443-output.txt");
  prepareFakeApp(launchPendingTargets2662331443App, "26.623.31443", "4441");
  runScriptCommand(launchPendingTargets2662331443App, ["launch"], launchPendingTargets2662331443Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2662331443Output), "Runtime patch interception did not observe required targets: none.", "expected 26.623.31443 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2662331443Output));
  assertNotContains(readOutput(launchPendingTargets2662331443Output), "Plugins access", "expected 26.623.31443 missing required target output not to name Plugins access", readOutput(launchPendingTargets2662331443Output));
  assertNoLaunchCalls(launchPendingTargets2662331443Output);
  assertNoBundleMutationTools(launchPendingTargets2662331443Output);

  const launchPendingTargets2662331921App = join(tmpDir, "LaunchPendingTargets2662331921.app");
  const launchPendingTargets2662331921Output = join(tmpDir, "launch-pending-targets-26623-31921-output.txt");
  prepareFakeApp(launchPendingTargets2662331921App, "26.623.31921", "4452");
  runScriptCommand(launchPendingTargets2662331921App, ["launch"], launchPendingTargets2662331921Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2662331921Output), "Runtime patch interception did not observe required targets: none.", "expected 26.623.31921 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2662331921Output));
  assertNotContains(readOutput(launchPendingTargets2662331921Output), "Plugins access", "expected 26.623.31921 missing required target output not to name Plugins access", readOutput(launchPendingTargets2662331921Output));
  assertNoLaunchCalls(launchPendingTargets2662331921Output);
  assertNoBundleMutationTools(launchPendingTargets2662331921Output);

  const launchPendingTargets2662342026App = join(tmpDir, "LaunchPendingTargets2662342026.app");
  const launchPendingTargets2662342026Output = join(tmpDir, "launch-pending-targets-26623-42026-output.txt");
  prepareFakeApp(launchPendingTargets2662342026App, "26.623.42026", "4514");
  runScriptCommand(launchPendingTargets2662342026App, ["launch"], launchPendingTargets2662342026Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2662342026Output), "Runtime patch interception did not observe required targets: none.", "expected 26.623.42026 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2662342026Output));
  assertNotContains(readOutput(launchPendingTargets2662342026Output), "Plugins access", "expected 26.623.42026 missing required target output not to name Plugins access", readOutput(launchPendingTargets2662342026Output));
  assertNoLaunchCalls(launchPendingTargets2662342026Output);
  assertNoBundleMutationTools(launchPendingTargets2662342026Output);

  const launchPendingTargets2662361825App = join(tmpDir, "LaunchPendingTargets2662361825.app");
  const launchPendingTargets2662361825Output = join(tmpDir, "launch-pending-targets-26623-61825-output.txt");
  prepareFakeApp(launchPendingTargets2662361825App, "26.623.61825", "4548");
  runScriptCommand(launchPendingTargets2662361825App, ["launch"], launchPendingTargets2662361825Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2662361825Output), "Runtime patch interception did not observe required targets: none.", "expected 26.623.61825 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2662361825Output));
  assertNotContains(readOutput(launchPendingTargets2662361825Output), "Plugins access", "expected 26.623.61825 missing required target output not to name Plugins access", readOutput(launchPendingTargets2662361825Output));
  assertNoLaunchCalls(launchPendingTargets2662361825Output);
  assertNoBundleMutationTools(launchPendingTargets2662361825Output);

  const launchPendingTargets2662370822App = join(tmpDir, "LaunchPendingTargets2662370822.app");
  const launchPendingTargets2662370822Output = join(tmpDir, "launch-pending-targets-26623-70822-output.txt");
  prepareFakeApp(launchPendingTargets2662370822App, "26.623.70822", "4559");
  runScriptCommand(launchPendingTargets2662370822App, ["launch"], launchPendingTargets2662370822Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2662370822Output), "Runtime patch interception did not observe required targets: none.", "expected 26.623.70822 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2662370822Output));
  assertNotContains(readOutput(launchPendingTargets2662370822Output), "Plugins access", "expected 26.623.70822 missing required target output not to name Plugins access", readOutput(launchPendingTargets2662370822Output));
  assertNoLaunchCalls(launchPendingTargets2662370822Output);
  assertNoBundleMutationTools(launchPendingTargets2662370822Output);

  const launchPendingTargets2662381905App = join(tmpDir, "LaunchPendingTargets2662381905.app");
  const launchPendingTargets2662381905Output = join(tmpDir, "launch-pending-targets-26623-81905-output.txt");
  prepareFakeApp(launchPendingTargets2662381905App, "26.623.81905", "4598");
  runScriptCommand(launchPendingTargets2662381905App, ["launch"], launchPendingTargets2662381905Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2662381905Output), "Runtime patch interception did not observe required targets: none.", "expected 26.623.81905 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2662381905Output));
  assertNotContains(readOutput(launchPendingTargets2662381905Output), "Plugins access", "expected 26.623.81905 missing required target output not to name Plugins access", readOutput(launchPendingTargets2662381905Output));
  assertNoLaunchCalls(launchPendingTargets2662381905Output);
  assertNoBundleMutationTools(launchPendingTargets2662381905Output);

  const launchPendingTargets26623101652App = join(tmpDir, "LaunchPendingTargets26623101652.app");
  const launchPendingTargets26623101652Output = join(tmpDir, "launch-pending-targets-26623-101652-output.txt");
  prepareFakeApp(launchPendingTargets26623101652App, "26.623.101652", "4674");
  runScriptCommand(launchPendingTargets26623101652App, ["launch"], launchPendingTargets26623101652Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets26623101652Output), "Runtime patch interception did not observe required targets: none.", "expected 26.623.101652 launch not to require the removed Plugins access target", readOutput(launchPendingTargets26623101652Output));
  assertNotContains(readOutput(launchPendingTargets26623101652Output), "Plugins access", "expected 26.623.101652 missing required target output not to name Plugins access", readOutput(launchPendingTargets26623101652Output));
  assertNoLaunchCalls(launchPendingTargets26623101652Output);
  assertNoBundleMutationTools(launchPendingTargets26623101652Output);

  const launchPendingTargets26623141536App = join(tmpDir, "LaunchPendingTargets26623141536.app");
  const launchPendingTargets26623141536Output = join(tmpDir, "launch-pending-targets-26623-141536-output.txt");
  prepareFakeApp(launchPendingTargets26623141536App, "26.623.141536", "4753");
  runScriptCommand(launchPendingTargets26623141536App, ["launch"], launchPendingTargets26623141536Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets26623141536Output), "Runtime patch interception did not observe required targets: none.", "expected 26.623.141536 launch not to require the removed Plugins access target", readOutput(launchPendingTargets26623141536Output));
  assertNotContains(readOutput(launchPendingTargets26623141536Output), "Plugins access", "expected 26.623.141536 missing required target output not to name Plugins access", readOutput(launchPendingTargets26623141536Output));
  assertNoLaunchCalls(launchPendingTargets26623141536Output);
  assertNoBundleMutationTools(launchPendingTargets26623141536Output);

  const launchPendingTargets2670731428App = join(tmpDir, "LaunchPendingTargets2670731428.app");
  const launchPendingTargets2670731428Output = join(tmpDir, "launch-pending-targets-26707-31428-output.txt");
  prepareFakeApp(launchPendingTargets2670731428App, "26.707.31428", "5059");
  runScriptCommand(launchPendingTargets2670731428App, ["launch"], launchPendingTargets2670731428Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2670731428Output), "Runtime patch interception did not observe required targets: none.", "expected 26.707.31428 launch not to require the removed Plugins access target", readOutput(launchPendingTargets2670731428Output));
  assertNotContains(readOutput(launchPendingTargets2670731428Output), "Plugins access", "expected 26.707.31428 missing required target output not to name Plugins access", readOutput(launchPendingTargets2670731428Output));
  assertNoLaunchCalls(launchPendingTargets2670731428Output);
  assertNoBundleMutationTools(launchPendingTargets2670731428Output);

  const launchPendingTargets2670741301App = join(tmpDir, "LaunchPendingTargets2670741301.app");
  const launchPendingTargets2670741301Output = join(tmpDir, "launch-pending-targets-26707-41301-output.txt");
  prepareFakeApp(launchPendingTargets2670741301App, "26.707.41301", "5103");
  runScriptCommand(launchPendingTargets2670741301App, ["launch"], launchPendingTargets2670741301Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2670741301Output), "Runtime patch interception did not observe required targets: none.", "expected build 5103 not to require the legacy Plugins access target", readOutput(launchPendingTargets2670741301Output));
  assertNotContains(readOutput(launchPendingTargets2670741301Output), "Plugins access", "expected build 5103 missing-target output not to name Plugins access", readOutput(launchPendingTargets2670741301Output));
  assertNoLaunchCalls(launchPendingTargets2670741301Output);
  assertNoBundleMutationTools(launchPendingTargets2670741301Output);

  const launchPendingTargets2670761608App = join(tmpDir, "LaunchPendingTargets2670761608.app");
  const launchPendingTargets2670761608Output = join(tmpDir, "launch-pending-targets-26707-61608-output.txt");
  prepareFakeApp(launchPendingTargets2670761608App, "26.707.61608", "5200");
  runScriptCommand(launchPendingTargets2670761608App, ["launch"], launchPendingTargets2670761608Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2670761608Output), "Runtime patch interception did not observe required targets: none.", "expected build 5200 not to require the legacy Plugins access target", readOutput(launchPendingTargets2670761608Output));
  assertNotContains(readOutput(launchPendingTargets2670761608Output), "Plugins access", "expected build 5200 missing-target output not to name Plugins access", readOutput(launchPendingTargets2670761608Output));
  assertNoLaunchCalls(launchPendingTargets2670761608Output);
  assertNoBundleMutationTools(launchPendingTargets2670761608Output);

  const launchPendingTargets2670771524App = join(tmpDir, "LaunchPendingTargets2670771524.app");
  const launchPendingTargets2670771524Output = join(tmpDir, "launch-pending-targets-26707-71524-output.txt");
  prepareFakeApp(launchPendingTargets2670771524App, "26.707.71524", "5263");
  runScriptCommand(launchPendingTargets2670771524App, ["launch"], launchPendingTargets2670771524Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2670771524Output), "Runtime patch interception did not observe required targets: none.", "expected build 5263 not to require the legacy Plugins access target", readOutput(launchPendingTargets2670771524Output));
  assertNotContains(readOutput(launchPendingTargets2670771524Output), "Plugins access", "expected build 5263 missing-target output not to name Plugins access", readOutput(launchPendingTargets2670771524Output));
  assertNoLaunchCalls(launchPendingTargets2670771524Output);
  assertNoBundleMutationTools(launchPendingTargets2670771524Output);

  const launchPendingTargets2670772221App = join(tmpDir, "LaunchPendingTargets2670772221.app");
  const launchPendingTargets2670772221Output = join(tmpDir, "launch-pending-targets-26707-72221-output.txt");
  prepareFakeApp(launchPendingTargets2670772221App, "26.707.72221", "5307");
  runScriptCommand(launchPendingTargets2670772221App, ["launch"], launchPendingTargets2670772221Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2670772221Output), "Runtime patch interception did not observe required targets: none.", "expected build 5307 not to require the legacy Plugins access target", readOutput(launchPendingTargets2670772221Output));
  assertNotContains(readOutput(launchPendingTargets2670772221Output), "Plugins access", "expected build 5307 missing-target output not to name Plugins access", readOutput(launchPendingTargets2670772221Output));
  assertNoLaunchCalls(launchPendingTargets2670772221Output);
  assertNoBundleMutationTools(launchPendingTargets2670772221Output);

  const launchPendingTargets2670791948App = join(tmpDir, "LaunchPendingTargets2670791948.app");
  const launchPendingTargets2670791948Output = join(tmpDir, "launch-pending-targets-26707-91948-output.txt");
  prepareFakeApp(launchPendingTargets2670791948App, "26.707.91948", "5440");
  runScriptCommand(launchPendingTargets2670791948App, ["launch"], launchPendingTargets2670791948Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2670791948Output), "Runtime patch interception did not observe required targets: none.", "expected build 5440 not to require the legacy Plugins access target", readOutput(launchPendingTargets2670791948Output));
  assertNotContains(readOutput(launchPendingTargets2670791948Output), "Plugins access", "expected build 5440 missing-target output not to name Plugins access", readOutput(launchPendingTargets2670791948Output));
  assertNoLaunchCalls(launchPendingTargets2670791948Output);
  assertNoBundleMutationTools(launchPendingTargets2670791948Output);

  const launchPendingTargets2671521425App = join(tmpDir, "LaunchPendingTargets2671521425.app");
  const launchPendingTargets2671521425Output = join(tmpDir, "launch-pending-targets-26715-21425-output.txt");
  prepareFakeApp(launchPendingTargets2671521425App, "26.715.21425", "5488");
  runScriptCommand(launchPendingTargets2671521425App, ["launch"], launchPendingTargets2671521425Output, {
    CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
    CODEXFAST_TEST_ALLOW_NONZERO: "1",
  });
  assertContains(readOutput(launchPendingTargets2671521425Output), "Runtime patch interception did not observe required targets: none.", "expected build 5488 not to require the legacy Plugins access target", readOutput(launchPendingTargets2671521425Output));
  assertNotContains(readOutput(launchPendingTargets2671521425Output), "Plugins access", "expected build 5488 missing-target output not to name Plugins access", readOutput(launchPendingTargets2671521425Output));
  assertNoLaunchCalls(launchPendingTargets2671521425Output);
  assertNoBundleMutationTools(launchPendingTargets2671521425Output);

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
