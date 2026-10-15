// THREE BEATS deterministic duel engine. No engine dependencies.
export const W=4,H=3,MAX_ROUNDS=10,MAX_HP=120,MAX_EN=100;
export const CHARACTERS={
  jack:{name:"JACK",ko:"잭",role:"VANGUARD",title:"처형인",desc:"강력한 근접 압박과 정교한 사거리.",color:"#f26b66",symbol:"剣",portrait:"assets/jack.svg"},
  eve:{name:"EVE",ko:"이브",role:"SNIPER",title:"관측자",desc:"거리를 계산하고 라인을 통제하는 저격수.",color:"#69c4ff",symbol:"◈",portrait:"assets/eve.svg"},
  raven:{name:"RAVEN",ko:"레이븐",role:"TRAPPER",title:"주술해커",desc:"다음 라운드의 공간을 미리 지배한다.",color:"#ba92fb",symbol:"✧",portrait:"assets/raven.svg"},
  zeta:{name:"ZETA",ko:"제타",role:"TRICKSTER",title:"스트릿 러너",desc:"엇박 이동으로 공격을 흘리는 기동 전문가.",color:"#f0ca76",symbol:"↯",portrait:"assets/zeta.svg"}
};
function card(id,name,cost,damage,glance,description,kind,icon,extra={}){
 return {id,name,cost,damage,glance,description,kind,icon,...extra};
}
export const COMMON=[
 card("forward","전진",0,0,0,"상대 쪽으로 1칸 이동","move","→",{repeat:true}),
 card("back","후퇴",0,0,0,"상대 반대쪽으로 1칸 이동","move","←",{repeat:true}),
 card("up","위로 이동",0,0,0,"위쪽으로 1칸 이동","move","↑",{repeat:true}),
 card("down","아래로 이동",0,0,0,"아래쪽으로 1칸 이동","move","↓",{repeat:true}),
 card("guard","방어",0,0,0,"이번 비트 받는 피해 30 감소","defense","◇"),
 card("focus","집중",0,0,0,"즉시 EN 30 회복","energy","✦")
];
export const UNIQUE={
 jack:[
  card("jack_jab","견제 베기",10,30,15,"전방 1칸 직격 · 상하 대각선 스침","attack","╱"),
  card("jack_dash","압박 돌진",25,25,15,"전진 1칸 후 전방 1칸 직격","attack","➤"),
  card("jack_slam","대검 내려찍기",35,60,30,"전방 2칸 직격 · 1칸 스침","attack","⚔"),
  card("jack_spin","회전 베기",30,35,20,"인접 8칸 타격 · 정면 직격","attack","◎"),
  card("jack_ult","파쇄선",60,70,35,"전방 1~2칸 직격 · 주변 스침","ultimate","✷")
 ],
 eve:[
  card("eve_aim","가늠탄",10,30,15,"전방 2칸 직격 · 1·3칸 스침","attack","⊙"),
  card("eve_pierce","관통사격",20,40,20,"전방 1~3칸 직격 · 측면 스침","attack","➵"),
  card("eve_retreat","후퇴사격",25,30,15,"후퇴 후 전방 1~2칸 직격","attack","↶"),
  card("eve_cross","교차조준",30,40,20,"전방 2칸 상하 대각선 직격","attack","⤨"),
  card("eve_ult","멸점저격",60,70,35,"전방 3칸 직격 · 주변 스침","ultimate","✹")
 ],
 raven:[
  card("raven_jab","부적 타격",10,30,15,"전방 1칸 직격 · 대각선 스침","attack","♢"),
  card("raven_push","역위상",20,40,20,"전방 직격 시 상대 1칸 밀기","attack","⋙"),
  card("raven_trap","좌표 각인",15,45,25,"거리 2 이내 타일에 다음 라운드 함정 설치","trap","⌗",{target:true}),
  card("raven_ward","경계 부적",20,30,20,"피해 30 감소 · 인접 상대 반격 30","defense","◈"),
  card("raven_ult","과부하",45,65,30,"설치한 함정을 즉시 폭발","ultimate","✺")
 ],
 zeta:[
  card("zeta_jab","톤파 견제",10,30,15,"전방 1칸 직격 · 상하 스침","attack","╱"),
  card("zeta_slide","사이드 슬라이드",15,40,20,"위·아래 1칸 이동 후 전방 타격","attack","⤴",{directions:["up","down"]}),
  card("zeta_long","롱 슬라이드",10,0,0,"전진 또는 후퇴 최대 2칸","move","⇄",{directions:["forward","back"]}),
  card("zeta_brake","브레이크",10,0,0,"위·아래 1칸 이동 · 피해 15 감소","defense","⤓",{directions:["up","down"]}),
  card("zeta_ult","엇박 난무",45,60,30,"전방 대각선 이동 후 강력한 공격","ultimate","✶",{directions:["up","down"]})
 ]
};
export const ALL_CARDS=[...COMMON,...Object.values(UNIQUE).flat()];
export const CARD_MAP=Object.fromEntries(ALL_CARDS.map(c=>[c.id,c]));
export function deckOf(id){return [...COMMON,...UNIQUE[id]];}
export function inside(x,y){return x>=0&&x<W&&y>=0&&y<H;}
export function dist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
export function newGame(player="jack",opponent="eve"){
 const fighter=(character,x,facing)=>({character,x,y:1,facing,hp:MAX_HP,en:45,damageTaken:0});
 return {fighters:[fighter(player,0,1),fighter(opponent,3,-1)],round:1,beat:0,score:[0,0],trap:null,
  winner:null,status:"planning",history:[],log:["섹터 진입 · 상대의 다음 3비트를 읽으세요."]};
}
export function facing(state,i){
 const a=state.fighters[i],b=state.fighters[1-i];
 return b.x===a.x?a.facing:(b.x>a.x?1:-1);
}
export function options(state,i,id){
 const c=CARD_MAP[id];if(!c)return [];
 if(c.target){
  const me=state.fighters[i],enemy=state.fighters[1-i],res=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(dist(me,{x,y})<=3&&!(x===me.x&&y===me.y)&&!(x===enemy.x&&y===enemy.y))
   res.push({id,target:{x,y}});
  return res;
 }
 return c.directions?c.directions.map(direction=>({id,direction})):[{id}];
}
export function validateQueue(state,i,queue){
 if(!Array.isArray(queue)||queue.length!==3)return "행동 카드 3장을 예약해야 합니다.";
 let energy=state.fighters[i].en,seen=new Set(),hasTrap=state.trap&&state.trap.owner===i;
 for(const a of queue){
  const c=CARD_MAP[a&&a.id];if(!c||!deckOf(state.fighters[i].character).some(v=>v.id===c.id))return "사용할 수 없는 카드가 있습니다.";
  if(!c.repeat&&seen.has(c.id))return "같은 고유 기술·방어·집중은 한 라운드에 한 번만 사용할 수 있습니다.";
  seen.add(c.id);
  if(c.directions&&!c.directions.includes(a.direction))return "기술 방향을 선택하세요.";
  if(c.target&&(!a.target||!inside(a.target.x,a.target.y)||dist(state.fighters[i],a.target)>3))return "함정 설치 위치를 선택하세요.";
  if(c.id==="raven_ult"&&!hasTrap&& !seen.has("raven_trap"))return "과부하는 먼저 설치된 함정이 있어야 합니다.";
  if(c.id==="raven_trap")hasTrap=true;
  if(c.id==="raven_ult")hasTrap=false;
  if(c.id==="focus")energy=Math.min(MAX_EN,energy+30);else energy-=c.cost;
  if(energy<0)return "기력이 부족합니다. 집중 카드로 회복하거나 순서를 바꾸세요.";
 }
 return null;
}
export function rangeAt(state,i,action,origin){
 const c=CARD_MAP[action.id];const a=origin||state.fighters[i],b=state.fighters[1-i];
 const face=b.x===a.x?a.facing:(b.x>a.x?1:-1),id=action.id;
 const direct=[],glance=[];
 if(id==="raven_trap"||id==="raven_ult"){
  const target=id==="raven_trap"?action.target:state.trap&&state.trap.pos;
  if(target)for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const d=Math.abs(x-target.x)+Math.abs(y-target.y);
   if(d===0)direct.push({x,y});else if(d===1)glance.push({x,y});
  }
  return {direct,glance};
 }
 if(!["attack","ultimate"].includes(c.kind)&&id!=="raven_ward")return {direct,glance};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const r=(x-a.x)*face,d=y-a.y,ad=Math.abs(d),cheb=Math.max(Math.abs(x-a.x),ad);
  let hit=0;
  if(["jack_jab","jack_dash","raven_jab","zeta_jab","zeta_slide","zeta_ult"].includes(id))
   hit=r===1&&ad===0?2:r===1&&ad===1?1:0;
  else if(id==="jack_slam")hit=r===2&&ad===0?2:r===1&&ad===0?1:0;
  else if(id==="jack_spin")hit=cheb===1?(r===1&&ad===0?2:1):0;
  else if(id==="jack_ult")hit=r>=1&&r<=2?(ad===0?2:ad===1?1:0):0;
  else if(id==="eve_aim")hit=ad===0?(r===2?2:r===1||r===3?1:0):0;
  else if(id==="eve_pierce")hit=ad===0&&r>=2&&r<=3?2:r===1&&ad===0||r===2&&ad===1?1:0;
  else if(id==="eve_retreat")hit=ad===0&&r>=1&&r<=2?2:r===1&&ad===1?1:0;
  else if(id==="eve_cross")hit=ad===1?(r===2?2:r===1?1:0):0;
  else if(id==="eve_ult")hit=ad===0?(r===3?2:r===2?1:0):r===3&&ad===1?1:0;
  else if(id==="raven_push")hit=ad===0&&r>=1&&r<=2?2:r===3&&ad===0||r===1&&ad===1?1:0;
  else if(id==="raven_ward")hit=(Math.abs(x-a.x)+ad)===1?2:ad===0&&r>=2&&r<=3?1:0;
  if(hit===2)direct.push({x,y});else if(hit===1)glance.push({x,y});
 }
 return {direct,glance};
}
function inCells(arr,p){return arr.some(t=>t.x===p.x&&t.y===p.y);}
function targetFor(me,face,action){
 const id=action.id;let dx=0,dy=0,steps=1;
 if(id==="forward"||id==="jack_dash")dx=face;
 else if(id==="back"||id==="eve_retreat")dx=-face;
 else if(id==="up")dy=-1;
 else if(id==="down")dy=1;
 else if(["zeta_slide","zeta_brake"].includes(id)){dy=action.direction==="up"?-1:1;if(id==="zeta_slide")dx=face;}
 else if(id==="zeta_long"){dx=action.direction==="forward"?face:-face;steps=2;}
 else if(id==="zeta_ult"){dx=face;dy=action.direction==="up"?-1:1;}
 return {dx,dy,steps};
}
export function projectPath(state,side,actions){
 const me={...state.fighters[side]},enemy=state.fighters[1-side],path=[],risks=[];
 for(const action of actions){
  if(!action)continue;
  const face=enemy.x===me.x?me.facing:(enemy.x>me.x?1:-1),move=targetFor(me,face,action);
  for(let step=0;step<move.steps;step++){
   if(!move.dx&&!move.dy)break;
   const next={x:me.x+move.dx,y:me.y+move.dy};
   if(!inside(next.x,next.y)){risks.push('edge');break;}
   if(next.x===enemy.x&&next.y===enemy.y){risks.push('occupied');break;}
   me.x=next.x;me.y=next.y;path.push({...next});
  }
 }
 return {origin:me,path,risks,uncertain:true};
}
function performMovement(s,actions,ev,trace){
 const moves=s.fighters.map((me,i)=>targetFor(me,me.facing,actions[i]));
 for(let step=0;step<2;step++){
  const old=s.fighters.map(f=>({x:f.x,y:f.y}));
  const wished=s.fighters.map((f,i)=>{
   const m=moves[i];if(step>=m.steps||(!m.dx&&!m.dy))return old[i];
   const x=f.x+m.dx,y=f.y+m.dy;
   return inside(x,y)?{x,y}:old[i];
  });
  const same=wished[0].x===wished[1].x&&wished[0].y===wished[1].y;
  const swapped=wished[0].x===old[1].x&&wished[0].y===old[1].y&&wished[1].x===old[0].x&&wished[1].y===old[0].y;
  const blocked=[false,false];
  if(same||swapped){blocked[0]=true;blocked[1]=true;}
  for(let i=0;i<2;i++){
   if(wished[i].x===old[1-i].x&&wished[i].y===old[1-i].y&&wished[1-i].x===old[1-i].x&&wished[1-i].y===old[1-i].y)
    blocked[i]=true;
  }
  for(let i=0;i<2;i++){
   if(!blocked[i]){
    if(trace&&(old[i].x!==wished[i].x||old[i].y!==wished[i].y))ev.push({type:"move",side:i,card:actions[i].id,step,from:{...old[i]},to:{...wished[i]}});
    s.fighters[i].x=wished[i].x;s.fighters[i].y=wished[i].y;
   }
   else if((wished[i].x!==old[i].x||wished[i].y!==old[i].y))ev.push({type:"block",side:i,text:(i===0?"플레이어":"AI")+" 이동 충돌"});
  }
 }
 for(let i=0;i<2;i++)if(oldDiff(s.fighters[i],s.fighters[1-i])!==0)s.fighters[i].facing=oldDiff(s.fighters[i],s.fighters[1-i])>0?1:-1;
}
function oldDiff(a,b){return b.x-a.x;}
function explosion(s,owner,pos,damage,glance,ev,label,trace,card){
 const other=1-owner,p=s.fighters[other],d=dist(pos,p),raw=d===0?damage:d===1?glance:0;
 if(trace){
  const direct=[{...pos}],grazing=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(dist(pos,{x,y})===1)grazing.push({x,y});
  ev.push({type:"attack",side:owner,card,source:label,origin:{...s.fighters[owner]},center:{...pos},target:{x:p.x,y:p.y},range:{direct,glance:grazing},grade:d===0?"direct":d===1?"graze":"miss",raw,explosion:true});
 }
 if(raw){ev.push({type:"hit",side:other,amount:raw,source:label,grade:d===0?"direct":"graze"});return raw;}
 ev.push({type:"miss",side:owner,text:label+" 빗나감"});
 return 0;
}
export function resolveRound(input,queues,{presentation=true}={}){
 const s=structuredClone(input);if(s.winner!==null||s.status==="finished")return {state:s,frames:[]};
 const errors=queues.map((q,i)=>validateQueue(s,i,q));if(errors.some(Boolean))throw Error(errors.filter(Boolean).join(" / "));
 const frames=[];
 for(let beat=1;beat<=3;beat++){
  const actions=[queues[0][beat-1],queues[1][beat-1]],ev=[],active=[true,true],guards=[0,0];
  s.beat=beat;
  // Confirm costs and effects before movement.
  for(let i=0;i<2;i++){
   const c=CARD_MAP[actions[i].id],f=s.fighters[i];
   if(c.id==="raven_ult"&&!(s.trap&&s.trap.owner===i)){active[i]=false;ev.push({type:"fizzle",side:i,text:"함정이 없어 과부하 실패"});continue;}
   if(f.en<c.cost){active[i]=false;ev.push({type:"fizzle",side:i,text:"EN 부족: "+c.name});continue;}
   f.en-=c.cost;
   if(c.id==="focus")f.en=Math.min(MAX_EN,f.en+30);
   if(c.id==="guard"||c.id==="raven_ward")guards[i]+=30;
   if(c.id==="zeta_brake")guards[i]+=30;
   ev.push({type:"action",side:i,text:c.name});
  }
  const moving=actions.map((a,i)=>active[i]?a:{id:"idle"});
  performMovement(s,moving,ev,presentation);
  const movement=presentation?structuredClone(s):null;
  const rawDamage=[0,0],pushes=[];
  // Environment and traps trigger after movement, before current attacks.
  if(s.trap&&s.trap.armedRound===s.round&&beat===2&&!(active[s.trap.owner]&&actions[s.trap.owner].id==="raven_ult")){
   const t=s.trap;rawDamage[1-t.owner]+=explosion(s,t.owner,t.pos,45,25,ev,"좌표 각인",presentation,"raven_trap");
   s.trap=null;
  }
  for(let i=0;i<2;i++){
   if(!active[i])continue;
   const a=actions[i],id=a.id,c=CARD_MAP[id],other=1-i;
   if(id==="raven_trap"){
    if(a.target&&inside(a.target.x,a.target.y)&&dist(s.fighters[i],a.target)<=3&&
       !(s.fighters[0].x===a.target.x&&s.fighters[0].y===a.target.y)&&
       !(s.fighters[1].x===a.target.x&&s.fighters[1].y===a.target.y)){
      s.trap={owner:i,pos:{...a.target},armedRound:s.round+1};
      ev.push({type:"trap",side:i,card:id,pos:{...a.target},text:"함정 설치 ("+(a.target.x+1)+","+(a.target.y+1)+")"});
    }else ev.push({type:"fizzle",side:i,text:"함정 설치 위치 무효"});
    continue;
   }
   if(id==="raven_ult"){
    if(s.trap&&s.trap.owner===i){
     const t=s.trap;rawDamage[other]+=explosion(s,i,t.pos,65,30,ev,"과부하",presentation,"raven_ult");s.trap=null;
    }continue;
   }
   if(id==="raven_ward"&&(!active[other]||CARD_MAP[actions[other].id].damage===0))continue;
   const r=rangeAt(s,i,a);const p=s.fighters[other];
   const grade=inCells(r.direct,p)?"direct":inCells(r.glance,p)?"graze":null;
   if(presentation&&(c.damage>0||id==="raven_ward"))ev.push({type:"attack",side:i,card:id,source:c.name,origin:{...s.fighters[i]},target:{x:p.x,y:p.y},range:structuredClone(r),grade:grade||"miss",raw:grade==="direct"?c.damage:grade==="graze"?c.glance:0});
   if(grade){
    rawDamage[other]+=grade==="direct"?c.damage:c.glance;
    ev.push({type:"hit",side:other,amount:grade==="direct"?c.damage:c.glance,source:c.name,grade});
    if(id==="raven_push"&&grade==="direct")pushes.push({side:other,dir:s.fighters[i].facing});
   }else if(c.damage>0||id==="raven_ward")ev.push({type:"miss",side:i,text:c.name+" 빗나감"});
  }
  for(let i=0;i<2;i++){
   const hpBefore=s.fighters[i].hp,dealt=Math.max(0,rawDamage[i]-guards[i]);s.fighters[i].hp=Math.max(0,s.fighters[i].hp-dealt);
   s.fighters[i].damageTaken+=dealt;
   if(active[i]&&actions[i].id==="zeta_brake"&&rawDamage[i]===0&&CARD_MAP[actions[1-i].id].damage>0){
    s.fighters[i].en=Math.min(MAX_EN,s.fighters[i].en+15);
    ev.push({type:"energy",side:i,amount:15,text:"회피 성공 / EN +15"});
   }
   if(presentation)ev.push({type:"damage",side:i,pos:{x:s.fighters[i].x,y:s.fighters[i].y},raw:rawDamage[i],blocked:Math.min(rawDamage[i],guards[i]),dealt,hpBefore,hpAfter:s.fighters[i].hp,actual:hpBefore-s.fighters[i].hp});
   if(rawDamage[i]&&guards[i])ev.push({type:"guard",side:i,amount:Math.min(rawDamage[i],guards[i]),text:"방어 감소"});
  }
  if(presentation){
   const remainingGuard=[...guards],remainingHP=movement.fighters.map(f=>f.hp);
   for(const attack of ev.filter(e=>e.type==="attack")){
    const target=1-attack.side;attack.blocked=Math.min(attack.raw,remainingGuard[target]);remainingGuard[target]-=attack.blocked;
    attack.dealt=attack.raw-attack.blocked;attack.actual=Math.min(attack.dealt,remainingHP[target]);remainingHP[target]-=attack.actual;
   }
  }
  for(const p of pushes){
   const f=s.fighters[p.side],nx=f.x+p.dir;
   const other=s.fighters[1-p.side];
   if(inside(nx,f.y)&&!(nx===other.x&&f.y===other.y)){f.x=nx;ev.push({type:"push",side:p.side,from:{x:nx-p.dir,y:f.y},to:{x:nx,y:f.y},text:"밀려남"});}
  }
  if(s.fighters[0].hp===0||s.fighters[1].hp===0){
   s.status="finished";s.winner=s.fighters[0].hp===s.fighters[1].hp?-1:(s.fighters[0].hp>0?0:1);
  }
  const headline="R"+s.round+" · BEAT "+beat;
  s.log=[headline+" — "+ev.filter(x=>!["move","attack","damage"].includes(x.type)).map(x=>x.text||x.source+" "+x.amount).join(" / "),...s.log].slice(0,50);
  frames.push({round:s.round,beat,actions:structuredClone(actions),events:ev,...(presentation?{movement}:{}),state:structuredClone(s)});
  if(s.status==="finished")break;
 }
 s.history.push({round:s.round,queues:structuredClone(queues)});
 if(s.status!=="finished"){
  for(let i=0;i<2;i++){
   const f=s.fighters[i];f.en=Math.min(MAX_EN,f.en+15);
   if((f.x===1||f.x===2)&&f.y===1)s.score[i]++;
  }
  if(s.round>=MAX_ROUNDS){
   s.status="finished";s.winner=s.fighters[0].hp!==s.fighters[1].hp?(s.fighters[0].hp>s.fighters[1].hp?0:1):
     s.score[0]===s.score[1]?-1:(s.score[0]>s.score[1]?0:1);
  }else{s.round++;s.beat=0;s.status="planning";}
 }
 return {state:s,frames};
}
export function evaluate(s,side){
 const mine=s.fighters[side],other=s.fighters[1-side];
 if(s.status==="finished")return s.winner===side?10000:s.winner===-1?0:-10000;
 const central=(f)=>((f.x===1||f.x===2)&&f.y===1?1:0);
 return (mine.hp-other.hp)*3+(mine.en-other.en)*.13+(central(mine)-central(other))*7+
   (s.score[side]-s.score[1-side])*4;
}
