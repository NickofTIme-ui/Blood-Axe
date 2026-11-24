"""Bake a ChatGPT floor painting into a seamless level ground (jpg).

python tools/bake-floor.py painted.png assets/env/wood/ground_<name>.jpg [--overlap 0.12]

ChatGPT's "seamless left and right edges" never quite are: the right `overlap` of the
picture is cross-faded into its left start and cut off, so it repeats without a seam
(the same as view/envArt.js makeSeamless does at load for the old grounds).
"""
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
frac = float(sys.argv[sys.argv.index('--overlap') + 1]) if '--overlap' in sys.argv else 0.12
im = Image.open(src).convert('RGB')
w, h = im.size
ov = round(w * frac)
base = im.crop((0, 0, w - ov, h))
strip = im.crop((w - ov, 0, w, h))
mask = Image.linear_gradient('L').rotate(-90, expand=True).resize((ov, h))  # 255 at left -> 0 at right
base.paste(strip, (0, 0), mask)
base.save(out, quality=90, optimize=True)
print(out, base.size)
