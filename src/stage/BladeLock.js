// BladeLock.js — KING VAURATH'S BLADE LOCK (level 6, the Ashen Throne: a boss's `lock`).
//
// Parry the King's glide (his special1, across the room and through you) and the blades
// lock: the two of you stand chest to chest, his blade on yours, and it is strength against
// strength. Mash attack (or heavy) to push; he pushes back, harder as the fight goes on.
//   - Push him all the way: his guard is thrown wide (he staggers, open, as when his
//     composure breaks, and takes the full blow while it lasts).
//   - Lose, or run out of time: he throws you off, down and hurt.
// Everyone else carries on round you, but neither of you can be touched while it lasts.
// Pure simulation (frame-timed, read from the hero's own button presses): no Phaser. Emits
// bladeLock { boss, hero }, bladePush { boss, hero, push, by }, bladeLockEnd { boss, hero, won }.

export const LOCK = {
  frames: 200,   // how long it can last before he wins it
  gap: 64,       // chest to chest: this far apart
  press: 0.085,  // what a press of attack moves it (toward him)
  heavy: 0.13,   // ...and a press of heavy
  pull: 0.0055,  // what he takes back every frame (more in his later phases: `rage`)
  slide: 34,     // how far the pair is moved, at the ends of the push
  open: 150,     // won: he's open this long
  damage: 14,    // lost: what his throw costs you
};

export class BladeLock {
  constructor(stage) {
    this.stage = stage;
    this.world = stage.world;
    this.lock = null;
    this.hz = { id: 'bladeLock', cool: new Map() };
    this.world.events.on('parry', (e) => this.parried(e));
  }

  get active() { return !!this.lock; }

  parried(e) {
    const b = e.attacker;
    const st = this.stage;
    const def = st.section?.boss;
    if (this.lock || !def?.lock || !b || b !== st.boss || !b.alive) return;
    if (e.move !== b.stats.moves?.special1) return; // (only the glide locks)
    const h = e.defender;
    if (!h || h.team !== 'player' || !h.alive || b.held || st.sentence?.running) return;
    const cfg = { ...LOCK, ...(def.lock === true ? {} : def.lock) };
    const dir = Math.sign(b.x - h.x) || h.facing || 1; // (from the hero, toward the King)
    this.lock = { b, h, cfg, dir, t: 0, push: 0, cx: (b.x + h.x) / 2, z: h.z };
    b.vx = b.vz = 0; h.vx = h.vz = 0;
    b.fsm.change('idle'); h.fsm.change('block');
    h.controller.pressAge.attack = Infinity; h.controller.pressAge.heavy = Infinity;
    this.world.events.emit('bladeLock', { boss: b, hero: h });
  }

  update() {
    const L = this.lock;
    if (!L) return;
    const { b, h, cfg, dir } = L;
    if (!b.alive || !h.alive || this.stage.sentence?.running) { this.end(false, true); return; }
    L.t++;
    // the hero's presses (they still land while he's frozen in the lock: Controller.js)
    const c = h.controller;
    let by = 0;
    if (c.consume('attack', 2)) by += cfg.press;
    if (c.consume('heavy', 2)) by += cfg.heavy;
    const rage = 1 + 0.35 * (b.phase ?? 0);
    by -= cfg.pull * rage;
    L.push = Math.max(-1, Math.min(1, L.push + by));
    if (by > 0) this.world.events.emit('bladePush', { boss: b, hero: h, push: L.push, by });
    // hold them chest to chest, slid toward whoever is losing
    const mid = L.cx + dir * L.push * cfg.slide;
    h.x = mid - dir * cfg.gap / 2; b.x = mid + dir * cfg.gap / 2;
    h.z = b.z = L.z; h.vx = b.vx = h.vz = b.vz = 0;
    h.facing = dir; b.facing = -dir;
    // frozen where they stand (a hitstop a frame at a time: no blows, no walking off)
    h.hitstop = Math.max(h.hitstop, 2); b.hitstop = Math.max(b.hitstop, 2);
    h.invincible = b.invincible = true;
    if (h.state !== 'block') h.fsm.change('block');
    b.stripPose = 'special:5'; // (his blade levelled on yours: the stab at the end of the glide)
    if (L.push >= 1) this.end(true);
    else if (L.push <= -1 || L.t >= cfg.frames) this.end(false);
  }

  end(won, quiet = false) {
    const L = this.lock;
    this.lock = null;
    const { b, h, cfg, dir } = L;
    b.stripPose = null;
    b.invincible = false; h.invincible = false;
    b.hitstop = 0; h.hitstop = 0;
    if (quiet) return;
    if (won) {
      // his guard thrown wide: open, as when his composure breaks (Stage.shake)
      b.openFor = Math.max(b.openFor ?? 0, cfg.open);
      b.composure = 0;
      b.fsm.change('stagger', { frames: cfg.open });
      b.vx = dir * 180;
      h.fsm.change('idle');
    } else {
      this.hz.cool.delete(h.id);
      this.stage.hurt(this.hz, h, cfg.damage, -dir, 'blade');
      b.fsm.change('idle');
    }
    this.world.events.emit('bladeLockEnd', { boss: b, hero: h, won });
  }
}
