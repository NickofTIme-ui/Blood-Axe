// dye.js — Recolours an enemy's clothes as he's drawn, so a wave of the same kind isn't
// a row of twins (data/enemies.js `variety.dyes`, rolled in entities/Enemy.js vary()).
//
// A WebGL shader shifts only the painted cloth: the olive-green band the Legion's rags
// are painted in. Rusted armour, steel, leather and blood sit outside that band and keep
// their colour; the grey-green skin moves a little with the cloth (they're the dead).
// No new textures, so a dye costs no memory. On the canvas renderer there's no shader and
// every man is drawn as painted (his size and pace still vary).

const PIPE = 'EnemyDye';
const NO_DYE = { hue: 0, sat: 1, val: 1 };

// The cloth band, in degrees of hue: centre, half width, soft edge. Pixels greyer than
// SAT_MIN (steel, bone) are left alone.
const BAND = { centre: 66, half: 30, soft: 12, satMin: 0.16, satSoft: 0.12 };

// name -> hue shift (degrees), saturation x, brightness x
export const DYES = {
  crimson: { hue: -66, sat: 1.15, val: 1.0 },
  frost: { hue: 150, sat: 0.9, val: 1.05 },
  violet: { hue: -150, sat: 1.0, val: 1.0 },
  ash: { hue: 0, sat: 0.12, val: 0.95 },
  rust: { hue: -40, sat: 1.1, val: 0.95 },
  moss: { hue: 70, sat: 1.0, val: 1.0 },
};

const FRAG = `
#define SHADER_NAME ENEMY_DYE_FS
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform vec3 uDye;   // hue shift (0..1 of a turn), saturation x, brightness x
uniform vec4 uBand;  // centre, half width, soft edge (0..1 of a turn), min saturation
uniform float uSatSoft;
varying vec2 outTexCoord;
varying float outTintEffect;
varying vec4 outTint;

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main ()
{
    vec4 texture = texture2D(uMainSampler, outTexCoord);
    if (texture.a > 0.0) {
        vec3 rgb = texture.rgb / texture.a; // (premultiplied)
        vec3 hsv = rgb2hsv(rgb);
        float dist = abs(hsv.x - uBand.x);
        float w = clamp((uBand.y + uBand.z - dist) / uBand.z, 0.0, 1.0)
                * clamp((hsv.y - uBand.w) / uSatSoft, 0.0, 1.0);
        if (w > 0.0) {
            hsv.x = fract(hsv.x + uDye.x * w);
            hsv.y = clamp(hsv.y * (1.0 + (uDye.y - 1.0) * w), 0.0, 1.0);
            hsv.z = clamp(hsv.z * (1.0 + (uDye.z - 1.0) * w), 0.0, 1.0);
            texture.rgb = hsv2rgb(hsv) * texture.a;
        }
    }
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

// Men in the same dye share a batch: the batch is closed only when the dye changes (the
// dye is a uniform, so every image in one batch must wear the same one). Changing to or
// from another pipeline closes the batch anyway.
function dyePipeline(game) {
  const Single = Phaser.Renderer.WebGL.Pipelines.SinglePipeline;
  class EnemyDyePipeline extends Single {
    constructor() { super({ game, name: PIPE, fragShader: FRAG }); this.dyeOn = null; }
    batchSprite(go, camera, parent) {
      const d = DYES[go.dye] ?? NO_DYE;
      if (d !== this.dyeOn) this.flush();
      this.dyeOn = d;
      // (unchanged values cost nothing: the shader remembers what it was last given)
      this.set3f('uDye', d.hue / 360, d.sat, d.val);
      this.set4f('uBand', BAND.centre / 360, BAND.half / 360, BAND.soft / 360, BAND.satMin);
      this.set1f('uSatSoft', BAND.satSoft);
      super.batchSprite(go, camera, parent);
    }
  }
  return new EnemyDyePipeline();
}

function ensurePipeline(scene) {
  const r = scene.sys.renderer;
  if (!r || r.type !== Phaser.WEBGL || !Phaser.Renderer?.WebGL?.Pipelines?.SinglePipeline) return false;
  try {
    if (!r.pipelines.has(PIPE)) r.pipelines.add(PIPE, dyePipeline(scene.sys.game));
    return true;
  } catch (err) {
    console.warn('[dye] shader unavailable', err);
    return false;
  }
}

// Draw this image (his sprite, a ragdoll part, a cut-off piece of him) in his dye.
// Returns the image. No dye, or no WebGL: as painted.
export function dyeImage(scene, img, dye) {
  if (!img || !dye || !DYES[dye] || !ensurePipeline(scene)) return img;
  img.dye = dye;
  img.setPipeline(PIPE);
  return img;
}
