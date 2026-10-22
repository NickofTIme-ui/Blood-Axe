import assert from 'node:assert/strict';
import {chooseFatality,chooseMaim} from '../src/combat/Fatality.js';
import {FleshChain} from '../src/effects/FleshChain.js';
import {SplitSeam} from '../src/effects/SplitSeam.js';
import {CHARACTERS} from '../src/data/characters.js';
assert.equal(CHARACTERS.warrior.moves.heavy.cut,'chop');
assert.equal(CHARACTERS.warrior.moves.heavy.overhead,true);
for(const rel of [.1,.5,.9])for(let i=0;i<1000;i++){
 assert.equal(chooseFatality({cut:'chop',damage:30,overkill:20,rel},()=>(i+.5)/1000),'halfV','Downward killing stroke cannot make a horizontal cut, decap or leg cut');
}
const chance=overhead=>Array.from({length:1000},(_,i)=>chooseMaim({cut:'chop',damage:30,maxHealth:100,overhead},()=>(i+.5)/1000)).filter(Boolean).length;
assert(chance(true)>chance(false));
assert.equal(chooseMaim({cut:'chop',damage:30,maxHealth:100,overhead:true,maimed:{armB:true,armF:true}},()=>0),null);
const a=new FleshChain([{x:295,y:150},{x:295,y:180},{x:295,y:215}]);
const b=new FleshChain([{x:305,y:150},{x:305,y:180},{x:305,y:215}]);
a.launch(-45,-160,-2);b.launch(45,-160,2);
const seam=new SplitSeam(a,b);let alive=true,attachedFrames=0;
for(let i=0;i<600;i++){
 if(alive){alive=seam.step();if(alive)attachedFrames++;}
 for(const chain of [a,b]){
  chain.step(()=>400,{minX:0,maxX:900},[4,5,3]);
  for(const p of chain.points)assert(Number.isFinite(p.x)&&p.y<=400.01,'Attachment destabilized body/ground contacts');
 }
}
assert(attachedFrames>20,'Partial split should remain attached long enough to read');
assert.equal(alive,false,'Soft attachment eventually tears rather than pinning a corpse forever');
console.log('Overhead cuts: vertical only at every hit height; stronger arm maims; attached halves stay bounded and tear free.');
