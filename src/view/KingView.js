// KingView.js — King Hakon, the Oath King, in the market square (stage/KingHakon.js).
// View only: nothing here changes the game.
//
// He is not drawn like the villagers (Nick, 2026-11-04: "the king can't be treated with the
// same treatment as the other npcs"): his own high-end painted sheets (ChatGPT, prompts in
// docs/king-hakon/), a little bigger than his son, a slow gold glow behind him, Oathkeeper's
// fire on every cut (a burning arc where the blade went), embers over his roar.
import { DEPTH, depthScale } from './depths.js';
import { SPRITES } from './levelArt.js';

// each pose: [sheet, cell] (data/levelArt.js SPRITE_SHEETS king-*)
export const KING_POSES = {
  stand: ['king-stand', 0], breathe: ['king-stand', 1], point: ['king-stand', 2], look: ['king-stand', 3],
  run0: ['king-run', 0], run1: ['king-run', 1], run2: ['king-run', 2], run3: ['king-run', 3],
  chopUp: ['king-strike-a', 0], chop: ['king-strike-a', 1], sweepUp: ['king-strike-a', 2], sweep: ['king-strike-a', 3],
  thrust: ['king-strike-b', 0], kick: ['king-strike-b', 1], spin: ['king-strike-b', 2], roar: ['king-strike-b', 3],
};
// a sheet not painted yet: the nearest pose of one that is
const STAND_IN = {
  run0: 'breathe', run1: 'stand', run2: 'breathe', run3: 'stand',
  chopUp: 'stand', chop: 'point', sweepUp: 'look', sweep: 'point', thrust: 'point', kick: 'breathe', spin: 'look', roar: 'stand',
};
// (painted turned back over his shoulder, to the left: only flipped when he faces right)
const LOOKS_BACK = new Set(['look']);

// the arc each cut burns through the air: [from, to] angles (deg, 0 = ahead, -90 = up),
// its radius and height above his feet
const ARCS = {
  chop: [[-120, 40], 92, 70], sweep: [[-150, 30], 96, 62], spin: [[-170, 50], 88, 60],
  thrust: [[-8, 8], 120, 66], kick: [[-20, 20], 50, 30],
};

export class KingView {
  constructor(scene) {
    this.scene = scene;
    this.shadow = scene.add.ellipse(0, 0, 70, 14, 0x000000, 0.38).setVisible(false);
    this.glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.img = scene.add.image(0, 0, '__WHITE').setOrigin(0.5, 1).setVisible(false);
    this.fx = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.popups - 2);
    this.arcs = [];
    this.embers = [];
    const ev = scene.world.events;
    const on = (k, fn) => { ev.on(k, fn); scene.events.once('shutdown', () => ev.off?.(k, fn)); };
    on('kingStrike', ({ king, move }) => this.arc(king, move));
    on('kingRoar', ({ king }) => this.roar(king));
    scene.events.once('shutdown', () => { for (const o of [this.shadow, this.glow, this.img, this.fx]) o.destroy(); });
  }

  frame(pose) {
    let p = pose;
    let [sheet, cell] = KING_POSES[p] ?? KING_POSES.stand;
    if (!SPRITES[sheet]) { p = STAND_IN[p] ?? 'stand'; [sheet, cell] = KING_POSES[p]; }
    const S = SPRITES[sheet];
    return S ? { S, cell, pose: p } : null;
  }

  arc(king, move) {
    const A = ARCS[move];
    if (A) this.arcs.push({ x: king.x, z: king.z, dir: king.facing, A, t: 0 });
    for (let i = 0; i < 14; i++) this.embers.push({ x: king.x + king.facing * (60 + i * 3), y: king.z - 60 - (i % 5) * 8, vx: king.facing * (1 + (i % 4)), vy: -1.5 - (i % 3), t: 0, life: 30 + (i % 6) * 4 });
  }

  roar(king) {
    for (let i = 0; i < 40; i++) this.embers.push({ x: king.x - 30 + (i * 37) % 60, y: king.z - 150 + (i * 13) % 40, vx: ((i * 7) % 9 - 4) * 0.35, vy: -1 - (i % 5) * 0.5, t: -(i % 20), life: 50 + (i % 7) * 6 });
  }

  draw(king) {
    const show = !!king && king.phase !== 'gone';
    this.img.setVisible(false); this.shadow.setVisible(show); this.glow.setVisible(show);
    const g = this.fx.clear();
    this.glow.clear();
    if (show) {
      const k = depthScale(king.z), t = this.scene.time.now;
      const F = this.frame(king.pose);
      if (F) {
        const flip = LOOKS_BACK.has(F.pose) ? king.facing > 0 : king.facing < 0;
        const breath = /^run/.test(F.pose) ? 0 : Math.sin(t * 0.003);
        const bob = /^run/.test(F.pose) || (/^run/.test(king.pose) && F.pose !== king.pose) ? Math.abs(Math.sin(king.stride / 34 * Math.PI)) * 4 : 0;
        this.img.setTexture(F.S.key, `f${Math.min(F.cell, F.S.count - 1)}`)
          .setPosition(king.x, king.z - king.h - bob).setScale(k * 0.5 * (1 - 0.006 * breath), k * 0.5 * (1 + 0.012 * breath))
          .setFlipX(flip).setDepth(king.z + 0.05).setAlpha(king.alpha).setVisible(true);
      }
      // the gold about him: a slow pulse, brighter while he fights
      const hot = king.cinema ? 1 : 0.6, p = 0.5 + 0.5 * Math.sin(t * 0.004);
      this.glow.setDepth(king.z - 0.2).setAlpha(king.alpha);
      // (soft: rings of falling brightness, no hard edge)
      for (let i = 0; i < 6; i++) {
        const r = 1 - i / 6;
        this.glow.fillStyle(i < 3 ? 0xffb040 : 0xffe0a0, (0.012 + 0.012 * p) * hot).fillEllipse(king.x, king.z - 76 * k, 170 * k * r, 200 * k * r);
      }
      this.shadow.setPosition(king.x, king.z).setDepth(DEPTH.shadows).setAlpha(king.alpha);
    }
    // Oathkeeper's fire where the blade went: a burning arc, white-hot to gold, fading
    this.arcs = this.arcs.filter((a) => ++a.t < 16);
    for (const a of this.arcs) {
      const [[from, to], r, hy] = a.A, f = 1 - a.t / 16;
      const cx = a.x + a.dir * 16, cy = a.z - hy;
      for (const [w, col, al] of [[16, 0xff7a1a, 0.35], [9, 0xffc040, 0.6], [4, 0xfff4d0, 0.9]]) {
        g.lineStyle(w * f, col, al * f).beginPath();
        for (let i = 0; i <= 14; i++) {
          const ang = Phaser.Math.DegToRad(from + (to - from) * i / 14);
          const x = cx + a.dir * Math.cos(ang) * r, y = cy + Math.sin(ang) * r * 0.75;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.strokePath();
      }
    }
    this.embers = this.embers.filter((e) => ++e.t < e.life);
    for (const e of this.embers) {
      if (e.t < 0) continue;
      e.x += e.vx; e.y += e.vy; e.vy *= 0.985;
      const f = 1 - e.t / e.life;
      g.fillStyle(e.t % 6 < 3 ? 0xffd070 : 0xff8a20, 0.9 * f).fillCircle(e.x, e.y, 1.6 + 1.6 * f);
    }
  }
}
