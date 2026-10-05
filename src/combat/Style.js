// Style.js — THE COMBO COUNTER AND STYLE RANK. Every hero keeps a running combo (hits
// landed without a long gap) and a style score that climbs with how the fight is fought:
// mixing your moves, juggling, spiking, countering, parrying, killing. The score sets a
// RANK from D up to SSS, and the rank multiplies the blood (experience) every kill pays
// (scenes/ArenaScene.js reads styleMult). Getting hit costs most of it; standing about
// lets it drain.
//
// Sim-side (it hangs off the world's events and ticks with it): the same in both games
// of an online co-op, and testable without a browser. The HUD only reads f.style.

export const STYLE = {
  window: 110,          // frames a combo survives without a hit
  drain: 0.2,           // score lost a frame while the combo is alive...
  drainIdle: 1.6,       // ...and once it has run out
  hitTaken: 0.4,        // a blow taken keeps this share of the score (and ends the combo)
  cap: 1100,
  points: {
    hit: 10,            // any clean hit
    fresh: 8,           // a move other than the last two you used
    stale: -6,          // the same move three times running
    juggle: 12,         // a hit on a man in the air (more for a longer juggle)
    spike: 30,          // the last air swing, driving him into the floor
    crit: 10, counter: 14, superCrit: 40, multi: 6, // (multi: each extra body one swing cuts)
    kill: 22, parry: 45, guardBreak: 18, riposte: 35,
  },
  // rank: the score it starts at, its letter, the word under it, the blood it pays
  ranks: [
    { at: 0,   letter: 'D',   word: 'Dull',      blood: 1.0 },
    { at: 60,  letter: 'C',   word: 'Crude',     blood: 1.1 },
    { at: 140, letter: 'B',   word: 'Brutal',    blood: 1.25 },
    { at: 250, letter: 'A',   word: 'Savage',    blood: 1.4 },
    { at: 400, letter: 'S',   word: 'Slaughter', blood: 1.6 },
    { at: 580, letter: 'SS',  word: 'Carnage',   blood: 1.8 },
    { at: 800, letter: 'SSS', word: 'BLOOD AXE', blood: 2.0 },
  ],
};

export const freshStyle = () => ({ hits: 0, timer: 0, score: 0, rank: 0, best: 0, moves: [], peak: 0 });

export function rankFor(score) {
  let r = 0;
  for (let i = 0; i < STYLE.ranks.length; i++) if (score >= STYLE.ranks[i].at) r = i;
  return r;
}

// The blood multiplier a hero's rank pays right now.
export function styleMult(f) {
  return f?.style ? STYLE.ranks[f.style.rank].blood : 1;
}

// A hero's points for something stylish.
function gain(world, f, pts) {
  const s = f.style;
  s.score = Math.max(0, Math.min(STYLE.cap, s.score + pts));
  const r = rankFor(s.score);
  if (r > s.rank) world.events.emit('styleRank', { fighter: f, rank: r, ...STYLE.ranks[r] });
  s.rank = r;
  s.peak = Math.max(s.peak, r);
}

// Hook the tracker onto a world (World's constructor calls this).
export function installStyle(world) {
  const ev = world.events;
  const hero = (f) => f && f.team === 'player' && f.style;
  ev.on('fighterAdded', (f) => { if (f.team === 'player') f.style = freshStyle(); });

  ev.on('hit', (e) => {
    const a = e.attacker, d = e.defender;
    // a blow taken: the combo ends and most of the style goes with it
    if (hero(d) && e.damage > 0) {
      d.style.hits = 0; d.style.timer = 0; d.style.moves = [];
      d.style.score *= STYLE.hitTaken;
      d.style.rank = rankFor(d.style.score);
    }
    if (!hero(a) || d.team === a.team) return;
    const s = a.style, P = STYLE.points;
    // one swing through several men counts each body, but the move only once
    const key = e.move?.id ?? e.move;
    const sameSwing = e.nth > 1;
    s.hits++;
    s.best = Math.max(s.best, s.hits);
    s.timer = STYLE.window;
    let pts = P.hit;
    if (sameSwing) pts += P.multi;
    else {
      const recent = s.moves.slice(-2);
      if (!recent.includes(key)) pts += P.fresh;
      else if (recent.length === 2 && recent.every((m) => m === key)) pts += P.stale;
      s.moves.push(key);
      if (s.moves.length > 4) s.moves.shift();
    }
    if (e.juggle) pts += P.juggle + Math.min(e.juggle, 6) * 2;
    if (e.move?.spike) pts += P.spike;
    if (e.crit) pts += P.crit;
    if (e.counter) pts += P.counter;
    if (e.superCrit) pts += P.superCrit;
    if (e.riposte) pts += P.riposte;
    gain(world, a, pts);
  });
  ev.on('kill', (e) => { if (hero(e.attacker) && e.defender.team !== 'player') gain(world, e.attacker, STYLE.points.kill); });
  ev.on('parry', (e) => { if (hero(e.defender)) { e.defender.style.timer = STYLE.window; gain(world, e.defender, STYLE.points.parry); } });
  ev.on('guardBreak', (e) => { if (hero(e.attacker) && e.defender.team !== 'player') gain(world, e.attacker, STYLE.points.guardBreak); });
}

// Each tick: the combo's clock runs down and the score drains.
export function tickStyle(world) {
  for (const f of world.fighters) {
    const s = f.style;
    if (!s) continue;
    if (s.timer > 0) {
      s.timer--;
      s.score = Math.max(0, s.score - STYLE.drain);
      if (s.timer === 0) { s.hits = 0; s.moves = []; }
    } else s.score = Math.max(0, s.score - STYLE.drainIdle);
    s.rank = rankFor(s.score);
  }
}
