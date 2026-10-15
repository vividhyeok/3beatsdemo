import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolveRound,projectPath,rangeAt,options,CARD_MAP} from '../src/game.js';
const q=(...ids)=>ids.map(id=>typeof id==='string'?{id}:id);

test('ZETA slide reaches a diagonal lane and its preview uses the same path',()=>{
 const s=newGame('zeta','jack'),action={id:'zeta_slide',direction:'up'};
 const p=projectPath(s,0,[action]);assert.deepEqual(p.path,[{x:1,y:0}]);
 const frame=resolveRound(s,[q(action,'focus','guard'),q('guard','focus','back')]).frames[0];
 assert.deepEqual(frame.movement.fighters[0].x,1);assert.deepEqual(frame.movement.fighters[0].y,0);
});
test('ZETA brake refunds EN only when an enemy attack misses',()=>{
 const s=newGame('zeta','jack');s.fighters[0].x=1;s.fighters[1].x=3;
 const dodge=resolveRound(s,[q({id:'zeta_brake',direction:'up'},'focus','guard'),q('jack_jab','focus','back')]).frames[0];
 assert.equal(dodge.state.fighters[0].en,50);
 const quiet=resolveRound(s,[q({id:'zeta_brake',direction:'up'},'focus','guard'),q('guard','focus','back')]).frames[0];
 assert.equal(quiet.state.fighters[0].en,35);
});
test('EVE piercing shot grazes adjacent enemies; RAVEN can mark distant cells',()=>{
 const s=newGame('eve','raven');s.fighters[1].x=1;
 const r=rangeAt(s,0,{id:'eve_pierce'});assert.ok(r.glance.some(p=>p.x===1&&p.y===1));
 assert.ok(!r.direct.some(p=>p.x===1&&p.y===1));
 const trap=newGame('raven','eve');assert.ok(options(trap,0,'raven_trap').some(a=>a.target.x===2&&a.target.y===0));
 assert.equal(CARD_MAP.raven_trap.cost,15);
});
