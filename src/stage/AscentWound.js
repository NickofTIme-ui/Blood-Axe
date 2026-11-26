// A brief committed axe strike, staged on the fixed simulation clock.
export class AscentWound {
 constructor(stage,boss,npc){
  this.stage=stage;this.boss=boss;this.npc=npc;this.age=0;this.swing=0;
  npc.state='confront';npc.moving=false;npc.vx=npc.vz=0;npc.going=0;
  boss.activeAttack=null;boss.move=null;boss.fsm.change('walk');
  stage.world.events.emit('orskWoundStart',{boss,npc});
 }
 update(){
  const {stage:st,boss:b,npc:n}=this;
  if(st.index!==5||n.state==='guide')return false;
  if(!b.alive){if(n.state==='confront')st.story.strike(n);if(st.world.hold?.owner==='orskWound')st.world.release();return false;}
  st.world.holdStill(2);st.world.hold.owner='orskWound';
  for(const p of st.players){p.awe=2;p.vx=p.vz=0;}
  b.awe=2;b.vx=b.vz=0;b.activeAttack=null;
  this.age++;
  if(!this.swing){
   const side=Math.sign(b.x-n.x)||1,target=n.x+side*95,dx=target-b.x,dz=n.z-b.z;
   b.facing=-side;b.x+=Math.sign(dx)*Math.min(Math.abs(dx),6);b.z+=Math.sign(dz)*Math.min(Math.abs(dz),4);
   st.placeOnGround(b);b.fsm.frame++;
   if(Math.abs(dx)<8&&Math.abs(dz)<5){this.swing=1;b.fsm.change('light1');b.facing=-side;}
  }else{
   this.swing++;b.fsm.frame=this.swing;
   if(this.swing===33){st.story.strike(n);st.story.trigger('cut:nicholas');st.world.events.emit('orskWoundHit',{boss:b,npc:n});}
   if(this.swing>=78){
    b.fsm.change('idle');b.awe=0;b.activeAttack=null;
    if(b.orsk){b.orsk.wait=36;b.orsk.committed=false;b.orsk.combo=false;}
    st.world.release();for(const p of st.players)p.awe=0;
    st.world.events.emit('orskWoundEnd',{boss:b,npc:n});return false;
   }
  }
  return true;
 }
}
