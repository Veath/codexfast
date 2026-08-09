# Real-App Validation

This checklist is for manual smoke-testing after a real runtime-launch adaptation. The existing checklist covers installed macOS `Codex.app` / `ChatGPT.app` builds; the final section defines the additional requirements for experimental Windows Store/MSIX validation.

Run these checks after any meaningful bundle change, runtime patch-signature update, or compatibility-whitelist expansion.

## macOS Runtime Launch Checks

Use these checks when validating `launch` behavior. Do not mark a build as real-app validated from regression tests alone.

- For `26.715.21425+5488`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `general-settings-B8bUS3xL.js` receives the row-local-`h` automatic-update target, and `.vite/build/window-all-closed-DXvqe7lL.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.715.31925+5551`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `general-settings-Boi5S8Wz.js` receives the existing row-local-`h` automatic-update target, and `.vite/build/window-all-closed-CZr9g6FK.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.715.52143+5591`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `general-settings-CsA3Lt9Z.js` receives the existing row-local-`h` automatic-update target, and `.vite/build/window-all-closed-CZr9g6FK.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.715.61943+5628`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `general-settings-BWZCvLqI.js` receives the existing row-local-`h` automatic-update target, and `.vite/build/window-all-closed-CZr9g6FK.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.715.70719+5650`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `general-settings-BOz8t03P.js` receives the existing row-local-`h` automatic-update target, and `.vite/build/window-all-closed-CZr9g6FK.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.715.72028+5706`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `general-settings-BfleeL7z.js` receives the existing row-local-`h` automatic-update target, and `.vite/build/window-all-closed-DoNbesKf.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.715.72359+5718`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `general-settings-CM4Mcgcy.js` receives the existing row-local-`h` automatic-update target, and `.vite/build/window-all-closed-DoNbesKf.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.721.30844+5813`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `app-initial-BTphDPeq.js` receives the shared Fast, `/fast`, and Intelligence Speed targets, `general-settings-3znNSOBs.js` receives Settings Fast plus the app-name-aware automatic-update row, and `.vite/build/window-all-closed-BwlaNiSa.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.721.31836+5828`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `app-initial-C-fROkKo.js` receives the shared Fast, `/fast`, and Intelligence Speed targets, `general-settings-DaCT8Zmh.js` receives Settings Fast plus the app-name-aware automatic-update row, and `.vite/build/window-all-closed-Bz3ZcBls.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.721.41059+5848`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `app-initial-BHB6SClA.js` receives the shared Fast, `/fast`, and Intelligence Speed targets, `general-settings-D7HslvR1.js` receives Settings Fast plus the app-name-aware automatic-update row, and `.vite/build/window-all-closed-a9FCmS92.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.721.81911+5973`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `app-initial-CRKqnyc3.js` receives the shared Fast, `/fast`, and Intelligence Speed targets, `general-settings-CcPMYysK.js` receives Settings Fast plus the app-name-aware automatic-update row, and `.vite/build/window-all-closed-a9FCmS92.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.727.40816+6067`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `app-initial-DRyZ1Lin.js` receives the shared Fast, `/fast`, Intelligence Speed, and renderer settings-schema targets, `general-settings-BtLJps-O.js` receives Settings Fast plus the app-name-aware automatic-update row, and `.vite/build/window-all-closed-Coc41Tfs.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.727.51351+6119`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `app-initial-iBPGfcXU.js` receives the shared Fast, `/fast`, Intelligence Speed, and renderer settings-schema targets, `general-settings-BBCiVbba.js` receives Settings Fast plus the app-name-aware automatic-update row, and `.vite/build/window-all-closed-Coc41Tfs.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.730.61309+6223`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `app-initial-YjNFxVhk.js` receives the shared Fast, `/fast`, Intelligence Speed, and renderer settings-schema targets, `general-settings-DzOMKOoh.js` receives Settings Fast plus the app-name-aware automatic-update row, and `.vite/build/window-all-closed-DJDXIcEI.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.730.61639+6234`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `app-initial-CKNQDTeE.js` receives the shared Fast, `/fast`, Intelligence Speed, and renderer settings-schema targets, `general-settings-2iEePJwo.js` receives Settings Fast plus the app-name-aware automatic-update row, and `.vite/build/window-all-closed-DJDXIcEI.js` receives the callback-aware Sparkle hook while manual update methods remain intact.
- For `26.803.41515+6321`, confirm the official Plugins/GPT-5.6 paths remain unpatched, `app-initial-Biw83Aiz.js` receives the shared Fast, `/fast`, Intelligence Speed, and renderer settings-schema targets, `general-settings-BseQIe_j.js` receives Settings Fast plus the app-name-aware automatic-update row, and `.vite/build/window-all-closed-9IR0zY5D.js` receives the nested callback-aware Sparkle hook while manual update methods remain intact.

- `npx codexfast launch` starts Codex when Codex is not already running
- The launched session opens with runtime patches active
- The launch output reports the required initial target labels for the current build before it reports `Runtime launch completed`; older builds include `Plugins access`, while `26.601.21317`, `26.602.30954`, `26.602.40724`, `26.602.71036`, `26.608.12217`, `26.609.30741`, `26.609.41114`, `26.609.71450`, `26.611.61049`, `26.611.61753`, `26.611.62324`, `26.616.31447`, `26.616.51431`, `26.616.71553`, `26.616.81150`, `26.623.31443`, `26.623.31921`, `26.623.42026`, `26.623.61825`, `26.623.70822`, `26.623.81905`, `26.623.101652`, `26.623.141536`, `26.707.31428`, `26.707.41301`, `26.707.61608`, `26.707.71524`, `26.707.72221`, `26.707.91948`, `26.715.31925`, `26.715.52143`, `26.715.61943`, and `26.715.70719` do not require that legacy target because the old sidebar/page/detail gates are absent or Plugins is supported by the official app path
- `26.715.72028`, `26.715.72359`, `26.721.30844`, `26.721.31836`, `26.721.41059`, `26.721.81911`, `26.727.40816`, and `26.727.51351` also skip the legacy `Plugins access` initial target because Plugins uses the official app path.
- `26.730.61309` also skips the legacy `Plugins access` initial target because Plugins uses the official app path.
- `26.730.61639` also skips the legacy `Plugins access` initial target because Plugins uses the official app path.
- `26.803.41515` also skips the legacy `Plugins access` initial target because Plugins uses the official app path.
- The `codexfast launch` process remains running while the launched Codex session is open
- The runtime patch session heartbeat stays quiet during normal use, and no `Runtime patch session lost` message appears
- If the runtime patch session is lost after reconnect attempts are exhausted, codexfast closes the launched Codex process and exits non-zero instead of leaving Codex running without runtime patching
- With the launch process still running, opening Settings activates the Settings-side Fast control even if the Settings chunk loads after the initial window
- If `[desktop].disableAutomaticUpdates = true`, source-signature discovery finds the active Sparkle module even after `.vite/build` chunk renames, automatic background checks and forced automatic install scheduling are suppressed, and manual `Check for Updates` and install actions remain available
- With the launch process still running, opening Plugins shows plugin page content even if the Plugins chunk loads after the initial window
- `app.asar`, `Info.plist`, and the app code signature are unchanged after launch exits
- If launch fails before runtime patching starts, the app signature and `app.asar` are still unchanged. On macOS, no Codex main process is left running. On Windows, a failure without a verified authoritative activation PID reports cleanup as unconfirmed and requires the operator to fully quit any possible residual process manually.
- Launch reports a clear failure when `Codex.app` is already running
- Launch is blocked when the detected version/build is unsupported

## Core App Checks

- `Codex.app` launches successfully through `codexfast launch`
- `Codex.app` still launches normally after a full quit and regular restart
- Opening Settings does not crash or show an error

## Fast Feature Set

- The Fast-related Settings control is visible and usable
- Open the build-specific composer-side `Speed` entry:
  - On `26.415.40636` and `26.417.41555`, open `Add files and more / +` and verify the `Speed` submenu is present
  - On `26.422.21637` and newer matching bundles, open the composer `Intelligence` dropdown and verify the `Speed` submenu is present
- Opening the `Speed` submenu shows `Standard` and `Fast`
- Selecting `Standard` or `Fast` from the build-specific composer-side menu does not break the UI
- Typing `/fast` in the composer shows the slash command item
- Selecting `/fast` can enable and disable Fast mode without breaking the UI
- On service-tier bundles, the selected Fast tier persists and is used by the composer request/config path for custom API users; it must not be normalized back to `null` or standard by the shared service-tier allowance hook
- On service-tier bundles, stopping a running Fast response, editing the queued/resumable message, and resending in the same conversation must not leave the request tier locked to Standard

## Plugins

- The `Plugins` sidebar entry is visible for custom API users
- Opening `Plugins` does not fail only because of the auth-method gate
- On builds with separate Plugins page/detail gates, plugin cards and plugin detail views show plugin-related content instead of falling back to skills-only or redirecting to `/skills`
- On builds with curated catalog gates, the full curated OpenAI plugin catalog remains visible for custom API users instead of showing only the limited-catalog placeholder such as `More plugins coming soon` or only bundled addable plugins such as Computer Use and LaTeX
- On builds with category-based Plugins pages, curated OpenAI categories such as Productivity, Developer Tools, Communication, or similar category sections are visible, and known curated plugins such as Linear, Slack, Gmail, Google Calendar, or Figma can appear through browse or search when the local catalog contains them
- On builds with install-flow gates, at least one plugin install button is not blocked solely by aggregate connector-unavailable state
- On builds with plugin detail app-connect gates, an installed plugin that declares an app shows the app connect area on the plugin detail page even if the directory app list is unavailable
- On builds with install-modal content gates, the install modal shows basic plugin details such as About, Includes, or Capabilities instead of an empty information card
- On builds with post-install app connect gates, installing a plugin that has one pending required app opens the app's `Connect <App>` permission modal instead of closing the install flow after only a success toast
- At least one plugin install or connect path is not blocked solely by `authMethod === "apikey"` or another patched custom-API gate

## Model List

- `GPT-5.5` appears in the app model picker for custom API users
- Selecting `GPT-5.5` writes the expected model setting
- A custom API provider request using `model: "gpt-5.5"` still succeeds independently of the UI catalog injection
- On `26.707.31428+5059`, GPT-5.6 Sol/Terra/Luna remain visible after the patched query selector; Sol and Terra include Max/Ultra, and Luna includes Max without Ultra
- On `26.707.41301+5103` and every later separately whitelisted build, confirm GPT-5.6 works through the official model list and selector and that runtime patch output does not report `GPT-5.x model list` or `GPT-5.6 model query selector`

## Recovery Checks

- Launch removes any legacy auto-repair watcher files if they were present before launch
- The installed app bundle is unchanged after launch

## macOS Notes

- Record the validated build in `docs/compatibility-matrix.md`.
- Add or update a bundle note when the validated build differs from the previous supported build.

## Windows Store/MSIX Experimental Validation

Do not mark a Windows package version as supported from macOS fixtures, offline MSIX inspection, or unit tests alone. Complete this section on a real Windows machine using the official Microsoft Store package named `OpenAI.Codex`.

### Record Package Identity

Run these read-only PowerShell commands:

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
```

Record the exact package version, architecture, package family, publisher ID, signature kind, manifest application ID/executable/entry point, and computed AUMID. The current experimental candidate must resolve to package family `OpenAI.Codex_2p2nqsd0c76g0`, publisher ID `2p2nqsd0c76g0`, signature kind `Store`, application ID `App`, executable `app/ChatGPT.exe`, entry point `Windows.FullTrustApplication`, and AUMID `OpenAI.Codex_2p2nqsd0c76g0!App`. Stop on any mismatch. A similar macOS version/build does not count as a Windows whitelist match.

### Establish the Integrity Baseline

Locate and hash `app.asar` without changing WindowsApps permissions:

```powershell
$asar = Get-ChildItem -LiteralPath $pkg.InstallLocation `
  -Filter app.asar -Recurse -File -ErrorAction Stop |
  Select-Object -First 1

$before = Get-FileHash -Algorithm SHA256 -LiteralPath $asar.FullName
$before
```

If package-directory permissions prevent this manual hash from being read, record that limitation. Do not take ownership, change ACLs, unpack, re-register, or re-sign the package to make validation easier. Launcher admission itself obtains manifest metadata through `Get-AppxPackageManifest`; it must not depend on Node directly opening the protected manifest, `app.asar`, or executable under WindowsApps.

### Launch the Candidate

Fully quit Codex, then run either the package candidate or a built repository clone:

```powershell
npx codexfast launch
```

```powershell
node .\bin\codexfast launch
```

Verify that the launcher:

- discovers only the current user's exact official Store identity listed above and rejects a mismatched PFN, publisher ID, signature kind, or manifest entry;
- obtains manifest metadata through `Get-AppxPackageManifest -Package`, without taking ownership of WindowsApps, changing ACLs, or requiring Node to open the protected manifest, `app.asar`, or executable directly;
- rejects an unknown package version before activation;
- refuses to continue if the exact admitted `InstallLocation/app/ChatGPT.exe` process is already running, while ignoring unrelated processes that merely share the `ChatGPT.exe` image name;
- resolves the manifest application ID/AUMID, asks Windows for an available loopback port, and activates it with `--remote-debugging-address=127.0.0.1` and that exact `--remote-debugging-port`;
- records and verifies the activated PID, UTC start-time ticks, and exact `app/ChatGPT.exe` path under the admitted package install location;
- does not invoke `launchctl`, `pgrep`, macOS process-group signals, or the Sparkle `NODE_OPTIONS` hook on Windows;
- prints `Runtime launch completed` only after the exact Windows package version passes the compatibility gate, browser-level CDP attaches, and expected `app://` JavaScript traffic is observed;
- does not treat that completion message as full Fast-chain proof, because Settings and composer assets are lazy-loaded and must be exercised in the next section;
- keeps the launcher/interceptor process running for the full app session.

When command-line inspection is available, confirm the loopback CDP endpoint:

```powershell
$cdpProcess = Get-CimInstance Win32_Process |
  Where-Object {
    $_.ExecutablePath -like "$($pkg.InstallLocation)*" -and
    $_.CommandLine -match '--remote-debugging-port=(\d+)'
  } |
  Select-Object -First 1

$port = [regex]::Match(
  $cdpProcess.CommandLine,
  '--remote-debugging-port=(\d+)'
).Groups[1].Value

Invoke-RestMethod "http://127.0.0.1:$port/json/version"
```

The endpoint must resolve only through loopback. If Windows restricts command-line inspection, record the limitation and use equivalent local diagnostics without weakening firewall or package permissions.

### Complete Fast-Chain Checks

- Settings Fast is visible and usable.
- `/fast` appears in the composer and switches the selected speed without breaking the UI.
- The composer Speed menu contains Standard and Fast.
- Fast remains correct through send, stop, edit, resume, and resend flows.
- Lazy-loaded Settings and composer chunks continue to patch while `codexfast launch` remains running.
- With a custom API/provider that supports the feature, selecting Fast produces a real request with `service_tier: "priority"`. Redact API keys, authorization headers, prompts, account identifiers, and unrelated user data from evidence.
- Do not accept a result where only the UI is visible but the request path remains Standard or omits the selected priority tier.

### Session-Loss and Process-Scope Checks

- In a controlled test, make the CDP patch session unavailable and allow the bounded reconnect attempts to exhaust.
- Confirm `Runtime patch session lost` is reported and the launcher exits non-zero.
- Confirm activation accepts the returned PID only when its command line contains exactly one selected CDP port argument, exactly one loopback-address argument, and no other `--remote-debugging-*` switch. Then confirm cleanup re-queries that recorded PID, opens a native process handle, matches both its original start time and exact package executable path on that handle, terminates the handle directly, waits for it to exit, and reports success only after an exact-path confirmation snapshot is empty.
- Confirm simulated PID reuse, start-time drift, executable-path drift, or process-query failure refuses termination and reports that fail-closed cleanup was not confirmed.
- Separately force activation to fail after a process starts. When activation returns a verified authoritative PID, confirm only its matching native handle is eligible for start-time/path revalidation and cleanup. Then repeat with the PID missing, malformed, older than the activation attempt, or lacking the current CDP arguments: confirm bounded exact-path polling uses real short intervals, reports possible residual processes (or an empty non-authoritative observation), never terminates snapshot-only identities, and instructs the operator to fully quit Codex manually.
- Confirm no broad image-name or second PID-based termination targets unrelated Codex instances or other user processes. Do not treat an unconfirmed cleanup message as proof that every launched process was closed.
- Separately make the authoritative root disappear after `Runtime launch completed`. Confirm codexfast does not close interception before bounded exact-path polling, returns success (`0`) only when the admitted path becomes empty without claiming to recover the original Windows exit code, and otherwise exits non-zero with manual-recovery guidance without terminating a snapshot-only residual PID.
- Confirm an ordinary Start-menu launch still works after a full quit.

### Verify Package Integrity and Update Boundary

After the launch exits, run:

```powershell
$after = Get-FileHash -Algorithm SHA256 -LiteralPath $asar.FullName
$after
$before.Hash -eq $after.Hash
```

The comparison must be `True`. Also confirm package registration, manifest, signatures, and Store/Windows automatic-update behavior remain unchanged. Windows must not show or depend on the macOS codexfast `Disable automatic updates` control.

Record the exact validated version in `docs/compatibility-matrix.md` only after all checks pass. See [`windows-experimental.md`](./windows-experimental.md) for the complete reporting and safety boundary.
