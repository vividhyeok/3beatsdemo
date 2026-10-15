import {deckOf,CARD_MAP,options,rangeAt,validateQueue,resolveRound,evaluate,dist,inside} from "./game.js";
function weighted(arr){
 const total=arr.reduce((a,v)=>a+Math.max(0.01,v.weight),0);let roll=Math.random()*total;
 for(const v of arr){roll-=Math.max(0.01,v.weight);if(roll<=0)return v.value;}return arr[arr.length-1].value;
}
function point(s,side,action,previous=[],history=null){
 const f=s.fighters[side],e=s.fighters[1-side],c=CARD_MAP[action.id];
 const distance=dist(f,e),dx=Math.abs(e.x-f.x);
 let w=1;
 if(c.id==="focus")w=f.en<22?7:f.en<45?3:.6;
 else if(c.id==="guard")w=distance<=2?2.4:0.5;
 else if(c.id==="raven_ward")w=distance<=3?3.4:0.7;
 else if(c.id==="forward")w=dx>=2?4:1.4;
 else if(c.id==="back")w=dx===1?2.0:.8;
 else if(c.id==="up"||c.id==="down"){const ny=f.y+(c.id==="up"?-1:1);w=inside(f.x,ny)?1.5:.12;}
 else if(c.kind==="attack"||c.kind==="ultimate"){
  const r=rangeAt(s,side,action),hit=r.direct.some(x=>x.x===e.x&&x.y===e.y),
     glance=r.glance.some(x=>x.x===e.x&&x.y===e.y);
  w=hit?5.8:glance?3.5:distance<=3?2:.9;
  if(c.kind==="ultimate"&&f.en<65)w*=.75;
 }
 if(c.id==="raven_trap"){
  w=distance<=2?2.6:1.8;
  if(action.target&&dist(action.target,e)<=1)w*=2;
 }
 if(c.id==="raven_ult")w=s.trap&&s.trap.owner===side?3:0.35;
 if(c.id==="zeta_long")w=dx>=2&&action.direction==="forward"?4.2:1.6;
 if(c.id==="zeta_slide"||c.id==="zeta_brake"||c.id==="zeta_ult"){
  const ny=f.y+(action.direction==="up"?-1:1);
  if(!inside(f.x,ny))w*=.12;
 }
 if(previous.length>=2&&c.cost>40)w*=.65;
 if(history&&history.length){
  const same=history.filter(a=>a.id===c.id).length;
  w*=1+Math.min(1.8,same*.27);
 }
 return w;
}
function sampleQueue(s,side,history){
 let en=s.fighters[side].en;let seen=new Set(),hasTrap=s.trap&&s.trap.owner===side,queue=[];
 for(let b=0;b<3;b++){
  let pool=[];
  for(const c of deckOf(s.fighters[side].character)){
   if(!c.repeat&&seen.has(c.id))continue;
   if(c.id==="raven_ult"&&!hasTrap)continue;
   if(c.id!=="focus"&&c.cost>en)continue;
   for(const action of options(s,side,c.id)){
    const w=point(s,side,action,queue,history&&history[b]);
    pool.push({value:action,weight:w});
   }
  }
  if(!pool.length)pool=[{value:{id:"focus"},weight:1}];
  const a=weighted(pool);queue.push(a);seen.add(a.id);
  if(a.id==="focus")en=Math.min(100,en+30);else en-=CARD_MAP[a.id].cost;
  if(a.id==="raven_trap")hasTrap=true;
  if(a.id==="raven_ult")hasTrap=false;
 }
 return queue;
}
function candidateQueues(s,side,count,history){
 const seq=[],seen=new Set();let attempts=0;
 while(seq.length<count&&attempts<count*30){
  attempts++;
  const q=sampleQueue(s,side,history),key=JSON.stringify(q);
  if(seen.has(key)||validateQueue(s,side,q))continue;
  seen.add(key);seq.push(q);
 }
 if(!seq.length)seq.push([{id:"focus"},{id:"guard"},{id:"forward"}]);
 return seq;
}
function historyFor(s,side){
 return s.history.map(h=>h.queues[side]).slice(-8);
}
export function chooseAI(state,difficulty="normal",side=1){
 const budgets={easy:[16,6],normal:[55,18],expert:[115,32]},[ownN,theirN]=budgets[difficulty]||budgets.normal;
 // Only publicly revealed actions from PREVIOUS rounds. No access to current player's queue.
 const habit=historyFor(state,1-side);
 const ours=candidateQueues(state,side,ownN,null);
 const rivals=candidateQueues(state,1-side,theirN,habit);
 let best=ours[0],high=-Infinity;
 for(const candidate of ours){
  let total=0,min=Infinity;
  for(const opposition of rivals){
   let result;
   try{
    result=resolveRound(state,side===0?[candidate,opposition]:[opposition,candidate],{presentation:false}).state;
   }catch{continue;}
   const value=evaluate(result,side);total+=value;
   if(value<min)min=value;
  }
  const mean=total/rivals.length;
  // Expert sacrifices short-term damage for more robust tactical lines.
  let value=mean+(difficulty==="expert"?.16:difficulty==="normal"?.06:0)*min;
  if(difficulty==="easy")value+=Math.random()*70;
  else if(difficulty==="normal")value+=Math.random()*12;
  else value+=Math.random()*3;
  if(value>high){high=value;best=candidate;}
 }
 return best;
}
