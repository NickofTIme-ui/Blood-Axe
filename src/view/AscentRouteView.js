// Level 4's route dressing follows the collision geometry and each section's role.
import {SETTINGS} from '../config/settings.js';
import {DEPTH} from './depths.js';
import {blendedFloor,roadApron} from './AscentFinish.js';
export class AscentRouteView {
  constructor(scene,stage) {
    this.scene=scene;this.stage=stage;this.retreat=[];
    const top=SETTINGS.world.floorTop-50,h=SETTINGS.height-top+40;
    for(const [x0,x1,name] of [[3000,4500,'refuge_floor'],[6200,9000,'siege_floor']]) {
      const key=`lvl-ascent-tile-${name}`;
      if(scene.textures.exists('lvl-ascent-scene_road')||!scene.textures.exists(key))continue;
      blendedFloor(scene,key,x0-120,x1+120,top,h,180);
    }
    if(!scene.textures.exists('lvl-ascent-scene_road'))roadApron(scene,stage.data.width);
    const back=scene.add.graphics().setDepth(DEPTH.floor-0.7);
    // The opening is a ruined road checkpoint, not another wilderness camp.
    const timber='lvl-ascent-surf-plank';
    if(scene.textures.exists(timber)) {
      for(let x=995;x<1370;x+=32){const ht=42+(x%5)*4;scene.add.tileSprite(x,232-ht,10,ht,timber).setOrigin(0).setTileScale(.12,.12).setTint(0x7b8076).setDepth(DEPTH.floor-.7);}
      scene.add.tileSprite(995,210,378,6,timber).setOrigin(0).setTileScale(.12,.12).setTint(0x8c9286).setDepth(DEPTH.floor-.69).setRotation(-.01);
    }
    // Timber props up the refuge mouth; its protected floor remains clear.
    // The painted overhang supplies its own structural timbers.
    // One constructed stone arch and one continuous deck, anchored into both banks.
    const bridge='lvl-ascent-causeway';
    if(scene.textures.exists(bridge))scene.add.image(4940,225,bridge).setOrigin(0).setDisplaySize(720,440).setDepth(DEPTH.floor+4.3);
    // Small route cairns mark the real road, with rubble outside the combat lane.
    for(const x of[420,1460,3040,4580,6260,9070]){back.fillStyle(0x434b50,1).fillEllipse(x,236,40,12);back.fillStyle(0x727a7d,1).fillEllipse(x+3,227,27,11);back.fillStyle(0x939b98,1).fillEllipse(x,220,16,9);}
    const sheet=scene.registry.get('enemySprites')?.grunt;
    if(sheet)for(let i=0;i<5;i++){
      const img=scene.add.image(9140+i*96,180+i%2*15,'enemy-grunt-walk','f0').setOrigin(sheet.ax/sheet.fw,sheet.ay/sheet.fh).setScale(0.32/sheet.res).setTint(0x77828a).setDepth(DEPTH.floor-0.8).setVisible(false);
      this.retreat.push({img,start:9140+i*96,offset:i*17});
    }
  }
  update() {
    const t=this.stage.world.frame;
    for(const r of this.retreat){const show=this.stage.index===6;r.img.setVisible(show);if(!show)continue;const u=(t+r.offset)%440;r.img.setPosition(r.start+u*0.65,180+r.offset%2*15).setFrame(`f${Math.floor((t+r.offset)/7)%8}`).setAlpha(u>360?(440-u)/80:0.75);}
  }
}
