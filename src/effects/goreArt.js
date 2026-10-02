// goreArt.js — Paints the gore at boot: wound cross-sections, protruding bones, cut
// bands, organs, meat and bone fragments. Everything is painted in layers so a wound
// reads, even at speed, as SKIN -> FAT -> MUSCLE -> BONE -> BLOOD:
//
//   torn skin rim (bruised on crushing hits) -> dark damaged tissue -> fat ->
//   muscle bundles with directional fibres, split by pale sinew -> a dark recess
//   around the bone -> bone cross-section (ivory cortex, porous marrow) ->
//   pooled dark blood in the deep spots -> wet highlights on top.
//
// Wounds come in kinds (the attack that made them):
//   clean  sword/dagger: sharp rim, sliced flat muscle, clean round bone
//   heavy  big axe/cleaver chops: like clean but more exposed tissue and bone
//   crush  blunt weapons: ragged rim, bruising, torn messy tissue, splintered bone
//   char   fire: crush, charred black
// ...and parts (anatomy): upperArm, forearm (two bones), thigh, lowerLeg (two bones),
// neck (vertebra, windpipe), torso (spine, gut coils).
//
// Painted at S px per world unit (the game draws at 2x, so this stays crisp up close)
// and cached per (part, kind, variant). Several variants each, so wounds don't repeat.

export const S = 4; // texture px per world unit
const VARIANTS = 4;

// ------------------------------------------------------------------ helpers

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(w));
  c.height = Math.max(2, Math.ceil(h));
  return c;
}

// A closed, irregular ellipse outline: smooth noise on the radius.
function raggedPath(ctx, cx, cy, rx, ry, rough, R, n = 56, spikes = 0) {
  const k = 5;
  const noise = [];
  for (let i = 0; i < k; i++) noise.push(R() * 2 - 1);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    // smooth low-frequency wobble + optional sharp tears
    let m = 1;
    for (let j = 0; j < k; j++) m += noise[j] * rough * Math.sin(t * (j + 2) + j * 1.7) / (j + 1);
    if (spikes && R() < spikes) m += (R() - 0.3) * rough * 2.2;
    const x = cx + Math.cos(t) * rx * m;
    const y = cy + Math.sin(t) * ry * m;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16);
  const B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(lerp((A >> s) & 255, (B >> s) & 255, t));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}

// Glossy wet highlights: a few short curved strokes + dots, light from the top-left.
function wetGloss(ctx, cx, cy, rx, ry, R, amount = 1) {
  ctx.save();
  ctx.lineCap = 'round';
  const n = Math.round((3 + R() * 4) * amount);
  for (let i = 0; i < n; i++) {
    const a = -2.4 + R() * 1.6;
    const d = 0.25 + R() * 0.6;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    const len = (2 + R() * 5) * (rx / 30 + 0.5);
    ctx.strokeStyle = `rgba(255,${220 + R() * 30},${210 + R() * 30},${0.35 + R() * 0.45})`;
    ctx.lineWidth = 0.8 + R() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len * 0.5, y - len * 0.25, x + len, y + R() * 1.5);
    ctx.stroke();
  }
  for (let i = 0; i < n * 0.6; i++) {
    const x = cx + (R() * 2 - 1) * rx * 0.8;
    const y = cy + (R() * 2 - 1) * ry * 0.8;
    ctx.fillStyle = `rgba(255,235,230,${0.3 + R() * 0.5})`;
    ctx.fillRect(x, y, 1 + R(), 1 + R());
  }
  ctx.restore();
}

// Dark pooled blood with a tiny glint.
function pools(ctx, cx, cy, rx, ry, R, n) {
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2;
    const d = 0.2 + R() * 0.55;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    const r = (1.5 + R() * 3.5) * (rx / 30 + 0.4);
    ctx.fillStyle = `rgba(${28 + R() * 20},0,${2 + R() * 4},0.85)`;
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r * 0.8, R() * 0.6 - 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,200,0.55)';
    ctx.fillRect(x - r * 0.5, y - r * 0.4, 1.2, 1);
  }
}

// ------------------------------------------------------------------ anatomy presets
// fat: fat-layer thickness (share of the radius); bones: [[dx, dy, r], ...] as shares of
// the radii; flat: how squashed the visible cross-section is.

const ANATOMY = {
  upperArm: { fat: 0.06, bones: [[0.05, 0.02, 0.22]], bundles: 4, flat: 0.5 },
  forearm:  { fat: 0.04, bones: [[-0.22, 0, 0.15], [0.24, 0.05, 0.13]], bundles: 5, flat: 0.52 },
  thigh:    { fat: 0.12, bones: [[0.04, 0.03, 0.2]], bundles: 5, flat: 0.48 },
  lowerLeg: { fat: 0.06, bones: [[-0.12, -0.05, 0.2], [0.34, 0.1, 0.1]], bundles: 4, flat: 0.5 },
  neck:     { fat: 0.05, bones: [[-0.22, 0.02, 0.24]], bundles: 3, flat: 0.52, neck: true },
  torso:    { fat: 0.08, bones: [[-0.62, 0.04, 0.14]], bundles: 3, flat: 0.34, torso: true },
};

const KINDS = {
  clean: { rough: 0.035, spikes: 0, tear: 0.4, bruise: 0, tissue: 0.1, boneJag: 0, char: 0, expose: 1 },
  heavy: { rough: 0.06, spikes: 0.03, tear: 0.6, bruise: 0.1, tissue: 0.14, boneJag: 0.15, char: 0, expose: 1.15 },
  crush: { rough: 0.11, spikes: 0.12, tear: 1, bruise: 0.55, tissue: 0.22, boneJag: 0.6, char: 0, expose: 1.05 },
  char:  { rough: 0.1, spikes: 0.1, tear: 0.9, bruise: 0.2, tissue: 0.2, boneJag: 0.45, char: 1, expose: 1 },
};

export function kindForCut(cut, damage = 0) {
  if (cut === 'blunt') return 'crush';
  if (cut === 'fire') return 'char';
  if ((cut === 'chop' || cut === 'cleave') && damage >= 18) return 'heavy';
  return 'clean';
}

// ------------------------------------------------------------------ bone cross-section

function boneSection(ctx, x, y, r, ry, K, R, kind) {
  const jag = K.boneJag;
  // cortex (ivory ring)
  ctx.save();
  raggedPath(ctx, x, y, r, ry, 0.04 + jag * 0.18, R, 28, jag * 0.35);
  const g = ctx.createLinearGradient(x - r, y - ry, x + r, y + ry);
  g.addColorStop(0, '#fbf3dc'); g.addColorStop(0.55, '#e2d4b0'); g.addColorStop(1, '#9c8a66');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(60,30,20,0.9)'; ctx.stroke();
  // marrow: dark porous red-brown, with pores
  raggedPath(ctx, x + r * 0.04, y + ry * 0.05, r * 0.55, ry * 0.55, 0.08 + jag * 0.2, R, 22);
  const mg = ctx.createRadialGradient(x, y, 0, x, y, r * 0.6);
  mg.addColorStop(0, '#4a1008'); mg.addColorStop(1, '#8a3a24');
  ctx.fillStyle = mg; ctx.fill();
  for (let i = 0; i < 8 + r; i++) {
    const a = R() * Math.PI * 2; const d = R() * 0.5;
    ctx.fillStyle = R() < 0.5 ? 'rgba(20,4,2,0.8)' : 'rgba(200,120,90,0.6)';
    ctx.fillRect(x + Math.cos(a) * r * d, y + Math.sin(a) * ry * d, 1, 1);
  }
  // cracks / splinters on crushing breaks
  if (jag > 0.3) {
    ctx.strokeStyle = 'rgba(40,20,10,0.8)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const a = R() * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * ry * 0.5);
      ctx.lineTo(x + Math.cos(a + 0.2) * r * 1.35, y + Math.sin(a + 0.2) * ry * 1.35); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const a = R() * Math.PI * 2; const d = 1.1 + R() * 0.5;
      ctx.fillStyle = '#e6d8b8';
      ctx.beginPath();
      const sx = x + Math.cos(a) * r * d; const sy = y + Math.sin(a) * ry * d;
      ctx.moveTo(sx, sy); ctx.lineTo(sx + 2 + R() * 2, sy + 1); ctx.lineTo(sx + 1, sy + 2 + R()); ctx.closePath(); ctx.fill();
    }
  }
  // blood staining round the fracture + a wet glint
  ctx.strokeStyle = 'rgba(110,8,6,0.55)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(x, y, r * 1.08, ry * 1.08, 0, 0.3, 2.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,245,0.85)';
  ctx.fillRect(x - r * 0.55, y - ry * 0.7, Math.max(1, r * 0.3), 1);
  if (kind === 'char') { ctx.fillStyle = 'rgba(30,20,14,0.55)'; ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// ------------------------------------------------------------------ wound cap

// widthU = limb thickness in world units. Returns a canvas; the cut face is centred.
export function paintWound({ widthU, part = 'upperArm', kind = 'clean', seed = 1, skin = '#b06a48' }) {
  const A = ANATOMY[part] ?? ANATOMY.upperArm;
  const K = KINDS[kind] ?? KINDS.clean;
  const R = rng(seed * 7919 + widthU * 31);
  const rx = (widthU * S) / 2;
  const ry = rx * A.flat;
  const pad = 6 + rx * 0.25;
  const c = canvas(rx * 2 + pad * 2, ry * 2 + pad * 2 + rx * 0.35);
  const ctx = c.getContext('2d');
  const cx = c.width / 2;
  const cy = pad + ry;

  // 1 skin rim: a thick band of the enemy's own skin, torn at the edge, shaded like the
  //   end of a cylinder (lit top, dark underside); bruised purple on crushing hits
  raggedPath(ctx, cx, cy, rx, ry, K.rough + 0.02, R, 64, K.spikes);
  const skinCol = K.char ? mixHex(skin, '#1a1210', 0.75) : K.bruise ? mixHex(skin, '#5a2a4a', K.bruise * 0.55) : skin;
  const sg = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  sg.addColorStop(0, shade(skinCol, 1.15));
  sg.addColorStop(1, shade(skinCol, 0.55));
  ctx.fillStyle = sg; ctx.fill();
  ctx.lineWidth = 2.2; ctx.strokeStyle = '#140203'; ctx.stroke();

  // 2 raw torn edge where the skin parts: a dark bloody line, notched on rough cuts
  const inner = 0.76 - K.tissue * 0.25;
  raggedPath(ctx, cx, cy, rx * (inner + 0.07), ry * (inner + 0.07), K.rough * 1.2 + 0.02, R, 56, K.spikes * 0.8);
  ctx.fillStyle = K.char ? '#1e0e0a' : '#2e0406'; ctx.fill();

  // 3 fat: a thin broken layer just under the skin (thicker on thighs/torso)
  const fatR = inner + 0.03;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const a0 = R() * Math.PI * 2; const span = 0.5 + R() * 1.1;
    ctx.strokeStyle = K.char ? 'rgba(90,70,40,0.8)' : `rgba(${214 + R() * 20},${188 + R() * 20},${130 + R() * 20},0.95)`;
    ctx.lineWidth = Math.max(1.2, rx * A.fat * (0.6 + R() * 0.6));
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * fatR, ry * fatR, 0, a0, a0 + span); ctx.stroke();
  }
  ctx.restore();

  // 4 muscle: deep red face with a lit upper-left, bundles of long directional fibres
  const mR = inner - 0.02;
  raggedPath(ctx, cx, cy, rx * mR, ry * mR, K.rough * 0.7 + K.tear * 0.03, R, 48, K.spikes * 0.4);
  ctx.save();
  const mg = ctx.createRadialGradient(cx - rx * 0.25, cy - ry * 0.35, rx * 0.05, cx, cy, rx * mR * 1.05);
  if (K.char) { mg.addColorStop(0, '#5a2418'); mg.addColorStop(1, '#1a0a06'); }
  else { mg.addColorStop(0, '#c8363a'); mg.addColorStop(0.5, '#9a141a'); mg.addColorStop(1, '#4a0508'); }
  ctx.fillStyle = mg; ctx.fill();
  ctx.clip();
  const nb = A.bundles;
  const base = R() * Math.PI;
  for (let b = 0; b < nb; b++) {
    // each bundle: a wedge around the bone, fibres running one way (like a sliced steak)
    const a0 = base + (b / nb) * Math.PI * 2;
    const a1 = base + ((b + 1) / nb) * Math.PI * 2;
    const dirA = a0 + (a1 - a0) / 2 + Math.PI / 2 + (R() - 0.5) * 0.5;
    const fx = Math.cos(dirA); const fy = Math.sin(dirA) * A.flat;
    const count = Math.round(rx * 0.55);
    for (let i = 0; i < count; i++) {
      const a = lerp(a0, a1, 0.1 + R() * 0.8);
      const d = 0.3 + R() * 0.65;
      const x = cx + Math.cos(a) * rx * mR * d;
      const y = cy + Math.sin(a) * ry * mR * d;
      const len = rx * (0.12 + R() * 0.2);
      const light = R() < 0.4;
      ctx.strokeStyle = K.char ? (light ? 'rgba(120,60,40,0.5)' : 'rgba(10,4,2,0.6)') : (light ? 'rgba(226,96,90,0.55)' : 'rgba(60,4,8,0.55)');
      ctx.lineWidth = light ? 0.8 : 1.1;
      ctx.beginPath(); ctx.moveTo(x - fx * len, y - fy * len); ctx.lineTo(x + fx * len, y + fy * len); ctx.stroke();
    }
    // sinew between bundles: a pale seam from the bone out to the fat
    ctx.strokeStyle = K.char ? 'rgba(80,60,50,0.55)' : 'rgba(240,214,200,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let s = 0; s <= 5; s++) {
      const d = 0.3 + (s / 5) * 0.72;
      const w = (R() - 0.5) * 0.1;
      const x = cx + Math.cos(a0 + w) * rx * mR * d;
      const y = cy + Math.sin(a0 + w) * ry * mR * d;
      if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // torn tissue shreds hanging over the edge on rough wounds
  for (let i = 0; i < K.tear * rx * 0.35; i++) {
    const a = R() * Math.PI * 2; const d = 0.75 + R() * 0.25;
    ctx.fillStyle = R() < 0.6 ? '#3a0408' : '#c24a46';
    ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * rx * mR * d, cy + Math.sin(a) * ry * mR * d, 1.5 + R() * 2.5, 1 + R() * 1.5, a, 0, Math.PI * 2); ctx.fill();
  }

  // torso: the belly is gut, not muscle — coils of intestine in the cavity
  if (A.torso) {
    for (let i = 0; i < 5; i++) {
      const x = cx + (R() * 1.1 - 0.3) * rx * 0.55;
      const y = cy + (R() * 2 - 1) * ry * 0.35;
      const r = rx * (0.09 + R() * 0.06);
      ctx.fillStyle = '#6e1a24'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.2, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b8606a'; ctx.beginPath(); ctx.ellipse(x - r * 0.15, y - r * 0.2, r * 0.8, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,225,0.7)'; ctx.fillRect(x - r * 0.4, y - r * 0.45, Math.max(1, r * 0.35), 1);
    }
  }
  ctx.restore();

  // 5 depth: pooled blood gathers low in the wound; a tight dark recess round each bone
  ctx.save();
  raggedPath(ctx, cx, cy, rx * mR, ry * mR, 0.02, R, 32);
  ctx.clip();
  const pg = ctx.createLinearGradient(0, cy, 0, cy + ry * mR);
  pg.addColorStop(0, 'rgba(26,0,2,0)'); pg.addColorStop(0.55, 'rgba(26,0,2,0.55)'); pg.addColorStop(1, 'rgba(26,0,2,0.9)');
  ctx.fillStyle = pg; ctx.fillRect(cx - rx, cy, rx * 2, ry);
  ctx.restore();
  for (const [bx, by, br] of A.bones) {
    const x = cx + bx * rx; const y = cy + by * ry;
    const rr = br * rx * K.expose * 1.3;
    const dg = ctx.createRadialGradient(x, y, rr * 0.95, x, y, rr * 1.55);
    dg.addColorStop(0, 'rgba(18,0,0,0.9)'); dg.addColorStop(1, 'rgba(18,0,0,0)');
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.ellipse(x, y, rr * 1.55, rr * 1.55 * A.flat * 1.15, 0, 0, Math.PI * 2); ctx.fill();
  }

  // 6 neck extras: windpipe (pale ribbed ring, dark hole) at the front
  if (A.neck) {
    const x = cx + rx * 0.35; const y = cy + ry * 0.05; const r = rx * 0.16;
    ctx.fillStyle = '#e6c8c0'; ctx.beginPath(); ctx.ellipse(x, y, r, r * A.flat * 1.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a5a54'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#1a0204'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.55, r * 0.35 * A.flat * 1.2, 0, 0, Math.PI * 2); ctx.fill();
  }

  // 7 bones: the brightest thing in the wound, so it reads at a glance
  for (const [bx, by, br] of A.bones) {
    const rr = br * rx * K.expose * 1.3;
    boneSection(ctx, cx + bx * rx, cy + by * ry, rr, rr * A.flat * 1.2, K, R, kind);
    if (A.neck || A.torso) {
      // spinal canal
      ctx.fillStyle = '#240404';
      ctx.beginPath(); ctx.ellipse(cx + bx * rx - rr * 0.95, cy + by * ry, rr * 0.3, rr * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 8 blood welling over the lower rim, a couple of dark pools, wet gloss on top
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(92,2,4,0.9)';
  ctx.lineWidth = Math.max(1.5, ry * 0.18);
  const a0 = 0.35 + R() * 0.5; const a1 = Math.PI - 0.35 - R() * 0.5;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * (mR + 0.06), ry * (mR + 0.06), 0, a0, a1); ctx.stroke();
  ctx.restore();
  pools(ctx, cx, cy + ry * 0.35, rx * mR * 0.7, ry * mR * 0.3, R, 1 + Math.round(R() + K.tear));
  wetGloss(ctx, cx, cy, rx * mR, ry * mR, R, K.char ? 0.3 : 0.8);
  // runs of blood off the rim: tapered, uneven, ending in a drop
  const nDrips = 1 + Math.floor(R() * 3);
  for (let i = 0; i < nDrips; i++) {
    const a = 0.5 + R() * (Math.PI - 1);
    const x = cx + Math.cos(a) * rx * 0.9; const y = cy + Math.sin(a) * ry * 0.9;
    const len = ry * (0.25 + R() * 0.7); const w = 1 + R() * 1.6;
    ctx.fillStyle = 'rgba(100,4,6,0.92)';
    ctx.beginPath(); ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w, y + len * 0.5, x - w * 0.3, y + len * 0.7, x, y + len);
    ctx.bezierCurveTo(x + w * 0.3, y + len * 0.7, x + w, y + len * 0.5, x + w, y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + len, w * 0.75, 0, Math.PI * 2); ctx.fill();
  }
  if (K.char) {
    ctx.save();
    raggedPath(ctx, cx, cy, rx, ry, K.rough, R, 48);
    ctx.clip();
    for (let i = 0; i < rx * 2; i++) {
      ctx.fillStyle = `rgba(${10 + R() * 30},${6 + R() * 10},4,${0.25 + R() * 0.4})`;
      ctx.beginPath(); ctx.ellipse(cx + (R() * 2 - 1) * rx, cy + (R() * 2 - 1) * ry, 2 + R() * 4, 1 + R() * 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  return { canvas: c, ox: cx, oy: cy };
}

// ------------------------------------------------------------------ protruding bone

// A short stub of bone sticking out of a wound, pointing UP (-y) from its base.
export function paintBoneStub({ lenU, widthU, kind = 'clean', seed = 1 }) {
  const K = KINDS[kind] ?? KINDS.clean;
  const R = rng(seed * 104729 + 7);
  const L = lenU * S; const W = widthU * S;
  const c = canvas(W * 3 + 8, L + W + 8);
  const ctx = c.getContext('2d');
  const bx = c.width / 2; const by = c.height - 4 - W * 0.3;
  const top = by - L;
  // shaft
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bx - W / 2, by);
  ctx.lineTo(bx - W / 2 * 0.9, top + W * 0.4);
  // fractured end
  if (K.boneJag > 0.3) {
    const n = 5;
    for (let i = 0; i <= n; i++) {
      const x = lerp(bx - W / 2 * 0.9, bx + W / 2 * 0.9, i / n);
      const y = top + (i % 2 ? W * (0.5 + R() * 0.8) : -W * (0.2 + R() * 0.9));
      ctx.lineTo(x, y);
    }
  } else {
    const slope = (R() - 0.5) * W * 1.2; // angled clean break
    ctx.lineTo(bx + W / 2 * 0.9, top + W * 0.4 + slope);
  }
  ctx.lineTo(bx + W / 2, by);
  ctx.closePath();
  const g = ctx.createLinearGradient(bx - W / 2, 0, bx + W / 2, 0);
  g.addColorStop(0, '#8a7a5a'); g.addColorStop(0.3, '#f8efd6'); g.addColorStop(0.7, '#dccda6'); g.addColorStop(1, '#7a6a4a');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = '#2a1408'; ctx.stroke();
  ctx.clip();
  // marrow showing at the break
  ctx.fillStyle = '#6a1e10';
  ctx.beginPath(); ctx.ellipse(bx, top + W * 0.3, W * 0.28, W * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  // blood staining from the base upward
  const bg = ctx.createLinearGradient(0, by, 0, top);
  bg.addColorStop(0, 'rgba(120,6,6,0.95)'); bg.addColorStop(0.3, 'rgba(120,6,6,0.3)'); bg.addColorStop(0.5, 'rgba(120,6,6,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, top - W, c.width, L + W * 2);
  // wet glint along the shaft
  ctx.fillStyle = 'rgba(255,255,250,0.8)';
  ctx.fillRect(bx - W * 0.2, top + W * 0.8, 1.2, L * 0.45);
  ctx.restore();
  return { canvas: c, ox: bx, oy: by };
}

// ------------------------------------------------------------------ cut band

// A long wound strip for a straight cut through the body (waist / down the middle),
// drawn horizontally: lenU long, thickU thick. spine: bone blocks along the middle.
export function paintBand({ lenU, thickU, kind = 'clean', seed = 1, skin = '#b06a48', spine = true, guts = true }) {
  const K = KINDS[kind] ?? KINDS.clean;
  const R = rng(seed * 15485863 + 3);
  const L = lenU * S; const T = thickU * S;
  const c = canvas(L + 6, T * 1.9 + 6);
  const ctx = c.getContext('2d');
  const cy = c.height / 2; const x0 = 3; const x1 = c.width - 3;
  const edge = (side, amp) => {
    const pts = [];
    const n = Math.max(8, Math.round(L / 5));
    for (let i = 0; i <= n; i++) pts.push([lerp(x0, x1, i / n), cy + side * (T / 2 + (R() - 0.5) * amp)]);
    return pts;
  };
  const top = edge(-1, T * (0.12 + K.rough * 2));
  const bot = edge(1, T * (0.12 + K.rough * 2));
  const band = (scale) => {
    ctx.beginPath();
    top.forEach(([x, y], i) => { const yy = cy + (y - cy) * scale; if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); });
    [...bot].reverse().forEach(([x, y]) => ctx.lineTo(x, cy + (y - cy) * scale));
    ctx.closePath();
  };
  band(1); ctx.fillStyle = K.char ? mixHex(skin, '#1a1210', 0.7) : skin; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#1a0304'; ctx.stroke();
  band(0.82); ctx.fillStyle = '#3a0608'; ctx.fill();
  band(0.72); ctx.fillStyle = '#d2b47e'; ctx.fill();
  band(0.6);
  ctx.save();
  const mg = ctx.createLinearGradient(0, cy - T / 2, 0, cy + T / 2);
  mg.addColorStop(0, '#5a080c'); mg.addColorStop(0.45, '#b02a2c'); mg.addColorStop(1, '#5a080c');
  ctx.fillStyle = mg; ctx.fill();
  ctx.clip();
  // fibres run along the cut
  const reds = K.char ? ['#3a1410', '#5a2016', '#241008'] : ['#b02a2c', '#8a1418', '#cc4a44', '#6e0c12', '#d8625a'];
  for (let i = 0; i < L * 0.9; i++) {
    const x = x0 + R() * (x1 - x0); const y = cy + (R() - 0.5) * T * 0.6;
    const len = 3 + R() * 8;
    ctx.strokeStyle = reds[Math.floor(R() * reds.length)]; ctx.globalAlpha = 0.4 + R() * 0.5; ctx.lineWidth = 0.6 + R() * 0.8;
    ctx.beginPath(); ctx.moveTo(x - len, y + (R() - 0.5)); ctx.lineTo(x + len, y + (R() - 0.5)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // sinew seams
  for (let i = 0; i < L / 40; i++) {
    const x = x0 + R() * (x1 - x0);
    ctx.strokeStyle = 'rgba(236,206,192,0.7)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(x, cy - T * 0.3); ctx.quadraticCurveTo(x + 3, cy, x - 2, cy + T * 0.3); ctx.stroke();
  }
  // guts in the cavity
  if (guts) {
    for (let i = 0; i < L / 18; i++) {
      const x = x0 + (0.2 + R() * 0.6) * (x1 - x0); const y = cy + (R() - 0.5) * T * 0.3;
      const r = T * (0.12 + R() * 0.08);
      ctx.fillStyle = '#6e1a24'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b8606a'; ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 0.2, r * 0.85, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // spine / bone blocks with discs
  if (spine) {
    const bx0 = x0 + (x1 - x0) * (0.12 + R() * 0.1);
    const n = Math.max(1, Math.round(L / (T * 1.6)));
    const bw = T * 0.55;
    for (let i = 0; i < Math.min(n, 3); i++) {
      const x = bx0 + i * bw * 1.25;
      const dg = ctx.createRadialGradient(x, cy, bw * 0.4, x, cy, bw * 1.1);
      dg.addColorStop(0, 'rgba(18,0,0,0.8)'); dg.addColorStop(1, 'rgba(18,0,0,0)');
      ctx.fillStyle = dg; ctx.fillRect(x - bw * 1.2, cy - T, bw * 2.4, T * 2);
      boneSection(ctx, x, cy, bw * 0.5, bw * 0.42, K, R, kind);
    }
  }
  pools(ctx, (x0 + x1) / 2, cy, (x1 - x0) / 2, T * 0.25, R, Math.round(L / 30) + 2);
  wetGloss(ctx, (x0 + x1) / 2, cy, (x1 - x0) / 2, T * 0.28, R, 1.4);
  ctx.restore();
  // drips off the lower edge
  ctx.fillStyle = 'rgba(96,4,4,0.9)';
  for (let i = 0; i < L / 22; i++) {
    const x = x0 + R() * (x1 - x0); const y = cy + T * 0.5; const len = T * (0.2 + R() * 0.6); const w = 1 + R() * 1.8;
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); ctx.lineTo(x, y + len); ctx.closePath(); ctx.fill();
  }
  return { canvas: c, ox: c.width / 2, oy: cy };
}

// ------------------------------------------------------------------ loose pieces

// Each returns { canvas, ox, oy } with the piece centred. sizeU is roughly its length.
const PIECES = {
  // lumpy organ mass (liver/stomach-like): lobes, a membrane sheen, blood coat
  organ(R, sizeU) {
    const w = sizeU * S; const h = w * (0.55 + R() * 0.2);
    const c = canvas(w + 8, h + 8); const ctx = c.getContext('2d');
    const cx = c.width / 2; const cy = c.height / 2;
    const liver = R() < 0.5;
    const base = liver ? ['#3a0a0c', '#6a1a1c', '#8a2a28'] : ['#4a0e18', '#8a3040', '#c07078'];
    for (let i = 0; i < 3; i++) {
      raggedPath(ctx, cx + (i - 1) * w * 0.18, cy + (R() - 0.5) * h * 0.2, w * (0.3 - i * 0.03), h * 0.42, 0.08, R, 36);
      const g = ctx.createRadialGradient(cx - w * 0.15, cy - h * 0.2, 1, cx, cy, w * 0.45);
      g.addColorStop(0, base[2]); g.addColorStop(0.6, base[1]); g.addColorStop(1, base[0]);
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#1a0204'; ctx.stroke();
    }
    // veins
    ctx.strokeStyle = 'rgba(40,0,10,0.6)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx + (R() - 0.5) * w * 0.6, cy + (R() - 0.5) * h * 0.5); ctx.quadraticCurveTo(cx, cy, cx + (R() - 0.5) * w * 0.6, cy + (R() - 0.5) * h * 0.5); ctx.stroke(); }
    pools(ctx, cx, cy, w * 0.35, h * 0.3, R, 3);
    wetGloss(ctx, cx, cy, w * 0.4, h * 0.4, R, 1.3);
    return { canvas: c, ox: cx, oy: cy };
  },
  // a loop of intestine: a thick tube along a curling path, banded, wet
  gutLoop(R, sizeU) {
    const w = sizeU * S; const c = canvas(w + 12, w * 0.8 + 12); const ctx = c.getContext('2d');
    const cx = c.width / 2; const cy = c.height / 2;
    const pts = [];
    const turns = 1.2 + R() * 1.2;
    for (let i = 0; i <= 26; i++) {
      const t = i / 26; const a = t * Math.PI * 2 * turns + R() * 0.2;
      const r = w * (0.18 + 0.22 * Math.sin(t * Math.PI));
      pts.push([cx + Math.cos(a) * r + (t - 0.5) * w * 0.5, cy + Math.sin(a) * r * 0.6]);
    }
    tube(ctx, pts, w * 0.11, R);
    return { canvas: c, ox: cx, oy: cy };
  },
  // torn connective tissue: pale sinew strands with bloody meat on the ends
  sinew(R, sizeU) {
    const w = sizeU * S; const c = canvas(w + 8, w * 0.5 + 8); const ctx = c.getContext('2d');
    const cx = c.width / 2; const cy = c.height / 2;
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = i % 2 ? 'rgba(230,200,188,0.9)' : 'rgba(190,120,110,0.9)'; ctx.lineWidth = 1 + R() * 1.4;
      ctx.beginPath(); ctx.moveTo(cx - w * 0.45, cy + (R() - 0.5) * 6);
      ctx.bezierCurveTo(cx - w * 0.1, cy + (R() - 0.5) * 14, cx + w * 0.1, cy + (R() - 0.5) * 14, cx + w * 0.45, cy + (R() - 0.5) * 6); ctx.stroke();
    }
    for (const sx of [-1, 1]) {
      raggedPath(ctx, cx + sx * w * 0.42, cy, w * 0.12, w * 0.1, 0.2, R, 20, 0.2);
      ctx.fillStyle = '#8a1418'; ctx.fill(); ctx.strokeStyle = '#1a0204'; ctx.lineWidth = 1; ctx.stroke();
    }
    wetGloss(ctx, cx, cy, w * 0.4, w * 0.12, R, 0.8);
    return { canvas: c, ox: cx, oy: cy };
  },
  // a chunk of meat: fibres, a strip of skin + fat on one side
  meat(R, sizeU, skin) {
    const w = sizeU * S; const h = w * (0.55 + R() * 0.3);
    const c = canvas(w + 8, h + 8); const ctx = c.getContext('2d');
    const cx = c.width / 2; const cy = c.height / 2;
    raggedPath(ctx, cx, cy, w * 0.45, h * 0.45, 0.14, R, 30, 0.12);
    ctx.fillStyle = skin; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#1a0204'; ctx.stroke();
    raggedPath(ctx, cx + 1, cy + h * 0.06, w * 0.4, h * 0.36, 0.14, R, 30);
    ctx.fillStyle = '#d0b07a'; ctx.fill();
    raggedPath(ctx, cx + 1.5, cy + h * 0.1, w * 0.36, h * 0.3, 0.16, R, 30, 0.1);
    ctx.save(); ctx.fillStyle = '#9a1c20'; ctx.fill(); ctx.clip();
    const ang = R() * Math.PI;
    for (let i = 0; i < w; i++) {
      const x = cx + (R() - 0.5) * w * 0.7; const y = cy + (R() - 0.5) * h * 0.6; const l = 2 + R() * 4;
      ctx.strokeStyle = ['#c23a3a', '#6e0c12', '#d8625a', '#8a1418'][Math.floor(R() * 4)]; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * l, y - Math.sin(ang) * l); ctx.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); ctx.stroke();
    }
    ctx.restore();
    wetGloss(ctx, cx, cy, w * 0.3, h * 0.25, R, 0.8);
    return { canvas: c, ox: cx, oy: cy };
  },
  // splintered bone shard
  boneShard(R, sizeU) {
    const w = sizeU * S; const c = canvas(w + 8, w * 0.5 + 8); const ctx = c.getContext('2d');
    const cx = c.width / 2; const cy = c.height / 2;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.45, cy - w * 0.06); ctx.lineTo(cx + w * 0.2, cy - w * 0.1);
    ctx.lineTo(cx + w * 0.45, cy - w * 0.02 + (R() - 0.5) * 6); ctx.lineTo(cx + w * 0.3, cy + w * 0.04);
    ctx.lineTo(cx + w * 0.38, cy + w * 0.1); ctx.lineTo(cx - w * 0.4, cy + w * 0.08); ctx.closePath();
    const g = ctx.createLinearGradient(0, cy - w * 0.1, 0, cy + w * 0.1);
    g.addColorStop(0, '#fbf3dc'); g.addColorStop(1, '#9c8a66');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.1; ctx.strokeStyle = '#2a1408'; ctx.stroke();
    ctx.fillStyle = 'rgba(120,6,6,0.8)'; ctx.fillRect(cx - w * 0.45, cy - w * 0.05, w * 0.18, w * 0.12);
    ctx.fillStyle = '#6a1e10'; ctx.fillRect(cx + w * 0.3, cy - w * 0.02, 2, 2);
    return { canvas: c, ox: cx, oy: cy };
  },
  // curved plate of skull, scalp and hair on the outside, bloody inside
  skullShard(R, sizeU, skin) {
    const w = sizeU * S; const c = canvas(w + 8, w * 0.7 + 8); const ctx = c.getContext('2d');
    const cx = c.width / 2; const cy = c.height / 2 + w * 0.1;
    ctx.beginPath(); ctx.arc(cx, cy + w * 0.2, w * 0.45, Math.PI * 1.1, Math.PI * 1.9);
    ctx.arc(cx, cy + w * 0.2, w * 0.3, Math.PI * 1.9, Math.PI * 1.1, true); ctx.closePath();
    ctx.fillStyle = '#e6d8b8'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#2a1408'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + w * 0.2, w * 0.45, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = 3; ctx.strokeStyle = skin; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + w * 0.2, w * 0.31, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7a0a0a'; ctx.stroke();
    return { canvas: c, ox: cx, oy: cy };
  },
  eyeball(R, sizeU) {
    const w = sizeU * S; const c = canvas(w * 2 + 8, w + 8); const ctx = c.getContext('2d');
    const cx = c.width / 2 - w * 0.3; const cy = c.height / 2;
    // optic nerve trailing
    ctx.strokeStyle = '#a04a4a'; ctx.lineWidth = w * 0.18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + w * 0.8, cy + w * 0.3, cx + w * 1.2, cy - w * 0.1); ctx.stroke();
    const g = ctx.createRadialGradient(cx - w * 0.15, cy - w * 0.15, 1, cx, cy, w * 0.5);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c8b8a8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, w * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#3a1a10'; ctx.stroke();
    ctx.strokeStyle = 'rgba(180,20,20,0.7)'; ctx.lineWidth = 0.6;
    for (let i = 0; i < 4; i++) { const a = R() * 6.28; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * w * 0.44, cy + Math.sin(a) * w * 0.44); ctx.lineTo(cx + Math.cos(a) * w * 0.2, cy + Math.sin(a + 0.3) * w * 0.2); ctx.stroke(); }
    ctx.fillStyle = '#3a5a3a'; ctx.beginPath(); ctx.arc(cx - w * 0.18, cy, w * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(cx - w * 0.2, cy, w * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - w * 0.25, cy - w * 0.12, 1.5, 1.5);
    return { canvas: c, ox: cx, oy: cy };
  },
};

// A wet intestine tube along points (used by gutLoop and by the live gut ropes).
export function tube(ctx, pts, r, R = Math.random) {
  if (pts.length < 2) return;
  const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  path(); ctx.strokeStyle = '#1e0306'; ctx.lineWidth = r * 2 + 2.4; ctx.stroke();
  path(); ctx.strokeStyle = '#6a1822'; ctx.lineWidth = r * 2; ctx.stroke();
  ctx.translate(-r * 0.15, -r * 0.3);
  path(); ctx.strokeStyle = '#a8505a'; ctx.lineWidth = r * 1.15; ctx.stroke();
  ctx.translate(-r * 0.1, -r * 0.25);
  path(); ctx.strokeStyle = 'rgba(236,180,186,0.8)'; ctx.lineWidth = Math.max(0.8, r * 0.3); ctx.stroke();
  ctx.restore();
  // bands (the tube's segments) and blood coating
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    acc += seg;
    if (acc > r * 1.6) {
      acc = 0;
      const nx = -(y1 - y0) / (seg || 1); const ny = (x1 - x0) / (seg || 1);
      ctx.strokeStyle = 'rgba(40,4,10,0.7)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(x1 + nx * r * 0.9, y1 + ny * r * 0.9); ctx.lineTo(x1 - nx * r * 0.9, y1 - ny * r * 0.9); ctx.stroke();
    }
    if (R() < 0.25) { ctx.fillStyle = 'rgba(110,4,4,0.8)'; ctx.beginPath(); ctx.arc(x1, y1 + r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill(); }
  }
}

// ------------------------------------------------------------------ texture cache

const cache = new Map();
function register(scene, key, painted, extra = {}) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, painted.canvas).setFilter(Phaser.Textures.FilterMode.LINEAR);
  const v = { key, w: painted.canvas.width, h: painted.canvas.height, ox: painted.ox, oy: painted.oy, scale: 1 / S, ...extra };
  cache.set(key, v);
  return v;
}

const bucket = (u) => Math.max(4, Math.round(u / 2) * 2); // size buckets keep the cache small

export function woundTex(scene, { widthU, part, kind, variant, skin }) {
  const w = bucket(widthU);
  const key = `wound-${part}-${kind}-${w}-${variant % VARIANTS}-${skin}`;
  return cache.get(key) ?? register(scene, key, paintWound({ widthU: w, part, kind, seed: variant % VARIANTS + 1, skin }));
}

export function boneStubTex(scene, { widthU, kind, variant }) {
  const w = bucket(widthU);
  const key = `bonestub-${kind}-${w}-${variant % VARIANTS}`;
  const len = w * (0.35 + (variant % 3) * 0.08) * (kind === 'heavy' ? 1.25 : 1);
  return cache.get(key) ?? register(scene, key, paintBoneStub({ lenU: len, widthU: Math.max(2.2, w * 0.3), kind, seed: variant + 1 }));
}

export function bandTex(scene, { lenU, thickU, kind, variant, skin, spine = true, guts = true }) {
  const key = `band-${kind}-${bucket(lenU)}-${bucket(thickU)}-${variant % VARIANTS}-${skin}-${spine ? 1 : 0}${guts ? 1 : 0}`;
  return cache.get(key) ?? register(scene, key, paintBand({ lenU: bucket(lenU), thickU: bucket(thickU), kind, seed: variant + 1, skin, spine, guts }));
}

// Loose pieces: 'organ' | 'gutLoop' | 'sinew' | 'meat' | 'boneShard' | 'skullShard' | 'eyeball'
const PIECE_SIZE = { organ: 12, gutLoop: 16, sinew: 12, meat: 8, boneShard: 9, skullShard: 9, eyeball: 4 };
export function pieceTex(scene, type, variant, skin = '#b06a48') {
  const key = `piece-${type}-${variant % 6}-${skin}`;
  if (cache.has(key)) return cache.get(key);
  const R = rng((variant % 6 + 1) * 6151 + type.length * 97);
  const size = PIECE_SIZE[type] * (0.8 + R() * 0.45);
  return register(scene, key, PIECES[type](R, size, skin));
}

// Pre-paint the common variants at boot so the first kill doesn't hitch.
export function warmGore(scene) {
  for (const t of Object.keys(PIECE_SIZE)) for (let v = 0; v < 6; v++) pieceTex(scene, t, v);
  for (const kind of ['clean', 'heavy', 'crush']) {
    for (let v = 0; v < VARIANTS; v++) {
      woundTex(scene, { widthU: 14, part: 'upperArm', kind, variant: v, skin: '#b06a48' });
      woundTex(scene, { widthU: 18, part: 'thigh', kind, variant: v, skin: '#b06a48' });
      boneStubTex(scene, { widthU: 14, kind, variant: v });
    }
  }
}
