// Burn.js — Fire has consequences. Anything organic that sits in an erupting fire grate
// — a living enemy, a corpse, a sliced-off torso, a severed arm — soaks up heat, catches,
// and cooks: fresh → scorched → roasted brown → charred. Each body or part keeps its own
// burn state, so it doesn't restart, and it burns from the side that's in the flames.
//
//   heat 0 .. 1      how far gone it is (drives the colour, in stages — never a swap)
//   lit              it's burning by itself now: carries on a while after leaving the fire
//   done             fully charred: flames die to embers, then nothing — a static husk
//
// The look is tinting, not new textures: the body's own art multiplied toward roasted
// browns and near-black char, so its texture and shape stay (no flat black cut-outs, no
// swelling), with the low side darker than the high side while it spreads. Flames are a
// small shared pool of sprites; smoke and embers are a few light particles. One timer per
// burning thing, nothing per-pixel: dozens of parts can burn at once.
//
// What can burn (ArenaScene feeds these in):
//   fighters                  via f.burn, drawn by their view (applyBurn below)
//   finisher pieces           effects/SpriteCut.js
//   dismembered chunks        effects/Dismember.js

import { playSfx } from '../core/Sfx.js';

const rand = (a, b) => a + Math.random() * (b - a);

export const BURN = {
  soak: 1 / 150,     // heat per tick while in the flames (~2.5 s of fire = fully charred)
  catchAt: 0.22,     // past this it's alight (about half a second in the fire)
  self: 1 / 420,     // heat per tick it adds by itself once alight
  residual: 150,     // ticks it keeps burning after leaving the fire, if it wasn't far gone
  sustainAt: 0.5,    // past this it burns to the end wherever it is
  embers: 110,       // ticks of embers and smoke after it's fully charred
  maxFlames: 26,     // flame sprites on screen at once (shared)
  maxSmoke: 36,
};

// heat → colour the art is multiplied by. Stages: ignition (barely changed), scorching
// (soot, darkening), heavy char (roasted brown-black), burnt remains (dry, near-black
// but never pure black, so the art's own detail still reads).
const STOPS = [
  [0.00, 0xff, 0xff, 0xff],
  [0.15, 0xf4, 0xe0, 0xcc],
  [0.38, 0xd0, 0xa0, 0x7c],
  [0.62, 0x9c, 0x68, 0x48],
  [0.82, 0x6e, 0x4a, 0x38],
  [1.00, 0x50, 0x3c, 0x32],
];
export function burnColour(heat) {
  const t = Math.max(0, Math.min(1, heat));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const a = STOPS[i - 1]; const b = STOPS[i];
      const u = (t - a[0]) / (b[0] - a[0]);
      const c = (k) => Math.round(a[k] + (b[k] - a[k]) * u);
      return (c(1) << 16) | (c(2) << 8) | c(3);
    }
  }
  return 0x302520;
}

// Tint one image for a burn state: the side of it that's lowest on screen (in the fire)
// runs ahead of the side that's highest, until the whole thing has caught up.
export function applyBurn(img, burn) {
  if (!burn || burn.heat <= 0.01) return;
  const low = burnColour(Math.min(1, burn.heat * 1.3));
  const high = burnColour(Math.max(0, burn.heat * 1.3 - 0.3));
  // which texture corners are lowest on screen, given how the image is turned and flipped
  const r = img.rotation;
  const sx = Math.sign(img.scaleX) || 1;
  const sy = Math.sign(img.scaleY) || 1;
  const down = (lx, ly) => (lx * sx * Math.sin(r) + ly * sy * Math.cos(r)) > 0;
  img.setTint(down(-1, -1) ? low : high, down(1, -1) ? low : high, down(-1, 1) ? low : high, down(1, 1) ? low : high);
}

export class Burning {
  constructor(scene) {
    this.scene = scene;
    this.recs = new Map(); // thing -> burn record
    this.flames = [];
    this.smoke = [];
    this.lastSizzle = 0;
    if (!scene.textures.exists('burn-flame')) {
      const cv = document.createElement('canvas');
      cv.width = 20; cv.height = 40;
      const c = cv.getContext('2d');
      const g = c.createLinearGradient(0, 40, 0, 0);
      g.addColorStop(0, 'rgba(255,244,190,1)'); g.addColorStop(0.3, 'rgba(255,160,48,0.95)');
      g.addColorStop(0.7, 'rgba(226,58,14,0.6)'); g.addColorStop(1, 'rgba(120,10,0,0)');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(10, 0); c.bezierCurveTo(20, 20, 18, 40, 10, 40); c.bezierCurveTo(2, 40, 0, 20, 10, 0); c.fill();
      scene.textures.addCanvas('burn-flame', cv);
    }
  }

  // The burn record for a thing (made on first use). kind: 'fighter' | 'piece' | 'chunk'.
  rec(thing, kind) {
    let b = this.recs.get(thing);
    if (!b) {
      b = { kind, heat: 0, lit: false, done: false, inFire: 0, away: 0, cool: 0, seed: Math.random() * 100 };
      this.recs.set(thing, b);
      if (kind === 'fighter') thing.burn = b;
    }
    return b;
  }

  // Set something alight outright (killed by fire: it burns to the end where it falls).
  ignite(thing, kind, heat = 0.3) {
    const b = this.rec(thing, kind);
    b.heat = Math.max(b.heat, heat);
    if (!b.lit && !b.done) this.catchFire(b, thing);
    b.sustain = true;
    return b;
  }

  catchFire(b, thing) {
    b.lit = true;
    const p = this.place(thing, b);
    if (Math.abs(p.x - this.scene.player.x) < 700) playSfx(this.scene, 'fireWhoosh', { volume: 0.3, pitch: 500, spread: 200, minGapMs: 250 });
  }

  // Where a thing is and how big: { x, z, h (its underside), w, hgt, gone }
  place(thing, b) {
    if (b.kind === 'fighter') {
      const lying = thing.state === 'dead' || (thing.state === 'knockdown' && thing.lyingSince != null);
      const B = thing.stats.body;
      return { x: thing.x, z: thing.z, h: thing.h, w: lying ? B.h * 0.9 : B.w, hgt: lying ? B.w * 0.5 : B.h, gone: thing.removeMe };
    }
    if (b.kind === 'piece') {
      return { x: thing.x, z: thing.z, h: Math.max(0, thing.h - Math.abs(thing.edge ?? 10)), w: 34, hgt: Math.abs(thing.edge ?? 14) * 1.6, gone: thing.dead || !thing.img.active };
    }
    return { x: thing.x, z: thing.z, h: Math.max(0, thing.h - thing.rad), w: Math.max(thing.bw, thing.bh), hgt: Math.min(thing.bw, thing.bh), gone: thing.dead || !thing.cont.active };
  }

  // One game tick. fires: [{ x, z, w, d }] regions that are erupting right now.
  update(fires) {
    const scene = this.scene;
    // 1. what's in the flames soaks up heat
    if (fires.length) {
      const test = (thing, kind, x, z, h) => {
        for (const f of fires) {
          if (Math.abs(x - f.x) <= f.w / 2 + 6 && Math.abs(z - f.z) <= f.d / 2 + 6 && h < 44) { this.rec(thing, kind).inFire = 2; return; }
        }
      };
      // (a body that's been cut up or taken apart burns as its pieces, not as a fighter)
      for (const f of scene.world.fighters) {
        if (f.team === 'enemy' && !f.execCut && !(f.fatality && f.fatality !== 'none')) test(f, 'fighter', f.x, f.z, f.h);
      }
      for (const p of scene.cuts?.pieces ?? []) test(p, 'piece', p.x, p.z, Math.max(0, p.h - Math.abs(p.edge ?? 10)));
      for (const c of scene.gore?.dismemberer?.chunks ?? []) test(c, 'chunk', c.x, c.z, Math.max(0, c.h - c.rad));
    }

    // 2. every burning thing moves along its own timeline
    let flamesWanted = 0;
    const tick = scene.world.frame;
    for (const [thing, b] of this.recs) {
      const p = this.place(thing, b);
      if (p.gone) { this.recs.delete(thing); continue; }
      if (b.inFire > 0) {
        b.inFire--;
        b.away = 0;
        if (!b.done) b.heat = Math.min(1, b.heat + BURN.soak);
        if (!b.lit && !b.done && b.heat >= BURN.catchAt) this.catchFire(b, thing);
      } else if (b.lit) {
        b.away++;
        // out of the fire: it gutters out unless it was well alight (or was killed by fire)
        if (!b.sustain && b.heat < BURN.sustainAt && b.away > BURN.residual) b.lit = false;
      }
      if (b.lit && !b.done) {
        b.heat = Math.min(1, b.heat + BURN.self);
        if (b.heat >= 1) { b.done = true; b.lit = false; b.cool = BURN.embers; }
      }
      if (b.cool > 0) b.cool--;

      // the look: pieces and chunks are tinted here; fighters by their own view (f.burn)
      if (b.kind === 'piece') {
        applyBurn(thing.img, b);
        if (!b.base) b.base = { x: thing.img.scaleX, y: thing.img.scaleY };
        const k = 1 - 0.05 * b.heat; // dries and tightens a little; never deforms
        thing.img.setScale(b.base.x * k, b.base.y * k);
      } else if (b.kind === 'chunk') {
        for (const img of thing.cont.list) if (img.setTint) applyBurn(img, b);
        thing.wounds = false; // cooked: no more wet smears
        if (b.heat > 0.4) { thing.fountains.length = 0; thing.drips = null; }
      } else if (b.heat > 0.35) {
        thing.burnDry = true;
      }
      if (b.kind === 'piece' && b.heat > 0.4) thing.bleed = 0; // cauterised

      // flames, smoke, embers — in proportion, and only near the camera
      const near = Math.abs(p.x - scene.cameras.main.midPoint.x) < 620;
      if (!near) continue;
      const fierce = b.lit ? 0.45 + 0.55 * Math.sin(Math.min(1, b.heat * 1.4) * Math.PI) : 0;
      if (b.lit) {
        const n = p.w > 50 ? 3 : p.w > 26 ? 2 : 1;
        for (let i = 0; i < n && flamesWanted < BURN.maxFlames; i++) {
          const fl = this.flame(flamesWanted++);
          const u = ((i + 0.5) / n - 0.5) * p.w * 0.8 + Math.sin(tick * 0.31 + b.seed + i * 2.1) * 3;
          const lift = Math.min(p.hgt * 0.55, 30) * (0.3 + 0.7 * Math.abs(Math.sin(b.seed + i * 1.7)));
          const hgt = (14 + p.hgt * 0.28) * fierce * (0.8 + 0.25 * Math.sin(tick * 0.9 + i * 1.3 + b.seed));
          fl.setVisible(true).setPosition(p.x + u, p.z - p.h - lift).setDisplaySize(7 + hgt * 0.32, Math.max(6, hgt))
            .setDepth(p.z + 0.9).setAlpha(0.9);
        }
        if (tick % 5 === 0) this.puff(p.x + rand(-p.w, p.w) * 0.35, p.z, p.h + p.hgt * 0.6, 0.5);
        if (tick % 7 === 0) this.ember(p);
        if (tick - this.lastSizzle > 34 && Math.abs(p.x - scene.player.x) < 500) {
          this.lastSizzle = tick + Math.floor(rand(0, 20));
          playSfx(scene, 'fireWhoosh', { volume: 0.09 + 0.06 * fierce, pitch: 1100 + rand(-200, 300), spread: 200, minGapMs: 200 }); // crackle / sizzle
        }
      } else if (b.cool > 0) {
        if (tick % 9 === 0) this.puff(p.x + rand(-p.w, p.w) * 0.3, p.z, p.h + p.hgt * 0.5, 0.35 * (b.cool / BURN.embers));
        if (tick % 16 === 0) this.ember(p);
      }
    }
    for (let i = flamesWanted; i < this.flames.length; i++) this.flames[i].setVisible(false);

    // 3. smoke drifts up and thins
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.life--;
      s.img.y -= s.vy; s.img.x += s.vx; s.vy *= 0.985;
      const t = s.life / s.max;
      s.img.setAlpha(s.a * t).setScale(s.s * (1.9 - t));
      if (s.life <= 0) { s.img.destroy(); this.smoke.splice(i, 1); }
    }
  }

  flame(i) {
    while (this.flames.length <= i) {
      this.flames.push(this.scene.add.image(0, 0, 'burn-flame').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    }
    return this.flames[i];
  }

  puff(x, z, h, alpha) {
    if (this.smoke.length >= BURN.maxSmoke) return;
    const img = this.scene.add.image(x, z - h, 'dot').setTint(0x1a1512).setDepth(z + 1.2);
    const life = Math.floor(rand(40, 70));
    this.smoke.push({ img, life, max: life, vy: rand(0.5, 1.1), vx: rand(-0.25, 0.25), a: alpha, s: rand(0.8, 1.5) });
  }

  ember(p) {
    this.scene.gore.spawn({
      x: p.x + rand(-p.w, p.w) * 0.4, z: p.z + rand(-2, 2), h: p.h + rand(2, p.hgt * 0.6),
      vx: rand(-25, 25), vz: 0, vh: rand(110, 230), tint: Math.random() < 0.5 ? 0xffb040 : 0xff6a20,
      scale: rand(0.15, 0.3), decal: false, life: Math.floor(rand(16, 30)),
    });
  }

  clear() {
    for (const f of this.flames) f.destroy();
    for (const s of this.smoke) s.img.destroy();
    this.flames = []; this.smoke = []; this.recs.clear();
  }
}
