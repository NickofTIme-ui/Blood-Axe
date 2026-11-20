// HoundView.js — The Houndmaster's war hounds (data/enemies.js `hound`), drawn in code: a
// huge black mastiff in spiked iron plates, red-eyed, low to the ground. The painted
// strips (assets/enemies/strips/hound_*.png, data/levelArt.js SPRITE_SHEETS,
// docs/campaign/art-levels-1-2.md) replace the drawing once all four exist.
//
// Poses from the fighter's state: a loping run (walk), the snap (light1: head thrown
// forward, jaws open), the pounce (heavy: a crouch, then stretched out flying), flinching,
// rolled over (knockdown), dead on its side (fades).

import { DEPTH } from './depths.js';
import { movePhase } from '../combat/MoveRunner.js';
import { SPRITES, haveSprites } from './levelArt.js';
import { phaseCell } from './animFeel.js';
import { softShadow } from './atmosphere.js';
import { hangSprite } from './SnareHang.js';

// the painted attack strip's cells by phase: 1 crouch (held through the wind-up),
// 2 the leaping lunge and 3 the bite while the hitbox is out, 4 landing
const ATK_CELLS = { startup: [0], active: [1, 2], recovery: [3] };

const C = { coat: 0x15110f, coatHi: 0x2c2420, plate: 0x3a3842, plateHi: 0x6a6674, eye: 0xff2a1a, maw: 0x5a0a0a, tooth: 0xe8e0d0 };

export class HoundView {
  constructor(scene, fighter) {
    this.scene = scene;
    this.f = fighter;
    this.shadow = softShadow(scene, fighter.x, fighter.z, 90, 14, 0.35).setDepth(DEPTH.shadows);
    this.g = scene.add.graphics();
    if (fighter.team === 'enemy') {
      this.hpBg = scene.add.rectangle(0, 0, 44, 5, 0x000000, 0.7).setOrigin(0, 0.5);
      this.hpFill = scene.add.rectangle(0, 0, 44, 5, 0xc0282d).setOrigin(0, 0.5);
    }
    this.run = 0;
    this.lastX = fighter.x;
    // the painted strips, once all four exist (else the code drawing)
    this.painted = haveSprites('hound-walk', 'hound-atk1', 'hound-react', 'hound-doom');
    if (this.painted) this.img = scene.add.image(fighter.x, fighter.z, SPRITES['hound-walk'].key, 'f0').setOrigin(0.5, 1).setScale(0.5);
  }

  // the painted hound: which strip and cell, from the same state the drawing reads, and the
  // body motion laid over it (Nick, 2026-11-20: "they kind of just shuffle around weirdly").
  // What it is doing (entities/HoundHunt.js `hunt.mode`) picks the pose: a bounding gallop at
  // a run, a low creep stalking or slinking off, nose down sniffing, planted barking, head
  // thrown back howling, a cringe when struck, flat out when knocked down, thrashing when a
  // hero has it by the scruff. Painted strips that don't exist yet (data/levelArt.js
  // `hound-run`, `hound-idle`, `hound-bark`, `hound-howl`, `hound-sniff`, `hound-flinch`,
  // `hound-grabbed`) are used the moment they're added; till then the nearest painted pose.
  paint(st, fr, alpha) {
    const f = this.f;
    const H = f.hunt;
    const mode = H?.mode;
    const d = f.facing;
    const speed = Math.hypot(f.vx ?? 0, f.vz ?? 0) / Math.max(1, f.stats.walkSpeed);
    const has = (n) => !!SPRITES[n];
    let name = 'hound-walk'; let i = 0;
    let bob = 0; let tilt = 0; let sx = 1; let sy = 1; let shove = 0; let size = 1;
    const cyc = this.run * 1.6; // (cells along the ground covered: the feet never skate)
    if ((st === 'light1' || st === 'heavy') && f.move) {
      name = 'hound-atk1'; i = phaseCell(f.move, fr, ATK_CELLS);
      const ph = movePhase(f.move, fr);
      if (ph === 'startup') { sy = 0.94; sx = 1.04; tilt = 2; } // (coiled)
      else if (ph === 'active') { sx = 1.08; sy = 0.96; tilt = st === 'heavy' ? -6 : -3; }
    } else if (st === 'grabbed') {
      // by the scruff: legs going, twisting to get its jaws round
      if (has('hound-grabbed')) { name = 'hound-grabbed'; i = Math.floor(fr / 5); }
      else { name = 'hound-react'; i = 2; size = 1.3; }
      tilt = Math.sin(fr * 0.6) * 9; bob = Math.abs(Math.sin(fr * 0.6)) * -3;
    } else if (st === 'hitstun' || st === 'stagger') {
      // a cringe away from the blow, then a rear on a big one
      if (has('hound-flinch')) { name = 'hound-flinch'; i = Math.floor(fr / 4); }
      else if (st === 'stagger' && fr > 8) { name = 'hound-react'; i = 0; size = 1.3; }
      else { name = 'hound-doom'; i = 0; }
      const k = Math.max(0, 1 - fr / 10);
      shove = -d * 8 * k; tilt = -4 * k; sy = 1 - 0.08 * k; sx = 1 + 0.05 * k;
    } else if (st === 'knockdown') {
      name = 'hound-doom'; i = 3; // (flat out)
      tilt = fr < 8 ? -12 + fr * 1.5 : 0;
    } else if (st === 'getup') {
      name = 'hound-doom'; i = fr < (f.stats.getupFrames ?? 12) / 2 ? 2 : 1;
    } else if (st === 'dead') { name = 'hound-doom'; i = Math.floor(fr / 8); }
    else if (st === 'jump') { name = 'hound-atk1'; i = 1; tilt = (f.vh ?? 0) > 0 ? -5 : 4; }
    else if (mode === 'howl' && (st === 'idle' || st === 'walk')) {
      // head thrown back, baying
      const t = H.t;
      if (has('hound-howl')) { name = 'hound-howl'; i = t < 8 ? 0 : t < 50 ? 1 + Math.floor(t / 10) % 2 : 0; }
      else if (t < 6 || t > 54) { name = 'hound-atk1'; i = 3; }
      else { name = 'hound-react'; i = 0; size = 1.3; sy = 0.97 + 0.03 * Math.sin(t * 0.25); }
    } else if (mode === 'bark' && (st === 'idle' || st === 'walk')) {
      // planted, snapping its head forward on every bark
      const beat = ((H.t + f.id * 7) % 17);
      const snap = beat < 6 ? 1 - beat / 6 : 0;
      if (has('hound-bark')) { name = 'hound-bark'; i = snap > 0.3 ? 1 + (beat > 2 ? 1 : 0) : 0; }
      else { name = 'hound-drag'; i = snap > 0.4 ? 2 : 3; }
      shove = d * 5 * snap; bob = -3 * snap; tilt = -3 * snap; sx = 1 + 0.04 * snap;
      if (st === 'walk') { bob = 0; }
    } else if (st === 'walk' && (mode === 'sniff' || (mode === 'stalk' && speed < 0.5) || (mode === 'retreat' && speed < 0.5))) {
      // the creep: low, nose down, slow steps
      if (has('hound-sniff') && mode === 'sniff') { name = 'hound-sniff'; i = Math.floor(cyc) % SPRITES['hound-sniff'].count; }
      else i = Math.floor(cyc);
      sy = mode === 'sniff' ? 0.9 : 0.93; sx = 1.04;
      tilt = mode === 'sniff' ? 6 + Math.sin(this.t * 0.3) * 2 : 3; // (nose down, casting about)
      bob = Math.abs(Math.sin(cyc * Math.PI / 3)) * -1;
    } else if (st === 'walk') {
      // the run: a bounding gallop at speed (the strip faster, the body rising and pitching
      // with each bound), a trot below that
      const fast = speed > 0.75;
      if (fast && has('hound-run')) { name = 'hound-run'; i = Math.floor(cyc * 1.15); }
      else i = Math.floor(cyc);
      const ph = cyc * Math.PI / 3; // (one bound a cycle of the six cells)
      if (fast) { bob = -Math.abs(Math.sin(ph)) * 7; tilt = Math.cos(ph) * 5; sx = 1 + 0.05 * Math.sin(ph); sy = 1 - 0.05 * Math.sin(ph); }
      else { bob = -Math.abs(Math.sin(ph * 2)) * 2.5; tilt = Math.cos(ph * 2) * 1.5; }
      if (mode === 'retreat') { sy *= 0.95; tilt += 3; } // (tail down, head low)
    } else if (mode === 'sniff') {
      // stopped, nose to the ground
      if (has('hound-sniff')) { name = 'hound-sniff'; i = 0; } else { name = 'hound-walk'; i = 2; }
      sy = 0.9; sx = 1.04; tilt = 8 + Math.sin(this.t * 0.5) * 2;
    } else {
      // standing: breathing, the flanks going (a panting idle, not a frozen walk frame)
      if (has('hound-idle')) { name = 'hound-idle'; i = Math.floor(this.t / 8); }
      else { name = 'hound-atk1'; i = 3; }
      sy = 1 + 0.018 * Math.sin(this.t * 0.22); sx = 1 - 0.008 * Math.sin(this.t * 0.22);
      if (f.packTell > 0) { name = has('hound-bark') ? 'hound-bark' : 'hound-drag'; i = has('hound-bark') ? 0 : 1; sy = 0.95; } // (its turn: braced, about to go)
    }
    // its jaws locked in a hero, hauling him back (stage/WoodTraps.js latch): the grab, then
    // braced and worrying at him, a beat every 7 frames
    if (f.latchOn != null && f.alive && SPRITES['hound-drag'] && !['knockdown', 'getup', 'dead'].includes(st)) {
      this.dragT = (this.dragT ?? 0) + 1;
      name = 'hound-drag'; i = this.dragT < 8 ? 0 : 1 + Math.floor((this.dragT - 8) / 7) % 4;
      tilt = Math.sin(this.dragT * 0.9) * 4; size = 1; shove = 0;
    } else this.dragT = 0;
    const S = SPRITES[name];
    const loop = ['hound-walk', 'hound-run', 'hound-idle', 'hound-sniff', 'hound-grabbed', 'hound-flinch'].includes(name) && st !== 'dead';
    i = loop ? ((i % S.count) + S.count) % S.count : Math.min(S.count - 1, Math.max(0, i));
    // a turn isn't a pop: it squeezes through side-on for a few frames
    if (d !== this.lastFacing) { this.turnT = this.lastFacing == null ? 0 : 6; this.lastFacing = d; }
    if (this.turnT > 0) { sx *= 0.55 + 0.45 * (1 - this.turnT / 6); this.turnT--; }
    this.img.setTexture(S.key, `f${i}`).setPosition(f.x + shove, f.z - f.h + bob).setFlipX(d < 0).setDepth(f.z).setAlpha(alpha);
    if (f.flash > 0) this.img.setTintFill(0xffffff); else this.img.clearTint();
    // (hangSprite turns it over, or swaps in a painted hanging pose with its own origin and size)
    this.img.setAngle(tilt * d).setOrigin(0.5, 1).setScale(0.5 * size * sx, 0.5 * size * sy);
    hangSprite(this, this.img, f, this.img.displayHeight * 0.8); // (snared: strung up by a hind leg)
  }

  update() {
    const f = this.f;
    const st = f.state;
    const fr = f.fsm.frame;
    const g = this.g.clear();
    const d = f.facing;
    let lean = 0; let stretch = 0; let crouch = 0; let jaw = 0.15; let roll = 0; let alpha = 1;
    // the run cycle follows the ground covered, so it never skates
    // (ground covered in depth counts too: a dog running up or down the road gallops)
    this.run += Math.hypot(f.x - this.lastX, f.z - (this.lastZ ?? f.z)) * 0.06;
    this.lastX = f.x; this.lastZ = f.z;
    this.t = (this.t ?? 0) + 1;
    let gait = st === 'walk' ? this.run : 0;
    if ((st === 'light1' || st === 'heavy') && f.move) {
      const ph = movePhase(f.move, fr);
      if (st === 'light1') {
        if (ph === 'startup') { crouch = 4; jaw = 0.4; } else if (ph === 'active') { stretch = 14; jaw = 1; lean = -4; } else jaw = 0.3;
      } else if (ph === 'startup') { crouch = 10; jaw = 0.5; lean = 6; if (Math.floor(fr / 3) % 2 === 0) g.fillStyle(0xd08a3a, 0.25).fillEllipse(f.x, f.z - f.h - 26, 110, 50); } // (a readable wind-up)
      else if (ph === 'active') { stretch = 26; jaw = 1; lean = -10; gait = 1.2; } else { crouch = 4; jaw = 0.4; }
    } else if (st === 'hitstun' || st === 'stagger') { lean = 10; jaw = 0.8; }
    else if (st === 'knockdown' || st === 'getup') { roll = st === 'getup' ? 1 - fr / Math.max(1, f.stats.getupFrames) : 1; }
    else if (st === 'dead') { roll = 1; alpha = Math.max(0, 1 - Math.max(0, fr - 90) / 60); jaw = 0.6; }
    else if (st === 'jump') { stretch = 12; gait = 1.2; }
    else if (st === 'idle' || st === 'bossEntrance') { gait = Math.sin(fr * 0.08) * 0.15; jaw = 0.2 + 0.1 * Math.sin(fr * 0.1); }

    if (this.painted) this.paint(st, fr, alpha);
    else {
      const k = 1;
      const x = f.x; const base = f.z - f.h;
      const body = f.flash > 0 ? 0xffffff : C.coat;
      g.setDepth(f.z).setAlpha(alpha);
      if (roll > 0.5) {
        // on its side, legs out
        const by = base - 18;
        g.fillStyle(body, 1).fillEllipse(x, by, 96, 30);
        g.fillEllipse(x + d * 52, by + 2, 34, 22);
        g.lineStyle(7, body, 1);
        for (const lx of [-30, -16, 16, 30]) g.lineBetween(x + lx * d, by - 6, x + (lx + 10) * d, by - 30);
        g.fillStyle(C.plate, 1).fillRect(x - 30, by - 14, 50, 8);
        g.fillStyle(C.eye, st === 'dead' ? 0.2 : 0.8).fillRect(x + d * 62, by - 2, 3, 3);
      } else {
        const by = base - 30 + crouch; // the back line
        const X = (dx) => x + dx * d * k;
        const leg = (hx, ph, col) => {
          const sw = Math.sin(gait * 2.4 + ph);
          const kx = X(hx + sw * 9); const ky = by + 14;
          const fx = X(hx + sw * 16 + (stretch ? (hx > 0 ? 14 : -14) : 0)); const fy = base - Math.max(0, Math.cos(gait * 2.4 + ph)) * 8;
          g.lineStyle(8, col, 1).lineBetween(X(hx), by + 2, kx, ky).lineBetween(kx, ky, fx, fy);
        };
        leg(22, Math.PI, 0x0c0908); leg(-26, Math.PI * 1.4, 0x0c0908);
        // the body: deep chest, tucked waist, heavy haunch
        g.fillStyle(body, 1).fillEllipse(X(4 + stretch * 0.3), by - 2, 84 + stretch, 34);
        g.fillCircle(X(24 + stretch * 0.4), by - 4, 20).fillCircle(X(-26), by - 4, 16);
        // the spiked plates along the back
        g.fillStyle(C.plate, 1).fillRect(X(-28) - (d < 0 ? 52 : 0), by - 18, 52, 9);
        g.fillStyle(C.plateHi, 1);
        for (let s = -24; s <= 18; s += 14) g.fillTriangle(X(s), by - 18, X(s + 8), by - 18, X(s + 4), by - 28);
        // the head: thrown forward on the bite, the jaw dropping
        const hx = X(48 + stretch); const hy = by - 12 + lean * 0.6 - crouch * 0.3;
        g.fillStyle(body, 1).fillEllipse(hx, hy, 34, 26);
        g.fillTriangle(hx + d * 6, hy - 6, hx + d * 30, hy - 2, hx + d * 8, hy + 6); // muzzle
        g.fillStyle(C.maw, 1).fillTriangle(hx + d * 6, hy + 2, hx + d * 28, hy + 1 + jaw * 4, hx + d * 6, hy + 4 + jaw * 12);
        g.fillStyle(body, 1).fillTriangle(hx + d * 4, hy + 4 + jaw * 12, hx + d * 24, hy + 4 + jaw * 10, hx + d * 4, hy + 10 + jaw * 12); // lower jaw
        g.fillStyle(C.tooth, 1);
        if (jaw > 0.3) for (let t = 10; t < 26; t += 6) g.fillTriangle(hx + d * t, hy + 2, hx + d * (t + 3), hy + 2, hx + d * (t + 1.5), hy + 6);
        g.fillStyle(body, 1).fillTriangle(hx - d * 6, hy - 10, hx - d * 2, hy - 22, hx + d * 2, hy - 10); // an ear back
        g.fillStyle(C.eye, 1).fillRect(hx + d * 8 - 2, hy - 7, 4, 3);
        g.fillStyle(C.plate, 1).fillRect(hx - (d > 0 ? 18 : -10) - 4, hy - 2, 8, 16); // the collar
        leg(18, 0, body); leg(-30, Math.PI * 0.4, body);
        // the tail
        g.lineStyle(5, body, 1).lineBetween(X(-38), by - 6, X(-54), by - 14 - Math.sin(gait * 2.4) * 4);
        g.lineStyle(2, C.coatHi, 1).lineBetween(X(-20), by - 16, X(30), by - 18);
      }
    }
    const sh = 1 - Math.min(f.h / 300, 0.5);
    this.shadow.setPosition(f.x, f.z).setScale(sh).setAlpha(0.35 * alpha);
    if (this.hpFill) {
      const show = f.health < f.stats.maxHealth && f.alive;
      const hx = f.x - 22; const hy = f.z - f.h - 74;
      this.hpBg.setVisible(show).setPosition(hx, hy).setDepth(f.z + 0.1);
      this.hpFill.setVisible(show).setPosition(hx, hy).setDepth(f.z + 0.2);
      this.hpFill.scaleX = Math.max(0, f.health / f.stats.maxHealth);
    }
  }

  destroy() {
    this.g.destroy();
    this.img?.destroy();
    this.shadow.destroy();
    this.hpBg?.destroy();
    this.hpFill?.destroy();
  }
}
