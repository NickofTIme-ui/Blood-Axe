// Level 1's props smash well (Nick, 2026-11-02): packed in clusters, a man flung into them
// goes through and they go over in a row; crates stacked on one that breaks come down; a
// lamp post knocked over burns where it lands and sets a hay cart alight; the stable herd
// smashes what stands in its lane (stage/Stage.js CHAIN, LAMP; view/PropShatter.js).
import assert from 'node:assert/strict';
import {World} from '../src/core/World.js';
import {Stage} from '../src/stage/Stage.js';
import {STAGE_VILLAGE} from '../src/data/stageVillage.js';
import {createPlayer} from '../src/entities/Player.js';
import {Controller} from '../src/core/Controller.js';
function setup(section=1,x=1500){const w=new World({seed:7}),p=createPlayer(w,new Controller(),'warrior',x,420),st=new Stage(w,STAGE_VILLAGE);st.start(p,{section});w.hold=null;return {w,p,st};}
const run=(w,st,n)=>{for(let i=0;i<n;i++){w.tick();st.update();}};
{
 // clusters, not lone barrels: every section with barrels has them side by side
 const {st}=setup();
 const barrels=st.props.filter((pr)=>pr.kind==='barrel');
 const lone=barrels.filter((b)=>!st.props.some((q)=>q!==b&&['barrel','crate'].includes(q.kind)&&Math.abs(q.x-b.x)<60&&Math.abs(q.z-b.z)<30));
 assert(lone.length<=1,`barrels stand with others (${lone.map((b)=>b.x)})`);
 assert(st.props.filter((pr)=>pr.kind==='lamppost').length>=4,'lamp posts along the street');
 assert(st.props.some((pr)=>pr.kind==='haycart'),'a hay cart');
}
{
 // a man flung into the market's barrels: he goes through, and the ones packed by it go too
 const {w,st}=setup();
 const row=st.props.filter((pr)=>pr.section===1&&pr.x<1700&&pr.z<380);
 assert(row.length>=4);
 const first=row.find((pr)=>pr.x===1606);
 w.events.emit('solidSmashed',{prop:first,dir:1});
 assert(first.broken,'one body breaks the barrel it hits');
 run(w,st,40);
 const broken=row.filter((pr)=>pr.broken).length;
 assert(broken>=3,`a chain through the cluster (${broken} of ${row.length})`);
}
{
 // the real thing: a man knocked flying into them smashes through and carries on
 const {w,p,st}=setup();
 const first=st.props.find((pr)=>pr.x===1606);
 p.x=1560;p.z=334;p.h=20;p.fsm.change('knockdown',{vx:720,vh:160});
 for(let i=0;i<20;i++){w.tick();st.update();}
 assert(first.broken,'the barrel he was thrown into is smashed');
 assert(p.x>first.x+20,`he went on through it (x ${Math.round(p.x)})`);
}
{
 // a hero dodge-rolling into barrels rolls straight through them, smashing them
 const {w,p,st}=setup();
 const b=st.props.find((pr)=>pr.x===1606);
 p.x=1560;p.z=334;p.controller.moveX=1;p.fsm.change('dodge');
 for(let i=0;i<20;i++){w.tick();st.update();}
 assert(b.broken,'rolled through the barrel');assert(p.x>b.x,`and out the other side (x ${Math.round(p.x)})`);
}
{
 // a light swing breaking one knocks the next barrel over: it rolls off into the lane, cracked
 const {w,st}=setup();
 const a=st.props.find((pr)=>pr.x===1606),b=st.props.find((pr)=>pr.x===1640);
 const z0=b.z;
 st.breakProp(a,1,false,1);run(w,st,90);
 assert(!b.broken&&b.hp===1&&b.tipped,'the next one tips over, cracked');
 assert(b.z>z0+5,`and rolls out into the lane (into the barrel in front of it) (z ${z0} -> ${Math.round(b.z)})`);
 assert(!b.tumble,'and comes to rest');
}
{
 // a crate up on another is knocked off it by a light blow, tumbles down and lands
 const {w,p,st}=setup();
 const top=st.props.find((pr)=>pr.section===1&&pr.under!==undefined&&pr.under!==null);
 const x0=top.x;const landed=[];w.events.on('propLand',(e)=>landed.push(e.prop));
 st.strikeProp(top,1,1);
 assert(top.fall&&!top.broken,'knocked off, not broken');
 run(w,st,60);
 assert(landed.includes(top));assert(top.x>x0+15,'it came down off the side');assert.equal(top.y,0);
 void p;
}
{
 // a crate stacked on another comes down when it goes, and lands
 const {w,st}=setup();
 const top=st.props.find((pr)=>pr.section===1&&pr.under!==undefined);
 const base=st.props.find((pr)=>pr.id===top.under);
 assert(top.y>base.y+20,'up on the crate below');
 assert(!st.solidAt(top.x,top.z,0)?.prop||st.solidAt(top.x,top.z,0).prop!==top,'(the one below is what you walk into)');
 const landed=[];w.events.on('propLand',(e)=>landed.push(e.prop));
 st.breakProp(base,1,false,0);run(w,st,60);
 assert(landed.includes(top),'it lands');assert.equal(top.y,base.y,'on the ground');
 assert(top.broken||top.hp<2,'and the fall cracks it');
}
{
 // the lamp by the hay cart: it falls, burns where it lands, and the cart goes up
 const {w,st}=setup();
 const lamp=st.props.find((pr)=>pr.kind==='lamppost'&&pr.x===1760),cart=st.props.find((pr)=>pr.kind==='haycart'&&pr.section===1);
 const ev=[];for(const k of ['propImpact','propIgnite','propBurnt'])w.events.on(k,()=>ev.push(k));
 st.strikeProp(lamp,1,2);assert(lamp.broken);
 run(w,st,10);assert(!ev.includes('propImpact'),'it takes a moment to come down');
 run(w,st,30);assert.deepEqual(ev,['propImpact','propIgnite']);assert(cart.burning&&!cart.broken);
 // anyone standing in the blaze burns
 const e={...w.fighters[0]};void e;
 const p=w.fighters.find((f)=>f.team==='player');p.x=cart.x;p.z=cart.z+10;p.h=0;const hp=p.health;
 p.invincible=false;st.updateBlazes();assert(p.health<hp,'the burning cart burns');
 run(w,st,800);assert(ev.includes('propBurnt')&&cart.burnt&&!cart.burning,'and burns out');
}
{
 // the stampede goes through the barrels in its lane
 const {w,st}=setup(4,5760);
 const lane=st.props.filter((pr)=>pr.section===4&&pr.kind==='crate'&&pr.x>6600);
 assert(lane.length>=2);
 st.story.rescued.add('horses');
 for(let i=0;i<1500&&lane.some((pr)=>!pr.broken);i++){w.tick();st.updateHazards();st.updateProps();}
 assert(lane.every((pr)=>pr.broken),`the herd smashes the crates in its lane (${lane.filter((pr)=>!pr.broken).length} left)`);
}
console.log('Prop smashing checks passed: clusters, chain through a cluster, cracked neighbours, stacked crates fall, lamp oil and the hay cart burn, the herd smashes its lane.');
