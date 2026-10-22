import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Phaser={Textures:{FilterMode:{LINEAR:1}}};
const {pieceTex}=await import('../src/effects/goreArt.js');
const atlas=await loadImage('assets/fx/gore-painted-atlas.png'),textures=new Map([['gore-painted-atlas',atlas]]);
const scene={textures:{exists:k=>textures.has(k),get:k=>({getSourceImage:()=>textures.get(k)}),addCanvas(k,c){textures.set(k,c);return{setFilter(){}};}}};
const out=createCanvas(800,600),g=out.getContext('2d');g.fillStyle='#292425';g.fillRect(0,0,800,600);
const types=['forearm','upperArm','lowerLeg','helmet','meat','organ','gutLoop','sinew','boneShard','skullShard','eyeball','armor'];
types.forEach((type,i)=>{
 const p=pieceTex(scene,type,0),image=textures.get(p.key);assert(image.width>4&&image.height>4);
 const ctx=image.getContext('2d'),data=ctx.getImageData(0,0,image.width,image.height).data;
 let transparent=0,opaque=0;for(let a=3;a<data.length;a+=4){if(data[a]<10)transparent++;if(data[a]>200)opaque++;}
 assert(transparent>10&&opaque>10,'Painted gore must have usable alpha and actual visible content');
 const size=125/Math.max(image.width,image.height),x=(i%4)*200+100,y=Math.floor(i/4)*200+85;
 g.drawImage(image,x-image.width*size/2,y-image.height*size/2,image.width*size,image.height*size);
 g.fillStyle='#eee2cc';g.font='16px sans-serif';g.fillText(type,(i%4)*200+20,Math.floor(i/4)*200+175);
});
fs.writeFileSync('docs/painted-gore-review.png',out.toBuffer('image/png'));
console.log('All twelve painted fragment types import with transparency and readable detail.');
