// MageHover.js — The Mage's hover, dressed up on top of his painted strips
// (view/StripHeroView.js): only the picture, nothing here touches the fight.
//
//   - cloth: a WebGL shader ripples the painted cape and robe hem, a wave running down
//     the cloth and out along its tattered back edge, harder as he glides. His staff,
//     boots and lantern are found in each frame and left still, so only cloth moves.
//   - the float itself: a layered drift instead of one sine (a slow swell under a
//     quicker bob), a little sway with it, and the floor shadow breathing with height.
//   - magic: a slow-turning rune circle on the floor under him, a glow at his boots,
//     motes rising through the updraft under his hem, and the lantern breathing light
//     and shedding sparks.
//
// All of it fades in while he hovers (idle / gliding) and out for everything else, so
// attacks, spells and finishers look exactly as before. On the canvas renderer the cloth
// shader is skipped; the rest still runs.

import { DEPTH } from '../view/depths.js';

const TAU = Math.PI * 2;
const PIPE = 'MageCloth';
const HOVER_STATES = new Set(['idle', 'walk']);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// ---------------------------------------------------------------- cloth shader

const FRAG = `
#define SHADER_NAME MAGE_CLOTH_FS
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform vec4 uFrame;   // the frame's uv rect (u0, v0, u1, v1)
uniform vec4 uBox;     // the figure inside it, 0..1 of the frame (x0, y0, x1, y1)
uniform vec2 uSize;    // the frame's size in texels
uniform vec2 uStaff;   // staff column (0..1 of the frame; < 0 = none), half width in texels
uniform float uTime;
uniform float uAmp;    // ripple, texels
uniform float uWind;   // extra streaming back, texels
uniform float uSide;   // 1 = side view (the cape trails left in the art), 0 = front / back
varying vec2 outTexCoord;
varying float outTintEffect;
varying vec4 outTint;

void main ()
{
    vec2 lp = (outTexCoord - uFrame.xy) / (uFrame.zw - uFrame.xy);
    vec2 bp = (lp - uBox.xy) / max(vec2(1e-3), uBox.zw - uBox.xy); // 0..1 over the figure
    // where the cloth hangs free: from the waist down, most at the trailing back edge
    float below = smoothstep(0.32, 0.98, bp.y);
    float back = mix(0.55, 1.0 - smoothstep(0.28, 0.66, bp.x), uSide);
    float front = mix(0.12, 1.0, back);
    // the staff stays put (with a margin wider than the ripple, so it's never smeared)
    float staff = 1.0;
    if (uStaff.x >= 0.0) {
        float d = abs(lp.x - uStaff.x) * uSize.x;
        staff = smoothstep(uStaff.y, uStaff.y + 2.5 * (uAmp + uWind) + 2.0, d);
    }
    float w = below * front * staff;
    // a wave running down and back through the cloth, a second, quicker one over it
    float ph = uTime * 2.3 - bp.y * 10.0 + bp.x * 6.0;
    float ph2 = uTime * 3.7 - bp.y * 17.0 - bp.x * 4.0;
    float gust = 0.5 + 0.5 * sin(uTime * 0.83 + bp.y * 3.0);
    vec2 off = vec2(
        (sin(ph) * 0.75 + sin(ph2) * 0.25) * uAmp + gust * uWind * (0.4 + 0.6 * back),
        cos(ph * 0.9 + 1.3) * uAmp * 0.3
    ) * w;
    vec2 uv = outTexCoord + off / uSize * (uFrame.zw - uFrame.xy);
    vec2 px = (uFrame.zw - uFrame.xy) / uSize;
    uv = clamp(uv, uFrame.xy + px * 0.5, uFrame.zw - px * 0.5);
    vec4 texture = texture2D(uMainSampler, uv);
    vec4 texel = vec4(outTint.bgr * outTint.a, outTint.a);
    vec4 color = texture * texel;
    if (outTintEffect == 1.0)
    {
        color.rgb = mix(texture.rgb, outTint.bgr * outTint.a, texture.a);
    }
    else if (outTintEffect == 2.0)
    {
        color = texel;
    }
    gl_FragColor = color;
}
`;

// One sprite per batch: its uniforms are set, it's drawn, the batch is closed.
function clothPipeline(game) {
  const Single = Phaser.Renderer.WebGL.Pipelines.SinglePipeline;
  class MageClothPipeline extends Single {
    constructor() { super({ game, name: PIPE, fragShader: FRAG }); }
    batchSprite(go, camera, parent) {
      const c = go.cloth;
      this.flush();
      if (c) {
        const fr = go.frame;
        this.set4f('uFrame', fr.u0, fr.v0, fr.u1, fr.v1);
        this.set4f('uBox', c.box[0], c.box[1], c.box[2], c.box[3]);
        this.set2f('uSize', fr.cutWidth, fr.cutHeight);
        this.set2f('uStaff', c.staff, c.staffHalf);
        this.set1f('uTime', c.time);
        this.set1f('uAmp', c.amp);
        this.set1f('uWind', c.wind);
        this.set1f('uSide', c.side);
      }
      super.batchSprite(go, camera, parent);
      this.flush();
    }
  }
  return new MageClothPipeline();
}

function ensurePipeline(scene) {
  const r = scene.sys.renderer;
  if (!r || r.type !== Phaser.WEBGL || !Phaser.Renderer?.WebGL?.Pipelines?.SinglePipeline) return false;
  try {
    if (!r.pipelines.has(PIPE)) r.pipelines.add(PIPE, clothPipeline(scene.sys.game));
    return true;
  } catch (err) {
    console.warn('[mage] cloth shader unavailable', err);
    return false;
  }
}

// ---------------------------------------------------------------- frame reading

// What's where in one painted frame (texels of the frame): the figure's box, the staff's
// column, the lantern. Read once per frame from the cut strip's canvas, then cached.
const frameInfo = new Map();
function readFrame(tex, frameName) {
  const key = `${tex.key}:${frameName}`;
  if (frameInfo.has(key)) return frameInfo.get(key);
  let info = null;
  try {
    const fr = tex.get(frameName);
    const src = tex.getSourceImage();
    const W = fr.cutWidth; const H = fr.cutHeight;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(src, fr.cutX, fr.cutY, W, H, 0, 0, W, H);
    const d = cx.getImageData(0, 0, W, H).data;
    let x0 = W; let y0 = H; let x1 = 0; let y1 = 0;
    const wood = new Float32Array(W);
    let lx = 0; let ly = 0; let ln = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (d[i + 3] < 40) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const r = d[i]; const g = d[i + 1]; const b = d[i + 2];
        // the lantern: hot orange-yellow light
        if (r > 200 && g > 90 && b < 110 && r - b > 120) { lx += x; ly += y; ln++; }
        // staff wood: a dull warm brown (not the bright gold trim, not the navy cloth)
        if (r > b + 22 && g > b + 4 && r < 185 && r > 45 && g < 140) wood[x]++;
      }
    }
    if (x1 > x0) {
      // the staff: the column with the most wood in it, if it really is a long run
      let best = 0; let bx = -1;
      for (let x = 1; x < W - 1; x++) { const s = wood[x - 1] + wood[x] + wood[x + 1]; if (s > best) { best = s; bx = x; } }
      let staff = -1; let staffHalf = 0;
      if (bx >= 0 && best / 3 > (y1 - y0) * 0.35) {
        let a = bx; let b = bx;
        while (a > 0 && wood[a - 1] > best / 3 * 0.35) a--;
        while (b < W - 1 && wood[b + 1] > best / 3 * 0.35) b++;
        staff = (a + b) / 2 / W;
        staffHalf = Math.min(14, (b - a) / 2 + 2);
      }
      info = {
        W, H,
        box: [x0 / W, y0 / H, x1 / W, y1 / H],
        staff, staffHalf,
        lantern: ln > 6 ? { x: lx / ln, y: ly / ln } : null,
        feet: { x: (x0 + x1) / 2, y: y1 },
      };
    }
  } catch (err) {
    info = null;
  }
  frameInfo.set(key, info);
  return info;
}

// ---------------------------------------------------------------- the hover

export class MageHover {
  constructor(scene, view) {
    this.scene = scene;
    this.view = view;
    this.f = view.f;
    this.shader = ensurePipeline(scene);
    this.k = 0;          // how much he's hovering right now (eased 0..1)
    this.t = Math.random() * 100;
    this.sway = 0;
    this.lastLift = 0;
    this.speedK = 0;
    this.motes = [];
    this.sparks = [];
    this.floor = scene.add.graphics().setDepth(DEPTH.shadows + 1).setBlendMode(Phaser.BlendModes.ADD);
    this.back = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.front = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  }

  // The float: a slow swell under a quicker bob (px, up = positive) and a little sway
  // (degrees) that follows it. Called by the view before it places the sprite.
  motion(downed) {
    const H = this.f.stats.hover;
    const t = this.t;
    const r = H.driftRate;
    const lift = downed ? 0 : Math.sin(t * r) * H.drift + Math.sin(t * r * 0.47 + 1.7) * H.drift * 0.55 + Math.sin(t * r * 2.3) * H.drift * 0.12;
    const v = lift - this.lastLift;
    this.lastLift = lift;
    this.sway += (Math.sin(t * r * 0.47 + 0.4) * 0.9 - v * 2 - this.sway) * 0.08;
    return { lift, sway: this.sway * this.k, rising: v };
  }

  update(sprite, ref, downed) {
    const f = this.f;
    const st = f.state;
    const frozen = f.hitstop > 0;
    if (!frozen) this.t += 1;
    const on = HOVER_STATES.has(st) && !downed && !f.sprinting && sprite.visible && ref !== null;
    this.k += ((on ? 1 : 0) - this.k) * (on ? 0.08 : 0.25);
    const speed = clamp01(Math.hypot(f.vx, f.vz) / Math.max(1, f.stats.walkSpeed));
    this.speedK += ((st === 'walk' ? speed : 0) - this.speedK) * 0.06;

    // ---- the cloth (the strip and its view decide which way the art faces)
    const strip = ref ? ref.split(':')[0] : '';
    const info = ref ? readFrame(sprite.texture, sprite.frame.name) : null;
    if (this.shader && on && info && this.k > 0.02) {
      sprite.cloth = {
        box: info.box, staff: info.staff, staffHalf: info.staffHalf,
        time: this.t / 60,
        amp: (2.2 + this.speedK * 1.4) * this.k * 2,
        wind: (0.6 + this.speedK * 4.5) * this.k * 2,
        side: strip === 'hoverU' || strip === 'hoverD' ? 0 : 1,
      };
      if (sprite.pipeline?.name !== PIPE) sprite.setPipeline(PIPE);
    } else if (sprite.cloth) {
      sprite.cloth = null;
      sprite.resetPipeline();
    }

    this.draw(sprite, info);
  }

  // frame texel -> world
  toWorld(sprite, x, y) {
    const ox = sprite.displayOriginX; const oy = sprite.displayOriginY;
    const lx = (x - ox) * sprite.scaleX; const ly = (y - oy) * sprite.scaleY;
    const a = sprite.rotation;
    return { x: sprite.x + lx * Math.cos(a) - ly * Math.sin(a), y: sprite.y + lx * Math.sin(a) + ly * Math.cos(a) };
  }

  draw(sprite, info) {
    const f = this.f;
    const k = this.k;
    const fl = this.floor; const bk = this.back; const fr = this.front;
    fl.clear(); bk.clear(); fr.clear();
    bk.setDepth(f.z - 0.3); fr.setDepth(f.z + 0.3);
    const alpha = sprite.alpha;
    const frozen = f.hitstop > 0;
    const t = this.t;
    const s = Math.abs(sprite.scaleX) * this.view.sheet.res; // world scale (depth)

    // ---- the rune circle on the floor, turning slowly, brighter as he sinks
    if (k > 0.02) {
      const gx = f.x; const gy = f.z;
      const near = 0.75 + 0.25 * Math.sin(t * f.stats.hover.driftRate + Math.PI);
      const a0 = k * alpha * (0.42 + 0.18 * near);
      const R = 26 * s; const sq = 0.3;
      fl.lineStyle(1.6, 0xff7a2a, 0.45 * a0).strokeEllipse(gx, gy, R * 2, R * 2 * sq);
      fl.lineStyle(1, 0xffc070, 0.35 * a0).strokeEllipse(gx, gy, R * 1.55, R * 1.55 * sq);
      fl.lineStyle(1, 0x8090ff, 0.22 * a0).strokeEllipse(gx, gy, R * 2.3, R * 2.3 * sq);
      // runes: little ticks and dots spaced round the ring, turning
      const rot = t * 0.012;
      for (let i = 0; i < 12; i++) {
        const an = rot + (i * TAU) / 12;
        const c = Math.cos(an); const sn = Math.sin(an);
        const r0 = R * 0.8; const r1 = R * 0.98;
        const p0 = { x: gx + c * r0, y: gy + sn * r0 * sq };
        const p1 = { x: gx + c * r1, y: gy + sn * r1 * sq };
        if (i % 3 === 0) fl.fillStyle(0xffd890, 0.6 * a0).fillCircle(p1.x, p1.y, 1.3);
        else fl.lineStyle(1.2, 0xffa050, 0.5 * a0).lineBetween(p0.x, p0.y, p1.x, p1.y);
      }
      // an inner star turning the other way
      const rot2 = -t * 0.02;
      fl.lineStyle(1, 0xffb060, 0.3 * a0);
      for (let i = 0; i < 5; i++) {
        const a1 = rot2 + (i * TAU) / 5; const a2 = rot2 + ((i + 2) * TAU) / 5;
        const r = R * 0.74;
        fl.lineBetween(gx + Math.cos(a1) * r, gy + Math.sin(a1) * r * sq, gx + Math.cos(a2) * r, gy + Math.sin(a2) * r * sq);
      }
      // the soft pool of light in the middle
      fl.fillStyle(0xff6a20, 0.1 * a0).fillEllipse(gx, gy, R * 1.5, R * 1.5 * sq);
      fl.fillStyle(0xffa050, 0.08 * a0).fillEllipse(gx, gy, R * 0.8, R * 0.8 * sq);
    }

    if (!info) { this.tickParticles(frozen, alpha); return; }

    // ---- the glow under his boots and the updraft between him and the floor
    const feet = this.toWorld(sprite, info.feet.x, info.feet.y);
    if (k > 0.02) {
      const pulse = 0.8 + 0.2 * Math.sin(t * 0.09);
      fr.fillStyle(0xff7a30, 0.12 * k * alpha * pulse).fillEllipse(feet.x, feet.y + 2, 26 * s, 9 * s);
      fr.fillStyle(0xffc080, 0.1 * k * alpha * pulse).fillEllipse(feet.x, feet.y + 1, 12 * s, 4 * s);
      // a faint column of light from the circle up to his hem
      const gap = f.z - feet.y;
      if (gap > 2) {
        for (let i = 0; i < 4; i++) {
          const yy = feet.y + (gap * i) / 4;
          fl.fillStyle(0xff8a40, 0.04 * k * alpha).fillEllipse(f.x, yy, (22 - i * 2) * s, 5 * s);
        }
      }
      if (!frozen && Math.random() < 0.3 * k) {
        const front = Math.random() < 0.5;
        this.motes.push({
          x: f.x + (Math.random() - 0.5) * 34 * s, y: f.z + (Math.random() - 0.3) * 4, z: front,
          vx: (Math.random() - 0.5) * 0.3 - f.vx * 0.002, vy: -(0.5 + Math.random() * 0.8),
          life: 0, max: 40 + Math.random() * 40, top: feet.y - 30 * s - Math.random() * 30 * s,
          c: Math.random() < 0.65 ? 0xffa040 : Math.random() < 0.6 ? 0xffe0a0 : 0x8a9cff, r: 0.6 + Math.random() * 0.8,
        });
      }
    }

    // ---- the lantern: breathing light and the odd spark lifting off it
    if (info.lantern && k > 0.02) {
      const L = this.toWorld(sprite, info.lantern.x, info.lantern.y);
      const flick = 0.85 + Math.sin(t * 0.21) * 0.08 + Math.sin(t * 0.63) * 0.05 + (Math.random() - 0.5) * 0.05;
      const a0 = k * alpha * flick;
      // the wide halo goes behind him (a rim of light, not a wash over his face)
      bk.fillStyle(0xff4a10, 0.12 * a0).fillCircle(L.x, L.y, 18 * s);
      bk.fillStyle(0xff7a20, 0.12 * a0).fillCircle(L.x, L.y, 11 * s);
      fr.fillStyle(0xff8a30, 0.1 * a0).fillCircle(L.x, L.y, 7 * s);
      fr.fillStyle(0xffd890, 0.14 * a0).fillCircle(L.x, L.y, 3.5 * s);
      if (!frozen && Math.random() < 0.12 * k) {
        this.sparks.push({ x: L.x + (Math.random() - 0.5) * 8 * s, y: L.y - 4 * s, vx: (Math.random() - 0.5) * 0.5 - f.vx * 0.003, vy: -(0.4 + Math.random() * 0.7), life: 0, max: 30 + Math.random() * 30 });
      }
    }
    this.tickParticles(frozen, alpha);
  }

  tickParticles(frozen, alpha) {
    const bk = this.back; const fr = this.front;
    const t = this.t;
    this.motes = this.motes.filter((m) => {
      if (!frozen) { m.life++; m.x += m.vx + Math.sin((t + m.max) * 0.08) * 0.2; m.y += m.vy; }
      const u = m.life / m.max;
      if (u >= 1 || m.y < m.top) return false;
      const a = Math.sin(u * Math.PI) * 0.65 * alpha;
      (m.z ? fr : bk).fillStyle(m.c, a).fillCircle(m.x, m.y, m.r);
      (m.z ? fr : bk).fillStyle(m.c, a * 0.18).fillCircle(m.x, m.y, m.r * 2.4);
      return true;
    });
    this.sparks = this.sparks.filter((p) => {
      if (!frozen) { p.life++; p.x += p.vx + Math.sin((t + p.max) * 0.15) * 0.25; p.y += p.vy; p.vy *= 0.985; }
      const u = p.life / p.max;
      if (u >= 1) return false;
      const a = (1 - u) * 0.9 * alpha;
      fr.fillStyle(u < 0.4 ? 0xffe0a0 : 0xff7a30, a).fillCircle(p.x, p.y, 1.1 * (1 - u * 0.5));
      return true;
    });
  }

  destroy() {
    this.floor.destroy();
    this.back.destroy();
    this.front.destroy();
  }
}
