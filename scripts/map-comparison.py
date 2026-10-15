"""Static geometry screen for proposed board sizes and movement reach."""
from pathlib import Path
import json

def metrics(w,h,diagonal=False):
 cells=[(x,y) for y in range(h) for x in range(w)]
 pairs=[(a,b) for a in cells for b in cells if a!=b]
 near=sum(abs(a[0]-b[0])+abs(a[1]-b[1])<=2 for a,b in pairs)/len(pairs)
 adjacent=sum(max(abs(a[0]-b[0]),abs(a[1]-b[1]))==1 for a,b in pairs)/len(pairs)
 start=(0,h//2);enemy=(w-1,h//2)
 moves=[(1,0),(-1,0),(0,1),(0,-1)]
 if diagonal:moves += [(1,1),(1,-1),(-1,1),(-1,-1)]
 reachable={(start[0]+dx,start[1]+dy) for dx,dy in moves if 0<=start[0]+dx<w and 0<=start[1]+dy<h and (start[0]+dx,start[1]+dy)!=enemy}
 return dict(size=f'{w}x{h}',cells=len(cells),orderedPositions=len(pairs),withinTwoManhattan=near,spinAdjacentCoverage=adjacent,startDistance=abs(start[0]-enemy[0]),startMoveDestinations=len(reachable),diagonal=diagonal)

data=[metrics(4,3),metrics(5,3),metrics(5,4),metrics(4,3,True)]
root=Path(__file__).resolve().parents[1]
(root/'docs'/'balance'/'map-comparison.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
print(data)
