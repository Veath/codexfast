import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fail } from "./assertions.mts";
import { readFakeAsarHeaderHash, writeFakeAsar } from "./fake-asar.mts";

export type AssetProfile = "standard" | "26417" | "26417-partial" | "26422" | "26422-2176";

export function writeInfoPlist(appDir: string, hashValue: string, appVersion = "26.415.40636", appBuild = "1799", bundleIdentifier: string | null = "com.openai.codex"): void {
  mkdirSync(join(appDir, "Contents"), { recursive: true });
  writeFileSync(
    join(appDir, "Contents", "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${bundleIdentifier ? `  <key>CFBundleIdentifier</key>
  <string>${bundleIdentifier}</string>
` : ""}  <key>CFBundleShortVersionString</key>
  <string>${appVersion}</string>
  <key>CFBundleVersion</key>
  <string>${appBuild}</string>
  <key>ElectronAsarIntegrity</key>
  <dict>
    <key>Resources/app.asar</key>
    <dict>
      <key>algorithm</key>
      <string>SHA256</string>
      <key>hash</key>
      <string>${hashValue}</string>
    </dict>
  </dict>
</dict>
</plist>
`,
  );
}

export function readInfoPlistHash(appDir: string): string {
  const plist = readFileSync(join(appDir, "Contents", "Info.plist"), "utf8");
  const match = plist.match(/<key>hash<\/key>\s*<string>([^<]+)<\/string>/);
  return match?.[1] ?? fail(`missing ElectronAsarIntegrity hash in ${appDir}`);
}

function copyDirectory(sourceDir: string, destinationDir: string): void {
  mkdirSync(destinationDir, { recursive: true });
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name);
    const destinationPath = join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

export function writeAssets(fixturesDir: string, assetsDir: string, profile: AssetProfile): void {
  copyDirectory(join(fixturesDir, profile, "webview", "assets"), assetsDir);
}

export function prepareArchivedFakeApp(options: {
  appDir: string;
  assetsRoot: string;
  fixturesDir: string;
  appVersion?: string;
  appBuild?: string;
  assetProfile?: AssetProfile;
}): void {
  const resourcesDir = join(options.appDir, "Contents", "Resources");
  const archivePath = join(resourcesDir, "app.asar");
  mkdirSync(resourcesDir, { recursive: true });
  writeAssets(options.fixturesDir, join(options.assetsRoot, "webview", "assets"), options.assetProfile ?? "standard");
  writeFakeAsar(options.assetsRoot, archivePath);
  writeInfoPlist(options.appDir, readFakeAsarHeaderHash(archivePath), options.appVersion, options.appBuild);
}

export function prepareLegacyFakeApp(options: {
  appDir: string;
  unpackedAssetsDir: string;
  archivedAssetsRoot: string;
  fixturesDir: string;
  appBuildHashPlaceholder: string;
}): void {
  const resourcesDir = join(options.appDir, "Contents", "Resources");
  const unpackedRoot = join(resourcesDir, "app", "webview", "assets");
  mkdirSync(unpackedRoot, { recursive: true });
  writeAssets(options.fixturesDir, options.unpackedAssetsDir, "standard");
  for (const file of ["general-settings.js", "index.js", "use-model-settings.js", "sidebar.js"]) {
    copyFileSync(join(options.unpackedAssetsDir, file), join(unpackedRoot, file));
  }
  writeAssets(options.fixturesDir, join(options.archivedAssetsRoot, "webview", "assets"), "standard");
  writeFakeAsar(options.archivedAssetsRoot, join(resourcesDir, "app.asar1"));
  writeInfoPlist(options.appDir, options.appBuildHashPlaceholder);
}
