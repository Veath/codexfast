import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertContains, assertNotContains, fail } from "../helpers/assertions.mts";
import { applyRuntimePatchesToBody } from "../../src/patch-engine.mts";
import { isRuntimeJavaScriptResource } from "../../src/cli-runtime-patcher.mts";
import { runtimePatcherSourceForVersion } from "../../src/cli-runtime-launch.mts";
import {
  childEnvWithAutomaticUpdateSetting,
  createMainProcessAutomaticUpdateHookSource,
  isAutomaticUpdatesDisabledInConfigContent,
  patchMainProcessAutomaticUpdateSource,
  patchMainProcessSettingsSchemaSource,
} from "../../src/cli-update-settings.mts";

export function runRuntimePatchSuite(): void {
  if (!isRuntimeJavaScriptResource("app://-/.vite/build/bootstrap.js")) {
    fail("expected runtime JavaScript URL matcher to accept main-process build assets served through app://");
  }

  const enabledConfig = "model = \"gpt-5.5\"\ndisableAutomaticUpdates = true\n";
  if (!isAutomaticUpdatesDisabledInConfigContent(enabledConfig)) {
    fail("expected automatic update setting reader to recognize disableAutomaticUpdates = true");
  }
  const desktopEnabledConfig =
    "disableAutomaticUpdates = false\n[desktop]\ndisableAutomaticUpdates = true\n";
  if (!isAutomaticUpdatesDisabledInConfigContent(desktopEnabledConfig)) {
    fail("expected desktop automatic update setting to take precedence over a legacy top-level value");
  }
  const unrelatedTableConfig =
    "[projects.\"/tmp/demo\"]\ndisableAutomaticUpdates = true\n";
  if (isAutomaticUpdatesDisabledInConfigContent(unrelatedTableConfig)) {
    fail("expected automatic update setting reader to ignore unrelated TOML table values");
  }
  const defaultConfig = "disableAutomaticUpdates = false\n";
  if (isAutomaticUpdatesDisabledInConfigContent(defaultConfig)) {
    fail("expected automatic update setting reader to preserve automatic updates by default");
  }

  const codexHomeWithAutomaticUpdatesAllowed = mkdtempSync(join(tmpdir(), "codexfast updates allowed "));
  try {
    writeFileSync(join(codexHomeWithAutomaticUpdatesAllowed, "config.toml"), defaultConfig, "utf8");
    const childEnv = childEnvWithAutomaticUpdateSetting({
      CODEX_HOME: codexHomeWithAutomaticUpdatesAllowed,
    });
    assertContains(
      childEnv.NODE_OPTIONS ?? "",
      `--require="${codexHomeWithAutomaticUpdatesAllowed}/.tmp/codexfast/main-process-hook.cjs"`,
      "expected automatic update main-process hook to be present even before the setting is enabled so the first click can persist",
    );
    if (childEnv.CODEXFAST_DISABLE_AUTOMATIC_UPDATES != null) {
      fail("expected automatic update main-process hook to avoid disabling checks when the setting is currently false");
    }
  } finally {
    rmSync(codexHomeWithAutomaticUpdatesAllowed, { force: true, recursive: true });
  }

  const codexHomeWithSpace = mkdtempSync(join(tmpdir(), "codexfast updates "));
  try {
    writeFileSync(join(codexHomeWithSpace, "config.toml"), enabledConfig, "utf8");
    const childEnv = childEnvWithAutomaticUpdateSetting({
      CODEX_HOME: codexHomeWithSpace,
    });
    assertContains(
      childEnv.NODE_OPTIONS ?? "",
      `--require="${codexHomeWithSpace}/.tmp/codexfast/main-process-hook.cjs"`,
      "expected automatic update main-process hook path to remain intact when CODEX_HOME contains spaces",
    );
    if (childEnv.CODEXFAST_DISABLE_AUTOMATIC_UPDATES != null) {
      fail("expected automatic update main-process hook to read config dynamically instead of setting a startup-only environment variable");
    }
  } finally {
    rmSync(codexHomeWithSpace, { force: true, recursive: true });
  }

  const automaticUpdateHookSource = createMainProcessAutomaticUpdateHookSource();
  assertContains(
    automaticUpdateHookSource,
    "disableAutomaticUpdates",
    "expected automatic update main-process hook to patch the backend settings schema used when saving the switch",
  );
  assertContains(
    automaticUpdateHookSource,
    "const viteBuildFilePattern = /[\\\\/]\\.vite[\\\\/]build[\\\\/][^\\\\/]+\\.js$/;",
    "expected the main-process hook to inspect any JavaScript module under .vite/build",
  );
  assertContains(
    automaticUpdateHookSource,
    "const shouldPatchAutomaticUpdates = automaticUpdateSignature.test(source) || automaticUpdateCallbackSignature.test(source);",
    "expected updater discovery to be based on the real source signature",
  );
  assertContains(
    automaticUpdateHookSource,
    "automaticUpdateCallbackSignature",
    "expected updater discovery to include the build-5488 callback-aware interval signature",
  );
  assertContains(
    automaticUpdateHookSource,
    "automaticDownloadConditionalGateSignature",
    "expected updater discovery to include the build-5488 conditional automatic-download signature",
  );
  assertContains(
    automaticUpdateHookSource,
    "const shouldPatchSettingsSchema = settingsSchemaSignature.test(source);",
    "expected Settings schema discovery to be based on the real source signature",
  );
  assertNotContains(
    automaticUpdateHookSource,
    "workspace-root-drop-handler-",
    "expected updater discovery not to depend on a historical chunk basename",
  );
  assertNotContains(
    automaticUpdateHookSource,
    "src-[^\\\\/]+",
    "expected Settings schema discovery not to depend on a historical chunk basename",
  );

  const mainProcessSettingsSchemaBody =
    "localeOverride:K({agentAccess:`read-write`,default:null,description:`Explicit locale override`,key:`localeOverride`,schema:BS}),preventSleepWhileRunning:K({agentAccess:`read-write`,default:!1,description:`Whether the machine stays awake while Codex is running`,key:`preventSleepWhileRunning`,schema:RS}),keepRemoteControlAwakeWhilePluggedIn:K({agentAccess:`read-write`,default:!1,description:`Whether remote control keeps this computer awake while plugged in`,key:`keepRemoteControlAwakeWhilePluggedIn`,schema:RS})";
  assertContains(
    patchMainProcessSettingsSchemaSource(mainProcessSettingsSchemaBody),
    "disableAutomaticUpdates:K({agentAccess:`read-write`,default:!1,description:`Whether automatic update checks and forced installs are disabled`,key:`disableAutomaticUpdates`,schema:RS})",
    "expected main-process settings schema patch to let the backend persist disableAutomaticUpdates",
  );

  const mainProcessUpdaterBody =
    "this.updater={checkForUpdates:async()=>{c.checkForUpdates()},installUpdatesIfAvailable:async()=>{c.installUpdatesIfAvailable()}};let f=JB();f>0&&setInterval(d,f).unref(),d()}resolveMacSparkleFeedUrl(){return n.o(`codexSparkleFeedUrl`)}";
  const patchedMainProcessUpdater = patchMainProcessAutomaticUpdateSource(
    mainProcessUpdaterBody,
  );
  assertContains(
    patchedMainProcessUpdater,
    "codexfastAutomaticUpdateCheck",
    "expected main-process hook to wrap background automatic update checks in a dynamic config check",
  );
  assertContains(
    patchedMainProcessUpdater,
    "readFileSync",
    "expected main-process hook to read the latest config before background automatic update checks",
  );
  assertContains(
    patchedMainProcessUpdater,
    "codexfastReadDisableAutomaticUpdates",
    "expected main-process hook to parse the desktop automatic update setting instead of using a table-blind line regex",
  );
  assertNotContains(
    patchedMainProcessUpdater,
    "/^\\s*disableAutomaticUpdates\\s*=\\s*true",
    "expected main-process hook not to use a table-blind automatic update setting regex",
  );
  assertNotContains(
    patchedMainProcessUpdater,
    "CODEXFAST_DISABLE_AUTOMATIC_UPDATES",
    "expected background automatic update checks to be gated by live config instead of startup-only environment",
  );
  assertContains(
    patchedMainProcessUpdater,
    "checkForUpdates:async()=>{c.checkForUpdates()}",
    "expected main-process hook to preserve manual update checks",
  );
  assertContains(
    patchedMainProcessUpdater,
    "installUpdatesIfAvailable:async()=>{c.installUpdatesIfAvailable()}",
    "expected main-process hook to preserve manual update installs",
  );
  const mainProcessUpdaterBodyWithRenamedIntervalHelper =
    "this.updater={checkForUpdates:async()=>{u&&!this.isUpdateReady&&this.updateLifecycleState===`idle`&&this.setUpdateLifecycleState(`checking`),c.checkForUpdates()},installUpdatesIfAvailable:async()=>{if(typeof c.installLatestUpdate==`function`){c.installLatestUpdate();return}this.isUpdateReady&&this.options.onInstallUpdatesRequested?.(),c.installUpdatesIfAvailable()}};let f=XB();f>0&&setInterval(d,f).unref(),d()}resolveMacSparkleFeedUrl(){return n.o(`codexSparkleFeedUrl`)}";
  const patchedMainProcessUpdaterWithRenamedIntervalHelper =
    patchMainProcessAutomaticUpdateSource(mainProcessUpdaterBodyWithRenamedIntervalHelper);
  assertContains(
    patchedMainProcessUpdaterWithRenamedIntervalHelper,
    "let f=XB(),codexfastReadDisableAutomaticUpdates",
    "expected main-process hook to preserve renamed automatic-update interval helper before reading config",
  );
  assertContains(
    patchedMainProcessUpdaterWithRenamedIntervalHelper,
    "codexfastAutomaticUpdateCheck",
    "expected main-process hook to wrap renamed automatic-update checks",
  );
  assertContains(
    patchedMainProcessUpdaterWithRenamedIntervalHelper,
    "checkForUpdates:async()=>{u&&!this.isUpdateReady",
    "expected main-process hook to preserve current manual update checks with lifecycle state",
  );
  const mainProcessUpdaterBodyWithAutodownloadGate =
    "this.setAutomaticBackgroundDownloadsEnabledForMac=e=>{c.setAutomaticBackgroundDownloadsEnabled(e),e&&d()},this.updater={checkForUpdates:async()=>{u&&!this.isUpdateReady&&this.updateLifecycleState===`idle`&&this.setUpdateLifecycleState(`checking`),c.checkForUpdates()},installUpdatesIfAvailable:async()=>{if(typeof c.installLatestUpdate==`function`){c.installLatestUpdate();return}this.isUpdateReady&&this.options.onInstallUpdatesRequested?.(),c.installUpdatesIfAvailable()}};let f=XB();f>0&&setInterval(d,f).unref(),d()}resolveMacSparkleFeedUrl(){return n.o(`codexSparkleFeedUrl`)}";
  const patchedMainProcessUpdaterWithAutodownloadGate =
    patchMainProcessAutomaticUpdateSource(mainProcessUpdaterBodyWithAutodownloadGate);
  assertContains(
    patchedMainProcessUpdaterWithAutodownloadGate,
    "e&&codexfastAutomaticUpdateCheck()",
    "expected automatic background download gate changes to reuse the dynamic config check instead of bypassing disableAutomaticUpdates",
  );
  assertNotContains(
    patchedMainProcessUpdaterWithAutodownloadGate,
    "e&&d()",
    "expected automatic background download gate changes not to call the raw background update check",
  );
  assertContains(
    patchedMainProcessUpdaterWithAutodownloadGate,
    "checkForUpdates:async()=>{u&&!this.isUpdateReady",
    "expected automatic background download gate patch to preserve manual update checks",
  );
  const mainProcessUpdaterBodyWithForcedInstall =
    "this.setAutomaticBackgroundDownloadsEnabledForMac=e=>{c.setAutomaticBackgroundDownloadsEnabled(e),e&&d()},this.updater={checkForUpdates:async()=>{u&&!this.isUpdateReady&&this.updateLifecycleState===`idle`&&this.setUpdateLifecycleState(`checking`),c.checkForUpdates()},installUpdatesIfAvailable:async()=>{if(typeof c.installLatestUpdate==`function`){c.installLatestUpdate();return}this.isUpdateReady&&this.options.onInstallUpdatesRequested?.(),c.installUpdatesIfAvailable()}};let f=XB();f>0&&setInterval(d,f).unref(),d()}scheduleForcedUpdateInstall(){this.forcedUpdateTimer&&=(clearTimeout(this.forcedUpdateTimer),null);let e=this.getRelaunchNotificationPolicy();if(!this.isUpdateReady||this.updateDownloadedAtMs==null||e?.relaunchNotification!==2||this.forcedUpdateInstallStarted){this.setRelaunchNotice(null);return}this.scheduleForcedUpdateInstallAt(Date.now(),Date.now(),Date.now())}installForcedUpdate(){this.installUpdatesIfAvailable()}resolveMacSparkleFeedUrl(){return n.o(`codexSparkleFeedUrl`)}";
  const patchedMainProcessUpdaterWithForcedInstall =
    patchMainProcessAutomaticUpdateSource(mainProcessUpdaterBodyWithForcedInstall);
  assertContains(
    patchedMainProcessUpdaterWithForcedInstall,
    "this.setRelaunchNotice(null);return}this.forcedUpdateTimer&&=",
    "expected disableAutomaticUpdates to suppress automatic forced update installs that were already downloaded",
  );
  assertNotContains(
    patchedMainProcessUpdaterWithForcedInstall,
    "scheduleForcedUpdateInstall(){this.forcedUpdateTimer&&=",
    "expected forced update scheduling not to run before checking disableAutomaticUpdates",
  );
  assertContains(
    patchedMainProcessUpdaterWithForcedInstall,
    "installForcedUpdate(){this.installUpdatesIfAvailable()}",
    "expected forced install guard not to remove the existing update install method body",
  );
  assertContains(
    patchedMainProcessUpdaterWithForcedInstall,
    "checkForUpdates:async()=>{u&&!this.isUpdateReady",
    "expected forced install guard to preserve manual update checks",
  );
  const mainProcessUpdaterBodyWithConditionalCallback =
    "initialize(){let f=()=>{try{d&&!this.isUpdateReady&&this.updateLifecycleState===`idle`&&this.setUpdateLifecycleState(`checking`),l.checkForUpdatesInBackground()}catch(e){this.isUpdateReady||this.setUpdateLifecycleState(`idle`)}};if(this.setAutomaticBackgroundDownloadsEnabledForMac=e=>{l.setAutomaticBackgroundDownloadsEnabled(e),e&&!t&&f()},this.updater={checkForUpdates:async()=>{d&&!this.isUpdateReady&&this.updateLifecycleState===`idle`&&this.setUpdateLifecycleState(`checking`),l.checkForUpdates()},installUpdatesIfAvailable:async()=>{l.installUpdatesIfAvailable()}},!t){let e=HV();e>0&&setInterval(f,e).unref(),f()}}scheduleForcedUpdateInstall(){this.forcedUpdateTimer&&=(clearTimeout(this.forcedUpdateTimer),null);let e=this.getRelaunchNotificationPolicy();if(!this.isUpdateReady){this.setRelaunchNotice(null);return}}";
  const patchedMainProcessUpdaterWithConditionalCallback =
    patchMainProcessAutomaticUpdateSource(mainProcessUpdaterBodyWithConditionalCallback);
  assertContains(
    patchedMainProcessUpdaterWithConditionalCallback,
    "codexfastAutomaticUpdateCheck",
    "expected build-5488 callback-aware updater to insert the dynamic automatic-update gate",
  );
  assertContains(
    patchedMainProcessUpdaterWithConditionalCallback,
    "e&&!t&&codexfastAutomaticUpdateCheck()",
    "expected build-5488 automatic-download trigger to preserve the production-appcast condition",
  );
  assertNotContains(
    patchedMainProcessUpdaterWithConditionalCallback,
    "e&&!t&&f()",
    "expected build-5488 automatic-download trigger not to bypass the dynamic config gate",
  );
  assertNotContains(
    patchedMainProcessUpdaterWithConditionalCallback,
    "setInterval(f,e)",
    "expected build-5488 scheduled checks not to call the raw background callback",
  );
  assertContains(
    patchedMainProcessUpdaterWithConditionalCallback,
    "scheduleForcedUpdateInstall(){if(",
    "expected build-5488 forced automatic install scheduling to check disableAutomaticUpdates first",
  );
  assertContains(
    patchedMainProcessUpdaterWithConditionalCallback,
    "checkForUpdates:async()=>{d&&!this.isUpdateReady",
    "expected build-5488 updater patch to preserve manual update checks",
  );
  assertContains(
    patchedMainProcessUpdaterWithConditionalCallback,
    "installUpdatesIfAvailable:async()=>{l.installUpdatesIfAvailable()}",
    "expected build-5488 updater patch to preserve manual update installs",
  );
  new Function(`class CodexfastUpdaterFixture{${patchedMainProcessUpdaterWithConditionalCallback}}`);

  const settingsSchemaBody =
    "localeOverride:K({agentAccess:`read-write`,default:null,description:`Explicit locale override`,key:`localeOverride`,schema:BS}),preventSleepWhileRunning:K({agentAccess:`read-write`,default:!1,description:`Whether the machine stays awake while Codex is running`,key:`preventSleepWhileRunning`,schema:RS}),keepRemoteControlAwakeWhilePluggedIn:K({agentAccess:`read-write`,default:!1,description:`Whether remote control keeps this computer awake while plugged in`,key:`keepRemoteControlAwakeWhilePluggedIn`,schema:RS})";
  const settingsSchemaResult = applyRuntimePatchesToBody(
    ".vite/build/src-UHYOvFd-.js",
    settingsSchemaBody,
  );
  assertContains(
    settingsSchemaResult.content,
    "disableAutomaticUpdates:K({agentAccess:`read-write`,default:!1,description:`Whether automatic update checks and forced installs are disabled`,key:`disableAutomaticUpdates`,schema:RS})",
    "expected settings schema patch to add the disable automatic updates setting",
  );
  assertContains(
    settingsSchemaResult.patchedLabels.join("\n"),
    "Disable automatic updates schema",
    "expected settings schema patch to report its target",
  );

  const generalSettingsBody =
    "function Kr(){let e=(0,$.c)(10),t=a(s),{platform:n}=Ee(),r=n!==`windows`,i=N(),o=z(j.preventSleepWhileRunning);if(!r)return null;let c,l;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,Z.jsx)(P,{...G.preventSleepWhileRunning}),l=(0,Z.jsx)(P,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`}),e[0]=c,e[1]=l):(c=e[0],l=e[1]);let u=o??!1,d;e[2]===t?d=e[3]:(d=e=>{B(t,j.preventSleepWhileRunning,e)},e[2]=t,e[3]=d);let f;e[4]===i?f=e[5]:(f=i.formatMessage(G.preventSleepWhileRunning),e[4]=i,e[5]=f);let p;return e[6]!==u||e[7]!==d||e[8]!==f?(p=(0,Z.jsx)(J,{label:c,description:l,control:(0,Z.jsx)(q,{checked:u,onChange:d,ariaLabel:f})}),e[6]=u,e[7]=d,e[8]=f,e[9]=p):p=e[9],p}";
  const generalSettingsResult = applyRuntimePatchesToBody(
    "webview/assets/general-settings-26616.js",
    generalSettingsBody,
  );
  assertContains(
    generalSettingsResult.content,
    "label:`Disable automatic updates`",
    "expected General settings patch to keep an English automatic-update label fallback",
  );
  assertContains(
    generalSettingsResult.content,
    "description:`Stop future automatic update checks and installs without disabling manual Check for Updates.`",
    "expected General settings patch to keep an English automatic-update description fallback that covers checks and installs without restart-specific wording",
  );
  assertContains(
    generalSettingsResult.content,
    "codexfastUpdateMessages",
    "expected General settings patch to choose automatic-update copy from a locale-aware message map",
  );
  assertContains(
    generalSettingsResult.content,
    "停用自动更新",
    "expected General settings patch to include Simplified Chinese automatic-update copy",
  );
  assertContains(
    generalSettingsResult.content,
    "停用自動更新",
    "expected General settings patch to include Traditional Chinese automatic-update copy",
  );
  assertContains(
    generalSettingsResult.content,
    "自動更新を無効にする",
    "expected General settings patch to include Japanese automatic-update copy",
  );
  assertNotContains(
    generalSettingsResult.content,
    "during this codexfast launch",
    "expected General settings patch to avoid implementation-specific launch wording",
  );
  assertContains(
    generalSettingsResult.content,
    "B(t,j.disableAutomaticUpdates,e)",
    "expected General settings patch to persist the disable automatic updates setting",
  );
  assertContains(
    generalSettingsResult.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected General settings patch to report its target",
  );

  const generalSettings26623Body =
    "function La(){let e=(0,Q.c)(10),t=H(U),{platform:n}=In(),r=n!==`windows`,i=z(),a=R(V.preventSleepWhileRunning);if(!r)return null;let o,s;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(A,{...G.preventSleepWhileRunning}),s=(0,$.jsx)(A,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`}),e[0]=o,e[1]=s):(o=e[0],s=e[1]);let c=a??!1,l;e[2]===t?l=e[3]:(l=e=>{B(t,V.preventSleepWhileRunning,e)},e[2]=t,e[3]=l);let u;e[4]===i?u=e[5]:(u=i.formatMessage(G.preventSleepWhileRunning),e[4]=i,e[5]=u);let d;return e[6]!==c||e[7]!==l||e[8]!==u?(d=(0,$.jsx)(W,{label:o,description:s,control:(0,$.jsx)(Nt,{checked:c,onChange:l,ariaLabel:u})}),e[6]=c,e[7]=l,e[8]=u,e[9]=d):d=e[9],d}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings26623Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-26623.js",
    generalSettings26623Body,
  );
  assertContains(
    generalSettings26623Result.content,
    "B(codexfastSettingsState,V.disableAutomaticUpdates,codexfastNextValue)",
    "expected 26.623 General settings patch to persist the disable automatic updates setting",
  );
  assertContains(
    generalSettings26623Result.content,
    "label:`Disable automatic updates`",
    "expected 26.623 General settings patch to keep an English automatic-update label fallback",
  );
  assertContains(
    generalSettings26623Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected 26.623 General settings patch to report its target",
  );

  const generalSettings26623RenamedBody =
    "function La(){let e=(0,Q.c)(10),t=b(F),{platform:n}=De(),r=n!==`windows`,i=B(),a=C(L.preventSleepWhileRunning);if(!r)return null;let o,s;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(H,{...W.preventSleepWhileRunning}),s=(0,$.jsx)(H,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`}),e[0]=o,e[1]=s):(o=e[0],s=e[1]);let c=a??!1,l;e[2]===t?l=e[3]:(l=e=>{R(t,L.preventSleepWhileRunning,e)},e[2]=t,e[3]=l);let u;e[4]===i?u=e[5]:(u=i.formatMessage(W.preventSleepWhileRunning),e[4]=i,e[5]=u);let d;return e[6]!==c||e[7]!==l||e[8]!==u?(d=(0,$.jsx)(U,{label:o,description:s,control:(0,$.jsx)(I,{checked:c,onChange:l,ariaLabel:u})}),e[6]=c,e[7]=l,e[8]=u,e[9]=d):d=e[9],d}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings26623RenamedResult = applyRuntimePatchesToBody(
    "webview/assets/general-settings-26623-renamed.js",
    generalSettings26623RenamedBody,
  );
  assertContains(
    generalSettings26623RenamedResult.content,
    "R(codexfastSettingsState,L.disableAutomaticUpdates,codexfastNextValue)",
    "expected 26.623 General settings patch to tolerate renamed settings helpers",
  );
  assertContains(
    generalSettings26623RenamedResult.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected renamed 26.623 General settings patch to report its target",
  );

  const generalSettings26623LocalCollisionBody =
    "function La(){let e=(0,Q.c)(10),t=c(H),{platform:n}=Ze(),r=n!==`windows`,i=B(),a=R(l.preventSleepWhileRunning);if(!r)return null;let o,s;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(V,{...W.preventSleepWhileRunning}),s=(0,$.jsx)(V,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`}),e[0]=o,e[1]=s):(o=e[0],s=e[1]);let u=a??!1,d;e[2]===t?d=e[3]:(d=e=>{z(t,l.preventSleepWhileRunning,e)},e[2]=t,e[3]=d);let f;e[4]===i?f=e[5]:(f=i.formatMessage(W.preventSleepWhileRunning),e[4]=i,e[5]=f);let p;return e[6]!==u||e[7]!==d||e[8]!==f?(p=(0,$.jsx)(L,{label:o,description:s,control:(0,$.jsx)(qt,{checked:u,onChange:d,ariaLabel:f})}),e[6]=u,e[7]=d,e[8]=f,e[9]=p):p=e[9],p}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings26623LocalCollisionResult = applyRuntimePatchesToBody(
    "webview/assets/general-settings-26623-local-collision.js",
    generalSettings26623LocalCollisionBody,
  );
  assertContains(
    generalSettings26623LocalCollisionResult.content,
    "z(codexfastSettingsState,l.disableAutomaticUpdates,codexfastNextValue)",
    "expected 26.623 General settings patch to tolerate minified local-name collisions",
  );
  assertNotContains(
    generalSettings26623LocalCollisionResult.content,
    "let c=a??!1,l;",
    "expected 26.623 General settings patch not to shadow the minified settings namespace when it is named l",
  );
  assertContains(
    generalSettings26623LocalCollisionResult.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected local-collision 26.623 General settings patch to report its target",
  );

  const generalSettings26623RenamedLocalsBody =
    "function La(){let e=(0,Q.c)(10),t=E(i),{platform:n}=Ut(),r=n!==`windows`,a=H(),o=B(f.preventSleepWhileRunning);if(!r)return null;let s,c;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(V,{...U.preventSleepWhileRunning}),c=(0,$.jsx)(V,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`}),e[0]=s,e[1]=c):(s=e[0],c=e[1]);let l=o??!1,u;e[2]===t?u=e[3]:(u=e=>{z(t,f.preventSleepWhileRunning,e)},e[2]=t,e[3]=u);let d;e[4]===a?d=e[5]:(d=a.formatMessage(U.preventSleepWhileRunning),e[4]=a,e[5]=d);let p;return e[6]!==l||e[7]!==u||e[8]!==d?(p=(0,$.jsx)(W,{label:s,description:c,control:(0,$.jsx)(Fe,{checked:l,onChange:u,ariaLabel:d})}),e[6]=l,e[7]=u,e[8]=d,e[9]=p):p=e[9],p}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings26623RenamedLocalsResult = applyRuntimePatchesToBody(
    "webview/assets/general-settings-26623-renamed-locals.js",
    generalSettings26623RenamedLocalsBody,
  );
  assertContains(
    generalSettings26623RenamedLocalsResult.content,
    "z(codexfastSettingsState,f.disableAutomaticUpdates,codexfastNextValue)",
    "expected 26.623 General settings patch to tolerate renamed local variables",
  );
  assertNotContains(
    generalSettings26623RenamedLocalsResult.content,
    "t=E(i),{platform:n}=Ut(),r=n!==`windows`,i=H()",
    "expected renamed-locals 26.623 General settings patch not to shadow the settings atom module local",
  );
  assertNotContains(
    generalSettings26623RenamedLocalsResult.content,
    "let l=o??!1,u;",
    "expected renamed-locals 26.623 General settings patch to replace original minified locals",
  );
  assertContains(
    generalSettings26623RenamedLocalsResult.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected renamed-locals 26.623 General settings patch to report its target",
  );

  const generalSettings26623SettingsArgCollisionBody =
    "function La(){let e=(0,Q.c)(10),t=c(o),{platform:n}=It(),r=n!==`windows`,i=V(),a=z(O.preventSleepWhileRunning);if(!r)return null;let o,s;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(H,{...G.preventSleepWhileRunning}),s=(0,$.jsx)(H,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`}),e[0]=o,e[1]=s):(o=e[0],s=e[1]);let l=a??!1,u;e[2]===t?u=e[3]:(u=e=>{R(t,O.preventSleepWhileRunning,e)},e[2]=t,e[3]=u);let d;e[4]===i?d=e[5]:(d=i.formatMessage(G.preventSleepWhileRunning),e[4]=i,e[5]=d);let p;return e[6]!==l||e[7]!==u||e[8]!==d?(p=(0,$.jsx)(U,{label:o,description:s,control:(0,$.jsx)(Ue,{checked:l,onChange:u,ariaLabel:d})}),e[6]=l,e[7]=u,e[8]=d,e[9]=p):p=e[9],p}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings26623SettingsArgCollisionResult = applyRuntimePatchesToBody(
    "webview/assets/general-settings-26623-settings-arg-collision.js",
    generalSettings26623SettingsArgCollisionBody,
  );
  assertContains(
    generalSettings26623SettingsArgCollisionResult.content,
    "codexfastSettingsState=c(o)",
    "expected 26.623 General settings patch to keep reading the outer settings atom argument",
  );
  assertNotContains(
    generalSettings26623SettingsArgCollisionResult.content,
    "t=c(o),{platform:n}=It(),r=n!==`windows`,codexfastIntl=V()",
    "expected 26.623 General settings patch not to shadow the settings atom argument with copied row locals",
  );
  assertNotContains(
    generalSettings26623SettingsArgCollisionResult.content,
    "let o,s;",
    "expected 26.623 General settings patch not to reuse copied minified row locals",
  );
  assertContains(
    generalSettings26623SettingsArgCollisionResult.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected settings-arg-collision 26.623 General settings patch to report its target",
  );

  const generalSettings2662381905Body =
    "function La(){let e=(0,Q.c)(10),t=B(j),{platform:n}=nt(),i=n!==`windows`,a=H(),o=r(p.preventSleepWhileRunning);if(!i)return null;let s,c;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(D,{...W.preventSleepWhileRunning}),c=(0,$.jsx)(D,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`}),e[0]=s,e[1]=c):(s=e[0],c=e[1]);let l=o??!1,u;e[2]===t?u=e[3]:(u=e=>{V(t,p.preventSleepWhileRunning,e)},e[2]=t,e[3]=u);let d;e[4]===a?d=e[5]:(d=a.formatMessage(W.preventSleepWhileRunning),e[4]=a,e[5]=d);let f;return e[6]!==l||e[7]!==u||e[8]!==d?(f=(0,$.jsx)(U,{label:s,description:c,control:(0,$.jsx)(ye,{checked:l,onChange:u,ariaLabel:d})}),e[6]=l,e[7]=u,e[8]=d,e[9]=f):f=e[9],f}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings2662381905Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-26623-81905.js",
    generalSettings2662381905Body,
  );
  assertContains(
    generalSettings2662381905Result.content,
    "codexfastSettingsState=B(j)",
    "expected 26.623.81905 General settings patch to keep reading the hook-based settings state",
  );
  assertContains(
    generalSettings2662381905Result.content,
    "V(codexfastSettingsState,p.disableAutomaticUpdates,codexfastNextValue)",
    "expected 26.623.81905 General settings patch to persist disableAutomaticUpdates",
  );
  assertNotContains(
    generalSettings2662381905Result.content,
    "let l=o??!1,u;",
    "expected 26.623.81905 General settings patch to replace original minified row locals",
  );
  assertContains(
    generalSettings2662381905Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected 26.623.81905 General settings patch to report its target",
  );

  const generalSettings26707Body =
    "function _a(){let e=(0,Q.c)(10),t=I(_),{platform:n}=ot(),r=n!==`windows`,i=L(),a=R(B.preventSleepWhileRunning);if(!r)return null;let o;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(O,{...H.preventSleepWhileRunning}),e[0]=o):o=e[0];let s;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(O,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:wt}}),e[1]=s):s=e[1];let c=a??!1,l;e[2]===t?l=e[3]:(l=e=>{z(t,B.preventSleepWhileRunning,e)},e[2]=t,e[3]=l);let u;e[4]===i?u=e[5]:(u=i.formatMessage(H.preventSleepWhileRunning),e[4]=i,e[5]=u);let d;return e[6]!==c||e[7]!==l||e[8]!==u?(d=(0,$.jsx)(G,{label:o,description:s,control:(0,$.jsx)(U,{checked:c,onChange:l,ariaLabel:u})}),e[6]=c,e[7]=l,e[8]=u,e[9]=d):d=e[9],d}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings26707Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-26707.js",
    generalSettings26707Body,
  );
  assertContains(
    generalSettings26707Result.content,
    "z(codexfastSettingsState,B.disableAutomaticUpdates,codexfastNextValue)",
    "expected 26.707 General settings patch to persist disableAutomaticUpdates despite the appName task-copy shape",
  );
  assertContains(
    generalSettings26707Result.content,
    "values:{appName:wt}",
    "expected 26.707 General settings patch to preserve the appName-aware prevent-sleep description",
  );
  assertContains(
    generalSettings26707Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected 26.707 General settings patch to report its target",
  );

  const generalSettings2670741301Body =
    "function _a(){let e=(0,Q.c)(10),t=F(V),{platform:r}=j(),i=r!==`windows`,a=H(),o=L(n.preventSleepWhileRunning);if(!i)return null;let s;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(R,{...W.preventSleepWhileRunning}),e[0]=s):s=e[0];let c;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,$.jsx)(R,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:f}}),e[1]=c):c=e[1];let l=o??!1,u;e[2]===t?u=e[3]:(u=e=>{I(t,n.preventSleepWhileRunning,e)},e[2]=t,e[3]=u);let d;e[4]===a?d=e[5]:(d=a.formatMessage(W.preventSleepWhileRunning),e[4]=a,e[5]=d);let p;return e[6]!==l||e[7]!==u||e[8]!==d?(p=(0,$.jsx)(U,{label:s,description:c,control:(0,$.jsx)(Bn,{checked:l,onChange:u,ariaLabel:d})}),e[6]=l,e[7]=u,e[8]=d,e[9]=p):p=e[9],p}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings2670741301Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-BBi3jMJr.js",
    generalSettings2670741301Body,
  );
  assertContains(
    generalSettings2670741301Result.content,
    "n.disableAutomaticUpdates",
    "expected build 5103 Settings to read the automatic-update setting",
  );
  assertContains(
    generalSettings2670741301Result.content,
    "I(codexfastSettingsState,n.disableAutomaticUpdates,codexfastNextValue)",
    "expected build 5103 Settings to persist the automatic-update setting",
  );
  assertContains(
    generalSettings2670741301Result.content,
    "values:{appName:f}",
    "expected build 5103 Settings to preserve app-name-aware prevent-sleep copy",
  );
  assertContains(
    generalSettings2670741301Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected build 5103 Settings to report the target",
  );
  assertNotContains(
    generalSettings2670741301Result.content,
    "let o,s",
    "expected the build 5103 replacement not to reintroduce minified local collisions",
  );
  new Function(generalSettings2670741301Result.content);
  const generalSettings2670741301SecondPass = applyRuntimePatchesToBody(
    "webview/assets/general-settings-BBi3jMJr.js",
    generalSettings2670741301Result.content,
  );
  if (generalSettings2670741301SecondPass.content !== generalSettings2670741301Result.content) {
    fail("expected the build-5103 Settings patch to be idempotent");
  }

  const generalSettings2670761608Body =
    "function _a(){let e=(0,Q.c)(10),t=p(c),{platform:n}=ot(),r=n!==`windows`,i=B(),a=R(j.preventSleepWhileRunning);if(!r)return null;let o;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(H,{...W.preventSleepWhileRunning}),e[0]=o):o=e[0];let s;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(H,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:bn}}),e[1]=s):s=e[1];let l=a??!1,u;e[2]===t?u=e[3]:(u=e=>{V(t,j.preventSleepWhileRunning,e)},e[2]=t,e[3]=u);let d;e[4]===i?d=e[5]:(d=i.formatMessage(W.preventSleepWhileRunning),e[4]=i,e[5]=d);let f;return e[6]!==l||e[7]!==u||e[8]!==d?(f=(0,$.jsx)(L,{label:o,description:s,control:(0,$.jsx)(G,{checked:l,onChange:u,ariaLabel:d})}),e[6]=l,e[7]=u,e[8]=d,e[9]=f):f=e[9],f}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings2670761608Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-CD58xyBw.js",
    generalSettings2670761608Body,
  );
  assertContains(
    generalSettings2670761608Result.content,
    "j.disableAutomaticUpdates",
    "expected build 5200 Settings to read the automatic-update setting",
  );
  assertContains(
    generalSettings2670761608Result.content,
    "V(codexfastSettingsState,j.disableAutomaticUpdates,codexfastNextValue)",
    "expected build 5200 Settings to persist the automatic-update setting",
  );
  assertContains(
    generalSettings2670761608Result.content,
    "values:{appName:bn}",
    "expected build 5200 Settings to preserve app-name-aware prevent-sleep copy",
  );
  assertContains(
    generalSettings2670761608Result.content,
    "codexfastCache=(0,Q.c)(17)",
    "expected build 5200 Settings replacement to use collision-safe prefixed locals",
  );
  assertContains(
    generalSettings2670761608Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected build 5200 Settings to report its target",
  );
  assertNotContains(
    generalSettings2670761608Result.content,
    "let l=a??!1,u;",
    "expected build 5200 Settings patch to replace the shifted original row locals",
  );
  new Function(generalSettings2670761608Result.content);
  const generalSettings2670761608SecondPass = applyRuntimePatchesToBody(
    "webview/assets/general-settings-CD58xyBw.js",
    generalSettings2670761608Result.content,
  );
  if (generalSettings2670761608SecondPass.content !== generalSettings2670761608Result.content) {
    fail("expected the build-5200 Settings patch to be idempotent");
  }

  const generalSettings2670771524Body =
    "function _a(){let e=(0,Q.c)(10),t=F(V),{platform:r}=j(),i=r!==`windows`,a=H(),o=L(n.preventSleepWhileRunning);if(!i)return null;let s;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(R,{...W.preventSleepWhileRunning}),e[0]=s):s=e[0];let c;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,$.jsx)(R,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:f}}),e[1]=c):c=e[1];let l=o??!1,u;e[2]===t?u=e[3]:(u=e=>{I(t,n.preventSleepWhileRunning,e)},e[2]=t,e[3]=u);let d;e[4]===a?d=e[5]:(d=a.formatMessage(W.preventSleepWhileRunning),e[4]=a,e[5]=d);let p;return e[6]!==l||e[7]!==u||e[8]!==d?(p=(0,$.jsx)(U,{label:s,description:c,control:(0,$.jsx)(tr,{checked:l,onChange:u,ariaLabel:d})}),e[6]=l,e[7]=u,e[8]=d,e[9]=p):p=e[9],p}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings2670771524Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-B9im2sCE.js",
    generalSettings2670771524Body,
  );
  assertContains(
    generalSettings2670771524Result.content,
    "n.disableAutomaticUpdates",
    "expected build 5263 Settings to read the automatic-update setting",
  );
  assertContains(
    generalSettings2670771524Result.content,
    "I(codexfastSettingsState,n.disableAutomaticUpdates,codexfastNextValue)",
    "expected build 5263 Settings to persist the automatic-update setting",
  );
  assertContains(
    generalSettings2670771524Result.content,
    "values:{appName:f}",
    "expected build 5263 Settings to preserve app-name-aware prevent-sleep copy",
  );
  assertContains(
    generalSettings2670771524Result.content,
    "codexfastCache=(0,Q.c)(17)",
    "expected build 5263 Settings replacement to use collision-safe prefixed locals",
  );
  assertContains(
    generalSettings2670771524Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected build 5263 Settings to report its target",
  );
  assertNotContains(
    generalSettings2670771524Result.content,
    "let l=o??!1,u;",
    "expected build 5263 Settings patch to replace the original row locals",
  );
  new Function(generalSettings2670771524Result.content);
  const generalSettings2670771524SecondPass = applyRuntimePatchesToBody(
    "webview/assets/general-settings-B9im2sCE.js",
    generalSettings2670771524Result.content,
  );
  if (generalSettings2670771524SecondPass.content !== generalSettings2670771524Result.content) {
    fail("expected the build-5263 Settings patch to be idempotent");
  }

  const generalSettings2670772221Body =
    "function _a(){let e=(0,Q.c)(10),t=z(R),{platform:n}=Bt(),r=n!==`windows`,i=L(),a=I(D.preventSleepWhileRunning);if(!r)return null;let o;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(B,{...U.preventSleepWhileRunning}),e[0]=o):o=e[0];let s;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(B,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:Zt}}),e[1]=s):s=e[1];let c=a??!1,l;e[2]===t?l=e[3]:(l=e=>{x(t,D.preventSleepWhileRunning,e)},e[2]=t,e[3]=l);let u;e[4]===i?u=e[5]:(u=i.formatMessage(U.preventSleepWhileRunning),e[4]=i,e[5]=u);let d;return e[6]!==c||e[7]!==l||e[8]!==u?(d=(0,$.jsx)(H,{label:o,description:s,control:(0,$.jsx)(G,{checked:c,onChange:l,ariaLabel:u})}),e[6]=c,e[7]=l,e[8]=u,e[9]=d):d=e[9],d}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings2670772221Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-C0l3c9YI.js",
    generalSettings2670772221Body,
  );
  assertContains(
    generalSettings2670772221Result.content,
    "D.disableAutomaticUpdates",
    "expected build 5307 Settings to read the automatic-update setting",
  );
  assertContains(
    generalSettings2670772221Result.content,
    "x(codexfastSettingsState,D.disableAutomaticUpdates,codexfastNextValue)",
    "expected build 5307 Settings to persist the automatic-update setting",
  );
  assertContains(
    generalSettings2670772221Result.content,
    "values:{appName:Zt}",
    "expected build 5307 Settings to preserve app-name-aware prevent-sleep copy",
  );
  assertContains(
    generalSettings2670772221Result.content,
    "codexfastCache=(0,Q.c)(17)",
    "expected build 5307 Settings replacement to use collision-safe prefixed locals",
  );
  assertContains(
    generalSettings2670772221Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected build 5307 Settings to report its target",
  );
  assertNotContains(
    generalSettings2670772221Result.content,
    "let c=a??!1,l;",
    "expected build 5307 Settings patch to replace the original row locals",
  );
  new Function(generalSettings2670772221Result.content);
  const generalSettings2670772221SecondPass = applyRuntimePatchesToBody(
    "webview/assets/general-settings-C0l3c9YI.js",
    generalSettings2670772221Result.content,
  );
  if (generalSettings2670772221SecondPass.content !== generalSettings2670772221Result.content) {
    fail("expected the build-5307 Settings patch to be idempotent");
  }

  const generalSettings2670791948Body =
    "function xa(){let e=(0,Q.c)(10),t=d(h),{platform:n}=Wt(),r=n!==`windows`,i=g(),a=V(R.preventSleepWhileRunning);if(!r)return null;let o;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,$.jsx)(C,{...W.preventSleepWhileRunning}),e[0]=o):o=e[0];let s;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(C,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:jt}}),e[1]=s):s=e[1];let c=a??!1,l;e[2]===t?l=e[3]:(l=e=>{z(t,R.preventSleepWhileRunning,e)},e[2]=t,e[3]=l);let u;e[4]===i?u=e[5]:(u=i.formatMessage(W.preventSleepWhileRunning),e[4]=i,e[5]=u);let f;return e[6]!==c||e[7]!==l||e[8]!==u?(f=(0,$.jsx)(H,{label:o,description:s,control:(0,$.jsx)(Vn,{checked:c,onChange:l,ariaLabel:u})}),e[6]=c,e[7]=l,e[8]=u,e[9]=f):f=e[9],f}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings2670791948Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-DMO9G9gL.js",
    generalSettings2670791948Body,
  );
  assertContains(
    generalSettings2670791948Result.content,
    "R.disableAutomaticUpdates",
    "expected build 5440 Settings to read the automatic-update setting",
  );
  assertContains(
    generalSettings2670791948Result.content,
    "z(codexfastSettingsState,R.disableAutomaticUpdates,codexfastNextValue)",
    "expected build 5440 Settings to persist the automatic-update setting",
  );
  assertContains(
    generalSettings2670791948Result.content,
    "values:{appName:jt}",
    "expected build 5440 Settings to preserve app-name-aware prevent-sleep copy",
  );
  assertContains(
    generalSettings2670791948Result.content,
    "codexfastCache=(0,Q.c)(17)",
    "expected build 5440 Settings replacement to use collision-safe prefixed locals",
  );
  assertContains(
    generalSettings2670791948Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected build 5440 Settings to report its target",
  );
  assertNotContains(
    generalSettings2670791948Result.content,
    "let f;return",
    "expected build 5440 Settings patch to replace the original row local",
  );
  new Function(generalSettings2670791948Result.content);
  const generalSettings2670791948SecondPass = applyRuntimePatchesToBody(
    "webview/assets/general-settings-DMO9G9gL.js",
    generalSettings2670791948Result.content,
  );
  if (generalSettings2670791948SecondPass.content !== generalSettings2670791948Result.content) {
    fail("expected the build-5440 Settings patch to be idempotent");
  }

  const generalSettings2671521425Body =
    "function sa(){let e=(0,Q.c)(10),t=n(m),{platform:r}=Ze(),i=r!==`windows`,a=R(),o=u(E.preventSleepWhileRunning);if(!i)return null;let s;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(s=(0,$.jsx)(L,{...G.preventSleepWhileRunning}),e[0]=s):s=e[0];let l;e[1]===Symbol.for(`react.memo_cache_sentinel`)?(l=(0,$.jsx)(L,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while {appName} is running a task`,description:`Description for preventing sleep while a task runs`,values:{appName:Vt}}),e[1]=l):l=e[1];let d=o??!1,f;e[2]===t?f=e[3]:(f=e=>{c(t,E.preventSleepWhileRunning,e)},e[2]=t,e[3]=f);let p;e[4]===a?p=e[5]:(p=a.formatMessage(G.preventSleepWhileRunning),e[4]=a,e[5]=p);let h;return e[6]!==d||e[7]!==f||e[8]!==p?(h=(0,$.jsx)(U,{label:s,description:l,control:(0,$.jsx)(V,{checked:d,onChange:f,ariaLabel:p})}),e[6]=d,e[7]=f,e[8]=p,e[9]=h):h=e[9],h}settings.general.power.preventSleepWhileRunning.description";
  const generalSettings2671521425Result = applyRuntimePatchesToBody(
    "webview/assets/general-settings-B8bUS3xL.js",
    generalSettings2671521425Body,
  );
  assertContains(
    generalSettings2671521425Result.content,
    "E.disableAutomaticUpdates",
    "expected build 5488 Settings to read the automatic-update setting",
  );
  assertContains(
    generalSettings2671521425Result.content,
    "c(codexfastSettingsState,E.disableAutomaticUpdates,codexfastNextValue)",
    "expected build 5488 Settings to persist the automatic-update setting",
  );
  assertContains(
    generalSettings2671521425Result.content,
    "values:{appName:Vt}",
    "expected build 5488 Settings to preserve app-name-aware prevent-sleep copy",
  );
  assertContains(
    generalSettings2671521425Result.content,
    "codexfastCache=(0,Q.c)(17)",
    "expected build 5488 Settings replacement to use collision-safe prefixed locals",
  );
  assertContains(
    generalSettings2671521425Result.patchedLabels.join("\n"),
    "Disable automatic updates setting",
    "expected build 5488 Settings to report its target",
  );
  assertNotContains(
    generalSettings2671521425Result.content,
    "let h;return",
    "expected build 5488 Settings patch to replace the original row local",
  );
  new Function(generalSettings2671521425Result.content);
  const generalSettings2671521425SecondPass = applyRuntimePatchesToBody(
    "webview/assets/general-settings-B8bUS3xL.js",
    generalSettings2671521425Result.content,
  );
  if (generalSettings2671521425SecondPass.content !== generalSettings2671521425Result.content) {
    fail("expected the build-5488 Settings patch to be idempotent");
  }

  const speedBody = "settings.agent.speed.label;n=se(),{serviceTierSettings:r,setServiceTier:i}=fe();if(!n)return null;let o;";
  const speedResult = applyRuntimePatchesToBody("webview/assets/general-settings-demo.js", speedBody);
  assertContains(speedResult.content, "{serviceTierSettings:r,setServiceTier:i}=fe();let o;", "expected runtime patch engine to keep patching matching Speed settings bodies");
  assertContains(speedResult.patchedLabels.join("\n"), "Speed setting", "expected runtime patch engine to report patched Speed setting target");

  const speedSetting26519Body = "settings.agent.speed.label;n=xe(),{serviceTierSettings:r,setServiceTier:i}=fe();if(!n||r.availableOptions.length<=1)return null;let a;";
  const speedSetting26519Result = applyRuntimePatchesToBody("webview/assets/general-settings-26519.js", speedSetting26519Body);
  assertContains(speedSetting26519Result.content, "if(r.availableOptions.length<=1)return null;let a;", "expected 26.519 Speed settings patch to preserve the option-count guard");
  assertNotContains(speedSetting26519Result.content, "!n||", "expected 26.519 Speed settings patch to remove the Fast availability guard");
  assertContains(speedSetting26519Result.patchedLabels.join("\n"), "Speed setting", "expected 26.519 Speed settings patch to report Speed setting target");

  const speedSetting26527Body = "settings.agent.speed.label;n=je(),{serviceTierSettings:r,setServiceTier:i}=_e();if(!n||r.availableOptions.length<=1)return null;let a;";
  const speedSetting26527Result = applyRuntimePatchesToBody("webview/assets/general-settings-26527.js", speedSetting26527Body);
  assertContains(speedSetting26527Result.content, "if(r.availableOptions.length<=1)return null;let a;", "expected 26.527 Speed settings patch to preserve the option-count guard");
  assertNotContains(speedSetting26527Result.content, "!n||", "expected 26.527 Speed settings patch to remove the Fast availability guard");
  assertContains(speedSetting26527Result.patchedLabels.join("\n"), "Speed setting", "expected 26.527 Speed settings patch to report Speed setting target");

  const speedSetting26601Body = "settings.agent.speed.label;{isServiceTierAllowed:n}=be(),{serviceTierSettings:r,setServiceTier:i}=xe();if(!n||r.availableOptions.length<=1)return null;let a;";
  const speedSetting26601Result = applyRuntimePatchesToBody("webview/assets/general-settings-26601.js", speedSetting26601Body);
  assertContains(speedSetting26601Result.content, "if(r.availableOptions.length<=1)return null;let a;", "expected 26.601 Speed settings patch to preserve the option-count guard");
  assertNotContains(speedSetting26601Result.content, "!n||", "expected 26.601 Speed settings patch to remove the Fast availability guard");
  assertContains(speedSetting26601Result.patchedLabels.join("\n"), "Speed setting", "expected 26.601 Speed settings patch to report Speed setting target");

  const serviceTierAllowance26602Body = "featureRequirements?.fast_mode;function A(e){let t=(0,k.c)(6),n=m(d),r=e?.hostId??n,i=S(r),a=i?.authMethod===`chatgpt`,o=i?.authMethod??null,s;t[0]!==r||t[1]!==o?(s={authMethod:o,hostId:r},t[0]=r,t[1]=o,t[2]=s):s=t[2];let{data:c,isPending:l}=h(x,s),u=!!i?.isLoading||a&&l,f=a&&!u&&c!=null&&c?.requirements?.featureRequirements?.fast_mode!==!1,p;return t[3]!==u||t[4]!==f?(p={isServiceTierAllowed:f,isLoading:u},t[3]=u,t[4]=f,t[5]=p):p=t[5],p}";
  const serviceTierAllowance26602Result = applyRuntimePatchesToBody("webview/assets/use-service-tier-settings-26602.js", serviceTierAllowance26602Body);
  assertContains(serviceTierAllowance26602Result.content, "f=!u&&(a?c!=null&&c?.requirements?.featureRequirements?.fast_mode!==!1:!0)", "expected service tier allowance patch to keep ChatGPT gating and allow custom model_provider configs even when authMethod is null");
  assertNotContains(serviceTierAllowance26602Result.content, ":o!=null", "expected service tier allowance patch not to require an account auth method for custom model_provider configs");
  assertNotContains(serviceTierAllowance26602Result.content, "f=a&&!u&&c!=null", "expected service tier allowance patch to stop blocking custom API users at the source hook");
  assertContains(serviceTierAllowance26602Result.patchedLabels.join("\n"), "Speed service tier allowance", "expected service tier allowance patch to report its target");

  const serviceTierRequestAllowance26623Body = "Failed to read service tier for request;async function ct(e,t){let n=await at(e,t);return n===`chatgpt`?(await e.query.fetch(Se,{authMethod:n,hostId:t})).requirements?.featureRequirements?.fast_mode!==!1:!1}";
  const serviceTierRequestAllowance26623Result = applyRuntimePatchesToBody("webview/assets/service-tier-request-allowance-26623.js", serviceTierRequestAllowance26623Body);
  assertContains(serviceTierRequestAllowance26623Result.content, "n===`chatgpt`?(await e.query.fetch(Se,{authMethod:n,hostId:t})).requirements?.featureRequirements?.fast_mode!==!1:!0", "expected request service tier helper to keep ChatGPT gating while allowing custom model_provider configs with null authMethod to send Fast");
  assertNotContains(serviceTierRequestAllowance26623Result.content, ":n!=null", "expected request service tier helper not to require an account auth method for custom model_provider configs");
  assertNotContains(serviceTierRequestAllowance26623Result.content, ":!1}", "expected request service tier helper not to block custom API users at the request layer");
  assertContains(serviceTierRequestAllowance26623Result.patchedLabels.join("\n"), "Speed service tier request allowance", "expected request service tier allowance patch to report its target");

  const serviceTierRequestAllowance26707Body = "Failed to read service tier for request;async function rer(e,t,n){try{let r=await ier(e,t),i=e.get(q9t,t);return r}catch(e){return null}}async function ier(e,t){let n=await eer(e,t);if(n!==`chatgpt`)return!1;let r=await vtn(t,{priority:`critical`});return e.query.setData(Utn,{authMethod:n,hostId:t},r),r.requirements?.featureRequirements?.fast_mode!==!1}";
  const serviceTierRequestAllowance26707Result = applyRuntimePatchesToBody(
    "webview/assets/service-tier-request-allowance-26707.js",
    serviceTierRequestAllowance26707Body,
  );
  assertContains(
    serviceTierRequestAllowance26707Result.content,
    "if(n!==`chatgpt`)return!0",
    "expected 26.707 request service tier helper to allow non-ChatGPT custom providers while preserving ChatGPT fast_mode checks",
  );
  assertNotContains(
    serviceTierRequestAllowance26707Result.content,
    "if(n!==`chatgpt`)return!1",
    "expected 26.707 request service tier helper not to block custom providers before reading settings",
  );
  assertContains(
    serviceTierRequestAllowance26707Result.patchedLabels.join("\n"),
    "Speed service tier request allowance",
    "expected 26.707 request service tier allowance patch to report its target",
  );

  const serviceTierConversationFallback26608Body = "serviceTierForRequest;function F(e){let r=(0,A.c)(29),a=e===void 0?null:e,d=n(i),f=k(a),{modelSettings:h}=E(a),_;r[0]===f.hostId?_=r[1]:(_={hostId:f.hostId},r[0]=f.hostId,r[1]=_);let{data:x,isLoading:S}=O(_),C=t(o,a),w=t(g,a),D=M(f.hostId),P=N(f.hostId,D.activeProfileForWrite),F;r[2]===f.hostId?F=r[3]:(F={hostId:f.hostId},r[2]=f.hostId,r[3]=F);let{isServiceTierAllowed:I}=j(F),L,R,z,B,V;if(r[4]!==a||r[5]!==S||r[6]!==I||r[7]!==C||r[8]!==w||r[9]!==x?.models||r[10]!==h.isLoading||r[11]!==h.model||r[12]!==d||r[13]!==P||r[14]!==D.isLoading||r[15]!==D.serviceTier){let e=T(x?.models,h.model),t=a!=null&&C?.serviceTier!==void 0?C.serviceTier:a!=null&&w?.params.serviceTier!==void 0?w.params.serviceTier:D.serviceTier;z=a!=null&&(C?.serviceTier!==void 0||w?.params.serviceTier!==void 0)?I?t:null:l(e,t,I),R=z==null?null:m(e,z);let n=c(z??null);L=h.isLoading||S||D.isLoading,B=async(e,t)=>{let r=s(e)!==D.serviceTier,i=a!=null&&e!==C?.serviceTier;try{i&&await p(`update-thread-settings-for-next-turn`,{conversationId:a,threadSettings:{serviceTier:e}}),r&&await P(e)}catch(e){let t=e;v.error(`Failed to set service tier`,{safe:{},sensitive:{error:t}});return}if(r||i){let r=c(e);if(n===r)return;b(d,y,{previousServiceTier:n,serviceTier:r,source:t})}},V=u(e),r[4]=a,r[5]=S,r[6]=I,r[7]=C,r[8]=w,r[9]=x?.models,r[10]=h.isLoading,r[11]=h.model,r[12]=d,r[13]=P,r[14]=D.isLoading,r[15]=D.serviceTier,r[16]=L,r[17]=R,r[18]=z,r[19]=B,r[20]=V}else L=r[16],R=r[17],z=r[18],B=r[19],V=r[20];let H;r[21]!==L||r[22]!==R||r[23]!==z||r[24]!==V?(H={availableOptions:V,isLoading:L,selectedServiceTier:R,serviceTierForRequest:z},r[21]=L,r[22]=R,r[23]=z,r[24]=V,r[25]=H):H=r[25];let U;return r[26]!==B||r[27]!==H?(U={serviceTierSettings:H,setServiceTier:B},r[26]=B,r[27]=H,r[28]=U):U=r[28],U}";
  const serviceTierConversationFallback26608Result = applyRuntimePatchesToBody("webview/assets/use-service-tier-settings-26608.js", serviceTierConversationFallback26608Body);
  assertContains(serviceTierConversationFallback26608Result.content, "t=a!=null&&C?.serviceTier!=null&&C.serviceTier!==`standard`?C.serviceTier:D.serviceTier", "expected explicit next-turn Fast state to be preserved without letting stale Standard override Settings Fast");
  assertContains(serviceTierConversationFallback26608Result.content, "z=l(e,t,I)", "expected stale latest-turn params not to override the configured default tier");
  assertNotContains(serviceTierConversationFallback26608Result.content, "C?.serviceTier!==void 0?", "expected persisted conversation-level Standard not to override Settings Fast after relaunch");
  assertNotContains(serviceTierConversationFallback26608Result.content, "w?.params.serviceTier!==void 0?", "expected paused/edit latest-turn Standard not to override Settings Fast after resend");
  assertNotContains(serviceTierConversationFallback26608Result.content, "w?.params.serviceTier!==void 0?I?t:null", "expected latest-turn service tier params not to lock the current conversation speed");
  assertContains(serviceTierConversationFallback26608Result.patchedLabels.join("\n"), "Speed service tier conversation fallback", "expected service tier fallback patch to report its target");

  const serviceTierConversationFallbackNullishBody = "serviceTierForRequest;function F(e){let r=(0,A.c)(29),a=e===void 0?null:e,d=n(i),f=k(a),{modelSettings:h}=E(a),_;r[0]===f.hostId?_=r[1]:(_={hostId:f.hostId},r[0]=f.hostId,r[1]=_);let{data:x,isLoading:S}=O(_),C=t(o,a),w=t(g,a),D=M(f.hostId),P=N(f.hostId,D.activeProfileForWrite),F;r[2]===f.hostId?F=r[3]:(F={hostId:f.hostId},r[2]=f.hostId,r[3]=F);let{isServiceTierAllowed:I}=j(F),L,R,z,B,V;if(r[4]!==a||r[5]!==S||r[6]!==I||r[7]!==C||r[8]!==w||r[9]!==x?.models||r[10]!==h.isLoading||r[11]!==h.model||r[12]!==d||r[13]!==P||r[14]!==D.isLoading||r[15]!==D.serviceTier){let e=T(x?.models,h.model),t=a!=null&&C?.serviceTier!=null?C.serviceTier:a!=null&&w?.params.serviceTier!=null?w.params.serviceTier:D.serviceTier;z=a!=null&&(C?.serviceTier!=null||w?.params.serviceTier!=null)?I?t:null:l(e,t,I),R=z==null?null:m(e,z);let n=c(z??null);L=h.isLoading||S||D.isLoading,B=async(e,t)=>{let r=s(e)!==D.serviceTier,i=a!=null&&e!==C?.serviceTier;try{i&&await p(`update-thread-settings-for-next-turn`,{conversationId:a,threadSettings:{serviceTier:e}}),r&&await P(e)}catch(e){let t=e;v.error(`Failed to set service tier`,{safe:{},sensitive:{error:t}});return}if(r||i){let r=c(e);if(n===r)return;b(d,y,{previousServiceTier:n,serviceTier:r,source:t})}},V=u(e),r[4]=a,r[5]=S,r[6]=I,r[7]=C,r[8]=w,r[9]=x?.models,r[10]=h.isLoading,r[11]=h.model,r[12]=d,r[13]=P,r[14]=D.isLoading,r[15]=D.serviceTier,r[16]=L,r[17]=R,r[18]=z,r[19]=B,r[20]=V}else L=r[16],R=r[17],z=r[18],B=r[19],V=r[20];let H;r[21]!==L||r[22]!==R||r[23]!==z||r[24]!==V?(H={availableOptions:V,isLoading:L,selectedServiceTier:R,serviceTierForRequest:z},r[21]=L,r[22]=R,r[23]=z,r[24]=V,r[25]=H):H=r[25];let U;return r[26]!==B||r[27]!==H?(U={serviceTierSettings:H,setServiceTier:B},r[26]=B,r[27]=H,r[28]=U):U=r[28],U}";
  const serviceTierConversationFallbackNullishResult = applyRuntimePatchesToBody("webview/assets/use-service-tier-settings-nullish.js", serviceTierConversationFallbackNullishBody);
  assertContains(serviceTierConversationFallbackNullishResult.content, "t=a!=null&&C?.serviceTier!=null&&C.serviceTier!==`standard`?C.serviceTier:D.serviceTier", "expected nullish explicit next-turn Fast state to be preserved without letting stale Standard override Settings Fast");
  assertContains(serviceTierConversationFallbackNullishResult.content, "z=l(e,t,I)", "expected nullish latest-turn params not to override the configured default tier");
  assertNotContains(serviceTierConversationFallbackNullishResult.content, "w?.params.serviceTier!=null?", "expected nullish latest-turn service tier params not to lock paused/edit/resend flows");
  assertContains(serviceTierConversationFallbackNullishResult.patchedLabels.join("\n"), "Speed service tier conversation fallback", "expected nullish service tier fallback patch to report its target");

  const serviceTierConversationFallback26707Body = "serviceTierForRequest;function Kse(e,t,n,r){let i=(0,Cb.c)(41),a=$i(tt),o=yd(e),s;i[0]===o.hostId?s=i[1]:(s={hostId:o.hostId},i[0]=o.hostId,i[1]=s);let{data:c,isLoading:l}=cy(s),u=yi(qp,e),d=yi(wb,e),f=wc(o.hostId)?.authMethod??null,p;i[2]!==o.hostId||i[3]!==f?(p={authMethod:f,hostId:o.hostId},i[2]=o.hostId,i[3]=f,i[4]=p):p=i[4];let{data:m,isPending:h}=yi(Qa,p),g=Hse(o.hostId),_=Use(o.hostId,g.activeProfileForWrite),v;i[5]===o.hostId?v=i[6]:(v={hostId:o.hostId},i[5]=o.hostId,i[6]=v);let{isServiceTierAllowed:y}=Ey(v),b,x,S,C,w,T,E;if(i[7]!==m?.requirements?.models?.newThread||i[8]!==e||i[9]!==n||i[10]!==o.hostId||i[11]!==h||i[12]!==l||i[13]!==r||i[14]!==y||i[15]!==u||i[16]!==d||i[17]!==c?.models||i[18]!==t.isLoading||i[19]!==t.model||i[20]!==a||i[21]!==_||i[22]!==g.isLoading||i[23]!==g.serviceTier){let s=gy(c?.models,t.model),f=m?.requirements?.models?.newThread,p=e==null&&r&&f!=null,v=p?f.serviceTier:null,D=v!=null,O=e==null&&n!=null?n.value:D?jd(v):g.serviceTier,k=e!=null&&u?.serviceTier!==void 0?u.serviceTier:e!=null&&d!==void 0?d:O;S=e!=null&&(u?.serviceTier!==void 0||d!==void 0)?y?k:null:Iee(s,k,y),x=S==null?null:tne(s,S);let A=_u(S??null);b=t.isLoading||l||g.isLoading||e==null&&h,C=async(t,n)=>{},T=p,E=o.hostId,w=Bf(s),i[7]=m?.requirements?.models?.newThread}else b=i[24],x=i[25],S=i[26],C=i[27],w=i[28],T=i[29],E=i[30];let D;i[31]!==b||i[32]!==x||i[33]!==S||i[34]!==w?(D={availableOptions:w,isLoading:b,selectedServiceTier:x,serviceTierForRequest:S},i[31]=b,i[32]=x,i[33]=S,i[34]=w,i[35]=D):D=i[35];return D}";
  const serviceTierConversationFallback26707Result = applyRuntimePatchesToBody(
    "webview/assets/use-service-tier-settings-26707.js",
    serviceTierConversationFallback26707Body,
  );
  assertContains(
    serviceTierConversationFallback26707Result.content,
    "k=O;S=Iee(s,k,y)",
    "expected 26.707 fallback to use the configured base tier as the only source for existing conversations",
  );
  const requestTierExpression26707 =
    serviceTierConversationFallback26707Result.content.match(/k=([^;]+);S=Iee/)?.[1];
  if (!requestTierExpression26707) {
    fail(
      "expected to extract the 26.707 request-tier expression from the patched service-tier fallback",
      serviceTierConversationFallback26707Result.content,
    );
  }
  if (requestTierExpression26707 !== "O") {
    fail(
      "expected the 26.707 request-tier expression to ignore conversation and latest-turn tier state",
      requestTierExpression26707,
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
    resolveConversationTier26707("conversation", { serviceTier: "priority" }, "default") !==
    "default"
  ) {
    fail("expected configured Standard to override stale conversation Fast");
  }
  if (
    resolveConversationTier26707("conversation", { serviceTier: "default" }, "priority") !==
    "priority"
  ) {
    fail("expected configured Fast to override stale conversation Standard");
  }
  if (
    resolveConversationTier26707("conversation", { serviceTier: "standard" }, "priority") !==
    "priority"
  ) {
    fail("expected configured Fast to override legacy conversation Standard");
  }
  if (
    resolveConversationTier26707("conversation", { serviceTier: "priority" }, "priority") !==
    "priority"
  ) {
    fail("expected configured Fast to remain Fast when conversation state matches");
  }
  assertContains(
    serviceTierConversationFallback26707Result.content,
    "S=Iee(s,k,y)",
    "expected 26.707 fallback to ignore stale latest-turn params and recompute from configured tier",
  );
  assertNotContains(
    serviceTierConversationFallback26707Result.content,
    "e!=null&&d!==void 0?d:O",
    "expected 26.707 fallback not to let stale latest-turn params override configured Settings Fast",
  );
  assertContains(
    serviceTierConversationFallback26707Result.patchedLabels.join("\n"),
    "Speed service tier conversation fallback",
    "expected 26.707 service tier fallback patch to report its target",
  );

  const serviceTierSlashCommandBody = "composer.speedSlashCommand.disableDescription;let g={id:l,title:u,description:d,requiresEmptyComposer:!1,enabled:n,Icon:c,onSelect:m,dependencies:h};";
  const serviceTierSlashCommandResult = applyRuntimePatchesToBody("webview/assets/composer-26519.js", serviceTierSlashCommandBody);
  assertContains(serviceTierSlashCommandResult.content, "requiresEmptyComposer:!1,enabled:!0,Icon:c", "expected 26.519 service-tier slash command patch to force-enable the command entry");
  assertContains(serviceTierSlashCommandResult.patchedLabels.join("\n"), "Fast slash command", "expected 26.519 service-tier slash command patch to report Fast slash command target");

  const intelligenceSpeed26519Body = "composer.intelligenceDropdown.speed.title;let W;t[53]!==z||t[54]!==v||t[55]!==F||t[56]!==h.availableOptions||t[57]!==h.isLoading||t[58]!==g?(W=v&&h.availableOptions.length>1?(0,Q.jsx)(om,{options:h.availableOptions,selectedServiceTier:F,isLoading:h.isLoading,setServiceTier:g,onSelectComplete:z}):null,t[53]=z,t[54]=v,t[55]=F,t[56]=h.availableOptions,t[57]=h.isLoading,t[58]=g,t[59]=W):W=t[59];";
  const intelligenceSpeed26519Result = applyRuntimePatchesToBody("webview/assets/composer-26519.js", intelligenceSpeed26519Body);
  assertContains(intelligenceSpeed26519Result.content, "W=h.availableOptions.length>1?(0,Q.jsx)(om,{options:h.availableOptions,selectedServiceTier:F,isLoading:h.isLoading,setServiceTier:g,onSelectComplete:z}):null,", "expected 26.519 Intelligence Speed patch to preserve the option-count guard");
  assertNotContains(intelligenceSpeed26519Result.content, "W=v&&", "expected 26.519 Intelligence Speed patch to remove the Fast availability guard");
  assertContains(intelligenceSpeed26519Result.patchedLabels.join("\n"), "Composer Intelligence Speed menu", "expected 26.519 Intelligence Speed patch to report the Speed menu target");

  const intelligenceSpeed26601Body = "composer.intelligenceDropdown.speed.title;let ie=re,ae=_&&m.availableOptions.length>1,oe=St(wa,`composer.openModelPicker`);";
  const intelligenceSpeed26601Result = applyRuntimePatchesToBody("webview/assets/composer-26601.js", intelligenceSpeed26601Body);
  assertContains(intelligenceSpeed26601Result.content, "let ie=re,ae=m.availableOptions.length>1,oe=", "expected 26.601 Intelligence Speed patch to preserve the option-count guard");
  assertNotContains(intelligenceSpeed26601Result.content, "_&&m.availableOptions", "expected 26.601 Intelligence Speed patch to remove the Fast availability guard");
  assertContains(intelligenceSpeed26601Result.patchedLabels.join("\n"), "Composer Intelligence Speed menu", "expected 26.601 Intelligence Speed patch to report the Speed menu target");

  const intelligenceSpeed26616Body = "composer.openModelPicker;let L=F?I:zl,R,ee,z,B,te;if(t[18]!==d?.models||t[19]!==m.model||t[20]!==_.availableOptions||t[21]!==_.selectedServiceTier){ee=Er(d?.models,m.model),z=_.selectedServiceTier;let e;if(t[27]!==z||t[28]!==_.availableOptions){let n;t[30]===z?n=t[31]:(n=e=>e.value===z,t[30]=z,t[31]=n),e=_.availableOptions.find(n),t[27]=z,t[28]=_.availableOptions,t[29]=e}else e=t[29];let n=e,r;t[32]===_.availableOptions?r=t[33]:(r=_.availableOptions.find(Nh)?.value,t[32]=_.availableOptions,t[33]=r),R=r,B=n?.iconKind??null,te=B!=null&&G(ee,z),t[18]=d?.models,t[19]=m.model,t[20]=_.availableOptions,t[21]=_.selectedServiceTier,t[22]=R,t[23]=ee,t[24]=z,t[25]=B,t[26]=te}else R=t[22],ee=t[23],z=t[24],B=t[25],te=t[26];let ne=te,re=b&&_.availableOptions.length>1,V=a(Eo,`composer.openModelPicker`),ie=(0,Z.useRef)(!1);";
  const intelligenceSpeed26616Result = applyRuntimePatchesToBody("webview/assets/composer-26616.js", intelligenceSpeed26616Body);
  assertContains(intelligenceSpeed26616Result.content, "re=_.availableOptions.length>1,V=", "expected 26.616 Intelligence Speed patch to preserve the option-count guard when locale ids live in a separate asset");
  assertNotContains(intelligenceSpeed26616Result.content, "re=b&&_.availableOptions", "expected 26.616 Intelligence Speed patch to remove the Fast availability guard");
  assertContains(intelligenceSpeed26616Result.patchedLabels.join("\n"), "Composer Intelligence Speed menu", "expected 26.616 Intelligence Speed patch to report the Speed menu target");

  const pluginsAccess26519Body = "sidebarElectron.pluginsDisabledTooltip;function wb(){let e,n,{authMethod:c}=Ba(),l=Li(`533078438`),u=Cc(c),d=e&&l&&u,f=bs({hostId:Tt}),p=e&&f&&!u,m=gc();}";
  const pluginsAccess26519Result = applyRuntimePatchesToBody("webview/assets/app-main-26519.js", pluginsAccess26519Body);
  assertContains(pluginsAccess26519Result.content, "d=!1,f=bs({hostId:Tt}),p=e&&f", "expected 26.519 Plugins sidebar patch to disable the API-key gate and keep the host capability gate");
  assertNotContains(pluginsAccess26519Result.content, "e&&l&&u", "expected 26.519 Plugins sidebar patch to remove the disabled Plugins nav state");
  assertNotContains(pluginsAccess26519Result.content, "e&&f&&!u", "expected 26.519 Plugins sidebar patch to remove the API-key exclusion from the Plugins label state");
  assertContains(pluginsAccess26519Result.patchedLabels.join("\n"), "Plugins access", "expected 26.519 Plugins sidebar patch to report Plugins access target");

  const pluginsAccess26527Body = "sidebarElectron.pluginsDisabledTooltip;function QS(){let n=J(K),{authMethod:s}=Oo(),c=xa(`533078438`),l=wl(s),u=e&&c&&l,d=mc({hostId:mr}),f=e&&d&&!l,p=_l();}";
  const pluginsAccess26527Result = applyRuntimePatchesToBody("webview/assets/app-main-26527.js", pluginsAccess26527Body);
  assertContains(pluginsAccess26527Result.content, "u=!1,d=mc({hostId:mr}),f=e&&d", "expected 26.527 Plugins sidebar patch to disable the API-key gate and keep the host capability gate");
  assertNotContains(pluginsAccess26527Result.content, "e&&c&&l", "expected 26.527 Plugins sidebar patch to remove the disabled Plugins nav state");
  assertNotContains(pluginsAccess26527Result.content, "e&&d&&!l", "expected 26.527 Plugins sidebar patch to remove the API-key exclusion from the Plugins label state");
  assertContains(pluginsAccess26527Result.patchedLabels.join("\n"), "Plugins access", "expected 26.527 Plugins sidebar patch to report Plugins access target");

  const pluginsAccess2652760818Body = "sidebarElectron.pluginsDisabledTooltip;function QS({desktopNavItemsEnabled:e}){let n=J(K),{authMethod:s}=Oo(),c=xa(`533078438`),l=lc(s),u=e&&c&&l,d=hc({hostId:mr}),f=e&&d&&!l,p=vl();}";
  const pluginsAccess2652760818Result = applyRuntimePatchesToBody("webview/assets/app-main-26527-60818.js", pluginsAccess2652760818Body);
  assertContains(pluginsAccess2652760818Result.content, "u=!1,d=hc({hostId:mr}),f=e&&d", "expected 26.527.60818 Plugins sidebar patch to disable the API-key gate and keep the host capability gate");
  assertNotContains(pluginsAccess2652760818Result.content, "e&&c&&l", "expected 26.527.60818 Plugins sidebar patch to remove the disabled Plugins nav state");
  assertNotContains(pluginsAccess2652760818Result.content, "e&&d&&!l", "expected 26.527.60818 Plugins sidebar patch to remove the API-key exclusion from the Plugins label state");
  assertContains(pluginsAccess2652760818Result.patchedLabels.join("\n"), "Plugins access", "expected 26.527.60818 Plugins sidebar patch to report Plugins access target");

  const pluginInstallModal26601Body = "plugins.installModal.about;children:(0,Q.jsx)(fn,{disclosureData:U?Ie:void 0,hostId:n,onAppPersonalizationModeChange:e=>{h({modes:{...Ue,[t]:n},pluginId:J.plugin.id})},plugin:J,shouldShowInstallDisclosure:U,showLockedComputerUseInstall:Y})";
  const pluginInstallModal26601Result = applyRuntimePatchesToBody("webview/assets/use-plugin-install-flow-26601.js", pluginInstallModal26601Body);
  assertContains(pluginInstallModal26601Result.content, "shouldShowInstallDisclosure:!1,showLockedComputerUseInstall:Y", "expected 26.601 plugin install modal patch to keep basic modal content visible");
  assertContains(pluginInstallModal26601Result.patchedLabels.join("\n"), "Plugin install modal content", "expected 26.601 plugin install modal patch to report modal content target");

  const pluginInstallAvailability26611Body = "connector-unavailable;let L=I,R=!0,z=0,B={};for(let[e,t]of O.entries()){let n=F[e],r=!M&&N==null&&!P.some(e=>e.id===t),i=null;n?.data?.status===y?i=`disabled-by-admin`:(r||n!=null&&!n.isPending&&n.error==null&&n.data==null)&&(i=`connector-unavailable`),B[t]=i,i!=null&&(z+=1),i!==`disabled-by-admin`&&(R=!1)}let V=null;return C&&S(x)?V=`disabled-by-admin`:!C&&O.length>0&&z===O.length&&(V=R?`disabled-by-admin`:`connector-unavailable`),{blockedReasonsByConnectorId:B,isConnectorAvailabilityLoading:L,isLoading:!C&&L,blockedReason:V}}";
  const pluginInstallAvailability26611Result = applyRuntimePatchesToBody("webview/assets/check-plugin-availability-26611.js", pluginInstallAvailability26611Body);
  assertContains(pluginInstallAvailability26611Result.content, "V=R?`disabled-by-admin`:null", "expected 26.611 plugin install availability patch to preserve only the all-admin aggregate block");
  assertNotContains(pluginInstallAvailability26611Result.content, "V=R?`disabled-by-admin`:`connector-unavailable`", "expected 26.611 plugin install availability patch to stop the aggregate connector-unavailable block");
  assertContains(pluginInstallAvailability26611Result.patchedLabels.join("\n"), "Plugin install availability", "expected 26.611 plugin install availability patch to report install availability target");

  const pluginDetailAppConnect26601Body = "directoryApps;function l({directoryApps:e,pluginApps:t}){let n=new Map(e.map(e=>[e.id,e]));return t.map(e=>n.get(e.id)).filter(e=>e!=null)}";
  const pluginDetailAppConnect26601Result = applyRuntimePatchesToBody("webview/assets/check-plugin-availability-26601.js", pluginDetailAppConnect26601Body);
  assertContains(pluginDetailAppConnect26601Result.content, "n.get(e.id)??{appMetadata:null,branding:null,description:e.description??null", "expected 26.601 plugin detail app connect patch to keep plugin app rows when the directory app list is empty");
  assertContains(pluginDetailAppConnect26601Result.content, "isAccessible:!1,isEnabled:!1", "expected 26.601 plugin detail app connect fallback apps to render as connectable");
  assertContains(pluginDetailAppConnect26601Result.content, "name:e.name??e.displayName??e.id", "expected 26.601 plugin detail app connect fallback apps to preserve a usable app name");
  assertNotContains(pluginDetailAppConnect26601Result.content, "t.map(e=>n.get(e.id)).filter(e=>e!=null)", "expected 26.601 plugin detail app connect patch to stop dropping plugin apps missing from the directory list");
  assertContains(pluginDetailAppConnect26601Result.patchedLabels.join("\n"), "Plugin detail app connect", "expected 26.601 plugin detail app connect patch to report app connect target");

  const pluginDetailAppConnect26611Body = "directoryApps;function l({directoryApps:e,pluginApps:t}){let n=new Map(e.map(e=>[e.id,e]));return t.map(e=>{let t=n.get(e.id);if(t==null||t.name===t.id)return null;let r=e.category?.trim()||d(t);if(!r)return t;let i=t.branding??{category:null,developer:null,website:null,privacyPolicy:null,termsOfService:null,isDiscoverableApp:!1};return{...t,branding:{...i,category:r}}}).filter(e=>e!=null)}";
  const pluginDetailAppConnect26611Result = applyRuntimePatchesToBody("webview/assets/check-plugin-availability-26611.js", pluginDetailAppConnect26611Body);
  assertContains(pluginDetailAppConnect26611Result.content, "return {appMetadata:null,branding:null,description:e.description??null", "expected 26.611 plugin detail app connect patch to fall back to plugin-declared apps");
  assertContains(pluginDetailAppConnect26611Result.content, "name:e.name??e.displayName??e.id", "expected 26.611 plugin detail app connect fallback apps to preserve a usable app name");
  assertNotContains(pluginDetailAppConnect26611Result.content, "if(t==null||t.name===t.id)return null", "expected 26.611 plugin detail app connect patch to stop dropping app rows missing from the directory list");
  assertContains(pluginDetailAppConnect26611Result.patchedLabels.join("\n"), "Plugin detail app connect", "expected 26.611 plugin detail app connect patch to report app connect target");

  const pluginPostInstallAppConnect26601Body = "appsNeedingAuth;await Promise.all([p(je),p(tt)]);let y=await kt({authPolicy:_.authPolicy,codexHome:l,hostId:t,plugin:h,queryClient:a,windowType:`electron`});if(Me(h),_.authPolicy===`ON_USE`||_.appsNeedingAuth.length===0&&y.length===0){let e=s.postInstallComposerPrefill?.trim();e&&m({text:e}),E();return}F({apps:_.appsNeedingAuth,browserExtensions:y,connectingAppId:_.authPolicy===`ON_INSTALL`&&_.appsNeedingAuth.length===1&&y.length===0?_.appsNeedingAuth[0].id:void 0,options:s,plugin:h})";
  const pluginPostInstallAppConnect26601Result = applyRuntimePatchesToBody("webview/assets/use-plugin-install-flow-26601.js", pluginPostInstallAppConnect26601Body);
  assertContains(pluginPostInstallAppConnect26601Result.content, "codexfastAppsNeedingAuth=_.appsNeedingAuth.length>0?_.appsNeedingAuth:(h.plugin.apps??[]).map", "expected 26.601 post-install app connect patch to fall back to plugin-declared apps when the install response omits app auth rows");
  assertContains(pluginPostInstallAppConnect26601Result.content, "if(Me(h),codexfastAppsNeedingAuth.length===0&&y.length===0)", "expected 26.601 post-install app connect patch not to close ON_USE plugins that still need app auth");
  assertContains(pluginPostInstallAppConnect26601Result.content, "F({apps:codexfastAppsNeedingAuth,browserExtensions:y", "expected 26.601 post-install app connect patch to pass fallback apps into the install session");
  assertContains(pluginPostInstallAppConnect26601Result.content, "connectingAppId:(_.authPolicy===`ON_INSTALL`||_.authPolicy===`ON_USE`)&&codexfastAppsNeedingAuth.length===1&&y.length===0?codexfastAppsNeedingAuth[0].id:void 0", "expected 26.601 post-install app connect patch to open the single-app connect modal for ON_USE plugins");
  assertNotContains(pluginPostInstallAppConnect26601Result.content, "_.authPolicy===`ON_USE`||_.appsNeedingAuth.length===0", "expected 26.601 post-install app connect patch to remove the ON_USE close shortcut");
  assertNotContains(pluginPostInstallAppConnect26601Result.content, "F({apps:_.appsNeedingAuth", "expected 26.601 post-install app connect patch not to pass an empty backend app auth list into the install session");
  assertContains(pluginPostInstallAppConnect26601Result.patchedLabels.join("\n"), "Plugin post-install app connect", "expected 26.601 post-install app connect patch to report app connect target");

  const pluginPostInstallAppConnect26602Body = "appsNeedingAuth;await Promise.all([p(je),p(tt)]);let y=await kt({authPolicy:_.authPolicy,codexHome:l,hostId:t,plugin:h,queryClient:a,windowType:`electron`});if(Ae(h),_.authPolicy===`ON_USE`||_.appsNeedingAuth.length===0&&y.length===0){let e=d.postInstallComposerPrefill?.trim();e&&m({text:e}),D();return}I({apps:_.appsNeedingAuth,browserExtensions:y,connectingAppId:_.authPolicy===`ON_INSTALL`&&_.appsNeedingAuth.length===1&&y.length===0?_.appsNeedingAuth[0].id:void 0,options:d,plugin:h})";
  const pluginPostInstallAppConnect26602Result = applyRuntimePatchesToBody("webview/assets/use-plugin-install-flow-26602.js", pluginPostInstallAppConnect26602Body);
  assertContains(pluginPostInstallAppConnect26602Result.content, "I({apps:codexfastAppsNeedingAuth,browserExtensions:y", "expected 26.602 post-install app connect patch to pass fallback apps into the renamed install session setter");
  assertNotContains(pluginPostInstallAppConnect26602Result.content, "I({apps:_.appsNeedingAuth", "expected 26.602 post-install app connect patch not to depend on the empty backend app auth list");
  assertContains(pluginPostInstallAppConnect26602Result.patchedLabels.join("\n"), "Plugin post-install app connect", "expected 26.602 post-install app connect patch to report app connect target");

  const pluginPostInstallAppConnect2661671553Body = "appsNeedingAuth;let f=await Lt({authPolicy:s.authPolicy,codexHome:_,hostId:t,plugin:o,queryClient:g,windowType:`electron`});if(ce(100),await new Promise(e=>setTimeout(e,650)),n==null&&s.authPolicy===`ON_USE`||s.appsNeedingAuth.length===0&&f.length===0){let e=i.postInstallComposerPrefill?.trim();e&&Me(e,i.postInstallNewConversation),D(),n?.(),await u&&J({plugin:o,postInstallComposerPrefill:e,tryInChatCwd:i.tryInChatCwd});return}M({apps:s.appsNeedingAuth,browserExtensions:f,connectingAppId:s.appsNeedingAuth.length===1&&f.length===0&&(s.authPolicy===`ON_INSTALL`||n!=null)?s.appsNeedingAuth[0]?.id:void 0,options:i,plugin:o})";
  const pluginPostInstallAppConnect2661671553Result = applyRuntimePatchesToBody("webview/assets/use-plugin-install-flow-26616-71553.js", pluginPostInstallAppConnect2661671553Body);
  assertContains(pluginPostInstallAppConnect2661671553Result.content, "codexfastAppsNeedingAuth=s.appsNeedingAuth.length>0?s.appsNeedingAuth:(o.plugin.apps??[]).map", "expected 26.616.71553 post-install app connect patch to fall back to plugin-declared apps");
  assertContains(pluginPostInstallAppConnect2661671553Result.content, "codexfastAppsNeedingAuth.length===0&&f.length===0", "expected 26.616.71553 post-install app connect patch not to close ON_USE plugins that still need app auth");
  assertContains(pluginPostInstallAppConnect2661671553Result.content, "M({apps:codexfastAppsNeedingAuth,browserExtensions:f", "expected 26.616.71553 post-install app connect patch to pass fallback apps into the install session");
  assertContains(pluginPostInstallAppConnect2661671553Result.content, "connectingAppId:(s.authPolicy===`ON_INSTALL`||s.authPolicy===`ON_USE`)&&codexfastAppsNeedingAuth.length===1&&f.length===0?codexfastAppsNeedingAuth[0].id:void 0", "expected 26.616.71553 post-install app connect patch to open the single-app connect modal for ON_USE plugins");
  assertNotContains(pluginPostInstallAppConnect2661671553Result.content, "n==null&&s.authPolicy===`ON_USE`", "expected 26.616.71553 post-install app connect patch to remove the ON_USE close shortcut");
  assertNotContains(pluginPostInstallAppConnect2661671553Result.content, "M({apps:s.appsNeedingAuth", "expected 26.616.71553 post-install app connect patch not to pass an empty backend app auth list into the install session");
  assertContains(pluginPostInstallAppConnect2661671553Result.patchedLabels.join("\n"), "Plugin post-install app connect", "expected 26.616.71553 post-install app connect patch to report app connect target");

  const sharedMarketplacePrefetch26601Body = "additionalMarketplaceKinds;return D(e,I,{enabled:z,additionalMarketplaceKinds:[`shared-with-me`]}),E({enabled:z,hostId:e,marketplaceKind:`shared-with-me`}),E({enabled:z,hostId:e,marketplaceKind:`workspace-directory`}),null";
  const sharedMarketplacePrefetch26601Result = applyRuntimePatchesToBody("webview/assets/app-prefetch-impl-26601.js", sharedMarketplacePrefetch26601Body);
  assertContains(sharedMarketplacePrefetch26601Result.content, "additionalMarketplaceKinds:[]}),E({enabled:!1,hostId:e,marketplaceKind:`shared-with-me`})", "expected 26.601 shared marketplace prefetch patch to skip the remote shared plugin catalog");
  assertContains(sharedMarketplacePrefetch26601Result.patchedLabels.join("\n"), "Composer plugin mentions", "expected 26.601 shared marketplace prefetch patch to report plugin mention target");

  const pluginCatalogVisibility26601Body = "openai-curated-marketplaces-hidden;function ge(e){return e!==`chatgpt`}var O=[`icon`];";
  const pluginCatalogVisibility26601Result = applyRuntimePatchesToBody("webview/assets/use-plugins-26601.js", pluginCatalogVisibility26601Body);
  assertContains(pluginCatalogVisibility26601Result.content, "function ge(e){return !1}", "expected 26.601 plugin catalog patch to keep the curated OpenAI catalog visible for custom API users");
  assertNotContains(pluginCatalogVisibility26601Result.content, "return e!==`chatgpt`", "expected 26.601 plugin catalog patch to remove the auth-method catalog restriction");
  assertContains(pluginCatalogVisibility26601Result.patchedLabels.join("\n"), "Plugins catalog visibility", "expected 26.601 plugin catalog patch to report catalog visibility target");

  const pluginCatalogMarketplaceFilter26609Body = "openai-curated-marketplaces-hidden;let p=ne(`4218407052`),m=pe(ae(e)?.authMethod??null),h=ve;m?h=xe:p&&(h=be);let g=Ae({additionalMarketplaceKinds:d,includeRemoteCatalog:s?.includeRemoteCatalog??!0,includeVerticalCatalog:!p});";
  const pluginCatalogMarketplaceFilter26609Result = applyRuntimePatchesToBody("webview/assets/use-plugins-26609.js", pluginCatalogMarketplaceFilter26609Body);
  assertContains(pluginCatalogMarketplaceFilter26609Result.content, "h=ve;m?h=ve:p&&(h=ve);", "expected 26.609 plugin catalog patch not to exclude curated marketplaces when the vertical-catalog flag is enabled");
  assertNotContains(pluginCatalogMarketplaceFilter26609Result.content, "m?h=xe:p&&(h=be)", "expected 26.609 plugin catalog patch to remove marketplace exclusion from the visible catalog path");
  assertContains(pluginCatalogMarketplaceFilter26609Result.patchedLabels.join("\n"), "Plugins catalog visibility", "expected 26.609 plugin catalog marketplace filter patch to report catalog visibility target");

  const pluginCatalogLocalCache26616Body = "openai-curated-marketplaces-hidden;var R=[`plugins`],z=`openai-curated-marketplaces-hidden`,U=`.tmp/marketplaces/openai-internal-testing`;function qe({codexHome:e,hostId:t,rootsOverrideCwd:n,workspaceRoots:r}){let i=t===`local`&&e!=null?b(e,U):null;return Je([...typeof n==`string`?[n]:n??r??[],...i==null?[]:[i]],e)}";
  const pluginCatalogLocalCache26616Result = applyRuntimePatchesToBody("webview/assets/use-plugins-26616.js", pluginCatalogLocalCache26616Body);
  assertContains(pluginCatalogLocalCache26616Result.content, "codexfastPluginCacheRoot=t===`local`&&e!=null?b(e,`.tmp/plugins`):null", "expected 26.616 plugin catalog patch to add the local full plugin cache as a marketplace root");
  assertContains(pluginCatalogLocalCache26616Result.content, "...codexfastPluginCacheRoot==null?[]:[codexfastPluginCacheRoot]", "expected 26.616 plugin catalog query cwds to include the full plugin cache root");
  assertNotContains(pluginCatalogLocalCache26616Result.content, "return Je([...typeof n==`string`?[n]:n??r??[],...i==null?[]:[i]],e)", "expected 26.616 plugin catalog patch to stop querying only workspace and internal-testing roots");
  assertContains(pluginCatalogLocalCache26616Result.patchedLabels.join("\n"), "Plugins catalog local cache", "expected 26.616 plugin catalog local cache patch to report its target");

  const gpt55OfficialModelListBody = "\"list-models-for-host\":n9((e,t)=>e.sendRequest(`model/list`,t));";
  const gpt55OfficialModelListResult = applyRuntimePatchesToBody("webview/assets/automations-page-26623.js", gpt55OfficialModelListBody);
  assertContains(gpt55OfficialModelListResult.content, "/*codexfast-gpt55*/", "expected GPT-5.5 model-list patch to wrap the current handler shape");
  assertContains(gpt55OfficialModelListResult.content, "e.model===`gpt-5.5`?{...e", "expected GPT-5.5 model-list patch to update an existing official model entry");
  assertContains(gpt55OfficialModelListResult.content, "additionalSpeedTiers:Array.isArray(e.additionalSpeedTiers)&&e.additionalSpeedTiers.length>0?e.additionalSpeedTiers:[`fast`]", "expected GPT-5.5 model-list patch to preserve or add Fast speed metadata");
  assertContains(gpt55OfficialModelListResult.content, "serviceTiers:Array.isArray(e.serviceTiers)&&e.serviceTiers.length>0?e.serviceTiers:[{id:`priority`,name:`Fast`,description:`1.5x speed, increased usage`}]", "expected GPT-5.5 model-list patch to add the Fast service tier when the official entry lacks it");
  assertContains(gpt55OfficialModelListResult.patchedLabels.join("\n"), "GPT-5.5 model list", "expected GPT-5.5 model-list patch to report its target");

  const gpt55OfficialModelListDollarHandlerBody = "\"list-models-for-host\":$7((e,t)=>e.sendRequest(`model/list`,t));";
  const gpt55OfficialModelListDollarHandlerResult = applyRuntimePatchesToBody(
    "webview/assets/automations-page-26623-81905.js",
    gpt55OfficialModelListDollarHandlerBody,
  );
  assertContains(
    gpt55OfficialModelListDollarHandlerResult.content,
    "/*codexfast-gpt55*/",
    "expected GPT-5.5 model-list patch to wrap the current $7 handler shape",
  );
  assertContains(
    gpt55OfficialModelListDollarHandlerResult.content,
    "serviceTiers:Array.isArray(e.serviceTiers)&&e.serviceTiers.length>0?e.serviceTiers:[{id:`priority`,name:`Fast`,description:`1.5x speed, increased usage`}]",
    "expected GPT-5.5 model-list patch to add Fast service-tier metadata for the $7 handler shape",
  );
  assertContains(
    gpt55OfficialModelListDollarHandlerResult.patchedLabels.join("\n"),
    "GPT-5.5 model list",
    "expected GPT-5.5 model-list patch to report the $7 handler target",
  );

  const gpt56ModelListWithOptionsBody = "\"list-models-for-host\":Q7((e,{priority:t,source:n,timeoutMs:r,...i})=>e.sendRequest(`model/list`,i,{priority:t,source:n,timeoutMs:r}));";
  const gpt56ModelListWithOptionsResult = applyRuntimePatchesToBody(
    "webview/assets/page-26707.js",
    gpt56ModelListWithOptionsBody,
  );
  const gpt56ModelListWithOptionsProperty = gpt56ModelListWithOptionsResult.content.endsWith(";")
    ? gpt56ModelListWithOptionsResult.content.slice(0, -1)
    : gpt56ModelListWithOptionsResult.content;
  try {
    new Function("Q7", `return ({${gpt56ModelListWithOptionsProperty}});`);
  } catch (error) {
    fail(`expected GPT-5.x model-list patch to generate valid JavaScript: ${String(error)}`);
  }
  assertContains(
    gpt56ModelListWithOptionsResult.content,
    "/*codexfast-gpt5x*/",
    "expected GPT-5.x model-list patch to wrap the priority/source/timeout handler shape",
  );
  assertContains(
    gpt56ModelListWithOptionsResult.content,
    "e.sendRequest(`model/list`,i,{priority:t,source:n,timeoutMs:r})",
    "expected GPT-5.x model-list patch to preserve model-list request options",
  );
  assertContains(
    gpt56ModelListWithOptionsResult.content,
    "model===`gpt-5.6-sol`",
    "expected GPT-5.x model-list patch to add or augment GPT-5.6 Sol",
  );
  assertContains(
    gpt56ModelListWithOptionsResult.content,
    "model===`gpt-5.6-terra`",
    "expected GPT-5.x model-list patch to add or augment GPT-5.6 Terra",
  );
  assertContains(
    gpt56ModelListWithOptionsResult.content,
    "model===`gpt-5.6-luna`",
    "expected GPT-5.x model-list patch to add or augment GPT-5.6 Luna",
  );
  const gpt56SolEntryStart = gpt56ModelListWithOptionsResult.content.indexOf("{id:`gpt-5.6-sol`");
  const gpt56TerraEntryStart = gpt56ModelListWithOptionsResult.content.indexOf("{id:`gpt-5.6-terra`");
  const gpt56LunaEntryStart = gpt56ModelListWithOptionsResult.content.indexOf("{id:`gpt-5.6-luna`");
  if (gpt56SolEntryStart < 0 || gpt56TerraEntryStart < 0 || gpt56LunaEntryStart < 0) {
    fail("expected GPT-5.x model-list patch to define Sol, Terra, and Luna entries");
  }
  const gpt56SolEntry = gpt56ModelListWithOptionsResult.content.slice(
    gpt56SolEntryStart,
    gpt56ModelListWithOptionsResult.content.indexOf("defaultReasoningEffort", gpt56SolEntryStart),
  );
  const gpt56TerraEntry = gpt56ModelListWithOptionsResult.content.slice(
    gpt56TerraEntryStart,
    gpt56ModelListWithOptionsResult.content.indexOf("defaultReasoningEffort", gpt56TerraEntryStart),
  );
  const gpt56LunaEntry = gpt56ModelListWithOptionsResult.content.slice(
    gpt56LunaEntryStart,
    gpt56ModelListWithOptionsResult.content.indexOf("defaultReasoningEffort", gpt56LunaEntryStart),
  );
  assertContains(gpt56SolEntry, "reasoningEffort:`max`", "expected GPT-5.6 Sol to expose Max reasoning");
  assertContains(gpt56SolEntry, "reasoningEffort:`ultra`", "expected GPT-5.6 Sol to expose Ultra reasoning");
  assertContains(gpt56TerraEntry, "reasoningEffort:`max`", "expected GPT-5.6 Terra to expose Max reasoning");
  assertContains(gpt56TerraEntry, "reasoningEffort:`ultra`", "expected GPT-5.6 Terra to expose Ultra reasoning");
  assertContains(gpt56LunaEntry, "reasoningEffort:`max`", "expected GPT-5.6 Luna to expose Max reasoning");
  assertNotContains(gpt56LunaEntry, "reasoningEffort:`ultra`", "expected GPT-5.6 Luna not to expose Ultra reasoning");
  assertContains(
    gpt56ModelListWithOptionsResult.content,
    "model===`gpt-5.5`",
    "expected GPT-5.x model-list patch to keep GPT-5.5 metadata augmentation",
  );
  assertContains(
    gpt56ModelListWithOptionsResult.patchedLabels.join("\n"),
    "GPT-5.x model list",
    "expected GPT-5.x model-list patch to report its target",
  );
  const gpt56ModelListAlreadyPatchedResult = applyRuntimePatchesToBody(
    "webview/assets/page-26707.js",
    gpt56ModelListWithOptionsResult.content,
  );
  if (gpt56ModelListAlreadyPatchedResult.content !== gpt56ModelListWithOptionsResult.content) {
    fail("expected GPT-5.x model-list patch to remain unchanged when applied more than once");
  }
  assertContains(
    gpt56ModelListAlreadyPatchedResult.alreadyPatchedLabels.join("\n"),
    "GPT-5.x model list",
    "expected GPT-5.x model-list patch to recognize the generated wrapper as already patched",
  );

  const gpt56ModelSelectorBody =
    "use_hidden_models;select:({data:r})=>Jv({authMethod:t,availableModels:new Set(e),defaultModel:n,enabledReasoningEfforts:c,includeUltraReasoningEffort:l,models:r,useHiddenModels:o})";
  const gpt56ModelSelectorResult = applyRuntimePatchesToBody(
    "webview/assets/model-selector-26707.js",
    gpt56ModelSelectorBody,
  );
  assertContains(
    gpt56ModelSelectorResult.content,
    "availableModels:new Set([...e,`gpt-5.6-sol`,`gpt-5.6-terra`,`gpt-5.6-luna`])",
    "expected GPT-5.6 selector patch to keep Sol, Terra, and Luna visible when use_hidden_models enables the model allowlist",
  );
  assertContains(
    gpt56ModelSelectorResult.content,
    "enabledReasoningEfforts:new Set([...c,`max`,`ultra`])",
    "expected GPT-5.6 selector patch to allow Max and Ultra reasoning options",
  );
  assertContains(
    gpt56ModelSelectorResult.content,
    "includeUltraReasoningEffort:!0",
    "expected GPT-5.6 selector patch to preserve Ultra before per-model effort filtering",
  );
  assertContains(
    gpt56ModelSelectorResult.patchedLabels.join("\n"),
    "GPT-5.6 model query selector",
    "expected GPT-5.6 selector patch to report its target",
  );
  const gpt56SelectorExpression = gpt56ModelSelectorResult.content.slice(
    gpt56ModelSelectorResult.content.indexOf("select:") + "select:".length,
  );
  const gpt56Selector = new Function(
    "Jv",
    "e",
    "t",
    "n",
    "c",
    "l",
    "o",
    `return (${gpt56SelectorExpression});`,
  )(
    (value: unknown) => value,
    ["gpt-5.5"],
    "apikey",
    "gpt-5.4",
    new Set(["low", "medium", "high", "xhigh"]),
    false,
    true,
  ) as (result: { data: unknown[] }) => {
    availableModels: Set<string>;
    enabledReasoningEfforts: Set<string>;
    includeUltraReasoningEffort: boolean;
  };
  const gpt56SelectorArgs = gpt56Selector({ data: [] });
  for (const model of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]) {
    if (!gpt56SelectorArgs.availableModels.has(model)) {
      fail(`expected GPT-5.6 selector allowlist to contain ${model}`);
    }
  }
  for (const effort of ["max", "ultra"]) {
    if (!gpt56SelectorArgs.enabledReasoningEfforts.has(effort)) {
      fail(`expected GPT-5.6 selector effort set to contain ${effort}`);
    }
  }
  if (!gpt56SelectorArgs.includeUltraReasoningEffort) {
    fail("expected GPT-5.6 selector to pass Ultra through to per-model filtering");
  }
  const gpt56ModelSelectorAlreadyPatchedResult = applyRuntimePatchesToBody(
    "webview/assets/model-selector-26707.js",
    gpt56ModelSelectorResult.content,
  );
  if (gpt56ModelSelectorAlreadyPatchedResult.content !== gpt56ModelSelectorResult.content) {
    fail("expected GPT-5.6 selector patch to remain unchanged when applied more than once");
  }
  assertContains(
    gpt56ModelSelectorAlreadyPatchedResult.alreadyPatchedLabels.join("\n"),
    "GPT-5.6 model query selector",
    "expected GPT-5.6 selector patch to recognize the generated selector as already patched",
  );

  const versionFilteredPatcherSource = runtimePatcherSourceForVersion(`
const TARGET_SPECS = [
  {id: "plugins-catalog-visibility-26601", label: "Plugins catalog visibility", needle: "plugin-needle", guardedSignature: /PLUGIN_DISABLED/, patchedSignature: /PLUGIN_ENABLED/, legacyPatchedSignature: null, applyReplacement: "PLUGIN_ENABLED"},
  {id: "speed-setting", label: "Speed setting", needle: "speed-needle", guardedSignature: /SPEED_DISABLED/, patchedSignature: /SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;
  if (!guarded && !patched && !legacyPatched) return null;
  return {spec, guarded, patched, legacyPatched};
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`, "26.623.31443+4441");
  const versionFilteredPatch = new Function(`${versionFilteredPatcherSource}\nreturn applyRuntimePatchesToBody;`)() as (resourcePath: string, body: string) => {
    content: string;
    matchedLabels: string[];
    patchedLabels: string[];
  };
  const versionFilteredResult = versionFilteredPatch(
    "app://-/assets/demo.js",
    "plugin-needle PLUGIN_DISABLED speed-needle SPEED_DISABLED",
  );
  assertContains(
    versionFilteredResult.content,
    "PLUGIN_DISABLED",
    "expected 26.623 runtime launch to skip Plugins targets because the official app supports Plugins",
  );
  assertContains(
    versionFilteredResult.content,
    "SPEED_ENABLED",
    "expected 26.623 runtime launch to keep non-Plugins runtime targets active",
  );
  assertNotContains(
    versionFilteredResult.patchedLabels.join("\n"),
    "Plugins catalog visibility",
    "expected 26.623 runtime launch not to report skipped Plugins targets",
  );
  assertContains(
    versionFilteredResult.patchedLabels.join("\n"),
    "Speed setting",
    "expected 26.623 runtime launch to report patched non-Plugins targets",
  );

  const versionFilteredPatcherSource4452 = runtimePatcherSourceForVersion(`
const TARGET_SPECS = [
  {id: "plugins-catalog-visibility-26601", label: "Plugins catalog visibility", needle: "plugin-needle", guardedSignature: /PLUGIN_DISABLED/, patchedSignature: /PLUGIN_ENABLED/, legacyPatchedSignature: null, applyReplacement: "PLUGIN_ENABLED"},
  {id: "speed-setting", label: "Speed setting", needle: "speed-needle", guardedSignature: /SPEED_DISABLED/, patchedSignature: /SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;
  if (!guarded && !patched && !legacyPatched) return null;
  return {spec, guarded, patched, legacyPatched};
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`, "26.623.31921+4452");
  const versionFilteredPatch4452 = new Function(`${versionFilteredPatcherSource4452}\nreturn applyRuntimePatchesToBody;`)() as (resourcePath: string, body: string) => {
    content: string;
    patchedLabels: string[];
  };
  const versionFilteredResult4452 = versionFilteredPatch4452(
    "app://-/assets/demo.js",
    "plugin-needle PLUGIN_DISABLED speed-needle SPEED_DISABLED",
  );
  assertContains(
    versionFilteredResult4452.content,
    "PLUGIN_DISABLED",
    "expected 26.623.31921 runtime launch to skip Plugins targets because the official app supports Plugins",
  );
  assertContains(
    versionFilteredResult4452.content,
    "SPEED_ENABLED",
    "expected 26.623.31921 runtime launch to keep non-Plugins runtime targets active",
  );

  const versionFilteredPatcherSource4548 = runtimePatcherSourceForVersion(`
const TARGET_SPECS = [
  {id: "plugins-catalog-visibility-26601", label: "Plugins catalog visibility", needle: "plugin-needle", guardedSignature: /PLUGIN_DISABLED/, patchedSignature: /PLUGIN_ENABLED/, legacyPatchedSignature: null, applyReplacement: "PLUGIN_ENABLED"},
  {id: "speed-setting", label: "Speed setting", needle: "speed-needle", guardedSignature: /SPEED_DISABLED/, patchedSignature: /SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;
  if (!guarded && !patched && !legacyPatched) return null;
  return {spec, guarded, patched, legacyPatched};
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`, "26.623.61825+4548");
  const versionFilteredPatch4548 = new Function(`${versionFilteredPatcherSource4548}\nreturn applyRuntimePatchesToBody;`)() as (resourcePath: string, body: string) => {
    content: string;
    patchedLabels: string[];
  };
  const versionFilteredResult4548 = versionFilteredPatch4548(
    "app://-/assets/demo.js",
    "plugin-needle PLUGIN_DISABLED speed-needle SPEED_DISABLED",
  );
  assertContains(
    versionFilteredResult4548.content,
    "PLUGIN_DISABLED",
    "expected 26.623.61825 runtime launch to skip Plugins targets because the official app supports Plugins",
  );
  assertContains(
    versionFilteredResult4548.content,
    "SPEED_ENABLED",
    "expected 26.623.61825 runtime launch to keep non-Plugins runtime targets active",
  );

  const versionFilteredPatcherSource4559 = runtimePatcherSourceForVersion(`
const TARGET_SPECS = [
  {id: "plugins-catalog-visibility-26601", label: "Plugins catalog visibility", needle: "plugin-needle", guardedSignature: /PLUGIN_DISABLED/, patchedSignature: /PLUGIN_ENABLED/, legacyPatchedSignature: null, applyReplacement: "PLUGIN_ENABLED"},
  {id: "speed-setting", label: "Speed setting", needle: "speed-needle", guardedSignature: /SPEED_DISABLED/, patchedSignature: /SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;
  if (!guarded && !patched && !legacyPatched) return null;
  return {spec, guarded, patched, legacyPatched};
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`, "26.623.70822+4559");
  const versionFilteredPatch4559 = new Function(`${versionFilteredPatcherSource4559}\nreturn applyRuntimePatchesToBody;`)() as (resourcePath: string, body: string) => {
    content: string;
    patchedLabels: string[];
  };
  const versionFilteredResult4559 = versionFilteredPatch4559(
    "app://-/assets/demo.js",
    "plugin-needle PLUGIN_DISABLED speed-needle SPEED_DISABLED",
  );
  assertContains(
    versionFilteredResult4559.content,
    "PLUGIN_DISABLED",
    "expected 26.623.70822 runtime launch to skip Plugins targets because the official app supports Plugins",
  );
  assertContains(
    versionFilteredResult4559.content,
    "SPEED_ENABLED",
    "expected 26.623.70822 runtime launch to keep non-Plugins runtime targets active",
  );

  const versionFilteredPatcherSource4598 = runtimePatcherSourceForVersion(`
const TARGET_SPECS = [
  {id: "plugins-catalog-visibility-26601", label: "Plugins catalog visibility", needle: "plugin-needle", guardedSignature: /PLUGIN_DISABLED/, patchedSignature: /PLUGIN_ENABLED/, legacyPatchedSignature: null, applyReplacement: "PLUGIN_ENABLED"},
  {id: "speed-setting", label: "Speed setting", needle: "speed-needle", guardedSignature: /SPEED_DISABLED/, patchedSignature: /SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;
  if (!guarded && !patched && !legacyPatched) return null;
  return {spec, guarded, patched, legacyPatched};
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`, "26.623.81905+4598");
  const versionFilteredPatch4598 = new Function(`${versionFilteredPatcherSource4598}\nreturn applyRuntimePatchesToBody;`)() as (resourcePath: string, body: string) => {
    content: string;
    patchedLabels: string[];
  };
  const versionFilteredResult4598 = versionFilteredPatch4598(
    "app://-/assets/demo.js",
    "plugin-needle PLUGIN_DISABLED speed-needle SPEED_DISABLED",
  );
  assertContains(
    versionFilteredResult4598.content,
    "PLUGIN_DISABLED",
    "expected 26.623.81905 runtime launch to skip Plugins targets because the official app supports Plugins",
  );
  assertContains(
    versionFilteredResult4598.content,
    "SPEED_ENABLED",
    "expected 26.623.81905 runtime launch to keep non-Plugins runtime targets active",
  );

  const versionFilteredPatcherSource4674 = runtimePatcherSourceForVersion(`
const TARGET_SPECS = [
  {id: "plugins-catalog-visibility-26601", label: "Plugins catalog visibility", needle: "plugin-needle", guardedSignature: /PLUGIN_DISABLED/, patchedSignature: /PLUGIN_ENABLED/, legacyPatchedSignature: null, applyReplacement: "PLUGIN_ENABLED"},
  {id: "speed-setting", label: "Speed setting", needle: "speed-needle", guardedSignature: /SPEED_DISABLED/, patchedSignature: /SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;
  if (!guarded && !patched && !legacyPatched) return null;
  return {spec, guarded, patched, legacyPatched};
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`, "26.623.101652+4674");
  const versionFilteredPatch4674 = new Function(`${versionFilteredPatcherSource4674}\nreturn applyRuntimePatchesToBody;`)() as (resourcePath: string, body: string) => {
    content: string;
    patchedLabels: string[];
  };
  const versionFilteredResult4674 = versionFilteredPatch4674(
    "app://-/assets/demo.js",
    "plugin-needle PLUGIN_DISABLED speed-needle SPEED_DISABLED",
  );
  assertContains(
    versionFilteredResult4674.content,
    "PLUGIN_DISABLED",
    "expected 26.623.101652 runtime launch to skip Plugins targets because the official app supports Plugins",
  );
  assertContains(
    versionFilteredResult4674.content,
    "SPEED_ENABLED",
    "expected 26.623.101652 runtime launch to keep non-Plugins runtime targets active",
  );

  const versionFilteredPatcherSource4753 = runtimePatcherSourceForVersion(`
const TARGET_SPECS = [
  {id: "plugins-catalog-visibility-26601", label: "Plugins catalog visibility", needle: "plugin-needle", guardedSignature: /PLUGIN_DISABLED/, patchedSignature: /PLUGIN_ENABLED/, legacyPatchedSignature: null, applyReplacement: "PLUGIN_ENABLED"},
  {id: "speed-setting", label: "Speed setting", needle: "speed-needle", guardedSignature: /SPEED_DISABLED/, patchedSignature: /SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;
  if (!guarded && !patched && !legacyPatched) return null;
  return {spec, guarded, patched, legacyPatched};
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`, "26.623.141536+4753");
  const versionFilteredPatch4753 = new Function(`${versionFilteredPatcherSource4753}\nreturn applyRuntimePatchesToBody;`)() as (resourcePath: string, body: string) => {
    content: string;
    patchedLabels: string[];
  };
  const versionFilteredResult4753 = versionFilteredPatch4753(
    "app://-/assets/demo.js",
    "plugin-needle PLUGIN_DISABLED speed-needle SPEED_DISABLED",
  );
  assertContains(
    versionFilteredResult4753.content,
    "PLUGIN_DISABLED",
    "expected 26.623.141536 runtime launch to skip Plugins targets because the official app supports Plugins",
  );
  assertContains(
    versionFilteredResult4753.content,
    "SPEED_ENABLED",
    "expected 26.623.141536 runtime launch to keep non-Plugins runtime targets active",
  );

  const officialPluginsPatcherSource = `
const TARGET_SPECS = [
  {id: "plugins-catalog-visibility-26601", label: "Plugins catalog visibility", needle: "plugin-needle", guardedSignature: /PLUGIN_DISABLED/, patchedSignature: /PLUGIN_ENABLED/, legacyPatchedSignature: null, applyReplacement: "PLUGIN_ENABLED"},
  {id: "speed-setting", label: "Speed setting", needle: "speed-needle", guardedSignature: /SPEED_DISABLED/, patchedSignature: /SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;
  if (!guarded && !patched && !legacyPatched) return null;
  return {spec, guarded, patched, legacyPatched};
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`;
  const applyOfficialPluginsPatcherForVersion = (versionKey: string) =>
    new Function(`${runtimePatcherSourceForVersion(officialPluginsPatcherSource, versionKey)}\nreturn applyRuntimePatchesToBody;`)() as (
      resourcePath: string,
      body: string,
    ) => { content: string; patchedLabels: string[] };
  for (const [versionKey, buildLabel] of [
    ["26.707.31428+5059", "5059"],
    ["26.707.61608+5200", "5200"],
    ["26.707.71524+5263", "5263"],
    ["26.707.72221+5307", "5307"],
    ["26.707.91948+5440", "5440"],
    ["26.715.21425+5488", "5488"],
    ["26.715.31925+5551", "5551"],
    ["26.715.52143+5591", "5591"],
    ["26.715.61943+5628", "5628"],
    ["26.715.70719+5650", "5650"],
    ["26.715.72028+5706", "5706"],
    ["26.715.72359+5718", "5718"],
    ["26.721.30844+5813", "5813"],
    ["26.721.31836+5828", "5828"],
  ] as const) {
    const result = applyOfficialPluginsPatcherForVersion(versionKey)(
      "app://-/assets/demo.js",
      "plugin-needle PLUGIN_DISABLED speed-needle SPEED_DISABLED",
    );
    assertContains(result.content, "PLUGIN_DISABLED", `expected build ${buildLabel} to use official Plugins paths`);
    assertContains(result.content, "SPEED_ENABLED", `expected build ${buildLabel} to retain non-Plugins runtime patches`);
  }

  const officialGpt56PatcherSource = `
const TARGET_SPECS = [
  {id: "gpt5x-model-list-options", label: "GPT-5.x model list", needle: "gpt56-list", guardedSignature: /GPT56_LIST_DISABLED/, patchedSignature: /GPT56_LIST_ENABLED/, legacyPatchedSignature: null, applyReplacement: "GPT56_LIST_ENABLED"},
  {id: "gpt56-model-query-selector", label: "GPT-5.6 model query selector", needle: "gpt56-selector", guardedSignature: /GPT56_SELECTOR_DISABLED/, patchedSignature: /GPT56_SELECTOR_ENABLED/, legacyPatchedSignature: null, applyReplacement: "GPT56_SELECTOR_ENABLED"},
  {id: "speed-setting", label: "Speed setting", needle: "speed-needle", guardedSignature: /SPEED_DISABLED/, patchedSignature: /SPEED_ENABLED/, legacyPatchedSignature: null, applyReplacement: "SPEED_ENABLED"}
];
function replaceContent(content, signature, replacement) {
  return content.replace(signature, replacement);
}
function replaceContentOrThrow(content, signature, replacement) {
  return replaceContent(content, signature, replacement);
}
function inspectSpec(content, spec) {
  if (!content.includes(spec.needle)) return null;
  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  if (!guarded && !patched) return null;
  return {spec, guarded, patched, legacyPatched: false};
}
function applyRuntimePatchesToBody(_resourcePath, body) {
  let content = body;
  const matchedLabels = [];
  const patchedLabels = [];
  const alreadyPatchedLabels = [];
  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) continue;
    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
    } else if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }
  return {content, matchedLabels, patchedLabels, alreadyPatchedLabels};
}
`;
  const applyOfficialGpt56PatcherForVersion = (versionKey: string) =>
    new Function(`${runtimePatcherSourceForVersion(officialGpt56PatcherSource, versionKey)}\nreturn applyRuntimePatchesToBody;`)() as (
      resourcePath: string,
      body: string,
    ) => { content: string; patchedLabels: string[] };
  const officialGpt56Body = "gpt56-list GPT56_LIST_DISABLED gpt56-selector GPT56_SELECTOR_DISABLED speed-needle SPEED_DISABLED";
  const officialGpt56ThresholdResult = applyOfficialGpt56PatcherForVersion("26.707.41301+5103")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56ThresholdResult.content, "GPT56_LIST_DISABLED", "expected build 5103 to use the official GPT-5.6 model list");
  assertContains(officialGpt56ThresholdResult.content, "GPT56_SELECTOR_DISABLED", "expected build 5103 to use the official GPT-5.6 selector");
  assertContains(officialGpt56ThresholdResult.content, "SPEED_ENABLED", "expected build 5103 to retain non-GPT runtime patches");
  const officialGpt56Build5200Result = applyOfficialGpt56PatcherForVersion("26.707.61608+5200")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5200Result.content, "GPT56_LIST_DISABLED", "expected build 5200 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5200Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5200 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5200Result.content, "SPEED_ENABLED", "expected build 5200 to retain non-GPT runtime patches");
  const officialGpt56Build5263Result = applyOfficialGpt56PatcherForVersion("26.707.71524+5263")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5263Result.content, "GPT56_LIST_DISABLED", "expected build 5263 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5263Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5263 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5263Result.content, "SPEED_ENABLED", "expected build 5263 to retain non-GPT runtime patches");
  const officialGpt56Build5307Result = applyOfficialGpt56PatcherForVersion("26.707.72221+5307")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5307Result.content, "GPT56_LIST_DISABLED", "expected build 5307 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5307Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5307 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5307Result.content, "SPEED_ENABLED", "expected build 5307 to retain non-GPT runtime patches");
  const officialGpt56Build5440Result = applyOfficialGpt56PatcherForVersion("26.707.91948+5440")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5440Result.content, "GPT56_LIST_DISABLED", "expected build 5440 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5440Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5440 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5440Result.content, "SPEED_ENABLED", "expected build 5440 to retain non-GPT runtime patches");
  const officialGpt56Build5488Result = applyOfficialGpt56PatcherForVersion("26.715.21425+5488")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5488Result.content, "GPT56_LIST_DISABLED", "expected build 5488 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5488Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5488 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5488Result.content, "SPEED_ENABLED", "expected build 5488 to retain non-GPT runtime patches");
  const officialGpt56Build5551Result = applyOfficialGpt56PatcherForVersion("26.715.31925+5551")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5551Result.content, "GPT56_LIST_DISABLED", "expected build 5551 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5551Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5551 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5551Result.content, "SPEED_ENABLED", "expected build 5551 to retain non-GPT runtime patches");
  const officialGpt56Build5591Result = applyOfficialGpt56PatcherForVersion("26.715.52143+5591")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5591Result.content, "GPT56_LIST_DISABLED", "expected build 5591 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5591Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5591 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5591Result.content, "SPEED_ENABLED", "expected build 5591 to retain non-GPT runtime patches");
  const officialGpt56Build5628Result = applyOfficialGpt56PatcherForVersion("26.715.61943+5628")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5628Result.content, "GPT56_LIST_DISABLED", "expected build 5628 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5628Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5628 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5628Result.content, "SPEED_ENABLED", "expected build 5628 to retain non-GPT runtime patches");
  const officialGpt56Build5650Result = applyOfficialGpt56PatcherForVersion("26.715.70719+5650")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5650Result.content, "GPT56_LIST_DISABLED", "expected build 5650 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5650Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5650 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5650Result.content, "SPEED_ENABLED", "expected build 5650 to retain non-GPT runtime patches");
  const officialGpt56Build5706Result = applyOfficialGpt56PatcherForVersion("26.715.72028+5706")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5706Result.content, "GPT56_LIST_DISABLED", "expected build 5706 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5706Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5706 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5706Result.content, "SPEED_ENABLED", "expected build 5706 to retain non-GPT runtime patches");
  const officialGpt56Build5718Result = applyOfficialGpt56PatcherForVersion("26.715.72359+5718")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5718Result.content, "GPT56_LIST_DISABLED", "expected build 5718 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5718Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5718 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5718Result.content, "SPEED_ENABLED", "expected build 5718 to retain non-GPT runtime patches");
  const officialGpt56Build5813Result = applyOfficialGpt56PatcherForVersion("26.721.30844+5813")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5813Result.content, "GPT56_LIST_DISABLED", "expected build 5813 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5813Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5813 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5813Result.content, "SPEED_ENABLED", "expected build 5813 to retain non-GPT runtime patches");
  const officialGpt56Build5828Result = applyOfficialGpt56PatcherForVersion("26.721.31836+5828")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56Build5828Result.content, "GPT56_LIST_DISABLED", "expected build 5828 to use the official GPT-5.6 model list");
  assertContains(officialGpt56Build5828Result.content, "GPT56_SELECTOR_DISABLED", "expected build 5828 to use the official GPT-5.6 selector");
  assertContains(officialGpt56Build5828Result.content, "SPEED_ENABLED", "expected build 5828 to retain non-GPT runtime patches");
  const officialGpt56LaterResult = applyOfficialGpt56PatcherForVersion("26.708.10000+5200")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56LaterResult.content, "GPT56_LIST_DISABLED", "expected later builds to use the official GPT-5.6 model list");
  assertContains(officialGpt56LaterResult.content, "GPT56_SELECTOR_DISABLED", "expected later builds to use the official GPT-5.6 selector");
  const officialGpt56OlderResult = applyOfficialGpt56PatcherForVersion("26.707.31428+5059")(
    "app://-/assets/demo.js",
    officialGpt56Body,
  );
  assertContains(officialGpt56OlderResult.content, "GPT56_LIST_ENABLED", "expected pre-threshold builds to retain GPT-5.6 model-list compatibility");
  assertContains(officialGpt56OlderResult.content, "GPT56_SELECTOR_ENABLED", "expected pre-threshold builds to retain GPT-5.6 selector compatibility");

  const nativePipeBody = "function dP(){return lP().info(`browser-use native pipe peer authorization enabled`,{safe:{mode:a?`dev`:`packaged`},sensitive:{}}),e=>{let t=fP(e);return t==null?{authorized:!1,reason:`missing-socket-file-descriptor`}:s.authorizeSocketPeer(t,a)}}";
  const nativePipeResult = applyRuntimePatchesToBody("webview/assets/browser-use-native-pipe-Demo.js", nativePipeBody);
  if (nativePipeResult.content !== nativePipeBody) {
    fail("expected runtime patch engine to leave browser-use native pipe peer auth unchanged", nativePipeResult.content);
  }
  assertNotContains(nativePipeResult.patchedLabels.join("\n"), "Browser-use native pipe peer auth", "expected runtime patch engine not to report removed native pipe target");
}
