import {createRequire} from 'node:module';import fs from 'node:fs';import assert from 'node:assert/strict';
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const{createCanvas,loadImage}=require('@napi-rs/canvas');globalThis.document={createElement:()=>createCanvas(1,1)};
const{importCharacterStrip}=await import('../src/view/stripImporter.js');
const jobs=JSON.parse(fs.readFileSync('art/hero-refresh/jobs.json'));
const manifest=[];
for(const j of jobs){
 const oldImg=await loadImage(j.file),grid=await loadImage('art/hero-refresh/'+j.id+'-grid.png');
 const newImg=createCanvas(grid.width*2,grid.height/2),pack=newImg.getContext('2d');
 const cw=grid.width/(j.frames/2),ch=grid.height/2;
 for(let i=0;i<j.frames;i++){
   const k=j.sourceOrder?.[i]??i;
   pack.drawImage(grid,(k%(j.frames/2))*cw,Math.floor(k/(j.frames/2))*ch,cw,ch,i*cw,0,cw,ch);
 }
 fs.writeFileSync('art/hero-refresh/'+j.id+'-packed.png',newImg.toBuffer('image/png'));
 const target=j.hero==='oryn'?132:j.hero==='vexa'?90:112;
 const spec={frames:j.frames,ref:0,target,align:'median',wide:60,ground:'drawn'};
 const old=importCharacterStrip(oldImg,{...spec,res:j.hero==='rurik'?1:2},null);
 const fresh=importCharacterStrip(newImg,{...spec,res:4,bg:'magenta'},null);
 // Keep the feet at the original frame's authored height (including hovering).
 const aligned=createCanvas(fresh.canvas.width,fresh.canvas.height),ag=aligned.getContext('2d');
 const bottom=(sheet,i)=>{const d=sheet.canvas.getContext('2d').getImageData(i*sheet.fw,0,sheet.fw,sheet.fh).data;let b=0;for(let y=0;y<sheet.fh;y++)for(let x=0;x<sheet.fw;x++)if(d[(y*sheet.fw+x)*4+3]>24)b=y;return b;};
 const oldRes=j.hero==='rurik'?1:2;
 for(let i=0;i<j.frames;i++){
   const dy=Math.round(bottom(old,i)/oldRes*4-bottom(fresh,i));
   ag.save();ag.beginPath();ag.rect(i*fresh.fw,0,fresh.fw,fresh.fh);ag.clip();
   ag.drawImage(fresh.canvas,i*fresh.fw,0,fresh.fw,fresh.fh,i*fresh.fw,dy,fresh.fw,fresh.fh);ag.restore();
 }
 fresh.canvas=aligned;
 // Drop isolated cutout specks, keeping the connected figure and substantial details.
 for(let i=0;i<j.frames;i++){
  const ctx=fresh.canvas.getContext('2d'),px=ctx.getImageData(i*fresh.fw,0,fresh.fw,fresh.fh),d=px.data,w=fresh.fw,h=fresh.fh,seen=new Uint8Array(w*h),groups=[];
  for(let p=0;p<w*h;p++){
   if(seen[p]||d[p*4+3]<24)continue;const group=[],queue=[p];seen[p]=1;
   while(queue.length){const k=queue.pop(),x=k%w;group.push(k);for(const q of[k-1,k+1,k-w,k+w])if(q>=0&&q<w*h&&!seen[q]&&d[q*4+3]>24&&Math.abs(q%w-x)<=1){seen[q]=1;queue.push(q);}}
   groups.push(group);
  }
  const threshold=Math.max(32,Math.max(...groups.map(g=>g.length))*.004);
  for(const group of groups)if(group.length<threshold)for(const p of group)d[p*4+3]=0;
  ctx.putImageData(px,i*fresh.fw,0);
 }
 const stats=[];
 for(let i=0;i<j.frames;i++){
  const a=fresh.canvas.getContext('2d').getImageData(i*fresh.fw,0,fresh.fw,fresh.fh).data;
  let n=0,l=fresh.fw,r=0,t=fresh.fh,b=0;
  for(let y=0;y<fresh.fh;y++)for(let x=0;x<fresh.fw;x++)if(a[(y*fresh.fw+x)*4+3]>24){n++;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  assert(n>1000,j.id+' has a missing pose '+i);assert(l>0&&r<fresh.fw-1&&t>0&&b<fresh.fh-1,j.id+' clips a pose '+i);
  stats.push({height:(b-t)/4,width:(r-l)/4,feet:b/4});
 }
 fs.writeFileSync('art/hero-refresh/'+j.id+'-frames.png',fresh.canvas.toBuffer('image/png'));
 fs.writeFileSync('art/hero-refresh/'+j.id+'-current-frames.png',old.canvas.toBuffer('image/png'));
 const item={...j,target,frames:j.frames,current:{file:j.id+'-current-frames.png',fw:old.fw,fh:old.fh,res:j.hero==='rurik'?1:2},proposed:{file:j.id+'-frames.png',fw:fresh.fw,fh:fresh.fh,res:4},stats};manifest.push(item);
 const contact=createCanvas(280*j.frames,530),g=contact.getContext('2d');g.fillStyle='#282428';g.fillRect(0,0,contact.width,contact.height);
 for(let i=0;i<j.frames;i++){
  for(const [sheet,row,res]of[[old,0,j.hero==='rurik'?1:2],[fresh,1,4]])g.drawImage(sheet.canvas,i*sheet.fw,0,sheet.fw,sheet.fh,i*280+(280-sheet.fw/res)/2,row*260,sheet.fw/res,sheet.fh/res);
 }
 fs.writeFileSync('art/hero-refresh/'+j.id+'-contact.png',contact.toBuffer('image/png'));
 console.log(j.id,':',j.frames,'complete poses, no cell clipping; heights:',stats.map(s=>s.height.toFixed(1)).join(','));
}
fs.writeFileSync('art/hero-refresh/manifest.json',JSON.stringify(manifest,null,2));
const html=`<!doctype html><meta charset="utf-8"><title>Blood Axe — Character Motion Review</title><style>body{background:#171419;color:#eee2cb;font:18px Segoe UI, sans-serif;margin:30px auto;max-width:1100px}h1{font:28px Georgia}button,select{font:inherit;background:#302834;color:inherit;border:1px solid #71624a;padding:10px;margin:5px}canvas{width:100%;background:#292529}p{color:#bfb2a6;font-size:16px}</style><h1>Oathkeepers — animation artwork review</h1><p>Art review only. The playable game is unchanged. Current artwork on the left; approved repaint in motion on the right.</p><select id="hero"><option value="rurik">Rurik</option><option value="oryn">Oryn</option><option value="vexa">Vexa</option></select><select id="motion"><option value="idle">Idle</option><option value="move">Movement</option></select><button id="pause">Pause</button><button id="step">Next frame</button><select id="size"><option value="2">Gameplay display size (2×)</option><option value="3">Enlarged (3×)</option><option value="1">Logical game size (1×)</option></select><canvas id="view" width="1100" height="660"></canvas><p id="info"></p><script>const jobs=${JSON.stringify(manifest)};const images={};for(const j of jobs)for(const s of[j.current,j.proposed]){const im=new Image();im.src=s.file;images[s.file]=im;}const cv=document.querySelector('canvas'),g=cv.getContext('2d');let paused=false,t0=performance.now(),step=0;const $=id=>document.getElementById(id);for(const id of['hero','motion'])$(id).onchange=()=>{t0=performance.now();step=0;};$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Play':'Pause';};$('step').onclick=()=>{paused=true;step++;$('pause').textContent='Play';};let hold=0;function draw(now){const hero=$('hero').value,id=hero+'-'+($('motion').value==='idle'?'idle':hero==='rurik'?'walk':hero==='oryn'?'hover':'run'),j=jobs.find(j=>j.id===id);let seq=Array.from({length:j.frames},(_,i)=>i),fps=hero==='oryn'?($('motion').value==='idle'?5:10):hero==='vexa'?15:11;if($('motion').value==='idle'&&hero==='rurik'){seq=[0];fps=1;}if($('motion').value==='idle'&&hero==='vexa'){seq=[...Array(22).fill(0),3,3,3];fps=6;}if(!paused)hold=Math.floor((now-t0)/1000*fps);const f=seq[(hold+step)%seq.length],zoom=Number($('size').value);g.fillStyle='#292529';g.fillRect(0,0,1100,660);g.textAlign='center';g.font='22px Segoe UI';g.fillStyle='#eee2cb';g.fillText('CURRENT',275,45);g.fillText('PROPOSED',825,45);for(const[s,cx]of[[j.current,275],[j.proposed,825]]){const im=images[s.file];if(!im.complete)continue;const w=s.fw/s.res*zoom,h=s.fh/s.res*zoom;g.drawImage(im,f*s.fw,0,s.fw,s.fh,cx-w/2,600-h,w,h);} $('info').textContent=j.id+' • pose '+(f+1)+' / '+j.frames+' • original playback cadence • no combat or movement changes';requestAnimationFrame(draw);}requestAnimationFrame(draw);</script>`;
fs.writeFileSync('art/hero-refresh/review.html',html);
