// SiegeAnim.js — The Ashen siege pieces brought to life (view only): the archer posts and the
// catapults (Stage props 'archers' and 'catapult', the bombardments they feed).
//
// Their painted art (data/levelArt.js: prop_archers.png, prop_catapult.png) is one picture
// each, so on the first use it is cut into moving parts, once per texture:
//   the archer post   the three bowmen above the mantlet, each his own layer behind it
//                     (pivoting at his waist), the post itself with them cut out
//   the catapult      the throwing arm (pivoting on its axle) and the stone in its sling,
//                     the frame with them cut out
// Then:
//   a volley          each bowman in turn draws (leans back), looses (snaps forward), an arrow
//                     leaving his bow, the string's twang; idle, they breathe
//   a throw           the arm winds back over the top, creaking, whips down past its rest,
//                     the stone flies out of the sling, the frame bucks, dust off the wheels;
//                     the arm settles and a new stone is loaded
//   a hit             the bowmen flinch / the arm rattles, the whole piece shudders
//   wrecked           it bursts apart: chunks of the painting fly and tumble with real fall,
//                     a cloud of dust, splinters; the bowmen are thrown off and fall; the
//                     catapult's arm snaps away, its stone rolls off, its wreck smoulders
// Without the painted art (the stand-ins drawn in code) only the shudder, the burst and the
// dust play.

import { DEPTH } from './depths.js';
import { playSfx } from '../core/Sfx.js';

const rand = (a, b) => a + Math.random() * (b - a);

// The cuts, in the painting's own pixels (the left half of the pair: 887 x 821 / 887 x 887).
// archers: the mantlet's top edge (`cut`), each bowman's column, how far below the cut his
// layer runs (hidden behind the mantlet, so he can lean), his waist (the pivot) and where
// his arrow's head is (for the shot)
const CUTS = {
  'prop-archers': {
    kind: 'men', cut: 252, below: 44, waist: 30,
    men: [{ x0: 60, x1: 330, tip: [85, 118] }, { x0: 330, x1: 525, tip: [332, 172] }, { x0: 525, x1: 692, tip: [530, 205] }],
  },
  // catapult: the arm's outline and its axle; the stone in the sling (a circle)
  'prop-catapult': {
    kind: 'arm',
    arm: [[25, 130], [110, 118], [175, 150], [470, 290], [560, 318], [568, 402], [500, 412], [200, 335], [150, 368], [40, 352], [22, 250]],
    pivot: [525, 365], stone: { x: 112, y: 282, r: 54 },
  },
};

// Timings (ms) and swings (degrees). volley: a bowman's draw, his release snap, his settle,
// the gap between one man and the next, how far he leans back and snaps on; throw: the
// wind-up, the hold, the whip, the settle, the reload, how far the arm goes back over the
// top and how far past its rest it whips
const VOLLEY = { draw: 200, snap: 50, settle: 260, stagger: 70, lean: 5, kick: -4 };
const THROW = { wind: 340, hold: 90, whip: 120, settle: 520, reload: 900, back: 52, past: -26 };
// The burst: chunks across and down, their throw (px/s), the fall, how long they lie, dust puffs
const BURST = { cols: 4, rows: 3, speed: 260, up: 420, gravity: 1500, lie: 1400, dust: 7 };

// Cut a painted siege piece into its parts (once per texture). Returns the parts or null.
function cutParts(scene, key) {
  const C = CUTS[key];
  const T = scene.textures;
  if (!C || !T.exists(key)) return null;
  if (!(scene.registry.get('levelArt') ?? []).includes(key)) return null; // (the cuts fit the painting only)
  const cache = (scene.registry.get('siegeCuts') ?? {});
  if (cache[key]) return cache[key];
  const src = T.get(key).getSourceImage();
  const W = src.width; const H = src.height;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const add = (k, c) => { if (T.exists(k)) T.remove(k); T.addCanvas(k, c); return k; };
  const base = canvas(W, H); const b = base.getContext('2d');
  b.drawImage(src, 0, 0);
  const parts = { W, H, layers: [] };
  if (C.kind === 'men') {
    for (const [i, m] of C.men.entries()) {
      b.clearRect(m.x0, 0, m.x1 - m.x0, C.cut);
      const h = C.cut + C.below;
      const c = canvas(m.x1 - m.x0, h);
      c.getContext('2d').drawImage(src, m.x0, 0, m.x1 - m.x0, h, 0, 0, m.x1 - m.x0, h);
      const pivot = [(m.x0 + m.x1) / 2, C.cut + C.waist];
      parts.layers.push({ key: add(`${key}-man${i}`, c), x0: m.x0, y0: 0, w: m.x1 - m.x0, h, pivot, tip: m.tip, behind: true });
    }
  } else {
    const xs = C.arm.map((p) => p[0]); const ys = C.arm.map((p) => p[1]);
    const bx = Math.min(...xs); const by = Math.min(...ys); const bw = Math.max(...xs) - bx; const bh = Math.max(...ys) - by;
    const path = (g, dx = 0, dy = 0) => { g.beginPath(); C.arm.forEach(([x, y], i) => (i ? g.lineTo(x - dx, y - dy) : g.moveTo(x - dx, y - dy))); g.closePath(); };
    const S = C.stone;
    // the arm (less the stone), and the stone on its own
    const arm = canvas(bw, bh); const a = arm.getContext('2d');
    a.save(); path(a, bx, by); a.clip(); a.drawImage(src, -bx, -by); a.restore();
    a.globalCompositeOperation = 'destination-out'; a.beginPath(); a.arc(S.x - bx, S.y - by, S.r, 0, 7); a.fill();
    const stone = canvas(S.r * 2, S.r * 2); const s = stone.getContext('2d');
    s.beginPath(); s.arc(S.r, S.r, S.r, 0, 7); s.clip(); s.drawImage(src, -(S.x - S.r), -(S.y - S.r));
    b.save(); b.globalCompositeOperation = 'destination-out'; path(b); b.fill(); b.restore();
    parts.layers.push({ key: add(`${key}-arm`, arm), x0: bx, y0: by, w: bw, h: bh, pivot: C.pivot, arm: true });
    parts.stone = { key: add(`${key}-stone`, stone), x: S.x, y: S.y, r: S.r };
  }
  parts.base = add(`${key}-base`, base);
  cache[key] = parts;
  scene.registry.set('siegeCuts', cache);
  return parts;
}

// Where a point of the painting is in the world, for a prop drawn origin (0.5, 1) at its foot.
const world = (pr, v, parts, [u, w]) => ({ x: pr.x + (u - parts.W / 2) * v.s, y: pr.z - (pr.y ?? 0) + (w - parts.H) * v.s });

export class SiegeAnim {
  constructor(view) {
    this.view = view;
    this.scene = view.scene;
    this.debris = [];
  }

  // Set a siege prop up in parts (after StageView.makeProp made its image). `painted`: its
  // texture is the level's painted art (the cuts are drawn to it).
  setup(pr, v, painted) {
    if (pr.kind !== 'archers' && pr.kind !== 'catapult') return;
    const parts = painted ? cutParts(this.scene, `prop-${pr.kind}`) : null;
    if (!parts) return;
    v.parts = parts;
    v.img.setTexture(parts.base);
    v.layers = parts.layers.map((L, i) => {
      const p = world(pr, v, parts, L.pivot);
      const img = this.scene.add.image(p.x, p.y, L.key).setScale(v.s)
        .setOrigin((L.pivot[0] - L.x0) / L.w, (L.pivot[1] - L.y0) / L.h)
        .setDepth(pr.z + (L.behind ? -0.05 : 0.05));
      img.home = { x: p.x, y: p.y };
      // idle: the bowmen breathe, each to his own beat
      if (L.behind) img.idle = this.scene.tweens.add({ targets: img, y: p.y - 2.2, duration: 900 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 230 });
      return img;
    });
    if (parts.stone) {
      v.stone = this.scene.add.image(0, 0, parts.stone.key).setScale(v.s).setDepth(pr.z + 0.06);
      this.seatStone(pr, v);
    }
  }

  // The painted stone (cut from the catapult's sling), for the stones in the air; null
  // without the painted catapult.
  stoneKey() {
    const parts = cutParts(this.scene, 'prop-catapult');
    return parts?.stone?.key ?? null;
  }

  // Which side a bombardment's stones come from: toward its nearest catapult still standing
  // (+1: from the right, as the heroes go)
  sideOf(hz, x) {
    let best = null;
    for (const pr of this.view.stage.props) {
      if (pr.kind !== 'catapult' || pr.broken || (hz.silence && pr.tag !== hz.silence)) continue;
      if (!best || Math.abs(pr.x - x) < Math.abs(best.x - x)) best = pr;
    }
    return best ? Math.sign(best.x - x) || 1 : 1;
  }

  // the stone rides in the sling: where the arm's turn puts it
  seatStone(pr, v) {
    const arm = v.layers?.[0]; const S = v.parts?.stone;
    if (!arm || !S || !v.stone || v.stone.flying) return;
    const L = v.parts.layers[0];
    const dx = (S.x - L.pivot[0]) * v.s; const dy = (S.y - L.pivot[1]) * v.s;
    const r = arm.rotation;
    v.stone.setPosition(arm.x + dx * Math.cos(r) - dy * Math.sin(r), arm.y + dx * Math.sin(r) + dy * Math.cos(r)).setRotation(r);
  }

  // A volley loosed from this post: each bowman draws, then looses, in turn.
  volley(pr) {
    const v = this.view.propSprites.get(pr.id);
    if (!v || pr.broken) return;
    const near = Math.abs(this.scene.player.x - pr.x) < 1100;
    if (!v.layers) {
      this.scene.tweens.add({ targets: v.img, scaleY: v.s * 1.04, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
      return;
    }
    v.layers.forEach((man, i) => {
      const V = VOLLEY;
      this.scene.tweens.killTweensOf(man, ['angle']);
      this.scene.tweens.chain({
        targets: man,
        delay: i * V.stagger,
        tweens: [
          { angle: V.lean, duration: V.draw, ease: 'Sine.easeOut' }, // the draw: he leans back into it
          {
            angle: V.kick, duration: V.snap, ease: 'Cubic.easeIn',
            onComplete: () => { // the loose
              if (pr.broken) return;
              if (near) playSfx(this.scene, 'whiff', { volume: 0.35, pitch: 1500 + i * 120, minGapMs: 0 });
              this.shootArrow(pr, v, i);
            },
          },
          { angle: 0, duration: V.settle, ease: 'Back.easeOut' },
        ],
      });
    });
  }

  // an arrow leaving a bowman's bow: up and away steeply toward the heroes, out of sight
  shootArrow(pr, v, i) {
    const L = v.parts.layers[i];
    const p = world(pr, v, v.parts, L.tip);
    const a = this.scene.add.image(p.x, p.y, 'arrow-fly').setOrigin(0.9, 0.5).setScale(0.34).setDepth(pr.z + 1);
    const ang = -2.5 + rand(-0.12, 0.12); // (up and to the left: at the heroes, over their heads)
    a.setRotation(ang);
    const d = 760;
    this.scene.tweens.add({
      targets: a, x: p.x + Math.cos(ang) * d, y: p.y + Math.sin(ang) * d, duration: 380, ease: 'Quad.easeIn',
      onComplete: () => a.destroy(),
    });
    this.scene.gore.spark(p.x, pr.z, pr.z - p.y, 0xf0e0c0, 3); // (the string's snap)
  }

  // A stone thrown from this catapult: wind back, whip, loose, settle, reload.
  throw(pr) {
    const v = this.view.propSprites.get(pr.id);
    if (!v || pr.broken) return;
    const near = Math.abs(this.scene.player.x - pr.x) < 1400;
    if (!v.layers) {
      this.scene.tweens.add({ targets: v.img, angle: -4, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
      this.dustAt(pr, v, 6);
      return;
    }
    const arm = v.layers[0]; const T = THROW;
    if (v.throwing) return;
    v.throwing = true;
    const sync = () => this.seatStone(pr, v);
    if (near) playSfx(this.scene, 'block', { volume: 0.35, pitch: -1800, minGapMs: 0 }); // (the windlass creaks)
    this.scene.tweens.chain({
      targets: arm,
      tweens: [
        { angle: T.back, duration: T.wind, ease: 'Sine.easeInOut', onUpdate: sync }, // wound back, over the top
        { angle: T.back + 2, duration: T.hold, yoyo: true, onUpdate: sync }, // the strain
        {
          angle: T.past, duration: T.whip, ease: 'Cubic.easeIn', onUpdate: sync,
          onComplete: () => this.loose(pr, v, near),
        },
        { angle: 0, duration: T.settle, ease: 'Back.easeOut', onComplete: () => { v.throwing = false; } },
      ],
    });
  }

  // the arm hits its stop: the stone flies, the frame bucks, dust off the wheels
  loose(pr, v, near) {
    if (pr.broken) return;
    if (near) {
      playSfx(this.scene, 'heavySwing', { volume: 0.7, pitch: -1100, minGapMs: 0 });
      playSfx(this.scene, 'kick', { volume: 0.6, pitch: -1500, minGapMs: 0 });
      this.scene.fx?.shake(4, 10);
    }
    const st = v.stone;
    if (st) {
      st.flying = true;
      this.scene.tweens.add({
        targets: st, x: st.x - 520, y: st.y - 760, angle: st.angle - 540, scale: v.s * 0.8, duration: 650, ease: 'Quad.easeOut',
        onComplete: () => {
          if (pr.broken) return;
          // a new stone loaded into the sling
          st.flying = false; st.setScale(v.s).setAlpha(0); this.seatStone(pr, v);
          this.scene.tweens.add({ targets: st, alpha: 1, duration: 220, delay: THROW.reload - 650 });
        },
      });
    }
    // the frame bucks against its wheels
    const base = v.img;
    this.scene.tweens.chain({ targets: base, tweens: [
      { scaleY: v.s * 0.94, scaleX: v.s * 1.04, angle: 2, duration: 70, ease: 'Quad.easeOut' },
      { scaleY: v.s, scaleX: v.s, angle: 0, duration: 380, ease: 'Elastic.easeOut', easeParams: [1.2, 0.35] },
    ] });
    this.dustAt(pr, v, 14);
  }

  dustAt(pr, v, n) {
    const y = pr.y ?? 0;
    for (let i = 0; i < n; i++) {
      this.scene.gore.spawn({ x: pr.x + rand(-pr.w / 2, pr.w / 2), z: pr.z + rand(-6, 6), h: y + rand(0, 10), vx: rand(-160, 160), vz: rand(-20, 20), vh: rand(40, 160), tint: i % 3 ? 0x6a5a48 : 0x8a7a64, texture: 'px', scale: rand(0.8, 1.8), decal: false, life: rand(25, 45) });
    }
    this.puffs(pr.x, pr.z - y, pr.z, 3, 0.7);
  }

  // A blow on it: the bowmen flinch, the arm rattles, the piece shudders.
  hit(pr, dir) {
    const v = this.view.propSprites.get(pr.id);
    if (!v) return;
    this.scene.tweens.add({ targets: v.img, angle: dir * 2.5, duration: 60, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    for (const L of v.layers ?? []) {
      if (pr.kind === 'catapult' && v.throwing) continue;
      this.scene.tweens.add({ targets: L, angle: L.angle + dir * (pr.kind === 'archers' ? 9 : 5), duration: 70, yoyo: true, ease: 'Quad.easeOut' });
    }
    this.seatStone(pr, v);
  }

  // Wrecked: it bursts. Call before StageView swaps in the wreck (it cuts the chunks from the
  // piece as it stood).
  burst(pr, dir) {
    const v = this.view.propSprites.get(pr.id);
    if (!v) return;
    const sc = this.scene;
    sc.fx?.shake(9, 22);
    playSfx(sc, 'kick', { volume: 1, pitch: -1300, minGapMs: 0 });
    playSfx(sc, 'block', { volume: 0.6, pitch: -1500, minGapMs: 0 });
    const img = v.img;
    const key = img.texture.key;
    const tex = sc.textures.get(key).getSourceImage();
    const W = tex.width; const H = tex.height;
    const ground = pr.z - (pr.y ?? 0);
    // the chunks: the painting cut in a grid, each flung out and falling, tumbling
    for (let r = 0; r < BURST.rows; r++) {
      for (let c = 0; c < BURST.cols; c++) {
        const cw = W / BURST.cols; const ch = H / BURST.rows;
        const piece = sc.add.image(img.x, img.y, key).setOrigin(0.5, 1).setScale(v.s).setDepth(pr.z + 0.3)
          .setCrop(c * cw, r * ch, cw, ch);
        // (a cropped image keeps its full frame: spin it round the chunk's own middle)
        const mx = (c + 0.5) * cw; const my = (r + 0.5) * ch;
        piece.setOrigin(mx / W, my / H).setPosition(img.x + (mx - W / 2) * v.s, img.y + (my - H) * v.s);
        const side = (c + 0.5) / BURST.cols - 0.5;
        this.debris.push({
          img: piece, vx: (side * 2 + dir * 0.7) * BURST.speed * rand(0.6, 1.3), vy: -BURST.up * rand(0.5, 1.1) * (1 - r * 0.25),
          spin: rand(-540, 540), floor: ground + rand(-6, 10) - (H - my) * v.s * 0.15, lie: 0,
        });
      }
    }
    // the bowmen thrown off, the catapult's arm snapped away and its stone rolling off
    for (const [i, L] of (v.layers ?? []).entries()) {
      L.idle?.stop();
      sc.tweens.killTweensOf(L);
      this.debris.push({ img: L.setDepth(pr.z + 0.4), vx: (dir * 160 + (i - 1) * 90) * rand(0.7, 1.3), vy: -rand(380, 560), spin: dir * rand(200, 520), floor: ground + rand(-4, 12), lie: 0 });
    }
    if (v.stone) {
      v.stone.flying = true;
      sc.tweens.killTweensOf(v.stone);
      this.debris.push({ img: v.stone.setAlpha(1), vx: dir * rand(220, 320), vy: -rand(100, 200), spin: dir * 720, floor: ground + 8, lie: 0, roll: true });
    }
    v.layers = null; v.stone = null;
    // the dust it goes up in
    this.puffs(pr.x, ground - pr.h * 0.4, pr.z, BURST.dust, 1.4);
    sc.gore.spark(pr.x, pr.z, pr.h * 0.6 + (pr.y ?? 0), 0xffe0a0, 24);
    // the catapult's wreck smoulders a while
    if (pr.kind === 'catapult') {
      sc.time.addEvent({
        delay: 140, repeat: 30,
        callback: () => {
          sc.gore.spawn({ x: pr.x + rand(-pr.w / 3, pr.w / 3), z: pr.z, h: (pr.y ?? 0) + rand(10, 40), vx: rand(-20, 20), vz: 0, vh: rand(60, 140), tint: Math.random() < 0.6 ? 0xff8a30 : 0xffc060, texture: 'px', scale: rand(0.5, 1.1), decal: false, life: rand(20, 40) });
          if (Math.random() < 0.4) this.puffs(pr.x + rand(-30, 30), ground - 20, pr.z, 1, 0.6, 0x3a3634);
        },
      });
    }
  }

  // soft clouds of dust (or smoke) billowing out and fading
  puffs(x, y, z, n, size, color = 0x7a6a58) {
    for (let i = 0; i < n; i++) {
      const p = this.scene.add.circle(x + rand(-40, 40) * size, y + rand(-20, 10) * size, rand(16, 26) * size, color, 0.42).setDepth(z + 0.5);
      this.scene.tweens.add({
        targets: p, scale: rand(2.2, 3.4), alpha: 0, x: p.x + rand(-60, 60) * size, y: p.y - rand(20, 70) * size,
        duration: rand(700, 1200), ease: 'Cubic.easeOut', onComplete: () => p.destroy(),
      });
    }
  }

  // the flying chunks: thrown, falling, tumbling, then lying a moment and fading
  update() {
    const dt = 1 / 60;
    this.debris = this.debris.filter((d) => {
      const im = d.img;
      if (!im.active) return false;
      if (d.lie) {
        d.lie += dt * 1000;
        if (d.roll) { im.x += d.vx * dt; d.vx *= 0.94; im.angle += d.vx * dt * 3; }
        if (d.lie > BURST.lie) im.setAlpha(Math.max(0, 1 - (d.lie - BURST.lie) / 600));
        if (d.lie > BURST.lie + 600) { im.destroy(); return false; }
        return true;
      }
      d.vy += BURST.gravity * dt;
      im.x += d.vx * dt; im.y += d.vy * dt; im.angle += d.spin * dt;
      if (im.y >= d.floor && d.vy > 0) {
        im.y = d.floor;
        if (d.vy > 260 && !d.bounced) { d.vy *= -0.32; d.vx *= 0.5; d.spin *= 0.4; d.bounced = true; } // (one bounce)
        else { d.lie = 1; d.vx *= 0.6; }
      }
      return true;
    });
  }
}
