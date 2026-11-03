// Grab.js — GRAB AND THROW (Nick, 2026-11-02): D-pad right (F on the keys) grabs the man
// in front of you by the scruff of the neck (THE BOUNCER, below), and the next press (grab,
// attack, heavy or kick) CHUCKS him the way the left stick points. (The overhead yoke was
// cut on 2026-11-03, Nick: "i dont like the overhead lift"; carryPose still has its pose.)
// A thrown man plows through the men in his road (they go down with him), smashes any
// prop he hits (entities/Fighter.js bump) and goes over the edge of any drop he's thrown
// across (stage/Stage.js pits: his death is the thrower's kill).
//
// The hero's state is 'grab', the man's is 'grabbed'. The hero drives it: where the man
// is held comes from carryPose(), read by both states, so neither lags the other.

// Timeline (frames at 60 a second):
//   reach   the lunge for him; caught at `catch` if someone's in reach, else a whiff
//   lift    hauled up off his feet and heaved overhead (`lift` frames)
//   hold    yoked across the shoulders: he can walk slowly with him, turn, and throw at
//           any point (a press during the lift throws the moment he's up); thrown anyway
//           after `hold` frames
//   throw   leaning back (`windup`), the release, then `recover` frames to get his feet back
//
// THE BOUNCER (Nick, 2026-11-02): the hero takes him by the scruff of the neck instead, like a bouncer with a drunk: turned round,
// his feet barely off the floor, frog-marched ahead of the hero (smashing whatever he's
// marched into) until the next press hurls him away.
//
// Thrown, he flies like a MISSILE, head first and rigid, most of the time (`missile`); the
// rest of the time he tumbles end over end.
export const GRAB = {
  reach: 72, depth: 24, high: 30, // how far in front, across the lane, how far off the ground
  catch: 6, whiff: 22,            // frames: the hands close / the empty grab is over
  lift: 24, hold: 150,
  windup: 8, recover: 16,
  carrySpeed: 0.5,                // x his walk while carrying
  // the throw: px/s along the lane and across it, up; damage to the man thrown (on landing)
  // and to each man he's thrown through
  // (2026-11-03, Nick: "make the physics of throwing feel better": a real arc up and a hard
  // drop instead of a flat glide, a heave that freezes for a beat, a slam he bounces off
  // with his momentum kept, then a skid along the dirt)
  speed: 760, speedZ: 450, vh: 250, slam: 22, through: 16,
  releaseH: 0.35, float: 0.45,    // leaves the hands at this x the hero's height; gravity x this until he lands (the descent is faster still: Juggle fallGravity)
  heave: 4,                       // hitstop frames on the thrower as he lets go (the weight of it)
  bounce: { keep: 0.5, vh: 170 }, // the slam: share of his speed he keeps, how high he bounces
  skid: 0.9,                      // friction per frame once he's down (a lying man: 0.8)
  plow: 0.86,                     // the thrown body keeps this much of its speed per man it hits
  missile: 0.75,                  // share of throws that fly head first (the rest tumble)
  // the bouncer: frames to clamp on and turn him round; how far in front he's held and how
  // high off the floor; how fast he's marched (x the walk) with the stick and without; how
  // long until he's thrown anyway; the shove's wind-up
  neck: { clamp: 8, off: 0.7, lift: 7, march: 0.85, push: 0.35, hold: 180, windup: 6 },
};

const NO_GRAB = new Set(['executed', 'execute', 'kneel', 'dead', 'knockdown', 'getup', 'grabbed', 'grab', 'bossEntrance', 'burning']);

// Can this man be picked up? Not a boss, a machine or a giant; on his feet, near the floor.
export function grabbable(e) {
  const s = e.stats;
  return e.alive && !e.removeMe && !s.boss && !s.machine && !s.noGrab && (s.size ?? 1) <= 1.25 &&
    !NO_GRAB.has(e.state) && !e.entering && !e.cinematic && !e.held && !e.immortal &&
    e.h - (e.floor ?? 0) < GRAB.high;
}

// The nearest man f could grab right now (in front of him, within reach), or null.
export function grabTarget(f) {
  const w = f.world;
  if (!w || f.team !== 'player') return null;
  let best = null;
  let bestD = Infinity;
  for (const e of w.fighters) {
    if (e.team === f.team || !grabbable(e)) continue;
    const dx = e.x - f.x;
    if (Math.abs(dx) > GRAB.reach || Math.abs(e.z - f.z) > GRAB.depth) continue;
    if (Math.abs(dx) > 18 && Math.sign(dx) !== f.facing) continue; // (in front of him)
    const d = Math.abs(dx) + Math.abs(e.z - f.z) * 1.5;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

const ease = (t) => t * t * (3 - 2 * t);

// Where the held man is this frame (his body's middle) and how far he's turned over
// (rot 0 = upright, 1 = flat across the shoulders), from the hero's grab timeline.
export function carryPose(f) {
  const g = f.grab;
  const H = f.stats.body.h;
  const fr = f.fsm.frame;
  const dir = f.facing;
  let off = 30; let h = H * 0.42; let rot = 0;
  if (g?.mode === 'neck' && g.caughtAt != null) {
    // by the scruff: pulled in, hoisted onto his toes, a jolt with each of the hero's steps
    const N = GRAB.neck;
    const t = ease(Math.min(1, (fr - g.caughtAt) / N.clamp));
    off = 30 + (N.off * H - 30) * t; // (his arm's length out: off is a share of the hero's height)
    h = N.lift * t + (f.carrying ? Math.abs(Math.sin(fr * 0.32)) * 4 : 0);
    if (g.throwAt != null) off -= 8 * ease(Math.min(1, (fr - g.throwAt) / N.windup));
    return { x: f.x + dir * off, z: f.z + 0.5, h: (f.floor ?? 0) + h, rot: 0, dir, neck: true };
  }
  if (g?.caughtAt != null) {
    const t = Math.min(1, Math.max(0, (fr - g.caughtAt) / GRAB.lift));
    // pulled in tight first, then up and over
    const a = ease(Math.min(1, t / 0.35));
    const b = ease(Math.max(0, (t - 0.2) / 0.8));
    off = 30 - 14 * a - 16 * b;
    h = H * (0.42 + 0.66 * b) + Math.sin(b * Math.PI) * 10; // (high enough that his face shows under the man)
    rot = b;
    if (g.throwAt != null) {
      // leaning back with him for the heave
      const w = Math.min(1, (fr - g.throwAt) / GRAB.windup);
      off -= 10 * ease(w);
      h += 6 * ease(w);
    }
  }
  return { x: f.x + dir * off, z: f.z + 0.5, h: (f.floor ?? 0) + h, rot, dir };
}

// The throw button: a fresh press of grab, attack, heavy or kick.
function throwPressed(c) {
  for (const b of ['grab', 'attack', 'heavy', 'kick']) if (c.consume(b)) return true;
  return false;
}

// Let him go (the hero was hit, the grab was cut short): he drops and lands on his back.
function drop(v, dir) {
  if (v?.state !== 'grabbed') return;
  v.grabbedBy = null;
  v.fsm.change('knockdown', { vx: dir * 90, vh: 120 });
}

// The throw itself: he leaves the hands at shoulder height going the way the stick points.
function release(f, v) {
  const c = f.controller;
  let dx = c.moveX ?? 0;
  let dz = c.moveZ ?? 0;
  if (Math.hypot(dx, dz) < 0.3) { dx = f.facing; dz = 0; }
  const n = Math.hypot(dx, dz);
  dx /= n; dz /= n;
  if (Math.abs(dx) > 0.2) f.facing = Math.sign(dx);
  const p = carryPose(f);
  v.grabbedBy = null;
  v.x = f.x + dx * 24;
  v.z = f.z + dz * 10;
  v.h = (f.floor ?? 0) + f.stats.body.h * GRAB.releaseH; // (hurled forward and down off the shoulders: low enough to go into crates and men)
  v.lastAttacker = f; // (thrown off a ledge into a pit: his kill — stage/Stage.js pitKill)
  v.fsm.change('knockdown', { vx: dx * GRAB.speed, vz: dz * GRAB.speedZ, vh: GRAB.vh });
  // head first like a missile, mostly; now and then he tumbles (view/SpriteEnemyView.js grabSpin)
  const missile = f.world.roll(v.id, 3100) < GRAB.missile;
  v.thrown = { by: f, hit: new Set([v.id]), dx, dz, landed: false, spin: Math.sign(dx) || f.facing, missile };
  if (Math.abs(dx) > 0.2) v.facing = Math.sign(dx); // (head first: he faces the way he flies)
  f.hitstop = Math.max(f.hitstop ?? 0, GRAB.heave);
  f.world.events.emit('grabThrow', { fighter: f, victim: v, dx, dz });
}

// THE BOUNCER: marching him by the neck. The stick steers (he's pushed on slowly with no
// stick), whatever he's marched into breaks or goes over, and the next press (or time
// running out) hurls him away.
const MARCHED = { cut: 'blunt', damage: 8, knockdown: true, unblockable: true, hitstop: 4, knockback: { x: 220, y: 220 } };
function neckMarch(f, v, frame, since) {
  const N = GRAB.neck;
  const g = f.grab;
  const c = f.controller;
  if (g.throwAt == null) {
    if (throwPressed(c)) g.queued = true;
    const ready = since >= N.clamp;
    if (ready) {
      const moving = Math.hypot(c.moveX, c.moveZ) > 0.3;
      if (Math.abs(c.moveX) > 0.5) f.facing = Math.sign(c.moveX);
      f.vx = moving ? c.moveX * f.stats.walkSpeed * N.march : f.facing * f.stats.walkSpeed * N.push;
      f.vz = moving ? c.moveZ * f.stats.depthSpeed * N.march : 0;
      f.carrying = true;
      // his head goes first into whatever's in the way
      const o = f.world.solidAt?.(v.x + f.facing * 14, v.z, v.h + 20);
      if (o?.prop) f.world.events.emit('solidSmashed', { prop: o.prop, dir: f.facing, fighter: v });
      for (const e of f.world.fighters) {
        if (e === v || e.team !== v.team || !e.alive || e.invincible || g.rammed?.has(e.id)) continue;
        if (['knockdown', 'getup', 'grabbed', 'executed', 'kneel', 'bossEntrance'].includes(e.state)) continue;
        if (Math.abs(e.x - (v.x + f.facing * 16)) > 30 || Math.abs(e.z - v.z) > 22) continue;
        (g.rammed ??= new Set()).add(e.id);
        const keep = f.hitstop;
        f.world.combat.resolve(f, e, MARCHED, { dir: f.facing, kind: 'melee', fromX: v.x, contact: { x: e.x, h: e.h + e.stats.body.h * 0.7 } });
        f.hitstop = keep;
        f.world.events.emit('bowl', { fighter: e, by: v, x: e.x, z: e.z, h: 60 });
      }
    } else { f.vx = 0; f.vz = 0; }
    if (ready && (g.queued || since >= N.clamp + N.hold)) {
      g.throwAt = frame;
      f.vx = 0; f.vz = 0; f.carrying = false;
      f.world.events.emit('grabWindup', { fighter: f, victim: v, neck: true });
    }
    return;
  }
  f.vx = 0; f.vz = 0;
  if (frame - g.throwAt === N.windup) { release(f, v); g.released = frame; }
}

export function grabStates({ stopMoving, friction }) {
  return {
    grab: {
      enter(f) {
        stopMoving(f);
        const mx = f.controller.moveX;
        if (Math.abs(mx) > 0.5) f.facing = Math.sign(mx);
        // every grab is the bouncer's grip on his neck (the overhead yoke was cut, Nick 2026-11-03)
        f.grab = { victim: null, caughtAt: null, throwAt: null, queued: false, mode: 'neck' };
        f.activeAttack = null;
        f.move = null;
        f.world.events.emit('grabStart', { fighter: f });
      },
      update(f, frame) {
        const g = f.grab;
        const c = f.controller;
        if (g.caughtAt == null) {
          // the lunge: a short step in, hands out
          f.vx = frame < GRAB.catch ? f.facing * 160 : 0;
          if (frame >= GRAB.catch - 2 && frame <= GRAB.catch + 2) {
            const v = grabTarget(f);
            if (v) {
              g.victim = v;
              g.caughtAt = frame;
              f.facing = Math.sign(v.x - f.x) || f.facing;
              v.fsm.change('grabbed', { by: f });
              f.world.events.emit('grabCatch', { fighter: f, victim: v });
              return;
            }
          }
          friction(f, 0.7);
          if (frame >= GRAB.whiff) f.fsm.change('idle');
          return;
        }
        if (g.released != null) {
          // let go: the follow-through, then back on his feet
          f.vx = 0; f.vz = 0;
          if (frame - g.released >= GRAB.recover) f.fsm.change('idle');
          return;
        }
        const v = g.victim;
        if (!v || v.state !== 'grabbed' || v.grabbedBy !== f) { f.fsm.change('idle'); return; }
        const since = frame - g.caughtAt;
        return neckMarch(f, v, frame, since);
      },
      exit(f) {
        // cut short (hit, a hold, anything): he lets go
        const g = f.grab;
        if (g?.victim && !g.released) drop(g.victim, f.facing);
        f.carrying = false;
      },
    },

    // Held overhead: helpless, out of everyone else's reach, wherever the hero carries him.
    grabbed: {
      enter(f, p) {
        stopMoving(f);
        f.grabbedBy = p.by;
        f.activeAttack = null;
        f.move = null;
        f.thrown = null;
        f.ghost = true; // (carried over the clutter, not into it)
      },
      update(f) {
        const by = f.grabbedBy;
        f.invincible = true;
        f.vx = 0; f.vz = 0;
        if (!by || by.state !== 'grab' || !by.alive) { f.grabbedBy = null; return f.fsm.change('knockdown', { vx: 0, vh: 80 }); }
        const p = carryPose(by);
        f.x = p.x; f.z = p.z; f.h = p.h;
        f.grabRot = p.rot;
        // (yoked: he was facing the man who picked him up; by the neck: turned round, marched off)
        f.facing = p.neck ? by.facing : -by.facing;
        f.byNeck = !!p.neck;
        f.vh = f.stats.gravity / 60; // held up: cancel this step's gravity
      },
      exit(f) { f.ghost = false; f.grabRot = 0; f.byNeck = false; },
    },
  };
}

// A thrown man in flight (World.tick): every man in his road goes down with him, and he
// carries on through them, a little slower each time.
const BODY = { cut: 'blunt', damage: GRAB.through, knockdown: true, unblockable: true, hitstop: 5, knockback: { x: 260, y: 300 } };
export function updateThrown(world) {
  for (const f of world.fighters) {
    const t = f.thrown;
    if (!t) continue;
    if (f.state !== 'knockdown' || f.removeMe) { f.thrown = null; continue; }
    if (f.lyingSince !== null) { f.thrown = null; continue; }
    if (t.landed) continue;
    const speed = Math.hypot(f.vx, f.vz);
    if (speed < 150) continue;
    for (const o of world.fighters) {
      if (o === f || o.team !== f.team || !o.alive || o.invincible || t.hit.has(o.id)) continue;
      if (['knockdown', 'getup', 'grabbed', 'executed', 'kneel', 'bossEntrance'].includes(o.state) || o.entering || o.cinematic) continue;
      const reach = ((f.stats.body.w + o.stats.body.w) / 2) * 0.95 + 10;
      if (Math.abs(o.x - f.x) > reach || Math.abs(o.z - f.z) > 26) continue;
      if (f.h - o.h > o.stats.body.h + 10) continue; // (sailed over his head)
      t.hit.add(o.id);
      const dir = Math.sign(f.vx) || t.spin;
      const by = t.by;
      const keep = by?.hitstop ?? 0;
      const boss = !!o.stats.boss || (o.stats.size ?? 1) > 1.25;
      world.combat.resolve(by ?? f, o, boss ? { ...BODY, knockdown: false, knockback: { x: 60, y: 0 } } : BODY, {
        dir, kind: 'melee', fromX: f.x, contact: { x: (o.x + f.x) / 2, h: o.h + o.stats.body.h * 0.55 },
      });
      if (by) by.hitstop = keep; // (the thrower isn't frozen by a blow landing across the room)
      if (o.state === 'knockdown' && !boss) {
        // bowled over the way the body was going, and he takes the next one down too
        o.vx = f.vx * 0.55; o.vz = f.vz * 0.55;
        o.thrown = { by, hit: t.hit, dx: t.dx, dz: t.dz, landed: false, spin: dir, chain: true };
      }
      if (boss) { f.vx *= 0.2; f.vz *= 0.2; } else { f.vx *= GRAB.plow; f.vz *= GRAB.plow; }
      world.events.emit('bowl', { fighter: o, by: f, x: (o.x + f.x) / 2, z: o.z, h: 50 });
    }
  }
}

// He hits the ground (the knockdown state, the first time he lands): the slam. Returns
// true when it put him back into the air (a short bounce), so the state stops there.
const SLAM = { cut: 'blunt', damage: GRAB.slam, knockdown: true, unblockable: true, hitstop: 6, knockback: { x: 70, y: 150 } };
export function thrownLand(f) {
  const t = f.thrown;
  if (!t || t.landed || t.chain) return false;
  t.landed = true;
  const by = t.by;
  const keep = by?.hitstop ?? 0;
  const dir = Math.sign(f.vx) || t.spin;
  const vx = f.vx;
  const vz = f.vz;
  f.world.combat.resolve(by ?? f, f, SLAM, { dir, kind: 'melee', fromX: f.x - dir * 10, contact: { x: f.x, h: f.h + 10 } });
  if (by) by.hitstop = keep;
  // he bounces off the ground still going the way he was thrown, then skids to a stop
  if (f.state === 'knockdown') {
    f.vx = vx * GRAB.bounce.keep;
    f.vz = vz * GRAB.bounce.keep * 0.7;
    f.vh = GRAB.bounce.vh;
  }
  f.skid = true;
  f.world.events.emit('grabSlam', { fighter: f, by });
  return f.state === 'knockdown' && f.lyingSince === null;
}
