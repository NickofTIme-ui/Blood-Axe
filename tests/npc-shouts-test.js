import assert from 'node:assert/strict';
import {Story} from '../src/stage/Story.js';
import {World} from '../src/core/World.js';
import {Controller} from '../src/core/Controller.js';
const world=new World(),hero={alive:true,x:100,z:300,h:0,controller:new Controller()};
const data={id:'test',sections:[],npcs:[{id:'trapped',name:'Villager',x:100,z:300,rescue:'wreckage',tag:'beam'}],story:[]};
const stage={world,data,players:[hero],opts:{},sections:[],props:[],livingFoes:()=>[]};
const story=new Story(stage,data);stage.story=story;
story.updateNpcs([hero]);const npc=story.npc('trapped');
assert.equal(npc.helpAge,180);assert(npc.helpText.includes('HELP'));
assert.equal(story.line,null);assert(!story.holding);
for(let i=0;i<181;i++)story.updateNpcs([hero]);assert.equal(npc.helpAge,0,'Help shout ends and never loops');
const b={id:'optional',lines:[['VILLAGER','Thank you.']],talkedTo:'trapped'};story.fire(b);story.play([hero]);story.current.age=20;
assert.equal(story.line,null);assert.equal(story.fieldLine.npc,npc);
// box rules (Nick, 2026-10-23): a minor villager's line in a held scene floats over him and
// moves on by itself; Irvolino (MILLER) speaks in the box even in passing
{
  const w2=new World(),h2={alive:true,x:100,z:300,h:0,controller:new Controller()};
  const d2={id:'test2',sections:[],npcs:[{id:'hale',name:'Hale the smith',x:120,z:300},{id:'barn',name:'Irvolino',x:140,z:300}],story:[]};
  const st2={world:w2,data:d2,players:[h2],opts:{},sections:[],props:[],livingFoes:()=>[]};
  const s2=new Story(st2,d2);st2.story=s2;
  s2.fire({id:'scene',hold:true,lines:[['HALE','We will carry him.'],['RURIK','Thank you.']]});s2.play([h2]);s2.current.age=1;
  assert.equal(s2.line,null,'a minor villager gets no box, even in a held scene');
  assert.equal(s2.fieldLine.npc,s2.npc('hale'),'his line floats over him');
  for(let i=0;i<1000&&s2.current?.index===0;i++)s2.play([h2]);
  assert.equal(s2.line?.who,'RURIK','his shout-out moves on by itself; the hero keeps the box');
  s2.skipScene?.();s2.current=null;s2.queue=[];
  s2.fire({id:'thanks',lines:[['MILLER','Thank you.']]});s2.play([h2]);s2.current.age=1;
  assert.equal(s2.line?.who,'MILLER','Irvolino always speaks in the box');
  assert.equal(s2.fieldLine,null,'and not as floating text');
}
console.log('Help shouts are automatic, one-shot, unboxed and do not freeze play; invited NPC lines remain in the world.');
