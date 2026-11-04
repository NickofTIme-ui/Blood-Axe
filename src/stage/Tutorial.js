// Tutorial.js — THE PRACTICE YARD's lessons (data/stagePractice.js, data/tutorial.js).
//
// One move at a time: the card (view/TutorialCard.js) names it and its buttons; the hero
// does it, the card ticks it off, and a moment later the next one comes up. D-pad left
// (X on the keys) skips a lesson. After the last one the yard stays open to keep practising.
//
// Men to hit: two who stand at their posts and never fight back (Enemy.js `dummy`), walking
// back to their post when they're knocked off it; one who does fight back for the BLOCK
// lesson (and for free practice at the end). A man killed is replaced a moment later.
// The hero can't die here and never runs short of mana or stamina.
//
// Pure logic, run on the simulation's tick from Stage.update (so both machines of a
// co-op game would agree, and it runs in the node tests).

import { lessonsFor } from '../data/tutorial.js';
import { createEnemy, offscreenX } from '../entities/Enemy.js';

export const TUTORIAL = {
  posts: [{ x: 700, z: 370 }, { x: 760, z: 470 }, { x: 880, z: 410 }], // where the standing men wait
  standing: 2,    // how many stand waiting (the third post: the sparring man's, once he's done)
  sparAt: { x: 900, z: 420 },                        // where the man who fights back comes from
  type: 'grunt',
  health: 2,      // x his usual health: a whole combo lands before he drops
  respawn: 45,    // ticks before a man who fell is replaced
  firstMen: 20,   // ticks before the first men come in
  advance: 55,    // ticks the ticked-off card stays up before the next lesson
};

export class Tutorial {
  constructor(stage, lessons = null) {
    this.stage = stage;
    this.world = stage.world;
    this.fixed = lessons; // (null: the hero's own list, read once he's there)
    this.lessons = null;
    this.index = 0;
    this.count = 0;
    this.walked = 0;
    this.doneFor = -1;     // ticks since this lesson was done (-1: not done yet)
    this.finished = false;
    this.skipped = new Set();
    this.wait = TUTORIAL.firstMen;
    this.men = [];         // the men this yard brought in
    this.last = null;      // the hero's state last tick
    const names = ['attackStart', 'block', 'parry', 'grabThrow', 'sprintStart', 'roll', 'jump', 'blinkOut', 'mineDrop', 'knifeThrow'];
    for (const n of names) this.world.events.on(n, (e) => this.onEvent(n, e));
  }

  get hero() { return this.stage.players?.[0] ?? null; }
  get lesson() { return this.lessons?.[this.index] ?? null; }
  get total() { return this.lessons?.length ?? 0; }
  get done() { return this.doneFor >= 0; }

  // ------------------------------------------------------------ what the hero did

  onEvent(name, e) {
    const L = this.lesson;
    if (!L || this.done || this.finished) return;
    const who = e?.fighter ?? e?.defender;
    if (!who || who !== this.hero) return;
    if (name === 'attackStart') return this.saw(e.state);
    if (L.done.events?.includes(name)) this.credit();
  }

  saw(state) {
    const L = this.lesson;
    if (L && !this.done && !this.finished && L.done.moves?.includes(state)) this.credit();
  }

  credit() {
    this.count++;
    if (this.count < (this.lesson.times ?? 1)) return;
    this.doneFor = 0;
    this.world.events.emit('lessonDone', { lesson: this.lesson, index: this.index });
  }

  skip() {
    if (!this.lesson || this.done || this.finished) return;
    this.skipped.add(this.lesson.id);
    this.doneFor = 0;
    this.world.events.emit('lessonDone', { lesson: this.lesson, index: this.index, skipped: true });
  }

  next() {
    this.index++;
    this.count = 0;
    this.walked = 0;
    this.doneFor = -1;
    if (this.index >= this.total) {
      this.finished = true;
      this.world.events.emit('practiceDone', { skipped: [...this.skipped] });
    } else {
      this.world.events.emit('lessonStart', { lesson: this.lesson, index: this.index });
    }
  }

  // ------------------------------------------------------------ each tick

  update() {
    const p = this.hero;
    if (!p) return;
    if (!this.lessons) {
      this.lessons = this.fixed ?? lessonsFor(p.stats.id);
      this.world.events.emit('lessonStart', { lesson: this.lesson, index: 0 });
    }
    // can't die, never short of breath or mana
    p.immortal = true;
    if (p.alive) { p.health = p.stats.maxHealth; p.mana = p.stats.maxMana; p.stamina = p.stats.maxStamina; }

    if (this.done) {
      if (++this.doneFor >= TUTORIAL.advance) this.next();
    } else if (!this.finished) {
      if (p.state !== this.last) this.saw(p.state); // (a state entered: the hero's move)
      const L = this.lesson;
      if (L.done.walk && p.state === 'walk') {
        this.walked += Math.hypot(p.x - (this.px ?? p.x), p.z - (this.pz ?? p.z));
        if (this.walked >= L.done.walk) this.credit();
      }
      if (L.done.sprinting && p.sprinting && p.state === 'walk') this.credit();
      if (p.controller?.consume?.('padLeft', 4)) this.skip();
    }
    this.last = p.state;
    this.px = p.x; this.pz = p.z;
    this.updateMen();
  }

  // ------------------------------------------------------------ the men

  updateMen() {
    this.men = this.men.filter((f) => f.alive);
    const sparNow = this.finished || !!this.lesson?.spar;
    // the lesson that wanted a fight is over: the man who fought stands at a post again
    if (!sparNow) for (const f of this.men) if (!f.dummy) this.makeDummy(f);
    if (this.wait > 0) { this.wait--; return; }
    const standing = this.men.filter((f) => f.dummy);
    // (the man who fights back first: the lesson waits on him)
    if (sparNow && !this.men.some((f) => !f.dummy)) {
      this.bring(TUTORIAL.sparAt, false);
    } else if (standing.length < TUTORIAL.standing) {
      const free = TUTORIAL.posts.find((post) => !standing.some((f) => f.post === post));
      this.bring(free, true);
    }
  }

  // one man in from off-screen, on the side his spot is on
  bring(at, dummy) {
    const p = this.hero;
    const side = at.x >= p.x ? 1 : -1;
    const x = offscreenX(this.world, this.stage.players.filter((q) => q.alive), side);
    const f = createEnemy(this.world, TUTORIAL.type, x, at.z, { entering: true });
    f.stats = { ...f.stats, maxHealth: Math.round(f.stats.maxHealth * TUTORIAL.health) };
    f.health = f.stats.maxHealth;
    f.lootDropped = true; // (no trophies in the yard)
    f.practice = true;
    if (dummy) this.makeDummy(f, at);
    this.men.push(f);
    this.wait = TUTORIAL.respawn;
    return f;
  }

  makeDummy(f, post = null) {
    const taken = this.men.filter((m) => m !== f && m.dummy).map((m) => m.post);
    f.dummy = true;
    f.post = post ?? TUTORIAL.posts.find((q) => !taken.includes(q)) ?? TUTORIAL.posts[0];
  }
}
