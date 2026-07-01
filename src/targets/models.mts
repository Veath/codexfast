import { defineTargetSpecs } from "./builders.mts";

const MODEL_LIST_NEEDLE = "\"list-models-for-host\"";
const MODEL_QUERY_NEEDLE = "modelsByType";
const GPT_55_FAST_SERVICE_TIER =
  "{id:`priority`,name:`Fast`,description:`1.5x speed, increased usage`}";
const GPT_55_MODEL_ENTRY =
  `{id:\`gpt-5.5\`,model:\`gpt-5.5\`,upgrade:null,upgradeInfo:null,availabilityNux:null,displayName:\`GPT-5.5\`,description:\`Frontier model for complex coding, research, and real-world work.\`,hidden:!1,supportedReasoningEfforts:[{reasoningEffort:\`low\`,description:\`Fast responses with lighter reasoning\`},{reasoningEffort:\`medium\`,description:\`Balances speed and reasoning depth for everyday tasks\`},{reasoningEffort:\`high\`,description:\`Greater reasoning depth for complex problems\`},{reasoningEffort:\`xhigh\`,description:\`Extra high reasoning depth for complex problems\`}],defaultReasoningEffort:\`medium\`,inputModalities:[\`text\`],supportsPersonality:!0,additionalSpeedTiers:[\`fast\`],serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:null,isDefault:!1}`;
const MODEL_LIST_GUARDED_SIGNATURE =
  /("list-models-for-host":i9\()\(([A-Za-z_$][\w$]*),\{hostId:([A-Za-z_$][\w$]*),\.\.\.([A-Za-z_$][\w$]*)\}\)=>\2\.sendRequest\(`model\/list`,\4\)(\))/;
const MODEL_LIST_PATCHED_SIGNATURE =
  /("list-models-for-host":(?:i9|n9)\()async\([^]*?\)=>\/\*codexfast-gpt55\*\/\{let [A-Za-z_$][\w$]*=await [A-Za-z_$][\w$]*\.sendRequest\(`model\/list`,[A-Za-z_$][\w$]*\);return Array\.isArray\([A-Za-z_$][\w$]*\.data\)\?\{[^]*?serviceTiers:Array\.isArray\(e\.serviceTiers\)&&e\.serviceTiers\.length>0\?e\.serviceTiers:\[\{id:`priority`,name:`Fast`,description:`1\.5x speed, increased usage`\}\][^]*?isDefault:!1\}[^]*?\}:[A-Za-z_$][\w$]*\}(\))/;
const MODEL_LIST_SIMPLE_GUARDED_SIGNATURE =
  /("list-models-for-host":n9\()\(([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)\)=>\2\.sendRequest\(`model\/list`,\3\)(\))/;
const MODEL_QUERY_GUARDED_SIGNATURE =
  /(\}\}\),)([A-Za-z_$][\w$]*)\?\?=([A-Za-z_$][\w$]*)\.models\.find\(e=>e\.model===([A-Za-z_$][\w$]*)\.defaultModel\)\?\?null,\{modelsByType:\3,defaultModel:\2\}/;
const MODEL_QUERY_PATCHED_SIGNATURE =
  /(\}\}\),)\/\*codexfast-gpt55-select\*\/([A-Za-z_$][\w$]*)\.models\.some\(e=>e\.model===`gpt-5\.5`\)\|\|\2\.models\.push\(\{id:`gpt-5\.5`[^]*?isDefault:!1\}\),([A-Za-z_$][\w$]*)\?\?=\2\.models\.find\(e=>e\.model===([A-Za-z_$][\w$]*)\.defaultModel\)\?\?null,\{modelsByType:\2,defaultModel:\3\}/;

function patchedGpt55ModelListResult(resultVar: string): string {
  return `Array.isArray(${resultVar}.data)?{...${resultVar},data:${resultVar}.data.some(e=>e.model===\`gpt-5.5\`)?${resultVar}.data.map(e=>e.model===\`gpt-5.5\`?{...e,additionalSpeedTiers:Array.isArray(e.additionalSpeedTiers)&&e.additionalSpeedTiers.length>0?e.additionalSpeedTiers:[\`fast\`],serviceTiers:Array.isArray(e.serviceTiers)&&e.serviceTiers.length>0?e.serviceTiers:[${GPT_55_FAST_SERVICE_TIER}],defaultServiceTier:e.defaultServiceTier??null}:e):[...${resultVar}.data,${GPT_55_MODEL_ENTRY}]}:${resultVar}`;
}

export const MODEL_TARGET_SPECS = defineTargetSpecs(
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
    id: "gpt55-model-query-selector",
    label: "GPT-5.5 model query selector",
    needle: MODEL_QUERY_NEEDLE,
    guardedSignature: MODEL_QUERY_GUARDED_SIGNATURE,
    patchedSignature: MODEL_QUERY_PATCHED_SIGNATURE,
    applyReplacement: (_match: string, prefix: string, defaultVar: string, modelsByTypeVar: string, configVar: string) =>
      `${prefix}/*codexfast-gpt55-select*/${modelsByTypeVar}.models.some(e=>e.model===\`gpt-5.5\`)||${modelsByTypeVar}.models.push(${GPT_55_MODEL_ENTRY}),${defaultVar}??=${modelsByTypeVar}.models.find(e=>e.model===${configVar}.defaultModel)??null,{modelsByType:${modelsByTypeVar},defaultModel:${defaultVar}}`,
  },
);
