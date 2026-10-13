import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});
for(const entry of ['index.html','classic.html','game-ui.css','src','game_ready','assets/favicon.svg']){const dest=path.join(out,entry);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(path.join(root,entry),dest,{recursive:true});}
const manifest=JSON.parse(fs.readFileSync('docs/asset-pack/asset_manifest.json','utf8'));for(const a of manifest.assets)if(!fs.existsSync(path.join(out,a.path)))throw Error('Missing build asset: '+a.path);
console.log('Static build ready: dist / '+manifest.assets.length+' curated assets.');
