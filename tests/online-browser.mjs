import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {createOnlineServer} from '../server/online-server.mjs';

const browser=process.env.CHROME_PATH||(process.platform==='win32'
 ? [process.env.PROGRAMFILES+'/Google/Chrome/Application/chrome.exe',process.env['PROGRAMFILES(X86)']+'/Microsoft/Edge/Application/msedge.exe'].find(n=>fs.existsSync(n))
 : ['google-chrome','chromium','chromium-browser'].find(n=>spawnSync('which',[n]).status===0));
if(!browser)throw Error('Chromium is required for online browser test');
const server=createOnlineServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
let chrome,profile,rootSocket;const sockets=[];
function channel(ws){let seq=0;const pending=new Map();ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);if(message.error)p.reject(Error(JSON.stringify(message.error)));else p.resolve(message.result);}});return (method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function socket(url){const ws=new WebSocket(url);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});sockets.push(ws);return ws;}
async function tab(root,context){const {targetId}=await root('Target.createTarget',{url:'about:blank',browserContextId:context});let endpoint;for(let n=0;n<40;n++){const targets=await (await fetch('http://127.0.0.1:'+port+'/json')).json();endpoint=targets.find(t=>t.id===targetId)?.webSocketDebuggerUrl;if(endpoint)break;await delay(100);}if(!endpoint)throw Error('Browser tab not found');const call=channel(await socket(endpoint));await call('Page.enable');await call('Runtime.enable');return {call,async eval(expression){const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;},async goto(url){await call('Page.navigate',{url});},async until(expression){for(let n=0;n<200;n++){if(await this.eval(expression))return;await delay(100);}throw Error('Timed out: '+expression);},async click(selector){const point=await this.eval(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);if(!point)throw Error('Cannot click '+selector);await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});}};}
let port;
try{
 profile=fs.mkdtempSync(path.join(os.tmpdir(),'three-beats-online-chrome-'));
 chrome=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 for(let n=0;n<150;n++){try{port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);if(port)break;}catch{}await delay(100);}if(!port)throw Error('Chromium did not start');
 const version=await (await fetch('http://127.0.0.1:'+port+'/json/version')).json();rootSocket=await socket(version.webSocketDebuggerUrl);const root=channel(rootSocket);
 const aContext=(await root('Target.createBrowserContext')).browserContextId,bContext=(await root('Target.createBrowserContext')).browserContextId;
 const a=await tab(root,aContext),b=await tab(root,bContext);
 await a.goto(base+'/online.html');await a.until("!document.querySelector('#entry').hidden");await a.click('#create');await a.until("!document.querySelector('#lobby').hidden");const code=await a.eval("document.querySelector('#room-code').textContent");
 await b.goto(base+'/online.html?room='+code);await b.until("!document.querySelector('#entry').hidden");await b.click('#join');await b.until("!document.querySelector('#lobby').hidden");
 await a.until("!document.querySelector('#ready').disabled");await a.click('#ready');await b.click('#ready');await a.until("!document.querySelector('#game').hidden");await b.until("!document.querySelector('#game').hidden");
 for(const id of ['forward','focus','back'])await a.click('[data-card="'+id+'"]');
 for(const id of ['eve_aim','focus','back'])await b.click('[data-card="'+id+'"]');
 await a.click('#submit');await a.until("document.querySelector('#message').textContent.includes('상대')");
 if(!await b.eval("[...document.querySelectorAll('#enemy-queue span')].every(x=>x.textContent.includes('?'))"))throw Error('Opponent commands leaked');
 await b.click('#submit');await a.until("document.querySelector('#round').textContent.includes('ROUND 2')");await b.until("document.querySelector('#round').textContent.includes('ROUND 2')");
 const aHP=await a.eval("document.querySelector('#mine').textContent"),bEnemyHP=await b.eval("document.querySelector('#theirs').textContent");if(aHP.replace(/\s+/g,'')!==bEnemyHP.replace(/\s+/g,'').replace('RIVAL','YOU'))throw Error('Clients disagree on HP');
 await b.call('Page.reload',{ignoreCache:true});await b.until("!document.querySelector('#game').hidden && document.querySelector('#round').textContent.includes('ROUND 2')");
 const host=await a.eval("JSON.parse(sessionStorage.getItem('three-beats-online'))"),guest=await b.eval("JSON.parse(sessionStorage.getItem('three-beats-online'))");
 const queue=[{id:'focus'},{id:'forward'},{id:'back'}];
 let final;
 for(let n=0;n<9;n++){
  await fetch(base+'/api/online',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+host.token},body:JSON.stringify({action:'submit',code:host.code,queue})});
  const response=await fetch(base+'/api/online',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+guest.token},body:JSON.stringify({action:'submit',code:guest.code,queue})});final=await response.json();if(final.phase==='finished')break;
 }
 if(final.phase!=='finished')throw Error('Match did not finish');
 await a.until("!document.querySelector('#result').hidden");await b.until("!document.querySelector('#result').hidden");await a.click('#rematch');
 await a.until("!document.querySelector('#lobby').hidden");await b.until("!document.querySelector('#lobby').hidden");
 await a.click('#ready');await b.click('#ready');await a.until("!document.querySelector('#game').hidden && document.querySelector('#round').textContent.includes('ROUND 1')");
 await b.click('#leave');await a.until("document.querySelector('#message').textContent.includes('상대가 방을')");
 console.log('PASS: two isolated browsers completed hidden queues, synchronized results, reconnected, rematched and handled departure.');
}finally{
 for(const ws of sockets)try{ws.close();}catch{}chrome?.kill('SIGKILL');await new Promise(r=>server.close(r));
 if(profile&&path.dirname(path.resolve(profile))===path.resolve(os.tmpdir())&&path.basename(profile).startsWith('three-beats-online-chrome-'))for(let n=0;n<20;n++){try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:2,retryDelay:100});break;}catch(error){if(!['EPERM','EBUSY','ENOTEMPTY'].includes(error.code))throw error;if(n===19)console.warn('Browser profile cleanup deferred:',profile);else await delay(250);}}
}
