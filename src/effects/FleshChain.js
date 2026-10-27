// Fixed-step presentation physics for a severed piece's remaining joints.
// No springs across the cut: the two pieces are completely independent.
import { longAxis, tiltOf, FLAT_TILT } from './Physics.js';

export class FleshChain {
  constructor(points){
    this.points=points.map(p=>({...p,px:p.x,py:p.y}));
    this.lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
    this.asleep=false;this.quiet=0;this.age=0;
  }
  launch(vx,vy,spin=0){
    const pts=this.points,cx=pts.reduce((s,p)=>s+p.x,0)/pts.length,cy=pts.reduce((s,p)=>s+p.y,0)/pts.length;
    const w=Math.max(-3,Math.min(3,spin));
    for(const p of pts){p.px=p.x-(vx-(p.y-cy)*w)/60;p.py=p.y-(vy+(p.x-cx)*w)/60;}
    this.asleep=false;this.quiet=0;this.age=0;
  }
  // How much of a fall a point keeps as it strikes the floor (vy px/frame): flails and
  // chains a little; a severed piece (skid set) bounces off a hard landing, lower and
  // lower, and not at all off a soft one.
  rebound(vy){
    if(!this.skid)return .16;
    return Math.max(0,Math.min(1,(vy*60-200)/650))*(this.bounce??.28);
  }
  step(floor,bounds,radius=4){
    if(this.asleep)return;
    this.age=(this.age??0)+1;this.bounced=false;
    const r=i=>Array.isArray(radius)?radius[i]:radius;
    let impact=0;
    let touching=false;
    for(const p of this.points){const vx=(p.x-p.px)*.985,vy=(p.y-p.py)*.985;p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy+1700/3600;}
    for(let pass=0;pass<10;pass++){
      for(let i=0;i<this.lengths.length;i++){
        const a=this.points[i],b=this.points[i+1],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,e=(d-this.lengths[i])/d*.5;
        a.x+=dx*e;a.y+=dy*e;b.x-=dx*e;b.y-=dy*e;
      }
      // Stop retained joints folding completely through themselves into an
      // accordion. They stay loose, with a finite anatomical bend range.
      for(let i=0;this.limitBend!==false&&i<this.lengths.length-1;i++){
        const a=this.points[i],b=this.points[i+2],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,min=(this.lengths[i]+this.lengths[i+1])*.45;
        if(d<min){const e=(d-min)/d*.5;a.x+=dx*e;a.y+=dy*e;b.x-=dx*e;b.y-=dy*e;}
      }
      for(const [i,p] of this.points.entries()){
        const bottom=floor(p.x)-r(i);
        if(p.y>bottom){
          const vx=p.x-p.px,vy=p.y-p.py;p.y=bottom;
          if(pass===0){impact=Math.max(impact,vy*60);p.px=p.x-vx*(this.skid&&vy*60>200?.82:.68);p.py=p.y+Math.max(0,vy)*this.rebound(vy);if(this.skid&&this.rebound(vy)>0)this.bounced=true;}
        }
        if(bounds)p.x=Math.max(bounds.minX+r(i),Math.min(bounds.maxX-r(i),p.x));
      }
      if(this.contacts)touching=this.contacts(this.points,pass)||touching;
    }
    // Bleed away energy after contact; a corpse must settle, not wriggle forever.
    const resting=touching||this.points.every((p,i)=>floor(p.x)-r(i)-p.y<1.5);
    // A severed piece can't stay stood up on its end (legs on their feet, a half on its
    // cut): its weight takes it over the way it leans until it lies along the floor.
    const standing=this.skid&&(touching||this.points.some((p,i)=>floor(p.x)-r(i)-p.y<1.5))&&this.standing();
    // (it turns about where it stands, slowly off the vertical and faster as it goes, like
    // a felled post: a nudge alone can't shift a wide cut face or a pair of feet)
    if(standing){
      const low=this.points.reduce((a,p)=>p.y>a.y?p:a),top=this.points.reduce((a,p)=>p.y<a.y?p:a);
      const lean=Math.sign(top.x-low.x)||this.lean||1;this.lean=lean;
      this.tip=Math.min(.07,(this.tip??0)+.003);
      const c=Math.cos(lean*this.tip),s=Math.sin(lean*this.tip);
      for(const p of this.points)for(const [k,j] of [['x','y'],['px','py']]){
        const dx=p[k]-low.x,dy=p[j]-low.y;p[k]=low.x+dx*c-dy*s;p[j]=low.y+dx*s+dy*c;
      }
    }else this.tip=0;
    // (a piece that skids keeps its slide a moment, and a frame it bounced keeps its
    // bounce; once it has been down a while it is calmed as before)
    this.down=resting?(this.down??0)+1:0;
    const calm=this.skid&&this.down<40?.9:.6;
    let speed=0;
    for(const p of this.points){
      if(resting&&!this.bounced&&!standing){p.px=p.x-(p.x-p.px)*calm;p.py=p.y-(p.y-p.py)*.6;}
      speed=Math.max(speed,Math.hypot(p.x-p.px,p.y-p.py));
    }
    this.quiet=resting&&(!standing||this.age>900)&&speed<(this.age>120?.38:.12)?this.quiet+1:0;
    if(this.quiet>24){this.asleep=true;for(const p of this.points){p.px=p.x;p.py=p.y;}}
    return impact;
  }
  // its length is standing off the floor (further from flat than FLAT_TILT)
  standing(){
    const L=longAxis(this.points);
    return L.ratio>1.3&&Math.abs(tiltOf(L.ang))>FLAT_TILT;
  }
}
