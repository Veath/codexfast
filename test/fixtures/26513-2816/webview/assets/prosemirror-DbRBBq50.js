function La(e){let t=(0,W.c)(7),{hostId:n,query:r,roots:i}=e,a=k(),{platform:o}=P(),s;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(s={additionalMarketplaceKinds:[`shared-with-me`]},t[0]=s):s=t[0];let{availablePlugins:c,isLoading:l}=te(n,i,s),u=r.trim();return l&&c.length===0?`composer.atMentionList.pluginsLoading`:`composer.atMentionList.plugins:${u}:${a}:${o}`}
export{La as L};
