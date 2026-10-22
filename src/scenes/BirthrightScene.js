import { SETTINGS } from '../config/settings.js';

// Screen-space camera: arena scrolling, bounds and dramatic zoom cannot crop the art.
export class BirthrightScene extends Phaser.Scene {
  constructor(){super('Birthright');}
  create(data){
    this.cameras.main.setOrigin(0,0).setZoom(SETTINGS.renderScale??1);
    this.show(data.kind);
    this.scene.bringToTop('HUD');
  }
  show(kind){
    this.children.removeAll(true);
    const W=SETTINGS.width,H=SETTINGS.height;
    const key=kind==='aftermath'?'hakon-mourned':kind==='raise'?'rurik-oathkeeper-raised':kind==='grief'?'hakon-last-breath':'hakon-farewell';
    this.add.rectangle(0,0,W,H,0x080606,1).setOrigin(0);
    if(!this.textures.exists(key))return;
    // Keep the whole picture above the dialogue instead of covering/cropping it.
    const room={x:20,y:12,w:W-40,h:H-126};
    const src=this.textures.get(key).getSourceImage();
    const scale=Math.min(room.w/src.width,room.h/src.height);
    const img=this.add.image(room.x+room.w/2,room.y+room.h/2,key).setScale(scale).setAlpha(0);
    this.tweens.add({targets:img,alpha:1,duration:650,ease:'Sine.easeOut'});
  }
}
