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
