import {drawMillHanging} from './MillHangingArt.js';
import {DEPTH} from './depths.js';
import {FONT} from './fonts.js';
export class MillRescueView{
  constructor(scene,stage){
    this.scene=scene;this.stage=stage;this.rig=stage.millRescue;
    this.canvas=document.createElement('canvas');this.canvas.width=960;this.canvas.height=600;this.ctx=this.canvas.getContext('2d');
    if(scene.textures.exists('mill-rescue-live'))scene.textures.remove('mill-rescue-live');
    this.tex=scene.textures.addCanvas('mill-rescue-live',this.canvas);
    this.image=scene.add.image(4590.5,20.3,'mill-rescue-live').setOrigin(0).setScale(.55).setDepth(295.9);
    this.images={};for(const [key,id]of Object.entries({gallows:'gallows',body:'irvolino-bound',mechanisms:'mechanisms',executioner:'executioner-actions',lever:'executioner-lever'}))this.images[key]=scene.textures.get(`mill-${id}`).getSourceImage();
    this.tick=-1;
    // the hangman's shouts (stage/MillRescue.js say): over his head, angry red, no box
    this.shout=scene.add.text(0,0,'',{fontFamily:FONT.display,fontSize:'17px',color:'#ffb08a',align:'center',wordWrap:{width:240}})
      .setOrigin(.5,1).setStroke('#1a0604',5).setDepth(DEPTH.popups).setVisible(false);
  }
  updateShout(){
    const r=this.rig,b=r.bark,f=r.executioner;
    const on=!!b&&!!f?.alive&&!this.stage.story.holding;
    this.shout.setVisible(on);if(!on)return;
    // (it pops in, shakes a little while he's at the lever, and fades at the end)
    const pop=Math.min(1,b.age/8),fade=Math.min(1,(b.life-b.age)/20),shake=r.operating?Math.sin(b.age*1.3)*1.5:0;
    this.shout.setText(b.text).setPosition(f.x+shake,f.z-f.h-92).setAlpha(fade).setScale(.8+.2*pop);
  }
  update(){
    const r=this.rig,f=r.executioner;
    this.updateShout();
    if(f?.alive&&(!r.started||r.operating)){const v=this.scene.views.get(f.id);v?.sprite?.setVisible(false);v?.puppet?.root?.setVisible(false);v?.shadow?.setVisible(false);}
    const camera=this.scene.cameras.main.worldView,visible=camera.right>4600&&camera.left<5120;
    this.image.setVisible(visible);if(!visible||this.tick===this.stage.world.frame)return;
    this.tick=this.stage.world.frame;
    const seconds=r.outcome==='lost'?Math.min(r.seconds,18):r.seconds;
    const executionerAlive=!r.started||!!f?.alive&&r.operating;
    // cut free, he's drawn as himself (view/NpcView.js); the gallows keep the cut rope, swinging
    const ropeAge=r.outcome==='saved'?Math.min(r.age,240):null;
    const signature=`${seconds}|${executionerAlive}|${ropeAge}`;
    if(signature===this.drawSignature)return;
    this.drawSignature=signature;
    drawMillHanging(this.ctx,this.images,seconds,{transparent:true,executionerAlive,ropeAge,hideCaptive:r.outcome==='saved'});
    this.tex.refresh();
  }
}
