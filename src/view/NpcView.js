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
import { World } from '../core/World.js';
import { Controller } from '../core/Controller.js';
import { createPlayer } from '../entities/Player.js';

const TUNIC = [0x5a6a5a, 0x6a5a48, 0x4a5468, 0x6a4a4a, 0x5a5048, 0x58586a];
const SKIN = 0xc8a080;
const HEROES = ['warrior', 'mage', 'rogue'];

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
    return { g, halo, shadow, seed: n.id.length * 7 + n.id.charCodeAt(0) };
  }

  // one peasant: w/h body size, pose 'stand' | 'cower' | 'sit' | 'wave' | 'run'
  figure(g, x, y, k, pose, t, tunic, dir = 1) {
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
    const t = this.scene.time.now / 16.7;
    const show = !['safe'].includes(n.state) && !(n.pose === 'group' && n.state === 'trapped');
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
    const pose = n.state === 'fleeing' ? 'run' : n.state === 'threatened' ? 'cower' : n.state === 'trapped' ? 'wave' : 'stand';
    if (n.pose === 'wounded') return this.figure(g, n.x, y, k, 'sit', t, tun(0), 1);
    if (n.pose === 'child') return this.figure(g, n.x, y, k * 0.7, pose, t, tun(1), dir);
    if (n.pose === 'family') {
      this.figure(g, n.x, y, k, pose, t, tun(2), dir);
      this.figure(g, n.x + 22 * dir * -1, y + 4, k * 0.68, pose, t + 7, tun(3), dir);
      return;
    }
    if (n.pose === 'group') {
      for (let i = 0; i < 3; i++) this.figure(g, n.x - 30 + i * 28, y + (i % 2) * 6, k * (i === 1 ? 0.75 : 1), pose, t + i * 5, tun(i + 4), dir);
      return;
    }
    this.figure(g, n.x, y, k, pose, t, tun(0), dir);
  }

  // ------------------------------------------------------------ the dead

  drawBodies(list) {
    const s = this.scene;
    for (const b of list) {
      const g = s.add.graphics().setDepth(DEPTH.decals + 1);
      g.fillStyle(0x4a0606, 0.6).fillEllipse(b.x + 6, b.z + 2, 60, 12); // dried blood
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
    const cam = this.scene.cameras.main.worldView;
    for (const c of this.companions) {
      const f = c.f;
      let target = null;
      if (st.phase === 'won' || st.story.done.has('vow')) target = { x: gx + 260, z: 380 + c.i * 50, leave: true };
      else if (st.index >= st.sections.length - 1 || this.scene.player.x > gate.x0 - 200) target = { x: gx - 260 + c.i * 70, z: 340 + c.i * 90, face: -1 };
      else if (st.story.done.has('opening')) target = { x: cam.right + 160, z: f.z, leave: true };
      if (target?.face === -1 && c.mode !== 'gate') { c.mode = 'gate'; f.x = target.x; f.z = target.z; } // (they were waiting there)
      if (target) {
        const dx = target.x - f.x; const dz = target.z - f.z;
        const d = Math.hypot(dx, dz);
        const sp = (f.stats.walkSpeed ?? 160) / 60;
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
      const hidden = target?.leave && (f.x > cam.right + 120);
      c.view.sprite?.setVisible(!hidden);
      c.view.shadow?.setVisible(!hidden);
      if (!hidden) c.view.update();
    }
  }

  update() {
    for (const n of this.story?.npcs ?? []) this.drawNpc(n, this.views.get(n.id));
    this.updateCompanions();
  }
}
