import assert from 'node:assert/strict';
import { FleshChain } from '../src/effects/FleshChain.js';
import { cutPlane,cutDistance } from '../src/effects/CutGeometry.js';
import { chooseFatality } from '../src/combat/Fatality.js';

function tally(rel){const c={};for(let i=0;i<1000;i++){const k=chooseFatality({cut:'slash',damage:30,rel},()=>(i+.5)/1000);c[k]=(c[k]??0)+1;}return c;}
const highHits=tally(.85),lowHits=tally(.15);
assert.ok(highHits.decap>lowHits.decap*10,'High contacts should favor the head');
assert.ok(lowHits.limbs>highHits.limbs*3,'Low contacts should favor legs');
for(const lying of [false,true]){
 const base={cut:'waist',bounds:{x0:0,x1:200,y0:0,y1:200},ax:100,ay:200,bodyHeight:200,lying,variation:.5,tilt:.5};
 const high=cutPlane({...base,impact:.75}),low=cutPlane({...base,impact:.3});
 assert.ok(lying?high.cx<low.cx:high.cy<low.cy,'Actual impact height must change the slice location');
}
const plane=cutPlane({cut:'waist',ax:50,ay:100,bodyHeight:100});
assert.notEqual(cutDistance(plane,10,plane.cy),cutDistance(plane,30,plane.cy),'Cut surface should have shallow irregularity');
for(const direction of [-1,1]){
 const chain=new FleshChain([{x:300,y:100},{x:300,y:135},{x:300,y:170},{x:300,y:195}]);
 chain.launch(direction*150,-220,direction*2);
 let bent=false;
 for(let tick=0;tick<600;tick++){
  chain.step(()=>400,{minX:0,maxX:900},[6,10,5,3]);
  const p=chain.points;
  const cross=(p[1].x-p[0].x)*(p[2].y-p[1].y)-(p[1].y-p[0].y)*(p[2].x-p[1].x);
  if(Math.abs(cross)>30)bent=true;
  for(let i=0;i<p.length;i++)assert.ok(Number.isFinite(p[i].x)&&p[i].y<=400-[6,10,5,3][i]+.01,'Joint penetrated ground or became unstable');
 }
 assert.ok(bent,'The severed piece must fold at its retained joints');
 assert.ok(chain.asleep,'Remains should settle instead of twitching forever');
 for(let i=0;i<chain.lengths.length;i++)assert.ok(Math.abs(Math.hypot(chain.points[i+1].x-chain.points[i].x,chain.points[i+1].y-chain.points[i].y)-chain.lengths[i])<1,'Body segment stretched');
 chain.launch(direction*90,-160,1);assert.equal(chain.asleep,false,'Kicking settled remains wakes them');
}
console.log('Dynamic slices: hit-position cuts, irregular edges, folding joints, ground contact, settling and relaunch.');
