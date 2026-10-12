// Sentence.js — THE SENTENCE. The Oath Keepers swore, the night their village burned, that
// every captain who led the Ashen there would kneel, hear his crimes and pay for them.
// So a boss is never simply cut down: beaten, he drops to his knees, the field goes still,
// the hero who beat him walks up, proclaims his crimes and his sentence, and the one who
// passes the sentence swings the blade. Then his men, who watched it, break and run.
// Pure logic on top of the Stage (the views and the arena listen to its events), timed in
// game frames so both online machines play it on the same tick.
//
// Every section boss gets it (the twins: the one left standing), except:
//   boss.sentence: false   (the Ore Crusher: a machine has nothing to answer for)
//   stats.machine          (the same, by type)
//   the section a `sequence` ends (the king's judgment: stage/Sequence.js)
// Stage data on the boss: sentence: { speaker, last, crimes: [line, ...] }
//   speaker  how his own line is labelled (default: the first word of his name)
//   last     his last words, said on his knees (optional)
//   crimes   the hero's charges, one line each (default: GENERIC)
// The hero's side (data/characters.js `sentence`): { move, fatality, cut, as } — which of
// his moves is the killing blow, how it takes the man apart (default: heavy, decap), and
// the name he passes the sentence in.
//
// STEPS: watch -> fall -> kneel -> walk -> speak -> raise -> swing -> after -> watch
//   watch  the fight; the boss is `spare` (his health stops at 1). At 1 he is beaten:
//          every projectile is dropped and the field holds still (World.holdStill), all
//          but him and his executioner
//   fall   he lands (if a blow threw him)
//   kneel  he sinks to his knees (the 'kneel' state)
//   walk   the executioner walks to his side, at the reach of his killing blow
//   speak  the charges and the sentence: a held story beat (skippable line by line)
//   raise  a silence before the blow
//   swing  the killing move; on its first active frame his head comes off (a 'kill')
//   after  the field stays still a moment longer; then it lets go and his men run
//
// Events: sentenceStart { boss, hero }, sentenceKneel { boss, hero },
//         sentenceStrike { boss, hero, fatality, dir }, sentenceDone { boss, hero, routed }

import { Controller } from '../core/Controller.js';
import { stateFor } from '../entities/fighterStates.js';

export const SENTENCE = {
  fallMax: 90,     // waiting for him to land, at most
  drop: 30,        // frames he takes to sink to his knees (the view eases it)
  walkMax: 150,    // the executioner walks to his place for at most this long, then is put there
  stand: 20,       // a breath before the first word
  raise: 34,       // after the last word: the silence before the swing
  hitstop: 16,     // the killing blow freezes both of them this long
  after: 80,       // the field stays still after the head falls
  hold: 1e9,       // (the field is held until it's let go)
  edge: 160,       // a routed man is gone this far past the edge of the room
};

// The charges when a boss has none of his own.
export const GENERIC_CRIMES = [
  'For every home your men put to the torch.',
  'For every life you took on the King\'s word.',
];

// The hero's killing blow when his kit doesn't name one.
const DEFAULT_BLOW = { move: 'heavy', fatality: 'decap', cut: 'chop' };

export class Sentence {
  constructor(stage) {
    this.stage = stage;
    this.world = stage.world;
    this.step = 'watch';
    this.t = 0;
    this.boss = null;
    this.hero = null;
    this.count = 0;
  }

  get running() { return this.step !== 'watch'; }

  // Is this the man the sentence waits for? (the section's boss, the last twin standing)
  eligible(b) {
    const st = this.stage;
    const def = st.section?.boss;
    if (!b || !b.alive || !b.stats.boss || b.stats.machine || !def || def.sentence === false) return false;
    if (st.twins) return false; // (both twins up: the first to fall dies fighting)
    if (st.sequence && st.sequence.si === st.index) return false; // (the king: the judgment)
    return b !== this.passed;
  }

  // The hero's killing blow: { move, state, fatality, cut, frames }.
  blow(h) {
    const S = { ...DEFAULT_BLOW, ...(h.stats.sentence ?? {}) };
    const move = h.stats.moves[S.move] ?? h.stats.moves.heavy;
    return { ...S, state: stateFor(h, S.move), frames: move };
  }

  // Who passes the sentence: the hero who beat him, or the nearest one standing.
  pickHero(b) {
    const alive = this.stage.players.filter((p) => p.alive && !p.downed);
    if (alive.includes(b.lastAttacker)) return b.lastAttacker;
    return alive.sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0] ?? null;
  }

  go(step) {
    this.step = step;
    this.t = 0;
  }

  // Runs every frame. Returns true while it has the stage (the fight logic stands aside).
  update() {
    this.updateRouted();
    if (this.step === 'watch') {
      const b = this.stage.boss;
      if (!this.eligible(b)) return false;
      b.spare = true;
      if (b.health > 1) return false;
      if (!this.begin(b)) return false;
    }
    this.t++;
    const b = this.boss;
    const h = this.hero;
    if (!h.alive) { this.abandon(); return false; }
    if (this.step === 'fall') {
      if (b.grounded || this.t >= SENTENCE.fallMax) {
        b.fsm.change('kneel');
        this.world.events.emit('sentenceKneel', { boss: b, hero: h });
        this.go('kneel');
      }
    } else if (this.step === 'kneel') {
      const ready = ['idle', 'walk'].includes(h.state) && h.grounded;
      if (this.t >= SENTENCE.drop && (ready || this.t >= SENTENCE.drop + 120)) {
        this.spot = this.place(b, h);
        this.go('walk');
      }
    } else if (this.step === 'walk') {
      const s = this.spot;
      const near = Math.abs(h.x - s.x) <= 4 && Math.abs(h.z - s.z) <= 4;
      if (near || this.t >= SENTENCE.walkMax) {
        if (!near) { h.x = s.x; h.z = s.z; this.stage.placeOnGround(h); }
        h.vx = h.vz = 0;
        if (h.state === 'walk') h.fsm.change('idle');
        h.facing = Math.sign(b.x - h.x) || h.facing;
        b.facing = -h.facing; // (he looks up at the man who will do it)
        this.go('speak');
      }
    } else if (this.step === 'speak') {
      const story = this.stage.story;
      if (this.t === SENTENCE.stand) story?.cue(this.beatId);
      // (his own line: he lifts his head to say it)
      b.defiant = story?.line?.who === this.speaker;
      if (this.t > SENTENCE.stand && (!story || story.done.has(this.beatId))) {
        b.defiant = false;
        this.go('raise');
      }
    } else if (this.step === 'raise') {
      if (this.t >= SENTENCE.raise) {
        h.facing = Math.sign(b.x - h.x) || h.facing;
        h.fsm.change(this.blowOf.state);
        this.go('swing');
      }
    } else if (this.step === 'swing') {
      const m = h.move;
      const struck = h.state === this.blowOf.state && m && h.fsm.frame >= m.startup + 1;
      if (struck || h.state !== this.blowOf.state || this.t > 120) {
        this.strike();
        this.go('after');
      }
    } else if (this.step === 'after') {
      if (this.t >= SENTENCE.after) this.finish();
    }
    this.steer();
    return this.running;
  }

  // He's beaten: the fight stops where it stands.
  begin(b) {
    const h = this.pickHero(b);
    if (!h) { b.spare = false; this.passed = b; return false; } // (nobody left to do it: the fight goes on to the death)
    const W = this.world;
    this.boss = b;
    this.hero = h;
    this.blowOf = this.blow(h);
    this.count++;
    b.sentenced = true;
    b.invincible = true;
    b.entering = false;
    b.unbounded = false;
    b.controller = new Controller(); // (no more thinking: he's beaten)
    b.activeAttack = null;
    b.vx = b.vz = 0;
    for (const p of W.projectiles) p.alive = false;
    W.holdStill(SENTENCE.hold, [b, h]);
    h.scripted = { moveX: 0, moveZ: 0, mute: true };
    h.awe = 0; // (still in awe of his entrance: not any more)
    // the words: built now, played as a held story beat when he stands at his side
    const def = this.stage.section?.boss?.sentence ?? {};
    this.speaker = def.speaker ?? speakerOf(b.stats.name);
    this.beatId = `sentence:${this.stage.section?.id ?? 'boss'}:${this.count}`;
    this.stage.story?.beats.push({ id: this.beatId, hold: true, lines: sentenceLines(b, h, def, this.speaker) });
    this.go('fall');
    W.events.emit('sentenceStart', { boss: b, hero: h });
    return true;
  }

  // Where the executioner stands: at his side, the reach of his killing blow away (he
  // swings it planted: `scripted.planted`, no lunge).
  place(b, h) {
    const m = this.blowOf.frames;
    const hb = m.hitbox ?? { x: 0, w: 60 };
    const gap = Math.max(92, (hb.x ?? 0) + (hb.w ?? 60) * 0.75 + b.stats.body.w * 0.4);
    const B = this.world.bounds;
    let side = Math.sign(h.x - b.x) || -b.facing || -1;
    const fits = (s) => b.x + s * gap > B.minX + 20 && b.x + s * gap < B.maxX - 20;
    if (!fits(side) && fits(-side)) side = -side;
    const x = Math.max(B.minX + 20, Math.min(B.maxX - 20, b.x + side * gap));
    return { x, z: b.z };
  }

  // Each tick (read by Fighter.update): the executioner's legs are the scene's, not the pad's.
  steer() {
    const h = this.hero;
    const sc = h?.scripted;
    if (!sc) return;
    sc.moveX = 0; sc.moveZ = 0;
    if (this.step === 'walk') {
      const dx = this.spot.x - h.x;
      const dz = this.spot.z - h.z;
      if (Math.abs(dx) > 3) sc.moveX = Math.sign(dx) * Math.min(1, 0.3 + Math.abs(dx) / 60);
      if (Math.abs(dz) > 3) sc.moveZ = Math.sign(dz) * Math.min(1, 0.3 + Math.abs(dz) / 40);
    }
    // (while the words play, the pad is the story's: presses move the lines on)
    const c = this.stage.story?.current;
    sc.mute = !(this.step === 'speak' && c?.beat.id === this.beatId);
    sc.planted = this.step === 'raise' || this.step === 'swing' || this.step === 'after';
  }

  // The blow lands.
  strike() {
    const b = this.boss;
    const h = this.hero;
    const B = this.blowOf;
    const dir = Math.sign(b.x - h.x) || h.facing;
    b.spare = false;
    b.invincible = false;
    b.defiant = false;
    b.health = 0;
    b.fatality = B.fatality;
    h.hitstop = b.hitstop = SENTENCE.hitstop;
    const H = b.stats.body.h;
    const e = {
      attacker: h, defender: b, dir, kind: 'melee', sentence: true,
      move: { cut: B.cut, damage: b.stats.maxHealth, hitstop: SENTENCE.hitstop },
      x: b.x, z: b.z, h: b.h + H * 0.57, damage: b.stats.maxHealth, fatality: B.fatality,
    };
    b.fsm.change('dead');
    this.world.events.emit('sentenceStrike', { boss: b, hero: h, fatality: B.fatality, dir });
    this.world.events.emit('kill', e);
  }

  // The field lets go; his men, who watched it, break and run.
  finish() {
    const W = this.world;
    const b = this.boss;
    const h = this.hero;
    W.release();
    if (h) h.scripted = null;
    for (const p of this.stage.players) for (const a in p.controller.pressAge) p.controller.pressAge[a] = Infinity;
    const routed = [];
    for (const f of W.fighters) {
      if (f.team !== 'enemy' || !f.alive || f === b || !f.controller) continue;
      const B = W.bounds;
      // to the nearer edge that isn't through the heroes
      const left = f.x - B.minX < B.maxX - f.x;
      let dir = left ? -1 : 1;
      if (Math.sign(h.x - f.x) === dir && Math.abs(h.x - f.x) < 200) dir = -dir;
      f.controller.routed = dir;
      f.entering = false;
      f.unbounded = true;
      f.ghost = true; // (over ledges and through the rubble: they're running for their lives)
      routed.push(f);
    }
    this.passed = b;
    this.boss = null;
    this.hero = null;
    this.go('watch');
    W.events.emit('sentenceDone', { boss: b, hero: h, routed });
  }

  // The executioner fell before the blow (can't happen in a held field, but): the boss
  // stays on his knees, killable, and the fight goes on.
  abandon() {
    const b = this.boss;
    if (b?.alive) { b.spare = false; b.invincible = false; b.sentenced = false; }
    if (this.hero) this.hero.scripted = null;
    this.world.release();
    this.passed = b;
    this.boss = null;
    this.hero = null;
    this.go('watch');
  }

  // Routed men run off the edge of the room and are gone.
  updateRouted() {
    const B = this.world.bounds;
    for (const f of this.world.fighters) {
      if (!f.controller?.routed || !f.alive) continue;
      if (f.x < B.minX - SENTENCE.edge || f.x > B.maxX + SENTENCE.edge) f.removeMe = true;
    }
  }
}

// 'Brother Cinder, the Rear Guard' -> 'CINDER'; 'The Houndmaster' -> 'HOUNDMASTER'.
export function speakerOf(name = '') {
  const words = name.split(',')[0].split(' ').filter((w) => !['The', 'Brother', 'Siege', 'Commander', 'Warlord'].includes(w));
  return (words[0] ?? 'HE').toUpperCase();
}

// The charges, his last words, the sentence.
export function sentenceLines(b, h, def, speaker = speakerOf(b.stats.name)) {
  const hero = (h.stats.name ?? 'Rurik').toUpperCase();
  const crimes = def.crimes?.length ? def.crimes : GENERIC_CRIMES;
  const lines = [[hero, `${b.stats.name}. On your knees, hear your crimes.`]];
  for (const c of crimes) lines.push([hero, c]);
  if (def.last) lines.push([speaker, def.last]);
  const as = h.stats.sentence?.as ?? `${h.stats.name} of the Oath Keepers`;
  lines.push([hero, `By the oath we swore over our burning home, I, ${as}, sentence you to die.`]);
  return lines;
}
