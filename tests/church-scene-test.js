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
const ids=['hale','mira','tam','barn'],npcs=ids.map(id=>st.story.npc(id));
for(const n of npcs){
 const b=st.story.talkBeat(n);
 assert.equal(b.id,`vigil-${n.id}-before`,'Gate dialogue replaces stale rescue dialogue');
 assert.equal(b.lines.length,1);
 b.fired=true;assert.equal(st.story.talkBeat(n),null,'Never fall back to an old conversation after the current one');
}
st.story.npc('hakon').state='dead';
for(const n of npcs)assert.equal(st.story.talkBeat(n).id,`vigil-${n.id}-after`,'Dialogue responds to the death');
assert(!st.story.procession,'Mourners do not carry the father away before the farewell');
for(const id of ['elder','vow']){st.story.done.add(id);st.story.beats.find(b=>b.id===id).fired=true;}
tick();assert.equal(st.story.procession.phase,'lift');assert(!st.story.done.has('churchFarewell'));
assert.equal(st.story.talkBeat(npcs[0]),null,'The procession cannot be interrupted with stale dialogue');
let old={x:st.story.procession.x,z:st.story.procession.z};
for(let i=0;i<361;i++){
 tick();const pos=st.story.procession;
 assert(Math.hypot(pos.x-old.x,pos.z-old.z)<1,'The body moves smoothly into the doorway');
 old={x:pos.x,z:pos.z};
}
assert.equal(st.story.procession.phase,'inside');assert(st.story.done.has('churchFarewell'));
assert(st.story.npc('hakon').insideChurch);
for(let i=0;i<120;i++)tick();
npcs.forEach(n=>{assert.equal(st.story.npc(n.id),n);assert.equal(n.state,'gone');assert(n.insideChurch);});
assert.equal(STAGE_VILLAGE.exit.after,'churchFarewell');
assert.equal(STAGE_VILLAGE.sections[6].waves.length,0,'The funeral stays free of an ambush');
console.log('Church scene: moment-specific conversations, no repeats, protected farewell, continuous procession, villagers remain inside, exit opens afterward.');
