import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateCdpWebSocketUrl,
} from "../src/cli-cdp.mts";
import {
  createPlatformAppPaths,
  getPlatformAdapter,
  parseWindowsAppxManifest,
  resolveDefaultAppBundle,
  runtimePlatform,
  windowsCdpLaunchArguments,
  windowsPackagedActivationPowerShellSource,
} from "../src/cli-platform.mts";
import { runtimePatcherSourceForVersion } from "../src/cli-runtime-launch.mts";
import {
  allocateLoopbackDebugPort,
} from "../src/cli-runtime-launch.mts";
import { resolveCommand } from "../src/cli-utils.mts";
import { SUPPORTED_APP_VERSIONS } from "../src/supported-app-versions.mts";
import {
  encodeWindowsPowerShellCommand,
  windowsPowerShellFragments,
  windowsPowerShellValidationHarnessSource,
} from "./helpers/windows-powershell-validation.mts";
import { runBuildScriptSuite } from "./suites/build-script-suite.mts";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const windowsCompatibilityKey = "win32:x64:26.803.5235+0";

async function runWindowsPortableSuite(): Promise<void> {
  assert.equal(
    runtimePlatform({ CODEXFAST_TEST_PLATFORM: "win32" }, "darwin"),
    "win32",
    "expected the Windows adapter to be selectable without host-specific shell tools",
  );
  assert.equal(getPlatformAdapter("win32").platform, "win32");
  assert.equal(resolveDefaultAppBundle("win32"), "");
  if (process.platform === "win32") {
    assert.equal(runtimePlatform(), "win32");
    for (const command of ["powershell.exe"]) {
      assert.ok(resolveCommand(command), `expected ${command} on windows-latest`);
    }
  }

  const packageRoot = String.raw`C:\Program Files\WindowsApps\OpenAI.Codex_fixture`;
  const paths = createPlatformAppPaths("win32", packageRoot);
  assert.equal(paths.resources, join(packageRoot, "app", "resources"));
  assert.equal(paths.appxManifest, join(packageRoot, "AppxManifest.xml"));
  assert.deepEqual(paths.executableCandidates, [
    join(packageRoot, "app", "ChatGPT.exe"),
  ]);

  const manifest = parseWindowsAppxManifest([
    '<?xml version="1.0" encoding="utf-8"?>',
    '<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10">',
    '  <Identity Name="OpenAI.Codex" Version="26.803.5235.0" ProcessorArchitecture="X64" />',
    "  <Applications>",
    '    <Application Id="App" Executable="app\\ChatGPT.exe" EntryPoint="Windows.FullTrustApplication" />',
    "  </Applications>",
    "</Package>",
  ].join("\r\n"));
  assert.ok(manifest, "expected a CRLF AppxManifest.xml fixture to parse");
  assert.equal(manifest.identityName, "OpenAI.Codex");
  assert.equal(manifest.version, "26.803.5235.0");
  assert.equal(manifest.processorArchitecture, "x64");
  assert.deepEqual(manifest.applications, [{
    id: "App",
    executable: "app\\ChatGPT.exe",
    entryPoint: "Windows.FullTrustApplication",
  }]);

  assert.deepEqual(windowsCdpLaunchArguments(45_678), [
    "--remote-debugging-port=45678",
    "--remote-debugging-address=127.0.0.1",
  ]);
  assert.throws(() => windowsCdpLaunchArguments(0), /Invalid CDP port/u);
  assert.throws(() => windowsCdpLaunchArguments(65_536), /Invalid CDP port/u);
  assert.equal(
    validateCdpWebSocketUrl(
      "ws://127.0.0.1:45678/devtools/browser/test",
      45_678,
    ),
    "ws://127.0.0.1:45678/devtools/browser/test",
  );
  assert.throws(
    () => validateCdpWebSocketUrl(
      "ws://localhost:45678/devtools/browser/test",
      45_678,
    ),
    /non-loopback/u,
  );
  assert.throws(
    () => validateCdpWebSocketUrl(
      "ws://127.0.0.1:45679/devtools/browser/test",
      45_678,
    ),
    /expected 45678/u,
  );
  assert.throws(
    () => validateCdpWebSocketUrl(
      "wss://127.0.0.1:45678/devtools/browser/test",
      45_678,
    ),
    /Unsupported CDP WebSocket protocol/u,
  );
  assert.throws(
    () => validateCdpWebSocketUrl(
      "ws://user:secret@127.0.0.1:45678/devtools/browser/test",
      45_678,
    ),
    /must not contain credentials/u,
  );
  const allocatedPort = await allocateLoopbackDebugPort();
  assert.ok(
    allocatedPort > 0 && allocatedPort <= 65_535,
    `expected the OS to allocate a valid free loopback port, got ${String(allocatedPort)}`,
  );

  const activationSource = windowsPackagedActivationPowerShellSource();
  assert.match(activationSource, /IApplicationActivationManager/u);
  assert.match(activationSource, /\$env:CODEXFAST_APP_USER_MODEL_ID/u);
  assert.match(activationSource, /\$env:CODEXFAST_APP_ARGUMENTS/u);
  assert.match(
    activationSource,
    /\$env:CODEXFAST_EXPECTED_CDP_PORT_ARGUMENT/u,
  );
  assert.match(
    activationSource,
    /\$env:CODEXFAST_EXPECTED_CDP_ADDRESS_ARGUMENT/u,
  );
  assert.match(
    activationSource,
    /Activated process command line does not contain only the current codexfast CDP launch arguments/u,
  );
  assert.match(
    activationSource,
    /CommandLineToArgvW/u,
    "expected activation ownership checks to parse Windows arguments natively",
  );
  assert.match(
    activationSource,
    /HasOnlyExpectedRemoteDebuggingArguments/u,
    "expected activation ownership checks to require an exact, non-conflicting argument set",
  );
  assert.doesNotMatch(
    activationSource,
    /Test-CodexfastCommandLineArgument|\[regex\]::IsMatch/u,
    "expected activation ownership checks not to treat quoted substrings as standalone arguments",
  );
  assert.ok(
    !activationSource.includes(packageRoot),
    "expected the fixed PowerShell source not to interpolate install paths",
  );
  const powershellFragments = windowsPowerShellFragments();
  assert.deepEqual(
    powershellFragments.map((fragment) => fragment.name),
    [
      "package-query",
      "packaged-activation",
      "process-identity",
      "verified-termination",
    ],
    "expected every fixed Encoded PowerShell fragment to be validated",
  );
  const platformSource = readFileSync(
    join(rootDir, "src", "cli-platform.mts"),
    "utf8",
  );
  const encodedSourceFactories = new Set(
    [...platformSource.matchAll(
      /runWindowsPowerShellEncoded\(\s*(windows[A-Za-z]+PowerShellSource)\(\)/gu,
    )].map((match) => match[1]),
  );
  assert.deepEqual(
    [...encodedSourceFactories].sort(),
    powershellFragments
      .map((fragment) => fragment.sourceFactoryName)
      .sort(),
    "expected Windows PowerShell validation to cover every EncodedCommand source factory",
  );
  assert.match(
    powershellFragments[0]?.source ?? "",
    /Get-AppxPackageManifest -Package \$package\.PackageFullName/u,
  );
  assert.equal(powershellFragments[1]?.compileCSharpHelper, true);
  assert.match(
    powershellFragments[2]?.source ?? "",
    /CODEXFAST_WINDOWS_OPERATION/u,
  );
  assert.equal(powershellFragments[3]?.compileCSharpHelper, true);
  assert.match(
    powershellFragments[3]?.source ?? "",
    /CodexfastVerifiedProcessHandle/u,
  );
  for (const fragment of powershellFragments) {
    assert.equal(
      Buffer.from(
        encodeWindowsPowerShellCommand(fragment.source),
        "base64",
      ).toString("utf16le"),
      fragment.source,
      `expected ${fragment.name} to round-trip through EncodedCommand encoding`,
    );
  }
  assert.match(
    windowsPowerShellValidationHarnessSource,
    /\[System\.Management\.Automation\.Language\.Parser\]::ParseInput/u,
  );
  assert.match(
    windowsPowerShellValidationHarnessSource,
    /Set-StrictMode -Version 2\.0/u,
    "expected invalid AST property access to fail during validation",
  );
  assert.match(
    windowsPowerShellValidationHarnessSource,
    /Add-Type -TypeDefinition \$csharpSource -Language CSharp/u,
  );
  assert.match(
    windowsPowerShellValidationHarnessSource,
    /\.Right\.FindAll\(/u,
    "expected the validation harness to traverse the assignment statement block",
  );
  assert.doesNotMatch(
    windowsPowerShellValidationHarnessSource,
    /\$sourceAssignments\[0\]\.Right\.Value/u,
    "expected the validation harness not to read a nonexistent statement-block value",
  );
  assert.match(
    windowsPowerShellValidationHarnessSource,
    /NestedExpressions/u,
    "expected expandable C# source strings to reject PowerShell interpolation",
  );
  for (const unsafeActivationCommandLine of [
    '"--remote-debugging-port=45678 --remote-debugging-address=127.0.0.1"',
    "--remote-debugging-port=45678 --remote-debugging-port=45678",
    "--remote-debugging-address=127.0.0.1 --remote-debugging-address=127.0.0.1",
    "--remote-debugging-address=127.0.0.1 --remote-debugging-address=0.0.0.0",
  ]) {
    assert.ok(
      windowsPowerShellValidationHarnessSource.includes(
        unsafeActivationCommandLine,
      ),
      `expected the Windows PowerShell 5.1 harness to reject ${unsafeActivationCommandLine}`,
    );
  }
  assert.doesNotMatch(
    windowsPowerShellValidationHarnessSource,
    /Invoke-Expression|ScriptBlock\]::Create/u,
    "expected validation to parse production fragments without executing them",
  );

  assert.ok(
    SUPPORTED_APP_VERSIONS[windowsCompatibilityKey],
    "expected the offline-validated Windows candidate to remain whitelisted",
  );
  const filteredPatcher = runtimePatcherSourceForVersion(
    "const portableWindowsPatcherFixture = true;",
    "26.803.5235+0",
    "win32",
  );
  for (const skippedPrefix of [
    '"plugin"',
    '"plugins"',
    '"disable-automatic-updates"',
    '"gpt"',
  ]) {
    assert.ok(
      filteredPatcher.includes(skippedPrefix),
      `expected the Windows patch profile to skip ${skippedPrefix}`,
    );
  }

  const generatedCli = readFileSync(join(rootDir, "bin", "codexfast"), "utf8");
  assert.ok(!generatedCli.includes("__SUPPORTED_APP_VERSIONS__"));
  assert.match(generatedCli, /IApplicationActivationManager/u);
  assert.match(generatedCli, /--remote-debugging-address=127\.0\.0\.1/u);
}

runBuildScriptSuite();
await runWindowsPortableSuite();
console.log("Windows portable test passed");
