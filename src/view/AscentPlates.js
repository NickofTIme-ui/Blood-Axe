// Whole painted scenes share the same camera projection and fade into one road material.
import {DEPTH} from './depths.js';
import {featheredKey} from './levelArt.js';
export class AscentPlates {
 constructor(scene){
  this.scene=scene;this.names=new Set();
  const regions=[['road',-180,3140,-80],['refuge',2940,4580,-80],['battery',6200,7680,-150],['camp',7560,9100,-80]];
  for(const [name,a,b,y]of regions){const key='lvl-ascent-scene_'+name;if(!scene.textures.exists(key))continue;
   const soft=featheredKey(scene,key,{left:.12,right:.12,top:.09,bottom:name==='battery'?0:.14});
   const source=scene.textures.get(key).getSourceImage();
   // One source pixel per render pixel at the game's 2x camera: no anisotropic stretch.
   const scale=.5,w=source.width*scale,h=source.height*scale,bottom=y+530;
   const count=name==='road'?Math.ceil((b-a)/ (w*.8)):1;
   for(let i=0;i<count;i++){
    const x=count===1?(a+b-w)/2:a+i*((b-a-w)/(count-1));
    scene.add.image(x,bottom-h,soft).setOrigin(0).setScale(scale).setDepth(DEPTH.floor+.05);
   }
   this.names.add(name);
  }
  // Local warm spill at the painted camp fires, kept behind the combat silhouettes.
  if(this.has('camp'))for(const [x,y]of[[7730,190],[8040,190],[8940,190]]){
   const glow=scene.add.image(x,y,'glow').setDisplaySize(190,135).setTint(0xd4864b).setAlpha(.11).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor+.06);
   scene.tweens.add({targets:glow,alpha:.17,duration:780+x%300,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  }
 }
 has(name){return this.names.has(name);}
}
