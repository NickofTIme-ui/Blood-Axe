// A continuous strip mesh bends the original lower body. Nothing is swapped from a
// different pose, stretched to reach the floor, or cropped into disconnected knees.
export function skinRows(top,bottom,knee,angle,bend,step=8,rootAngle=angle){
  const rows=[];let cx=Math.sin(rootAngle)*top,cy=Math.cos(rootAngle)*top,last=top;
  for(let y=top;;y=Math.min(bottom,y+step)){
    const u=Math.max(0,Math.min(1,(y-knee+12)/24));
    const root= Math.max(0,Math.min(1,y/Math.max(1,knee*.8)));
    const a=rootAngle+(angle-rootAngle)*root*root*(3-2*root)+bend*u*u*(3-2*u),d=y-last;
    cx+=Math.sin(a)*d;cy+=Math.cos(a)*d;
    rows.push({y,x:cx,dy:cy,a});last=y;if(y===bottom)break;
  }
  return rows;
}

function triangle(ctx,img,src,dst){
  const [a,b,c]=src,[p,q,r]=dst;
  const den=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);
  if(Math.abs(den)<.001)return;
  const A=((q.x-p.x)*(c.y-a.y)-(r.x-p.x)*(b.y-a.y))/den;
  const C=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(c.x-a.x))/den;
  const B=((q.y-p.y)*(c.y-a.y)-(r.y-p.y)*(b.y-a.y))/den;
  const D=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(c.x-a.x))/den;
  ctx.save();ctx.beginPath();
  // A fractional overlap closes antialias cracks between adjoining triangles.
  const mx=(p.x+q.x+r.x)/3,my=(p.y+q.y+r.y)/3;
  for(let i=0;i<3;i++){const v=dst[i],dx=v.x-mx,dy=v.y-my,l=Math.hypot(dx,dy)||1;ctx[i?'lineTo':'moveTo'](v.x+dx/l*.65,v.y+dy/l*.65);}
  ctx.closePath();ctx.clip();ctx.setTransform(A,B,C,D,p.x-A*a.x-C*a.y,p.y-B*a.x-D*a.y);ctx.drawImage(img,0,0);ctx.restore();
}

export function drawLowerSkin(ctx,img,hip,top,bottom,knee,angle,bend,pad,gather=0,rootAngle=angle){
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  const rows=skinRows(top,bottom,knee,angle,bend,6,rootAngle);
  // x and y remain in original source pixels; only their joints change direction.
  const at=(x,r)=>{
    const dx=r.x+(x-hip.x)*Math.cos(r.a),dy=r.dy-(x-hip.x)*Math.sin(r.a);
    // Close the airborne stride by rotating each leg inward around its hip. Rotation
    // preserves the hip-to-foot radius; no width/height scale is animated.
    const side=Math.tanh((x-hip.x)/14),weight=Math.max(0,Math.min(1,r.y/knee)),a=-side*gather*weight*weight*(3-2*weight);
    return{x:pad+hip.x+dx*Math.cos(a)+dy*Math.sin(a),y:pad+hip.y-dx*Math.sin(a)+dy*Math.cos(a)};
  };
  const cols=8,w=img.width;
  for(let j=1;j<rows.length;j++)for(let i=0;i<cols;i++){
    const x=i*w/cols,x1=(i+1)*w/cols,a=rows[j-1],b=rows[j];
    const s=[{x,y:hip.y+a.y},{x:x1,y:hip.y+a.y},{x:x1,y:hip.y+b.y},{x,y:hip.y+b.y}];
    const d=[at(x,a),at(x1,a),at(x1,b),at(x,b)];
    triangle(ctx,img,[s[0],s[1],s[2]],[d[0],d[1],d[2]]);
    triangle(ctx,img,[s[0],s[2],s[3]],[d[0],d[2],d[3]]);
  }
}
