import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertContains, assertNotContains } from "../helpers/assertions.mts";
import { TARGET_SPECS } from "../../src/patcher-targets.mts";

export function runGeneratedCliSuite(rootDir: string): void {
  const generatedCli = readFileSync(join(rootDir, "bin", "codexfast"), "utf8");
  assertContains(generatedCli, 'const MIN_NODE_VERSION = "18.12.0";', "expected generated CLI to enforce Node.js 18.12.0 or later");
  assertContains(generatedCli, "runtimePatchReconnectMaxAttempts = 3", "expected generated CLI to bound runtime launch reconnect attempts");
  assertContains(generatedCli, '"Browser.getVersion"', "expected generated CLI to heartbeat the browser-level CDP runtime patch session");
  assertContains(generatedCli, '"Target.setAutoAttach"', "expected generated CLI to auto-attach before renderer JavaScript runs");
  assertContains(generatedCli, "waitForDebuggerOnStart: true", "expected generated CLI to pause new renderer targets before JavaScript runs");
  assertContains(generatedCli, '"Runtime.runIfWaitingForDebugger"', "expected generated CLI to resume renderer targets after interception is enabled");
  assertContains(generatedCli, "message.sessionId", "expected generated CLI to route Fetch events through flattened target sessions");
  assertContains(generatedCli, "send(method, params, sessionId)", "expected generated CLI to send CDP commands to flattened target sessions");
  assertContains(generatedCli, "Runtime patch session lost after", "expected generated CLI to report exhausted runtime patch reconnects clearly");
  assertContains(generatedCli, "runtimePatchNoTargetIdleMs", "expected generated CLI to wait for quiet JS traffic before failing initial runtime target discovery");
  assertContains(generatedCli, "app://*/.vite/build/*.js", "expected generated CLI to intercept main-process build assets if Electron serves them through app://");
  assertContains(generatedCli, "codexfastAutomaticUpdateCheck", "expected generated CLI to include the dynamic automatic update main-process hook");
  assertContains(generatedCli, "forcedUpdateScheduleSignature", "expected generated CLI to suppress automatic forced update install scheduling when disableAutomaticUpdates is enabled");
  assertNotContains(generatedCli, "CODEXFAST_DISABLE_AUTOMATIC_UPDATES", "expected generated CLI not to rely on startup-only automatic update environment state");
  assertContains(generatedCli, "disableAutomaticUpdates", "expected generated CLI to include the automatic update setting patches");
  assertContains(generatedCli, "detached: true", "expected runtime launch to isolate Codex from the launch terminal process group");
  assertContains(generatedCli, "child.unref();", "expected runtime launch to let Codex survive when the launcher exits");
  assertNotContains(generatedCli, "tccutil", "expected generated CLI not to reset macOS ScreenCapture permissions");
  assertNotContains(generatedCli, "ScreenCapture", "expected generated CLI not to contain ScreenCapture reset logic");
  assertNotContains(generatedCli, "codexfast-browser-peer-auth", "expected generated CLI not to contain browser-use native pipe peer-auth compatibility patch");
  assertNotContains(generatedCli, "missing-code-signing-identity", "expected generated CLI not to authorize missing-code-signing-identity peer-auth failures");
  assertNotContains(generatedCli, "__selftest-legacy-", "expected generated CLI not to contain removed legacy file-patch self-tests");
  assertNotContains(generatedCli, "@electron/asar", "expected generated CLI not to contain legacy bundle patch asar tooling");
  assertNotContains(generatedCli, "app.asar1", "expected generated CLI not to contain legacy archive backup handling");
  assertNotContains(generatedCli, "__SUPPORTED_APP_VERSIONS__", "expected generated CLI to inline supported app versions without placeholder names");

  const targetIds = TARGET_SPECS.map((spec) => spec.id).join("\n");
  assertContains(targetIds, "speed-setting", "expected patcher target specs to be importable at runtime");
  assertContains(targetIds, "disable-automatic-updates-schema", "expected automatic update setting schema target to be importable at runtime");
  assertContains(targetIds, "disable-automatic-updates-setting", "expected automatic update General setting target to be importable at runtime");
  assertNotContains(
    targetIds,
    "browser-use-native-pipe-peer-auth",
    "expected browser-use native pipe peer-auth compatibility target to be removed",
  );
}
