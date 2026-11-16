"""bake-oryn-strips.py: bake Oryn's second set of ChatGPT strips (16 Nov 2026,
docs/mage-art-prompts.md section 13; originals in art-incoming/oryn-second-set/) into
the HD sheet format (tools/bake-vexa-strip.py does the cutting: 416 x 480 cells, feet on
y 459). Every strip gets ONE scale, measured off the grab strip's first pose (standing tall,
staff upright), sized to his idle (oryn-mage-idle pose 0), so he is the same size in all.
ChatGPT drew his staff head as a red-gold lantern; his HD sheets have the blue arcane orb,
so the bright, saturated reds and oranges (the glow, not the bronze) are turned blue-violet.

  python tools/bake-oryn-strips.py
"""
import importlib.util, os
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('bv', os.path.join(here, 'bake-vexa-strip.py'))
bv = importlib.util.module_from_spec(spec); spec.loader.exec_module(bv)
root = os.path.dirname(here)


def cut(path, n):
    """bake-vexa-strip's cut, except that when two poses touch, the widest run of ink is split
    at its thinnest column (his block strip's first two poses touch at the robe hem; the
    general split_touching then tore the fall in half)."""
    im = Image.open(path).convert('RGBA'); W, H = im.size
    bg = bv.background(im)
    ink = [sum(1 for y in range(H) if not bg[y * W + x]) for x in range(W)]
    runs, s0 = [], None
    for x, c in enumerate(ink + [0]):
        if c and s0 is None: s0 = x
        if not c and s0 is not None: runs.append([s0, x - 1]); s0 = None
    runs = [r for r in runs if r[1] - r[0] > 3]
    if len(runs) >= n: return bv_cut(path, n)
    while len(runs) < n:
        r = max(runs, key=lambda r: r[1] - r[0]); w = r[1] - r[0]
        x = min(range(r[0] + w // 5, r[1] - w // 5), key=lambda x: ink[x])
        runs.remove(r); runs += [[r[0], x], [x + 1, r[1]]]; runs.sort()
    figs = []
    for x0, x1 in runs:
        fig = im.crop((x0, 0, x1 + 1, H)); l, t, r, b = fig.getbbox()
        figs.append((fig.crop((l, t, r, b)), x0 + l, t))
    return figs


bv_cut, bv.cut = bv.cut, cut
SRC = os.path.join(root, 'art-incoming', 'oryn-second-set')
STRIPS = {'updraft': 6, 'skyfall': 6, 'meteor': 4, 'jab': 6, 'twirl': 6, 'vault': 6, 'grab': 8, 'block': 8, 'finSpires': 8}
# (the sheets are listed in src/data/orynArt.js)

def arcane(path):
    import numpy as np
    im = Image.open(path).convert('RGBA'); a = np.asarray(im).astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a[..., :3].max(-1), a[..., :3].min(-1); sat = (mx - mn) / np.maximum(mx, 1e-6)
    warm = (r >= g) & (r > b) & (r == mx)
    k = np.clip((sat - 0.45) / 0.2, 0, 1) * np.clip((mx - 0.45) / 0.2, 0, 1) * warm  # the glow only
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    blue = np.stack([0.45 * lum + 0.25 * mx * (g / np.maximum(r, 1e-6)), 0.55 * lum + 0.3 * mx * (g / np.maximum(r, 1e-6)), np.minimum(1, mx * 1.05)], -1)
    a[..., :3] = a[..., :3] * (1 - k[..., None]) + blue * k[..., None]
    Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(path, optimize=True)


idle = Image.open(os.path.join(root, 'assets/sprites/heroes-hd/oryn-mage-idle.png')).crop((0, 0, 416, 480))
l, t, r, b = idle.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox()
guard = bv.cut(os.path.join(SRC, 'mage_grab.png'), 8)[0][0]
scale = (b - t) / guard.size[1] * 1.08  # (his hood sits lower under the lantern than under the orb)
print('idle', b - t, 'px; guard', guard.size[1], 'px; scale', round(scale, 3))
for name, n in STRIPS.items():
    src = os.path.join(SRC, f'mage_{name}.png')
    figs = bv.cut(src, n)
    tall = round(figs[0][0].size[1] * scale)
    out = os.path.join(root, f'assets/sprites/heroes-hd/oryn-mage-{name}.png')
    bv.bake(src, out, n, 0, tall)
    arcane(out)
