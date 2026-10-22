import assert from 'node:assert/strict';
import { cutPlane, spritePoint } from '../src/effects/CutGeometry.js';
import { SpriteCuts } from '../src/effects/SpriteCut.js';

for (const lying of [false, true]) for (const headRight of [false, true]) for (const face of [-1, 1]) {
  const bounds = lying ? { x0: 20, x1: 220, y0: 180, y1: 220 } : { x0: 80, x1: 140, y0: 20, y1: 220 };
  let previous;
  for (const variation of [0, 0.25, 0.5, 0.75, 1]) {
    const p = cutPlane({ cut: 'waist', bounds, ax: 120, ay: 220, bodyHeight: 200, lying, headRight, face, variation });
    const fraction = lying ? (headRight ? 220 - p.cx : p.cx - 20) / 200 : (p.cy - 20) / 200;
    assert.ok(fraction >= 0.479 && fraction <= 0.591, 'Cut escaped the torso band');
    if (previous) assert.notDeepEqual(p, previous, 'Cut does not vary');
    previous = p;
    // Crown and feet must be on opposite sides of the SAME plane.
    const head = lying ? { x: headRight ? 220 : 20, y: 200 } : { x: 120, y: 20 };
    const foot = lying ? { x: headRight ? 20 : 220, y: 200 } : { x: 120, y: 220 };
    const side = q => (q.x - p.cx) * p.nx + (q.y - p.cy) * p.ny;
    assert.ok(side(head) < 0 && side(foot) > 0);
  }
}

// Split uses the actual sprite transform, including mirrored/nonuniform scaling,
// an offset impact pose, and rotation. Every original pixel must stay in place at
// the instant of separation rather than orbiting around a foot-origin pivot.
for (const cut of ['waist','vertical']) for (const face of [-1, 1]) for (const rotation of [-0.5, 0, 0.5]) {
  const sheet = { ax: 120, ay: 220, fw: 240, fh: 240, res: 2, key: 'enemy-grunt' };
  const sprite = { x: 330, y: 380, scaleX: 0.6 * face, scaleY: 0.45, rotation, texture: { key: 'test' }, frame: { name: 'f0' } };
  const image = () => {
    const i = {};
    for (const name of ['setCrop', 'setDepth', 'setTint']) i[name] = () => i;
    i.setOrigin = (x,y) => { i.ox=x; i.oy=y; return i; };
    i.setScale = (x,y) => { i.sx=x; i.sy=y; return i; };
    i.setPosition = (x,y) => { i.x=x; i.y=y; return i; };
    i.setRotation = r => { i.rotation=r; return i; };
    return i;
  };
  const scene = { add: { image }, textures: { getFrame: () => ({ cutWidth:240, cutHeight:240 }) } };
  const cuts = new SpriteCuts(scene);
  cuts.bake = () => ({ upper:'up', lower:'lo', midX:120, loose:[[],[]] });
  const view = { f: { x:300,z:440,h:0,facing:face,stats:{body:{h:100,w:40}} }, sprite, sheet };
  const halves = cuts.split(view,cut,1,{variation:0.2,tilt:0.8});
  for (const piece of Object.values(halves)) {
    const i = piece.img;
    for (const pixel of [{x:120,y:80},{x:100,y:160},{x:130,y:210}]) {
      const expected = spritePoint(sprite,sheet,pixel);
      const local = {x:(pixel.x-i.ox*240)*i.sx,y:(pixel.y-i.oy*240)*i.sy};
      const actual = piece.worldPoint(local.x,local.y);
      assert.ok(Math.hypot(actual.x-expected.x,actual.y-expected.y)<1e-8,'Cut piece jumped away from its source pixels');
    }
  }
}
// Run the actual pixel baker with an in-memory canvas. Every opaque source pixel
// must belong to exactly one half: no duplicated flesh, missing strips or gore
// painted into empty space, including vertical cuts through a lying sprite.
globalThis.Phaser = { Textures: { FilterMode: { NEAREST: 0 } } };
globalThis.document = { createElement() {
  const canvas = { width: 0, height: 0 };
  let pixels;
  canvas.getContext = () => ({
    drawImage(source) { pixels = new Uint8ClampedArray(source.pixels); },
    getImageData() { return { data: pixels }; },
    createImageData(w,h) { return { data:new Uint8ClampedArray(w*h*4) }; },
    putImageData(img) { canvas.pixels = new Uint8ClampedArray(img.data); },
  });
  return canvas;
} };
for (const cut of ['waist','vertical']) for (const lying of [false,true]) for (const variation of [0,0.5,1]) {
  const W=100,H=100, pixels=new Uint8ClampedArray(W*H*4), textures=new Map();
  for (let y=10;y<90;y++) for(let x=10;x<90;x++) {
    if (lying ? y<35||y>65 : x<35||x>65) continue;
    pixels.set([80,100,60,255],(y*W+x)*4);
  }
  const cuts=new SpriteCuts({textures:{addCanvas(key,c){textures.set(key,c.pixels);return{setFilter(){}};}}});
  cuts.loose=()=>[];
  const plane=cutPlane({cut,bounds:{x0:10,x1:89,y0:10,y1:89},ax:50,ay:90,bodyHeight:80,lying,variation,tilt:0.9});
  if(cut==='vertical') {
    const side=(x,y)=>(x-plane.cx)*plane.nx+(y-plane.cy)*plane.ny;
    assert.ok(lying?side(50,36)*side(50,64)<0:side(36,50)*side(64,50)<0,'Lengthwise cut must separate left/right sides, even when lying');
  }
  const result=cuts.bake({cutWidth:W,cutHeight:H,cutX:0,cutY:0,source:{image:{pixels}}},{ax:50},plane.cy,-plane.nx,cut,30,plane);
  assert.ok(result,'Pixel baking failed');
  const a=textures.get(result.upper),b=textures.get(result.lower);
  for(let i=3;i<pixels.length;i+=4) assert.equal((a[i]>0?1:0)+(b[i]>0?1:0),pixels[i]>0?1:0,'Halves do not exactly partition source artwork');
}
delete globalThis.document; delete globalThis.Phaser;
console.log('Cut checks passed: anatomical variation, lying bodies, mirrored/rotated alignment and pixel-perfect complementary halves.');
