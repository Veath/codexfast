import { defineTargetSpecs } from "./builders.mts";

const SPEED_LABEL_NEEDLE = "settings.agent.speed.label";
const SPEED_SLASH_COMMAND_NEEDLE = "composer.speedSlashCommand.title";
const SPEED_SLASH_COMMAND_DISABLE_NEEDLE = "composer.speedSlashCommand.disableDescription";
const ADD_CONTEXT_SPEED_NEEDLE = "composer.addContext.speed.option.fast.description";
const INTELLIGENCE_SPEED_NEEDLE = "composer.intelligenceDropdown.speed.title";
const INTELLIGENCE_SPEED_CODE_NEEDLE = "composer.openModelPicker";
const SERVICE_TIER_ALLOWANCE_NEEDLE = "featureRequirements?.fast_mode";
const SERVICE_TIER_REQUEST_ALLOWANCE_NEEDLE = "Failed to read service tier for request";
const GUARDED_SIGNATURE_WITH_OPTION_COUNT =
  /([A-Za-z_$][\w$]*)=((?:_e|ae|P|N|de|ie|se|xe|je)\(\),)(\{serviceTierSettings:([A-Za-z_$][\w$]*),setServiceTier:[^}]+\}=(?:Ce|se|be|xe|ye|Ve|de|fe|_e)\(\);)if\(!\1\|\|\4\.availableOptions\.length<=1\)return null;/;
const PATCHED_SIGNATURE_WITH_OPTION_COUNT =
  /([A-Za-z_$][\w$]*)=((?:_e|ae|P|N|de|ie|se|xe|je)\(\),)(\{serviceTierSettings:([A-Za-z_$][\w$]*),setServiceTier:[^}]+\}=(?:Ce|se|be|xe|ye|Ve|de|fe|_e)\(\);)if\(\4\.availableOptions\.length<=1\)return null;/;
const GUARDED_SIGNATURE_WITH_DESTRUCTURED_ALLOWED_OPTION_COUNT =
  /(\{isServiceTierAllowed:([A-Za-z_$][\w$]*)\}=[A-Za-z_$][\w$]*\(\),\{serviceTierSettings:([A-Za-z_$][\w$]*),setServiceTier:[^}]+\}=[A-Za-z_$][\w$]*\(\);)if\(!\2\|\|\3\.availableOptions\.length<=1\)return null;/;
const PATCHED_SIGNATURE_WITH_DESTRUCTURED_ALLOWED_OPTION_COUNT =
  /(\{isServiceTierAllowed:([A-Za-z_$][\w$]*)\}=[A-Za-z_$][\w$]*\(\),\{serviceTierSettings:([A-Za-z_$][\w$]*),setServiceTier:[^}]+\}=[A-Za-z_$][\w$]*\(\);)if\(\3\.availableOptions\.length<=1\)return null;/;
const SERVICE_TIER_ALLOWANCE_GUARDED_SIGNATURE =
  /(([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*\?\.authMethod\?\?null,[A-Za-z_$][\w$]*;[^]*?let\{data:([A-Za-z_$][\w$]*),isPending:([A-Za-z_$][\w$]*)\}=[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*\),([A-Za-z_$][\w$]*)=!![A-Za-z_$][\w$]*\?\.isLoading\|\|([A-Za-z_$][\w$]*)&&\4,([A-Za-z_$][\w$]*)=)\6&&!\5&&\3!=null&&\3\?\.requirements\?\.featureRequirements\?\.fast_mode!==!1(,)/;
const SERVICE_TIER_ALLOWANCE_PATCHED_SIGNATURE =
  /(([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*\?\.authMethod\?\?null,[A-Za-z_$][\w$]*;[^]*?let\{data:([A-Za-z_$][\w$]*),isPending:([A-Za-z_$][\w$]*)\}=[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*\),([A-Za-z_$][\w$]*)=!![A-Za-z_$][\w$]*\?\.isLoading\|\|([A-Za-z_$][\w$]*)&&\4,([A-Za-z_$][\w$]*)=)!\5&&\(\6\?\3!=null&&\3\?\.requirements\?\.featureRequirements\?\.fast_mode!==!1:!0\)(,)/;
const SERVICE_TIER_REQUEST_ALLOWANCE_GUARDED_SIGNATURE =
  /(async function [A-Za-z_$][\w$]*\(([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)\)\{let ([A-Za-z_$][\w$]*)=await [A-Za-z_$][\w$]*\(\2,\3\);return \4===`chatgpt`\?\(await \2\.query\.fetch\([A-Za-z_$][\w$]*,\{authMethod:\4,hostId:\3\}\)\)\.requirements\?\.featureRequirements\?\.fast_mode!==!1:)!1(\})/;
const SERVICE_TIER_REQUEST_ALLOWANCE_PATCHED_SIGNATURE =
  /(async function [A-Za-z_$][\w$]*\(([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)\)\{let ([A-Za-z_$][\w$]*)=await [A-Za-z_$][\w$]*\(\2,\3\);return \4===`chatgpt`\?\(await \2\.query\.fetch\([A-Za-z_$][\w$]*,\{authMethod:\4,hostId:\3\}\)\)\.requirements\?\.featureRequirements\?\.fast_mode!==!1:)!0(\})/;
const SERVICE_TIER_REQUEST_ALLOWANCE_HELPER_GUARDED_SIGNATURE =
  /(async function [A-Za-z_$][\w$]*\(([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)\)\{let ([A-Za-z_$][\w$]*)=await [A-Za-z_$][\w$]*\(\2,\3\);if\(\4!==`chatgpt`\)return)!1(;let [A-Za-z_$][\w$]*=await [A-Za-z_$][\w$]*\(\3,\{priority:`critical`\}\);return \2\.query\.setData\([A-Za-z_$][\w$]*,\{authMethod:\4,hostId:\3\},[A-Za-z_$][\w$]*\),[A-Za-z_$][\w$]*\.requirements\?\.featureRequirements\?\.fast_mode!==!1\})/;
const SERVICE_TIER_REQUEST_ALLOWANCE_HELPER_PATCHED_SIGNATURE =
  /(async function [A-Za-z_$][\w$]*\(([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)\)\{let ([A-Za-z_$][\w$]*)=await [A-Za-z_$][\w$]*\(\2,\3\);if\(\4!==`chatgpt`\)return)!0(;let [A-Za-z_$][\w$]*=await [A-Za-z_$][\w$]*\(\3,\{priority:`critical`\}\);return \2\.query\.setData\([A-Za-z_$][\w$]*,\{authMethod:\4,hostId:\3\},[A-Za-z_$][\w$]*\),[A-Za-z_$][\w$]*\.requirements\?\.featureRequirements\?\.fast_mode!==!1\})/;
const SERVICE_TIER_CONVERSATION_FALLBACK_GUARDED_SIGNATURE =
  /(let [^;]+,[A-Za-z_$][\w$]*=[A-Za-z_$][\w$]*!=null&&[A-Za-z_$][\w$]*\?\.serviceTier(?:!==void 0|!=null)\?[^;]+;[A-Za-z_$][\w$]*=[A-Za-z_$][\w$]*!=null&&\([A-Za-z_$][\w$]*\?\.serviceTier(?:!==void 0|!=null)\|\|[A-Za-z_$][\w$]*\?\.params\.serviceTier(?:!==void 0|!=null)\)\?[^,]+:[A-Za-z_$][\w$]*\([^,]+,[A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*\),)/;
const SERVICE_TIER_CONVERSATION_FALLBACK_PATCHED_SIGNATURE =
  /(let [^;]+,[A-Za-z_$][\w$]*=[A-Za-z_$][\w$]*!=null&&[A-Za-z_$][\w$]*\?\.serviceTier!=null&&[A-Za-z_$][\w$]*\.serviceTier!==`standard`\?[A-Za-z_$][\w$]*\.serviceTier:[A-Za-z_$][\w$]*\.serviceTier;[A-Za-z_$][\w$]*=[A-Za-z_$][\w$]*\([^,]+,[A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*\),)/;
const SERVICE_TIER_CONVERSATION_FALLBACK_26707_GUARDED_SIGNATURE =
  /(let [^;]+,([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*==null&&[A-Za-z_$][\w$]*!=null\?[A-Za-z_$][\w$]*\.value:[A-Za-z_$][\w$]*\?[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\):[A-Za-z_$][\w$]*\.serviceTier,([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)!=null&&([A-Za-z_$][\w$]*)\?\.serviceTier!==void 0\?\5\.serviceTier:\4!=null&&([A-Za-z_$][\w$]*)!==void 0\?\6:\2;)([A-Za-z_$][\w$]*)=\4!=null&&\(\5\?\.serviceTier!==void 0\|\|\6!==void 0\)\?[A-Za-z_$][\w$]*\?\3:null:([A-Za-z_$][\w$]*)\(([^,]+),\3,([A-Za-z_$][\w$]*)\),/;
const SERVICE_TIER_CONVERSATION_FALLBACK_26707_PATCHED_SIGNATURE =
  /(let [^;]+,([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*==null&&[A-Za-z_$][\w$]*!=null\?[A-Za-z_$][\w$]*\.value:[A-Za-z_$][\w$]*\?[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\):[A-Za-z_$][\w$]*\.serviceTier,([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)!=null&&([A-Za-z_$][\w$]*)\?\.serviceTier!=null&&\5\.serviceTier!==`standard`\?\5\.serviceTier:\2;)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\(([^,]+),\3,([A-Za-z_$][\w$]*)\),/;
const GUARDED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=((?:_e|ae|P|N|de|ie|se|je)\(\),)(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(?:Ce|se|be|xe|ye|Ve|de|fe|_e)\(\);)if\(!\1\)return null;/;
const PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=!0,(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(Ce|se|be|xe|ye|Ve|de|fe|_e)\(\);)let /;
const NORMALIZED_PATCHED_SIGNATURE =
  /([A-Za-z_$][\w$]*)=((?:_e|ae|P|N|de|ie|se|je)\(\),)(\{serviceTierSettings:[^,}]+,setServiceTier:[^}]+\}=(?:Ce|se|be|xe|ye|Ve|de|fe|_e)\(\);)let /;
const SLASH_COMMAND_GUARDED_SIGNATURE =
  /(id:`speed`,title:[^,]+,description:[^,]+,requiresEmptyComposer:!1,enabled:)([A-Za-z_$][\w$]*)(,Icon:[^,]+,onSelect:[^,]+,dependencies:[A-Za-z_$][\w$]*})/;
const SLASH_COMMAND_PATCHED_SIGNATURE =
  /(id:`speed`,title:[^,]+,description:[^,]+,requiresEmptyComposer:!1,enabled:)!0(,Icon:[^,]+,onSelect:[^,]+,dependencies:[A-Za-z_$][\w$]*})/;
const SERVICE_TIER_SLASH_COMMAND_GUARDED_SIGNATURE =
  /(id:[A-Za-z_$][\w$]*,title:[A-Za-z_$][\w$]*,description:[A-Za-z_$][\w$]*,requiresEmptyComposer:!1,enabled:)([A-Za-z_$][\w$]*)(,Icon:[A-Za-z_$][\w$]*,onSelect:[A-Za-z_$][\w$]*,dependencies:[A-Za-z_$][\w$]*})/;
const SERVICE_TIER_SLASH_COMMAND_PATCHED_SIGNATURE =
  /(id:[A-Za-z_$][\w$]*,title:[A-Za-z_$][\w$]*,description:[A-Za-z_$][\w$]*,requiresEmptyComposer:!1,enabled:)!0(,Icon:[A-Za-z_$][\w$]*,onSelect:[A-Za-z_$][\w$]*,dependencies:[A-Za-z_$][\w$]*})/;
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
  /(let )([A-Za-z_$][\w$]*);([^;]{0,260}\?\(\2=)([A-Za-z_$][\w$]*)(\?\(0,[A-Za-z_$][\w$]*\.jsx\)\([A-Za-z_$][\w$]*,\{selectedServiceTier:[^}]+,isLoading:[^}]+,setServiceTier:[^}]+,onSelectComplete:[^}]+\}\):null,)/;
const INTELLIGENCE_SPEED_PATCHED_SIGNATURE_QA =
  /(let )([A-Za-z_$][\w$]*);([^;]{0,260}\?\(\2=)!0(\?\(0,[A-Za-z_$][\w$]*\.jsx\)\([A-Za-z_$][\w$]*,\{selectedServiceTier:[^}]+,isLoading:[^}]+,setServiceTier:[^}]+,onSelectComplete:[^}]+\}\):null,)/;
const INTELLIGENCE_SPEED_GUARDED_SIGNATURE_OPTIONS_TERNARY =
  /([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*&&([A-Za-z_$][\w$]*)\.availableOptions\.length>1\?(\(0,[A-Za-z_$][\w$]*\.jsx\)\([A-Za-z_$][\w$]*,\{options:\2\.availableOptions,selectedServiceTier:[^}]+,isLoading:\2\.isLoading,setServiceTier:[^}]+,onSelectComplete:[^}]+\}\)):null,/;
const INTELLIGENCE_SPEED_PATCHED_SIGNATURE_OPTIONS_TERNARY =
  /([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\.availableOptions\.length>1\?(\(0,[A-Za-z_$][\w$]*\.jsx\)\([A-Za-z_$][\w$]*,\{options:\2\.availableOptions,selectedServiceTier:[^}]+,isLoading:\2\.isLoading,setServiceTier:[^}]+,onSelectComplete:[^}]+\}\)):null,/;
const INTELLIGENCE_SPEED_GUARDED_SIGNATURE_OPTIONS_BOOLEAN =
  /([,;])([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&([A-Za-z_$][\w$]*)\.availableOptions\.length>1,/;
const INTELLIGENCE_SPEED_PATCHED_SIGNATURE_OPTIONS_BOOLEAN =
  /([,;])([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\.availableOptions\.length>1,/;
const INTELLIGENCE_SPEED_GUARDED_SIGNATURE_TERNARY =
  /([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*\?(\(0,[A-Za-z_$][\w$]*\.jsx\)\([A-Za-z_$][\w$]*,\{selectedServiceTier:[^}]+,isLoading:[^}]+,setServiceTier:[^}]+,onSelectComplete:[^}]+\}\)):null,/;
const INTELLIGENCE_SPEED_PATCHED_SIGNATURE_TERNARY =
  /([A-Za-z_$][\w$]*)=(\(0,[A-Za-z_$][\w$]*\.jsx\)\([A-Za-z_$][\w$]*,\{selectedServiceTier:[^}]+,isLoading:[^}]+,setServiceTier:[^}]+,onSelectComplete:[^}]+\}\)),/;
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
    _e: "je",
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

function patchConversationServiceTierFallback(match: string): string {
  return match
    .replace(
      /[A-Za-z_$][\w$]*!=null&&([A-Za-z_$][\w$]*)\?\.serviceTier(?:!==void 0|!=null)\?\1\.serviceTier:/,
      (serviceTierBranch, serviceTierSource) =>
        serviceTierBranch
          .replace(/!==void 0/g, "!=null")
          .replace(
            `${serviceTierSource}?.serviceTier!=null?`,
            `${serviceTierSource}?.serviceTier!=null&&${serviceTierSource}.serviceTier!==\`standard\`?`,
          ),
    )
    .replace(
      /[A-Za-z_$][\w$]*!=null&&([A-Za-z_$][\w$]*)\?\.params\.serviceTier(?:!==void 0|!=null)\?\1\.params\.serviceTier:/,
      "",
    )
    .replace(
      /([A-Za-z_$][\w$]*=)[A-Za-z_$][\w$]*!=null&&\([^)]*\)\?[A-Za-z_$][\w$]*\?[A-Za-z_$][\w$]*:null:([A-Za-z_$][\w$]*\([^,]+,[A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*\),)/,
      "$1$2",
    );
}

function patchConversationServiceTierFallback26707(
  _match: string,
  prefix: string,
  baseTierVar: string,
  requestTierVar: string,
  conversationVar: string,
  nextTurnSettingsVar: string,
  _latestTurnTierVar: string,
  serviceTierForRequestVar: string,
  fallbackFunction: string,
  modelVar: string,
  isAllowedVar: string,
): string {
  const prefixBeforeRequestTier = prefix.replace(
    new RegExp("," + requestTierVar + "=[^;]+;"),
    ",",
  );
  return `${prefixBeforeRequestTier}${requestTierVar}=${conversationVar}!=null&&${nextTurnSettingsVar}?.serviceTier!=null&&${nextTurnSettingsVar}.serviceTier!==\`standard\`?${nextTurnSettingsVar}.serviceTier:${baseTierVar};${serviceTierForRequestVar}=${fallbackFunction}(${modelVar},${requestTierVar},${isAllowedVar}),`;
}

export const SPEED_TARGET_SPECS = defineTargetSpecs(
  {
    id: "speed-setting-option-count",
    label: "Speed setting",
    needle: SPEED_LABEL_NEEDLE,
    guardedSignature: GUARDED_SIGNATURE_WITH_OPTION_COUNT,
    patchedSignature: PATCHED_SIGNATURE_WITH_OPTION_COUNT,
    applyReplacement: "$1=$2$3if($4.availableOptions.length<=1)return null;",
  },
  {
    id: "speed-setting-destructured-option-count",
    label: "Speed setting",
    needle: SPEED_LABEL_NEEDLE,
    guardedSignature: GUARDED_SIGNATURE_WITH_DESTRUCTURED_ALLOWED_OPTION_COUNT,
    patchedSignature: PATCHED_SIGNATURE_WITH_DESTRUCTURED_ALLOWED_OPTION_COUNT,
    applyReplacement: "$1if($3.availableOptions.length<=1)return null;",
  },
  {
    id: "speed-service-tier-allowance-26601",
    label: "Speed service tier allowance",
    needle: SERVICE_TIER_ALLOWANCE_NEEDLE,
    guardedSignature: SERVICE_TIER_ALLOWANCE_GUARDED_SIGNATURE,
    patchedSignature: SERVICE_TIER_ALLOWANCE_PATCHED_SIGNATURE,
    applyReplacement:
      "$1!$5&&($6?$3!=null&&$3?.requirements?.featureRequirements?.fast_mode!==!1:!0)$8",
  },
  {
    id: "speed-service-tier-request-allowance-26623",
    label: "Speed service tier request allowance",
    needle: SERVICE_TIER_REQUEST_ALLOWANCE_NEEDLE,
    guardedSignature: SERVICE_TIER_REQUEST_ALLOWANCE_GUARDED_SIGNATURE,
    patchedSignature: SERVICE_TIER_REQUEST_ALLOWANCE_PATCHED_SIGNATURE,
    applyReplacement: "$1!0$5",
  },
  {
    id: "speed-service-tier-request-allowance-26707",
    label: "Speed service tier request allowance",
    needle: SERVICE_TIER_REQUEST_ALLOWANCE_NEEDLE,
    guardedSignature: SERVICE_TIER_REQUEST_ALLOWANCE_HELPER_GUARDED_SIGNATURE,
    patchedSignature: SERVICE_TIER_REQUEST_ALLOWANCE_HELPER_PATCHED_SIGNATURE,
    applyReplacement: "$1!0$5",
  },
  {
    id: "speed-service-tier-conversation-fallback-26601",
    label: "Speed service tier conversation fallback",
    needle: "serviceTierForRequest",
    guardedSignature: SERVICE_TIER_CONVERSATION_FALLBACK_GUARDED_SIGNATURE,
    patchedSignature: SERVICE_TIER_CONVERSATION_FALLBACK_PATCHED_SIGNATURE,
    applyReplacement: patchConversationServiceTierFallback,
  },
  {
    id: "speed-service-tier-conversation-fallback-26707",
    label: "Speed service tier conversation fallback",
    needle: "serviceTierForRequest",
    guardedSignature: SERVICE_TIER_CONVERSATION_FALLBACK_26707_GUARDED_SIGNATURE,
    patchedSignature: SERVICE_TIER_CONVERSATION_FALLBACK_26707_PATCHED_SIGNATURE,
    applyReplacement: patchConversationServiceTierFallback26707,
  },
  {
    id: "speed-setting",
    label: "Speed setting",
    needle: SPEED_LABEL_NEEDLE,
    guardedSignature: GUARDED_SIGNATURE,
    patchedSignature: NORMALIZED_PATCHED_SIGNATURE,
    legacyPatchedSignature: PATCHED_SIGNATURE,
    applyReplacement: "$1=$2$3",
    normalizeReplacement: normalizeLegacySpeedSetting,
  },
  {
    id: "add-context-speed-menu-old",
    label: "Add-context Speed menu",
    needle: ADD_CONTEXT_SPEED_NEEDLE,
    guardedSignature: ADD_CONTEXT_SPEED_GUARDED_SIGNATURE_OLD,
    patchedSignature: ADD_CONTEXT_SPEED_PATCHED_SIGNATURE_OLD,
    applyReplacement: "$1=!0,$2",
  },
  {
    id: "add-context-speed-menu-new",
    label: "Add-context Speed menu",
    needle: ADD_CONTEXT_SPEED_NEEDLE,
    guardedSignature: ADD_CONTEXT_SPEED_GUARDED_SIGNATURE_NEW,
    patchedSignature: ADD_CONTEXT_SPEED_PATCHED_SIGNATURE_NEW,
    applyReplacement: "$1=!0,$2",
  },
  {
    id: "intelligence-speed-menu",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE,
    applyReplacement: "$1$2=!0,",
  },
  {
    id: "intelligence-speed-menu-gf",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE_GF,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE_GF,
    applyReplacement: "$1$2=!0,",
  },
  {
    id: "intelligence-speed-menu-qs",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE_QS,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE_QS,
    applyReplacement: "$1$2=!0,$5",
  },
  {
    id: "intelligence-speed-menu-options-ternary",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE_OPTIONS_TERNARY,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE_OPTIONS_TERNARY,
    applyReplacement: "$1=$2.availableOptions.length>1?$3:null,",
  },
  {
    id: "intelligence-speed-menu-options-boolean",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE_OPTIONS_BOOLEAN,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE_OPTIONS_BOOLEAN,
    applyReplacement: "$1$2=$4.availableOptions.length>1,",
  },
  {
    id: "intelligence-speed-menu-options-boolean-code",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_CODE_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE_OPTIONS_BOOLEAN,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE_OPTIONS_BOOLEAN,
    applyReplacement: "$1$2=$4.availableOptions.length>1,",
  },
  {
    id: "intelligence-speed-menu-ternary",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE_TERNARY,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE_TERNARY,
    applyReplacement: "$1=$2,",
  },
  {
    id: "intelligence-speed-menu-qa",
    label: "Composer Intelligence Speed menu",
    needle: INTELLIGENCE_SPEED_NEEDLE,
    guardedSignature: INTELLIGENCE_SPEED_GUARDED_SIGNATURE_QA,
    patchedSignature: INTELLIGENCE_SPEED_PATCHED_SIGNATURE_QA,
    applyReplacement: "$1$2;$3!0$5",
  },
  {
    id: "fast-slash-command",
    label: "Fast slash command",
    needle: SPEED_SLASH_COMMAND_NEEDLE,
    guardedSignature: SLASH_COMMAND_GUARDED_SIGNATURE,
    patchedSignature: SLASH_COMMAND_PATCHED_SIGNATURE,
    applyReplacement: "$1!0$3",
  },
  {
    id: "service-tier-slash-command",
    label: "Fast slash command",
    needle: SPEED_SLASH_COMMAND_DISABLE_NEEDLE,
    guardedSignature: SERVICE_TIER_SLASH_COMMAND_GUARDED_SIGNATURE,
    patchedSignature: SERVICE_TIER_SLASH_COMMAND_PATCHED_SIGNATURE,
    applyReplacement: "$1!0$3",
  },
);
