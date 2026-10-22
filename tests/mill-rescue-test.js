import assert from 'node:assert/strict';
import {World} from '../src/core/World.js';
import {Stage} from '../src/stage/Stage.js';
import {STAGE_VILLAGE} from '../src/data/stageVillage.js';
import {createPlayer} from '../src/entities/Player.js';
import {Controller} from '../src/core/Controller.js';
function setup(){const w=new World({seed:123}),p=createPlayer(w,new Controller(),'warrior',4800,400),st=new Stage(w,STAGE_VILLAGE);st.start(p,{section:3});st.fightOn=true;w.hold=null;return {w,p,st,r:st.millRescue};}
{
 const {w,p,st,r}=setup();st.fightOn=false;r.update();assert(!r.started);st.fightOn=true;w.hold={};r.update();assert(!r.started);w.hold=null;r.update();assert(r.executioner.alive);
 r.executioner.health=0;const clock=r.clock;for(let i=0;i<1600;i++)r.update();assert.equal(r.clock,clock);assert.equal(r.outcome,null,'Death stops the clock but does not auto-free');
 p.x=4860;p.z=296;p.h=0;Object.defineProperty(p,'activeAttack',{configurable:true,value:{move:{hitbox:{x:-20,y:0,w:50,h:30}}}});r.update();assert.equal(r.outcome,null,'Ground-level short hit misses the elevated bonds');
 p.h=70;Object.defineProperty(p,'activeAttack',{value:{move:{hitbox:{x:-20,y:0,w:50,h:125}}}});r.update();assert.equal(r.outcome,'saved');assert(st.story.isRescued('barn'));assert(!st.story.lost.has('barn'));assert.equal(st.story.npc('elsbeth').state,'gone');
}
{
 const {st,r}=setup();for(let i=0;i<1500;i++)r.update();assert.equal(r.outcome,'lost');assert(st.story.lost.has('barn'));assert(!st.story.isRescued('barn'));assert(st.story.isRescued('elsbeth'));assert.equal(st.story.vigilNpc('barn').id,'elsbeth');
 r.executioner.health=0;r.update();assert.equal(r.outcome,'lost','Killing him after the drop cannot undo the death');r.reset();assert.equal(r.outcome,null);assert(!st.story.isRescued('elsbeth'));assert(!st.story.lost.has('barn'));
}
{
 const {w,p,st,r}=setup();for(let i=0;i<1500;i++)r.update();st.enterSection(6,true);p.x=8700;
 for(let i=0;i<5;i++){w.tick();st.update();}
 const e=st.story.npc('elsbeth');assert.equal(e.state,'gathered');assert.equal(st.story.npc('barn').state,'lost');assert.equal(st.story.talkBeat(e).id,'vigil-elsbeth-before');
 st.story.npc('hakon').state='dead';st.story.done.add('vow');for(let i=0;i<365;i++)st.story.updateChurchProcession();assert(e.insideChurch);assert(!st.story.npc('barn').insideChurch,'Dead Irvolino never returns for the procession');
}
console.log('Mill rescue: encounter-only timer, hold safety, kill stops clock, strike height, persistent failure, replacement identity and retry reset passed.');
