// Finisher.js — Executions of enemies who've lost the will to fight (lost an arm and
// are running). Pure logic: who can be finished, and each finisher's timeline. The
// 'execute' / 'executed' states (entities/fighterStates.js) play the timeline; the
// views and ArenaScene turn its beats into poses, gore, slow motion and camera.
//
// Come up behind a runner (he always faces away from you) and:
//   tap attack   THROAT   grab him, hand over his mouth, open his throat, let him drop
//   hold attack  IMPALE   run him through from behind, lift him on the blade, boot him off
//   heavy        HALVE    one horizontal cut through the waist; the top half sits there on
//                         its own legs for a beat (dark comedy), then gets punted off them
//                         and goes flying into whoever's in the way
//   kick         SLASH    one passing cut that takes him in half (the chain, for one man)
// Two or more runners in reach: any of those becomes the CHAIN — dash, cut, spin 360
// into the next, cut, lunge, cut.

export const FINISH = {
  reach: 110,      // px behind him you can start it from
  depth: 28,       // depth (z) tolerance
  chainReach: 320, // how far the chain will dash to the next runner
  chainDepth: 80,
  chainMax: 3,
  holdFrames: 12,  // attack still held this long into the grab = impale instead
};

// Timelines in game frames (60/s). `gap` = where Ulric stands behind him (px).
// Beats are the moments things happen; the views and effects hang off them.
export const FINISHERS = {
  throat: { total: 74, approach: 8, gap: 20, beats: [{ at: 24, type: 'slit' }, { at: 52, type: 'drop' }] },
  // three beats (Nick, 2026-10-25): he's FLEEING — BOOM, run through the back — lifted on
  // the blade, feet dangling — BOOM, booted off it. coil → THRUST (18) → hit-stop → HEAVE
  // (snaps up with the painted pose) → hang there kicking, then limp → knee up → KICK (78)
  impale: { total: 112, approach: 10, gap: 76, beats: [{ at: 18, type: 'stab' }, { at: 30, type: 'raised' }, { at: 78, type: 'kick' }] },
  halve: { total: 98, approach: 8, gap: 46, beats: [{ at: 14, type: 'sever' }, { at: 56, type: 'boot' }] },
};
// Impale: once the blade is in, the victim is LOCKED to it — his body goes wherever this
// point on the sword goes. [frame, px ahead of Ulric, px above the ground], matched to the
// drawn poses (ulric_finimpale): level thrust (pose 2), the heave (pose 3, where he's held:
// at that height his dangling legs hang where the boot of the kick lands). He slides down
// the blade until `chamber`, Ulric rocks back to load the kick, and at `kick` the boot
// sends him off it.
export const IMPALE = {
  stab: 18, liftFrom: 26, raised: 38, chamber: 72, kick: 78,
  hitstop: 6,  // frames frozen with the blade in him (~100 ms)
  kickstop: 5, // ...and on the boot (~83 ms)
  // his weight drags him down the steel toward the crossguard while he hangs there —
  // into the boot's reach: how far along the blade (hilt 0 .. point 1) he's stuck
  slide: [0.52, 0.26],
  pin: [[18, 76, 72], [26, 76, 72], [38, 54, 137], [72, 42, 125], [78, 42, 125]],
};
const smooth = (t) => t * t * (3 - 2 * t);
export function impalePin(frame) {
  const K = IMPALE.pin;
  if (frame <= K[0][0]) return { x: K[0][1], y: K[0][2] };
  for (let i = 1; i < K.length; i++) {
    if (frame <= K[i][0]) {
      const [t0, x0, y0] = K[i - 1];
      const [t1, x1, y1] = K[i];
      const t = smooth((frame - t0) / (t1 - t0));
      return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
    }
  }
  const L = K[K.length - 1];
  return { x: L[1], y: L[2] };
}
// Where along the blade he's stuck at this frame of the impale (see IMPALE.slide).
export function impaleSlide(frame) {
  const [a, b] = IMPALE.slide;
  const t = Math.max(0, Math.min(1, (frame - IMPALE.raised) / (IMPALE.chamber - IMPALE.raised)));
  return a + (b - a) * smooth(t);
}

// How high on HIS body the blade goes through (px above his feet): chest-high on a man,
// lower on a giant — the sword is where Ulric's arms are.
export function impalePierce(v) {
  return Math.min(v.stats.body.h * 0.74, IMPALE.pin[0][2]);
}

// Chain: per victim a dash then the cut; a 360 spin carries into the next.
// One continuous run of swordplay through 1, 2 or 3 runners — never a beat for a man
// who isn't there:
//   dash in, CUT 1 → (2+ runners) a full-body spin that carries him to the next → CUT 2
//   → (3 runners) the follow-through becomes a lunge → CUT 3.
// The last cut is always the big flat finishing stroke; before it come a falling
// diagonal and its answering rising diagonal. `split` frames after the blade connects
// (and after the hit-stop) the body comes apart — never before the blade has crossed.
export const CHAIN = {
  dash: 9, spin: 18, lunge: 12, flow: 3, recovery: 32, gap: 42,
  split: 2,                       // frames from contact to the body separating
  hitstop: 3, hitstopLast: 5,     // ~50 ms a cut; ~83 ms on the last of three
  styles: { 1: ['finish'], 2: ['down', 'finish'], 3: ['down', 'up', 'finish'] },
  // cut name (effects/SpriteCut.js) for each style
  cut: { down: 'diagDown', up: 'diagUp', finish: 'waist' },
};

// A runner who can be executed right now.
export function isFinishable(e) {
  return e.team === 'enemy' && e.alive && !e.stats.noFinisher && !!e.controller?.scared && e.grounded &&
    ['idle', 'walk', 'hitstun'].includes(e.state);
}

// Runners close behind the player, nearest first. "Behind" = he's facing away from you.
// (A hero's kit can reach further: the Mage takes them from a distance.)
export function finisherTargets(p, fighters) {
  const reach = p.stats.kit?.finisher?.reach ?? FINISH.reach;
  const depth = p.stats.kit?.finisher?.depth ?? FINISH.depth;
  return fighters
    .filter((e) => isFinishable(e) &&
      Math.abs(e.x - p.x) <= reach && Math.abs(e.z - p.z) <= depth &&
      (Math.sign(e.x - p.x) || e.facing) === e.facing)
    .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
}

// Which finisher a button press starts, or null. button: 'attack' | 'heavy'.
// { kind: 'pending' | 'halve' | 'chain', targets: [...] } — 'pending' becomes throat or
// impale once the grab knows whether attack was tapped or held.
export function planFinisher(p, fighters, button) {
  if (p.team !== 'player') return null;
  const first = finisherTargets(p, fighters)[0];
  if (!first) return null;
  // chain: the nearest other runners within dashing reach, in the order you'd meet them
  const others = fighters
    .filter((e) => e !== first && isFinishable(e) &&
      Math.abs(e.x - first.x) <= FINISH.chainReach && Math.abs(e.z - first.z) <= FINISH.chainDepth)
    .sort((a, b) => Math.hypot(a.x - first.x, a.z - first.z) - Math.hypot(b.x - first.x, b.z - first.z))
    .slice(0, FINISH.chainMax - 1);
  // the Mage: his own three, each for one to three runners (combat/Mage.js)
  //   attack = STORM JUDGMENT, heavy = ARCANE RUPTURE, kick = GATE OF EMBERS
  if (p.stats.archetype === 'mage') {
    return { kind: { attack: 'storm', heavy: 'rupture', kick: 'embers' }[button] ?? 'storm', targets: [first, ...others] };
  }
  // the Rogue (combat/Rogue.js): attack = PHANTOM REQUIEM, heavy = BLACK LOTUS, kick = SCARLET SKY
  if (p.stats.archetype === 'rogue') {
    return { kind: { attack: 'phantom', heavy: 'lotus', kick: 'scarlet' }[button] ?? 'phantom', targets: [first, ...others] };
  }
  // kick behind a lone runner: the same swordplay for one — a single passing cut
  if (others.length || button === 'kick') return { kind: 'chain', targets: [first, ...others] };
  return { kind: button === 'heavy' ? 'halve' : 'pending', targets: [first] };
}

// Chain timeline for n runners: when the move toward victim i starts, when the blade
// connects with him, the spin's window (null without a second man), and the total.
export function chainTimes(n) {
  const starts = [0];
  const cuts = [CHAIN.dash];
  for (let i = 1; i < n; i++) {
    starts.push(cuts[i - 1] + CHAIN.flow);
    cuts.push(starts[i] + (i === 1 ? CHAIN.spin : CHAIN.lunge));
  }
  return {
    starts, cuts,
    styles: CHAIN.styles[n] ?? CHAIN.styles[3],
    spin: n > 1 ? [starts[1], cuts[1] - 4] : null,
    total: cuts[n - 1] + CHAIN.recovery,
  };
}
