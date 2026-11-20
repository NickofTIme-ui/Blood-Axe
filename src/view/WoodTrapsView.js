// WoodTrapsView.js — How Gallows Wood's traps and men look and sound (stage/WoodTraps.js).
// The notched pine standing, going over and lying across the stream; the log pile and its
// trunks coming down; snares, the stake pit, the ford's shallows; the hornblower's horn and
// the woodsman's net; the crows bursting up before an ambush; the hounds baying.
//
// Drawn in code over the wood's painted bark (assets/env/wood/surf_log.png) until their own
// paintings come (the ChatGPT art list: notched pine, log pile, snare, stake pit).

import { SETTINGS } from '../config/settings.js';
import { DEPTH, depthScale } from './depths.js';
import { FONT } from './fonts.js';
import { playSfx, DK } from '../core/Sfx.js';
import { artKey } from './levelArt.js';
import { TRAPS } from '../stage/WoodTraps.js';
import { chainPath, drawChain } from './chainDraw.js';
import { PROP_LIGHT, lightProp, groundUnder } from './propGround.js';

// The wood's own light on its painted traps, as on its crates and barrels (view/propGround.js):
// they were painted clean and warm, and stood out of the night road like stickers (Nick,
// 2026-11-19: "the trees and snares still feel off and not part of the map")
const WOOD_LIGHT = PROP_LIGHT.gallowsWood;
const woodLit = (img, k = 1) => { if (img) lightProp(img, WOOD_LIGHT, k); return img; };

const BARK = artKey('wood', 'surf-log');
// the painted traps (ChatGPT, 2026-11-14; tools/cut-wood-art.py): each falls back to code
const ART = Object.fromEntries(['trap_pine', 'trap_logpile', 'trap_logpile_loose', 'trap_log', 'trap_snare',
  'trap_snare_sprung', 'trap_stakes', 'trap_stakes_open', 'pen_gate', 'trap_deadfall', 'net_fly', 'net_down',
  'signal_lantern', 'signal_lantern_down', 'war_horn', 'war_horn_blow'].map((n) => [n, artKey('wood', n)]));
// the painted signal lantern (ChatGPT, 2026-11-20; Nick: "the signal lantern needs GOOD ART"):
// its height in the world, the pole's middle and the fire in the lantern (fractions of the
// picture), and the fallen one's height (its snapped foot at its left end, by the stump)
// the war horn (war_horn / war_horn_blow): its mouthpiece in each picture, its length in the
// world on a man 120 tall
const HORN = { mouth: { x: 0.006, y: 0.476 }, mouthBlow: 0.51, len: 54 };
const SIGNAL = { h: 210, pole: 0.393, fire: { x: 0.709, y: 0.349 }, downH: 86 };
// where things are in the paintings (fractions of the cut-out): the sprung snare's noose,
// the armed snare's ring of cord, the pine's foot
const SPOT = { noose: { x: 0.718, y: 0.56 }, ground: 0.975, ring: { x: 0.45, y: 0.8 }, pine: { x: 0.47, y: 0.95 } };
const rand = (a, b) => a + Math.random() * (b - a);
// how high up the painted pine's notch is (px over its foot): where its trunk hinges over
const PINE_HINGE = 108; // (the painted notch: row ~500 of 720, the foot at 684, at 430/720 scale)
// the rolling trunks' little canvases (paintRoller): the cut end's radius, the bark strip's
// height and its round (one full turn), the canvas, where the cut end's middle sits in it,
// the far end's curve; and where in the painted pile (trap_logpile, 698x562) the top log's
// cut end is, and which part of the painted side-on log (trap_log) to lay round it
const LOG_ART = { r: 48, body: 40, period: 266, w: 104, h: 126, cy: 74, cap: 8,
  end: { x: 358, y: 105, r: 72 }, bark: { x: 820, y: 40, w: 180, h: 260 } };

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
    if (stage.data.ruts) this.drawRuts(stage.data.ruts);
    this.convoy = null; // (the opening: the convoy's lanterns going away up the road)
    for (const pr of stage.props) {
      if (pr.kind === 'pine') this.pines.set(pr.id, this.makePine(pr));
      if (pr.kind === 'logpile') this.piles.set(pr.id, this.makePile(pr));
    }
    for (const t of this.rig.traps) {
      const v = { g: scene.add.graphics() };
      const key = t.type === 'snare' ? ART.trap_snare : t.type === 'stakes' ? ART.trap_stakes : null;
      if (key && scene.textures.exists(key)) v.img = woodLit(scene.add.image(t.x, t.z, key), t.type === 'snare' ? 0.9 : 1);
      // sat in the mud: a dark wet pool under it (the sapling's foot, the mat's edge)
      if (v.img && t.type === 'snare') v.ground = groundUnder(scene, t.x + 30, t.z + 2, 90, t.z - 1.2, { seed: t.id + 11, deep: 0.7 });
      if (t.type === 'deadfall') {
        // its own painting when it comes (ChatGPT: trap_deadfall); till then the painted log
        // with sharpened stakes lashed through it
        const k = scene.textures.exists(ART.trap_deadfall) ? ART.trap_deadfall : scene.textures.exists(ART.trap_log) ? ART.trap_log : null;
        if (k) v.ram = woodLit(scene.add.image(0, 0, k).setOrigin(0.5, k === ART.trap_deadfall ? 0.54 : 0.5), 1.1); // (the painting: its trunk's middle)
        v.own = k === ART.trap_deadfall;
        v.front = scene.add.graphics();
      }
      this.traps.set(t.id, v);
    }
    // the kennels' pen gates: iron-banded timber bars in front of the hounds (they drop into
    // the mud when a phase lets them out). Painted gates are on the ChatGPT list.
    this.gates = this.rig.pens.map((pen) => ({ pen, g: scene.add.graphics().setDepth(pen.z + 8), drop: 0,
      img: scene.textures.exists(ART.pen_gate) ? woodLit(scene.add.image(pen.x, pen.z + 10, ART.pen_gate).setOrigin(0.5, 1).setDepth(pen.z + 8)) : null }));
    this.drawGates();
    // the mist banks and the Ashen's signal lanterns in them (stage/WoodTraps.js updateMist)
    this.mistG = scene.add.graphics().setDepth(1500);
    this.signals = stage.props.filter((pr) => pr.kind === 'signal').map((pr) => ({ pr, g: scene.add.graphics().setDepth(pr.z), glow: scene.add.graphics().setDepth(pr.z + 0.5).setBlendMode('ADD'),
      label: scene.add.text(pr.x, pr.z - 190, '', { fontFamily: FONT.display, fontSize: '15px', color: '#ffb080', stroke: '#140c06', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(1600) }));
    // the log pile's call to cut its rope (Nick, 2026-11-15: "trees cut down and tied up for no reason")
    this.pileLabels = stage.props.filter((pr) => pr.kind === 'logpile').map((pr) => ({ pr,
      label: scene.add.text(pr.x, pr.z - 150, '', { fontFamily: FONT.display, fontSize: '15px', color: '#ffd890', stroke: '#140c06', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(1600) }));
    this.chainG = scene.add.graphics().setDepth(1400);
    this.listen();
  }

  // ------------------------------------------------------------ the mist and its lantern

  // The mist: soft drifting banks (the 'glow' puff, so no edges show), not a grid of flat
  // ellipses (Nick, 2026-11-19: it read as a heap of grey circles laid over the carts)
  drawMist() {
    const cam = this.scene.cameras.main; const B = this.scene.world.bounds;
    const heroes = this.scene.players?.filter((p) => p.alive) ?? [];
    const now = this.scene.time.now;
    const pool = this.mistPuffs ??= [];
    let n = 0;
    for (const M of this.rig.mists) {
      if (M.x1 < cam.scrollX - 100 || M.x0 > cam.scrollX + cam.width / cam.zoom + 100) continue;
      const base = M.out ? 0.3 : 0.58;
      for (let x = M.x0, i = 0; x <= M.x1; x += 80, i++) {
        for (let z = B.minZ - 40, j = 0; z <= B.maxZ + 30; z += 50, j++) {
          const drift = Math.sin(now / 2300 + i * 1.7 + j * 0.9) * 34;
          const cx = x + drift + (j % 2) * 40; const cy = z - 46 + Math.sin(now / 1900 + i + j * 2.1) * 6;
          // thin around each hero: he sees a little way into it; past that, men are shapes
          let k = 1;
          for (const p of heroes) { const d = Math.hypot((p.x - cx) * 0.8, (p.z - z) * 1.6); k = Math.min(k, Math.max(0, Math.min(1, (d - 100) / 190))); }
          const edge = Math.min(1, (x - M.x0) / 200, (M.x1 - x) / 200);
          const a = base * k * Math.max(0, edge) * (0.75 + 0.25 * Math.sin(now / 1100 + i * 0.7 + j));
          if (a < 0.02) continue;
          const img = pool[n] ??= this.scene.add.image(0, 0, 'glow').setTint(0x8a98a4).setDepth(1500);
          img.setVisible(true).setPosition(cx, cy).setDisplaySize(300 + (j % 3) * 40, 130 + (i % 2) * 30).setAlpha(Math.min(0.5, a * 0.42));
          n++;
        }
      }
    }
    for (let i = n; i < pool.length; i++) pool[i].setVisible(false);
  }

  drawSignals() {
    const now = this.scene.time.now;
    const fight = this.stage.fightOn;
    for (const S of this.signals) {
      const pr = S.pr; const g = S.g.clear(); const gl = S.glow.clear();
      const M = this.rig.mists.find((m) => m.tag === pr.tag);
      const x = pr.x; const z = pr.z;
      g.fillStyle(0x000000, 0.4).fillEllipse(x, z + 2, 40, 10);
      const painted = this.scene.textures.exists(ART.signal_lantern);
      if (painted) {
        const down = !!pr.broken && this.scene.textures.exists(ART.signal_lantern_down);
        S.img ??= this.scene.add.image(0, 0, ART.signal_lantern).setOrigin(SIGNAL.pole, 1);
        if (down !== S.down) {
          // knocked down: the pole across the mud, the lantern smashed and its embers dying
          S.down = down;
          S.img.setTexture(down ? ART.signal_lantern_down : ART.signal_lantern).setOrigin(down ? 0.02 : SIGNAL.pole, 1);
          S.img.setScale((down ? SIGNAL.downH : SIGNAL.h) * depthScale(z) / S.img.frame.height);
          // (lit warm by its own fire: the wood's cold light only at the foot)
          if (down) lightProp(S.img, WOOD_LIGHT, 0.9); else S.img.setTint(0xffe0d0, 0xffe0d0, WOOD_LIGHT.low, WOOD_LIGHT.low);
        }
        S.img.setPosition(down ? x - 20 : x, z + 6).setDepth(z);
        if (pr.broken) {
          // the last embers in the smashed lantern, going out
          const k = Math.max(0, 1 - (pr.brokenT = (pr.brokenT ?? 0) + 1) / 400);
          if (k > 0) gl.fillStyle(0xff4020, 0.14 * k * (0.7 + 0.3 * Math.sin(now / 90))).fillCircle(x + S.img.displayWidth * 0.82 - 20, z - 10, 26);
          S.label.setVisible(false);
          continue;
        }
        // the fire: a flicker of light round the lantern and down the pole and the mist, and
        // now and then a spark going up
        const fl = 0.75 + 0.25 * Math.sin(now / 70) * Math.sin(now / 113);
        const w = S.img.displayWidth; const h = S.img.displayHeight;
        const lx = x + (SIGNAL.fire.x - SIGNAL.pole) * w; const ly = z + 6 - (1 - SIGNAL.fire.y) * h;
        gl.fillStyle(0xff4020, 0.13 * fl).fillCircle(lx, ly, 90).fillStyle(0xff6030, 0.18 * fl).fillCircle(lx, ly, 40).fillStyle(0xffb070, 0.22 * fl).fillCircle(lx, ly, 14);
        gl.fillStyle(0xff4020, 0.08 * fl).fillEllipse(lx - 10, z + 4, 150, 26); // (its red on the mud)
        const sp = (now / 900 + x) % 1;
        gl.fillStyle(0xffb060, 0.8 * (1 - sp)).fillCircle(lx + Math.sin(now / 300) * 6, ly - 20 - sp * 60, 1.6);
        const show = fight && this.stage.index === M?.section;
        S.label.setVisible(show).setText(show ? 'SMASH THE SIGNAL LANTERN' : '').setY(z - SIGNAL.h - 16 - Math.abs(Math.sin(now / 300)) * 4);
        continue;
      }
      if (pr.broken) {
        // knocked down: the pole in the mud, the lantern smashed and dark beside it
        g.fillStyle(0x1e1610, 1).fillRect(x - 70, z - 6, 110, 7);
        g.fillStyle(0x2a2a2e, 1).fillRect(x + 42, z - 14, 16, 14);
        g.fillStyle(0x0c0c0c, 1).fillRect(x + 45, z - 11, 10, 8);
        S.label.setVisible(false);
        continue;
      }
      const ly = z - 150;
      // the pole and its arm, the lantern hung off it, burning the Ashen red
      g.fillStyle(0x1e1610, 1).fillRect(x - 4, z - 170, 8, 172).fillRect(x - 4, z - 170, 30, 6);
      g.lineStyle(2, 0x2a2a2e, 1).lineBetween(x + 22, z - 164, x + 22, ly - 14);
      g.fillStyle(0x2a2a2e, 1).fillRect(x + 12, ly - 14, 20, 28);
      const fl = 0.75 + 0.25 * Math.sin(now / 70) * Math.sin(now / 113);
      g.fillStyle(0xff5a2a, fl).fillRect(x + 15, ly - 10, 14, 20);
      g.fillStyle(0xffd0a0, fl).fillRect(x + 19, ly - 5, 6, 9);
      gl.fillStyle(0xff4020, 0.16 * fl).fillCircle(x + 22, ly, 70).fillStyle(0xff6030, 0.2 * fl).fillCircle(x + 22, ly, 34);
      const show = fight && this.stage.index === M?.section;
      S.label.setVisible(show).setText(show ? 'SMASH THE SIGNAL LANTERN' : '').setY(z - 200 - Math.abs(Math.sin(now / 300)) * 4);
    }
  }

  drawPileLabels() {
    const now = this.scene.time.now;
    for (const P of this.pileLabels) {
      const pr = P.pr; const sec = this.stage.sections.findIndex((q) => pr.x >= q.x0 && pr.x < q.x1);
      const foes = this.stage.livingFoes?.() ?? [];
      const below = foes.some((f) => f.x > pr.lane.x0 && f.x < pr.lane.x1); // (where its trunks will go: down the bank to the ford)
      const show = !pr.broken && this.stage.fightOn && this.stage.index === sec && below;
      P.label.setVisible(show).setText(show ? 'CUT THE ROPE!' : '').setY(pr.z - 150 - Math.abs(Math.sin(now / 260)) * 5);
    }
  }

  // The Houndmaster's chain: wound round over his head (the tell), then lashed out, and on a
  // hero it caught, the chain from his fist to him
  drawChains() {
    const g = this.chainG.clear(); const now = this.scene.time.now;
    for (const f of this.scene.world.fighters) {
      if (!f.alive) continue;
      const top = f.z - f.h - (f.stats.body?.h ?? 120);
      if (f.chainT > 0) {
        const r = 30 + 14 * f.chainT; const cx = f.x - f.facing * 6; const cy = top + 4;
        // one unbroken loop of chain whirled over his head, its links running round it
        const ring = []; const rx = r * 1.1; const ry = r * 0.3;
        for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; ring.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }); }
        drawChain(g, ring, { link: 10, thick: 6, phase: now / 6 });
      }
      if (f.chained) {
        const b = this.scene.world.fighters.find((o) => o.id === f.chained.by);
        if (!b) continue;
        const hx = b.x + b.facing * 20; const hy = b.z - b.h - (b.stats.body?.h ?? 120) * 0.6;
        const px = f.x; const py = f.z - f.h - (f.stats.body?.h ?? 120) * 0.45;
        // pulled taut-ish: a shallow sag, drawn from the hero back to his fist
        drawChain(g, chainPath({ x: px, y: py }, { x: hx, y: hy }, 10), { link: 10, thick: 7 });
      }
    }
  }

  // ------------------------------------------------------------ the notched pine

  makePine(pr) {
    const s = this.scene; const H = 330; const W = 50;
    const c = s.add.container(pr.x, pr.z - (pr.y ?? 0)).setDepth(pr.z);
    const shadow = s.add.ellipse(pr.x, pr.z, 90, 14, 0x000000, 0.45).setDepth(DEPTH.floor + 2);
    if (s.textures.exists(ART.trap_pine)) {
      // painted: the notch is cut on its left, the side it falls to (so it's mirrored to fall right).
      // Two pieces of the one painting: the stump (roots and the foot of the trunk, up to the
      // notch) stays standing; the rest hinges over at the notch (Nick, 2026-11-16: the trees
      // "awkwardly flop over": the whole tree, roots and all, used to tip over from the ground)
      const flip = (pr.fellDir ?? 1) > 0;
      const stumpImg = s.add.image(0, 8, ART.trap_pine).setOrigin(SPOT.pine.x, SPOT.pine.y);
      const sc = 430 / stumpImg.height; stumpImg.setScale(sc).setFlipX(flip);
      const FH = stumpImg.frame.height; const FW = stumpImg.frame.width;
      const cut = SPOT.pine.y * FH - PINE_HINGE / sc; // (the notch's row in the painting)
      stumpImg.setCrop(0, cut, FW, FH - cut);
      woodLit(stumpImg, 1.05);
      const stump = s.add.container(pr.x, pr.z - (pr.y ?? 0)).setDepth(pr.z - 0.1).add(stumpImg);
      // its roots in the mud: a soft dark pool and a little kicked-up dirt, not a flat ring
      groundUnder(s, pr.x, pr.z - (pr.y ?? 0) + 4, 120, pr.z - 0.2, { seed: pr.id + 7, deep: 0.8 });
      shadow.setVisible(false);
      // the hinge: the container sits at the notch; the trunk hangs off it, foot where it was
      c.setY(pr.z - (pr.y ?? 0) + 8 - PINE_HINGE);
      const img = s.add.image(0, PINE_HINGE, ART.trap_pine).setOrigin(SPOT.pine.x, SPOT.pine.y).setScale(sc).setFlipX(flip);
      img.setCrop(0, 0, FW, cut + 2);
      woodLit(img, 1.05);
      c.add(img);
      const v = { c, stump, notch: s.add.graphics().setY(PINE_HINGE - 8), shadow, H, W, hits: 0, fallen: false, painted: true, hingeY: c.y };
      c.add(v.notch);
      return v;
    }
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
    if (v.painted) {
      // painted notch: fresh pale wood showing deeper with each blow
      const dir = pr.fellDir ?? 1; const d = 1 - pr.hp / 3;
      if (d > 0) g.fillStyle(0xf0d8a8, 0.35 + 0.4 * d).fillTriangle(dir * 22, -70, dir * 22, -44, dir * (22 - 18 * d), -56);
      return;
    }
    const d = (1 - pr.hp / 3) * 0.6 + 0.25; const W = v.W; const y = -46; const dir = pr.fellDir ?? 1;
    const x0 = dir * (W / 2); const deep = dir * W * d;
    g.fillStyle(0xe8c890, 1).fillTriangle(x0, y - 16, x0, y + 12, x0 - deep, y + 2);
    g.fillStyle(0x8a6a40, 1).fillTriangle(x0, y + 2, x0, y + 12, x0 - deep, y + 2);
    // a woodsman's blaze, cut into the bark above it: this one comes down
    g.fillStyle(0xc8b088, 0.85).fillRect(-8, -112, 16, 24);
    g.fillStyle(0x6a1010, 0.8).fillRect(-5, -108, 10, 4).fillRect(-5, -100, 10, 4);
  }

  syncPines() {
    const now = this.scene.time.now;
    for (const [id, v] of this.pines) {
      const pr = this.stage.props.find((p) => p.id === id);
      const F = this.rig.falls.find((f) => f.pr === pr);
      if (F && !v.fallen) {
        // over she goes, as a tree does: the cut gives and it hangs a moment, shivering, then
        // leans; gravity takes it and it comes down faster and faster, the last of it a slam
        // (the sim's own count: it lands, and crushes, at TRAPS.pine.fall)
        const k = Math.min(1, F.t / TRAPS.pine.fall);
        const lean = (Math.exp(4.2 * k) - 1) / (Math.exp(4.2) - 1);
        const shiver = k < 0.3 ? Math.sin(now / 22) * 0.8 * (1 - k / 0.3) : 0;
        v.c.setAngle(F.dir * (90 * lean + shiver));
        v.shadow.setScale(1 + lean * 2.4, 1).setX(pr.x + F.dir * lean * 110);
      }
      if (v.land) {
        // the slam: it drops off the stump onto the road, bounces once, twice, and lies still
        const e = (now - v.land.at) / 1000;
        const drop = Math.min(1, e / 0.12);
        const bounce = 7 * Math.exp(-5.5 * e) * Math.abs(Math.sin(e * 15));
        v.c.setAngle(v.land.dir * (90 - bounce)).setY(v.hingeY + (v.land.y - v.hingeY) * drop * drop).setX(pr.x + (v.land.x - pr.x) * drop);
        if (e > 1.2) { v.c.setAngle(v.land.dir * 90).setPosition(v.land.x, v.land.y); v.land = null; }
      }
    }
  }

  // Down: it lies along the road where it fell, over the stream: the bridge
  pineDown(pr, dir, x0, x1) {
    const v = this.pines.get(pr.id);
    if (!v) return;
    v.fallen = true;
    const s = this.scene;
    v.c.setAngle(dir * 90).setDepth(pr.z + 0.6);
    if (v.painted) v.land = { at: s.time.now, dir, y: pr.z - 12, x: pr.x + dir * 34 }; // (its butt slides off the stump, which stands beside it)
    else v.c.setY(pr.z - 12);
    v.shadow.setScale(3.6, 1.4).setPosition(pr.x + dir * 150, pr.z + 4);
    s.fx?.shake(11, 24);
    playSfx(s, 'woodLogs', { volume: 1, pitch: -500, minGapMs: 0 });
    playSfx(s, DK.wood, { volume: 0.9, pitch: -900, minGapMs: 0 });
    const wet = this.stage.terrain?.inPit((x0 + x1) / 2, pr.z);
    if (wet) playSfx(s, 'waterSplash', { volume: 0.8, minGapMs: 0 });
    // the length of it: needles and bark burst up, the crown end hardest; dust (or spray) all along
    for (let i = 0; i < 44; i++) {
      const u = Math.random(); const x = dir > 0 ? x0 + (x1 - x0) * u : x1 - (x1 - x0) * u; // (u: out toward the crown)
      s.gore?.spawn({ x, z: pr.z + rand(-22, 22), h: rand(4, 30), vx: rand(-80, 80) + dir * 60 * u, vz: 0, vh: rand(100, 200 + 180 * u), tint: wet && i % 2 ? 0x8aa0a8 : i % 3 ? 0x2a3a20 : 0x5a4028, scale: rand(0.4, 1), decal: false, life: rand(30, 70) });
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
    const painted = s.textures.exists(ART.trap_logpile);
    let v0ground = null;
    const img = painted ? s.add.image(pr.x, pr.z + 6, ART.trap_logpile).setOrigin(0.5, 0.96).setDepth(pr.z - 1.8) : null;
    if (img) {
      img.setScale(240 / img.width);
      woodLit(img);
      v0ground = groundUnder(s, pr.x, pr.z + 4, 210, pr.z - 2.2, { seed: pr.id + 3 });
    }
    const v = { g, ends, rope, logs, loose: false, img, painted, ground: v0ground };
    this.drawPile(v, pr);
    return v;
  }

  drawPile(v, pr) {
    const { g, ends, rope } = v;
    g.clear(); ends.clear(); rope.clear();
    if (v.img) {
      // painted: the stacked pile, or the empty posts and the cut rope once it's gone
      if (v.loose && this.scene.textures.exists(ART.trap_logpile_loose)) v.img.setTexture(ART.trap_logpile_loose).setScale(240 / v.img.frame.width);
      else if (v.loose) v.img.setVisible(false);
      return;
    }
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

  // The trunks' own look, made once: a cut end (from the painted pile's top log) to turn,
  // and a strip of the painted log's bark laid round the way it goes (so it can scroll as the
  // trunk turns). Each rolling trunk is then drawn into its own little canvas each frame:
  // its top going back from us, the bark sliding over it, shaded round, and the cut end
  // turning in front (LOG_ART: canvas px, twice the size it shows)
  makeLogArt() {
    if (this.logArt !== undefined) return this.logArt;
    const s = this.scene; const R = LOG_ART.r;
    const pile = s.textures.exists(ART.trap_logpile) ? s.textures.get(ART.trap_logpile).getSourceImage() : null;
    const side = s.textures.exists(ART.trap_log) ? s.textures.get(ART.trap_log).getSourceImage() : s.textures.exists(BARK) ? s.textures.get(BARK).getSourceImage() : null;
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    // the cut end
    const disc = canvas(R * 2, R * 2); const d = disc.getContext('2d');
    d.save(); d.beginPath(); d.arc(R, R, R, 0, Math.PI * 2); d.clip();
    if (pile) { const c = LOG_ART.end; d.drawImage(pile, c.x - c.r, c.y - c.r, c.r * 2, c.r * 2, 0, 0, R * 2, R * 2); }
    else {
      d.fillStyle = '#2a1e14'; d.fillRect(0, 0, R * 2, R * 2);
      d.fillStyle = '#b89468'; d.beginPath(); d.arc(R, R, R * 0.84, 0, Math.PI * 2); d.fill();
      d.strokeStyle = 'rgba(122,90,56,0.8)'; d.lineWidth = 2;
      for (const k of [0.62, 0.42, 0.22]) { d.beginPath(); d.arc(R, R, R * k, 0, Math.PI * 2); d.stroke(); }
      d.beginPath(); d.moveTo(R, R); d.lineTo(R * 1.7, R * 0.6); d.stroke(); // (a split: so the turn can be seen)
    }
    d.restore();
    // the bark round it: half its round from the painting, then the same mirrored, so it
    // wraps without a seam
    const P = LOG_ART.period; const H = LOG_ART.body;
    const bark = canvas(P, H); const b = bark.getContext('2d');
    if (side) {
      const c = side === s.textures.get(ART.trap_log)?.getSourceImage() ? LOG_ART.bark : { x: 0, y: 0, w: side.width, h: side.height };
      b.setTransform(0, 1, 1, 0, 0, 0); b.drawImage(side, c.x, c.y, c.w, c.h, 0, 0, H, P / 2);
      b.setTransform(0, 1, -1, 0, P, 0); b.drawImage(side, c.x, c.y, c.w, c.h, 0, 0, H, P / 2);
      b.setTransform(1, 0, 0, 1, 0, 0);
    } else { b.fillStyle = '#3a2a1a'; b.fillRect(0, 0, P, H); }
    this.logArt = { disc, bark };
    return this.logArt;
  }

  makeRoller(v, pr, g) {
    const s = this.scene; const A = LOG_ART;
    const key = `logroll-${pr.id}-${g.i}`;
    if (s.textures.exists(key)) s.textures.remove(key);
    const tex = s.textures.createCanvas(key, A.w, A.h);
    const img = s.add.image(g.x, g.z, key).setOrigin(0.5, (A.cy + A.r) / A.h).setScale(TRAPS.logs.r / A.r);
    woodLit(img, 1.05);
    const shadow = s.add.ellipse(g.x, g.z, TRAPS.logs.r * 2.3, 13, 0x000000, 0.42);
    const water = s.add.graphics();
    return { g, tex, img, shadow, water, key, drawn: null };
  }

  // One trunk, as it stands this frame: its top going back from us with the bark sliding
  // over it, shaded round; the cut end turning in front, lit from the same side whatever
  // way it has turned
  paintRoller(o, wet = 0) {
    const A = LOG_ART; const art = this.makeLogArt(); const ctx = o.tex.context; const g = o.g;
    const R = A.r; const cx = A.w / 2; const cy = A.cy; const top = 4; const cap = A.cap;
    const ang = Math.round(g.ang * 40) / 40; const sunk = Math.round(wet * 20) / 20;
    if (o.drawn === ang && o.sunk === sunk) return;
    o.drawn = ang; o.sunk = sunk;
    ctx.clearRect(0, 0, A.w, A.h);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, top + cap, R, cap, 0, 0, Math.PI * 2); ctx.rect(cx - R, top + cap, R * 2, cy - top - cap); ctx.clip();
    const off = (((ang * R) % A.period) + A.period) % A.period;
    for (let k = -1; k <= 1; k++) ctx.drawImage(art.bark, cx - R - off + k * A.period, top);
    let sh = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.7)'); sh.addColorStop(0.28, 'rgba(0,0,0,0.12)'); sh.addColorStop(0.42, 'rgba(255,236,200,0.1)');
    sh.addColorStop(0.7, 'rgba(0,0,0,0.2)'); sh.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = sh; ctx.fillRect(cx - R, top, R * 2, cy - top);
    sh = ctx.createLinearGradient(0, top, 0, top + cap * 2.4);
    sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(cx - R, top, R * 2, cap * 2.4);
    ctx.restore();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.drawImage(art.disc, -R, -R, R * 2, R * 2); ctx.restore();
    // (the light stays put while the end turns)
    const lit = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.02);
    lit.addColorStop(0, 'rgba(255,240,210,0.14)'); lit.addColorStop(0.6, 'rgba(0,0,0,0.05)'); lit.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = lit; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    if (sunk > 0) {
      // down in the stream: the water over its lower part, a bright line where it meets it
      const line = cy + R * (1 - sunk * 0.75);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(28,44,54,0.72)'; ctx.fillRect(cx - R - 2, line, R * 2 + 4, A.h - line);
      ctx.fillStyle = 'rgba(190,214,226,0.4)'; ctx.fillRect(cx - R - 2, line - 1, R * 2 + 4, 2);
      ctx.restore();
    }
    o.tex.refresh();
  }

  syncPiles() {
    const L = TRAPS.logs; const now = this.scene.time.now;
    const live = new Set();
    for (const R of this.rig.rolls) {
      const v = this.piles.get(R.pile.id);
      if (!v) continue;
      live.add(v);
      const pr = R.pile;
      if (R.t < L.delay) {
        // the rope gone, the pile groans and shifts, harder and harder, before it goes
        const k = R.t / L.delay;
        if (v.img) v.img.setPosition(pr.x + Math.sin(R.t * 2.3) * (0.5 + k * 2.5), pr.z + 6 + Math.abs(Math.sin(R.t * 1.7)) * k * 1.5).setAngle(Math.sin(R.t * 1.1) * k * 1.2);
        continue;
      }
      if (!v.loose) { v.loose = true; if (v.img) v.img.setPosition(pr.x, pr.z + 6).setAngle(0); this.drawPile(v, pr); }
      v.rollers ??= new Map();
      for (const g of R.logs) {
        let o = v.rollers.get(g.i);
        if (g.state === 'gone') { if (o) this.dropRoller(o); v.rollers.delete(g.i); continue; }
        if (!o) v.rollers.set(g.i, o = this.makeRoller(v, pr, g));
        const wet = g.wet && g.h < 1;
        // (settling down into the water as it slows, then bobbing)
        o.wet = wet ? Math.min(1, (o.wet ?? 0) + 0.05) : 0;
        const bob = g.state === 'float' ? Math.sin(now / 420 + g.i * 1.3) * 1.5 : 0;
        const sink = o.wet * 6 + bob;
        o.img.setVisible(g.state !== 'stack').setPosition(g.x, g.z - g.h + sink).setDepth(g.z + 0.6);
        if (g.state !== 'stack') this.paintRoller(o, o.wet ? o.wet * (0.45 + (g.state === 'float' ? 0.15 : 0)) + (bob + 1.5) / 40 : 0);
        // fading: rested a long while on the bank, or carried away downstream
        const fade = g.state === 'float' ? Math.max(0, Math.min(1, (pr.lane.z1 + 150 - g.z) / 80)) : g.state === 'rest' ? Math.max(0, Math.min(1, (L.life - g.age) / 60)) : 1;
        o.img.setAlpha(fade);
        o.shadow.setVisible(g.state !== 'stack' && !wet).setPosition(g.x, g.z + 2).setDepth(g.z - 0.4)
          .setScale(Math.max(0.4, 1 - g.h / 120), 1).setAlpha(Math.max(0.15, 1 - g.h / 90) * fade);
        const w = o.water.clear();
        if (wet) {
          // sat down in the water: the stream laps round its lower half, rings spread off it
          w.setDepth(g.z + 0.7);
          const ring = ((now / 1600 + g.i * 0.37) % 1);
          w.lineStyle(1, 0x9ab4c0, 0.28 * (1 - ring) * fade * o.wet).strokeEllipse(g.x, g.z + 1, L.r * (2.2 + ring * 2), 8 + ring * 8);
        }
        // mud and leaves kicked up behind it as it bowls along the bank
        const sp = Math.hypot(g.vx, g.vz);
        if (g.state === 'roll' && !g.wet && g.h < 2 && sp > 2.5 && Math.random() < 0.35)
          this.scene.gore?.spawn({ x: g.x - Math.sign(g.vx) * L.r * 0.6, z: g.z + rand(-4, 4), h: 2, vx: -g.vx * rand(6, 16), vz: 0, vh: rand(60, 60 + sp * 22), tint: Math.random() < 0.3 ? 0x3a4a22 : 0x2a2018, scale: rand(0.35, 0.8), decal: false, life: rand(18, 34) });
      }
    }
    // gone from the sim: clear away whatever is left
    for (const v of this.piles.values()) if (v.rollers?.size && !live.has(v)) { for (const o of v.rollers.values()) this.dropRoller(o); v.rollers.clear(); }
  }

  dropRoller(o) {
    o.img.destroy(); o.shadow.destroy(); o.water.destroy();
    if (this.scene.textures.exists(o.key)) this.scene.textures.remove(o.key);
  }

  // ------------------------------------------------------------ snares, stakes, the ford

  drawTraps() {
    const t0 = this.scene.time.now;
    for (const t of this.rig.traps) {
      const v = this.traps.get(t.id); const g = v.g.clear();
      if (t.type === 'snare') {
        g.setDepth(t.z - 1);
        if (v.img) { this.drawSnareArt(v, t); continue; }
        if (t.sprung) { this.drawSprung(g, t, t0); continue; }
        // a noose of cord in the leaves, its line running taut back to a bent sapling;
        // a glint on its wire where the light catches it (it can be seen: it's fair)
        g.fillStyle(0x1a1a10, 0.6).fillEllipse(t.x, t.z, 46, 10);
        g.lineStyle(2, 0xa89870, 0.9).strokeEllipse(t.x, t.z - 1, 30, 8);
        g.lineStyle(1.5, 0xa89870, 0.7).lineBetween(t.x + 14, t.z - 2, t.x + 30, t.z - 60).lineBetween(t.x + 30, t.z - 60, t.x + 28, t.z - 160);
        g.fillStyle(0x2a2216, 1).fillTriangle(t.x + 22, t.z - 60, t.x + 38, t.z - 60, t.x + 30, t.z - 168); // (the sapling, bent)
        const glint = 0.35 + 0.35 * Math.max(0, Math.sin(t0 / 380 + t.id));
        g.fillStyle(0xe8f0ff, glint).fillCircle(t.x - 6, t.z - 3, 2);
      } else if (t.type === 'stakes' && v.img) {
        // painted: the mat of boughs, then the open pit and its stakes
        const open = t.open && this.scene.textures.exists(ART.trap_stakes_open);
        v.img.setTexture(open ? ART.trap_stakes_open : ART.trap_stakes).setDepth(DEPTH.floor + 2.5);
        v.img.setScale((t.w + 34) / v.img.frame.width).setPosition(t.x, t.z + 2);
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
      } else if (t.type === 'deadfall') this.drawDeadfall(v, t, t0);
    }
  }

  // The deadfall: the tripwire across the road, and the spiked trunk on its long rope from a
  // bough above the top of the screen (stage/WoodTraps.js deadfallAt)
  drawDeadfall(v, t, t0) {
    const g = v.g; const fr = v.front.clear();
    const D = TRAPS.deadfall; const at = this.rig.deadfallAt(t);
    g.setDepth(t.z - 1); fr.setDepth(t.z + 2);
    // the wire: a cord across the lane between two pegs, a glint on it while it's set
    const z0 = t.z - D.lane; const z1 = t.z + D.lane;
    g.fillStyle(0x2a2216, 1).fillRect(t.x - 2, z0 - 12, 4, 14).fillRect(t.x - 2, z1 - 10, 4, 14);
    if (t.state === 'set') {
      g.lineStyle(1.5, 0xa89870, 0.85).lineBetween(t.x, z0 - 6, t.x + 1, z1 - 4);
      g.fillStyle(0xe8f0ff, 0.3 + 0.35 * Math.max(0, Math.sin(t0 / 330 + t.id))).fillCircle(t.x, t.z + Math.sin(t0 / 900) * D.lane * 0.6, 2);
    } else {
      g.lineStyle(1.5, 0xa89870, 0.7).lineBetween(t.x, z0 - 6, t.x + 8, z0 + 4).lineBetween(t.x, z1 - 4, t.x - 6, z1 - 14); // (snapped)
    }
    // the trunk: where it is on screen; its shadow on the road grows as it comes down
    const y = t.z - at.h; const px = t.x; const py = t.z - (D.len + 50);
    const near = Math.max(0, 1 - at.h / 300);
    if (near > 0) g.fillStyle(0x000000, 0.15 + 0.3 * near).fillEllipse(at.x, t.z, 90 + 90 * near, 10 + 6 * near);
    const visible = y > -80;
    if (!visible) { v.ram?.setVisible(false); return; }
    // the rope, from out of sight up in the boughs, forked to the two lashings
    const rot = at.a * 0.35;
    const c = Math.cos(rot); const sn = Math.sin(rot);
    const P = (lx, ly) => ({ x: at.x + lx * c - ly * sn, y: y + lx * sn + ly * c });
    // (the painting's own ropes run up out of its top edge: the fork meets them there)
    const l = v.own ? P(-52, -46) : P(-44, -16); const r = v.own ? P(51, -46) : P(44, -16); const fork = { x: at.x + (px - at.x) * 0.12, y: y + (py - y) * 0.12 };
    g.lineStyle(4, 0x5a4a30, 1).lineBetween(px, py, fork.x, fork.y);
    g.lineStyle(3, 0x6a5a40, 1).lineBetween(fork.x, fork.y, l.x, l.y).lineBetween(fork.x, fork.y, r.x, r.y);
    if (v.ram) {
      v.ram.setVisible(true).setPosition(at.x, y).setRotation(rot).setDepth(t.z + 1.5);
      if (v.own) v.ram.setScale(220 / v.ram.frame.width);
      else v.ram.setDisplaySize(200, 40);
    } else {
      const body = [P(-100, -18), P(100, -18), P(100, 18), P(-100, 18)];
      fr.fillStyle(0x3a2a1a, 1).fillPoints(body, true);
    }
    if (!v.own) {
      // the stakes: sharpened, lashed through the trunk, out both ends and along its belly;
      // dark with what they've already been through
      const spike = (bx, by, tx, ty, w) => {
        const a = P(bx, by); const b = P(tx, ty); const nx = -(b.y - a.y); const ny = b.x - a.x; const k = w / Math.max(1, Math.hypot(nx, ny));
        fr.fillStyle(0xc8a878, 1).fillTriangle(a.x + nx * k, a.y + ny * k, a.x - nx * k, a.y - ny * k, b.x, b.y);
        const m = { x: a.x + (b.x - a.x) * 0.55, y: a.y + (b.y - a.y) * 0.55 };
        fr.fillStyle(0x6a0a0a, 0.85).fillTriangle(m.x + nx * k * 0.5, m.y + ny * k * 0.5, m.x - nx * k * 0.5, m.y - ny * k * 0.5, b.x, b.y);
      };
      for (const [dy, len] of [[-10, 42], [6, 50], [16, 36]]) { spike(96, dy, 96 + len, dy + dy * 0.3, 6); spike(-96, dy, -96 - len, dy + dy * 0.3, 6); }
      for (const dx of [-60, -20, 20, 60]) spike(dx, 16, dx + (dx > 0 ? 8 : -8), 48, 5);
      fr.fillStyle(0x7a6a48, 1).fillPoints([P(-48, -20), P(-40, -20), P(-40, 20), P(-48, 20)], true).fillPoints([P(40, -20), P(48, -20), P(48, 20), P(40, 20)], true);
    }
  }

  // The painted snare: set in the leaves; sprung, the sapling stands up with the cord off its
  // tip, and the painted noose is drawn round the caught man's ankle (scaled to how high he
  // hangs); once he's loose it hangs empty where it was.
  drawSnareArt(v, t) {
    const img = v.img;
    if (!t.sprung) {
      img.setTexture(ART.trap_snare).setDepth(t.z - 1);
      const k = 170 / img.frame.width;
      img.setScale(k).setPosition(t.x + (0.5 - SPOT.ring.x) * img.frame.width * k, t.z + (1 - SPOT.ring.y) * img.frame.height * k);
      return;
    }
    if (!this.scene.textures.exists(ART.trap_snare_sprung)) { img.setVisible(false); this.drawSprung(v.g, t, this.scene.time.now); return; }
    img.setTexture(ART.trap_snare_sprung).setOrigin(SPOT.noose.x, SPOT.noose.y);
    const f = t.caught != null ? this.scene.world.fighters.find((o) => o.id === t.caught) : null;
    const A = f ? this.scene.views?.get(f.id)?.hangAnkle : null;
    if (A && A.k > 0.05) { // (from the moment it bites: the cord goes up with him)
      const ground = f.z - (f.floor ?? 0);
      const lift = Math.max(60, ground - A.y);
      const k = lift / ((SPOT.ground - SPOT.noose.y) * img.frame.height);
      if (A.k >= 0.99) v.hung = { x: A.x, y: A.y + 24, k }; // (where it rests once he's gone: at full height)
      // (the loop's foot round his boots: the frame's foot line sits a little past the painted soles)
      img.setScale(k).setPosition(A.x, A.y + (A.painted ? -4 : 24)).setDepth(f.z + (A.painted ? -0.3 : 0.3)).setAngle(0); // (the loop round his ankle, a boot's height under the sole; his painted pose has its own knot)
    } else {
      // empty: where it was, swaying a little (or, never having held anyone, a default height)
      const H = v.hung ?? { x: t.x, y: t.z - 150, k: 150 / ((SPOT.ground - SPOT.noose.y) * img.frame.height) };
      img.setScale(H.k).setPosition(H.x, H.y).setDepth(t.z - 1).setAngle(Math.sin(this.scene.time.now / 500 + t.id) * 1.5);
    }
  }

  // Sprung: the sapling whipped upright, bowed over the man it caught, the cord running from
  // its tip down to his ankle (or, once he's loose, hanging empty with the noose at its end).
  drawSprung(g, t, t0) {
    const f = t.caught != null ? this.scene.world.fighters.find((o) => o.id === t.caught) : null;
    const A = f ? this.scene.views?.get(f.id)?.hangAnkle : null;
    const k = A?.k ?? 0;
    const baseX = t.x + 34; const baseY = t.z;
    // its tip: bent over above him by his weight; springing back up straight when he's gone
    const tipX = baseX - 26 - 6 * k + Math.sin(t0 / 260 + t.id) * (k ? 3 : 1.2);
    const tipY = A ? Math.min(A.y - 60, baseY - 230) : baseY - 290;
    const midX = baseX + 6; const midY = (baseY + tipY) / 2;
    g.lineStyle(9, 0x2a2216, 1).beginPath().moveTo(baseX, baseY);
    for (let i = 1; i <= 10; i++) {
      const u = i / 10; const a = (1 - u) * (1 - u); const b = 2 * (1 - u) * u; const c = u * u;
      g.lineTo(a * baseX + b * midX + c * tipX, a * baseY + b * midY + c * tipY);
      if (i === 5) g.strokePath().lineStyle(6, 0x2a2216, 1).beginPath().moveTo(a * baseX + b * midX + c * tipX, a * baseY + b * midY + c * tipY);
    }
    g.strokePath();
    g.fillStyle(0x16200e, 0.9).fillEllipse(tipX - 8, tipY - 6, 34, 14).fillEllipse(midX + 14, midY - 20, 28, 10);
    if (A) g.lineStyle(1.5, 0xa89870, 1).lineBetween(tipX, tipY + 2, A.x, A.y + 2);
    else {
      // empty: the cord hangs down off the tip, the noose open at its end, swaying
      const sw = Math.sin(t0 / 420 + t.id) * 6;
      g.lineStyle(1.5, 0xa89870, 0.9).lineBetween(tipX, tipY + 2, tipX + sw, tipY + 120);
      g.strokeEllipse(tipX + sw, tipY + 128, 12, 16);
    }
  }

  // ------------------------------------------------------------ the kennels

  drawGates() {
    for (const G of this.gates) {
      const g = G.g.clear(); const pen = G.pen;
      if (pen.open) G.drop = Math.min(1, G.drop + 0.08); else G.drop = Math.max(0, G.drop - 0.3); // (slammed: it comes up fast)
      if (G.drop >= 1) { G.img?.setVisible(false); continue; }
      G.img?.setVisible(true);
      const w = 52 + (pen.count ?? 1) * 34; const h = 96; const x0 = pen.x - w / 2; const yb = pen.z + 10;
      const sink = G.drop * h; // (down into the mud)
      const top = yb - h + sink;
      if (G.img) {
        // painted: the whole gate slides down into the mud (cropped at the ground line)
        const I = G.img; const fw = I.frame.realWidth ?? I.frame.width; const fh = I.frame.realHeight ?? I.frame.height;
        const k = (w + 30) / fw; const gone = G.drop * fh;
        I.setScale(k).setPosition(pen.x, yb + 4 + gone * k).setCrop(0, 0, fw, Math.max(0, fh - gone)).setVisible(G.drop < 1);
        g.fillStyle(0x000000, 0.35).fillEllipse(pen.x, yb + 2, w + 20, 12);
        continue;
      }
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
      const want = f.alive && (f.horn && !f.horn.done || f.bossHorn || f.snare || f.chained || f.latch || f.packTell > 0 || f.netSpin > 0 || f.drive?.on || f.order && f.order.t < f.order.wait);
      if (m?.net && f.snare?.kind !== 'net') m.net.setVisible(false);
      if (m?.coil && !(f.alive && f.snare?.kind === 'snare' && !this.scene.views?.get(f.id)?.hangAnkle?.painted)) m.coil.setVisible(false);
      if (!want) { if (m) { m.text.setVisible(false); m.horn?.setVisible(false); } continue; }
      if (!m) {
        m = { text: s.add.text(0, 0, '', { fontFamily: FONT.display, fontSize: '15px', color: '#ffd890', stroke: '#140c06', strokeThickness: 4 }).setOrigin(0.5, 1) };
        this.marks.set(f.id, m);
      }
      const top = f.z - f.h - (f.stats.body?.h ?? 120) - 20;
      m.text.setVisible(true).setPosition(f.x, top - 10).setDepth(f.z + 200);
      if (f.snare) {
        // caught: the cord (or the net) on him; a hero gets the call to cut free
        if (f.snare.kind === 'net' && s.textures.exists(ART.net_down)) {
          // the painted net, fallen over him, weights in the mud
          m.net ??= s.add.image(0, 0, ART.net_down).setOrigin(0.5, 0.96);
          m.net.setVisible(true).setPosition(f.x, f.z - f.h + 4).setDepth(f.z + 0.4).setScale(130 / m.net.frame.width);
        } else if (f.snare.kind === 'net') {
          g.lineStyle(1.5, 0xb8a880, 0.9);
          for (let i = -3; i <= 3; i++) g.lineBetween(f.x + i * 12, f.z - f.h - 120, f.x + i * 16, f.z - f.h);
          for (let j = 0; j < 5; j++) g.lineBetween(f.x - 50, f.z - f.h - 120 + j * 28, f.x + 50, f.z - f.h - 116 + j * 28);
        } else {
          // strung up by the ankle (view/SnareHang.js): the noose round it, the cord to the sapling
          const A = this.scene.views?.get(f.id)?.hangAnkle;
          if (A && !A.painted) {
            // the cord bitten tight round his ankle (a boot's height under the sole): three turns, over the sprite (netG draws
            // in front of the men), and a taut stub up into the noose
            m.coil ??= s.add.graphics();
            const c = m.coil.clear().setVisible(true).setDepth(f.z + 0.6);
            for (let i = 0; i < 3; i++) {
              c.lineStyle(3, 0x2a2216, 1).strokeEllipse(A.x, A.y + 16 + i * 5, 17, 6);
              c.lineStyle(1.5, 0xc8a870, 1).strokeEllipse(A.x, A.y + 15 + i * 5, 15, 4);
            }
            c.lineStyle(2.5, 0x2a2216, 1).lineBetween(A.x, A.y + 14, A.x, A.y - 8);
            c.lineStyle(1.2, 0xc8a870, 1).lineBetween(A.x - 0.5, A.y + 14, A.x - 0.5, A.y - 8);
          }
        }
        const shake = Math.sin(now / 40) * 2;
        m.text.setText(f.team === 'player' ? `MASH TO CUT FREE  ${'|'.repeat(Math.max(0, f.snare.left))}` : '').setX(f.x + shake).setColor('#ffe0a0');
        continue;
      }
      if (f.chained || f.latch) {
        // hauled in on the chain, or a hound's jaws in him: the call to break free
        const shake = Math.sin(now / 40) * 2;
        const left = (f.chained ?? f.latch).left;
        m.text.setText(f.team === 'player' ? (f.chained ? `DODGE TO BREAK THE CHAIN  ${'|'.repeat(Math.max(0, left))}` : `MASH TO SHAKE IT OFF  ${'|'.repeat(Math.max(0, left))}`) : '').setX(f.x + shake).setColor('#ffe0a0');
        continue;
      }
      if (f.packTell > 0) {
        // the hound whose turn it is: ears up, coming in
        m.text.setText('!').setColor('#ff6a4a').setY(top + 6 - Math.abs(Math.sin(now / 80)) * 6);
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
      if (f.horn || f.bossHorn) {
        // the hornblower: his name over him, and while he blows, how near it is to sounding
        // (the Houndmaster's own horn: only the call to stop it, once it's at his lips)
        const blowing = (f.horn ?? f.bossHorn).state === 'blow';
        m.text.setText(blowing ? (f.bossHorn ? 'STOP HIS HORN!' : 'STOP THE HORN!') : f.bossHorn ? '' : 'HORNBLOWER').setColor(blowing ? '#ff9a70' : '#ffd890');
        // the horn itself (painted, ChatGPT 2026-11-20: Nick, "the horns need art and to be
        // implemented well"): slung at his hip while he runs for his post; raised to his lips
        // as he blows, tipping up as his breath runs out, the bell shaking; how near it is to
        // sounding over him. (The Houndmaster's own horn the same.)
        const body = f.stats.body?.h ?? 120;
        const k = blowing ? Math.min(1, f.hornT ?? 0) : 0;
        if (s.textures.exists(ART.war_horn)) {
          const key = blowing && k > 0.25 ? ART.war_horn_blow : ART.war_horn;
          m.horn ??= s.add.image(0, 0, ART.war_horn).setOrigin(HORN.mouth.x, HORN.mouth.y);
          const flip = f.facing < 0;
          const oy = key === ART.war_horn_blow ? HORN.mouthBlow : HORN.mouth.y;
          if (m.horn.texture.key !== key || m.horn.flipX !== flip) m.horn.setTexture(key).setFlipX(flip).setOrigin(flip ? 1 - HORN.mouth.x : HORN.mouth.x, oy);
          const len = (f.bossHorn ? HORN.len * 1.25 : HORN.len) * (body / 120);
          const shake = blowing ? Math.sin(now / 28) * (0.6 + 1.6 * k) : 0;
          const mx = f.x + f.facing * (blowing ? body * 0.1 : -body * 0.04);
          const my = f.z - f.h - body * (blowing ? 0.86 : 0.42);
          // (degrees up from level toward his front: raised to his lips, tipping higher as he
          // blows; slung, it hangs bell-down)
          const up = blowing ? 14 + 26 * k + shake : -62;
          m.horn.setVisible(true).setPosition(mx, my).setScale(len / m.horn.frame.width)
            .setAngle(flip ? up : -up).setDepth(f.z + (blowing ? 0.6 : -0.2));
          lightProp(m.horn, WOOD_LIGHT, 1.05);
          if (blowing) {
            // the call building: rings of sound off the bell, more and stronger as it comes
            const a = Phaser.Math.DegToRad(up);
            const bellX = mx + f.facing * Math.cos(a) * len; const bellY = my - Math.sin(a) * len;
            const dir = flip ? Math.PI + a : -a;
            for (let i = 0; i < 3; i++) {
              const p = ((now / 420) + i / 3) % 1;
              g.lineStyle(2, 0xffe8c0, (0.12 + 0.4 * k) * (1 - p)).beginPath()
                .arc(bellX, bellY, 8 + p * (26 + 40 * k), dir - 0.7, dir + 0.7).strokePath();
            }
          }
        } else {
          const hx = f.x + f.facing * 18; const hy = f.z - f.h - body * 0.82;
          g.fillStyle(0xd8c8a0, 1).fillTriangle(hx, hy - 4, hx, hy + 4, hx + f.facing * (blowing ? 34 : 20), hy - (blowing ? 14 : 0));
          g.fillStyle(0x6a5030, 1).fillCircle(hx + f.facing * (blowing ? 34 : 20), hy - (blowing ? 14 : 0), blowing ? 7 : 5);
        }
        if (blowing) {
          g.fillStyle(0x000000, 0.7).fillRect(f.x - 40, top - 4, 80, 8);
          g.fillStyle(k > 0.75 ? 0xff5a3a : 0xffb050, 1).fillRect(f.x - 39, top - 3, 78 * k, 6);
        }
      }
    }
    // the horn's blast, once it sounds: rings going out through the wood, the rain shaken off
    // the boughs over him, the mist torn (hornSounded, listen)
    for (const B of this.hornBlasts ??= []) {
      B.t++;
      for (let i = 0; i < 4; i++) {
        const p = Math.max(0, Math.min(1, (B.t - i * 7) / 50));
        if (p <= 0 || p >= 1) continue;
        g.lineStyle(4 * (1 - p) + 1, 0xffe0b0, 0.55 * (1 - p)).strokeEllipse(B.x, B.y, 60 + p * 900, 24 + p * 300);
      }
      for (const d of B.drops) { d.y += d.v; d.v += 0.35; if (d.y < B.ground) g.fillStyle(0xb8d0e8, 0.7).fillRect(d.x, d.y, 1.5, 6); }
    }
    this.hornBlasts = this.hornBlasts.filter((B) => B.t < 90);
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
    this.netImgs ??= [];
    this.netImgs.forEach((im) => im.setVisible(false));
    for (const [i, n] of this.rig.nets.entries()) {
      const y = n.z - n.h; const r = 30;
      if (s.textures.exists(ART.net_fly)) {
        // the painted net, spread and spinning a little as it flies
        const im = this.netImgs[i] ??= s.add.image(0, 0, ART.net_fly);
        im.setVisible(true).setPosition(n.x, y).setDepth(n.z + 1).setScale(110 / im.frame.width).setAngle(Math.sin(n.run / 9) * 12);
        g.fillStyle(0x000000, 0.3).fillEllipse(n.x, n.z, 60, 8);
        continue;
      }
      g.lineStyle(1.5, 0xc8b890, 0.95).strokeEllipse(n.x, y, r * 2.4, r * 0.8);
      for (let i = 0; i < 6; i++) { const a = n.run / 14 + i * 1.047; g.lineBetween(n.x - Math.cos(a) * r * 1.2, y - Math.sin(a) * r * 0.4, n.x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 0.4); }
      g.fillStyle(0x000000, 0.3).fillEllipse(n.x, n.z, 60, 8);
    }
    this.netG.setDepth(DEPTH.floor + 900);
  }

  // ------------------------------------------------------------ the tree line (the opening)

  // The convoy's trail where the road goes in under the pines (data `ruts`): two deep wheel
  // ruts full of rainwater, the drag of the chains between them, and bare feet beside them,
  // the prisoners walked behind the carts. It stops at the streams (the carts forded them).
  drawRuts(R) {
    const s = this.scene; const T = this.stage.terrain;
    const g = s.add.graphics().setDepth(DEPTH.floor + 3.5);
    let k = 31; const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
    const wet = (x, z) => T?.inPit(x, z) || T?.blockAt(x, z);
    for (const [dz, w] of [[-22, 9], [22, 11]]) {
      for (let x = R.x0; x < R.x1; x += 6) {
        const z = R.z + dz + Math.sin(x / 140) * 6 + Math.sin(x / 37) * 1.5;
        if (wet(x, z)) continue;
        g.fillStyle(0x0a0806, 0.55).fillEllipse(x, z, 9, w); // (the rut cut in the mud)
        g.fillStyle(0x3a2c1e, 0.35).fillEllipse(x, z - w * 0.45, 8, 2); // (its far lip, turned up)
        if (r() < 0.05) {
          const l = 30 + r() * 60; // rainwater lying in it, the moon in it
          g.fillStyle(0x56687a, 0.55).fillEllipse(x + l / 2, z, l, w * 0.55);
          g.fillStyle(0xb8c8d4, 0.35).fillEllipse(x + l / 2 - 4, z - 1, l * 0.4, 1.5);
        }
      }
    }
    // the chains dragged between: a broken, wavering scrape
    g.lineStyle(2, 0x0a0806, 0.5);
    for (let x = R.x0; x < R.x1; x += 14) {
      const z = R.z + Math.sin(x / 140) * 6 + Math.sin(x / 23) * 4;
      if (!wet(x, z) && r() < 0.8) g.lineBetween(x, z, x + 10, R.z + Math.sin((x + 10) / 140) * 6 + Math.sin((x + 10) / 23) * 4);
    }
    // bare feet in the mud beside the ruts (the prisoners, walked behind the carts)
    for (let x = R.x0 + 20; x < R.x1; x += 26 + r() * 30) {
      const z = R.z + (r() < 0.5 ? -46 : 46) + (r() - 0.5) * 16;
      if (wet(x, z)) continue;
      g.fillStyle(0x0c0a08, 0.45).fillEllipse(x, z, 9, 4).fillEllipse(x + 5, z - 1, 3, 2);
    }
  }

  // Far up the road, between the trunks at the back: the convoy's lanterns swinging on their
  // poles, going away into the wood, the black shapes of the carts under them; then gone.
  drawConvoy() {
    const s = this.scene; const C = this.convoy;
    C.t++;
    this.convoyG ??= s.add.graphics().setDepth(DEPTH.floor - 0.95);
    const g = this.convoyG.clear();
    const life = 520;
    if (C.t > life) { g.destroy(); this.convoyG = null; this.convoy = null; return; }
    const a = Math.min(1, C.t / 50) * Math.min(1, (life - C.t) / 140);
    const y = SETTINGS.world.floorTop - 62;
    for (let i = 0; i < 3; i++) {
      const x = C.x + i * 70 + C.t * 0.35 + Math.sin(C.t / 22 + i) * 2;
      const ly = y - 34 + Math.sin(C.t / 9 + i * 2) * 2; // (the lantern swinging on its pole)
      g.fillStyle(0x020304, 0.55 * a).fillRect(x - 24, y - 16, 48, 18); // the cart
      g.fillStyle(0x020304, 0.55 * a).fillCircle(x - 14, y + 3, 6).fillCircle(x + 14, y + 3, 6);
      g.lineStyle(1.5, 0x020304, 0.6 * a).lineBetween(x + 18, y - 16, x + 18, ly);
      g.fillStyle(0xffa040, 0.08 * a).fillCircle(x + 18, ly, 26);
      g.fillStyle(0xffb050, 0.22 * a).fillCircle(x + 18, ly, 10);
      g.fillStyle(0xffe0a0, 0.95 * a).fillCircle(x + 18, ly, 2.6);
    }
  }

  // ------------------------------------------------------------ the ford's shallows

  // Anyone knee-deep in the shallows (Terrain.wadeAt): a ring of water round his shins, and
  // while he slogs on, spray kicked up at each step and the slosh of it
  drawWading() {
    const s = this.scene; const T = this.stage.terrain;
    this.wadeG ??= s.add.graphics().setDepth(DEPTH.floor + 40);
    const g = this.wadeG.clear();
    const now = s.time.now;
    const feet = [
      ...this.scene.world.fighters.filter((f) => f.alive && f.grounded && f.h - (f.floor ?? 0) < 2 && (f.floor ?? 0) <= 0).map((f) => ({ id: f.id, x: f.x, z: f.z, moving: Math.abs(f.vx) + Math.abs(f.vz) > 20, w: 34 * (f.stats.size ?? 1), hero: f.team === 'player' })),
      ...(this.stage.story?.npcs ?? []).filter((n) => n.wading && n.moving !== false).map((n) => ({ id: `n${n.id}`, x: n.x, z: n.z, moving: true, w: 30 })),
    ];
    this.wadeStep ??= new Map();
    for (const f of feet) {
      if (T.wadeAt(f.x, f.z) >= 1) { this.wadeStep.delete(f.id); continue; }
      const bob = Math.sin(now / 140 + f.x) * 1.5;
      g.fillStyle(0x9ab0b8, 0.22).fillEllipse(f.x, f.z - 3, f.w * 1.5 + bob, 10);
      g.lineStyle(1.5, 0xe0eaec, 0.5).strokeEllipse(f.x, f.z - 3, f.w * 1.3 + bob, 8);
      if (!f.moving) continue;
      const k = (this.wadeStep.get(f.id) ?? 0) + 1;
      this.wadeStep.set(f.id, k);
      if (k % 10 === 1) {
        for (let i = 0; i < 4; i++) s.gore?.spawn({ x: f.x + rand(-14, 14), z: f.z + rand(-4, 4), h: rand(2, 10), vx: rand(-60, 60), vz: rand(-10, 10), vh: rand(90, 170), tint: 0xb8ccd4, scale: rand(0.25, 0.5), decal: false, life: rand(16, 26) });
      }
      // (Nick, 2026-11-20: "the frog sounds is wayyyyy overdone": every wader, hounds and
      // villagers too, glugged every third of a second at a random pitch. Now only a hero's
      // own steps are heard, a soft swish every other stride, never stacked)
      if (k % 36 === 1 && f.hero) playSfx(s, 'woodWade', { volume: 0.22, spread: 40, minGapMs: 420 });
    }
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
  // (silent: Nick, 2026-11-15, the caw was a random squawk)
  crowBurst(x, y, n = 9) {
    const s = this.scene;
    // their caws and the clatter of wings going up (recorded: assets/audio/sfx/wood-crows.wav)
    playSfx(s, 'woodCrows', { volume: Math.min(1, 0.45 + n * 0.05), spread: 120, minGapMs: 400 });
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
        playSfx(s, DK.wood, { volume: 0.85, pitch: -450, spread: 120, minGapMs: 60 }); // (Deadly Kombat wood bat: Nick found the made-in-code chop horrible)
        const v = this.pines.get(prop.id); if (v) { this.drawNotch(v, prop); s.tweens.add({ targets: v.c, angle: dir * 1.5, duration: 70, yoyo: true }); }
        for (let i = 0; i < 6; i++) s.gore?.spawn({ x: prop.x + (prop.fellDir ?? 1) * 22, z: prop.z + 2, h: rand(30, 60), vx: rand(-90, 90), vz: 0, vh: rand(100, 200), tint: 0xe0c090, scale: rand(0.3, 0.6), decal: false, life: rand(25, 45) });
      }
    });
    ev.on('pineFalling', ({ prop }) => { playSfx(s, DK.wood, { volume: 1, pitch: -650, spread: 60, minGapMs: 0 }); playSfx(s, 'woodFall', { volume: 1, minGapMs: 0 }); this.crowBurst(prop.x, top() + 40, 6, false); });
    ev.on('pineDown', ({ prop, dir, x0, x1 }) => this.pineDown(prop, dir, x0, x1));
    // the log pile: the rope parts with a crack and the stack groans; then it bursts, and its
    // trunks come thundering down the bank, clattering, thumping, bowling men over, and go
    // into the ford in sheets of spray
    ev.on('propBreak', ({ prop }) => {
      if (prop.kind !== 'logpile') return;
      playSfx(s, 'woodSnare', { volume: 1, minGapMs: 0 });
      playSfx(s, DK.wood, { volume: 0.9, pitch: 300, minGapMs: 0 });
      playSfx(s, 'woodCreak', { volume: 1, pitch: -500, spread: 40, minGapMs: 0 });
      s.fx?.shake(3, 8);
      for (let i = 0; i < 10; i++) s.gore?.spawn({ x: prop.x + rand(-10, 10), z: prop.z + 4, h: rand(30, 60), vx: rand(-160, 160), vz: 0, vh: rand(80, 220), tint: 0xb8a070, scale: rand(0.25, 0.5), decal: false, life: rand(20, 40) });
    });
    ev.on('logsLoose', ({ pile }) => {
      playSfx(s, 'woodLogs', { volume: 1, minGapMs: 0 });
      playSfx(s, 'dkSlam', { volume: 1, pitch: -700, spread: 60, minGapMs: 0 });
      s.time.delayedCall(520, () => playSfx(s, 'woodLogs', { volume: 0.75, pitch: -350, minGapMs: 0 }));
      s.fx?.shake(12, 28);
      s.rumble?.(1, 0.6, 520);
      this.crowBurst(pile.x, top() + 40, 6, false);
      // the stack's dust, bark and moss bursting out of it
      for (let i = 0; i < 34; i++) s.gore?.spawn({ x: pile.x + rand(-90, 90), z: pile.z + rand(0, 20), h: rand(0, 120), vx: rand(-260, 120), vz: 0, vh: rand(40, 260), tint: i % 4 === 0 ? 0x3a4a22 : i % 3 ? 0x2a2018 : 0x6a5032, scale: rand(0.4, 1.1), decal: false, life: rand(30, 60) });
    });
    ev.on('logFree', () => playSfx(s, DK.wood, { volume: 0.55, pitch: -200, spread: 300, minGapMs: 40 }));
    ev.on('logBounce', ({ log, power }) => {
      playSfx(s, 'dkSlam', { volume: Math.min(0.85, 0.2 + power * 0.07), pitch: -650, spread: 220, minGapMs: 60 });
      if (power > 4) playSfx(s, DK.wood, { volume: 0.35, pitch: -500, spread: 200, minGapMs: 90 });
      s.fx?.shake(Math.min(6, power * 0.8), 8);
      if (power > 5) s.rumble?.(0.5, 0.2, 120);
      for (let i = 0; i < 4 + Math.min(8, power); i++) s.gore?.spawn({ x: log.x + rand(-20, 20), z: log.z + rand(-4, 4), h: 2, vx: rand(-110, 110), vz: 0, vh: rand(50, 90 + power * 18), tint: i % 3 ? 0x2a2018 : 0x4a3a28, scale: rand(0.4, 0.9), decal: false, life: rand(18, 34) });
    });
    ev.on('logSplash', ({ log, power }) => {
      playSfx(s, 'waterSplash', { volume: Math.min(1, 0.45 + power * 0.07), spread: 220, minGapMs: 70 });
      s.fx?.shake(Math.min(5, 1 + power * 0.5), 8);
      for (let i = 0; i < 8 + power * 2; i++) s.gore?.spawn({ x: log.x + rand(-26, 26), z: log.z + rand(-6, 6), h: 2, vx: log.vx * rand(10, 40) + rand(-90, 90), vz: 0, vh: rand(120, 200 + power * 34), tint: i % 3 ? 0x9ab0bc : 0x6a8494, scale: rand(0.3, 0.8), decal: false, life: rand(24, 44) });
    });
    ev.on('logHit', ({ fighter, dir, speed }) => {
      playSfx(s, DK.bodyBig, { volume: 1, minGapMs: 0 });
      playSfx(s, 'dkSlam', { volume: 0.6, pitch: -400, minGapMs: 0 });
      if (fighter.team !== 'player' || Math.random() < 0.4) playSfx(s, 'dkBone', { volume: 0.8, minGapMs: 60 });
      s.fx?.shake(fighter.team === 'player' ? 9 : 7, 14);
      s.rumble?.(0.8, 0.5, 220);
      for (let i = 0; i < 12; i++) s.gore?.spawn({ x: fighter.x, z: fighter.z + rand(-6, 6), h: rand(20, 70), vx: dir * rand(60, 160 + speed * 30), vz: 0, vh: rand(80, 260), tint: i % 4 === 0 ? 0x2a2018 : 0x7a0808, scale: rand(0.4, 1), decal: i % 3 === 0, life: rand(30, 60) });
    });
    ev.on('snared', ({ fighter, kind }) => playSfx(s, kind === 'net' ? 'kick' : 'woodSnare', { volume: 0.8, minGapMs: 0 }));
    ev.on('snareTug', () => playSfx(s, 'woodCreak', { volume: 0.25, pitch: 300, minGapMs: 80 }));
    ev.on('stakesOpen', () => playSfx(s, 'doorClose2', { volume: 0.7, pitch: -600, minGapMs: 0 }));
    ev.on('stakesKill', () => playSfx(s, 'rogueStab', { volume: 0.9, pitch: -300, minGapMs: 0 }));
    ev.on('netWindup', () => playSfx(s, 'woodNet', { volume: 0.35, pitch: -300, minGapMs: 200 }));
    ev.on('netThrown', () => playSfx(s, 'woodNet', { volume: 0.9, minGapMs: 0 }));
    ev.on('hornSounded', ({ fighter: f } = {}) => {
      playSfx(s, 'woodHorn', { volume: 1, minGapMs: 0 });
      if (!f) return;
      // the blast: rings out through the wood from him, a shake, the rain shaken down off the
      // boughs over him (drawMarks)
      const body = f.stats.body?.h ?? 120; const y = f.z - f.h - body * 0.9;
      const drops = Array.from({ length: 40 }, (_, i) => ({ x: f.x - 260 + ((i * 97) % 520), y: y - 260 - ((i * 53) % 160), v: 2 + (i % 5) }));
      (this.hornBlasts ??= []).push({ x: f.x + f.facing * 40, y, t: 0, drops, ground: f.z });
      s.fx?.shake?.(5, 18);
    });
    ev.on('hornRaised', () => playSfx(s, 'woodHorn', { volume: 0.18, pitch: -200, minGapMs: 500 }));
    ev.on('hornBroken', () => playSfx(s, 'kick', { volume: 0.5, minGapMs: 0 }));
    ev.on('ambushTell', ({ x, tell }) => {
      // the crows go up out of the branches over where they wait, and the boughs creak
      this.crowBurst(x, top() + 20, 7, true);
      playSfx(s, 'woodCreak', { volume: 0.8, minGapMs: 200 });
      s.time.delayedCall(Math.max(0, (tell / 60) * 1000 - 400), () => playSfx(s, 'woodCreak', { volume: 0.6, pitch: 200, minGapMs: 100 }));
    });
    // the deadfall: the wire goes, the rope screams through the pulley, the trunk comes in
    ev.on('deadfallTrip', () => { playSfx(s, 'woodSnare', { volume: 0.9, minGapMs: 0 }); playSfx(s, 'woodCreak', { volume: 1, pitch: -300, minGapMs: 0 }); });
    ev.on('deadfallSwing', ({ trap }) => { playSfx(s, 'heavySwing', { volume: 0.9, pitch: -1100, minGapMs: 0 }); this.crowBurst(trap.x - 200, top() + 20, 6, true); });
    ev.on('deadfallHit', ({ fighter, dir }) => {
      s.fx?.shake(fighter.team === 'player' ? 8 : 6, 18);
      playSfx(s, 'woodLogs', { volume: 0.8, minGapMs: 80 });
      for (let i = 0; i < 14; i++) s.gore?.spawn({ x: fighter.x, z: fighter.z + rand(-6, 6), h: rand(30, 90), vx: dir * rand(80, 320), vz: 0, vh: rand(80, 260), tint: 0x7a0808, scale: rand(0.4, 1), decal: i % 3 === 0, life: rand(30, 60) });
    });
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
    ev.on('penSlam', () => { playSfx(s, 'gateClose', { volume: 1, minGapMs: 0 }); playSfx(s, 'woodHowl', { volume: 0.4, pitch: 500, minGapMs: 300 }); s.fx?.shake(5, 14); });
    ev.on('chainWindup', () => playSfx(s, 'stoneStep', { volume: 0.6, minGapMs: 200 }));
    ev.on('chainCrack', () => playSfx(s, 'woodWhip', { volume: 1, pitch: -300, minGapMs: 0 }));
    ev.on('chained', () => { playSfx(s, 'stoneStep', { volume: 1, minGapMs: 0 }); s.fx?.shake(3, 8); });
    ev.on('houndLatch', () => { playSfx(s, 'woodHowl', { volume: 0.35, pitch: 700, minGapMs: 300 }); s.fx?.shake(3, 8); });
    ev.on('houndWorry', () => playSfx(s, 'kick', { volume: 0.35, pitch: -200, minGapMs: 100 }));
    // the hunting hounds (entities/HoundHunt.js): the howl on first sight or a packmate killed;
    // barks, sniffs and a yelp play once their recordings are in (Sfx houndBark, houndSniff)
    ev.on('houndHowl', () => playSfx(s, 'woodHowl', { volume: 0.45, pitch: 250, minGapMs: 1500 }));
    ev.on('houndBark', () => playSfx(s, 'houndBark', { volume: 0.6, minGapMs: 140 }));
    ev.on('houndSniff', () => playSfx(s, 'houndSniff', { volume: 0.4, minGapMs: 600 }));
    ev.on('houndShaken', () => playSfx(s, 'kick', { volume: 0.7, minGapMs: 0 }));
    ev.on('houndmasterBroken', () => playSfx(s, 'woodHowl', { volume: 0.6, pitch: -400, minGapMs: 0 }));
    ev.on('signalOut', () => { playSfx(s, 'doorClose2', { volume: 0.8, pitch: 300, minGapMs: 0 }); s.fx?.shake(3, 10); });
    ev.on('storyCue', ({ cue }) => {
      if (cue?.sfx) playSfx(s, cue.sfx, { volume: cue.volume ?? 0.8, pitch: cue.pitch ?? 0, minGapMs: 0 });
      if (cue?.crows != null) this.crowBurst(cue.crows, top() + 30, 10);
      if (cue?.convoy) this.convoy = { t: 0, x: (s.cameras.main.scrollX ?? 0) + SETTINGS.width * 0.62 };
    });
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
    this.drawChains();
    if (this.rig.mists.length) { this.drawMist(); this.drawSignals(); }
    if (this.pileLabels.length) this.drawPileLabels();
    this.syncCrows(dt);
    if (this.stage.terrain?.wades?.length) this.drawWading();
    if (this.convoy) this.drawConvoy();
    // as you come up to the hanging tree, its crows go up
    const tree = this.stage.data.gallows;
    if (tree && !this.treeCrows && this.scene.players?.some((p) => p.x > tree.x - 640)) {
      this.treeCrows = true;
      this.crowBurst(tree.x - 60, (this.scene.cameras.main.scrollY ?? 0) + 70, 12, true);
    }
  }
}
