import { defineTargetSpecs } from "./builders.mts";

const PLUGINS_SIDEBAR_NEEDLE = "sidebarElectron.pluginsDisabledTooltip";
const PLUGINS_PAGE_CONTENT_NEEDLE = "skills.pluginsAuthBlockedToast.title";
const PLUGIN_DETAIL_AUTH_NEEDLE = "pluginDeepLinkAuthBlocked";
const PLUGIN_INSTALL_AVAILABILITY_NEEDLE = "plugins.install.connectorUnavailable";
const PLUGIN_INSTALL_MODAL_CONTENT_NEEDLE = "plugins.installModal.about";
const COMPOSER_PLUGIN_MENTIONS_NEEDLE = "composer.atMentionList.pluginsLoading";
const PLUGINS_CATALOG_VISIBILITY_NEEDLE = "openai-curated-marketplaces-hidden";
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
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26519 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=Li\(`533078438`\),([A-Za-z_$][\w$]*)=Cc\(\2\),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\3&&\4,([A-Za-z_$][\w$]*)=bs\(\{hostId:[^}]+\}\),([A-Za-z_$][\w$]*)=\6&&\7&&!\4([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26519 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=Li\(`533078438`\),([A-Za-z_$][\w$]*)=Cc\(\2\),([A-Za-z_$][\w$]*)=!1,([A-Za-z_$][\w$]*)=bs\(\{hostId:[^}]+\}\),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\7([,;])/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26527 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=xa\(`533078438`\),([A-Za-z_$][\w$]*)=wl\(\2\),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\3&&\4,([A-Za-z_$][\w$]*)=(mc\(\{hostId:[^}]+\}\)),([A-Za-z_$][\w$]*)=\6&&\7&&!\4([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26527 =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=xa\(`533078438`\),([A-Za-z_$][\w$]*)=wl\(\2\),([A-Za-z_$][\w$]*)=!1,([A-Za-z_$][\w$]*)=(mc\(\{hostId:[^}]+\}\)),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\7([,;])/;
const PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26527_HC =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=xa\(`533078438`\),([A-Za-z_$][\w$]*)=lc\(\2\),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\3&&\4,([A-Za-z_$][\w$]*)=(hc\(\{hostId:[^}]+\}\)),([A-Za-z_$][\w$]*)=\6&&\7&&!\4([,;])/;
const PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26527_HC =
  /(\{authMethod:([A-Za-z_$][\w$]*)\}=[^,]+,)([A-Za-z_$][\w$]*)=xa\(`533078438`\),([A-Za-z_$][\w$]*)=lc\(\2\),([A-Za-z_$][\w$]*)=!1,([A-Za-z_$][\w$]*)=(hc\(\{hostId:[^}]+\}\)),([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&\7([,;])/;
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
const PLUGIN_INSTALL_AVAILABILITY_AGGREGATE_GUARDED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=null;(return [A-Za-z_$][\w$]*&&[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\)\?\2=`disabled-by-admin`:![A-Za-z_$][\w$]*&&[A-Za-z_$][\w$]*\.length>0&&[A-Za-z_$][\w$]*===[A-Za-z_$][\w$]*\.length&&\(\2=[A-Za-z_$][\w$]*\?`disabled-by-admin`:)(`connector-unavailable`)(\),\{blockedReasonsByConnectorId:)/;
const PLUGIN_INSTALL_AVAILABILITY_AGGREGATE_PATCHED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=null;(return [A-Za-z_$][\w$]*&&[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\)\?\2=`disabled-by-admin`:![A-Za-z_$][\w$]*&&[A-Za-z_$][\w$]*\.length>0&&[A-Za-z_$][\w$]*===[A-Za-z_$][\w$]*\.length&&\(\2=[A-Za-z_$][\w$]*\?`disabled-by-admin`:)(null)(\),\{blockedReasonsByConnectorId:)/;
const PLUGIN_INSTALL_MODAL_CONTENT_GUARDED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)=\(([A-Za-z_$][\w$]*)\?\.apps\.length\?\?0\)>0&&\5\?\.summary\.authPolicy===`ON_INSTALL`,([A-Za-z_$][\w$]*);/;
const PLUGIN_INSTALL_MODAL_CONTENT_PATCHED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)=\(([A-Za-z_$][\w$]*)\?\.apps\.length\?\?0\)>0&&!1,([A-Za-z_$][\w$]*);/;
const PLUGIN_INSTALL_MODAL_CONTENT_PROP_GUARDED_SIGNATURE =
  /(disclosureData:([A-Za-z_$][\w$]*)\?[A-Za-z_$][\w$]*:void 0,[^]*?shouldShowInstallDisclosure:)\2(,showLockedComputerUseInstall:)/;
const PLUGIN_INSTALL_MODAL_CONTENT_PROP_PATCHED_SIGNATURE =
  /(disclosureData:([A-Za-z_$][\w$]*)\?[A-Za-z_$][\w$]*:void 0,[^]*?shouldShowInstallDisclosure:)!1(,showLockedComputerUseInstall:)/;
const PLUGIN_DETAIL_APP_CONNECT_FALLBACK_GUARDED_SIGNATURE =
  /function ([A-Za-z_$][\w$]*)\(\{directoryApps:([A-Za-z_$][\w$]*),pluginApps:([A-Za-z_$][\w$]*)\}\)\{let ([A-Za-z_$][\w$]*)=new Map\(\2\.map\(([A-Za-z_$][\w$]*)=>\[\5\.id,\5\]\)\);return \3\.map\(([A-Za-z_$][\w$]*)=>\4\.get\(\6\.id\)\)\.filter\(\6=>\6!=null\)\}/;
const PLUGIN_DETAIL_APP_CONNECT_FALLBACK_PATCHED_SIGNATURE =
  /function ([A-Za-z_$][\w$]*)\(\{directoryApps:([A-Za-z_$][\w$]*),pluginApps:([A-Za-z_$][\w$]*)\}\)\{let ([A-Za-z_$][\w$]*)=new Map\(\2\.map\(([A-Za-z_$][\w$]*)=>\[\5\.id,\5\]\)\);return \3\.map\(([A-Za-z_$][\w$]*)=>\4\.get\(\6\.id\)\?\?\{appMetadata:null,branding:null,description:\6\.description\?\?null,distributionChannel:null,id:\6\.id,installUrl:\6\.installUrl\?\?null,isAccessible:!1,isEnabled:!1,labels:null,logoUrl:\6\.logoUrl\?\?null,logoUrlDark:\6\.logoUrlDark\?\?null,name:\6\.name\?\?\6\.displayName\?\?\6\.id,pluginDisplayNames:\[\]\}\)\.filter\(\6=>\6\.id!=null\)\}/;
const PLUGIN_DETAIL_APP_CONNECT_ENRICHED_GUARDED_SIGNATURE =
  /(return [A-Za-z_$][\w$]*\.map\(([A-Za-z_$][\w$]*)=>\{let ([A-Za-z_$][\w$]*)=[^;]+;if\(\3==null\|\|\3\.name===\3\.id\)return )null(;let )/;
const PLUGIN_DETAIL_APP_CONNECT_ENRICHED_PATCHED_SIGNATURE =
  /(return [A-Za-z_$][\w$]*\.map\(([A-Za-z_$][\w$]*)=>\{let ([A-Za-z_$][\w$]*)=[^;]+;if\(\3==null\|\|\3\.name===\3\.id\)return )\{appMetadata:null,branding:null,description:\2\.description\?\?null,distributionChannel:null,id:\2\.id,installUrl:\2\.installUrl\?\?null,isAccessible:!1,isEnabled:!1,labels:null,logoUrl:\2\.logoUrl\?\?null,logoUrlDark:\2\.logoUrlDark\?\?null,name:\2\.name\?\?\2\.displayName\?\?\2\.id,pluginDisplayNames:\[\]\}(;let )/;
const PLUGIN_POST_INSTALL_APP_CONNECT_FALLBACK_GUARDED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=await ([A-Za-z_$][\w$]*)\(\{authPolicy:([A-Za-z_$][\w$]*)\.authPolicy,codexHome:([A-Za-z_$][\w$]*),hostId:([A-Za-z_$][\w$]*),plugin:([A-Za-z_$][\w$]*),queryClient:([A-Za-z_$][\w$]*),windowType:`electron`\}\);if\(/;
const PLUGIN_POST_INSTALL_APP_CONNECT_FALLBACK_PATCHED_SIGNATURE =
  /(let )([A-Za-z_$][\w$]*)=await ([A-Za-z_$][\w$]*)\(\{authPolicy:([A-Za-z_$][\w$]*)\.authPolicy,codexHome:([A-Za-z_$][\w$]*),hostId:([A-Za-z_$][\w$]*),plugin:([A-Za-z_$][\w$]*),queryClient:([A-Za-z_$][\w$]*),windowType:`electron`\}\),codexfastAppsNeedingAuth=\4\.appsNeedingAuth\.length>0\?\4\.appsNeedingAuth:\(\7\.plugin\.apps\?\?\[\]\)\.map\([A-Za-z_$][\w$]*=>\(\{appMetadata:null,branding:null,description:[A-Za-z_$][\w$]*\.description\?\?null,distributionChannel:null,id:[A-Za-z_$][\w$]*\.id,installUrl:[A-Za-z_$][\w$]*\.installUrl\?\?null,isAccessible:!1,isEnabled:!1,labels:null,logoUrl:[A-Za-z_$][\w$]*\.logoUrl\?\?null,logoUrlDark:[A-Za-z_$][\w$]*\.logoUrlDark\?\?null,name:[A-Za-z_$][\w$]*\.name\?\?[A-Za-z_$][\w$]*\.displayName\?\?[A-Za-z_$][\w$]*\.id,pluginDisplayNames:\[\]\}\)\);if\(/;
const PLUGIN_POST_INSTALL_APP_CONNECT_FLOW_GUARDED_SIGNATURE =
  /(if\([A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\),)([A-Za-z_$][\w$]*)\.authPolicy===`ON_USE`\|\|\2\.appsNeedingAuth\.length===0&&([A-Za-z_$][\w$]*)\.length===0(\)\{)/;
const PLUGIN_POST_INSTALL_APP_CONNECT_FLOW_PATCHED_SIGNATURE =
  /(if\([A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\),)codexfastAppsNeedingAuth\.length===0&&([A-Za-z_$][\w$]*)\.length===0(\)\{)/;
const PLUGIN_POST_INSTALL_APP_CONNECT_APPS_GUARDED_SIGNATURE =
  /(([A-Za-z_$][\w$]*)\(\{apps:)([A-Za-z_$][\w$]*)\.appsNeedingAuth(,browserExtensions:)/;
const PLUGIN_POST_INSTALL_APP_CONNECT_APPS_PATCHED_SIGNATURE =
  /(([A-Za-z_$][\w$]*)\(\{apps:)codexfastAppsNeedingAuth(,browserExtensions:)/;
const PLUGIN_POST_INSTALL_APP_CONNECT_AUTO_OPEN_GUARDED_SIGNATURE =
  /(connectingAppId:)([A-Za-z_$][\w$]*)\.authPolicy===`ON_INSTALL`&&\2\.appsNeedingAuth\.length===1&&([A-Za-z_$][\w$]*)\.length===0\?\2\.appsNeedingAuth\[0\]\.id:void 0/;
const PLUGIN_POST_INSTALL_APP_CONNECT_AUTO_OPEN_PATCHED_SIGNATURE =
  /(connectingAppId:)\(([A-Za-z_$][\w$]*)\.authPolicy===`ON_INSTALL`\|\|\2\.authPolicy===`ON_USE`\)&&codexfastAppsNeedingAuth\.length===1&&([A-Za-z_$][\w$]*)\.length===0\?codexfastAppsNeedingAuth\[0\]\.id:void 0/;
const COMPOSER_PLUGIN_MENTIONS_GUARDED_SIGNATURE =
  /(additionalMarketplaceKinds:)\[`shared-with-me`\]/;
const COMPOSER_PLUGIN_MENTIONS_PATCHED_SIGNATURE =
  /(additionalMarketplaceKinds:)\[\]/;
const COMPOSER_PLUGIN_MENTIONS_GUARDED_SIGNATURE_FLAGGED =
  /(additionalMarketplaceKinds:)([A-Za-z_$][\w$]*)\?\[`shared-with-me`\]:\[\]/;
const COMPOSER_PLUGIN_MENTIONS_PATCHED_SIGNATURE_FLAGGED =
  /(additionalMarketplaceKinds:)([A-Za-z_$][\w$]*)\?\[\]:\[\]/;
const SHARED_PLUGIN_PREFETCH_GUARDED_SIGNATURE =
  /(\{enabled:)([A-Za-z_$][\w$]*)(,additionalMarketplaceKinds:)\[`shared-with-me`\](\}\),[A-Za-z_$][\w$]*\(\{enabled:)\2(,hostId:[A-Za-z_$][\w$]*,marketplaceKind:`shared-with-me`\}\),)/;
const SHARED_PLUGIN_PREFETCH_PATCHED_SIGNATURE =
  /(\{enabled:)([A-Za-z_$][\w$]*)(,additionalMarketplaceKinds:)\[\](\}\),[A-Za-z_$][\w$]*\(\{enabled:)!1(,hostId:[A-Za-z_$][\w$]*,marketplaceKind:`shared-with-me`\}\),)/;
const PLUGINS_CATALOG_VISIBILITY_GUARDED_SIGNATURE =
  /function ([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\)\{return \2!==`chatgpt`\}/;
const PLUGINS_CATALOG_VISIBILITY_PATCHED_SIGNATURE =
  /function ([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\)\{return !1\}/;
const PLUGINS_CATALOG_MARKETPLACE_FILTER_GUARDED_SIGNATURE =
  /(,)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*);([A-Za-z_$][\w$]*)\?\2=([A-Za-z_$][\w$]*):([A-Za-z_$][\w$]*)&&\(\2=([A-Za-z_$][\w$]*)\);(let [A-Za-z_$][\w$]*=Ae\()/;
const PLUGINS_CATALOG_MARKETPLACE_FILTER_PATCHED_SIGNATURE =
  /(,)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*);([A-Za-z_$][\w$]*)\?\2=\3:([A-Za-z_$][\w$]*)&&\(\2=\3\);(let [A-Za-z_$][\w$]*=Ae\()/;
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
    id: "plugins-access-26519",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26519,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26519,
    applyReplacement: "$1$3=Li(`533078438`),$4=Cc($2),$5=!1,$7=bs({hostId:Tt}),$8=$6&&$7$9",
  },
  {
    id: "plugins-access-26527",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26527,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26527,
    applyReplacement: "$1$3=xa(`533078438`),$4=wl($2),$5=!1,$7=$8,$9=$6&&$7$10",
  },
  {
    id: "plugins-access-26527-hc",
    label: "Plugins access",
    needle: PLUGINS_SIDEBAR_NEEDLE,
    guardedSignature: PLUGINS_SIDEBAR_GUARDED_SIGNATURE_26527_HC,
    patchedSignature: PLUGINS_SIDEBAR_PATCHED_SIGNATURE_26527_HC,
    applyReplacement: "$1$3=xa(`533078438`),$4=lc($2),$5=!1,$7=$8,$9=$6&&$7$10",
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
    id: "plugin-install-availability-aggregate-26611",
    label: "Plugin install availability",
    needle: "connector-unavailable",
    guardedSignature: PLUGIN_INSTALL_AVAILABILITY_AGGREGATE_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_INSTALL_AVAILABILITY_AGGREGATE_PATCHED_SIGNATURE,
    applyReplacement: "$1$2=null;$3null$5",
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
    id: "plugin-install-modal-content-prop-26601",
    label: "Plugin install modal content",
    needle: PLUGIN_INSTALL_MODAL_CONTENT_NEEDLE,
    guardedSignature: PLUGIN_INSTALL_MODAL_CONTENT_PROP_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_INSTALL_MODAL_CONTENT_PROP_PATCHED_SIGNATURE,
    applyReplacement: "$1!1$3",
  },
  {
    id: "plugin-detail-app-connect-fallback-26601",
    label: "Plugin detail app connect",
    needle: "directoryApps",
    guardedSignature: PLUGIN_DETAIL_APP_CONNECT_FALLBACK_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_DETAIL_APP_CONNECT_FALLBACK_PATCHED_SIGNATURE,
    applyReplacement:
      "function $1({directoryApps:$2,pluginApps:$3}){let $4=new Map($2.map($5=>[$5.id,$5]));return $3.map($6=>$4.get($6.id)??{appMetadata:null,branding:null,description:$6.description??null,distributionChannel:null,id:$6.id,installUrl:$6.installUrl??null,isAccessible:!1,isEnabled:!1,labels:null,logoUrl:$6.logoUrl??null,logoUrlDark:$6.logoUrlDark??null,name:$6.name??$6.displayName??$6.id,pluginDisplayNames:[]}).filter($6=>$6.id!=null)}",
  },
  {
    id: "plugin-detail-app-connect-enriched-26611",
    label: "Plugin detail app connect",
    needle: "directoryApps",
    guardedSignature: PLUGIN_DETAIL_APP_CONNECT_ENRICHED_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_DETAIL_APP_CONNECT_ENRICHED_PATCHED_SIGNATURE,
    applyReplacement:
      "$1{appMetadata:null,branding:null,description:$2.description??null,distributionChannel:null,id:$2.id,installUrl:$2.installUrl??null,isAccessible:!1,isEnabled:!1,labels:null,logoUrl:$2.logoUrl??null,logoUrlDark:$2.logoUrlDark??null,name:$2.name??$2.displayName??$2.id,pluginDisplayNames:[]}$4",
  },
  {
    id: "plugin-post-install-app-connect-fallback-26601",
    label: "Plugin post-install app connect",
    needle: "appsNeedingAuth",
    guardedSignature: PLUGIN_POST_INSTALL_APP_CONNECT_FALLBACK_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_POST_INSTALL_APP_CONNECT_FALLBACK_PATCHED_SIGNATURE,
    applyReplacement:
      "$1$2=await $3({authPolicy:$4.authPolicy,codexHome:$5,hostId:$6,plugin:$7,queryClient:$8,windowType:`electron`}),codexfastAppsNeedingAuth=$4.appsNeedingAuth.length>0?$4.appsNeedingAuth:($7.plugin.apps??[]).map(e=>({appMetadata:null,branding:null,description:e.description??null,distributionChannel:null,id:e.id,installUrl:e.installUrl??null,isAccessible:!1,isEnabled:!1,labels:null,logoUrl:e.logoUrl??null,logoUrlDark:e.logoUrlDark??null,name:e.name??e.displayName??e.id,pluginDisplayNames:[]}));if(",
  },
  {
    id: "plugin-post-install-app-connect-flow-26601",
    label: "Plugin post-install app connect",
    needle: "appsNeedingAuth",
    guardedSignature: PLUGIN_POST_INSTALL_APP_CONNECT_FLOW_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_POST_INSTALL_APP_CONNECT_FLOW_PATCHED_SIGNATURE,
    applyReplacement: "$1codexfastAppsNeedingAuth.length===0&&$3.length===0$4",
  },
  {
    id: "plugin-post-install-app-connect-apps-26601",
    label: "Plugin post-install app connect",
    needle: "appsNeedingAuth",
    guardedSignature: PLUGIN_POST_INSTALL_APP_CONNECT_APPS_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_POST_INSTALL_APP_CONNECT_APPS_PATCHED_SIGNATURE,
    applyReplacement: "$1codexfastAppsNeedingAuth$4",
  },
  {
    id: "plugin-post-install-app-connect-auto-open-26601",
    label: "Plugin post-install app connect",
    needle: "appsNeedingAuth",
    guardedSignature: PLUGIN_POST_INSTALL_APP_CONNECT_AUTO_OPEN_GUARDED_SIGNATURE,
    patchedSignature: PLUGIN_POST_INSTALL_APP_CONNECT_AUTO_OPEN_PATCHED_SIGNATURE,
    applyReplacement:
      "$1($2.authPolicy===`ON_INSTALL`||$2.authPolicy===`ON_USE`)&&codexfastAppsNeedingAuth.length===1&&$3.length===0?codexfastAppsNeedingAuth[0].id:void 0",
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
  {
    id: "shared-plugin-marketplace-prefetch-26601",
    label: "Composer plugin mentions",
    needle: "additionalMarketplaceKinds",
    guardedSignature: SHARED_PLUGIN_PREFETCH_GUARDED_SIGNATURE,
    patchedSignature: SHARED_PLUGIN_PREFETCH_PATCHED_SIGNATURE,
    applyReplacement: "$1$2$3[]$4!1$5",
  },
  {
    id: "plugins-catalog-visibility-26601",
    label: "Plugins catalog visibility",
    needle: PLUGINS_CATALOG_VISIBILITY_NEEDLE,
    guardedSignature: PLUGINS_CATALOG_VISIBILITY_GUARDED_SIGNATURE,
    patchedSignature: PLUGINS_CATALOG_VISIBILITY_PATCHED_SIGNATURE,
    applyReplacement: "function $1($2){return !1}",
  },
  {
    id: "plugins-catalog-marketplace-filter-26609",
    label: "Plugins catalog visibility",
    needle: PLUGINS_CATALOG_VISIBILITY_NEEDLE,
    guardedSignature: PLUGINS_CATALOG_MARKETPLACE_FILTER_GUARDED_SIGNATURE,
    patchedSignature: PLUGINS_CATALOG_MARKETPLACE_FILTER_PATCHED_SIGNATURE,
    applyReplacement: "$1$2=$3;$4?$2=$3:$6&&($2=$3);$8",
  },
);
