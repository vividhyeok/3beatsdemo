// Engine-resolved first-beat sweep for legal positions and action pairs.
import fs from 'node:fs';
import zlib from 'node:zlib';
import {once} from 'node:events';
import {CHARACTERS,CARD_MAP,deckOf,newGame,options,validateQueue,resolveRound} from '../src/game.js';

const limitArg=process.argv.find(x=>x.startsWith('--limit='));
const limit=limitArg?Number(limitArg.split('=')[1]):Infinity;
const ids=Object.keys(CHARACTERS),padding=[{id:'forward'},{id:'forward'}];
const output=fs.createWriteStream('docs/balance/one-beat-cases.ndjson.gz');
const gzip=zlib.createGzip({level:6});gzip.pipe(output);
let count=0,skipped=0,damage=[0,0],collisions=0,swaps=0,misses=0;
const key=(a)=>a.id+(a.direction?':'+a.direction:'')+(a.target?':'+a.target.x+','+a.target.y:'');
outer:for(const p of ids)for(const e of ids)for(let py=0;py<3;py++)for(let px=0;px<4;px++)for(let ey=0;ey<3;ey++)for(let ex=0;ex<4;ex++){
 if(px===ex&&py===ey)continue;
 const s=newGame(p,e);Object.assign(s.fighters[0],{x:px,y:py,en:100});Object.assign(s.fighters[1],{x:ex,y:ey,en:100});
 const actions=[0,1].map(i=>deckOf(s.fighters[i].character).flatMap(c=>options(s,i,c.id)));
 for(const a of actions[0])for(const b of actions[1]){
  const queues=[[a,...padding],[b,...padding]];
  if(a.id==='raven_ult'&&b.id==='raven_ult'){skipped++;continue;}
  if(a.id==='raven_ult'||b.id==='raven_ult'){
   const owner=a.id==='raven_ult'?0:1;
   s.trap={owner,pos:{x:s.fighters[1-owner].x,y:s.fighters[1-owner].y},armedRound:2};
  }else s.trap=null;
  if(queues.some((q,i)=>validateQueue(s,i,q))){skipped++;continue;}
  let result;
  try{result=resolveRound(s,queues,{presentation:false}).frames[0];}catch{skipped++;continue;}
  const events=result.events;
  const hits=events.filter(v=>v.type==='hit');
  for(const hit of hits)damage[1-hit.side]+=hit.amount;
  collisions+=events.filter(v=>v.type==='block').length;
  misses+=events.filter(v=>v.type==='miss').length;
  const row={p,e,pos:[px,py,ex,ey],actions:[key(a),key(b)],end:result.state.fighters.map(f=>[f.x,f.y,f.hp,f.en]),hits:hits.map(h=>[h.side,h.amount,h.grade]),blocked:events.filter(v=>v.type==='block').map(v=>v.side),miss:events.filter(v=>v.type==='miss').map(v=>v.side)};
  if(!gzip.write(JSON.stringify(row)+'\n'))await once(gzip,'drain');
  count++;if(count>=limit)break outer;
 }
}
gzip.end();await new Promise((resolve,reject)=>{output.on('finish',resolve);output.on('error',reject);});
const summary={positionsPerPair:132,characterPairs:16,executed:count,skipped,rawDamage:damage,blockedMovements:collisions,missEvents:misses,limit:Number.isFinite(limit)?limit:null};
fs.writeFileSync('docs/balance/one-beat-summary.json',JSON.stringify(summary,null,2));
console.log(summary);
