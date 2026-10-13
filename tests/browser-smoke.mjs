// Dependency-free real Chromium click-through smoke test for the demo.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import os from "node:os";
import {spawn,spawnSync} from "node:child_process";
import {setTimeout as delay} from "node:timers/promises";
const root=process.cwd(),mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".json":"application/json"};
const browser=process.platform==="win32"
 ? [process.env.PROGRAMFILES+"/Google/Chrome/Application/chrome.exe",process.env["PROGRAMFILES(X86)"]+"/Microsoft/Edge/Application/msedge.exe"].find(n=>fs.existsSync(n))
 : ["google-chrome","chromium","chromium-browser"].find(n=>spawnSync("which",[n]).status===0);
if(!browser)throw Error("Chromium is required for browser smoke test");
const server=http.createServer((req,res)=>{
 let rel=decodeURIComponent((req.url||"/").split("?")[0]);if(rel==="/")rel="/index.html";
 if(rel==="/tests/combat-fixture.html"){res.writeHead(200,{"Content-Type":"text/html"});res.end(fs.readFileSync(path.join(root,"index.html"),"utf8").replace('src="src/app.js"','src="/tests/browser-fixture.js"').replace('<head>','<head><base href="/">'));return;}
 const file=path.resolve(root,"."+rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});res.end(bytes);});
});
let chrome=null,ws=null,profile=null;
const port=9341;
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const pageUrl="http://127.0.0.1:"+server.address().port+"/";
try{
 profile=fs.mkdtempSync(path.join(os.tmpdir(),"three-beats-chrome-"));
 chrome=spawn(browser,["--headless=new","--window-size=1440,1080","--no-sandbox","--disable-gpu","--disable-background-networking","--disk-cache-size=10485760","--media-cache-size=10485760","--disable-dev-shm-usage","--no-first-run","--no-default-browser-check","--remote-debugging-port="+port,"--user-data-dir="+profile,"about:blank"],{stdio:"ignore"});
 let target;
 for(let i=0;i<60;i++){
  try{const tabs=await (await fetch("http://127.0.0.1:"+port+"/json")).json();target=tabs.find(t=>t.type==="page");if(target)break;}catch{}
  await delay(150);
 }
 if(!target)throw Error("Could not connect to headless Chromium");
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",reject,{once:true});});
 let seq=0;const pending=new Map();
 ws.addEventListener("message",ev=>{
  const msg=JSON.parse(ev.data);
  if(msg.id&&pending.has(msg.id)){
   const p=pending.get(msg.id);pending.delete(msg.id);
   if(msg.error)p.reject(Error(JSON.stringify(msg.error)));else p.resolve(msg.result);
  }
 });
 function call(method,params={}){
  return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 }
 async function evaluate(expression){
  const x=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(x.exceptionDetails)throw Error("Browser JS exception: "+JSON.stringify(x.exceptionDetails));
  return x.result.value;
 }
 await call("Page.enable");await call("Runtime.enable");await call("Page.navigate",{url:pageUrl});

 const errors=[];ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);if(m.method==="Runtime.exceptionThrown")errors.push(m.params.exceptionDetails.text);});
 async function until(expression,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){if(await evaluate(expression))return;await delay(60);}throw Error("Timed out: "+expression+" / "+JSON.stringify(await evaluate("({toast:document.querySelector('#toast').textContent,phase:document.querySelector('#phase-label').textContent})")));}
 async function click(selector){
  const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled||el.getBoundingClientRect().width===0)return null;el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return hit&&(hit===el||el.contains(hit))?{x,y}:null;})()`);
  if(!point)throw Error("Cannot click "+selector);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
 }
 async function screenshot(name){await evaluate('window.scrollTo(0,0)');fs.mkdirSync("artifacts",{recursive:true});const shot=await call("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});fs.writeFileSync("artifacts/"+name+".png",Buffer.from(shot.data,"base64"));}
 async function loaded(){const bad=await evaluate("Promise.all([...document.querySelectorAll('img[src]')].filter(i=>i.getBoundingClientRect().width>0).map(i=>i.decode().then(()=>null,()=>i.src)))");if(bad.some(Boolean))throw Error("Broken images: "+bad.filter(Boolean));}
 async function layout(width,height,mobile=false){await call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile});await delay(100);const overflow=await evaluate("document.documentElement.scrollWidth>innerWidth+1");if(overflow)throw Error("Horizontal overflow at "+width+"x"+height);}
 await until("!document.querySelector('#menu-screen').hidden");await screenshot("main-menu");
 await call("Input.dispatchKeyEvent",{type:"keyDown",key:"Tab",code:"Tab",windowsVirtualKeyCode:9});await call("Input.dispatchKeyEvent",{type:"keyUp",key:"Tab",code:"Tab",windowsVirtualKeyCode:9});
 if(!await evaluate("document.activeElement.tagName==='BUTTON'"))throw Error("Menu keyboard focus is missing");
 await click('[data-action="options"]');await until("document.querySelector('#options-dialog').open");await evaluate("document.querySelector('#arena-option').value='arena_alt';document.querySelector('#arena-option').dispatchEvent(new Event('change'));document.querySelector('#sound-option').checked=false;document.querySelector('#sound-option').dispatchEvent(new Event('change'));document.querySelector('#options-dialog').close()");
 await click('[data-action="characters"]');await until("!document.querySelector('#select-screen').hidden");await loaded();await screenshot("character-select");
 for(const id of ['jack','eve','raven','zeta']){await click('[data-pick-player="'+id+'"]');if(!await evaluate(`document.querySelector('[data-pick-player="${id}"]').getAttribute('aria-pressed')==='true'`))throw Error('Fighter selection failed');}
 await layout(390,844,true);await loaded();await screenshot('character-select-mobile');await layout(1440,1080);
 await click('[data-pick-player="jack"]');await evaluate("document.querySelector('#difficulty').value='easy';document.querySelector('#difficulty').dispatchEvent(new Event('change'))");await click('[data-action="fight"]');await until("document.querySelector('#phase-label').textContent==='PLANNING'",25000);await loaded();
 // Every manifest image decodes, including reference-only UI buttons.
 const badAssets=await evaluate("(async()=>{const {ASSETS}=await import('/src/assets.js');return (await Promise.all(Object.values(ASSETS).map(async src=>{try{const i=new Image();i.src=src;await i.decode();return null;}catch{return src;}}))).filter(Boolean)})()");if(badAssets.length)throw Error('Asset failures: '+badAssets);
 await click('[data-card="forward"]');await click('[data-card="jack_jab"]');await click('[data-card="focus"]');await click('[data-remove="1"]');if(await evaluate("document.querySelector('#queue-count').textContent")!=='2/3')throw Error('One-click removal failed');await click('[data-card="jack_jab"]');
 if(await evaluate("document.querySelectorAll('#enemy-reveal .facedown').length")!==3)throw Error('Enemy cards leaked before execution');
 await screenshot('battle-planning');await click('[data-action="execute"]');await until("document.querySelector('#battle-stage').dataset.phase==='MOVE'");
 if(await evaluate("document.querySelectorAll('#enemy-reveal .open').length")!==1)throw Error('Future beat leaked');
 await click('[data-action="pause"]');const paused=await evaluate("document.querySelector('#battle-stage').dataset.phase");await delay(450);if(await evaluate("document.querySelector('#battle-stage').dataset.phase")!==paused)throw Error('Pause advanced playback');await click('[data-action="resume"]');await click('[data-action="speed"]');await click('[data-action="skip"]');await until("document.querySelector('#round-counter').textContent.includes('ROUND 2') && document.querySelector('#phase-label').textContent==='PLANNING'");
 await loaded();await screenshot('demo-preview');
 for(const size of [[390,844,true],[844,390,true],[768,1024,false],[1440,900,false]]){await layout(...size);await loaded();await screenshot('battle-'+size[0]+'x'+size[1]);}
 await layout(1440,1080);
 // Cancel during a running round, then check no stale callback changes a new screen.
 for(const id of ['focus','guard','forward'])await click('[data-card="'+id+'"]');await click('[data-action="execute"]');await until("document.querySelector('#battle-stage').dataset.phase==='REVEAL'");await click('#battle-screen [data-action="menu"]');await delay(500);if(!await evaluate("!document.querySelector('#menu-screen').hidden && document.querySelector('#fx-layer').children.length===0"))throw Error('Stale playback after menu navigation');
 // Exercise directional and trap input through the real app for the other fighters.
 for(const id of ['eve','raven','zeta']){await click('[data-action="start"]');await click('[data-pick-player="'+id+'"]');await click('[data-action="fight"]');await until("document.querySelector('#phase-label').textContent==='PLANNING' && document.querySelector('#versus-overlay').hidden",25000);if(id==='raven'){await click('[data-card="focus"]');await click('[data-card="raven_trap"]');await click('[data-tile="1,1"]');await click('[data-card="raven_ult"]');}else if(id==='zeta'){await click('[data-card="zeta_slide"]');await click('[data-dir="up"]');await click('[data-card="focus"]');await click('[data-card="guard"]');}else{await click('[data-card="eve_pierce"]');await click('[data-card="focus"]');await click('[data-card="guard"]');}await click('[data-action="execute"]');await click('[data-action="skip"]');await until("document.querySelector('#round-counter').textContent.includes('ROUND 2') && document.querySelector('#phase-label').textContent==='PLANNING'");await click('#battle-screen [data-action="menu"]');}
 // Finish a real AI match and rematch through production screen transitions.
 await click('[data-action="start"]');await click('[data-pick-player="jack"]');await click('[data-action="fight"]');await until("document.querySelector('#phase-label').textContent==='PLANNING' && document.querySelector('#versus-overlay').hidden",25000);
 for(let turn=0;turn<10;turn++){for(const id of ['focus','guard','forward'])await click('[data-card="'+id+'"]');await click('[data-action="execute"]');await click('[data-action="skip"]');await until("!document.querySelector('#result-screen').hidden || (document.querySelector('#phase-label').textContent==='PLANNING' && document.querySelector('#queue-count').textContent==='0/3')");if(await evaluate("!document.querySelector('#result-screen').hidden"))break;}
 if(!await evaluate("!document.querySelector('#result-screen').hidden"))throw Error('AI match did not finish');await loaded();await screenshot('live-match-result');await click('#result-screen [data-action="reset"]');await until("document.querySelector('#phase-label').textContent==='PLANNING' && document.querySelector('#versus-overlay').hidden",25000);if(await evaluate("document.querySelector('#round-counter').textContent")!=='ROUND 1 / 10')throw Error('Rematch failed');
 // Production engine + renderer fixtures: exact geometry and deterministic outcomes.
 await call('Page.navigate',{url:pageUrl+'tests/combat-fixture.html'});await until('window.fixtureReady===true');
 for(const name of ['direct','graze','miss','guard','push','move','trap','win','defeat','draw']){
  const state=await evaluate(`window.fixture.load(${JSON.stringify(name)}).state`);await loaded();await evaluate('window.fixture.play();true');
  await until("(()=>{if(document.querySelector('#battle-stage').dataset.phase==='IMPACT'){window.fixture.pause();return true;}return false;})()");if(['direct','graze','miss','guard'].includes(name)){await loaded();await screenshot('combat-'+name);const text=await evaluate("document.querySelector('#fx-layer').textContent");if(name==='miss'&&!text.includes('MISS'))throw Error('MISS feedback absent');if(name==='guard'&&!text.includes('GUARD'))throw Error('GUARD feedback absent');}
  await evaluate('window.fixture.resume()');await until('window.fixture.done');const records=await evaluate('window.fixture.records');for(const record of records)if(record.open!==record.beat-(record.phase==='REVEAL'?1:0))throw Error('Reveal timing wrong: '+JSON.stringify(record));
  const finalHP=await evaluate("document.querySelector('#enemy-stat').textContent");if(!finalHP.startsWith(state.fighters[1].hp+'/'))throw Error('Rendered HP differs from engine');
  if(['win','defeat','draw'].includes(name)){const outcome=await evaluate('window.fixture.result');if(outcome!==({win:0,defeat:1,draw:-1}[name]))throw Error('Wrong result '+name);await loaded();await evaluate("Promise.all(document.querySelector('#result-winner').getAnimations().map(a=>a.finished))");await screenshot('result-'+name);await layout(390,844,true);await screenshot('result-'+name+'-mobile');await layout(1440,1080);}
 }
 if(errors.length)throw Error('Browser errors: '+errors.join(', '));console.log('PASS: menu, keyboard, 4 fighters, all 76 assets, queue removal, secret reveals, pause/2x/skip/cancel, 4 viewport sizes, HIT/GRAZE/MISS/GUARD/push/trap/movement, win/defeat/draw.');
}finally{
 try{ws?.close();}catch{}
 try{chrome?.kill("SIGKILL");}catch{}
 await new Promise(resolve=>server.close(resolve));
 if(profile&&path.dirname(path.resolve(profile))===path.resolve(os.tmpdir())&&path.basename(profile).startsWith("three-beats-chrome-")){
  await delay(250);fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
}
