import { Controller } from '../core/Controller.js';

// THE WELL (Nick, 2026-11-23: "The Mira and the boy at the well is serious scene please give
// those npc the love and that set piece too"). Coming into the market square you walk in on it
// happening: the butcher has torn Mira's boy out of her arms and holds him out over the open
// well by the collar, and a raider has Mira by the hood, dragging her back while she claws to
// get to her son. Once the fight starts the butcher lets the boy slip lower every few seconds.
// Hit him and he drops the boy on the stones instead, and the boy scrambles back to his mother;
// too slow and he throws him down the well (hauled up on the bucket rope once the square is
// won). With her son free, Mira turns on the man holding her. When the fight's done she's on
// her knees clutching the boy, says her piece, and the two of them run for it hand in hand.
//
// Fixed-tick like stage/MillRescue.js: every frame counted, no dice, so both online players
// see the same thing. The men are the square's own first line-up (its inPlace spawns,
// data/stageVillage.js): the butcher and the man nearest Mira are taken off their brains
// while they hold, and handed back the moment it's over. Drawn by view/NpcView.js (Mira and
// the boy apart, data `split`) and view/WellRescueView.js (the shouts, the bucket rope).
export const WELL_RESCUE = {
  slip: [420, 840, 1140],  // fight frames at which he lets the boy slip lower (a jolt each time)
  throw: 1380,             // ...and at which he throws him down the well
  hold: { dx: 62, h: 78 }, // the boy's hands at the butcher's fist: this far out from him, this high
  drop: 12,                // px lower at each slip
  rim: 52,                 // the well's stone ring, px above the ground
  mouth: { x: 2262, z: 292 }, // the middle of the well's mouth (its painting, assets/env/village/well.png)
  fall: 26,                // frames the dropped boy takes to land
  run: 2.6,                // px a frame the boy runs back to his mother
  haul: 150,               // frames to haul him up the bucket rope
  hug: 170,                // frames she clutches him before they run
  shove: 40,               // frames from the boy free to Mira turning on the man holding her
};
// the butcher's taunts and Mira's cries (shouts over their heads, the fight goes on)
export const WELL_LINES = {
  start: 'ONE STEP CLOSER AND THE PUP DROWNS!',
  slip: ['HE\u2019S SLIPPING, OATHKEEPER!', 'HEAR HIM SQUEAL?', 'LAST CHANCE!'],
  throw: 'DOWN HE GOES!',
  miraHeld: 'LET HIM GO! PLEASE!',
  miraThrown: 'NO! MY BOY!',
  boy: 'MAMA!',
};

export class WellRescue {
  constructor(stage) {
    this.stage = stage;
    this.D = { ...WELL_RESCUE, ...(stage.data.wellRescue ?? {}) };
    this.npc = stage.story.npc(this.D.npc ?? 'mira');
    this.reset(true);
  }

  reset(first = false) {
    const n = this.npc;
    this.phase = 'held'; // held -> falling | thrown -> back | hauling -> hug -> done
    this.clock = 0; this.age = 0; this.slips = 0; this.bark = null;
    this.butcher = this.grip = null; this.butcherBrain = this.gripBrain = null; this.shoved = false; this.freeAt = null;
    if (!n) return;
    if (!first && this.stage.story.isRescued(n.id)) { this.phase = 'done'; n.split = false; return; }
    n.split = true; n.freeFor = 1e9;
    this.boy = { x: this.D.mouth.x + 40, z: this.D.mouth.z + 4, h: this.D.hold.h, pose: 'wave', dir: -1, tilt: 0, shown: true };
    n.boy = this.boy;
  }

  get section() { return this.stage.sections.findIndex((s) => s.id === (this.D.section ?? 'square')); }
  // the boy's in danger: the HUD's warning, the camera's interest
  get live() { return this.phase === 'held'; }

  say(text, life = 150) { this.bark = { text, age: 0, life }; }
  cry(text, life = 150) { const n = this.npc; n.helpText = text; n.helpAge = life; n.helpCalled = true; }

  // the square's men, once they're standing at their posts: the butcher at the well, and the
  // man nearest Mira (he has her by the hood)
  claim() {
    if (this.butcher) return true;
    const si = this.section;
    // (waiting at their posts; or, started at the square's checkpoint, already woken but not
    // yet touched: still standing where they were set down round the well)
    const m = this.D.mouth;
    const men = this.stage.world.fighters.filter((f) => f.team === 'enemy' && f.alive && !f.kingsMan
      && (f.lurking === si || (f.lurking == null && this.stage.index === si && f.health >= f.stats.maxHealth && Math.abs(f.x - m.x) < 320 && Math.abs(f.z - m.z) < 220)));
    const butcher = men.find((f) => f.stats.id === 'butcher');
    if (!butcher) return false;
    const n = this.npc;
    const grip = men.filter((f) => f !== butcher).sort((a, b) => Math.hypot(a.x - n.x, a.z - n.z) - Math.hypot(b.x - n.x, b.z - n.z))[0] ?? null;
    this.butcher = butcher; this.butcherBrain = butcher.controller; butcher.controller = new Controller();
    butcher.wellHolder = true;
    if (grip) { this.grip = grip; this.gripBrain = grip.controller; grip.controller = new Controller(); grip.wellGrip = true; }
    return true;
  }

  // hand a man back to his own brain, into the fight
  release(f, brain) {
    if (!f) return;
    if (brain) f.controller = brain;
    f.wellHolder = f.wellGrip = false; f.stripPose = null; f.lurking = null; f.awe = 0;
  }

  // a man held to his spot by hand (frozen to his own brain, like the king's pack)
  posed(f, facing) {
    f.vx = f.vz = 0; f.facing = facing;
    if (f.state !== 'idle' && f.state !== 'walk') return; // (hit, staggered: his own body plays it)
    if (f.state !== 'idle') f.fsm.change('idle');
  }

  hurt(f) { return !f?.alive || f.health < f.stats.maxHealth || !['idle', 'walk'].includes(f.state); }

  update() {
    const st = this.stage, n = this.npc, D = this.D;
    if (!n || this.phase === 'done') return;
    if (this.bark && ++this.bark.age >= this.bark.life) this.bark = null;
    this.age++;
    const si = this.section;
    // gone past the square some other way (a checkpoint, a test start): it's over
    if (st.index > si && this.phase !== 'hug') { this.finish(); return; }
    if (this.phase === 'held') this.updateHeld(si);
    else if (this.phase === 'falling') this.updateFalling();
    else if (this.phase === 'back') this.updateBack();
    else if (this.phase === 'thrown') this.updateThrown();
    else if (this.phase === 'hauling') this.updateHauling();
    else if (this.phase === 'hug') this.updateHug();
    this.updateGrip();
    this.updateMira();
  }

  // the boy at the end of the butcher's arm, over the well's mouth
  updateHeld(si) {
    const st = this.stage, D = this.D, b = this.boy;
    if (!this.claim()) { b.shown = false; return; }
    const f = this.butcher;
    b.shown = true;
    // struck, killed, knocked about: he lets go, the boy drops on the stones
    if (this.hurt(f)) { this.dropBoy(); return; }
    const face = Math.sign(D.mouth.x - f.x) || -1;
    this.posed(f, face);
    f.stripPose = 'special:4'; // (arm out: until the painted hold is in, his hook throw's reach)
    const fight = st.index === si && st.fightOn && !st.story.holding && !st.world.hold;
    if (fight) {
      this.clock++;
      if (this.clock === 1) { this.say(WELL_LINES.start, 180); st.world.events.emit('wellRescueStart'); st.world.events.emit('millWarning', { text: 'SAVE THE BOY!' }); }
      const k = D.slip.indexOf(this.clock);
      if (k >= 0) { this.slips = k + 1; this.say(WELL_LINES.slip[k] ?? WELL_LINES.slip.at(-1), 160); this.cry(k % 2 ? WELL_LINES.miraHeld : WELL_LINES.boy, 120); st.world.events.emit('wellSlip', { slips: this.slips }); }
      if (this.clock >= D.throw) { this.throwBoy(); return; }
    }
    // kicking at the end of his arm, swinging a little; lower each time he slips
    const kick = Math.sin(this.age * (0.2 + 0.05 * this.slips));
    b.x = f.x + face * D.hold.dx; b.z = f.z - 2;
    b.h = D.hold.h - this.slips * D.drop + (this.age % 60 < 4 && this.slips ? -2 : 0);
    b.pose = 'wave'; b.dir = -face; b.tilt = kick * (5 + 2 * this.slips);
  }

  dropBoy() {
    const b = this.boy;
    this.phase = 'falling'; this.t = 0; this.from = { x: b.x, z: b.z, h: b.h };
    // he drops him short of the well's mouth, in front of the ring
    this.to = { x: b.x, z: Math.max(b.z + 30, this.D.mouth.z + 36), h: 0 };
    this.bark = null;
    this.release(this.butcher, this.butcherBrain);
    this.cry(WELL_LINES.boy, 90);
    this.stage.world.events.emit('wellDropped');
  }

  throwBoy() {
    const b = this.boy;
    this.phase = 'thrown'; this.t = 0; this.from = { x: b.x, z: b.z, h: b.h };
    this.say(WELL_LINES.throw, 120);
    this.cry(WELL_LINES.miraThrown, 200);
    this.release(this.butcher, this.butcherBrain);
    this.stage.world.events.emit('wellThrown');
    this.stage.world.events.emit('millWarning', { text: 'HE THREW THE BOY DOWN THE WELL!', final: true });
  }

  updateFalling() {
    const b = this.boy, D = this.D, u = Math.min(1, ++this.t / D.fall);
    b.x = this.from.x + (this.to.x - this.from.x) * u;
    b.z = this.from.z + (this.to.z - this.from.z) * u;
    b.h = this.from.h * (1 - u * u);
    b.pose = 'wave'; b.tilt = 14 * u * (b.dir || 1);
    if (u >= 1) { b.h = 0; b.tilt = 0; b.pose = 'cower'; this.phase = 'back'; this.t = 0; this.stage.world.events.emit('wellLanded'); }
  }

  // up off the stones and back to her (once she's loose of the man holding her)
  updateBack() {
    const b = this.boy, n = this.npc;
    this.t++;
    if (this.t < 30) { b.pose = 'cower'; return; }
    const tx = n.x + 26 * (n.dir ?? 1), tz = n.z + 4;
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
    if (d <= this.D.run || !this.npcLoose()) {
      if (d <= this.D.run) { b.x = tx; b.z = tz; this.reunite(); return; }
      b.pose = 'cower'; return; // (she's still held: he cowers where he fell)
    }
    b.x += (dx / d) * this.D.run; b.z += (dz / d) * this.D.run; b.dir = Math.sign(dx) || b.dir; b.pose = 'run';
    b.stride = (b.stride ?? 0) + this.D.run;
  }

  // down the well: gone till the square is won
  updateThrown() {
    const b = this.boy, D = this.D;
    this.t++;
    if (this.t <= 16) {
      const u = this.t / 16;
      b.x = this.from.x + (D.mouth.x - this.from.x) * u; b.z = D.mouth.z + 2;
      b.h = this.from.h + 20 * Math.sin(Math.PI * u) - (this.from.h - D.rim + 10) * u;
      b.tilt = 40 * u; b.pose = 'wave';
      if (this.t === 16) { b.shown = false; this.stage.world.events.emit('wellSplash'); }
      return;
    }
    if (this.stage.story.isRescued(this.npc.id) && this.stage.livingFoes().length === 0) { this.phase = 'hauling'; this.t = 0; }
  }

  // the square won: hauled up on the bucket rope, out over the rim, back to her
  updateHauling() {
    const b = this.boy, D = this.D, n = this.npc;
    const u = Math.min(1, ++this.t / D.haul);
    b.shown = true; b.tilt = 0;
    b.x = D.mouth.x; b.z = D.mouth.z + 2;
    if (u < 0.7) { b.h = D.rim - 60 + (60 + 30) * (u / 0.7); b.pose = 'wave'; } // (up the rope, out of the black)
    else { const v = (u - 0.7) / 0.3; b.h = (D.rim + 30) * (1 - v); b.z = D.mouth.z + 2 + 34 * v; b.pose = 'cower'; }
    if (this.t === 1) this.stage.world.events.emit('wellHaul');
    if (u >= 1) { b.h = 0; this.phase = 'back'; this.t = 30; }
  }

  // down on her knees with him: the painted mother and son together
  reunite() {
    const n = this.npc;
    this.phase = 'hug'; this.t = 0;
    n.split = false; this.boy.shown = false;
    this.stage.world.events.emit('wellReunited');
  }

  updateHug() {
    const n = this.npc;
    this.t++;
    n.act = 'cower';
    // free (the fight's won): after the hug they run, hand in hand
    if (this.t >= this.D.hug && n.state === 'free') { n.act = null; n.freeFor = n.t + 1; this.phase = 'done'; }
    else if (this.t >= this.D.hug && n.state !== 'threatened') { n.act = null; n.freeFor = n.t + 1; this.phase = 'done'; }
  }

  // Mira's loose of the man who had her: he's dead, hurt, or she's turned on him
  npcLoose() { return this.shoved || !this.grip || this.hurt(this.grip); }

  updateGrip() {
    const g = this.grip, n = this.npc;
    if (!g || !g.wellGrip) return;
    if (this.hurt(g)) { this.release(g, this.gripBrain); return; }
    // he holds her by the hood, behind her, facing her way
    this.posed(g, Math.sign(n.x - g.x) || 1);
    // the boy loose: she turns on him (a shove with everything she has), and he's in the fight
    const free = this.phase !== 'held' && this.phase !== 'thrown';
    if (free && ++this.shoveT >= this.D.shove) {
      this.shoved = true;
      g.vx = 260 * Math.sign(g.x - n.x || -1);
      if (g.fsm.states?.stagger || g.fsm.has?.('stagger')) g.fsm.change('stagger');
      this.release(g, this.gripBrain);
      this.stage.world.events.emit('wellShove', { foe: g });
    }
  }

  // how she's drawn while they're apart: reaching for him, struggling in the man's grip
  updateMira() {
    const n = this.npc;
    this.shoveT ??= 0;
    if (this.phase === 'hug' || this.phase === 'done') return;
    if (!n.split) return;
    const b = this.boy;
    n.dir = Math.sign(b.x - n.x) || 1;
    if (this.phase === 'held' || this.phase === 'thrown') {
      // straining for him while held; on the ground sobbing once he's down the well
      n.act = this.phase === 'thrown' && this.t > 16 ? 'cower' : 'wave';
      n.tilt = this.phase === 'held' && this.grip?.wellGrip ? 6 * Math.sin(this.age * 0.15) - 6 : 0;
    } else {
      n.act = this.npcLoose() ? 'wave' : 'wave'; n.tilt = 0;
    }
  }

  finish() {
    const n = this.npc;
    this.release(this.butcher, this.butcherBrain); this.release(this.grip, this.gripBrain);
    n.split = false; n.act = null; n.tilt = 0; if (this.boy) this.boy.shown = false;
    if (n.freeFor > 1e8) n.freeFor = undefined;
    this.phase = 'done'; this.bark = null;
  }
}
