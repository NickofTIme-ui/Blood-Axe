import assert from 'node:assert/strict';
import { FireAmbience } from '../src/core/FireAmbience.js';
import { PaintedFire, firePixel, fireLight } from '../src/view/PaintedFire.js';
import { SETTINGS } from '../src/config/settings.js';

assert.ok(firePixel(240,110,20,255));
for (const p of [[255,0,255,255],[80,60,40,255],[130,130,130,255],[240,110,20,0]]) assert.ok(!firePixel(...p),'Non-fire art selected');
const frames=Array.from({length:60},(_,i)=>fireLight(30,40,i/15));
assert.ok(Math.max(...frames)-Math.min(...frames)>0.4,'Painted fire should visibly vary');
assert.ok(frames.every(v=>v>=0&&v<=1));
{
  let refreshes=0, output, shutdown, destroyed=0;
  const source={width:3,height:1};
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray([240,110,20,255,170,110,70,255,255,0,255,255])})})})};
  const overlay={setOrigin(){return this;},setTileScale(x,y){this.sx=x;this.sy=y;return this;},setDepth(){return this;},destroy(){destroyed++;}};
  const scene={events:{once(e,fn){shutdown=fn;}},textures:{get:()=>({getSourceImage:()=>source}),exists:()=>false,remove(){},createCanvas:()=>({context:{createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(img){output=new Uint8ClampedArray(img.data);}},refresh(){refreshes++;}})},add:{tileSprite:()=>overlay}};
  const fire=new PaintedFire(scene);
  fire.add({texture:{key:'wall'},x:0,y:0,width:100,height:1,originX:0,originY:0,tileScaleX:1,tileScaleY:1,depth:-51},true);
  fire.update(0);assert.equal(refreshes,1);
  assert.ok(output[3]>0);assert.equal(output[7],0);assert.equal(output[11],0);
  const before=output[1]; fire.update(10);assert.equal(refreshes,1,'Texture refreshed faster than 15 Hz');
  fire.update(1000);assert.equal(refreshes,2);assert.notEqual(output[1],before);
  assert.equal(overlay.sx,1,'Repeated fire mask must align to the wall');
  shutdown();assert.equal(destroyed,1);
  delete globalThis.document;
}
for (const locked of [false,true]) {
  let unlock, plays=0, stops=0, destroys=0, volume=0, detached=0;
  const sound={isPlaying:false,play(){this.isPlaying=true;plays++;},setVolume(v){volume=v;},stop(){stops++;},destroy(){destroys++;}};
  const scene={cache:{audio:{exists:()=>true}},sound:{locked,add:()=>sound,once(e,fn){unlock=fn;},off(e,fn){if(fn===unlock)detached++;}},events:{once(){}},stageData:{fireBed:1},cameras:{main:{worldView:{centerX:0,width:960}}}};
  const ambience=new FireAmbience(scene);
  assert.equal(plays,locked?0:1);
  if(locked){scene.sound.locked=false;unlock();unlock();assert.equal(plays,1,'Unlock must not stack loops');}
  for(let i=0;i<300;i++)ambience.update(1000/60);
  assert.ok(Math.abs(volume-SETTINGS.audio.sfx*0.4)<0.001,'Village bed mix');
  assert.ok(volume>0.3,'Burning ambience should be audible in default mix');
  scene.leaving=true;
  for(let i=0;i<300;i++)ambience.update(1000/60);
  assert.ok(volume<0.001,'Ambience fades when leaving');
  ambience.destroy();assert.equal(stops,1);assert.equal(destroys,1);
  if(locked)assert.equal(detached,1,'Unlock callback removed on shutdown');
}
console.log('Ambience checks passed: audible mix, unlock/single-loop lifecycle, exit fade and masked fire flicker.');
