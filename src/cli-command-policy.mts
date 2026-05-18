const legacySelftestPrefix = "__selftest-legacy-";
const legacySelftestActions = new Set(["status", "apply", "repair", "restore"]);
const runtimeSelftestCommands = new Set([
  "__selftest-cdp-frame",
  "__selftest-runtime-url",
  "__selftest-runtime-patch-body",
]);

export function resolveLegacySelftestAction(command: string): string {
  if (!command.startsWith(legacySelftestPrefix)) {
    return "";
  }
  const action = command.slice(legacySelftestPrefix.length);
  return legacySelftestActions.has(action) ? action : "__invalid__";
}

export function isRuntimeSelftestCommand(command: string): boolean {
  return runtimeSelftestCommands.has(command);
}

export function isHelpCommand(command: string): boolean {
  return command === "-h" || command === "--help" || command === "help";
}

export function isVersionCommand(command: string): boolean {
  return command === "-v" || command === "--version" || command === "version";
}

export function isPublicLaunchCommand(command: string): boolean {
  return command === "launch";
}

export function isHiddenLegacyCleanupCommand(command: string): boolean {
  return command === "repair";
}
