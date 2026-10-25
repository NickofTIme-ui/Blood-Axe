// The enemy's original upper body and a continuous lower-body skin hang from the
// painted blade. Only rendering changes here; the combat timeline stays in Finisher.
import {IMPALE,impalePierce,impaleSlide} from '../combat/Finisher.js';
import {depthScale} from './depths.js';
import {measure,midAt} from './frameMeasure.js';
import {impaleBlade,exposedBlade} from './ImpaleBlade.js';
import {drawLowerSkin} from './ImpaleSkin.js';
import {dyeImage} from './dye.js';

const RAD=Math.PI/180,OVERLAP=5;
let serial=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Spring{
  constructor(){this.a=0;this.v=0;}
  step(target,k,damp){this.v=(this.v+(target-this.a)*k)*damp;this.a+=this.v;return this.a;}
}
export class ImpaledRig{
  constructor(scene,sheet){
    this.scene=scene;this.sheet=sheet;this.id=++serial;this.on=false;
    this.lower=scene.add.image(0,0,'__DEFAULT').setVisible(false);
    this.torso=scene.add.image(0,0,'__DEFAULT').setVisible(false);
    this.tip=scene.add.image(0,0,'__DEFAULT').setVisible(false);
    this.wound=scene.add.image(0,0,'impale-puncture-rim').setVisible(false);
    this.parts=[this.lower,this.torso,this.tip,this.wound];
    this.sT=new Spring();this.sL=new Spring();
  }
  setPose(ref,f){
    this.hangingArt=this.scene.textures.exists(`${this.sheet.key}-impaled`);
    if(this.hangingArt){const m=f.maimed??{};ref=`impaled:${m.armB&&m.armF?3:m.armB?1:m.armF?2:0}`;}
    if(ref===this.ref)return;
    this.ref=ref;const sh=this.sheet,[strip,i]=ref.split(':'),key=`${sh.key}-${strip}`,name=`f${i}`;
    const m=measure(this.scene,key,name),fr=this.scene.textures.getFrame(key,name);
    const H=Math.max(40,sh.ay-m.top),hip=H*.46,pierce=this.hangingArt?H*.68:Math.min(impalePierce(f)*sh.res,H*.71);
    const yHip=sh.ay-hip,yPierce=sh.ay-pierce,xHip=midAt(m,yHip,sh.ax),xPierce=midAt(m,yPierce,sh.ax);
    this.J={H,hip,pierce,xHip,yHip,xPierce,yPierce,knee:hip*.5};
    this.source=document.createElement('canvas');this.source.width=fr.cutWidth;this.source.height=fr.cutHeight;
    this.source.getContext('2d').drawImage(fr.source.image,fr.cutX,fr.cutY,fr.cutWidth,fr.cutHeight,0,0,fr.cutWidth,fr.cutHeight);
    this.releaseTextures();
    this.torsoKey=`impale-body-${this.id}`;this.lowerKey=`impale-lower-${this.id}`;
    this.bodyTex=this.scene.textures.createCanvas(this.torsoKey,fr.cutWidth,fr.cutHeight);
    this.pad=Math.ceil(H*.7);
    this.lowerTex=this.scene.textures.createCanvas(this.lowerKey,fr.cutWidth+this.pad*2,fr.cutHeight+this.pad*2);
    this.torso.setTexture(this.torsoKey).setOrigin(xPierce/fr.cutWidth,yPierce/fr.cutHeight);
    this.lower.setTexture(this.lowerKey).setOrigin((xHip+this.pad)/this.lowerTex.width,(yHip+this.pad)/this.lowerTex.height);
    this.lastSkinTick=null;
  }
  draw(f,by,ref,face){
    this.setPose(ref,f);
    // his clothes keep their dye on the blade (view/dye.js)
    if(this.torso.dye!==f.dye)for(const p of [this.torso,this.lower])dyeImage(this.scene,p,f.dye);
    const J=this.J,k=depthScale(f.z)/this.sheet.res*(f.stats.size??1),tick=f.world?.frame??0,fr=by.fsm.frame;
    const blade=impaleBlade(this.scene,by,Math.round(impaleSlide(fr)*50)/50);
    const pin=blade?.pin??this.pin??{x:f.x,y:f.z-f.h-J.pierce*k};
    const first=!this.on;
    if(first){this.on=true;this.tick=tick;this.sT.a=this.hangingArt?-7:5;this.sT.v=3;this.sL.a=0;this.sL.v=0;this.previousPin={...pin};}
    const steps=first?1:clamp(tick-this.tick,0,5);this.tick=tick;
    const lift=clamp((fr-IMPALE.liftFrom)/(IMPALE.raised-IMPALE.liftFrom),0,1);
    // Bounded inertia: a new painted sword pose can move the pin a long way in one tick.
    // That must not turn into an unbounded impulse or make a knee circle the screen.
    const kick=clamp((pin.x-this.previousPin.x)*by.facing,-8,8);
    if(steps)this.sL.v+=kick*.08;
    for(let i=0;i<steps;i++){
      this.sT.step(this.hangingArt?(fr<IMPALE.stab+4?-6:4+lift*8):(fr<IMPALE.stab+4?20:12+lift*48),.16,.72);
      // hanging there: his legs thrash for a moment, then go slack and just swing
      const up=Math.max(0,fr-IMPALE.liftFrom),thrash=Math.max(0,1-up/30);
      this.sL.step(lift*(-6+Math.sin(up*.55)*14*thrash+Math.sin(up*.09)*3),.09,.8);
    }
    this.previousPin={...pin};this.pin={...pin};
    const angle=this.sT.a*RAD*by.facing,c=Math.cos(angle),s=Math.sin(angle);
    const hx=(J.xHip-J.xPierce)*k*face,hy=(J.yHip-J.yPierce)*k;
    const hip={x:pin.x+hx*c-hy*s,y:pin.y+hx*s+hy*c};
    const bladeAngle=blade?.angle??this.bladeAngle??0;this.bladeAngle=bladeAngle;
    if(this.lastSkinTick!==tick||first){
      const ctx=this.bodyTex.context;ctx.clearRect(0,0,this.source.width,this.source.height);
      // Keep shoulders, arms and head as one continuous silhouette. A horizontal neck
      // crop used to cut through raised arms as well as the neck.
      ctx.drawImage(this.source,0,0,this.source.width,J.yHip+OVERLAP,0,0,this.source.width,J.yHip+OVERLAP);
      ctx.save();ctx.globalCompositeOperation='destination-out';ctx.translate(J.xPierce,J.yPierce);
      ctx.rotate((bladeAngle-angle)*face);ctx.beginPath();ctx.ellipse(0,0,J.H*.047,J.H*.018,0,0,Math.PI*2);ctx.fill();ctx.restore();this.bodyTex.refresh();
      const legAngle=this.sL.a*RAD*by.facing*face,bend=lift*.17*by.facing*face;
      drawLowerSkin(this.lowerTex.context,this.source,{x:J.xHip,y:J.yHip},-OVERLAP,this.source.height-J.yHip,J.knee,legAngle,bend,this.pad,this.hangingArt?0:lift*.18,-angle*face);
      this.lowerTex.refresh();this.lastSkinTick=tick;
    }
    const depth=f.z+.3;
    this.lower.setVisible(true).setPosition(hip.x,hip.y).setScale(k*face,k).setDepth(depth);
    this.torso.setVisible(true).setPosition(pin.x,pin.y).setScale(k*face,k).setRotation(angle).setDepth(depth+.01);
    if(blade){
      const hero=blade.sprite;
      this.tip.setTexture(exposedBlade(this.scene,blade)).setVisible(true).setPosition(hero.x,hero.y)
        .setOrigin(hero.originX,hero.originY).setScale(hero.scaleX,hero.scaleY).setRotation(hero.rotation).setDepth(depth+.02);
    }else this.tip.setVisible(false);
    this.wound.setVisible(true).setPosition(pin.x,pin.y).setDisplaySize(J.H*k*.25,J.H*k*.083)
      .setRotation(bladeAngle).setDepth(depth+.03);
    this.releaseOffset={x:pin.x-f.x,y:pin.y-(f.z-f.h-J.pierce*k)};
    return{px:pin.x,py:pin.y};
  }
  tint(fill){for(const p of [this.lower,this.torso]){if(fill)p.setTintFill(0xffffff);else p.clearTint();}}
  hide(){if(!this.on)return;this.on=false;this.pin=null;for(const p of this.parts)p.setVisible(false);}
  releaseTextures(){for(const key of [this.torsoKey,this.lowerKey])if(key)this.scene.textures.remove(key);}
  destroy(){for(const p of this.parts)p.destroy();this.releaseTextures();}
}
