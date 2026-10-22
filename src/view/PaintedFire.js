// Animate only the bright orange pixels already painted into a building. Shutters,
// beams and stone keep their original silhouette; no extra fire is pasted over them.
export function firePixel(r, g, b, a) {
  return a > 100 && r > 160 && g > 28 && g < r * 0.87 && b < g * 0.4;
}

export function fireLight(x, y, seconds) {
  // Uneven tongues travel upward, with a slower gust changing their strength.
  const tongue = Math.sin(y * 0.19 + seconds * 8 + Math.sin(x * 0.11 - seconds * 2.1) * 2);
  const gust = Math.sin(seconds * 2.3 + x * 0.035) * Math.sin(seconds * 3.7 + y * 0.04);
  return Math.max(0, Math.min(1, 0.5 + tongue * 0.32 + gust * 0.18));
}

export class PaintedFire {
  constructor(scene) {
    this.scene = scene;
    this.sources = new Map();
    this.last = -Infinity;
    scene.events.once('shutdown', () => {
      for (const rec of this.sources.values()) {
        for (const overlay of rec.overlays) overlay.destroy();
        scene.textures.remove(rec.key);
      }
      this.sources.clear();
    });
  }

  add(display, tiled = false) {
    if (!display) return;
    const sourceKey = display.texture.key;
    let rec = this.sources.get(sourceKey);
    if (!rec) {
      const src = this.scene.textures.get(sourceKey).getSourceImage();
      const w = Math.min(960, src.width), h = Math.round(src.height * w / src.width);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(src, 0, 0, w, h);
      const pixels = ctx.getImageData(0, 0, w, h).data;
      const hot = [];
      for (let i = 0; i < pixels.length; i += 4) {
        if (firePixel(...pixels.subarray(i, i + 4))) hot.push({ i, x: (i / 4) % w, y: Math.floor(i / 4 / w), strength: pixels[i] / 255 });
      }
      const key = `living-fire-${sourceKey}`;
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      const texture = this.scene.textures.createCanvas(key, w, h);
      rec = { key, texture, hot, w, h, originalWidth: src.width, image: texture.context.createImageData(w, h), overlays: [] };
      this.sources.set(sourceKey, rec);
    }
    if (!rec.hot.length) return;
    let overlay;
    if (tiled) {
      overlay = this.scene.add.tileSprite(display.x, display.y, display.width, display.height, rec.key)
        .setOrigin(display.originX, display.originY)
        .setTileScale(display.tileScaleX * rec.originalWidth / rec.w, display.tileScaleY * rec.originalWidth / rec.w);
    } else {
      overlay = this.scene.add.image(display.x, display.y, rec.key).setOrigin(display.originX, display.originY)
        .setDisplaySize(display.displayWidth, display.displayHeight);
    }
    overlay.setDepth(display.depth + 0.001);
    rec.overlays.push(overlay);
  }

  update(now) {
    // Refresh sparse fire masks at 15 Hz, independent of monitor refresh rate.
    if (now - this.last < 1000 / 15) return;
    this.last = now;
    for (const rec of this.sources.values()) {
      const d = rec.image.data;
      for (const p of rec.hot) {
        const f = fireLight(p.x, p.y, now / 1000);
        d[p.i] = Math.round(90 + 165 * f);
        d[p.i + 1] = Math.round(20 + 175 * f * f);
        d[p.i + 2] = Math.round(4 + 35 * f * f);
        d[p.i + 3] = Math.round((0.15 + Math.abs(f - 0.5) * 0.65) * 255 * p.strength);
      }
      rec.texture.context.putImageData(rec.image, 0, 0);
      rec.texture.refresh();
    }
  }
}
