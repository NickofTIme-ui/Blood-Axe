// GutRope.js — A rope of intestine that spills out of a cut: a short verlet chain
// drawn as a wet, banded tube every frame. It can stay attached to a body piece (it
// hangs out of the cut and swings as the piece falls) or fly loose. Segments never
// stretch (hard length limit; pulled too far it tears free instead), points collide
// with the floor and the arena walls, slide briefly on the wet floor, and the whole
// thing goes to sleep once it has settled so it never twitches.

const G = 1500 / 3600; // gravity per frame^2 (px)
const rand = (a, b) => a + Math.random() * (b - a);

export class GutRope {
  constructor(sys, { x, y, z, chunk = null, lenU = 60, dir = 0, power = 1 }) {
    this.sys = sys;
    this.gore = sys.gore;
    this.z = z;
    this.chunk = chunk;
    this.anchor = chunk ? chunk.local({ x, y }) : null;
    this.seg = 4.5;
    this.r = rand(2, 2.8);
    const n = Math.max(7, Math.round(lenU / this.seg));
    this.pts = [];
    for (let i = 0; i < n; i++) {
      // starts bunched in a coil at the wound, then flops out
      const a = i * 0.95 + rand(0, 0.3);
      const rad = 2 + i * 0.35;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad * 0.6;
      const vx = (dir * rand(0.8, 3.2) + rand(-0.8, 0.8)) * power * (0.4 + i / n);
      const vy = -rand(0.5, 3.5) * power * (0.3 + i / n);
      this.pts.push({ x: px, y: py, px: px - vx, py: py - vy, floored: false });
    }
    this.spots = this.pts.map(() => Math.random() < 0.3);
    // each point rests at its own depth on the floor, so a settled rope lies in curls
    // instead of one straight line; thickness swells and pinches along its length
    const ph = rand(0, 6.28);
    this.curl = this.pts.map((_, i) => Math.sin(i * 0.55 + ph) * 5 + Math.sin(i * 1.7 + ph * 2) * 2);
    this.rad = this.pts.map((_, i) => this.r * (0.8 + 0.28 * Math.sin(i * 1.25 + ph) + rand(-0.06, 0.06)));
    this.g = sys.scene.add.graphics();
    this.age = 0;
    this.still = 0;
    this.asleep = false;
    this.alpha = 1;
  }

  anchorPos() {
    const c = this.chunk;
    return c.worldPoint(this.anchor.x, this.anchor.y);
  }

  update() {
    this.age++;
    const c = this.chunk;
    if (c && (c.dead || c.cont.alpha < 1)) this.alpha = c.dead ? 0 : c.cont.alpha;
    if (c?.dead) this.chunk = null;

    if (!this.asleep) this.step();

    // fade out with the rest of the gore
    if (!this.chunk && this.asleep) {
      this.restTime = (this.restTime ?? 0) + 1;
      const life = this.sys.restFrames;
      if (this.restTime > life) this.alpha = Math.max(0, 1 - (this.restTime - life) / 60);
    }
    if (this.alpha <= 0) { this.dead = true; return; }
    if (!this.asleep || this.redraw) { this.draw(); this.redraw = false; }
    this.g.setAlpha(this.alpha);
  }

  step() {
    const P = this.pts;
    const floor = this.z;
    const minX = this.sys.minX; const maxX = this.sys.maxX;
    const anchored = !!this.chunk && !!this.anchor;
    let motion = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (i === 0 && anchored) continue;
      let vx = (p.x - p.px) * 0.985;
      let vy = (p.y - p.py) * 0.985;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + G;
      const fl = floor + this.curl[i];
      if (p.y >= fl) {
        // hits the wet floor: no real bounce, a short slide, then it sticks; the fall
        // pushes it a little sideways so it slumps into loops
        if (!p.floored) {
          if (vy > 2) this.gore.splat(p.x, floor, 0.5 + this.r / 6, 0.6);
          p.px = p.x - vx * 0.55 - rand(-1.2, 1.2);
        } else {
          p.px = p.x - vx * 0.55;
        }
        p.floored = true;
        p.y = fl;
        p.py = fl;
      }
      if (p.x < minX) { p.x = minX; p.px = p.x; }
      if (p.x > maxX) { p.x = maxX; p.px = p.x; }
      motion = Math.max(motion, Math.abs(vx) + Math.abs(vy));
    }
    if (anchored) {
      const a = this.anchorPos();
      P[0].x = a.x; P[0].y = a.y; P[0].px = a.x; P[0].py = a.y;
    }
    // hard length limit (a rope can go slack, never stretch)
    for (let k = 0; k < 10; k++) {
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1]; const b = P[i];
        const dx = b.x - a.x; const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d <= this.seg) continue;
        const diff = (d - this.seg) / d;
        if (i === 1 && anchored) { b.x -= dx * diff; b.y -= dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
      P.forEach((p, i) => { if (p.y > floor + this.curl[i]) p.y = floor + this.curl[i]; });
    }
    // yanked too hard by a flying piece: it tears free rather than stretching
    if (anchored && Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y) > this.seg * 2.2) {
      this.chunk = null;
      this.gore.burst(P[0].x, this.z, this.z - P[0].y, Math.sign(P[1].x - P[0].x) || 1, 6, 0.4);
    }
    // a few drips while it's still moving
    if (this.age < 150 && motion > 0.5 && Math.random() < 0.15 && this.gore.level > 0) {
      const p = P[Math.floor(Math.random() * P.length)];
      if (p.y < floor - 2) this.gore.spawn({ x: p.x, z: this.z, h: this.z - p.y, vx: 0, vz: 0, vh: -20, tint: 0x6e0202, scale: 0.3 });
    }
    // settled?
    this.still = motion < 0.04 ? this.still + 1 : 0;
    if (this.still > 40 && (!this.chunk || this.chunk.rested)) { this.asleep = true; this.redraw = true; }
  }

  draw() {
    const g = this.g;
    const P = this.pts;
    const r = this.r;
    g.clear();
    g.setDepth(this.z + 0.45);
    const RR = this.rad;
    // each layer: segments whose width follows the swelling, plus a blob at every point
    // (the blobs make the lumpy, pouched look of bowel instead of a smooth pipe)
    const layer = (k, add, color, alpha, ox = 0, oy = 0) => {
      for (let i = 1; i < P.length; i++) {
        g.lineStyle((RR[i - 1] + RR[i]) * k + add, color, alpha);
        g.lineBetween(P[i - 1].x + ox, P[i - 1].y + oy, P[i].x + ox, P[i].y + oy);
      }
      g.fillStyle(color, alpha);
      P.forEach((p, i) => g.fillCircle(p.x + ox, p.y + oy, RR[i] * k * 1.12 + add / 2));
    };
    layer(1, 1.4, 0x1e0306, 1);                       // dark wet outline
    layer(1, 0, 0x6a1822, 1);                          // burgundy body
    layer(0.6, 0, 0x9a4450, 1, -r * 0.12, -r * 0.3);   // muted pink top
    layer(0.3, 0, 0xc27a82, 1, -r * 0.2, -r * 0.45);   // soft pink sheen
    g.fillStyle(0xf6d0d4, 0.85);                        // sharp wet glints
    P.forEach((p, i) => { if (i % 2 === 0) g.fillCircle(p.x - RR[i] * 0.35, p.y - RR[i] * 0.55, Math.max(0.5, RR[i] * 0.18)); });
    // segment bands and blood coating
    g.lineStyle(0.8, 0x280408, 0.75);
    for (let i = 1; i < P.length; i += 2) {
      const a = P[i - 1]; const b = P[i];
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / d; const ny = (b.x - a.x) / d;
      g.lineBetween(b.x + nx * r * 0.9, b.y + ny * r * 0.9, b.x - nx * r * 0.9, b.y - ny * r * 0.9);
    }
    g.fillStyle(0x6e0404, 0.85);
    P.forEach((p, i) => { if (this.spots[i]) g.fillCircle(p.x + r * 0.2, p.y + r * 0.3, r * 0.45); });
  }

  destroy() { this.g.destroy(); }
}
