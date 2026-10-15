import fs from 'node:fs';
const engineArg=process.argv.find(x=>x.startsWith('--engine='));
const engine=await import(engineArg?new URL(engineArg.split('=')[1],import.meta.url):'../src/game.js');
const {ALL_CARDS,CARD_MAP,CHARACTERS,deckOf,newGame,options,rangeAt,resolveRound,validateQueue,dist}=engine;

const seed=20261016; let rng=seed;
function random(){rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;}
const ids=Object.keys(CHARACTERS), strategies=['attack','guard','mobility','efficient','range','pressure','trap','response','random'];
function queueFor(s,side,strategy){
 const used=new Set(),q=[];let en=s.fighters[side].en,trap=!!s.trap&&s.trap.owner===side;
 for(let beat=0;beat<3;beat++){
  const pool=[];
  for(const c of deckOf(s.fighters[side].character)){
   if((used.has(c.id)&&!c.repeat)||(c.id==='raven_ult'&&!trap)||c.cost>en)continue;
   for(const a of options(s,side,c.id)){
    let value=random()*2;
    const f=s.fighters[side],e=s.fighters[1-side],range=rangeAt(s,side,a);
    const hit=range.direct.some(p=>p.x===e.x&&p.y===e.y),graze=range.glance.some(p=>p.x===e.x&&p.y===e.y);
    const damage=hit?c.damage:graze?c.glance:0;
    if(strategy==='attack')value+=damage*.1;
    if(strategy==='guard')value+=c.id==='guard'||c.id==='raven_ward'||c.id==='zeta_brake'?7:damage*.05;
    if(strategy==='mobility')value+=c.kind==='move'||['zeta_slide','zeta_brake','eve_retreat'].includes(c.id)?7:damage*.04;
    if(strategy==='efficient')value+=damage/(c.cost+10)*4+(c.id==='focus'&&en<35?5:0);
    if(strategy==='range')value+=f.character==='eve'&&c.damage?damage*.12:Math.abs(f.x-e.x)<2&&c.id==='back'?8:0;
    if(strategy==='pressure')value+=dist(f,e)>1&&['forward','jack_dash','zeta_long'].includes(c.id)?8:damage*.1;
    if(strategy==='trap')value+=c.id==='raven_trap'&&dist(a.target,e)<=1?10:c.id==='raven_ult'?8:damage*.05;
    if(strategy==='response')value+=damage*.08+(dist(f,e)<=2&&c.id==='guard'?4:0)+(c.id==='raven_ward'&&dist(f,e)<=3?6:0);
    if(strategy==='random')value=random();
    pool.push({a,value});
   }
  }
  pool.sort((a,b)=>b.value-a.value);const a=pool[0]?.a||{id:'forward'};q.push(a);used.add(a.id);
  en=a.id==='focus'?Math.min(100,en+30):en-CARD_MAP[a.id].cost;
  if(a.id==='raven_trap')trap=true;if(a.id==='raven_ult')trap=false;
 }
 return validateQueue(s,side,q)?[{id:'focus'},{id:'guard'},{id:'forward'}]:q;
}
function duel(a,b,sa,sb){let s=newGame(a,b),rounds=0;while(s.status!=='finished'&&rounds++<10){const q=[queueFor(s,0,sa),queueFor(s,1,sb)];s=resolveRound(s,q,{presentation:false}).state;}return s;}
const oneBeat={positions:132,cardPairs:0,direct:{},graze:{},miss:{},rangeCells:{}};
for(const c of ALL_CARDS){oneBeat.direct[c.id]=0;oneBeat.graze[c.id]=0;oneBeat.miss[c.id]=0;oneBeat.rangeCells[c.id]=0;}
for(const a of ids)for(const b of ids)for(let ay=0;ay<3;ay++)for(let ax=0;ax<4;ax++)for(let by=0;by<3;by++)for(let bx=0;bx<4;bx++){
 if(ax===bx&&ay===by)continue;const s=newGame(a,b);Object.assign(s.fighters[0],{x:ax,y:ay,en:100});Object.assign(s.fighters[1],{x:bx,y:by,en:100});
 const actions=[0,1].map(side=>deckOf(s.fighters[side].character).flatMap(c=>options(s,side,c.id)));
 oneBeat.cardPairs+=actions[0].length*actions[1].length;
 for(const action of actions[0]){const r=rangeAt(s,0,action),id=action.id,p=s.fighters[1];oneBeat.rangeCells[id]+=r.direct.length+r.glance.length;
  if(r.direct.some(v=>v.x===p.x&&v.y===p.y))oneBeat.direct[id]++;else if(r.glance.some(v=>v.x===p.x&&v.y===p.y))oneBeat.graze[id]++;else oneBeat.miss[id]++;}
}
const results={},gamesPerPair=Number(process.argv.find(x=>x.startsWith('--games='))?.split('=')[1]||324);
for(const a of ids)for(const b of ids){const key=a+'-vs-'+b;let win=0,draw=0,hp=0;
 for(let i=0;i<gamesPerPair;i++){const s=duel(a,b,strategies[i%strategies.length],strategies[Math.floor(i/strategies.length)%strategies.length]);win+=s.winner===0;draw+=s.winner===-1;hp+=s.fighters[0].hp-s.fighters[1].hp;}
 const rate=(win+draw*.5)/gamesPerPair;results[key]={games:gamesPerPair,wins:win,draws:draw,scoreRate:rate,hpDifference:hp/gamesPerPair,ci95HalfWidth:1.96*Math.sqrt(rate*(1-rate)/gamesPerPair)};
}
const report={seed,strategies,gamesPerPair,oneBeat,matchups:results,cards:ALL_CARDS.map(c=>({id:c.id,cost:c.cost,damage:c.damage,glance:c.glance,direct:oneBeat.direct[c.id],graze:oneBeat.graze[c.id],miss:oneBeat.miss[c.id]}))};
fs.mkdirSync('docs/balance',{recursive:true});fs.writeFileSync(process.argv.includes('--baseline')?'docs/balance/baseline.json':'docs/balance/current.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({seed,games:ids.length**2*gamesPerPair,oneBeatCardPairs:oneBeat.cardPairs,matchups:results},null,2));
