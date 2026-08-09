import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCodexfastContext, type CodexfastContext } from "../../src/cli-context.mts";
import {
  getPlatformAdapter,
  parseWindowsAppxManifest,
  runtimePlatform,
  windowsCdpLaunchArguments,
  windowsPackageQueryPowerShellSource,
  windowsPackagedActivationPowerShellSource,
} from "../../src/cli-platform.mts";
import {
  runRuntimeLaunch,
  runtimePatcherSourceForVersion,
} from "../../src/cli-runtime-launch.mts";
import { createWatcherFlow } from "../../src/cli-watcher.mts";
import { SUPPORTED_APP_VERSIONS } from "../../src/supported-app-versions.mts";
import { assertContains, assertNotContains, fail } from "../helpers/assertions.mts";
import { prepareFakeWindowsMsixApp } from "../helpers/fake-app.mts";
import {
  assertNoLaunchctlCalls,
  assertNoPgrepCalls,
  assertNoTaskkillCalls,
  assertNoTasklistCalls,
  readOutput,
  runScript,
  setupStubs,
} from "../helpers/script-harness.mts";

type WindowsPlatformSuiteOptions = {
  rootDir: string;
  tmpDir: string;
};

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    fail(message, `expected: ${String(expected)}\nactual: ${String(actual)}`);
  }
}

function withEnvironment<T>(
  overrides: Record<string, string | undefined>,
  callback: () => T,
): T {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return callback();
  } finally {
    for (const [key, value] of previous) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function withEnvironmentAsync<T>(
  overrides: Record<string, string | undefined>,
  callback: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return await callback();
  } finally {
    for (const [key, value] of previous) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function packageQueryOutput(options: {
  installLocation: string;
  packageVersion: string;
  packageFullName?: string;
  applicationFamilyName?: string;
  architecture?: string;
  publisherId?: string;
  signatureKind?: string;
  manifestIdentityName?: string;
  manifestVersion?: string;
  manifestProcessorArchitecture?: string;
  applicationId?: string;
  executable?: string;
  entryPoint?: string;
}): string {
  const familyName = options.applicationFamilyName ??
    "OpenAI.Codex_2p2nqsd0c76g0";
  const architecture = options.architecture ?? "x64";
  const publisherId = options.publisherId ?? "2p2nqsd0c76g0";
  return JSON.stringify([
    {
      Name: "OpenAI.Codex",
      PackageFullName: options.packageFullName ??
        `OpenAI.Codex_${options.packageVersion}_${architecture}__${publisherId}`,
      PackageFamilyName: familyName,
      PublisherId: publisherId,
      SignatureKind: options.signatureKind ?? "Store",
      Architecture: architecture,
      InstallLocation: options.installLocation,
      Version: options.packageVersion,
      ManifestIdentityName: options.manifestIdentityName ?? "OpenAI.Codex",
      ManifestVersion: options.manifestVersion ?? options.packageVersion,
      ManifestProcessorArchitecture:
        options.manifestProcessorArchitecture ?? architecture,
      Applications: [
        {
          Id: options.applicationId ?? "App",
          Executable: options.executable ?? "app\\ChatGPT.exe",
          EntryPoint: options.entryPoint ?? "Windows.FullTrustApplication",
        },
      ],
    },
  ]);
}

function processIdentityOutput(options: {
  pid: number;
  executablePath: string;
  startTimeUtcTicks?: string;
  activationStartedUtcTicks?: string;
}): string {
  const startTimeUtcTicks =
    options.startTimeUtcTicks ?? "638900000000000000";
  return JSON.stringify({
    Pid: options.pid,
    StartTimeUtcTicks: startTimeUtcTicks,
    ActivationStartedUtcTicks: options.activationStartedUtcTicks ??
      (BigInt(startTimeUtcTicks) - 1n).toString(),
    ExecutablePath: options.executablePath,
  });
}

function countLinesStartingWith(source: string, prefix: string): number {
  return source.split(/\r?\n/u).filter((line) => line.startsWith(prefix)).length;
}

function runWindowsRuntimePatchProfileCheck(): void {
  const patcherSource = runtimePatcherSourceForVersion(`
const TARGET_SPECS = [
  {id: "speed-setting", label: "Speed setting", needle: "speed-setting", guardedSignature: /SPEED_SETTING_DISABLED/, patchedSignature: /SPEED_SETTING_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_SETTING_ENABLED"},
  {id: "speed-service-tier-allowance", label: "Speed service tier allowance", needle: "speed-tier-allowance", guardedSignature: /SPEED_TIER_ALLOWANCE_DISABLED/, patchedSignature: /SPEED_TIER_ALLOWANCE_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_TIER_ALLOWANCE_ENABLED"},
  {id: "speed-service-tier-request-allowance", label: "Speed service tier request allowance", needle: "speed-tier-request", guardedSignature: /SPEED_TIER_REQUEST_DISABLED/, patchedSignature: /SPEED_TIER_REQUEST_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_TIER_REQUEST_ENABLED"},
  {id: "speed-service-tier-conversation-fallback", label: "Speed service tier conversation fallback", needle: "speed-tier-fallback", guardedSignature: /SPEED_TIER_FALLBACK_DISABLED/, patchedSignature: /SPEED_TIER_FALLBACK_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_TIER_FALLBACK_ENABLED"},
  {id: "intelligence-speed-menu", label: "Composer Intelligence Speed menu", needle: "intelligence-speed", guardedSignature: /INTELLIGENCE_SPEED_DISABLED/, patchedSignature: /INTELLIGENCE_SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "INTELLIGENCE_SPEED_ENABLED"},
  {id: "fast-slash-command", label: "Fast slash command", needle: "fast-slash", guardedSignature: /FAST_SLASH_DISABLED/, patchedSignature: /FAST_SLASH_ENABLED/, legacyPatchedSignature: null, applyReplacement: "FAST_SLASH_ENABLED"},
  {id: "disable-automatic-updates-setting", label: "Disable automatic updates", needle: "updater", guardedSignature: /UPDATER_DISABLED/, patchedSignature: /UPDATER_ENABLED/, legacyPatchedSignature: null, applyReplacement: "UPDATER_ENABLED"},
  {id: "plugins-catalog-visibility", label: "Plugins catalog visibility", needle: "plugin", guardedSignature: /PLUGIN_DISABLED/, patchedSignature: /PLUGIN_ENABLED/, legacyPatchedSignature: null, applyReplacement: "PLUGIN_ENABLED"},
  {id: "gpt5x-model-list-options", label: "GPT-5.x model list", needle: "model-list", guardedSignature: /MODEL_LIST_DISABLED/, patchedSignature: /MODEL_LIST_ENABLED/, legacyPatchedSignature: null, applyReplacement: "MODEL_LIST_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;
  if (!guarded && !patched && !legacyPatched) return null;
  return {spec, guarded, patched, legacyPatched};
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`, "26.803.5235+0", "win32");
  const applyWindowsProfile = new Function(
    `${patcherSource}\nreturn applyRuntimePatchesToBody;`,
  )() as (resourcePath: string, body: string) => {
    content: string;
    patchedLabels: string[];
  };
  const result = applyWindowsProfile(
    "app://-/assets/windows-profile.js",
    [
      "speed-setting SPEED_SETTING_DISABLED",
      "speed-tier-allowance SPEED_TIER_ALLOWANCE_DISABLED",
      "speed-tier-request SPEED_TIER_REQUEST_DISABLED",
      "speed-tier-fallback SPEED_TIER_FALLBACK_DISABLED",
      "intelligence-speed INTELLIGENCE_SPEED_DISABLED",
      "fast-slash FAST_SLASH_DISABLED",
      "updater UPDATER_DISABLED",
      "plugin PLUGIN_DISABLED",
      "model-list MODEL_LIST_DISABLED",
    ].join(" "),
  );
  assertContains(result.content, "SPEED_SETTING_ENABLED", "expected Windows to retain the Settings Fast path");
  assertContains(result.content, "SPEED_TIER_ALLOWANCE_ENABLED", "expected Windows to retain the service-tier Fast path");
  assertContains(result.content, "SPEED_TIER_REQUEST_ENABLED", "expected Windows to retain the request-tier Fast path");
  assertContains(result.content, "SPEED_TIER_FALLBACK_ENABLED", "expected Windows to retain the conversation fallback Fast path");
  assertContains(result.content, "INTELLIGENCE_SPEED_ENABLED", "expected Windows to retain the composer Intelligence Speed menu");
  assertContains(result.content, "FAST_SLASH_ENABLED", "expected Windows to retain the /fast path");
  for (const disabledSignature of [
    "SPEED_SETTING_DISABLED",
    "SPEED_TIER_ALLOWANCE_DISABLED",
    "SPEED_TIER_REQUEST_DISABLED",
    "SPEED_TIER_FALLBACK_DISABLED",
    "INTELLIGENCE_SPEED_DISABLED",
    "FAST_SLASH_DISABLED",
  ]) {
    assertNotContains(result.content, disabledSignature, `expected Windows to replace ${disabledSignature}`);
  }
  assertContains(result.content, "UPDATER_DISABLED", "expected Windows to skip macOS automatic-update targets");
  assertContains(result.content, "PLUGIN_DISABLED", "expected Windows to skip unvalidated Plugins targets");
  assertContains(result.content, "MODEL_LIST_DISABLED", "expected Windows to skip unvalidated model-injection targets");
  assertEqual(
    result.patchedLabels.join("\n"),
    [
      "Speed setting",
      "Speed service tier allowance",
      "Speed service tier request allowance",
      "Speed service tier conversation fallback",
      "Composer Intelligence Speed menu",
      "Fast slash command",
    ].join("\n"),
    "expected Windows to report the complete six-label Fast patch profile",
  );
  assertNotContains(result.patchedLabels.join("\n"), "Disable automatic updates", "expected Windows not to report skipped updater targets");
  assertNotContains(result.patchedLabels.join("\n"), "Plugins", "expected Windows not to report skipped Plugins targets");
  assertNotContains(result.patchedLabels.join("\n"), "GPT-5.x", "expected Windows not to report skipped model targets");
}

function runWindowsManifestAndAdapterChecks(options: WindowsPlatformSuiteOptions): void {
  assertEqual(
    runtimePlatform({ CODEXFAST_TEST_PLATFORM: "win32" }, "darwin"),
    "win32",
    "expected the test-only platform override to select the Windows adapter on macOS",
  );
  assertEqual(
    runtimePlatform({}, "linux"),
    "unsupported",
    "expected unsupported host platforms to fail closed",
  );

  const windowsDir = join(
    options.tmpDir,
    "Windows Apps with spaces",
    "用户 Codex",
    "OpenAI.Codex_26.803.5235.0_x64__2p2nqsd0c76g0",
  );
  const packageVersion = "26.803.5235.0";
  const applicationId = "App";
  prepareFakeWindowsMsixApp({
    appDir: windowsDir,
    packageVersion,
    applicationId,
  });

  const manifestSource = readFileSync(join(windowsDir, "AppxManifest.xml"), "utf8");
  const manifest = parseWindowsAppxManifest(manifestSource);
  if (!manifest) {
    fail("expected the fake Windows AppxManifest.xml to parse");
  }
  assertEqual(manifest.identityName, "OpenAI.Codex", "expected MSIX package identity name to be parsed");
  assertEqual(manifest.version, packageVersion, "expected the four-part MSIX version to be parsed");
  assertEqual(manifest.processorArchitecture, "x64", "expected the MSIX processor architecture to be parsed");
  assertEqual(manifest.applications.length, 1, "expected the manifest application entry to be parsed");
  assertEqual(manifest.applications[0]?.id, applicationId, "expected the manifest application ID to be parsed");
  assertEqual(manifest.applications[0]?.executable, "app\\ChatGPT.exe", "expected the verified packaged executable path to be parsed without losing separators");
  assertEqual(manifest.applications[0]?.entryPoint, "Windows.FullTrustApplication", "expected the verified full-trust entry point to be parsed");

  const cdpArguments = windowsCdpLaunchArguments(45_678);
  assertEqual(cdpArguments.length, 2, "expected the Windows launcher to use only the required CDP arguments");
  assertEqual(cdpArguments[0], "--remote-debugging-port=45678", "expected the selected CDP port to be preserved");
  assertEqual(cdpArguments[1], "--remote-debugging-address=127.0.0.1", "expected the Windows CDP listener to bind to loopback only");

  const activationSource = windowsPackagedActivationPowerShellSource();
  assertContains(activationSource, "IApplicationActivationManager", "expected packaged Windows launch to use the official activation API");
  assertContains(activationSource, "$env:CODEXFAST_APP_USER_MODEL_ID", "expected the AUMID to be passed through the child environment");
  assertContains(activationSource, "$env:CODEXFAST_APP_ARGUMENTS", "expected CDP arguments to be passed through the child environment");
  assertContains(activationSource, "CommandLineToArgvW", "expected activation ownership checks to use native Windows argument parsing");
  assertContains(activationSource, "HasOnlyExpectedRemoteDebuggingArguments", "expected activation ownership checks to reject missing, duplicate, or conflicting CDP argument tokens");
  assertNotContains(activationSource, "[regex]::IsMatch", "expected activation ownership checks not to accept quoted substrings inside unrelated arguments");
  assertNotContains(activationSource, windowsDir, "expected user-controlled install paths not to be interpolated into PowerShell source");

  const packageQuerySource = windowsPackageQueryPowerShellSource();
  assertContains(packageQuerySource, "Get-AppxPackageManifest -Package $package.PackageFullName", "expected manifest metadata to come from the package manager API");
  assertContains(packageQuerySource, "PublisherId=[string]$package.PublisherId", "expected Store publisher metadata to be queried from the registered package");
  assertContains(packageQuerySource, "SignatureKind=[string]$package.SignatureKind", "expected Store signature metadata to be queried from the registered package");
  assertNotContains(packageQuerySource, "AppxManifest.xml", "expected Node and PowerShell admission not to read the protected manifest file directly");

  const stubBin = join(options.tmpDir, "windows-adapter-bin");
  const markerFile = join(options.tmpDir, "windows-adapter-native-tools.log");
  const outputFile = join(options.tmpDir, "windows-adapter-output.txt");
  const codexHome = join(options.tmpDir, "Codex Home with spaces", "配置");
  setupStubs(stubBin, markerFile);
  writeFileSync(outputFile, "");

  const packageFamilyName = "OpenAI.Codex_2p2nqsd0c76g0";
  const expectedAumid = `${packageFamilyName}!${applicationId}`;
  const expectedExecutablePath = join(windowsDir, "app", "ChatGPT.exe");
  const compatibilityKey = "win32:x64:26.803.5235+0";
  if (!SUPPORTED_APP_VERSIONS[compatibilityKey]) {
    fail("expected the validated x64 Windows MSIX build to remain in the strict whitelist");
  }
  const baseEnvironment: Record<string, string | undefined> = {
    PATH: `${stubBin}:${process.env.PATH ?? ""}`,
    CODEXFAST_TEST_PLATFORM: "win32",
    CODEXFAST_APP_BUNDLE: windowsDir,
    CODEXFAST_APP_USER_MODEL_ID: undefined,
    CODEXFAST_APP_ARGUMENTS: undefined,
    CODEXFAST_TEST_CODEX_RUNNING: undefined,
    CODEX_HOME: codexHome,
    NODE_OPTIONS: "--trace-warnings",
    CODEXFAST_TEST_WINDOWS_TASKLIST_OUTPUT:
      '"ChatGPT.exe","9999","Console","1","100 K"',
    CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
      installLocation: windowsDir,
      packageVersion,
      applicationFamilyName: packageFamilyName,
    }),
  };

  let context: CodexfastContext | null = null;
  withEnvironment(baseEnvironment, () => {
    context = createCodexfastContext(windowsDir);
    const adapter = getPlatformAdapter(context.platform);
    const requirementResult = adapter.checkRequirements(
      context,
      SUPPORTED_APP_VERSIONS,
    );
    if (!requirementResult.ok) {
      fail(
        "expected the fake Store/MSIX install to pass Windows requirement discovery",
        requirementResult.messages.join("\n"),
      );
    }
    assertEqual(context.metadata.version, "26.803.5235", "expected Windows metadata to preserve the three-part app version");
    assertEqual(context.metadata.build, "0", "expected Windows metadata to map the fourth MSIX component to build");
    assertEqual(context.metadata.compatibilityKey, compatibilityKey, "expected Windows compatibility to include platform, architecture, version, and build");
    assertEqual(context.paths.bundle, windowsDir, "expected paths containing spaces and Unicode to remain intact");
    assertEqual(context.windowsPackage?.architecture, "x64", "expected the package architecture to be retained for launch admission");
    assertEqual(context.windowsPackage?.appUserModelId, expectedAumid, "expected the AUMID to combine PackageFamilyName and manifest Application Id");

    const runningCheck = adapter.checkCodexRunning(context);
    if (!runningCheck.ok || runningCheck.running) {
      fail("expected an unrelated same-name process to be ignored by exact package-path discovery", JSON.stringify(runningCheck));
    }
    withEnvironment(
      {
        CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_RUNNING_OUTPUT: JSON.stringify([
          {
            Pid: 7_318,
            StartTimeUtcTicks: "638900000000000318",
            ExecutablePath: expectedExecutablePath,
          },
        ]),
      },
      () => {
        const exactPackageRunningCheck = adapter.checkCodexRunning(context!);
        if (!exactPackageRunningCheck.ok || !exactPackageRunningCheck.running) {
          fail("expected exact admitted-package executable discovery to report Codex as running", JSON.stringify(exactPackageRunningCheck));
        }
      },
    );

    withEnvironment(
      {
        CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH: "1",
        CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
          pid: 7_319,
          executablePath: expectedExecutablePath,
        }),
        CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
          pid: 7_319,
          executablePath: expectedExecutablePath,
        }),
        CODEX_HOME: codexHome,
        NODE_OPTIONS: "--trace-warnings",
      },
      () => {
        const launched = adapter.launchCodexProcess(context!, 45_678);
        assertEqual(launched.pid, 7_319, "expected packaged activation to return its exact process ID");
        if (launched.child !== null) {
          fail("expected Store/MSIX activation to track a PID instead of an unrelated shell child");
        }
        const terminationResult = adapter.terminateRuntimeLaunchProcess(launched);
        if (!terminationResult.ok) {
          fail("expected Windows launch cleanup to terminate the verified PID and confirm the admitted executable path is clear", terminationResult.message);
        }
        const secondTerminationResult = adapter.terminateRuntimeLaunchProcess(launched);
        if (!secondTerminationResult.ok) {
          fail("expected repeated Windows cleanup to remain idempotent", secondTerminationResult.message);
        }
      },
    );
  });

  if (!context) {
    fail("expected Windows context creation to complete");
  }
  const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
  assertEqual(countLinesStartingWith(powershellLog, "args="), 8, "expected package discovery, two exact-path running checks, a pre-launch snapshot, activation, cleanup identity verification, handle-guarded termination, and exact-path exit confirmation");
  assertContains(powershellLog, "operation=package-query", "expected requirement admission to query package metadata");
  assertContains(powershellLog, "snapshot_purpose=running-check", "expected Windows running detection to use an exact executable-path snapshot");
  assertContains(powershellLog, "snapshot_purpose=pre-launch", "expected activation to capture a separate pre-launch process snapshot");
  assertContains(powershellLog, "operation=process-identity", "expected cleanup to revalidate the activated process identity");
  assertContains(powershellLog, "operation=verified-termination", "expected cleanup to terminate through a verified native process handle");
  assertContains(powershellLog, "snapshot_purpose=termination-confirmation", "expected cleanup success to require an empty exact-path process snapshot");
  assertContains(powershellLog, `bundle=${windowsDir}`, "expected the Unicode/space-containing bundle path to survive the launch environment");
  assertContains(powershellLog, `aumid=${expectedAumid}`, "expected activation to receive the resolved AUMID verbatim");
  assertContains(powershellLog, "app_arguments=--remote-debugging-port=45678 --remote-debugging-address=127.0.0.1", "expected activation to receive the loopback CDP arguments");
  assertContains(powershellLog, "expected_cdp_port_argument=--remote-debugging-port=45678", "expected activation ownership checks to receive the exact selected CDP port argument");
  assertContains(powershellLog, "expected_cdp_address_argument=--remote-debugging-address=127.0.0.1", "expected activation ownership checks to receive the exact loopback address argument");
  assertContains(powershellLog, "node_options=--trace-warnings", "expected Windows activation not to replace existing NODE_OPTIONS");
  assertNotContains(powershellLog, "main-process-hook.cjs", "expected Windows activation not to inject the macOS Sparkle hook");
  if (existsSync(join(codexHome, ".tmp", "codexfast", "main-process-hook.cjs"))) {
    fail("expected Windows launch not to write the macOS Sparkle main-process hook");
  }

  assertNoTasklistCalls(markerFile, outputFile);
  assertNoTaskkillCalls(markerFile, outputFile);
  assertNoLaunchctlCalls(markerFile, outputFile);
  assertNoPgrepCalls(markerFile, outputFile);
}

function runWindowsDiscoveryAndAdmissionChecks(
  options: WindowsPlatformSuiteOptions,
): void {
  const stubBin = join(options.tmpDir, "windows-admission-bin");
  const markerFile = join(options.tmpDir, "windows-admission-native-tools.log");
  setupStubs(stubBin, markerFile);
  const commonEnvironment = {
    PATH: `${stubBin}:${process.env.PATH ?? ""}`,
    CODEXFAST_TEST_PLATFORM: "win32",
    CODEXFAST_APP_USER_MODEL_ID: undefined,
    CODEXFAST_APP_ARGUMENTS: undefined,
    NODE_OPTIONS: "--trace-warnings",
  };

  const discoveredDir = join(options.tmpDir, "auto discovered Windows package", "OpenAI.Codex");
  prepareFakeWindowsMsixApp({ appDir: discoveredDir });
  withEnvironment(
    {
      ...commonEnvironment,
      CODEXFAST_APP_BUNDLE: undefined,
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: discoveredDir,
        packageVersion: "26.803.5235.0",
      }),
    },
    () => {
      const context = createCodexfastContext(undefined);
      assertEqual(context.paths.bundle, "", "expected Windows default discovery to begin without a hard-coded install path");
      const result = getPlatformAdapter(context.platform).checkRequirements(
        context,
        SUPPORTED_APP_VERSIONS,
      );
      if (!result.ok) {
        fail("expected Get-AppxPackage metadata to discover the current user's MSIX install", result.messages.join("\n"));
      }
      assertEqual(context.paths.bundle, discoveredDir, "expected package discovery to adopt InstallLocation with spaces");
      if (!context.metadata.supported) {
        fail("expected the auto-discovered validated x64 MSIX build to be supported");
      }
    },
  );

  const protectedUnreadableDir = join(
    options.tmpDir,
    "simulated protected WindowsApps",
    "OpenAI.Codex_26.803.5235.0_x64__2p2nqsd0c76g0",
  );
  if (existsSync(protectedUnreadableDir)) {
    fail("expected the protected-directory fixture not to exist on the test filesystem");
  }
  withEnvironment(
    {
      ...commonEnvironment,
      CODEXFAST_APP_BUNDLE: protectedUnreadableDir,
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: protectedUnreadableDir,
        packageVersion: "26.803.5235.0",
      }),
    },
    () => {
      const context = createCodexfastContext(protectedUnreadableDir);
      const result = getPlatformAdapter(context.platform).checkRequirements(
        context,
        SUPPORTED_APP_VERSIONS,
      );
      if (!result.ok || !context.metadata.supported) {
        fail(
          "expected package-manager and manifest API metadata to admit a protected WindowsApps install without Node file reads",
          result.ok ? JSON.stringify(context.metadata) : result.messages.join("\n"),
        );
      }
      assertEqual(
        context.paths.bundle,
        protectedUnreadableDir,
        "expected admission to preserve the registered InstallLocation without probing it",
      );
    },
  );

  const assertMetadataDriftRejected = (
    label: string,
    queryOutput: string,
    expectedMessage: string,
  ): void => {
    withEnvironment(
      {
        ...commonEnvironment,
        CODEXFAST_APP_BUNDLE: discoveredDir,
        CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: queryOutput,
      },
      () => {
        const context = createCodexfastContext(discoveredDir);
        const result = getPlatformAdapter(context.platform).checkRequirements(
          context,
          SUPPORTED_APP_VERSIONS,
        );
        if (result.ok) {
          fail(`expected ${label} to fail closed`);
        }
        assertContains(
          result.messages.join("\n"),
          expectedMessage,
          `expected ${label} to report its verified metadata boundary`,
        );
      },
    );
  };

  assertMetadataDriftRejected(
    "a same-name package with the wrong PackageFamilyName",
    packageQueryOutput({
      installLocation: discoveredDir,
      packageVersion: "26.803.5235.0",
      applicationFamilyName: "OpenAI.Codex_wrongpublisher",
    }),
    "PackageFamilyName mismatch",
  );
  assertMetadataDriftRejected(
    "a package with the wrong PublisherId",
    packageQueryOutput({
      installLocation: discoveredDir,
      packageVersion: "26.803.5235.0",
      publisherId: "wrongpublisher",
    }),
    "PublisherId mismatch",
  );
  assertMetadataDriftRejected(
    "a package with the wrong PackageFullName",
    packageQueryOutput({
      installLocation: discoveredDir,
      packageVersion: "26.803.5235.0",
      packageFullName:
        "OpenAI.Codex_26.803.5235.0_x64__differentpublisher",
    }),
    "PackageFullName mismatch",
  );
  assertMetadataDriftRejected(
    "a package without a Store signature",
    packageQueryOutput({
      installLocation: discoveredDir,
      packageVersion: "26.803.5235.0",
      signatureKind: "Developer",
    }),
    "SignatureKind mismatch",
  );
  assertMetadataDriftRejected(
    "a manifest identity name drift",
    packageQueryOutput({
      installLocation: discoveredDir,
      packageVersion: "26.803.5235.0",
      manifestIdentityName: "OpenAI.Codex.Preview",
    }),
    "manifest identity mismatch",
  );
  assertMetadataDriftRejected(
    "a manifest version drift",
    packageQueryOutput({
      installLocation: discoveredDir,
      packageVersion: "26.803.5235.0",
      manifestVersion: "26.803.5234.0",
    }),
    "MSIX version mismatch",
  );
  assertMetadataDriftRejected(
    "a manifest architecture drift",
    packageQueryOutput({
      installLocation: discoveredDir,
      packageVersion: "26.803.5235.0",
      manifestProcessorArchitecture: "arm64",
    }),
    "MSIX architecture mismatch",
  );
  for (const applicationDrift of [
    { label: "Application Id", options: { applicationId: "CodexDesktop" } },
    { label: "Application executable", options: { executable: "app\\Other.exe" } },
    { label: "Application entry point", options: { entryPoint: "Windows.App" } },
  ]) {
    assertMetadataDriftRejected(
      `a manifest ${applicationDrift.label} drift`,
      packageQueryOutput({
        installLocation: discoveredDir,
        packageVersion: "26.803.5235.0",
        ...applicationDrift.options,
      }),
      "verified Application Id=App",
    );
  }

  const arm64Dir = join(options.tmpDir, "arm64 Windows package", "OpenAI.Codex");
  prepareFakeWindowsMsixApp({
    appDir: arm64Dir,
    processorArchitecture: "arm64",
  });
  withEnvironment(
    {
      ...commonEnvironment,
      CODEXFAST_APP_BUNDLE: arm64Dir,
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: arm64Dir,
        packageVersion: "26.803.5235.0",
        architecture: "arm64",
      }),
    },
    () => {
      const context = createCodexfastContext(arm64Dir);
      const result = getPlatformAdapter(context.platform).checkRequirements(
        context,
        SUPPORTED_APP_VERSIONS,
      );
      if (!result.ok) {
        fail("expected the arm64 fixture metadata to be readable", result.messages.join("\n"));
      }
      assertEqual(context.metadata.compatibilityKey, "win32:arm64:26.803.5235+0", "expected Windows admission to remain architecture-specific");
      if (context.metadata.supported) {
        fail("expected the unvalidated arm64 package to remain fail-closed");
      }
    },
  );

  const driftedManifestDir = join(options.tmpDir, "drifted Windows manifest", "OpenAI.Codex");
  prepareFakeWindowsMsixApp({
    appDir: driftedManifestDir,
    applicationId: "CodexDesktop",
  });
  withEnvironment(
    {
      ...commonEnvironment,
      CODEXFAST_APP_BUNDLE: driftedManifestDir,
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: driftedManifestDir,
        packageVersion: "26.803.5235.0",
        applicationId: "CodexDesktop",
      }),
    },
    () => {
      const context = createCodexfastContext(driftedManifestDir);
      const result = getPlatformAdapter(context.platform).checkRequirements(
        context,
        SUPPORTED_APP_VERSIONS,
      );
      if (result.ok) {
        fail("expected a drifted MSIX Application Id to fail closed");
      }
      assertContains(result.messages.join("\n"), "verified Application Id=App", "expected manifest drift to identify the exact verified entry point contract");
    },
  );

  withEnvironment(
    {
      ...commonEnvironment,
      CODEXFAST_APP_BUNDLE: discoveredDir,
      CODEXFAST_APP_USER_MODEL_ID:
        "OpenAI.Codex_2p2nqsd0c76g0!App;Write-Host injected",
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: discoveredDir,
        packageVersion: "26.803.5235.0",
      }),
    },
    () => {
      const context = createCodexfastContext(discoveredDir);
      const result = getPlatformAdapter(context.platform).checkRequirements(
        context,
        SUPPORTED_APP_VERSIONS,
      );
      if (result.ok) {
        fail("expected a shell-shaped AUMID override to fail closed");
      }
      assertContains(
        result.messages.join("\n"),
        "application identity could not be resolved",
        "expected user-supplied AUMIDs to be validated before activation",
      );
    },
  );
}

function runUnknownWindowsBuildFailClosedCheck(options: WindowsPlatformSuiteOptions): void {
  const windowsDir = join(options.tmpDir, "unknown Windows build", "用户", "OpenAI.Codex");
  const packageVersion = "26.803.41515.6321";
  prepareFakeWindowsMsixApp({ appDir: windowsDir, packageVersion });

  const stubBin = join(options.tmpDir, "windows-unsupported-bin");
  const markerFile = join(options.tmpDir, "windows-unsupported-native-tools.log");
  const outputFile = join(options.tmpDir, "windows-unsupported-output.txt");
  setupStubs(stubBin, markerFile);
  runScript({
    rootDir: options.rootDir,
    stubBin,
    appDir: windowsDir,
    input: "",
    outputFile,
    args: ["launch"],
    extraEnv: {
      CODEXFAST_TEST_PLATFORM: "win32",
      CODEXFAST_TEST_ALLOW_NONZERO: "1",
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: windowsDir,
        packageVersion,
      }),
    },
  });

  const output = readOutput(outputFile);
  assertContains(output, "Compatibility: unsupported", "expected an unverified Windows package version to remain unsupported");
  assertContains(output, "Runtime launch is blocked", "expected an unknown Windows package version to fail closed before launch");
  assertContains(output, "Offline-validated experimental candidates:", "expected Windows admission output not to describe experimental candidates as supported versions");
  assertNotContains(output, "Supported versions:", "expected Windows admission output to reserve supported wording for real-machine-supported builds");
  assertContains(output, "Exit code: 1", "expected an unknown Windows package version to return exit code 1");
  const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
  assertEqual(countLinesStartingWith(powershellLog, "args="), 1, "expected unknown-build validation to query package metadata without activating the app");
  assertContains(powershellLog, /^aumid=$/mu, "expected unknown-build validation not to perform packaged activation");
  assertNoTasklistCalls(markerFile, outputFile);
  assertNoTaskkillCalls(markerFile, outputFile);
  assertNoLaunchctlCalls(markerFile, outputFile);
  assertNoPgrepCalls(markerFile, outputFile);
}

function runWindowsRequiredTargetsFailClosedCheck(
  options: WindowsPlatformSuiteOptions,
): void {
  const windowsDir = join(options.tmpDir, "Windows required targets", "OpenAI.Codex");
  const packageVersion = "26.803.5235.0";
  prepareFakeWindowsMsixApp({ appDir: windowsDir, packageVersion });

  const stubBin = join(options.tmpDir, "windows-required-targets-bin");
  const markerFile = join(options.tmpDir, "windows-required-targets-native-tools.log");
  const outputFile = join(options.tmpDir, "windows-required-targets-output.txt");
  setupStubs(stubBin, markerFile);
  runScript({
    rootDir: options.rootDir,
    stubBin,
    appDir: windowsDir,
    input: "",
    outputFile,
    args: ["launch"],
    extraEnv: {
      CODEXFAST_TEST_PLATFORM: "win32",
      CODEXFAST_TEST_ALLOW_NONZERO: "1",
      CODEXFAST_TEST_RUNTIME_LAUNCH_PENDING_TARGETS: "1",
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: windowsDir,
        packageVersion,
      }),
    },
  });

  const output = readOutput(outputFile);
  assertContains(output, "Compatibility: experimental", "expected the offline-validated x64 Windows MSIX build to pass the strict experimental gate without claiming full support");
  for (const requiredLabel of [
    "Speed service tier allowance",
    "Speed service tier request allowance",
    "Speed service tier conversation fallback",
    "Composer Intelligence Speed menu",
    "Fast slash command",
  ]) {
    assertContains(output, requiredLabel, `expected Windows initial interception to require ${requiredLabel}`);
  }
  assertNotContains(output, "Plugins access", "expected Windows initial interception not to require unvalidated Plugins targets");
  assertNotContains(output, "Disable automatic updates", "expected Windows initial interception not to require the macOS updater control");
  assertContains(output, "Exit code: 1", "expected missing Windows Fast targets to fail closed");

  const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
  assertEqual(countLinesStartingWith(powershellLog, "args="), 2, "expected the missing-targets flow to inspect the package and confirm the admitted executable is not already running without activating it");
  assertNoTasklistCalls(markerFile, outputFile);
  assertNoTaskkillCalls(markerFile, outputFile);
  assertNoLaunchctlCalls(markerFile, outputFile);
  assertNoPgrepCalls(markerFile, outputFile);
}

async function runWindowsSessionLossLaunchFlowCheck(
  options: WindowsPlatformSuiteOptions,
): Promise<void> {
  const windowsDir = join(options.tmpDir, "Windows session loss", "路径 with spaces", "OpenAI.Codex");
  const packageVersion = "26.803.5235.0";
  const applicationId = "App";
  prepareFakeWindowsMsixApp({
    appDir: windowsDir,
    packageVersion,
    applicationId,
  });

  const stubBin = join(options.tmpDir, "windows-session-loss-bin");
  const markerFile = join(options.tmpDir, "windows-session-loss-native-tools.log");
  const outputFile = join(options.tmpDir, "windows-session-loss-output.txt");
  const codexHome = join(options.tmpDir, "Windows session loss Codex Home");
  setupStubs(stubBin, markerFile);
  writeFileSync(outputFile, "");

  const compatibilityKey = "win32:x64:26.803.5235+0";
  const expectedExecutablePath = join(windowsDir, "app", "ChatGPT.exe");
  const capturedOutput: string[] = [];
  const originalConsoleLog = console.log;
  let exitCode = -1;
  await withEnvironmentAsync(
    {
      PATH: `${stubBin}:${process.env.PATH ?? ""}`,
      CODEXFAST_TEST_PLATFORM: "win32",
      CODEXFAST_APP_BUNDLE: windowsDir,
      CODEXFAST_APP_USER_MODEL_ID: undefined,
      CODEXFAST_APP_ARGUMENTS: undefined,
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: windowsDir,
        packageVersion,
      }),
      CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH: "1",
      CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
      CODEXFAST_TEST_RUNTIME_LAUNCH_SESSION_LOST: "1",
      CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
        pid: 8_452,
        executablePath: expectedExecutablePath,
      }),
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
        pid: 8_452,
        executablePath: expectedExecutablePath,
      }),
      CODEX_HOME: codexHome,
      NODE_OPTIONS: "--trace-warnings",
    },
    async () => {
      const context = createCodexfastContext(windowsDir);
      const adapter = getPlatformAdapter(context.platform);
      const requirementResult = adapter.checkRequirements(
        context,
        SUPPORTED_APP_VERSIONS,
      );
      if (!requirementResult.ok) {
        fail(
          "expected the Windows session-loss fixture to pass requirement discovery",
          requirementResult.messages.join("\n"),
        );
      }
      console.log = (...args: unknown[]) => {
        capturedOutput.push(args.map(String).join(" "));
      };
      try {
        exitCode = await runRuntimeLaunch({
          context,
          patcherSource: "",
          supportedAppVersionKeys: compatibilityKey,
          allocateDebugPort: async () => 45_678,
          printActionHeader: (action) => console.log(`Action: ${action}`),
          removeLegacyWatcherFiles: (removeOptions) =>
            createWatcherFlow({
              launchAgentFileName: "com.codexfast.watcher.plist",
              platform: context.platform,
            }).removeLegacyWatcherFiles(removeOptions),
        });
      } finally {
        console.log = originalConsoleLog;
      }
    },
  );

  writeFileSync(outputFile, capturedOutput.join("\n"));
  assertEqual(exitCode, 1, "expected a lost Windows runtime patch session to fail closed");
  const output = readOutput(outputFile);
  assertContains(output, "Runtime launch completed.", "expected the Windows test flow to activate before simulating session loss");
  assertContains(output, "Runtime patch session lost after 3 reconnect attempts:", "expected Windows session loss to report the bounded reconnect failure");
  assertContains(output, "The verified launched Codex process exited and no admitted-path Codex process remains.", "expected Windows session loss to report cleanup only after handle termination and exact-path confirmation succeed");
  assertContains(output, "Differently named Codex helper processes are outside this experimental cleanup check", "expected Windows session loss to state the bounded cleanup scope");
  assertNotContains(output, "will be closed", "expected Windows session loss not to promise cleanup before knowing its result");
  assertContains(output, "Exit code: 1", "expected Windows session loss to return exit code 1");

  const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
  assertEqual(countLinesStartingWith(powershellLog, "args="), 7, "expected session-loss flow to query the package, perform running/pre-launch snapshots, activate, verify cleanup identity, terminate through the handle guard, and confirm no verified-path process remains");
  assertContains(powershellLog, "app_arguments=--remote-debugging-port=", "expected session-loss activation to include the CDP port");
  assertContains(powershellLog, "--remote-debugging-address=127.0.0.1", "expected session-loss activation to stay loopback-only");
  assertNotContains(powershellLog, "main-process-hook.cjs", "expected Windows session-loss launch not to inject the macOS Sparkle hook");
  if (existsSync(join(codexHome, ".tmp", "codexfast", "main-process-hook.cjs"))) {
    fail("expected Windows session-loss launch not to write the macOS Sparkle hook");
  }

  assertNoTaskkillCalls(markerFile, outputFile);
  assertNoLaunchctlCalls(markerFile, outputFile);
  assertNoPgrepCalls(markerFile, outputFile);
}

async function runWindowsAsyncMonitorNonBlockingCheck(
  options: WindowsPlatformSuiteOptions,
): Promise<void> {
  const windowsDir = join(
    options.tmpDir,
    "Windows async monitor",
    "OpenAI.Codex",
  );
  const packageVersion = "26.803.5235.0";
  prepareFakeWindowsMsixApp({ appDir: windowsDir, packageVersion });
  const stubBin = join(options.tmpDir, "windows-async-monitor-bin");
  const markerFile = join(
    options.tmpDir,
    "windows-async-monitor-native-tools.log",
  );
  const expectedExecutablePath = join(windowsDir, "app", "ChatGPT.exe");
  setupStubs(stubBin, markerFile);

  await withEnvironmentAsync(
    {
      PATH: `${stubBin}:${process.env.PATH ?? ""}`,
      CODEXFAST_TEST_PLATFORM: "win32",
      CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH: "1",
      CODEXFAST_TEST_WINDOWS_PROCESS_MONITOR: "1",
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: windowsDir,
        packageVersion,
      }),
      CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
        pid: 8_460,
        executablePath: expectedExecutablePath,
      }),
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
        pid: 8_460,
        executablePath: expectedExecutablePath,
      }),
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_DELAY_SECONDS: "1",
    },
    async () => {
      const context = createCodexfastContext(windowsDir);
      const adapter = getPlatformAdapter(context.platform);
      const admission = adapter.checkRequirements(
        context,
        SUPPORTED_APP_VERSIONS,
      );
      if (!admission.ok) {
        fail(
          "expected async-monitor fixture package metadata to pass admission",
          admission.messages.join("\n"),
        );
      }
      const launched = adapter.launchCodexProcess(context, 45_680);
      const startedAt = Date.now();
      await new Promise<void>((resolve) => setTimeout(resolve, 1_100));
      const elapsedMs = Date.now() - startedAt;
      launched.stopMonitoring();
      await launched.exited;
      if (elapsedMs >= 1_700) {
        fail(
          "expected Windows process monitoring not to block the CDP event loop",
          `1.1 second timer fired after ${String(elapsedMs)} ms while the identity stub slept for 1 second`,
        );
      }
    },
  );
}

async function runWindowsStartupMonitorFailureCheck(
  options: WindowsPlatformSuiteOptions,
): Promise<void> {
  const windowsDir = join(
    options.tmpDir,
    "Windows startup monitor failure",
    "OpenAI.Codex",
  );
  const packageVersion = "26.803.5235.0";
  prepareFakeWindowsMsixApp({ appDir: windowsDir, packageVersion });
  const stubBin = join(options.tmpDir, "windows-startup-monitor-failure-bin");
  const markerFile = join(
    options.tmpDir,
    "windows-startup-monitor-failure-native-tools.log",
  );
  const outputFile = join(
    options.tmpDir,
    "windows-startup-monitor-failure-output.txt",
  );
  const expectedExecutablePath = join(windowsDir, "app", "ChatGPT.exe");
  const compatibilityKey = "win32:x64:26.803.5235+0";
  const capturedOutput: string[] = [];
  const unhandledRejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => {
    unhandledRejections.push(reason);
  };
  const originalConsoleLog = console.log;
  let exitCode = -1;
  setupStubs(stubBin, markerFile);
  process.on("unhandledRejection", onUnhandledRejection);
  const startedAt = Date.now();
  try {
    await withEnvironmentAsync(
      {
        PATH: `${stubBin}:${process.env.PATH ?? ""}`,
        CODEXFAST_TEST_PLATFORM: "win32",
        CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH: "1",
        CODEXFAST_TEST_WINDOWS_PROCESS_MONITOR: "1",
        CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
          installLocation: windowsDir,
          packageVersion,
        }),
        CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
          pid: 8_461,
          executablePath: expectedExecutablePath,
        }),
        CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: "",
        CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_STDERR:
          "simulated CIM monitor failure",
        CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_STATUS: "5",
      },
      async () => {
        const context = createCodexfastContext(windowsDir);
        const adapter = getPlatformAdapter(context.platform);
        const admission = adapter.checkRequirements(
          context,
          SUPPORTED_APP_VERSIONS,
        );
        if (!admission.ok) {
          fail(
            "expected startup-monitor fixture package metadata to pass admission",
            admission.messages.join("\n"),
          );
        }
        console.log = (...args: unknown[]) => {
          capturedOutput.push(args.map(String).join(" "));
        };
        try {
          exitCode = await runRuntimeLaunch({
            context,
            patcherSource: "",
            supportedAppVersionKeys: compatibilityKey,
            allocateDebugPort: async () => 45_681,
            printActionHeader: (action) => console.log(`Action: ${action}`),
            removeLegacyWatcherFiles: () => true,
          });
        } finally {
          console.log = originalConsoleLog;
        }
      },
    );
    await new Promise<void>((resolve) => setImmediate(resolve));
  } finally {
    process.removeListener("unhandledRejection", onUnhandledRejection);
    console.log = originalConsoleLog;
  }
  const elapsedMs = Date.now() - startedAt;
  writeFileSync(outputFile, capturedOutput.join("\n"));
  assertEqual(exitCode, 1, "expected startup monitor failure to fail closed");
  if (elapsedMs >= 3_000) {
    fail(
      "expected startup monitor failure to interrupt bounded CDP startup promptly",
      `elapsed ${String(elapsedMs)} ms`,
    );
  }
  assertEqual(
    unhandledRejections.length,
    0,
    "expected startup monitor rejection to be handled immediately",
  );
  const output = readOutput(outputFile);
  assertContains(
    output,
    "Runtime launch failed: Cannot monitor packaged Codex process:",
    "expected monitor failure to reach the normal runtime-launch error path",
  );
  assertContains(
    output,
    "Fail-closed cleanup could not be confirmed. Fully quit Codex manually before retrying.",
    "expected an unavailable cleanup identity query to require manual recovery",
  );
  assertNotContains(
    output,
    "UnhandledPromiseRejection",
    "expected no unhandled rejection diagnostics",
  );
  assertNoTaskkillCalls(markerFile, outputFile);
}

async function runWindowsEarlyExitBeforePatchChecks(
  options: WindowsPlatformSuiteOptions,
): Promise<void> {
  for (const simulatedExitCode of [0, 1]) {
    const caseRoot = join(
      options.tmpDir,
      `Windows early exit ${String(simulatedExitCode)}`,
    );
    const windowsDir = join(caseRoot, "OpenAI.Codex");
    const packageVersion = "26.803.5235.0";
    prepareFakeWindowsMsixApp({ appDir: windowsDir, packageVersion });
    const stubBin = join(caseRoot, "bin");
    const markerFile = join(caseRoot, "native-tools.log");
    const outputFile = join(caseRoot, "output.txt");
    const expectedExecutablePath = join(windowsDir, "app", "ChatGPT.exe");
    const capturedOutput: string[] = [];
    const originalConsoleLog = console.log;
    let exitCode = -1;
    setupStubs(stubBin, markerFile);

    await withEnvironmentAsync(
      {
        PATH: `${stubBin}:${process.env.PATH ?? ""}`,
        CODEXFAST_TEST_PLATFORM: "win32",
        CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH: "1",
        CODEXFAST_TEST_RUNTIME_PROCESS_EXIT_CODE: String(simulatedExitCode),
        CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
          installLocation: windowsDir,
          packageVersion,
        }),
        CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
          pid: 8_470 + simulatedExitCode,
          executablePath: expectedExecutablePath,
        }),
      },
      async () => {
        const context = createCodexfastContext(windowsDir);
        const adapter = getPlatformAdapter(context.platform);
        const admission = adapter.checkRequirements(
          context,
          SUPPORTED_APP_VERSIONS,
        );
        if (!admission.ok) {
          fail(
            "expected early-exit fixture package metadata to pass admission",
            admission.messages.join("\n"),
          );
        }
        console.log = (...args: unknown[]) => {
          capturedOutput.push(args.map(String).join(" "));
        };
        try {
          exitCode = await runRuntimeLaunch({
            context,
            patcherSource: "",
            supportedAppVersionKeys: "win32:x64:26.803.5235+0",
            allocateDebugPort: async () => 45_690 + simulatedExitCode,
            printActionHeader: (action) => console.log(`Action: ${action}`),
            removeLegacyWatcherFiles: () => true,
          });
        } finally {
          console.log = originalConsoleLog;
        }
      },
    );

    writeFileSync(outputFile, capturedOutput.join("\n"));
    assertEqual(
      exitCode,
      1,
      `expected process exit ${String(simulatedExitCode)} before patch attachment to fail closed`,
    );
    const output = readOutput(outputFile);
    assertContains(
      output,
      "Codex exited before runtime patching was established (original Windows exit code unavailable).",
      "expected early Windows process exit limitations to be reported",
    );
    assertNotContains(
      output,
      `exit code ${String(simulatedExitCode)}`,
      "expected the mapped Windows monitor value not to be presented as an original exit code",
    );
    assertNotContains(
      output,
      "Runtime launch completed.",
      "expected early process exit never to be reported as a successful patched session",
    );
    const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
    assertContains(
      powershellLog,
      "snapshot_purpose=termination-confirmation",
      "expected early root exit to confirm that no admitted-path process remains",
    );
    assertNoTaskkillCalls(markerFile, outputFile);
  }

  const residualCaseRoot = join(
    options.tmpDir,
    "Windows early root exit with residual process",
  );
  const windowsDir = join(residualCaseRoot, "OpenAI.Codex");
  const packageVersion = "26.803.5235.0";
  prepareFakeWindowsMsixApp({ appDir: windowsDir, packageVersion });
  const stubBin = join(residualCaseRoot, "bin");
  const markerFile = join(residualCaseRoot, "native-tools.log");
  const outputFile = join(residualCaseRoot, "output.txt");
  const expectedExecutablePath = join(windowsDir, "app", "ChatGPT.exe");
  const residualPid = 8_479;
  const capturedOutput: string[] = [];
  const originalConsoleLog = console.log;
  let exitCode = -1;
  setupStubs(stubBin, markerFile);

  await withEnvironmentAsync(
    {
      PATH: `${stubBin}:${process.env.PATH ?? ""}`,
      CODEXFAST_TEST_PLATFORM: "win32",
      CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH: "1",
      CODEXFAST_TEST_RUNTIME_PROCESS_EXIT_CODE: "0",
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: windowsDir,
        packageVersion,
      }),
      CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
        pid: 8_478,
        executablePath: expectedExecutablePath,
      }),
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: "null",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_OUTPUT:
        processIdentityOutput({
          pid: residualPid,
          executablePath: expectedExecutablePath,
        }),
    },
    async () => {
      const context = createCodexfastContext(windowsDir);
      const adapter = getPlatformAdapter(context.platform);
      const admission = adapter.checkRequirements(
        context,
        SUPPORTED_APP_VERSIONS,
      );
      if (!admission.ok) {
        fail(
          "expected residual-process fixture package metadata to pass admission",
          admission.messages.join("\n"),
        );
      }
      console.log = (...args: unknown[]) => {
        capturedOutput.push(args.map(String).join(" "));
      };
      try {
        exitCode = await runRuntimeLaunch({
          context,
          patcherSource: "",
          supportedAppVersionKeys: "win32:x64:26.803.5235+0",
          allocateDebugPort: async () => 45_699,
          printActionHeader: (action) => console.log(`Action: ${action}`),
          removeLegacyWatcherFiles: () => true,
        });
      } finally {
        console.log = originalConsoleLog;
      }
    },
  );

  writeFileSync(outputFile, capturedOutput.join("\n"));
  assertEqual(
    exitCode,
    1,
    "expected an early root exit with a residual admitted-path process to fail closed",
  );
  const output = readOutput(outputFile);
  assertContains(
    output,
    `verified-path process IDs ${String(residualPid)} remain after bounded polling`,
    "expected early-exit cleanup to report the residual admitted-path process",
  );
  assertContains(
    output,
    "Fail-closed cleanup could not be confirmed. Fully quit Codex manually before retrying.",
    "expected early-exit cleanup to require manual recovery when a residual process remains",
  );
  const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
  assertEqual(
    powershellLog.split("snapshot_purpose=termination-confirmation").length - 1,
    3,
    "expected residual-process cleanup to use bounded admitted-path polling",
  );
  assertNoTaskkillCalls(markerFile, outputFile);
}

async function runWindowsPostReadyRootExitChecks(
  options: WindowsPlatformSuiteOptions,
): Promise<void> {
  const runCase = async (
    name: string,
    residualPid: number | null,
  ): Promise<void> => {
    const caseRoot = join(options.tmpDir, name);
    const windowsDir = join(caseRoot, "OpenAI.Codex");
    const packageVersion = "26.803.5235.0";
    prepareFakeWindowsMsixApp({ appDir: windowsDir, packageVersion });
    const stubBin = join(caseRoot, "bin");
    const markerFile = join(caseRoot, "native-tools.log");
    const outputFile = join(caseRoot, "output.txt");
    const expectedExecutablePath = join(windowsDir, "app", "ChatGPT.exe");
    const capturedOutput: string[] = [];
    const originalConsoleLog = console.log;
    const activationPid = 8_480;
    let exitCode = -1;
    setupStubs(stubBin, markerFile);

    await withEnvironmentAsync(
      {
        PATH: `${stubBin}:${process.env.PATH ?? ""}`,
        CODEXFAST_TEST_PLATFORM: "win32",
        CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH: "1",
        CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
        CODEXFAST_TEST_RUNTIME_PROCESS_EXIT_AFTER_SESSION_READY: "1",
        CODEXFAST_TEST_RUNTIME_PROCESS_EXIT_CODE: "0",
        CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
          installLocation: windowsDir,
          packageVersion,
        }),
        CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
          pid: activationPid,
          executablePath: expectedExecutablePath,
        }),
        CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_OUTPUT:
          residualPid === null
            ? "[]"
            : processIdentityOutput({
              pid: residualPid,
              executablePath: expectedExecutablePath,
            }),
      },
      async () => {
        const context = createCodexfastContext(windowsDir);
        const adapter = getPlatformAdapter(context.platform);
        const admission = adapter.checkRequirements(
          context,
          SUPPORTED_APP_VERSIONS,
        );
        if (!admission.ok) {
          fail(
            "expected post-ready root-exit fixture package metadata to pass admission",
            admission.messages.join("\n"),
          );
        }
        console.log = (...args: unknown[]) => {
          capturedOutput.push(args.map(String).join(" "));
        };
        try {
          exitCode = await runRuntimeLaunch({
            context,
            patcherSource: "",
            supportedAppVersionKeys: "win32:x64:26.803.5235+0",
            allocateDebugPort: async () => 45_700,
            printActionHeader: (action) => console.log(`Action: ${action}`),
            removeLegacyWatcherFiles: () => true,
          });
        } finally {
          console.log = originalConsoleLog;
        }
      },
    );

    writeFileSync(outputFile, capturedOutput.join("\n"));
    const output = readOutput(outputFile);
    assertContains(
      output,
      "Runtime launch completed.",
      "expected the post-ready root-exit fixture to establish the simulated patched session first",
    );
    const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
    assertNotContains(
      powershellLog,
      "operation=verified-termination",
      "expected normal root-exit confirmation to remain read-only",
    );
    if (residualPid === null) {
      assertEqual(
        exitCode,
        0,
        "expected a confirmed post-ready root disappearance with no admitted-path process to return success",
      );
      assertContains(
        output,
        "Exit code: 0",
        "expected a confirmed clean root exit to complete normally",
      );
      assertEqual(
        powershellLog.split("snapshot_purpose=termination-confirmation")
          .length - 1,
        1,
        "expected a clean post-ready root exit to confirm the admitted path once",
      );
    } else {
      assertEqual(
        exitCode,
        1,
        "expected a post-ready root exit with a residual admitted-path process to fail closed",
      );
      assertContains(
        output,
        `verified-path process IDs ${String(residualPid)} remain after bounded polling`,
        "expected post-ready root-exit confirmation to report the residual admitted-path process",
      );
      assertContains(
        output,
        "Fail-closed cleanup could not be confirmed. Fully quit Codex manually before retrying.",
        "expected a residual post-ready process to require manual recovery",
      );
      assertContains(
        output,
        "Exit code: 1",
        "expected a residual post-ready process to return a nonzero exit code",
      );
      assertEqual(
        powershellLog.split("snapshot_purpose=termination-confirmation")
          .length - 1,
        3,
        "expected residual post-ready root-exit confirmation to use bounded polling",
      );
    }
    assertNoTaskkillCalls(markerFile, outputFile);
  };

  await runCase("Windows post-ready root exit clean", null);
  await runCase("Windows post-ready root exit residual", 8_481);
}

async function runWindowsMonitorIdentityDriftChecks(
  options: WindowsPlatformSuiteOptions,
): Promise<void> {
  const cases = [
    {
      name: "Windows monitor PID reuse",
      monitoredStartTimeUtcTicks: "638900000000000999",
      monitoredExecutablePath: null,
      expectedMessage: "process start time changed, so the PID may have been reused",
    },
    {
      name: "Windows monitor path drift",
      monitoredStartTimeUtcTicks: "638900000000000101",
      monitoredExecutablePath: join(
        options.tmpDir,
        "windows-monitor-identity-drift",
        "unrelated",
        "ChatGPT.exe",
      ),
      expectedMessage: "executable path changed",
    },
  ];

  for (const testCase of cases) {
    const caseRoot = join(options.tmpDir, testCase.name);
    const windowsDir = join(caseRoot, "OpenAI.Codex");
    const packageVersion = "26.803.5235.0";
    prepareFakeWindowsMsixApp({ appDir: windowsDir, packageVersion });
    const stubBin = join(caseRoot, "bin");
    const markerFile = join(caseRoot, "native-tools.log");
    const outputFile = join(caseRoot, "output.txt");
    const expectedExecutablePath = join(windowsDir, "app", "ChatGPT.exe");
    const activationPid = 8_482;
    const capturedOutput: string[] = [];
    const originalConsoleLog = console.log;
    let exitCode = -1;
    setupStubs(stubBin, markerFile);

    await withEnvironmentAsync(
      {
        PATH: `${stubBin}:${process.env.PATH ?? ""}`,
        CODEXFAST_TEST_PLATFORM: "win32",
        CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH: "1",
        CODEXFAST_TEST_WINDOWS_PROCESS_MONITOR: "1",
        CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
        CODEXFAST_TEST_RUNTIME_PROCESS_EXIT_AFTER_SESSION_READY: "1",
        CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
          installLocation: windowsDir,
          packageVersion,
        }),
        CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
          pid: activationPid,
          executablePath: expectedExecutablePath,
          startTimeUtcTicks: "638900000000000101",
        }),
        CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
          pid: activationPid,
          executablePath: testCase.monitoredExecutablePath ??
            expectedExecutablePath,
          startTimeUtcTicks: testCase.monitoredStartTimeUtcTicks,
        }),
      },
      async () => {
        const context = createCodexfastContext(windowsDir);
        const adapter = getPlatformAdapter(context.platform);
        const admission = adapter.checkRequirements(
          context,
          SUPPORTED_APP_VERSIONS,
        );
        if (!admission.ok) {
          fail(
            `expected ${testCase.name} fixture package metadata to pass admission`,
            admission.messages.join("\n"),
          );
        }
        console.log = (...args: unknown[]) => {
          capturedOutput.push(args.map(String).join(" "));
        };
        try {
          exitCode = await runRuntimeLaunch({
            context,
            patcherSource: "",
            supportedAppVersionKeys: "win32:x64:26.803.5235+0",
            allocateDebugPort: async () => 45_701,
            printActionHeader: (action) => console.log(`Action: ${action}`),
            removeLegacyWatcherFiles: () => true,
          });
        } finally {
          console.log = originalConsoleLog;
        }
      },
    );

    writeFileSync(outputFile, capturedOutput.join("\n"));
    assertEqual(
      exitCode,
      1,
      `expected ${testCase.name} to fail closed instead of accepting identity drift as a clean exit`,
    );
    const output = readOutput(outputFile);
    assertContains(
      output,
      testCase.expectedMessage,
      `expected ${testCase.name} to report the identity drift`,
    );
    assertContains(
      output,
      "Fail-closed cleanup could not be confirmed. Fully quit Codex manually before retrying.",
      `expected ${testCase.name} to require manual recovery`,
    );
    const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
    assertNotContains(
      powershellLog,
      "operation=verified-termination",
      `expected ${testCase.name} not to terminate a drifted identity`,
    );
    assertNoTaskkillCalls(markerFile, outputFile);
  }
}

async function runWindowsHandleTerminationFailureStopsMonitorCheck(
  options: WindowsPlatformSuiteOptions,
): Promise<void> {
  const windowsDir = join(
    options.tmpDir,
    "Windows handle termination failure",
    "OpenAI.Codex",
  );
  const packageVersion = "26.803.5235.0";
  prepareFakeWindowsMsixApp({ appDir: windowsDir, packageVersion });
  const stubBin = join(options.tmpDir, "windows-handle-termination-failure-bin");
  const markerFile = join(
    options.tmpDir,
    "windows-handle-termination-failure-native-tools.log",
  );
  const outputFile = join(
    options.tmpDir,
    "windows-handle-termination-failure-output.txt",
  );
  const expectedExecutablePath = join(windowsDir, "app", "ChatGPT.exe");
  const compatibilityKey = "win32:x64:26.803.5235+0";
  const capturedOutput: string[] = [];
  const originalConsoleLog = console.log;
  let exitCode = -1;
  setupStubs(stubBin, markerFile);

  await withEnvironmentAsync(
    {
      PATH: `${stubBin}:${process.env.PATH ?? ""}`,
      CODEXFAST_TEST_PLATFORM: "win32",
      CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH: "1",
      CODEXFAST_TEST_WINDOWS_PROCESS_MONITOR: "1",
      CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS: "1",
      CODEXFAST_TEST_RUNTIME_LAUNCH_SESSION_LOST: "1",
      CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
        installLocation: windowsDir,
        packageVersion,
      }),
      CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
        pid: 8_462,
        executablePath: expectedExecutablePath,
      }),
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
        pid: 8_462,
        executablePath: expectedExecutablePath,
      }),
      CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_STATUS: "1",
      CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_STDERR:
        "simulated native handle termination failure",
    },
    async () => {
      const context = createCodexfastContext(windowsDir);
      const adapter = getPlatformAdapter(context.platform);
      const admission = adapter.checkRequirements(
        context,
        SUPPORTED_APP_VERSIONS,
      );
      if (!admission.ok) {
        fail(
          "expected handle-termination-failure fixture package metadata to pass admission",
          admission.messages.join("\n"),
        );
      }
      console.log = (...args: unknown[]) => {
        capturedOutput.push(args.map(String).join(" "));
      };
      try {
        exitCode = await runRuntimeLaunch({
          context,
          patcherSource: "",
          supportedAppVersionKeys: compatibilityKey,
          allocateDebugPort: async () => 45_682,
          printActionHeader: (action) => console.log(`Action: ${action}`),
          removeLegacyWatcherFiles: () => true,
        });
      } finally {
        console.log = originalConsoleLog;
      }
    },
  );

  const powershellLogBeforeWait = readFileSync(
    `${markerFile}.powershell`,
    "utf8",
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 1_200));
  const powershellLogAfterWait = readFileSync(
    `${markerFile}.powershell`,
    "utf8",
  );
  writeFileSync(outputFile, capturedOutput.join("\n"));
  assertEqual(exitCode, 1, "expected native handle termination failure to fail closed");
  assertEqual(
    powershellLogAfterWait,
    powershellLogBeforeWait,
    "expected native handle termination failure to stop the recurring Windows process monitor",
  );
  const output = readOutput(outputFile);
  assertContains(
    output,
    "simulated native handle termination failure",
    "expected native handle termination failure details to be reported",
  );
  assertContains(
    output,
    "Fail-closed cleanup could not be confirmed. Fully quit Codex manually before relaunching.",
    "expected session loss not to claim cleanup after native handle termination fails",
  );
  assertNotContains(
    output,
    "The verified launched Codex process exited",
    "expected failed native handle termination not to report successful cleanup",
  );
}

function runWindowsProcessIdentityFailClosedChecks(
  options: WindowsPlatformSuiteOptions,
): void {
  const packageVersion = "26.803.5235.0";
  type WindowsAdapter = ReturnType<typeof getPlatformAdapter>;
  const withCase = (
    caseName: string,
    extraEnvironment: Record<string, string | undefined>,
    callback: (fixture: {
      adapter: WindowsAdapter;
      context: CodexfastContext;
      executablePath: string;
      markerFile: string;
      outputFile: string;
    }) => void,
  ): void => {
    const caseRoot = join(options.tmpDir, "windows-process-safety", caseName);
    const packageRoot = join(caseRoot, "OpenAI.Codex");
    const executablePath = join(packageRoot, "app", "ChatGPT.exe");
    const stubBin = join(caseRoot, "bin");
    const markerFile = join(caseRoot, "native-tools.log");
    const outputFile = join(caseRoot, "output.txt");
    setupStubs(stubBin, markerFile);
    writeFileSync(outputFile, "");
    withEnvironment(
      {
        PATH: `${stubBin}:${process.env.PATH ?? ""}`,
        CODEXFAST_TEST_PLATFORM: "win32",
        CODEXFAST_APP_BUNDLE: packageRoot,
        CODEXFAST_APP_USER_MODEL_ID: undefined,
        CODEXFAST_APP_ARGUMENTS: undefined,
        CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH: "1",
        CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT: packageQueryOutput({
          installLocation: packageRoot,
          packageVersion,
        }),
        CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_BEFORE_OUTPUT: "[]",
        CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_OUTPUT: "[]",
        CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
          pid: 9_101,
          executablePath,
          startTimeUtcTicks: "638900000000000101",
        }),
        CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
          pid: 9_101,
          executablePath,
          startTimeUtcTicks: "638900000000000101",
        }),
        ...extraEnvironment,
      },
      () => {
        const context = createCodexfastContext(packageRoot);
        const adapter = getPlatformAdapter(context.platform);
        const admission = adapter.checkRequirements(
          context,
          SUPPORTED_APP_VERSIONS,
        );
        if (!admission.ok) {
          fail(
            `expected ${caseName} fixture package metadata to pass admission`,
            admission.messages.join("\n"),
          );
        }
        callback({
          adapter,
          context,
          executablePath,
          markerFile,
          outputFile,
        });
      },
    );
  };

  const expectLaunchFailure = (
    adapter: WindowsAdapter,
    context: CodexfastContext,
  ): string => {
    try {
      adapter.launchCodexProcess(context, 45_679);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    fail("expected Windows packaged activation to fail closed");
  };

  withCase(
    "pid-reuse",
    {
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
        pid: 9_101,
        executablePath: join(
          options.tmpDir,
          "windows-process-safety",
          "pid-reuse",
          "OpenAI.Codex",
          "app",
          "ChatGPT.exe",
        ),
        startTimeUtcTicks: "638900000000000999",
      }),
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const launched = adapter.launchCodexProcess(context, 45_679);
      const termination = adapter.terminateRuntimeLaunchProcess(launched);
      if (termination.ok) {
        fail("expected PID reuse to block handle-scoped termination");
      }
      assertContains(termination.message, "start time changed", "expected cleanup to identify PID reuse through creation time");
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "path-drift",
    {
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
        pid: 9_101,
        executablePath: join(options.tmpDir, "unrelated", "ChatGPT.exe"),
        startTimeUtcTicks: "638900000000000101",
      }),
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const launched = adapter.launchCodexProcess(context, 45_679);
      const termination = adapter.terminateRuntimeLaunchProcess(launched);
      if (termination.ok) {
        fail("expected executable-path drift to block handle-scoped termination");
      }
      assertContains(termination.message, "executable path changed", "expected cleanup to identify executable identity drift");
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "identity-query-failure",
    {
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: "",
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_STDERR: "CIM identity query failed",
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_STATUS: "5",
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const launched = adapter.launchCodexProcess(context, 45_679);
      const termination = adapter.terminateRuntimeLaunchProcess(launched);
      if (termination.ok) {
        fail("expected an unavailable process identity to block handle-scoped termination");
      }
      assertContains(termination.message, "process identity query failed", "expected cleanup to fail closed when identity revalidation is unavailable");
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "activation-predates-attempt",
    {
      CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: processIdentityOutput({
        pid: 9_101,
        executablePath: join(
          options.tmpDir,
          "windows-process-safety",
          "activation-predates-attempt",
          "OpenAI.Codex",
          "app",
          "ChatGPT.exe",
        ),
        startTimeUtcTicks: "638900000000000100",
        activationStartedUtcTicks: "638900000000000200",
      }),
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const message = expectLaunchFailure(adapter, context);
      assertContains(
        message,
        "predates this activation attempt",
        "expected an older single-instance PID not to become authoritative",
      );
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "missing-root-with-residual",
    {
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: "null",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_OUTPUT:
        JSON.stringify([
          {
            Pid: 9_106,
            StartTimeUtcTicks: "638900000000000106",
            ExecutablePath: join(
              options.tmpDir,
              "windows-process-safety",
              "missing-root-with-residual",
              "OpenAI.Codex",
              "app",
              "ChatGPT.exe",
            ),
          },
        ]),
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const launched = adapter.launchCodexProcess(context, 45_679);
      const termination = adapter.terminateRuntimeLaunchProcess(launched);
      if (termination.ok) {
        fail(
          "expected a missing root PID with a verified-path residual process to remain unconfirmed",
        );
      }
      assertContains(
        termination.message,
        "verified-path process IDs 9106 remain",
        "expected residual exact-path processes to block cleanup confirmation",
      );
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "post-handle-termination-verification-failure",
    {
      CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_POST_TERMINATE_STATUS: "9",
      CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_POST_TERMINATE_STDERR:
        "verified process remained running after handle termination",
    },
    ({ adapter, context, markerFile }) => {
      const launched = adapter.launchCodexProcess(context, 45_679);
      const termination = adapter.terminateRuntimeLaunchProcess(launched);
      if (termination.ok) {
        fail(
          "expected post-termination process verification failure to remain fail closed",
        );
      }
      assertContains(
        termination.message,
        "verified process remained running after handle termination",
        "expected post-handle-termination verification failure to be retained",
      );
      const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
      assertContains(
        powershellLog,
        "operation=verified-termination",
        "expected the simulated post-termination verification failure to occur inside the native handle helper",
      );
    },
  );

  withCase(
    "invalid-activation-json",
    {
      CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: "{invalid-json",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_OUTPUT: JSON.stringify([
        {
          Pid: 9_102,
          StartTimeUtcTicks: "638900000000000102",
          ExecutablePath: join(
            options.tmpDir,
            "windows-process-safety",
            "invalid-activation-json",
            "OpenAI.Codex",
            "app",
            "ChatGPT.exe",
          ),
        },
      ]),
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
        pid: 9_102,
        executablePath: join(
          options.tmpDir,
          "windows-process-safety",
          "invalid-activation-json",
          "OpenAI.Codex",
          "app",
          "ChatGPT.exe",
        ),
        startTimeUtcTicks: "638900000000000102",
      }),
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const message = expectLaunchFailure(adapter, context);
      assertContains(message, "activation failed", "expected malformed activation output to fail closed");
      assertContains(message, "possible residual verified-path process IDs 9102", "expected snapshot-only process discovery to be reported as a possible residual");
      assertContains(message, "snapshot-only identities were not terminated", "expected a missing authoritative activation PID to prohibit termination");
      assertContains(message, "Fully quit Codex manually before retrying", "expected unconfirmed activation cleanup to give a safe manual recovery action");
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "activation-nonzero",
    {
      CODEXFAST_TEST_WINDOWS_ACTIVATION_STATUS: "7",
      CODEXFAST_TEST_WINDOWS_ACTIVATION_STDERR: "activation helper failed",
    },
    ({ adapter, context, markerFile }) => {
      const message = expectLaunchFailure(adapter, context);
      assertContains(message, "activation helper failed", "expected the PowerShell activation failure to be preserved");
      const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
      assertContains(powershellLog, "operation=verified-termination", "expected a valid identity from nonzero activation output to be cleaned up through the native handle helper");
    },
  );

  withCase(
    "missing-pid-empty-polls",
    {
      CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: "{invalid-json",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_OUTPUT: "[]",
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const startedAt = process.hrtime.bigint();
      const message = expectLaunchFailure(adapter, context);
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      if (elapsedMs < 180) {
        fail(
          "expected activation-failure polling to use real bounded intervals",
          `elapsed ${elapsedMs.toFixed(1)} ms`,
        );
      }
      assertContains(message, "empty snapshots cannot confirm cleanup", "expected empty snapshots without an authoritative PID to remain unconfirmed");
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "transient-post-snapshot-failure",
    {
      CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: "{invalid-json",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_1_STATUS: "5",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_2_STATUS: "5",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_OUTPUT: JSON.stringify([
        {
          Pid: 9_105,
          StartTimeUtcTicks: "638900000000000105",
          ExecutablePath: join(
            options.tmpDir,
            "windows-process-safety",
            "transient-post-snapshot-failure",
            "OpenAI.Codex",
            "app",
            "ChatGPT.exe",
          ),
        },
      ]),
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
        pid: 9_105,
        executablePath: join(
          options.tmpDir,
          "windows-process-safety",
          "transient-post-snapshot-failure",
          "OpenAI.Codex",
          "app",
          "ChatGPT.exe",
        ),
        startTimeUtcTicks: "638900000000000105",
      }),
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const message = expectLaunchFailure(adapter, context);
      assertContains(message, "possible residual verified-path process IDs 9105", "expected the final successful retry to identify the possible residual without treating it as authoritative");
      assertContains(message, "cleanup cannot be confirmed", "expected snapshot-only recovery to remain explicitly unconfirmed");
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "activation-timeout",
    {
      CODEXFAST_TEST_WINDOWS_POWERSHELL_TIMEOUT_MS: "50",
      CODEXFAST_TEST_WINDOWS_ACTIVATION_DELAY_SECONDS: "0.2",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_OUTPUT: JSON.stringify([
        {
          Pid: 9_103,
          StartTimeUtcTicks: "638900000000000103",
          ExecutablePath: join(
            options.tmpDir,
            "windows-process-safety",
            "activation-timeout",
            "OpenAI.Codex",
            "app",
            "ChatGPT.exe",
          ),
        },
      ]),
      CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT: processIdentityOutput({
        pid: 9_103,
        executablePath: join(
          options.tmpDir,
          "windows-process-safety",
          "activation-timeout",
          "OpenAI.Codex",
          "app",
          "ChatGPT.exe",
        ),
        startTimeUtcTicks: "638900000000000103",
      }),
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const message = expectLaunchFailure(adapter, context);
      assertContains(message, "ETIMEDOUT", "expected a timed-out activation helper to report the timeout");
      assertContains(message, "possible residual verified-path process IDs 9103", "expected timeout recovery to report the newly observed process as a possible residual");
      assertContains(message, "snapshot-only identities were not terminated", "expected timeout recovery without an authoritative PID not to kill snapshot-only processes");
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "unverified-post-snapshot-path",
    {
      CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: "{invalid-json",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_OUTPUT: JSON.stringify([
        {
          Pid: 9_104,
          StartTimeUtcTicks: "638900000000000104",
          ExecutablePath: join(options.tmpDir, "unrelated", "ChatGPT.exe"),
        },
      ]),
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const message = expectLaunchFailure(adapter, context);
      assertContains(message, "Fail-closed cleanup could not be confirmed", "expected an unverified post-snapshot process to remain untouched and visible in the error");
      assertContains(message, "unverified executable path", "expected cleanup to explain the rejected executable path");
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "post-snapshot-query-failure",
    {
      CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT: "{invalid-json",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_OUTPUT: "",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_STATUS: "5",
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const message = expectLaunchFailure(adapter, context);
      assertContains(message, "Fail-closed cleanup could not be confirmed", "expected post-failure snapshot errors to be explicit");
      assertContains(message, "process snapshot query failed", "expected snapshot query failure details to be retained");
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );

  withCase(
    "pre-snapshot-query-failure",
    {
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_BEFORE_OUTPUT: "",
      CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_BEFORE_STATUS: "5",
    },
    ({ adapter, context, markerFile, outputFile }) => {
      const message = expectLaunchFailure(adapter, context);
      assertContains(message, "activation was not attempted", "expected a missing pre-launch snapshot to block activation");
      const powershellLog = readFileSync(`${markerFile}.powershell`, "utf8");
      assertNotContains(powershellLog, "operation=activation", "expected snapshot failure to prevent activation entirely");
      assertNoTaskkillCalls(markerFile, outputFile);
    },
  );
}

export async function runWindowsPlatformSuite(
  options: WindowsPlatformSuiteOptions,
): Promise<void> {
  runWindowsRuntimePatchProfileCheck();
  runWindowsManifestAndAdapterChecks(options);
  runWindowsDiscoveryAndAdmissionChecks(options);
  runUnknownWindowsBuildFailClosedCheck(options);
  runWindowsRequiredTargetsFailClosedCheck(options);
  runWindowsProcessIdentityFailClosedChecks(options);
  await runWindowsAsyncMonitorNonBlockingCheck(options);
  await runWindowsEarlyExitBeforePatchChecks(options);
  await runWindowsPostReadyRootExitChecks(options);
  await runWindowsMonitorIdentityDriftChecks(options);
  await runWindowsStartupMonitorFailureCheck(options);
  await runWindowsSessionLossLaunchFlowCheck(options);
  await runWindowsHandleTerminationFailureStopsMonitorCheck(options);
}
