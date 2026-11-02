// BloodCoat.js — EXPERIMENT (2026-11-02): the heroes get spattered with blood as they cut
// men down. Each close kill stamps a few splats onto a little canvas that rides on the
// hero (front of the body = the side he faces); the canvas is masked by his current
// frame, so the blood only ever lands on him, whatever pose he's in. It dries off slowly
// and is gone when he's knocked out and gets back up.
//
// STAND-IN ART: the splats are code-drawn blobs and drips. If this is kept, ChatGPT
// paints a sheet of splat stamps to swap in for drawSplat().
//
// Tuning: BLOOD below. Only heroes (fighters with a style meter) get a coat.

import { depthScale } from './depths.js';

export const BLOOD = {
  reach: 260,        // kills further off than this (spells, thrown knives) leave no blood on him
  fullReach: 90,     // within this he gets the whole spray
  splats: 2,         // splats per ordinary close kill...
  goreSplats: 4,     // ...and when the man came apart (or was executed)
  fadeEvery: 60,     // ticks between drying passes
  fadeBy: 0.015,     // how much of the blood each pass dries off (~60 s to fade to 40%)
  alpha: 0.9,        // how solid the coat is drawn
  colors: [0x7a0610, 0x960b14, 0xb0121b, 0x8a0812],
};

const W = 240; // the canvas, in world px at depth scale 1 (feet at its bottom middle)
const H = 280;

// How much of a spray a kill puts on the attacker: 0 (none) .. 1 (point blank).
export function sprayAmount(e) {
  const a = e.attacker;
  const d = e.defender;
  if (!a || !d) return 0;
  const dist = Math.hypot(a.x - d.x, (a.z - d.z) * 1.5);
  if (dist >= BLOOD.reach) return 0;
  const near = Math.min(1, (BLOOD.reach - dist) / (BLOOD.reach - BLOOD.fullReach));
  const gory = e.finisher || (e.fatality && e.fatality !== 'none');
  const fire = ['fire', 'shock'].includes(e.move?.cut) && !gory;
  if (fire) return 0; // burned, not cut: no spray
  return near * (gory ? BLOOD.goreSplats : BLOOD.splats);
}

const rngOf = (seed) => {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
};

class Coat {
  constructor(scene, fighter) {
    this.scene = scene;
    this.f = fighter;
    this.rt = scene.add.renderTexture(0, 0, W, H).setOrigin(0.5, 1).setAlpha(0);
    this.maskImg = null;
    this.view = null;
    this.level = 0;     // roughly how many splats' worth of blood is on him
    this.fadeTick = 0;
    this.wasDown = false;
    this.pen = scene.make.graphics({ add: false });
    this.eraser = scene.make.graphics({ add: false });
    this.rand = rngOf(fighter.id * 7919 + 13);
  }

  // Ties the coat to whichever view draws him now (a birthright swaps it).
  bind(view) {
    if (view === this.view) return;
    this.view = view;
    this.rt.clearMask(true);
    const s = view.sprite;
    this.maskImg = this.scene.make.image({ x: s.x, y: s.y, key: s.texture.key, frame: s.frame.name }, false);
    this.rt.setMask(this.maskImg.createBitmapMask());
  }

  // One spray: `n` splats (fractional = a chance of one more), on his front and chest.
  spray(n) {
    const r = this.rand;
    const body = this.f.stats.body;
    let count = Math.floor(n) + (r() < n % 1 ? 1 : 0);
    for (; count > 0; count--) {
      // x: + is the way he faces; y: up from his feet (most on the chest and arms)
      const x = W / 2 + (r() * 1.1 - 0.35) * body.w * 1.2;
      const y = H - body.h * (0.3 + r() * 0.75);
      this.drawSplat(x, y, 3.5 + r() * 6);
      this.level++;
    }
  }

  drawSplat(x, y, size) {
    const r = this.rand;
    const g = this.pen;
    const C = BLOOD.colors;
    g.clear();
    const col = C[Math.floor(r() * C.length)];
    // the blob: a few overlapping rounds
    g.fillStyle(col, 0.6 + r() * 0.35);
    for (let i = 0; i < 3; i++) g.fillCircle(x + (r() - 0.5) * size, y + (r() - 0.5) * size * 0.8, size * (0.35 + r() * 0.4));
    // flecks thrown off it (towards his back: the spray came from in front)
    g.fillStyle(C[Math.floor(r() * C.length)], 0.9);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.6 + r() * 0.8);
      const d = size * (0.9 + r() * 1.6);
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 0.8 + r() * 1.8);
    }
    // a run or two trickling down
    g.fillStyle(col, 0.9);
    for (let i = r() < 0.6 ? 2 : 1; i > 0; i--) {
      const dx = x + (r() - 0.5) * size;
      const len = size * (0.8 + r() * 2.2);
      const wd = 0.8 + r() * 1.2;
      // (a tapering run: beads that thin out, with a drop at the end)
      for (let t = 0; t <= 1; t += 0.12) g.fillCircle(dx + Math.sin(t * 5 + i) * 0.6, y + len * t, wd * (1 - t * 0.5));
      g.fillCircle(dx, y + len, wd * 0.9);
    }
    this.rt.draw(g);
  }

  update(view, tick) {
    const f = this.f;
    const s = view.sprite;
    if (!s) return;
    this.bind(view);

    // knocked out and back up again: washed clean
    const down = f.state === 'dead' || !f.alive;
    if (this.wasDown && !down) this.clear();
    this.wasDown = down;

    // drying off, a little at a time
    if (this.level > 0 && tick - this.fadeTick >= BLOOD.fadeEvery) {
      this.fadeTick = tick;
      this.level *= 1 - BLOOD.fadeBy;
      if (this.level < 0.4) this.clear();
      else {
        this.eraser.clear().fillStyle(0xffffff, BLOOD.fadeBy).fillRect(0, 0, W, H);
        this.rt.erase(this.eraser);
      }
    }

    const m = this.maskImg;
    m.setTexture(s.texture.key, s.frame.name).setOrigin(s.originX, s.originY)
      .setPosition(s.x, s.y).setScale(s.scaleX, s.scaleY).setAngle(s.angle);
    const k = depthScale(f.z);
    const on = this.level > 0 && s.visible && s.alpha > 0 && !(f.flash > 0); // (not over the white hit flash)
    this.rt.setVisible(on);
    if (!on) return;
    this.rt.setPosition(s.x, s.y).setScale(k * Math.sign(s.scaleX || 1), k).setAngle(s.angle)
      .setDepth(s.depth + 0.01).setAlpha(BLOOD.alpha * s.alpha);
  }

  clear() {
    this.rt.clear();
    this.level = 0;
  }

  destroy() {
    this.rt.clearMask(true);
    this.rt.destroy();
    this.maskImg?.destroy();
    this.pen.destroy();
    this.eraser.destroy();
  }
}

// All the heroes' coats, kept by the scene (scenes/ArenaScene.js).
export class BloodCoats {
  constructor(scene) {
    this.scene = scene;
    this.coats = new Map();
    // (bitmap masks are WebGL only: on the canvas renderer there's simply no coat)
    this.on = scene.sys.game.renderer.type === Phaser.WEBGL;
  }

  isHero(f) { return f && f.team === 'player' && f.style; }

  coatFor(f) {
    if (!this.on || !this.isHero(f)) return null;
    let c = this.coats.get(f.id);
    if (!c) { c = new Coat(this.scene, f); this.coats.set(f.id, c); }
    return c;
  }

  onKill(e) {
    if (!this.isHero(e.attacker) || e.defender?.team === 'player') return;
    const n = sprayAmount(e);
    if (n > 0) this.coatFor(e.attacker)?.spray(n);
  }

  update() {
    const tick = this.scene.world?.frame ?? 0;
    for (const [id, c] of this.coats) {
      const v = this.scene.views.get(id);
      if (!v?.sprite || !this.scene.world.fighters.includes(c.f)) { c.destroy(); this.coats.delete(id); continue; }
      c.update(v, tick);
    }
  }

  destroy() {
    for (const c of this.coats.values()) c.destroy();
    this.coats.clear();
  }
}
