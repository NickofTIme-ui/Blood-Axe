import {createEnemy} from '../entities/Enemy.js';
import {Controller} from '../core/Controller.js';
import {toWorldBox,overlaps} from '../combat/Boxes.js';

// The rope's clock, in frames he spends at the lever: his last words, his final warning, the drop
export const MILL={rope:1500,lastWords:1080,final:1260};
// what the hangman shouts (Nick, 2026-10-23: warn the player he's about to kill Irvolino)
const BARKS={
  start:'BY THE KING’S WORD, THIS ONE HANGS!',
  lever:'STAND BACK OR HE DROPS!',
  driven:'GET AWAY FROM MY GALLOWS!',
  lastWords:'ANY LAST WORDS, MILLER?',
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
    this.brain=f.controller;f.controller=new Controller();f.h=f.floor=70;f.millExecutioner=true;f.lurking=3;f.unbounded=true;
  }
  get seconds(){return this.outcome==='lost'?3+this.age/60:Math.min(3,this.clock/60-22);}
  update(){
    const st=this.stage,n=this.npc;
    if(this.bark&&++this.bark.age>=this.bark.life)this.bark=null;
    if(this.outcome){this.age++;if(this.outcome==='saved'&&this.age<84)this.npc.t=0;if(this.outcome==='saved'&&this.age===84)this.npc.millCaptive=false;return;}
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
      const f=this.executioner,dx=4990-f.x,dz=296-f.z;
      const atLever=Math.abs(dx)<14&&Math.abs(dz)<14&&Math.abs(f.h-70)<8;
      f.controller.moveX=Math.abs(dx)>8?Math.sign(dx):0;f.controller.moveZ=Math.abs(dz)>8?Math.sign(dz):0;
      if(f.grounded&&f.h<65)f.controller.registerPress('jump');
      const was=this.operating;
      this.operating=atLever&&!f.hitstop&&['idle','walk'].includes(f.state);
      // knocked off the lever: he swears and heads back to it
      if(was&&!this.operating&&!this.bark&&this.clock<MILL.final)this.say(BARKS.driven);
      if(!this.operating)return;
      this.clock++;n.clock=this.clock;
      if(this.clock===1)this.say(BARKS.lever);
      if(this.clock===MILL.lastWords){n.helpAge=210;n.helpText='HE’S AT THE LEVER!';this.say(BARKS.lastWords);}
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
    this.outcome='saved';this.age=0;this.npc.millCaptive=true;
    this.npc.pose='irvolino';this.stage.story.free(this.npc);
    this.npc.helpAge=0;this.bark=null;this.stage.world.events.emit('millBondsCut');
  }
  fail(){
    if(this.resolved)return;
    this.outcome='lost';this.age=0;this.stage.story.lose(this.npc);this.npc.helpAge=0;this.bark=null;
    this.operating=false;if(this.executioner?.alive)this.executioner.controller=this.brain;
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
