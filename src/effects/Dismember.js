// Dismember.js — Takes an enemy's paper doll apart (see view/EnemyView.snapshot()).
//
// A CHUNK is a group of body-part images that moves as one piece:
//   'fly'    thrown pieces (a head, an arm, the top half): arc, spin, bounce, settle flat
//   'topple' what's left standing: stands a moment, then falls over from the feet
// Chunks carry FOUNTAINS — pulsing blood jets from stumps and cut lines — and leave
// trails and splats on the floor. Pieces stay on the ground for a while, then fade.
//
// Fatalities (chosen in combat/Fatality.js):
//   limbs, decap, headPop, halfH (waist), halfV (down the middle), explode

import { S as GS, woundTex, boneStubTex, bandTex, pieceTex, kindForCut } from './goreArt.js';
import { GutRope } from './GutRope.js';

const G = 1500;
// old loose-bit names -> painted pieces (effects/goreArt.js)
const PIECE_OF = { gut: 'gutLoop', meat1: 'meat', meat2: 'meat', meat3: 'meat', bone: 'boneShard', skullBit: 'skullShard', eyeball: 'eyeball', organ: 'organ', sinew: 'sinew' };
const DT = 1 / 60;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const hex = (s) => parseInt(s.slice(1), 16);

// Texture pixel (u, v) of a part snapshot -> world screen point.
function partPoint(s, u, v) {
  const dx = (u - s.ox) * s.sx;
  const dy = (v - s.oy) * s.sy;
  const c = Math.cos(s.rot);
  const n = Math.sin(s.rot);
  return { x: s.x + dx * c - dy * n, y: s.y + dx * n + dy * c };
}
// Screen direction a part's "down" (its length) points to.
const partDown = (s) => Math.atan2(Math.cos(s.rot) * Math.sign(s.sy), -Math.sin(s.rot) * Math.sign(s.sy));

class Chunk {
  constructor(sys, { items, pivot, z, mode = 'fly', h = null }) {
    this.sys = sys;
    const scene = sys.scene;
    this.cont = scene.add.container(pivot.x, pivot.y);
    this.x = pivot.x;
    this.z = z;
    this.h = h ?? z - pivot.y;
    this.mode = mode;
    this.vx = 0; this.vz = 0; this.vh = 0;
    this.rot = 0; this.spin = 0; this.angVel = 0;
    this.delay = 0; this.stand = 0; this.fallDir = 1;
    this.sep = { x: 0, y: 0 };
    this.fountains = [];
    this.age = 0;
    this.restTime = 0;
    this.rested = false;
    this.landed = false;
    this.trail = true;
    let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
    for (const it of items) {
      const s = it.snap;
      const img = scene.add.image(s.x - pivot.x, s.y - pivot.y, s.key)
        .setOrigin(s.ox / s.def.w, s.oy / s.def.h).setScale(s.sx, s.sy).setRotation(s.rot);
      if (it.crop) img.setCrop(...it.crop);
      if (it.tint ?? (s.tint !== 0xffffff ? s.tint : null)) img.setTint(it.tint ?? s.tint);
      this.cont.add(img);
      const [cx, cy, cw, ch] = it.crop ?? [0, 0, s.def.w, s.def.h];
      for (const [u, v] of [[cx, cy], [cx + cw, cy], [cx, cy + ch], [cx + cw, cy + ch]]) {
        const p = partPoint(s, u, v);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
    }
    this.bw = maxX - minX;
    this.bh = maxY - minY;
    this.rad = Math.max(2, Math.min(this.bw, this.bh) * 0.4);
    this.cont.setDepth(this.z + 0.4);
  }

  // Pivot at the centre of the pieces' bounds (for flying chunks).
  static centred(sys, items, z) {
    let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
    for (const it of items) {
      const s = it.snap;
      const [cx, cy, cw, ch] = it.crop ?? [0, 0, s.def.w, s.def.h];
      for (const [u, v] of [[cx, cy], [cx + cw, cy], [cx, cy + ch], [cx + cw, cy + ch]]) {
        const p = partPoint(s, u, v);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
    }
    return new Chunk(sys, { items, pivot: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, z });
  }

  local(p) { return { x: p.x - this.cont.x, y: p.y - this.cont.y }; }

  // A straight cut through the body (waist, down the middle): a layered wound band —
  // skin, fat, muscle running along the cut, spine/bone blocks, gut in the cavity.
  // `w` = the wound look shared by both halves (same variant, so the faces match).
  edge(a, b, bone = false, w = {}) {
    const scene = this.sys.scene;
    const la = this.local(a);
    const lb = this.local(b);
    const len = Math.hypot(lb.x - la.x, lb.y - la.y);
    const ang = Math.atan2(lb.y - la.y, lb.x - la.x);
    const mid = { x: (la.x + lb.x) / 2, y: (la.y + lb.y) / 2 };
    const t = bandTex(scene, {
      lenU: len + 4, thickU: w.thick ?? 7, kind: w.kind ?? 'clean', variant: w.variant ?? 0,
      skin: w.skin ?? '#b06a48', spine: bone, guts: w.guts ?? true,
    });
    const img = scene.add.image(mid.x, mid.y, t.key).setOrigin(t.ox / t.w, t.oy / t.h)
      .setScale(t.scale * ((len + 4) / (Math.round((len + 4) / 2) * 2)), t.scale).setRotation(ang);
    if (w.flip) img.setFlipY(true);
    this.cont.add(img);
    return this;
  }

  // The cut face where a limb (or head) came off, at point p. `downAng` = the limb's
  // length direction. `w` describes the wound:
  //   widthU  limb thickness   part  upperArm|forearm|thigh|lowerLeg|neck|torso
  //   kind    clean|heavy|crush|char   variant  (both sides of one cut share it)
  //   flesh   screen angle pointing INTO this piece's flesh from the cut
  //   bone    true = a short stub of bone sticks out of this side
  stump(p, downAng, w = {}) {
    const scene = this.sys.scene;
    const l = this.local(p);
    const kind = w.kind ?? 'clean';
    const widthU = w.widthU ?? 14;
    // blood soaked into the piece around the cut, running back along it
    if (w.flesh !== undefined) {
      const len = widthU * 1.1;
      const coat = scene.add.image(l.x + Math.cos(w.flesh) * len * 0.35, l.y + Math.sin(w.flesh) * len * 0.35, 'dot')
        .setTint(0x5a0204).setAlpha(0.7).setRotation(w.flesh).setScale(len / 8, widthU * 0.95 / 8);
      this.cont.add(coat);
    }
    const t = woundTex(scene, { widthU, part: w.part ?? 'upperArm', kind, variant: w.variant ?? 0, skin: w.skin ?? '#b06a48' });
    const cap = scene.add.image(l.x, l.y, t.key).setOrigin(t.ox / t.w, t.oy / t.h).setScale(t.scale).setRotation(downAng - Math.PI / 2);
    this.cont.add(cap);
    // a short stub of broken bone poking out, pointing away from the flesh
    if (w.bone && w.flesh !== undefined) {
      const b = boneStubTex(scene, { widthU, kind, variant: w.variant ?? 0 });
      const out = w.flesh + Math.PI;
      const stub = scene.add.image(l.x, l.y, b.key).setOrigin(b.ox / b.w, b.oy / b.h).setScale(b.scale).setRotation(out + Math.PI / 2);
      this.cont.add(stub);
    }
    this.wounds = (this.wounds ?? 0) + 1;
    return this;
  }

  // A slow drip from a wound after the first spray (keeps the cut looking wet).
  drip(p, ang, frames = 240) {
    const l = this.local(p);
    this.drips = this.drips ?? [];
    this.drips.push({ lx: l.x, ly: l.y, ang, life: frames });
    return this;
  }

  // A pulsing blood jet from point p, aimed at screen angle `ang`.
  fountain(p, ang, power = 1, life = 90) {
    const l = this.local(p);
    this.fountains.push({ lx: l.x, ly: l.y, ang, power, life, max: life });
    return this;
  }

  worldPoint(lx, ly) {
    const c = Math.cos(this.rot);
    const s = Math.sin(this.rot);
    return { x: this.x + lx * c - ly * s, y: this.z - this.h + lx * s + ly * c };
  }

  update() {
    const gore = this.sys.gore;
    this.age++;
    if (this.delay > 0) {
      this.delay--;
      this.x += this.sep.x;
      this.h -= this.sep.y;
      this.draw();
      return;
    }

    if (this.mode === 'fly') {
      this.vh -= G * DT;
      this.x += this.vx * DT;
      this.z += this.vz * DT;
      this.h += this.vh * DT;
      this.rot += this.spin * DT;
      if (this.h <= this.rad) {
        this.h = this.rad;
        if (this.vh < -160) {
          // heavy wet thud: small bounce, loses most of its spin
          if (!this.landed) gore.burst(this.x, this.z, 2, Math.sign(this.vx) || 1, Math.round(10 * gore.amount), 0.5);
          this.landed = true;
          this.vh = -this.vh * 0.2;
          this.vx *= 0.6; this.vz *= 0.45; this.spin *= 0.4;
          gore.splat(this.x, this.z, 1 + this.rad / 6);
        } else {
          // sliding on the wet floor: brief, smearing blood, then it stops dead
          this.vh = 0;
          this.vx *= 0.9; this.vz *= 0.85; this.spin *= 0.7;
          if (Math.abs(this.vx) > 30 && this.age % 3 === 0 && this.wounds) gore.splat(this.x, this.z, 0.7 + this.rad / 10, 0.55);
          // settle flat: long pieces lie down (eased, no wobble)
          const base = this.bh > this.bw ? Math.PI / 2 : 0;
          const target = base + Math.round((this.rot - base) / Math.PI) * Math.PI;
          this.rot += (target - this.rot) * 0.2;
          if (!this.rested && Math.abs(this.vx) < 6 && Math.abs(target - this.rot) < 0.02) {
            this.rot = target; this.vx = 0; this.vz = 0; this.spin = 0;
            this.rested = true; this.onRest();
          }
        }
      } else if (this.trail && this.age < 60 && this.age % 2 === 0 && gore.level > 0) {
        const p = this.worldPoint(0, 0);
        gore.spawn({ x: p.x, z: this.z, h: this.z - p.y, vx: this.vx * 0.15, vz: 0, vh: 0, tint: 0x7a0303, scale: 0.4 });
      }
      this.z = Math.max(this.sys.minZ, Math.min(this.sys.maxZ, this.z));
      // arena walls: knock back off them
      if (this.x < this.sys.minX) { this.x = this.sys.minX; this.vx = Math.abs(this.vx) * 0.3; this.spin *= -0.5; }
      if (this.x > this.sys.maxX) { this.x = this.sys.maxX; this.vx = -Math.abs(this.vx) * 0.3; this.spin *= -0.5; }
    } else {
      // topple: stand, then fall over around the feet
      if (this.h > 0 || this.vh > 0) {
        this.vh -= G * DT;
        this.h = Math.max(0, this.h + this.vh * DT);
        if (this.h === 0) this.vh = 0;
      }
      this.x += this.vx * DT;
      this.vx *= 0.94;
      if (this.stand > 0) {
        this.stand--;
        this.rot = Math.sin(this.age * 0.5) * 0.03;
      } else if (!this.rested) {
        const target = this.fallDir * Math.PI / 2 * 0.96;
        this.angVel += this.fallDir * 9 * DT;
        this.rot += this.angVel * DT;
        if (Math.abs(this.rot) >= Math.abs(target)) {
          this.rot = target;
          if (Math.abs(this.angVel) > 1.2) this.angVel = -this.angVel * 0.22;
          else { this.angVel = 0; this.rested = true; this.onRest(); }
          if (!this.landed) {
            this.landed = true;
            this.sys.scene.fx?.shake(2, 6);
            gore.burst(this.x + this.fallDir * this.bh * 0.5, this.z, 4, this.fallDir, Math.round(14 * gore.amount), 0.6);
          }
        }
      }
    }

    // fountains
    for (const f of this.fountains) {
      if (f.life <= 0) continue;
      f.life--;
      if (gore.level === 0) continue;
      const k = f.life / f.max;
      const pulse = 0.25 + 0.75 * Math.max(0, Math.sin(this.age * 0.3)) ** 2;
      const n = f.power * pulse * (0.4 + k) * 2.4 * gore.amount;
      const count = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
      const c = Math.cos(this.rot);
      const s = Math.sin(this.rot);
      const wx = this.x + f.lx * c - f.ly * s;
      const wy = this.z - this.h + f.lx * s + f.ly * c;
      const a = f.ang + this.rot;
      for (let i = 0; i < count; i++) {
        const sp = rand(110, 330) * f.power * (0.45 + 0.55 * k);
        const aa = a + rand(-0.28, 0.28);
        gore.spawn({
          x: wx, z: this.z + rand(-3, 3), h: Math.max(1, this.z - wy),
          vx: Math.cos(aa) * sp, vz: rand(-20, 20), vh: -Math.sin(aa) * sp,
          tint: pick([0x8a0303, 0xa10a0a, 0x6e0202, 0xb3120f]), scale: rand(0.3, 0.75),
        });
      }
    }

    // slow drips from the wounds (keeps them looking wet after the spray)
    if (this.drips && gore.level > 0) {
      for (const d of this.drips) {
        if (d.life <= 0) continue;
        d.life--;
        if (Math.random() > 0.08 + d.life / 2400) continue;
        const c = Math.cos(this.rot); const s = Math.sin(this.rot);
        const wx = this.x + d.lx * c - d.ly * s;
        const wy = this.z - this.h + d.lx * s + d.ly * c;
        const a = d.ang; // drips fall straight down whatever way the piece lies
        gore.spawn({
          x: wx + rand(-1.5, 1.5), z: this.z + rand(-2, 2), h: Math.max(1, this.z - wy),
          vx: Math.cos(a) * rand(10, 50), vz: 0, vh: -Math.sin(a) * rand(10, 50),
          tint: pick([0x6e0202, 0x8a0303, 0x5a0000]), scale: rand(0.2, 0.4),
        });
      }
    }

    if (this.rested) {
      this.restTime++;
      const life = this.sys.restFrames;
      if (this.restTime > life) {
        this.cont.alpha = Math.max(0, 1 - (this.restTime - life) / 60);
        if (this.cont.alpha <= 0) this.dead = true;
      }
    }
    this.draw();
  }

  onRest() {
    const gore = this.sys.gore;
    const big = this.bw * this.bh > 900;
    const n = big ? 7 : 2;
    const scene = this.sys.scene;
    for (let i = 0; i < n; i++) {
      scene.time.delayedCall(i * 140, () => {
        if (!gore.decals.active) return;
        gore.splat(this.x + (this.mode === 'topple' ? this.fallDir * this.bh * rand(0.2, 0.8) : rand(-8, 8)), this.z + rand(-4, 4), big ? rand(2, 3.8) : rand(0.8, 1.6), 0.6);
      });
    }
  }

  draw() {
    this.cont.setPosition(this.x, this.z - this.h);
    this.cont.rotation = this.rot;
    this.cont.setDepth(this.z + 0.4);
  }

  destroy() { this.cont.destroy(); }
}

export class Dismember {
  constructor(gore) {
    this.gore = gore;
    this.scene = gore.scene;
    this.chunks = [];
    this.ropes = [];
    this.minZ = 330;
    this.maxZ = 520;
    this.minX = 20;
    this.maxX = 3180;
    this.skin = '#b06a48';
  }

  // How this kill's wounds look: kind from the weapon, one variant for the whole body
  // (so the two sides of each cut match), the victim's own skin tone.
  woundLook(e, snap) {
    const skinRamp = snap.art.gore?.skin;
    this.skin = Array.isArray(skinRamp) ? skinRamp[3] ?? skinRamp[0] : (skinRamp ?? '#b06a48');
    return { kind: kindForCut(e.move?.cut, e.damage ?? 0), variant: Math.floor(Math.random() * 1000), skin: this.skin };
  }

  // Limb thickness (world units) from a part snapshot.
  limbWidth(s, fallback = 14) {
    if (!s) return fallback;
    return Math.max(8, Math.min(26, Math.min(s.def.w * Math.abs(s.sx), s.def.h * Math.abs(s.sy)) * 0.8));
  }

  // A rope of gut spilling out of point p, optionally still attached to a chunk.
  rope(p, z, { chunk = null, lenU = 60, dir = 0, power = 1 } = {}) {
    if (this.gore.level === 0 || this.ropes.length > 14) return null;
    const r = new GutRope(this, { x: p.x, y: p.y, z, chunk, lenU: lenU * (this.gore.level === 1 ? 0.6 : 1), dir, power });
    this.ropes.push(r);
    return r;
  }

  get restFrames() { return this.gore.level >= 2 ? 60 * 40 : 60 * 12; }

  add(chunk) {
    this.chunks.push(chunk);
    if (this.chunks.length > 140) {
      const old = this.chunks.find((c) => c.rested) ?? this.chunks[0];
      old.restTime = Math.max(old.restTime, this.restFrames);
      old.rested = true;
    }
    return chunk;
  }

  update() {
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      c.update();
      if (c.dead) { c.destroy(); this.chunks.splice(i, 1); }
    }
    for (let i = this.ropes.length - 1; i >= 0; i--) {
      const r = this.ropes[i];
      r.update();
      if (r.dead) { r.destroy(); this.ropes.splice(i, 1); }
    }
  }

  clear() {
    for (const c of this.chunks) c.destroy();
    for (const r of this.ropes) r.destroy();
    this.chunks = [];
    this.ropes = [];
  }

  // ------------------------------------------------------------ helpers

  fly(items, z, { vx = 0, vh = 0, vz = 0, spin = 0, delay = 0, sep = null } = {}) {
    const c = Chunk.centred(this, items, z);
    Object.assign(c, { vx, vh, vz, spin, delay });
    if (sep) c.sep = sep;
    return this.add(c);
  }

  topple(items, feet, z, h, { fallDir = 1, stand = 20, vx = 0, delay = 0, sep = null } = {}) {
    const c = new Chunk(this, { items, pivot: feet, z, mode: 'topple', h });
    Object.assign(c, { fallDir, stand, vx, delay });
    if (sep) c.sep = sep;
    return this.add(c);
  }

  // Loose bits: meat, organs, loops of gut, sinew, bone and skull shards, eyeballs
  // (painted in effects/goreArt.js, several variants of each).
  bits(x, y, z, kinds, count, power = 1, dir = 0) {
    count = Math.round(count * Math.max(0.35, this.gore.amount));
    for (let i = 0; i < count; i++) {
      const g = pieceTex(this.scene, PIECE_OF[pick(kinds)] ?? 'meat', Math.floor(Math.random() * 6), this.skin);
      const snap = { key: g.key, def: g, ox: g.ox, oy: g.oy, x: x + rand(-6, 6), y: y + rand(-6, 6), rot: rand(0, 6.28), sx: g.scale, sy: g.scale, tint: 0xffffff };
      const c = this.fly([{ snap }], z + rand(-6, 6), {
        vx: (dir * rand(40, 200) + rand(-160, 160)) * power,
        vh: rand(180, 520) * power,
        vz: rand(-40, 40),
        spin: rand(-16, 16),
      });
      c.trail = Math.random() < 0.5;
    }
  }

  // Tiny coloured shards (a burst skull).
  shards(x, y, z, colors, count, power = 1) {
    for (let i = 0; i < count; i++) {
      const snap = { key: 'px', def: { w: 4, h: 4 }, ox: 2, oy: 2, x: x + rand(-5, 5), y: y + rand(-5, 5), rot: rand(0, 6), sx: rand(0.4, 0.9), sy: rand(0.4, 0.9), tint: 0xffffff };
      const c = this.fly([{ snap, tint: pick(colors) }], z + rand(-5, 5), {
        vx: rand(-260, 260) * power, vh: rand(220, 620) * power, vz: rand(-40, 40), spin: rand(-20, 20),
      });
      c.trail = false;
    }
  }

  // ------------------------------------------------------------ entry points

  // e = kill event, snap = view.snapshot()
  run(type, snap, e) {
    const fn = {
      limbs: this.limbs, decap: this.decap, headPop: this.headPop,
      halfH: this.halfH, halfV: this.halfV, explode: this.explode,
    }[type];
    if (!fn) return false;
    const c = this.context(snap, e);
    c.look = this.woundLook(e, snap);
    fn.call(this, snap, e, c);
    return true;
  }

  // Wound description for one cut: shared look + where/what. bone: which side keeps the
  // protruding stub ('piece' | 'body' | null), picked per cut so it varies.
  cutLook(c, part, widthU) {
    const r = Math.random();
    const boneSide = r < 0.4 ? 'piece' : r < 0.6 ? 'body' : null;
    return { ...c.look, part, widthU, variant: c.look.variant + Math.floor(Math.random() * 4), boneSide };
  }

  context(snap, e) {
    const S = snap.parts;
    const rig = snap.art.rig;
    const t = S.torso;
    const ts = t.def.scale ?? 1; // art px per torso texture px
    const tp = (u, v) => partPoint(t, u, v);
    const feet = { x: snap.x, y: snap.y };
    return {
      // rig measurements converted to torso-texture pixels (sheet parts are bigger)
      rig: { ...rig, neck: { x: rig.neck.x / ts, y: rig.neck.y / ts }, waist: (rig.waist ?? 6) / ts },
      S, z: snap.z, facing: snap.facing, dir: e.dir || snap.facing,
      delay: 10,
      feet,
      h: snap.z - snap.y,
      neck: tp(t.ox + rig.neck.x / ts, t.oy + rig.neck.y / ts),
      shoulderF: S.armF ? partPoint(S.armF, S.armF.ox, S.armF.oy) : tp(t.ox + rig.shoulderF.x / ts, t.oy + rig.shoulderF.y / ts),
      shoulderB: S.armB ? partPoint(S.armB, S.armB.ox, S.armB.oy) : tp(t.ox + rig.shoulderB.x / ts, t.oy + rig.shoulderB.y / ts),
      torsoUp: t.rot - Math.PI / 2,
      skin: snap.art.gore.skin.map(hex),
    };
  }

  items(S, names) {
    return names.filter((n) => S[n]).map((n) => ({ snap: S[n] }));
  }

  dropHeld(S, c, names = ['weapon', 'off', 'chainEnd']) {
    for (const n of names) {
      if (!S[n]) continue;
      this.fly([{ snap: S[n] }], c.z + rand(-4, 4), {
        vx: c.dir * rand(20, 120), vh: rand(120, 260), spin: rand(-8, 8), delay: c.delay,
      }).trail = false;
    }
  }

  // --------------------------------------------------------------- LIMBS
  limbs(snap, e, c) {
    const S = c.S;
    const options = [];
    if (S.armF) options.push('armF');
    if (S.armB) options.push('armB');
    options.push(Math.random() < 0.5 ? 'legF' : 'legB');
    const n = Math.min(options.length, 1 + (Math.random() < 0.55 ? 1 : 0) + ((e.damage ?? 0) > 20 ? 1 : 0));
    const cut = options.sort(() => Math.random() - 0.5).slice(0, n);
    const bodyNames = ['torso', 'head', 'skirt', 'thighF', 'shinF', 'thighB', 'shinB', 'armF', 'armB'];
    const body = new Set(bodyNames);
    const fountains = [];
    let legCut = null;

    for (const limb of cut) {
      let names;
      let root;
      if (limb === 'armF') { names = ['armF', 'weapon', 'chainEnd']; root = S.armF; }
      else if (limb === 'armB') { names = ['armB', 'off']; root = S.armB; }
      else {
        const k = limb === 'legF' ? 'F' : 'B';
        names = [`thigh${k}`, `shin${k}`];
        root = S[`thigh${k}`];
        legCut = limb;
      }
      if (!root) continue;
      for (const nm of names) body.delete(nm);
      const joint = partPoint(root, root.ox, root.oy);
      const down = partDown(root);
      const look = this.cutLook(c, limb.startsWith('arm') ? 'upperArm' : 'thigh', this.limbWidth(root));
      // the piece inherits the blow's momentum and tumbles away from the body
      const piece = this.fly(this.items(S, names), c.z + rand(-4, 4), {
        vx: c.dir * rand(120, 280) + rand(-60, 60), vh: rand(260, 480), spin: c.dir * rand(6, 14) + rand(-4, 4), delay: c.delay,
        sep: { x: Math.cos(down) * 0.25, y: Math.sin(down) * 0.25 },
      });
      piece.stump(joint, down, { ...look, flesh: down, bone: look.boneSide === 'piece' })
        .fountain(joint, down + Math.PI, 0.6, 45).drip(joint, Math.PI / 2, 300);
      fountains.push({ p: joint, ang: down + Math.PI, look });
      this.gore.burst(joint.x, c.z, c.z - joint.y, c.dir, Math.round(28 * this.gore.amount), 1.1);
    }

    const keep = [...body];
    const bodyChunk = this.topple(this.items(S, keep), c.feet, c.z, c.h, {
      fallDir: legCut ? (legCut === 'legF' ? c.facing : -c.facing) : c.dir,
      stand: legCut ? 4 : 14, vx: c.dir * 40, delay: c.delay,
    });
    for (const f of fountains) {
      // the matching face on the body: same wound, flesh on the other side
      bodyChunk.stump(f.p, f.ang - Math.PI, { ...f.look, flesh: f.ang, bone: f.look.boneSide === 'body' })
        .fountain(f.p, f.ang - Math.PI, 1.1, 130).drip(f.p, Math.PI / 2, 420);
    }
    if (!cut.includes('armF')) this.dropHeld(S, c, ['weapon', 'chainEnd']);
    if (!cut.includes('armB')) this.dropHeld(S, c, ['off']);
    this.gore.burst(c.neck.x, c.z, c.z - c.neck.y + 10, c.dir, Math.round(30 * this.gore.amount), 1);
  }

  // --------------------------------------------------------------- DECAPITATION
  decap(snap, e, c) {
    const S = c.S;
    if (!S.head) return this.limbs(snap, e, c);
    const neck = c.neck;
    const headDown = partDown(S.head);
    const head = this.fly([{ snap: S.head }], c.z + rand(-3, 3), {
      vx: c.dir * rand(90, 220), vh: rand(440, 620), spin: c.dir * rand(8, 15), delay: c.delay,
      sep: { x: c.dir * 0.3, y: -0.35 },
    });
    const hp = partPoint(S.head, S.head.ox, S.head.oy);
    const look = this.cutLook(c, 'neck', this.limbWidth(S.head, 14) * 0.62);
    head.stump(hp, headDown, { ...look, flesh: headDown + Math.PI, bone: look.boneSide === 'piece' })
      .fountain(hp, headDown, 0.5, 50).drip(hp, Math.PI / 2, 300);

    const body = this.topple(this.items(S, ['armB', 'thighB', 'shinB', 'torso', 'thighF', 'shinF', 'skirt', 'armF']), c.feet, c.z, c.h, {
      fallDir: c.dir, stand: 38, vx: c.dir * 20, delay: c.delay,
    });
    body.stump(neck, c.torsoUp + Math.PI, { ...look, flesh: c.torsoUp + Math.PI, bone: look.boneSide === 'body' })
      .fountain(neck, c.torsoUp, 1.5, 170).drip(neck, Math.PI / 2, 480);
    this.dropHeld(S, c);
    this.gore.burst(neck.x, c.z, c.z - neck.y, c.dir, Math.round(55 * this.gore.amount), 1.4);
  }

  // --------------------------------------------------------------- SKULL CRUSHED
  headPop(snap, e, c) {
    const S = c.S;
    if (!S.head) return this.limbs(snap, e, c);
    const hc = partPoint(S.head, S.head.ox, S.head.oy - 10 / (S.head.def.scale ?? 1));
    const body = this.topple(this.items(S, ['armB', 'thighB', 'shinB', 'torso', 'thighF', 'shinF', 'skirt', 'armF']), c.feet, c.z, c.h, {
      fallDir: c.dir, stand: 26, delay: 4,
    });
    const look = { ...this.cutLook(c, 'neck', this.limbWidth(S.head, 14) * 0.62), kind: 'crush' };
    body.stump(c.neck, c.torsoUp + Math.PI, { ...look, flesh: c.torsoUp + Math.PI, bone: Math.random() < 0.5 })
      .fountain(c.neck, c.torsoUp, 1.3, 140).drip(c.neck, Math.PI / 2, 480);
    this.shards(hc.x, hc.y, c.z, c.skin, Math.round(16 * Math.max(0.5, this.gore.amount)), 1);
    this.bits(hc.x, hc.y, c.z, ['skullBit', 'skullBit', 'skullBit', 'meat2', 'eyeball', 'sinew'], 7, 0.9, c.dir);
    for (let i = 0; i < 3; i++) this.gore.burst(hc.x, c.z, c.z - hc.y, c.dir * (i - 1 || 1), Math.round(40 * this.gore.amount), 1.3);
    this.gore.mist(hc.x, c.z, c.z - hc.y, 8);
    this.dropHeld(S, c);
  }

  // --------------------------------------------------------------- CUT IN HALF AT THE WAIST
  halfH(snap, e, c) {
    const S = c.S;
    const t = S.torso;
    const W = t.def.w;
    const H = t.def.h;
    const v = Math.round(t.oy + c.rig.neck.y * 0.42);
    const hw = (c.rig.waist ?? 6) + 1.5;
    const a = partPoint(t, t.ox - hw, v);
    const b = partPoint(t, t.ox + hw + 1, v);
    const mid = partPoint(t, t.ox + 0.5, v);

    const upperItems = [
      ...this.items(S, ['off', 'armB']),
      { snap: t, crop: [0, 0, W, v] },
      ...this.items(S, ['head', 'weapon', 'armF', 'chainEnd']),
    ];
    const upper = this.fly(upperItems, c.z + rand(-2, 2), {
      vx: c.dir * rand(150, 260), vh: rand(280, 400), spin: c.dir * rand(3, 7), delay: c.delay,
      sep: { x: c.dir * 0.4, y: -0.3 },
    });
    const look = { ...c.look, thick: 7 + (c.look.kind === 'heavy' ? 1.5 : 0), guts: true };
    upper.edge(a, b, true, look).fountain(mid, c.torsoUp + Math.PI, 1.1, 90).drip(mid, Math.PI / 2, 300);

    const lower = this.topple([
      ...this.items(S, ['thighB', 'shinB']),
      { snap: t, crop: [0, v, W, H - v] },
      ...this.items(S, ['thighF', 'shinF', 'skirt']),
    ], c.feet, c.z, c.h, { fallDir: Math.random() < 0.5 ? c.dir : -c.dir, stand: 30, delay: c.delay });
    lower.edge(a, b, true, { ...look, flip: true }).fountain(mid, c.torsoUp, 1.4, 170).drip(mid, Math.PI / 2, 480);

    // guts: one rope still hanging out of the legs' half, one dragged out by the top half
    this.rope(mid, c.z, { chunk: lower, lenU: rand(50, 80), dir: c.dir, power: 0.6 });
    this.rope(mid, c.z + 2, { chunk: upper, lenU: rand(35, 60), dir: c.dir, power: 0.8 });
    this.bits(mid.x, mid.y, c.z, ['gut', 'organ', 'meat1', 'meat3', 'sinew', 'organ'], 7, 0.55, c.dir);
    this.gore.burst(mid.x, c.z, c.z - mid.y, c.dir, Math.round(70 * this.gore.amount), 1.3);
    this.gore.burst(mid.x, c.z, c.z - mid.y, -c.dir, Math.round(30 * this.gore.amount), 0.8);
  }

  // --------------------------------------------------------------- SPLIT DOWN THE MIDDLE
  halfV(snap, e, c) {
    const S = c.S;
    const t = S.torso;
    const hd = S.head;
    const sk = S.skirt;
    const u = Math.round(t.ox + 0.5);
    const hu = hd ? Math.round(hd.ox + 1 / (hd.def.scale ?? 1)) : 0;
    const su = sk ? Math.round(sk.ox) : 0;
    const crop = (s, cu, front) => (front ? [cu, 0, s.def.w - cu, s.def.h] : [0, 0, cu, s.def.h]);
    const half = (front) => {
      const side = front ? 'F' : 'B';
      const list = [];
      if (!front) list.push(...this.items(S, ['off', 'armB']));
      list.push(...this.items(S, [`thigh${side}`, `shin${side}`]));
      list.push({ snap: t, crop: crop(t, u, front) });
      if (sk) list.push({ snap: sk, crop: crop(sk, su, front) });
      if (hd) list.push({ snap: hd, crop: crop(hd, hu, front) });
      if (front) list.push(...this.items(S, ['weapon', 'armF', 'chainEnd']));
      return list;
    };
    const top = partPoint(t, u, t.oy + c.rig.neck.y + 2);
    const bottom = partPoint(t, u, t.oy + 1);
    const htop = hd ? partPoint(hd, hu, 5 / (hd.def.scale ?? 1)) : top;
    const hbot = hd ? partPoint(hd, hu, hd.oy - 2 / (hd.def.scale ?? 1)) : top;
    const f = c.facing;
    const gapF = f > 0 ? Math.PI + 0.55 : -0.55;   // front half sprays back across the gap
    const gapB = f > 0 ? -0.55 : Math.PI + 0.55;

    const gutsFront = Math.random() < 0.5;
    for (const front of [true, false]) {
      const dirSide = front ? f : -f;
      const ch = this.topple(half(front), { x: c.feet.x + dirSide * 1, y: c.feet.y }, c.z + (front ? 1 : -1), c.h, {
        fallDir: dirSide, stand: 10, vx: dirSide * 45, delay: c.delay,
        sep: { x: dirSide * 0.35, y: 0 },
      });
      const look = { ...c.look, thick: 6, guts: true, flip: !front };
      ch.edge(top, bottom, true, look);
      if (hd) ch.edge(htop, hbot, false, { ...look, thick: 4.5, guts: false });
      const ang = front ? gapF : gapB;
      const midP = { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 };
      ch.fountain(midP, ang, 1.1, 120)
        .fountain(hbot, ang - 0.4 * dirSide, 0.8, 90)
        .fountain(bottom, ang, 0.8, 100)
        .drip(midP, Math.PI / 2, 420);
      // the belly spills out of whichever half the guts stayed in
      if (front === gutsFront) this.rope(bottom, c.z, { chunk: ch, lenU: rand(45, 75), dir: dirSide, power: 0.4 });
    }
    for (let i = 0; i <= 4; i++) {
      const p = { x: htop.x + (bottom.x - htop.x) * (i / 4), y: htop.y + (bottom.y - htop.y) * (i / 4) };
      this.gore.burst(p.x, c.z, c.z - p.y, i % 2 ? 1 : -1, Math.round(22 * this.gore.amount), 1);
    }
    this.bits(bottom.x, bottom.y, c.z, ['gut', 'organ', 'meat1', 'meat2', 'sinew'], 6, 0.35, 0);
  }

  // --------------------------------------------------------------- BLOWN TO PIECES
  explode(snap, e, c) {
    const S = c.S;
    const center = partPoint(S.torso, S.torso.ox, S.torso.oy - 10);
    const fire = e.move?.cut === 'fire';
    const pieces = [];
    const t = S.torso;
    const u = Math.round(t.ox);
    const v = Math.round(t.oy + c.rig.neck.y * 0.5);
    for (const crop of [[0, 0, u, v], [u, 0, t.def.w - u, v], [0, v, u, t.def.h - v], [u, v, t.def.w - u, t.def.h - v]]) {
      pieces.push([{ snap: t, crop }]);
    }
    if (S.head) {
      const hu = Math.round(S.head.ox + 1 / (S.head.def.scale ?? 1));
      pieces.push([{ snap: S.head, crop: [0, 0, hu, S.head.def.h] }]);
      pieces.push([{ snap: S.head, crop: [hu, 0, S.head.def.w - hu, S.head.def.h] }]);
    }
    const LIMB_PART = { armF: 'upperArm', armB: 'upperArm', thighF: 'thigh', thighB: 'thigh', shinF: 'lowerLeg', shinB: 'lowerLeg' };
    for (const n of ['armF', 'armB', 'thighF', 'shinF', 'thighB', 'shinB', 'weapon', 'off', 'chainEnd', 'skirt']) {
      if (S[n]) pieces.push([{ snap: S[n], limb: LIMB_PART[n] }]);
    }
    const look = { ...c.look, kind: fire ? 'char' : (c.look.kind === 'clean' ? 'crush' : c.look.kind) };
    for (const items of pieces) {
      if (fire && Math.random() < 0.6) for (const it of items) it.tint = 0x7a5a4c;
      const ch = this.fly(items, c.z + rand(-10, 10), { vz: rand(-60, 60), delay: 6 });
      const away = Math.sign(ch.x - center.x) || c.dir;
      ch.vx = away * rand(60, 260) + c.dir * rand(60, 200);
      ch.vh = rand(360, 760);
      ch.spin = rand(-18, 18);
      // torn-off limbs get a ragged wound where they ripped free (hip, shoulder, knee)
      const s = items[0].snap;
      if (items[0].limb) {
        const joint = partPoint(s, s.ox, s.oy);
        const down = partDown(s);
        ch.stump(joint, down, { ...look, part: items[0].limb, widthU: this.limbWidth(s), variant: look.variant + pieces.indexOf(items), flesh: down, bone: Math.random() < 0.5 })
          .drip(joint, Math.PI / 2, 200);
      }
      if (Math.random() < 0.5) ch.fountain({ x: ch.x, y: ch.z - ch.h }, -Math.PI / 2 + rand(-1, 1), 0.5, 40);
    }
    this.rope(center, c.z, { lenU: rand(40, 70), dir: c.dir, power: 1.4 });
    if (Math.random() < 0.6) this.rope(center, c.z + 3, { lenU: rand(30, 50), dir: -c.dir, power: 1.2 });
    this.bits(center.x, center.y, c.z, ['meat1', 'meat2', 'organ', 'meat1', 'bone', 'gut', 'skullBit', 'eyeball', 'sinew', 'organ'], 18, 1.2, c.dir);
    this.shards(center.x, center.y, c.z, c.skin, 12, 1.2);
    for (let i = 0; i < 4; i++) this.gore.burst(center.x, c.z, c.z - center.y, i % 2 ? 1 : -1, Math.round(60 * this.gore.amount), 1.8);
    this.gore.mist(center.x, c.z, c.z - center.y, 14);
    this.gore.scorch(center.x, c.z, fire);
    if (fire) this.gore.spark(center.x, c.z, c.z - center.y, 0xff9a30, 30);
  }

  // --------------------------------------------------------------- ARM OFF (enemy lives)
  maim(snap, e) {
    const S = snap.parts;
    const armName = e.limb;
    const arm = S[armName];
    if (!arm) return;
    const names = armName === 'armF' ? ['armF', 'weapon', 'chainEnd'] : ['armB', 'off'];
    const joint = partPoint(arm, arm.ox, arm.oy);
    const down = partDown(arm);
    const dir = e.dir || snap.facing;
    const look = this.woundLook(e, snap);
    const piece = this.fly(this.items(S, names), snap.z + rand(-3, 3), {
      vx: dir * rand(140, 260), vh: rand(300, 460), spin: dir * rand(8, 16), delay: 4,
    });
    // the living enemy keeps the other face (view/EnemyView.js draws it on the shoulder)
    piece.stump(joint, down, { ...look, part: 'upperArm', widthU: this.limbWidth(arm), flesh: down, bone: Math.random() < 0.45 })
      .fountain(joint, down + Math.PI, 0.6, 50).drip(joint, Math.PI / 2, 300);
    this.gore.burst(joint.x, snap.z, snap.z - joint.y, dir, Math.round(40 * this.gore.amount), 1.2);
  }
}
