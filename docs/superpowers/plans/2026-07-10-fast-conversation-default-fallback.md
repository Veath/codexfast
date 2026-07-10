# Fast Conversation Default Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep configured Fast active when reopening a `26.707` conversation that retains the newer Standard spelling `serviceTier: "default"`.

**Architecture:** Extend only the `speed-service-tier-conversation-fallback-26707` target. The patched expression will accept an explicit conversation tier only when it is neither `"standard"` nor `"default"`; otherwise it will pass the configured Settings tier through the existing model/allowance normalization helper.

**Tech Stack:** TypeScript, Node.js, regex-based runtime JavaScript patching, generated single-file CLI, shell-backed regression suite.

---

## File Map

- Modify `test/suites/runtime-patch-suite.mts`: add a semantic regression for the generated `26.707` request-tier expression.
- Modify `src/targets/speed.mts`: extend the patched signature and replacement to reject stale `"default"` conversation state.
- Modify `docs/feature-scope.md`: document current and legacy Standard spellings in fallback behavior.
- Modify `docs/patch-targets.md`: record the build `5059` fallback detail.
- Modify `CHANGELOG.md`: record the unreleased bug fix.
- Regenerate `bin/codexfast`: ship the updated target in the self-contained launcher.

### Task 1: Add the failing `default` fallback regression

**Files:**
- Modify: `test/suites/runtime-patch-suite.mts` near the `serviceTierConversationFallback26707Result` assertions

- [ ] **Step 1: Assert the generated expression excludes both Standard spellings**

Replace the existing single-spelling assertion with:

```ts
  assertContains(
    serviceTierConversationFallback26707Result.content,
    "k=e!=null&&u?.serviceTier!=null&&u.serviceTier!==`standard`&&u.serviceTier!==`default`?u.serviceTier:O",
    "expected 26.707 fallback to ignore current default and legacy standard conversation tiers while preserving explicit Fast",
  );
```

- [ ] **Step 2: Evaluate the actual generated expression**

Add immediately after the string assertion:

```ts
  const requestTierExpression26707 =
    serviceTierConversationFallback26707Result.content.match(/k=([^;]+);S=Iee/)?.[1];
  if (!requestTierExpression26707) {
    fail(
      "expected to extract the 26.707 request-tier expression from the patched service-tier fallback",
      serviceTierConversationFallback26707Result.content,
    );
  }
  const resolveConversationTier26707 = new Function(
    "e",
    "u",
    "O",
    `return ${requestTierExpression26707}`,
  ) as (
    conversationId: string | null,
    nextTurnSettings: { serviceTier?: string | null } | null,
    configuredTier: string | null,
  ) => string | null;
  if (
    resolveConversationTier26707("conversation", { serviceTier: "default" }, "priority") !==
    "priority"
  ) {
    fail("expected stale default conversation tier to fall back to configured Fast");
  }
  if (
    resolveConversationTier26707("conversation", { serviceTier: "standard" }, "priority") !==
    "priority"
  ) {
    fail("expected legacy standard conversation tier to fall back to configured Fast");
  }
  if (
    resolveConversationTier26707("conversation", { serviceTier: "priority" }, "default") !==
    "priority"
  ) {
    fail("expected explicit non-Standard next-turn Fast to remain selected");
  }
```

- [ ] **Step 3: Run the focused generated/runtime regression and verify RED**

Run:

```bash
pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: FAIL at the new assertion because the current patched expression contains only `u.serviceTier!==\`standard\`` and still lets `"default"` override `"priority"`.

### Task 2: Implement the minimal target change

**Files:**
- Modify: `src/targets/speed.mts` in `SERVICE_TIER_CONVERSATION_FALLBACK_26707_PATCHED_SIGNATURE`
- Modify: `src/targets/speed.mts` in `patchConversationServiceTierFallback26707`

- [ ] **Step 1: Extend the patched signature**

Change the next-turn branch inside `SERVICE_TIER_CONVERSATION_FALLBACK_26707_PATCHED_SIGNATURE` to require both exclusions:

```ts
const SERVICE_TIER_CONVERSATION_FALLBACK_26707_PATCHED_SIGNATURE =
  /(let [^;]+,([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*==null&&[A-Za-z_$][\w$]*!=null\?[A-Za-z_$][\w$]*\.value:[A-Za-z_$][\w$]*\?[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\):[A-Za-z_$][\w$]*\.serviceTier,([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)!=null&&([A-Za-z_$][\w$]*)\?\.serviceTier!=null&&\5\.serviceTier!==`standard`&&\5\.serviceTier!==`default`\?\5\.serviceTier:\2;)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\(([^,]+),\3,([A-Za-z_$][\w$]*)\),/;
```

- [ ] **Step 2: Emit the matching replacement expression**

Change the return value in `patchConversationServiceTierFallback26707` to:

```ts
  return `${prefixBeforeRequestTier}${requestTierVar}=${conversationVar}!=null&&${nextTurnSettingsVar}?.serviceTier!=null&&${nextTurnSettingsVar}.serviceTier!==\`standard\`&&${nextTurnSettingsVar}.serviceTier!==\`default\`?${nextTurnSettingsVar}.serviceTier:${baseTierVar};${serviceTierForRequestVar}=${fallbackFunction}(${modelVar},${requestTierVar},${isAllowedVar}),`;
```

- [ ] **Step 3: Regenerate the single-file launcher**

Run:

```bash
pnpm build
```

Expected: `bin/codexfast` is regenerated and includes both `standard` and `default` exclusions in the `26.707` fallback target.

- [ ] **Step 4: Re-run the focused regression and verify GREEN**

Run:

```bash
pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: PASS, including the semantic `default`, `standard`, and `priority` cases plus existing repeated-patch coverage.

### Task 3: Update reusable documentation

**Files:**
- Modify: `docs/feature-scope.md`
- Modify: `docs/patch-targets.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Clarify feature-scope fallback wording**

Replace the existing reopened-conversation sentence with:

```markdown
- On newer service-tier bundles, reopened conversations and paused/edited resends keep explicit non-standard next-turn Fast selections while falling back to the configured Settings tier when stale `"default"`, `"standard"`, or null conversation-level or latest-turn service-tier state would otherwise force Standard.
```

- [ ] **Step 2: Record the build-specific detail**

Append to the `26.707.31428` paragraph in `docs/patch-targets.md`:

```text
The conversation fallback treats both the current `default` and legacy `standard` Standard spellings as stale fallback state so they cannot override configured Fast after switching conversations.
```

- [ ] **Step 3: Add the unreleased changelog entry**

Under `## [Unreleased]`, add:

```markdown
### Fixed

- Fixed Fast falling back to Standard for only some reopened `26.707` conversations by treating the current `default` and legacy `standard` conversation-tier values as fallback state instead of overrides of configured Fast.
```

- [ ] **Step 4: Verify documentation and generated-file consistency**

Run:

```bash
git diff --check
pnpm build:check
```

Expected: both commands exit successfully with no generated CLI drift.

### Task 4: Run full verification and inspect the real bundle

**Files:**
- Verify only; no additional files expected

- [ ] **Step 1: Run static and regression gates**

Run:

```bash
pnpm typecheck
pnpm test
```

Expected: both commands pass.

- [ ] **Step 2: Reinspect the extracted installed bundle**

Run:

```bash
pnpm inspect:bundle-targets /tmp/codexfast-5059.wWWURZ/app
```

Expected: `speed-service-tier-conversation-fallback-26707` remains `guarded` in the official extracted bundle, proving the updated source still matches build `5059` before runtime replacement.

- [ ] **Step 3: Confirm the app bundle remains untouched**

Run:

```bash
stat -f '%N %z %Sm' /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict /Applications/ChatGPT.app
```

Expected: files remain present and signature verification succeeds. Do not restart the active app because the current conversation depends on that process.

- [ ] **Step 4: Commit the focused implementation**

Run:

```bash
git add src/targets/speed.mts test/suites/runtime-patch-suite.mts bin/codexfast docs/feature-scope.md docs/patch-targets.md CHANGELOG.md docs/superpowers/plans/2026-07-10-fast-conversation-default-fallback.md
git commit -m "fix: preserve Fast across conversation switches"
```

Expected: one focused Conventional Commit containing the source, generated launcher, regression, docs, and implementation plan. Do not publish or create a release.
