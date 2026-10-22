// A local performance, not a story beat: it never holds the player or opens UI.
export function updateStableMaster(n,heroes,terrain) {
  const floor=Math.max(0,terrain?.groundAt(n.x,n.z)??0);
  if(n.state==='waiting'){
    if(heroes.some(p=>p.x>=n.warningAt&&p.x<n.home.x+450)){
      n.state='alarm';n.t=0;
    }
  }else if(n.state==='alarm'){
    if(n.t>=210){n.state='fleeing';n.t=0;}
  }else if(n.state==='fleeing'){
    n.x-=210/60;n.dir=-1;
    if(n.x<n.home.x-850)n.state='gone';
  }
  const jump=n.state==='alarm'&&n.t<144?Math.max(0,Math.sin((n.t%72)/72*Math.PI))*18:0;
  n.h=floor+jump;
}
