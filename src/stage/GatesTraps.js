// GatesTraps.js — the Iron Gates' own traps (campaign level 5, data/stageGates.js), run by
// Stage.updateHazards like every other hazard:
//
// 'dropgate'  A SPIKED DROP GATE in the gatehouse passage: a portcullis hung across the whole
//   lane at `x` that slams down every `period` frames. The tell: `warn` frames of the chains
//   rattling, grit falling and its shadow darkening the strip under it. It falls in `fall`
//   frames and stays down `down` frames: while it's down it is a wall nobody passes (anyone
//   in its strip is pushed out to the nearer side). Anyone under it as it lands is crushed:
//   an Ashen man dies outright (kick him, throw him, bowl him under it), a hero takes
//   `damage` and is flung clear. Then it winches up again (`rise` frames).
//   State for the view: hz.gate = { phase: 'up'|'warn'|'fall'|'down'|'rise', t, drop: 0..1 }
//   It hangs on the slant the painted gate is drawn at (`lean`: its foot runs that far right
//   from the back of the lane to the front), so "under it" depends on how deep you stand.
//   A run of them (the winch room's gate passage, Nick 2026-11-27: "a longer sequence where
//   the gates are dropping and you must time getting under them") just staggers `first`.
//
// 'caltrops'  Iron caltrops strewn over a patch of the floor (`x`, `w`, `z0`..`z1`): anyone
//   who steps on them on foot (heroes and the Ashen alike) yelps, hops (a short stagger)
//   and loses `damage`; a man knocked down onto them takes it again. Jump over, go round,
//   or drive the Ashen through them.

import { SETTINGS } from '../config/settings.js';

export const DROPGATE = { period: 330, warn: 72, fall: 8, down: 70, rise: 50, half: 26, damage: 30, first: 150, lean: 200 };
const BACK = SETTINGS.world.floorTop - 32; const FRONT = SETTINGS.world.floorBottom + 6;

// where the gate's foot crosses the lane at depth z
export function gateX(hz, z) {
  const lean = hz.lean ?? DROPGATE.lean;
  const u = Math.max(0, Math.min(1, (z - BACK) / (FRONT - BACK)));
  return hz.x - lean / 2 + u * lean;
}
export const CALTROPS = { damage: 4, stun: 16, cool: 45 };

export function updateDropGate(stage, hz) {
  const P = { ...DROPGATE, ...hz };
  hz.gate ??= { phase: 'up', t: 0, drop: 0 };
  const g = hz.gate;
  g.t++;
  const cycle = (hz.t + P.period - P.first) % P.period; // (the first fall comes `first` frames in)
  const warnAt = P.period - P.warn - P.fall;
  if (g.phase === 'up' && cycle >= warnAt && cycle < warnAt + 2) set(stage, hz, g, 'warn');
  else if (g.phase === 'warn' && g.t >= P.warn) set(stage, hz, g, 'fall');
  else if (g.phase === 'fall') {
    g.drop = Math.min(1, g.t / P.fall);
    if (g.t >= P.fall) { crush(stage, hz, P); set(stage, hz, g, 'down'); g.drop = 1; }
  } else if (g.phase === 'down') {
    hold(stage, hz, P);
    if (g.t >= P.down) set(stage, hz, g, 'rise');
  } else if (g.phase === 'rise') {
    g.drop = Math.max(0, 1 - g.t / P.rise);
    if (g.drop > 0.6) hold(stage, hz, P);
    if (g.t >= P.rise) { set(stage, hz, g, 'up'); g.drop = 0; }
  }
}

function set(stage, hz, g, phase) {
  g.phase = phase; g.t = 0;
  stage.world.events.emit(`dropgate:${phase}`, { hazard: hz });
}

const under = (f, hz, P) => Math.abs(f.x - gateX(hz, f.z)) < P.half + f.stats.body.w * 0.3;

// the moment it lands: whoever is under it
function crush(stage, hz, P) {
  for (const f of stage.world.fighters) {
    if (!f.alive || f.entering || !under(f, hz, P)) continue;
    const gx = gateX(hz, f.z);
    const dir = f.x < gx ? -1 : 1;
    if (f.team === 'enemy' && !f.stats.boss) {
      stage.hurt(hz, f, f.health + 1, dir, 'siege'); // (crushed: Stage.hurt kills him outright)
      stage.world.events.emit('dropgateCrush', { hazard: hz, fighter: f });
    } else if (!f.stats.boss) {
      stage.hurt(hz, f, P.damage, dir, 'beam');
      f.x = gx + dir * (P.half + f.stats.body.w * 0.6);
    }
  }
}

// down: a wall across the lane (anyone in its strip goes out the nearer side)
function hold(stage, hz, P) {
  for (const f of stage.world.fighters) {
    if (!f.alive || !under(f, hz, P)) continue;
    const gx = gateX(hz, f.z);
    const dir = f.x < gx ? -1 : 1;
    f.x = gx + dir * (P.half + f.stats.body.w * 0.3 + 1);
    if (Math.sign(f.vx) === -dir) f.vx = 0;
  }
}

// Is the gate down across x (for anything that wants to know, e.g. the AI): true while it's a wall
export function dropGateShut(stage) {
  return stage.hazards.some((hz) => hz.type === 'dropgate' && hz.gate && (hz.gate.phase === 'down' || (hz.gate.phase === 'rise' && hz.gate.drop > 0.6)));
}

export function updateCaltrops(stage, hz) {
  const P = { ...CALTROPS, ...hz };
  for (const f of stage.world.fighters) {
    if (!f.alive || f.entering || f.cinematic || hz.cool.has(f.id) || f.stats.boss) continue;
    if (Math.abs(f.x - hz.x) > hz.w / 2 || f.z < hz.z0 || f.z > hz.z1) continue;
    if (f.h - (f.floor ?? 0) > 4) continue;                       // (over them in the air)
    const lying = f.state === 'knockdown' || f.isDowned;
    const onFoot = f.state === 'walk' || f.state === 'idle' || f.state === 'dodge' && f.fsm.frame > (f.stats.dodge?.iframes ?? 8);
    if (!lying && !onFoot) continue;
    if (f.invincible) { hz.cool.set(f.id, P.cool); continue; }
    if (f.health - P.damage <= 0) { stage.hurt(hz, f, P.damage, f.facing, 'beam'); continue; } // (the last of him: a hazard kill)
    hz.cool.set(f.id, P.cool);
    f.health = Math.max(f.spare || f.immortal ? 1 : 0, f.health - P.damage);
    f.flash = 6;
    if (!lying) f.fsm.change('hitstun', { frames: P.stun });
    stage.world.events.emit('caltrops', { hazard: hz, fighter: f });
  }
}
