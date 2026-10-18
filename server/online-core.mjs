import {randomBytes} from 'node:crypto';
import {CHARACTERS,newGame,validateQueue,resolveRound} from '../src/game.js';

const code=()=>randomBytes(5).toString('hex').toUpperCase();
const token=()=>randomBytes(24).toString('base64url');
const error=(status,message)=>Object.assign(Error(message),{status});

export class OnlineRooms{
 constructor({now=Date.now,ttl=30*60_000,disconnectAfter=20_000}={}){this.rooms=new Map();this.now=now;this.ttl=ttl;this.disconnectAfter=disconnectAfter;}
 cleanup(){const now=this.now();for(const [key,room] of this.rooms)if(now-room.updated>this.ttl)this.rooms.delete(key);}
 room(key){this.cleanup();const room=this.rooms.get(String(key||'').toUpperCase());if(!room)throw error(404,'방을 찾을 수 없습니다.');return room;}
 player(room,secret){const side=room.players.findIndex(p=>p?.token===secret);if(side<0)throw error(403,'방 참가 정보가 올바르지 않습니다.');return side;}
 touch(room,side){room.players[side].seen=this.now();room.updated=this.now();}
 create(){this.cleanup();if(this.rooms.size>=1000)throw error(429,'서버가 가득 찼습니다.');let key;do{key=code();}while(this.rooms.has(key));const secret=token(),now=this.now();this.rooms.set(key,{code:key,players:[{token:secret,character:'jack',ready:false,seen:now},null],phase:'lobby',state:null,queues:[null,null],resolution:null,version:1,updated:now});return {code:key,token:secret,side:0};}
 join(key){const room=this.room(key);if(room.players[1])throw error(409,'이미 두 명이 참가한 방입니다.');if(room.phase!=='lobby')throw error(409,'진행 중인 방입니다.');const secret=token();room.players[1]={token:secret,character:'eve',ready:false,seen:this.now()};room.version++;room.updated=this.now();return {code:room.code,token:secret,side:1};}
 snapshot(key,secret){const room=this.room(key),side=this.player(room,secret);this.touch(room,side);return {code:room.code,side,version:room.version,phase:room.phase,players:room.players.map(p=>p&&({character:p.character,ready:p.ready,connected:this.now()-p.seen<this.disconnectAfter})),state:room.state,resolution:room.resolution&&{version:room.resolution.version,before:room.resolution.before,frames:room.resolution.frames,queues:room.resolution.queues},submitted:room.queues.map(Boolean)};}
 update(key,secret,{action,character,queue}={}){
  const room=this.room(key),side=this.player(room,secret),player=room.players[side];this.touch(room,side);
  if(action==='select'){
   if(room.phase!=='lobby'||!Object.hasOwn(CHARACTERS,character))throw error(400,'선택할 수 없는 파이터입니다.');
   player.character=character;player.ready=false;
  }else if(action==='ready'){
   if(room.phase!=='lobby'||player.ready)throw error(409,'이미 준비했거나 시작된 방입니다.');
   player.ready=true;
   if(room.players.every(p=>p?.ready)){room.state=newGame(room.players[0].character,room.players[1].character);room.phase='planning';room.queues=[null,null];room.resolution=null;}
  }else if(action==='submit'){
   if(room.phase!=='planning'||!room.state)throw error(409,'지금은 명령을 제출할 수 없습니다.');
   if(room.queues[side])throw error(409,'이번 라운드의 명령을 이미 제출했습니다.');
   const invalid=validateQueue(room.state,side,queue);if(invalid)throw error(400,invalid);
   room.queues[side]=structuredClone(queue);
   if(room.queues.every(Boolean)){
    const before=structuredClone(room.state),queues=structuredClone(room.queues),result=resolveRound(before,queues);
    room.state=result.state;room.phase=result.state.status==='finished'?'finished':'planning';room.queues=[null,null];
    room.resolution={version:room.version+1,before,frames:result.frames,queues};
   }
  }else if(action==='rematch'){
   if(room.phase!=='finished')throw error(409,'경기가 끝난 뒤 재대전할 수 있습니다.');
   room.phase='lobby';room.state=null;room.queues=[null,null];room.resolution=null;
   room.players.forEach(p=>{if(p)p.ready=false;});
  }else if(action==='leave'){
   room.players[side]=null;room.phase='abandoned';room.queues=[null,null];room.resolution=null;
  }else throw error(400,'알 수 없는 요청입니다.');
  room.version++;room.updated=this.now();return action==='leave'?{left:true}:this.snapshot(room.code,secret);
 }
}
