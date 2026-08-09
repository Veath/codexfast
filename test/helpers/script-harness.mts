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
  const pgrepMarkerFile = `${markerFile}.pgrep`;
  const powershellMarkerFile = `${markerFile}.powershell`;
  const tasklistMarkerFile = `${markerFile}.tasklist`;
  const taskkillMarkerFile = `${markerFile}.taskkill`;
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
printf '%s\n' "$*" >> ${JSON.stringify(pgrepMarkerFile)}
if [ "\${CODEXFAST_TEST_PGREP_FAIL:-0}" = "1" ]; then
  printf '%s\\n' "pgrep: failed" >&2
  exit 2
fi
exit 1
`,
  );
  writeExecutable(
    join(stubBin, "powershell.exe"),
    `#!/bin/bash
{
  printf '%s\n' "args=$*"
  printf '%s\n' "operation=\${CODEXFAST_WINDOWS_OPERATION:-}"
  printf '%s\n' "bundle=\${CODEXFAST_APP_BUNDLE:-}"
  printf '%s\n' "aumid=\${CODEXFAST_APP_USER_MODEL_ID:-}"
  printf '%s\n' "app_arguments=\${CODEXFAST_APP_ARGUMENTS:-}"
  printf '%s\n' "expected_cdp_port_argument=\${CODEXFAST_EXPECTED_CDP_PORT_ARGUMENT:-}"
  printf '%s\n' "expected_cdp_address_argument=\${CODEXFAST_EXPECTED_CDP_ADDRESS_ARGUMENT:-}"
  printf '%s\n' "expected_executable=\${CODEXFAST_EXPECTED_EXECUTABLE_PATH:-}"
  printf '%s\n' "process_id=\${CODEXFAST_PROCESS_ID:-}"
  printf '%s\n' "expected_start_time=\${CODEXFAST_EXPECTED_START_TIME_UTC_TICKS:-}"
  printf '%s\n' "snapshot_purpose=\${CODEXFAST_WINDOWS_SNAPSHOT_PURPOSE:-}"
  printf '%s\n' "snapshot_attempt=\${CODEXFAST_WINDOWS_SNAPSHOT_ATTEMPT:-}"
  printf '%s\n' "node_options=\${NODE_OPTIONS:-}"
} >> ${JSON.stringify(powershellMarkerFile)}
case "\${CODEXFAST_WINDOWS_OPERATION:-}" in
  package-query)
    printf '%s' "\${CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_OUTPUT:-}"
    exit "\${CODEXFAST_TEST_WINDOWS_PACKAGE_QUERY_STATUS:-0}"
    ;;
  activation)
    if [ -n "\${CODEXFAST_TEST_WINDOWS_ACTIVATION_DELAY_SECONDS:-}" ]; then
      sleep "\${CODEXFAST_TEST_WINDOWS_ACTIVATION_DELAY_SECONDS}"
    fi
    if [ -n "\${CODEXFAST_TEST_WINDOWS_ACTIVATION_STDERR:-}" ]; then
      printf '%s' "\${CODEXFAST_TEST_WINDOWS_ACTIVATION_STDERR}" >&2
    fi
    printf '%s' "\${CODEXFAST_TEST_WINDOWS_ACTIVATION_OUTPUT:-null}"
    exit "\${CODEXFAST_TEST_WINDOWS_ACTIVATION_STATUS:-0}"
    ;;
  process-snapshot)
    if [ "\${CODEXFAST_WINDOWS_SNAPSHOT_PURPOSE:-}" = "running-check" ]; then
      printf '%s' "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_RUNNING_OUTPUT:-\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_OUTPUT:-[]}}"
      exit "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_RUNNING_STATUS:-\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_STATUS:-0}}"
    fi
    if [ "\${CODEXFAST_WINDOWS_SNAPSHOT_PURPOSE:-}" = "pre-launch" ]; then
      printf '%s' "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_BEFORE_OUTPUT:-\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_OUTPUT:-[]}}"
      exit "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_BEFORE_STATUS:-\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_STATUS:-0}}"
    fi
    if [ "\${CODEXFAST_WINDOWS_SNAPSHOT_PURPOSE:-}" = "termination-confirmation" ]; then
      if [ "\${CODEXFAST_WINDOWS_SNAPSHOT_ATTEMPT:-}" = "1" ] && [ -n "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_1_STATUS:-}" ]; then
        printf '%s' "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_1_OUTPUT:-}"
        exit "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_1_STATUS}"
      fi
      if [ "\${CODEXFAST_WINDOWS_SNAPSHOT_ATTEMPT:-}" = "2" ] && [ -n "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_2_STATUS:-}" ]; then
        printf '%s' "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_2_OUTPUT:-}"
        exit "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_2_STATUS}"
      fi
      printf '%s' "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_OUTPUT:-[]}"
      exit "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_TERMINATION_STATUS:-0}"
    fi
    if [ "\${CODEXFAST_WINDOWS_SNAPSHOT_ATTEMPT:-}" = "1" ] && [ -n "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_1_STATUS:-}" ]; then
      printf '%s' "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_1_OUTPUT:-}"
      exit "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_1_STATUS}"
    fi
    if [ "\${CODEXFAST_WINDOWS_SNAPSHOT_ATTEMPT:-}" = "2" ] && [ -n "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_2_STATUS:-}" ]; then
      printf '%s' "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_2_OUTPUT:-}"
      exit "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_2_STATUS}"
    fi
    printf '%s' "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_OUTPUT:-\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_OUTPUT:-[]}}"
    exit "\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_AFTER_STATUS:-\${CODEXFAST_TEST_WINDOWS_PROCESS_SNAPSHOT_STATUS:-0}}"
    ;;
  process-identity)
    if [ -n "\${CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_DELAY_SECONDS:-}" ]; then
      sleep "\${CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_DELAY_SECONDS}"
    fi
    if [ -n "\${CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_STDERR:-}" ]; then
      printf '%s' "\${CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_STDERR}" >&2
    fi
    printf '%s' "\${CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_OUTPUT:-null}"
    exit "\${CODEXFAST_TEST_WINDOWS_PROCESS_IDENTITY_STATUS:-0}"
    ;;
  verified-termination)
    if [ -n "\${CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_STDERR:-}" ]; then
      printf '%s' "\${CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_STDERR}" >&2
    fi
    if [ -n "\${CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_STATUS:-}" ]; then
      exit "\${CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_STATUS}"
    fi
    if [ -n "\${CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_POST_TERMINATE_STATUS:-}" ]; then
      if [ -n "\${CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_POST_TERMINATE_STDERR:-}" ]; then
        printf '%s' "\${CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_POST_TERMINATE_STDERR}" >&2
      fi
      exit "\${CODEXFAST_TEST_WINDOWS_VERIFIED_TERMINATION_POST_TERMINATE_STATUS}"
    fi
    exit 0
    ;;
esac
printf '%s' "unexpected Windows PowerShell operation: \${CODEXFAST_WINDOWS_OPERATION:-}" >&2
exit 64
`,
  );
  writeExecutable(
    join(stubBin, "tasklist.exe"),
    `#!/bin/bash
printf '%s\n' "$*" >> ${JSON.stringify(tasklistMarkerFile)}
if [[ "$*" == *"PID eq"* ]]; then
  printf '%s' "\${CODEXFAST_TEST_WINDOWS_PID_TASKLIST_OUTPUT:-}"
else
  printf '%s' "\${CODEXFAST_TEST_WINDOWS_TASKLIST_OUTPUT:-}"
fi
exit "\${CODEXFAST_TEST_WINDOWS_TASKLIST_STATUS:-0}"
`,
  );
  writeExecutable(
    join(stubBin, "taskkill.exe"),
    `#!/bin/bash
printf '%s\n' "$*" >> ${JSON.stringify(taskkillMarkerFile)}
exit "\${CODEXFAST_TEST_WINDOWS_TASKKILL_STATUS:-0}"
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

export function assertNoPowershellCalls(markerFile: string, outputFile: string): void {
  const powershellMarkerFile = `${markerFile}.powershell`;
  if (existsSync(powershellMarkerFile)) {
    fail("expected PowerShell not to be invoked", `${readFileSync(powershellMarkerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}

export function assertNoTasklistCalls(markerFile: string, outputFile: string): void {
  const tasklistMarkerFile = `${markerFile}.tasklist`;
  if (existsSync(tasklistMarkerFile)) {
    fail("expected tasklist not to be invoked", `${readFileSync(tasklistMarkerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}

export function assertNoTaskkillCalls(markerFile: string, outputFile: string): void {
  const taskkillMarkerFile = `${markerFile}.taskkill`;
  if (existsSync(taskkillMarkerFile)) {
    fail("expected taskkill not to be invoked", `${readFileSync(taskkillMarkerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}

export function assertNoLaunchctlCalls(markerFile: string, outputFile: string): void {
  const launchctlMarkerFile = `${markerFile}.launchctl`;
  if (existsSync(launchctlMarkerFile)) {
    fail("expected launchctl not to be invoked", `${readFileSync(launchctlMarkerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}

export function assertNoPgrepCalls(markerFile: string, outputFile: string): void {
  const pgrepMarkerFile = `${markerFile}.pgrep`;
  if (existsSync(pgrepMarkerFile)) {
    fail("expected pgrep not to be invoked", `${readFileSync(pgrepMarkerFile, "utf8")}\n${readOutput(outputFile)}`);
  }
}
