import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

export function printLine(message = ""): void {
  console.log(message);
}

export function debugRuntime(message: string): void {
  if (process.env.CODEXFAST_DEBUG_RUNTIME === "1") {
    printLine(`[runtime-debug] ${message}`);
  }
}

export function resolveCommand(name: string): string | null {
  const result = spawnSync("sh", ["-c", 'command -v -- "$1"', "sh", name], { encoding: "utf8" });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim() || null;
}

export function resolvePlistBuddy(): string | null {
  return existsSync("/usr/libexec/PlistBuddy") ? "/usr/libexec/PlistBuddy" : null;
}

export function run(
  command: string,
  args: string[],
  options: { input?: string; env?: NodeJS.ProcessEnv } = {},
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    input: options.input,
    encoding: "utf8",
    env: options.env ?? process.env,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
