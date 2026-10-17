// KeepView.js — THE BLACK KEEP's backdrop (campaign level 6, data/stageKeep.js). ALL
// TEMPORARY ART, drawn in code; the painted replacements (data/levelArt.js 'keep') take over
// piece by piece as they're saved.
//
// Its colours: black stone, violet torchlight, the forge's orange, grey ash; the Kings' Root
// the one pale, cold place. Outside (the causeway, the roof of the prison wing, the Crown
// Walk, the span) an ash sky the Keep makes for itself; inside, stone all the way up.
//
// It also plays the level's moving set pieces, from the stage's events: the ash gale (an
// ash streak, then the air full of it), the Ash Mill's stone turning, the furnace breathing
// under the Crucible Line, the Burning Spire's tower sliding down past the hoist, and the
// throne: its walls falling outward (phase 2), the colossus waking behind the lane (phase 3),
// its heart bursting open, and its fall (phase 4).

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { drawCastle } from './castle.js';
import { PaintedLevel } from './levelArt.js';

const COL = {
  skyTop: 0x0e0c12, skyLow: 0x3a2a32, ash: 0x4a4448, ashLit: 0x6a5a5a,
  stone: 0x26242c, stoneDark: 0x141218, stoneLit: 0x3a3844, mortar: 0x1a1820,
  violet: 0xa88aff, fire: 0xff7a30, forge: 0xff5a14, gold: 0xc8a040,
  pale: 0x8a92a0, paleDark: 0x4e5560, paleLit: 0xb0b8c4,
  iron: 0x2a2a30, ironLit: 0x4a4a54, timber: 0x2e2016, cloth: 0x4a1a2a,
  ground: 0x2a282e, groundLine: 0x1e1c22,
};

// the stone behind the lane goes this high above it inside (the tall camera climbs 360)
const INSIDE = 760;
const HORIZON = 262;

function rng(seed) {
  let k = seed;
  return () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
}

export class KeepBackdrop {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.data = stage.data;
    this.width = this.data.width;
    this.flickers = [];
    this.motes = [];
    this.gust = 0; // frames of gale left (the ash streams sideways)
    this.art = new PaintedLevel(scene, 'keep', this.width);
    const art = this.art;
    if (art.has('sky')) art.layer('sky', DEPTH.sky); else this.drawSky();
    if (art.has('far')) art.layer('far', DEPTH.far - 1); else this.drawKeep();
    this.drawWalls();
    this.drawGround();
    this.drawForge();
    this.drawMill();
    this.drawSpire();
    this.drawThrone();
    this.drawAsh();
    this.listen();
  }

  get pad() { return SETTINGS.width * 2; }
  get top() { return SETTINGS.world.floorTop - 50; }
  sec(id) { return this.data.sections.find((s) => s.id === id); }

  // an ash sky the Keep makes for itself: no sun, no stars, ash drifting across it
  drawSky() {
    const s = this.scene;
    const span = SETTINGS.width + this.pad * 2 + this.width * 0.1;
    const g = s.add.graphics().setDepth(DEPTH.sky).setScrollFactor(0.1, 0.4);
    g.fillGradientStyle(COL.skyTop, COL.skyTop, COL.skyLow, COL.skyLow, 1).fillRect(-this.pad, -900, span, SETTINGS.height + 1100);
    const r = rng(7);
    for (let i = 0; i < 3; i++) {
      const c = s.add.graphics().setDepth(DEPTH.sky + 1 + i * 0.1).setScrollFactor(0.06 + i * 0.03, 0.4);
      for (let x = -this.pad; x < span; x += 90 + r() * 120) c.fillStyle(i === 2 ? COL.ashLit : COL.ash, 0.4 - i * 0.08).fillEllipse(x, 120 + i * 40 + r() * 60, 180 + r() * 260, 26 + r() * 22);
    }
  }

  // the Keep from the causeway: a sheer black mass, violet slits, and on its face the King
  // carved sitting on his throne, a crown of spires (he wakes in the last fight)
  drawKeep() {
    const s = this.scene;
    const c = this.data.castle ?? { x: 900, scale: 1.2, detail: 1 };
    const g = s.add.graphics().setDepth(DEPTH.far - 2).setScrollFactor(0.05, 0.5);
    drawCastle(g, c.x, HORIZON + 30, c.scale, c.detail ?? 1);
    // the statue on its face
    const x = c.x; const base = HORIZON - 20; const k = c.scale;
    g.fillStyle(0x0a080c, 1);
    g.fillRect(x - 70 * k, base - 60 * k, 140 * k, 60 * k); // the throne's seat and knees
    g.fillRect(x - 46 * k, base - 150 * k, 92 * k, 92 * k); // the chest
    g.fillRect(x - 90 * k, base - 140 * k, 40 * k, 80 * k).fillRect(x + 50 * k, base - 140 * k, 40 * k, 80 * k); // the arms on the throne's arms
    g.fillCircle(x, base - 172 * k, 24 * k); // the head
    for (const dx of [-18, 0, 18]) g.fillTriangle(x + (dx - 7) * k, base - 190 * k, x + (dx + 7) * k, base - 190 * k, x + dx * k, base - (dx ? 224 : 240) * k); // the crown's spires
    const eyes = s.add.image(x, base - 174 * k, 'glow').setScale(1.2 * k, 0.5 * k).setTint(COL.fire).setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.far - 1.9).setScrollFactor(0.05, 0.5);
    this.flickers.push({ img: eyes, base: 0.3, amp: 0.1, rate: 0.03 });
    const glow = s.add.image(x, base - 160 * k, 'glow').setScale(7 * k).setTint(COL.violet).setAlpha(0.16)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.far - 2.5).setScrollFactor(0.05, 0.5);
    this.flickers.push({ img: glow, base: 0.14, amp: 0.05, rate: 0.02 });
  }

  // stone: a wall from x0 to x1 standing h above the lane's back edge
  stone(g, x0, x1, h, { col = COL.stone, dark = COL.stoneDark, lit = COL.stoneLit, seed = 3 } = {}) {
    const top = this.top;
    const r = rng(seed);
    g.fillStyle(col, 1).fillRect(x0, top - h, x1 - x0, h + 10);
    for (let y = top - h + 6; y < top; y += 22) {
      const off = (Math.floor(y / 22) % 2) * 24;
      for (let x = x0 + off; x < x1; x += 48) g.fillStyle(dark, 0.6).fillRect(x, y, 2, 20);
      g.fillStyle(dark, 0.6).fillRect(x0, y + 20, x1 - x0, 2);
    }
    for (let x = x0; x < x1; x += 30 + r() * 60) g.fillStyle(r() < 0.5 ? lit : dark, 0.3).fillRect(x, top - h + r() * (h - 20), 20 + r() * 40, 8 + r() * 14);
  }

  torch(x, y) {
    const s = this.scene;
    const g = s.add.image(x, y, 'glow').setScale(2.2, 2.6).setTint(COL.violet).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.9);
    this.flickers.push({ img: g, base: 0.45, amp: 0.15, rate: 0.18 + (x % 7) * 0.01 });
  }

  // the wall behind the lane, section by section
  drawWalls() {
    const s = this.scene;
    const top = this.top;
    const g = s.add.graphics().setDepth(DEPTH.floor - 1);
    const S = (id) => this.sec(id);
    const r = rng(41);
    // I THE ASH CAUSEWAY: the parapet, gibbets hung over it, the piers going down
    const cw = S('causeway');
    this.stone(g, cw.x0 - this.pad, cw.x1, 40, { seed: 5 });
    for (let x = cw.x0 + 200; x < cw.x1; x += 330) {
      g.fillStyle(COL.timber, 1).fillRect(x, top - 190, 8, 190).fillRect(x, top - 190, 60, 7); // a gibbet's post and arm
      g.lineStyle(2, COL.ironLit, 1).lineBetween(x + 54, top - 184, x + 54, top - 150);
      g.lineStyle(3, COL.iron, 1).strokeRect(x + 38, top - 150, 32, 52); // its cage
      if (r() < 0.6) g.fillStyle(0x1a1418, 1).fillRect(x + 46, top - 140, 16, 36); // someone in it
    }
    // II THE MUSTER HALL: a cathedral of black stone, banners forty feet long
    const mh = S('muster');
    this.stone(g, mh.x0, mh.x1, INSIDE, { seed: 9 });
    for (let x = mh.x0 + 120; x < mh.x1; x += 300) {
      g.fillStyle(COL.stoneLit, 1).fillRect(x, top - INSIDE, 40, INSIDE); // a pillar
      g.fillStyle(COL.cloth, 1).fillRect(x + 100, top - 520, 70, 400).fillTriangle(x + 100, top - 120, x + 170, top - 120, x + 135, top - 80); // a banner
      g.fillStyle(COL.gold, 0.6).fillCircle(x + 135, top - 400, 16);
      this.torch(x + 20, top - 160);
    }
    g.fillStyle(COL.timber, 1).fillRect(mh.x0 + 200, top - 300, mh.x1 - mh.x0 - 400, 14); // the upper balcony's edge
    // III THE BURNING CELLS: the well of the cell block, tiers of barred doors, fire below
    const ce = S('cells');
    this.stone(g, ce.x0, ce.x1, INSIDE, { seed: 13 });
    for (let tier = 0; tier < 6; tier++) {
      const y = top - 40 - tier * 100;
      g.fillStyle(COL.iron, 1).fillRect(ce.x0, y, ce.x1 - ce.x0, 6); // a gallery
      for (let x = ce.x0 + 40; x < ce.x1; x += 110) {
        g.fillStyle(0x0a080a, 1).fillRect(x, y - 70, 50, 70); // a cell door
        g.fillStyle(COL.ironLit, 1); for (let b = 6; b < 50; b += 10) g.fillRect(x + b, y - 70, 3, 70); // its bars
      }
    }
    for (let x = ce.x0; x < ce.x0 + 500; x += 120) {
      const fire = s.add.image(x + 60, top - 20, 'glow').setScale(3, 2).setTint(COL.fire).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor - 0.9);
      this.flickers.push({ img: fire, base: 0.45, amp: 0.2, rate: 0.25 });
    }
    // IV THE HEADSMAN'S SCAFFOLD: the roof's low parapet; the central tower behind
    const sc = S('scaffold');
    this.stone(g, sc.x0, sc.x1, 300, { seed: 17 }); // (the cell block's top: the roof is up there)
    g.fillStyle(COL.stoneDark, 1).fillRect(sc.x0 + 300, top - INSIDE - 200, 360, INSIDE - 100); // the central tower, climbing out of sight
    for (let y = top - INSIDE; y < top - 400; y += 90) g.fillStyle(COL.fire, 0.5).fillRect(sc.x0 + 470, y, 10, 30); // its slits, lit from inside
    g.fillStyle(COL.timber, 1).fillRect(sc.x0 + 960, top - 520, 12, 240).fillRect(sc.x0 + 900, top - 520, 130, 10); // the bell frame
    // V-VI THE FORGE: the cavern, pipes as thick as towers carrying ash up into the dark
    const cr = S('crucible'); const ml = S('mill');
    this.stone(g, cr.x0, ml.x1, INSIDE, { col: 0x1c1416, dark: 0x0c0808, lit: 0x3a2018, seed: 23 });
    for (let x = cr.x0 + 160; x < ml.x1; x += 380) {
      g.fillStyle(COL.iron, 1).fillRect(x, top - INSIDE, 60, INSIDE - 60); // an ash pipe
      g.fillStyle(COL.ironLit, 0.6).fillRect(x + 8, top - INSIDE, 6, INSIDE - 60);
      for (let y = top - INSIDE + 40; y < top - 60; y += 120) g.fillStyle(0x3a3a42, 1).fillRect(x - 6, y, 72, 10); // its bands
    }
    // VII THE KINGS' ROOT: pale old stone; the kings carved along it, their eyes chiselled out
    const rt = S('root');
    this.stone(g, rt.x0, rt.x1, INSIDE, { col: COL.pale, dark: COL.paleDark, lit: COL.paleLit, seed: 29 });
    for (let x = rt.x0 + 150; x < rt.x1; x += 260) {
      g.fillStyle(COL.paleDark, 1).fillRect(x, top - 200, 60, 200).fillCircle(x + 30, top - 220, 26); // a king, standing
      g.fillTriangle(x + 8, top - 244, x + 52, top - 244, x + 30, top - 270); // his crown
      g.fillStyle(0x1a1c20, 1).fillRect(x + 18, top - 226, 8, 4).fillRect(x + 34, top - 226, 8, 4); // the eyes, gone
    }
    g.fillStyle(0x0a0c10, 1).fillRect(rt.x1 - 520, top - 200, 80, 200); // the empty plinth with the newer crown cut over it
    g.fillStyle(COL.gold, 0.4).fillTriangle(rt.x1 - 510, top - 210, rt.x1 - 450, top - 210, rt.x1 - 480, top - 240);
    // VIII THE BURNING SPIRE: the inside of the tower (drawSpire moves its floors past)
    const sp = S('spire');
    this.stone(g, sp.x0, sp.x1, INSIDE, { col: 0x221a1c, dark: 0x0e0a0c, lit: 0x4a2a20, seed: 31 });
    // IX-X THE CROWN WALK, THE SPAN: battlements against the sky, the Crown ahead
    const cn = S('crown'); const sn = S('span');
    this.stone(g, cn.x0, sn.x1, 40, { seed: 37 });
    for (let x = cn.x0; x < sn.x1; x += 30) g.fillStyle(COL.stone, 1).fillRect(x, top - 58, 18, 18); // the merlons' line
    g.fillStyle(COL.stoneDark, 1).fillRect(sn.x1 - 260, top - INSIDE, 300, INSIDE - 40); // the Crown, the far tower
    for (let y = top - INSIDE + 60; y < top - 80; y += 110) this.torch(sn.x1 - 110, y);
    // throne: drawThrone
  }

  drawGround() {
    const g = this.scene.add.graphics().setDepth(DEPTH.floor);
    const top = this.top;
    const end = this.width + this.pad;
    g.fillStyle(COL.ground, 1).fillRect(-this.pad, top, end + this.pad, SETTINGS.height - top + 40);
    g.lineStyle(1, COL.groundLine, 1);
    for (let y = top + 24; y < SETTINGS.height + 40; y += 34) g.lineBetween(-this.pad, y, end, y);
    const r = rng(61);
    for (let x = -this.pad; x < end; x += 30 + r() * 30) g.lineBetween(x, top + r() * 200, x + 6, top + 30 + r() * 200);
    // the Kings' Root: pale flags
    const rt = this.sec('root');
    g.fillStyle(COL.paleDark, 0.8).fillRect(rt.x0, top, rt.x1 - rt.x0, SETTINGS.height - top + 40);
    g.fillStyle(0x000000, 0.3).fillRect(-this.pad, top, end + this.pad, 22);
  }

  // the furnace under the Crucible Line: its glow breathing up through the buckets, the
  // chain the buckets hang from
  drawForge() {
    const s = this.scene;
    const cr = this.sec('crucible');
    const pit = this.stage.terrain?.pits.find((p) => p.x0 >= cr.x0 && p.x1 <= cr.x1 + 10 && p.z1 - p.z0 > 200);
    if (!pit) return;
    for (let x = pit.x0 + 60; x < pit.x1; x += 140) {
      const glow = s.add.image(x, (pit.z0 + pit.z1) / 2 + 30, 'glow').setScale(4, 3).setTint(COL.forge).setAlpha(0.6)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor + 4.2);
      this.flickers.push({ img: glow, base: 0.55, amp: 0.2, rate: 0.06 + (x % 5) * 0.01 });
    }
    const g = s.add.graphics().setDepth(DEPTH.floor + 4.3);
    g.fillStyle(COL.ironLit, 1);
    for (let x = pit.x0; x < pit.x1; x += 16) g.fillRect(x, this.top - 200, 10, 5); // the chain overhead
    for (const b of this.stage.terrain.blocks.filter((q) => q.carry)) {
      const cx = (b.x0 + b.x1) / 2;
      for (let y = this.top - 196; y < b.z0 - b.top; y += 14) g.fillRect(cx - 3, y, 6, 8); // each bucket's hanging chain
    }
  }

  // the Ash Mill: the turning stone on the floor, its grooves going round
  drawMill() {
    const s = this.scene;
    const ml = this.sec('mill');
    const W = SETTINGS.world;
    this.millG = s.add.graphics().setDepth(DEPTH.floor + 2);
    this.mill = { cx: (ml.x0 + ml.x1) / 2, cz: (W.floorTop + W.floorBottom) / 2, rx: (ml.x1 - ml.x0) / 2 - 60, rz: (W.floorBottom - W.floorTop) / 2 + 20, a: 0 };
  }

  drawMillFrame() {
    const M = this.mill; const g = this.millG;
    if (!M) return;
    const on = this.stage.hazards.some((h) => h.type === 'drift' && h.look === 'mill' && h.state === 'blow');
    if (on) M.a += 0.006;
    g.clear();
    g.fillStyle(0x3a3236, 0.5).fillEllipse(M.cx, M.cz, M.rx * 2, M.rz * 2);
    g.lineStyle(2, 0x1e1a1c, 0.8);
    for (let k = 0; k < 16; k++) {
      const a = M.a + (k / 16) * Math.PI * 2;
      g.lineBetween(M.cx + Math.cos(a) * M.rx * 0.18, M.cz + Math.sin(a) * M.rz * 0.18, M.cx + Math.cos(a) * M.rx, M.cz + Math.sin(a) * M.rz);
    }
    g.strokeEllipse(M.cx, M.cz, M.rx * 1.3, M.rz * 1.3);
  }

  // the Burning Spire: the tower's floors sliding down past the hoist once it's rising
  drawSpire() {
    const s = this.scene;
    const sp = this.sec('spire');
    const g = s.add.graphics().setDepth(DEPTH.floor - 0.95);
    const span = 1300;
    for (let k = 0; k < 6; k++) {
      const y = -k * 260;
      g.fillStyle(COL.timber, 1).fillRect(sp.x0, y, sp.x1 - sp.x0, 18); // a floor's edge
      g.fillStyle(0x140e0c, 1).fillRect(sp.x0, y + 18, sp.x1 - sp.x0, 60);
      for (let x = sp.x0 + 60 + k * 37; x < sp.x1; x += 240) g.fillStyle(COL.fire, 0.7).fillRect(x, y - 30, 40, 30); // its fires
    }
    this.spire = { g, y0: this.top - INSIDE + 120, span, off: 0 };
    g.y = this.spire.y0;
  }

  drawSpireFrame() {
    const S = this.spire;
    if (!S) return;
    const st = this.stage;
    const rising = st.section?.id === 'spire' && st.fightOn && st.phase === 'fight';
    if (rising) S.off = (S.off + 1.6) % 260;
    S.g.y = S.y0 + S.off;
  }

  // the throne chamber: its walls (they fall outward, phase 2), the colossus behind the lane
  // (phase 3), its heart (open), its fall (phase 4)
  drawThrone() {
    const s = this.scene;
    const th = this.sec('throne');
    const top = this.top;
    this.throneWalls = s.add.graphics().setDepth(DEPTH.floor - 0.9);
    this.stone(this.throneWalls, th.x0, th.x1, INSIDE, { seed: 47 });
    for (let x = th.x0 + 100; x < th.x1; x += 260) this.throneWalls.fillStyle(COL.stoneLit, 1).fillRect(x, top - INSIDE, 44, INSIDE);
    this.throneWalls.fillStyle(COL.cloth, 1).fillRect(th.x0 + 640, top - 300, 220, 300); // the carpet's end at the dais
    this.throneWalls.fillStyle(0x0a080c, 1).fillRect(th.x0 + 700, top - 220, 100, 220); // the throne
    this.throneWalls.fillStyle(COL.gold, 0.7).fillTriangle(th.x0 + 700, top - 220, th.x0 + 800, top - 220, th.x0 + 750, top - 290);
    // the colossus: the Keep's seated statue of the King, awake. Torso, arms on the throne's
    // arms, chained at the wrists, the crown's three spires, its chest a furnace grate
    const c = this.colossus = s.add.container(16650, top).setDepth(DEPTH.floor - 0.8).setAlpha(0);
    const g = s.add.graphics();
    g.fillStyle(0x16121a, 1);
    g.fillRect(-300, -120, 600, 120); // the lap
    g.fillRect(-170, -520, 340, 420); // the chest and shoulders
    g.fillRect(-420, -320, 120, 220).fillRect(300, -320, 120, 220); // the forearms
    g.fillCircle(0, -620, 110); // the head
    for (const dx of [-70, 0, 70]) g.fillTriangle(dx - 26, -700, dx + 26, -700, dx, dx ? -860 : -920); // the crown
    g.fillStyle(0x2a1e1a, 1).fillRect(-90, -440, 180, 200); // the chest grate
    g.lineStyle(6, 0x4a4a54, 1);
    for (let x = -80; x <= 80; x += 32) g.lineBetween(x, -440, x, -240);
    g.lineStyle(10, COL.ironLit, 1).lineBetween(-360, -240, -560, -500).lineBetween(360, -240, 560, -500); // the manacle chains to the walls
    c.add(g);
    this.heartGlow = s.add.image(0, -340, 'glow').setScale(5, 4).setTint(COL.forge).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.eyeGlow = s.add.image(0, -630, 'glow').setScale(3, 1.2).setTint(COL.fire).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD);
    c.add([this.heartGlow, this.eyeGlow]);
  }

  // the stage's events: the gale, the throne's phases
  listen() {
    const ev = this.stage.world.events;
    const tw = this.scene.tweens;
    ev.on('gustWarn', ({ hazard }) => { if (hazard.look === 'gale') this.streak(); });
    ev.on('gustStart', ({ hazard }) => { if (hazard.look === 'gale' || hazard.look === 'tilt') this.gust = hazard.for ?? 120; });
    ev.on('bossPhase', ({ phase }) => {
      if (this.stage.section?.id !== 'throne') return;
      if (phase.id === 'keep') tw.add({ targets: this.throneWalls, alpha: 0, y: 160, duration: 1600, ease: 'Quad.in' }); // the walls fall outward
      if (phase.id === 'colossus') { tw.add({ targets: this.colossus, alpha: 1, duration: 1800 }); this.scene.fx?.shake?.(12, 40); }
      if (phase.id === 'last') tw.add({ targets: this.colossus, alpha: 0, y: this.top + 600, duration: 2400, ease: 'Quad.in' }); // it comes apart and falls
    });
    ev.on('heartOpen', () => { this.heartGlow.setScale(8, 7).setAlpha(0.9); this.scene.fx?.shake?.(10, 30); });
    ev.on('sectionStart', ({ section }) => {
      // back at the throne's checkpoint: the walls up again, the colossus asleep
      if (section.id !== 'throne') return;
      this.throneWalls.setAlpha(1).setY(0);
      this.colossus.setAlpha(0).setY(this.top);
      this.heartGlow.setScale(5, 4).setAlpha(0.5);
    });
  }

  // the gale's warning: a streak of ash across the horizon
  streak() {
    const s = this.scene;
    const wv = s.cameras.main.worldView;
    const img = s.add.image(wv.x - 200, wv.y + 120, 'glow').setScale(14, 0.5).setTint(0xb0a8a8).setAlpha(0.5).setDepth(DEPTH.floor + 3.6);
    s.tweens.add({ targets: img, x: wv.x + wv.width + 400, alpha: 0, duration: 1500, onComplete: () => img.destroy() });
  }

  // ash falling, embers rising from the fires
  drawAsh() {
    for (let i = 0; i < 40; i++) {
      const ember = i % 4 === 0;
      const img = this.scene.add.image(0, 0, 'dot').setTint(ember ? 0xff9a40 : 0x9a9498).setScale(ember ? 0.3 : 0.45).setAlpha(ember ? 0.8 : 0.5).setDepth(DEPTH.floor + 3.5);
      if (ember) img.setBlendMode(Phaser.BlendModes.ADD);
      this.motes.push({ img, ember, x: Math.random() * SETTINGS.width, y: Math.random() * SETTINGS.height, v: 0.4 + Math.random() * 0.8, sway: Math.random() * 6 });
    }
  }

  update() {
    const t = this.scene.time.now / 16.7;
    for (const f of this.flickers) f.img.setAlpha(f.base + Math.sin(t * f.rate + f.base * 40) * f.amp + (Math.random() - 0.5) * f.amp * 0.3);
    if (this.gust > 0) this.gust--;
    const wv = this.scene.cameras.main.worldView;
    const wind = this.gust > 0 ? 9 : 0.3;
    for (const m of this.motes) {
      m.y += m.ember ? -m.v * 1.6 : m.v * (this.gust > 0 ? 2 : 1);
      m.x += this.gust > 0 ? wind : -wind;
      if (m.y > wv.height + 20) m.y = -20;
      if (m.y < -20) m.y = wv.height + 20;
      if (m.x < -20) m.x = wv.width + 20;
      if (m.x > wv.width + 20) m.x = -20;
      m.img.setPosition(wv.x + m.x + Math.sin(t * 0.03 + m.sway) * 10, wv.y + m.y);
    }
    this.drawMillFrame();
    this.drawSpireFrame();
    if (this.colossus?.alpha > 0) {
      const b = this.stage.boss;
      this.eyeGlow.setAlpha(0.6 + Math.sin(t * 0.08) * 0.2);
      if (b?.held && !b.heartOpen) this.heartGlow.setAlpha(0.4 + Math.sin(t * 0.06) * 0.2); // breathing
    }
  }
}
