import assert from 'node:assert/strict';
import {MageHover} from '../src/effects/MageHover.js';
import {StripHeroView} from '../src/view/StripHeroView.js';
const f={state:'idle',stats:{hover:{}},fsm:{frame:0},world:{frame:0}};
const view={f,A:{idle:{frames:['idle:0','idle:1','idle:2'],fps:8}}};
const hover={f,t:0,lastLift:0,sway:0,k:1};let previous=0,min=Infinity,max=-Infinity;
for(let i=0;i<=600;i++){
 f.world.frame=i;hover.t=i;
 assert.equal(StripHeroView.prototype.frameFor.call(view),'idle:0');
 const {lift,sway}=MageHover.prototype.motion.call(hover,false);
 assert.ok(Math.abs(lift-previous)<.05,'idle position must not jump');
 assert.ok(Math.abs(sway)<=.23,'idle must not rock');
 min=Math.min(min,lift);max=Math.max(max,lift);previous=lift;
}
assert.ok(max-min>4&&max-min<4.5,'subtle complete hover cycle');
console.log('Mage idle: stable pose and continuous gentle hover passed');
