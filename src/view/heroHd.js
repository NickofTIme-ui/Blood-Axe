import {HERO_HD} from '../data/heroHdAssets.js';
import {ANIM_OVERRIDES} from '../data/spriteStrips.js';
import {HERO_ANIMS} from '../data/heroStrips.js';

const textureKey=s=>['ulric','ulricOath'].includes(s.key)?`${s.key}-${s.name}`:`hero-${s.key}-${s.name}`;
export function preloadHeroHd(scene){for(const s of HERO_HD.sheets)if(s.baseFirst==null)scene.load.image(textureKey(s),s.file);}
export function installHeroHd(scene){
 const have={ulric:new Set(),ulricOath:new Set(),mage:new Set(),rogue:new Set()};
 for(const s of HERO_HD.sheets){
  if(s.baseFirst!=null)continue;const key=textureKey(s),tex=scene.textures.get(key);
  for(let i=0;i<s.frames;i++)tex.add(`f${i}`,0,i%s.cols*s.fw,Math.floor(i/s.cols)*s.fh,s.fw,s.fh);
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);have[s.key].add(s.name);
  if(s.key==='ulric'||s.key==='ulricOath'){
   const meta=scene.cache.json.get(`${s.key}-data`);meta.visualRes=HERO_HD.res;
   (meta.stripOrigin??={})[s.name]=s.originX;(meta.stripOriginY??={})[s.name]=s.originY;
   (meta.stripSwords??={})[s.name]=s.swords;
  }
 }
 for(const key of ['ulric','ulricOath']){const meta=scene.cache.json.get(`${key}-data`);for(const [name,a]of Object.entries(ANIM_OVERRIDES[key]))if((a.needs??[]).every(n=>have[key].has(n)))meta.anims[name]=a;}
 const heroes={};for(const key of ['mage','rogue']){
  const anims={};for(const[name,a]of Object.entries(HERO_ANIMS[key]))if((a.needs??[]).every(n=>have[key].has(n)))anims[name]=a;
  if(anims.idleStrip){anims.idle=anims.idleStrip;delete anims.idleStrip;}
  heroes[key]={key:`hero-${key}`,anims,res:2,fw:416,fh:480,ax:208,ay:460};
 }
 return heroes;
}
