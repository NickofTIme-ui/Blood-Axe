// Session.js — Where each tick's button records come from (core/TickInput.js).
//
// The arena asks its session, tick by tick: "may I run tick N, and what did every
// player press?" Three kinds answer that:
//
//   LocalSession   one or two players on this computer: reads their devices on the spot.
//   NetSession     you and a friend online (co-op over net/Link.js). "Lockstep":
//                  both machines run the whole game themselves and only swap button
//                  records. A record is stamped a few ticks into the future (DELAY) so it
//                  has time to cross the wire; a machine that hasn't yet got the other's
//                  record for a tick simply waits for it. The simulation never sees
//                  anything but records and repeatable dice (World.roll), so both
//                  machines play the same fight. As a safety net the host also sends a
//                  small snapshot of where everyone is every second; if a copy has drifted
//                  (different browser maths, a dropped beat) it is nudged back into line.
//
// Everything here is plain logic (no Phaser), so tests can run two "machines" in one
// page over a fake wire.

import { capture, EMPTY } from '../core/TickInput.js';

export class LocalSession {
  // samplers: one device sampler per player (core/InputManager.js)
  constructor(samplers) {
    this.samplers = samplers;
    this.players = samplers.length;
    this.localIndex = 0;
    this.net = false;
  }

  setSamplers(samplers) { this.samplers = samplers; }
  pump() {}
  ready() { return true; }
  take() { return this.samplers.map((s) => capture(s)); }
  get waiting() { return false; }
}

export const NET = {
  delay: 3,        // ticks between pressing a button and it taking effect (both machines)
  snapEvery: 60,   // ticks between the host's snapshots
  keep: 600,       // ticks of own snapshots a machine keeps to compare against
};

export class NetSession {
  // link: { send(obj), onData(fn), onClose(fn) }   localIndex: 0 = host, 1 = guest
  // game: a number both machines agree on for this run (records from an earlier run are ignored)
  constructor(link, localIndex, sampler = null, game = 0) {
    this.game = game;
    this.link = link;
    this.localIndex = localIndex;
    this.host = localIndex === 0;
    this.players = 2;
    this.net = true;
    this.sampler = sampler;
    this.local = new Map();   // tick -> rec (mine)
    this.remote = new Map();  // tick -> rec (theirs)
    this.sent = NET.delay - 1; // highest tick I've recorded input for
    this.alone = false;       // the other side has gone: carry on by yourself
    this.stall = 0;           // render frames spent waiting on the other machine
    this.snaps = new Map();   // tick -> my snapshot at that tick
    this.pendingSnap = null;  // the host's latest snapshot, until I've reached its tick
    this.desyncs = 0;
    this.onCorrect = null;    // (hostSnap, mySnapAtThatTick) => void — the arena fixes itself up
    this.onGone = null;
    // the first DELAY ticks happen before anyone's input can have arrived: nothing pressed
    for (let t = 0; t < NET.delay; t++) { this.local.set(t, EMPTY); this.remote.set(t, EMPTY); }
    link.onData((m) => this.receive(m));
    link.onClose(() => { this.alone = true; this.onGone?.(); });
  }

  setSamplers(samplers) { this.sampler = samplers[0]; }

  receive(m) {
    if (m.k === 'i') { if ((m.g ?? 0) === this.game) this.remote.set(m.t, m.r); }
    else if (m.k === 's') { if ((m.g ?? 0) === this.game) this.pendingSnap = m; }
    else this.onMessage?.(m);
  }

  // Once per render frame, before stepping: record my buttons for the ticks coming up
  // (stamped DELAY ahead) and send them.
  pump(tick) {
    let first = true;
    while (this.sent < tick + NET.delay) {
      const t = ++this.sent;
      const rec = this.sampler ? capture(this.sampler, first) : EMPTY;
      first = false;
      this.local.set(t, rec);
      if (!this.alone) this.link.send({ k: 'i', g: this.game, t, r: rec });
    }
  }

  ready(tick) {
    const ok = this.local.has(tick) && (this.alone || this.remote.has(tick));
    this.stall = ok ? 0 : this.stall + 1;
    return ok;
  }

  // Both players' records for a tick, in player order (host first).
  take(tick) {
    const mine = this.local.get(tick) ?? EMPTY;
    const theirs = this.remote.get(tick) ?? EMPTY;
    this.local.delete(tick - 2);
    this.remote.delete(tick - 2);
    return this.host ? [mine, theirs] : [theirs, mine];
  }

  get waiting() { return this.stall > 20; }

  // After each tick: `snap` is a function that builds this machine's snapshot of the
  // world. The host sends one every so often; the guest keeps its own to compare.
  afterTick(tick, snap) {
    if (this.alone) return;
    if (tick % NET.snapEvery === 0) {
      const s = snap();
      if (this.host) this.link.send({ k: 's', g: this.game, t: tick, s });
      else {
        this.snaps.set(tick, s);
        this.snaps.delete(tick - NET.keep);
      }
    }
    const p = this.pendingSnap;
    if (!this.host && p && tick >= p.t) {
      this.pendingSnap = null;
      const mine = this.snaps.get(p.t);
      if (mine && this.onCorrect && !sameSnap(mine, p.s)) {
        this.desyncs++;
        this.onCorrect(p.s, mine);
      }
    }
  }
}

// A snapshot is a flat list per fighter: [id, x, z, health, alive(0/1)]. Positions are
// rounded to the pixel, so harmless float fuzz doesn't count as drift.
export function snapshot(world) {
  return world.fighters.map((f) => [f.id, Math.round(f.x), Math.round(f.z), Math.round(f.health), f.alive ? 1 : 0]);
}

function sameSnap(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    for (let k = 0; k < 5; k++) if (Math.abs(a[i][k] - b[i][k]) > (k === 1 || k === 2 ? 2 : 0)) return false;
  }
  return true;
}

// The guest pulls itself back toward the host: for each fighter, apply the difference
// between what the host had at that tick and what I had (so I keep whatever has happened
// since); kill what the host says is dead; drop what the host doesn't have.
export function correct(world, hostSnap, mySnap) {
  const mine = new Map(mySnap.map((r) => [r[0], r]));
  const theirs = new Map(hostSnap.map((r) => [r[0], r]));
  for (const f of world.fighters) {
    const h = theirs.get(f.id);
    const m = mine.get(f.id);
    if (!h) { if (m && f.team === 'enemy') f.removeMe = true; continue; } // the host has no such fighter
    if (!m) continue; // (spawned since: next snapshot will cover him)
    f.x += h[1] - m[1];
    f.z += h[2] - m[2];
    const dh = h[3] - m[3];
    if (dh) f.health = Math.max(h[4] ? 1 : 0, Math.min(f.stats.maxHealth, f.health + dh));
    if (!h[4] && f.alive) { f.health = 0; if (f.state !== 'dead') f.fsm.change('knockdown', { vx: 0, vh: 60 }); }
  }
}

// Two ends of a fake wire, for tests: what one sends the other receives `lag` pumps later.
export function loopPair(lagA = 2, lagB = 2) {
  const mk = () => ({ q: [], data: null, closed: null, peer: null, lag: 0, close() { this.closed?.(); this.peer.closed?.(); }, send(m) { this.peer.q.push({ at: this.peer.now + this.lag, m: JSON.parse(JSON.stringify(m)) }); }, onData(fn) { this.data = fn; }, onClose(fn) { this.closed = fn; }, now: 0,
    // deliver what's due (call once per simulated frame)
    flush() { this.now++; const due = this.q.filter((e) => e.at <= this.now); this.q = this.q.filter((e) => e.at > this.now); for (const e of due) this.data?.(e.m); } });
  const a = mk(); const b = mk();
  a.peer = b; b.peer = a; a.lag = lagA; b.lag = lagB;
  return [a, b];
}
