import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function writeInfoPlist(
  appDir: string,
  appVersion = "26.415.40636",
  appBuild = "1799",
): void {
  mkdirSync(join(appDir, "Contents"), { recursive: true });
  writeFileSync(
    join(appDir, "Contents", "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleShortVersionString</key>
  <string>${appVersion}</string>
  <key>CFBundleVersion</key>
  <string>${appBuild}</string>
</dict>
</plist>
`,
  );
}

export function prepareFakeApp(options: {
  appDir: string;
  appVersion?: string;
  appBuild?: string;
}): void {
  const resourcesDir = join(options.appDir, "Contents", "Resources");
  mkdirSync(resourcesDir, { recursive: true });
  writeInfoPlist(options.appDir, options.appVersion, options.appBuild);
}

export function prepareFakeWindowsMsixApp(options: {
  appDir: string;
  packageName?: string;
  packageVersion?: string;
  processorArchitecture?: string;
  applicationId?: string;
  executable?: string;
  entryPoint?: string;
}): void {
  const packageName = options.packageName ?? "OpenAI.Codex";
  const packageVersion = options.packageVersion ?? "26.803.5235.0";
  const processorArchitecture = options.processorArchitecture ?? "x64";
  const applicationId = options.applicationId ?? "App";
  const executable = options.executable ?? "app\\ChatGPT.exe";
  const entryPoint = options.entryPoint ?? "Windows.FullTrustApplication";
  const resourcesDir = join(options.appDir, "app", "resources");
  mkdirSync(resourcesDir, { recursive: true });
  writeFileSync(join(resourcesDir, "app.asar"), "fake app.asar");
  writeFileSync(
    join(options.appDir, ...executable.replace(/\\/gu, "/").split("/")),
    "fake executable",
  );
  writeFileSync(
    join(options.appDir, "AppxManifest.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10">
  <Identity
    Name="${packageName}"
    Publisher="CN=OpenAI, O=OpenAI, L=San Francisco, S=California, C=US"
    Version="${packageVersion}"
    ProcessorArchitecture="${processorArchitecture}" />
  <Properties>
    <DisplayName>Codex</DisplayName>
  </Properties>
  <Applications>
    <Application Id="${applicationId}" Executable="${executable}" EntryPoint="${entryPoint}" />
  </Applications>
</Package>
`,
  );
}
