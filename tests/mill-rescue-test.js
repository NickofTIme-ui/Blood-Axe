import assert from 'node:assert/strict';
import {World} from '../src/core/World.js';
import {Stage} from '../src/stage/Stage.js';
import {STAGE_VILLAGE} from '../src/data/stageVillage.js';
import {createPlayer} from '../src/entities/Player.js';
import {Controller} from '../src/core/Controller.js';
import {LEAP,FREED} from '../src/stage/MillRescue.js';
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
{
 // cut free, he jumps down off the front of the block, lands on the ground, then runs
 const {w,p,st,r}=setup();r.update();r.executioner.health=0;r.update();
 p.x=4860;p.z=296;p.h=70;Object.defineProperty(p,'activeAttack',{configurable:true,value:{move:{hitbox:{x:-20,y:0,w:50,h:125}}}});r.update();
 assert.equal(r.outcome,'saved');const n=st.story.npc('barn');assert.equal(n.h,70);
 assert(!n.millCaptive&&n.actArt==='irvolino-freed'&&n.act==='bound','From the cut he is drawn as himself, not the gallows painting');
 let peak=0,airborne=false;const seen=new Set();const down=LEAP.up+LEAP.crouch+LEAP.air;
 for(let i=0;i<down+LEAP.land+1;i++){r.update();st.story.updateNpcs([]);peak=Math.max(peak,n.h);if(n.act==='leap')airborne=true;if(n.actArt==='irvolino-freed')seen.add(n.act);
   if(i<down)assert.notEqual(n.state,'fleeing','He does not run off before he lands');
   if(i<LEAP.up-1)assert.equal(n.dir,1,'He gets free facing the way he hung');}
 for(const [pose] of FREED)assert(seen.has(pose),`He plays ${pose}`);
 assert(airborne,'He leaps');assert(peak>70,'The leap arcs above the block');
 assert.equal(n.h,st.terrain.groundAt(n.x,n.z));assert(n.z>358,'He lands in front of the block');assert.equal(n.act,null);
 // (Nick, 2026-10-24, in ChatGPT: he waits about six seconds so you can talk to him, then goes, calmer)
 st.story.updateNpcs([]);assert.equal(n.state,'free','He stays a moment after the landing to be spoken to');
 for(let i=0;i<n.freeFor;i++)st.story.updateNpcs([]);assert.equal(n.state,'fleeing','Then he leaves');
 const x0=n.x;for(let i=0;i<60;i++)st.story.updateNpcs([]);assert.equal(n.h,0);assert(x0-n.x>LEAP.sprint*.8,'He runs for his life');
}
{
 // at the lever the hangman asks for his last words, and Irvolino answers him (boxed, the fight goes on)
 const {st,r}=setup();let said=null;
 for(let i=0;i<1300&&!said;i++){r.update();st.story.update();said=st.story.current?.beat.id==='millLastWords'?st.story.current.beat.lines[0]:null;}
 assert(said,'Irvolino answers the hangman');assert.equal(said[0],'MILLER');assert(r.clock<1260,'He answers before the final warning');
 console.log('Mill rescue: Irvolino answers the hangman before the drop.');
}
{
 // the hangman fights (Nick, 2026-10-24: he hopped about and never engaged): a hero at the
 // foot of the gallows gets the cleaver; left alone he hops back up once and works the lever
 const {w,p,st,r}=setup();r.update();const e=r.executioner;let jumps=0;const swings=new Set();
 w.events.on('jump',(ev)=>{if(ev.fighter===e)jumps++;});w.events.on('attackStart',(ev)=>{if(ev.fighter===e)swings.add(ev.state);});
 const step=()=>{w.tick();st.update();p.health=Math.max(p.health,60);for(const f of w.fighters)if(f.team==='enemy'&&f!==e&&f.alive)f.health=0;};
 p.x=4950;p.z=410;let fought=false;const clock=r.clock;
 for(let i=0;i<600;i++){step();fought||=r.fighting;}
 assert(fought&&e.controller===r.brain,'a hero at the gallows draws him into the fight');
 assert(swings.size>=2,`he swings at him (${[...swings]})`);assert(e.h<70,'he comes down off the mill floor after him');
 assert(r.clock<clock+60,'the rope holds while he fights');assert.equal(jumps,0,'no hopping about');
 p.x=e.x<4950?5650:4320;p.z=450;for(let i=0;i<600;i++)step();
 assert(!r.fighting&&r.operating,'left alone, he goes back to the lever');assert.equal(e.h,70);assert.equal(jumps,1,'one hop back up');
 // a hero up on the mill floor with him below: he climbs up after him
 p.x=4950;p.z=410;for(let i=0;i<200;i++)step();p.x=4800;p.z=300;p.h=p.floor=70;p.vh=0;p.fsm.change('idle');
 for(let i=0;i<300;i++)step();assert.equal(e.h,70,'he follows him up');assert(r.fighting);
}
console.log('Mill rescue: the hangman fights a hero at the gallows, holds the rope while he does, hops back to the lever once and climbs after a man on the mill floor.');
