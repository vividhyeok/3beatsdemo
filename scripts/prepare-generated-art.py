"""Prepare high-resolution source art and framed web card assets.

The source files under art_source/cards are the editable high-resolution masters.
Run this script again after changing a master to update web assets and the contact sheet.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import sys

ROOT=Path(__file__).resolve().parents[1]
ORDER=['jack/jab','jack/dash','jack/slam','jack/spin','jack/ult',
 'eve/aim','eve/pierce','eve/retreat','eve/cross','eve/ult',
 'raven/jab','raven/push','raven/trap','raven/ward','raven/ult',
 'zeta/jab','zeta/slide','zeta/long','zeta/brake','zeta/ult',
 'common/forward','common/back','common/up','common/down','common/guard','common/focus']
COLORS={'jack':'#ed5a66','eve':'#58cfff','raven':'#b984f8','zeta':'#ffd369','common':'#8cd9d5'}
SOURCE=ROOT/'art_source'/'cards';WEB=ROOT/'game_ready'/'cards'
if len(sys.argv)>1:
 generated=Path(sys.argv[1]);files=sorted(generated.glob('*.png'),key=lambda p:p.stat().st_mtime)
 if len(files)!=len(ORDER):raise SystemExit(f'Expected 26 generated PNGs, got {len(files)}')
 for key,file in zip(ORDER,files):
  target=SOURCE/(key+'.webp');target.parent.mkdir(parents=True,exist_ok=True)
  Image.open(file).convert('RGB').save(target,'WEBP',quality=96,method=6)

cards=[]
for key in ORDER:
 path=SOURCE/(key+'.webp')
 if not path.exists():raise SystemExit('Missing source: '+str(path))
 src=Image.open(path).convert('RGB')
 canvas=ImageOps.fit(src,(512,768),method=Image.Resampling.LANCZOS,centering=(.5,.48))
 d=ImageDraw.Draw(canvas,'RGBA');color=COLORS[key.split('/')[0]]
 d.rounded_rectangle((11,11,500,757),radius=18,outline=color,width=5)
 d.rounded_rectangle((20,20,491,748),radius=14,outline=(235,246,252,130),width=2)
 d.rectangle((25,25,487,30),fill=color)
 # A restrained footplate protects the DOM label area at small sizes.
 d.rectangle((23,683,489,746),fill=(5,14,28,170))
 d.line((28,683,484,683),fill=color,width=3)
 target=WEB/(key+'.webp');target.parent.mkdir(parents=True,exist_ok=True)
 canvas.save(target,'WEBP',quality=88,method=6)
 cards.append((key,canvas))

sheet=Image.new('RGB',(6*200,5*318),(10,17,29));d=ImageDraw.Draw(sheet)
for i,(key,im) in enumerate(cards):
 x=(i%6)*200+12;y=(i//6)*318+8
 sheet.paste(im.resize((176,264),Image.Resampling.LANCZOS),(x,y))
 d.text((x,y+270),key,fill='#e1eaf0')
back=SOURCE/'back.webp'
if back.exists():
 back_image=ImageOps.fit(Image.open(back).convert('RGB'),(512,768),method=Image.Resampling.LANCZOS)
 back_image.save(WEB/'back.webp','WEBP',quality=88,method=6)
 sheet.paste(back_image.resize((176,264),Image.Resampling.LANCZOS),(412,1276))
 d.text((412,1546),'back',fill='#e1eaf0')
sheet.save(ROOT/'docs'/'balance'/'card-contact-sheet.webp','WEBP',quality=91)
print('Prepared 26 high-resolution sources, web cards, back, and contact sheet')
