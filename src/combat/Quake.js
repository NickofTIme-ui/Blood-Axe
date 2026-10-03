// Quake.js — Ground shockwaves: a boss's slam splits the floor and a wave of broken
// stone rolls out from it, both ways, across the whole depth of the lane. Pure logic on
// the World (effects/QuakeFX.js draws it from the events), so the tests can drive it.
//
// The wave can't be blocked, parried or side-stepped: the only way past it is OVER it.
// Anyone on the other team with their feet below `clear` when the front reaches them is
// knocked flat; a hero in the air lets it roll under him.
//
// A move asks for one with `shockwave: { ... }` (data/enemies.js); fighterStates.js
// calls slam() on the move's first active frame.
//
// Events: quakeSlam { owner, x, z, move }   quakeWave { wave }   quakeHit { wave, fighter }
//         quakeEnd { wave }

export class Quakes {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.nextId = 1;
  }

  clear() {
    for (const w of this.list) this.world.events.emit('quakeEnd', { wave: w });
    this.list = [];
  }

  // The glaive hits the floor at the end of his reach: one wave out each side.
  slam(owner, move) {
    const cfg = move.shockwave;
    const b = this.world.bounds;
    const reach = (move.hitbox.x + move.hitbox.w) * 0.8;
    const x = Math.max(b.minX, Math.min(b.maxX, owner.x + owner.facing * reach));
    this.world.events.emit('quakeSlam', { owner, x, z: owner.z, move });
    // one blow per man: the slam's own list, so the wave passes by whoever the glaive hit
    // (and a man the wave hits isn't hit by the glaive too), and both waves share it
    const hitList = owner.attackInfo?.hitList ?? new Set();
    for (const dir of [-1, 1]) {
      const wave = { id: this.nextId++, owner, team: owner.team, cfg, x, x0: x, z: owner.z, dir, t: 0, hitList, done: false };
      this.list.push(wave);
      this.world.events.emit('quakeWave', { wave });
    }
  }

  update() {
    const w = this.world;
    const b = w.bounds;
    for (const wave of this.list) {
      const K = wave.cfg;
      wave.t++;
      wave.x += wave.dir * K.speed / 60;
      if (Math.abs(wave.x - wave.x0) >= K.range || wave.x < b.minX - 20 || wave.x > b.maxX + 20) {
        wave.done = true;
        w.events.emit('quakeEnd', { wave });
        continue;
      }
      for (const f of w.fighters) {
        if (f.team === wave.team || !f.alive || f.removeMe || f.invincible || wave.hitList.has(f.id)) continue;
        if (f.h > K.clear) continue;                      // jumped it
        if (f.isDowned || f.state === 'executed') continue; // already on the floor
        if (Math.abs(f.x - wave.x) > f.stats.body.w / 2 + K.width / 2) continue;
        wave.hitList.add(f.id);
        const move = {
          cut: 'blunt', noBlood: true, unblockable: true, fx: 'quake',
          damage: K.damage, hitstun: 30, hitstop: 5, shake: 4,
          knockback: { x: K.launch, y: K.lift }, knockdown: true,
        };
        w.combat.resolve(wave.owner, f, move, {
          kind: 'quake', fromX: wave.x - wave.dir * 10, dir: wave.dir,
          contact: { x: f.x, h: f.h + 10 },
        });
        w.events.emit('quakeHit', { wave, fighter: f });
      }
    }
    this.list = this.list.filter((q) => !q.done);
  }
}
