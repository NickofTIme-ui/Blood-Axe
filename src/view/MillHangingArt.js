// Layered performance, in seconds. Pure rendering: no combat or story decisions.
export function hangingPose(seconds) {
  const t=Math.max(0,seconds-3), drop=Math.min(1,t/.23);
  const caught=Math.max(0,t-.23);
  return {
    dropped:t>0,
    drop:50*drop*drop+(t>.23?Math.sin(caught*13)*7*Math.exp(-caught*3):0),
    sway:t>.23?Math.sin(caught*4.5)*.105*Math.exp(-caught*.7):Math.sin(seconds*3)*.008,
    head:t>.23?Math.min(.72,caught*.35):-.02,
    legs:t>.23?Math.sin(caught*8)*.17*Math.exp(-caught*1.3):Math.sin(seconds*4)*.018,
    lever:seconds<2?0:seconds<2.8?4:5,
  };
}

export function drawMillHanging(ctx, images, seconds, options={}) {
  const p=hangingPose(seconds), {gallows,body,mechanisms,executioner}=images;
  ctx.clearRect(0,0,960,600);
  if(!options.transparent){ctx.fillStyle='#16110d';ctx.fillRect(0,0,960,600);
  const glow=ctx.createRadialGradient(480,300,20,480,300,450);glow.addColorStop(0,'#493123');glow.addColorStop(1,'#16110d');ctx.fillStyle=glow;ctx.fillRect(0,0,960,600);}
  ctx.drawImage(gallows,130,20,700,500);
  // Closed hatch is its own painted component. The open aperture belongs to scaffold.
  if(!p.dropped){ctx.save();ctx.transform(1,0,0,.22,440,375);ctx.drawImage(mechanisms,0,0,mechanisms.width/3,mechanisms.height/2,-50,-20,220,145);ctx.restore();}
  const x=490+Math.sin(p.sway)*105,neck=210+p.drop;
  if(options.rescueAge==null && !options.hideCaptive){
  // Multi-strand rope, kept attached to neck through drop/catch/sway.
  ctx.lineCap='round';ctx.beginPath();ctx.moveTo(490,100);ctx.lineTo(x,neck);ctx.strokeStyle='#322315';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#b69865';ctx.lineWidth=3;ctx.stroke();
  ctx.save();if(p.dropped){ctx.beginPath();ctx.rect(390,0,235,410);ctx.clip();}ctx.translate(x,neck);ctx.rotate(p.sway);ctx.scale(.44,.44);ctx.translate(-216,-139);
  // Head, body, and two legs retain their original painted pixels; joints animate.
  const head=()=>{ctx.moveTo(172,28);ctx.lineTo(282,28);ctx.lineTo(282,153);ctx.lineTo(218,160);ctx.lineTo(190,140);ctx.lineTo(170,116);ctx.closePath();};
  ctx.save();ctx.beginPath();ctx.rect(0,0,384,340);head();ctx.clip('evenodd');ctx.drawImage(body,0,0);ctx.restore();
  for(const [side,angle] of [[0,p.legs],[1,-p.legs*.65]]){ctx.save();ctx.translate(side?214:151,340);ctx.rotate(angle);ctx.translate(side?-214:-151,-340);ctx.beginPath();ctx.rect(side?188:0,336,side?196:188,176);ctx.clip();ctx.drawImage(body,0,0);ctx.restore();}
  ctx.save();ctx.translate(216,146);ctx.rotate(p.head);ctx.translate(-216,-146);ctx.beginPath();head();ctx.clip();ctx.drawImage(body,0,0);ctx.restore();
  ctx.strokeStyle='#b69865';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(218,148,21,8,.1,0,Math.PI*2);ctx.stroke();ctx.restore();
  }else if(options.rescueAge!=null && options.rescueAge<84 && images.rescue){
    const im=images.rescue,i=Math.min(7,Math.floor(options.rescueAge/12)),cw=im.width/4,ch=im.height/2;
    ctx.drawImage(im,i%4*cw,Math.floor(i/4)*ch,cw,ch,395,147,169,225);
  }
  // The cut rope: its end swings free over the block and settles
  if(options.ropeAge!=null){
    const a=options.ropeAge,swing=.42*Math.sin(a*.16+.6)*Math.exp(-a/55),len=62+6*Math.exp(-a/12);
    const ex=490+Math.sin(swing)*len,ey=100+Math.cos(swing)*len;
    ctx.lineCap='round';ctx.beginPath();ctx.moveTo(490,100);ctx.quadraticCurveTo(490+Math.sin(swing*.5)*len*.5,100+len*.5,ex,ey);
    ctx.strokeStyle='#322315';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#b69865';ctx.lineWidth=3;ctx.stroke();
    ctx.strokeStyle='#c9ad78';ctx.lineWidth=1.5;for(const f of[-.5,0,.5]){ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex+Math.sin(swing+f)*7,ey+Math.cos(swing+f)*7);ctx.stroke();}
  }
  // Executioner performs the warning and pulls the separate lever.
  if(options.executionerAlive!==false){
  if(images.lever){
    const im=images.lever,i=seconds<0?0:Math.min(7,Math.floor(seconds/3*8)),cw=im.width/4,ch=im.height/2;
    const pivots=[[314,358],[337,358],[289,358],[308,358],[309,335],[322,335],[315,335],[336,335]];
    const [px,py]=pivots[i],scale=.42;
    ctx.drawImage(im,i%4*cw,Math.floor(i/4)*ch,cw,ch,760-px*scale,325-py*scale,cw*scale,ch*scale);
  }else{
  const cw=executioner.width/4,ch=executioner.height/2,i=p.lever;
  ctx.drawImage(executioner,(i%4)*cw,Math.floor(i/4)*ch,cw,ch,660,180,156,208);
  ctx.save();ctx.translate(729,349);ctx.rotate(p.dropped?-.8:.55);ctx.strokeStyle='#4a2d19';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-53);ctx.stroke();ctx.strokeStyle='#b18346';ctx.lineWidth=3;ctx.stroke();ctx.restore();
  }}
  if(options.executionerAlive===false&&images.lever){
    const im=images.lever,s=.42;
    ctx.drawImage(im,279,326,92,148,760+(279-314)*s,325+(326-358)*s,92*s,148*s);
    ctx.save();ctx.translate(760,325);ctx.rotate(p.dropped?-1.08:0);
    ctx.drawImage(im,299,156,24,200,-15*s,-202*s,24*s,200*s);ctx.restore();
  }
  // Front deck occludes the legs after they go through the hatch.
  ctx.drawImage(gallows,0,gallows.height*.80,gallows.width,gallows.height*.20,130,20+500*.80,700,500*.20);
}
