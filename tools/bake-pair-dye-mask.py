"""Add a second row to a throat pair strip: the man's dyeable cloth only (Rurik cut away).

Grunts come in dyes (view/dye.js); the pair picture has the man undyed. The game draws
this second row over the picture through the dye shader with the man's dye, so his rags
keep their colour through the hold. Rurik's own pixels in the cloth hue band (bronze
edges, the blade) are sparse; the man's rags are dense, so a density test plus a growth
picks the man.

usage: python3 tools/bake-pair-dye-mask.py <pair strip.png> [hue turn, default 12]   (4 frames of 696x480 in a row)
"""
import sys
import numpy as np
from PIL import Image

path = sys.argv[1]
im = np.array(Image.open(path).convert('RGBA'))
top = im[:480]
a = top.astype(float) / 255
rgb = a[..., :3]
mx, mn = rgb.max(2), rgb.min(2)
d = mx - mn + 1e-9
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
sat = d / (mx + 1e-9)
# view/dye.js BAND: centre 66, half 30, soft 12, satMin .16, satSoft .12
w = np.clip((42 - abs(hue - 66)) / 12, 0, 1) * np.clip((sat - .16) / .12, 0, 1) * (a[..., 3] > 0.3)

def box(m, k):
    c = np.pad(m, ((k + 1, k), (k + 1, k))).cumsum(0).cumsum(1)
    return (c[2*k+1:, 2*k+1:] - c[:-2*k-1, 2*k+1:] - c[2*k+1:, :-2*k-1] + c[:-2*k-1, :-2*k-1]) / (2*k+1)**2

dense = box((w > 0.3).astype(float), 10) > 0.35
region = box(dense.astype(float), 8) > 0
region &= a[..., 3] > 0
# not the blade (gold, lit up): the rags are dark
region &= mx < 0.62
# only round the man himself: within reach of the middle of his rags, frame by frame
for i in range(4):
    cols = dense[:, i*696:(i+1)*696].sum(0)
    if cols.sum() == 0: continue
    cx = int((cols * np.arange(696)).sum() / cols.sum())
    keep = np.zeros(696, bool); keep[max(0, cx-120):cx+120] = True
    region[:, i*696:(i+1)*696] &= keep[None, :]
# ChatGPT painted his rags browner (hue ~34) than his own strips (~40-60): at the band's
# soft edge a dye only half took (a frost grunt went grass green in the hold, teal after).
# Turn the man's rags round to his own olive, in the picture and the overlay alike.
SHIFT = float(sys.argv[2]) if len(sys.argv) > 2 else 12
k = region & (hue > 18) & (hue < 80) & (sat > 0.12)
nh = (hue + SHIFT * np.clip((80 - hue) / 20, 0, 1)) % 360
h6 = nh / 60; c = mx * sat; x = c * (1 - abs(h6 % 2 - 1)); m0 = mx - c
sec = np.floor(h6).astype(int) % 6
R = np.choose(sec, [c, x, 0*c, 0*c, x, c]); G = np.choose(sec, [x, c, c, x, 0*c, 0*c]); B = np.choose(sec, [0*c, 0*c, x, c, c, x])
new = np.stack([R + m0, G + m0, B + m0], -1)
top = top.copy()
top[..., :3][k] = np.clip(new[k] * 255 + 0.5, 0, 255).astype(np.uint8)
hue = np.where(k, nh, hue)
w = np.clip((42 - abs(hue - 66)) / 12, 0, 1) * np.clip((sat - .16) / .12, 0, 1) * (a[..., 3] > 0.3)
over = np.zeros_like(top)
over[region & (w > 0)] = top[region & (w > 0)]
out = np.concatenate([top, over], 0)
Image.fromarray(out, 'RGBA').save(path, optimize=True)
print(path, 'overlay px', int((over[..., 3] > 0).sum()))
