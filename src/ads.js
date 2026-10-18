import {AD_CONFIG} from './ad-config.js';

const valid=AD_CONFIG.enabled&&/^ca-pub-\d{16}$/.test(AD_CONFIG.client)&&/^\d+$/.test(AD_CONFIG.menuSlot)&&/^\d+$/.test(AD_CONFIG.resultSlot);
let script=null;
function loadScript(){
 if(script)return script;
 script=new Promise((resolve,reject)=>{
  const tag=document.createElement('script');tag.async=true;tag.crossOrigin='anonymous';tag.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+AD_CONFIG.client;
  tag.onload=resolve;tag.onerror=()=>reject(Error('AdSense script failed to load'));document.head.append(tag);
 });return script;
}
export async function showAd(screen){
 if(!valid||!['menu','result'].includes(screen))return;
 const container=document.querySelector('#'+screen+'-ad');if(!container||container.dataset.loaded)return;
 container.hidden=false;container.dataset.loaded='loading';
 const ins=document.createElement('ins');ins.className='adsbygoogle';ins.style.display='block';ins.dataset.adClient=AD_CONFIG.client;ins.dataset.adSlot=screen==='menu'?AD_CONFIG.menuSlot:AD_CONFIG.resultSlot;ins.dataset.adFormat='auto';ins.dataset.fullWidthResponsive='true';container.append(ins);
 try{await loadScript();(window.adsbygoogle=window.adsbygoogle||[]).push({});container.dataset.loaded='yes';}
 catch(error){console.warn('[THREE BEATS ads]',error);container.replaceChildren();container.hidden=true;delete container.dataset.loaded;}
}
