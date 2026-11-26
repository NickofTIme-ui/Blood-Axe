"""bake-oryn-nov26.py: Oryn's 26 Nov 2026 strips (docs/mage-art-prompts.md section 15;
originals in art-incoming/oryn-nov26/) into the HD sheet format, the same way as
tools/bake-oryn-strips.py. ChatGPT's images come at a different size each time, so each strip
is scaled by its own reference pose (one standing with the staff upright), sized as the
second set's grab pose 0 was: his idle height x 1.08.

  python tools/bake-oryn-nov26.py
"""
import importlib.util, os, sys
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
def load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(here, file))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
bv = load('bv', 'bake-vexa-strip.py')
root = os.path.dirname(here)
SRC = os.path.join(root, 'art-incoming', 'oryn-nov26')
# name: (poses, the pose that stands with the staff upright, x its height)
STRIPS = {'air': (6, 2, 1.0), 'thunder': (6, 0, 1.0), 'spikes': (6, 0, 1.0)}

# (the red-gold lantern turned to his blue orb, as in bake-oryn-strips.py)
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
tall = (b - t) * 1.08
for name, (n, ref, k) in STRIPS.items():
    if len(sys.argv) > 1 and name not in sys.argv[1:]: continue
    src = os.path.join(SRC, f'mage_{name}.png')
    if not os.path.exists(src): print('missing', src); continue
    out = os.path.join(root, f'assets/sprites/heroes-hd/oryn-mage-{name}.png')
    bv.bake(src, out, n, ref, round(tall * k))
    arcane(out)
