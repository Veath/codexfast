import { assertContains, assertNotContains, fail } from "../helpers/assertions.mts";
import { applyRuntimePatchesToBody } from "../../src/patch-engine.mts";

export function runRuntimePatchSuite(): void {
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

  const sharedMarketplacePrefetch26601Body = "additionalMarketplaceKinds;return D(e,I,{enabled:z,additionalMarketplaceKinds:[`shared-with-me`]}),E({enabled:z,hostId:e,marketplaceKind:`shared-with-me`}),E({enabled:z,hostId:e,marketplaceKind:`workspace-directory`}),null";
  const sharedMarketplacePrefetch26601Result = applyRuntimePatchesToBody("webview/assets/app-prefetch-impl-26601.js", sharedMarketplacePrefetch26601Body);
  assertContains(sharedMarketplacePrefetch26601Result.content, "additionalMarketplaceKinds:[]}),E({enabled:!1,hostId:e,marketplaceKind:`shared-with-me`})", "expected 26.601 shared marketplace prefetch patch to skip the remote shared plugin catalog");
  assertContains(sharedMarketplacePrefetch26601Result.patchedLabels.join("\n"), "Composer plugin mentions", "expected 26.601 shared marketplace prefetch patch to report plugin mention target");

  const pluginCatalogVisibility26601Body = "openai-curated-marketplaces-hidden;function ge(e){return e!==`chatgpt`}var O=[`icon`];";
  const pluginCatalogVisibility26601Result = applyRuntimePatchesToBody("webview/assets/use-plugins-26601.js", pluginCatalogVisibility26601Body);
  assertContains(pluginCatalogVisibility26601Result.content, "function ge(e){return !1}", "expected 26.601 plugin catalog patch to keep the curated OpenAI catalog visible for custom API users");
  assertNotContains(pluginCatalogVisibility26601Result.content, "return e!==`chatgpt`", "expected 26.601 plugin catalog patch to remove the auth-method catalog restriction");
  assertContains(pluginCatalogVisibility26601Result.patchedLabels.join("\n"), "Plugins catalog visibility", "expected 26.601 plugin catalog patch to report catalog visibility target");

  const nativePipeBody = "function dP(){return lP().info(`browser-use native pipe peer authorization enabled`,{safe:{mode:a?`dev`:`packaged`},sensitive:{}}),e=>{let t=fP(e);return t==null?{authorized:!1,reason:`missing-socket-file-descriptor`}:s.authorizeSocketPeer(t,a)}}";
  const nativePipeResult = applyRuntimePatchesToBody("webview/assets/browser-use-native-pipe-Demo.js", nativePipeBody);
  if (nativePipeResult.content !== nativePipeBody) {
    fail("expected runtime patch engine to leave browser-use native pipe peer auth unchanged", nativePipeResult.content);
  }
  assertNotContains(nativePipeResult.patchedLabels.join("\n"), "Browser-use native pipe peer auth", "expected runtime patch engine not to report removed native pipe target");
}
