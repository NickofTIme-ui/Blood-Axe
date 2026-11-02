// BloodCoat.js — EXPERIMENT (2026-11-02): the heroes get spattered with blood as they cut
// men down. Each close kill lands a few painted splats on the hero (front of the body =
// the side he faces); their drips run down him over the next second. The splats sit on
// a little canvas that rides on him, masked by his current frame, so blood only ever
// lands on him, whatever pose he's in. Each splat stays wet a while, then dries off;
// he's washed clean when he's knocked out and gets back up.
//
// The splats are cut from a ChatGPT-painted sheet (assets/fx/hero-blood-splats.png,
// frames in data/heroBloodSplats.js). Until that sheet is in, code-drawn stand-ins.
//
// Tuning: BLOOD below. Only heroes (fighters with a style meter) get a coat.

import { depthScale } from './depths.js';
import { HERO_BLOOD_SPLATS } from '../data/heroBloodSplats.js';

export const BLOOD = {
  reach: 260,        // kills further off than this (spells, thrown knives) leave no blood on him
  fullReach: 90,     // within this he gets the whole spray
  splats: 2,         // splats per ordinary close kill...
  goreSplats: 4,     // ...and when the man came apart (or was executed)
  size: [16, 34],    // how wide a splat lands on him, in world px (smallest, biggest)
  dripTicks: 70,     // how long a fresh splat's drips take to run down
  wetFor: 1200,      // ticks a splat stays as it landed (20 s)...
  dryFor: 2400,      // ...then how long it takes to fade off him (40 s)
  most: 48,          // splats on him at once (the oldest go first)
  alpha: 0.95,       // how solid the coat is drawn
};

const RES = 2;     // the canvas is drawn at twice world resolution (crisp splats, no blur)
const W = 240;     // the canvas, in world px at depth scale 1 (feet at its bottom middle)
const H = 280;
const HEAD = 0.42; // the top part of a splat that lands at once; the rest (the drips) runs down

// How much of a spray a kill puts on the attacker: 0 (none) .. goreSplats (point blank).
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

// The splat pictures: [{ key, frame, w, h }] — the painted sheet's, else the stand-ins.
function stampSet(scene) {
  if (scene.heroBloodStamps) return scene.heroBloodStamps;
  const out = [];
  const key = 'hero-blood-splats';
  if (scene.textures.exists(key) && HERO_BLOOD_SPLATS.length) {
    const tex = scene.textures.get(key);
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    HERO_BLOOD_SPLATS.forEach(([x, y, w, h], i) => {
      if (!tex.has(`s${i}`)) tex.add(`s${i}`, 0, x, y, w, h);
      out.push({ key, frame: `s${i}`, w, h });
    });
  } else {
    const g = scene.make.graphics({ add: false });
    for (let i = 0; i < 8; i++) {
      const k = `hero-blood-fallback-${i}`;
      if (!scene.textures.exists(k)) { drawStandIn(g.clear(), rngOf(31 + i * 977)); g.generateTexture(k, 64, 120); }
      out.push({ key: k, frame: undefined, w: 64, h: 120 });
    }
    g.destroy();
  }
  scene.heroBloodStamps = out;
  return out;
}

// A code-drawn splat (64 x 120: the splash up top, drips running down from it), used
// only until the painted sheet is in.
function drawStandIn(g, r) {
  const C = [0x5a040a, 0x7e0a12, 0xa0121a];
  const cx = 32; const cy = 26;
  g.fillStyle(C[0], 1);
  for (let i = 0; i < 5; i++) g.fillCircle(cx + (r() - 0.5) * 22, cy + (r() - 0.5) * 16, 8 + r() * 7);
  g.fillStyle(C[1], 1);
  for (let i = 0; i < 4; i++) g.fillCircle(cx + (r() - 0.5) * 16, cy + (r() - 0.5) * 10, 6 + r() * 5);
  for (let i = 0; i < 3; i++) {
    const x = cx + (r() - 0.5) * 30; const len = 30 + r() * 55; const w = 2.5 + r() * 2.5;
    g.fillStyle(C[1], 1);
    for (let t = 0; t <= 1; t += 0.05) g.fillCircle(x, cy + 6 + len * t, w * (1 - t * 0.45));
    g.fillCircle(x, cy + 6 + len, w * 1.15);
    g.fillStyle(0xffd0d0, 0.8).fillCircle(x - w * 0.35, cy + 6 + len - w * 0.3, w * 0.35);
  }
  g.fillStyle(0xff9a9a, 0.75).fillCircle(cx - 6, cy - 6, 3).fillCircle(cx + 4, cy - 2, 1.6);
}

class Coat {
  constructor(scene, fighter) {
    this.scene = scene;
    this.f = fighter;
    this.rt = scene.add.renderTexture(0, 0, W * RES, H * RES).setOrigin(0.5, 1).setAlpha(0);
    this.maskImg = null;
    this.view = null;
    this.stamps = [];   // the splats on him: { s (picture), x, y, sc, flip, born }
    this.dirty = false;
    this.wasDown = false;
    this.brush = scene.make.image({ x: 0, y: 0, key: '__WHITE' }, false);
    this.rand = rngOf(fighter.id * 7919 + 13);
  }

  get level() { return this.stamps.length; }

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
  spray(n, tick) {
    const r = this.rand;
    const body = this.f.stats.body;
    const set = stampSet(this.scene);
    let count = Math.floor(n) + (r() < n % 1 ? 1 : 0);
    for (; count > 0; count--) {
      const s = set[Math.floor(r() * set.length)];
      const wide = BLOOD.size[0] + r() * (BLOOD.size[1] - BLOOD.size[0]);
      // x: + is the way he faces; y: up from his feet (most on the chest and arms)
      const x = W / 2 + (r() * 1.1 - 0.35) * body.w * 1.1;
      const y = H - body.h * (0.35 + r() * 0.62);
      const sc = wide / s.w;
      this.stamps.push({ s, x, y: y - s.h * sc * HEAD * 0.5, sc, flip: r() < 0.5, born: tick });
    }
    while (this.stamps.length > BLOOD.most) this.stamps.shift();
    this.dirty = true;
  }

  // Repaints the canvas from the splats on him (only while something on it is changing).
  redraw(tick) {
    const rt = this.rt;
    const b = this.brush;
    rt.clear();
    if (!this.stamps.length) return;
    rt.beginDraw();
    for (const st of this.stamps) {
      const age = tick - st.born;
      const run = Math.min(1, age / BLOOD.dripTicks);
      const reveal = HEAD + (1 - HEAD) * (1 - (1 - run) ** 2); // (runs fast, then slows)
      const dry = Math.max(0, age - BLOOD.wetFor) / BLOOD.dryFor;
      b.setTexture(st.s.key, st.s.frame).setOrigin(0.5, 0).setFlipX(st.flip)
        .setScale(st.sc * RES).setAlpha(1 - dry)
        .setCrop(0, 0, st.s.w, st.s.h * reveal);
      rt.batchDraw(b, st.x * RES, st.y * RES);
    }
    rt.endDraw();
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

    // old splats gone dry fall off
    const life = BLOOD.wetFor + BLOOD.dryFor;
    if (this.stamps.length && tick - this.stamps[0].born >= life) {
      this.stamps = this.stamps.filter((st) => tick - st.born < life);
      this.dirty = true;
    }
    // repaint while drips are running (every tick) or splats are drying (every few ticks)
    const running = this.stamps.some((st) => tick - st.born <= BLOOD.dripTicks);
    const drying = this.stamps.some((st) => tick - st.born > BLOOD.wetFor);
    if (this.dirty || running || (drying && tick % 6 === 0)) {
      this.redraw(tick);
      this.dirty = false;
    }

    const m = this.maskImg;
    m.setTexture(s.texture.key, s.frame.name).setOrigin(s.originX, s.originY)
      .setPosition(s.x, s.y).setScale(s.scaleX, s.scaleY).setAngle(s.angle);
    const k = depthScale(f.z) / RES;
    const on = this.stamps.length > 0 && s.visible && s.alpha > 0 && !(f.flash > 0); // (not over the white hit flash)
    this.rt.setVisible(on);
    if (!on) return;
    this.rt.setPosition(s.x, s.y).setScale(k * Math.sign(s.scaleX || 1), k).setAngle(s.angle)
      .setDepth(s.depth + 0.01).setAlpha(BLOOD.alpha * s.alpha);
  }

  clear() {
    this.stamps = [];
    this.rt.clear();
  }

  destroy() {
    this.rt.clearMask(true);
    this.rt.destroy();
    this.maskImg?.destroy();
    this.brush.destroy();
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
    if (n > 0) this.coatFor(e.attacker)?.spray(n, this.scene.world?.frame ?? 0);
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
