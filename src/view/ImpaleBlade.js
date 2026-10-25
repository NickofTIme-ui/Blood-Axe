import {bladeWorldPoint} from './BladeTrail.js';

// Landmarks measured on the shipped 696 x 480 HD finisher frames. These belong to the
// artwork, not the simulation timeline: the attachment follows every painted pose.
const STEEL={2:[[439,316],[562,315]],3:[[409,230],[500,148]],4:[[425,178],[513,90]],5:[[442,164],[544,90]]};
const OATH={2:[[424,306],[547,306]],3:[[403,221],[489,138]],4:[[407,187],[498,98]],5:[[422,169],[526,97]]};
const point=([x,y])=>({x,y});
export const bladeFraction=.52;
export function impaleBlade(scene,by){
  const s=scene.views?.get(by.id)?.sprite;
  if(!s?.texture.key.endsWith('-finImpale'))return null;
  const i=Number(String(s.frame.name).slice(1));
  const pair=(s.texture.key.startsWith('ulricOath')?OATH:STEEL)[i];
  if(!pair)return null;
  const h=point(pair[0]),t=point(pair[1]);
  const hilt=bladeWorldPoint(s,h),tip=bladeWorldPoint(s,t);
  return{sprite:s,h,t,hilt,tip,pin:{x:hilt.x+(tip.x-hilt.x)*bladeFraction,y:hilt.y+(tip.y-hilt.y)*bladeFraction},angle:Math.atan2(tip.y-hilt.y,tip.x-hilt.x)};
}

// Duplicate only the exposed steel from the actual hero frame. The hilt stays behind
// the victim, the protruding point is in front. No second invented sword is drawn.
export function exposedBlade(scene,b){
  const s=b.sprite,key=`impale-tip-${s.texture.key}-${s.frame.name}`;
  if(!scene.textures.exists(key)){
    const fr=s.frame,c=document.createElement('canvas');c.width=fr.width;c.height=fr.height;
    const ctx=c.getContext('2d'),dx=b.t.x-b.h.x,dy=b.t.y-b.h.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
    const x=b.h.x+dx*bladeFraction,y=b.h.y+dy*bladeFraction,w=s.texture.key.startsWith('ulricOath')?10:7;
    ctx.beginPath();ctx.moveTo(x+nx*w,y+ny*w);ctx.lineTo(b.t.x+dx/len*2,b.t.y+dy/len*2);ctx.lineTo(x-nx*w,y-ny*w);ctx.closePath();ctx.clip();
    ctx.drawImage(fr.source.image,fr.cutX,fr.cutY,fr.cutWidth,fr.cutHeight,0,0,c.width,c.height);
    scene.textures.addCanvas(key,c);
  }
  return key;
}
