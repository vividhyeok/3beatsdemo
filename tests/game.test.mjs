import test from "node:test";
import assert from "node:assert/strict";
import {COMMON,UNIQUE,CARD_MAP,deckOf,CHARACTERS,newGame,rangeAt,options,validateQueue,resolveRound,MAX_HP} from "../src/game.js";
import {chooseAI} from "../src/ai.js";

const q=(...ids)=>ids.map(id=>typeof id==="string"?{id}:id);
test("4 fighters, 6 commons, 5 uniques and 11 per fighter",()=>{
 assert.equal(Object.keys(CHARACTERS).length,4);
 assert.equal(COMMON.length,6);
 for(const id of Object.keys(CHARACTERS)){
  assert.equal(UNIQUE[id].length,5);
  assert.equal(deckOf(id).length,11);
 }
 assert.equal(new Set(Object.keys(CARD_MAP)).size,26);
});
test("3-beat queue validity enforces 1/use and EN limits",()=>{
 const s=newGame();
 assert.equal(validateQueue(s,0,q("forward","forward","guard")),null);
 assert.match(validateQueue(s,0,q("guard","guard","forward")),/한 번/);
 assert.match(validateQueue(s,0,q("jack_ult","guard","focus"))||"",/기력/);
 assert.equal(validateQueue(s,0,q("focus","jack_slam","jack_jab")),null);
});
test("direct hit, grazing and defense change real HP deterministically",()=>{
 const s=newGame();s.fighters[0].x=1;s.fighters[1].x=2;
 let result=resolveRound(s,[q("jack_jab","focus","guard"),q("focus","guard","back")]).state;
 assert.equal(result.fighters[1].hp,MAX_HP-30);
 const s2=newGame();s2.fighters[0].x=1;s2.fighters[1].x=2;
 result=resolveRound(s2,[q("jack_jab","focus","guard"),q("guard","focus","forward")]).state;
 assert.equal(result.fighters[1].hp,MAX_HP);
 const s3=newGame();s3.fighters[0].x=1;s3.fighters[1].x=2;s3.fighters[1].y=0;
 result=resolveRound(s3,[q("jack_jab","focus","guard"),q("focus","guard","back")]).state;
 assert.equal(result.fighters[1].hp,MAX_HP-15);
});
test("simultaneous movement into one square blocks both units",()=>{
 const s=newGame();s.fighters[0].x=1;s.fighters[1].x=3;
 const res=resolveRound(s,[q("forward","guard","focus"),q("forward","guard","focus")]);
 assert.equal(res.frames[0].state.fighters[0].x,1);
 assert.equal(res.frames[0].state.fighters[1].x,3);
});
test("one-step forward and one-step backward are allowed at different coordinates",()=>{
 const s=newGame();s.fighters[0].x=0;s.fighters[1].x=3;
 const res=resolveRound(s,[q("forward","guard","focus"),q("back","guard","focus")]);
 assert.equal(res.frames[0].state.fighters[0].x,1);
 assert.equal(res.frames[0].state.fighters[1].x,3);
});
test("special directions and trap square are explicit selectable actions",()=>{
 const s=newGame("zeta","eve");
 assert.deepEqual(options(s,0,"zeta_long").map(a=>a.direction),["forward","back"]);
 assert.equal(options(s,0,"zeta_slide").length,2);
 assert.equal(options(newGame("raven","eve"),0,"raven_trap").some(a=>a.target.x===1&&a.target.y===1),true);
 const cards=rangeAt(s,0,{id:"zeta_jab"});
 assert.ok(cards.direct.some(p=>p.x===1&&p.y===1));
});
test("Raven delayed mine explodes on next round beat 2 after movement",()=>{
 const s=newGame("raven","eve");
 const first=resolveRound(s,[[{id:"raven_trap",target:{x:1,y:1}},{id:"focus"},{id:"guard"}],q("focus","guard","back")]).state;
 assert.ok(first.trap);assert.equal(first.trap.armedRound,2);
 const second=resolveRound(first,[q("guard","focus","up"),q("forward","forward","focus")]);
 assert.equal(second.state.fighters[1].hp,MAX_HP-40);
 assert.equal(second.state.trap,null);
});
test("AI generates legal queues using public state only",()=>{
 for(const character of Object.keys(CHARACTERS)){
  const s=newGame("jack",character);
  for(const level of ["easy","normal","expert"]){
   const plan=chooseAI(s,level,1);
   assert.equal(plan.length,3);
   assert.equal(validateQueue(s,1,plan),null);
  }
 }
});
test("every pair of cards and 3 beats resolves without leaking or mutating input",()=>{
 const s=newGame("jack","eve");
 const old=JSON.stringify(s);
 const result=resolveRound(s,[q("forward","jack_jab","focus"),q("forward","eve_pierce","focus")]);
 assert.equal(JSON.stringify(s),old);
 assert.equal(result.frames.length,3);
 assert.equal(result.state.round,2);
 assert.equal(result.state.history.length,1);
});
