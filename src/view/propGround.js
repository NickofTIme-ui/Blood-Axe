// propGround.js — Sits the things placed in the street into the picture (Nick, 2026-10-25:
// "they don't feel part of the world... they just felt stuck in"). Two parts:
//
//   light    each level's light on its props: the shared crates, barrels and chests are
//            painted once, clean, for every level, so each is tinted to the level (lit at
//            the top, dark at the foot), and in a fire-lit level the fire's glow catches
//            one side of it
//   ground   a soft dark pool under a thing where it meets the ground (not a flat ring),
//            darkest right at its foot, and a few flecks of dirt and grit kicked up round it

// By stage id: `top` and `low` the tint at the top and the foot, `rim` the fire's glow on its
// side (none: a cold-lit level)
export const PROP_LIGHT = {
  village: { top: 0xc8a48c, low: 0x6a5242, rim: 0xff9040 },
  gallowsWood: { top: 0xaab09c, low: 0x4c5248 },
  hollowMountain: { top: 0xc8a882, low: 0x4c3c2e, rim: 0xffa050 },
  shatteredAscent: { top: 0xb8bccc, low: 0x5a5e6e },
  ironGates: { top: 0xc8916e, low: 0x6b4430, rim: 0xff7030 },
  blackKeep: { top: 0x9ca6be, low: 0x40465a },
};
const mix = (a, b, t) => [16, 8, 0].reduce((c, sh) => c | (Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t) << sh), 0);

// A level not in the list (the arena's stages) lights its props from its section's own
// `light`, more than half way from plain, the glow on their side that light too
export const propLight = (stageId, sectionLight) => PROP_LIGHT[stageId]
  ?? (sectionLight == null ? { top: 0xdccfc2, low: 0x847464 }
    : { top: mix(0xd8ccc0, sectionLight, 0.6), low: dim(mix(0xd8ccc0, sectionLight, 0.7), 0.5), rim: sectionLight });

// one channel-wise scale of a colour (k < 1 darker)
const dim = (c, k) => (Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k);

// Tint an image to the level's light, top to foot (k: darker, knocked about)
export function lightProp(img, L, k = 1) {
  const top = dim(L.top, k); const low = dim(L.low, k);
  img.setTint(top, top, low, low);
}

// The level's fire glowing on one side of a thing (null in a cold-lit level). w, h: its
// drawn size; (x, y) its foot
export function rimGlow(scene, L, x, y, w, h, depth) {
  if (!L.rim) return null;
  return scene.add.image(x - w * 0.32, y - h * 0.55, 'glow').setTint(L.rim).setDisplaySize(w * 0.9, h * 1.25)
    .setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 0.1);
}

// A soft pool of shadow and a scatter of grit under a thing of width w standing at (x, y),
// just under `depth`. `seed` keeps the grit the same each time. Returns the images, to move
// or hide with it.
export function groundUnder(scene, x, y, w, depth, { seed = 1, grit = true, deep = 1 } = {}) {
  const out = [];
  out.push(scene.add.image(x + w * 0.1, y - 1, 'glow').setTint(0x000000).setDisplaySize(w * 2, Math.max(16, w * 0.32) * deep).setAlpha(0.85).setDepth(depth - 0.4));
  out.push(scene.add.image(x, y, 'glow').setTint(0x000000).setDisplaySize(w * 1.2, Math.max(8, w * 0.14) * deep).setAlpha(1).setDepth(depth - 0.3));
  if (grit) {
    let r = seed * 9301 + 49297;
    const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    const n = 5 + Math.round(w / 20);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = 0.5 + rnd() * 0.45;
      out.push(scene.add.image(x + Math.cos(a) * w * d, y + Math.sin(a) * 7, 'px').setTint(i % 2 ? 0x1a120c : 0x3a2a1c)
        .setDisplaySize(2 + rnd() * 6, 2 + rnd() * 2.5).setAngle(rnd() * 90).setDepth(depth - 0.2));
    }
  }
  return out;
}

// Move what groundUnder made with its thing (to x, y); `grit: false` leaves the grit where
// it was (a crate kicked skidding away)
export function moveGround(parts, x, y, { grit = true } = {}) {
  if (!parts) return;
  const [pool, core, ...bits] = parts;
  const dx = x - core.x; const dy = y - core.y;
  if (!dx && !dy) return;
  pool.setPosition(pool.x + dx, pool.y + dy);
  core.setPosition(x, y);
  if (grit) for (const g of bits) g.setPosition(g.x + dx, g.y + dy);
}
