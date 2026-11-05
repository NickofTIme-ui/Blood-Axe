// WoodWeather.js — Gallows Wood's weather and light, view only (Nick's level 2 review,
// 2026-11-05: "rain, fog and lantern glow").
//
//   - a cold drizzle slanting across the whole screen, with rings where it hits the mud
//   - low ground fog drifting along the front of the road, in front of the fighters
//   - pools of warm light on the mud under the lanterns (FireLight lights the men in them)
//   - black ferns and grass right at the front edge, sliding past faster than the road
//
// Nothing here touches the sim. Painted replacements for the ferns are on the ChatGPT list.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';

export const WEATHER = {
  drops: 150,       // rain streaks on screen at once
  slant: 0.22,      // sideways per unit fallen (the wind off the hills)
  fall: [13, 19],   // px a frame
  rings: 3,         // splash rings started a frame
  fogBanks: 7,
  fernEvery: 210,   // px between foreground clumps (with jitter)
};

function rng(seed) {
  let k = seed;
  return () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
}

export class WoodWeather {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.data = stage.data;
    this.makeTextures();
    const W = SETTINGS.width; const H = SETTINGS.height;
    const r = rng(77);
    // the rain: screen-space streaks
    this.rain = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.popups - 40);
    this.drops = Array.from({ length: WEATHER.drops }, () => ({
      x: r() * (W + 200) - 100, y: r() * H, v: WEATHER.fall[0] + r() * (WEATHER.fall[1] - WEATHER.fall[0]), l: 10 + r() * 16, a: 0.1 + r() * 0.16,
    }));
    this.rings = [];
    this.ringG = scene.add.graphics().setDepth(DEPTH.decals + 2);
    // the fog: soft banks low along the front of the road
    this.fog = [];
    for (let i = 0; i < WEATHER.fogBanks; i++) {
      const img = scene.add.image(0, 0, 'wood-fog').setOrigin(0.5).setScrollFactor(1.08, 1)
        .setDepth(SETTINGS.world.floorBottom + 30).setAlpha(0.16 + r() * 0.08).setScale(2.6 + r() * 1.6, 0.34 + r() * 0.16).setTint(0x9aaab6);
      this.fog.push({ img, x: r() * this.data.width, y: H - 40 - r() * 70, rate: 0.12 + r() * 0.2 });
    }
    // the lanterns' light on the mud
    for (const l of this.data.lanterns ?? []) {
      const pool = scene.add.image(l.x, l.z + 70, 'glow').setScale(4.2, 1.3).setTint(0xffa850).setAlpha(0.22)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.decals + 1);
      scene.tweens.add({ targets: pool, alpha: { from: 0.16, to: 0.26 }, duration: 300 + (l.x % 170), yoyo: true, repeat: -1 });
    }
    // the ferns along the front edge
    const f = rng(31);
    for (let x = 60; x < this.data.width * 1.35; x += WEATHER.fernEvery * (0.6 + f() * 0.9)) {
      const kind = f() < 0.6 ? 'wood-fern' : 'wood-grass';
      scene.add.image(x, H + 18, kind).setOrigin(0.5, 1).setScrollFactor(1.35, 1).setDepth(DEPTH.popups - 50)
        .setScale(0.8 + f() * 0.7).setFlipX(f() < 0.5).setTint(0x050708);
    }
  }

  makeTextures() {
    const s = this.scene;
    if (!s.textures.exists('wood-fog')) {
      const c = s.textures.createCanvas('wood-fog', 256, 256); const x = c.context;
      const g = x.createRadialGradient(128, 128, 4, 128, 128, 127);
      g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(0.45, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      c.refresh();
    }
    if (!s.textures.exists('wood-fern')) {
      // a fern: arching fronds of little leaflets
      const g = s.make.graphics({ add: false }); const r = rng(5);
      g.fillStyle(0xffffff, 1);
      for (let k = 0; k < 7; k++) {
        const ang = -Math.PI / 2 + (k - 3) * 0.32; const len = 70 + r() * 50;
        for (let i = 0; i < 16; i++) {
          const t = i / 16; const bend = t * t * (k - 3) * 0.25;
          const px = 90 + Math.cos(ang + bend) * len * t; const py = 150 + Math.sin(ang + bend) * len * t;
          const w = 9 * (1 - t) + 2;
          g.fillTriangle(px, py, px - w, py - 3 - w * 0.4, px - 1, py - 5);
          g.fillTriangle(px, py, px + w, py - 3 - w * 0.4, px + 1, py - 5);
        }
        g.lineStyle(2, 0xffffff, 1).lineBetween(90, 150, 90 + Math.cos(ang) * len * 0.9, 150 + Math.sin(ang) * len * 0.9);
      }
      g.generateTexture('wood-fern', 180, 152); g.destroy();
    }
    if (!s.textures.exists('wood-grass')) {
      const g = s.make.graphics({ add: false }); const r = rng(9);
      g.fillStyle(0xffffff, 1);
      for (let i = 0; i < 22; i++) {
        const x = 20 + r() * 100; const h = 40 + r() * 80; const lean = (r() - 0.5) * 40;
        g.fillTriangle(x - 3, 130, x + 3, 130, x + lean, 130 - h);
      }
      g.generateTexture('wood-grass', 140, 132); g.destroy();
    }
  }

  update() {
    const s = this.scene; const W = SETTINGS.width; const H = SETTINGS.height;
    const cam = s.cameras.main;
    // rain
    const g = this.rain.clear();
    for (const d of this.drops) {
      d.y += d.v; d.x -= d.v * WEATHER.slant;
      if (d.y > H + 20) { d.y = -20 - (d.x * 7 % 40); d.x = (d.x * 13 + 331) % (W + 200) - 100 + 200 * WEATHER.slant; }
      if (d.x < -100) d.x += W + 200;
      g.lineStyle(1, 0xc8d6e0, d.a).lineBetween(d.x, d.y, d.x + d.l * WEATHER.slant, d.y - d.l);
    }
    // splash rings on the road
    const B = this.stage.world.bounds;
    for (let i = 0; i < WEATHER.rings; i++) {
      const k = (s.time.now * 0.37 + i * 911 + this.rings.length * 53) % 1;
      this.rings.push({ x: cam.scrollX + ((s.time.now * 1.7 + i * 337) % W), z: B.minZ + k * (B.maxZ - B.minZ + 20), t: 0 });
    }
    const rg = this.ringG.clear();
    for (const r of this.rings) {
      r.t++;
      const k = r.t / 18;
      rg.lineStyle(1, 0xc8d6e0, 0.28 * (1 - k)).strokeEllipse(r.x, r.z, 4 + k * 14, 1.5 + k * 4);
    }
    this.rings = this.rings.filter((r) => r.t < 18);
    // fog drifts with the wind
    const sx = cam.scrollX * 1.08;
    for (const f of this.fog) {
      f.x += f.rate;
      let x = f.x - sx;
      const span = W + 900;
      x = ((x % span) + span) % span - 450;
      f.img.setPosition(x + sx, f.y + Math.sin(s.time.now / 2400 + f.x) * 6);
    }
  }
}
