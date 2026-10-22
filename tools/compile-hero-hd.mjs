import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');const{createCanvas,loadImage}=require('@napi-rs/canvas');
const root='art/hero-refresh/production',outDir='assets/sprites/heroes-hd';fs.mkdirSync(outDir,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(root+'/catalog.json')),landmarks=fs.existsSync(root+'/combo-landmarks.json')?JSON.parse(fs.readFileSync(root+'/combo-landmarks.json')):{};
const jobs=[],missing=[],stats=[];const RES=2;
function cutCell(image,col,row,cols,rows){
 const w=Math.floor(image.width/cols),h=Math.floor(image.height/rows),c=createCanvas(w,h),g=c.getContext('2d');g.drawImage(image,col*w,row*h,w,h,0,0,w,h);
 const px=g.getImageData(0,0,w,h),d=px.data;
 for(let i=0;i<d.length;i+=4){const r=d[i],v=d[i+1],b=d[i+2];if(r>165&&b>155&&r-v>90&&b-v>90)d[i+3]=0;}
 // Import cleanup: isolated generation specks cannot become detached body parts.
 const seen=new Uint8Array(w*h),groups=[];
 for(let p=0;p<w*h;p++){if(seen[p]||d[p*4+3]<32)continue;const q=[p],group=[];seen[p]=1;while(q.length){const k=q.pop(),x=k%w;group.push(k);for(const n of[k-1,k+1,k-w,k+w])if(n>=0&&n<w*h&&!seen[n]&&d[n*4+3]>=32&&Math.abs(n%w-x)<=1){seen[n]=1;q.push(n);}}groups.push(group);}
 const largest=Math.max(0,...groups.map(a=>a.length));for(const group of groups)if(group.length<Math.max(24,largest*.003))for(const p of group)d[p*4+3]=0;
 let l=w,t=h,r=0,b=0,n=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);n++;}
 assert(n>100,`Empty source cell ${col},${row}`);g.putImageData(px,0,0);return {canvas:c,l,t,r,b,w:r-l+1,h:b-t+1,sourceW:w,sourceH:h};
}
function splitFigureGrid(image,n,cols,rows){
 const W=image.width,H=image.height,src=createCanvas(W,H),ctx=src.getContext('2d');ctx.drawImage(image,0,0);const px=ctx.getImageData(0,0,W,H),d=px.data,seen=new Uint8Array(W*H),groups=[];
 for(let p=0;p<W*H;p++){const i=p*4;if(d[i]>165&&d[i+2]>155&&d[i]-d[i+1]>90&&d[i+2]-d[i+1]>90)d[i+3]=0;}
 for(let p=0;p<W*H;p++){if(seen[p]||d[p*4+3]<32)continue;const q=[p],points=[];let l=W,t=H,r=0,b=0,sx=0,sy=0;seen[p]=1;while(q.length){const k=q.pop(),x=k%W,y=Math.floor(k/W);points.push(k);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);sx+=x;sy+=y;for(const v of[k-1,k+1,k-W,k+W])if(v>=0&&v<W*H&&!seen[v]&&d[v*4+3]>=32&&Math.abs(v%W-x)<=1){seen[v]=1;q.push(v);}}groups.push({points,l,t,r,b,cx:sx/points.length,cy:sy/points.length});}
 groups.sort((a,b)=>b.points.length-a.points.length);assert(groups.length>=n,'Not enough distinct figures');const main=groups.slice(0,n).sort((a,b)=>a.cy-b.cy),ordered=[];
 for(let start=0;start<n;start+=cols)ordered.push(...main.slice(start,start+cols).sort((a,b)=>a.cx-b.cx));
 for(const small of groups.slice(n)){let best=null,gap=Infinity;for(const g of main){const distance=Math.hypot(Math.max(0,g.l-small.r,small.l-g.r),Math.max(0,g.t-small.b,small.t-g.b));if(distance<gap){gap=distance;best=g;}}if(gap<=5){best.points.push(...small.points);best.l=Math.min(best.l,small.l);best.r=Math.max(best.r,small.r);best.t=Math.min(best.t,small.t);best.b=Math.max(best.b,small.b);}}
 return ordered.map(g=>{const w=g.r-g.l+1,h=g.b-g.t+1,c=createCanvas(w,h),cg=c.getContext('2d'),out=cg.createImageData(w,h);for(const p of g.points){const x=p%W-g.l,y=Math.floor(p/W)-g.t,k=(y*w+x)*4;out.data.set(d.subarray(p*4,p*4+4),k);}cg.putImageData(out,0,0);return{canvas:c,l:0,t:0,r:w-1,b:h-1,w,h,gx:g.l,gy:g.t,sourceW:W,sourceH:H};});
}
for(const j of catalog.jobs){
 let file=`${root}/${j.id}-painted.png`,cols=j.cols,rows=j.rows,order;
 if(j.existing){file=j.existing.grid;cols=j.existing.cols;rows=Math.ceil(j.frames/cols);order=j.existing.sourceOrder;}
 if(j.id==='rurik-base-poses0'){file='art/hero-refresh/rurik-idle-grid.png';cols=3;rows=2;}
 if(!fs.existsSync(file)){missing.push(j.id);continue;}
 const im=await loadImage(file),combo=j.name.startsWith('swing')&&j.hero==='rurik',wide=combo?70:0,fw=(combo?348:j.old.fw)*RES,fh=combo?600:j.old.fh*RES,atlasCols=Math.min(j.frames,Math.floor(4096/fw)),atlasRows=Math.ceil(j.frames/atlasCols),atlas=createCanvas(fw*atlasCols,fh*atlasRows),g=atlas.getContext('2d'),frames=[],swords=[];
 const figures=splitFigureGrid(im,j.frames,cols,rows),cells=Array.from({length:j.frames},(_,i)=>figures[order?.[i]??i]);
 const marks=landmarks[j.id];if(combo&&!marks){missing.push(j.id+' sword landmarks');continue;}
 const uniform=combo?112/((marks[0].feet[1]-marks[0].headY+marks[1].feet[1]-marks[1].headY+marks[2].feet[1]-marks[2].headY)/3)*RES:0;
 for(let i=0;i<j.frames;i++){
  const c=cells[i],old=j.bounds[i];let scale,dx,dy;
  if(combo){scale=uniform;dx=348-(marks[i].feet[0]-c.gx)*scale;dy=460-(marks[i].feet[1]-c.gy)*scale;swords.push({hilt:{x:(marks[i].blade[0]-c.gx)*scale+dx,y:(marks[i].blade[1]-c.gy)*scale+dy},tip:{x:(marks[i].blade[2]-c.gx)*scale+dx,y:(marks[i].blade[3]-c.gy)*scale+dy}});}
  else{scale=Math.min((old.b-old.t+1)*RES/c.h,(fw-8)/c.w);dx=((old.l+old.r+1)/2)*RES-(c.l+c.w/2)*scale;dx=Math.min(fw-4-c.w*scale,Math.max(4,dx));dy=old.b*RES-c.b*scale;}
  const bounds={l:c.l*scale+dx,r:(c.r+1)*scale+dx,t:c.t*scale+dy,b:(c.b+1)*scale+dy};
  assert(bounds.l>=0&&bounds.r<=fw&&bounds.t>=0&&bounds.b<=fh,`${j.id}:${i} clips ${JSON.stringify(bounds)}`);
  g.save();g.beginPath();g.rect(i%atlasCols*fw,Math.floor(i/atlasCols)*fh,fw,fh);g.clip();g.drawImage(c.canvas,i%atlasCols*fw+dx,Math.floor(i/atlasCols)*fh+dy,c.canvas.width*scale,c.canvas.height*scale);g.restore();frames.push({bounds,scale,dx,dy});
 }
 const fileOut=`${outDir}/${j.id}.png`;fs.writeFileSync(fileOut,atlas.toBuffer('image/png'));
 jobs.push({id:j.id,hero:j.hero,key:j.key,name:j.name,file:fileOut,frames:j.frames,fw,fh,cols:atlasCols,originX:combo?.5:(104+(j.old.fw-208)/2)/j.old.fw,originY:460/fh,swords,baseFirst:j.baseFirst});stats.push({id:j.id,source:file,frames});
}
const baseJobs=jobs.filter(j=>j.baseFirst!=null),base=createCanvas(416*9,480*8),bg=base.getContext('2d');
if(baseJobs.length===11){for(const j of baseJobs){const im=await loadImage(j.file);for(let i=0;i<j.frames;i++){const idx=j.baseFirst+i;bg.drawImage(im,i%j.cols*j.fw,Math.floor(i/j.cols)*j.fh,j.fw,j.fh,idx%9*416,Math.floor(idx/9)*480,416,480);}}fs.writeFileSync(outDir+'/rurik-base.png',base.toBuffer('image/png'));}
const sheets=catalog.bindings.map(b=>{const j=jobs.find(j=>j.id===b.id);return j?{...j,key:b.key,name:b.name,originX:j.originX,swords:j.swords.length?j.swords:(b.swords??[]).map(s=>s?{hilt:{x:s.hilt.x*RES,y:s.hilt.y*RES},tip:{x:s.tip.x*RES,y:s.tip.y*RES}}:s)}:null;}).filter(Boolean);
const manifest={res:RES,base:{file:outDir+'/rurik-base.png',fw:416,fh:480,cols:9,frames:66},sheets};
fs.writeFileSync(root+'/hd-import-report.json',JSON.stringify({jobs:stats,missing},null,2));
if(missing.length){console.log('Compiled',jobs.length,'of',catalog.jobs.length,'; missing:',missing.join(', '));process.exitCode=2;}
else{fs.writeFileSync('src/data/heroHdAssets.js','// Generated by tools/compile-hero-hd.mjs. Original assets remain intact.\nexport const HERO_HD='+JSON.stringify(manifest)+';\n');console.log('HD_READY',jobs.length,'sheets',stats.reduce((n,j)=>n+j.frames.length,0),'poses',sheets.length,'bindings');}
