// Dependency-free real Chromium click-through smoke test for the demo.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import os from "node:os";
import {spawn,spawnSync} from "node:child_process";
import {setTimeout as delay} from "node:timers/promises";
const root=process.cwd(),mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png"};
const browser=process.platform==="win32"
 ? [process.env.PROGRAMFILES+"/Google/Chrome/Application/chrome.exe",process.env["PROGRAMFILES(X86)"]+"/Microsoft/Edge/Application/msedge.exe"].find(n=>fs.existsSync(n))
 : ["google-chrome","chromium","chromium-browser"].find(n=>spawnSync("which",[n]).status===0);
if(!browser)throw Error("Chromium is required for browser smoke test");
const server=http.createServer((req,res)=>{
 let rel=decodeURIComponent((req.url||"/").split("?")[0]);if(rel==="/")rel="/index.html";
 const file=path.resolve(root,"."+rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});res.end(bytes);});
});
let chrome=null,ws=null;
const port=9341;
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const pageUrl="http://127.0.0.1:"+server.address().port+"/";
try{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),"three-beats-chrome-"));
 chrome=spawn(browser,["--headless=new","--window-size=1440,1080","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--no-first-run","--no-default-browser-check","--remote-debugging-port="+port,"--user-data-dir="+profile,"about:blank"],{stdio:"ignore"});
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
 let ready=false;
 for(let i=0;i<75;i++){
  try{if(await evaluate("document.querySelectorAll('[data-card]').length===11 && document.querySelectorAll('[data-tile]').length===12")){ready=true;break;}}catch{}
  await delay(120);
 }
 if(!ready)throw Error("UI did not render cards and board");
 const images=await evaluate("Promise.all([...document.images].map(img=>img.decode().then(()=>true,()=>false)))");
 if(images.some(loaded=>!loaded))throw Error("An illustration failed to load");
 const initial=await evaluate("({cards:document.querySelectorAll('[data-card]').length,tiles:document.querySelectorAll('[data-tile]').length,enemy:document.querySelector('#enemy-name').textContent})");
 console.log("Rendered UI:",JSON.stringify(initial));
 await evaluate("document.querySelector('[data-card=\"forward\"]').click();document.querySelector('[data-card=\"jack_jab\"]').click();document.querySelector('[data-card=\"focus\"]').click()");
 const count=await evaluate("document.querySelector('#queue-count').textContent");
 if(count!=="3/3")throw Error("Cards could not be queued: "+count);
 if(await evaluate("document.querySelector('#execute').disabled"))throw Error("Execute button unexpectedly disabled");
 await evaluate("document.querySelector('#execute').click()");
 let advanced=false;
 for(let i=0;i<65;i++){
  await delay(130);
  if(await evaluate("document.querySelector('#round-counter').textContent.includes('ROUND 2') || !document.querySelector('#result-panel').hidden")){advanced=true;break;}
 }
 if(!advanced){
  const error=await evaluate("document.querySelector('#toast').textContent");
  throw Error("Round did not finish: "+error);
 }
 const details=await evaluate("({round:document.querySelector('#round-counter').textContent,log:document.querySelectorAll('.log-entry').length,queued:document.querySelector('#queue-count').textContent})");
 console.log("Completed full turn:",JSON.stringify(details));
 fs.mkdirSync("artifacts",{recursive:true});
 const shot=await call("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
 fs.writeFileSync("artifacts/demo-preview.png",Buffer.from(shot.data,"base64"));
 console.log("Saved artifacts/demo-preview.png");
}finally{
 try{ws?.close();}catch{}
 try{chrome?.kill("SIGKILL");}catch{}
 await new Promise(resolve=>server.close(resolve));
}
