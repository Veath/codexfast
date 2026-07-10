# Fast Global Service Tier Source Design

## Context

The earlier `26.707` fallback fix treated conversation-level `"default"` and `"standard"` values as stale, but preserved an explicit conversation-level `"priority"`. Live runtime inspection after disabling Fast showed the inverse failure:

- configured Settings tier: `"default"`
- retained conversation next-turn tier: `"priority"`
- computed `serviceTierForRequest`: `"priority"`
- visible Speed state: Fast

The patch itself was loaded correctly. The remaining bug is therefore the priority model: conversation state can still override the configured global tier.

This design supersedes the preservation rule in `2026-07-10-fast-conversation-default-fallback-design.md` for build `26.707.31428`.

## Desired Behavior

- The configured global `service_tier` is the only speed source for existing conversations.
- Switching to any existing conversation must reflect the current global Fast or Standard setting in both the UI and outgoing requests.
- Existing conversation next-turn values such as `"priority"`, `"default"`, `"standard"`, or null must not override the configured tier.
- Latest-turn `params.serviceTier` state must remain excluded.
- New-thread draft and managed-new-thread resolution may continue through the bundle's existing base-tier calculation before a conversation exists.
- Model support and service-tier allowance validation must remain unchanged.

## Recommended Implementation

Keep the current guarded matcher for the official `26.707` bundle shape, but simplify the patched request-tier expression to use the already-computed base tier directly. For an existing conversation, that base tier is the configured Settings tier. For a new-thread draft, it retains the official draft or managed-new-thread behavior.

The patched flow becomes conceptually:

```text
request tier = resolved base tier
serviceTierForRequest = existing model/allowance normalization(request tier)
```

Do not inspect conversation next-turn or latest-turn service-tier values in the patched request calculation.

Keep the existing setter and persistence calls unchanged. They may continue writing a per-conversation copy, but that copy becomes non-authoritative and cannot cause future cross-conversation drift. Avoiding cleanup writes keeps the fix runtime-only and surgical.

## Regression Coverage

Extend the `26.707` runtime patch regression before changing production code. Evaluate the generated request-tier expression and prove:

- configured `"default"` plus conversation `"priority"` resolves to `"default"`
- configured `"priority"` plus conversation `"default"` resolves to `"priority"`
- configured `"priority"` plus conversation `"standard"` resolves to `"priority"`
- configured `"priority"` plus conversation `"priority"` resolves to `"priority"` because the configured value is authoritative
- stale latest-turn service-tier state remains absent from the patched expression
- repeated patching remains idempotent
- generated CLI coverage still exercises the embedded runtime patch engine

## Documentation Scope

Update `docs/feature-scope.md`, `docs/patch-targets.md`, and `CHANGELOG.md` so they describe the configured tier as the single source of truth for existing conversations. Replace wording that says explicit non-standard conversation state is preserved.

## Validation

Run:

```bash
pnpm build:check
pnpm typecheck
pnpm test
```

Apply the updated patch engine to the real extracted build `5059` bundle and confirm the patched expression uses only the resolved base tier. Verify `app.asar`, `Info.plist`, and the installed app signature remain unchanged.

A fresh-session UI check requires fully quitting the currently active ChatGPT session and relaunching with the regenerated CLI, so it must not be claimed unless that restart is actually performed.

## Non-Goals

- Do not enumerate, rewrite, or clear stored conversation settings.
- Do not change the compatibility whitelist, model metadata, Plugins behavior, automatic-update behavior, or package version.
- Do not modify the installed app bundle.
- Do not publish or release a package as part of this fix.
