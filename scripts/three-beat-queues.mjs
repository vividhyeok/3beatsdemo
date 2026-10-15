import fs from 'node:fs';
import {CHARACTERS,CARD_MAP,deckOf,newGame,options,validateQueue} from '../src/game.js';

const ids=Object.keys(CHARACTERS),results={};
for(const character of ids){
 const s=newGame(character,character==='jack'?'eve':'jack');
 const actions=deckOf(character).flatMap(c=>options(s,0,c.id));
 const classes={attack:0,move:0,defense:0,focus:0,trap:0,mixed:0};
 const cardUses={},directionUses={},queueSet=new Set();let valid=0,invalid=0,trapUlt=0,minNetEN=Infinity,maxNetEN=-Infinity;
 for(const a of actions)for(const b of actions)for(const c of actions){
  const queue=[a,b,c],error=validateQueue(s,0,queue);
  if(error){invalid++;continue;}
  const key=JSON.stringify(queue);if(queueSet.has(key))continue;queueSet.add(key);valid++;
  const cards=queue.map(a=>CARD_MAP[a.id]);let en=s.fighters[0].en;
  for(const card of cards)en=card.id==='focus'?Math.min(100,en+30):en-card.cost;
  minNetEN=Math.min(minNetEN,s.fighters[0].en-en);maxNetEN=Math.max(maxNetEN,s.fighters[0].en-en);
  const kinds=cards.map(c=>c.kind);
  const type=kinds.every(k=>k==='attack'||k==='ultimate')?'attack':kinds.every(k=>k==='move')?'move':kinds.every(k=>k==='defense')?'defense':kinds.every(k=>k==='energy')?'focus':kinds.every(k=>k==='trap')?'trap':'mixed';
  classes[type]++;
  if(queue.some(a=>a.id==='raven_trap')&&queue.some(a=>a.id==='raven_ult'))trapUlt++;
  for(const a of queue){cardUses[a.id]=(cardUses[a.id]||0)+1;if(a.direction)directionUses[a.id+':'+a.direction]=(directionUses[a.id+':'+a.direction]||0)+1;}
 }
 results[character]={startEN:45,position:[0,1],opponent:[3,1],valid,invalid,classes,trapUlt,minNetEN,maxNetEN,cardUses,directionUses};
}
fs.writeFileSync('docs/balance/three-beat-queues.json',JSON.stringify(results,null,2));
console.log(Object.fromEntries(ids.map(id=>[id,{valid:results[id].valid,invalid:results[id].invalid,classes:results[id].classes,trapUlt:results[id].trapUlt}])));
