// PropShatter.js — Props that smash well (Nick, 2026-11-02: "the destruction of the assets
// needs to be satisfying, like if a guy gets knocked flying into barrels it all smashes
// nicely, or a torch lamp post"). Nothing here is drawn in code: a prop that breaks is cut,
// at that moment, into pieces of its own painting (a barrel into tall staves, a crate into
// boards, a pot into shards, a cart into planks), and the pieces fly, spin, bounce, skid
// and settle flat in the street, where they stay a while. What it held spills out (ale
// from a barrel, straw packing from a crate, hay from a cart), a puff of dust goes up, and
// it sounds like what it is. A lamp post topples over, its lantern bursts where it lands
// and the oil burns (stage/Stage.js LAMP); a hay cart it lands on goes up.
//
// View only: the stage decides what breaks and when (stage/Stage.js CHAIN), so two
// players online see the same things smash; only where the splinters land differs.

import { DEPTH } from './depths.js';
import { FX } from './stripImporter.js';
import { playSfx } from '../core/Sfx.js';
import { PHYSICS } from '../effects/Physics.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// How each kind comes apart. pieces: how many; stretch: the cut's grain (> 1: tall pieces,
// staves and posts; < 1: wide ones, boards); res: the pieces are cut at this many texture px
// per screen px; spill: what comes out of it; sound: [key, pitch, volume] layered
export const SHATTER = {
  barrel: { pieces: 9, stretch: 3.2, spill: 'ale', dust: 0x8a7a64, sound: [['kick', -500, 0.8], ['doorClose1', 500, 0.7]] },
  crate: { pieces: 9, stretch: 0.38, spill: 'straw', dust: 0x9a8a70, sound: [['kick', -350, 0.8], ['chestClose1', 300, 0.8]] },
  chest: { pieces: 6, stretch: 0.5, dust: 0x8a7a64, sound: [['kick', -600, 0.8], ['chestClose2', -200, 0.9]] },
  urn: { pieces: 10, stretch: 1, spill: 'grain', dust: 0xb0a080, sound: [['block', 1300, 0.55], ['kick', 400, 0.5]] },
  haycart: { pieces: 14, stretch: 0.45, spill: 'hay', dust: 0xa89060, sound: [['kick', -900, 1], ['doorClose2', -300, 0.9], ['chestClose2', 200, 0.6]] },
  lamppost: { pieces: 0, dust: 0x8a7a64 },
};
const RES = 2;          // pieces cut at 2 texture px per screen px
const GRAVITY = 1500;   // px/s², the splinters
const LIE = 14000;      // ms a piece lies in the street before it fades
const MAX_PIECES = 320; // (the oldest go first)
// the spilt contents: colours, how many bits, how they fly
const SPILL = {
  ale: { colors: [0x6a4418, 0x8a5a20, 0x4a2c10], n: 26, puddle: 0x2a1a0c, wet: true },
  straw: { colors: [0xc8a860, 0xa88848, 0xe0c880], n: 22 },
  grain: { colors: [0xc8b088, 0xa89068, 0x6a5038], n: 30 },
  hay: { colors: [0xd0b060, 0xb09040, 0xe8d080, 0x8a7030], n: 60 },
};
// a lamp post's painting (assets/env/village/decor_lantern.png): where its post stands and
// where its lantern hangs, as shares of the picture (it falls about the foot of the post)
export const LAMP_ART = { postX: 0.59, lanternX: 0.25, lanternY: 0.3 };

export class PropShatter {
  constructor(view) {
    this.view = view;
    this.scene = view.scene;
    this.cuts = new Map();  // texture key -> the pieces it's cut into
    this.pieces = [];
    this.fires = new Map(); // blaze -> its flames (stage.blazes)
    this.n = 0;
  }

  // ------------------------------------------------------------ cutting

  // A texture cut into `count` pieces along the grain (`stretch`): a nearest-seed split of
  // its opaque pixels with a little noise in it, so the edges are ragged like split wood.
  cut(key, count, stretch, displayH) {
    const id = `${key}|${count}|${stretch}`;
    if (this.cuts.has(id)) return this.cuts.get(id);
    const T = this.scene.textures;
    if (!T.exists(key)) return null;
    const srcImg = T.get(key).getSourceImage();
    const r = Math.min(1, (displayH * RES) / srcImg.height);
    const W = Math.max(4, Math.round(srcImg.width * r));
    const H = Math.max(4, Math.round(srcImg.height * r));
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(srcImg, 0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    // where the painting is
    let x0 = W; let x1 = 0; let y0 = H; let y1 = 0;
    for (let p = 0; p < W * H; p++) {
      if (d[p * 4 + 3] < 100) continue;
      const x = p % W; const y = (p / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 <= x0) return null;
    // seeds on a jittered grid laid along the grain
    const bw = x1 - x0 + 1; const bh = y1 - y0 + 1;
    const cols = Math.max(1, Math.round(Math.sqrt((count * bw) / bh / stretch)));
    const rows = Math.max(1, Math.round(count / cols));
    const seeds = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        seeds.push({ x: x0 + ((i + 0.5 + rand(-0.3, 0.3)) / cols) * bw, y: y0 + ((j + 0.5 + rand(-0.3, 0.3)) / rows) * bh });
      }
    }
    const ay = 1 / Math.sqrt(stretch); const ax = Math.sqrt(stretch);
    const label = new Int16Array(W * H).fill(-1);
    const box = seeds.map(() => ({ x0: W, y0: H, x1: -1, y1: -1, n: 0 }));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const p = y * W + x;
        if (d[p * 4 + 3] < 100) continue;
        // (ragged: a little noise in the distance)
        const nz = Math.sin(x * 1.7 + y * 0.31) * Math.cos(y * 1.3 - x * 0.23) * 3;
        let best = 0; let bd = Infinity;
        for (let s = 0; s < seeds.length; s++) {
          const dx = (x - seeds[s].x) * ax; const dy = (y - seeds[s].y) * ay;
          const dd = dx * dx + dy * dy + nz * Math.abs(dx);
          if (dd < bd) { bd = dd; best = s; }
        }
        label[p] = best;
        const b = box[best];
        if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; b.n++;
      }
    }
    const out = [];
    box.forEach((b, s) => {
      if (b.n < 12) return;
      const w = b.x1 - b.x0 + 1; const h = b.y1 - b.y0 + 1;
      const pc = document.createElement('canvas');
      pc.width = w; pc.height = h;
      const pctx = pc.getContext('2d');
      const pd = pctx.createImageData(w, h);
      for (let y = b.y0; y <= b.y1; y++) {
        for (let x = b.x0; x <= b.x1; x++) {
          const p = y * W + x;
          if (label[p] !== s) continue;
          const q = ((y - b.y0) * w + (x - b.x0)) * 4;
          pd.data[q] = d[p * 4]; pd.data[q + 1] = d[p * 4 + 1]; pd.data[q + 2] = d[p * 4 + 2]; pd.data[q + 3] = 255;
        }
      }
      // a dark split edge: the raw wood where it broke
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const q = (y * w + x) * 4;
          if (!pd.data[q + 3]) continue;
          const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !pd.data[q + 3 - 4] || !pd.data[q + 3 + 4] || !pd.data[q + 3 - w * 4] || !pd.data[q + 3 + w * 4];
          if (edge) { pd.data[q] *= 0.55; pd.data[q + 1] *= 0.5; pd.data[q + 2] *= 0.45; }
        }
      }
      pctx.putImageData(pd, 0, 0);
      const tk = `shard-${this.cuts.size}-${s}-${key}`;
      if (T.exists(tk)) T.remove(tk);
      T.addCanvas(tk, pc).setFilter(Phaser.Textures.FilterMode.LINEAR);
      // where its middle sat in the painting, as shares of it (from the foot, the middle)
      out.push({ key: tk, u: (b.x0 + w / 2) / W, v: (b.y0 + h / 2) / H, w, h });
    });
    const res = { pieces: out, r, W, H };
    this.cuts.set(id, res);
    return res;
  }

  // ------------------------------------------------------------ smashing

  // The prop's picture (img: as it stood) bursts into pieces flying `dir`, `power` hard.
  burst(pr, img, dir, power = 1, { tex, scaleTo } = {}) {
    const S = SHATTER[pr.kind];
    if (!S || !img) return;
    const key = tex ?? img.texture.key;
    const dh = img.displayHeight;
    const c = S.pieces ? this.cut(key, S.pieces, S.stretch, dh) : null;
    const base = { x: img.x, y: img.y }; // (its foot, on screen: origin 0.5, 1)
    const sc = (scaleTo ?? img.displayWidth) / (c ? c.W : 1);
    const hard = 0.7 + power * 0.35;
    const tint = img.isTinted ? img.tintTopLeft : null; // (in the prop's own light: view/propGround.js)
    for (const p of c?.pieces ?? []) {
      const sx = base.x + (p.u - 0.5) * c.W * sc;
      const sy = base.y - (1 - p.v) * c.H * sc;
      const away = (p.u - 0.5) * 2; // -1 .. 1 across it
      this.addPiece({
        key: p.key, scale: sc, x: sx, z: pr.z + rand(-3, 3), h: pr.z - sy, floor: pr.y ?? 0,
        vx: (dir * rand(30, 160) + away * rand(20, 100)) * hard, vz: rand(-40, 40) * hard, vh: rand(90, 300) * (0.6 + (1 - p.v) * 0.6) * hard,
        tint, spin: rand(-14, 14) * hard, long: p.h > p.w * 1.25 ? 'v' : p.w > p.h * 1.25 ? 'h' : null,
      });
    }
    this.spill(pr, dir, power);
    this.dust(pr, S.dust, power);
    for (const [k, pitch, vol] of S.sound ?? []) playSfx(this.scene, k, { volume: vol * Math.min(1, 0.75 + power * 0.12), pitch: pitch + rand(-120, 120), minGapMs: 0 });
  }

  addPiece(o) {
    const img = this.scene.add.image(o.x, o.z - o.h, o.key).setScale(o.scale).setDepth(o.z + 0.5).setAngle(0);
    if (o.tint != null) img.setTint(o.tint);
    // (the pieces take the prop's light: the same tint as the whole)
    this.pieces.push({ ...o, img, rot: 0, rest: 0, born: this.scene.time.now, n: this.n++ });
    while (this.pieces.length > MAX_PIECES) this.pieces.shift().img.destroy();
  }

  // What it held, out across the street.
  spill(pr, dir, power) {
    const S = SPILL[SHATTER[pr.kind]?.spill];
    if (!S) return;
    const gore = this.scene.gore;
    const y = pr.y ?? 0;
    for (let i = 0; i < S.n; i++) {
      gore.spawn({
        x: pr.x + rand(-pr.w / 3, pr.w / 3), z: pr.z + rand(-4, 6), h: y + rand(4, pr.h * 0.8),
        vx: dir * rand(30, 200) * (0.7 + power * 0.25) + rand(-70, 70), vz: rand(-30, 40), vh: rand(40, S.wet ? 200 : 300),
        tint: pick(S.colors), texture: 'px', scale: S.wet ? rand(0.8, 1.6) : rand(0.6, 1.4), decal: false,
        life: S.wet ? rand(26, 50) : rand(90, 200), spin: S.wet ? 0 : rand(-12, 12), material: S.wet ? null : PHYSICS.wood,
      });
    }
    if (pr.kind === 'haycart') {
      // the hay goes up in a cloud and drifts down a while after
      for (let i = 0; i < 26; i++) {
        gore.spawn({ x: pr.x + rand(-pr.w / 2, pr.w / 2), z: pr.z + rand(-6, 10), h: y + rand(20, 70), vx: rand(-60, 60) + dir * 40, vz: rand(-10, 10), vh: rand(10, 70),
          tint: pick(S.colors), texture: 'px', scale: rand(0.5, 1), decal: false, life: rand(160, 260), spin: rand(-4, 4), material: PHYSICS.cloth ?? PHYSICS.wood });
      }
    }
    if (S.puddle) {
      // ale soaking into the mud where it stood, spreading the way it went over
      const pd = this.scene.add.ellipse(pr.x + dir * 10, pr.z + 2, 14, 5, S.puddle, 0.6).setDepth(DEPTH.floor + 3.5);
      this.scene.tweens.add({ targets: pd, width: pr.w * 1.8, height: 16, x: pr.x + dir * 26, duration: 900, ease: 'Cubic.easeOut' });
      this.scene.tweens.add({ targets: pd, alpha: 0, delay: 9000, duration: 4000, onComplete: () => pd.destroy() });
      playSfx(this.scene, 'waterSplash', { volume: 0.25, pitch: 300, minGapMs: 0 });
    }
  }

  // A puff of dust and splinter-grit, low and wide.
  dust(pr, color, power) {
    const y = pr.z - (pr.y ?? 0);
    for (let i = 0; i < 5 + power * 2; i++) {
      const puff = this.scene.add.image(pr.x + rand(-pr.w / 2, pr.w / 2), y - rand(4, pr.h * 0.5), 'glow')
        .setTint(color).setAlpha(0.32).setScale(rand(0.5, 0.9)).setDepth(pr.z + 1);
      this.scene.tweens.add({ targets: puff, scale: rand(1.6, 2.6), alpha: 0, x: puff.x + rand(-40, 40), y: puff.y - rand(10, 40), duration: rand(500, 900), ease: 'Cubic.easeOut', onComplete: () => puff.destroy() });
    }
  }

  // ------------------------------------------------------------ the lamp post

  // It goes over the way it was struck, about the foot of its post, faster as it falls.
  topple(pr, v, dir, fallTicks) {
    const img = v.img;
    const d = dir || 1;
    // (turn about the post's foot, not the middle of the picture)
    const shift = (LAMP_ART.postX - 0.5) * img.displayWidth;
    img.setOrigin(LAMP_ART.postX, 1).setPosition(img.x + shift, img.y);
    v.falling = { t: 0, dir: d, ticks: fallTicks };
    playSfx(this.scene, 'doorOpen1', { volume: 0.7, pitch: -700, minGapMs: 0 }); // (the post's foot creaking as it goes)
  }

  // where the lantern is on the picture right now (it turns with the post)
  lanternAt(v) {
    const img = v.img;
    const lx = (LAMP_ART.lanternX - LAMP_ART.postX) * img.displayWidth * (img.flipX ? -1 : 1);
    const ly = -(1 - LAMP_ART.lanternY) * img.displayHeight;
    const a = Phaser.Math.DegToRad(img.angle);
    return { x: img.x + lx * Math.cos(a) - ly * Math.sin(a), y: img.y + lx * Math.sin(a) + ly * Math.cos(a) };
  }

  // It hits the street: a bounce, the glass bursts, the flame catches the oil.
  lampLands(pr, v) {
    const img = v.img;
    const d = v.falling?.dir ?? 1;
    v.falling = null;
    img.setAngle(d * 90);
    this.scene.tweens.add({ targets: img, angle: d * 82, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    const L = this.lanternAt(v);
    v.glow?.destroy(); v.glow = null;
    playSfx(this.scene, 'kick', { volume: 1, pitch: -1100, minGapMs: 0 });
    playSfx(this.scene, 'block', { volume: 0.6, pitch: 1500, minGapMs: 0 }); // (glass)
    playSfx(this.scene, 'fireWhoosh', { volume: 0.7, pitch: -200, minGapMs: 0 });
    this.scene.fx?.shake(5, 12);
    const gore = this.scene.gore;
    const h = Math.max(4, pr.z - L.y);
    for (let i = 0; i < 18; i++) { // glass
      gore.spawn({ x: L.x, z: pr.z + rand(-4, 6), h, vx: rand(-200, 200), vz: rand(-40, 40), vh: rand(80, 280), tint: pick([0xe8f0ff, 0xb8c8d8, 0xffe8a0]), texture: 'px', scale: rand(0.5, 1.1), decal: false, life: rand(40, 90), spin: rand(-20, 20), material: PHYSICS.pottery });
    }
    gore.spark(L.x, pr.z, h, 0xffc060, 30);
    const flash = this.scene.add.image(L.x, pr.z - h, 'glow').setTint(0xff9030).setBlendMode(Phaser.BlendModes.ADD).setScale(1).setAlpha(0.9).setDepth(pr.z + 2);
    this.scene.tweens.add({ targets: flash, scale: 4.5, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
    this.dust(pr, SHATTER.lamppost.dust, 2);
  }

  // ------------------------------------------------------------ per frame

  update(dtMs) {
    const dt = Math.min(0.05, dtMs / 1000);
    const now = this.scene.time.now;
    for (const p of this.pieces) {
      if (p.rest < 2) {
        p.vh -= GRAVITY * dt;
        p.x += p.vx * dt; p.z += p.vz * dt; p.h += p.vh * dt;
        p.rot += p.spin * dt;
        const floor = p.floor ?? 0;
        if (p.h <= floor + 2) {
          p.h = floor + 2;
          if (Math.abs(p.vh) > 120) {
            // a bounce: it clatters, loses most of its speed, its spin knocked about
            p.vh = -p.vh * 0.32; p.vx *= 0.55; p.vz *= 0.5; p.spin = -p.spin * 0.45 + rand(-3, 3);
            if (p.rest === 0 && Math.random() < 0.25) playSfx(this.scene, 'roll', { volume: 0.12, pitch: rand(600, 1200), minGapMs: 40 });
            p.rest = 1;
          } else {
            // skidding to a stop, turning over flat (lying along its length)
            p.vh = 0; p.vx *= 0.82; p.vz *= 0.8; p.spin *= 0.7;
            const flat = p.long === 'v' ? Math.PI / 2 : 0;
            const target = flat + Math.round((p.rot - flat) / Math.PI) * Math.PI;
            p.rot += (target - p.rot) * 0.2;
            if (Math.abs(p.vx) < 4 && Math.abs(target - p.rot) < 0.02) { p.rest = 2; p.rot = target; p.restAt = now; }
          }
        }
      }
      const age = p.rest === 2 ? now - p.restAt : 0;
      p.img.setPosition(p.x, p.z - p.h).setRotation(p.rot).setDepth(p.rest === 2 ? p.z - 1 : p.z + 0.5);
      if (age > LIE) p.img.setAlpha(Math.max(0, 1 - (age - LIE) / 1500));
      if (age > LIE + 1500) p.dead = true;
    }
    if (this.pieces.some((p) => p.dead)) this.pieces = this.pieces.filter((p) => (p.dead ? (p.img.destroy(), false) : true));
    this.updateFalling();
    this.updateFires();
  }

  // lamp posts on their way down
  updateFalling() {
    for (const [, v] of this.view.propSprites) {
      const F = v.falling;
      if (!F) continue;
      F.t++;
      const u = Math.min(1, F.t / F.ticks);
      v.img.setAngle(F.dir * 90 * u * u); // (slow to go, then all at once)
      if (v.glow) { const L = this.lanternAt(v); v.glow.setPosition(L.x, L.y); }
    }
  }

  // the stage's blazes (stage/Stage.js blazes): spilt oil, a hay cart alight
  updateFires() {
    const live = new Set();
    const tick = this.view.stage.propTick;
    for (const b of this.view.stage.blazes ?? []) {
      if (b.at > tick) continue;
      live.add(b);
      let f = this.fires.get(b);
      if (!f) {
        f = this.makeFire(b);
        this.fires.set(b, f);
      }
      const t = this.scene.time.now / 16.7;
      const fade = Math.min(1, b.left / 60);
      f.glow.setAlpha((0.45 + Math.sin(t * 0.3) * 0.1) * fade);
      f.flames.forEach((fl, i) => {
        const hgt = (b.cart ? 70 : 34) * (0.75 + Math.sin(t * 0.5 + i * 1.7) * 0.25) * fade;
        if (fl.frames) fl.img.setFrame(`f${(Math.floor(t * 0.4) + i * 3) % fl.frames}`).setScale(fl.s * (0.8 + 0.2 * fade), fl.s * (0.7 + 0.3 * fade) * (1 + Math.sin(t * 0.7 + i) * 0.05));
        else fl.img.setDisplaySize(16 + Math.sin(t * 0.9 + i) * 4, hgt);
        fl.img.setAlpha(fade);
      });
      if (Math.random() < 0.25) this.scene.gore.spawn({ x: b.x + rand(-b.w / 2, b.w / 2), z: b.z, h: (b.y ?? 0) + rand(10, 40), vx: rand(-15, 15), vz: 0, vh: rand(60, 140), tint: 0xffa040, scale: rand(0.3, 0.6), decal: false, life: rand(25, 45) });
    }
    for (const [b, f] of this.fires) {
      if (live.has(b)) continue;
      f.glow.destroy(); f.flames.forEach((fl) => fl.img.destroy()); f.scorch?.setAlpha(0.5);
      this.fires.delete(b);
    }
  }

  makeFire(b) {
    const y = b.z - (b.y ?? 0);
    const scorch = b.cart ? null : this.scene.add.ellipse(b.x, y, b.w, b.d * 0.6, 0x120a06, 0.55).setDepth(DEPTH.floor + 3.6);
    if (scorch) this.scene.tweens.add({ targets: scorch, alpha: 0, delay: 20000, duration: 5000, onComplete: () => scorch.destroy() });
    const glow = this.scene.add.image(b.x, y - 14, 'glow').setTint(0xff6020).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(b.w * 2, b.d * 3).setDepth(b.z - 0.5);
    const n = b.cart ? 0 : 3; // (a hay cart alight is painted burning: its glow and embers only)
    const F = FX.firepit;
    const flames = Array.from({ length: n }, (_, i) => {
      const fx = b.x - b.w / 2 + ((i + 0.5) / n) * b.w + rand(-6, 6);
      const fz = b.z + rand(-b.d / 4, b.d / 4);
      if (F) {
        const s = ((b.cart ? 0.62 : 0.32) * b.w) / n / (F.fw * 0.5);
        return { img: this.scene.add.image(fx, fz - (b.y ?? 0), F.key, 'f0').setOrigin(0.5, 0.97).setBlendMode(Phaser.BlendModes.ADD).setDepth(fz + 0.6), s, frames: F.count };
      }
      return { img: this.scene.add.image(fx, fz - (b.y ?? 0), 'flame').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(fz + 0.6) };
    });
    return { glow, flames, scorch };
  }
}
