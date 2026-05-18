import { defineTargetSpecs } from "./builders.mts";

const PLUGINS_SIDEBAR_NEEDLE = "sidebarElectron.pluginsDisabledTooltip";
const PLUGINS_PAGE_CONTENT_NEEDLE = "skills.pluginsAuthBlockedToast.title";
const PLUGIN_DETAIL_AUTH_NEEDLE = "pluginDeepLinkAuthBlocked";
const PLUGIN_INSTALL_AVAILABILITY_NEEDLE = "plugins.install.connectorUnavailable";
const PLUGIN_INSTALL_MODAL_CONTENT_NEEDLE = "plugins.installModal.about";
const COMPOSER_PLUGIN_MENTIONS_NEEDLE = "composer.atMentionList.pluginsLoading";
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
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=((?:Is|ec)\(`533078438`\)),([A-Za-z_$][\w$]*)=((?:Ml|Xl)\(\2\)),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\3&&\5,([A-Za-z_$][\w$]*)=((?:hl|Nl)\(\{hostId:[^}]+\}\)),([A-Za-z_$][\w$]*)=\8&&\9&&!\5([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26513 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=((?:Is|ec)\(`533078438`\)),([A-Za-z_$][\w$]*)=((?:Ml|Xl)\(\2\)),([A-Za-z_$][\w$]*)=!1,([A-Za-z_$][\w$]*)=((?:hl|Nl)\(\{hostId:[^}]+\}\)),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\8([,;])/;
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
const COMPOSER_PLUGIN_MENTIONS_GUARDED_SIGNATURE_FLAGGED =
  /(additionalMarketplaceKinds:)([A-Za-z_$][\w$]*)\?\[`shared-with-me`\]:\[\]/;
const COMPOSER_PLUGIN_MENTIONS_PATCHED_SIGNATURE_FLAGGED =
  /(additionalMarketplaceKinds:)([A-Za-z_$][\w$]*)\?\[\]:\[\]/;
function patchPluginsSidebar26513(
  _match: string,
  prefix: string,
  _authMethodVariable: string,
  experimentVariable: string,
  experimentCall: string,
  authGateVariable: string,
  authGateCall: string,
  disabledPluginsVariable: string,
  desktopNavVariable: string,
  navCapabilityVariable: string,
  navCapabilityCall: string,
  pluginsLabelVariable: string,
  delimiter: string,
): string {
  return `${prefix}${experimentVariable}=${experimentCall},${authGateVariable}=${authGateCall},${disabledPluginsVariable}=!1,${navCapabilityVariable}=${navCapabilityCall},${pluginsLabelVariable}=${desktopNavVariable}&&${navCapabilityVariable}${delimiter}`;
}

export const PLUGIN_TARGET_SPECS = defineTargetSpecs(
  {
    id: "plugins-access-old",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_OLD,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_OLD,
    applyReplacement: "$1$3=!1,",
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
  },
  {
    id: "plugins-access-26506",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26506,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26506,
    applyReplacement: "$1$3=rs(`533078438`),$4=Xc($2),$5=!1,$7$8=$6&&$9$10",
  },
  {
    id: "plugins-access-26506-qo",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26506_QO,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26506_QO,
    applyReplacement: "$1$3=Qo(`533078438`),$4=Xc($2),$5=!1,$7$8=$6&&$9$10",
  },
  {
    id: "plugins-access-26513",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26513,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26513,
    applyReplacement: patchPluginsSidebar26513,
  },
  {
    id: "plugins-page-content-26429",
    label: "Plugins page content",
    needle: PLUGINS_PAGE_CONTENT_NEEDLE,
    guardedSignature: PLUGINS_PAGE_CONTENT_GUARDED_SIGNATURE,
    patchedSignature: PLUGINS_PAGE_CONTENT_PATCHED_SIGNATURE,
    applyReplacement: "$1$2=!1,$4,$5;$6",
  },
  {
    id: "plugin-detail-access-26429",
    label: "Plugin detail access",
    needle: PLUGIN_DETAIL_AUTH_NEEDLE,
    guardedSignature: PLUGIN_DETAIL_AUTH_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_DETAIL_AUTH_PATCHED_SIGNATURE,
    applyReplacement: "$1if(!1){",
  },
  {
    id: "plugin-install-availability-26429",
    label: "Plugin install availability",
    needle: PLUGIN_INSTALL_AVAILABILITY_NEEDLE,
    guardedSignature: PLUGIN_INSTALL_AVAILABILITY_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_INSTALL_AVAILABILITY_PATCHED_SIGNATURE,
    applyReplacement: "$1$2=$3.length>0&&$4===$3.length&&$5?`disabled-by-admin`:null,$6;",
  },
  {
    id: "plugin-install-availability-helper-26513",
    label: "Plugin install availability",
    needle: "connector-unavailable",
    guardedSignature: PLUGIN_INSTALL_AVAILABILITY_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_INSTALL_AVAILABILITY_PATCHED_SIGNATURE,
    applyReplacement: "$1$2=$3.length>0&&$4===$3.length&&$5?`disabled-by-admin`:null,$6;",
  },
  {
    id: "plugin-install-modal-content-26429",
    label: "Plugin install modal content",
    needle: PLUGIN_INSTALL_MODAL_CONTENT_NEEDLE,
    guardedSignature: PLUGIN_INSTALL_MODAL_CONTENT_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_INSTALL_MODAL_CONTENT_PATCHED_SIGNATURE,
    applyReplacement: "$1$2=$3,$4=($5?.apps.length??0)>0&&!1,$6;",
  },
  {
    id: "composer-plugin-mentions-26513",
    label: "Composer plugin mentions",
    needle: COMPOSER_PLUGIN_MENTIONS_NEEDLE,
    guardedSignature: COMPOSER_PLUGIN_MENTIONS_GUARDED_SIGNATURE,
    patchedSignature: COMPOSER_PLUGIN_MENTIONS_PATCHED_SIGNATURE,
    applyReplacement: "$1[]",
  },
  {
    id: "composer-plugin-mentions-26513-flagged",
    label: "Composer plugin mentions",
    needle: COMPOSER_PLUGIN_MENTIONS_NEEDLE,
    guardedSignature: COMPOSER_PLUGIN_MENTIONS_GUARDED_SIGNATURE_FLAGGED,
    patchedSignature: COMPOSER_PLUGIN_MENTIONS_PATCHED_SIGNATURE_FLAGGED,
    applyReplacement: "$1$2?[]:[]",
  },
);
