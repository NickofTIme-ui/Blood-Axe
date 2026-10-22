import assert from 'node:assert/strict';
import { StageView } from '../src/view/StageView.js';
import { FX } from '../src/view/stripImporter.js';

for (const look of ['cart', undefined]) for (const paintedFlames of [false, true]) {
  const images = [], openings = [];
  const object = () => {
    const o = { visible: true, alpha: 1 };
    for (const key of ['setDepth','setStrokeStyle','setTint','setBlendMode','setOrigin','setPosition','setScale','setFrame','setDisplaySize']) o[key] = () => o;
    o.setVisible = v => { o.visible = v; return o; };
    o.setAlpha = a => { o.alpha = a; return o; };
    return o;
  };
  globalThis.Phaser = { BlendModes: { ADD: 1, NORMAL: 0 } };
  if (paintedFlames) FX.firepit = { key:'test-flames', fw:100, fps:12, count:6 };
  else delete FX.firepit;
  const scene = { add: {
    image(x,z,key) { images.push(key); return object(); },
    ellipse(...args) { openings.push(args); return object(); },
  }, gore: { spawn() {} } };
  const hz = { x:200,z:400,w:110,d:60,t:30,look };
  let phase = 'idle';
  const view = { scene, painted:new Set(['grate','grate-hot']), stage:{ firePhase:()=>phase } };
  for (const [name,t] of [['idle',30],['warn',130],['burst',170],['idle',30]]) {
    phase=name; hz.t=t;
    StageView.prototype.drawFire.call(view,hz);
    assert.ok(hz.view.visible && hz.hot.visible && hz.glow.visible);
    assert.equal(paintedFlames ? hz.blaze[0][0].visible : hz.flames[0].visible, name==='burst');
    assert.ok(hz.hot.alpha >= 0 && hz.hot.alpha <= 1);
  }
  assert.equal(openings.length,0,'Original artwork should replace the temporary ellipses');
  assert.equal(images.filter(key=>key==='grate').length,1,'Original stone firepit must be created once');
  assert.equal(images.filter(key=>key==='grate-hot').length,1,'Matching glowing firepit must be restored');
  assert.ok(!images.includes('cartwreck'),'Hay/cart artwork covers the trap');
}
delete FX.firepit; delete globalThis.Phaser;
console.log('Fire-trap checks passed: original stone/ember artwork restored, no hay carts, warning glow and flames preserved.');
