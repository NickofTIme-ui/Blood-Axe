// Parallax.js — The layered backdrop (data/parallax.js): every layer is a strip fixed to
// the screen whose picture slides by `scroll` x the camera's movement, so far mountains
// crawl, ruins nearer the road move faster, and a foreground strip rushes past quicker
// than the fighters. Painted layers are used where they exist; with none yet, the old
// sky plus fog banks and drifting ash at different depths (PARALLAX_FALLBACK).
//
// Drawn under the floor (so the floor and back wall cover the bottom of each layer);
// only `fg` layers are drawn over the fighters, at the top of the screen.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { PARALLAX_LAYERS, PARALLAX_FALLBACK } from '../data/parallax.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class Parallax {
  constructor(scene) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.layers = [];
    this.ash = [];
    const W = SETTINGS.world;
    this.horizon = W.floorTop - 50;
    const ready = new Set(scene.registry.get('parallax') ?? []);
    const painted = PARALLAX_LAYERS.filter((L) => ready.has(L.name));
    let depth = DEPTH.sky;
    // the sky: a painted one, or the old panorama
    if (!ready.has('sky') && scene.registry.get('sky')) {
      const F = PARALLAX_FALLBACK.sky;
      const top = -60;
      const bottom = W.floorTop - 20;
      this.add('sky', { scroll: F.scroll, y: top, height: bottom - top }, depth++);
    }
    for (const L of painted) {
      const height = L.height;
      const y = L.fg ? (L.top ?? 0) : this.horizon - L.bottom - height;
      this.add(`plx-${L.name}`, { ...L, y, height }, L.fg ? DEPTH.popups - 20 : depth++);
    }
    // no painted middle layers yet: fog banks and ash give the depth meanwhile
    if (!painted.some((L) => ['far', 'mid', 'near'].includes(L.name))) {
      this.fogTexture();
      for (const fog of PARALLAX_FALLBACK.fog) {
        this.add('plx-fog', { scroll: fog.scroll, y: this.horizon - fog.y - fog.h / 2, height: fog.h, alpha: fog.alpha, tint: fog.tint, drift: fog.drift, add: true }, DEPTH.far + this.layers.length);
      }
      for (const a of PARALLAX_FALLBACK.ash) this.makeAsh(a);
    }
  }

  // One layer: a screen-wide strip whose picture slides with the camera.
  add(key, L, depth) {
    const scene = this.scene;
    const src = scene.textures.get(key).getSourceImage();
    const s = L.height / src.height;
    // fixed to the screen sideways (scrollFactor 0), with the world vertically; the strip
    // is wider than the view so a camera shake never shows its edge
    const viewW = SETTINGS.width + 80;
    const x = this.cam.width / 2 - viewW / 2;
    const t = scene.add.tileSprite(x, L.y, viewW, L.height, key).setOrigin(0).setScrollFactor(0, 1).setDepth(depth).setTileScale(s, s);
    if (L.tint) t.setTint(L.tint);
    if (L.alpha != null) t.setAlpha(L.alpha);
    if (L.add) t.setBlendMode(Phaser.BlendModes.ADD);
    this.layers.push({ t, scroll: L.scroll, drift: L.drift ?? 0, s, off: 0 });
  }

  // A soft, ragged fog band that repeats sideways (drawn once).
  fogTexture() {
    if (this.scene.textures.exists('plx-fog')) return;
    const w = 512; const h = 64;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    for (let i = 0; i < 46; i++) {
      const x = rand(0, w); const y = rand(h * 0.3, h * 0.7); const r = rand(14, 34);
      for (const dx of [-w, 0, w]) { // (wrapped, so it tiles)
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - r, y - r, r * 2, r * 2);
      }
    }
    this.scene.textures.addCanvas('plx-fog', c);
  }

  // Ash and embers hanging in the air at one depth.
  makeAsh(a) {
    for (let i = 0; i < a.count; i++) {
      const ember = Math.random() < 0.3;
      const img = this.scene.add.image(0, 0, 'dot').setScrollFactor(a.scroll, 1).setDepth(DEPTH.far + 5)
        .setTint(ember ? 0xff8a3a : 0x8a7a70).setScale(rand(a.size[0], a.size[1])).setAlpha(a.alpha * rand(0.5, 1));
      if (ember) img.setBlendMode(Phaser.BlendModes.ADD);
      this.ash.push({ img, scroll: a.scroll, x: rand(0, SETTINGS.width), y: rand(-20, this.horizon + 20), vx: rand(-14, -4), vy: rand(-10, 4), ph: rand(0, 6) });
    }
  }

  update(dt = 1 / 60) {
    const cam = this.cam;
    for (const L of this.layers) {
      L.off += L.drift * dt;
      L.t.tilePositionX = (cam.scrollX * L.scroll + L.off) / L.s;
    }
    // ash: kept inside the view at its own depth, wrapping round the edges
    const half = SETTINGS.width / 2 + 30;
    for (const a of this.ash) {
      a.ph += dt;
      a.x += a.vx * dt;
      a.y += (a.vy + Math.sin(a.ph * 1.3) * 6) * dt;
      if (a.y < -30) a.y = this.horizon + 20;
      if (a.y > this.horizon + 30) a.y = -20;
      const centre = cam.scrollX * a.scroll + cam.width / 2;
      let x = a.x;
      const rel = ((x - (centre - half)) % (half * 2) + half * 2) % (half * 2);
      x = centre - half + rel;
      a.img.setPosition(x, a.y);
    }
  }

  destroy() {
    for (const L of this.layers) L.t.destroy();
    for (const a of this.ash) a.img.destroy();
    this.layers = []; this.ash = [];
  }
}
