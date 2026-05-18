import { printLine } from "./cli-utils.mts";

export type CliExitStatus = {
  exitCode: number;
};

export type CliActionDetails = {
  resources: string;
  version: string;
  build: string;
  compatibility: string;
};

export function printActionHeaderBlock(action: string, details: CliActionDetails): void {
  printLine("");
  printLine(`Action: ${action}`);
  printLine(`Resources: ${details.resources}`);
  printLine(`Detected version: ${details.version}`);
  printLine(`Detected build: ${details.build}`);
  printLine(`Compatibility: ${details.compatibility}`);
  printLine("Mode: self-contained single file");
  printLine("");
}

export function printExitCode(exitCode: number): CliExitStatus {
  printLine(`Exit code: ${exitCode}`);
  return { exitCode };
}

export function printExitBlock(exitCode: number): CliExitStatus {
  printLine("");
  return printExitCode(exitCode);
}
