// HoundHunt.js — How a war hound hunts (data/enemies.js `hound`, `hunts: true`). Nick,
// 2026-11-20: "the dogs kind of just shuffle around weirdly, they need animations and
// different things to do".
//
// A man's brain (entities/Enemy.js) lines up, walks into range and swings, always facing
// his target: on a dog that read as a sideways shuffle. A hound runs where it is going
// (it faces the way it runs, it speeds up and slows down instead of snapping between full
// pace and standing), and it picks one thing to do at a time, for a while:
//
//   stalk    head low, trotting in from far off, to a few strides short of the hero
//   circle   round him at a distance, side-on, looking for a way in (the pack's waiting)
//   flank    a wide run round to his back, then straight in from behind
//   rush     a flat-out run in: the snap up close, the pounce from a few strides out
//   bark     planted, snarling and barking at him (backs off a step if he comes on)
//   howl     head thrown back: first sight of a hero, or a packmate killed
//   retreat  slinks off after a bite, or bolts once it's hurt badly; turns back at the end
//   sniff    no hero near: nose down, a few steps, a pause, casting about
//
// plus a skitter back from a swing it sees coming (dodge), and on being hit it either
// backs off or comes straight back angrier. The mode is on the fighter (`hunt.mode`) so
// the view (view/HoundView.js) can pose it: the run, the low stalk, the bark, the howl.
//
// Simulation, not view: every roll is the world's dice (brain.roll), so both machines of
// an online game see the same dog do the same thing.

export const HUNT = {
  ring: 175,        // circling: how far out
  ringZ: 0.42,      // ...squashed in depth (the road is a band)
  spin: 0.022,      // ...radians a frame round him
  stalkTo: 250,     // stalking: comes in to about this far, then picks
  sight: 620,       // further than this from every hero: it casts about, sniffing
  pounce: [150, 290], // the leap from this far out (the move lunges 340)
  flankBack: 105,   // flanking: this far behind him
  howlGap: 420,     // frames between howls from anyone in the pack
  barkEvery: 17,    // a bark this often while barking
  dodge: 0.3,       // chance to skitter back from a swing it sees coming
  dodgeRange: 125,
  hurt: 0.4,        // health below this: it bolts further after a hit
  accel: 0.18,      // how quickly it gets up to (or down from) a pace
  speed: { prowl: 0.32, trot: 0.6, run: 1 },
};

const MODES = ['circle', 'flank', 'rush', 'bark'];

// Where the dog's brain is, or a fresh one
function state(h) {
  return (h.hunt ??= { mode: 'stalk', t: 0, dur: 9999, dir: 1, mx: 0, mz: 0, howled: false, hp: h.health, was: h.state, swing: -1 });
}

// Put it into a mode (dur in frames)
export function setHunt(h, mode, dur, extra = {}) {
  const H = state(h);
  Object.assign(H, { mode, t: 0, dur, ...extra });
  if (mode === 'rush') H.pressed = false;
}

// Pick what to do next. opts.noAttack: a packmate whose turn it isn't (stage/WoodTraps.js
// updatePack): it waits its turn, so no rush, and a flank turns into circling.
function pick(brain, h, target, opts) {
  const H = state(h);
  const r = (salt) => brain.roll(70 + salt);
  const dist = Math.hypot(target.x - h.x, (target.z - h.z) * 2);
  if (dist > HUNT.stalkTo + 90) return setHunt(h, 'stalk', 240);
  // the hero down: they prowl round him and bark, waiting for him to get up
  const down = ['knockdown', 'getup'].includes(target.state) || target.invincible;
  const w = { circle: 3, flank: opts.noAttack || down ? 0 : 2, rush: opts.noAttack || down ? 0 : 3.2, bark: down ? 2.5 : 1.3 };
  let sum = 0; for (const m of MODES) sum += w[m];
  let x = r(1) * sum; let mode = 'circle';
  for (const m of MODES) { if ((x -= w[m]) < 0) { mode = m; break; } }
  const between = (a, b, salt) => a + Math.floor(r(salt) * (b - a + 1));
  if (mode === 'circle') setHunt(h, 'circle', between(50, 120, 2), { dir: r(3) < 0.5 ? -1 : 1 });
  else if (mode === 'flank') setHunt(h, 'flank', 140, { side: r(4) < 0.5 ? -1 : 1 });
  else if (mode === 'rush') setHunt(h, 'rush', 80);
  else setHunt(h, 'bark', between(40, 75, 5));
}

// Head for (tx, tz) at `pace` (0..1 of its run), easing in and out; faces where it runs
// unless `look` says where to look (+1/-1).
function steer(brain, h, tx, tz, pace, look, brake = 50) {
  const s = h.stats;
  const dx = tx - h.x; const dz = tz - h.z;
  const d = Math.hypot(dx, dz);
  let wx = 0; let wz = 0;
  if (d > 8) {
    const v = pace * Math.min(1, d / brake); // (slows as it arrives)
    wx = (dx / d) * v;
    wz = Math.max(-1, Math.min(1, (dz / d) * v * (s.walkSpeed / s.depthSpeed)));
  }
  move(brain, h, wx, wz, look);
}

function move(brain, h, wx, wz, look) {
  const H = state(h);
  // the pack keeps a little room between them (no three dogs stacked in one spot)
  if (wx || wz) for (const o of brain.world.fighters) {
    if (o === h || !o.alive || !o.stats?.hunts) continue;
    const ox = h.x - o.x; const oz = (h.z - o.z) * 2.2;
    const d = Math.hypot(ox, oz);
    if (d < 100 && d > 0.01) { const k = (1 - d / 100) * 1.3; wx += (ox / d) * k; wz += (oz / d) * k; }
  }
  wx = Math.max(-1, Math.min(1, wx)); wz = Math.max(-1, Math.min(1, wz));
  H.mx += (wx - H.mx) * HUNT.accel;
  H.mz += (wz - H.mz) * HUNT.accel;
  if (Math.abs(H.mx) < 0.03) H.mx = 0;
  if (Math.abs(H.mz) < 0.03) H.mz = 0;
  brain.moveX = H.mx; brain.moveZ = H.mz;
  // it faces the way it's running; only a real run across turns it (no flicker in place)
  brain.facingHint = look ?? (Math.abs(H.mx) > 0.12 ? Math.sign(H.mx) : h.facing);
}

function stand(brain, h, look) { move(brain, h, 0, 0, look); }

// One frame of a hound's own hunting. Called from EnemyBrain.sample once the special cases
// (the pen, the tree, the whistle, a job of its own) have passed on it.
export function hunt(brain, target, opts = {}) {
  const h = brain.fighter; const world = brain.world;
  const H = state(h);
  const B = world.bounds;
  const dx = target.x - h.x; const dz = target.z - h.z;
  const adx = Math.abs(dx);
  const toward = Math.sign(dx) || h.facing;
  const ai = brain.ai;
  const canAct = h.state === 'idle' || h.state === 'walk';
  if (brain.cooldown > 0) brain.cooldown--;

  // what just happened to it: a bite or pounce over, or a blow taken
  const attacking = ['light1', 'heavy'].includes(H.was);
  const hit = h.health < H.hp;
  H.hp = h.health; H.was = h.state;
  if (hit && h.alive) H.stung = true;
  if (!canAct) { H.mx = 0; H.mz = 0; return; }
  if (H.stung) {
    H.stung = false;
    const bad = h.health < h.stats.maxHealth * HUNT.hurt;
    if (bad || brain.roll(80) < 0.55) setHunt(h, 'retreat', bad ? 70 + Math.floor(brain.roll(81) * 40) : 34);
    else setHunt(h, 'rush', 70); // (it comes straight back at him)
  } else if (attacking) {
    setHunt(h, brain.roll(82) < 0.55 ? 'retreat' : 'circle', 30 + Math.floor(brain.roll(83) * 30), { dir: brain.roll(84) < 0.5 ? -1 : 1 });
  }

  // nobody near: nose down, casting about; first sight of a hero, the howl
  // (once it's had a hero's scent, or a blow, or been sent, it hunts him wherever he is)
  const far = !H.engaged && !world.fighters.some((o) => o.team === 'player' && o.alive && Math.hypot(o.x - h.x, (o.z - h.z) * 2) < HUNT.sight);
  if (!far || h.health < h.stats.maxHealth || H.mode === 'rush') H.engaged = true;
  if (far) { if (H.mode !== 'sniff') setHunt(h, 'sniff', 9999); }
  else if (H.mode === 'sniff') {
    if (!H.howled && world.frame - (world.lastHowl ?? -9999) > HUNT.howlGap) setHunt(h, 'howl', 62);
    else setHunt(h, 'stalk', 240);
  } else if (!H.howled && H.mode === 'stalk' && world.frame - (world.lastHowl ?? -9999) > HUNT.howlGap) setHunt(h, 'howl', 62);
  // a packmate killed: one of them gives it voice (counted once a tick, for the whole pack)
  if (world.houndTick !== world.frame) {
    world.houndTick = world.frame;
    const n = world.fighters.filter((o) => o.alive && o.stats?.hunts).length;
    if (world.houndsAlive != null && n < world.houndsAlive) world.houndDied = world.frame;
    world.houndsAlive = n;
  }
  if (world.houndDied != null && world.houndDied !== H.mourned && world.frame - world.houndDied < 30 && H.mode !== 'howl'
    && world.frame - (world.lastHowl ?? -9999) > 60) { H.mourned = world.houndDied; setHunt(h, 'howl', 50); }

  // a swing coming its way, up close: a skitter back (one roll a swing)
  const swinging = target.move && target.fsm.frame <= target.move.startup && target.fsm.enterCount !== H.swing;
  if (swinging && adx < HUNT.dodgeRange && Math.abs(dz) < 40 && H.mode !== 'rush') {
    H.swing = target.fsm.enterCount;
    if (brain.roll(85) < HUNT.dodge) setHunt(h, 'retreat', 20, { skitter: true });
  }

  // a packmate whose turn it isn't never goes in
  if (opts.noAttack && (H.mode === 'rush' || H.mode === 'flank')) setHunt(h, 'circle', 60, { dir: H.dir || 1 });

  H.t++;
  if (H.t > H.dur) pick(brain, h, target, opts);
  const sp = HUNT.speed;
  switch (H.mode) {
    case 'sniff': {
      // a few steps, a pause, nose to the ground, drifting the hero's way
      const beat = (H.t + h.id * 23) % 90;
      if (beat < 40) {
        const wob = Math.sin((world.frame + h.id * 50) * 0.03) * 60;
        move(brain, h, toward * sp.prowl * 0.8, Math.sign(wob) * 0.15);
      } else stand(brain, h);
      if (beat === 50) world.events.emit('houndSniff', { fighter: h });
      return;
    }
    case 'howl':
      stand(brain, h, toward);
      if (H.t === 10) { H.howled = true; world.lastHowl = world.frame; world.events.emit('houndHowl', { fighter: h }); }
      return;
    case 'stalk': {
      const tx = target.x - toward * HUNT.stalkTo * (0.8 + (h.id % 3) * 0.12);
      const tz = Math.max(B.minZ + 10, Math.min(B.maxZ - 10, target.z + ((h.id % 3) - 1) * 50));
      steer(brain, h, tx, tz, Math.abs(tx - h.x) > 200 ? sp.trot : sp.prowl);
      if (Math.hypot(dx, dz * 2) < HUNT.stalkTo) pick(brain, h, target, opts);
      return;
    }
    case 'circle': {
      // round him, each its own place on the ring
      // (a pack waiting its turn spreads round him, each its own place on the ring)
      let a = H.a ?? (opts.noAttack ? h.id * 2.399 + world.frame * HUNT.spin * 0.5 : Math.atan2((h.z - target.z) / HUNT.ringZ, h.x - target.x));
      a += H.dir * HUNT.spin;
      let tx = target.x + Math.cos(a) * HUNT.ring;
      let tz = target.z + Math.sin(a) * HUNT.ring * HUNT.ringZ;
      // the ring runs off the road (or the room): the other way round
      if (tz < B.minZ + 10 || tz > B.maxZ - 10 || tx < B.minX + 20 || tx > B.maxX - 20) {
        H.dir = -H.dir; a += H.dir * HUNT.spin * 2;
        tx = Math.max(B.minX + 20, Math.min(B.maxX - 20, tx)); tz = Math.max(B.minZ + 10, Math.min(B.maxZ - 10, tz));
      }
      H.a = a;
      steer(brain, h, tx, tz, sp.trot);
      if (H.t >= H.dur) H.a = null;
      return;
    }
    case 'flank': {
      // a wide arc round to his back, then straight in
      const back = -(target.facing || 1);
      const bx = target.x + back * HUNT.flankBack;
      const wide = Math.sign(h.x - target.x) !== back && adx < 260; // still on his front side
      const tz = wide ? Math.max(B.minZ + 10, Math.min(B.maxZ - 10, target.z + H.side * 95)) : target.z;
      steer(brain, h, wide ? target.x + back * 30 : bx, tz, sp.run);
      if (!wide && Math.abs(bx - h.x) < 40 && Math.abs(dz) < 30) setHunt(h, 'rush', 50);
      return;
    }
    case 'rush': {
      const aligned = Math.abs(dz) <= ai.alignZ;
      const ready = brain.cooldown <= 0 && target.alive && !target.invincible;
      if (ready && aligned && adx >= HUNT.pounce[0] && adx <= HUNT.pounce[1] && !H.pressed && brain.roll(86) < 0.06 && brain.canUse('heavy')) {
        brain.registerPress('heavy'); H.pressed = true; brain.facingHint = toward; brain.moveX = 0; brain.moveZ = 0;
        brain.cooldown = brain.randInt(ai.attackCooldown, 11);
        return;
      }
      if (ready && aligned && adx <= ai.attackRange && adx >= ai.minRange) {
        brain.registerPress(brain.roll(9) < ai.heavyChance && brain.canUse('heavy') ? 'heavy' : 'attack');
        H.pressed = true; brain.facingHint = toward; brain.moveX = 0; brain.moveZ = 0;
        brain.cooldown = brain.randInt(ai.attackCooldown, 11);
        return;
      }
      if (adx < ai.minRange) { move(brain, h, -toward * sp.trot, 0, toward); return; }
      steer(brain, h, target.x - toward * ai.attackRange * 0.7, target.z, sp.run, adx < 120 ? toward : undefined, 14);
      return;
    }
    case 'bark': {
      // planted, snarling; backs a step if he comes on
      if (adx < 110) move(brain, h, -toward * sp.prowl, 0, toward);
      else if (Math.abs(dz) > 40) move(brain, h, 0, Math.sign(dz) * 0.3, toward);
      else stand(brain, h, toward);
      if ((H.t + h.id * 7) % HUNT.barkEvery === 0) world.events.emit('houndBark', { fighter: h });
      return;
    }
    case 'retreat': {
      // slinking off, tail down; it turns to face him again for the last part
      const away = -toward;
      const late = H.t > H.dur * 0.7 && !H.skitter;
      let tx = h.x + away * 120; let tz = h.z + (target.z < h.z ? 40 : -40);
      if (tx < B.minX + 30 || tx > B.maxX - 30) { tx = h.x; tz = target.z + (h.z < target.z ? -160 : 160); } // (the wall: off sideways)
      tz = Math.max(B.minZ + 10, Math.min(B.maxZ - 10, tz));
      const pace = H.skitter ? sp.run : h.health < h.stats.maxHealth * HUNT.hurt ? sp.run * 0.9 : sp.trot;
      steer(brain, h, tx, tz, late ? sp.prowl * 0.6 : pace, H.skitter || late ? toward : undefined);
      if (H.t >= H.dur) { H.skitter = false; setHunt(h, brain.roll(87) < 0.5 ? 'bark' : 'circle', 40 + Math.floor(brain.roll(88) * 40), { dir: brain.roll(89) < 0.5 ? -1 : 1 }); }
      return;
    }
    default:
      setHunt(h, 'stalk', 240);
  }
}
