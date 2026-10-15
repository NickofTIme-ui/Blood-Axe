// Spotlight.js — The sentence's light (stage/Sentence.js, run by ArenaScene.setupSentence):
// when a boss is beaten the room goes dark around him and the hero who beat him, and one
// pale shaft falls on the two of them, as if the hall had stopped to watch. The pool of
// light follows them (the hero walking up), opens wider when the blade falls so the head
// is seen to go, and the room comes back up when it's over.
//
// A dark sheet over the arena (a RenderTexture that rides with the camera) with a soft
// oval hole erased out of it around the pair, a warm additive shaft from above, and a glow
// on the floor where they are. Only a picture: nothing the simulation reads.

import { DEPTH } from './depths.js';

const LOOK = {
  dark: 0.8,      // how dark the room goes (0..1)
  darkAfter: 0.66,// ...once the blow has fallen
  in: 1300,       // ms for the lights to go down
  out: 1100,      // ms for them to come back up
  padX: 120,      // the pool reaches this far past each of them
  ry: 150,        // the pool's half-height
  open: 1.4,      // how much wider it opens on the blow
  shaft: 0.22,    // the shaft's strength
  tint: 0x050208, // the dark (a little warm-black, never grey)
};

export class Spotlight {
  constructor(scene) {
    this.scene = scene;
    this.k = 0;      // 0 = lights up, 1 = down
    this.wide = 1;
    this.dark = LOOK.dark;
    this.pair = null;
    this.makeTextures();
  }

  makeTextures() {
    const tx = this.scene.textures;
    if (!tx.exists('spotHole')) {
      // the hole: solid in the middle, falling off softly to nothing at the rim
      const c = tx.createCanvas('spotHole', 256, 256);
      const g = c.context;
      const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      r.addColorStop(0, 'rgba(255,255,255,1)');
      r.addColorStop(0.45, 'rgba(255,255,255,0.97)');
      r.addColorStop(0.75, 'rgba(255,255,255,0.55)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 256, 256);
      c.refresh();
    }
    if (!tx.exists('spotShaft')) {
      // the shaft: a tall soft wedge, narrow at the top, faint up high, strongest at the floor
      const W = 256; const H = 512;
      const c = tx.createCanvas('spotShaft', W, H);
      const g = c.context;
      const v = g.createLinearGradient(0, 0, 0, H);
      v.addColorStop(0, 'rgba(255,236,200,0)');
      v.addColorStop(0.35, 'rgba(255,230,190,0.35)');
      v.addColorStop(1, 'rgba(255,214,160,0.9)');
      g.filter = 'blur(14px)';
      g.fillStyle = v;
      g.beginPath();
      g.moveTo(W * 0.38, 0); g.lineTo(W * 0.62, 0); g.lineTo(W * 0.9, H); g.lineTo(W * 0.1, H);
      g.closePath();
      g.fill();
      c.refresh();
    }
  }

  build() {
    if (this.rt) return;
    const S = this.scene;
    const cam = S.cameras.main;
    // big enough to cover the view at the widest the camera goes, shake included
    const z = S.baseZoom || 1;
    this.w = Math.ceil(cam.width / z) + 240;
    this.h = Math.ceil(cam.height / z) + 240;
    this.rt = S.add.renderTexture(0, 0, this.w, this.h).setOrigin(0.5).setDepth(DEPTH.popups - 20);
    this.brush = S.make.image({ key: 'spotHole', add: false });
    this.shaft = S.add.image(0, 0, 'spotShaft').setOrigin(0.5, 1).setDepth(DEPTH.popups - 19)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.pool = S.add.image(0, 0, 'spotHole').setDepth(DEPTH.popups - 19)
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc890).setAlpha(0).setDepth(DEPTH.decals + 1);
  }

  // The lights go down on these two.
  start(boss, hero) {
    this.build();
    this.pair = [boss, hero];
    this.wide = 1;
    this.dark = LOOK.dark;
    this.fade(1, LOOK.in, 'Sine.easeInOut');
  }

  // The blow: the pool opens out so the head is seen to go, and the room lifts a little.
  strike() {
    if (!this.pair) return;
    this.scene.tweens.add({ targets: this, wide: LOOK.open, dark: LOOK.darkAfter, duration: 380, ease: 'Quad.easeOut' });
  }

  // The lights come back up.
  stop() {
    if (!this.pair) return;
    this.fade(0, LOOK.out, 'Sine.easeInOut', () => { this.pair = null; });
  }

  fade(to, ms, ease, done) {
    this.tween?.stop();
    this.tween = this.scene.tweens.add({ targets: this, k: to, duration: ms, ease, onComplete: done });
  }

  // Each frame: the sheet over the view, the hole and the light on the pair where they stand now.
  update() {
    if (!this.rt) return;
    const on = this.pair && this.k > 0.001;
    this.rt.setVisible(!!on);
    this.shaft.setVisible(!!on);
    this.pool.setVisible(!!on);
    if (!on) return;
    const cam = this.scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    this.rt.setPosition(cx, cy);
    // the pair: their middles (a dead boss's pieces fly from where he knelt)
    const [b, h] = this.pair;
    const mid = (f) => ({ x: f.x, y: f.z - f.h - f.stats.body.h * (f.stats.size ?? 1) * 0.45, feet: f.z });
    const A = mid(b);
    const B = mid(h);
    const x = (A.x + B.x) / 2;
    const y = (A.y + B.y) / 2;
    const feet = Math.max(A.feet, B.feet);
    const rx = (Math.abs(A.x - B.x) / 2 + LOOK.padX) * this.wide;
    const ry = LOOK.ry * this.wide;
    this.rt.clear();
    this.rt.fill(LOOK.tint, this.dark * this.k);
    // (a hole erased from a sheet of this alpha leaves the middle clear)
    this.brush.setPosition(x - cx + this.w / 2, y - cy + this.h / 2).setScale((rx * 2) / 256, (ry * 2) / 256);
    this.rt.erase(this.brush);
    // the shaft from above, its foot at their feet
    const sw = rx * 2.1;
    this.shaft.setPosition(x, feet + 16).setScale(sw / 256, (feet + 16 - (cam.worldView.y - 60)) / 512).setAlpha(LOOK.shaft * this.k);
    // a warm pool of it on the floor
    this.pool.setPosition(x, feet + 2).setScale((rx * 2.2) / 256, 54 / 256).setAlpha(0.32 * this.k);
  }

  destroy() {
    this.tween?.stop();
    this.rt?.destroy();
    this.brush?.destroy();
    this.shaft?.destroy();
    this.pool?.destroy();
    this.rt = null;
  }
}
