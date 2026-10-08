// NpcView.js — Draws a campaign level's people who aren't in the fight: the villagers
// (stage/Story.js states), the dead, and the other Oath Keepers when they are with you.
// View only: nothing here changes the game.
//
// THE VILLAGERS ARE TEMPORARY ART (code-drawn figures in plain homespun colours, no faces):
// the painted strips they need are listed in docs/cloud-handoff.md. Readability first:
// someone to save has a pale pulsing light behind him and acts it out (waving from a roof,
// cowering at the well); the saved stand up, then run; the dead lie still and grey.
//
// THE OATH KEEPERS travel together. Whoever isn't being played is drawn beside you at the
// start (they split up to search the village when the opening ends) and waits at the north
// gate. Rurik is always one of the three, so he is there for the vow whoever you play.
// They are real hero views (the game's own art) on stand-in fighters in a world of their
// own that never runs: the fight can't touch them.

import { DEPTH, depthScale } from './depths.js';
import { NPC } from '../stage/Story.js';
import { FONT } from './fonts.js';
import { World } from '../core/World.js';
import { Controller } from '../core/Controller.js';
import { createPlayer } from '../entities/Player.js';
import { SPRITES } from './levelArt.js';
import { keyLayer, cutPieces } from './envArt.js';

const TUNIC = [0x5a6a5a, 0x6a5a48, 0x4a5468, 0x6a4a4a, 0x5a5048, 0x58586a];
const SKIN = 0xc8a080;
const HEROES = ['warrior', 'mage', 'rogue'];

// The painted cage (assets/env/cage.png: shut on the left, broken open on the right, on
// magenta): cut out once into 'cage-shut' and 'cage-open', each trimmed to its bars.
const CAGE_H = 118; // drawn this tall (at depth scale 1): three men crouch in it
const BODY_W = 112; // a painted fallen villager is drawn this long
function paintedCage(scene) {
  const T = scene.textures;
  if (T.exists('cage-shut')) return true;
  if (!T.exists('cage-src')) return false;
  const img = T.get('cage-src').getSourceImage();
  const half = Math.floor(img.width / 2);
  for (const [name, x0] of [['cage-shut', 0], ['cage-open', half]]) {
    const c = document.createElement('canvas'); c.width = half; c.height = img.height;
    c.getContext('2d').drawImage(img, x0, 0, half, img.height, 0, 0, half, img.height);
    const cut = keyLayer(c, 'magenta');
    const px = cut.getContext('2d').getImageData(0, 0, half, img.height).data;
    let l = half; let r = 0; let t = img.height; let b = 0;
    for (let y = 0; y < img.height; y++) for (let x = 0; x < half; x++) {
      if (px[(y * half + x) * 4 + 3] > 40) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
    }
    const out = document.createElement('canvas'); out.width = r - l + 1; out.height = b - t + 1;
    out.getContext('2d').drawImage(cut, l, t, out.width, out.height, 0, 0, out.width, out.height);
    T.addCanvas(name, out);
  }
  return true;
}
// the painted villagers (data/levelArt.js SPRITE_SHEETS): each pose's cell in its sheet
// (run: the cells it cycles through); a pose a sheet lacks falls back to standing.
// The three painted run poses (one foot down, legs passing, the other foot down) play as a
// four-beat cycle through the passing pose twice, sinking on each footfall (RUN_BOB).
const RUN = [3, 4, 5, 4];
const RUN_BOB = [1.5, -1, 1.5, -1];
const CELLS = {
  villager: { stand: 0, cower: 1, wave: 2, run: RUN, sit: 6, kneel: 7 },
  mother: { stand: 0, cower: 1, wave: 2, run: RUN },
  boy: { stand: 0, cower: 1, wave: 2, run: RUN },
  elder: { stand: 0, sit: 1, wave: 2, kneel: 3 },
  // the wood's captives: bound on the rope, hanging, in the cage, at its bars, limping
  captive: { bound: 0, hang: 1, cower: 2, grip: 3, limp: [4, 5], stand: 4 },
};

export class NpcView {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.story = stage.story;
    this.views = new Map();
    for (const n of this.story?.npcs ?? []) this.views.set(n.id, this.makeNpc(n));
    this.drawBodies(stage.data.bodies ?? []);
    this.makeCompanions();
  }

  // ------------------------------------------------------------ villagers

  makeNpc(n) {
    const s = this.scene;
    const g = s.add.graphics();
    const halo = s.add.image(n.x, n.z, 'glow').setScale(2.4, 3).setTint(0xdfe8ff).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const shadow = s.add.ellipse(n.x, n.z, 40, 9, 0x000000, 0.3);
    // the prompt over him when a hero can do something (stage/Story.js prompts), and a
    // meter under it: a lock giving, a rope tightening, an escort's nerve
    const tip = s.add.text(n.x, n.z, '', { fontFamily: FONT.ui, fontSize: '13px', color: '#f0e6d0', align: 'center' })
      .setOrigin(0.5, 1).setStroke('#000000', 4).setDepth(DEPTH.popups - 1).setVisible(false);
    const meter = s.add.graphics().setDepth(DEPTH.popups - 1);
    return { g, halo, shadow, tip, meter, imgs: [], seed: n.id.length * 7 + n.id.charCodeAt(0) };
  }

  // one painted figure, from the NPC's pool of images; false if that sheet isn't painted
  sprite(g, x, y, k, pose, t, dir, who) {
    const S = SPRITES[who];
    const v = this.cur;
    if (!S || !v) return false;
    const c = CELLS[who][pose] ?? CELLS[who].stand;
    const beat = Math.floor(t / 7);
    const i = Array.isArray(c) ? c[beat % c.length] : c;
    if (c === RUN) y += RUN_BOB[beat % 4] * k;
    let img = v.imgs[this.curN];
    if (!img) v.imgs.push(img = this.scene.add.image(x, y, S.key, 'f0').setOrigin(0.5, 1));
    this.curN++;
    // alive, not a picture: a breath, and a little sway (more on the rope, a shiver when
    // cowering), each man on his own beat
    const now = this.scene.time.now; const ph = (v.seed ?? 0) * 0.9 + this.curN * 1.7;
    const br = c === RUN ? 0 : Math.sin(now * 0.0026 + ph);
    const sway = c === RUN ? 0 : pose === 'hang' ? 3.5 * Math.sin(now * 0.0017 + ph) : pose === 'cower' ? 0.9 * Math.sin(now * 0.021 + ph) : 1.1 * Math.sin(now * 0.0011 + ph);
    img.setTexture(S.key, `f${Math.min(i, S.count - 1)}`).setPosition(x, y).setScale(k * 0.5 * (1 - 0.008 * br), k * 0.5 * (1 + 0.018 * br))
      .setAngle(dir < 0 ? -sway : sway)
      .setFlipX(dir < 0).setDepth(g.depth + 0.01 * this.curN).setAlpha(g.alpha).setVisible(true);
    return true;
  }

  // one peasant: w/h body size, pose 'stand' | 'cower' | 'sit' | 'wave' | 'run'
  // (who: the painted sheet to use when there is one: villager, mother, boy, elder; a
  // level's NPC can name its own with `art`)
  figure(g, x, y, k, pose, t, tunic, dir = 1, who) {
    who ??= 'villager';
    if (this.sprite(g, x, y, k, pose, t, dir, who)) return true;
    const sc = k;
    const bob = pose === 'run' ? Math.abs(Math.sin(t * 0.4)) * 3 : pose === 'cower' ? Math.sin(t * 0.25) * 1 : 0;
    const H = (pose === 'cower' ? 40 : pose === 'sit' ? 30 : 56) * sc;
    const W = 18 * sc;
    const yb = y - bob;
    if (pose === 'sit') {
      // against the wall, legs out, a hand pressed to his side
      g.fillStyle(0x3a3028, 1).fillRect(x, yb - 7 * sc, 26 * sc * dir, 7 * sc);
      g.fillStyle(tunic, 1).fillRect(x - W / 2, yb - H, W, H - 4 * sc);
      g.fillStyle(0x7a1010, 0.9).fillRect(x - 2 * sc, yb - H * 0.5, 8 * sc, 8 * sc);
      g.fillStyle(SKIN, 1).fillCircle(x, yb - H - 7 * sc, 7 * sc);
      return;
    }
    // legs
    const stride = pose === 'run' ? Math.sin(t * 0.4) * 8 * sc : 0;
    g.fillStyle(0x3a3028, 1);
    g.fillRect(x - 6 * sc + stride, yb - 20 * sc, 5 * sc, 20 * sc).fillRect(x + 1 * sc - stride, yb - 20 * sc, 5 * sc, 20 * sc);
    // body, leaning in when cowering or running
    const lean = pose === 'cower' ? -6 * sc * dir : pose === 'run' ? 5 * sc * dir : 0;
    g.fillStyle(tunic, 1);
    g.fillTriangle(x - W / 2, yb - 18 * sc, x + W / 2, yb - 18 * sc, x + lean, yb - H);
    g.fillRect(x - W / 2 + lean / 2, yb - H + 6 * sc, W, H - 24 * sc);
    // arms
    g.lineStyle(4 * sc, tunic, 1);
    if (pose === 'wave') {
      const a = Math.sin(t * 0.3) * 0.5;
      g.lineBetween(x + lean, yb - H + 10 * sc, x + lean + Math.sin(a) * 14 * sc, yb - H - 14 * sc);
      g.lineBetween(x + lean, yb - H + 10 * sc, x + lean - Math.sin(a + 1) * 12 * sc, yb - H - 12 * sc);
    } else if (pose === 'cower') {
      g.lineBetween(x + lean, yb - H + 8 * sc, x + lean + 8 * sc * dir, yb - H - 2 * sc); // arms over the head
    } else {
      g.lineBetween(x + lean, yb - H + 10 * sc, x + lean - 6 * sc * dir - stride * 0.5, yb - H + 28 * sc);
      g.lineBetween(x + lean, yb - H + 10 * sc, x + lean + 6 * sc * dir + stride * 0.5, yb - H + 28 * sc);
    }
    g.fillStyle(SKIN, 1).fillCircle(x + lean, yb - H - 6 * sc, 6.5 * sc);
    g.fillStyle(0x2a2018, 1).fillRect(x + lean - 6 * sc, yb - H - 13 * sc, 12 * sc, 5 * sc); // hair
  }

  drawNpc(n, v) {
    const g = v.g.clear();
    this.cur = v; this.curN = 0;
    for (const img of v.imgs) img.setVisible(false);
    const t = this.scene.time.now / 16.7;
    this.drawPrompt(n, v);
    if (n.pose === 'noose' || n.pose === 'cage') { this.drawCaptive(n, v, t); return; }
    // (the horses are drawn in their stable, view/VillageView.js; the group is inside the barn)
    const show = !['safe', 'gone'].includes(n.state) && !(n.pose === 'group' && n.state === 'trapped') && n.pose !== 'horses'
      && !(n.pose === 'convoy' && (n.state === 'trapped' || n.state === 'lost')); // (inside the wagon, or carried off in it)
    const fadeOut = n.state === 'free' && !n.flee ? Math.max(0, 1 - n.t / 50) : 1; // (he slips away)
    g.setVisible(show).setAlpha(fadeOut);
    v.shadow.setVisible(show);
    // someone to save: a pale light behind him, pulsing
    const needs = n.state === 'trapped' || n.state === 'threatened';
    v.halo.setVisible(needs).setPosition(n.x, n.z - n.h - 40).setDepth(n.z - 0.6).setAlpha(needs ? 0.25 + 0.2 * Math.sin(t * 0.12) : 0);
    if (!show) return;
    const y = n.z - n.h;
    const k = depthScale(n.z);
    const dir = n.dir ?? -1;
    v.shadow.setPosition(n.x, y).setDepth(n.h > 0 ? n.z - 0.4 : DEPTH.shadows);
    g.setDepth(n.z);
    const tun = (i) => TUNIC[(v.seed + i) % TUNIC.length];
    const pose = n.state === 'fleeing' ? 'run' : n.state === 'threatened' || n.cower ? 'cower' : n.state === 'trapped' ? 'wave' : 'stand';
    if (n.state === 'lost') { this.fallen(g, n.x, y, k, tun(0)); return; }
    if (n.pose === 'wounded') return this.figure(g, n.x, y, k, 'sit', t, tun(0), 1, n.art);
    if (n.pose === 'lame') {
      // limping on a crutch (a stick under one arm), slow
      const p = n.state === 'escort' && n.moving ? 'run' : pose;
      if (this.figure(g, n.x, y, k, p === 'run' ? 'limp' : p, t * 0.5, tun(5), dir, SPRITES.captive ? 'captive' : n.art)) return;
      g.lineStyle(3 * k, 0x6a5038, 1).lineBetween(n.x + 10 * k * dir, y, n.x + 6 * k * dir, y - 44 * k);
      return;
    }
    if (n.pose === 'child') return this.figure(g, n.x, y, k * 0.7 / (SPRITES.boy ? 0.7 : 1), pose, t, tun(1), dir, 'boy');
    if (n.pose === 'family') {
      // (the painted mother carries her child; the drawn one has him at her side)
      if (!this.figure(g, n.x, y, k, pose, t, tun(2), dir, 'mother')) this.figure(g, n.x + 22 * dir * -1, y + 4, k * 0.68, pose, t + 7, tun(3), dir);
      return;
    }
    if (n.pose === 'chained') {
      // at the ore face, chained by the ankle to a post (the shackle prop): bent over a
      // pick until a hero comes, then pulling at the chain
      const many = n.group ? 3 : 1;
      for (let i = 0; i < many; i++) {
        const fx = n.x + 26 + i * 24; const fy = y + (i % 2) * 5;
        const p = n.state === 'trapped' ? (i === 0 ? 'wave' : 'cower') : pose;
        this.figure(g, fx, fy, k * (i === 1 ? 0.9 : 1), p, t + i * 6, tun(i + 2), n.state === 'trapped' ? -1 : dir);
        if (n.state === 'trapped') g.lineStyle(2 * k, 0x8a8a90, 0.9).lineBetween(fx - 3 * k, fy - 2 * k, n.x + 4, y - 30 * k);
      }
      return;
    }
    if (n.pose === 'group' || n.pose === 'convoy') {
      for (let i = 0; i < 3; i++) this.figure(g, n.x - 30 + i * 28, y + (i % 2) * 6, k * (i === 1 ? 0.75 : 1), pose, t + i * 5, tun(i + 4), dir);
      return;
    }
    this.figure(g, n.x, y, k, pose, t, tun(0), dir, n.art);
  }

  // someone who didn't make it: on the ground, still
  fallen(g, x, y, k, tunic) {
    g.fillStyle(0x4a0606, 0.5).fillEllipse(x + 4, y + 2, 56 * k, 10 * k);
    g.fillStyle(tunic, 1).fillRoundedRect(x - 22 * k, y - 9 * k, 40 * k, 10 * k, 4);
    g.fillStyle(SKIN, 0.8).fillCircle(x + 22 * k, y - 5 * k, 5 * k);
  }

  // A captive in a cage on a cart, or on the hanging tree's rope.
  drawCaptive(n, v, t) {
    const g = v.g;
    const k = depthScale(n.z);
    const y = n.z - n.h;
    const tun = (i) => TUNIC[(v.seed + i) % TUNIC.length];
    const needs = n.state === 'trapped' || n.state === 'threatened';
    v.halo.setVisible(needs).setPosition(n.x, y - 60).setDepth(n.z - 0.6).setAlpha(needs ? 0.25 + 0.2 * Math.sin(t * 0.12) : 0);
    v.shadow.setVisible(false);
    g.setVisible(true).setAlpha(1).setDepth(n.z);
    if (n.pose === 'cage') {
      const open = !['trapped'].includes(n.state);
      // the prisoners inside (cowering), then the bars in front; open: the door swung wide
      if (!open) {
        const many = n.group ? 3 : 1;
        for (let i = 0; i < many; i++) this.figure(g, n.x - (many - 1) * 12 + i * 24, y - 26, k * 0.85, i === many - 1 && SPRITES.captive ? 'grip' : 'cower', t + i * 5, tun(i), -1, SPRITES.captive ? 'captive' : undefined);
      } else if (n.state === 'free') this.figure(g, n.x + 40, y, k, 'stand', t, tun(0), 1);
      if (paintedCage(this.scene)) {
        // the painted cage over them (its bars in front; the shut one, or broken open)
        v.cage ??= this.scene.add.image(0, 0, 'cage-shut').setOrigin(0.5, 1);
        v.cage.setTexture(open ? 'cage-open' : 'cage-shut').setPosition(n.x, y - 20).setDepth(g.depth + 0.5).setVisible(true);
        v.cage.setScale((CAGE_H * k * (n.group ? 1 : 0.85)) / v.cage.frame.height);
        return;
      }
      const w = (n.group ? 96 : 64) * k; const h = 70 * k;
      g.fillStyle(0x2a2016, 1).fillRect(n.x - w / 2 - 4, y - 28, w + 8, 6); // its floor, on the cart
      g.lineStyle(3, 0x4a4a52, 1).strokeRect(n.x - w / 2, y - 28 - h, w, h);
      for (let x = n.x - w / 2 + 10; x < n.x + w / 2; x += 11) {
        if (open && x > n.x - 6 && x < n.x + 22) continue; // (the door)
        g.lineBetween(x, y - 28 - h, x, y - 28);
      }
      if (open) g.lineBetween(n.x - 6, y - 28 - h, n.x - 30, y - 34 - h * 0.6).lineBetween(n.x - 30, y - 34 - h * 0.6, n.x - 30, y - 34 + h * 0.3);
      else g.fillStyle(0xb08a4a, 1).fillRect(n.x + 2, y - 28 - h * 0.5, 8, 10); // the lock
      return;
    }
    // the noose: the rope from the tree's bough; he stands on a cart's tail with his hands
    // bound; lost, he hangs; saved, the rope is cut and he's on his knees, then away
    const bough = this.stage.data.gallows ? this.stage.data.gallows.z - 214 : y - 200;
    if (n.state === 'lost') {
      g.lineStyle(2, 0x8a7a5a, 1).lineBetween(n.x, bough, n.x, y - 92);
      const sway = Math.sin(t * 0.04) * 2;
      this.figure(g, n.x + sway, y - 30, k, SPRITES.captive ? 'hang' : 'stand', 0, tun(0), 1, SPRITES.captive ? 'captive' : undefined);
      return;
    }
    if (n.state === 'threatened') {
      g.fillStyle(0x2a2016, 1).fillRect(n.x - 26, y - 4, 52, 8);
      g.lineStyle(2, 0x8a7a5a, 1).lineBetween(n.x, bough, n.x, y - 62 * k);
      g.strokeCircle(n.x, y - 62 * k - 2, 5);
      this.figure(g, n.x, y - 4, k, SPRITES.captive ? 'bound' : 'stand', 0, tun(0), 1, SPRITES.captive ? 'captive' : undefined);
      return;
    }
    g.lineStyle(2, 0x8a7a5a, 1).lineBetween(n.x, bough, n.x, bough + 30); // (cut)
    if (n.state === 'safe' || n.state === 'gone') { g.setVisible(false); return; }
    if (n.state === 'gathered') { this.figure(g, n.x, y, k, 'stand', t, tun(0), -1); return; }
    this.figure(g, n.x, y, k, n.state === 'fleeing' ? 'run' : 'cower', t, tun(0), n.dir ?? -1);
  }

  // What a hero near him can do now, and the meter that goes with it.
  drawPrompt(n, v) {
    const S = this.story;
    const m = v.meter.clear();
    const q = S.prompts.find((p) => p.npc === n);
    const y = n.z - n.h;
    const text = !q ? '' : q.kind === 'talk' ? 'E  /  D-PAD ▲   TALK' : q.kind === 'open' ? 'HOLD  E  /  D-PAD ▲   OPEN' : 'KILL THEM FIRST';
    v.tip.setVisible(!!text).setText(text).setPosition(n.x, y - 110).setColor(q?.kind === 'busy' ? '#ff9a7a' : '#f0e6d0');
    const bar = (frac, col) => {
      m.fillStyle(0x000000, 0.7).fillRect(n.x - 31, y - 104, 62, 7);
      m.fillStyle(col, 1).fillRect(n.x - 30, y - 103, 60 * Math.max(0, Math.min(1, frac)), 5);
    };
    if (q?.kind === 'open' && n.pick > 0) bar(n.pick / (n.hold ?? NPC.pick), 0xd8b04a);
    else if (n.rescue === 'execution' && n.state === 'threatened' && n.clock > 0) bar(1 - n.clock / (n.time ?? 900), 0xd04030); // the rope
    else if (n.state === 'escort') bar(n.nerve / (n.hp ?? NPC.nerve), n.cower ? 0xff7050 : 0x9ad0ff);         // his nerve
  }

  // ------------------------------------------------------------ the dead

  drawBodies(list) {
    const s = this.scene;
    // painted (assets/env/bodies.png: three fallen villagers, on magenta), when it's in
    const painted = cutPieces(s, 'bodies-src', ['body-0', 'body-1', 'body-2']);
    for (const b of list) {
      const g = s.add.graphics().setDepth(DEPTH.decals + 1);
      g.fillStyle(0x4a0606, 0.6).fillEllipse(b.x + 6, b.z + 2, 60, 12); // dried blood
      if (painted) {
        const img = s.add.image(b.x, b.z + 4, `body-${b.pose % 3}`).setOrigin(0.5, 1).setDepth(DEPTH.decals + 1.1);
        img.setScale(BODY_W / img.width).setFlipX(b.x % 2 === 1);
        continue;
      }
      const c = [0x3a3a3a, 0x40382e, 0x34343e][b.pose % 3];
      g.fillStyle(c, 1).fillRoundedRect(b.x - 24, b.z - 8, 44, 10, 4);
      g.fillStyle(0x6a5a50, 1).fillCircle(b.x + 24, b.z - 4, 5);
      g.fillStyle(0x2a241e, 1).fillRect(b.x - 30, b.z - 5, 8, 4);
      if (b.pose === 1) g.fillStyle(0x2a2420, 0.9).fillRect(b.x - 28, b.z - 11, 58, 7); // a cloak thrown over him
    }
  }

  // ------------------------------------------------------------ the other Oath Keepers

  makeCompanions() {
    this.companions = [];
    const played = new Set(this.scene.heroIds ?? []);
    const ids = HEROES.filter((h) => !played.has(h));
    if (!ids.length || !this.story) return;
    this.puppets = new World({ seed: 1 });
    const at = this.stage.section?.spawn ?? { x: 150, z: 440 };
    ids.forEach((id, i) => {
      const f = createPlayer(this.puppets, new Controller(), id, at.x + 70 + i * 55, at.z + (i ? 50 : -60));
      f.facing = 1;
      const view = this.scene.makeView(f);
      this.companions.push({ id, f, view, mode: 'start', i });
    });
  }

  // where they are: with you at the start; off searching; at the gate for the vow; gone
  // through the gate after it
  updateCompanions() {
    if (!this.companions.length) return;
    this.puppets.frame++;
    const st = this.stage;
    const gate = st.sections[st.sections.length - 1];
    const gx = st.data.exit?.x ?? gate.x1 - 100;
    // (a level's `companions`: the beat after which they go ahead, where they wait, and the
    // beat after which they leave with you; the village's are the defaults)
    const C = { leaveAfter: 'opening', meet: gate.x0 - 200, farewell: 'vow', ...st.data.companions };
    const cam = this.scene.cameras.main.worldView;
    for (const c of this.companions) {
      const f = c.f;
      let target = null;
      if (st.phase === 'won' || st.story.done.has(C.farewell)) target = { x: gx + 260, z: 380 + c.i * 50, leave: true };
      else if (st.index >= st.sections.length - 1 || this.scene.player.x > C.meet) target = { x: gx - 260 + c.i * 70, z: 340 + c.i * 90, face: -1 };
      else if (st.story.done.has(C.leaveAfter)) {
        // they split off down the lanes between the houses: away up the street into the
        // dark at the back, fading as they go, not running on ahead along the road
        c.away ??= { x: f.x + 60 + c.i * 90, z: st.world.bounds.minZ - 50 };
        target = { ...c.away, leave: true, away: true };
      }
      // (picked up from a checkpoint past the start: they went ahead long ago)
      if (c.mode === 'start' && !c.ticked && st.index > 0) c.mode = 'gone';
      c.ticked = true;
      // gone ahead to search: once out of sight they stay out of sight (no catching them up
      // on the road), until the meeting place
      if (c.mode === 'gone' && !target?.face && target?.leave && !(st.phase === 'won' || st.story.done.has(C.farewell))) {
        c.view.sprite?.setVisible(false);
        c.view.shadow?.setVisible(false);
        continue;
      }
      if (target?.face === -1 && c.mode !== 'gate') {
        // (they were waiting there; if that spot is already in view they walk in from ahead,
        // they don't appear out of thin air)
        c.mode = 'gate';
        f.x = Math.max(target.x, cam.right + 80 + c.i * 60); f.z = target.z;
      }
      if (target) {
        const dx = target.x - f.x; const dz = target.z - f.z;
        const d = Math.hypot(dx, dz);
        const sp = (f.stats.walkSpeed ?? 160) / 60 * (c.mode === 'start' && target.leave ? 2 : 1); // (they run off to search)
        if (d > sp) {
          if (f.state !== 'walk') f.fsm.change('walk');
          f.vx = (dx / d) * sp * 60; f.vz = (dz / d) * sp * 60;
          f.x += (dx / d) * sp; f.z += (dz / d) * sp;
          f.facing = Math.sign(dx) || f.facing;
        } else {
          f.vx = f.vz = 0;
          if (f.state !== 'idle') f.fsm.change('idle');
          if (target.face) f.facing = target.face;
        }
      }
      f.fsm.frame++;
      // gone off-screen to search: hidden until the gate
      let hidden = target?.leave && (f.x > cam.right + 120);
      // (fading into the dark at the back as they go)
      const fade = target?.away ? Math.max(0, Math.min(1, (f.z - target.z) / 70)) : 1;
      if (fade <= 0.04) hidden = true;
      if (hidden && c.mode === 'start') c.mode = 'gone';
      c.view.sprite?.setVisible(!hidden);
      c.view.shadow?.setVisible(!hidden);
      if (!hidden) c.view.update();
      if (target?.away) { c.view.sprite?.setAlpha(fade); c.view.shadow?.setAlpha?.(fade * 0.35); }
    }
  }

  update() {
    for (const n of this.story?.npcs ?? []) this.drawNpc(n, this.views.get(n.id));
    this.updateCompanions();
  }
}
