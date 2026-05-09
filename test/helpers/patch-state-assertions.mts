import { assertContains, assertNotContains } from "./assertions.mts";
import { readFakeAsarFile } from "./fake-asar.mts";

export function archiveFile(archivePath: string, relativePath?: string): string {
  return readFakeAsarFile(archivePath, relativePath);
}

export function assertApplyState(archivePath: string): void {
  assertContains(archiveFile(archivePath), 'let view="general";', "expected apply to remove the guarded Speed settings return");
  assertContains(archiveFile(archivePath, "webview/assets/index.js"), "enabled:!0", "expected apply to enable the Fast slash command");
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings.js"), "D=!0", "expected apply to enable the add-context Speed menu");
  assertContains(archiveFile(archivePath, "webview/assets/sidebar.js"), "j=!1", "expected apply to remove the Plugins sidebar api-key gate");
}

export function assertGuardedState(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath), "if(!x)return null;", `expected ${context} to preserve the guarded Speed settings state`);
  assertContains(archiveFile(archivePath, "webview/assets/index.js"), "enabled:n", `expected ${context} to preserve the guarded Fast slash command state`);
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings.js"), "D=Cr()", `expected ${context} to preserve the guarded add-context Speed menu state`);
  assertContains(archiveFile(archivePath, "webview/assets/sidebar.js"), "j=T===`apikey`", `expected ${context} to preserve the guarded Plugins sidebar state`);
}

export function assertApplyState26417(archivePath: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-D2eks1ok.js"), "let o;", "expected 26.417 apply to remove the guarded Speed settings return");
  assertContains(archiveFile(archivePath, "webview/assets/index-CxBol07n.js"), "enabled:!0", "expected 26.417 apply to enable the Fast slash command");
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings-ldiRRtPt.js"), "D=!0", "expected 26.417 apply to enable the add-context Speed menu");
  const sidebar = archiveFile(archivePath, "webview/assets/sidebar-CxBol07n.js");
  assertContains(sidebar, "j=!1", "expected 26.417 apply to remove the Plugins sidebar api-key gate");
  assertContains(sidebar, /j=!1,M=D([,;])/, "expected 26.417 apply to expose the Plugins nav label for api-key users");
}

export function assertGuardedState26417(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-D2eks1ok.js"), "if(!n)return null;", `expected ${context} to preserve the 26.417 guarded Speed settings state`);
  assertContains(archiveFile(archivePath, "webview/assets/index-CxBol07n.js"), "enabled:n", `expected ${context} to preserve the 26.417 guarded Fast slash command state`);
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings-ldiRRtPt.js"), "D=cr()", `expected ${context} to preserve the 26.417 guarded add-context Speed menu state`);
  const sidebar = archiveFile(archivePath, "webview/assets/sidebar-CxBol07n.js");
  assertContains(sidebar, "j=O&&A", `expected ${context} to preserve the 26.417 guarded Plugins sidebar state`);
  assertContains(sidebar, "M=D&&!A", `expected ${context} to preserve the 26.417 guarded Plugins nav label state`);
}

export function assertApplyState26422(archivePath: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-CnVD4YyB.js"), "let a;", "expected 26.422 apply to remove the guarded Speed settings return");
  const index = archiveFile(archivePath, "webview/assets/index-gATb9Tvd.js");
  assertContains(index, "enabled:!0", "expected 26.422 apply to enable the Fast slash command");
  assertContains(index, "g=!0", "expected 26.422 apply to enable the composer Intelligence Speed menu");
  assertContains(index, "A=!1", "expected 26.422 apply to remove the Plugins sidebar api-key gate");
  assertContains(index, /ee=Ha\(\{hostId:me\}\)[,;]/, "expected 26.422 apply to expose the Plugins nav label for api-key users");
  assertContains(index, "codexfast-gpt55", "expected 26.422 apply to inject GPT-5.5 into the model list");
  assertContains(archiveFile(archivePath, "webview/assets/font-settings-C9TXXljS.js"), "codexfast-gpt55-select", "expected 26.422 apply to keep GPT-5.5 visible after the model query filter");
}

export function assertApplyState26422WithoutGptPatch(archivePath: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-CnVD4YyB.js"), "let a;", "expected 26.422 build 2080 apply to remove the guarded Speed settings return");
  const index = archiveFile(archivePath, "webview/assets/index-gATb9Tvd.js");
  assertContains(index, "enabled:!0", "expected 26.422 build 2080 apply to enable the Fast slash command");
  assertContains(index, "g=!0", "expected 26.422 build 2080 apply to enable the composer Intelligence Speed menu");
  assertContains(index, "A=!1", "expected 26.422 build 2080 apply to remove the Plugins sidebar api-key gate");
  assertNotContains(index, "codexfast-gpt55", "expected 26.422 build 2080 apply to leave the model list handler on the official path");
  assertNotContains(archiveFile(archivePath, "webview/assets/font-settings-C9TXXljS.js"), "codexfast-gpt55-select", "expected 26.422 build 2080 apply to leave the model query selector on the official path");
}

export function assertApplyState26422Build2176Or2180(archivePath: string): void {
  const generalSettings = archiveFile(archivePath, "webview/assets/general-settings-C7RhZXaE.js");
  assertContains(generalSettings, "{serviceTierSettings:r,setServiceTier:i}=xe();let a;", "expected 26.422 build 2176/2180 apply to remove the guarded Speed settings return");
  assertNotContains(generalSettings, "if(!n)return null;", "expected 26.422 build 2176/2180 apply to expose the Settings Speed control");
  const index = archiveFile(archivePath, "webview/assets/index-BSTEB47c.js");
  assertContains(index, "enabled:!0", "expected 26.422 build 2176/2180 apply to enable the Fast slash command");
  assertContains(index, "g=!0", "expected 26.422 build 2176/2180 apply to enable the composer Intelligence Speed menu");
  assertContains(index, "A=!1", "expected 26.422 build 2176/2180 apply to remove the Plugins sidebar api-key gate");
  assertContains(index, /ee=Ha\(\{hostId:me\}\)[,;]/, "expected 26.422 build 2176/2180 apply to expose the Plugins nav label for api-key users");
  assertNotContains(index, "codexfast-gpt55", "expected 26.422 build 2176/2180 apply to leave the model list handler on the official path");
}

export function assertApplyState26422Build2210(archivePath: string): void {
  const generalSettings = archiveFile(archivePath, "webview/assets/general-settings-CDNVRswg.js");
  assertContains(generalSettings, "{serviceTierSettings:r,setServiceTier:i}=ye();let a;", "expected 26.422 build 2210 apply to remove the guarded Speed settings return");
  assertNotContains(generalSettings, "if(!n)return null;", "expected 26.422 build 2210 apply to expose the Settings Speed control");
  const index = archiveFile(archivePath, "webview/assets/index-D-3V455n.js");
  assertContains(index, "enabled:!0", "expected 26.422 build 2210 apply to enable the Fast slash command");
  assertContains(index, "g=!0", "expected 26.422 build 2210 apply to enable the composer Intelligence Speed menu");
  assertContains(index, "A=!1", "expected 26.422 build 2210 apply to remove the Plugins sidebar api-key gate");
  assertContains(index, /q=Ha\(\{hostId:_e\}\)[,;]/, "expected 26.422 build 2210 apply to expose the Plugins nav label for api-key users");
  assertNotContains(index, "codexfast-gpt55", "expected 26.422 build 2210 apply to leave the model list handler on the official path");
}

export function assertApplyState26429Build2312(archivePath: string): void {
  const generalSettings = archiveFile(archivePath, "webview/assets/general-settings-BBebpJo8.js");
  assertContains(generalSettings, "{serviceTierSettings:r,setServiceTier:i}=Ve();let a;", "expected 26.429 build 2312 apply to remove the guarded Speed settings return");
  assertNotContains(generalSettings, "if(!n)return null;", "expected 26.429 build 2312 apply to expose the Settings Speed control");
  const composer = archiveFile(archivePath, "webview/assets/composer-B5UwBne4.js");
  assertContains(composer, "enabled:!0", "expected 26.429 build 2312 apply to enable the Fast slash command");
  assertContains(composer, "let _=!0,v=zr(ER,n)", "expected 26.429 build 2312 apply to enable the composer Intelligence Speed menu");
  const index = archiveFile(archivePath, "webview/assets/index-Dyn_7Tv1.js");
  assertContains(index, "D=!1", "expected 26.429 build 2312 apply to remove the Plugins sidebar api-key gate");
  assertContains(index, /te=g\(\{hostId:Or\}\)[,;]/, "expected 26.429 build 2312 apply to expose the Plugins nav label for api-key users");
  const skillsPage = archiveFile(archivePath, "webview/assets/skills-page-B9-16YDO.js");
  assertContains(skillsPage, "let m=!1", "expected 26.429 build 2312 apply to render Plugins content for api-key users");
  assertNotContains(skillsPage, "let m=f", "expected 26.429 build 2312 apply to remove the Plugins page auth gate");
  const pluginDetailPage = archiveFile(archivePath, "webview/assets/plugin-detail-page-DwN_bJYs.js");
  assertContains(pluginDetailPage, "if(!1)", "expected 26.429 build 2312 apply to remove the plugin detail api-key redirect");
  assertNotContains(pluginDetailPage, "if(qe(i))", "expected 26.429 build 2312 apply to remove the guarded plugin detail redirect");
  const pluginInstallFlow = archiveFile(archivePath, "webview/assets/use-plugin-install-flow-XEuWX-qZ.js");
  assertContains(pluginInstallFlow, "let E=h.length>0&&w===h.length&&C?`disabled-by-admin`:null,O", "expected 26.429 build 2312 apply to allow plugin install when connector availability is the only blocker");
  assertNotContains(pluginInstallFlow, "let E=h.length>0&&w===h.length?C?`disabled-by-admin`:`connector-unavailable`:null,O", "expected 26.429 build 2312 apply to remove aggregate connector-unavailable install blocking");
  assertContains(pluginInstallFlow, "f=(s?.apps.length??0)>0&&!1,p", "expected 26.429 build 2312 apply to keep plugin install modal information visible for ON_INSTALL app plugins");
  assertNotContains(pluginInstallFlow, "f=(s?.apps.length??0)>0&&s?.summary.authPolicy===`ON_INSTALL`,p", "expected 26.429 build 2312 apply to remove the disclosure-only install modal content gate");
  assertNotContains(index, "codexfast-gpt55", "expected 26.429 build 2312 apply to leave the model list handler on the official path");
}

export function assertApplyState26429Build2345(archivePath: string): void {
  const generalSettings = archiveFile(archivePath, "webview/assets/general-settings-DK9Gn4dx.js");
  assertContains(generalSettings, "{serviceTierSettings:r,setServiceTier:i}=Ve();let a;", "expected 26.429 build 2345 apply to remove the guarded Speed settings return");
  assertNotContains(generalSettings, "if(!n)return null;", "expected 26.429 build 2345 apply to expose the Settings Speed control");
  const composer = archiveFile(archivePath, "webview/assets/composer-CNnjHdHK.js");
  assertContains(composer, "enabled:!0", "expected 26.429 build 2345 apply to enable the Fast slash command");
  assertContains(composer, "let _=!0,v=zr(DR,n)", "expected 26.429 build 2345 apply to enable the composer Intelligence Speed menu");
  const index = archiveFile(archivePath, "webview/assets/index-DJATSIwz.js");
  assertContains(index, "D=!1", "expected 26.429 build 2345 apply to remove the Plugins sidebar api-key gate");
  assertContains(index, /te=g\(\{hostId:Or\}\)[,;]/, "expected 26.429 build 2345 apply to expose the Plugins nav label for api-key users");
  const skillsPage = archiveFile(archivePath, "webview/assets/skills-page-DowG2k1q.js");
  assertContains(skillsPage, "let m=!1", "expected 26.429 build 2345 apply to render Plugins content for api-key users");
  assertNotContains(skillsPage, "let m=f", "expected 26.429 build 2345 apply to remove the Plugins page auth gate");
  const pluginDetailPage = archiveFile(archivePath, "webview/assets/plugin-detail-page-BZVYeV3B.js");
  assertContains(pluginDetailPage, "if(!1)", "expected 26.429 build 2345 apply to remove the plugin detail api-key redirect");
  assertNotContains(pluginDetailPage, "if(qe(i))", "expected 26.429 build 2345 apply to remove the guarded plugin detail redirect");
  const pluginInstallFlow = archiveFile(archivePath, "webview/assets/use-plugin-install-flow-IA7dXDS4.js");
  assertContains(pluginInstallFlow, "let E=h.length>0&&w===h.length&&C?`disabled-by-admin`:null,O", "expected 26.429 build 2345 apply to allow plugin install when connector availability is the only blocker");
  assertNotContains(pluginInstallFlow, "let E=h.length>0&&w===h.length?C?`disabled-by-admin`:`connector-unavailable`:null,O", "expected 26.429 build 2345 apply to remove aggregate connector-unavailable install blocking");
  assertContains(pluginInstallFlow, "f=(s?.apps.length??0)>0&&!1,p", "expected 26.429 build 2345 apply to keep plugin install modal information visible for ON_INSTALL app plugins");
  assertNotContains(pluginInstallFlow, "f=(s?.apps.length??0)>0&&s?.summary.authPolicy===`ON_INSTALL`,p", "expected 26.429 build 2345 apply to remove the disclosure-only install modal content gate");
  assertNotContains(index, "codexfast-gpt55", "expected 26.429 build 2345 apply to leave the model list handler on the official path");
}

export function assertApplyState26506Build2575(archivePath: string): void {
  const generalSettings = archiveFile(archivePath, "webview/assets/general-settings-BNOywoSY.js");
  assertContains(generalSettings, "{serviceTierSettings:r,setServiceTier:i}=de();let o;", "expected 26.506 build 2575 apply to remove the guarded Speed settings return");
  assertNotContains(generalSettings, "if(!n)return null;", "expected 26.506 build 2575 apply to expose the Settings Speed control");
  const composer = archiveFile(archivePath, "webview/assets/composer-D82P7v-B.js");
  assertContains(composer, "enabled:!0", "expected 26.506 build 2575 apply to enable the Fast slash command");
  assertContains(composer, "let _=!0,v=fi(_T,n)", "expected 26.506 build 2575 apply to enable the composer Intelligence Speed menu");
  const appMain = archiveFile(archivePath, "webview/assets/app-main-DOFYRRSd.js");
  assertContains(appMain, "d=!1", "expected 26.506 build 2575 apply to remove the Plugins sidebar api-key gate");
  assertContains(appMain, /p=e&&f([,;])/, "expected 26.506 build 2575 apply to expose the Plugins nav label for api-key users");
  const skillsPage = archiveFile(archivePath, "webview/assets/skills-page-CN4AdIT4.js");
  assertContains(skillsPage, "let m=!1", "expected 26.506 build 2575 apply to render Plugins content for api-key users");
  assertNotContains(skillsPage, "let m=f", "expected 26.506 build 2575 apply to remove the Plugins page auth gate");
  const pluginDetailPage = archiveFile(archivePath, "webview/assets/plugin-detail-page-Dht2dFf-.js");
  assertContains(pluginDetailPage, "if(!1)", "expected 26.506 build 2575 apply to remove the plugin detail api-key redirect");
  assertNotContains(pluginDetailPage, "if(ge(i))", "expected 26.506 build 2575 apply to remove the guarded plugin detail redirect");
  const pluginInstallFlow = archiveFile(archivePath, "webview/assets/plugins-availability-DMayGLTU.js");
  assertContains(pluginInstallFlow, "let E=h.length>0&&w===h.length&&C?`disabled-by-admin`:null,O", "expected 26.506 build 2575 apply to allow plugin install when connector availability is the only blocker");
  assertNotContains(pluginInstallFlow, "let E=h.length>0&&w===h.length?C?`disabled-by-admin`:`connector-unavailable`:null,O", "expected 26.506 build 2575 apply to remove aggregate connector-unavailable install blocking");
  assertContains(pluginInstallFlow, "p=(c?.apps.length??0)>0&&!1,m", "expected 26.506 build 2575 apply to keep plugin install modal information visible for ON_INSTALL app plugins");
  assertNotContains(pluginInstallFlow, "p=(c?.apps.length??0)>0&&c?.summary.authPolicy===`ON_INSTALL`,m", "expected 26.506 build 2575 apply to remove the disclosure-only install modal content gate");
  assertNotContains(appMain, "codexfast-gpt55", "expected 26.506 build 2575 apply to leave the model list handler on the official path");
}

export function assertApplyState26506Build2620(archivePath: string): void {
  const generalSettings = archiveFile(archivePath, "webview/assets/general-settings-S-ejdEdp.js");
  assertContains(generalSettings, "{serviceTierSettings:r,setServiceTier:i}=de();let o;", "expected 26.506 build 2620 apply to remove the guarded Speed settings return");
  assertNotContains(generalSettings, "if(!n)return null;", "expected 26.506 build 2620 apply to expose the Settings Speed control");
  const composer = archiveFile(archivePath, "webview/assets/composer-DawxvKsB.js");
  assertContains(composer, "enabled:!0", "expected 26.506 build 2620 apply to enable the Fast slash command");
  assertContains(composer, "let _=!0,v=fi(_T,n)", "expected 26.506 build 2620 apply to enable the composer Intelligence Speed menu");
  const appMain = archiveFile(archivePath, "webview/assets/app-main-Bucm979x.js");
  assertContains(appMain, "d=!1", "expected 26.506 build 2620 apply to remove the Plugins sidebar api-key gate");
  assertContains(appMain, /p=e&&f([,;])/, "expected 26.506 build 2620 apply to expose the Plugins nav label for api-key users");
  const skillsPage = archiveFile(archivePath, "webview/assets/skills-page-CrAHPBnF.js");
  assertContains(skillsPage, "let p=!1", "expected 26.506 build 2620 apply to render Plugins content for api-key users");
  assertNotContains(skillsPage, "let p=d", "expected 26.506 build 2620 apply to remove the Plugins page auth gate");
  const pluginDetailPage = archiveFile(archivePath, "webview/assets/plugin-detail-page-8pMyEW6A.js");
  assertContains(pluginDetailPage, "if(!1)", "expected 26.506 build 2620 apply to remove the plugin detail api-key redirect");
  assertNotContains(pluginDetailPage, "if(ge(i))", "expected 26.506 build 2620 apply to remove the guarded plugin detail redirect");
  const pluginInstallFlow = archiveFile(archivePath, "webview/assets/plugins-availability-DW4iBzVW.js");
  assertContains(pluginInstallFlow, "let ee=h.length>0&&w===h.length&&C?`disabled-by-admin`:null,D", "expected 26.506 build 2620 apply to allow plugin install when connector availability is the only blocker");
  assertNotContains(pluginInstallFlow, "let ee=h.length>0&&w===h.length?C?`disabled-by-admin`:`connector-unavailable`:null,D", "expected 26.506 build 2620 apply to remove aggregate connector-unavailable install blocking");
  assertContains(pluginInstallFlow, "p=(c?.apps.length??0)>0&&!1,m", "expected 26.506 build 2620 apply to keep plugin install modal information visible for ON_INSTALL app plugins");
  assertNotContains(pluginInstallFlow, "p=(c?.apps.length??0)>0&&c?.summary.authPolicy===`ON_INSTALL`,m", "expected 26.506 build 2620 apply to remove the disclosure-only install modal content gate");
  assertNotContains(appMain, "codexfast-gpt55", "expected 26.506 build 2620 apply to leave the model list handler on the official path");
}

export function assertGuardedState26422(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-CnVD4YyB.js"), "if(!n)return null;", `expected ${context} to preserve the 26.422 guarded Speed settings state`);
  const index = archiveFile(archivePath, "webview/assets/index-gATb9Tvd.js");
  assertContains(index, "enabled:n", `expected ${context} to preserve the 26.422 guarded Fast slash command state`);
  assertContains(index, "g=_f()", `expected ${context} to preserve the 26.422 guarded composer Intelligence Speed menu state`);
  assertContains(index, "A=O&&k", `expected ${context} to preserve the 26.422 guarded Plugins sidebar state`);
  assertContains(index, "ee=Ha({hostId:me})&&!k", `expected ${context} to preserve the 26.422 guarded Plugins nav label state`);
  assertContains(index, '"list-models-for-host":i9((e,{hostId:t,...n})=>e.sendRequest(`model/list`,n))', `expected ${context} to preserve the guarded model list handler`);
  assertNotContains(index, "codexfast-gpt55", `expected ${context} to remove the GPT-5.5 model list injection`);
  const fontSettings = archiveFile(archivePath, "webview/assets/font-settings-C9TXXljS.js");
  assertContains(fontSettings, "r??=n.models.find(e=>e.model===d.defaultModel)??null,{modelsByType:n,defaultModel:r}", `expected ${context} to preserve the guarded model query selector`);
  assertNotContains(fontSettings, "codexfast-gpt55-select", `expected ${context} to remove the GPT-5.5 model query selector injection`);
}

export function assertGuardedState26422Build2176Or2180(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-C7RhZXaE.js"), "if(!n)return null;", `expected ${context} to preserve the 26.422 build 2176/2180 guarded Speed settings state`);
  const index = archiveFile(archivePath, "webview/assets/index-BSTEB47c.js");
  assertContains(index, "enabled:n", `expected ${context} to preserve the 26.422 build 2176/2180 guarded Fast slash command state`);
  assertContains(index, "g=_f()", `expected ${context} to preserve the 26.422 build 2176/2180 guarded composer Intelligence Speed menu state`);
  assertContains(index, "A=O&&k", `expected ${context} to preserve the 26.422 build 2176/2180 guarded Plugins sidebar state`);
  assertContains(index, "ee=Ha({hostId:me})&&!k", `expected ${context} to preserve the 26.422 build 2176/2180 guarded Plugins nav label state`);
  assertNotContains(index, "codexfast-gpt55", `expected ${context} not to add GPT-5.5 model list injection`);
}

export function assertGuardedState26422Build2210(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-CDNVRswg.js"), "if(!n)return null;", `expected ${context} to preserve the 26.422 build 2210 guarded Speed settings state`);
  const index = archiveFile(archivePath, "webview/assets/index-D-3V455n.js");
  assertContains(index, "enabled:n", `expected ${context} to preserve the 26.422 build 2210 guarded Fast slash command state`);
  assertContains(index, "g=gf()", `expected ${context} to preserve the 26.422 build 2210 guarded composer Intelligence Speed menu state`);
  assertContains(index, "A=O&&k", `expected ${context} to preserve the 26.422 build 2210 guarded Plugins sidebar state`);
  assertContains(index, "q=Ha({hostId:_e})&&!k", `expected ${context} to preserve the 26.422 build 2210 guarded Plugins nav label state`);
  assertNotContains(index, "codexfast-gpt55", `expected ${context} not to add GPT-5.5 model list injection`);
}

export function assertGuardedState26429Build2312(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-BBebpJo8.js"), "if(!n)return null;", `expected ${context} to preserve the 26.429 build 2312 guarded Speed settings state`);
  const composer = archiveFile(archivePath, "webview/assets/composer-B5UwBne4.js");
  assertContains(composer, "enabled:a", `expected ${context} to preserve the 26.429 build 2312 guarded Fast slash command state`);
  assertContains(composer, "let _=qs(g),v=zr(ER,n)", `expected ${context} to preserve the 26.429 build 2312 guarded composer Intelligence Speed menu state`);
  const index = archiveFile(archivePath, "webview/assets/index-Dyn_7Tv1.js");
  assertContains(index, "D=T&&E", `expected ${context} to preserve the 26.429 build 2312 guarded Plugins sidebar state`);
  assertContains(index, "te=g({hostId:Or})&&!E", `expected ${context} to preserve the 26.429 build 2312 guarded Plugins nav label state`);
  const skillsPage = archiveFile(archivePath, "webview/assets/skills-page-B9-16YDO.js");
  assertContains(skillsPage, "let m=f", `expected ${context} to preserve the 26.429 guarded Plugins page auth gate`);
  assertNotContains(skillsPage, "let m=!1", `expected ${context} to restore the 26.429 Plugins page auth gate`);
  const pluginDetailPage = archiveFile(archivePath, "webview/assets/plugin-detail-page-DwN_bJYs.js");
  assertContains(pluginDetailPage, "if(qe(i))", `expected ${context} to preserve the 26.429 guarded plugin detail redirect`);
  assertNotContains(pluginDetailPage, "if(!1)", `expected ${context} to restore the 26.429 plugin detail redirect`);
  const pluginInstallFlow = archiveFile(archivePath, "webview/assets/use-plugin-install-flow-XEuWX-qZ.js");
  assertContains(pluginInstallFlow, "let E=h.length>0&&w===h.length?C?`disabled-by-admin`:`connector-unavailable`:null,O", `expected ${context} to preserve the 26.429 aggregate connector-unavailable install block`);
  assertNotContains(pluginInstallFlow, "let E=h.length>0&&w===h.length&&C?`disabled-by-admin`:null,O", `expected ${context} to restore the 26.429 plugin install availability gate`);
  assertContains(pluginInstallFlow, "f=(s?.apps.length??0)>0&&s?.summary.authPolicy===`ON_INSTALL`,p", `expected ${context} to preserve the 26.429 disclosure-only install modal content gate`);
  assertNotContains(pluginInstallFlow, "f=(s?.apps.length??0)>0&&!1,p", `expected ${context} to restore the 26.429 install modal content gate`);
  assertNotContains(index, "codexfast-gpt55", `expected ${context} not to add GPT-5.5 model list injection`);
}

export function assertGuardedState26429Build2345(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-DK9Gn4dx.js"), "if(!n)return null;", `expected ${context} to preserve the 26.429 build 2345 guarded Speed settings state`);
  const composer = archiveFile(archivePath, "webview/assets/composer-CNnjHdHK.js");
  assertContains(composer, "enabled:a", `expected ${context} to preserve the 26.429 build 2345 guarded Fast slash command state`);
  assertContains(composer, "let _=qs(g),v=zr(DR,n)", `expected ${context} to preserve the 26.429 build 2345 guarded composer Intelligence Speed menu state`);
  const index = archiveFile(archivePath, "webview/assets/index-DJATSIwz.js");
  assertContains(index, "D=T&&E", `expected ${context} to preserve the 26.429 build 2345 guarded Plugins sidebar state`);
  assertContains(index, "te=g({hostId:Or})&&!E", `expected ${context} to preserve the 26.429 build 2345 guarded Plugins nav label state`);
  const skillsPage = archiveFile(archivePath, "webview/assets/skills-page-DowG2k1q.js");
  assertContains(skillsPage, "let m=f", `expected ${context} to preserve the 26.429 guarded Plugins page auth gate`);
  assertNotContains(skillsPage, "let m=!1", `expected ${context} to restore the 26.429 Plugins page auth gate`);
  const pluginDetailPage = archiveFile(archivePath, "webview/assets/plugin-detail-page-BZVYeV3B.js");
  assertContains(pluginDetailPage, "if(qe(i))", `expected ${context} to preserve the 26.429 guarded plugin detail redirect`);
  assertNotContains(pluginDetailPage, "if(!1)", `expected ${context} to restore the 26.429 plugin detail redirect`);
  const pluginInstallFlow = archiveFile(archivePath, "webview/assets/use-plugin-install-flow-IA7dXDS4.js");
  assertContains(pluginInstallFlow, "let E=h.length>0&&w===h.length?C?`disabled-by-admin`:`connector-unavailable`:null,O", `expected ${context} to preserve the 26.429 aggregate connector-unavailable install block`);
  assertNotContains(pluginInstallFlow, "let E=h.length>0&&w===h.length&&C?`disabled-by-admin`:null,O", `expected ${context} to restore the 26.429 plugin install availability gate`);
  assertContains(pluginInstallFlow, "f=(s?.apps.length??0)>0&&s?.summary.authPolicy===`ON_INSTALL`,p", `expected ${context} to preserve the 26.429 disclosure-only install modal content gate`);
  assertNotContains(pluginInstallFlow, "f=(s?.apps.length??0)>0&&!1,p", `expected ${context} to restore the 26.429 install modal content gate`);
  assertNotContains(index, "codexfast-gpt55", `expected ${context} not to add GPT-5.5 model list injection`);
}

export function assertGuardedState26506Build2575(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-BNOywoSY.js"), "if(!n)return null;", `expected ${context} to preserve the 26.506 build 2575 guarded Speed settings state`);
  const composer = archiveFile(archivePath, "webview/assets/composer-D82P7v-B.js");
  assertContains(composer, "enabled:a", `expected ${context} to preserve the 26.506 build 2575 guarded Fast slash command state`);
  assertContains(composer, "let _=va(g),v=fi(_T,n)", `expected ${context} to preserve the 26.506 build 2575 guarded composer Intelligence Speed menu state`);
  const appMain = archiveFile(archivePath, "webview/assets/app-main-DOFYRRSd.js");
  assertContains(appMain, "d=e&&l&&u", `expected ${context} to preserve the 26.506 build 2575 guarded Plugins sidebar state`);
  assertContains(appMain, "p=e&&f&&!u", `expected ${context} to preserve the 26.506 build 2575 guarded Plugins nav label state`);
  const skillsPage = archiveFile(archivePath, "webview/assets/skills-page-CN4AdIT4.js");
  assertContains(skillsPage, "let m=f", `expected ${context} to preserve the 26.506 guarded Plugins page auth gate`);
  assertNotContains(skillsPage, "let m=!1", `expected ${context} to restore the 26.506 Plugins page auth gate`);
  const pluginDetailPage = archiveFile(archivePath, "webview/assets/plugin-detail-page-Dht2dFf-.js");
  assertContains(pluginDetailPage, "if(ge(i))", `expected ${context} to preserve the 26.506 guarded plugin detail redirect`);
  assertNotContains(pluginDetailPage, "if(!1)", `expected ${context} to restore the 26.506 plugin detail redirect`);
  const pluginInstallFlow = archiveFile(archivePath, "webview/assets/plugins-availability-DMayGLTU.js");
  assertContains(pluginInstallFlow, "let E=h.length>0&&w===h.length?C?`disabled-by-admin`:`connector-unavailable`:null,O", `expected ${context} to preserve the 26.506 aggregate connector-unavailable install block`);
  assertNotContains(pluginInstallFlow, "let E=h.length>0&&w===h.length&&C?`disabled-by-admin`:null,O", `expected ${context} to restore the 26.506 plugin install availability gate`);
  assertContains(pluginInstallFlow, "p=(c?.apps.length??0)>0&&c?.summary.authPolicy===`ON_INSTALL`,m", `expected ${context} to preserve the 26.506 disclosure-only install modal content gate`);
  assertNotContains(pluginInstallFlow, "p=(c?.apps.length??0)>0&&!1,m", `expected ${context} to restore the 26.506 install modal content gate`);
  assertNotContains(appMain, "codexfast-gpt55", `expected ${context} not to add GPT-5.5 model list injection`);
}

export function assertGuardedState26506Build2620(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-S-ejdEdp.js"), "if(!n)return null;", `expected ${context} to preserve the 26.506 build 2620 guarded Speed settings state`);
  const composer = archiveFile(archivePath, "webview/assets/composer-DawxvKsB.js");
  assertContains(composer, "enabled:a", `expected ${context} to preserve the 26.506 build 2620 guarded Fast slash command state`);
  assertContains(composer, "let _=va(g),v=fi(_T,n)", `expected ${context} to preserve the 26.506 build 2620 guarded composer Intelligence Speed menu state`);
  const appMain = archiveFile(archivePath, "webview/assets/app-main-Bucm979x.js");
  assertContains(appMain, "d=e&&l&&u", `expected ${context} to preserve the 26.506 build 2620 guarded Plugins sidebar state`);
  assertContains(appMain, "p=e&&f&&!u", `expected ${context} to preserve the 26.506 build 2620 guarded Plugins nav label state`);
  const skillsPage = archiveFile(archivePath, "webview/assets/skills-page-CrAHPBnF.js");
  assertContains(skillsPage, "let p=d", `expected ${context} to preserve the 26.506 guarded Plugins page auth gate`);
  assertNotContains(skillsPage, "let p=!1", `expected ${context} to restore the 26.506 Plugins page auth gate`);
  const pluginDetailPage = archiveFile(archivePath, "webview/assets/plugin-detail-page-8pMyEW6A.js");
  assertContains(pluginDetailPage, "if(ge(i))", `expected ${context} to preserve the 26.506 guarded plugin detail redirect`);
  assertNotContains(pluginDetailPage, "if(!1)", `expected ${context} to restore the 26.506 plugin detail redirect`);
  const pluginInstallFlow = archiveFile(archivePath, "webview/assets/plugins-availability-DW4iBzVW.js");
  assertContains(pluginInstallFlow, "let ee=h.length>0&&w===h.length?C?`disabled-by-admin`:`connector-unavailable`:null,D", `expected ${context} to preserve the 26.506 aggregate connector-unavailable install block`);
  assertNotContains(pluginInstallFlow, "let ee=h.length>0&&w===h.length&&C?`disabled-by-admin`:null,D", `expected ${context} to restore the 26.506 plugin install availability gate`);
  assertContains(pluginInstallFlow, "p=(c?.apps.length??0)>0&&c?.summary.authPolicy===`ON_INSTALL`,m", `expected ${context} to preserve the 26.506 disclosure-only install modal content gate`);
  assertNotContains(pluginInstallFlow, "p=(c?.apps.length??0)>0&&!1,m", `expected ${context} to restore the 26.506 install modal content gate`);
  assertNotContains(appMain, "codexfast-gpt55", `expected ${context} not to add GPT-5.5 model list injection`);
}
