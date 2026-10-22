import {createEnemy} from '../entities/Enemy.js';
import {Controller} from '../core/Controller.js';
import {toWorldBox,overlaps} from '../combat/Boxes.js';

export class MillRescue {
  constructor(stage){
    this.stage=stage;this.clock=0;this.age=0;this.outcome=null;this.started=false;
    this.npc=stage.story.npc('barn');this.npc.millCaptive=true;this.npc.state='bound';this.npc.h=70;
    this.replacement=stage.story.npc('elsbeth');this.replacement.state='gone';
  }
  get resolved(){return !!this.outcome;}
  prepare(){
    if(this.executioner||this.resolved)return;
    const f=this.executioner=createEnemy(this.stage.world,this.stage.data.millRescue.type,4990,296);
    this.brain=f.controller;f.controller=new Controller();f.h=f.floor=70;f.millExecutioner=true;f.lurking=3;f.unbounded=true;
  }
  get seconds(){return this.outcome==='lost'?3+this.age/60:Math.min(3,this.clock/60-22);}
  update(){
    const st=this.stage,n=this.npc;
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
      st.world.events.emit('millRescueStart');
    }
    if(this.executioner.alive){
      const f=this.executioner,dx=4990-f.x,dz=296-f.z;
      const atLever=Math.abs(dx)<14&&Math.abs(dz)<14&&Math.abs(f.h-70)<8;
      f.controller.moveX=Math.abs(dx)>8?Math.sign(dx):0;f.controller.moveZ=Math.abs(dz)>8?Math.sign(dz):0;
      if(f.grounded&&f.h<65)f.controller.registerPress('jump');
      this.operating=atLever&&!f.hitstop&&['idle','walk'].includes(f.state);
      if(!this.operating)return;
      this.clock++;n.clock=this.clock;
      if(this.clock===1080){n.helpAge=210;n.helpText='HE’S AT THE LEVER!';}
      if(this.clock>=1500){this.fail();return;}
    }else{
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
    this.npc.helpAge=0;this.stage.world.events.emit('millBondsCut');
  }
  fail(){
    if(this.resolved)return;
    this.outcome='lost';this.age=0;this.stage.story.lose(this.npc);this.npc.helpAge=0;
    this.operating=false;if(this.executioner?.alive)this.executioner.controller=this.brain;
    const n=this.replacement;n.state='safe';this.stage.story.rescued.add(n.id);
    this.stage.world.events.emit('npcRescued',{npc:n});
    this.stage.world.events.emit('millTrapdoor');
  }
  reset(){
    if(this.outcome==='saved')return;
    this.executioner=null;this.started=false;this.outcome=null;this.clock=this.age=0;
    this.npc.state='bound';this.npc.millCaptive=true;this.npc.helpAge=0;
    this.replacement.state='gone';this.stage.story.rescued.delete('elsbeth');
    this.stage.story.lost.delete('barn');
  }
}
