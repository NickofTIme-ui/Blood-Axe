// BloodCoat.js — the heroes get bloodier as they cut men down (2026-11-02, reworked 11-03).
// ChatGPT repainted some of Rurik's sheets with him soaked in blood. Drawn whole over him,
// those repaints showed as a second Rurik (ChatGPT never paints his limbs and sword in
// quite the same place), and every other pose (all his swings) was drawn clean.
//
// Now each of his sheets has a BLOOD LAYER (tools/bake-blood-layers.py): only the blood,
// transparent everywhere else, baked onto his own drawing frame for frame from the blood
// ChatGPT painted. It's faded over him as he kills up close and dries off slowly after;
// he's washed clean when he's knocked out and gets back up.
//
// Tuning: BLOOD below. Only heroes (fighters with a style meter) get a coat.
import { HERO_HD } from '../data/heroHdAssets.js';
import { GRAB_SHEETS } from '../data/grabArt.js';
import { VEXA_SHEETS } from '../data/vexaArt.js';

// Texture key of a clean sheet -> its blood layer (half size: drawn doubled).
const layerFile = (file) => `assets/sprites/heroes-hd/blood/${file.split('/').pop().replace(/\.png$/, '')}-blood.png`;
export const BLOODIED = {
  ulric: layerFile(HERO_HD.base.file),
  ulricOath: layerFile(HERO_HD.base.file),
};
for (const s of [...HERO_HD.sheets, ...GRAB_SHEETS]) {
  if (s.hero === 'rurik' && s.baseFirst == null && (s.key === 'ulric' || s.key === 'ulricOath')) BLOODIED[`${s.key}-${s.name}`] = layerFile(s.file);
}
// Vexa (2026-11-04): her sheets that have a blood layer baked (same tool, same folder:
// assets/sprites/heroes-hd/blood/vexa-rogue-<name>-blood.png; tools/bake-blood-layers.py
// --vexa, learned from ChatGPT's bloodied repaints of her run, idle and combo1). Add each
// sheet's name here as its layer lands.
export const VEXA_BLOODIED = [
  'run', 'runU', 'runD', 'sprint', 'idle', 'combo1', 'combo2', 'combo3', 'combo4', 'viper', 'moves', 'dodge', 'air', 'flip',
  'finPhantom', 'finLotus', 'finScarlet', 'react',
  // her second set (data/vexaArt.js)
  'rush', 'backstab', 'cuts', 'night', 'grab', 'moves2', 'rollUp', 'rollDown', 'block',
];
for (const s of [...HERO_HD.sheets, ...VEXA_SHEETS]) {
  if (s.hero === 'vexa' && VEXA_BLOODIED.includes(s.name)) BLOODIED[`hero-rogue-${s.name}`] = layerFile(s.file);
}
const LAYER_RES = 0.5; // the layers are baked at half his HD size

export const BLOOD = {
  reach: 260,        // kills further off than this (spells, thrown knives) leave no blood on him
  fullReach: 90,     // within this he gets the whole spray
  most: 2,           // 0 clean .. 1 bloodied .. 2 soaked
  perLevel: 0.6,     // how strongly the blood layer shows per level (1 = 0.6, 2 = full)
  perKill: 0.45,     // how much bloodier an ordinary close kill makes him...
  perGoryKill: 0.8,  // ...and one where the man came apart (or was executed)
  dryAfter: 2400,    // ticks after his last kill before he starts drying off (40 s)
  dryFor: 3600,      // ticks to dry off one level (soaked to bloodied, bloodied to clean: 60 s each)
  fadeIn: 0.06,      // how fast the blood comes up on him each tick (so a kill reads as a splash)
};

const layerKey = (file) => `blood:${file}`;

export function preloadBloodied(scene) {
  for (const file of new Set(Object.values(BLOODIED))) scene.load.image(layerKey(file), file);
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

// The blood layer of a clean frame, or null. (Its frames are added on first use, cut
// like the clean sheet's at half size.)
export function layerFor(scene, key, frame) {
  if (!BLOODIED[key]) return null;
  const bk = layerKey(BLOODIED[key]);
  if (!scene.textures.exists(bk)) return null;
  const tex = scene.textures.get(bk);
  if (!tex.has(frame)) {
    const clean = scene.textures.get(key).get(frame);
    if (!clean || clean.name !== frame) return null;
    const r = LAYER_RES;
    tex.add(frame, 0, Math.round(clean.cutX * r), Math.round(clean.cutY * r), Math.round(clean.cutWidth * r), Math.round(clean.cutHeight * r));
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return bk;
}

class Coat {
  constructor(scene, fighter) {
    this.scene = scene;
    this.f = fighter;
    this.img = scene.add.image(0, 0, '__WHITE').setVisible(false);
    this.target = 0;  // how bloodied he is (0 clean .. 1 bloodied .. 2 soaked)
    this.shown = 0;   // what's drawn (eases up to target)
    this.lastKill = -1e9;
    this.wasDown = false;
  }

  get level() { return this.target; }

  spray(n, tick) {
    this.target = Math.min(BLOOD.most, this.target + n);
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

    const show = this.shown > 0.01 && s.visible && s.alpha > 0 && !s.tintFill;
    this.draw(this.img, show && layerFor(this.scene, s.texture.key, s.frame.name), s, Math.min(1, this.shown * BLOOD.perLevel), 0.001);
  }

  // The blood layer over him, laid exactly on his sprite at alpha `a`.
  draw(img, key, s, a, above) {
    img.setVisible(!!key);
    if (!key) return;
    const k = 1 / LAYER_RES;
    img.setTexture(key, s.frame.name).setOrigin(s.originX, s.originY).setPosition(s.x, s.y)
      .setScale(s.scaleX * k, s.scaleY * k).setAngle(s.angle).setFlip(s.flipX, s.flipY)
      .setDepth(s.depth + above).setAlpha(a * s.alpha);
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
