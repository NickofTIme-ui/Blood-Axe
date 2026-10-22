import {drawMillHanging} from './MillHangingArt.js';
export class MillRescueView{
  constructor(scene,stage){
    this.scene=scene;this.stage=stage;this.rig=stage.millRescue;
    this.canvas=document.createElement('canvas');this.canvas.width=960;this.canvas.height=600;this.ctx=this.canvas.getContext('2d');
    if(scene.textures.exists('mill-rescue-live'))scene.textures.remove('mill-rescue-live');
    this.tex=scene.textures.addCanvas('mill-rescue-live',this.canvas);
    this.image=scene.add.image(4590.5,20.3,'mill-rescue-live').setOrigin(0).setScale(.55).setDepth(295.9);
    this.images={};for(const [key,id]of Object.entries({gallows:'gallows',body:'irvolino-bound',mechanisms:'mechanisms',executioner:'executioner-actions',lever:'executioner-lever',rescue:'irvolino-rescue'}))this.images[key]=scene.textures.get(`mill-${id}`).getSourceImage();
    this.tick=-1;
  }
  update(){
    const r=this.rig,f=r.executioner;
    if(f?.alive&&(!r.started||r.operating)){const v=this.scene.views.get(f.id);v?.sprite?.setVisible(false);v?.puppet?.root?.setVisible(false);v?.shadow?.setVisible(false);}
    const camera=this.scene.cameras.main.worldView,visible=camera.right>4600&&camera.left<5120;
    this.image.setVisible(visible);if(!visible||this.tick===this.stage.world.frame)return;
    this.tick=this.stage.world.frame;
    const seconds=r.outcome==='lost'?Math.min(r.seconds,18):r.seconds;
    const executionerAlive=!r.started||!!f?.alive&&r.operating;
    const rescueAge=r.outcome==='saved'?Math.min(r.age,84):null;
    const signature=`${seconds}|${executionerAlive}|${rescueAge}`;
    if(signature===this.drawSignature)return;
    this.drawSignature=signature;
    drawMillHanging(this.ctx,this.images,seconds,{transparent:true,executionerAlive,rescueAge,hideCaptive:r.outcome==='saved'&&r.age>=84});
    this.tex.refresh();
  }
}
