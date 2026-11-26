// WardenHook.js — the Chain Warden's hook (Hollow Mountain, the underground river; hazard
// 'hook', `when: 'boss'`): every `period` frames he winds the hook on its chain round over
// his head (`warn` frames: the chain whirring), then throws it down the lane at a hero. It
// flies straight out to `range`; whoever it reaches on the ground in its lane (`lane` px
// across) is caught and hauled back to him hand over hand, `pull` px a frame, along firm
// ground only (never dragged into the river), and dumped at his feet with a blow. Jump it,
// or step out of its lane. In his rage (phase 'chains') he throws more often.
// State for the view: hz.hook = { phase: 'wind'|'fly'|'haul', t, x, z, h, tipX, tipZ, dir, target }
const H = { period: 330, rage: 210, warn: 46, range: 470, speed: 22, lane: 32, high: 46, pull: 11, hold: 26, blow: 10, first: 120 };

export function updateWardenHook(stage, hz) {
  const b = stage.boss;
  if (!b || !b.alive || b.entering || b.state === 'bossEntrance' || stage.index !== hz.section || stage.story?.holding) {
    if (hz.hook?.target) release(hz.hook.target);
    hz.hook = null; hz.next = null;
    return;
  }
  const P = { ...H, ...hz };
  hz.next ??= hz.t + P.first;
  const k = hz.hook;
  const hand = () => ({ x: b.x + b.facing * 24, z: b.z, h: (b.h ?? 0) + 70 });
  if (!k) {
    if (hz.t < hz.next || !['idle', 'walk'].includes(b.state)) return;
    const heroes = stage.players.filter((p) => p.alive && !p.cinematic);
    if (!heroes.length) return;
    const t = heroes.reduce((a, q) => (Math.abs(q.x - b.x) + Math.abs(q.z - b.z) < Math.abs(a.x - b.x) + Math.abs(a.z - b.z) ? q : a));
    if (Math.abs(t.x - b.x) > P.range + 40 || Math.abs(t.x - b.x) < 90) { hz.next = hz.t + 30; return; }
    const dir = Math.sign(t.x - b.x) || 1;
    b.facing = dir;
    hz.hook = { phase: 'wind', t: 0, dir, aimZ: t.z, tipX: hand().x, tipZ: b.z, target: null };
    stage.world.events.emit('hookWind', { hazard: hz, boss: b });
    return;
  }
  k.t++;
  b.vx = 0; // (he plants his feet to throw and to haul)
  if (k.phase === 'wind') {
    if (k.t < P.warn) return;
    k.phase = 'fly'; k.t = 0; k.out = 0;
    k.tipX = hand().x; k.tipZ = b.z;
    stage.world.events.emit('hookThrow', { hazard: hz, boss: b });
    return;
  }
  if (k.phase === 'fly') {
    k.out += P.speed;
    const u = Math.min(1, k.out / P.range);
    k.tipX = hand().x + k.dir * k.out;
    k.tipZ = b.z + (k.aimZ - b.z) * u;
    for (const f of stage.players) {
      if (!f.alive || f.invincible || f.state === 'knockdown' || f.h - (f.floor ?? 0) > P.high) continue;
      if (Math.abs(f.x - k.tipX) > P.speed + 14 || Math.abs(f.z - k.tipZ) > P.lane) continue;
      k.phase = 'haul'; k.t = 0; k.target = f;
      f.hooked = true;
      f.fsm.change('hitstun', { frames: 200 });
      stage.world.events.emit('hookCatch', { hazard: hz, boss: b, fighter: f });
      return;
    }
    if (k.out >= P.range) { k.phase = 'haul'; k.t = 0; } // (missed: he hauls the empty hook back)
    return;
  }
  // haul: hand over hand, the hook (and whoever is on it) back to him
  const f = k.target;
  const home = hand().x + k.dir * 50;
  if (f) {
    if (!f.alive || f.state === 'knockdown' || f.state === 'dead') { release(f); k.target = null; return; }
    if (f.state !== 'hitstun') f.fsm.change('hitstun', { frames: 200 });
    const step = Math.sign(home - f.x) * Math.min(P.pull, Math.abs(home - f.x));
    const T = stage.terrain;
    const nx = f.x + step;
    const firm = !T || (T.safeAt(nx, f.z) && T.groundAt(nx, f.z) <= (f.floor ?? 0) + 30);
    if (firm) f.x = nx;
    f.vx = 0;
    f.z += Math.sign(b.z - f.z) * Math.min(2, Math.abs(b.z - f.z));
    k.tipX = f.x; k.tipZ = f.z;
    if (Math.abs(home - f.x) < 4 || !firm || k.t > 90) {
      // at his feet: the blow (held at the water's edge instead: the hook tears free)
      release(f);
      if (f.state === 'hitstun') f.fsm.change('idle');
      if (firm) stage.hurt(hz, f, P.blow, k.dir * -1, 'beam');
      stage.world.events.emit('hookDone', { hazard: hz, boss: b, fighter: f });
      end(stage, hz, b, P);
    }
    return;
  }
  k.tipX -= k.dir * P.speed;
  if ((k.tipX - hand().x) * k.dir <= 0 || k.t > 60) end(stage, hz, b, P);
}

function release(f) { f.hooked = false; }

function end(stage, hz, b, P) {
  hz.hook = null;
  hz.next = hz.t + (b.raged || stage.bossInPhase('chains') ? P.rage : P.period);
}

// for the view: where the chain runs from (his hand) and to (the hook)
export function hookLine(stage, hz) {
  const b = stage.boss; const k = hz.hook;
  if (!b || !k) return null;
  return { phase: k.phase, t: k.t, dir: k.dir, fromX: b.x + b.facing * 24, fromZ: b.z, fromH: (b.h ?? 0) + 70, tipX: k.tipX, tipZ: k.tipZ, caught: !!k.target, warn: hz.warn ?? H.warn };
}
