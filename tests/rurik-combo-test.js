import assert from 'node:assert/strict';
import { BladeTrail,bladeWorldPoint } from '../src/view/BladeTrail.js';
import { CHARACTERS } from '../src/data/characters.js';
for(const face of [-1,1])for(const rotation of [-.3,0,.3]){
 const s={x:200,y:300,originX:.5,originY:.95,frame:{width:300,height:240},scaleX:.7*face,scaleY:.8,rotation};
 const p={x:220,y:60},a=bladeWorldPoint(s,p),x=70*.7*face,y=(60-228)*.8;
 assert.ok(Math.abs(a.x-(200+x*Math.cos(rotation)-y*Math.sin(rotation)))<1e-9);
 assert.ok(Math.abs(a.y-(300+x*Math.sin(rotation)+y*Math.cos(rotation)))<1e-9);
}
const moves=CHARACTERS.warrior.moves;
assert.deepEqual(['light1','light2','light3'].map(k=>[moves[k].startup,moves[k].active,moves[k].recovery,moves[k].hitstop]),[[5,3,12,5],[5,3,13,6],[8,4,22,10]]);
assert.deepEqual(moves.light1.chains.map(c=>[c.next,c.from,c.to]),[['light2',6,20],['heavy',9,20]]);
assert.deepEqual(moves.light2.chains.map(c=>[c.next,c.from,c.to]),[['light3',6,21],['launcher',9,21]]);
const trail=new BladeTrail(),fills=[],lines=[];
const g={fillStyle(){},fillPoints(p){fills.push(p);},lineStyle(){},lineBetween(...p){lines.push(p);}};
const sprite={x:0,y:0,originX:0,originY:0,frame:{width:300,height:240},scaleX:1,scaleY:1,rotation:0};
const fighter={state:'light1',fsm:{enterCount:1},facing:1,stats:{},move:moves.light1};
trail.draw(g,sprite,{hilt:{x:10,y:30},tip:{x:-50,y:30}},fighter,5);
assert.equal(lines.length,0,'No active smear before the hit starts');
trail.draw(g,sprite,{hilt:{x:10,y:30},tip:{x:80,y:30}},fighter,6);
assert.deepEqual(lines.at(-1).slice(2),[80,30],'Bright edge must finish on the actual sword tip');
assert.ok(fills.length>0);
fighter.fsm.enterCount++;trail.draw(g,sprite,{hilt:{x:10,y:30},tip:{x:80,y:30}},fighter,1);
assert.equal(trail.history.length,1,'A fresh swing cannot inherit a stray smear');
console.log('Rurik combo: preserved attack/chain timing and blade-locked trails, mirrored and rotated.');
