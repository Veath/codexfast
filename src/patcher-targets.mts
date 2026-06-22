import { MODEL_TARGET_SPECS } from "./targets/models.mts";
import { PLUGIN_TARGET_SPECS } from "./targets/plugins.mts";
import { SPEED_TARGET_SPECS } from "./targets/speed.mts";
import { UPDATE_TARGET_SPECS } from "./targets/updates.mts";

export type ReplacementCallback = (match: string, ...captures: string[]) => string;
export type Replacement = string | ReplacementCallback;

export type TargetSpec = {
  id: string;
  label: string;
  needle: string;
  guardedSignature: RegExp;
  patchedSignature: RegExp;
  legacyPatchedSignature: RegExp | null;
  applyReplacement: Replacement;
  normalizeReplacement?: Replacement;
};

export type TargetMatch = {
  guarded: boolean;
  patched: boolean;
  legacyPatched: boolean;
  spec: TargetSpec;
};

export const TARGET_SPECS: TargetSpec[] = [
  ...SPEED_TARGET_SPECS,
  ...UPDATE_TARGET_SPECS,
  ...PLUGIN_TARGET_SPECS,
  ...MODEL_TARGET_SPECS,
];
