// WoodTrapsView.js — How Gallows Wood's traps and men look and sound (stage/WoodTraps.js).
// The notched pine standing, going over and lying across the stream; the log pile and its
// trunks coming down; snares, the stake pit, the ford's shallows; the hornblower's horn and
// the woodsman's net; the crows bursting up before an ambush; the hounds baying.
//
// Drawn in code over the wood's painted bark (assets/env/wood/surf_log.png) until their own
// paintings come (the ChatGPT art list: notched pine, log pile, snare, stake pit).

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { FONT } from './fonts.js';
import { playSfx } from '../core/Sfx.js';
import { artKey } from './levelArt.js';
import { TRAPS } from '../stage/WoodTraps.js';

const BARK = artKey('wood', 'surf-log');
const rand = (a, b) => a + Math.random() * (b - a);

export class WoodTrapsView {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.rig = stage.woodTraps;
    this.pines = new Map();
    this.piles = new Map();
    this.traps = new Map();
    this.marks = new Map(); // per fighter: horn, net, snare overlays
    this.crows = [];
    this.lashes = []; // the Wagonmaster's whip, cracking
    this.netG = scene.add.graphics().setDepth(DEPTH.floor + 50);
    this.makeCrowTexture();
    for (const pr of stage.props) {
      if (pr.kind === 'pine') this.pines.set(pr.id, this.makePine(pr));
      if (pr.kind === 'logpile') this.piles.set(pr.id, this.makePile(pr));
    }
    for (const t of this.rig.traps) this.traps.set(t.id, { g: scene.add.graphics() });
    // the kennels' pen gates: iron-banded timber bars in front of the hounds (they drop into
    // the mud when a phase lets them out). Painted gates are on the ChatGPT list.
    this.gates = this.rig.pens.map((pen) => ({ pen, g: scene.add.graphics().setDepth(pen.z + 8), drop: 0 }));
    this.drawGates();
    this.listen();
  }

  // ------------------------------------------------------------ the notched pine

  makePine(pr) {
    const s = this.scene; const H = 330; const W = 50;
    const c = s.add.container(pr.x, pr.z - (pr.y ?? 0)).setDepth(pr.z);
    const shadow = s.add.ellipse(pr.x, pr.z, 90, 14, 0x000000, 0.45).setDepth(DEPTH.floor + 2);
    const bark = s.textures.exists(BARK)
      ? s.add.tileSprite(0, 0, H, W, BARK).setOrigin(0, 0.5).setTileScale(0.18).setAngle(-90).setTint(0x9a9890)
      : s.add.rectangle(0, 0, H, W, 0x2a2018).setOrigin(0, 0.5).setAngle(-90);
    const g = s.add.graphics();
    // the roots spreading into the mud, the trunk's shading, the notch cut into it
    g.fillStyle(0x1a140e, 1).fillTriangle(-W / 2 - 22, 0, -W / 2 + 4, -36, -W / 2 + 8, 0).fillTriangle(W / 2 + 24, 0, W / 2 - 6, -30, W / 2 - 8, 0);
    g.fillStyle(0x000000, 0.45).fillRect(-W / 2, -H, 12, H);
    g.fillStyle(0xd0b090, 0.08).fillRect(W / 2 - 10, -H, 6, H);
    // branch stubs and a bough, the crown up out of sight
    g.fillStyle(0x1e1812, 1).fillTriangle(W / 2 - 4, -230, W / 2 + 60, -262, W / 2 - 4, -246).fillTriangle(-W / 2 + 4, -282, -W / 2 - 46, -306, -W / 2 + 4, -296);
    g.fillStyle(0x16200e, 0.9).fillEllipse(W / 2 + 64, -268, 64, 26).fillEllipse(-W / 2 - 48, -312, 56, 22);
    c.add([bark, g]);
    const notch = s.add.graphics();
    c.add(notch);
    const v = { c, notch, shadow, H, W, hits: 0, fallen: false };
    this.drawNotch(v, pr);
    return v;
  }

  // The notch: a pale wedge cut into the trunk, deeper with every blow (it reads as the thing
  // to hit: fresh wood and chips, a mark painted on the bark)
  drawNotch(v, pr) {
    const g = v.notch.clear();
    const d = (1 - pr.hp / 3) * 0.6 + 0.25; const W = v.W; const y = -46; const dir = pr.fellDir ?? 1;
    const x0 = dir * (W / 2); const deep = dir * W * d;
    g.fillStyle(0xe8c890, 1).fillTriangle(x0, y - 16, x0, y + 12, x0 - deep, y + 2);
    g.fillStyle(0x8a6a40, 1).fillTriangle(x0, y + 2, x0, y + 12, x0 - deep, y + 2);
    // a woodsman's blaze, cut into the bark above it: this one comes down
    g.fillStyle(0xc8b088, 0.85).fillRect(-8, -112, 16, 24);
    g.fillStyle(0x6a1010, 0.8).fillRect(-5, -108, 10, 4).fillRect(-5, -100, 10, 4);
  }

  syncPines() {
    for (const [id, v] of this.pines) {
      const pr = this.stage.props.find((p) => p.id === id);
      const F = this.rig.falls.find((f) => f.pr === pr);
      if (F && !v.fallen) {
        // over she goes: slow at first, then faster and faster (gravity), the last of it a slam
        const k = Math.min(1, F.t / TRAPS.pine.fall);
        v.c.setAngle(F.dir * 90 * k * k);
        v.shadow.setScale(1 + k * 2.4, 1).setX(pr.x + F.dir * k * k * 110);
      }
    }
  }

  // Down: it lies along the road where it fell, over the stream: the bridge
  pineDown(pr, dir, x0, x1) {
    const v = this.pines.get(pr.id);
    if (!v) return;
    v.fallen = true;
    v.c.setAngle(dir * 90).setY(pr.z - 12).setDepth(pr.z + 0.6);
    v.shadow.setScale(3.6, 1.4).setPosition(pr.x + dir * 150, pr.z + 4);
    const s = this.scene;
    s.fx?.shake(6, 14);
    playSfx(s, 'waterSplash', { volume: 0.6, minGapMs: 0 });
    for (let i = 0; i < 26; i++) {
      s.gore?.spawn({ x: rand(x0, x1), z: pr.z + rand(-20, 20), h: rand(4, 30), vx: rand(-60, 60), vz: 0, vh: rand(80, 220), tint: i % 3 ? 0x2a3a20 : 0x5a4028, scale: rand(0.4, 0.9), decal: false, life: rand(30, 60) });
    }
  }

  // ------------------------------------------------------------ the log pile

  makePile(pr) {
    const s = this.scene; const g = s.add.graphics().setDepth(pr.z - 2); const ends = s.add.graphics().setDepth(pr.z - 1.9);
    const logs = [];
    // three, two, one: trunks stacked against two posts, their cut ends to us
    const rows = [[-66, -22, 22, 66], [-44, 0, 44], [-22, 22]];
    rows.forEach((row, r) => row.forEach((dx) => logs.push({ x: pr.x + dx, y: pr.z - 18 - r * 34 })));
    const rope = s.add.graphics().setDepth(pr.z + 0.5);
    const trunks = [];
    for (let i = 0; i < 4; i++) {
      const w = pr.roll.x1 - pr.roll.x0 - 36;
      const t = s.textures.exists(BARK)
        ? s.add.tileSprite(0, 0, w, 28, BARK).setTileScale(0.12).setTint(i % 2 ? 0xb0a898 : 0xc8bca8)
        : s.add.rectangle(0, 0, w, 28, 0x3a2a1a);
      trunks.push(t.setOrigin(0, 1).setVisible(false));
    }
    const v = { g, ends, rope, logs, trunks, rollG: s.add.graphics().setDepth(pr.z), loose: false };
    this.drawPile(v, pr);
    return v;
  }

  drawPile(v, pr) {
    const { g, ends, rope } = v;
    g.clear(); ends.clear(); rope.clear();
    if (v.loose) return;
    g.fillStyle(0x000000, 0.4).fillEllipse(pr.x, pr.z + 2, 210, 18);
    g.fillStyle(0x1e1610, 1).fillRect(pr.x - 96, pr.z - 120, 9, 120).fillRect(pr.x + 88, pr.z - 120, 9, 120); // the posts
    for (const L of v.logs) {
      ends.fillStyle(0x2a1e14, 1).fillCircle(L.x, L.y, 18);
      ends.fillStyle(0xb89468, 1).fillCircle(L.x, L.y, 15);
      ends.lineStyle(1, 0x7a5a38, 0.8).strokeCircle(L.x, L.y, 10).strokeCircle(L.x, L.y, 5);
      ends.fillStyle(0x6a4a2a, 1).fillCircle(L.x + 1, L.y + 1, 2);
    }
    // the stay rope across the front, tied off to the stake: the thing to cut
    rope.lineStyle(3, 0x8a7a50, 1).lineBetween(pr.x - 96, pr.z - 70, pr.x + 4, pr.z - 30).lineBetween(pr.x + 4, pr.z - 30, pr.x + 96, pr.z - 74);
    rope.fillStyle(0x3a2a18, 1).fillRect(pr.x - 3, pr.z - 40, 8, 42); // the stake
    rope.fillStyle(0xe8c890, 0.9).fillRect(pr.x - 2, pr.z - 38, 6, 3);
  }

  syncPiles() {
    const L = TRAPS.logs;
    for (const R of this.rig.rolls) {
      const v = this.piles.get(R.pile.id);
      if (!v) continue;
      const pr = R.pile; const roll = pr.roll;
      if (!v.loose) { v.loose = true; this.drawPile(v, pr); }
      const g = v.rollG.clear();
      const k = (R.t - L.delay) / L.sweep;
      if (k < 0) continue;
      // the trunks thundering down across the road, end over end, a wall of them
      const front = roll.z0 + (roll.z1 - roll.z0) * Math.min(1, k);
      for (let i = 0; i < 4; i++) {
        const z = front - i * 16; const w = roll.x1 - roll.x0;
        const x = roll.x0 + 10 + (i % 2) * 18; const T = v.trunks[i];
        g.fillStyle(0x000000, 0.35).fillEllipse(roll.x0 + w / 2, z + 8, w, 12);
        // the bark turning as it rolls, round shading top and bottom, the cut ends pale
        T.setVisible(true).setPosition(x, z - 2).setDepth(front + 0.9 - i * 0.01);
        if (T.tilePositionY !== undefined) T.tilePositionY = -(R.t * 6 + i * 11);
        g.fillStyle(0x000000, 0.4).fillRect(x, z - 10, w - 36, 8);
        g.fillStyle(0xffffff, 0.06).fillRect(x, z - 28, w - 36, 5);
        g.fillStyle(0x2a1e14, 1).fillEllipse(x + w - 36, z - 16, 16, 30);
        g.fillStyle(0xb89468, 1).fillEllipse(x + w - 36, z - 16, 12, 26);
        g.lineStyle(1, 0x7a5a38, 0.8).strokeEllipse(x + w - 36, z - 16, 6, 14);
      }
      g.setDepth(front + 1);
      if (k > 1) for (const T of v.trunks) T.setAlpha(Math.max(0, 1 - (k - 1) * 4));
      if (k <= 1 && R.t % 3 === 0) this.scene.gore?.spawn({ x: rand(roll.x0, roll.x1), z: front + 6, h: 4, vx: rand(-40, 40), vz: 0, vh: rand(40, 110), tint: 0x2a2018, scale: rand(0.5, 1), decal: false, life: 30 });
      if (k > 1) { g.setAlpha(Math.max(0, 1 - (k - 1) * 4)); }
    }
  }

  // ------------------------------------------------------------ snares, stakes, the ford

  drawTraps() {
    const t0 = this.scene.time.now;
    for (const t of this.rig.traps) {
      const v = this.traps.get(t.id); const g = v.g.clear();
      if (t.type === 'snare') {
        g.setDepth(t.z - 1);
        if (t.sprung) continue;
        // a noose of cord in the leaves, its line running taut back to a bent sapling;
        // a glint on its wire where the light catches it (it can be seen: it's fair)
        g.fillStyle(0x1a1a10, 0.6).fillEllipse(t.x, t.z, 46, 10);
        g.lineStyle(2, 0xa89870, 0.9).strokeEllipse(t.x, t.z - 1, 30, 8);
        g.lineStyle(1.5, 0xa89870, 0.7).lineBetween(t.x + 14, t.z - 2, t.x + 30, t.z - 60).lineBetween(t.x + 30, t.z - 60, t.x + 28, t.z - 160);
        g.fillStyle(0x2a2216, 1).fillTriangle(t.x + 22, t.z - 60, t.x + 38, t.z - 60, t.x + 30, t.z - 168); // (the sapling, bent)
        const glint = 0.35 + 0.35 * Math.max(0, Math.sin(t0 / 380 + t.id));
        g.fillStyle(0xe8f0ff, glint).fillCircle(t.x - 6, t.z - 3, 2);
      } else if (t.type === 'stakes') {
        g.setDepth(DEPTH.floor + 2.5);
        if (!t.open) {
          // a mat of cut boughs and leaves over it: darker, a little sunk, the edges not quite right
          g.fillStyle(0x0a0806, 0.6).fillEllipse(t.x, t.z, t.w + 8, t.d + 6);
          g.fillStyle(0x2a2a16, 1).fillEllipse(t.x, t.z, t.w, t.d);
          for (let i = 0; i < 18; i++) {
            const a = i * 2.39; const r = ((i * 37) % 10) / 10;
            g.fillStyle(i % 3 ? 0x4a3a1c : 0x3a4420, 0.9).fillEllipse(t.x + Math.cos(a) * r * t.w * 0.42, t.z + Math.sin(a) * r * t.d * 0.4, 10, 4);
          }
          g.lineStyle(1.5, 0x5a4a2a, 0.8).lineBetween(t.x - t.w * 0.4, t.z - 4, t.x + t.w * 0.35, t.z + 6);
        } else {
          // open: the pit, its stakes, what's on them
          g.fillStyle(0x020202, 1).fillEllipse(t.x, t.z, t.w, t.d);
          g.fillStyle(0x3a2a18, 0.8).fillEllipse(t.x, t.z - t.d * 0.25, t.w * 0.9, t.d * 0.4);
          for (let i = 0; i < 7; i++) {
            const x = t.x - t.w * 0.36 + i * (t.w * 0.72 / 6); const y = t.z + ((i * 13) % 9) - 2;
            g.fillStyle(0xc8a878, 1).fillTriangle(x - 3, y + 6, x + 3, y + 6, x, y - 16);
            if (i % 2 === 0) g.fillStyle(0x6a0a0a, 0.8).fillTriangle(x - 2, y - 4, x + 2, y - 4, x, y - 14);
          }
        }
      } else if (t.type === 'current') {
        g.setDepth(DEPTH.floor + 3.6);
        const B = this.scene.world.bounds; const top = B.minZ - 20; const bot = SETTINGS.height + 80;
        // the shallows: cold water over the stones, running toward us
        // a ribbon that narrows going back and feathers at its banks, not a box
        const w = t.x1 - t.x0; const cx = (t.x0 + t.x1) / 2;
        const edge = (y) => (w / 2) * Math.min(1.2, 0.15 + 1.6 * (y - top) / (bot - top)); // (a wedge from the back: no flat top)
        for (const [grow, a] of [[1.16, 0.08], [1.08, 0.1], [1, 0.14], [0.9, 0.16]]) {
          g.fillStyle(0x1a2a34, a).fillPoints([
            { x: cx - edge(top) * grow, y: top }, { x: cx + edge(top) * grow, y: top },
            { x: cx + edge(bot) * grow, y: bot }, { x: cx - edge(bot) * grow, y: bot }], true);
        }
        // the stones breaking the surface, foam on their upstream sides
        for (let i = 0; i < 9; i++) {
          const y = top + 40 + ((i * 97) % (bot - top - 80)); const half = edge(y) * 0.8;
          const x = cx - half + ((i * 71) % (half * 2));
          g.fillStyle(0x2a2a26, 0.7).fillEllipse(x, y, 16 + (i % 3) * 6, 6 + (i % 2) * 3);
          g.fillStyle(0xd8e8ee, 0.25).fillEllipse(x, y - 3, 14 + (i % 3) * 5, 2);
        }
        for (let i = 0; i < 26; i++) {
          const x = t.x0 + 20 + ((i * 53) % (t.x1 - t.x0 - 40));
          const y = top + (((t0 / 9) + i * 61) % (bot - top));
          g.lineStyle(1.5, 0xc8dce4, 0.22 + (i % 3) * 0.08).lineBetween(x, y, x + 3, y + 14 + (i % 4) * 4);
        }
      }
    }
  }

  // ------------------------------------------------------------ the kennels

  drawGates() {
    for (const G of this.gates) {
      const g = G.g.clear(); const pen = G.pen;
      if (pen.open) G.drop = Math.min(1, G.drop + 0.08); else G.drop = 0;
      if (G.drop >= 1) continue;
      const w = 52 + (pen.count ?? 1) * 34; const h = 96; const x0 = pen.x - w / 2; const yb = pen.z + 10;
      const sink = G.drop * h; // (down into the mud)
      const top = yb - h + sink;
      g.fillStyle(0x000000, 0.35).fillEllipse(pen.x, yb + 2, w + 20, 12);
      // the posts either side stay; the bars between them go down
      g.fillStyle(0x1a120c, 1).fillRect(x0 - 8, yb - h - 10, 9, h + 12).fillRect(x0 + w - 1, yb - h - 10, 9, h + 12);
      g.fillStyle(0x2a1e14, 1).fillRect(x0, Math.min(yb, top), w, Math.max(0, yb - top) > 0 ? 7 : 0);
      for (let x = x0 + 6; x < x0 + w - 2; x += 12) {
        g.fillStyle(0x2a1e14, 1).fillRect(x, top, 6, Math.max(0, yb - top));
        g.fillStyle(0x4a3624, 0.8).fillRect(x + 1, top, 2, Math.max(0, yb - top));
      }
      if (yb - top > 30) {
        g.fillStyle(0x3a3a40, 1).fillRect(x0, top + 14, w, 5).fillRect(x0, top + h * 0.62, w, 5); // (iron bands)
        g.fillStyle(0x8a8a90, 0.6).fillRect(x0, top + 14, w, 1).fillRect(x0, top + h * 0.62, w, 1);
      }
    }
  }

  // ------------------------------------------------------------ the men's marks

  drawMarks() {
    const s = this.scene; const now = s.time.now;
    const g = this.netG.clear();
    for (const f of this.scene.world.fighters) {
      let m = this.marks.get(f.id);
      const want = f.alive && (f.horn && !f.horn.done || f.snare || f.netSpin > 0 || f.drive?.on || f.order && f.order.t < f.order.wait);
      if (!want) { if (m) { m.text.setVisible(false); } continue; }
      if (!m) {
        m = { text: s.add.text(0, 0, '', { fontFamily: FONT.display, fontSize: '15px', color: '#ffd890', stroke: '#140c06', strokeThickness: 4 }).setOrigin(0.5, 1) };
        this.marks.set(f.id, m);
      }
      const top = f.z - f.h - (f.stats.body?.h ?? 120) - 20;
      m.text.setVisible(true).setPosition(f.x, top - 10).setDepth(f.z + 200);
      if (f.snare) {
        // caught: the cord (or the net) on him; a hero gets the call to cut free
        if (f.snare.kind === 'net') {
          g.lineStyle(1.5, 0xb8a880, 0.9);
          for (let i = -3; i <= 3; i++) g.lineBetween(f.x + i * 12, f.z - f.h - 120, f.x + i * 16, f.z - f.h);
          for (let j = 0; j < 5; j++) g.lineBetween(f.x - 50, f.z - f.h - 120 + j * 28, f.x + 50, f.z - f.h - 116 + j * 28);
        } else {
          g.lineStyle(2, 0xa89870, 1).lineBetween(f.x + 4, f.z - f.h - 6, f.x + 30, f.z - 200);
          g.strokeEllipse(f.x + 2, f.z - f.h - 4, 22, 6);
        }
        const shake = Math.sin(now / 40) * 2;
        m.text.setText(f.team === 'player' ? `MASH TO CUT FREE  ${'|'.repeat(Math.max(0, f.snare.left))}` : '').setX(f.x + shake).setColor('#ffe0a0');
        continue;
      }
      if (f.netSpin > 0) {
        // the net swung round over his head: the tell
        const r = 26 + 10 * f.netSpin; const cx = f.x; const cy = top + 6;
        g.lineStyle(1.5, 0xb8a880, 0.9).strokeEllipse(cx, cy, r * 2.2, r * 0.7);
        for (let i = 0; i < 8; i++) { const a = now / 90 + i * 0.785; g.lineBetween(cx, cy, cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 0.35); }
        g.fillStyle(0x4a4a50, 1);
        for (let i = 0; i < 4; i++) { const a = now / 90 + i * 1.57; g.fillCircle(cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 0.35, 3); }
        m.text.setText('');
        continue;
      }
      if (f.order && f.order.t < f.order.wait) {
        // a hound with its ears up at the whistle: it's coming
        m.text.setText('!').setColor('#ff6a4a').setY(top + 6 - Math.abs(Math.sin(now / 80)) * 6);
        continue;
      }
      if (f.drive?.on) {
        // the Wagonmaster on his bench: his name; the whip coiling back over his head (the tell)
        m.text.setText(f.lurking != null ? '' : 'THE WAGONMASTER').setColor('#ffb080');
        const hx = f.x + f.facing * 14; const hy = f.z - f.h - (f.stats.body?.h ?? 120) * 0.78;
        if (f.whipT > 0) {
          const k = Math.min(1, f.whipT);
          g.lineStyle(2, 0x2a1a10, 1).beginPath().moveTo(hx, hy);
          for (let i = 1; i <= 10; i++) { const a = -Math.PI / 2 - f.facing * (0.6 + k * 1.6) * (i / 10) + Math.sin(now / 60 + i) * 0.1; g.lineTo(hx + Math.cos(a) * i * 9 * f.facing * -1, hy + Math.sin(a) * i * 7); }
          g.strokePath();
        } else {
          g.lineStyle(2, 0x2a1a10, 1).lineBetween(hx, hy, hx + f.facing * 10, hy + 30).lineBetween(hx + f.facing * 10, hy + 30, hx + f.facing * 4, hy + 60);
        }
        continue;
      }
      if (f.horn) {
        // the hornblower: his name over him, and while he blows, how near it is to sounding
        const blowing = f.horn.state === 'blow';
        m.text.setText(blowing ? 'STOP THE HORN!' : 'HORNBLOWER').setColor(blowing ? '#ff9a70' : '#ffd890');
        // the horn itself, raised to his lips while he blows
        const hx = f.x + f.facing * 18; const hy = f.z - f.h - (f.stats.body?.h ?? 120) * 0.82;
        g.fillStyle(0xd8c8a0, 1).fillTriangle(hx, hy - 4, hx, hy + 4, hx + f.facing * (blowing ? 34 : 20), hy - (blowing ? 14 : 0));
        g.fillStyle(0x6a5030, 1).fillCircle(hx + f.facing * (blowing ? 34 : 20), hy - (blowing ? 14 : 0), blowing ? 7 : 5);
        if (blowing) {
          const k = Math.min(1, f.hornT ?? 0);
          g.fillStyle(0x000000, 0.7).fillRect(f.x - 40, top - 4, 80, 8);
          g.fillStyle(k > 0.75 ? 0xff5a3a : 0xffb050, 1).fillRect(f.x - 39, top - 3, 78 * k, 6);
        }
      }
    }
    // the whip's lash: out flat along the road, a crack of dust where its tip lands
    for (const L of this.lashes) {
      L.t++;
      const f = L.f; const T = TRAPS.driver; const k = Math.min(1, L.t / 4);
      const hx = f.x + L.dir * 14; const hy = f.z - f.h - (f.stats.body?.h ?? 120) * 0.78;
      const tx = f.x + L.dir * T.reach * k; const ty = f.z - 30;
      g.lineStyle(2.5, 0x2a1a10, 1 - L.t / 14).beginPath().moveTo(hx, hy);
      for (let i = 1; i <= 12; i++) { const u = i / 12; g.lineTo(hx + (tx - hx) * u, hy + (ty - hy) * u - Math.sin(u * Math.PI) * 30 + Math.sin(u * 9 + L.t) * 3); }
      g.strokePath();
      if (L.t <= 6) g.fillStyle(0xfff0c0, 0.8 * (1 - L.t / 6)).fillCircle(tx, ty, 6 + L.t * 2);
    }
    this.lashes = this.lashes.filter((L) => L.t < 14);
    // nets in the air: weighted mesh flying flat, turning
    for (const n of this.rig.nets) {
      const y = n.z - n.h; const r = 30;
      g.lineStyle(1.5, 0xc8b890, 0.95).strokeEllipse(n.x, y, r * 2.4, r * 0.8);
      for (let i = 0; i < 6; i++) { const a = n.run / 14 + i * 1.047; g.lineBetween(n.x - Math.cos(a) * r * 1.2, y - Math.sin(a) * r * 0.4, n.x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 0.4); }
      g.fillStyle(0x000000, 0.3).fillEllipse(n.x, n.z, 60, 8);
    }
    this.netG.setDepth(DEPTH.floor + 900);
  }

  // ------------------------------------------------------------ crows

  makeCrowTexture() {
    const T = this.scene.textures;
    if (T.exists('wood-crow-0')) return;
    // a crow in two beats of its wings (a silhouette against the dark: small, black, ragged)
    for (const [k, up] of [[0, true], [1, false]]) {
      const c = document.createElement('canvas'); c.width = 40; c.height = 24;
      const x = c.getContext('2d');
      x.fillStyle = '#050505';
      x.beginPath(); x.ellipse(20, 13, 8, 4, 0, 0, Math.PI * 2); x.fill(); // body
      x.beginPath(); x.arc(28, 11, 3.5, 0, Math.PI * 2); x.fill(); // head
      x.beginPath(); x.moveTo(31, 11); x.lineTo(36, 12); x.lineTo(31, 13); x.fill(); // beak
      x.beginPath(); x.moveTo(12, 13); x.lineTo(4, 10); x.lineTo(5, 16); x.fill(); // tail
      x.beginPath();
      if (up) { x.moveTo(16, 12); x.lineTo(8, 1); x.lineTo(14, 3); x.lineTo(22, 11); x.lineTo(26, 2); x.lineTo(24, 11); }
      else { x.moveTo(16, 13); x.lineTo(6, 22); x.lineTo(14, 20); x.lineTo(22, 14); x.lineTo(28, 23); x.lineTo(25, 14); }
      x.fill();
      T.addCanvas(`wood-crow-${k}`, c);
    }
  }

  // Crows burst up out of the branches over (x): scattering up and away, wings beating
  crowBurst(x, y, n = 9, sound = true) {
    const s = this.scene;
    if (sound) playSfx(s, 'woodCrows', { volume: 0.7, minGapMs: 400 });
    for (let i = 0; i < n; i++) {
      const img = s.add.image(x + rand(-70, 70), y + rand(-10, 30), 'wood-crow-0').setDepth(DEPTH.floor + 800).setScale(rand(0.7, 1.15));
      const dir = Math.random() < 0.5 ? -1 : 1;
      img.setFlipX(dir < 0);
      this.crows.push({ img, vx: dir * rand(60, 160), vy: -rand(140, 240), t: 0, flap: rand(0, 6), life: rand(110, 160) });
    }
    // and leaves shaken down
    for (let i = 0; i < 14; i++) s.gore?.spawn({ x: x + rand(-90, 90), z: this.scene.world.bounds.minZ + 40, h: rand(260, 360), vx: rand(-30, 30), vz: rand(0, 40), vh: rand(-20, 20), tint: i % 2 ? 0x2a3a1a : 0x4a3a1a, scale: rand(0.3, 0.6), decal: false, life: rand(70, 110) });
  }

  syncCrows(dt) {
    const k = dt / 1000;
    for (const c of this.crows) {
      c.t++; c.flap += 0.45;
      c.img.x += c.vx * k; c.img.y += c.vy * k;
      c.vy *= 0.995;
      c.img.setTexture(`wood-crow-${Math.floor(c.flap) % 2}`);
      if (c.t > c.life - 30) c.img.setAlpha(Math.max(0, (c.life - c.t) / 30));
    }
    this.crows = this.crows.filter((c) => { if (c.t < c.life) return true; c.img.destroy(); return false; });
  }

  // ------------------------------------------------------------ events and sound

  listen() {
    const ev = this.scene.world.events; const s = this.scene;
    const top = () => (s.cameras.main.scrollY ?? 0) + 30;
    ev.on('propHit', ({ prop, dir }) => {
      if (prop.kind === 'pine') {
        playSfx(s, 'woodChop', { volume: 0.9, minGapMs: 60 });
        const v = this.pines.get(prop.id); if (v) { this.drawNotch(v, prop); s.tweens.add({ targets: v.c, angle: dir * 1.5, duration: 70, yoyo: true }); }
        for (let i = 0; i < 6; i++) s.gore?.spawn({ x: prop.x + (prop.fellDir ?? 1) * 22, z: prop.z + 2, h: rand(30, 60), vx: rand(-90, 90), vz: 0, vh: rand(100, 200), tint: 0xe0c090, scale: rand(0.3, 0.6), decal: false, life: rand(25, 45) });
      }
    });
    ev.on('pineFalling', ({ prop }) => { playSfx(s, 'woodChop', { volume: 1, minGapMs: 0 }); playSfx(s, 'woodFall', { volume: 1, minGapMs: 0 }); this.crowBurst(prop.x, top() + 40, 6, false); });
    ev.on('pineDown', ({ prop, dir, x0, x1 }) => this.pineDown(prop, dir, x0, x1));
    ev.on('propBreak', ({ prop }) => { if (prop.kind === 'logpile') playSfx(s, 'woodSnare', { volume: 0.8, minGapMs: 0 }); });
    ev.on('logsLoose', () => { playSfx(s, 'woodLogs', { volume: 1, minGapMs: 0 }); s.fx?.shake(5, 40); });
    ev.on('snared', ({ fighter, kind }) => playSfx(s, kind === 'net' ? 'kick' : 'woodSnare', { volume: 0.8, minGapMs: 0 }));
    ev.on('snareTug', () => playSfx(s, 'woodCreak', { volume: 0.25, pitch: 300, minGapMs: 80 }));
    ev.on('stakesOpen', () => playSfx(s, 'doorClose2', { volume: 0.7, pitch: -600, minGapMs: 0 }));
    ev.on('stakesKill', () => playSfx(s, 'rogueStab', { volume: 0.9, pitch: -300, minGapMs: 0 }));
    ev.on('netWindup', () => playSfx(s, 'woodNet', { volume: 0.35, pitch: -300, minGapMs: 200 }));
    ev.on('netThrown', () => playSfx(s, 'woodNet', { volume: 0.9, minGapMs: 0 }));
    ev.on('hornSounded', () => playSfx(s, 'woodHorn', { volume: 1, minGapMs: 0 }));
    ev.on('hornRaised', () => playSfx(s, 'woodHorn', { volume: 0.18, pitch: -200, minGapMs: 500 }));
    ev.on('hornBroken', () => playSfx(s, 'kick', { volume: 0.5, minGapMs: 0 }));
    ev.on('ambushTell', ({ x, tell }) => {
      // the crows go up out of the branches over where they wait, and the boughs creak
      this.crowBurst(x, top() + 20, 7, true);
      playSfx(s, 'woodCreak', { volume: 0.8, minGapMs: 200 });
      s.time.delayedCall(Math.max(0, (tell / 60) * 1000 - 400), () => playSfx(s, 'woodCreak', { volume: 0.6, pitch: 200, minGapMs: 100 }));
    });
    ev.on('swept', ({ fighter }) => playSfx(s, 'waterSplash', { volume: 0.7, minGapMs: 0 }));
    // the convoy: the whip, the Wagonmaster knocked off his bench, the wagon brought up short
    ev.on('whipWindup', () => playSfx(s, 'woodWhip', { volume: 0.3, pitch: -500, minGapMs: 200 }));
    ev.on('whipCrack', ({ fighter, dir }) => { playSfx(s, 'woodWhip', { volume: 1, minGapMs: 0 }); this.lashes.push({ f: fighter, dir, t: 0 }); });
    ev.on('driverDown', () => playSfx(s, 'kick', { volume: 0.7, minGapMs: 0 }));
    ev.on('wagonStopped', ({ prop, how }) => {
      s.fx?.shake(how === 'pine' ? 7 : 3, how === 'pine' ? 22 : 10);
      playSfx(s, how === 'pine' ? 'woodLogs' : 'woodCreak', { volume: how === 'pine' ? 0.8 : 0.6, minGapMs: 0 });
      for (let i = 0; i < (how === 'pine' ? 18 : 6); i++) s.gore?.spawn({ x: prop.x + prop.w / 2 + rand(-20, 10), z: prop.z + rand(-10, 10), h: rand(4, 40), vx: rand(-80, 60), vz: 0, vh: rand(60, 200), tint: i % 2 ? 0x2a2018 : 0x4a3424, scale: rand(0.4, 0.9), decal: false, life: rand(25, 50) });
    });
    ev.on('penOpen', ({ pen }) => { playSfx(s, 'doorClose2', { volume: 0.8, pitch: -400, minGapMs: 0 }); playSfx(s, 'woodHowl', { volume: 0.5, pitch: 200, minGapMs: 300 }); s.fx?.shake(3, 10); });
    ev.on('whistle', () => playSfx(s, 'woodWhistle', { volume: 1, minGapMs: 0 }));
    ev.on('bossPhase', ({ phase }) => { if (phase.pens?.length && phase.id === 'pack') playSfx(s, 'woodHorn', { volume: 0.9, minGapMs: 0 }); });
    ev.on('fightStart', ({ section }) => { if (section?.howl) playSfx(s, 'woodHowl', { volume: 0.9, minGapMs: 0 }); });
  }

  update() {
    const dt = this.scene.game.loop.delta;
    this.syncPines();
    this.syncPiles();
    this.drawTraps();
    if (this.gates.length) this.drawGates();
    this.drawMarks();
    this.syncCrows(dt);
    // as you come up to the hanging tree, its crows go up
    const tree = this.stage.data.gallows;
    if (tree && !this.treeCrows && this.scene.players?.some((p) => p.x > tree.x - 640)) {
      this.treeCrows = true;
      this.crowBurst(tree.x - 60, (this.scene.cameras.main.scrollY ?? 0) + 70, 12, true);
    }
  }
}
