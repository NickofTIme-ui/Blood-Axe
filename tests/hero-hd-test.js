import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HERO_HD} from '../src/data/heroHdAssets.js';
import {ANIM_OVERRIDES} from '../src/data/spriteStrips.js';
import {HERO_ANIMS} from '../src/data/heroStrips.js';
import {preloadHeroHd,installHeroHd} from '../src/view/heroHd.js';

// Validate the actual shipping PNGs and loader registrations, rather than source proofs.
const runtime=HERO_HD.sheets.filter(s=>s.baseFirst==null);
const textures=new Map(),loaded=new Map();
function size(file){const b=fs.readFileSync(file);assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a',file);return [b.readUInt32BE(16),b.readUInt32BE(20)];}
for(const s of [...HERO_HD.sheets,HERO_HD.base]){
 const [w,h]=size(s.file);
 assert.equal(w,s.fw*s.cols,`${s.file}: atlas width`);
 assert.equal(h,s.fh*Math.ceil(s.frames/s.cols),`${s.file}: atlas height`);
}
const metadata=Object.fromEntries(['ulric','ulricOath'].map(k=>[`${k}-data`,JSON.parse(fs.readFileSync('assets/sprites/ulric.json'))]));
globalThis.Phaser={Textures:{FilterMode:{LINEAR:1}}};
const scene={load:{image(key,file){assert.ok(!loaded.has(key),`Duplicate texture ${key}`);loaded.set(key,file);}},textures:{get(key){assert.ok(loaded.has(key),`Texture not preloaded: ${key}`);if(!textures.has(key)){const [w,h]=size(loaded.get(key));const frames=new Set();textures.set(key,{frames,add(name,source,x,y,fw,fh){assert.ok(x>=0&&y>=0&&x+fw<=w&&y+fh<=h,`${key}/${name}: crop outside image`);assert.ok(!frames.has(name));frames.add(name);},setFilter(){}});}return textures.get(key);}},cache:{json:{get(key){return metadata[key];}}}};
preloadHeroHd(scene);const heroes=installHeroHd(scene);
assert.equal(loaded.size,runtime.length,'Every shipping strip has a unique runtime texture');
function refs(value,key,label){
 if(typeof value==='string'&&/^[A-Za-z][A-Za-z0-9]*:\d+$/.test(value)){
  const [strip,index]=value.split(':');const prefix=['ulric','ulricOath'].includes(key)?key:`hero-${key}`;
  assert.ok(textures.get(`${prefix}-${strip}`)?.frames.has(`f${index}`),`${label}: missing ${key}/${value}`);
 }else if(Array.isArray(value))value.forEach(v=>refs(v,key,label));
 else if(value&&typeof value==='object')for(const [name,v]of Object.entries(value))if(name!=='needs')refs(v,key,label);
}
for(const key of ['ulric','ulricOath']){
 const meta=metadata[`${key}-data`];assert.equal(meta.visualRes,2);
 for(const [name,a]of Object.entries(ANIM_OVERRIDES[key])){assert.equal(meta.anims[name],a,`${key}/${name}: override silently skipped`);refs(a,key,name);}
 for(const name of ['swingCrossV2','swingReturnV2','swingChopV2']){
  const sheet=runtime.find(s=>s.key===key&&s.name===name);assert.equal(sheet.swords.length,sheet.frames,`${key}/${name}: blade landmarks incomplete`);
  for(const blade of sheet.swords)for(const p of [blade.hilt,blade.tip])assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<sheet.fw&&p.y>=0&&p.y<sheet.fh,`${key}/${name}: blade outside pose`);
  assert.ok(Math.abs(sheet.originY*sheet.fh-460)<1e-6,'Wide/downward blades must preserve the foot anchor');
 }
 const chop=runtime.find(s=>s.key===key&&s.name==='swingChopV2').swords[3];
 assert.ok(chop.tip.y-chop.hilt.y>100&&Math.abs(chop.tip.x-chop.hilt.x)<45,'Third strike must point down');
}
for(const key of ['mage','rogue']){
 assert.equal(heroes[key].res,2);refs(heroes[key].anims,key,'installed animations');
 for(const name of Object.keys(HERO_ANIMS[key]))if(name!=='idleStrip')assert.ok(heroes[key].anims[name],`${key}/${name}: animation missing`);
}
console.log(`HD heroes: ${runtime.length} runtime strips; all atlas crops, animation references, sword landmarks and foot anchors valid.`);

