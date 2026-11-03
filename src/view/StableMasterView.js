import { depthScale } from './depths.js';
import { stableMasterFrame } from '../stage/StableMaster.js';

export class StableMasterView {
  constructor(scene,v) {
    this.scene=scene;this.v=v;
    if(scene.textures.exists('stable-master'))this.sprite=scene.add.image(0,0,'stable-master',0).setOrigin(.5,230/240);
    // (the sheet: four alarm poses, then however many run frames it was painted with)
    this.run=Math.max(1,(scene.textures.get('stable-master')?.frameTotal??9)-1-4);
    this.shout=scene.add.text(0,0,'THE STABLES ON FIRE!\nFREE THE HORSES!!',{
      fontFamily:"'Segoe UI', Arial, sans-serif",fontSize:'17px',fontStyle:'bold',color:'#fff0ce',align:'center',lineSpacing:3,
    }).setOrigin(.5,1).setStroke('#190b05',4).setVisible(false);
    scene.events.once('shutdown',()=>{this.sprite?.destroy();this.shout.destroy();});
  }
  draw(n) {
    const show=n.state!=='gone',k=depthScale(n.z);
    const frame=stableMasterFrame(n,this.run);
    this.sprite?.setVisible(show).setFrame(frame).setPosition(n.x,n.z-n.h).setScale(k).setDepth(n.z+.03);
    this.v.shadow.setVisible(show).setPosition(n.x,n.z).setDepth(n.z-.1);
    // (his shout waits for the section's title card to clear: it went up right over it, the
    // two lines on top of each other, Nick's polish pass 2026-11-03; it carries on into his
    // first strides away, so it is still read in full)
    const card=this.scene.scene.get('HUD')?.card,carded=card?.visible&&card.alpha>0.05;
    const shouting=n.state==='alarm'||(n.state==='fleeing'&&n.t<100);
    this.shout.setVisible(show&&shouting&&!carded).setPosition(n.x,n.z-n.h-142*k).setDepth(n.z+3);
  }
}
