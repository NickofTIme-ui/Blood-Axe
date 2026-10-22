import assert from 'node:assert/strict';
import {Gore} from '../src/effects/Gore.js';
for(const type of ['halfV','halfH']){
const bits=[],ropes=[],bursts=[],upper={},lower={};
const gore={scene:{cuts:{split:()=>({upper,lower}),launch(){},attachSplit(){}}},dismemberer:{bits(...x){bits.push(x)},rope(...x){ropes.push(x)}},amount:2.7,burst(...x){bursts.push(x)}};
const view={sheet:{},sprite:{visible:true,scaleX:1},f:{x:100,z:350,h:0,facing:1,stats:{body:{h:90,w:40},look:{skin:0x998877}}},hideAll(){}};
assert(Gore.prototype.cutSprite.call(gore,type,view,{dir:1,move:{cut:'chop'}}));
assert.equal(bits.length,type==='halfV'?1:0);assert.equal(ropes.length,type==='halfV'?1:0);
if(type==='halfV'){assert.deepEqual(bits[0][3],['organ','gut']);assert.equal(bits[0][4],2);assert.equal(ropes[0][2].chunk,upper);assert.equal(ropes[0][2].copies,1);assert(ropes[0][2].lenU<=45);}
assert.equal(bursts.length,1);assert.equal(bursts[0][4],162,'Blood spray unchanged');
}
console.log('Vertical splits spill painted organs and one short gut rope; other cuts and blood unchanged.');
import {Dismember} from '../src/effects/Dismember.js';
let shardKinds;
Dismember.prototype.shards.call({bits(x,y,z,kinds){shardKinds=kinds;}},0,0,300,[0xff0000],12);
assert.deepEqual(shardKinds,['skullBit','bone','meat2'],'Skull debris uses painted shapes instead of square pixels');
const goreSource=(await import('node:fs')).readFileSync('src/effects/Gore.js','utf8');
assert(!goreSource.includes("texture: 'px'"),'Kill and maim debris no longer emits solid squares');
