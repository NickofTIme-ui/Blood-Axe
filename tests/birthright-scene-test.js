import assert from 'node:assert/strict';
import { World } from '../src/core/World.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { createEnemy } from '../src/entities/Enemy.js';
import { CHARACTERS } from '../src/data/characters.js';
import { STAGE_VILLAGE } from '../src/data/stageVillage.js';
import { Stage } from '../src/stage/Stage.js';

function setup(){
  const w=new World({seed:23}),p=w.addFighter(new Fighter({stats:CHARACTERS.warrior,team:'player',x:8740,z:400,controller:new Controller()}));
  const st=new Stage(w,STAGE_VILLAGE);st.start(p,{section:6});p.x=8740;
  const tick=()=>{w.tick();st.update();};tick();
  assert.ok(!st.story.holding,'Father waits for a deliberate interaction');
  p.x=8830;p.z=330;p.controller.registerPress('padUp');tick();
  return{w,p,st,tick};
}
{
  const {w,p,st,tick}=setup();
  assert.ok(st.story.holding&&w.hold?.owner==='story');
  const e=createEnemy(w,'grunt',p.x+20,p.z);
  e.controller.cooldown=0;
  const hp=p.health,x=e.x;
  let projectileTicks=0;w.projectiles.push({update(){projectileTicks++;}});
  for(let i=0;i<240;i++)tick();
  assert.equal(p.health,hp,'Enemy must not hurt a player frozen by dialogue');
  assert.equal(e.x,x,'Enemy must be frozen too');
  assert.equal(projectileTicks,0,'Shots must pause during held dialogue');
  assert.equal(st.waveIndex,0,'No wave may spawn during the scene');
  let given=0;w.events.on('campaignFlag',({key})=>{if(key==='oathkeeper')given++;});
  st.story.skipScene();tick();
  assert.ok(st.story.done.has('elder')&&!w.hold,'Skipping safely releases the story hold');
  assert.equal(given,1);assert.equal(st.story.npc('hakon').state,'dead');
}
{
  const {w,st,tick}=setup();let given=0,fatherAtGift;
  w.events.on('campaignFlag',({key})=>{if(key==='oathkeeper'){given++;fatherAtGift=st.story.npc('hakon').state;}});
  const c=st.story.current;
  while(c.index<7){c.age=1000;c.skip=true;tick();}
  assert.equal(st.story.npc('hakon').state,'dead');assert.equal(given,1,'Father gives the sword before dying');
  assert.notEqual(fatherAtGift,'dead','His father must be alive for the handoff');
  c.age=0;c.skip=true;
  for(let i=0;i<239;i++)tick();
  assert.equal(c.index,7,'Grief must not disappear on an accidental rapid press');
  tick();assert.equal(c.index,8);assert.equal(given,1);
  assert.equal(c.beat.lines[c.index][1],'','The death is followed by actual silence');
  assert.equal(c.beat.lines[c.index][2].minFrames,300,'Mourners get five seconds without a dialogue box');
  assert.ok(w.hold,'The raised-sword moment stays protected');
  assert.equal(STAGE_VILLAGE.sections[6].waves.length,0,'No ambush after the farewell');
}
console.log('Birthright checks passed: whole-field safety, no ambush, father gives sword, death/grief timing, single reward and safe skipping.');
