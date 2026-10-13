import {CHARACTERS,COMMON,UNIQUE,CARD_MAP,deckOf,newGame,options,rangeAt,validateQueue,resolveRound,dist,MAX_HP,MAX_EN} from "./game.js";
import {chooseAI} from "./ai.js";

let selection={player:"jack",enemy:"eve",difficulty:"normal"};
let match=newGame(selection.player,selection.enemy),view=match,queue=[],pending=null,preview=null,playing=false,sound=true,revealed=[],enemyPlan=[],playerPlan=[],runToken=0;
const $=sel=>document.querySelector(sel);
function imageFor(id){return "assets/cards/"+id+".png";}

const escapeHtml=x=>String(x).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function who(i){return CHARACTERS[view.fighters[i].character];}
function playSound(kind="tap"){
 if(!sound)return;
 try{
  const ctx=new (window.AudioContext||window.webkitAudioContext)(),osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.connect(gain);gain.connect(ctx.destination);
  osc.type=kind==="hit"?"sawtooth":"sine";
  osc.frequency.setValueAtTime(kind==="hit"?135:kind==="pick"?540:330,ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(kind==="hit"?55:210,ctx.currentTime+.13);
  gain.gain.setValueAtTime(.038,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.18);
  osc.start();osc.stop(ctx.currentTime+.2);setTimeout(()=>ctx.close(),350);
 }catch{}
}
function toast(text){const t=$("#toast");t.textContent=text;t.classList.add("show");clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>t.classList.remove("show"),2300);}
function reset(){
 runToken++;revealed=[];enemyPlan=[];playerPlan=[];
 match=newGame(selection.player,selection.enemy);view=match;queue=[];pending=null;preview=null;playing=false;
 render();toast("새 대전이 시작되었습니다.");playSound();
}
function projectedEN(){
 let n=match.fighters[0].en;
 for(const a of queue){const c=CARD_MAP[a.id];n=a.id==="focus"?Math.min(MAX_EN,n+30):n-c.cost;}
 return n;
}
function selectCard(id){
 if(playing||match.status==="finished")return;
 if(queue.length>=3){toast("3장의 카드가 모두 예약되었습니다.");return;}
 const c=CARD_MAP[id];
 if(!c.repeat&&queue.some(a=>a.id===id)){toast("이번 라운드에 이미 예약한 카드입니다.");return;}
 if(c.id==="raven_ult"&&!match.trap&&!queue.some(a=>a.id==="raven_trap")){toast("먼저 좌표 각인으로 함정을 설치하세요.");return;}
 if(id!=="focus"&&projectedEN()<c.cost){toast("기력이 부족합니다. 집중 카드를 먼저 사용하세요.");return;}
 if(c.target||c.directions){
  pending={id};preview={id};render();
  toast(c.target?"격자의 빈 칸을 클릭해 함정 위치를 지정하세요.":"추가 방향을 선택하세요.");
 }else addToQueue({id});
}
function addToQueue(action){
 queue.push(action);pending=null;preview=null;revealed=[];enemyPlan=[];playSound("pick");render();
}
function previewRange(){
 if(!preview||!view||view.status==="finished")return {direct:[],glance:[]};
 if(preview.id==="raven_trap"&&!preview.target)return {direct:[],glance:[]};
 return rangeAt(view,0,preview);
}
function renderOptions(){
 const fig=(key)=>{const c=CHARACTERS[key];return '<button class="hero-choice '+(selection.player===key?"active":"")+'" data-pick-player="'+key+'" style="--accent:'+c.color+'"><img src="'+c.portrait+'" alt=""><span><b>'+c.ko+'</b><small>'+c.role+'</small></span></button>';};
 $("#player-options").innerHTML=Object.keys(CHARACTERS).map(fig).join("");
 const e=CHARACTERS[selection.enemy];
 $("#enemy-choice").innerHTML='<img src="'+e.portrait+'" alt=""><div><b>'+e.ko+'</b><span>'+e.role+'</span></div>';
 $("#enemy-select").innerHTML=Object.entries(CHARACTERS).filter(([id])=>id!==selection.player).map(([id,c])=>'<option value="'+id+'" '+(selection.enemy===id?"selected":"")+'>'+c.ko+' — '+c.role+'</option>').join("");
 $("#difficulty").value=selection.difficulty;
}
function renderHUD(){
 for(let i=0;i<2;i++){
  const f=view.fighters[i],c=who(i),suffix=i===0?"player":"enemy";
  const name=$("#"+suffix+"-name"),stat=$("#"+suffix+"-stat");
  name.textContent=c.name+' / '+c.ko;name.style.color=c.color;
  stat.textContent=f.hp+' / '+MAX_HP+' HP   ·   '+f.en+' / '+MAX_EN+' EN';
  $("#"+suffix+"-hp").style.width=(f.hp/MAX_HP*100)+"%";
  $("#"+suffix+"-en").style.width=(f.en/MAX_EN*100)+"%";
  $("#"+suffix+"-portrait").src=c.portrait;
 }
 $("#round-counter").textContent='ROUND '+view.round+' / 10';
 $("#beat-counter").textContent=playing?'BEAT '+view.beat+' / 3':"NEXT 3 BEATS";
 $("#control-score").textContent=view.score[0]+" : "+view.score[1];
}
function renderBoard(){
 const player=view.fighters[0],enemy=view.fighters[1],prev=previewRange(),targeted=pending?.id==="raven_trap";
 let html="";
 for(let y=0;y<3;y++)for(let x=0;x<4;x++){
  const i=y*4+x,hasPlayer=player.x===x&&player.y===y,hasEnemy=enemy.x===x&&enemy.y===y;
  const hit=prev.direct.some(p=>p.x===x&&p.y===y)?"direct":prev.glance.some(p=>p.x===x&&p.y===y)?"graze":"";
  const canTarget=targeted&&dist(player,{x,y})<=2&&!hasPlayer&&!hasEnemy;
  const trap=view.trap&&view.trap.pos.x===x&&view.trap.pos.y===y;
  html+='<button class="tile '+(hit?"preview-"+hit:"")+(canTarget?" can-target":"")+'" data-tile="'+x+','+y+'" aria-label="좌표 '+(x+1)+','+(y+1)+'"><span class="tile-label">'+(x+1)+'·'+(y+1)+'</span>'+
    ((x===1||x===2)&&y===1?'<span class="center-mark">◈</span>':"")+
    (trap?'<span class="trap-mark" title="설치된 함정">⌗</span>':"")+
    (hasPlayer?'<span class="unit player-unit" style="--unit:'+who(0).color+'"><img class="unit-sprite" src="'+who(0).portrait+'" alt=""><small>YOU</small></span>':"")+
    (hasEnemy?'<span class="unit enemy-unit" style="--unit:'+who(1).color+'"><img class="unit-sprite" src="'+who(1).portrait+'" alt=""><small>CPU</small></span>':"")+
    (canTarget?'<span class="target-cross">+</span>':"")+'</button>';
 }
 $("#board").innerHTML=html;
 $("#board").classList.toggle("targeting",!!targeted);
 $("#arena-caption").textContent=targeted?"좌표 각인: 설치할 타일을 클릭하세요":preview?"예상 사거리 · 이전 행동에 따른 위치 변화는 반영하지 않음":"4 × 3 SECTOR · 가운데 2칸은 동점 시 점령 점수에 반영";
}
function cardHTML(c){
 const active=pending?.id===c.id,queued=queue.some(a=>a.id===c.id)&&!c.repeat;
 const available=!queued&&queue.length<3&&!playing&&view.status!=="finished";
 const isCommon=COMMON.includes(c);
 const dmg=c.damage?'<span class="damage-label">DM <b>'+c.damage+'</b> · GR '+c.glance+'</span>':'<span class="damage-label">'+(c.kind==="defense"?"GUARD":c.kind==="energy"?"RECOVER":"MOVE")+'</span>';
 const image=imageFor(c.id);
 return '<button class="skill-card '+(isCommon?"shared":"unique")+" "+(active?"active":"")+'" data-card="'+c.id+'" '+(!available?'disabled':"")+' title="'+escapeHtml(c.description)+'">'+
 '<div class="card-art"><img class="card-illustration" alt="" loading="lazy" src="'+image+'" onerror="this.hidden=true;this.parentNode.classList.add(\'image-missing\')"><span class="card-sigil">'+escapeHtml(c.icon)+'</span></div>'+
 '<div class="card-bottom"><div class="card-title">'+c.name+'</div><span class="en-label">'+c.cost+' EN</span>'+dmg+'<p>'+escapeHtml(c.description)+'</p></div></button>';
}

function renderCards(){
 const character=match.fighters[0].character;
 $("#common-cards").innerHTML=COMMON.map(cardHTML).join("");
 $("#unique-cards").innerHTML=UNIQUE[character].map(cardHTML).join("");
 $("#unique-heading").textContent=CHARACTERS[character].name+' / 고유 기술';
 $("#queue").innerHTML=Array.from({length:3},(_,i)=>{
  const a=queue[i],c=a&&CARD_MAP[a.id],detail=a&&(a.direction?' / '+(a.direction==="up"?"↑":a.direction==="down"?"↓":a.direction==="forward"?"→":"←"):a.target?' / '+(a.target.x+1)+','+(a.target.y+1):'');
  return '<button class="queue-slot '+(a?"filled":"")+'" data-remove="'+i+'" '+(playing?'disabled':"")+'><small>BEAT '+(i+1)+'</small>'+(c?'<span class="queue-card"><img src="'+imageFor(c.id)+'" alt="" onerror="this.hidden=true"><strong>'+c.name+'</strong></span><em>'+detail+'　×</em>':'<span>+ 카드 선택</span>')+'</button>';
 }).join("");
 $("#queue-count").textContent=queue.length+"/3";
 $("#projected-en").textContent="예약 후 예상 EN "+projectedEN()+" / 100";
 $("#execute").disabled=queue.length!==3||playing||match.status==="finished"||!!pending;
 $("#execute").textContent=playing?"실행 중…":match.status==="finished"?"전투 종료":"3비트 실행  ↗";
 $("#hint").textContent=pending?"선택한 기술의 방향 또는 목표를 지정하세요.":queue.length===3?"3비트 실행을 눌러 상대와 동시에 카드를 공개하세요.":"카드를 클릭해 순서대로 세 칸에 배치하세요.";
 const pane=$("#direction-choices");
 if(pending&&CARD_MAP[pending.id].directions){
  pane.hidden=false;
  pane.innerHTML='<span class="choice-prompt">'+CARD_MAP[pending.id].name+' 방향</span>'+
    CARD_MAP[pending.id].directions.map(v=>'<button class="dir-choice" data-dir="'+v+'">'+({up:"↑ 위",down:"↓ 아래",forward:"→ 전진",back:"← 후퇴"}[v])+'</button>').join("")+
    '<button class="dir-cancel" data-cancel="1">취소</button>';
 }else if(pending&&CARD_MAP[pending.id].target){
  pane.hidden=false;pane.innerHTML='<span class="choice-prompt">보드에서 목표 타일 선택</span><button class="dir-cancel" data-cancel="1">취소</button>';
 }else {pane.hidden=true;pane.innerHTML="";}
}
function revealCard(id,idx,faceDown,flipping){
 const c=id&&CARD_MAP[id];
 const label="BEAT "+(idx+1);
 const back='assets/cards/card_back.png';
 if(faceDown)return '<div class="reveal-card facedown" data-beat="'+idx+'"><img src="'+back+'" alt="비공개 카드 뒷면"><span>'+label+'</span></div>';
 if(!c)return '<div class="reveal-card empty" data-beat="'+idx+'"><span>'+label+'</span><strong>?</strong></div>';
 return '<div class="reveal-card open '+(flipping?'flip':'')+'" data-beat="'+idx+'"><img src="'+imageFor(id)+'" alt="" onerror="this.hidden=true"><div class="reveal-card-text"><b>'+escapeHtml(c.name)+'</b><small>EN '+c.cost+' · DM '+c.damage+'</small></div><span>'+label+'</span></div>';
}
function renderReveal(){
 const player=$("#player-reveal"),enemy=$("#enemy-reveal"),msg=$("#reveal-message");
 if(!player||!enemy)return;
 player.innerHTML=Array.from({length:3},(_,i)=>revealCard((playing||enemyPlan.length?playerPlan:queue)[i]?.id,i,false,playing&&revealed.length===i+1)).join("");
 enemy.innerHTML=Array.from({length:3},(_,i)=>revealCard(enemyPlan[i]?.id,i,enemyPlan.length===0||!revealed.includes(i),playing&&revealed[revealed.length-1]===i)).join("");
 msg.textContent=playing?'BEAT '+(revealed.length||1)+' / 3 · 카드 공개 중':enemyPlan.length?'라운드 결과 · 상대의 선택을 확인하세요':'CPU의 행동은 실행될 때까지 비공개입니다';
}
function renderLog(){
 $("#combat-log").innerHTML=view.log.slice(0,9).map((s,i)=>'<div class="log-entry '+(i===0?"latest":"")+'"><span>'+escapeHtml(s)+'</span></div>').join("");
 $("#last-event").textContent=playing?'행동 결과 분석 중…':view.status==="finished"?"DUEL COMPLETE":'상대의 다음 행동을 읽어보세요';
}
function render(){
 renderOptions();renderHUD();renderBoard();renderCards();renderLog();renderReveal();
 $("#battle-stage").classList.toggle("busy",playing);
 $("#result-panel").hidden=view.status!=="finished";
 if(view.status==="finished"){
  const winner=view.winner,title=winner===-1?"무승부":winner===0?"승리!":"패배";
  $("#result-title").textContent=title;
  $("#result-detail").textContent='HP '+view.fighters[0].hp+' : '+view.fighters[1].hp+
    '  ·  중앙 점령 '+view.score[0]+' : '+view.score[1];
 }
}
async function execute(){
 if(queue.length!==3||playing)return;
 const err=validateQueue(match,0,queue);if(err){toast(err);return;}
 const thisRun=++runToken;playerPlan=structuredClone(queue);revealed=[];enemyPlan=[];
 playing=true;render();
 let opponent,round;
 try{
  opponent=chooseAI(match,selection.difficulty,1);
  round=resolveRound(match,[queue,opponent]);
  enemyPlan=structuredClone(opponent);renderReveal();
 }catch(err){playing=false;toast("실행 오류: "+err.message);render();return;}
 for(const frame of round.frames){
  await new Promise(ok=>setTimeout(ok,850));
  if(thisRun!==runToken)return;
  revealed.push(frame.beat-1);renderReveal();
  const previous=view;
  view=frame.state;renderHUD();renderBoard();renderLog();animateBeat(frame,previous);
  if(frame.events.some(e=>e.type==="hit"&&e.amount>0))playSound("hit");else playSound("tap");
 }
 await new Promise(ok=>setTimeout(ok,450));
 if(thisRun!==runToken)return;
 match=round.state;view=match;queue=[];preview=null;pending=null;playing=false;render();
 if(match.status==="finished")toast(match.winner===0?"섹터 승리!":match.winner===1?"패배. 전술을 다시 검토해보세요.":"무승부.");
 else toast("ROUND "+match.round+" · EN 15 회복");
}
function animateBeat(frame,previous){
 const arena=$(".battle-arena");
 arena.classList.remove("impact");
 void arena.offsetWidth;
 const hits=frame.events.filter(e=>e.type==="hit"&&e.amount>0);
 if(hits.length)arena.classList.add("impact");
 for(let i=0;i<2;i++){
  const unit=$(i===0?".player-unit":".enemy-unit");
  if(!unit)continue;
  const before=previous.fighters[i],after=view.fighters[i];
  if(before.x!==after.x||before.y!==after.y)unit.classList.add("moving");
  const damage=Math.max(0,before.hp-after.hp);
  if(damage){
   unit.classList.add("damaged");
   const number=document.createElement("span");number.className="damage-float";number.textContent="?"+damage;unit.append(number);
  }
  if(frame.events.some(e=>e.type==="guard"&&e.side===i)){
   const shield=document.createElement("span");shield.className="guard-flash";shield.textContent="GUARD";unit.append(shield);
  }
 }
 $("#beat-counter").textContent="BEAT "+frame.beat+" / 3";
}
function showHelp(){
 $("#help").showModal();
}
document.addEventListener("click",e=>{
 const el=e.target.closest("[data-pick-player],[data-card],[data-remove],[data-dir],[data-cancel],[data-tile],[data-action]");
 if(!el)return;
 if(el.dataset.pickPlayer){
  selection.player=el.dataset.pickPlayer;
  if(selection.enemy===selection.player)selection.enemy=Object.keys(CHARACTERS).find(v=>v!==selection.player);
  reset();
 }
 else if(el.dataset.card)selectCard(el.dataset.card);
 else if(el.dataset.remove!==undefined){
  if(!playing&&queue[Number(el.dataset.remove)]){queue.splice(Number(el.dataset.remove),1);pending=null;preview=null;render();}
 }
 else if(el.dataset.dir&&pending){addToQueue({id:pending.id,direction:el.dataset.dir});}
 else if(el.dataset.cancel){pending=null;preview=null;render();}
 else if(el.dataset.tile&&pending?.id==="raven_trap"){
  const [x,y]=el.dataset.tile.split(",").map(Number);
  const choices=options(match,0,pending.id);
  if(choices.some(a=>a.target.x===x&&a.target.y===y))addToQueue({id:pending.id,target:{x,y}});
  else toast("시전자 맨해튼 거리 2 이내의 빈 칸만 선택할 수 있습니다.");
 }
 else if(el.dataset.action==="execute")execute();
 else if(el.dataset.action==="reset")reset();
 else if(el.dataset.action==="help")showHelp();
 else if(el.dataset.action==="close-help")$("#help").close();
 else if(el.dataset.action==="sound"){sound=!sound;el.textContent=sound?"♪ 사운드 켬":"♪ 음소거";}
});
document.addEventListener("pointerover",e=>{
 if(pending||playing)return;
 const el=e.target.closest("[data-card]");if(!el)return;
 if(preview?.id!==el.dataset.card){preview={id:el.dataset.card};renderBoard();}
});
document.addEventListener("pointerout",e=>{
 if(pending||playing)return;
 const el=e.target.closest("[data-card]");if(!el)return;
 if(!el.contains(e.relatedTarget)){preview=null;renderBoard();}
});
$("#enemy-select").addEventListener("change",e=>{selection.enemy=e.target.value;reset();});
$("#difficulty").addEventListener("change",e=>{selection.difficulty=e.target.value;reset();});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&pending){pending=null;preview=null;render();}
 if(e.key==="Enter"&&queue.length===3&&!playing&&$("#help").open===false){e.preventDefault();execute();}
 if(e.key==="Backspace"&&queue.length&&!playing){queue.pop();render();}
 if(e.key.toLowerCase()==="h"&&e.target.tagName!=="INPUT")showHelp();
});
render();
