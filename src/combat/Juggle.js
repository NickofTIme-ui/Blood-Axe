// Juggle.js — AIR JUGGLES. A man knocked into the air by a hero can be kept up there:
// every hero hit on a flying (not yet landed) enemy pops him back up a little less than
// the last, and a hero who lands an air hit hangs in the air for the next one.
//
//   LAUNCHER   Rurik's J, J, K (light2 -> heavy): the RISING CLEAVE throws him straight up.
//              Jump straight out of it when it connects.
//   AIR CHAIN  in the air, attack again once an air hit has landed: up to JUGGLE.airHits
//              swings a jump. The last one is the SPIKE: it drives him into the floor,
//              where he bounces once (and can be launched again).
//   DECAY      each juggle hit lifts less (JUGGLE.decay); after maxHits he just falls.
//
// Bosses and war machines aren't juggled (they take the hit and stay on their feet, or
// fall as they always have). Pure sim logic: online co-op stays in step.

export const JUGGLE = {
  lift: 340,        // upward speed a juggle hit gives a flying man (first hit)
  decay: 0.84,      // each further hit in the same juggle lifts this much less
  maxHits: 12,      // juggle hits before he simply drops
  carry: 24,        // sideways push cap while juggled (he stays in reach)
  heroHang: 300,    // a hero who lands an air hit is held up at least this fast
  airHits: 3,       // air swings a jump, as long as each one connects
  chainFrom: 6,     // frames into an air swing before the next can be pressed (on a hit)
  spikeVh: -950,    // the spike drives him down this fast
  bounceVh: 320,    // ...and the floor throws him back up this fast, once
  spikeDamage: 1.5, // the spike hits this much harder than an air swing
};

// Can this hit juggle him? (a hero's blow on a man flying through the air)
export function juggles(attacker, def) {
  return attacker?.team === 'player' && def.team !== 'player' && !def.grounded &&
    !def.stats.boss && !def.stats.machine && !def.isDowned;
}

// Keep him up. Returns false once the juggle has run out (he falls as normal).
export function juggleHit(def, attacker, move, dir, melee) {
  const n = (def.juggles ?? 0) + 1;
  if (n > JUGGLE.maxHits) return false;
  def.juggles = n;
  const kb = move.knockback ?? { x: 0, y: 0 };
  if (move.spike) {
    def.fsm.change('knockdown', { vx: dir * Math.min(kb.x, JUGGLE.carry), vh: JUGGLE.spikeVh });
    def.spiked = true;
  } else {
    const lift = Math.max(JUGGLE.lift * JUGGLE.decay ** (n - 1), kb.y > 0 ? Math.min(kb.y, JUGGLE.lift) : 0);
    def.fsm.change('knockdown', { vx: dir * Math.min(kb.x, JUGGLE.carry), vh: Math.max(def.vh, lift) });
  }
  // the hero hangs in the air for the next swing
  if (melee && !attacker.grounded) attacker.vh = Math.max(attacker.vh, JUGGLE.heroHang);
  def.world?.events.emit('juggle', { attacker, defender: def, count: n, spike: !!move.spike });
  return true;
}

// He hit the floor out of a juggle: a spike bounces him once; anything else ends it.
export function juggleLand(f) {
  if (f.spiked && f.health > 0) {
    f.spiked = false;
    f.juggles = Math.max(f.juggles ?? 0, JUGGLE.maxHits - 4); // (a bounce re-launch is short)
    f.vh = JUGGLE.bounceVh;
    f.world?.events.emit('juggleBounce', { fighter: f });
    return true;
  }
  f.spiked = false;
  f.juggles = 0;
  return false;
}

// The air swing a hero makes: the last of the chain is the spike.
export function airMoveFor(f) {
  const base = f.stats.moves.air;
  if ((f.airChain ?? 1) < JUGGLE.airHits) return base;
  return {
    ...base, spike: true,
    damage: base.damage * JUGGLE.spikeDamage,
    hitstop: Math.max(base.hitstop ?? 4, 9), shake: Math.max(base.shake ?? 0, 6),
    knockback: { x: 60, y: 0 },
  };
}
