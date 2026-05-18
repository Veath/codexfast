import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fail } from "./assertions.mts";

function writeExecutable(path: string, content: string): void {
  writeFileSync(path, content);
  chmodSync(path, 0o755);
}

export function setupStubs(stubBin: string, markerFile: string): void {
  const tccutilMarkerFile = `${markerFile}.tccutil`;
  const npmMarkerFile = `${markerFile}.npm`;
  const launchctlMarkerFile = `${markerFile}.launchctl`;
  const launchMarkerFile = `${markerFile}.launch`;
  mkdirSync(stubBin, { recursive: true });
  writeExecutable(join(stubBin, "clear"), "#!/bin/bash\nexit 0\n");
  writeExecutable(
    join(stubBin, "node"),
    `#!/bin/bash
printf '%s\\n' "unexpected PATH node invocation" >&2
exit 66
`,
  );
  writeExecutable(
    join(stubBin, "codesign"),
    `#!/bin/bash
printf '%s\\n' "$*" >> ${JSON.stringify(markerFile)}
exit 0
`,
  );
  writeExecutable(
    join(stubBin, "tccutil"),
    `#!/bin/bash
printf '%s\\n' "$*" >> ${JSON.stringify(tccutilMarkerFile)}
exit 0
`,
  );
  writeExecutable(
    join(stubBin, "launchctl"),
    `#!/bin/bash
printf '%s\\n' "$*" >> ${JSON.stringify(launchctlMarkerFile)}
exit 0
`,
  );
  writeExecutable(
    join(stubBin, "open"),
    `#!/bin/bash
printf '%s\\n' "$*" >> ${JSON.stringify(launchMarkerFile)}
exit 0
`,
  );
  writeExecutable(
    join(stubBin, "pgrep"),
    `#!/bin/bash
if [ "\${CODEXFAST_TEST_PGREP_FAIL:-0}" = "1" ]; then
  printf '%s\\n' "pgrep: failed" >&2
  exit 2
fi
exit 1
`,
  );
  writeExecutable(
    join(stubBin, "npm"),
    `#!/bin/bash
printf '%s\\n' "$*" >> ${JSON.stringify(npmMarkerFile)}
exit 0
`,
  );
  writeExecutable(
    join(stubBin, "npx"),
    `#!/bin/bash
printf '%s\\n' "$*" >> ${JSON.stringify(npmMarkerFile)}
exit 0
`,
  );
}

export function runScript(options: {
  rootDir: string;
  stubBin: string;
  appDir: string;
  input: string;
  outputFile: string;
  args?: string[];
  extraEnv?: Record<string, string>;
}): void {
  const result = spawnSync(process.execPath, [join(options.rootDir, "bin", "codexfast"), ...(options.args ?? [])], {
    input: options.input,
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.extraEnv,
      PATH: options.extraEnv?.PATH ?? `${options.stubBin}:${process.env.PATH ?? ""}`,
      CODEXFAST_APP_BUNDLE: options.appDir,
    },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  writeFileSync(options.outputFile, output);
  if (result.status !== 0 && options.extraEnv?.CODEXFAST_TEST_ALLOW_NONZERO !== "1") {
    fail(`codexfast exited with ${result.status}`, output);
  }
}

export function readOutput(outputFile: string): string {
  return readFileSync(outputFile, "utf8");
}

export function assertNoCodesignCalls(markerFile: string, outputFile: string): void {
  if (existsSync(markerFile)) {
    fail("expected codesign not to be invoked", `${readFileSync(markerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}

export function assertNoTccutilCalls(markerFile: string, outputFile: string): void {
  const tccutilMarkerFile = `${markerFile}.tccutil`;
  if (existsSync(tccutilMarkerFile)) {
    fail("expected tccutil not to be invoked", `${readFileSync(tccutilMarkerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}

export function assertNoNpmCalls(markerFile: string, outputFile: string): void {
  const npmMarkerFile = `${markerFile}.npm`;
  if (existsSync(npmMarkerFile)) {
    fail("expected npm not to be invoked", `${readFileSync(npmMarkerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}

export function assertNoLaunchCalls(markerFile: string, outputFile: string): void {
  const launchMarkerFile = `${markerFile}.launch`;
  if (existsSync(launchMarkerFile)) {
    fail("expected Codex.app launch not to be invoked", `${readFileSync(launchMarkerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}
