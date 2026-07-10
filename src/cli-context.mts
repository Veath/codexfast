import { existsSync } from "node:fs";
import { join } from "node:path";

export type AppPaths = {
  bundle: string;
  resources: string;
  infoPlist: string;
};

export type AppMetadata = {
  version: string;
  build: string;
  versionKey: string;
  compatibility: string;
  supported: boolean;
};

export type Toolchain = {
  plistBuddy: string;
};

export type CodexfastContext = {
  paths: AppPaths;
  metadata: AppMetadata;
  toolchain: Toolchain;
};

export function createAppPaths(appBundle = "/Applications/Codex.app"): AppPaths {
  const resources = join(appBundle, "Contents", "Resources");
  return {
    bundle: appBundle,
    resources,
    infoPlist: join(appBundle, "Contents", "Info.plist"),
  };
}

export function emptyAppMetadata(): AppMetadata {
  return {
    version: "unknown",
    build: "unknown",
    versionKey: "unknown+unknown",
    compatibility: "unsupported",
    supported: false,
  };
}

export function emptyToolchain(): Toolchain {
  return {
    plistBuddy: "",
  };
}

export function resolveDefaultAppBundle(): string {
  if (existsSync("/Applications/Codex.app")) {
    return "/Applications/Codex.app";
  }
  if (existsSync("/Applications/ChatGPT.app")) {
    return "/Applications/ChatGPT.app";
  }
  return "/Applications/Codex.app";
}

export function createCodexfastContext(appBundle = process.env.CODEXFAST_APP_BUNDLE): CodexfastContext {
  return {
    paths: createAppPaths(appBundle ?? resolveDefaultAppBundle()),
    metadata: emptyAppMetadata(),
    toolchain: emptyToolchain(),
  };
}
