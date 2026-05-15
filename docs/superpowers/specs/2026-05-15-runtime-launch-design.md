# Runtime Launch Mode Design

## Final Scope

Add a new default-recommended runtime launch mode that keeps the official `Codex.app` bundle untouched while applying the existing `codexfast` feature patches in memory before renderer JavaScript executes.

Keep the existing bundle patch flow as a legacy fallback:

- `apply`
- `restore`
- `install-watcher`
- `uninstall-watcher`

The no-argument interactive menu should remain, with `launch` as the first and recommended action. `apply` and `restore` remain available but are described as legacy bundle patch commands.

## Goals

- Preserve the OpenAI Developer ID signature by default.
- Avoid writing `Contents/Resources/app.asar`.
- Avoid ad-hoc `codesign` in the default path.
- Avoid `tccutil reset` in the default path.
- Reuse the existing target signatures where possible.
- Keep strict version/build compatibility gating.
- Fail closed on unsupported builds or injection failures.

## Non-Goals

- Do not remove legacy `apply` / `restore` in the first runtime-launch release.
- Do not silently open an unpatched Codex window when runtime patching fails.
- Do not expose a fixed public remote-debugging port.
- Do not try to make the app patched when users double-click `Codex.app` directly.

## User-Facing Commands

### Recommended

```bash
npx codexfast launch
```

Launches official `Codex.app` with runtime patches. This is the recommended path in README and should not modify the installed app.

### Interactive Menu

No-argument `npx codexfast` continues to show a menu. The first item becomes:

```text
1) Launch Codex with runtime patches (recommended)
```

Legacy options remain below it:

```text
2) Check current status
3) Enable custom API features (legacy bundle patch)
4) Restore original app (legacy bundle patch)
5) Install auto-repair watcher (legacy)
6) Uninstall auto-repair watcher
```

### Legacy

`apply`, `restore`, and watcher commands keep their current behavior for users who need the static bundle patch fallback.

## Architecture

### Runtime launcher

The launcher starts `/Applications/Codex.app` without changing files. It passes a random localhost-only debugging port to Chromium/Electron, then connects to the DevTools Protocol.

Required launch properties:

- Bind CDP to `127.0.0.1`.
- Use a random available port.
- Tie the CDP lifecycle to the launched Codex process.
- Refuse to continue if another incompatible Codex instance is already running and cannot be instrumented.

### CDP interception

Runtime patching must happen before the renderer executes target JavaScript. The preferred implementation is CDP Fetch or Network interception for `app://.../webview/assets/*.js`.

For each intercepted JavaScript response:

1. Decode the response body.
2. Run the same target inspection and replacement logic used by the bundle patcher.
3. Serve the modified JavaScript body back to the renderer.
4. Record which target labels were patched.

Plain `Runtime.evaluate` injection after page load is not sufficient for most existing targets because several gates live inside minified module closures and may already have run.

### Patch engine reuse

Extract the target matching and replacement code so both modes can use it:

- file mode: reads and writes asset files in an extracted `app.asar`
- memory mode: accepts a JavaScript body and returns a patched JavaScript body plus target state

The target specs remain the source of truth.

### Compatibility gating

`launch` reads `CFBundleShortVersionString` and `CFBundleVersion` from the installed app before launch. Unsupported builds fail before starting Codex.

The runtime mode should report:

- detected version
- detected build
- compatibility state
- expected target count
- patched target labels

## Feature Expectations

Runtime launch should cover the same feature set as the current static patch mode:

- Settings-side Fast control
- composer `/fast`
- composer Speed menu
- Plugins gates
- composer plugin mentions
- GPT-5.5 compatibility targets where still needed

The browser-use native pipe `missing-code-signing-identity` compatibility target should not be needed in runtime mode because the app keeps the official signature. It can remain in legacy `apply` for users who still patch the bundle.

## Failure Behavior

Runtime launch fails closed:

- unsupported build: print compatibility details and do not start Codex
- CDP port unavailable: pick another random port or fail before app launch
- CDP connection unavailable after launch: terminate the launched Codex process and report failure
- target interception incomplete: terminate the launched Codex process and report which targets were missing
- user already has Codex running: report that Codex must be fully quit before runtime launch

## Security Boundaries

- CDP listens only on `127.0.0.1`.
- The port is random by default.
- The port is not advertised as a stable public interface.
- Documentation must say runtime launch preserves the official app signature but opens a local debugging/injection channel for that launched session.
- The launcher should avoid printing sensitive CDP URLs unless debug output is explicitly requested.

## Documentation Changes

Update:

- `README.md`
- `README.zh-CN.md`
- `docs/feature-scope.md`
- `docs/troubleshooting.md`
- `docs/patch-targets.md`
- `docs/real-app-validation.md`
- `CHANGELOG.md`

README should make `launch` the default recommended path and move `apply/restore` wording under legacy fallback.

## Test Strategy

### Unit and regression tests

- Extract patch engine tests for in-memory JavaScript body replacement.
- Keep existing file/archive regression coverage for legacy `apply` / `restore`.
- Add launch-mode command tests for:
  - unsupported build fails before app launch
  - supported build chooses a localhost random port
  - intercepted JS body gets patched before fulfillment
  - incomplete target coverage fails closed

### Real-app validation

Before calling runtime launch supported:

- launch official Codex through `npx codexfast launch`
- confirm app signature remains OpenAI Developer ID
- confirm no `app.asar` hash or mtime changes
- confirm Fast / Speed / Plugins paths work
- confirm `@chrome` no longer hits the ad-hoc-signing `missing-code-signing-identity` path

## Migration Plan

1. Refactor patch target application into a mode-neutral patch engine.
2. Add `launch` command behind the existing strict compatibility gate.
3. Add CDP launch and interception for supported local builds.
4. Update the interactive menu to make launch the first recommended item.
5. Update docs to recommend `launch` by default and mark `apply/restore` as legacy fallback.
6. Keep legacy bundle patch mode intact for at least one release.

## Open Decisions

- The first implementation should require Codex to be fully quit before launch.
- The first implementation should not attach to an already-running Codex instance.
- The first implementation should not install a persistent launcher alias until runtime launch is validated on the real app.
