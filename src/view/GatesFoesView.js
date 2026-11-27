// GatesFoesView.js — what the Iron Gates garrison (data/gatesEnemies.js) shows and sounds
// like beyond their own painted strips:
//   the Arbalester's aim: a red line down the lane from his bow while he aims (his tell),
//     brightening to the loose; the bolt itself is painted (ProjectileView 'bolt5')
//   the Gate Warden's pavise: blows ring off it (sparks, a clang, "SHIELD" once in a while);
//     knocked aside, the shield swings wide (his react strip) with a crash and "SHIELD DOWN!"
//   the Iron Guard's plate: light blows glance (white sparks, a clink); a heavy one knocks a
//     painted plate off him that clatters to the floor and lies there
//   the traps (stage/GatesTraps.js): the spiked drop gate, painted (prop_dropgate.png), drawn
//     as a grille across the lane, back to front, sliced so it leans with the floor; its
//     shadow and falling grit warn before it drops. The caltrops: painted clusters on the floor.
// Made by StageView (one per arena), drawn every frame by its update.

import { playSfx } from '../core/Sfx.js';
import { PHYSICS } from '../effects/Physics.js';
import { DEPTH } from './depths.js';
import { SETTINGS } from '../config/settings.js';
import { DROPGATE } from '../stage/GatesTraps.js';

const PLATES = ['gates-plate-0', 'gates-plate-1', 'gates-plate-2', 'gates-plate-3'];

export class GatesFoesView {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    const world = this.world = stage.world;
    this.gates = new Map();   // hazard id -> { slices, shadow }
    this.trapsDrawn = new Set();
    this.lines = scene.add.graphics();
    this.hintAt = -9999;
    const ev = world.events;
    ev.on('shieldBlock', (e) => {
      scene.gore?.spark(e.x, e.z, e.h, 0xfff0c0, 10);
      playSfx(scene, 'block', { volume: 0.75, pitch: -500, minGapMs: 40 });
      // once in a while, tell a hero who keeps hitting the face of it
      if (e.attacker?.team === 'player' && world.frame - this.hintAt > 600) {
        this.hintAt = world.frame;
        scene.callout?.(HINT[e.attacker.stats.id] ?? 'GO ROUND THE SHIELD', '#d8c8a0', 22);
      }
    });
    ev.on('shieldBreak', (e) => {
      scene.gore?.spark(e.x, e.z, 70, 0xffa040, 22);
      scene.fx?.shake(4, 10);
      playSfx(scene, 'block', { volume: 1, pitch: -900, minGapMs: 0 });
      playSfx(scene, 'dkSlam', { volume: 0.8, minGapMs: 0 });
      scene.callout?.('SHIELD DOWN!', '#ffa040', 26);
    });
    ev.on('plateGlance', (e) => {
      scene.gore?.spark(e.x, e.z, e.h, 0xe8ecff, 6);
      playSfx(scene, 'block', { volume: 0.55, pitch: 600, minGapMs: 60 });
    });
    ev.on('plateBreak', (e) => {
      scene.gore?.spark(e.x, e.z, e.h, 0xffd090, 18);
      scene.fx?.shake(3, 8);
      playSfx(scene, 'block', { volume: 1, pitch: -300, minGapMs: 0 });
      playSfx(scene, 'dkBone', { volume: 0.5, minGapMs: 0 });
      const key = PLATES[(e.defender.id + e.left) % PLATES.length];
      if (scene.textures.exists(key)) {
        scene.gore?.spawn({
          x: e.x, z: e.z + 4, h: e.h, vx: (e.dir || 1) * (160 + Math.random() * 120), vz: (Math.random() - 0.5) * 60, vh: 260 + Math.random() * 120,
          tint: 0xffffff, scale: 0.16, texture: key, decal: false, life: 1200, spin: (Math.random() - 0.5) * 8, material: PHYSICS.stone,
        });
      }
      scene.callout?.(e.left > 0 ? 'PLATE CRACKED' : 'ARMOUR OFF!', e.left > 0 ? '#ffd090' : '#ff7050', e.left > 0 ? 20 : 26);
    });
    ev.on('dropgate:warn', () => playSfx(scene, 'gateOpen', { volume: 0.55, pitch: -500, minGapMs: 0 }));
    ev.on('dropgate:down', ({ hazard: hz }) => {
      scene.fx?.shake(6, 14);
      playSfx(scene, 'gateClose', { volume: 1, pitch: -300, minGapMs: 0 });
      playSfx(scene, 'dkSlam', { volume: 1, minGapMs: 0 });
      for (let i = 0; i < 5; i++) scene.gore?.spark(hz.x + (Math.random() - 0.5) * 30, 300 + i * 50, 2, 0x8a7a60, 8);
    });
    ev.on('dropgate:rise', () => playSfx(scene, 'gateOpen', { volume: 0.7, pitch: -200, minGapMs: 0 }));
    ev.on('dropgateCrush', () => scene.callout?.('CRUSHED!', '#ff7050', 28));
    ev.on('caltrops', ({ fighter: f }) => {
      playSfx(scene, 'rogueStarHit', { volume: 0.6, pitch: -300, minGapMs: 80 });
      scene.gore?.spark(f.x, f.z, 6, 0xffe0c0, 4);
    });
    ev.on('arbalestLoose', () => {
      playSfx(scene, 'bowShot2', { volume: 0.9, pitch: -700, minGapMs: 0 });
      playSfx(scene, 'block', { volume: 0.4, pitch: -1600, minGapMs: 0 });
    });
  }

  update() {
    for (const hz of this.stage.hazards) {
      if (hz.type === 'dropgate') this.drawGate(hz);
      else if (hz.type === 'caltrops' && !this.trapsDrawn.has(hz.id)) this.drawCaltrops(hz);
    }
    const g = this.lines.clear();
    for (const f of this.world.fighters) {
      if (!f.alive || !f.stats.shooter || !f.move?.shot) continue;
      if (f.state !== 'special1' && f.state !== 'special2') continue;
      const t = f.fsm.frame / f.move.startup;
      if (t > 1.05) continue;
      // the line his bolt will fly: along the floor at his depth, and at the bolt's height
      const kneel = !!f.move.kneel;
      const y0 = f.z - (f.floor ?? 0) - (kneel ? 46 : 62);
      const x0 = f.x + f.facing * 52;
      const x1 = x0 + f.facing * 1100;
      const a = 0.12 + 0.55 * Math.min(1, t) * (0.8 + 0.2 * Math.sin(this.world.frame * 0.6));
      g.lineStyle(10, 0xff2010, a * 0.25).lineBetween(x0, y0, x1, y0);
      g.lineStyle(2, 0xff4a30, a).lineBetween(x0, y0, x1, y0);
      g.lineStyle(4, 0xff2010, a * 0.35).lineBetween(x0, f.z, x1, f.z);
      g.setDepth(f.z + 0.5);
    }
  }
}

GatesFoesView.prototype.drawGate = function (hz) {
  const T = this.scene.textures;
  const W = SETTINGS.world;
  const back = W.floorTop - 32;  // the lane's back edge (Stage LANE_TOP is about here)
  const front = W.floorBottom + 6;
  const lean = 200;              // its foot runs this far right from the back of the lane to the front
  const H = 330;                 // its height on screen
  let v = this.gates.get(hz.id);
  if (!v) {
    // the painted grille, sheared once onto the slant it hangs across the lane at (its left
    // edge at the back of the lane, its right edge at the front), then cut into a few columns
    // so each sorts with the fighters at its own depth
    const N = 8;
    const slices = [];
    if (T.exists('prop-dropgate')) {
      const src = T.get('prop-dropgate').getSourceImage();
      const sk = 'prop-dropgate-sheared';
      const cw = Math.ceil(lean / N);
      if (!T.exists(`${sk}0`)) {
        const c = document.createElement('canvas'); c.width = lean; c.height = Math.ceil(H + (front - back));
        const g = c.getContext('2d');
        g.setTransform(lean / src.width, (front - back) / src.width, 0, H / src.height, 0, 0);
        g.drawImage(src, 0, 0);
        for (let i = 0; i < N; i++) {
          const s = document.createElement('canvas'); s.width = cw + 1; s.height = c.height;
          s.getContext('2d').drawImage(c, i * cw, 0, cw + 1, c.height, 0, 0, cw + 1, c.height);
          T.addCanvas(`${sk}${i}`, s);
        }
      }
      for (let i = 0; i < N; i++) slices.push({ img: this.scene.add.image(0, 0, `${sk}${i}`).setOrigin(0, 0), i, cw, u: (i + 0.5) / N });
    }
    // the stone lintel it hangs in (prop_lintel.png, ChatGPT 2026-11-27 polish pass): a beam
    // across the lane at the height of its raised foot, sheared on the same slant; the grille
    // shows only below the beam (it winches up into the slot, not into the sky), so hung up
    // just its spiked foot pokes out under the stone
    const slope = (front - back) / lean;
    const raisedFoot = (x) => back + (x - (hz.x - lean / 2)) * slope - (H - 46); // (screen y of its raised foot at x)
    const lineAt = (x) => raisedFoot(x) - 55;
    if (T.exists('prop-lintel')) {
      const src = T.get('prop-lintel').getSourceImage();
      const over = 30; const Lw = lean + over * 2; const Lh = Math.round(Lw * src.height / src.width * 1.8);
      const key = `prop-lintel-sheared-${lean}`;
      if (!T.exists(key)) {
        const c = document.createElement('canvas'); c.width = Lw; c.height = Math.ceil(Lh + Lw * slope);
        c.getContext('2d').setTransform(Lw / src.width, (Lw * slope) / src.width, 0, Lh / src.height, 0, 0);
        c.getContext('2d').drawImage(src, 0, 0);
        T.addCanvas(key, c);
      }
      const x0 = hz.x - lean / 2 - over;
      this.scene.add.image(x0, lineAt(x0) - 0.52 * Lh, key).setOrigin(0, 0).setDepth(front + 1);
      const xl = x0 - 40; const xr = hz.x + lean / 2 + over + 40;
      const m = this.scene.make.graphics({ add: false }).fillStyle(0xffffff, 1)
        .fillPoints([{ x: xl, y: lineAt(xl) }, { x: xr, y: lineAt(xr) }, { x: xr, y: 3000 }, { x: xl, y: 3000 }], true);
      const mask = m.createGeometryMask();
      for (const sl of slices) sl.img.setMask(mask);
      this.scene.events.once('shutdown', () => m.destroy());
    }
    const shadow = this.scene.add.graphics().setDepth(DEPTH.shadows);
    v = { slices, shadow };
    this.gates.set(hz.id, v);
  }
  const gt = hz.gate ?? { phase: 'up', drop: 0, t: 0 };
  const P = { ...DROPGATE, ...hz };
  // hung up: only its spiked foot shows under the arch; down: on the floor
  const raised = H - 46;
  const shake = gt.phase === 'warn' ? Math.sin(gt.t * 1.7) * 2 : 0;
  const lift = raised * (1 - gt.drop);
  for (const s of v.slices) {
    const z = back + s.u * (front - back);
    s.img.setPosition(hz.x - lean / 2 + s.i * s.cw + shake, back - H - lift).setDepth(z + 0.3);
  }
  // the strip it will land on darkens while it hangs over it (the tell), then on the floor
  const warn = gt.phase === 'warn' ? 0.15 + 0.35 * Math.min(1, gt.t / P.warn) : gt.phase === 'down' ? 0.4 : gt.phase === 'fall' ? 0.5 : 0.08;
  v.shadow.clear().fillStyle(0x000000, warn);
  v.shadow.fillPoints([{ x: hz.x - lean / 2 - P.half, y: back }, { x: hz.x - lean / 2 + P.half, y: back }, { x: hz.x + lean / 2 + P.half, y: front }, { x: hz.x + lean / 2 - P.half, y: front }], true);
  if (gt.phase === 'warn' && gt.t % 6 === 0) this.scene.gore?.spawn({ x: hz.x + (Math.random() - 0.5) * lean, z: back + Math.random() * (front - back), h: 260, vx: 0, vz: 0, vh: -40, tint: 0x8a7a60, scale: 0.3, decal: false, life: 60 });
};

GatesFoesView.prototype.drawCaltrops = function (hz) {
  const T = this.scene.textures;
  const keys = ['gates-caltrop-0', 'gates-caltrop-1', 'gates-caltrop-2'].filter((k) => T.exists(k));
  if (!keys.length) return;
  this.trapsDrawn.add(hz.id);
  // scattered over the patch, the same every time (from its position)
  let r = hz.x * 7 + hz.z0;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const n = Math.max(2, Math.round(hz.w / 45)); // (each piece is a little cluster of them)
  for (let i = 0; i < n; i++) {
    const x = hz.x - hz.w / 2 + rnd() * hz.w;
    const z = hz.z0 + rnd() * (hz.z1 - hz.z0);
    this.scene.add.image(x, z, keys[i % keys.length]).setOrigin(0.5, 0.7).setDepth(DEPTH.decals + 1)
      
      .setDisplaySize(72, 72 * T.get(keys[i % keys.length]).getSourceImage().height / T.get(keys[i % keys.length]).getSourceImage().width).setFlipX(rnd() < 0.5);
  }
};

// what to try on a pavise, by hero
const HINT = {
  warrior: 'KICK THE SHIELD ASIDE',
  mage: 'LIFT HIM OR STRIKE FROM ABOVE',
  rogue: 'GET BEHIND HIM OR SWEEP HIS LEGS',
};
