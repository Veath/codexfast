import type { TargetSpec } from "../patcher-targets.mts";

type TargetSpecInput = Omit<TargetSpec, "legacyPatchedSignature"> & {
  legacyPatchedSignature?: RegExp | null;
};

export function defineTargetSpecs(...specs: TargetSpecInput[]): TargetSpec[] {
  return specs.map((spec) => ({
    legacyPatchedSignature: null,
    ...spec,
  }));
}
