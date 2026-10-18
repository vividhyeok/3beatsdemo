import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {OnlineRooms} from './online-core.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
export function createOnlineServer({rooms=new OnlineRooms()}={}){
 const hits=new Map();
 return http.createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/online/status'){send(200,{available:true});return;}
   if(url.pathname==='/api/online'){
    const ip=req.socket.remoteAddress,now=Date.now(),rate=hits.get(ip)||{at:now,count:0};if(now-rate.at>60_000){rate.at=now;rate.count=0;}hits.set(ip,rate);if(++rate.count>240){send(429,{error:'요청이 너무 많습니다.'});return;}
    const key=url.searchParams.get('code'),secret=req.headers.authorization?.replace(/^Bearer /,'');
    if(req.method==='GET'){send(200,rooms.snapshot(key,secret));return;}
    if(req.method!=='POST'){send(405,{error:'허용되지 않은 요청입니다.'});return;}
    let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw Object.assign(Error('요청이 너무 큽니다.'),{status:413});}
    const data=JSON.parse(body||'{}');let result;
    if(data.action==='create')result=rooms.create();
    else if(data.action==='join')result=rooms.join(data.code);
    else result=rooms.update(data.code,secret,data);
    send(200,result);return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
   const rel=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),file=path.resolve(root,'.'+rel);
   if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   const stat=fs.statSync(file);if(!stat.isFile())throw Object.assign(Error('Not found'),{status:404});
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'.html .js .css'.split(' ').includes(path.extname(file))?'no-cache':'public, max-age=86400'});
   if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch(e){if(req.url?.startsWith('/api/'))send(e.status||500,{error:e.status?e.message:'서버 오류가 발생했습니다.'});else res.writeHead(e.status||404).end();}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||8080);createOnlineServer().listen(port,()=>console.log('THREE BEATS online server listening on http://localhost:'+port));
}
