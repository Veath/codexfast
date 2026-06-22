import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertContains, assertNotContains, fail } from "../helpers/assertions.mts";
import { applyRuntimePatchesToBody } from "../../src/patch-engine.mts";
import { isRuntimeJavaScriptResource } from "../../src/cli-runtime-patcher.mts";
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
  } finally {
    rmSync(codexHomeWithSpace, { force: true, recursive: true });
  }

  assertContains(
    createMainProcessAutomaticUpdateHookSource(),
    "disableAutomaticUpdates",
    "expected automatic update main-process hook to patch the backend settings schema used when saving the switch",
  );

  const mainProcessSettingsSchemaBody =
    "localeOverride:K({agentAccess:`read-write`,default:null,description:`Explicit locale override`,key:`localeOverride`,schema:BS}),preventSleepWhileRunning:K({agentAccess:`read-write`,default:!1,description:`Whether the machine stays awake while Codex is running`,key:`preventSleepWhileRunning`,schema:RS}),keepRemoteControlAwakeWhilePluggedIn:K({agentAccess:`read-write`,default:!1,description:`Whether remote control keeps this computer awake while plugged in`,key:`keepRemoteControlAwakeWhilePluggedIn`,schema:RS})";
  assertContains(
    patchMainProcessSettingsSchemaSource(mainProcessSettingsSchemaBody),
    "disableAutomaticUpdates:K({agentAccess:`read-write`,default:!1,description:`Whether background automatic update checks are disabled`,key:`disableAutomaticUpdates`,schema:RS})",
    "expected main-process settings schema patch to let the backend persist disableAutomaticUpdates",
  );

  const mainProcessUpdaterBody =
    "this.updater={checkForUpdates:async()=>{c.checkForUpdates()},installUpdatesIfAvailable:async()=>{c.installUpdatesIfAvailable()}};let f=JB();f>0&&setInterval(d,f).unref(),d()}resolveMacSparkleFeedUrl(){return n.o(`codexSparkleFeedUrl`)}";
  const patchedMainProcessUpdater = patchMainProcessAutomaticUpdateSource(
    mainProcessUpdaterBody,
  );
  assertContains(
    patchedMainProcessUpdater,
    "process.env.CODEXFAST_DISABLE_AUTOMATIC_UPDATES!==`1`&&(f>0&&setInterval(d,f).unref(),d())",
    "expected main-process hook to skip only background automatic update checks when the codexfast setting is enabled",
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

  const settingsSchemaBody =
    "localeOverride:K({agentAccess:`read-write`,default:null,description:`Explicit locale override`,key:`localeOverride`,schema:BS}),preventSleepWhileRunning:K({agentAccess:`read-write`,default:!1,description:`Whether the machine stays awake while Codex is running`,key:`preventSleepWhileRunning`,schema:RS}),keepRemoteControlAwakeWhilePluggedIn:K({agentAccess:`read-write`,default:!1,description:`Whether remote control keeps this computer awake while plugged in`,key:`keepRemoteControlAwakeWhilePluggedIn`,schema:RS})";
  const settingsSchemaResult = applyRuntimePatchesToBody(
    ".vite/build/src-UHYOvFd-.js",
    settingsSchemaBody,
  );
  assertContains(
    settingsSchemaResult.content,
    "disableAutomaticUpdates:K({agentAccess:`read-write`,default:!1,description:`Whether background automatic update checks are disabled`,key:`disableAutomaticUpdates`,schema:RS})",
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
    "defaultMessage:`Disable automatic updates`",
    "expected General settings patch to add the disable automatic updates label",
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
  assertContains(serviceTierAllowance26602Result.content, "f=!u&&(a?c!=null&&c?.requirements?.featureRequirements?.fast_mode!==!1:o!=null)", "expected service tier allowance patch to keep ChatGPT gating and allow non-ChatGPT auth methods");
  assertNotContains(serviceTierAllowance26602Result.content, "f=a&&!u&&c!=null", "expected service tier allowance patch to stop blocking custom API users at the source hook");
  assertContains(serviceTierAllowance26602Result.patchedLabels.join("\n"), "Speed service tier allowance", "expected service tier allowance patch to report its target");

  const serviceTierConversationFallback26608Body = "serviceTierForRequest;function F(e){let r=(0,A.c)(29),a=e===void 0?null:e,d=n(i),f=k(a),{modelSettings:h}=E(a),_;r[0]===f.hostId?_=r[1]:(_={hostId:f.hostId},r[0]=f.hostId,r[1]=_);let{data:x,isLoading:S}=O(_),C=t(o,a),w=t(g,a),D=M(f.hostId),P=N(f.hostId,D.activeProfileForWrite),F;r[2]===f.hostId?F=r[3]:(F={hostId:f.hostId},r[2]=f.hostId,r[3]=F);let{isServiceTierAllowed:I}=j(F),L,R,z,B,V;if(r[4]!==a||r[5]!==S||r[6]!==I||r[7]!==C||r[8]!==w||r[9]!==x?.models||r[10]!==h.isLoading||r[11]!==h.model||r[12]!==d||r[13]!==P||r[14]!==D.isLoading||r[15]!==D.serviceTier){let e=T(x?.models,h.model),t=a!=null&&C?.serviceTier!==void 0?C.serviceTier:a!=null&&w?.params.serviceTier!==void 0?w.params.serviceTier:D.serviceTier;z=a!=null&&(C?.serviceTier!==void 0||w?.params.serviceTier!==void 0)?I?t:null:l(e,t,I),R=z==null?null:m(e,z);let n=c(z??null);L=h.isLoading||S||D.isLoading,B=async(e,t)=>{let r=s(e)!==D.serviceTier,i=a!=null&&e!==C?.serviceTier;try{i&&await p(`update-thread-settings-for-next-turn`,{conversationId:a,threadSettings:{serviceTier:e}}),r&&await P(e)}catch(e){let t=e;v.error(`Failed to set service tier`,{safe:{},sensitive:{error:t}});return}if(r||i){let r=c(e);if(n===r)return;b(d,y,{previousServiceTier:n,serviceTier:r,source:t})}},V=u(e),r[4]=a,r[5]=S,r[6]=I,r[7]=C,r[8]=w,r[9]=x?.models,r[10]=h.isLoading,r[11]=h.model,r[12]=d,r[13]=P,r[14]=D.isLoading,r[15]=D.serviceTier,r[16]=L,r[17]=R,r[18]=z,r[19]=B,r[20]=V}else L=r[16],R=r[17],z=r[18],B=r[19],V=r[20];let H;r[21]!==L||r[22]!==R||r[23]!==z||r[24]!==V?(H={availableOptions:V,isLoading:L,selectedServiceTier:R,serviceTierForRequest:z},r[21]=L,r[22]=R,r[23]=z,r[24]=V,r[25]=H):H=r[25];let U;return r[26]!==B||r[27]!==H?(U={serviceTierSettings:H,setServiceTier:B},r[26]=B,r[27]=H,r[28]=U):U=r[28],U}";
  const serviceTierConversationFallback26608Result = applyRuntimePatchesToBody("webview/assets/use-service-tier-settings-26608.js", serviceTierConversationFallback26608Body);
  assertContains(serviceTierConversationFallback26608Result.content, "t=D.serviceTier", "expected stale conversation state to fall back to the configured default tier");
  assertContains(serviceTierConversationFallback26608Result.content, "z=l(e,t,I)", "expected stale latest-turn params not to override the configured default tier");
  assertNotContains(serviceTierConversationFallback26608Result.content, "C?.serviceTier!=null", "expected persisted conversation-level Standard not to override Settings Fast after relaunch");
  assertNotContains(serviceTierConversationFallback26608Result.content, "C?.serviceTier!==void 0?", "expected persisted conversation-level Standard not to override Settings Fast after relaunch");
  assertNotContains(serviceTierConversationFallback26608Result.content, "w?.params.serviceTier!==void 0?", "expected paused/edit latest-turn Standard not to override Settings Fast after resend");
  assertNotContains(serviceTierConversationFallback26608Result.content, "w?.params.serviceTier!==void 0?I?t:null", "expected latest-turn service tier params not to lock the current conversation speed");
  assertContains(serviceTierConversationFallback26608Result.patchedLabels.join("\n"), "Speed service tier conversation fallback", "expected service tier fallback patch to report its target");

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

  const nativePipeBody = "function dP(){return lP().info(`browser-use native pipe peer authorization enabled`,{safe:{mode:a?`dev`:`packaged`},sensitive:{}}),e=>{let t=fP(e);return t==null?{authorized:!1,reason:`missing-socket-file-descriptor`}:s.authorizeSocketPeer(t,a)}}";
  const nativePipeResult = applyRuntimePatchesToBody("webview/assets/browser-use-native-pipe-Demo.js", nativePipeBody);
  if (nativePipeResult.content !== nativePipeBody) {
    fail("expected runtime patch engine to leave browser-use native pipe peer auth unchanged", nativePipeResult.content);
  }
  assertNotContains(nativePipeResult.patchedLabels.join("\n"), "Browser-use native pipe peer auth", "expected runtime patch engine not to report removed native pipe target");
}
