import {createRequire} from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
const root=process.cwd(), out=path.join(root,'art/impale-review',process.argv[2]??'current');
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',types[path.extname(f)]??'application/octet-stream');fs.createReadStream(f).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {chromium}=require('playwright'), browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message);});
await page.addInitScript(()=>{const get=document.getElementById.bind(document);document.getElementById=id=>id==='studio-intro'?null:get(id);document.addEventListener('DOMContentLoaded',()=>document.querySelector('#studio-intro')?.remove());});
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/art/impale-review/review.html?${process.argv[2]==='before'?'before':''}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.ready,null,{timeout:30000});
 console.log('Isolated renderer ready');
 for(const t of [20,28,40,46,60,78,100]){
  const data=await page.evaluate(t=>window.review.sample(t),t);
  await page.waitForTimeout(40);await page.screenshot({path:path.join(out,`frame-${t}.png`)});console.log(JSON.stringify(data));
 }
 for(const [id,side,face,oath]of [['grunt','F',-1,false],['stalker','N',1,true],['butcher','B',1,false]]){
  await page.evaluate(([id,side,face,oath])=>{window.review.reset(id,side,face,oath);window.review.sample(78);},[id,side,face,oath]);
  await page.waitForTimeout(40);await page.screenshot({path:path.join(out,`${id}-${side}-${face}-${oath}.png`)});
 }
 if(process.argv[2]!=='before'){
  const checks=await page.evaluate(async()=>{
   const {impaleBlade}=await import('/src/view/ImpaleBlade.js'),r=window.review;
   let cases=0;
   for(const side of ['normal','B','F','N'])for(const face of [1,-1]){
    r.reset('grunt',side,face,face<0);r.sample(78);
    const rig=r.rig,b=impaleBlade(r,r.p);
    if(Math.hypot(rig.pin.x-b.pin.x,rig.pin.y-b.pin.y)>.001)throw Error('Blade attachment drift');
    const alpha=rig.bodyTex.context.getImageData(Math.round(rig.J.xPierce),Math.round(rig.J.yPierce),1,1).data[3];
    if(alpha!==0)throw Error('Torso hole is not transparent');
    const a=rig.sT.a,l=rig.sL.a;rig.draw(r.f,r.p,'cowerB:3',face);
    if(a!==rig.sT.a||l!==rig.sL.a)throw Error('Animation advances during a frozen game tick');
    if(Math.abs(rig.lower.scaleY-rig.torso.scaleY)>.0001)throw Error('Lower body changed scale');
    rig.hide();if(rig.parts.some(p=>p.visible))throw Error('Finisher leaves visible pieces after release');
    cases++;
   }return{cases,bladeContact:'passed',torsoOpening:'passed',frozenFrame:'passed',bodyScale:'passed',cleanup:'passed'};
  });console.log(JSON.stringify(checks));
  const sharp=require('sharp'),frames=[];
  await page.evaluate(()=>window.review.reset());
  for(let t=20;t<=101;t+=3){await page.evaluate(t=>window.review.sample(t),t);await page.waitForTimeout(20);frames.push(await page.screenshot({clip:{x:180,y:20,width:550,height:520}}));}
  const raws=await Promise.all(frames.map(f=>sharp(f).ensureAlpha().raw().toBuffer()));
  await sharp(Buffer.concat(raws),{raw:{width:550,height:520*raws.length,channels:4,pageHeight:520}}).gif({delay:raws.map((_,i)=>i===raws.length-1?700:50),loop:0}).toFile(path.join(out,'impale-motion.gif'));
 }
 console.log(JSON.stringify({errors}));if(errors.length)process.exitCode=1;
}finally{await browser.close();server.close();}
