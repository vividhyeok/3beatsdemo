import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlineRooms} from '../server/online-core.mjs';
import {createOnlineServer} from '../server/online-server.mjs';
import {resolveRound} from '../src/game.js';

const queue=[{id:'forward'},{id:'focus'},{id:'back'}];
test('two independent HTTP clients commit hidden commands to one authoritative match',async()=>{
 const rooms=new OnlineRooms(),server=createOnlineServer({rooms});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const call=async(session,body)=>{const response=await fetch(base+'/api/online'+(body?'':'?code='+session.code),{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(session.token?{Authorization:'Bearer '+session.token}:{})},body:body&&JSON.stringify(body)});return {status:response.status,value:await response.json()};};
 try{
  const host=(await call({}, {action:'create'})).value;
  const guest=(await call({}, {action:'join',code:host.code})).value;
  assert.notEqual(host.token,guest.token);assert.equal(host.side,0);assert.equal(guest.side,1);
  await call(host,{action:'ready',code:host.code});
  let result=await call(guest,{action:'ready',code:guest.code});assert.equal(result.value.phase,'planning');
  const start=result.value.state;
  result=await call(host,{action:'submit',code:host.code,queue});assert.equal(result.value.submitted[0],true);
  const hidden=await call(guest);assert.equal(hidden.value.submitted[0],true);assert.equal(hidden.value.resolution,null);assert.ok(!JSON.stringify(hidden.value).includes('"queues"'));
  assert.equal((await call(host,{action:'submit',code:host.code,queue})).status,409);
  assert.equal((await call(guest,{action:'submit',code:guest.code,queue:[{id:'jack_dash'},...queue.slice(1)]})).status,400);
  result=await call(guest,{action:'submit',code:guest.code,queue});
  const expected=resolveRound(start,[queue,queue]);assert.deepEqual(result.value.state,expected.state);
  assert.deepEqual(result.value.resolution.frames,expected.frames);
  const hostView=(await call(host)).value;assert.deepEqual(hostView.state,result.value.state);
  for(let n=1;n<10;n++){
   await call(host,{action:'submit',code:host.code,queue});
   result=await call(guest,{action:'submit',code:guest.code,queue});
   if(result.value.phase==='finished')break;
  }
  assert.equal(result.value.phase,'finished');
  const rematch=await call(guest,{action:'rematch',code:guest.code});assert.equal(rematch.value.phase,'lobby');
  await call(host,{action:'ready',code:host.code});result=await call(guest,{action:'ready',code:guest.code});assert.equal(result.value.state.round,1);
  assert.equal((await call(guest,{action:'leave',code:guest.code})).value.left,true);
  assert.equal((await call(host)).value.phase,'abandoned');
 }finally{await new Promise(r=>server.close(r));}
});

test('inactive rooms are removed and stale credentials are rejected',()=>{
 let time=0;const rooms=new OnlineRooms({now:()=>time,ttl:1000});const host=rooms.create();
 assert.throws(()=>rooms.snapshot(host.code,'wrong'),e=>e.status===403);
 time=1001;assert.throws(()=>rooms.snapshot(host.code,host.token),e=>e.status===404);
});
