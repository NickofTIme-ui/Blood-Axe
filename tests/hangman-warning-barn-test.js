// The hangman's warning (stage/MillRescue.js) and the barn's barricades with their tally
// (data/stageVillage.js, Story.tally): Nick, 2026-10-23.
import assert from 'node:assert/strict';
import {World} from '../src/core/World.js';
import {Stage} from '../src/stage/Stage.js';
import {STAGE_VILLAGE} from '../src/data/stageVillage.js';
import {MILL} from '../src/stage/MillRescue.js';
import {createPlayer} from '../src/entities/Player.js';
import {Controller} from '../src/core/Controller.js';
function setup(){const w=new World({seed:123}),p=createPlayer(w,new Controller(),'warrior',4800,400),st=new Stage(w,STAGE_VILLAGE);st.start(p,{section:3});st.fightOn=true;w.hold=null;return {w,p,st,r:st.millRescue};}
{
 // he says what he's about to do, the player is warned twice, and the clock counts down
 const {w,st,r}=setup();const warnings=[];w.events.on('millWarning',(e)=>warnings.push(e));
 r.update();assert(r.started&&r.bark,'he shouts as he takes his place');assert.equal(warnings.length,1);assert(!warnings[0].final);
 assert.equal(Math.round(r.timeLeft),25,'the rope has 25 seconds');
 const seen=new Set([r.bark.text]);
 for(let i=0;i<MILL.final;i++){r.update();if(r.bark)seen.add(r.bark.text);}
 assert(seen.size>=3,`several shouts as the clock runs (${[...seen]})`);
 assert.equal(warnings.length,2,'a last warning before the drop');assert(warnings[1].final);
 assert(r.timeLeft>0&&r.timeLeft<=(MILL.rope-MILL.final)/60+0.01,'the final warning comes with seconds still to save him');
 for(let i=0;i<MILL.rope;i++)r.update();
 assert.equal(r.outcome,'lost');assert.equal(r.bark,null,'no shout hangs on after the drop');
}
{
 // knocked off the lever: the clock holds and he swears; killed: his shout goes with him
 const {r}=setup();r.update();for(let i=0;i<300;i++)r.update();const clock=r.clock;r.bark=null;
 r.executioner.hitstop=5;r.update();assert.equal(r.clock,clock,'the rope holds while he is off the lever');assert(r.bark,'he swears when he is driven off');
 r.executioner.health=0;r.update();assert.equal(r.bark,null);assert.equal(r.outcome,null);
}
{
 // the barn: one barricade, nine people behind it; smashing it lets them all out at once
 const {w,p,st}=setup();
 const def=STAGE_VILLAGE.sections.find((s)=>s.id==='mill').tally;
 const bars=st.props.filter((pr)=>pr.kind==='barricade');
 assert.equal(bars.length,1,'one barricade, on the barn doors (Nick: one spot, not three)');
 assert(!st.props.some((pr)=>pr.kind==='wreckage'&&pr.section===3),'no burning beam in the barn yard any more');
 assert.deepEqual(st.story.tally(def),{saved:0,total:9});
 const freed=[];w.events.on('npcRescued',(e)=>freed.push(e.npc.id));
 st.breakProp(bars[0],1);for(let i=0;i<3;i++){w.tick();st.update();}
 assert.deepEqual(st.story.tally(def),{saved:9,total:9},'all nine out');
 assert.deepEqual(freed.sort(),['barn-east','barn-west','mill-villagers']);
 // a barricade is broken by hits like any prop
 const {st:st2,p:p2,w:w2}=setup();const door=st2.props.find((pr)=>pr.tag==='barn');
 p2.x=door.x-30;p2.z=door.z;p2.facing=1;
 let hits=0;for(let i=0;i<20&&!door.broken;i++){Object.defineProperty(p2,'activeAttack',{configurable:true,value:{move:{hitbox:{x:0,y:0,w:60,h:80}}}});st2.update();hits++;}
 assert(door.broken,`smashed by blows (${door.hp} left)`);
 void p;
}
console.log('Hangman warning: shouts, countdown, final warning, held clock; barn: one barricade, nine villagers counted out.');
