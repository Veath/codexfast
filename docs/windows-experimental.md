# Experimental Windows Store/MSIX Support

This document defines the first Windows support boundary for `codexfast`.

Windows support is experimental. It exists so contributors can install the npm package, exercise an offline-validated candidate through the platform launcher on a real Windows machine, and collect the evidence required to promote that exact package version to supported. Installation on Windows does not by itself mean that the installed Codex package is supported.

## Current Scope

| Item | Status |
| --- | --- |
| Distribution | Official Microsoft Store/MSIX package named `OpenAI.Codex`, exact package family `OpenAI.Codex_2p2nqsd0c76g0`, only |
| Command | `npx codexfast launch` |
| Compatibility policy | Exact Windows package versions only; unknown versions fail closed |
| Initial feature target | Complete Fast chain: Settings Fast, `/fast`, composer Speed menu, and the request path that sends `service_tier: "priority"` |
| Automatic-update control | Not supported on Windows; Store/Windows update behavior is unchanged |
| Verified Windows versions | See [`compatibility-matrix.md`](./compatibility-matrix.md); do not infer support from a macOS version number |

The official x64 MSIX `26.803.5235.0` is currently `offline-validated`: its manifest and packaged frontend were inspected, all six required Fast labels matched and patched, and the patched JavaScript parsed successfully. Its strict compatibility key is `win32:x64:26.803.5235+0`; that key admits the package to the experimental launcher so real Windows checks can run, but it is not a real Windows support claim. The launcher now requires the exact Store package family `OpenAI.Codex_2p2nqsd0c76g0`, publisher ID `2p2nqsd0c76g0`, `Store` signature kind, verified manifest entry, and resulting `OpenAI.Codex_2p2nqsd0c76g0!App` AUMID. Those installed-package checks, CDP activation, UI behavior, `service_tier: "priority"`, identity-guarded cleanup, and installed-package integrity still require Windows E2E validation. arm64 is not yet validated.

Loose executables, portable builds, manually extracted packages, repackaged MSIX files, and installations that do not resolve as the current user's `OpenAI.Codex` AppX package are outside this scope.

## How the Windows Launcher Works

The experimental launcher:

1. Uses `Get-AppxPackage` and `Get-AppxPackageManifest -Package` to discover the current user's package and obtain manifest metadata through the AppX APIs. Node does not open `AppxManifest.xml`, `app.asar`, or `app/ChatGPT.exe` directly under WindowsApps.
2. Requires the exact package name, package family, publisher ID, Store signature kind, package/manifest version and architecture, plus manifest application ID `App`, executable `app/ChatGPT.exe`, and entry point `Windows.FullTrustApplication`.
3. Resolves that verified identity to the exact AUMID `OpenAI.Codex_2p2nqsd0c76g0!App`.
4. Uses CIM to decide whether Codex is already running by matching the exact admitted `InstallLocation/app/ChatGPT.exe` path. An unrelated desktop process that merely has the image name `ChatGPT.exe` does not block launch. It then takes a separate pre-launch exact-path snapshot, asks Windows for an available loopback port, and activates the AUMID with `--remote-debugging-port=<port>` and `--remote-debugging-address=127.0.0.1`.
5. Verifies the activation result as a process identity containing PID, UTC start-time ticks, the activation-attempt start ticks, and the exact executable path inside the admitted package location. The activated process command line must contain exactly one copy of this launcher's CDP port and loopback-address arguments and no other `--remote-debugging-*` switch. A PID whose process predates the current activation attempt or does not carry that exact argument set is rejected instead of being adopted as authoritative.
6. Accepts CDP WebSocket URLs only when they use `ws://127.0.0.1:<selected-port>`, attaches through browser-level CDP before renderer JavaScript runs, and applies the existing narrow renderer patches in memory.
7. Keeps the interceptor alive for lazy-loaded chunks. The process monitor uses cancellable asynchronous PowerShell/CIM queries, immediately routes monitor failures into fail-closed cleanup, and does not block CDP event handling. Patch-session-loss cleanup rechecks the recorded authoritative activation identity, opens that exact process through native Windows APIs, verifies start time and executable path on the handle, and calls `TerminateProcess` on the verified handle. It reports success only after the guarded root exits and bounded exact-path confirmation observes no remaining admitted-path process. When the authoritative root disappears after session readiness, codexfast does not close interception before a read-only bounded exact-path confirmation and returns success (`0`) only if no admitted-path process remains; the polling monitor cannot recover the process's original Windows exit code, and it never terminates a snapshot-only replacement PID. This is not a general descendant-tree guarantee for differently named helper executables. Activation-failure snapshots remain diagnostic only: without a verified PID returned by activation, codexfast never terminates a snapshot-only process. It reports possible residual processes—or an empty but non-authoritative observation—as cleanup unconfirmed and asks the user to fully quit Codex manually.

The launcher does not edit, unpack, replace, re-sign, or re-register the installed MSIX package, and it does not ask the user to take ownership of WindowsApps or change ACLs.

## Prerequisites

- A Windows environment with the AppX/MSIX PowerShell cmdlets available.
- PowerShell access to `Get-CimInstance Win32_Process` executable-path and command-line metadata, process start-time metadata, and the Windows process APIs compiled by `Add-Type`. If those identity or handle checks fail, activation or cleanup fails closed.
- The official Microsoft Store `OpenAI.Codex` package installed for the same user running the terminal.
- Node.js `>=18.12.0`.
- Codex fully quit before launch.
- An exact offline-validated package version admitted by the Windows experimental compatibility allowlist.

Run from PowerShell or Windows Terminal:

```powershell
npx codexfast launch
```

From a repository clone after building the generated CLI:

```powershell
node .\bin\codexfast launch
```

Keep the launcher process running for the entire Codex session. Closing it stops interception of later lazy-loaded JavaScript.

## Direct Fast Configuration

Current Codex clients also support a shared configuration-level service-tier
preference:

The Windows user-level file is `%USERPROFILE%\.codex\config.toml` (typically
`C:\Users\<you>\.codex\config.toml`). The official
[Windows app documentation](https://learn.chatgpt.com/docs/windows/windows-app)
states that the desktop app uses the same Codex home directory as native Codex
for the same Windows user.

```toml
service_tier = "fast"

[features]
fast_mode = true
```

The official [OpenAI configuration basics](https://learn.chatgpt.com/docs/config-file/config-basic)
documents the user-level file, and the
[configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
states that `fast` maps to the request value `priority` and that the Fast-mode
feature is stable and enabled by default. Use this simpler path when the active
model/provider advertises Fast support and you only need the request-tier
preference. It does not prove that the Windows desktop Settings, `/fast`, and
composer Speed UI paths are exposed; validating those bundle paths is the
purpose of this experimental launcher.

## Collect Validation Data

Run these read-only commands in PowerShell and retain their output with the validation report:

```powershell
$pkg = Get-AppxPackage -Name OpenAI.Codex -ErrorAction Stop
$manifest = Get-AppxPackageManifest -Package $pkg.PackageFullName

$pkg | Select-Object `
  Name, Version, PackageFullName, PackageFamilyName, PublisherId, `
  SignatureKind, Architecture, InstallLocation

$manifest.Package.Applications.Application |
  Select-Object Id, Executable, EntryPoint

$manifest.Package.Applications.Application |
  ForEach-Object { "$($pkg.PackageFamilyName)!$($_.Id)" }

Get-ChildItem -LiteralPath $pkg.InstallLocation `
  -Filter app.asar -Recurse -File -ErrorAction SilentlyContinue |
  Select-Object FullName, Length, LastWriteTime
```

Capture a read-only hash before and after the launch test when `app.asar` can be read:

```powershell
$asar = Get-ChildItem -LiteralPath $pkg.InstallLocation `
  -Filter app.asar -Recurse -File -ErrorAction Stop |
  Select-Object -First 1

$before = Get-FileHash -Algorithm SHA256 -LiteralPath $asar.FullName
$before
```

After the test, run:

```powershell
$after = Get-FileHash -Algorithm SHA256 -LiteralPath $asar.FullName
$after
$before.Hash -eq $after.Hash
```

The expected installed identity is package family `OpenAI.Codex_2p2nqsd0c76g0`, publisher ID `2p2nqsd0c76g0`, signature kind `Store`, application ID `App`, executable `app/ChatGPT.exe`, and entry point `Windows.FullTrustApplication`. Record any mismatch and stop validation.

The final hash expression must be `True` when the file is readable. This manual integrity check is separate from launcher admission: the launcher obtains manifest metadata through `Get-AppxPackageManifest` and does not require Node to open protected WindowsApps manifest, `app.asar`, or executable files. If WindowsApps permissions prevent the manual hash from being read, record that limitation instead of changing ownership or ACLs on the package directory.

## Acceptance Requirements

A Windows package version must not be marked `supported` until a real Windows machine verifies all of the following:

- AppX discovery returns the exact official name, package family, publisher ID, Store signature kind, version, architecture, manifest entry, and AUMID listed above.
- Package and manifest metadata are obtained through the AppX APIs without taking ownership of WindowsApps, changing ACLs, or relying on direct Node reads of the protected manifest, `app.asar`, or executable.
- AUMID activation accepts the loopback CDP arguments and `http://127.0.0.1:<port>/json/version` becomes reachable for the launched session.
- Successful activation records the returned PID, process start time, activation-attempt start time, and exact executable path under the admitted package location; the process must not predate the activation attempt, and its command line must contain exactly one selected CDP port argument, exactly one loopback-address argument, and no other `--remote-debugging-*` switch.
- `Runtime launch completed` is printed only after the exact Windows package version passes the compatibility gate, browser-level CDP attaches, and expected `app://` JavaScript traffic is observed.
- The completion message is not treated as proof of the full Fast chain. Settings and composer assets are lazy-loaded, so the validator must open those paths, record the observed Fast target labels, and complete the UI/request checks below.
- Settings Fast is visible and usable.
- Typing `/fast` exposes the slash command and can switch Fast without breaking the composer.
- The composer Speed menu shows both Standard and Fast.
- The selected Fast state persists through the relevant send, stop, edit, resume, and resend paths.
- A real custom API/provider request made with Fast selected sends `service_tier: "priority"`. Validation logs must redact API keys, authorization headers, prompts, and unrelated user data.
- Lazy-loaded Settings or composer chunks still patch while the launcher remains running.
- A controlled activation-error test proves that a verified authoritative activation PID was bound to the current CDP launch arguments and receives PID/start-time/path revalidation before cleanup. A separate missing/malformed-PID, stale-PID, or command-line-mismatch case must prove that bounded exact-path polling is diagnostic only, that snapshot-only processes are not terminated, and that even empty snapshots are reported as cleanup unconfirmed.
- A controlled CDP session-loss test proves that cleanup revalidates the recorded PID, start time, and exact package executable path on a native process handle, terminates that exact handle, confirms the guarded root exited, and then requires bounded exact-path polling to observe no residual admitted-path process before exiting non-zero.
- A controlled post-readiness root-disappearance test proves that the interceptor is not closed before read-only bounded exact-path polling runs, that an empty admitted path returns success (`0`) without claiming to recover the original Windows exit code, and that any residual admitted-path process causes a nonzero exit and manual-recovery guidance without terminating a snapshot-only PID.
- PID reuse, start-time drift, executable-path drift, handle-open failure, monitor failure, termination failure, residual exact-path processes, or confirmation-query failure must report that fail-closed cleanup was not confirmed. No broad image-name or second PID-based termination may be used against unrelated Codex instances or other user processes.
- The installed MSIX files and package registration remain unchanged, and Codex still starts normally from the Start menu after a full quit.
- Windows Store/Windows automatic-update behavior is unchanged.

After those checks pass, promote the exact package version from `offline-validated` to `supported` in the compatibility matrix and README, and update its strict allowlist description in the same change. Offline bundle inspection and automated fixtures are useful prerequisites, but they are not a substitute for this real-app run.

## Safety Boundaries

- The launcher requests CDP with `--remote-debugging-address=127.0.0.1` on a port allocated through the Windows TCP stack, requires the authoritative activation command line to contain exactly that port/address pair and no other `--remote-debugging-*` switch, and accepts browser/renderer WebSocket URLs only on that exact loopback host and port.
- This experimental path does not yet bind the listening TCP port's owning process back to the authoritative activation PID. The separate pre-launch exact-path snapshot and AUMID activation also leave a concurrency race if another admitted-path Codex process starts between those operations. Real Windows validation must confirm that the observed CDP session belongs to the activated app and that no concurrent admitted-path launch occurred.
- Runtime patches are in memory for the launched session only.
- Unknown package versions and startup/CDP interception failures fail closed. Lazy feature compatibility is established by offline signature checks plus the real-app acceptance run, not by the startup message alone.
- The launcher must not modify WindowsApps ownership, ACLs, package files, manifests, registration, or signatures.
- The launcher must not terminate by broad image name or issue a second PID-based kill. Handle-scoped termination is limited to the authoritative identity returned by the current activation attempt, and only after start time and executable path are verified on that native handle.
- Successful cleanup confirmation is limited to the verified launched process and the admitted `app/ChatGPT.exe` path. It does not prove that differently named helper executables exited; any visible residual Codex helper must be quit manually.
- A normal authoritative-root exit after session readiness is not accepted as a clean session end until bounded exact-path polling observes no admitted-path process. Residual exact-path processes are reported as unconfirmed and are never terminated solely from the snapshot.
- Activation failure does not relax the cleanup boundary. If the returned identity is missing, malformed, or older than the activation attempt, bounded exact-path snapshots are used only to diagnose possible residual processes. Snapshot-only identities are never eligible for termination; empty activation-failure snapshots also do not prove cleanup. The user must fully quit any possible residual Codex process manually before retrying.
- If identity revalidation or cleanup fails, the launcher reports that cleanup was not confirmed. It does not claim that every process was closed and does not broaden the termination target.
- Windows does not receive the macOS Sparkle `NODE_OPTIONS` hook or the codexfast automatic-update setting.
- `codexfast` exposes a client-side feature path only. It does not grant an OpenAI entitlement, enable Priority processing on an unsupported provider, bypass account/admin policy, or change API billing.

## Reporting a Windows Result

Include:

- the package/manifest output from the commands above;
- the `codexfast` version or commit;
- whether the CLI was run through `npx` or `node .\bin\codexfast`;
- the patched-target output;
- the complete Fast-chain results, including redacted evidence that the request used the priority service tier;
- session-loss cleanup results;
- activation-error cleanup results, including any identity-revalidation refusal or unconfirmed cleanup message;
- before/after package-file hashes when readable;
- any difference between x64 and arm64 behavior.

Do not include tokens, authorization headers, prompts, account identifiers, or unrelated filesystem paths.
