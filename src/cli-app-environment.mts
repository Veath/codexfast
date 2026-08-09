import type { CodexfastContext } from "./cli-context.mts";
import { getPlatformAdapter } from "./cli-platform.mts";
import { printLine } from "./cli-utils.mts";

export type CheckRequirementsOptions = {
  context: CodexfastContext;
  supportedAppVersions: Record<string, string>;
};

export function checkRequirements(
  options: CheckRequirementsOptions,
): boolean {
  const {
    context,
    supportedAppVersions,
  } = options;

  const result = getPlatformAdapter(context.platform).checkRequirements(
    context,
    supportedAppVersions,
  );
  if (!result.ok) {
    for (const message of result.messages) {
      printLine(message);
    }
  }
  return result.ok;
}
