// One continuous ballistic descent. Derivatives are shared by the fire/smoke tail.
export function siegeFlight(x,y,t,side=1){
 const f=Math.max(0,Math.min(1,t));
 return {x:x+side*300*(1-f),y:y-520*(1-f)-680*f*(1-f)-12,vx:-side*300,vy:-160+1360*f};
}
