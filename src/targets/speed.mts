import { defineTargetSpecs } from "./builders.mts";

const SPEED_LABEL_NEEDLE = "settings.agent.speed.label";
const SPEED_SLASH_COMMAND_NEEDLE = "composer.speedSlashCommand.title";
const ADD_CONTEXT_SPEED_NEEDLE = "composer.addContext.speed.option.fast.description";
const INTELLIGENCE_SPEED_NEEDLE = "composer.intelligenceDropdown.speed.title";
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
  /(let )([A-Za-z_$][\w$]*);([^;]{0,260}\?\(\2=)([A-Za-z_$][\w$]*)(\?\(0,[A-Za-z_$][\w$]*\.jsx\)\([A-Za-z_$][\w$]*,\{selectedServiceTier:[^}]+,isLoading:[^}]+,setServiceTier:[^}]+,onSelectComplete:[^}]+\}\):null,)/;
const INTELLIGENCE_SPEED_PATCHED_SIGNATURE_QA =
  /(let )([A-Za-z_$][\w$]*);([^;]{0,260}\?\(\2=)!0(\?\(0,[A-Za-z_$][\w$]*\.jsx\)\([A-Za-z_$][\w$]*,\{selectedServiceTier:[^}]+,isLoading:[^}]+,setServiceTier:[^}]+,onSelectComplete:[^}]+\}\):null,)/;
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

export const SPEED_TARGET_SPECS = defineTargetSpecs(
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
);
