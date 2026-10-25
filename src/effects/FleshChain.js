// Fixed-step presentation physics for a severed piece's remaining joints.
// No springs across the cut: the two pieces are completely independent.
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
    // (a piece that skids keeps its slide a moment, and a frame it bounced keeps its
    // bounce; once it has been down a while it is calmed as before)
    this.down=resting?(this.down??0)+1:0;
    const calm=this.skid&&this.down<40?.9:.6;
    let speed=0;
    for(const p of this.points){
      if(resting&&!this.bounced){p.px=p.x-(p.x-p.px)*calm;p.py=p.y-(p.y-p.py)*.6;}
      speed=Math.max(speed,Math.hypot(p.x-p.px,p.y-p.py));
    }
    this.quiet=resting&&speed<(this.age>120?.38:.12)?this.quiet+1:0;
    if(this.quiet>24){this.asleep=true;for(const p of this.points){p.px=p.x;p.py=p.y;}}
    return impact;
  }
}
