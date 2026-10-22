import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Phaser={Textures:{FilterMode:{NEAREST:0}}};
const {importCharacterStrip}=await import('../src/view/stripImporter.js');
const {SpriteCuts}=await import('../src/effects/SpriteCut.js');
const raw=await loadImage('assets/enemies/strips/grunt_react.png');
const imported=importCharacterStrip(raw,{frames:6,ref:0,target:108,res:2},null),W=imported.fw,H=imported.fh;
const frameCanvas=createCanvas(W,H);frameCanvas.getContext('2d').drawImage(imported.canvas,0,0,W,H,0,0,W,H);
const snapshots=[];
for(const [name,cut,impact] of [['high','waist',.7],['low','waist',.32],['vertical','vertical',.5]]){
 const textures=new Map([['grunt',frameCanvas]]),images=[];
 const getFrame=key=>({name:'f0',cutWidth:W,cutHeight:H,cutX:0,cutY:0,source:{image:textures.get(key)}});
 function image(x,y,key){const o={x,y,key,originX:.5,originY:.5,scaleX:1,scaleY:1,rotation:0,visible:true,alpha:1,tintTopLeft:0xffffff};images.push(o);
 o.setOrigin=(x,y)=>{o.originX=x;o.originY=y;return o;};o.setScale=(x,y=x)=>{o.scaleX=x;o.scaleY=y;return o;};o.setPosition=(x,y)=>{o.x=x;o.y=y;return o;};o.setRotation=r=>{o.rotation=r;return o;};o.setCrop=(...v)=>{o.crop=v;return o;};o.setVisible=v=>{o.visible=v;return o;};o.setAlpha=v=>{o.alpha=v;return o;};o.setDepth=()=>o;o.setTint=()=>o;o.destroy=()=>{o.visible=false;};return o;}
 const scene={add:{image},textures:{getFrame,get:k=>({getSourceImage:()=>textures.get(k)}),exists:k=>textures.has(k),remove:k=>textures.delete(k),addCanvas(k,c){textures.set(k,c);return{setFilter(){}};}},world:{bounds:{minX:0,maxX:850}},cache:{audio:{exists:()=>false}},sound:{},game:{renderer:{}}};
 const cuts=new SpriteCuts(scene),sprite={x:350,y:360,scaleX:.7,scaleY:.7,rotation:0,texture:{key:'grunt'},frame:getFrame('grunt')};
 const view={sprite,sheet:{fw:W,fh:H,ax:W/2,ay:460,res:2,key:'enemy-grunt'},f:{x:350,z:360,h:0,facing:1,stats:{body:{h:108,w:46}}}};
 const halves=cuts.split(view,cut,1,{impact,variation:.5,tilt:.55});
 if(!halves.upper.flex&&!halves.lower.flex)throw new Error('No flexible body created for '+name);
 cuts.launch(halves.upper,130,220,2);if(cut==='vertical')cuts.launch(halves.lower,-80,100,-2);
 function render(){const c=createCanvas(850,440),g=c.getContext('2d');g.fillStyle='#242126';g.fillRect(0,0,850,440);g.strokeStyle='#78645a';g.beginPath();g.moveTo(0,360);g.lineTo(850,360);g.stroke();
 for(const o of images){if(!o.visible||!textures.has(o.key))continue;const tex=textures.get(o.key),[cx,cy,cw,ch]=o.crop??[0,0,tex.width,tex.height];g.save();g.globalAlpha=o.alpha;g.translate(o.x,o.y);g.rotate(o.rotation);g.scale(o.scaleX,o.scaleY);g.drawImage(tex,cx,cy,cw,ch,cx-o.originX*tex.width,cy-o.originY*tex.height,cw,ch);g.restore();}return c;}
 const initial=render();for(let i=0;i<180;i++)cuts.update();const settled=render();snapshots.push([name,initial,settled]);
 console.log(name,': flexible pieces',Object.values(halves).filter(p=>p.flex).length,'sleeping',Object.values(halves).filter(p=>p.flex?.chain.asleep).length);
 for(let i=0;i<420;i++)cuts.update();
 if(Object.values(halves).some(p=>p.flex&&!p.flex.chain.asleep))throw new Error('Remains did not settle: '+name);
 cuts.clear();if(textures.size!==1)throw new Error('Cut texture leak after cleanup: '+textures.size);
}
const c=createCanvas(1700,1320),g=c.getContext('2d');snapshots.forEach(([name,a,b],i)=>{g.drawImage(a,0,i*440);g.drawImage(b,850,i*440);});fs.writeFileSync('docs/dynamic-slices-review.png',c.toBuffer('image/png'));
