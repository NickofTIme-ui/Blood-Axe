// Sequence.js — A scripted ending that must play once, whole, whatever happens: the
// framework for Rurik's judgment of the king (docs/campaign/plan.md, "Rurik's judgment").
// Pure logic on top of the Stage (the views and the arena listen to its events), timed in
// game frames so both online machines play it on the same tick.
//
// Stage data `sequence`:
//   id        the flags' prefix in the campaign save ('judgment')
//   section   the section whose boss it ends (he is never killed there: `spare`, his
//             health stops at 1 and that is his defeat)
//   place     { boss: { x, z, facing }, heroes: [{ x, z, facing }, ...] }  where everyone
//             stands for the scene (hero 0 is the one who steps forward)
//   beat      the story beat played (a held scene: stage/Story.js; skippable line by line,
//             or whole with story.skipScene()). Not `calm`: the beaten king still counts
//             as a man standing
//   reward    a key for the reward, given once (the arena claims it)
//   then      where the game goes after ('epilogue'); reported with sequenceDone
//
// STEPS: wait -> clear -> place -> play -> award -> done
//   wait    the fight runs; his defeat is detected ONCE (flag `<id>:down`, saved at once)
//   clear   the fighting stops: his men, the projectiles, mines, walls and hazards are
//           cleared; he can't be hurt and doesn't move; fallen heroes rise
//   place   everyone is put where the scene needs them
//   play    the scene (beat) plays to its end
//   award   flag `<id>:awarded` (once) and sequenceAward { reward }
//   done    sequenceDone { then }; the stage is won
// RELOAD SAFETY: started with `<id>:down` already saved, it begins at `clear` (the beaten
// king is put back on his knees, no fight); with `<id>:awarded` saved it goes straight to
// `done`. Skipping the scene changes nothing but the time it takes.
//
// Events: sequenceStep { id, step }, campaignFlag { key } (the arena saves it),
//         sequenceAward { id, reward }, sequenceDone { id, then }.

import { Controller } from '../core/Controller.js';

export class Sequence {
  constructor(stage, def, flags = {}) {
    this.stage = stage;
    this.world = stage.world;
    this.def = def;
    this.flags = flags;
    this.step = 'wait';
    this.si = stage.sections.findIndex((s) => s.id === def.section);
  }

  get running() { return this.step !== 'wait'; }
  flag(name) { return !!this.flags[`${this.def.id}:${name}`]; }

  setFlag(name) {
    const key = `${this.def.id}:${name}`;
    if (this.flags[key]) return false;
    this.flags[key] = true;
    this.world.events.emit('campaignFlag', { key });
    return true;
  }

  go(step) {
    this.step = step;
    this.t = 0;
    this.world.events.emit('sequenceStep', { id: this.def.id, step });
  }

  // Called when the stage starts: a reload after his defeat picks up where it was.
  resume() {
    if (this.flag('awarded')) { this.go('done'); return; }
    if (!this.flag('down') || this.stage.index !== this.si) return;
    // (he was beaten before the reload: no second fight)
    this.stage.spawnBoss();
    this.stage.boss.spare = true;
    this.go('clear');
  }

  // Runs every frame. Returns true while it has the stage (the fight logic stands aside).
  update() {
    const st = this.stage;
    if (this.step === 'wait') {
      const b = st.boss;
      if (st.index !== this.si || !b) return false;
      b.spare = true;
      if (b.health > 1) return false;
      this.setFlag('down');
      this.go('clear');
    }
    this.t++;
    if (this.step === 'clear') this.clear();
    else if (this.step === 'place') this.place();
    else if (this.step === 'play') {
      this.hold();
      if (this.t === 1) st.story?.cue(this.def.beat);
      const said = !this.def.beat || !st.story || st.story.done.has(this.def.beat);
      if (said && !st.story?.busy) this.go('award');
    } else if (this.step === 'award') {
      if (this.setFlag('awarded')) this.world.events.emit('sequenceAward', { id: this.def.id, reward: this.def.reward });
      this.go('done');
    } else if (this.step === 'done') {
      if (!this.reported) {
        this.reported = true;
        this.world.events.emit('sequenceDone', { id: this.def.id, then: this.def.then });
        st.win();
      }
    }
    return true;
  }

  // Stop the fighting, everywhere, at once.
  clear() {
    const st = this.stage;
    const W = this.world;
    const b = st.boss;
    for (const f of W.fighters) if (f.team === 'enemy' && f !== b) f.removeMe = true;
    for (const p of W.projectiles) p.alive = false;
    W.barriers?.clear();
    W.mines?.clear();
    st.hazardsOff = true;
    st.challenge = null;
    st.phase = 'sequence';
    if (b) {
      b.spare = true;
      b.defeated = true; // (the view: on his knees)
      b.invincible = true;
      b.entering = false;
      b.unbounded = false;
      b.controller = new Controller(); // (no more thinking: he's beaten)
      b.vx = b.vz = 0;
      b.health = Math.max(1, Math.min(b.health, 1));
      b.fsm.change('idle');
    }
    for (const p of st.players) {
      if (!p.alive) st.restore(p, 0.5);
      p.vx = p.vz = p.vh = 0;
      if (p.state !== 'idle') p.fsm.change('idle');
    }
    this.go('place');
  }

  place() {
    const st = this.stage;
    const P = this.def.place ?? {};
    const b = st.boss;
    if (b && P.boss) {
      b.x = P.boss.x; b.z = P.boss.z;
      st.placeOnGround(b);
      if (P.boss.facing) b.facing = P.boss.facing;
    }
    st.players.forEach((p, i) => {
      const at = P.heroes?.[i];
      if (!at) return;
      p.x = at.x; p.z = at.z;
      st.placeOnGround(p);
      if (at.facing) p.facing = at.facing;
    });
    this.hold();
    this.go('play');
  }

  // everyone stands still while it plays
  hold() {
    for (const p of this.stage.players) { p.awe = Math.max(p.awe ?? 0, 2); p.vx = p.vz = 0; }
  }
}
