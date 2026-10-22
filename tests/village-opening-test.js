import assert from 'node:assert/strict';
import { World } from '../src/core/World.js';
import { Controller } from '../src/core/Controller.js';
import { Fighter } from '../src/entities/Fighter.js';
import { CHARACTERS } from '../src/data/characters.js';
import { Stage } from '../src/stage/Stage.js';
import { STAGE_VILLAGE } from '../src/data/stageVillage.js';
import { isFinishable } from '../src/combat/Finisher.js';

function setup(section=0){
  const w=new World({seed:21}), p=w.addFighter(new Fighter({stats:CHARACTERS.warrior,team:'player',x:150,z:440,controller:new Controller()}));
  const st=new Stage(w,STAGE_VILLAGE);st.start(p,{section});
  const tick=()=>{w.tick();st.update();};
  return{w,p,st,tick};
}
{
  const {w,p,st,tick}=setup();let bosses=0;
  w.events.on('bossSpawn',()=>bosses++);
  assert.ok(p.x<0&&st.opening.active,'Hero starts outside the screen');
  assert.equal(st.opening.troops.length,6);
  assert.ok(st.opening.commanders.every(f=>!f.stats.boss&&f.invincible));
  for(let i=0;i<80;i++){p.controller.registerPress('heavy');tick();}
  assert.equal(p.x,150);assert.equal(st.opening.phase,'words');
  assert.ok(st.opening.commanders.every(f=>f.health>0),'Commanders cannot be attacked during the scene');
  for(let i=0;i<100;i++)tick();
  st.story.skipScene();tick();
  assert.equal(st.opening.phase,'withdraw');
  const x=st.opening.commanders[0].x;
  for(let i=0;i<100;i++)tick();
  assert.ok(!st.opening.active&&st.fightOn&&!w.hold);
  assert.ok(st.opening.commanders[0].x>x+400);
  assert.ok(st.opening.commanders.every(f=>f.removeMe));
  assert.ok(st.opening.troops.every(f=>!f.cinematic&&!f.awe),'Formation released to fight');
  assert.equal(bosses,0,'Opening commanders must never trigger boss music');
  assert.ok(!p.unbounded&&!p.controller.peek('heavy'),'Opening restores normal movement and clears buffered attacks');
}
{
  const {w,p,st,tick}=setup(3);let bosses=0,sentences=0;
  w.events.on('bossSpawn',()=>bosses++);w.events.on('sentenceStart',()=>sentences++);
  assert.ok(!st.opening,'Checkpoint skips the opening');
  st.millRescue.outcome='saved'; // This check isolates Cinder after the rescue encounter.
  st.fightOn=true;st.waveIndex=99;st.waveDelay=0;tick();
  const cinder=st.livingFoes().find(f=>f.stats.name==='Brother Cinder');
  assert.ok(cinder&&!cinder.stats.boss&&!st.boss);
  cinder.controller.scared=true;assert.ok(!isFinishable(cinder));
  cinder.entering=false;cinder.invincible=false;
  w.combat.resolve(p,cinder,{damage:9999,cut:'blunt',unblockable:true,knockback:{x:0,y:0}},{kind:'melee',dir:1,contact:{x:cinder.x,h:50}});
  tick();
  assert.ok(cinder.health<=0&&!cinder.alive,'Cinder dies ordinarily');
  assert.equal(bosses,0);assert.equal(sentences,0);
}
{
  const {st}=setup(5);st.spawnBoss();
  const troops=st.livingFoes().filter(f=>f!==st.boss);
  assert.equal(troops.length,4,'Last troops are present from the beginning');
  const damage=st.boss.stats.meleeMult;
  st.boss.health=st.boss.stats.maxHealth*0.4;st.updateBossPhases(st.boss);
  assert.ok(st.boss.raged&&st.boss.stats.meleeMult>damage,'Cornered captain remains dangerous');
  assert.equal(st.livingFoes().filter(f=>f!==st.boss).length,4,'No new troops conjured at half health');
  assert.ok(st.bombardShots(st.hazards.find(h=>h.silence==='hallArchers'))>0,'Archers support his last stand');
}
console.log('Village staging passed: sprint/formation, protected withdrawal, input release, regular Cinder death, Varek retinue and desperation.');
