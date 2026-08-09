import { accessSync, constants, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { delimiter, extname, isAbsolute, join } from "node:path";

export function printLine(message = ""): void {
  console.log(message);
}

export function debugRuntime(message: string): void {
  if (process.env.CODEXFAST_DEBUG_RUNTIME === "1") {
    printLine(`[runtime-debug] ${message}`);
  }
}

export function resolveCommand(name: string): string | null {
  const canExecute = (candidate: string): boolean => {
    try {
      accessSync(
        candidate,
        process.platform === "win32" ? constants.F_OK : constants.X_OK,
      );
      return true;
    } catch {
      return false;
    }
  };
  if (isAbsolute(name) || name.includes("/") || name.includes("\\")) {
    return canExecute(name) ? name : null;
  }

  const pathEntries = (process.env.PATH ?? "")
    .split(delimiter)
    .map((entry) => entry.replace(/^"|"$/gu, ""))
    .filter((entry) => entry.length > 0);
  const extensions = process.platform === "win32" && !extname(name)
    ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
      .split(";")
      .filter((extension) => extension.length > 0)
    : [""];
  for (const pathEntry of pathEntries) {
    for (const extension of extensions) {
      const candidate = join(pathEntry, `${name}${extension}`);
      if (canExecute(candidate)) {
        return candidate;
      }
    }
  }
  return null;
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
