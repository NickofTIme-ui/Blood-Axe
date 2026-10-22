import {createRequire} from 'node:module';import fs from 'node:fs';
import http from 'node:http';import path from 'node:path';
const root=process.cwd();const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.wav':'audio/wav','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(8143,'127.0.0.1',r));server.unref();
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||m.text().includes('failed'))console.log(m.text())});
await page.addInitScript(()=>{const get=document.getElementById.bind(document);document.getElementById=id=>id==='studio-intro'?null:get(id);document.addEventListener('DOMContentLoaded',()=>document.querySelector('#studio-intro')?.remove());});
await page.goto('http://127.0.0.1:8143/?mute=1',{waitUntil:'domcontentloaded'});console.log('Page loaded');await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:180000});console.log('Boot complete');
fs.mkdirSync('art/varek-weapon-check',{recursive:true});
for(let i=0;i<3;i++){const data=await page.evaluate(i=>{const f=window.game.textures.getFrame('enemy-gladiator-kneel','f'+i),c=document.createElement('canvas');c.width=f.cutWidth;c.height=f.cutHeight;c.getContext('2d').drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,0,0,c.width,c.height);return c.toDataURL().split(',')[1];},i);fs.writeFileSync(`art/varek-weapon-check/kneel-${i}.png`,Buffer.from(data,'base64'));}

await page.evaluate(()=>{window.game.scene.getScene('Title').scene.start('Arena',{mode:'solo',characterId:'mage',stage:'village',section:5,testPreview:true,testMoment:'varek'});});
await page.waitForFunction(()=>window.game.scene.getScene('Arena')?.stage?.boss,null,{timeout:20000});
await page.waitForTimeout(500);
console.log(await page.evaluate(()=>{const a=window.game.scene.getScene('Arena'),b=a.stage.boss;return {boss:!!b,keys:Object.keys(b),view:a.views.get(b.id)?.constructor.name};}));
await page.evaluate(()=>{const a=window.game.scene.getScene('Arena'),b=a.stage.boss; a.stage.hazardsOff=true;for(const f of a.world.fighters)if(f!==b&&f.team==='enemy'){f.removeMe=true;f.health=0;}a.player.invincible=true;b.fsm.change('kneel');b.defiant=false;b.x=a.player.x+150;b.z=a.player.z;b.fsm.frame=200;a.views.get(b.id).update();});
await page.waitForTimeout(100);
console.log(await page.evaluate(()=>{const a=window.game.scene.getScene('Arena'),b=a.stage.boss,v=a.views.get(b.id);return {ref:v.lastRef,kneel:v.kneelCut};}));
await page.evaluate(()=>{const a=window.game.scene.getScene('Arena'),b=a.stage.boss,v=a.views.get(b.id);v.setFrameRef('kneel:1');v.kneelCut={row:v.sheet.fh,sink:0};a.gore.sentenceCut(v,{body:'back',head:'drop'},'decap',1);b.health=0;});
await page.waitForTimeout(2500);
await page.screenshot({path:'art/varek-weapon-check/settled.png'});
const weapons=await page.evaluate(()=>window.game.scene.getScene('Arena').cuts.pieces.filter(p=>p.weapon&&p.tex?.startsWith('execution-gear')).map(p=>({rot:p.rot,landed:p.landed,vh:p.vh,spin:p.spin})));
console.log(JSON.stringify({weapons,errors}));if(weapons.length!==2||weapons.some(p=>!p.landed||Math.abs(Math.sin(p.rot))>.15)||errors.length)process.exitCode=1;
await browser.close();server.close();
