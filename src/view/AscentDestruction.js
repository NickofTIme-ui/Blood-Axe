import {DEPTH} from './depths.js';
import {playSfx} from '../core/Sfx.js';
export class AscentDestruction {
 constructor(scene,stage){this.scene=scene;this.stage=stage;this.craters=[];stage.world.events.on('shellLand',({hazard:h,shell:s})=>{if(h.destructive&&h.look!=='arrows')this.impact(h,s);});}
 impact(h,s){
  const scene=this.scene,y=s.y??0,ground=s.z-y,near=Math.abs(scene.player.x-s.x)<900;
  if(near){playSfx(scene,'kick',{volume:1,pitch:-2100,minGapMs:0});playSfx(scene,'block',{volume:.7,pitch:-1600,minGapMs:0});scene.fx?.shake(12,22);scene.rumble?.(.8,.5,280);}
  const surface=this.stage.terrain?.blocks.find(b=>b.solid&&s.x>=b.x0&&s.x<=b.x1&&s.z>=b.z0&&s.z<=b.z1&&Math.abs(b.top-y)<5);
  const d=surface?surface.z0-.2:DEPTH.decals;
  if(!h.visualOnly&&s.z>=282&&scene.textures.exists('lvl-ascent-crater')){
   const im=scene.add.image(s.x,ground,'lvl-ascent-crater').setDisplaySize(190,82).setDepth(d).setAlpha(.92);
   this.craters.push(im);if(this.craters.length>48)this.craters.shift().destroy();
  }
  const flash=scene.add.image(s.x,ground-10,'glow').setDisplaySize(160,95).setTint(0xffd18a).setAlpha(.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(s.z+1);
  scene.tweens.add({targets:flash,alpha:0,duration:150,onComplete:()=>flash.destroy()});
  for(let i=0;i<9;i++){
   const a=i*2.399,dx=Math.cos(a),dz=Math.sin(a)*.35;
   const puff=scene.add.image(s.x+dx*15,ground-8+dz*10,'glow').setTint(i%2?0x8d887b:0x69685f).setDisplaySize(55,42).setAlpha(.45).setDepth(s.z+2);
   scene.tweens.add({targets:puff,x:s.x+dx*110,y:ground-40+dz*70,displayWidth:130,displayHeight:88,alpha:0,duration:650+i*33,ease:'Cubic.easeOut',onComplete:()=>puff.destroy()});
  }
  const rock=scene.stageView?.siege?.stoneKey();
  for(let i=0;i<24;i++){
   const a=i*2.399,v=150+(i%5)*65;
   scene.gore.spawn({x:s.x,z:s.z,h:y+8,vx:Math.cos(a)*v,vz:Math.sin(a)*v*.3,vh:150+(i%6)*50,tint:i%2?0x92938a:0x696e6d,texture:rock??'px',scale: rock ? 0.08 : 0.9,decal:false,life:45+i%4*10,spin:(i%2?.13:-.16)});
  }
 }
}
