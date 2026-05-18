import { defineTargetSpecs } from "./builders.mts";

const MODEL_LIST_NEEDLE = "\"list-models-for-host\"";
const MODEL_QUERY_NEEDLE = "modelsByType";
const GPT_55_MODEL_ENTRY =
  "{id:`gpt-5.5`,model:`gpt-5.5`,upgrade:null,upgradeInfo:null,availabilityNux:null,displayName:`GPT-5.5`,description:`Frontier model for complex coding, research, and real-world work.`,hidden:!1,supportedReasoningEfforts:[{reasoningEffort:`low`,description:`Fast responses with lighter reasoning`},{reasoningEffort:`medium`,description:`Balances speed and reasoning depth for everyday tasks`},{reasoningEffort:`high`,description:`Greater reasoning depth for complex problems`},{reasoningEffort:`xhigh`,description:`Extra high reasoning depth for complex problems`}],defaultReasoningEffort:`medium`,inputModalities:[`text`],supportsPersonality:!0,additionalSpeedTiers:[`fast`],isDefault:!1}";
const MODEL_LIST_GUARDED_SIGNATURE =
  /("list-models-for-host":i9\()\(([A-Za-z_$][\w$]*),\{hostId:([A-Za-z_$][\w$]*),\.\.\.([A-Za-z_$][\w$]*)\}\)=>\2\.sendRequest\(`model\/list`,\4\)(\))/;
const MODEL_LIST_PATCHED_SIGNATURE =
  /("list-models-for-host":i9\()async\(([A-Za-z_$][\w$]*),\{hostId:([A-Za-z_$][\w$]*),\.\.\.([A-Za-z_$][\w$]*)\}\)=>\/\*codexfast-gpt55\*\/\{let ([A-Za-z_$][\w$]*)=await \2\.sendRequest\(`model\/list`,\4\);return Array\.isArray\(\5\.data\)&&!\5\.data\.some\(e=>e\.model===`gpt-5\.5`\)\?\{\.\.\.\5,data:\[\.\.\.\5\.data,\{id:`gpt-5\.5`[^]*?isDefault:!1\}\]\}:\5\}(\))/;
const MODEL_QUERY_GUARDED_SIGNATURE =
  /(\}\}\),)([A-Za-z_$][\w$]*)\?\?=([A-Za-z_$][\w$]*)\.models\.find\(e=>e\.model===([A-Za-z_$][\w$]*)\.defaultModel\)\?\?null,\{modelsByType:\3,defaultModel:\2\}/;
const MODEL_QUERY_PATCHED_SIGNATURE =
  /(\}\}\),)\/\*codexfast-gpt55-select\*\/([A-Za-z_$][\w$]*)\.models\.some\(e=>e\.model===`gpt-5\.5`\)\|\|\2\.models\.push\(\{id:`gpt-5\.5`[^]*?isDefault:!1\}\),([A-Za-z_$][\w$]*)\?\?=\2\.models\.find\(e=>e\.model===([A-Za-z_$][\w$]*)\.defaultModel\)\?\?null,\{modelsByType:\2,defaultModel:\3\}/;

export const MODEL_TARGET_SPECS = defineTargetSpecs(
  {
    id: "gpt55-model-list",
    label: "GPT-5.5 model list",
    needle: MODEL_LIST_NEEDLE,
    guardedSignature: MODEL_LIST_GUARDED_SIGNATURE,
    patchedSignature: MODEL_LIST_PATCHED_SIGNATURE,
    applyReplacement: (_match: string, prefix: string, managerVar: string, hostVar: string, paramsVar: string, suffix: string) =>
      `${prefix}async(${managerVar},{hostId:${hostVar},...${paramsVar}})=>/*codexfast-gpt55*/{let r=await ${managerVar}.sendRequest(\`model/list\`,${paramsVar});return Array.isArray(r.data)&&!r.data.some(e=>e.model===\`gpt-5.5\`)?{...r,data:[...r.data,${GPT_55_MODEL_ENTRY}]}:r}${suffix}`,
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
