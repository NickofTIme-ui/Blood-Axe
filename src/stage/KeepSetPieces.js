// KeepSetPieces.js — The Black Keep's own set pieces (level 6, data/stageKeep.js), kept
// out of Stage.js. Pure simulation: frame-timed, the world's dice, no Phaser.
//
//   THE DRUM FORMATION (a section's `formation`): the drummers on the Muster Hall balcony
//     beat the time; on every beat the shield line steps forward as one, shields locked
//     (they hold their guard between beats: a heavy breaks it, or go round the end), and
//     the men in it strike at anyone in front of them. Kill both drummers and the line
//     breaks into a brawl ('formationBroken').
//   THE RISING FIRE (a section's `rise`): the prison wing burns from the bottom. Every
//     `every` frames the fire takes the next tier up (hazards with `when: 'rise:<n>'` go
//     live), and a cell still shut on a tier the fire has taken is lost. Dying puts it back.

export class KeepSetPieces {
  constructor(stage) {
    this.stage = stage;
    this.world = stage.world;
    this.rise = { level: 0, t: 0, section: -1 };
    this.drum = { t: 0, beat: 0, broken: false, section: -1 };
    this.world.events.on('sectionStart', ({ index }) => this.sectionStart(index));
  }

  sectionStart(index) {
    // (come back to a section, after a death or from a checkpoint: it starts again)
    if (this.rise.section === index) Object.assign(this.rise, { level: 0, t: 0 });
    if (this.drum.section === index) Object.assign(this.drum, { t: 0, beat: 0, broken: false });
  }

  update() {
    const st = this.stage;
    const sec = st.section;
    if (sec?.formation) this.updateFormation(sec, st.index);
    if (sec?.rise) this.updateRise(sec, st.index);
  }

  // ------------------------------------------------------------ the drum formation

  updateFormation(sec, index) {
    const F = sec.formation;
    const D = this.drum;
    if (D.section !== index) Object.assign(D, { section: index, t: 0, beat: 0, broken: false });
    const men = this.world.fighters.filter((f) => f.team === 'enemy' && f.alive && !f.removeMe);
    const drummers = men.filter((f) => f.role === 'drummer');
    const line = men.filter((f) => f.role === 'line');
    if (!drummers.length && !line.length) return; // (not come yet)
    for (const f of drummers) if (!f.script) f.script = (brain, target) => this.drummer(f, brain, target);
    if (D.broken) return;
    if (!drummers.length) {
      D.broken = true;
      for (const f of line) { f.script = null; f.formation = null; }
      this.world.events.emit('formationBroken', { section: sec });
      return;
    }
    D.t++;
    const heroes = this.world.livingPlayers();
    if (!heroes.length) return;
    // the line's front: it starts where its men stand, and comes on a step each beat
    D.x ??= line.length ? line.reduce((s, f) => s + f.x, 0) / line.length : sec.x0;
    const dir = Math.sign(heroes.reduce((s, h) => s + h.x, 0) / heroes.length - D.x) || -1;
    let beat = false;
    if (D.t % F.beat === 0) {
      D.beat++;
      beat = true;
      // (no closer than a sword's length to the nearest hero in front: they hold there)
      const near = Math.min(...heroes.map((h) => Math.abs(h.x - D.x)));
      if (near > (F.hold ?? 90)) D.x += dir * F.step;
      this.world.events.emit('drumBeat', { section: sec, beat: D.beat, x: D.x });
    }
    line.forEach((f, k) => {
      f.formation = { x: D.x, z: F.lanes[k % F.lanes.length], dir };
      if (!f.script) f.script = (brain, target) => this.liner(f, brain, target);
      f.formationBeat = beat;
    });
  }

  // a drummer at his drum: he beats it and watches; a hero right on him and he fights
  drummer(f, brain, target) {
    if (Math.abs(target.x - f.x) < 80 && Math.abs(target.z - f.z) < 40 && Math.abs((target.floor ?? 0) - (f.floor ?? 0)) < 30) return false;
    brain.facingHint = Math.sign(target.x - f.x) || f.facing;
    return true;
  }

  // a man in the shield line: keep his place in it, shield up; on the beat, strike whoever
  // is in front of him
  liner(f, brain, target) {
    const F = f.formation;
    if (!F) return false;
    if (!['idle', 'walk', 'block'].includes(f.state)) return true; // (mid-swing, hit, down: as he is)
    brain.facingHint = F.dir;
    const dx = F.x - f.x; const dz = F.z - f.z;
    const inFront = Math.sign(target.x - f.x) === F.dir && Math.abs(target.x - f.x) < (brain.ai.attackRange ?? 70) + 20 && Math.abs(target.z - f.z) < 26;
    if (f.formationBeat && inFront) { brain.registerPress(brain.roll(77) < 0.3 ? 'heavy' : 'attack'); return true; }
    if (Math.abs(dx) > 8 || Math.abs(dz) > 6) {
      brain.moveX = Math.abs(dx) > 8 ? Math.sign(dx) : 0;
      brain.moveZ = Math.abs(dz) > 6 ? Math.sign(dz) : 0;
      return true;
    }
    brain.held.block = true; // (shields locked between beats)
    return true;
  }

  // ------------------------------------------------------------ the rising fire

  updateRise(sec, index) {
    const R = this.rise;
    const st = this.stage;
    if (R.section !== index) Object.assign(R, { section: index, level: 0, t: 0 });
    if (st.phase !== 'fight' || st.story?.holding) return;
    const tiers = sec.rise.tiers;
    if (R.level >= tiers.length) return;
    if (++R.t < sec.rise.every * (R.level + 1)) return;
    const tier = tiers[R.level];
    R.level++;
    this.world.events.emit('fireRises', { section: sec, level: R.level, tier });
    // a cell still shut on the tier the fire has taken: lost
    for (const id of tier.cells ?? []) {
      const n = st.story?.npc(id);
      if (n && n.state === 'trapped') st.story.lose(n);
    }
  }
}
