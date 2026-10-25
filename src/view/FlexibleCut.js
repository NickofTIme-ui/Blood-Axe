import { FleshChain } from '../effects/FleshChain.js';
import { measureCanvas } from './frameMeasure.js';
import { dyeImage } from './dye.js';
import { landThud } from '../core/Sfx.js';

// How far along a band (0 at its first joint, 1 at its second) a point of its outline
// lies, measured along the band itself: a band lying across the frame (a kneeling man's
// shins) is weighted by its length, not by the frame's up and down.
const along=(q,a,b,sx,sy)=>{
  const lx=(b.x-a.x)*sx,ly=(b.y-a.y)*sy,len=lx*lx+ly*ly||1;
  return Math.max(0,Math.min(1,((q.x-a.x)*sx*lx+(q.y-a.y)*sy*ly)/len));
};

// Small overlapping bands of the EXACT cut texture, articulated only at retained
// anatomical joints. They begin on the original pixels, not a different death pose.
export class FlexibleCut {
  static create(scene,piece,sprite,sheet,body,lying){
    if(!piece.tex||!scene.textures.get?.(piece.tex)?.getSourceImage)return null;
    try{return new FlexibleCut(scene,piece,sprite,sheet,body,lying);}catch{return null;}
  }
  constructor(scene,piece,sprite,sheet,body,lying){
    this.piece=piece;this.scene=scene;this.sheet=sheet;this.lying=lying;
    const canvas=scene.textures.get(piece.tex).getSourceImage(),m=measureCanvas(canvas);
    if(!m.rows||m.y0==null)throw Error('No cut pixels');
    const lo=lying?m.x0:m.y0,hi=lying?m.x1:m.y1;
    const fullLo=lying?body.x0:body.y0,fullHi=lying?body.x1:sheet.ay;
    const joints=[lo,...[.2,.52,.76].map(t=>fullLo+(fullHi-fullLo)*t).filter(v=>v>lo+8&&v<hi-8),hi];
    if(joints.length<3)throw Error('Small rigid fragment');
    const cross=v=>{
      const samples=[];
      for(let j=-3;j<=3;j++){
        const span=lying?m.spans[Math.round(v)+j]:m.rows[Math.round(v)+j];
        if(span)samples.push((span[0]+span[1])/2);
      }
      return samples.length?samples.reduce((a,b)=>a+b)/samples.length:lying?(m.y0+m.y1)/2:(m.x0+m.x1)/2;
    };
    this.source=joints.map(v=>lying?{x:v,y:cross(v)}:{x:cross(v),y:v});
    const toWorld=q=>{const x=(q.x-sheet.ax)*sprite.scaleX,y=(q.y-sheet.ay)*sprite.scaleY,c=Math.cos(sprite.rotation),s=Math.sin(sprite.rotation);return{x:sprite.x+x*c-y*s,y:sprite.y+x*s+y*c};};
    this.chain=new FleshChain(this.source.map(toWorld));
    this.sx=sprite.scaleX;this.sy=sprite.scaleY;this.pivot={x:piece.img.originX*sheet.fw,y:piece.img.originY*sheet.fh};
    this.radius=Math.max(3,Math.min(11,(lying?m.y1-m.y0:m.x1-m.x0)*Math.abs(sprite.scaleY)*.22));
    this.radii=this.source.map(q=>{
      const span=lying?m.spans[Math.round(q.x)]:m.rows[Math.round(q.y)];
      return span?Math.max(2,Math.min(12,(span[1]-span[0])*Math.abs(sprite.scaleY)*.35)):this.radius;
    });
    this.bands=this.source.slice(1).map((b,i)=>{
      const a=this.source[i],start=Math.floor(joints[i]),end=Math.ceil(joints[i+1]);
      const img=scene.add.image(0,0,piece.tex).setOrigin(a.x/sheet.fw,a.y/sheet.fh).setScale(this.sx,this.sy).setDepth(piece.z+.2);
      if(lying)img.setCrop(start,0,end-start+1,sheet.fh);else img.setCrop(0,start,sheet.fw,end-start+1);
      if(piece.img.tintTopLeft!=null)img.setTint(piece.img.tintTopLeft);
      dyeImage(scene,img,piece.img.dye); // (his clothes keep their colour as he folds)
      const outline=[];
      for(let v=start;v<=end;v+=Math.max(1,Math.floor((end-start)/12))){
        const span=lying?m.spans[v]:m.rows[v];
        if(span)for(const edge of span)outline.push(lying?{x:v,y:edge}:{x:edge,y:v});
      }
      return{img,outline,rest:Math.atan2((b.y-a.y)*this.sy,(b.x-a.x)*this.sx)};
    });
    this.chain.contacts=(points,pass)=>this.contact(points,pass);
    this.chain.skid=true;this.chain.bounce=this.bands.length>2?.24:.3; // (a big piece lands heavier)
    piece.img.setVisible(false);this.draw();
  }
  launch(vx,vh,spin){this.chain.launch(vx,-vh,spin);}
  contact(points,pass){
    let hit=false;
    this.bands.forEach((band,i)=>{
      const a=points[i],b=points[i+1],source=this.source[i],end=this.source[i+1];
      const rot=Math.atan2(b.y-a.y,b.x-a.x)-band.rest,c=Math.cos(rot),s=Math.sin(rot);
      let penetration=0,weight=.5;
      for(const q of band.outline){
        const x=(q.x-source.x)*this.sx,y=(q.y-source.y)*this.sy;
        const wx=a.x+x*c-y*s,wy=a.y+x*s+y*c;
        const floor=this.piece.z-Math.max(0,this.scene.world?.terrain?.groundAt(wx,this.piece.z)??0);
        if(wy-floor>penetration){penetration=wy-floor;weight=along(q,source,end,this.sx,this.sy);}
      }
      if(penetration>.01){
        hit=true;const wa=1-weight,wb=weight,amount=penetration/(wa*wa+wb*wb);
        const va=a.y-a.py,vb=b.y-b.py;
        a.y-=amount*wa;b.y-=amount*wb;
        // it strikes, rebounds off a hard landing (the end that hit hardest the most:
        // that is what tips it over), and skids on, the floor dragging at it
        if(pass===0)[[a,va],[b,vb]].forEach(([p,v])=>{
          const e=this.chain.rebound(Math.max(0,v));
          this.impact=Math.max(this.impact??0,v*60);
          if(e>0)this.chain.bounced=true;
          p.py=p.y+Math.max(0,v)*e;p.px=p.x-(p.x-p.px)*(v*60>200?.8:.9);
        });
      }
    });
    return hit;
  }
  point(q){
    const axis=this.lying?'x':'y',v=q[axis];let index=0;
    while(index<this.source.length-2&&v>this.source[index+1][axis])index++;
    const a=this.source[index],b=this.source[index+1],pa=this.chain.points[index],pb=this.chain.points[index+1];
    const rest=Math.atan2((b.y-a.y)*this.sy,(b.x-a.x)*this.sx),rot=Math.atan2(pb.y-pa.y,pb.x-pa.x)-rest;
    const x=(q.x-a.x)*this.sx,y=(q.y-a.y)*this.sy,c=Math.cos(rot),s=Math.sin(rot);
    return{x:pa.x+x*c-y*s,y:pa.y+x*s+y*c};
  }
  worldPoint(x,y){return this.point({x:this.pivot.x+x/this.sx,y:this.pivot.y+y/this.sy});}
  step(){
    const p=this.piece,scene=this.scene;
    this.impact=0;
    const impact=Math.max(this.chain.step(x=>p.z-Math.max(0,scene.world?.terrain?.groundAt(x,p.z)??0),scene.world?.bounds,this.radii)??0,this.impact);
    const gore=scene.gore;
    if(impact>130&&!this.thudded){this.thudded=true;gore?.splat(p.x,p.z,1.6);landThud(scene,false);}
    else if(impact>320&&this.thudded){gore?.splat(p.x,p.z,1);landThud(scene,true);} // (a second, lighter knock as it comes down again)
    const center=this.chain.points[Math.floor(this.chain.points.length/2)],old=p.x;
    p.x=center.x;p.h=p.z-center.y;p.vx=(p.x-old)*60;p.vh=0;
    // a short smear where it skids along the floor
    if(this.chain.down>0&&!this.chain.asleep&&Math.abs(p.vx)>45&&this.chain.age%4===0&&gore?.level>0)gore.splat(p.x,p.z+(Math.random()-.5)*2,.6+Math.random()*.4,.55);
    const a=this.chain.points[0],b=this.chain.points[1],sa=this.source[0],sb=this.source[1];
    p.rot=Math.atan2(b.y-a.y,b.x-a.x)-Math.atan2((sb.y-sa.y)*this.sy,(sb.x-sa.x)*this.sx);
    this.draw();
  }
  draw(){
    this.bands.forEach((band,i)=>{
      const a=this.chain.points[i],b=this.chain.points[i+1];
      band.img.setPosition(a.x,a.y).setRotation(Math.atan2(b.y-a.y,b.x-a.x)-band.rest).setDepth(this.piece.z+.2).setAlpha(this.piece.cont.alpha);
    });
  }
  destroy(){for(const b of this.bands)b.img.destroy();}
}
