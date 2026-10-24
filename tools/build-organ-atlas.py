#!/usr/bin/env python3
"""build-organ-atlas.py - cuts ChatGPT's organ sheet into the game's organ atlas.

ChatGPT paints the organs clean and pink (it refuses bloody prompts), and its grid is
loose: pieces cross the cell lines. This:
  1. finds every painted piece by its alpha (the two kidneys come out as two pieces),
  2. darkens it toward the game's deep reds and coats it in patchy blood, so it sits
     with the painted gore atlas (assets/fx/gore-painted-atlas.png),
  3. packs the pieces, in reading order, into a clean 4x4 grid of square cells,
     writing assets/fx/gore-organs-atlas.png.

Cell order (effects/goreArt.js ORGAN_CELLS reads it): 0 small-intestine loop,
1 intestine pile, 2 short intestine, 3 colon, 4 heart, 5 liver, 6 lung, 7 kidney,
8 kidney, 9 stomach, 10 spleen, 11 lung lobe, 12 bowel bundle, 13-15 empty.

Needs Pillow + numpy + scipy.  Usage:
  python tools/build-organ-atlas.py path/to/organs-chatgpt.png
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

CELL, COLS, ROWS, PAD = 320, 4, 4, 10
OUT = 'assets/fx/gore-organs-atlas.png'


def pieces(rgba):
    a = np.array(rgba)
    lab, n = ndimage.label(ndimage.binary_dilation(a[..., 3] > 20, iterations=3))
    found = []
    for i, s in enumerate(ndimage.find_objects(lab)):
        mask = lab[s] == i + 1
        if (a[s][..., 3][mask] > 20).sum() < 2000:
            continue
        crop = a[s].copy()
        crop[..., 3][~mask] = 0
        found.append((s[0].start, s[1].start, crop))
    # reading order: bucket rows by a third of the sheet's height
    rh = a.shape[0] / 3
    found.sort(key=lambda p: (int((p[0] + p[2].shape[0] / 2) // rh), p[1]))
    return [p[2] for p in found]


def bloody(crop, seed):
    rng = np.random.default_rng(seed)
    rgb = crop[..., :3].astype(np.float32) / 255
    alpha = crop[..., 3]
    # toward the game's deep, dark meat: less pink, more shadow
    rgb = rgb * np.array([1.0, 0.78, 0.78])
    # patchy blood coat: blurred noise blotches, dark red, glossy where thick
    h, w = alpha.shape
    noise = rng.random((max(2, h // 18), max(2, w // 18))).astype(np.float32)
    noise = np.array(Image.fromarray((noise * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)) / 255
    coat = np.clip((noise - 0.5) * 2.2, 0, 1)[..., None] * 0.6
    blood = np.array([0.36, 0.02, 0.03])
    rgb = rgb * (1 - coat) + blood * coat
    # keep the painted highlights (wet sheen) showing through the coat
    lum = crop[..., :3].astype(np.float32).mean(axis=2) / 255
    sheen = np.clip((lum - 0.78) * 4, 0, 1)[..., None] * 0.6
    rgb = rgb * (1 - sheen) + np.array([1.0, 0.86, 0.84]) * sheen
    # a dark rim so the piece reads against the blood on the floor
    inner = ndimage.binary_erosion(alpha > 100, iterations=4)
    rim = ndimage.gaussian_filter((~inner & (alpha > 20)).astype(np.float32), 1.2)[..., None]
    rgb = rgb * (1 - np.clip(rim, 0, 1) * 0.65)
    out = np.dstack([np.clip(rgb * 255, 0, 255).astype(np.uint8), alpha])
    return out


def main(src):
    sheet = Image.open(src).convert('RGBA')
    found = pieces(sheet)
    if len(found) != 13:
        sys.exit(f'expected 13 pieces, found {len(found)}')
    atlas = Image.new('RGBA', (CELL * COLS, CELL * ROWS), (0, 0, 0, 0))
    for i, crop in enumerate(found):
        img = Image.fromarray(bloody(crop, i + 1))
        k = min(1, (CELL - PAD * 2) / max(img.size))
        img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
        x = (i % COLS) * CELL + (CELL - img.width) // 2
        y = (i // COLS) * CELL + (CELL - img.height) // 2
        atlas.alpha_composite(img, (x, y))
    atlas.save(OUT, optimize=True)
    print(f'wrote {OUT} ({len(found)} pieces)')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'assets/incoming/organs-chatgpt.png')
