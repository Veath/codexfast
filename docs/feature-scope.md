# Feature Scope

This document defines the user-facing feature paths currently exposed by `codexfast`.

Use it when you need a quick answer to "what does this repo actually enable?" before reading bundle-specific notes.

## Delivery Modes

- `launch` is the public runtime path. It starts Codex with a local CDP endpoint and applies the supported target patches in memory for that launched session only.
- Runtime launch does not modify `app.asar`, `Info.plist`, the app bundle, or the app signature.
- Legacy bundle patch commands and internal file-patch/restore flows have been removed.
- If a user previously installed the launchd auto-repair watcher, `launch` removes the legacy watcher files before starting Codex.

## Current Feature Set

### Settings-side Fast control

- Exposes the Fast-related control in Codex Settings on supported builds.
- This is the Settings/UI path for the Fast feature set.
- On newer service-tier bundles, `codexfast` also patches the shared service-tier allowance hook so custom API and custom `model_provider` users can actually persist and send the selected Fast tier instead of only seeing the UI entry.
- On newer service-tier bundles, `codexfast` also patches the request service-tier helper so send/edit/resume paths that bypass the shared hook can still compute and send Fast for non-ChatGPT paths, including custom `model_provider` configs whose account `authMethod` is `null`.
- On earlier service-tier bundles, reopened conversations and paused/edited resends keep explicit non-standard next-turn Fast selections while falling back to the configured Settings tier when stale Standard/null conversation-level or latest-turn state would otherwise force Standard.
- On `26.707.31428`, `26.707.41301`, `26.707.61608`, `26.707.71524`, `26.707.72221`, `26.707.91948`, `26.715.31925`, `26.715.52143`, `26.715.61943`, `26.715.70719`, `26.715.72028`, `26.715.72359`, `26.721.30844`, `26.721.31836`, `26.721.41059`, `26.721.81911`, `26.727.40816`, and `26.727.51351`, the configured Settings tier is the single source of truth for existing conversations, so stored conversation-level and latest-turn service-tier state cannot restore Fast or Standard after the global setting changes.
- `26.730.61309` retains the same configured-Settings-tier source-of-truth behavior.
- `26.730.61639` retains the same configured-Settings-tier source-of-truth behavior.
- `26.803.41515` retains the same configured-Settings-tier source-of-truth behavior.
- `26.803.61601` retains the same configured-Settings-tier source-of-truth behavior.
- `26.810.41047` retains the same configured-Settings-tier source-of-truth behavior.
- `26.810.52044` retains the same configured-Settings-tier source-of-truth behavior and adds a request-helper signature for custom-provider Fast sends.
- `26.814.41407` has the same extracted `app.asar` contents as `26.810.52044` and reuses that request-helper signature.
- `26.818.31338` retains the same configured-Settings-tier source-of-truth behavior and three-argument request-helper signature under renamed renderer assets.

### Composer `/fast` slash command

- Exposes the `/fast` slash command in the composer.
- This is the prompt-side command path for enabling or disabling Fast mode during composition.

### Composer Speed menu

- Exposes the composer-side `Speed` menu.
- On `26.415.40636` and `26.417.41555`, this is the `Add files and more / +` Speed submenu.
- On `26.422.21637`, `26.422.30944`, `26.422.62136`, `26.422.71525`, `26.429.20946`, `26.429.30905`, `26.429.61741`, `26.506.21252`, `26.506.31421`, `26.513.20950`, `26.513.31313`, `26.519.22136`, `26.519.31651`, `26.519.41501`, `26.519.81530`, `26.527.31326`, `26.527.60818`, `26.601.21317`, `26.602.30954`, `26.602.40724`, `26.602.71036`, `26.608.12217`, `26.609.30741`, `26.609.41114`, `26.609.71450`, `26.611.61049`, `26.611.61753`, `26.611.62324`, `26.616.31447`, `26.616.51431`, `26.616.71553`, `26.616.81150`, `26.623.31443`, `26.623.31921`, `26.623.42026`, `26.623.61825`, `26.623.70822`, `26.623.81905`, `26.623.101652`, `26.623.141536`, `26.707.31428`, `26.707.41301`, `26.707.61608`, `26.707.71524`, `26.707.72221`, `26.707.91948`, `26.715.31925`, `26.715.52143`, `26.715.61943`, and `26.715.70719`, this is the composer `Intelligence` dropdown Speed submenu.
- On supported builds this menu should surface `Standard` and `Fast`.
- `26.715.72028`, `26.715.72359`, `26.721.30844`, `26.721.31836`, `26.721.41059`, `26.721.81911`, `26.727.40816`, `26.727.51351`, `26.730.61309`, `26.730.61639`, `26.803.41515`, `26.803.61601`, `26.810.41047`, `26.810.52044`, `26.814.41407`, and `26.818.31338` continue to use the composer `Intelligence` dropdown Speed submenu.

### Plugins sidebar access for custom API users

- Exposes the `Plugins` sidebar/page access path for custom API users on supported builds.
- This removes the relevant auth-method gates for API-key users. On newer builds this includes the sidebar entry, the `/skills` Plugins page content gate, plugin detail deep-link redirects, the aggregate connector-unavailable install block, and the install-modal disclosure-only content gate when present.
- On `26.513.20950` and `26.513.31313`, this also keeps the composer `@` plugin mention list from requesting the remote `shared-with-me` plugin catalog, so local and already available plugin mentions can load under API-key auth.
- On `26.601.21317`, `26.602.30954`, `26.602.40724`, `26.602.71036`, `26.608.12217`, `26.609.30741`, `26.609.41114`, `26.609.71450`, `26.611.61049`, `26.611.61753`, `26.611.62324`, `26.616.31447`, `26.616.51431`, `26.616.71553`, and `26.616.81150`, the old sidebar/page/detail custom-API gates are not present in the inspected bundle; `codexfast` keeps the curated OpenAI plugin catalog visible, disables the remote `shared-with-me` plugin prefetch, keeps plugin detail app-connect content and basic plugin install-modal content visible, and keeps the post-install app connection flow open for `ON_USE` plugins with pending app auth. The curated catalog support means the visible Plugins page should include curated OpenAI categories and plugins, not only bundled plugins such as Computer Use and LaTeX. On `26.616.31447`, `26.616.51431`, `26.616.71553`, and `26.616.81150`, `codexfast` also adds the local full plugin cache root so app-connect plugins such as Gmail can appear when the default API catalog is sparse.
- On `26.623.31443`, `26.623.31921`, `26.623.42026`, `26.623.61825`, `26.623.70822`, `26.623.81905`, `26.623.101652`, `26.623.141536`, `26.707.31428`, `26.707.41301`, `26.707.61608`, `26.707.71524`, `26.707.72221`, `26.707.91948`, `26.715.31925`, `26.715.52143`, `26.715.61943`, `26.715.70719`, `26.715.72028`, `26.715.72359`, `26.721.30844`, `26.721.31836`, `26.721.41059`, `26.721.81911`, `26.727.40816`, and `26.727.51351`, Plugins is supported by the official app path for this repo's target use case, so `codexfast` skips Plugins runtime targets for those builds instead of applying catalog, install, mention, or app-connect patches.
- `26.730.61309` also uses the official Plugins path and skips the Plugins runtime target family.
- `26.730.61639` also uses the official Plugins path and skips the Plugins runtime target family.
- `26.803.41515` also uses the official Plugins path and skips the Plugins runtime target family.
- `26.803.61601` also uses the official Plugins path and skips the Plugins runtime target family.
- `26.810.41047` also uses the official Plugins path and skips the Plugins runtime target family.
- `26.810.52044` also uses the official Plugins path and skips the Plugins runtime target family.
- `26.814.41407` also uses the official Plugins path and skips the Plugins runtime target family.
- `26.818.31338` also uses the official Plugins path and skips the Plugins runtime target family.
- `26.810.52044`, `26.814.41407`, and `26.818.31338` retain the main-process automatic-update schema and runtime hook, but their renderer no longer contains the `Disable automatic updates` row.
- This does not guarantee that every plugin or connector flow is available. Plugin state, connector runtime behavior, or admin-side restrictions may still block a specific plugin.
- This does not unlock the remote ChatGPT shared plugin marketplace; that catalog still requires ChatGPT authentication.

### Disable automatic updates setting

- On `26.715.21425+5488`, the existing Fast global-tier behavior and composer `Intelligence` Speed path remain compatible, GPT-5.6 and Plugins use official application paths, and the automatic-update row plus callback-aware Sparkle hook require build-specific compatibility targets.
- On `26.715.31925+5551`, the existing Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible; GPT-5.6 and Plugins use official application paths.
- On `26.715.52143+5591`, the build-5551 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible under renamed renderer assets; GPT-5.6 and Plugins use official application paths.
- On `26.715.61943+5628`, the same 26.715 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible under renamed renderer assets; GPT-5.6 and Plugins use official application paths.
- On `26.715.70719+5650`, the same 26.715 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible under renamed renderer assets; GPT-5.6 and Plugins use official application paths.
- On `26.715.72028+5706`, the same 26.715 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible under renamed renderer and main-process assets; GPT-5.6 and Plugins use official application paths.
- On `26.715.72359+5718`, the same 26.715 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible under renamed renderer assets; GPT-5.6 and Plugins use official application paths.
- On `26.721.30844+5813`, the same Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible after renderer targets consolidated into `app-initial-BTphDPeq.js` and `general-settings-3znNSOBs.js`; GPT-5.6 and Plugins use official application paths.
- On `26.721.31836+5828`, the same Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible after renderer targets moved to `app-initial-C-fROkKo.js` and `general-settings-DaCT8Zmh.js`, with the updater in `.vite/build/window-all-closed-Bz3ZcBls.js`; GPT-5.6 and Plugins use official application paths.
- On `26.721.41059+5848`, the build-5828 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible after renderer targets moved to `app-initial-BHB6SClA.js` and `general-settings-D7HslvR1.js`, with the updater in `.vite/build/window-all-closed-a9FCmS92.js`; GPT-5.6 and Plugins use official application paths.
- On `26.721.81911+5973`, the build-5848 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible after renderer targets moved to `app-initial-CRKqnyc3.js` and `general-settings-CcPMYysK.js`, with the updater remaining in `.vite/build/window-all-closed-a9FCmS92.js`; GPT-5.6 and Plugins use official application paths.
- On `26.727.40816+6067`, the build-5973 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible after renderer targets moved to `app-initial-DRyZ1Lin.js` and `general-settings-BtLJps-O.js`, with the updater moving to `.vite/build/window-all-closed-Coc41Tfs.js`; GPT-5.6 and Plugins use official application paths.
- On `26.727.51351+6119`, the build-6067 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible after renderer targets moved to `app-initial-iBPGfcXU.js` and `general-settings-BBCiVbba.js`, with the updater remaining in `.vite/build/window-all-closed-Coc41Tfs.js`; GPT-5.6 and Plugins use official application paths.
- On `26.730.61309+6223`, the build-6119 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible after renderer targets moved to `app-initial-YjNFxVhk.js` and `general-settings-DzOMKOoh.js`, with the updater moving to `.vite/build/window-all-closed-DJDXIcEI.js`; GPT-5.6 and Plugins use official application paths.
- On `26.730.61639+6234`, the build-6223 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, and callback-aware Sparkle hook remain compatible after renderer targets moved to `app-initial-CKNQDTeE.js` and `general-settings-2iEePJwo.js`, with the updater remaining in `.vite/build/window-all-closed-DJDXIcEI.js`; GPT-5.6 and Plugins use official application paths.
- On `26.803.41515+6321`, the 26.730 Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, renderer settings schema, and source-signature-discovered updater hook remain compatible in `app-initial-Biw83Aiz.js`, `general-settings-BseQIe_j.js`, and `.vite/build/window-all-closed-9IR0zY5D.js`. The updater's nested callback/interval shape is wrapped with the live automatic-update setting check; GPT-5.6 and Plugins use official application paths.
- On `26.803.61601+6396`, the same Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, renderer settings schema, and updater hook remain compatible after the renderer chunks moved to `app-initial-BYOVlUBL.js` and `general-settings-Dz0zP8tf.js`. Main-process schema copies remain in `child-process-snapshot-worker.js`, `src-Cz_uUmVl.js`, and `worker.js`, and the active updater remains `.vite/build/window-all-closed-9IR0zY5D.js`. GPT-5.6 and Plugins use official application paths.
- On `26.810.41047+6570`, the existing Fast global-tier behavior, composer `Intelligence` Speed path, automatic-update row, renderer settings schema, and source-signature updater hook remain compatible after renderer and `.vite/build` chunk renames. The Intelligence Speed component is driven directly by available service-tier options without the historical availability gate. Renderer targets are in `app-initial-iMhn6nFd.js` and `general-settings-mYHA2JS4.js`; main-process schema copies remain in `child-process-snapshot-worker.js`, `src-BlUt09P1.js`, and `worker.js`; the active updater is `.vite/build/window-all-closed-B4DXN-uV.js`. GPT-5.6 and Plugins use official application paths.
- On `26.810.52044+6662`, the Fast allowance, new three-argument request-tier helper, configured-tier fallback, `/fast`, and renderer settings schema targets are in `app-initial-BCLYDefw.js`; Settings Fast is in `general-settings-yzMrcfmm.js`. The renderer has no `disableAutomaticUpdates` row, but main-process schema copies remain in `child-process-snapshot-worker.js`, `src-DY9Aq019.js`, and `worker.js`; the active updater is `.vite/build/window-all-closed-DqXEFZQJ.js`. The Intelligence Speed component remains driven directly by available options, and GPT-5.6 and Plugins use official application paths.
- On `26.814.41407+6720`, the extracted `app.asar` contents are identical to `26.810.52044+6662`, so the same target files, request-helper signature, update behavior, and official GPT-5.6/Plugins paths apply without new patch regexes.
- On `26.818.31338+6892`, the Fast allowance, three-argument request-tier helper, configured-tier fallback, `/fast`, and renderer settings schema targets are in `app-initial-B2RlNf_b.js`; Settings Fast is in `general-settings-DOzsH83_.js`. Main-process schema copies are in `src-Bqg9CB1K.js` and `worker.js`, and the active updater is `.vite/build/window-all-closed-BazhJdtt.js`. The composer Intelligence Speed menu is driven directly by service-tier availability and available options; GPT-5.6 and Plugins use official application paths.

- Adds a `Disable automatic updates` switch to Settings > General.
- On `26.810.52044`, `26.814.41407`, and `26.818.31338`, the packaged renderer no longer contains this switch; the main-process schema and runtime hook remain supported, but no Settings row is injected for those builds.
- The injected Settings row uses locale-aware label and description copy for common Codex app locales, with English fallback.
- The launcher injects a process-local main-process hook that discovers the desktop-settings schema and Sparkle updater by source signature across `.vite/build/*.js`, reads the latest `config.toml` before each background update check and automatic forced install scheduling pass, then skips those automatic paths when `[desktop].disableAutomaticUpdates = true`; a legacy top-level `disableAutomaticUpdates = true` is still accepted only when the desktop setting is absent.
- Manual `Check for Updates` and update install actions remain available because the updater is still initialized.
- The switch affects later background checks and automatic forced install scheduling in the same `codexfast launch` session. It cannot undo a startup/background check that already began before the setting changed.
- This does not modify `app.asar`, `Info.plist`, the app bundle, the app signature, or macOS update metadata.

### GPT-5.x model-list entries for custom API users

- Exposes `GPT-5.5` in the app model list on supported builds when the bundled model catalog does not include it.
- On `26.422.21637`, the app filters the raw `model/list` response into `modelsByType` before rendering menus, so the patch also preserves the injected entry after that query selector filter.
- On later builds, GPT-5.5 can be visible through the official app path. `codexfast` should still patch model-list metadata when the official GPT-5.5 entry lacks Fast service-tier metadata, otherwise switching accounts can leave GPT-5.5 selected while hiding Settings Fast, `/fast`, and the composer Speed menu.
- On `26.707.31428`, the model-list bridge also adds or normalizes `GPT-5.6 Sol`, `GPT-5.6 Terra`, and `GPT-5.6 Luna` with Fast service-tier metadata. Sol and Terra expose low/medium/high/xhigh/max/ultra reasoning; Luna exposes low/medium/high/xhigh/max and intentionally omits ultra.
- That older build also patches the downstream model query selector because its `use_hidden_models` path applies a remote allowlist after `model/list`. The selector keeps the three GPT-5.6 ids visible and allows max/ultra through to per-model filtering; Luna still omits ultra because its model metadata does not advertise it.
- Starting at `26.707.41301+5103`, GPT-5.6 is supported by the official app path. That build and every numerically later build that is separately added to the strict whitelist skip both the GPT-5.6 model-list injection and query-selector widening targets.
- This injects the UI catalog metadata only. The configured custom API provider must still accept `gpt-5.5`, `gpt-5.6-sol`, `gpt-5.6-terra`, or `gpt-5.6-luna` at request time.
- This does not replace the app's model execution path or make Codex merge arbitrary custom provider `/v1/models` responses into the UI catalog.

## Scope Rules

- `Settings-side Fast control`, composer `/fast`, and the composer-side `Speed` menu should be treated as one combined Fast feature set.
- `Plugins` support should not be described as available unless the sidebar/page gates still work cleanly on the target build.
- `GPT-5.x` model-list support should not be described as provider support. It is only a UI catalog entry.
- `Disable automatic updates` should be described as suppression for automatic background checks and forced install scheduling, not as a global updater removal.
- Compatibility claims must also match `docs/compatibility-matrix.md` and the strict whitelist in `src/supported-app-versions.mts`.
