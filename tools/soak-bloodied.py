"""soak-bloodied.py — Makes the 'soaked' twin of a bloodied hero sheet: where the ChatGPT
repaint added blood (it's redder than the clean art), push it further — more of it,
deeper and wetter — and spread it a little into the plates around it. Everything else
stays as the bloodied repaint. view/BloodCoat.js fades it in past fully bloodied.

  python3 tools/soak-bloodied.py clean.png bloody.png out.png
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

clean_p, bloody_p, out_p = sys.argv[1:4]
C = np.asarray(Image.open(clean_p).convert('RGBA')).astype(np.float32)
B = np.asarray(Image.open(bloody_p).convert('RGBA')).astype(np.float32)
red = lambda X: X[..., 0] - (X[..., 1] + X[..., 2]) / 2
# how much blood the repaint put here (0..1)
m = np.clip((red(B) - red(C) - 8) / 60, 0, 1) * (C[..., 3] > 32)
# spread it into the plates around it (blood runs and smears)
mi = Image.fromarray((m * 255).astype(np.uint8))
spread = np.asarray(mi.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255
m2 = np.maximum(m, spread * 0.45)
out = B.copy()
rgb = B[..., :3]
lum = rgb.mean(axis=2, keepdims=True)
# wet deep blood: keep the shading (luminance), pushed to crimson, highlights kept bright
blood = np.concatenate([lum * 0.95 + 22, lum * 0.08, lum * 0.12], axis=2)
hi = np.clip((lum - 170) / 60, 0, 1)  # specular glints stay glints
blood = blood * (1 - hi) + rgb * hi
k = np.clip(m2 * 1.1, 0, 0.92)[..., None]
out[..., :3] = rgb * (1 - k) + blood * k
out[..., 3] = C[..., 3]
Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA').save(out_p, optimize=True)
print(out_p, 'blood cover', round(float((m > 0.2).sum() / max(1, (C[..., 3] > 32).sum())), 3), '->', round(float((m2 > 0.2).sum() / max(1, (C[..., 3] > 32).sum())), 3))
