import gzip,json
from collections import defaultdict
from pathlib import Path

root=Path(__file__).resolve().parents[1]
path=root/'docs'/'balance'/'one-beat-cases.ndjson.gz'
stats=defaultdict(lambda:dict(uses=0,direct=0,graze=0,miss=0,actualDamage=0,rawReceived=0,actualReceived=0,moves=0,blocks=0))
with gzip.open(path,'rt',encoding='utf-8') as source:
 for line in source:
  row=json.loads(line)
  for side in (0,1):
   id=row['actions'][side].split(':')[0];s=stats[id];s['uses']+=1
   hit=next((h for h in row['hits'] if h[0]==1-side),None)
   if hit:
    s[hit[2] if hit[2] in ('direct','graze') else 'miss']+=1
   else:s['miss']+=1
   s['actualDamage']+=120-row['end'][1-side][2]
   s['rawReceived']+=sum(h[1] for h in row['hits'] if h[0]==side)
   s['actualReceived']+=120-row['end'][side][2]
   x,y=row['pos'][0 if side==0 else 2:2 if side==0 else 4]
   s['moves']+=row['end'][side][0]!=x or row['end'][side][1]!=y
   s['blocks']+=side in row['blocked']
result={id:{**s,'meanActualDamage':s['actualDamage']/s['uses'],'directRate':s['direct']/s['uses'],'grazeRate':s['graze']/s['uses'],'positionChangeRate':s['moves']/s['uses'],'blockRate':s['blocks']/s['uses'],'meanDamageReduction':(s['rawReceived']-s['actualReceived'])/s['uses']} for id,s in stats.items()}
(root/'docs'/'balance'/'skill-metrics.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('Summarized',sum(v['uses'] for v in result.values()),'card uses')
