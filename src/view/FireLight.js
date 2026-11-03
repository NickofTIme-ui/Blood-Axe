// FireLight.js — Firelight on the fighters (village only for now), view only.
//
// Nick's second level 1 review (2026-11-03): the fighters had the same flat light all down
// the burning street, so they looked pasted on. Each fighter near a fire gets a warm glow:
// a copy of his own frame, filled with fire colour and added on top, a touch offset toward
// the flame so the side facing it catches more. It fades with distance and flickers.
// (A copy, not a tint: the views already use tints for hits, wind-ups and co-op colours.)
//
// Light sources: the stage's fire hazards (brighter while they burst), its lanterns, and
// the big fires painted on its backdrop (`firelight` in the stage data).

const WARM = 0xff8a3a;

export class FireLight {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    const d = stage.data ?? {};
    this.lights = [
      ...(d.firelight ?? []).map((l) => ({ ...l })),
      ...(d.lanterns ?? []).map((l) => ({ x: l.x, z: l.z, r: 160, k: 0.45 })),
    ];
    this.glows = new Map(); // view -> its glow copy
    this.t = 0;
  }

  // how much fire falls on a spot, and which way it comes from
  lightAt(x, z) {
    let best = 0, dir = 0;
    const take = (lx, lz, r, k) => {
      const dx = x - lx, dz = (z - lz) * 1.6, dist = Math.hypot(dx, dz);
      if (dist >= r) return;
      const v = k * (1 - dist / r) ** 1.5;
      if (v > best) { best = v; dir = Math.sign(dx) || 1; }
    };
    for (const l of this.lights) take(l.x, l.z, l.r, l.k);
    for (const hz of this.stage.hazards ?? []) {
      if (hz.type !== 'fire') continue;
      const burst = this.stage.firePhase?.(hz) === 'burst';
      take(hz.x, hz.z, burst ? 300 : 220, burst ? 1 : 0.55);
    }
    return { v: best, dir };
  }

  update() {
    this.t += 1;
    const seen = new Set();
    for (const v of this.scene.views?.values() ?? []) {
      const s = v.sprite, f = v.fighter ?? v.f;
      if (!s || !f || !s.frame || !s.active) continue;
      seen.add(v);
      let g = this.glows.get(v);
      const { v: light, dir } = s.visible && f.state !== 'dead' ? this.lightAt(f.x, f.z) : { v: 0, dir: 0 };
      if (light < 0.02) { g?.setVisible(false); continue; }
      if (!g) {
        g = this.scene.add.image(0, 0, s.texture.key, s.frame.name).setBlendMode(Phaser.BlendModes.ADD).setTintFill(WARM);
        this.glows.set(v, g);
      }
      const flicker = 0.85 + 0.15 * Math.sin(this.t * 0.23 + f.x * 0.01) * Math.sin(this.t * 0.11);
      g.setTexture(s.texture.key, s.frame.name).setVisible(true)
        .setOrigin(s.originX, s.originY).setFlip(s.flipX, s.flipY)
        .setScale(s.scaleX, s.scaleY).setRotation(s.rotation)
        .setPosition(s.x - dir * 2, s.y).setDepth(s.depth + 0.001)
        .setAlpha(Math.min(0.3, light * 0.3) * flicker * s.alpha);
    }
    for (const [v, g] of this.glows) if (!seen.has(v)) { g.destroy(); this.glows.delete(v); }
  }

  destroy() {
    for (const g of this.glows.values()) g.destroy();
    this.glows.clear();
  }
}
