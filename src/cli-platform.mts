import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join, normalize } from "node:path";
import type {
  AppPaths,
  CodexfastContext,
  CodexfastPlatform,
} from "./cli-context.mts";
import { childEnvWithAutomaticUpdateSetting } from "./cli-update-settings.mts";
import {
  asError,
  debugRuntime,
  printLine,
  resolveCommand,
  resolvePlistBuddy,
  run,
} from "./cli-utils.mts";

export type CodexRunningCheck =
  | { ok: true; running: boolean }
  | { ok: false; message: string };

export type PlatformRequirementResult =
  | { ok: true }
  | { ok: false; messages: string[] };

export type RuntimeLaunchProcess = {
  pid: number | null;
  child: ChildProcess | null;
  exited: Promise<number>;
  stopMonitoring: () => void;
  terminated: boolean;
  windowsIdentity: WindowsLaunchProcessIdentity | null;
};

export type RuntimeLaunchTerminationResult =
  | { ok: true }
  | { ok: false; message: string };

export type WindowsAppxManifestApplication = {
  id: string;
  executable: string;
  entryPoint: string;
};

export type WindowsAppxManifestMetadata = {
  identityName: string;
  version: string;
  processorArchitecture: string;
  applications: WindowsAppxManifestApplication[];
};

export type CodexfastPlatformAdapter = {
  platform: CodexfastPlatform;
  createAppPaths: (appBundle: string) => AppPaths;
  checkRequirements: (
    context: CodexfastContext,
    supportedAppVersions: Record<string, string>,
  ) => PlatformRequirementResult;
  checkCodexRunning: (context: CodexfastContext) => CodexRunningCheck;
  launchCodexProcess: (
    context: CodexfastContext,
    debugPort: number,
  ) => RuntimeLaunchProcess;
  terminateRuntimeLaunchProcess: (
    launched: RuntimeLaunchProcess,
  ) => RuntimeLaunchTerminationResult;
  confirmRuntimeLaunchProcessExited: (
    launched: RuntimeLaunchProcess,
  ) => RuntimeLaunchTerminationResult;
};

type WindowsInstalledPackage = {
  name: string;
  fullName: string;
  familyName: string;
  publisherId: string;
  signatureKind: string;
  architecture: string;
  installLocation: string;
  version: string;
  manifest: WindowsAppxManifestMetadata;
};

type WindowsProcessIdentity = {
  pid: number;
  startTimeUtcTicks: string;
  executablePath: string;
};

type WindowsActivationProcessIdentity = WindowsProcessIdentity & {
  activationStartedUtcTicks: string;
};

export type WindowsLaunchProcessIdentity = WindowsActivationProcessIdentity & {
  expectedExecutablePath: string;
  packageInstallLocation: string;
  packageFullName: string;
};

type WindowsPowerShellResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  error: Error | null;
};

type CancellableWindowsPowerShellResult = {
  result: Promise<WindowsPowerShellResult>;
  cancel: () => void;
};

type WindowsProcessMonitor = {
  exited: Promise<number>;
  stopMonitoring: () => void;
};

type WindowsProcessSnapshotPurpose =
  | "running-check"
  | "pre-launch"
  | "activation-failure"
  | "termination-confirmation";

const windowsPowerShellCommandTimeoutMs = 15_000;
const windowsActivationCleanupPollAttempts = 3;
const windowsActivationCleanupPollIntervalMs = 75;
const windowsActivationCleanupPollSignal = new Int32Array(
  new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT),
);
const windowsPackageName = "OpenAI.Codex";
const windowsVerifiedPackageFamilyName = "OpenAI.Codex_2p2nqsd0c76g0";
const windowsVerifiedPublisherId = "2p2nqsd0c76g0";
const windowsVerifiedSignatureKind = "Store";
const windowsVerifiedApplicationId = "App";
const windowsVerifiedExecutableRelativePath = join("app", "ChatGPT.exe");
const windowsVerifiedEntryPoint = "Windows.FullTrustApplication";
const windowsExecutableRelativePaths = [windowsVerifiedExecutableRelativePath];

export function runtimePlatform(
  env: NodeJS.ProcessEnv = process.env,
  detectedPlatform: NodeJS.Platform = process.platform,
): CodexfastPlatform {
  const testPlatform = env.CODEXFAST_TEST_PLATFORM?.trim();
  if (testPlatform === "darwin" || testPlatform === "win32") {
    return testPlatform;
  }
  if (detectedPlatform === "darwin" || detectedPlatform === "win32") {
    return detectedPlatform;
  }
  return "unsupported";
}

function createMacAppPaths(appBundle: string): AppPaths {
  return {
    bundle: appBundle,
    resources: join(appBundle, "Contents", "Resources"),
    infoPlist: join(appBundle, "Contents", "Info.plist"),
    appxManifest: null,
    executableCandidates: [
      join(appBundle, "Contents", "MacOS", "Codex"),
      join(appBundle, "Contents", "MacOS", "ChatGPT"),
    ],
  };
}

function createWindowsAppPaths(packageRoot: string): AppPaths {
  return {
    bundle: packageRoot,
    resources: join(packageRoot, "app", "resources"),
    infoPlist: null,
    appxManifest: join(packageRoot, "AppxManifest.xml"),
    executableCandidates: windowsExecutableRelativePaths.map((relativePath) =>
      join(packageRoot, relativePath)
    ),
  };
}

function createUnsupportedAppPaths(appBundle: string): AppPaths {
  return {
    bundle: appBundle,
    resources: appBundle,
    infoPlist: null,
    appxManifest: null,
    executableCandidates: [],
  };
}

export function createPlatformAppPaths(
  platform: CodexfastPlatform,
  appBundle: string,
): AppPaths {
  if (platform === "darwin") {
    return createMacAppPaths(appBundle);
  }
  if (platform === "win32") {
    return createWindowsAppPaths(appBundle);
  }
  return createUnsupportedAppPaths(appBundle);
}

export function resolveDefaultAppBundle(platform: CodexfastPlatform): string {
  if (platform === "darwin") {
    if (existsSync("/Applications/Codex.app")) {
      return "/Applications/Codex.app";
    }
    if (existsSync("/Applications/ChatGPT.app")) {
      return "/Applications/ChatGPT.app";
    }
    return "/Applications/Codex.app";
  }
  // Windows package discovery is performed during requirement checks so that
  // discovery failures can be reported precisely and fail closed.
  return "";
}

function readXmlAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/gu;
  for (const match of tag.matchAll(pattern)) {
    const fullName = match[1];
    const localName = fullName.includes(":")
      ? fullName.slice(fullName.lastIndexOf(":") + 1)
      : fullName;
    attributes.set(localName.toLowerCase(), match[3]);
  }
  return attributes;
}

export function parseWindowsAppxManifest(
  source: string,
): WindowsAppxManifestMetadata | null {
  const identityTag = /<(?:[A-Za-z_][\w.-]*:)?Identity\b[^>]*>/iu.exec(
    source,
  )?.[0];
  if (!identityTag) {
    return null;
  }
  const identityAttributes = readXmlAttributes(identityTag);
  const identityName = identityAttributes.get("name")?.trim() ?? "";
  const version = identityAttributes.get("version")?.trim() ?? "";
  const processorArchitecture =
    identityAttributes.get("processorarchitecture")?.trim().toLowerCase() ??
    "";
  if (!identityName || !version || !processorArchitecture) {
    return null;
  }

  const applications: WindowsAppxManifestApplication[] = [];
  const applicationPattern = /<(?:[A-Za-z_][\w.-]*:)?Application\b[^>]*>/giu;
  for (const match of source.matchAll(applicationPattern)) {
    const attributes = readXmlAttributes(match[0]);
    const id = attributes.get("id")?.trim() ?? "";
    const executable = attributes.get("executable")?.trim() ?? "";
    const entryPoint = attributes.get("entrypoint")?.trim() ?? "";
    if (id && executable && entryPoint) {
      applications.push({ id, executable, entryPoint });
    }
  }
  return { identityName, version, processorArchitecture, applications };
}

function canonicalWindowsPath(value: string): string {
  return normalize(value)
    .replace(/[\\/]+$/u, "")
    .replace(/\\/gu, "/")
    .toLowerCase();
}

function windowsPathsMatch(left: string, right: string): boolean {
  return canonicalWindowsPath(left) === canonicalWindowsPath(right);
}

function windowsPowerShellPath(): string | null {
  return resolveCommand("powershell.exe") ?? resolveCommand("pwsh.exe");
}

function runWindowsPowerShellEncoded(
  source: string,
  env: NodeJS.ProcessEnv = process.env,
): WindowsPowerShellResult {
  const shell = windowsPowerShellPath();
  if (!shell) {
    throw new Error(
      "PowerShell was not found. The Microsoft Store/MSIX Codex package cannot be inspected or activated.",
    );
  }
  const testTimeout = env.CODEXFAST_TEST_PLATFORM === "win32"
    ? Number.parseInt(
      env.CODEXFAST_TEST_WINDOWS_POWERSHELL_TIMEOUT_MS ?? "",
      10,
    )
    : Number.NaN;
  const timeout = Number.isSafeInteger(testTimeout) && testTimeout > 0
    ? testTimeout
    : windowsPowerShellCommandTimeoutMs;
  const encodedCommand = Buffer.from(source, "utf16le").toString("base64");
  const result = spawnSync(
    shell,
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand],
    {
      encoding: "utf8",
      timeout,
      windowsHide: true,
      env,
    },
  );
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? asError(result.error) : null,
  };
}

function runWindowsPowerShellEncodedAsync(
  source: string,
  env: NodeJS.ProcessEnv = process.env,
): CancellableWindowsPowerShellResult {
  const shell = windowsPowerShellPath();
  if (!shell) {
    throw new Error(
      "PowerShell was not found. The Microsoft Store/MSIX Codex package cannot be monitored.",
    );
  }
  const testTimeout = env.CODEXFAST_TEST_PLATFORM === "win32"
    ? Number.parseInt(
      env.CODEXFAST_TEST_WINDOWS_POWERSHELL_TIMEOUT_MS ?? "",
      10,
    )
    : Number.NaN;
  const timeoutMs = Number.isSafeInteger(testTimeout) && testTimeout > 0
    ? testTimeout
    : windowsPowerShellCommandTimeoutMs;
  const encodedCommand = Buffer.from(source, "utf16le").toString("base64");
  const child = spawn(
    shell,
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand],
    {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env,
    },
  );
  let stdout = "";
  let stderr = "";
  let processError: Error | null = null;
  let settled = false;
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr?.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const result = new Promise<WindowsPowerShellResult>((resolve) => {
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      const error = new Error(
        `PowerShell process monitoring timed out after ${String(timeoutMs)} ms.`,
      ) as Error & { code?: string };
      error.code = "ETIMEDOUT";
      processError = error;
      child.kill();
    }, timeoutMs);
    child.once("error", (error) => {
      processError = asError(error);
    });
    child.once("close", (status) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({
        status,
        stdout,
        stderr,
        error: processError,
      });
    });
  });
  return {
    result,
    cancel: () => {
      if (!settled) {
        child.kill();
      }
    },
  };
}

export function windowsPackageQueryPowerShellSource(): string {
  return [
    "$ErrorActionPreference='Stop'",
    "$packages=@(Get-AppxPackage -Name 'OpenAI.Codex' | Sort-Object Version -Descending)",
    "$result=@()",
    "foreach($package in $packages){",
    "$manifest=Get-AppxPackageManifest -Package $package.PackageFullName",
    "$applications=@()",
    "foreach($application in @($manifest.Package.Applications.Application)){",
    "$applications += [PSCustomObject]@{",
    "Id=[string]$application.Id;",
    "Executable=[string]$application.Executable;",
    "EntryPoint=[string]$application.EntryPoint",
    "}",
    "}",
    "$result += [PSCustomObject]@{",
    "Name=[string]$package.Name;",
    "PackageFullName=[string]$package.PackageFullName;",
    "PackageFamilyName=[string]$package.PackageFamilyName;",
    "PublisherId=[string]$package.PublisherId;",
    "SignatureKind=[string]$package.SignatureKind;",
    "Architecture=[string]$package.Architecture;",
    "InstallLocation=[string]$package.InstallLocation;",
    "Version=[string]$package.Version;",
    "ManifestIdentityName=[string]$manifest.Package.Identity.Name;",
    "ManifestVersion=[string]$manifest.Package.Identity.Version;",
    "ManifestProcessorArchitecture=[string]$manifest.Package.Identity.ProcessorArchitecture;",
    "Applications=$applications",
    "}",
    "}",
    "$json=ConvertTo-Json -InputObject $result -Depth 5 -Compress",
    "[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)",
    "[Console]::Out.Write($json)",
  ].join("\n");
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseWindowsApplications(
  value: unknown,
): WindowsAppxManifestApplication[] {
  const entries = Array.isArray(value) ? value : value == null ? [] : [value];
  const applications: WindowsAppxManifestApplication[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const id = asNonEmptyString(record.Id);
    const executable = asNonEmptyString(record.Executable);
    const entryPoint = asNonEmptyString(record.EntryPoint);
    if (id && executable && entryPoint) {
      applications.push({ id, executable, entryPoint });
    }
  }
  return applications;
}

function parseWindowsInstalledPackages(source: string): WindowsInstalledPackage[] {
  if (!source.trim()) {
    return [];
  }
  const parsed = JSON.parse(source.trim().replace(/^\uFEFF/u, "")) as unknown;
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const packages: WindowsInstalledPackage[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const name = asNonEmptyString(record.Name);
    const fullName = asNonEmptyString(record.PackageFullName);
    const familyName = asNonEmptyString(record.PackageFamilyName);
    const publisherId = asNonEmptyString(record.PublisherId);
    const signatureKind = asNonEmptyString(record.SignatureKind);
    const architecture = asNonEmptyString(record.Architecture);
    const installLocation = asNonEmptyString(record.InstallLocation);
    const version = asNonEmptyString(record.Version);
    const manifestIdentityName = asNonEmptyString(record.ManifestIdentityName);
    const manifestVersion = asNonEmptyString(record.ManifestVersion);
    const manifestProcessorArchitecture = asNonEmptyString(
      record.ManifestProcessorArchitecture,
    );
    const applications = parseWindowsApplications(record.Applications);
    if (
      name &&
      fullName &&
      familyName &&
      publisherId &&
      signatureKind &&
      architecture &&
      installLocation &&
      version &&
      manifestIdentityName &&
      manifestVersion &&
      manifestProcessorArchitecture
    ) {
      packages.push({
        name,
        fullName,
        familyName,
        publisherId,
        signatureKind,
        architecture: architecture.toLowerCase(),
        installLocation,
        version,
        manifest: {
          identityName: manifestIdentityName,
          version: manifestVersion,
          processorArchitecture: manifestProcessorArchitecture.toLowerCase(),
          applications,
        },
      });
    }
  }
  return packages;
}

function queryWindowsInstalledPackages(): WindowsInstalledPackage[] {
  let result: WindowsPowerShellResult;
  try {
    result = runWindowsPowerShellEncoded(
      windowsPackageQueryPowerShellSource(),
      {
        ...process.env,
        CODEXFAST_WINDOWS_OPERATION: "package-query",
      },
    );
  } catch (error) {
    throw new Error(
      `Microsoft Store/MSIX package lookup failed: ${asError(error).message}`,
    );
  }
  if (result.error) {
    throw new Error(
      `Microsoft Store/MSIX package lookup failed: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `Microsoft Store/MSIX package lookup failed: ${result.stderr.trim() || `PowerShell exited with code ${result.status}`}`,
    );
  }
  try {
    return parseWindowsInstalledPackages(result.stdout).filter(
      (entry) => entry.name === windowsPackageName,
    );
  } catch (error) {
    throw new Error(
      `Microsoft Store/MSIX package lookup returned invalid data: ${asError(error).message}`,
    );
  }
}

function windowsApplicationForManifest(
  manifest: WindowsAppxManifestMetadata,
): WindowsAppxManifestApplication | null {
  const expectedExecutable = windowsVerifiedExecutableRelativePath
    .replace(/\\/gu, "/")
    .toLowerCase();
  return manifest.applications.find((application) =>
    application.id === windowsVerifiedApplicationId &&
    application.executable.replace(/\\/gu, "/").toLowerCase() ===
      expectedExecutable &&
    application.entryPoint === windowsVerifiedEntryPoint
  ) ?? null;
}

function expectedWindowsPackageFullName(
  version: string,
  architecture: string,
): string {
  return `${windowsPackageName}_${version}_${architecture}__${windowsVerifiedPublisherId}`;
}

function isVerifiedWindowsPackageFullName(value: string): boolean {
  return /^OpenAI\.Codex_\d+\.\d+\.\d+\.\d+_x64__2p2nqsd0c76g0$/u.test(
    value,
  );
}

function isValidWindowsAppUserModelId(value: string): boolean {
  return /^[A-Za-z0-9.-]+_[A-Za-z0-9]+![A-Za-z0-9._-]+$/u.test(value);
}

function windowsVersionMetadata(
  packageVersion: string,
  architecture: string,
): {
  version: string;
  build: string;
  versionKey: string;
  compatibilityKey: string;
} | null {
  const match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/u.exec(packageVersion);
  if (!match) {
    return null;
  }
  const version = `${match[1]}.${match[2]}.${match[3]}`;
  const build = match[4];
  const versionKey = `${version}+${build}`;
  return {
    version,
    build,
    versionKey,
    compatibilityKey: `win32:${architecture}:${versionKey}`,
  };
}

function setUnsupportedMetadata(
  context: CodexfastContext,
  compatibilityKey: string,
): void {
  context.metadata.compatibilityKey = compatibilityKey;
  context.metadata.compatibility = "unsupported";
  context.metadata.supported = false;
}

function checkWindowsRequirements(
  context: CodexfastContext,
  supportedAppVersions: Record<string, string>,
): PlatformRequirementResult {
  const configuredBundle = context.paths.bundle.trim();
  const configuredAumid = process.env.CODEXFAST_APP_USER_MODEL_ID?.trim() ?? "";
  let installedPackages: WindowsInstalledPackage[];
  try {
    installedPackages = queryWindowsInstalledPackages();
  } catch (error) {
    return { ok: false, messages: [asError(error).message] };
  }
  if (installedPackages.length === 0) {
    return {
      ok: false,
      messages: [
        "OpenAI Codex Microsoft Store/MSIX package was not found.",
        "Install OpenAI Codex from the Microsoft Store and retry.",
      ],
    };
  }

  const installedPackage = configuredBundle
    ? installedPackages.find((entry) =>
      windowsPathsMatch(entry.installLocation, configuredBundle)
    ) ?? null
    : installedPackages.find((entry) =>
      entry.familyName === windowsVerifiedPackageFamilyName
    ) ?? installedPackages[0] ?? null;
  if (!installedPackage && configuredBundle) {
    return {
      ok: false,
      messages: [
        `The configured MSIX path is not the installed ${windowsPackageName} package: ${configuredBundle}`,
      ],
    };
  }
  if (!installedPackage) {
    return {
      ok: false,
      messages: [`The installed ${windowsPackageName} package could not be resolved.`],
    };
  }

  if (installedPackage.name !== windowsPackageName) {
    return {
      ok: false,
      messages: [`The package manager result is not ${windowsPackageName}.`],
    };
  }
  if (installedPackage.familyName !== windowsVerifiedPackageFamilyName) {
    return {
      ok: false,
      messages: [
        `MSIX PackageFamilyName mismatch: expected ${windowsVerifiedPackageFamilyName}, got ${installedPackage.familyName}.`,
      ],
    };
  }
  if (installedPackage.publisherId !== windowsVerifiedPublisherId) {
    return {
      ok: false,
      messages: [
        `MSIX PublisherId mismatch: expected ${windowsVerifiedPublisherId}, got ${installedPackage.publisherId}.`,
      ],
    };
  }
  const expectedFullName = expectedWindowsPackageFullName(
    installedPackage.version,
    installedPackage.architecture,
  );
  if (installedPackage.fullName !== expectedFullName) {
    return {
      ok: false,
      messages: [
        `MSIX PackageFullName mismatch: expected ${expectedFullName}, got ${installedPackage.fullName}.`,
      ],
    };
  }
  if (
    installedPackage.signatureKind.toLowerCase() !==
      windowsVerifiedSignatureKind.toLowerCase()
  ) {
    return {
      ok: false,
      messages: [
        `MSIX SignatureKind mismatch: expected ${windowsVerifiedSignatureKind}, got ${installedPackage.signatureKind}.`,
      ],
    };
  }

  const manifest = installedPackage.manifest;
  if (manifest.identityName !== windowsPackageName) {
    return {
      ok: false,
      messages: [
        `MSIX manifest identity mismatch: expected ${windowsPackageName}, got ${manifest.identityName}.`,
      ],
    };
  }
  const application = windowsApplicationForManifest(manifest);
  if (!application) {
    return {
      ok: false,
      messages: [
        "MSIX manifest metadata does not contain the verified Application Id=App, Executable=app/ChatGPT.exe, EntryPoint=Windows.FullTrustApplication entry point.",
      ],
    };
  }
  if (installedPackage.version !== manifest.version) {
    return {
      ok: false,
      messages: [
        `MSIX version mismatch: package manager reported ${installedPackage.version}, but the package manifest API reported ${manifest.version}.`,
      ],
    };
  }
  if (installedPackage.architecture !== manifest.processorArchitecture) {
    return {
      ok: false,
      messages: [
        `MSIX architecture mismatch: package manager reported ${installedPackage.architecture}, but the package manifest API reported ${manifest.processorArchitecture}.`,
      ],
    };
  }

  const versionMetadata = windowsVersionMetadata(
    manifest.version,
    manifest.processorArchitecture,
  );
  if (!versionMetadata) {
    return {
      ok: false,
      messages: [`Unsupported MSIX version format: ${manifest.version}`],
    };
  }
  context.metadata.version = versionMetadata.version;
  context.metadata.build = versionMetadata.build;
  context.metadata.versionKey = versionMetadata.versionKey;
  context.metadata.compatibilityKey = versionMetadata.compatibilityKey;

  const packageRoot = installedPackage.installLocation;
  context.paths = createWindowsAppPaths(packageRoot);

  const expectedAumid = `${installedPackage.familyName}!${application.id}`;
  const appUserModelId = configuredAumid || expectedAumid;
  if (
    !appUserModelId ||
    !isValidWindowsAppUserModelId(appUserModelId) ||
    appUserModelId !== expectedAumid
  ) {
    return {
      ok: false,
      messages: [
        `Microsoft Store/MSIX application identity could not be resolved to the verified AUMID ${expectedAumid}.`,
      ],
    };
  }

  context.windowsPackage = {
    name: windowsPackageName,
    fullName: installedPackage.fullName,
    familyName: installedPackage.familyName,
    architecture: manifest.processorArchitecture,
    installLocation: packageRoot,
    packageVersion: manifest.version,
    applicationId: application.id,
    appUserModelId,
  };

  const compatibility = supportedAppVersions[versionMetadata.compatibilityKey];
  if (!compatibility) {
    setUnsupportedMetadata(context, versionMetadata.compatibilityKey);
    return { ok: true };
  }
  context.metadata.supported = true;
  context.metadata.compatibility = `experimental (${compatibility})`;
  return { ok: true };
}

function readMacPlistValue(
  context: CodexfastContext,
  key: string,
  fallback = "unknown",
): string {
  if (!context.paths.infoPlist) {
    return fallback;
  }
  const result = run(context.toolchain.plistBuddy, [
    "-c",
    `Print :${key}`,
    context.paths.infoPlist,
  ]);
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function checkMacRequirements(
  context: CodexfastContext,
  supportedAppVersions: Record<string, string>,
): PlatformRequirementResult {
  if (!existsSync(context.paths.resources)) {
    return {
      ok: false,
      messages: [
        `Codex resources directory not found: ${context.paths.resources}`,
        `Make sure Codex.app is installed at ${context.paths.bundle}.`,
      ],
    };
  }
  context.toolchain.plistBuddy = resolvePlistBuddy() ?? "";
  if (!context.toolchain.plistBuddy) {
    return {
      ok: false,
      messages: [
        "PlistBuddy not found.",
        "This macOS environment cannot read Codex.app metadata.",
      ],
    };
  }

  context.metadata.version = readMacPlistValue(
    context,
    "CFBundleShortVersionString",
  );
  context.metadata.build = readMacPlistValue(context, "CFBundleVersion");
  context.metadata.versionKey =
    `${context.metadata.version}+${context.metadata.build}`;
  context.metadata.compatibilityKey = `darwin:${context.metadata.versionKey}`;
  const compatibility =
    supportedAppVersions[context.metadata.compatibilityKey] ??
    supportedAppVersions[context.metadata.versionKey];
  context.metadata.supported = compatibility != null;
  context.metadata.compatibility = compatibility
    ? `supported (${compatibility})`
    : "unsupported";
  return { ok: true };
}

function checkUnsupportedRequirements(): PlatformRequirementResult {
  return {
    ok: false,
    messages: ["codexfast supports macOS and Windows only."],
  };
}

function checkMacCodexRunning(): CodexRunningCheck {
  if (process.env.CODEXFAST_TEST_CODEX_RUNNING === "1") {
    return { ok: true, running: true };
  }
  const pgrepBin = resolveCommand("pgrep");
  if (!pgrepBin) {
    return {
      ok: false,
      message:
        "Cannot determine whether Codex.app is running because pgrep was not found.",
    };
  }
  for (const processName of ["Codex", "ChatGPT"]) {
    const result = run(pgrepBin, ["-x", processName]);
    if (result.status === 0) {
      return { ok: true, running: true };
    }
    if (result.status !== 1) {
      return {
        ok: false,
        message: `Cannot determine whether Codex.app is running because pgrep failed with exit code ${result.status}.`,
      };
    }
  }
  return { ok: true, running: false };
}

function checkWindowsCodexRunning(
  context: CodexfastContext,
): CodexRunningCheck {
  if (process.env.CODEXFAST_TEST_CODEX_RUNNING === "1") {
    return { ok: true, running: true };
  }
  const windowsPackage = context.windowsPackage;
  if (!windowsPackage) {
    return {
      ok: false,
      message:
        "Cannot determine whether Codex is running because the admitted Microsoft Store/MSIX package identity is unavailable.",
    };
  }
  const expectedExecutablePath = join(
    windowsPackage.installLocation,
    windowsVerifiedExecutableRelativePath,
  );
  try {
    const identities = queryWindowsProcessSnapshot(
      expectedExecutablePath,
      "running-check",
    );
    return { ok: true, running: identities.length > 0 };
  } catch (error) {
    return {
      ok: false,
      message: `Cannot determine whether the admitted Codex package is running: ${asError(error).message}`,
    };
  }
}

function waitForChildProcessExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exitCode: number): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(exitCode);
    };
    child.once("error", () => finish(1));
    child.once("exit", (code) => finish(code ?? 0));
  });
}

function launchMacCodexProcess(
  context: CodexfastContext,
  debugPort: number,
): RuntimeLaunchProcess {
  const executable = context.paths.executableCandidates.find((candidate) =>
    existsSync(candidate)
  );
  if (!executable) {
    throw new Error(
      `Codex executable not found: tried ${context.paths.executableCandidates.join(", ")}`,
    );
  }
  const child = spawn(
    executable,
    windowsCdpLaunchArguments(debugPort),
    {
      detached: true,
      stdio: "ignore",
      env: childEnvWithAutomaticUpdateSetting(),
    },
  );
  child.on("error", () => undefined);
  child.unref();
  return {
    pid: child.pid ?? null,
    child,
    exited: waitForChildProcessExit(child),
    stopMonitoring: () => undefined,
    terminated: false,
    windowsIdentity: null,
  };
}

function terminateMacRuntimeLaunchProcess(
  launched: RuntimeLaunchProcess,
): RuntimeLaunchTerminationResult {
  if (!launched.pid || launched.terminated) {
    return { ok: true };
  }
  launched.terminated = true;
  try {
    process.kill(-launched.pid, "SIGTERM");
  } catch {
    try {
      launched.child?.kill();
    } catch (error) {
      return { ok: false, message: asError(error).message };
    }
  }
  return { ok: true };
}

export function windowsCdpLaunchArguments(debugPort: number): string[] {
  if (!Number.isInteger(debugPort) || debugPort < 1 || debugPort > 65_535) {
    throw new Error(`Invalid CDP port: ${debugPort}`);
  }
  return [
    `--remote-debugging-port=${debugPort}`,
    "--remote-debugging-address=127.0.0.1",
  ];
}

export function windowsPackagedActivationPowerShellSource(): string {
  return String.raw`$ErrorActionPreference = 'Stop'
$activatedProcessId = 0
$activationStartedUtcTicks = ''
$source = @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

[ComImport, Guid("2e941141-7f97-4756-ba1d-9decde894a3d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IApplicationActivationManager
{
    [PreserveSig]
    int ActivateApplication(
        [MarshalAs(UnmanagedType.LPWStr)] string appUserModelId,
        [MarshalAs(UnmanagedType.LPWStr)] string arguments,
        UInt32 options,
        out UInt32 processId);
}

[ComImport, Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")]
class ApplicationActivationManager {}

public static class CodexfastPackagedAppActivator
{
    [DllImport(
        "shell32.dll",
        CharSet = CharSet.Unicode,
        ExactSpelling = true,
        SetLastError = true)]
    private static extern IntPtr CommandLineToArgvW(
        [MarshalAs(UnmanagedType.LPWStr)] string commandLine,
        out Int32 argumentCount);

    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr memory);

    public static UInt32 Activate(string appUserModelId, string arguments)
    {
        var manager = (IApplicationActivationManager)new ApplicationActivationManager();
        UInt32 processId;
        int result = manager.ActivateApplication(appUserModelId, arguments, 0, out processId);
        Marshal.ThrowExceptionForHR(result);
        return processId;
    }

    public static bool HasOnlyExpectedRemoteDebuggingArguments(
        string commandLine,
        string expectedPortArgument,
        string expectedAddressArgument)
    {
        if (String.IsNullOrWhiteSpace(commandLine) ||
            String.IsNullOrWhiteSpace(expectedPortArgument) ||
            String.IsNullOrWhiteSpace(expectedAddressArgument))
        {
            return false;
        }
        Int32 argumentCount;
        IntPtr arguments = CommandLineToArgvW(commandLine, out argumentCount);
        if (arguments == IntPtr.Zero)
        {
            throw new Win32Exception(
                Marshal.GetLastWin32Error(),
                "CommandLineToArgvW failed.");
        }
        try
        {
            bool sawPortArgument = false;
            bool sawAddressArgument = false;
            for (Int32 index = 0; index < argumentCount; index += 1)
            {
                IntPtr argument = Marshal.ReadIntPtr(
                    arguments,
                    checked(index * IntPtr.Size));
                string value = Marshal.PtrToStringUni(argument);
                if (String.Equals(
                    value,
                    expectedPortArgument,
                    StringComparison.Ordinal))
                {
                    if (sawPortArgument)
                    {
                        return false;
                    }
                    sawPortArgument = true;
                    continue;
                }
                if (String.Equals(
                    value,
                    expectedAddressArgument,
                    StringComparison.Ordinal))
                {
                    if (sawAddressArgument)
                    {
                        return false;
                    }
                    sawAddressArgument = true;
                    continue;
                }
                if (value != null && value.StartsWith(
                    "--remote-debugging-",
                    StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
            }
            return sawPortArgument && sawAddressArgument;
        }
        finally
        {
            LocalFree(arguments);
        }
    }
}
"@
try {
  Add-Type -TypeDefinition $source -Language CSharp
  $activationStartedUtcTicks = [string]([DateTime]::UtcNow.Ticks)
  $activatedProcessId = [CodexfastPackagedAppActivator]::Activate(
    $env:CODEXFAST_APP_USER_MODEL_ID,
    $env:CODEXFAST_APP_ARGUMENTS
  )
  $process = Get-Process -Id $activatedProcessId -ErrorAction Stop
  $cim = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f $activatedProcessId) -ErrorAction Stop |
    Select-Object -First 1
  if ($null -eq $cim -or [string]::IsNullOrWhiteSpace([string]$cim.ExecutablePath)) {
    throw 'Activated process executable path is unavailable.'
  }
  $commandLine = [string]$cim.CommandLine
  if (-not [CodexfastPackagedAppActivator]::HasOnlyExpectedRemoteDebuggingArguments(
    $commandLine,
    $env:CODEXFAST_EXPECTED_CDP_PORT_ARGUMENT,
    $env:CODEXFAST_EXPECTED_CDP_ADDRESS_ARGUMENT
  )) {
    throw 'Activated process command line does not contain only the current codexfast CDP launch arguments.'
  }
  $actualExecutablePath = [string]$cim.ExecutablePath
  if (-not [string]::Equals(
    $actualExecutablePath,
    $env:CODEXFAST_EXPECTED_EXECUTABLE_PATH,
    [StringComparison]::OrdinalIgnoreCase
  )) {
    throw 'Activated process executable path does not match the verified package executable.'
  }
  $processStartTimeUtcTicks = [string]($process.StartTime.ToUniversalTime().Ticks)
  if ([Int64]$processStartTimeUtcTicks -lt [Int64]$activationStartedUtcTicks) {
    throw 'Activated process predates this activation attempt.'
  }
  $identity = [PSCustomObject]@{
    Pid = [int]$activatedProcessId
    StartTimeUtcTicks = $processStartTimeUtcTicks
    ActivationStartedUtcTicks = $activationStartedUtcTicks
    ExecutablePath = $actualExecutablePath
  }
  $json = ConvertTo-Json -InputObject $identity -Compress
  [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
  [Console]::Out.Write($json)
} catch {
  [Console]::Error.Write([string]$_.Exception.Message)
  exit 1
}`;
}

export function windowsVerifiedTerminationPowerShellSource(): string {
  return String.raw`$ErrorActionPreference = 'Stop'
$source = @"
using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

public sealed class CodexfastVerifiedProcessHandle : IDisposable
{
    private const UInt32 PROCESS_TERMINATE = 0x0001;
    private const UInt32 PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
    private const UInt32 SYNCHRONIZE = 0x00100000;
    private const UInt32 WAIT_OBJECT_0 = 0x00000000;
    private const UInt32 WAIT_TIMEOUT = 0x00000102;
    private const UInt32 WAIT_FAILED = 0xFFFFFFFF;
    private const Int32 ERROR_INVALID_PARAMETER = 87;

    [StructLayout(LayoutKind.Sequential)]
    private struct FILETIME
    {
        public UInt32 Low;
        public UInt32 High;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(
        UInt32 desiredAccess,
        bool inheritHandle,
        UInt32 processId);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetProcessTimes(
        IntPtr process,
        out FILETIME creationTime,
        out FILETIME exitTime,
        out FILETIME kernelTime,
        out FILETIME userTime);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool QueryFullProcessImageName(
        IntPtr process,
        UInt32 flags,
        StringBuilder executablePath,
        ref UInt32 size);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern UInt32 WaitForSingleObject(IntPtr handle, UInt32 milliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateProcess(IntPtr process, UInt32 exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    private IntPtr handle;

    private CodexfastVerifiedProcessHandle(IntPtr handle)
    {
        this.handle = handle;
    }

    private static string NormalizePath(string value)
    {
        return Path.GetFullPath(value)
            .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
    }

    public static CodexfastVerifiedProcessHandle Open(
        Int32 processId,
        Int64 expectedStartTimeUtcTicks,
        string expectedExecutablePath)
    {
        IntPtr handle = OpenProcess(
            PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE,
            false,
            checked((UInt32)processId));
        if (handle == IntPtr.Zero)
        {
            Int32 error = Marshal.GetLastWin32Error();
            if (error == ERROR_INVALID_PARAMETER)
            {
                return null;
            }
            throw new Win32Exception(error, "OpenProcess failed.");
        }

        try
        {
            FILETIME creationTime;
            FILETIME exitTime;
            FILETIME kernelTime;
            FILETIME userTime;
            if (!GetProcessTimes(
                handle,
                out creationTime,
                out exitTime,
                out kernelTime,
                out userTime))
            {
                throw new Win32Exception(
                    Marshal.GetLastWin32Error(),
                    "GetProcessTimes failed.");
            }
            Int64 fileTime = ((Int64)creationTime.High << 32) | creationTime.Low;
            Int64 actualStartTimeUtcTicks = DateTime.FromFileTimeUtc(fileTime).Ticks;
            if (actualStartTimeUtcTicks != expectedStartTimeUtcTicks)
            {
                throw new InvalidOperationException(
                    "Process start time changed, so the PID may have been reused.");
            }

            UInt32 size = 32768;
            StringBuilder executablePath = new StringBuilder(checked((Int32)size));
            if (!QueryFullProcessImageName(handle, 0, executablePath, ref size))
            {
                throw new Win32Exception(
                    Marshal.GetLastWin32Error(),
                    "QueryFullProcessImageName failed.");
            }
            if (!String.Equals(
                NormalizePath(executablePath.ToString()),
                NormalizePath(expectedExecutablePath),
                StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Process executable path changed before termination.");
            }
            return new CodexfastVerifiedProcessHandle(handle);
        }
        catch
        {
            CloseHandle(handle);
            throw;
        }
    }

    public void Terminate()
    {
        UInt32 waitResult = WaitForSingleObject(handle, 0);
        if (waitResult == WAIT_OBJECT_0)
        {
            return;
        }
        if (waitResult == WAIT_FAILED)
        {
            throw new Win32Exception(
                Marshal.GetLastWin32Error(),
                "WaitForSingleObject failed before termination.");
        }
        if (waitResult != WAIT_TIMEOUT)
        {
            throw new InvalidOperationException(
                "Unexpected process wait result before termination.");
        }
        if (!TerminateProcess(handle, 1))
        {
            throw new Win32Exception(
                Marshal.GetLastWin32Error(),
                "TerminateProcess failed.");
        }
    }

    public bool WaitForExit(UInt32 milliseconds)
    {
        UInt32 result = WaitForSingleObject(handle, milliseconds);
        if (result == WAIT_OBJECT_0)
        {
            return true;
        }
        if (result == WAIT_TIMEOUT)
        {
            return false;
        }
        if (result == WAIT_FAILED)
        {
            throw new Win32Exception(
                Marshal.GetLastWin32Error(),
                "WaitForSingleObject failed.");
        }
        throw new InvalidOperationException("Unexpected process wait result.");
    }

    public void Dispose()
    {
        if (handle != IntPtr.Zero)
        {
            CloseHandle(handle);
            handle = IntPtr.Zero;
        }
    }
}
"@
Add-Type -TypeDefinition $source -Language CSharp
$processId = 0
$expectedStartTimeUtcTicks = 0L
if (-not [Int32]::TryParse($env:CODEXFAST_PROCESS_ID, [ref]$processId) -or $processId -le 0) {
  throw 'Requested process ID is invalid.'
}
if (-not [Int64]::TryParse($env:CODEXFAST_EXPECTED_START_TIME_UTC_TICKS, [ref]$expectedStartTimeUtcTicks) -or $expectedStartTimeUtcTicks -le 0) {
  throw 'Expected process start time is invalid.'
}
if ([string]::IsNullOrWhiteSpace($env:CODEXFAST_EXPECTED_EXECUTABLE_PATH)) {
  throw 'Expected executable path is unavailable.'
}
$guard = [CodexfastVerifiedProcessHandle]::Open(
  $processId,
  $expectedStartTimeUtcTicks,
  $env:CODEXFAST_EXPECTED_EXECUTABLE_PATH
)
if ($null -eq $guard) {
  exit 0
}
try {
  $guard.Terminate()
  if (-not $guard.WaitForExit(10000)) {
    throw 'Timed out waiting for the verified Codex process to exit.'
  }
} finally {
  $guard.Dispose()
}`;
}

export function windowsProcessIdentityPowerShellSource(): string {
  return String.raw`$ErrorActionPreference = 'Stop'
function Write-CodexfastJson([object]$value) {
  if ($null -eq $value) {
    $json = 'null'
  } else {
    $json = ConvertTo-Json -InputObject $value -Depth 3 -Compress
  }
  [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
  [Console]::Out.Write($json)
}

function Get-CodexfastProcessIdentity([object]$cim) {
  try {
    $process = Get-Process -Id ([int]$cim.ProcessId) -ErrorAction Stop
    return [PSCustomObject]@{
      Pid = [int]$cim.ProcessId
      StartTimeUtcTicks = [string]($process.StartTime.ToUniversalTime().Ticks)
      ExecutablePath = [string]$cim.ExecutablePath
    }
  } catch {
    $stillRunning = Get-Process -Id ([int]$cim.ProcessId) -ErrorAction SilentlyContinue
    if ($null -eq $stillRunning) {
      return $null
    }
    throw
  }
}

if ($env:CODEXFAST_WINDOWS_OPERATION -eq 'process-snapshot') {
  if ([string]::IsNullOrWhiteSpace($env:CODEXFAST_EXPECTED_EXECUTABLE_PATH)) {
    throw 'Expected executable path is unavailable.'
  }
  $result = @()
  foreach ($cim in @(Get-CimInstance Win32_Process -ErrorAction Stop)) {
    $path = [string]$cim.ExecutablePath
    if (
      -not [string]::IsNullOrWhiteSpace($path) -and
      [string]::Equals(
        $path,
        $env:CODEXFAST_EXPECTED_EXECUTABLE_PATH,
        [StringComparison]::OrdinalIgnoreCase
      )
    ) {
      $identity = Get-CodexfastProcessIdentity $cim
      if ($null -ne $identity) {
        $result += $identity
      }
    }
  }
  Write-CodexfastJson $result
  exit 0
}

if ($env:CODEXFAST_WINDOWS_OPERATION -eq 'process-identity') {
  $requestedPid = 0
  if (-not [int]::TryParse($env:CODEXFAST_PROCESS_ID, [ref]$requestedPid) -or $requestedPid -le 0) {
    throw 'Requested process ID is invalid.'
  }
  $cim = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f $requestedPid) -ErrorAction Stop |
    Select-Object -First 1
  if ($null -eq $cim) {
    Write-CodexfastJson $null
    exit 0
  }
  Write-CodexfastJson (Get-CodexfastProcessIdentity $cim)
  exit 0
}

throw 'Unsupported codexfast Windows process query operation.'`;
}

function parseWindowsProcessIdentityValue(
  value: unknown,
): WindowsProcessIdentity | null {
  if (value == null) {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("expected a process identity object");
  }
  const record = value as Record<string, unknown>;
  const pid = typeof record.Pid === "number" ? record.Pid : Number.NaN;
  const startTimeUtcTicks = asNonEmptyString(record.StartTimeUtcTicks);
  const executablePath = asNonEmptyString(record.ExecutablePath);
  if (
    !Number.isSafeInteger(pid) ||
    pid <= 0 ||
    !startTimeUtcTicks ||
    !/^\d+$/u.test(startTimeUtcTicks) ||
    !executablePath
  ) {
    throw new Error("process identity fields are invalid");
  }
  return { pid, startTimeUtcTicks, executablePath };
}

function parseWindowsProcessIdentityJson(source: string): WindowsProcessIdentity | null {
  if (!source.trim()) {
    throw new Error("PowerShell returned no process identity");
  }
  const parsed = JSON.parse(source.trim().replace(/^\uFEFF/u, "")) as unknown;
  return parseWindowsProcessIdentityValue(parsed);
}

function parseWindowsActivationProcessIdentityJson(
  source: string,
): WindowsActivationProcessIdentity | null {
  if (!source.trim()) {
    throw new Error("PowerShell returned no process identity");
  }
  const parsed = JSON.parse(source.trim().replace(/^\uFEFF/u, "")) as unknown;
  const identity = parseWindowsProcessIdentityValue(parsed);
  if (!identity) {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("expected an activation process identity object");
  }
  const activationStartedUtcTicks = asNonEmptyString(
    (parsed as Record<string, unknown>).ActivationStartedUtcTicks,
  );
  if (
    !activationStartedUtcTicks ||
    !/^\d+$/u.test(activationStartedUtcTicks)
  ) {
    throw new Error("activation start time is invalid");
  }
  return { ...identity, activationStartedUtcTicks };
}

function parseWindowsProcessSnapshotJson(source: string): WindowsProcessIdentity[] {
  if (!source.trim()) {
    throw new Error("PowerShell returned no process snapshot");
  }
  const parsed = JSON.parse(source.trim().replace(/^\uFEFF/u, "")) as unknown;
  const entries = Array.isArray(parsed) ? parsed : parsed == null ? [] : [parsed];
  return entries.map((entry) => {
    const identity = parseWindowsProcessIdentityValue(entry);
    if (!identity) {
      throw new Error("process snapshot contains a null identity");
    }
    return identity;
  });
}

function windowsPowerShellFailure(result: WindowsPowerShellResult): string | null {
  if (result.error) {
    return result.error.message;
  }
  if (result.status !== 0) {
    return result.stderr.trim() || result.stdout.trim() ||
      `PowerShell exited with code ${String(result.status)}`;
  }
  return null;
}

function queryWindowsProcessSnapshot(
  expectedExecutablePath: string,
  purpose: WindowsProcessSnapshotPurpose,
  attempt = 0,
): WindowsProcessIdentity[] {
  const result = runWindowsPowerShellEncoded(
    windowsProcessIdentityPowerShellSource(),
    {
      ...process.env,
      CODEXFAST_WINDOWS_OPERATION: "process-snapshot",
      CODEXFAST_EXPECTED_EXECUTABLE_PATH: expectedExecutablePath,
      CODEXFAST_WINDOWS_SNAPSHOT_PURPOSE: purpose,
      CODEXFAST_WINDOWS_SNAPSHOT_ATTEMPT: String(attempt),
    },
  );
  const failure = windowsPowerShellFailure(result);
  if (failure) {
    throw new Error(`process snapshot query failed: ${failure}`);
  }
  const identities = parseWindowsProcessSnapshotJson(result.stdout);
  for (const identity of identities) {
    if (!windowsPathsMatch(identity.executablePath, expectedExecutablePath)) {
      throw new Error(
        `process snapshot returned an unverified executable path for PID ${identity.pid}: ${identity.executablePath}`,
      );
    }
  }
  return identities;
}

function waitForWindowsActivationCleanupPoll(): void {
  Atomics.wait(
    windowsActivationCleanupPollSignal,
    0,
    0,
    windowsActivationCleanupPollIntervalMs,
  );
}

function queryWindowsProcessIdentity(pid: number): WindowsProcessIdentity | null {
  const result = runWindowsPowerShellEncoded(
    windowsProcessIdentityPowerShellSource(),
    {
      ...process.env,
      CODEXFAST_WINDOWS_OPERATION: "process-identity",
      CODEXFAST_PROCESS_ID: String(pid),
    },
  );
  const failure = windowsPowerShellFailure(result);
  if (failure) {
    throw new Error(`process identity query failed: ${failure}`);
  }
  return parseWindowsProcessIdentityJson(result.stdout);
}

function queryWindowsProcessIdentityAsync(pid: number): {
  result: Promise<WindowsProcessIdentity | null>;
  cancel: () => void;
} {
  const execution = runWindowsPowerShellEncodedAsync(
    windowsProcessIdentityPowerShellSource(),
    {
      ...process.env,
      CODEXFAST_WINDOWS_OPERATION: "process-identity",
      CODEXFAST_PROCESS_ID: String(pid),
    },
  );
  return {
    result: execution.result.then((result) => {
      const failure = windowsPowerShellFailure(result);
      if (failure) {
        throw new Error(`process identity query failed: ${failure}`);
      }
      return parseWindowsProcessIdentityJson(result.stdout);
    }),
    cancel: execution.cancel,
  };
}

function windowsProcessIdentityKey(identity: WindowsProcessIdentity): string {
  return `${identity.pid}:${identity.startTimeUtcTicks}:${canonicalWindowsPath(identity.executablePath)}`;
}

function createWindowsLaunchProcessIdentity(
  identity: WindowsActivationProcessIdentity,
  expectedExecutablePath: string,
  packageInstallLocation: string,
  packageFullName: string,
): WindowsLaunchProcessIdentity {
  const packageExecutablePath = join(
    packageInstallLocation,
    windowsVerifiedExecutableRelativePath,
  );
  if (!isVerifiedWindowsPackageFullName(packageFullName)) {
    throw new Error(
      `PackageFullName is not the verified x64 ${windowsPackageName} package: ${packageFullName}.`,
    );
  }
  if (!windowsPathsMatch(expectedExecutablePath, packageExecutablePath)) {
    throw new Error(
      "Verified executable path does not belong to the admitted MSIX install location.",
    );
  }
  if (!windowsPathsMatch(identity.executablePath, expectedExecutablePath)) {
    throw new Error(
      `Activated PID ${identity.pid} reported executable ${identity.executablePath}, expected ${expectedExecutablePath}.`,
    );
  }
  if (
    BigInt(identity.startTimeUtcTicks) <
      BigInt(identity.activationStartedUtcTicks)
  ) {
    throw new Error(
      `Activated PID ${identity.pid} predates this activation attempt.`,
    );
  }
  return {
    ...identity,
    expectedExecutablePath,
    packageInstallLocation,
    packageFullName,
  };
}

function confirmWindowsAdmittedPathProcessesExited(
  identity: WindowsLaunchProcessIdentity,
): RuntimeLaunchTerminationResult {
  let residualProcesses: WindowsProcessIdentity[] = [];
  for (
    let attempt = 1;
    attempt <= windowsActivationCleanupPollAttempts;
    attempt += 1
  ) {
    if (attempt > 1) {
      waitForWindowsActivationCleanupPoll();
    }
    try {
      residualProcesses = queryWindowsProcessSnapshot(
        identity.expectedExecutablePath,
        "termination-confirmation",
        attempt,
      );
    } catch (error) {
      return {
        ok: false,
        message: `Cannot confirm that verified launched Codex process ${identity.pid} and admitted-path processes exited: ${asError(error).message}`,
      };
    }
    if (residualProcesses.length === 0) {
      return { ok: true };
    }
  }
  return {
    ok: false,
    message: `Cannot confirm that verified launched Codex process ${identity.pid} and admitted-path processes exited: verified-path process IDs ${residualProcesses.map((processIdentity) => processIdentity.pid).join(", ")} remain after bounded polling.`,
  };
}

function terminateVerifiedWindowsProcess(
  identity: WindowsLaunchProcessIdentity,
): RuntimeLaunchTerminationResult {
  const packageExecutablePath = join(
    identity.packageInstallLocation,
    windowsVerifiedExecutableRelativePath,
  );
  if (
    !isVerifiedWindowsPackageFullName(identity.packageFullName) ||
    !windowsPathsMatch(identity.expectedExecutablePath, packageExecutablePath) ||
    !windowsPathsMatch(identity.executablePath, identity.expectedExecutablePath)
  ) {
    return {
      ok: false,
      message: `Refusing to close PID ${identity.pid}: recorded executable/package identity is invalid.`,
    };
  }

  let current: WindowsProcessIdentity | null;
  try {
    current = queryWindowsProcessIdentity(identity.pid);
  } catch (error) {
    return {
      ok: false,
      message: `Cannot safely close verified launched Codex process ${identity.pid}: ${asError(error).message}`,
    };
  }
  if (!current) {
    return confirmWindowsAdmittedPathProcessesExited(identity);
  }
  if (current.startTimeUtcTicks !== identity.startTimeUtcTicks) {
    return {
      ok: false,
      message: `Refusing to close PID ${identity.pid}: process start time changed, so the PID may have been reused.`,
    };
  }
  if (
    !windowsPathsMatch(current.executablePath, identity.executablePath) ||
    !windowsPathsMatch(current.executablePath, identity.expectedExecutablePath)
  ) {
    return {
      ok: false,
      message: `Refusing to close PID ${identity.pid}: executable path changed to ${current.executablePath}.`,
    };
  }

  const result = runWindowsPowerShellEncoded(
    windowsVerifiedTerminationPowerShellSource(),
    {
      ...process.env,
      CODEXFAST_WINDOWS_OPERATION: "verified-termination",
      CODEXFAST_PROCESS_ID: String(identity.pid),
      CODEXFAST_EXPECTED_START_TIME_UTC_TICKS: identity.startTimeUtcTicks,
      CODEXFAST_EXPECTED_EXECUTABLE_PATH: identity.expectedExecutablePath,
    },
  );
  const failure = windowsPowerShellFailure(result);
  if (failure) {
    return {
      ok: false,
      message: `Failed to close verified launched Codex process ${identity.pid}: ${failure}`,
    };
  }
  return confirmWindowsAdmittedPathProcessesExited(identity);
}

function cleanupFailedWindowsActivation(options: {
  before: WindowsProcessIdentity[];
  activationIdentity: WindowsActivationProcessIdentity | null;
  expectedExecutablePath: string;
  packageInstallLocation: string;
  packageFullName: string;
}): string[] {
  const cleanupFailures: string[] = [];
  const beforeKeys = new Set(options.before.map(windowsProcessIdentityKey));
  const observedAfterLaunch = new Map<string, WindowsProcessIdentity>();
  let authoritativeIdentity: WindowsLaunchProcessIdentity | null = null;

  if (options.activationIdentity) {
    try {
      authoritativeIdentity = createWindowsLaunchProcessIdentity(
        options.activationIdentity,
        options.expectedExecutablePath,
        options.packageInstallLocation,
        options.packageFullName,
      );
    } catch (error) {
      cleanupFailures.push(
        `Activation did not return a verified authoritative process identity: ${asError(error).message}`,
      );
    }
  }

  // The real delay between fresh PowerShell/CIM snapshots gives a newly
  // activated process a bounded opportunity to become visible. Snapshot-only
  // identities are diagnostic and are never eligible for termination.
  let snapshotSucceeded = false;
  let lastSnapshotError: Error | null = null;
  for (
    let attempt = 1;
    attempt <= windowsActivationCleanupPollAttempts;
    attempt += 1
  ) {
    waitForWindowsActivationCleanupPoll();
    try {
      const after = queryWindowsProcessSnapshot(
        options.expectedExecutablePath,
        "activation-failure",
        attempt,
      );
      snapshotSucceeded = true;
      lastSnapshotError = null;
      for (const identity of after) {
        const key = windowsProcessIdentityKey(identity);
        if (beforeKeys.has(key)) {
          continue;
        }
        observedAfterLaunch.set(key, identity);
      }
    } catch (error) {
      lastSnapshotError = asError(error);
    }
  }
  if (!snapshotSucceeded && lastSnapshotError) {
    cleanupFailures.push(
      `Bounded post-activation process polling failed: ${lastSnapshotError.message}`,
    );
  }

  if (authoritativeIdentity) {
    const result = terminateVerifiedWindowsProcess(authoritativeIdentity);
    if (!result.ok) {
      cleanupFailures.push(result.message);
    }
    const authoritativeKey = windowsProcessIdentityKey(authoritativeIdentity);
    const snapshotOnlyProcesses = [...observedAfterLaunch.entries()]
      .filter(([key]) => key !== authoritativeKey)
      .map(([, identity]) => identity);
    if (snapshotOnlyProcesses.length > 0) {
      cleanupFailures.push(
        `Bounded polling observed possible residual verified-path process IDs ${snapshotOnlyProcesses.map((identity) => identity.pid).join(", ")} that do not match the authoritative activation PID ${authoritativeIdentity.pid}. Snapshot-only identities were not terminated, so cleanup could not be confirmed. Fully quit Codex manually before retrying.`,
      );
    }
    return cleanupFailures;
  }

  const observedPids = [...observedAfterLaunch.values()]
    .map((identity) => identity.pid);
  if (observedPids.length > 0) {
    cleanupFailures.push(
      `Activation did not return a verified authoritative PID. Bounded polling observed possible residual verified-path process IDs ${observedPids.join(", ")}, but snapshot-only identities were not terminated and cleanup cannot be confirmed. Fully quit Codex manually before retrying.`,
    );
  } else {
    cleanupFailures.push(
      "Activation did not return a verified authoritative PID. Bounded polling observed no verified-path process, but empty snapshots cannot confirm cleanup. Fully quit Codex manually before retrying.",
    );
  }
  return cleanupFailures;
}

function activateWindowsPackagedApp(options: {
  appUserModelId: string;
  launchArguments: string[];
  expectedExecutablePath: string;
  packageInstallLocation: string;
  packageFullName: string;
}): WindowsLaunchProcessIdentity {
  if (!isValidWindowsAppUserModelId(options.appUserModelId)) {
    throw new Error("Refusing to activate an invalid Microsoft Store/MSIX AUMID.");
  }
  const portMatch = /^--remote-debugging-port=(\d+)$/u.exec(
    options.launchArguments[0] ?? "",
  );
  const expectedLaunchArguments = portMatch
    ? windowsCdpLaunchArguments(Number(portMatch[1]))
    : [];
  if (
    options.launchArguments.length !== expectedLaunchArguments.length ||
    options.launchArguments.some(
      (argument, index) => argument !== expectedLaunchArguments[index],
    )
  ) {
    throw new Error(
      "Refusing Microsoft Store/MSIX activation with unexpected CDP launch arguments.",
    );
  }

  let before: WindowsProcessIdentity[];
  try {
    before = queryWindowsProcessSnapshot(
      options.expectedExecutablePath,
      "pre-launch",
    );
  } catch (error) {
    throw new Error(
      `Microsoft Store/MSIX activation was not attempted because the pre-launch process snapshot failed: ${asError(error).message}`,
    );
  }
  if (before.length > 0) {
    throw new Error(
      "Microsoft Store/MSIX activation was not attempted because the verified Codex package process is already running.",
    );
  }

  const result = runWindowsPowerShellEncoded(
    windowsPackagedActivationPowerShellSource(),
    {
      ...process.env,
      CODEXFAST_WINDOWS_OPERATION: "activation",
      CODEXFAST_APP_USER_MODEL_ID: options.appUserModelId,
      CODEXFAST_APP_ARGUMENTS: options.launchArguments.join(" "),
      CODEXFAST_EXPECTED_CDP_PORT_ARGUMENT: expectedLaunchArguments[0],
      CODEXFAST_EXPECTED_CDP_ADDRESS_ARGUMENT: expectedLaunchArguments[1],
      CODEXFAST_EXPECTED_EXECUTABLE_PATH: options.expectedExecutablePath,
    },
  );

  let activationIdentity: WindowsActivationProcessIdentity | null = null;
  let identityParseError: Error | null = null;
  if (result.stdout.trim()) {
    try {
      activationIdentity = parseWindowsActivationProcessIdentityJson(
        result.stdout,
      );
    } catch (error) {
      identityParseError = asError(error);
    }
  } else {
    identityParseError = new Error("PowerShell returned no process identity");
  }

  const commandFailure = windowsPowerShellFailure(result);
  if (!commandFailure && !identityParseError && activationIdentity) {
    try {
      return createWindowsLaunchProcessIdentity(
        activationIdentity,
        options.expectedExecutablePath,
        options.packageInstallLocation,
        options.packageFullName,
      );
    } catch (error) {
      identityParseError = asError(error);
    }
  }

  const cleanupFailures = cleanupFailedWindowsActivation({
    before,
    activationIdentity,
    expectedExecutablePath: options.expectedExecutablePath,
    packageInstallLocation: options.packageInstallLocation,
    packageFullName: options.packageFullName,
  });
  const primaryFailure = commandFailure ?? identityParseError?.message ??
    "PowerShell returned an invalid activation result";
  const cleanupDetail = cleanupFailures.length > 0
    ? ` Fail-closed cleanup could not be confirmed: ${cleanupFailures.join(" ")}`
    : "";
  throw new Error(
    `Microsoft Store/MSIX activation failed: ${primaryFailure}.${cleanupDetail}`,
  );
}

function waitForWindowsProcessExit(
  identity: WindowsLaunchProcessIdentity,
): WindowsProcessMonitor {
  let stopMonitoring = (): void => undefined;
  const exited = new Promise<number>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelActiveQuery: (() => void) | null = null;
    let settled = false;
    let stopped = false;

    const clearMonitor = (): void => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const cancelQuery = cancelActiveQuery;
      cancelActiveQuery = null;
      try {
        cancelQuery?.();
      } catch (error) {
        debugRuntime(
          `failed to cancel Windows process identity query: ${asError(error).message}`,
        );
      }
    };
    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        clearMonitor();
      } finally {
        callback();
      }
    };
    const schedulePoll = (): void => {
      if (stopped || settled) {
        return;
      }
      // This monitor owns the Windows runtime lifetime. Keeping the timer
      // referenced prevents the launcher from exiting before the next poll.
      timer = setTimeout(poll, 1_000);
    };
    const poll = (): void => {
      timer = null;
      if (stopped || settled) {
        return;
      }
      let query: ReturnType<typeof queryWindowsProcessIdentityAsync>;
      try {
        query = queryWindowsProcessIdentityAsync(identity.pid);
      } catch (error) {
        finish(() => reject(
          new Error(
            `Cannot monitor packaged Codex process: ${asError(error).message}`,
          ),
        ));
        return;
      }
      cancelActiveQuery = query.cancel;
      void query.result.then(
        (current) => {
          cancelActiveQuery = null;
          if (stopped || settled) {
            return;
          }
          if (!current) {
            // CIM polling can confirm disappearance but cannot recover the
            // process's original Windows exit code.
            finish(() => resolve(0));
            return;
          }
          if (current.startTimeUtcTicks !== identity.startTimeUtcTicks) {
            finish(() => reject(
              new Error(
                `Cannot monitor packaged Codex process ${identity.pid}: process start time changed, so the PID may have been reused.`,
              ),
            ));
            return;
          }
          if (
            !windowsPathsMatch(
              current.executablePath,
              identity.expectedExecutablePath,
            )
          ) {
            finish(() => reject(
              new Error(
                `Cannot monitor packaged Codex process ${identity.pid}: executable path changed to ${current.executablePath}.`,
              ),
            ));
            return;
          }
          schedulePoll();
        },
        (error: unknown) => {
          cancelActiveQuery = null;
          if (stopped || settled) {
            return;
          }
          finish(() => reject(
            new Error(
              `Cannot monitor packaged Codex process: ${asError(error).message}`,
            ),
          ));
        },
      );
    };

    stopMonitoring = () => {
      if (stopped) {
        return;
      }
      stopped = true;
      finish(() => resolve(0));
    };
    schedulePoll();
  });
  return {
    exited,
    stopMonitoring: () => stopMonitoring(),
  };
}

function launchWindowsCodexProcess(
  context: CodexfastContext,
  debugPort: number,
): RuntimeLaunchProcess {
  const windowsPackage = context.windowsPackage;
  if (!windowsPackage) {
    throw new Error(
      "Microsoft Store/MSIX package identity is unavailable. Run requirement checks before launch.",
    );
  }
  const launchArguments = windowsCdpLaunchArguments(debugPort);
  const expectedExecutablePath = join(
    windowsPackage.installLocation,
    windowsVerifiedExecutableRelativePath,
  );
  printLine(
    `Windows: activating ${windowsPackage.appUserModelId} with CDP enabled...`,
  );
  const identity = activateWindowsPackagedApp({
    appUserModelId: windowsPackage.appUserModelId,
    launchArguments,
    expectedExecutablePath,
    packageInstallLocation: windowsPackage.installLocation,
    packageFullName: windowsPackage.fullName,
  });
  printLine(`Windows: application activated (PID ${identity.pid}).`);
  const testExitCode = Number.parseInt(
    process.env.CODEXFAST_TEST_RUNTIME_PROCESS_EXIT_CODE ?? "0",
    10,
  );
  const monitor =
    process.env.CODEXFAST_TEST_RUNTIME_PLATFORM_LAUNCH === "1" &&
      process.env.CODEXFAST_TEST_WINDOWS_PROCESS_MONITOR !== "1"
      ? {
        exited: Promise.resolve(
          Number.isSafeInteger(testExitCode) ? testExitCode : 0,
        ),
        stopMonitoring: () => undefined,
      }
      : waitForWindowsProcessExit(identity);
  return {
    pid: identity.pid,
    child: null,
    exited: monitor.exited,
    stopMonitoring: monitor.stopMonitoring,
    terminated: false,
    windowsIdentity: identity,
  };
}

function terminateWindowsRuntimeLaunchProcess(
  launched: RuntimeLaunchProcess,
): RuntimeLaunchTerminationResult {
  if (!launched.pid || launched.terminated) {
    return { ok: true };
  }
  if (!launched.windowsIdentity) {
    return {
      ok: false,
      message: `Cannot safely close verified launched Codex process ${launched.pid}: launch identity is unavailable.`,
    };
  }
  const result = terminateVerifiedWindowsProcess(launched.windowsIdentity);
  if (!result.ok) {
    return result;
  }
  launched.terminated = true;
  return { ok: true };
}

function confirmWindowsRuntimeLaunchProcessExited(
  launched: RuntimeLaunchProcess,
): RuntimeLaunchTerminationResult {
  if (!launched.windowsIdentity) {
    return {
      ok: false,
      message: `Cannot confirm that verified launched Codex process ${String(launched.pid ?? "<unknown>")} and admitted-path processes exited: launch identity is unavailable.`,
    };
  }
  return confirmWindowsAdmittedPathProcessesExited(launched.windowsIdentity);
}

function unsupportedCodexRunning(): CodexRunningCheck {
  return {
    ok: false,
    message: "Cannot inspect Codex processes on this platform.",
  };
}

function unsupportedLaunch(): RuntimeLaunchProcess {
  throw new Error("Runtime launch is unavailable on this platform.");
}

function unsupportedTermination(): RuntimeLaunchTerminationResult {
  return { ok: false, message: "Runtime launch is unavailable on this platform." };
}

function confirmMacRuntimeLaunchProcessExited(): RuntimeLaunchTerminationResult {
  return { ok: true };
}

const macPlatformAdapter: CodexfastPlatformAdapter = {
  platform: "darwin",
  createAppPaths: createMacAppPaths,
  checkRequirements: checkMacRequirements,
  checkCodexRunning: () => checkMacCodexRunning(),
  launchCodexProcess: launchMacCodexProcess,
  terminateRuntimeLaunchProcess: terminateMacRuntimeLaunchProcess,
  confirmRuntimeLaunchProcessExited: confirmMacRuntimeLaunchProcessExited,
};

const windowsPlatformAdapter: CodexfastPlatformAdapter = {
  platform: "win32",
  createAppPaths: createWindowsAppPaths,
  checkRequirements: checkWindowsRequirements,
  checkCodexRunning: (context) => checkWindowsCodexRunning(context),
  launchCodexProcess: launchWindowsCodexProcess,
  terminateRuntimeLaunchProcess: terminateWindowsRuntimeLaunchProcess,
  confirmRuntimeLaunchProcessExited: confirmWindowsRuntimeLaunchProcessExited,
};

const unsupportedPlatformAdapter: CodexfastPlatformAdapter = {
  platform: "unsupported",
  createAppPaths: createUnsupportedAppPaths,
  checkRequirements: () => checkUnsupportedRequirements(),
  checkCodexRunning: () => unsupportedCodexRunning(),
  launchCodexProcess: () => unsupportedLaunch(),
  terminateRuntimeLaunchProcess: () => unsupportedTermination(),
  confirmRuntimeLaunchProcessExited: () => unsupportedTermination(),
};

export function getPlatformAdapter(
  platform: CodexfastPlatform,
): CodexfastPlatformAdapter {
  if (platform === "darwin") {
    return macPlatformAdapter;
  }
  if (platform === "win32") {
    return windowsPlatformAdapter;
  }
  debugRuntime(`unsupported platform ${process.platform}`);
  return unsupportedPlatformAdapter;
}
