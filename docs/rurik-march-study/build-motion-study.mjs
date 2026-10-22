// A pose study, not game art: fixed limb lengths and explicit ground contacts.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { createCanvas } = require('@napi-rs/canvas');
const root = path.dirname(fileURLToPath(import.meta.url));
const hero = process.argv.includes('--hero');
const output = path.join(root, hero ? 'hero-motion-frames' : 'motion-frames');
fs.mkdirSync(output, { recursive: true });
const count = 32, ground = 370, stride = hero ? 90 : 78;
const smooth = t => t*t*(3-2*t);
const wrap = t => (t % 1 + 1) % 1;

function foot(t) {
  t = wrap(t);
  // Stance moves backwards at constant speed: on a moving character the foot
  // remains stationary against the floor. Swing returns the foot through center.
  if (t < .6) return { x: stride/2 - stride*t/.6, y: ground, angle: t < .08 ? -.22*(1-t/.08) : t > .5 ? .5*(t-.5)/.1 : 0 };
  const u = (t-.6)/.4;
  return { x: -stride/2 + stride*smooth(u), y: ground - (hero?22:33)*Math.sin(Math.PI*u), angle: -.22*u };
}
function knee(hip, ankle) {
  const dx=ankle.x-hip.x, dy=ankle.y-hip.y, d=Math.hypot(dx,dy), length=56;
  if(d>length*2) throw Error('Leg stretched');
  const h=Math.sqrt(length*length-d*d/4);
  return { x:(hip.x+ankle.x)/2+dy/d*h, y:(hip.y+ankle.y)/2-dx/d*h };
}
const frames=[];
for(let i=0;i<count;i++) {
  const t=i/count, c=createCanvas(600,470), g=c.getContext('2d');
  g.fillStyle='#eee9df';g.fillRect(0,0,600,470);
  g.fillStyle='#302d2b';g.font='bold 18px sans-serif';g.fillText(hero?'RURIK — HERO STRIDE STUDY':'RURIK — WALK MECHANICS STUDY',25,31);
  g.font='14px sans-serif';g.fillText('Orange: near leg    Blue: far leg',25,55);
  g.fillStyle='#766f65';g.fillText('One hand carries the sword; the free arm swings.',25,442);
  g.save();g.translate(290,0);
  g.strokeStyle='#b4ac9f';g.lineWidth=2;g.beginPath();g.moveTo(-240,ground+6);g.lineTo(240,ground+6);g.stroke();
  const near=foot(t),far=foot(t+.5);
  // Rise over the supporting leg, then settle into the next heel contact.
  // Nearly straight support knee; constant limb lengths without a crouch.
  const support = near.y === ground && far.y === ground
    ? (Math.abs(near.x)>Math.abs(far.x)?near:far)
    : near.y === ground ? near : far;
  const hip={x:0,y:Math.max(...[near,far].map(f=>f.y-7-Math.sqrt(111*111-f.x*f.x)))};
  const turn=Math.cos(t*Math.PI*2)*(hero?5:3);
  const shoulderRoll=hero?Math.sin(t*Math.PI*2)*2.8:0;
  const line=(points,color,width)=>{g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))g.lineTo(p.x,p.y);g.stroke();};
  const joint=(p,color,r=4)=>{g.fillStyle=color;g.beginPath();g.arc(p.x,p.y,r,0,Math.PI*2);g.fill();};
  const polygon=(points,fill,stroke='#49443e')=>{g.fillStyle=fill;g.strokeStyle=stroke;g.lineWidth=2;g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);g.closePath();g.fill();g.stroke();};
  if(hero){
    // Delayed cape motion is separate from the load-bearing torso and sword.
    const lag=Math.sin(t*Math.PI*2-.6);
    polygon([[-18+turn,hip.y-72+shoulderRoll],[-37,hip.y-61],[-67,hip.y+15],[-96+lag*6,hip.y+69],[-58+lag*4,hip.y+60],[-20,hip.y+19]],'#8c4540','#633c37');
  }
  function leg(f,color) {
    const ankle={x:f.x,y:f.y-7},k=knee(hip,ankle);
    line([hip,k],color,hero?18:11);line([k,ankle],color,hero?14:11);joint(k,hero?'#49443e':'#eee9df',3);
    g.save();g.translate(ankle.x,ankle.y);g.rotate(f.angle);
    if(hero)polygon([[-10,-4],[5,-4],[9,1],[20,4],[20,10],[-10,10]],color);
    else line([{x:-8,y:5},{x:16,y:5}],color,10);g.restore();
  }
  const shoulder={x:(hero?3:4)+turn,y:hip.y-(hero?74:57)};
  // Free arm is opposite the far leg. Pendulum motion, never a forward punch.
  const armSwing=-Math.cos((t+.5)*Math.PI*2)*(hero?.36:.48);
  const farShoulder={x:shoulder.x+(hero?13:3),y:shoulder.y+2-shoulderRoll};
  const elbow={x:farShoulder.x+Math.sin(armSwing)*35,y:farShoulder.y+Math.cos(armSwing)*35};
  const hand={x:elbow.x+Math.sin(armSwing+.1)*31,y:elbow.y+Math.cos(armSwing+.1)*31};
  line([farShoulder,elbow,hand],'#50758a',hero?13:9);joint(hand,'#50758a',hero?8:6);
  leg(far,'#50758a');
  // Simple torso volume; no detached pieces or copied armor poses.
  g.fillStyle='#b0aaa0';g.strokeStyle='#49443e';g.lineWidth=2;
  if(hero){
    polygon([[shoulder.x-25,shoulder.y-5+shoulderRoll],[shoulder.x+22,shoulder.y-6-shoulderRoll],[shoulder.x+28,shoulder.y+11-shoulderRoll],[hip.x+15,hip.y-10],[hip.x+17,hip.y+4],[hip.x-17,hip.y+4],[shoulder.x-22,shoulder.y+19+shoulderRoll]],'#777971');
    line([{x:shoulder.x-16,y:shoulder.y+8+shoulderRoll},{x:shoulder.x+19,y:shoulder.y+12-shoulderRoll}],'#bcb7a7',3);
    line([{x:shoulder.x+4,y:shoulder.y+10},{x:hip.x+4,y:hip.y-15}],'#565951',2);
  }else{
    g.beginPath();g.moveTo(shoulder.x-17,shoulder.y-5);g.lineTo(shoulder.x+17,shoulder.y+1);g.lineTo(hip.x+12,hip.y);g.lineTo(hip.x-12,hip.y);g.closePath();g.fill();g.stroke();
  }
  line([{x:hip.x-12,y:hip.y-1},{x:hip.x+12,y:hip.y+1}],'#49443e',5);
  leg(near,'#ba6534');
  line([{x:shoulder.x-12,y:shoulder.y+shoulderRoll},{x:shoulder.x+14,y:shoulder.y-shoulderRoll}],'#49443e',5);
  const neck={x:(hero?3:shoulder.x+2),y:shoulder.y-12};
  line([neck,{x:neck.x,y:neck.y-8}],'#49443e',10);
  // Forward-looking head and nose, very little vertical movement.
  g.fillStyle='#c2bbae';g.strokeStyle='#49443e';g.lineWidth=2;
  if(hero){
    polygon([[neck.x-10,neck.y-37],[neck.x+9,neck.y-39],[neck.x+15,neck.y-30],[neck.x+15,neck.y-24],[neck.x+20,neck.y-20],[neck.x+14,neck.y-18],[neck.x+13,neck.y-9],[neck.x+3,neck.y-5],[neck.x-10,neck.y-13]],'#b9aa93');
    polygon([[neck.x-12,neck.y-37],[neck.x+7,neck.y-41],[neck.x+12,neck.y-34],[neck.x-4,neck.y-32],[neck.x-9,neck.y-17],[neck.x-17,neck.y-9]],'#50453b');
    polygon([[neck.x+14,neck.y-17],[neck.x+12,neck.y-7],[neck.x+3,neck.y-3],[neck.x-5,neck.y-12],[neck.x-5,neck.y-18],[neck.x+4,neck.y-14]],'#50453b');
    line([{x:neck.x+8,y:neck.y-27},{x:neck.x+14,y:neck.y-27}],'#49443e',2);
  }else{
    g.beginPath();g.ellipse(neck.x+3,neck.y-24,13,18,0,0,Math.PI*2);g.fill();g.stroke();
    line([{x:neck.x+14,y:neck.y-28},{x:neck.x+20,y:neck.y-22},{x:neck.x+14,y:neck.y-21}],'#49443e',2);
  }
  const swordShoulder={x:shoulder.x-(hero?19:9),y:shoulder.y+1+shoulderRoll};
  const swordElbow={x:swordShoulder.x-3,y:swordShoulder.y+29};
  const swordHand={x:8+turn*.35,y:hip.y-5};
  line([swordShoulder,swordElbow,swordHand],'#49443e',hero?15:10);joint(swordHand,'#49443e',hero?8:6);
  if(hero)joint(swordShoulder,'#99998d',13);
  // Rigid sword attached to grip. Stable size and angle in every frame.
  const tip={x:swordHand.x+83,y:swordHand.y+55};
  line([{x:swordHand.x-10,y:swordHand.y-7},tip],'#72604a',7);
  line([swordHand,tip],'#d6c098',4);
  if(hero)polygon([[swordHand.x+5,swordHand.y-1],[tip.x+18,tip.y+9],[tip.x+6,tip.y+8],[swordHand.x-1,swordHand.y+7]],'#bcbeb4','#575e5a');
  line([{x:swordHand.x-5,y:swordHand.y+7},{x:swordHand.x+8,y:swordHand.y-9}],'#72604a',4);
  // Foot contact marks make planted versus traveling feet easy to judge.
  for(const [f,color] of [[near,'#ba6534'],[far,'#50758a']])if(f.y===ground)line([{x:f.x-7,y:ground+7},{x:f.x+14,y:ground+7}],color,2);
  g.restore();
  g.fillStyle='#766f65';g.font='13px sans-serif';g.fillText(`Drawing ${String(i+1).padStart(2,'0')} / ${count}`,443,31);
  fs.writeFileSync(path.join(output,`frame-${String(i).padStart(2,'0')}.png`),c.toBuffer('image/png'));
  frames.push(c);
}
const sheet=createCanvas(1200,940),ctx=sheet.getContext('2d');
[0,6,12,16].forEach((n,i)=>ctx.drawImage(frames[n],(i%2)*600,Math.floor(i/2)*470));
fs.writeFileSync(path.join(root,hero?'hero-motion-contact-sheet.png':'motion-contact-sheet.png'),sheet.toBuffer('image/png'));
// Check that each leg passes from behind to ahead while lifted, and rests on
// the floor over the whole stance. Both leg segments stay exactly 56px long.
for(let i=0;i<1000;i++){
  const t=i/1000,f=foot(t),k=knee({x:0,y:ground-99}, {x:f.x,y:f.y-7});
  if(t<.6&&f.y!==ground)throw Error('Sliding foot lost ground');
  if(Math.abs(Math.hypot(k.x,k.y-(ground-99))-56)>1e-6)throw Error('Thigh changed length');
  if(Math.abs(Math.hypot(k.x-f.x,k.y-(f.y-7))-56)>1e-6)throw Error('Shin changed length');
}
if(!(foot(.65).x<0&&foot(.95).x>0&&foot(.8).y<ground))throw Error('Missing passing step');
console.log('32 motion drawings rendered; fixed leg lengths and crossing swing verified.');
