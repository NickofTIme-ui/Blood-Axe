// Story.js — A level's story: short lines of dialogue fired by where the heroes are and
// what just happened, and the villagers in it (the wounded, the trapped, the threatened)
// with their rescue states. Pure logic on top of the Stage (the HUD shows the lines,
// view/NpcView.js draws the villagers), timed in game frames so both online players see
// the same thing at the same moment, and the tests can drive it.
//
// BEATS (stage data `story`): { id, lines: [[who, text], ...], ...trigger }
//   at: x        fires when a hero gets this far along
//   on: key      fires on an event: 'start', 'clear:<sectionId>', 'enter:<sectionId>',
//                'boss:<sectionId>' (he appears), 'rage:<sectionId>', 'rescued:<npcId>'
//   (neither: fired by a villager's `talk` when a hero comes near him)
//   calm: true   waits until no enemy is alive (essential lines are said on safe ground)
//   hold: true   a held scene: the heroes stand still while it plays (never in a fight);
//                any hero's jump or attack moves to the next line
//   if: 'rescued:<npcId>'   only if that villager was saved (by now)
//   unless: 'rescued:<npcId>'
//   delay: frames    a pause before its first line (default LINE.gap)
// A beat fires once. Beats queue: one plays at a time.
//
// VILLAGERS (stage data `npcs`): { id, name, x, z, rescue?, ... }
//   rescue: 'defend'    threatened by the men of section `section` until its first `wave`
//                       line-ups are dead (default 1)
//           'wreckage'  trapped until the prop with this `tag` is broken
//           'reach'     trapped until a hero gets to him (a platforming route)
//   (no rescue: a survivor who only talks, `talk`: a beat id fired when a hero comes near)
//   flee: { x, z }      where he runs once free (null: he slips away out of sight)
//   gather: { x, z }    where he waits later (the gate at the end of the level)
// States: idle (a survivor), threatened / trapped -> free (says his line) -> fleeing ->
// safe (gone from here) -> gathered (at his gather point). Saved ones are reported with
// 'npcRescued' (the arena keeps them in the campaign save). Nobody's rescue fails in
// level 1, and nothing is scored: the ones saved are simply there later.

export const LINE = { base: 70, perChar: 2.4, max: 330, minSkip: 16, gap: 14 };
export const NPC = { speed: 110, reach: 44, depth: 32, height: 34, talkReach: 90, talkDepth: 260, freeFor: 50 };

export class Story {
  constructor(stage, data) {
    this.stage = stage;
    this.world = stage.world;
    this.beats = (data.story ?? []).map((b) => ({ ...b, fired: false }));
    this.npcs = (data.npcs ?? []).map((n) => ({
      ...n,
      state: n.rescue === 'defend' ? 'threatened' : n.rescue ? 'trapped' : 'idle',
      x: n.x, z: n.z, h: 0, t: 0,
    }));
    this.queue = [];
    this.current = null;  // { beat, index, age } — the line on screen
    this.done = new Set(); // beat ids that have played out
    this.rescued = new Set(stage.data.rescuedBefore ?? []);
    const ev = this.world.events;
    ev.on('sectionClear', ({ section }) => this.trigger(`clear:${section.id}`));
    ev.on('sectionStart', ({ section }) => this.trigger(`enter:${section.id}`));
    ev.on('bossRage', () => this.trigger(`rage:${stage.section?.id}`));
    ev.on('bossSpawn', () => this.trigger(`boss:${stage.section?.id}`));
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
      return k === 'rescued' ? this.isRescued(id) : k === 'done' ? this.done.has(id) : true;
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
    for (const n of this.npcs) {
      n.t++;
      if (n.state === 'idle' || n.state === 'threatened' || n.state === 'trapped') {
        n.h = T ? Math.max(0, T.groundAt(n.x, n.z)) : 0;
      }
      if (n.state === 'idle' && n.talk && !n.talked) {
        if (heroes.some((p) => Math.abs(p.x - n.x) <= NPC.talkReach && Math.abs(p.z - n.z) <= NPC.talkDepth)) {
          n.talked = true;
          const b = this.beats.find((x) => x.id === n.talk);
          if (b) b.fire = true;
        }
      }
      if (n.state === 'threatened' && this.defended(n)) this.free(n);
      else if (n.state === 'trapped') {
        if (n.rescue === 'wreckage' && st.props.some((pr) => pr.tag === n.tag && pr.broken)) this.free(n);
        else if (n.rescue === 'reach' && heroes.some((p) => p.grounded && Math.abs(p.x - n.x) <= NPC.reach
          && Math.abs(p.z - n.z) <= NPC.depth && Math.abs(p.floor - n.h) <= NPC.height)) this.free(n);
      } else if (n.state === 'free') {
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

  // A threatened villager is safe once the men round him are dead: his section's first
  // line-up(s) beaten.
  defended(n) {
    const st = this.stage;
    const si = st.sections.findIndex((s) => s.id === n.section);
    if (si < 0 || st.index < si) return false;
    if (st.index > si || (st.cleared ?? -1) >= si) return true;
    return st.waveIndex >= (n.wave ?? 1) && st.livingFoes().length === 0 && st.fightOn;
  }

  free(n) {
    n.state = 'free';
    n.t = 0;
    this.rescued.add(n.id);
    this.world.events.emit('npcRescued', { npc: n });
    this.trigger(`rescued:${n.id}`);
  }
}
