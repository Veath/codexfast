const SPEED_LABEL_NEEDLE = "settings.agent.speed.label";
const SPEED_SLASH_COMMAND_NEEDLE = "composer.speedSlashCommand.title";
const ADD_CONTEXT_SPEED_NEEDLE = "composer.addContext.speed.option.fast.description";
const INTELLIGENCE_SPEED_NEEDLE = "composer.intelligenceDropdown.speed.title";
const PLUGINS_SIDEBAR_NEEDLE = "sidebarElectron.pluginsDisabledTooltip";
const PLUGINS_PAGE_CONTENT_NEEDLE = "skills.pluginsAuthBlockedToast.title";
const PLUGIN_DETAIL_AUTH_NEEDLE = "pluginDeepLinkAuthBlocked";
const PLUGIN_INSTALL_AVAILABILITY_NEEDLE = "plugins.install.connectorUnavailable";
const PLUGIN_INSTALL_MODAL_CONTENT_NEEDLE = "plugins.installModal.about";
const COMPOSER_PLUGIN_MENTIONS_NEEDLE = "composer.atMentionList.pluginsLoading";
const MODEL_LIST_NEEDLE = "\"list-models-for-host\"";
const MODEL_QUERY_NEEDLE = "modelsByType";
export const GPT_55_OFFICIAL_MODEL_LIST_MIN_VERSION = "26.422.30944";
const GPT_55_MODEL_ENTRY =
  "{id:`gpt-5.5`,model:`gpt-5.5`,upgrade:null,upgradeInfo:null,availabilityNux:null,displayName:`GPT-5.5`,description:`Frontier model for complex coding, research, and real-world work.`,hidden:!1,supportedReasoningEfforts:[{reasoningEffort:`low`,description:`Fast responses with lighter reasoning`},{reasoningEffort:`medium`,description:`Balances speed and reasoning depth for everyday tasks`},{reasoningEffort:`high`,description:`Greater reasoning depth for complex problems`},{reasoningEffort:`xhigh`,description:`Extra high reasoning depth for complex problems`}],defaultReasoningEffort:`medium`,inputModalities:[`text`],supportsPersonality:!0,additionalSpeedTiers:[`fast`],isDefault:!1}";
const GUARDED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=((?:_e|ae|P|N|de|ie|se)\(\),)(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(?:Ce|se|be|xe|ye|Ve|de|fe)\(\);)if\(!\1\)return null;/;
const PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=!0,(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(Ce|se|be|xe|ye|Ve|de|fe)\(\);)let /;
const NORMALIZED_PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=((?:_e|ae|P|N|de|ie|se)\(\),)(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(?:Ce|se|be|xe|ye|Ve|de|fe)\(\);)let /;
const SLASH_COMMAND_GUARDED_SIGNATURE =
  /(id:`speed`,title:[^,]+,description:[^,]+,requiresEmptyComposer:!1,enabled:)([A-Za-z_$][\w$]*)(,Icon:[^,]+,onSelect:[^,]+,dependencies:[A-Za-z_$][\w$]*})/;
const SLASH_COMMAND_PATCHED_SIGNATURE =
  /(id:`speed`,title:[^,]+,description:[^,]+,requiresEmptyComposer:!1,enabled:)!0(,Icon:[^,]+,onSelect:[^,]+,dependencies:[A-Za-z_$][\w$]*})/;
const ADD_CONTEXT_SPEED_GUARDED_SIGNATURE_OLD =
  /([A-Za-z_$][\w$]*)=Cr\(\),(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ir\([^)]+\)[;,])/;
const ADD_CONTEXT_SPEED_PATCHED_SIGNATURE_OLD =
  /([A-Za-z_$][\w$]*)=!0,(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Ir\([^)]+\)[;,])/;
const ADD_CONTEXT_SPEED_GUARDED_SIGNATURE_NEW =
  /([A-Za-z_$][\w$]*)=cr\(\),(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=jr\([^)]+\)[;,])/;
const ADD_CONTEXT_SPEED_PATCHED_SIGNATURE_NEW =
  /([A-Za-z_$][\w$]*)=!0,(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=jr\([^)]+\)[;,])/;
const INTELLIGENCE_SPEED_GUARDED_SIGNATURE =
  /(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(?:Jp|Zp)\([^)]*\),)([A-Za-z_$][\w$]*)=_f\(\),/;
const INTELLIGENCE_SPEED_PATCHED_SIGNATURE =
  /(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(?:Jp|Zp)\([^)]*\),)([A-Za-z_$][\w$]*)=!0,/;
const INTELLIGENCE_SPEED_GUARDED_SIGNATURE_GF =
  /(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Yp\([^)]*\),)([A-Za-z_$][\w$]*)=gf\(\),/;
const INTELLIGENCE_SPEED_PATCHED_SIGNATURE_GF =
  /(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=Yp\([^)]*\),)([A-Za-z_$][\w$]*)=!0,/;
const INTELLIGENCE_SPEED_GUARDED_SIGNATURE_QS =
  /(let )([A-Za-z_$][\w$]*)=(qs|va)\(([^)]+)\),([A-Za-z_$][\w$]*=(?:zr|fi)\([A-Za-z_$][\w$]*,n\),)/;
const INTELLIGENCE_SPEED_PATCHED_SIGNATURE_QS =
  /(let )([A-Za-z_$][\w$]*)=!0,([A-Za-z_$][\w$]*=(?:zr|fi)\([A-Za-z_$][\w$]*,n\),)/;
const INTELLIGENCE_SPEED_GUARDED_SIGNATURE_QA =
  /(let )([A-Za-z_$][\w$]*);([^;]{0,260}\?\(\2=)([A-Za-z_$][\w$]*)(\?\(0,[A-Za-z_$][\w$]*\.jsx\)\(KR,\{selectedServiceTier:[^}]+,isLoading:[^}]+,setServiceTier:[^}]+,onSelectComplete:[^}]+\}\):null,)/;
const INTELLIGENCE_SPEED_PATCHED_SIGNATURE_QA =
  /(let )([A-Za-z_$][\w$]*);([^;]{0,260}\?\(\2=)!0(\?\(0,[A-Za-z_$][\w$]*\.jsx\)\(KR,\{selectedServiceTier:[^}]+,isLoading:[^}]+,setServiceTier:[^}]+,onSelectComplete:[^}]+\}\):null,)/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_OLD =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,[^]*?cf\(`533078438`\),)([A-Za-z_$][\w$]*)=\2===`apikey`,/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_OLD =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,[^]*?cf\(`533078438`\),)([A-Za-z_$][\w$]*)=!1,/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_NEW =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,[^]*?)([A-Za-z_$][\w$]*)=Fs\(\),([A-Za-z_$][\w$]*)=hf\(`533078438`\),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=\4&&\5,([A-Za-z_$][\w$]*)=\3&&!?\5([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_NEW =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,[^]*?)([A-Za-z_$][\w$]*)=Fs\(\),([A-Za-z_$][\w$]*)=hf\(`533078438`\),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=!1,([A-Za-z_$][\w$]*)=\3([,;])/;
const PLUGINS_SIDEBAR_LEGACY_PATCHED_SIGNATURE_NEW =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,[^]*?)([A-Za-z_$][\w$]*)=Fs\(\),([A-Za-z_$][\w$]*)=hf\(`533078438`\),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=!1,([A-Za-z_$][\w$]*)=\3&&!?\5([,;])/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26422 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=((?:\$f|Qf)\(`533078438`\)),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=\3&&\5,([^]*?)([A-Za-z_$][\w$]*)=(Ha\(\{hostId:[^}]+\}\))&&!\5([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26422 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=((?:\$f|Qf)\(`533078438`\)),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=!1,([^]*?)([A-Za-z_$][\w$]*)=(Ha\(\{hostId:[^}]+\}\))([,;])/;
const PLUGINS_SIDEBAR_LEGACY_PATCHED_SIGNATURE_26422 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=((?:\$f|Qf)\(`533078438`\)),([A-Za-z_$][\w$]*)=\2===`apikey`,([A-Za-z_$][\w$]*)=!1,([^]*?)([A-Za-z_$][\w$]*)=(Ha\(\{hostId:[^}]+\}\))&&!\5([,;])/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26429 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=ms\(`533078438`\),([A-Za-z_$][\w$]*)=ed\(\2\),([A-Za-z_$][\w$]*)=\3&&\4,([^]*?)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*\(\{hostId:[^}]+\}\))&&!\4([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26429 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=ms\(`533078438`\),([A-Za-z_$][\w$]*)=ed\(\2\),([A-Za-z_$][\w$]*)=!1,([^]*?)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*\(\{hostId:[^}]+\}\))([,;])/;
const PLUGINS_SIDEBAR_LEGACY_PATCHED_SIGNATURE_26429 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=ms\(`533078438`\),([A-Za-z_$][\w$]*)=ed\(\2\),([A-Za-z_$][\w$]*)=!1,([^]*?)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*\(\{hostId:[^}]+\}\))&&!\4([,;])/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26506 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=rs\(`533078438`\),([A-Za-z_$][\w$]*)=Xc\(\2\),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\3&&\4,([^]*?)([A-Za-z_$][\w$]*)=\6&&([A-Za-z_$][\w$]*)&&!\4([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26506 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=rs\(`533078438`\),([A-Za-z_$][\w$]*)=Xc\(\2\),([A-Za-z_$][\w$]*)=!1,([^]*?)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&([A-Za-z_$][\w$]*)([,;])/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26506_QO =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=Qo\(`533078438`\),([A-Za-z_$][\w$]*)=Xc\(\2\),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\3&&\4,([^]*?)([A-Za-z_$][\w$]*)=\6&&([A-Za-z_$][\w$]*)&&!\4([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26506_QO =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=Qo\(`533078438`\),([A-Za-z_$][\w$]*)=Xc\(\2\),([A-Za-z_$][\w$]*)=!1,([^]*?)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&([A-Za-z_$][\w$]*)([,;])/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26513 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=Is\(`533078438`\),([A-Za-z_$][\w$]*)=Ml\(\2\),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\3&&\4,([A-Za-z_$][\w$]*)=(hl\(\{hostId:[^}]+\}\)),([A-Za-z_$][\w$]*)=\6&&\7&&!\4([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26513 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=Is\(`533078438`\),([A-Za-z_$][\w$]*)=Ml\(\2\),([A-Za-z_$][\w$]*)=!1,([A-Za-z_$][\w$]*)=(hl\(\{hostId:[^}]+\}\)),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\6([,;])/;
const PLUGINS_PAGE_CONTENT_GUARDED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*);(if\(e\[\d+\]!==[A-Za-z_$][\w$]*\|\|e\[\d+\]!==\2\|\|)/;
const PLUGINS_PAGE_CONTENT_PATCHED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=!1,([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*);(if\(e\[\d+\]!==[A-Za-z_$][\w$]*\|\|e\[\d+\]!==\2\|\|)/;
const PLUGIN_DETAIL_AUTH_GUARDED_SIGNATURE =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=([A-Za-z_$][\w$]*)\(\);)if\(([A-Za-z_$][\w$]*)\(\2\)\)\{/;
const PLUGIN_DETAIL_AUTH_PATCHED_SIGNATURE =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=([A-Za-z_$][\w$]*)\(\);)if\(!1\)\{/;
const PLUGIN_INSTALL_AVAILABILITY_GUARDED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\.length>0&&([A-Za-z_$][\w$]*)===\3\.length\?([A-Za-z_$][\w$]*)\?`disabled-by-admin`:`connector-unavailable`:null,([A-Za-z_$][\w$]*);/;
const PLUGIN_INSTALL_AVAILABILITY_PATCHED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\.length>0&&([A-Za-z_$][\w$]*)===\3\.length&&([A-Za-z_$][\w$]*)\?`disabled-by-admin`:null,([A-Za-z_$][\w$]*);/;
const PLUGIN_INSTALL_MODAL_CONTENT_GUARDED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)=\(([A-Za-z_$][\w$]*)\?\.apps\.length\?\?0\)>0&&\5\?\.summary\.authPolicy===`ON_INSTALL`,([A-Za-z_$][\w$]*);/;
const PLUGIN_INSTALL_MODAL_CONTENT_PATCHED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)=\(([A-Za-z_$][\w$]*)\?\.apps\.length\?\?0\)>0&&!1,([A-Za-z_$][\w$]*);/;
const COMPOSER_PLUGIN_MENTIONS_GUARDED_SIGNATURE =
  /(additionalMarketplaceKinds:)\[`shared-with-me`\]/;
const COMPOSER_PLUGIN_MENTIONS_PATCHED_SIGNATURE =
  /(additionalMarketplaceKinds:)\[\]/;
const MODEL_LIST_GUARDED_SIGNATURE =
  /("list-models-for-host":i9\()\(([A-Za-z_$][\w$]*),\{hostId:([A-Za-z_$][\w$]*),\.\.\.([A-Za-z_$][\w$]*)\}\)=>\2\.sendRequest\(`model\/list`,\4\)(\))/;
const MODEL_LIST_PATCHED_SIGNATURE =
  /("list-models-for-host":i9\()async\(([A-Za-z_$][\w$]*),\{hostId:([A-Za-z_$][\w$]*),\.\.\.([A-Za-z_$][\w$]*)\}\)=>\/\*codexfast-gpt55\*\/\{let ([A-Za-z_$][\w$]*)=await \2\.sendRequest\(`model\/list`,\4\);return Array\.isArray\(\5\.data\)&&!\5\.data\.some\(e=>e\.model===`gpt-5\.5`\)\?\{\.\.\.\5,data:\[\.\.\.\5\.data,\{id:`gpt-5\.5`[^]*?isDefault:!1\}\]\}:\5\}(\))/;
const MODEL_QUERY_GUARDED_SIGNATURE =
  /(\}\}\),)([A-Za-z_$][\w$]*)\?\?=([A-Za-z_$][\w$]*)\.models\.find\(e=>e\.model===([A-Za-z_$][\w$]*)\.defaultModel\)\?\?null,\{modelsByType:\3,defaultModel:\2\}/;
const MODEL_QUERY_PATCHED_SIGNATURE =
  /(\}\}\),)\/\*codexfast-gpt55-select\*\/([A-Za-z_$][\w$]*)\.models\.some\(e=>e\.model===`gpt-5\.5`\)\|\|\2\.models\.push\(\{id:`gpt-5\.5`[^]*?isDefault:!1\}\),([A-Za-z_$][\w$]*)\?\?=\2\.models\.find\(e=>e\.model===([A-Za-z_$][\w$]*)\.defaultModel\)\?\?null,\{modelsByType:\2,defaultModel:\3\}/;

export type ReplacementCallback = (match: string, ...captures: string[]) => string;
export type Replacement = string | ReplacementCallback;

export type TargetSpec = {
  id: string;
  label: string;
  needle: string;
  guardedSignature: RegExp;
  patchedSignature: RegExp;
  legacyPatchedSignature: RegExp | null;
  applyReplacement: Replacement;
  normalizeReplacement?: Replacement;
  restoreReplacement?: Replacement;
};

export type TargetState = {
  guarded: boolean;
  patched: boolean;
  legacyPatched: boolean;
};

export type TargetMatch = TargetState & {
  spec: TargetSpec;
};

export type FileTarget = {
  filePath: string;
  backupPath: string;
  backupPaths: string[];
  content: string;
  matches: TargetMatch[];
};

function resolveSpeedAvailabilityCall(serviceTierFactory: string): string {
  const availabilityCalls: Record<string, string> = {
    Ce: "_e",
    se: "ae",
    be: "P",
    xe: "P",
    ye: "N",
    Ve: "de",
    de: "ie",
    fe: "se",
  };
  const availabilityCall = availabilityCalls[serviceTierFactory];
  if (!availabilityCall) {
    throw new Error(`Unsupported Speed setting service-tier factory: ${serviceTierFactory}.`);
  }
  return availabilityCall;
}

function normalizeLegacySpeedSetting(
  _match: string,
  enabledVariable: string,
  serviceTierSetup: string,
  serviceTierFactory: string,
): string {
  return `${enabledVariable}=${resolveSpeedAvailabilityCall(serviceTierFactory)}(),${serviceTierSetup}let `;
}

function restoreSpeedSetting(
  _match: string,
  enabledVariable: string,
  availabilityOrServiceTierSetup: string,
  serviceTierSetupOrFactory: string,
): string {
  if (availabilityOrServiceTierSetup.endsWith(",")) {
    return `${enabledVariable}=${availabilityOrServiceTierSetup}${serviceTierSetupOrFactory}if(!${enabledVariable})return null;let `;
  }
  return `${enabledVariable}=${resolveSpeedAvailabilityCall(
    serviceTierSetupOrFactory,
  )}(),${availabilityOrServiceTierSetup}if(!${enabledVariable})return null;let `;
}

function restorePluginsSidebar26506Qo(
  _match: string,
  prefix: string,
  authMethodVariable: string,
  pluginsExperimentVariable: string,
  authGateVariable: string,
  disabledPluginsVariable: string,
  between: string,
  pluginsLabelVariable: string,
  desktopNavVariable: string,
  pluginsEnabledVariable: string,
  delimiter: string,
): string {
  return `${prefix}${pluginsExperimentVariable}=Qo(\`533078438\`),${authGateVariable}=Xc(${authMethodVariable}),${disabledPluginsVariable}=${desktopNavVariable}&&${pluginsExperimentVariable}&&${authGateVariable},${between}${pluginsLabelVariable}=${desktopNavVariable}&&${pluginsEnabledVariable}&&!${authGateVariable}${delimiter}`;
}

export const TARGET_SPECS: TargetSpec[] = [
  {
    id: "speed-setting",
    label: "Speed setting",
    needle: SPEED_LABEL_NEEDLE,
    guardedSignature: GUARDED_SIGNATURE,
    patchedSignature: NORMALIZED_PATCHED_SIGNATURE,
    legacyPatchedSignature: PATCHED_SIGNATURE,
    applyReplacement: "$1=$2$3",
    normalizeReplacement: normalizeLegacySpeedSetting,
    restoreReplacement: restoreSpeedSetting,
  },
  {
    id: "add-context-speed-menu-old",
    label: "Add-context Speed menu",
    needle: ADD_CONTEXT_SPEED_NEEDLE,
    guardedSignature: ADD_CONTEXT_SPEED_GUARDED_SIGNATURE_OLD,
    patchedSignature: ADD_CONTEXT_SPEED_PATCHED_SIGNATURE_OLD,
    legacyPatchedSignature: null,
    applyReplacement: "$1=!0,$2",
    restoreReplacement: "$1=Cr(),$2",
  },
  {
    id: "add-context-speed-menu-new",
    label: "Add-context Speed menu",
    needle: ADD_CONTEXT_SPEED_NEEDLE,
    guardedSignature: ADD_CONTEXT_SPEED_GUARDED_SIGNATURE_NEW,
    patchedSignature: ADD_CONTEXT_SPEED_PATCHED_SIGNATURE_NEW,
    legacyPatchedSignature: null,
    applyReplacement: "$1=!0,$2",
    restoreReplacement: "$1=cr(),$2",
  },
  {
    id: "intelligence-speed-menu",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1$2=!0,",
    restoreReplacement: "$1$2=_f(),",
  },
  {
    id: "intelligence-speed-menu-gf",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE_GF,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE_GF,
    legacyPatchedSignature: null,
    applyReplacement: "$1$2=!0,",
    restoreReplacement: "$1$2=gf(),",
  },
  {
    id: "intelligence-speed-menu-qs",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE_QS,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE_QS,
    legacyPatchedSignature: null,
    applyReplacement: "$1$2=!0,$5",
    restoreReplacement: "$1$2=$3($4),$5",
  },
  {
    id: "intelligence-speed-menu-qa",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE_QA,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE_QA,
    legacyPatchedSignature: null,
    applyReplacement: "$1$2;$3!0$5",
    restoreReplacement: "$1$2;$3$4$5",
  },
  {
    id: "fast-slash-command",
    label: "Fast slash command",
    needle: SPEED_SLASH_COMMAND_NEEDLE,
    guardedSignature: SLASH_COMMAND_GUARDED_SIGNATURE,
    patchedSignature: SLASH_COMMAND_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1!0$3",
  },
  {
    id: "plugins-access-old",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_OLD,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_OLD,
    legacyPatchedSignature: null,
    applyReplacement: "$1$3=!1,",
    restoreReplacement: "$1$3=$2===`apikey`,",
  },
  {
    id: "plugins-access-new",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_NEW,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_NEW,
    legacyPatchedSignature: PLUGINS_SIDEBAR_LEGACY_PATCHED_SIGNATURE_NEW,
    applyReplacement: "$1$3=Fs(),$4=hf(`533078438`),$5=$2===`apikey`,$6=!1,$7=$3$8",
    normalizeReplacement: "$1$3=Fs(),$4=hf(`533078438`),$5=$2===`apikey`,$6=!1,$7=$3$8",
    restoreReplacement:
      "$1$3=Fs(),$4=hf(`533078438`),$5=$2===`apikey`,$6=$4&&$5,$7=$3&&!$5$8",
  },
  {
    id: "plugins-access-26422",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26422,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26422,
    legacyPatchedSignature: PLUGINS_SIDEBAR_LEGACY_PATCHED_SIGNATURE_26422,
    applyReplacement: "$1$3=$4,$5=$2===`apikey`,$6=!1,$7$8=$9$10",
    normalizeReplacement: "$1$3=$4,$5=$2===`apikey`,$6=!1,$7$8=$9$10",
    restoreReplacement: "$1$3=$4,$5=$2===`apikey`,$6=$3&&$5,$7$8=$9&&!$5$10",
  },
  {
    id: "plugins-access-26429",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26429,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26429,
    legacyPatchedSignature: PLUGINS_SIDEBAR_LEGACY_PATCHED_SIGNATURE_26429,
    applyReplacement: "$1$3=ms(`533078438`),$4=ed($2),$5=!1,$6$7=$8$9",
    normalizeReplacement: "$1$3=ms(`533078438`),$4=ed($2),$5=!1,$6$7=$8$9",
    restoreReplacement: "$1$3=ms(`533078438`),$4=ed($2),$5=$3&&$4,$6$7=$8&&!$4$9",
  },
  {
    id: "plugins-access-26506",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26506,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26506,
    legacyPatchedSignature: null,
    applyReplacement: "$1$3=rs(`533078438`),$4=Xc($2),$5=!1,$7$8=$6&&$9$10",
    restoreReplacement: "$1$3=rs(`533078438`),$4=Xc($2),$5=$6&&$3&&$4,$7$8=$6&&$9&&!$4$10",
  },
  {
    id: "plugins-access-26506-qo",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26506_QO,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26506_QO,
    legacyPatchedSignature: null,
    applyReplacement: "$1$3=Qo(`533078438`),$4=Xc($2),$5=!1,$7$8=$6&&$9$10",
    restoreReplacement: restorePluginsSidebar26506Qo,
  },
  {
    id: "plugins-access-26513",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26513,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26513,
    legacyPatchedSignature: null,
    applyReplacement: "$1$3=Is(`533078438`),$4=Ml($2),$5=!1,$7=$8,$9=$6&&$7$10",
    restoreReplacement: "$1$3=Is(`533078438`),$4=Ml($2),$5=$9&&$3&&$4,$6=$7,$8=$9&&$6&&!$4$10",
  },
  {
    id: "plugins-page-content-26429",
    label: "Plugins page content",
    needle: PLUGINS_PAGE_CONTENT_NEEDLE,
    guardedSignature: PLUGINS_PAGE_CONTENT_GUARDED_SIGNATURE,
    patchedSignature: PLUGINS_PAGE_CONTENT_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1$2=!1,$4,$5;$6",
    restoreReplacement: "$1$2=$3,$4,$5;$6",
  },
  {
    id: "plugin-detail-access-26429",
    label: "Plugin detail access",
    needle: PLUGIN_DETAIL_AUTH_NEEDLE,
    guardedSignature: PLUGIN_DETAIL_AUTH_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_DETAIL_AUTH_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1if(!1){",
    restoreReplacement: "$1if($4($2)){",
  },
  {
    id: "plugin-install-availability-26429",
    label: "Plugin install availability",
    needle: PLUGIN_INSTALL_AVAILABILITY_NEEDLE,
    guardedSignature: PLUGIN_INSTALL_AVAILABILITY_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_INSTALL_AVAILABILITY_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1$2=$3.length>0&&$4===$3.length&&$5?`disabled-by-admin`:null,$6;",
    restoreReplacement: "$1$2=$3.length>0&&$4===$3.length?$5?`disabled-by-admin`:`connector-unavailable`:null,$6;",
  },
  {
    id: "plugin-install-availability-helper-26513",
    label: "Plugin install availability",
    needle: "connector-unavailable",
    guardedSignature: PLUGIN_INSTALL_AVAILABILITY_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_INSTALL_AVAILABILITY_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1$2=$3.length>0&&$4===$3.length&&$5?`disabled-by-admin`:null,$6;",
    restoreReplacement: "$1$2=$3.length>0&&$4===$3.length?$5?`disabled-by-admin`:`connector-unavailable`:null,$6;",
  },
  {
    id: "plugin-install-modal-content-26429",
    label: "Plugin install modal content",
    needle: PLUGIN_INSTALL_MODAL_CONTENT_NEEDLE,
    guardedSignature: PLUGIN_INSTALL_MODAL_CONTENT_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_INSTALL_MODAL_CONTENT_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1$2=$3,$4=($5?.apps.length??0)>0&&!1,$6;",
    restoreReplacement: "$1$2=$3,$4=($5?.apps.length??0)>0&&$5?.summary.authPolicy===`ON_INSTALL`,$6;",
  },
  {
    id: "composer-plugin-mentions-26513",
    label: "Composer plugin mentions",
    needle: COMPOSER_PLUGIN_MENTIONS_NEEDLE,
    guardedSignature: COMPOSER_PLUGIN_MENTIONS_GUARDED_SIGNATURE,
    patchedSignature: COMPOSER_PLUGIN_MENTIONS_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: "$1[]",
    restoreReplacement: "$1[`shared-with-me`]",
  },
  {
    id: "gpt55-model-list",
    label: "GPT-5.5 model list",
    needle: MODEL_LIST_NEEDLE,
    guardedSignature: MODEL_LIST_GUARDED_SIGNATURE,
    patchedSignature: MODEL_LIST_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: (_match: string, prefix: string, managerVar: string, hostVar: string, paramsVar: string, suffix: string) =>
      `${prefix}async(${managerVar},{hostId:${hostVar},...${paramsVar}})=>/*codexfast-gpt55*/{let r=await ${managerVar}.sendRequest(\`model/list\`,${paramsVar});return Array.isArray(r.data)&&!r.data.some(e=>e.model===\`gpt-5.5\`)?{...r,data:[...r.data,${GPT_55_MODEL_ENTRY}]}:r}${suffix}`,
    restoreReplacement: (_match: string, prefix: string, managerVar: string, hostVar: string, paramsVar: string, _resultVar: string, suffix: string) =>
      `${prefix}(${managerVar},{hostId:${hostVar},...${paramsVar}})=>${managerVar}.sendRequest(\`model/list\`,${paramsVar})${suffix}`,
  },
  {
    id: "gpt55-model-query-selector",
    label: "GPT-5.5 model query selector",
    needle: MODEL_QUERY_NEEDLE,
    guardedSignature: MODEL_QUERY_GUARDED_SIGNATURE,
    patchedSignature: MODEL_QUERY_PATCHED_SIGNATURE,
    legacyPatchedSignature: null,
    applyReplacement: (_match: string, prefix: string, defaultVar: string, modelsByTypeVar: string, configVar: string) =>
      `${prefix}/*codexfast-gpt55-select*/${modelsByTypeVar}.models.some(e=>e.model===\`gpt-5.5\`)||${modelsByTypeVar}.models.push(${GPT_55_MODEL_ENTRY}),${defaultVar}??=${modelsByTypeVar}.models.find(e=>e.model===${configVar}.defaultModel)??null,{modelsByType:${modelsByTypeVar},defaultModel:${defaultVar}}`,
    restoreReplacement: (_match: string, prefix: string, modelsByTypeVar: string, defaultVar: string, configVar: string) =>
      `${prefix}${defaultVar}??=${modelsByTypeVar}.models.find(e=>e.model===${configVar}.defaultModel)??null,{modelsByType:${modelsByTypeVar},defaultModel:${defaultVar}}`,
  },
];
