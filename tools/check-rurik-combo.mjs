import { createRequire } from 'node:module';
import fs from 'node:fs';
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.document={createElement(){return createCanvas(1,1);}};
const {importCharacterStrip}=await import('../src/view/stripImporter.js');
const {CHARACTER_STRIPS}=await import('../src/data/spriteStrips.js');
const sheets=[];
for(const key of ['ulric','ulricOath'])for(const name of ['swingCrossV2','swingReturnV2','swingChopV2']){
 const spec=CHARACTER_STRIPS[key][name],img=await loadImage(spec.file),out=importCharacterStrip(img,spec,null);
 if(out.count!==5||out.swords.length!==5)throw new Error('Missing poses or sword markers');
 for(const blade of out.swords)for(const p of [blade.hilt,blade.tip])if(p.x<0||p.x>=out.fw||p.y<0||p.y>=out.fh)throw new Error(`${key}/${name}: blade clipped ${JSON.stringify(p)}`);
 sheets.push({out,key,name});console.log(`${key}/${name}: 5 imported poses, blade landmarks inside frame`);
}
const c=createCanvas(1390,240*6),ctx=c.getContext('2d');ctx.fillStyle='#19191d';ctx.fillRect(0,0,c.width,c.height);
sheets.forEach(({out},i)=>ctx.drawImage(out.canvas,0,i*240));
fs.writeFileSync('assets/sprites/strips/rurik-combo-v2/imported-review.png',c.toBuffer('image/png'));
