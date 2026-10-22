import { DEPTH } from './depths.js';
import { importFxStrip } from './stripImporter.js';

// Architecture is behind the playable street. The entry is an open visual portal,
// not a new collider across the route to the north gate.
export class TownChurchView {
  constructor(scene,stage){
    this.scene=scene;this.stage=stage;
    const church=stage.data.church;
    if(scene.textures.exists('town-church')){
      this.building=scene.add.image(church.x,church.z,'town-church').setOrigin(.5,1)
        .setDisplaySize(church.width,church.height).setDepth(DEPTH.floor+.2);
      this.light=scene.add.image(church.door.x,church.z-58,'glow').setTint(0xe6aa60).setAlpha(.13).setScale(2,3).setDepth(DEPTH.floor+.3);
    }
    for(const key of ['church-bearers','church-bearers-elsbeth'])if(!scene.textures.exists(key)&&scene.textures.exists(`${key}-src`)){
      const sheet=importFxStrip(scene.textures.get(`${key}-src`).getSourceImage(),{frames:4,columns:2,rows:2,height:260});
      const texture=scene.textures.addCanvas(key,sheet.canvas);
      for(let i=0;i<4;i++)texture.add(`f${i}`,0,i*sheet.fw,0,sheet.fw,sheet.fh);
    }
    if(scene.textures.exists('church-bearers'))this.bearers=scene.add.image(0,0,'church-bearers','f0').setOrigin(.5,1).setScale(.5).setVisible(false);
  }
  update(){
    if(this.light)this.light.setAlpha(.13+Math.sin(this.scene.time.now*.002)*.015);
    const p=this.stage.story?.procession;
    if(!this.bearers)return;
    const show=p&&p.phase!=='inside';this.bearers.setVisible(!!show);
    if(!show)return;
    const alpha=Math.min(1,p.age/60)*Math.min(1,(1-p.progress)/.3);
    const key=this.stage.story.lost.has('barn')?'church-bearers-elsbeth':'church-bearers';
    this.bearers.setTexture(key,`f${p.phase==='lift'?0:Math.floor((p.age-60)/18)%4}`)
      .setPosition(p.x,p.z).setDepth(p.z+.2).setAlpha(alpha);
  }
}
