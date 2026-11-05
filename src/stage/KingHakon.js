import { createEnemy } from '../entities/Enemy.js';

// KING HAKON, THE OATH KING (Nick, 2026-11-04): Rurik's father, the king the Oath Keepers
// are sworn to, is not one more villager. Coming up the road into the market square you
// find him holding it alone against a pack of Ashen men, and you watch him cut through
// them with Oathkeeper: a real fight in the world (the men are real troops and come apart
// like any others), framed by the letterbox, with his name over the screen. Then the two of
// them, torn: the boy at the well needs Rurik, the children need getting to the church. They
// agree to meet at the church (the held beat 'kingParting', data/stageVillage.js) and he
// runs off up the lane. When Rurik reaches the church he is dying on its steps (the beat
// 'elder' and its painted farewell, view/BirthrightArt.js).
//
// Fixed-tick staging like stage/VillageOpening.js: no dice, every frame counted, so both
// online players see the same fight. The heroes are held still from the moment it starts
// (and walked up to him when it's won); the square's own men wait at the well until the
// parting is said (section.fightAfter). Drawn by view/KingView.js.
export const KING = {
  section: 'square',  // the section whose fight waits for him (its fightAfter)
  at: 1440,           // a hero this far along the road starts it
  x: 1760, z: 400,    // where he stands his ground
  reach: 70,          // how far from him a man stands when the blade takes him
  walkIn: 26,         // frames a man takes stepping into his blade (at most)
  gap: 8,             // frames between one kill and the next man stepping in
  intro: 40,          // frames he holds them off before the first cut
  roar: 110,          // his roar over the last of them (and the heroes walking up to him)
  meet: 140,          // ...where the heroes stop, this far short of him
  leaveSpeed: 6,      // px a frame running off up the lane
  leaveFade: 70,      // frames until he's gone into the smoke
  card: 70,           // his name over the screen from this frame of the fight
};

// the pack round him: [id, type, dx, dz] from where he stands
export const PACK = [
  ['a', 'grunt', 170, -10],
  ['b', 'grunt', -150, -50],
  ['d', 'grunt', -140, 55],
  ['c', 'stalker', 120, -80],
  ['e', 'grunt', 180, 70],
  ['f', 'butcher', 230, 10],
];

// His moves: [pose, frames] in order (view/KingView.js draws each pose), the blade lands at
// the start of segment `hit`. A move's men: who it takes, and how they come apart
// (combat/Fatality.js). Each beat is its own kind of kill, the last the cruellest.
export const MOVES = {
  chop: { segs: [['chopUp', 18], ['chop', 26]], hit: 1, cut: 'chop', kb: [260, 300] },
  sweep: { segs: [['sweepUp', 16], ['sweep', 26]], hit: 1, cut: 'slash', kb: [380, 300] },
  spin: { segs: [['stand', 4], ['spin', 10], ['sweep', 20]], hit: 2, cut: 'cleave', kb: [420, 320] },
  kick: { segs: [['breathe', 8], ['kick', 24]], hit: 1, cut: 'blunt', kb: [900, 520] },
  thrust: { segs: [['sweepUp', 14], ['thrust', 34]], hit: 1, cut: 'pierce', kb: [520, 260] },
};
export const STEPS = [
  { move: 'chop', foes: ['a'], fat: ['halfV'] },
  { move: 'sweep', foes: ['b', 'd'], fat: ['decap', 'halfH'] },
  { move: 'spin', foes: ['c'], fat: ['decap'] },
  { move: 'kick', foes: ['e'], fat: ['none'] },
  { move: 'thrust', foes: ['f'], fat: ['explode'], last: true },
];

export class KingHakon {
  constructor(stage, def = {}) {
    this.stage = stage;
    this.K = { ...KING, ...def };
    const K = this.K;
    this.x = K.x; this.z = K.z; this.h = 0;
    this.facing = 1; this.pose = 'stand'; this.alpha = 1;
    this.age = 0; this.phase = 'wait'; this.active = true; this.cinema = false;
    this.step = -1; this.t = 0; this.stride = 0;
    const w = stage.world;
    this.pack = new Map();
    for (const [id, type, dx, dz] of PACK) {
      const f = createEnemy(w, type, K.x + dx, K.z + dz);
      f.invincible = true; f.cinematic = true; f.unbounded = true; f.kingsMan = true;
      f.lurking = 'king'; // (his fight, not the road's: never counted as the road's foes)
      f.facing = Math.sign(-dx) || -1; f.awe = 2;
      if (stage.terrain) { f.floor = Math.max(0, stage.terrain.groundAt(f.x, f.z)); f.h = f.floor; }
      this.pack.set(id, f);
    }
  }

  get waiting() { return this.active && this.phase === 'wait'; }

  // a hero comes up the road into the square (the road won): the stage is his
  begin() {
    const st = this.stage;
    this.phase = 'intro'; this.t = 0; this.age = 0; this.cinema = true;
    for (const p of st.players) { p.awe = 2; p.vx = p.vz = 0; p.unbounded = true; }
    st.world.events.emit('kingMet', { king: this });
  }

  get foes() { return [...this.pack.values()]; }
  get living() { return this.foes.filter((f) => f.alive); }
  get holding() { return !['wait', 'leave', 'gone'].includes(this.phase); }

  // where the camera looks: between the heroes and him
  focusX(heroX) { return (heroX + this.x) / 2; }

  // a man posed by hand (frozen to his own brain, like the opening's troops)
  posed(f, x, z, moving, facing) {
    f.vx = (x - f.x) * 60; f.x = x; f.z = z; f.vh = f.vz = 0;
    f.facing = facing; f.awe = 2; f.invincible = true;
    const state = moving ? 'walk' : 'idle';
    if (f.state !== state) f.fsm.change(state);
    f.fsm.frame++;
  }

  // the men still standing: squared up to him, edging in and out
  menace(skip = []) {
    for (const f of this.living) {
      if (skip.includes(f)) continue;
      const k = (this.age + f.id * 37) % 90, step = k < 10 ? (Math.floor((this.age + f.id * 37) / 90) % 2 ? 0.6 : -0.6) : 0;
      this.posed(f, f.x + step * Math.sign(this.x - f.x), f.z, k < 10, Math.sign(this.x - f.x) || -1);
    }
  }

  // The blade lands: the man dies where he stands and comes apart the way it says (the
  // ordinary kill events, so blood, gore, sounds and loot all follow as for anyone's kill)
  slay(f, fatality, mv, dir) {
    const w = this.stage.world;
    f.health = 0; f.flash = 6; f.awe = 0; f.cinematic = false; f.invincible = true; f.lurking = null;
    f.fatality = fatality;
    f.hitstop = 10;
    f.fsm.change('knockdown', { vx: dir * mv.kb[0], vh: mv.kb[1] });
    const e = {
      attacker: null, defender: f, dir, kind: 'melee', king: true,
      move: { cut: mv.cut, damage: 90, hitstop: 12, overhead: mv.cut === 'chop' },
      x: f.x - dir * 20, z: f.z, h: f.h + f.stats.body.h * 0.62, damage: 90, fatality,
    };
    if (fatality === 'halfV') e.attachedSplit = false;
    w.events.emit('hit', e);
    w.events.emit('kill', e);
  }

  // the heroes stand where they were (held), or walk up to him once it's won
  heroes() {
    const st = this.stage;
    for (const [i, p] of st.players.entries()) {
      p.awe = 2; p.unbounded = true;
      if (this.phase === 'roar' || this.phase === 'words') {
        const tx = this.x - this.K.meet - i * 60, tz = Math.max(this.z - 10, Math.min(this.z + 60, p.z));
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), v = 2.6;
        const moving = d > 2;
        if (moving) { p.x += dx / d * Math.min(v, d); p.z += dz / d * Math.min(v, d); }
        p.vx = moving ? 60 * v : 0; p.facing = 1;
        const state = moving ? 'walk' : 'idle';
        if (p.state !== state) p.fsm.change(state);
        p.fsm.frame++;
      } else { p.vx = p.vz = 0; }
    }
  }

  update() {
    if (!this.active) return false;
    const st = this.stage, w = st.world, K = this.K;
    if (this.phase === 'wait') {
      // holding them off, out of sight up the road: squared up, his blade up
      this.age++;
      this.pose = this.age % 50 < 25 ? 'stand' : 'breathe';
      this.menace();
      if (st.phase === 'clear' && st.sections[st.index + 1]?.id === K.section && st.players.some((q) => q.alive && q.x >= K.at)) this.begin();
      return false;
    }
    this.age++; this.t++;
    if (this.holding) w.holdStill(2, this.foes);
    this.heroes();
    if (this.age === K.card) w.events.emit('kingCard', { king: this });

    if (this.phase === 'intro') {
      this.pose = this.age % 50 < 25 ? 'stand' : 'breathe';
      this.facing = 1;
      this.menace();
      if (this.t >= K.intro) this.next();
    } else if (this.phase === 'close') {
      // his men step in to him, onto his blade
      const S = STEPS[this.step], mv = MOVES[S.move];
      const men = S.foes.map((id) => this.pack.get(id));
      const side = Math.sign(men[0].x - this.x) || 1;
      this.facing = side;
      this.pose = 'breathe';
      let there = true;
      men.forEach((f, i) => {
        const tx = this.x + side * K.reach, tz = this.z + (men.length > 1 ? (i ? 34 : -34) : 0);
        const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz);
        const v = Math.max(3, d / Math.max(1, K.walkIn - this.t));
        if (d > 1) { there = false; this.posed(f, f.x + dx / d * Math.min(v, d), f.z + dz / d * Math.min(v, d), true, -side); }
        else this.posed(f, tx, tz, false, -side);
      });
      this.menace(men);
      if (there || this.t >= K.walkIn) { this.phase = 'strike'; this.t = 0; this.seg = 0; this.segT = 0; w.events.emit('kingSwing', { king: this, move: S.move }); }
    } else if (this.phase === 'strike') {
      const S = STEPS[this.step], mv = MOVES[S.move];
      const men = S.foes.map((id) => this.pack.get(id));
      this.menace(men);
      for (const f of men) if (!f.alive) continue; else this.posed(f, f.x, f.z, false, -this.facing);
      this.pose = mv.segs[this.seg][0];
      if (this.segT === 0 && this.seg === mv.hit) {
        men.forEach((f, i) => this.slay(f, S.fat[i] ?? 'none', mv, this.facing));
        w.events.emit('kingStrike', { king: this, move: S.move, last: !!S.last, x: this.x + this.facing * K.reach, z: this.z });
      }
      if (++this.segT >= mv.segs[this.seg][1]) { this.seg++; this.segT = 0; }
      if (this.seg >= mv.segs.length) {
        if (S.last) { this.phase = 'roar'; this.t = 0; w.events.emit('kingRoar', { king: this }); }
        else { this.phase = 'pause'; this.t = 0; }
      }
    } else if (this.phase === 'pause') {
      this.pose = 'breathe';
      this.menace();
      if (this.t >= K.gap) this.next();
    } else if (this.phase === 'roar') {
      this.pose = this.t < K.roar * 0.7 ? 'roar' : 'breathe';
      this.facing = this.t < K.roar * 0.7 ? 1 : -1;
      if (this.t >= K.roar) { this.phase = 'words'; this.t = 0; st.story?.cue('kingParting'); }
    } else if (this.phase === 'words') {
      // he speaks to his son (turned to him), points the way to the well, and sends him
      const c = st.story?.current;
      const cue = c?.beat.id === 'kingParting' ? c.beat.lines[c.index]?.[2]?.moment : null;
      if (cue) this.cue = cue;
      this.facing = this.cue === 'kingPoint' ? 1 : -1;
      this.pose = this.cue === 'kingPoint' ? 'point' : this.cue === 'kingLook' ? 'look' : this.age % 60 < 30 ? 'stand' : 'breathe';
      if (st.story?.done.has('kingParting') && !st.story.busy) this.leave();
    }
    return this.holding;
  }

  next() {
    this.step++;
    this.t = 0;
    this.phase = this.step < STEPS.length ? 'close' : 'roar';
  }

  // the parting is said: let the heroes go, and he runs off up the lane to the church
  leave() {
    const st = this.stage, w = st.world;
    this.phase = 'leave'; this.t = 0; this.cinema = false;
    w.hold = null;
    for (const f of this.foes) { f.unbounded = false; f.cinematic = false; }
    for (const p of st.players) {
      p.unbounded = false; p.awe = 0; p.vx = 0; p.sprinting = false; p.fsm.change('idle');
      for (const a of Object.keys(p.controller.pressAge)) p.controller.pressAge[a] = Infinity;
    }
    w.events.emit('kingLeaves', { king: this });
  }

  // After the heroes are let go: he runs off up the lane, into the smoke, toward the church.
  tail() {
    if (this.phase !== 'leave') return;
    const K = this.K;
    this.t++;
    this.facing = 1;
    this.x += K.leaveSpeed; this.z = Math.max(this.stage.data.laneTop ?? 260, this.z - K.leaveSpeed * 0.45);
    this.stride += K.leaveSpeed;
    this.pose = `run${Math.floor(this.stride / 34) % 4}`;
    this.alpha = Math.max(0, 1 - Math.max(0, this.t - K.leaveFade * 0.4) / (K.leaveFade * 0.6));
    if (this.t >= K.leaveFade) { this.phase = 'gone'; this.active = false; }
  }

  // started past him (a test start, a checkpoint further on): he's already gone on
  cancel() {
    for (const f of this.foes) if (f.alive) f.removeMe = true;
    for (const p of this.stage.players) { p.unbounded = false; p.awe = 0; }
    this.stage.world.hold = null;
    this.phase = 'gone'; this.active = false; this.cinema = false;
  }
}
