import fs from 'node:fs';import {createRequire} from 'node:module';
import {CHARACTER_STRIPS} from '../src/data/spriteStrips.js';import{HERO_STRIPS}from'../src/data/heroStrips.js';
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');const{createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const{importCharacterStrip}=await import('../src/view/stripImporter.js');
const dir='art/hero-refresh/production';fs.mkdirSync(dir,{recursive:true});
const jobs=[],byFile=new Map(),bindings=[];
const existing=new Map(JSON.parse(fs.readFileSync('art/hero-refresh/jobs.json')).map(j=>[j.file,{grid:'art/hero-refresh/'+j.id+'-grid.png',cols:j.frames/2,sourceOrder:j.sourceOrder}]));
const combat={'assets/sprites/strips/rurik-combo-v2/ulric-1.png':'rurik-cross','assets/sprites/strips/rurik-combo-v2/ulric-2.png':'rurik-return','assets/sprites/strips/rurik-combo-v2/ulric-3.png':'rurik-down','assets/sprites/strips/mage_combo1.png':'oryn-strike','assets/sprites/strips/rogue_combo1.png':'vexa-strike'};
function saveOld(id,out){fs.writeFileSync(dir+'/'+id+'-old.png',out.canvas.toBuffer('image/png'));return{fw:out.fw,fh:out.fh};}
async function add(hero,key,name,spec,out){
 const id=byFile.get(spec.file)||hero+'-'+key+'-'+name;
 bindings.push({key,name,id,file:spec.file,frames:spec.frames,wide:spec.wide??0,swords:out.swords??[]});
 if(byFile.has(spec.file))return;
 byFile.set(spec.file,id);const n=spec.frames,cols=n<=4?2:n<=6?3:Math.ceil(n/2),rows=Math.ceil(n/cols),cellW=600,cellH=600;
 const c=createCanvas(cols*cellW,rows*cellH),g=c.getContext('2d');g.fillStyle='#ff00ff';g.fillRect(0,0,c.width,c.height);
 const refs=[];
 for(let i=0;i<n;i++){
  const px=out.canvas.getContext('2d').getImageData(i*out.fw,0,out.fw,out.fh).data;let l=out.fw,t=out.fh,r=0,b=0;
  for(let y=0;y<out.fh;y++)for(let x=0;x<out.fw;x++)if(px[(y*out.fw+x)*4+3]>24){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  refs.push({l,t,r,b});
 }
 const factor=Math.min((cellW-100)/Math.max(...refs.map(b=>b.r-b.l+1)),(cellH-100)/Math.max(...refs.map(b=>b.b-b.t+1)));
 refs.forEach((b,i)=>{const w=b.r-b.l+1,h=b.b-b.t+1;g.drawImage(out.canvas,i*out.fw+b.l,b.t,w,h,(i%cols)*cellW+(cellW-w*factor)/2,Math.floor(i/cols)*cellH+cellH-50-h*factor,w*factor,h*factor);});
 const ref=dir+'/'+id+'-reference.png';fs.writeFileSync(ref,c.toBuffer('image/png'));
 jobs.push({id,hero,key,name,file:spec.file,frames:n,cols,rows,ref,old:saveOld(id,out),bounds:refs,existing:existing.get(spec.file),combat:combat[spec.file]});
}
for(const[key,strips]of Object.entries(CHARACTER_STRIPS))if(['ulric','ulricOath'].includes(key)){
 const scales={};for(const[name,s]of Object.entries(strips)){
  if(!fs.existsSync(s.file))continue;const img=await loadImage(s.file),from=s.scaleFrom&&scales[s.scaleFrom];const spec=from?{...s,scale:from.scale*from.h/img.height*(s.sizeFix??1)}:s;
  const out=importCharacterStrip(img,spec,null);scales[name]={scale:out.scale,h:img.height};await add('rurik',key,name,s,out);
 }
}
for(const[key,hero]of[['mage','oryn'],['rogue','vexa']])for(const[name,s]of Object.entries(HERO_STRIPS[key].strips)){
 if(!fs.existsSync(s.file))continue;const img=await loadImage(s.file),out=importCharacterStrip(img,{ref:0,target:HERO_STRIPS[key].target,...s,res:1},null);await add(hero,key,name,s,out);
}
const meta=JSON.parse(fs.readFileSync('assets/sprites/ulric.json')),base=await loadImage('assets/sprites/ulric.png'),columns=Math.floor(base.width/meta.frameWidth);
for(let first=0;first<meta.frameCount;first+=6){const n=Math.min(6,meta.frameCount-first),c=createCanvas(meta.frameWidth*n,meta.frameHeight),g=c.getContext('2d');for(let i=0;i<n;i++)g.drawImage(base,((first+i)%columns)*meta.frameWidth,Math.floor((first+i)/columns)*meta.frameHeight,meta.frameWidth,meta.frameHeight,i*meta.frameWidth,0,meta.frameWidth,meta.frameHeight);
const file=dir+'/base-'+first+'-source.png';fs.writeFileSync(file,c.toBuffer('image/png'));await add('rurik','base','poses'+first,{file,frames:n},{canvas:c,fw:meta.frameWidth,fh:meta.frameHeight,swords:[]});jobs.at(-1).baseFirst=first;}
fs.writeFileSync(dir+'/catalog.json',JSON.stringify({jobs,bindings,base:meta},null,2));console.log('Production sheets:',jobs.length,'poses:',jobs.reduce((s,j)=>s+j.frames,0),'reusable:',jobs.filter(j=>j.existing||j.combat).length,'to repaint:',jobs.filter(j=>!j.existing&&!j.combat).length);
