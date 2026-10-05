// Story.js — A level's story: short lines of dialogue fired by where the heroes are and
// what just happened, and the villagers in it (the wounded, the trapped, the threatened)
// with their rescue states. Pure logic on top of the Stage (the HUD shows the lines,
// view/NpcView.js draws the villagers), timed in game frames so both online players see
// the same thing at the same moment, and the tests can drive it.
//
// BEATS (stage data `story`): { id, lines: [[who, text], ...], ...trigger }
//   at: x        fires when a hero gets this far along
//   on: key      fires on an event: 'start', 'clear:<sectionId>', 'enter:<sectionId>',
//                'boss:<sectionId>' (he appears), 'rage:<sectionId>', 'rescued:<npcId>',
//                'broken:<tag>' (the last prop with that tag smashed), 'twin:<sectionId>'
//                (one of the twins down)
//   (neither: fired by a villager's `talk` when a hero comes near him)
//   calm: true   waits until no enemy is alive (essential lines are said on safe ground)
//   hold: true   a held scene: the heroes stand still while it plays (never in a fight);
//                any hero's jump or attack moves to the next line
//   if: 'rescued:<npcId>'   only if that villager was saved (by now, in this level)
//       'lost:<npcId>'      only if he was lost (an execution or an escort gone wrong)
//       'saved:<npcId>'     saved in this level or any level before (the campaign save)
//       'done:<beatId>'     only after that beat has played
//   unless: (the same keys)
//   delay: frames    a pause before its first line (default LINE.gap)
// A beat fires once. Beats queue: one plays at a time.
//
// VILLAGERS (stage data `npcs`): { id, name, x, z, rescue?, ... }
//   rescue: 'defend'    threatened by the men of section `section` until its first `wave`
//                       line-ups are dead (default 1)
//           'wreckage'  trapped until the prop with this `tag` is broken
//           'reach'     trapped until a hero gets to him (a platforming route)
//           'cage'      locked in: a hero stands at the lock (`lock`: { x, z }, default where
//                       he is) and holds INTERACT (E, D-pad up) for `hold` frames, with no
//                       enemy left standing
//           'execution' on the gallows: his section's men (its first `wave` line-ups, or with
//                       `by: 'boss'` its boss) must die before `time` frames run out, counted
//                       from the fight starting. Too slow: he's LOST (state 'lost';
//                       beats `on: 'lost:<id>'`). Rising at the checkpoint resets it.
//           'escort'    a hero walks up to him and he follows (state 'escort') until he
//                       reaches `to.x`. Enemies close to him wear his nerve down (`hp`,
//                       default NPC.nerve): he cowers and won't move; at 0 he's lost
//           'convoy'    inside a rolling prop (`tag`: the convoy's wagon, Stage.updateRolling):
//                       carried along with it; out when it's wrecked, LOST if it gets away
//   (no rescue: a survivor who only talks, `talk`: a beat id fired when a hero comes near
//    him; with `ask: true` only when a hero near him presses INTERACT)
//   flee: { x, z }      where he runs once free (null: he slips away out of sight)
//   gather: { x, z }    where he waits later (the gate at the end of the level)
//   if / unless         only there if that holds ('saved:<npcId>': someone saved in an
//                       earlier level, come back to stand with you)
// States: idle (a survivor), threatened / trapped / escort -> free (says his line) ->
// fleeing -> safe (gone from here) -> gathered (at his gather point); or lost. Saved ones
// are reported with 'npcRescued' (the arena keeps them in the campaign save), the lost with
// 'npcLost'. Nobody's rescue fails in level 1, and nothing is scored: the ones saved are
// simply there later, the lost are missing.
//
// INTERACT is the D-pad's up button (`padUp`; E on the keys). `prompts` lists what a hero
// standing near someone can do right now, for the view.

export const LINE = { base: 70, perChar: 2.4, max: 330, minSkip: 16, gap: 14 };
export const NPC = {
  speed: 110, reach: 44, depth: 32, height: 34, talkReach: 90, talkDepth: 260, freeFor: 50,
  askReach: 70, askDepth: 50,          // how near a hero must be to ask (INTERACT)
  pick: 45,                            // frames of INTERACT held to open a cage
  nerve: 100, threat: 110, threatDepth: 50, fear: 0.12, // escort: his nerve, how near a foe frightens him, the drain per foe a frame
  follow: 80, keep: 50,                // escort: he follows when this far behind, and stops this far back
};
export const INTERACT = 'padUp';

export class Story {
  constructor(stage, data) {
    this.stage = stage;
    this.world = stage.world;
    this.beats = (data.story ?? []).map((b) => ({ ...b, fired: false }));
    this.npcs = (data.npcs ?? []).map((n) => ({
      ...n,
      state: n.rescue === 'defend' || n.rescue === 'execution' ? 'threatened' : n.rescue ? 'trapped' : 'idle',
      x: n.x, z: n.z, h: 0, t: 0, home: { x: n.x, z: n.z }, clock: 0, pick: 0, nerve: n.hp ?? NPC.nerve,
    }));
    this.prompts = [];
    this.queue = [];
    this.current = null;  // { beat, index, age } — the line on screen
    this.done = new Set(); // beat ids that have played out
    this.rescued = new Set(stage.opts?.rescued ?? stage.data.rescuedBefore ?? []);
    this.lost = new Set(stage.opts?.lost ?? []);
    this.savedBefore = new Set(stage.opts?.saved ?? []); // (every level's, from the campaign save)
    // (a villager with `if` / `unless` is only there if that holds: the rescued who come back)
    this.npcs = this.npcs.filter((n) => !(n.if || n.unless) || this.ok(n));
    const ev = this.world.events;
    ev.on('sectionClear', ({ section }) => this.trigger(`clear:${section.id}`));
    ev.on('sectionStart', ({ section }) => this.trigger(`enter:${section.id}`));
    ev.on('bossRage', () => this.trigger(`rage:${stage.section?.id}`));
    ev.on('bossSpawn', () => this.trigger(`boss:${stage.section?.id}`));
    ev.on('bossPhase', ({ phase }) => this.trigger(`phase:${stage.section?.id}:${phase.id}`));
    ev.on('propsDown', ({ tag }) => this.trigger(`broken:${tag}`));
    ev.on('twinFall', () => this.trigger(`twin:${stage.section?.id}`));
  }

  // ------------------------------------------------------------ queries

  get busy() { return !!this.current || this.queue.length > 0; }
  get holding() { return !!this.current?.beat.hold; }
  // The line on screen: { who, text, beat, index, of } (null: none)
  get line() {
    const c = this.current;
    if (!c || c.age < 0) return null;
    const [who, text] = c.beat.lines[c.index];
    return { who, text, beat: c.beat.id, index: c.index, of: c.beat.lines.length, hold: !!c.beat.hold, age: c.age };
  }

  npc(id) { return this.npcs.find((n) => n.id === id); }
  isRescued(id) { return this.rescued.has(id); }

  frames(text) { return Math.min(LINE.max, Math.round(LINE.base + text.length * LINE.perChar)); }

  // ------------------------------------------------------------ firing beats

  ok(b) {
    const cond = (c) => {
      const [k, id] = c.split(':');
      return k === 'rescued' ? this.isRescued(id) : k === 'lost' ? this.lost.has(id)
        : k === 'saved' ? this.isRescued(id) || this.savedBefore.has(id) : k === 'done' ? this.done.has(id) : true;
    };
    if (b.if && !cond(b.if)) return false;
    if (b.unless && cond(b.unless)) return false;
    return true;
  }

  fire(b) {
    if (b.fired) return;
    b.fired = true;
    if (!this.ok(b)) { this.done.add(b.id); return; }
    this.queue.push(b);
  }

  trigger(key) {
    for (const b of this.beats) if (b.on === key) b.fire = true; // (fired on the next tick, with its calm check)
  }

  // Fire one beat by its id (a sequence's scene: stage/Sequence.js).
  cue(id) {
    const b = this.beats.find((x) => x.id === id);
    if (b) b.fire = true;
  }

  // ------------------------------------------------------------ per frame

  update() {
    const st = this.stage;
    const heroes = st.players.filter((p) => p.alive);
    const calm = st.livingFoes().length === 0;
    if (!this.started) { this.started = true; this.trigger('start'); }

    for (const b of this.beats) {
      if (b.fired) continue;
      const due = b.fire || (b.at != null && heroes.some((p) => p.x >= b.at));
      if (due && (!b.calm || calm)) this.fire(b);
    }
    this.updateNpcs(heroes);
    this.play(heroes);
  }

  play(heroes) {
    let c = this.current;
    if (!c) {
      const b = this.queue.shift();
      if (!b) return;
      c = this.current = { beat: b, index: 0, age: -(b.delay ?? LINE.gap) };
      this.world.events.emit('storyBeat', { beat: b });
    }
    c.age++;
    if (c.beat.hold) {
      // a held scene: everyone stands still and listens
      for (const p of this.stage.players) if (p.alive) { p.awe = Math.max(p.awe ?? 0, 2); p.vx = p.vz = 0; }
    }
    if (c.age < 0) return;
    const [, text] = c.beat.lines[c.index];
    let next = c.age >= this.frames(text);
    if (c.beat.hold && c.age >= LINE.minSkip) {
      for (const p of heroes) if (p.controller.consume('jump', 4) || p.controller.consume('attack', 4)) next = true;
    }
    if (!next) return;
    c.index++;
    c.age = 0;
    if (c.index < c.beat.lines.length) return;
    // the beat is over
    this.done.add(c.beat.id);
    this.current = null;
    if (c.beat.hold) {
      // (what was pressed to skip the last line doesn't carry into the fight)
      for (const p of this.stage.players) { p.awe = 0; for (const a of ['jump', 'attack']) p.controller.consume(a, 99); }
    }
    this.world.events.emit('storyBeatDone', { beat: c.beat });
  }

  // Skip the held scene playing now, whole (its outcome is the same as watching it).
  skipScene() {
    const c = this.current;
    if (!c?.beat.hold) return;
    c.index = c.beat.lines.length - 1;
    c.age = this.frames(c.beat.lines[c.index][1]);
  }

  // ------------------------------------------------------------ villagers

  updateNpcs(heroes) {
    const st = this.stage;
    const T = st.terrain;
    this.prompts = [];
    for (const n of this.npcs) {
      n.t++;
      if (n.state === 'idle' || n.state === 'threatened' || n.state === 'trapped') {
        n.h = T ? Math.max(0, T.groundAt(n.x, n.z)) : 0;
      }
      if (n.state === 'idle' && n.talk && !n.talked) this.updateTalk(n, heroes);
      if (n.state === 'threatened') {
        if (n.rescue === 'execution') this.updateExecution(n);
        else if (this.defended(n)) this.free(n);
      } else if (n.state === 'trapped') {
        if (n.rescue === 'wreckage' && st.props.some((pr) => pr.tag === n.tag && pr.broken)) this.free(n);
        else if (n.rescue === 'reach' && heroes.some((p) => p.grounded && Math.abs(p.x - n.x) <= NPC.reach
          && Math.abs(p.z - n.z) <= NPC.depth && Math.abs(p.floor - n.h) <= NPC.height)) this.free(n);
        else if (n.rescue === 'cage') this.pickLock(n, heroes);
        else if (n.rescue === 'convoy') {
          // inside the wagon: they go where it goes; out when it's wrecked, gone if it escapes
          const pr = st.props.find((q) => q.tag === n.tag);
          if (pr?.broken) this.free(n);
          else if (pr?.escaped) this.lose(n);
          else if (pr) n.x = pr.x;
        }
        else if (n.rescue === 'escort' && heroes.some((p) => Math.abs(p.x - n.x) <= NPC.askReach && Math.abs(p.z - n.z) <= NPC.askDepth)) {
          n.state = 'escort'; n.t = 0;
          this.world.events.emit('npcFollow', { npc: n });
          this.trigger(`follow:${n.id}`);
        }
      } else if (n.state === 'escort') this.updateEscort(n, heroes);
      else if (n.state === 'free') {
        if (n.t >= NPC.freeFor) { n.state = n.flee ? 'fleeing' : 'safe'; n.t = 0; }
      } else if (n.state === 'fleeing') {
        const dx = n.flee.x - n.x; const dz = (n.flee.z ?? n.z) - n.z;
        const d = Math.hypot(dx, dz);
        const step = NPC.speed / 60;
        if (d <= step) { n.state = 'safe'; n.t = 0; } else { n.x += (dx / d) * step; n.z += (dz / d) * step; n.dir = Math.sign(dx) || n.dir; }
        n.h = T ? Math.max(0, T.groundAt(n.x, n.z)) : 0;
      }
      if (n.state === 'safe' && n.gather) {
        n.state = 'gathered'; n.x = n.gather.x; n.z = n.gather.z;
        n.h = T ? Math.max(0, T.groundAt(n.x, n.z)) : 0;
      }
    }
  }

  // A survivor with something to say: he says it when a hero comes near (or, `ask`, when
  // a hero near him presses INTERACT).
  updateTalk(n, heroes) {
    const R = n.ask ? [NPC.askReach, NPC.askDepth] : [NPC.talkReach, NPC.talkDepth];
    const p = heroes.find((q) => Math.abs(q.x - n.x) <= R[0] && Math.abs(q.z - n.z) <= R[1]);
    if (!p) return;
    if (n.ask) {
      this.prompts.push({ npc: n, kind: 'talk', hero: p });
      if (!p.controller.consume(INTERACT, 6)) return;
    }
    n.talked = true;
    const b = this.beats.find((x) => x.id === n.talk);
    if (b) b.fire = true;
  }

  // The section a villager belongs to (named, or the one he stands in).
  sectionOf(n) {
    const S = this.stage.sections;
    return n.section != null ? S.findIndex((s) => s.id === n.section) : S.findIndex((s) => n.home.x >= s.x0 && n.home.x < s.x1);
  }

  // A threatened villager is safe once the men round him are dead: his section's first
  // line-up(s) beaten.
  defended(n) {
    const st = this.stage;
    const si = this.sectionOf(n);
    if (si < 0 || st.index < si) return false;
    if (st.index > si || (st.cleared ?? -1) >= si) return true;
    return st.waveIndex >= (n.wave ?? 1) && st.livingFoes().length === 0 && st.fightOn;
  }

  // The gallows: the rope's time runs from the fight starting; the hangman (his section's
  // first line-ups, or its boss) dead in time and he's cut down, too late and he's lost.
  updateExecution(n) {
    const st = this.stage;
    const si = this.sectionOf(n);
    if (si < 0 || st.index < si) return;
    const saved = n.by === 'boss'
      ? st.index > si || (st.cleared ?? -1) >= si || (st.index === si && st.bossSpawned && !st.boss?.alive)
      : this.defended(n);
    if (saved) { this.free(n); return; }
    if (!st.fightOn || st.index !== si) return;
    n.clock++;
    if (n.clock >= (n.time ?? 900)) this.lose(n);
  }

  // A cage: a hero at its lock holds INTERACT (once nobody is left fighting) until it opens.
  pickLock(n, heroes) {
    const L = n.lock ?? n.home;
    const p = heroes.find((q) => q.grounded && Math.abs(q.x - L.x) <= NPC.reach && Math.abs(q.z - L.z) <= NPC.depth + 10
      && Math.abs(q.floor - n.h) <= NPC.height);
    if (!p) return;
    const calm = this.stage.livingFoes().length === 0;
    this.prompts.push({ npc: n, kind: calm ? 'open' : 'busy', hero: p, at: L, progress: n.pick / (n.hold ?? NPC.pick) });
    if (!calm || !p.controller.isDown(INTERACT)) return;
    n.pick++;
    if (n.pick === 1) this.world.events.emit('lockPick', { npc: n, by: p });
    if (n.pick >= (n.hold ?? NPC.pick)) this.free(n);
  }

  // An escort: he keeps close behind the nearest hero, cowering (and losing his nerve)
  // while enemies are near him; he's safe at `to.x`.
  updateEscort(n, heroes) {
    const st = this.stage;
    const T = st.terrain;
    const near = st.livingFoes().filter((f) => Math.abs(f.x - n.x) <= NPC.threat && Math.abs(f.z - n.z) <= NPC.threatDepth).length;
    n.cower = near > 0;
    if (n.cower) {
      n.nerve -= NPC.fear * near;
      if (n.nerve <= 0) { n.nerve = 0; this.lose(n); }
      return;
    }
    if (n.to && n.x >= n.to.x) { this.free(n); return; }
    const lead = heroes.reduce((a, p) => (!a || Math.abs(p.x - n.x) < Math.abs(a.x - n.x) ? p : a), null);
    if (!lead) return;
    const tx = lead.x - Math.sign(lead.x - n.x || 1) * NPC.keep;
    const dx = tx - n.x; const dz = lead.z - n.z;
    if (Math.abs(lead.x - n.x) < NPC.follow && Math.abs(dz) < NPC.depth) { n.moving = false; return; }
    const d = Math.hypot(dx, dz) || 1;
    const step = NPC.speed / 60;
    const nx = n.x + (dx / d) * step; const nz = n.z + (dz / d) * step;
    // (he walks; he doesn't jump: never into a pit or up a ledge. Blocked, he looks along
    // the lane for the way across — a bridge, a log — and heads for that)
    const ok = (x, z) => !T || (T.safeAt(x, z) && Math.abs(T.groundAt(x, z) - n.h) <= 30);
    let to = ok(nx, nz) ? [nx, nz] : null;
    if (!to) {
      const sx = n.x + Math.sign(dx || 1) * 24;
      for (let k = 0; k <= 240 && !to; k += 8) {
        for (const z of [n.z - k, n.z + k]) {
          if (z < 290 || z > 515 || !ok(sx, z)) continue;
          to = k === 0 ? [n.x + Math.sign(dx) * step, n.z] : [n.x, n.z + Math.sign(z - n.z) * step];
          break;
        }
      }
    }
    if (!to || !ok(to[0], to[1])) { n.moving = false; return; }
    n.x = to[0]; n.z = to[1]; n.h = Math.max(0, T ? T.groundAt(n.x, n.z) : 0); n.dir = Math.sign(dx) || n.dir; n.moving = true;
  }

  lose(n) {
    n.state = 'lost';
    n.t = 0;
    this.lost.add(n.id);
    this.world.events.emit('npcLost', { npc: n });
    this.trigger(`lost:${n.id}`);
  }

  // ------------------------------------------------------------ checkpoints

  // Starting a level at a later section (a saved checkpoint): what came before has happened.
  // Beats from earlier sections are spent; villagers there are safe if the save says they
  // were saved, otherwise gone.
  skipTo(k) {
    if (k <= 0) return;
    const S = this.stage.sections;
    const x0 = S[k].x0;
    const early = new Set(S.slice(0, k).map((s) => s.id));
    const earlyNpc = new Set(this.npcs.filter((n) => { const i = this.sectionOf(n); return i >= 0 && i < k; }).map((n) => n.id));
    for (const b of this.beats) {
      const [kind, id] = (b.on ?? '').split(':');
      const spent = b.on === 'start' || (b.at != null && b.at < x0)
        || (['clear', 'enter', 'boss', 'rage', 'phase'].includes(kind) && early.has(id))
        || (['rescued', 'lost', 'follow'].includes(kind) && earlyNpc.has(id))
        || this.npcs.some((n) => n.talk === b.id && earlyNpc.has(n.id));
      if (spent) { b.fired = true; this.done.add(b.id); }
    }
    this.started = true;
    for (const n of this.npcs) {
      if (!earlyNpc.has(n.id)) continue;
      n.talked = true;
      if (this.rescued.has(n.id)) n.state = 'safe'; // (and on to his gather point, if he has one)
      else if (n.rescue) n.state = 'gone';
    }
  }

  // Rising at a checkpoint: the section's fight starts again, and with it a captive's rope
  // or an escort (put back as they were when you came in).
  resetSection(k) {
    for (const n of this.npcs) {
      if (this.sectionOf(n) !== k || this.rescued.has(n.id)) continue;
      if (!['execution', 'escort', 'convoy'].includes(n.rescue)) continue;
      this.lost.delete(n.id);
      n.state = n.rescue === 'execution' ? 'threatened' : 'trapped';
      n.x = n.home.x; n.z = n.home.z; n.clock = 0; n.nerve = n.hp ?? NPC.nerve; n.cower = false; n.t = 0;
      for (const b of this.beats) if (b.on === `lost:${n.id}` || b.on === `follow:${n.id}`) { b.fired = false; b.fire = false; this.done.delete(b.id); }
    }
  }

  free(n) {
    n.state = 'free';
    n.t = 0;
    this.rescued.add(n.id);
    this.world.events.emit('npcRescued', { npc: n });
    this.trigger(`rescued:${n.id}`);
  }
}
