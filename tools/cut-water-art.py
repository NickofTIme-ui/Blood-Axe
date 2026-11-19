"""cut-water-art.py — Cuts the game's water paintings (ChatGPT, 2026-11-19, on flat magenta) into the
pieces view/TerrainView.js paintedWater lays over each crossing:

    python tools/cut-water-art.py <folder with the raw pictures>

  stream.png -> assets/env/wood/water_stream.png   (Gallows Wood's streams)
  ford.png   -> assets/env/wood/water_ford.png     (the old ford's shallows and channel)
  river.png  -> assets/env/mine/water_river.png    (Hollow Mountain's underground river)
  stones.png -> assets/env/wood/water_stone_1..3.png (the streams' stepping stones, split and trimmed)

Magenta keyed to alpha with a soft edge (as tools/cut-wood-art.py), its top (the trees behind) cut off and faded in, NOT
trimmed sideways: the game reads the water's share of the picture's width (`frac` in paintedWater) off the whole frame. Scaled to MAX wide.
"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'env'
# raw -> (output, share of the height cut off the top: the trees / tunnel painted behind the water,
# which would stand up over the level's own back wall)
JOBS = {'stream.png': (ROOT / 'wood' / 'water_stream.png', 0.24), 'ford.png': (ROOT / 'wood' / 'water_ford.png', 0.2),
        'river.png': (ROOT / 'mine' / 'water_river.png', 0.22)}
FADE = 0.12
SIDE = 0.14  # (the outer banks' fade, as a share of the width)  # (the top this share fades in, so the water comes out of the dark at the back)
MAX = 900


def key(img):
    a = np.asarray(img.convert('RGBA')).astype(np.int32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    d = np.abs(r - 255) + g + np.abs(b - 255)
    al = np.where(d < 90, 0, np.where(d < 200, al * (d - 90) // 110, al))
    fringe = (al > 0) & (r > g + 40) & (b > g + 40)
    grey = (g + np.minimum(r, b)) // 2
    r = np.where(fringe, grey, r); b = np.where(fringe, grey, b)
    return Image.fromarray(np.stack([r, g, b, al], -1).clip(0, 255).astype(np.uint8), 'RGBA')


def main(src):
    for raw, (out, cut) in JOBS.items():
        f = Path(src) / raw
        if not f.exists():
            print('skip', raw); continue
        im = Image.open(f)
        im = key(im.crop((0, round(im.height * cut), im.width, im.height)))
        # soften the keyed edge a little (its zigzag read as cut out with scissors) and fade the top in
        a = np.asarray(im).astype(np.float32)
        al = Image.fromarray(a[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
        al = np.minimum(np.asarray(al).astype(np.float32), a[..., 3])
        h, w = al.shape; ramp = np.clip(np.arange(h) / (h * FADE), 0, 1) ** 1.5
        # the outer banks fade into the level's own ground, so no seam shows where the picture ends
        # (each row: from its outermost painted pixel inward over SIDE of the width)
        solid = al > 8; side = np.zeros_like(al)
        xs = np.arange(w)[None, :]
        left = np.where(solid.any(1), solid.argmax(1), w)[:, None]
        right = np.where(solid.any(1), w - 1 - solid[:, ::-1].argmax(1), 0)[:, None]
        edge = np.minimum(xs - left, right - xs).astype(np.float32)
        side = np.clip(edge / (w * SIDE), 0, 1) ** 1.3
        a[..., 3] = al * ramp[:, None] * side
        # no magenta left in the half-clear edge: pull any pinkish pixel's red and blue down to its green
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        pink = np.minimum(r, b) - g
        k = np.clip(pink / 40, 0, 1) * 0.9
        a[..., 0] = r - (r - g) * k * (r > g); a[..., 2] = b - (b - g) * k * (b > g)
        im = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
        if im.width > MAX: im = im.resize((MAX, round(im.height * MAX / im.width)), Image.LANCZOS)
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, optimize=True)
        print(raw, '->', out, im.size)


def stones(src):
    """stones.png (three stepping stones in a row) -> assets/env/wood/water_stone_1..3.png, each trimmed."""
    f = Path(src) / 'stones.png'
    if not f.exists():
        print('skip stones.png'); return
    im = key(Image.open(f)); a = np.asarray(im)[..., 3] > 20
    cols = a.any(0); spans = []; start = None
    for i, v in enumerate(list(cols) + [False]):
        if v and start is None: start = i
        if not v and start is not None:
            if i - start > 40: spans.append((start, i))
            start = None
    for n, (x0, x1) in enumerate(spans[:3], 1):
        piece = im.crop((x0, 0, x1, im.height)); bb = piece.getbbox(); piece = piece.crop(bb)
        if piece.width > 320: piece = piece.resize((320, round(piece.height * 320 / piece.width)), Image.LANCZOS)
        out = ROOT / 'wood' / f'water_stone_{n}.png'; piece.save(out, optimize=True); print('stones ->', out, piece.size)


if __name__ == '__main__':
    stones(sys.argv[1] if len(sys.argv) > 1 else '.')
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
