// Conservative isolation of a long painted steel blade outside the torso. Never
// remove an ambiguous short highlight (helmet, forearm or shoulder armour).
export function bladePixels(data,W,H,{ax,ay,bodyHeight,bodyWidth}){
  const pts=[];
  for(let y=Math.max(0,Math.floor(ay-bodyHeight*.68));y<Math.min(H,ay-bodyHeight*.08);y+=2)for(let x=0;x<W;x+=2){
    const i=(y*W+x)*4,r=data[i],g=data[i+1],b=data[i+2];
    if(data[i+3]>80&&Math.abs(x-ax)>bodyWidth*.32&&r>55&&g>45&&b>40&&Math.max(r,g,b)-Math.min(r,g,b)<95)pts.push({x,y});
  }
  if(pts.length<15)return null;
  let best=null;
  for(let angle=-85;angle<=90;angle+=5){
    const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),bins=new Map();
    for(const p of pts){const v=p.x*c+p.y*s,n=-p.x*s+p.y*c,key=Math.round(n/4),bin=bins.get(key)??{lo:Infinity,hi:-Infinity,n:0,sum:0};bin.lo=Math.min(bin.lo,v);bin.hi=Math.max(bin.hi,v);bin.n++;bin.sum+=n;bins.set(key,bin);}
    for(const bin of bins.values()){
      const length=bin.hi-bin.lo;
      if(length<bodyHeight*.24||length>bodyHeight*.85||bin.n<length*.28)continue;
      const score=length*Math.min(1,bin.n/length);
      if(!best||score>best.score)best={...bin,c,s,score,normal:bin.sum/bin.n};
    }
  }
  if(!best)return null;
  const mask=new Uint8Array(W*H);let count=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const v=x*best.c+y*best.s,n=-x*best.s+y*best.c;
    if(Math.abs(x-ax)<bodyWidth*.29||v<best.lo-3||v>best.hi+3||Math.abs(n-best.normal)>4||data[(y*W+x)*4+3]<40)continue;
    mask[y*W+x]=1;count++;
  }
  return count>=40?mask:null;
}
