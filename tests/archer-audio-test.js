import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BattlefieldAudio} from '../src/core/BattlefieldAudio.js';
import {SFX} from '../src/core/Sfx.js';
import {SETTINGS} from '../src/config/settings.js';
const listeners={},played=[],delayed=[];
const scene={world:{events:{on:(key,fn)=>listeners[key]=fn}},time:{now:1000,delayedCall:(ms,fn)=>delayed.push({ms,fn})},sys:{isActive:()=>true},cache:{audio:{exists:key=>fs.existsSync(SFX[key])}},sound:{locked:false,play:(key,config)=>played.push({key,...config})}};
new BattlefieldAudio(scene);
listeners.shellLaunch({hazard:{look:'stones'},count:3});assert.equal(played.length,0);
listeners.shellLaunch({hazard:{look:'arrows'},count:3});assert.equal(played.length,1);assert.equal(delayed.length,2);
assert.ok(played[0].volume>=SETTINGS.audio.sfx*.95*.85,'Lead release must stay audible');
for(const d of delayed) d.fn();
assert.equal(played.length,3);assert.ok(new Set(played.map(p=>p.key)).size===2,'Both user-supplied takes are layered');
assert.ok(played[0].volume>played[1].volume,'Lead shot should not be attenuated with the backing layers');
assert.ok(delayed[0].ms>=42&&delayed[1].ms>delayed[0].ms);
listeners.shellLaunch({hazard:{look:'arrows'},count:9});assert.equal(played.length,3,'Simultaneous hazards must not stack uncontrolled volleys');
scene.time.now+=300;scene.paused=true;listeners.shellLaunch({hazard:{look:'arrows'},count:2});assert.equal(played.length,3);
scene.paused=false;scene.time.now+=300;delayed.length=0;listeners.shellLaunch({hazard:{look:'arrows'},count:99});assert.equal(delayed.length,3,'Voice count capped at four');
scene.leaving=true;for(const d of delayed)d.fn();assert.equal(played.length,4,'Scheduled shots stop when leaving');
for(const key of ['bowShot1','bowShot2']){
 const b=fs.readFileSync(SFX[key]);let data;for(let i=12;i+8<=b.length;){const n=b.readUInt32LE(i+4);if(b.toString('ascii',i,i+4)==='data'){data=b.subarray(i+8,i+8+n);break;}i+=8+n+(n%2);}
 assert.ok(data);let sum=0,peak=0;for(let i=0;i<data.length;i+=2){const v=data.readInt16LE(i)/32768;sum+=v*v;peak=Math.max(peak,Math.abs(v));}
 assert.ok(Math.sqrt(sum/(data.length/2))>.09,`${key} average level too quiet`);assert.ok(peak<.9,`${key} lacks headroom`);
}
console.log('Archer audio checks passed: release routing, audible lead, staggered variants, bounded voices, pause/exit, WAV loudness/headroom.');

