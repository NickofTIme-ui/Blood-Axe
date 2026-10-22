// Blade landmarks pass through the same scale, anchor and rotation as the art.
export function bladeWorldPoint(sprite,point){
  const x=(point.x-sprite.originX*sprite.frame.width)*sprite.scaleX;
  const y=(point.y-sprite.originY*sprite.frame.height)*sprite.scaleY;
  const c=Math.cos(sprite.rotation),s=Math.sin(sprite.rotation);
  return{x:sprite.x+x*c-y*s,y:sprite.y+x*s+y*c};
}
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});

export class BladeTrail {
  constructor(){this.history=[];}
  draw(g,sprite,blade,f,frame){
    const token=`${f.state}:${f.fsm.enterCount}:${f.facing}`;
    if(this.token!==token){this.history=[];this.token=token;}
    const m=f.move;
    if(!m||!blade){this.history=[];return;}
    const hilt=bladeWorldPoint(sprite,blade.hilt),tip=bladeWorldPoint(sprite,blade.tip);
    const sample={frame,hilt,tip};
    if(frame<=m.startup+m.active){
      if(this.history.at(-1)?.frame===frame)this.history[this.history.length-1]=sample;
      else this.history.push(sample);
    }
    this.history=this.history.filter(p=>frame-p.frame<=5);
    if(frame<=m.startup||frame>m.startup+m.active+4)return;
    const fade=frame<=m.startup+m.active?1:1-(frame-m.startup-m.active)/5;
    const gold=!!f.stats.blade;
    const colors=gold?[0x6d4114,0xd9a343,0xffe9a5]:[0x344553,0xaac4d5,0xf2faff];
    for(let i=1;i<this.history.length;i++){
      const a=this.history[i-1],b=this.history[i];
      if(Math.hypot(a.tip.x-b.tip.x,a.tip.y-b.tip.y)<1)continue;
      const alpha=(i/this.history.length)*fade;
      // Thin nested ribbons: transparent tail, bright leading edge, no solid fan.
      for(let layer=0;layer<3;layer++){
        const root=.35+layer*.22;
        g.fillStyle(colors[layer],alpha*[.12,.24,.48][layer]);
        g.fillPoints([mix(a.hilt,a.tip,root),a.tip,b.tip,mix(b.hilt,b.tip,root)],true);
      }
    }
    g.lineStyle(1.2,gold?0xfff3c8:0xf4fbff,.72*fade);
    const edge=mix(hilt,tip,.55);g.lineBetween(edge.x,edge.y,tip.x,tip.y);
  }
}
