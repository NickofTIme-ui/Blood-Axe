import assert from 'node:assert/strict';
import {World} from '../src/core/World.js';
import {Controller} from '../src/core/Controller.js';
import {Fighter} from '../src/entities/Fighter.js';
import {CHARACTERS} from '../src/data/characters.js';
import {Stage} from '../src/stage/Stage.js';
import {STAGE_VILLAGE} from '../src/data/stageVillage.js';
const w=new World(),p=w.addFighter(new Fighter({stats:CHARACTERS.warrior,team:'player',x:8700,z:430,controller:new Controller()}));
const st=new Stage(w,STAGE_VILLAGE,{rescued:['mira','tam','barn']});st.start(p,{section:6});p.x=8700;
const tick=()=>{w.tick();st.update();};tick();
const mourners=['mira','tam','barn','hale'].map(id=>st.story.npc(id));
for(let i=0;i<120;i++)tick();
st.story.npc('hakon').state='dead';
for(let i=0;i<600;i++){
 const before=mourners.map(n=>({x:n.x,z:n.z}));tick();
 mourners.forEach((n,j)=>{
  assert.equal(st.story.npc(n.id),n,'The same villager object persists');
  assert(Math.hypot(n.x-before[j].x,n.z-before[j].z)<=1.1,'Villagers walk into the huddle rather than teleport');
  assert.equal(n.state,'gathered','Mourners do not disappear');
 });
}
assert(mourners.every(n=>n.mourning),'Survivors stay in mourning around Hakon');
const farewell=st.story.beats.find(b=>b.id==='elder');
assert.equal(farewell.npcTalkFor,'hakon','Talk invitation belongs to Hakon, not a reacting villager');
assert(farewell.lines.some(l=>l[0]==='MIRA')&&farewell.lines.some(l=>l[0]==='MILLER'),'Mira and Irvolino react');
assert(farewell.lines.findIndex(l=>l[2]?.flag==='oathkeeper')<farewell.lines.findIndex(l=>l[2]?.moment==='fatherDies'));
assert(farewell.lines.some(l=>l[2]?.moment==='fatherRest'&&l[2].minFrames>=300),'Dead-father art holds after the sword reveal');
console.log('Farewell continuity: same survivors walk into a persistent mourning huddle; Hakon invitation, reactions and aftermath hold.');
