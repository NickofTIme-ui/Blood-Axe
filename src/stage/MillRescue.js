import {createEnemy} from '../entities/Enemy.js';
import {Controller} from '../core/Controller.js';
import {toWorldBox,overlaps} from '../combat/Boxes.js';

// The rope's clock, in frames he spends at the lever: his last words, his final warning, the drop
export const MILL={rope:1500,lastWords:1080,final:1260};
// Cut free (Nick, 2026-10-24: from the cut until he's gone it has to look right), he is
// drawn as himself from the first frame (view/NpcView.js, his 'irvolino-freed' sheet): the
// ropes fall, he tears the noose off, drops to a knee, thanks Rurik, gets up. Then he turns
// for the trees, crouches, jumps off the front of the block, lands hard and sprints away.
// FREED: [pose, frames] in his freed sheet (data/levelArt.js); LEAP: frames, and px.
export const FREED=[['bound',6],['shed',12],['noose',16],['kneel',14],['thanks',18],['rise',10],['stand',10]];
export const LEAP={up:FREED.reduce((a,[,f])=>a+f,0),crouch:9,air:30,land:10,dx:-48,to:392,peak:70,tilt:9,sprint:72};
// Where he works the drop, and how he fights for it (Nick, 2026-10-24: he hopped about the
// yard and never fought). A hero who comes at him, or hurts him, gets the cleaver: the
// butcher's own brain (entities/Enemy.js) takes him. With nobody on him he goes back up to
// the lever, onto the mill floor in one readable hop (a crouch, then the jump) from the yard
// in front of it. `engage`: a hero this close starts the fight; `chase`: he keeps after a
// hero inside this; `leash`: this far from the lever he only fights a man right on him;
// `calm`: frames with nobody near before he turns back (a moment's look round); `hurt`: struck, he fights this long.
export const LEVER={x:4990,z:296,h:70};
export const HANGMAN={engage:{x:170,z:130},chase:{x:340,z:200},leash:420,calm:40,hurt:150,
  floor:{x0:4730,x1:5060},launchZ:380,crouch:8};
// what the hangman shouts (Nick, 2026-10-23: warn the player he's about to kill Irvolino)
const BARKS={
  start:'BY THE KING’S WORD, THIS ONE HANGS!',
  lever:'STAND BACK OR HE DROPS!',
  driven:'GET AWAY FROM MY GALLOWS!',
  lastWords:'ANY LAST WORDS, IRVOLINO?',
  final:'SAY GOODBYE!',
};

export class MillRescue {
  constructor(stage){
    this.stage=stage;this.clock=0;this.age=0;this.outcome=null;this.started=false;
    this.npc=stage.story.npc('barn');this.npc.millCaptive=true;this.npc.state='bound';this.npc.h=70;
    this.replacement=stage.story.npc('elsbeth');this.replacement.state='gone';
  }
  get resolved(){return !!this.outcome;}
  // the rope's time left in seconds, while he works the lever (the HUD's warning counts it down)
  get timeLeft(){return Math.max(0,(MILL.rope-this.clock)/60);}
  // A shout over the hangman's head (view/MillRescueView.js): the player is told, in his own
  // words, that the man hangs unless someone stops him. No dialogue box: the fight goes on.
  say(text,life=150){this.bark={text,age:0,life};}
  prepare(){
    if(this.executioner||this.resolved)return;
    const f=this.executioner=createEnemy(this.stage.world,this.stage.data.millRescue.type,4990,296);
    this.brain=f.controller;this.legs=f.controller=new Controller();f.h=f.floor=70;f.millExecutioner=true;f.lurking=3;f.unbounded=true;
    this.fighting=false;this.calm=0;this.hurtAt=-Infinity;this.prep=0;this.tick=0;this.lastHealth=f.health;
  }
  // the hero nearest him (both machines of an online game pick the same one)
  foe(f){
    let best=null,d=Infinity;
    for(const p of this.stage.world.livingPlayers()){const k=Math.abs(p.x-f.x)+Math.abs(p.z-f.z);if(k<d){d=k;best=p;}}
    return best;
  }
  wantsFight(f,foe){
    if(!foe)return false;
    const near=(r)=>Math.abs(foe.x-f.x)<r.x&&Math.abs(foe.z-f.z)<r.z;
    if(near(HANGMAN.engage)){this.calm=0;return true;}
    if(Math.abs(f.x-LEVER.x)>HANGMAN.leash||!near(HANGMAN.chase))return this.fighting&&++this.calm<HANGMAN.calm;
    // struck (a hero's swing, a shot from range: not a stray arrow with nobody near), or
    // already at it: he keeps after his man
    if(this.fighting||this.tick-this.hurtAt<HANGMAN.hurt){this.calm=0;return true;}
    return false;
  }
  // Up onto the mill floor from the yard, at x: walk to the foot of it, crouch, jump
  climb(f,x){
    const c=this.legs;
    if(this.prep>0){
      c.moveX=c.moveZ=0;f.jumpPrep=this.prep;
      if(--this.prep===0){f.jumpPrep=0;c.moveZ=-1;c.registerPress('jump');f.airKind='jump';}
      return;
    }
    if(!f.grounded){if(f.airKind==='jump')c.moveZ=-1;return;}
    const lx=Math.max(HANGMAN.floor.x0,Math.min(HANGMAN.floor.x1,x)),dx=lx-f.x,dz=HANGMAN.launchZ-f.z;
    c.moveX=Math.abs(dx)>8?Math.sign(dx):0;c.moveZ=Math.abs(dz)>8?Math.sign(dz):0;
    if(!c.moveX&&!c.moveZ&&['idle','walk'].includes(f.state)){this.prep=HANGMAN.crouch;f.prepKind='jump';f.jumpPrep=this.prep;}
  }
  // Each frame: fight, or get back to the lever (and say whether he's working it)
  drive(f){
    this.tick++;
    if(f.health<this.lastHealth)this.hurtAt=this.tick;
    this.lastHealth=f.health;
    const foe=this.foe(f);
    this.fighting=this.wantsFight(f,foe);
    const up=f.floor>=LEVER.h-10;
    // his man is up on the mill floor and he's below: he climbs after him
    const mode=this.fighting?(!up&&foe.floor>=LEVER.h-10?'climb':'fight'):(up?'lever':'climb');
    if(mode==='fight'){
      if(f.controller!==this.brain){f.controller=this.brain;this.prep=0;f.jumpPrep=0;}
      return false;
    }
    if(f.controller!==this.legs){f.controller=this.legs;this.legs.moveX=this.legs.moveZ=0;}
    if(mode==='climb'){this.climb(f,this.fighting?foe.x:LEVER.x);return false;}
    const c=this.legs,dx=LEVER.x-f.x,dz=LEVER.z-f.z;
    c.moveX=Math.abs(dx)>8?Math.sign(dx):0;c.moveZ=Math.abs(dz)>8?Math.sign(dz):0;
    if(c.moveX||c.moveZ)return false;
    return Math.abs(dx)<14&&Math.abs(dz)<14&&Math.abs(f.h-LEVER.h)<8&&!f.hitstop&&['idle','walk'].includes(f.state);
  }
  get seconds(){return this.outcome==='lost'?3+this.age/60:Math.min(3,this.clock/60-22);}
  update(){
    const st=this.stage,n=this.npc;
    if(this.bark&&++this.bark.age>=this.bark.life)this.bark=null;
    if(this.outcome){this.age++;if(this.leap)this.jumpDown();return;}
    if(st.index>3){
      if(st.story.isRescued('barn')){this.outcome='saved';n.millCaptive=false;}
      else if(st.story.lost.has('barn'))this.fail();
      return;
    }
    if(st.section?.id!=='mill'||!st.fightOn||st.story.holding||st.world.hold)return;
    if(!this.started){
      this.started=true;
      this.prepare();this.executioner.lurking=null;this.executioner.unbounded=false;
      n.helpAge=240;n.helpText='RURIK! THE ROPE—HURRY!';
      this.say(BARKS.start,200);
      st.world.events.emit('millRescueStart');
      st.world.events.emit('millWarning',{text:'STOP THE EXECUTIONER!'});
    }
    if(this.executioner.alive){
      const f=this.executioner;
      const was=this.operating;
      this.operating=this.drive(f);
      // knocked off the lever: he swears and heads back to it
      if(was&&!this.operating&&!this.bark&&this.clock<MILL.final)this.say(BARKS.driven);
      if(!this.operating)return;
      this.clock++;n.clock=this.clock;
      if(this.clock===1)this.say(BARKS.lever);
      if(this.clock===MILL.lastWords){n.helpAge=210;n.helpText='HE’S AT THE LEVER!';this.say(BARKS.lastWords);}
      if(this.clock===MILL.lastWords+75)st.story.trigger('millLastWords'); // Irvolino answers him (data/stageVillage.js)
      if(this.clock===MILL.final){this.say(BARKS.final,MILL.rope-MILL.final);st.world.events.emit('millWarning',{text:'HE’S PULLING THE LEVER!',final:true});}
      if(this.clock>=MILL.rope){this.fail();return;}
    }else{
      this.bark=null; // (a dead man's last threat doesn't hang over his body)
      n.helpAge=2;n.helpText='CUT THE BONDS!';
      const rope={left:n.x-26,right:n.x+26,bottom:70,top:195,z:n.z};
      for(const p of st.players){
        const a=p.activeAttack;if(!p.alive||!a||a.move.fx==='kick'||a.move.fx==='rkick')continue;
        if(overlaps(toWorldBox(p,a.hitbox??a.move.hitbox),rope,48)){this.save();break;}
      }
    }
  }
  save(){
    if(this.resolved)return;
    const n=this.npc;
    this.outcome='saved';this.age=0;n.millCaptive=false;
    n.pose='irvolino';this.stage.story.free(n);
    n.helpAge=0;this.bark=null;this.stage.world.events.emit('millBondsCut');
    this.leap={x:n.x,z:n.z,h:n.h};n.dir=1;n.actArt='irvolino-freed';n.act='bound';
  }
  // He holds his spot (the story's 'free' clock waits) through all of it, then runs at once
  jumpDown(){
    const n=this.npc,L=this.leap,T=this.stage.terrain,t=this.age;
    n.t=0;n.shadowH=null;n.tilt=0;n.squash=0;
    if(t<LEAP.up){
      // getting free, facing the way he hung (the painted strip's way)
      let at=0;for(const [pose,f] of FREED){if(t<at+f){n.act=pose;break;}at+=f;}
      return;
    }
    // turned for the trees: down into a crouch for the jump
    n.dir=-1;n.actArt='irvolino-freed';
    const ground=T?Math.max(0,T.groundAt(L.x+LEAP.dx,LEAP.to)):0;
    const c=t-LEAP.up;
    if(c<LEAP.crouch){n.act='rise';n.squash=.06*Math.sin(Math.PI*c/LEAP.crouch);return;}
    const a=c-LEAP.crouch;
    if(a===0)this.stage.world.events.emit('millLeap');
    if(a<LEAP.air){
      // a hop up and out, leaning back on the way up and into the fall on the way down
      const u=a/LEAP.air,e=u*(2-u)*.35+u*.65;
      n.x=L.x+LEAP.dx*e;n.z=L.z+(LEAP.to-L.z)*u;
      n.h=L.h+(ground-L.h)*u+LEAP.peak*4*u*(1-u);
      n.actArt=null;n.act='leap';n.tilt=LEAP.tilt*(2*u-1);
      n.shadowH=T?Math.max(0,T.groundAt(n.x,n.z)):0;
      return;
    }
    n.x=L.x+LEAP.dx;n.z=LEAP.to;n.h=ground;
    if(a===LEAP.air)this.stage.world.events.emit('millLanded');
    const d=a-LEAP.air;
    if(d<LEAP.land){n.act='rise';n.squash=.12*(1-d/LEAP.land);return;}
    // up and away: no standing about after a landing like that
    n.act=null;n.actArt=null;this.leap=null;n.sprint=LEAP.sprint;n.t=0;
  }
  fail(){
    if(this.resolved)return;
    this.outcome='lost';this.age=0;this.stage.story.lose(this.npc);this.npc.helpAge=0;this.bark=null;
    this.operating=false;this.fighting=false;if(this.executioner?.alive)this.executioner.controller=this.brain;
    const n=this.replacement;n.state='safe';this.stage.story.rescued.add(n.id);
    this.stage.world.events.emit('npcRescued',{npc:n});
    this.stage.world.events.emit('millTrapdoor');
  }
  reset(){
    if(this.outcome==='saved')return;
    this.executioner=null;this.started=false;this.outcome=null;this.clock=this.age=0;this.bark=null;this.operating=false;
    this.npc.state='bound';this.npc.millCaptive=true;this.npc.helpAge=0;
    this.replacement.state='gone';this.stage.story.rescued.delete('elsbeth');
    this.stage.story.lost.delete('barn');
  }
}
