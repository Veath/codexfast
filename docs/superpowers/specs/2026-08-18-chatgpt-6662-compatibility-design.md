# ChatGPT 26.810.52044 Build 6662 Compatibility Design

Adapt `codexfast` to the locally installed `ChatGPT.app` `26.810.52044` (build `6662`) while preserving the runtime-only launcher and existing supported feature scope.

## Scope

- Add exact compatibility for `26.810.52044+6662`.
- Reuse the existing 26.810 target family for Settings Fast, `/fast`, service-tier state, conversation fallback, and automatic-update schema/hook interception.
- Add one narrow request service-tier allowance signature for the new `N2t(e,t,{priority:\`critical\`})` call shape so custom API users can send Fast.
- Keep GPT-5.6 model-list/query and Plugins targets disabled because the official app path remains active from the existing threshold.
- Validate the generated launcher, source patch suite, and an extracted copy of the installed bundle without modifying the installed app.

## Safety Boundary

The public launcher remains runtime-only. No installed bundle files, `app.asar`, `Info.plist`, or app signature are modified.

## Verification

Run `pnpm build:check`, `pnpm typecheck`, `pnpm check:version-drift`, `pnpm test`, and a read-only extracted-bundle patch/parse check for `26.810.52044+6662`.
