import {CHARACTERS,CARD_MAP,deckOf,options,validateQueue} from './game.js';
import {portrait,cardImage} from './assets.js';

const $=s=>document.querySelector(s);
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=['entry','lobby','game','result'];
let session=JSON.parse(sessionStorage.getItem('three-beats-online')||'null'),snapshot=null,queue=[],pending=null,lastVersion=0,lastResolution=0,playing=false,run=0,failures=0;
const status=text=>$('#message').textContent=text;
const show=name=>{for(const id of sections)$('#'+id).hidden=id!==name;$('#leave').hidden=!session;};
const save=()=>sessionStorage.setItem('three-beats-online',JSON.stringify(session));

async function api(data){
 const response=await fetch('/api/online'+(data?'':'?code='+encodeURIComponent(session.code)),{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(session?{Authorization:'Bearer '+session.token}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store'});
 const value=await response.json();if(!response.ok)throw Error(value.error||'서버 오류');return value;
}
async function action(data){try{const value=await api(data);if(data.action==='create'||data.action==='join'){session=value;save();lastVersion=0;lastResolution=0;queue=[];}else if(data.action==='leave'){sessionStorage.removeItem('three-beats-online');session=null;location.href='/';return;}else if(data.action==='submit')queue=[];if(value.phase)receive(value);else await poll();}catch(error){status(error.message);}}
async function poll(){if(!session)return;try{const value=await api();failures=0;receive(value);}catch(error){if(++failures>2)status('연결이 끊겼습니다. 재연결 중입니다. '+error.message);}}
function receive(next){snapshot=next;const changed=next.version!==lastVersion;lastVersion=next.version;
 if(next.phase==='abandoned'){playing=false;status('상대가 방을 나갔습니다. 메인 메뉴에서 새 방을 만드세요.');show('lobby');$('#ready').disabled=true;return;}
 if(next.phase==='lobby'){run++;playing=false;lastResolution=0;status(next.players[1]?'양쪽 파이터와 준비 상태를 확인하세요.':'친구에게 초대 URL을 보내세요.');show('lobby');if(changed)renderLobby();return;}
 if(next.resolution&&next.resolution.version!==lastResolution){lastResolution=next.resolution.version;void play(next);return;}
 if(playing)return;
 if(next.phase==='finished'){show('result');renderResult(next);return;}
 show('game');if(changed){renderGame(next.state);renderControls();}
 status(!next.players[1-next.side]?.connected?'상대 연결이 끊겼습니다. 재접속을 기다리는 중입니다.':next.submitted[next.side]?'명령 제출 완료. 상대의 제출을 기다립니다.':'카드 세 장을 예약해 제출하세요.');
}
function renderLobby(){const s=snapshot;$('#room-code').textContent=s.code;$('#players').innerHTML=s.players.map((p,i)=>'<div class="player-card"><b>'+(i?'GUEST':'HOST')+'</b><p>'+(p?CHARACTERS[p.character].name+' / '+(p.ready?'준비 완료':p.connected?'선택 중':'연결 끊김'):'친구 입장 대기')+'</p></div>').join('');
 $('#characters').innerHTML=Object.entries(CHARACTERS).map(([id,c])=>'<button data-character="'+id+'" class="'+(s.players[s.side].character===id?'selected':'')+'" '+(s.players[s.side].ready?'disabled':'')+'><img src="'+portrait(id)+'" alt=""><span>'+c.name+' / '+c.ko+'</span></button>').join('');
 $('#ready').disabled=!s.players[1]||s.players[s.side].ready;$('#ready').textContent=s.players[s.side].ready?'상대 준비 대기 중':'준비 완료';
}
function renderBoard(state,frame=null){let html='';const targets=pending?.id==='raven_trap'?options(state,snapshot.side,pending.id):[],attacks=frame?.events.filter(e=>e.type==='attack')||[];
 for(let y=0;y<3;y++)for(let x=0;x<4;x++){
  const fighters=state.fighters.map((f,i)=>f.x===x&&f.y===y?'<img src="'+portrait(f.character,'win')+'" alt="'+CHARACTERS[f.character].name+'"><span class="unit-label">'+(i===snapshot.side?'YOU':'RIVAL')+'</span>':'').join('');
  const hit=attacks.flatMap(a=>a.range.direct).some(p=>p.x===x&&p.y===y),graze=attacks.flatMap(a=>a.range.glance).some(p=>p.x===x&&p.y===y);
  const target=targets.some(a=>a.target.x===x&&a.target.y===y);
  html+='<button class="tile '+(hit?'direct':graze?'graze':'')+' '+(target?'target':'')+'" data-tile="'+x+','+y+'" aria-label="타일 '+(x+1)+','+(y+1)+'">'+(x+1)+':'+(y+1)+fighters+'</button>';
 }
 $('#board').innerHTML=html;
}
function renderGame(state){const side=snapshot.side,mine=state.fighters[side],theirs=state.fighters[1-side];$('#mine').innerHTML='<strong>'+CHARACTERS[mine.character].name+' / YOU</strong><small>HP '+mine.hp+' / EN '+mine.en+'</small>';$('#theirs').innerHTML='<strong>'+CHARACTERS[theirs.character].name+' / RIVAL</strong><small>HP '+theirs.hp+' / EN '+theirs.en+'</small>';$('#round').textContent='ROUND '+state.round+' / BEAT '+state.beat;renderBoard(state);
 $('#enemy-queue').innerHTML=Array.from({length:3},(_,i)=>'<span>BEAT '+(i+1)+' / ?</span>').join('');
}
function renderControls(){const locked=playing||snapshot.submitted[snapshot.side],state=snapshot.state,character=state.fighters[snapshot.side].character;
 $('#my-queue').innerHTML=Array.from({length:3},(_,i)=>'<div><button data-remove="'+i+'" '+(locked||!queue[i]?'disabled':'')+'>BEAT '+(i+1)+' / '+esc(queue[i]?CARD_MAP[queue[i].id].name:'비어 있음')+'</button><div class="move"><button data-shift="'+i+',-1" '+(locked||i===0||!queue[i]?'disabled':'')+' aria-label="BEAT '+(i+1)+' 왼쪽 이동">←</button><button data-shift="'+i+',1" '+(locked||i>=queue.length-1?'disabled':'')+' aria-label="BEAT '+(i+1)+' 오른쪽 이동">→</button></div></div>').join('');
 $('#cards').innerHTML=deckOf(character).map(c=>'<button data-card="'+c.id+'" '+(locked||queue.length===3||(!c.repeat&&queue.some(a=>a.id===c.id))?'disabled':'')+' class="'+(pending?.id===c.id?'selected':'')+'" aria-label="'+esc(c.name+' / '+c.cost+' EN')+'"><img src="'+cardImage(c.id)+'" alt=""><span>'+c.name+' / '+c.cost+' EN</span></button>').join('');
 const direction=$('#direction');direction.hidden=!pending;direction.innerHTML=pending?'<span>'+CARD_MAP[pending.id].name+' 방향 또는 타일 선택</span>'+(CARD_MAP[pending.id].directions||[]).map(d=>'<button data-dir="'+d+'">'+({up:'위',down:'아래',forward:'전진',back:'후퇴'}[d])+'</button>').join('')+'<button data-cancel>취소</button>':'';
 $('#submit').disabled=locked||queue.length!==3||!!pending;$('#submit').textContent=locked?'상대 제출 대기':'3비트 제출';
}
function add(card){queue.push(card);pending=null;renderControls();renderBoard(snapshot.state);}
async function play(next){const id=++run;playing=true;show('game');status('양쪽 명령 공개 / 전투 실행 중');const {before,frames,queues}=next.resolution;renderGame(before);renderControls();
 for(const frame of frames){if(id!==run)return;$('#round').textContent='ROUND '+frame.round+' / BEAT '+frame.beat;$('#enemy-queue').innerHTML=queues[1-next.side].map((card,i)=>'<span>BEAT '+(i+1)+' / '+(i<frame.beat?esc(CARD_MAP[card.id].name):'?')+'</span>').join('');renderBoard(frame.movement);$('#feedback').textContent='BEAT '+frame.beat+' / 동시 이동';await new Promise(r=>setTimeout(r,350));if(id!==run)return;renderBoard(frame.state,frame);$('#feedback').textContent=frame.events.filter(e=>e.type==='attack').map(e=>(e.side===next.side?'YOU':'RIVAL')+' '+e.source+' '+e.grade.toUpperCase()+' / '+(e.actual??0)+' HP').join(' · ')||'방어 / 이동 / 집중';await new Promise(r=>setTimeout(r,700));}
 if(id!==run)return;playing=false;snapshot=next;$('#feedback').textContent='';if(next.phase==='finished'){show('result');renderResult(next);}else{show('game');renderGame(next.state);renderControls();status('다음 라운드의 카드 세 장을 예약하세요.');}
}
function renderResult(s){const winner=s.state.winner;$('#result-title').textContent=winner===-1?'무승부':winner===s.side?'승리':'패배';$('#result-score').textContent='ROUND '+s.state.round+' / HP '+s.state.fighters.map(f=>f.hp).join(' : ');}

document.addEventListener('click',e=>{const el=e.target.closest('button');if(!el||el.disabled)return;
 if(el.id==='create')void action({action:'create'});
 else if(el.id==='join')void action({action:'join',code:$('#code').value.trim().toUpperCase()});
 else if(el.id==='copy')navigator.clipboard.writeText(location.origin+'/online.html?room='+snapshot.code).then(()=>status('초대 URL을 복사했습니다.'),()=>status('복사에 실패했습니다. URL을 직접 공유하세요.'));
 else if(el.id==='leave')void action({action:'leave',code:session.code});
 else if(el.id==='ready')void action({action:'ready',code:session.code});
 else if(el.id==='submit'){const invalid=validateQueue(snapshot.state,snapshot.side,queue);if(invalid){status(invalid);return;}$('#submit').disabled=true;void action({action:'submit',code:session.code,queue});}
 else if(el.id==='rematch')void action({action:'rematch',code:session.code});
 else if(el.dataset.character)void action({action:'select',code:session.code,character:el.dataset.character});
 else if(el.dataset.card){const c=CARD_MAP[el.dataset.card];if(c.target||c.directions){pending={id:c.id};renderControls();renderBoard(snapshot.state);}else add({id:c.id});}
 else if(el.dataset.dir&&pending)add({id:pending.id,direction:el.dataset.dir});
 else if(el.dataset.cancel!==undefined){pending=null;renderControls();renderBoard(snapshot.state);}
 else if(el.dataset.tile&&pending?.id==='raven_trap'){const [x,y]=el.dataset.tile.split(',').map(Number);if(options(snapshot.state,snapshot.side,pending.id).some(a=>a.target.x===x&&a.target.y===y))add({id:pending.id,target:{x,y}});}
 else if(el.dataset.remove!==undefined){queue.splice(Number(el.dataset.remove),1);renderControls();}
 else if(el.dataset.shift){const [from,delta]=el.dataset.shift.split(',').map(Number);[queue[from],queue[from+delta]]=[queue[from+delta],queue[from]];renderControls();}
});
$('#code').value=new URLSearchParams(location.search).get('room')||'';
try{const response=await fetch('/api/online/status',{cache:'no-store'});if(!response.ok||!(await response.json()).available)throw Error();if(session)await poll();else{show('entry');status('서버 연결 완료. 방을 만들거나 초대 코드로 입장하세요.');}setInterval(()=>{if(!document.hidden)void poll();},1200);}catch{show('entry');$('#entry button').disabled=true;status('온라인 서버에 연결할 수 없습니다. 현재 이 배포에서는 온라인 대전이 비활성화되어 있습니다.');}
