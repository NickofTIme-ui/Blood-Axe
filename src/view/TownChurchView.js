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
      // the village burns round it: soot-dark low down, the fire's red on its upper walls and
      // smoke drifting across it (it stood clean and daylit; Nick's second level 1 review)
      this.building.setTint(0x96685e,0x96685e,0x5a4e58,0x5a4e58);
      this.smoke=[0,1,2,3].map(i=>{
        const m=scene.add.image(church.x-260+i*170,church.z-church.height*(.55+.12*(i%2)),'glow').setTint(0x1a1418)
          .setScale(5.5,2.4).setAlpha(.5).setDepth(DEPTH.floor+.25);
        scene.tweens.add({targets:m,x:m.x+90,alpha:{from:.5,to:.3},duration:7000+i*1300,yoyo:true,repeat:-1,ease:'Sine.inOut'});
        return m;
      });
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
