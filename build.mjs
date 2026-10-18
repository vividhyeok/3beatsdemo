import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});
for(const entry of ['index.html','online.html','classic.html','game-ui.css','online.css','src','game_ready','assets/favicon.svg']){const dest=path.join(out,entry);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(path.join(root,entry),dest,{recursive:true});}
const client=process.env.AD_CLIENT||'',menuSlot=process.env.AD_MENU_SLOT||'',resultSlot=process.env.AD_RESULT_SLOT||'';
const adsEnabled=process.env.ADS_ENABLED==='1'&&process.env.ADS_CONSENT_READY==='1'&&/^ca-pub-\d{16}$/.test(client)&&/^\d+$/.test(menuSlot)&&/^\d+$/.test(resultSlot);
fs.writeFileSync(path.join(out,'src/ad-config.js'),'export const AD_CONFIG='+JSON.stringify({enabled:adsEnabled,client:adsEnabled?client:'',menuSlot:adsEnabled?menuSlot:'',resultSlot:adsEnabled?resultSlot:''})+';\n');
const manifest=JSON.parse(fs.readFileSync('docs/asset-pack/asset_manifest.json','utf8'));for(const a of manifest.assets)if(!fs.existsSync(path.join(out,a.path)))throw Error('Missing build asset: '+a.path);
console.log('Static build ready: dist / '+manifest.assets.length+' curated assets.');
