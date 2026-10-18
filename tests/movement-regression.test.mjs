import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolveRound,projectPath,rangeAt,inside,facing} from '../src/game.js';

const q=(first)=>[typeof first==='string'?{id:first}:first,{id:'up'},{id:'down'}];
const at=(s,x0,y0,x1,y1)=>{Object.assign(s.fighters[0],{x:x0,y:y0});Object.assign(s.fighters[1],{x:x1,y:y1});return s;};
const first=(s,a,b)=>resolveRound(s,[q(a),q(b)]).frames[0];

test('forward and back reverse with relative position, including walls and equal X',()=>{
 for(const side of [0,1])for(const [x0,x1] of [[0,3],[3,0],[0,1],[3,2]]){
  const s=at(newGame(),x0,1,x1,1),me=s.fighters[side],dir=Math.sign(s.fighters[1-side].x-me.x);
  const ahead=first(s,side===0?'forward':'focus',side===1?'forward':'focus');
  assert.equal(ahead.movement.fighters[side].x,me.x+dir*(Math.abs(x1-x0)>1?1:0));
  const retreat=first(s,side===0?'back':'focus',side===1?'back':'focus');
  assert.equal(retreat.movement.fighters[side].x,Math.max(0,Math.min(3,me.x-dir)));
 }
 const same=at(newGame(),2,0,2,2);same.fighters[0].facing=1;same.fighters[1].facing=-1;
 assert.equal(first(same,'forward','back').movement.fighters[0].x,3);
});

test('blocked attack movement still fires from the actual tile on both sides',()=>{
 for(const reverse of [false,true]){
  const s=at(newGame('jack','eve'),reverse?3:0,1,reverse?2:1,1);
  const frame=first(s,'jack_dash','focus');
  const attack=frame.events.find(e=>e.type==='attack'&&e.side===0);
  assert.equal(frame.movement.fighters[0].x,s.fighters[0].x);
  assert.equal(attack.origin.x,s.fighters[0].x);
  assert.equal(attack.grade,'direct');
  assert.equal(attack.actual,25);
 }
 for(const reverse of [false,true]){
  const s=at(newGame('eve','jack'),reverse?3:0,1,reverse?2:1,1);
  const attack=first(s,'eve_retreat','focus').events.find(e=>e.type==='attack');
  assert.equal(attack.grade,'direct');
  assert.equal(attack.origin.x,s.fighters[0].x);
 }
});

test('predicted path, post-movement attack range and displayed trace agree across board',()=>{
 const actions=[{id:'jack_dash'},{id:'eve_retreat'},{id:'zeta_long',direction:'forward'},{id:'zeta_long',direction:'back'}];
 for(const [character,action] of [['jack',actions[0]],['eve',actions[1]],['zeta',actions[2]],['zeta',actions[3]]])
 for(let x0=0;x0<4;x0++)for(let y0=0;y0<3;y0++)for(let x1=0;x1<4;x1++)for(let y1=0;y1<3;y1++){
  if(x0===x1&&y0===y1)continue;
  const s=at(newGame(character,'raven'),x0,y0,x1,y1);
  const plan=projectPath(s,0,[action]);
  const frame=first(s,action,'focus');
  const actual=frame.movement.fighters[0];
  assert.deepEqual({x:actual.x,y:actual.y},{x:plan.origin.x,y:plan.origin.y});
  assert.ok(inside(actual.x,actual.y));
  if(character!=='zeta'){
   const attack=frame.events.find(e=>e.type==='attack'&&e.side===0);
   assert.deepEqual(attack.range,rangeAt(frame.movement,0,action));
   assert.equal(attack.origin.facing,facing(frame.movement,0));
  }
 }
});

test('simultaneous crossing, enemy escape and push refresh direction for the next beat',()=>{
 const cross=at(newGame(),1,1,2,1);
 const crossed=first(cross,'forward','forward');
 assert.deepEqual(crossed.movement.fighters.map(f=>f.x),[1,2]);
 const escape=at(newGame('jack','eve'),0,1,2,1);
 assert.equal(first(escape,'jack_dash','back').events.find(e=>e.type==='attack').grade,'miss');
 const push=at(newGame('raven','jack'),1,1,2,1);
 const pushed=resolveRound(push,[[{id:'raven_push'},{id:'back'},{id:'focus'}],[{id:'focus'},{id:'forward'},{id:'guard'}]]);
 assert.equal(pushed.frames[0].state.fighters[1].x,3);
 assert.equal(pushed.frames[0].state.fighters[0].facing,1);
 assert.ok(pushed.frames[1].movement.fighters.every(f=>inside(f.x,f.y)));
});
