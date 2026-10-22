// A bounded, soft tissue attachment between two independently floppy halves.
// Correct positions AND previous positions so the seam cannot add spin/energy.
export class SplitSeam {
  constructor(a,b) {
    this.a=a;this.b=b;this.age=0;
    this.ia=Math.min(a.points.length-1,Math.floor(a.points.length*.5));
    this.ib=Math.min(b.points.length-1,Math.floor(b.points.length*.5));
    const p=a.points[this.ia],q=b.points[this.ib];
    this.length=Math.hypot(q.x-p.x,q.y-p.y)+5;
  }
  step() {
    this.age++;
    const p=this.a.points[this.ia],q=this.b.points[this.ib];
    const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);
    if(d>85||this.age>360)return false;
    if(d>this.length+.2){
      const amount=Math.min(2.5,(d-this.length)*.5),x=dx/d*amount,y=dy/d*amount;
      for(const [point,sign] of [[p,1],[q,-1]]){point.x+=x*sign;point.y+=y*sign;point.px+=x*sign;point.py+=y*sign;}
      this.a.asleep=this.b.asleep=false;
    }
    return true;
  }
  ends(){return[this.a.points[this.ia],this.b.points[this.ib]];}
}
