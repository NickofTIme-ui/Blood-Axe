// BloodCoat.js — EXPERIMENT (2026-11-02): the heroes get bloodier as they cut men down.
// ChatGPT repainted his animation sheets with him already bloodied (the blood is part of
// the painting: it follows his armour and moves with him). Those repaints are lined up
// on the clean sheets and drawn over him, fading in as he kills up close and drying off
// slowly after; he's washed clean when he's knocked out and gets back up.
//
// A pose with no bloodied repaint yet is simply drawn clean (only some of Ulric's
// sheets are done: BLOODIED below).
//
// Tuning: BLOOD below. Only heroes (fighters with a style meter) get a coat.

// The bloodied repaints: texture key of the clean sheet -> its bloodied twin (same
// layout, frame for frame; made by tools/line-up-bloodied.py).
export const BLOODIED = {
  'ulric-walk2': 'assets/sprites/heroes-hd/rurik-ulric-walk2-blood.png', // (his old sword, before the birthright)
  'ulric-combo1': 'assets/sprites/heroes-hd/rurik-ulric-combo1-blood.png',
  'ulricOath-walk2': 'assets/sprites/heroes-hd/rurik-ulricOath-walk2-blood.png',
  'ulricOath-combo1': 'assets/sprites/heroes-hd/rurik-ulricOath-combo1-blood.png',
};

export const BLOOD = {
  reach: 260,        // kills further off than this (spells, thrown knives) leave no blood on him
  fullReach: 90,     // within this he gets the whole spray
  perKill: 0.25,     // how much bloodier an ordinary close kill makes him (1 = fully bloodied)...
  perGoryKill: 0.45, // ...and one where the man came apart (or was executed)
  dryAfter: 1200,    // ticks after his last kill before he starts drying off (20 s)
  dryFor: 3600,      // ticks to dry from fully bloodied to clean (60 s)
  fadeIn: 0.06,      // how fast the blood comes up on him each tick (so a kill reads as a splash)
};

const bloodKey = (k) => `${k}-blood`;

export function preloadBloodied(scene) {
  for (const [k, file] of Object.entries(BLOODIED)) scene.load.image(bloodKey(k), file);
}

// How much bloodier a kill makes the attacker: 0 (none) .. perGoryKill (point blank).
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
  return near * (gory ? BLOOD.perGoryKill : BLOOD.perKill);
}

// The bloodied twin of a clean frame, or null. (Its frames are added on first use, cut
// exactly like the clean sheet's.)
function twinFor(scene, key, frame) {
  if (!BLOODIED[key]) return null;
  const bk = bloodKey(key);
  if (!scene.textures.exists(bk)) return null;
  const tex = scene.textures.get(bk);
  if (!tex.has(frame)) {
    const clean = scene.textures.get(key).get(frame);
    if (!clean || clean.name !== frame) return null;
    tex.add(frame, 0, clean.cutX, clean.cutY, clean.cutWidth, clean.cutHeight);
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return bk;
}

class Coat {
  constructor(scene, fighter) {
    this.scene = scene;
    this.f = fighter;
    this.img = scene.add.image(0, 0, '__WHITE').setVisible(false);
    this.target = 0;  // how bloodied he is (0 clean .. 1 fully)
    this.shown = 0;   // what's drawn (eases up to target)
    this.lastKill = -1e9;
    this.wasDown = false;
  }

  get level() { return this.target; }

  spray(n, tick) {
    this.target = Math.min(1, this.target + n);
    this.lastKill = tick;
  }

  update(view, tick) {
    const f = this.f;
    const s = view.sprite;
    if (!s) return;

    // knocked out and back up again: washed clean
    const down = f.state === 'dead' || !f.alive;
    if (this.wasDown && !down) this.target = this.shown = 0;
    this.wasDown = down;

    // drying off, slowly, a while after his last kill
    if (this.target > 0 && tick - this.lastKill > BLOOD.dryAfter) this.target = Math.max(0, this.target - 1 / BLOOD.dryFor);
    this.shown += Math.sign(this.target - this.shown) * Math.min(Math.abs(this.target - this.shown), BLOOD.fadeIn);

    const bk = this.shown > 0.01 && s.visible && s.alpha > 0 && !s.tintFill ? twinFor(this.scene, s.texture.key, s.frame.name) : null;
    const img = this.img;
    img.setVisible(!!bk);
    if (!bk) return;
    img.setTexture(bk, s.frame.name).setOrigin(s.originX, s.originY).setPosition(s.x, s.y)
      .setScale(s.scaleX, s.scaleY).setAngle(s.angle).setFlip(s.flipX, s.flipY)
      .setDepth(s.depth + 0.001).setAlpha(this.shown * s.alpha);
    if (s.isTinted) img.setTint(s.tintTopLeft, s.tintTopRight, s.tintBottomLeft, s.tintBottomRight);
    else img.clearTint();
  }

  destroy() { this.img.destroy(); }
}

// All the heroes' coats, kept by the scene (scenes/ArenaScene.js).
export class BloodCoats {
  constructor(scene) {
    this.scene = scene;
    this.coats = new Map();
  }

  isHero(f) { return f && f.team === 'player' && f.style; }

  coatFor(f) {
    if (!this.isHero(f)) return null;
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
