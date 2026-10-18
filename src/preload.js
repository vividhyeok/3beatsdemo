// Keep only URLs in the cache. Retaining Image objects also retains decoded
// bitmaps, which is especially expensive when a mobile browser starts again.
const ready=new Set();

function imageReady(url,signal){
 return new Promise((resolve,reject)=>{
  if(signal.aborted)return reject(new DOMException('Cancelled','AbortError'));
  const image=new Image();let done=false;
  const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);image.onload=image.onerror=null;if(error)reject(error);else resolve(image);};
  const abort=()=>{image.src='';finish(new DOMException('Cancelled','AbortError'));};
  const timer=setTimeout(()=>finish(Error('Image timeout: '+url)),12000);
  signal.addEventListener('abort',abort,{once:true});
  image.onload=()=>finish();image.onerror=()=>finish(Error('Image download failed: '+url));image.src=url;
 });
}

export async function preloadEssential(urls,signal,{onDiagnostic=console.warn}={}){
 const work=[...new Set(urls)].filter(url=>!ready.has(url));
 let cursor=0;
 async function run(){
  while(cursor<work.length){
   const url=work[cursor++];
   for(let attempt=0;attempt<2;attempt++){
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    try{
     const image=await imageReady(attempt?url+(url.includes('?')?'&':'?')+'retry=1':url,signal);
     try{await image.decode();}catch(error){
      onDiagnostic('decode failed; downloaded image remains usable',url,error);
      if(!image.naturalWidth)throw error;
     }
     if(signal.aborted)throw new DOMException('Cancelled','AbortError');
     ready.add(url);break;
    }catch(error){
     if(error.name==='AbortError')throw error;
     onDiagnostic('essential image attempt failed',url,attempt+1,error);
     if(attempt)throw Error('필수 이미지 로딩 실패: '+url,{cause:error});
    }
   }
  }
 }
 await Promise.all(Array.from({length:Math.min(2,work.length)},run));
}
