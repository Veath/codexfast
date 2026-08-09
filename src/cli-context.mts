import {
  createPlatformAppPaths,
  resolveDefaultAppBundle,
  runtimePlatform,
} from "./cli-platform.mts";

export type CodexfastPlatform = "darwin" | "win32" | "unsupported";

export type AppPaths = {
  bundle: string;
  resources: string;
  infoPlist: string | null;
  appxManifest: string | null;
  executableCandidates: string[];
};

export type AppMetadata = {
  version: string;
  build: string;
  versionKey: string;
  compatibilityKey: string;
  compatibility: string;
  supported: boolean;
};

export type WindowsPackageIdentity = {
  name: string;
  fullName: string;
  familyName: string;
  architecture: string;
  installLocation: string;
  packageVersion: string;
  applicationId: string;
  appUserModelId: string;
};

export type Toolchain = {
  plistBuddy: string;
};

export type CodexfastContext = {
  platform: CodexfastPlatform;
  paths: AppPaths;
  metadata: AppMetadata;
  toolchain: Toolchain;
  windowsPackage: WindowsPackageIdentity | null;
};

export function createAppPaths(
  appBundle = "/Applications/Codex.app",
  platform: CodexfastPlatform = runtimePlatform(),
): AppPaths {
  return createPlatformAppPaths(platform, appBundle);
}

export function emptyAppMetadata(): AppMetadata {
  return {
    version: "unknown",
    build: "unknown",
    versionKey: "unknown+unknown",
    compatibilityKey: "unsupported:unknown+unknown",
    compatibility: "unsupported",
    supported: false,
  };
}

export function emptyToolchain(): Toolchain {
  return {
    plistBuddy: "",
  };
}

export function createCodexfastContext(appBundle = process.env.CODEXFAST_APP_BUNDLE): CodexfastContext {
  const platform = runtimePlatform();
  return {
    platform,
    paths: createAppPaths(
      appBundle ?? resolveDefaultAppBundle(platform),
      platform,
    ),
    metadata: emptyAppMetadata(),
    toolchain: emptyToolchain(),
    windowsPackage: null,
  };
}
