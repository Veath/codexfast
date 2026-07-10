import { defineTargetSpecs } from "./builders.mts";

const MODEL_LIST_NEEDLE = "\"list-models-for-host\"";
const MODEL_QUERY_NEEDLE = "modelsByType";
const GPT_56_MODEL_SELECTOR_NEEDLE = "use_hidden_models";
const GPT_55_FAST_SERVICE_TIER =
  "{id:`priority`,name:`Fast`,description:`1.5x speed, increased usage`}";
const GPT_55_MODEL_ENTRY =
  `{id:\`gpt-5.5\`,model:\`gpt-5.5\`,upgrade:null,upgradeInfo:null,availabilityNux:null,displayName:\`GPT-5.5\`,description:\`Frontier model for complex coding, research, and real-world work.\`,hidden:!1,supportedReasoningEfforts:[{reasoningEffort:\`low\`,description:\`Fast responses with lighter reasoning\`},{reasoningEffort:\`medium\`,description:\`Balances speed and reasoning depth for everyday tasks\`},{reasoningEffort:\`high\`,description:\`Greater reasoning depth for complex problems\`},{reasoningEffort:\`xhigh\`,description:\`Extra high reasoning depth for complex problems\`}],defaultReasoningEffort:\`medium\`,inputModalities:[\`text\`],supportsPersonality:!0,additionalSpeedTiers:[\`fast\`],serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:null,isDefault:!1}`;
const GPT_56_BASE_REASONING_EFFORTS =
  `{reasoningEffort:\`low\`,description:\`Fast responses with lighter reasoning\`},{reasoningEffort:\`medium\`,description:\`Balances speed and reasoning depth for everyday tasks\`},{reasoningEffort:\`high\`,description:\`Greater reasoning depth for complex problems\`},{reasoningEffort:\`xhigh\`,description:\`Extra high reasoning depth for complex problems\`},{reasoningEffort:\`max\`,description:\`Maximum reasoning depth for the hardest tasks\`}`;
const GPT_56_ULTRA_REASONING_EFFORT =
  `{reasoningEffort:\`ultra\`,description:\`Highest reasoning depth for the most demanding tasks\`}`;
const GPT_56_SOL_TERRA_REASONING_EFFORTS =
  `[${GPT_56_BASE_REASONING_EFFORTS},${GPT_56_ULTRA_REASONING_EFFORT}]`;
const GPT_56_LUNA_REASONING_EFFORTS = `[${GPT_56_BASE_REASONING_EFFORTS}]`;
const GPT_56_SOL_MODEL_ENTRY =
  `{id:\`gpt-5.6-sol\`,model:\`gpt-5.6-sol\`,upgrade:null,upgradeInfo:null,availabilityNux:null,displayName:\`GPT-5.6 Sol\`,description:\`Frontier model for complex coding, research, and real-world work.\`,hidden:!1,supportedReasoningEfforts:${GPT_56_SOL_TERRA_REASONING_EFFORTS},defaultReasoningEffort:\`medium\`,inputModalities:[\`text\`],supportsPersonality:!0,additionalSpeedTiers:[\`fast\`],serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:null,isDefault:!1}`;
const GPT_56_TERRA_MODEL_ENTRY =
  `{id:\`gpt-5.6-terra\`,model:\`gpt-5.6-terra\`,upgrade:null,upgradeInfo:null,availabilityNux:null,displayName:\`GPT-5.6 Terra\`,description:\`Frontier model for complex coding, research, and real-world work.\`,hidden:!1,supportedReasoningEfforts:${GPT_56_SOL_TERRA_REASONING_EFFORTS},defaultReasoningEffort:\`medium\`,inputModalities:[\`text\`],supportsPersonality:!0,additionalSpeedTiers:[\`fast\`],serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:null,isDefault:!1}`;
const GPT_56_LUNA_MODEL_ENTRY =
  `{id:\`gpt-5.6-luna\`,model:\`gpt-5.6-luna\`,upgrade:null,upgradeInfo:null,availabilityNux:null,displayName:\`GPT-5.6 Luna\`,description:\`Frontier model for complex coding, research, and real-world work.\`,hidden:!1,supportedReasoningEfforts:${GPT_56_LUNA_REASONING_EFFORTS},defaultReasoningEffort:\`medium\`,inputModalities:[\`text\`],supportsPersonality:!0,additionalSpeedTiers:[\`fast\`],serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:null,isDefault:!1}`;
const MODEL_LIST_GUARDED_SIGNATURE =
  /("list-models-for-host":i9\()\(([A-Za-z_$][\w$]*),\{hostId:([A-Za-z_$][\w$]*),\.\.\.([A-Za-z_$][\w$]*)\}\)=>\2\.sendRequest\(`model\/list`,\4\)(\))/;
const MODEL_LIST_PATCHED_SIGNATURE =
  /("list-models-for-host":[A-Za-z_$][\w$]*\()async\([^]*?\)=>\/\*codexfast-gpt55\*\/\{let [A-Za-z_$][\w$]*=await [A-Za-z_$][\w$]*\.sendRequest\(`model\/list`,[A-Za-z_$][\w$]*\);return Array\.isArray\([A-Za-z_$][\w$]*\.data\)\?\{[^]*?serviceTiers:Array\.isArray\(e\.serviceTiers\)&&e\.serviceTiers\.length>0\?e\.serviceTiers:\[\{id:`priority`,name:`Fast`,description:`1\.5x speed, increased usage`\}\][^]*?isDefault:!1\}[^]*?\}:[A-Za-z_$][\w$]*\}(\))/;
const MODEL_LIST_SIMPLE_GUARDED_SIGNATURE =
  /("list-models-for-host":[A-Za-z_$][\w$]*\()\(([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)\)=>\2\.sendRequest\(`model\/list`,\3\)(\))/;
const MODEL_LIST_WITH_OPTIONS_GUARDED_SIGNATURE =
  /("list-models-for-host":[A-Za-z_$][\w$]*\()\(([A-Za-z_$][\w$]*),\{priority:([A-Za-z_$][\w$]*),source:([A-Za-z_$][\w$]*),timeoutMs:([A-Za-z_$][\w$]*),\.\.\.([A-Za-z_$][\w$]*)\}\)=>\2\.sendRequest\(`model\/list`,\6,\{priority:\3,source:\4,timeoutMs:\5\}\)(\))/;
const MODEL_LIST_GPT5X_PATCHED_SIGNATURE =
  /("list-models-for-host":[A-Za-z_$][\w$]*\()async\([^]*?\)=>\/\*codexfast-gpt5x\*\/\{let [A-Za-z_$][\w$]*=await [A-Za-z_$][\w$]*\.sendRequest\(`model\/list`,[A-Za-z_$][\w$]*,\{priority:[A-Za-z_$][\w$]*,source:[A-Za-z_$][\w$]*,timeoutMs:[A-Za-z_$][\w$]*\}\);return Array\.isArray\([A-Za-z_$][\w$]*\.data\)\?\{[^]*?model===`gpt-5\.6-sol`[^]*?reasoningEffort:`max`[^]*?reasoningEffort:`ultra`[^]*?model===`gpt-5\.6-terra`[^]*?reasoningEffort:`max`[^]*?reasoningEffort:`ultra`[^]*?model===`gpt-5\.6-luna`[^]*?reasoningEffort:`max`[^]*?model===`gpt-5\.5`[^]*?\}:[A-Za-z_$][\w$]*\}(\))/;
const GPT_56_MODEL_SELECTOR_GUARDED_SIGNATURE =
  /select:\(\{data:([A-Za-z_$][\w$]*)\}\)=>([A-Za-z_$][\w$]*)\(\{authMethod:([A-Za-z_$][\w$]*),availableModels:new Set\(([A-Za-z_$][\w$]*)\),defaultModel:([A-Za-z_$][\w$]*),enabledReasoningEfforts:([A-Za-z_$][\w$]*),includeUltraReasoningEffort:([A-Za-z_$][\w$]*),models:\1,useHiddenModels:([A-Za-z_$][\w$]*)\}\)/;
const GPT_56_MODEL_SELECTOR_PATCHED_SIGNATURE =
  /select:\(\{data:([A-Za-z_$][\w$]*)\}\)=>\/\*codexfast-gpt56-selector\*\/[A-Za-z_$][\w$]*\(\{authMethod:[A-Za-z_$][\w$]*,availableModels:new Set\(\[\.\.\.[A-Za-z_$][\w$]*,`gpt-5\.6-sol`,`gpt-5\.6-terra`,`gpt-5\.6-luna`\]\),defaultModel:[A-Za-z_$][\w$]*,enabledReasoningEfforts:new Set\(\[\.\.\.[A-Za-z_$][\w$]*,`max`,`ultra`\]\),includeUltraReasoningEffort:!0,models:\1,useHiddenModels:[A-Za-z_$][\w$]*\}\)/;
const MODEL_QUERY_GUARDED_SIGNATURE =
  /(\}\}\),)([A-Za-z_$][\w$]*)\?\?=([A-Za-z_$][\w$]*)\.models\.find\(e=>e\.model===([A-Za-z_$][\w$]*)\.defaultModel\)\?\?null,\{modelsByType:\3,defaultModel:\2\}/;
const MODEL_QUERY_PATCHED_SIGNATURE =
  /(\}\}\),)\/\*codexfast-gpt55-select\*\/([A-Za-z_$][\w$]*)\.models\.some\(e=>e\.model===`gpt-5\.5`\)\|\|\2\.models\.push\(\{id:`gpt-5\.5`[^]*?isDefault:!1\}\),([A-Za-z_$][\w$]*)\?\?=\2\.models\.find\(e=>e\.model===([A-Za-z_$][\w$]*)\.defaultModel\)\?\?null,\{modelsByType:\2,defaultModel:\3\}/;

function patchedGpt55ModelListResult(resultVar: string): string {
  return `Array.isArray(${resultVar}.data)?{...${resultVar},data:${resultVar}.data.some(e=>e.model===\`gpt-5.5\`)?${resultVar}.data.map(e=>e.model===\`gpt-5.5\`?{...e,additionalSpeedTiers:Array.isArray(e.additionalSpeedTiers)&&e.additionalSpeedTiers.length>0?e.additionalSpeedTiers:[\`fast\`],serviceTiers:Array.isArray(e.serviceTiers)&&e.serviceTiers.length>0?e.serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:e.defaultServiceTier??null}:e):[...${resultVar}.data,${GPT_55_MODEL_ENTRY}]}:${resultVar}`;
}

function patchedGpt5xModelListResult(resultVar: string): string {
  return `Array.isArray(${resultVar}.data)?{...${resultVar},data:(()=>{let d=${resultVar}.data.map(e=>e.model===\`gpt-5.6-sol\`?{...e,supportedReasoningEfforts:${GPT_56_SOL_TERRA_REASONING_EFFORTS},additionalSpeedTiers:Array.isArray(e.additionalSpeedTiers)&&e.additionalSpeedTiers.length>0?e.additionalSpeedTiers:[\`fast\`],serviceTiers:Array.isArray(e.serviceTiers)&&e.serviceTiers.length>0?e.serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:e.defaultServiceTier??null}:e.model===\`gpt-5.6-terra\`?{...e,supportedReasoningEfforts:${GPT_56_SOL_TERRA_REASONING_EFFORTS},additionalSpeedTiers:Array.isArray(e.additionalSpeedTiers)&&e.additionalSpeedTiers.length>0?e.additionalSpeedTiers:[\`fast\`],serviceTiers:Array.isArray(e.serviceTiers)&&e.serviceTiers.length>0?e.serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:e.defaultServiceTier??null}:e.model===\`gpt-5.6-luna\`?{...e,supportedReasoningEfforts:${GPT_56_LUNA_REASONING_EFFORTS},additionalSpeedTiers:Array.isArray(e.additionalSpeedTiers)&&e.additionalSpeedTiers.length>0?e.additionalSpeedTiers:[\`fast\`],serviceTiers:Array.isArray(e.serviceTiers)&&e.serviceTiers.length>0?e.serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:e.defaultServiceTier??null}:e.model===\`gpt-5.5\`?{...e,additionalSpeedTiers:Array.isArray(e.additionalSpeedTiers)&&e.additionalSpeedTiers.length>0?e.additionalSpeedTiers:[\`fast\`],serviceTiers:Array.isArray(e.serviceTiers)&&e.serviceTiers.length>0?e.serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:e.defaultServiceTier??null}:e);d.some(e=>e.model===\`gpt-5.6-sol\`)||d.push(${GPT_56_SOL_MODEL_ENTRY});d.some(e=>e.model===\`gpt-5.6-terra\`)||d.push(${GPT_56_TERRA_MODEL_ENTRY});d.some(e=>e.model===\`gpt-5.6-luna\`)||d.push(${GPT_56_LUNA_MODEL_ENTRY});d.some(e=>e.model===\`gpt-5.5\`)||d.push(${GPT_55_MODEL_ENTRY});return d})()}:${resultVar}`;
}

export const MODEL_TARGET_SPECS = defineTargetSpecs(
  {
    id: "gpt5x-model-list-options",
    label: "GPT-5.x model list",
    needle: MODEL_LIST_NEEDLE,
    guardedSignature: MODEL_LIST_WITH_OPTIONS_GUARDED_SIGNATURE,
    patchedSignature: MODEL_LIST_GPT5X_PATCHED_SIGNATURE,
    applyReplacement: (_match: string, prefix: string, managerVar: string, priorityVar: string, sourceVar: string, timeoutVar: string, paramsVar: string, suffix: string) =>
      `${prefix}async(${managerVar},{priority:${priorityVar},source:${sourceVar},timeoutMs:${timeoutVar},...${paramsVar}})=>/*codexfast-gpt5x*/{let codexfastResult=await ${managerVar}.sendRequest(\`model/list\`,${paramsVar},{priority:${priorityVar},source:${sourceVar},timeoutMs:${timeoutVar}});return ${patchedGpt5xModelListResult("codexfastResult")}}${suffix}`,
  },
  {
    id: "gpt55-model-list",
    label: "GPT-5.5 model list",
    needle: MODEL_LIST_NEEDLE,
    guardedSignature: MODEL_LIST_GUARDED_SIGNATURE,
    patchedSignature: MODEL_LIST_PATCHED_SIGNATURE,
    applyReplacement: (_match: string, prefix: string, managerVar: string, hostVar: string, paramsVar: string, suffix: string) =>
      `${prefix}async(${managerVar},{hostId:${hostVar},...${paramsVar}})=>/*codexfast-gpt55*/{let r=await ${managerVar}.sendRequest(\`model/list\`,${paramsVar});return ${patchedGpt55ModelListResult("r")}}${suffix}`,
  },
  {
    id: "gpt55-model-list-simple",
    label: "GPT-5.5 model list",
    needle: MODEL_LIST_NEEDLE,
    guardedSignature: MODEL_LIST_SIMPLE_GUARDED_SIGNATURE,
    patchedSignature: MODEL_LIST_PATCHED_SIGNATURE,
    applyReplacement: (_match: string, prefix: string, managerVar: string, paramsVar: string, suffix: string) =>
      `${prefix}async(${managerVar},${paramsVar})=>/*codexfast-gpt55*/{let r=await ${managerVar}.sendRequest(\`model/list\`,${paramsVar});return ${patchedGpt55ModelListResult("r")}}${suffix}`,
  },
  {
    id: "gpt56-model-query-selector",
    label: "GPT-5.6 model query selector",
    needle: GPT_56_MODEL_SELECTOR_NEEDLE,
    guardedSignature: GPT_56_MODEL_SELECTOR_GUARDED_SIGNATURE,
    patchedSignature: GPT_56_MODEL_SELECTOR_PATCHED_SIGNATURE,
    applyReplacement: (
      _match: string,
      dataVar: string,
      selectorVar: string,
      authMethodVar: string,
      availableModelsVar: string,
      defaultModelVar: string,
      enabledReasoningEffortsVar: string,
      _includeUltraReasoningEffortVar: string,
      useHiddenModelsVar: string,
    ) =>
      `select:({data:${dataVar}})=>/*codexfast-gpt56-selector*/${selectorVar}({authMethod:${authMethodVar},availableModels:new Set([...${availableModelsVar},\`gpt-5.6-sol\`,\`gpt-5.6-terra\`,\`gpt-5.6-luna\`]),defaultModel:${defaultModelVar},enabledReasoningEfforts:new Set([...${enabledReasoningEffortsVar},\`max\`,\`ultra\`]),includeUltraReasoningEffort:!0,models:${dataVar},useHiddenModels:${useHiddenModelsVar}})`,
  },
  {
    id: "gpt55-model-query-selector",
    label: "GPT-5.5 model query selector",
    needle: MODEL_QUERY_NEEDLE,
    guardedSignature: MODEL_QUERY_GUARDED_SIGNATURE,
    patchedSignature: MODEL_QUERY_PATCHED_SIGNATURE,
    applyReplacement: (_match: string, prefix: string, defaultVar: string, modelsByTypeVar: string, configVar: string) =>
      `${prefix}/*codexfast-gpt55-select*/${modelsByTypeVar}.models.some(e=>e.model===\`gpt-5.5\`)||${modelsByTypeVar}.models.push(${GPT_55_MODEL_ENTRY}),${defaultVar}??=${modelsByTypeVar}.models.find(e=>e.model===${configVar}.defaultModel)??null,{modelsByType:${modelsByTypeVar},defaultModel:${defaultVar}}`,
  },
);
