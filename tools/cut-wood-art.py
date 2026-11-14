"""cut-wood-art.py — Cuts the Gallows Wood trap paintings (ChatGPT, on flat magenta) into the
cut-outs the game loads (assets/env/wood/trap_*.png, pen_gate.png, fern_*.png).

    python tools/cut-wood-art.py <folder with the raw pictures>

Raw names (as saved on Nick's PC, assets/incoming/level2/): pine.png, logpile.png (pair),
log_roll.png, snare.png (pair), stakes.png (pair), pen_gate.png, ferns.png (three clumps).
Each picture: magenta keyed to alpha (soft edge, fringe pulled to grey, as view/envArt.js
keyLayer), split into its separate pictures by the empty columns between them, trimmed to
what's painted, and scaled down to at most MAX px tall. A missing raw is skipped.
"""
import sys
from pathlib import Path
from PIL import Image
import numpy as np

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'env' / 'wood'
MAX = 720

# raw file -> output names, left to right
JOBS = {
    'pine.png': ['trap_pine'],
    'logpile.png': ['trap_logpile', 'trap_logpile_loose'],
    'log_roll.png': ['trap_log'],
    'snare.png': ['trap_snare', 'trap_snare_sprung'],
    'stakes.png': ['trap_stakes', 'trap_stakes_open'],
    'pen_gate.png': ['pen_gate'],
    'ferns.png': ['fern_1', 'fern_2', 'fern_3'],
}


def key(img):
    a = np.asarray(img.convert('RGBA')).astype(np.int32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    d = np.abs(r - 255) + g + np.abs(b - 255)
    al = np.where(d < 70, 0, np.where(d < 170, al * (d - 70) // 100, al))
    fringe = (al > 0) & (r > g + 40) & (b > g + 40)
    grey = (g + np.minimum(r, b)) // 2
    r = np.where(fringe, grey, r); b = np.where(fringe, grey, b)
    out = np.stack([r, g, b, al], -1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def runs(mask, min_gap):
    """Spans of True in a 1-D mask, joining gaps narrower than min_gap."""
    spans = []
    start = None
    for i, v in enumerate(mask):
        if v and start is None: start = i
        if not v and start is not None: spans.append([start, i]); start = None
    if start is not None: spans.append([start, len(mask)])
    merged = []
    for s in spans:
        if merged and s[0] - merged[-1][1] < min_gap: merged[-1][1] = s[1]
        else: merged.append(s)
    return merged


def split(img, n):
    al = np.asarray(img)[..., 3]
    cols = (al > 40).sum(0) > 2
    spans = [s for s in runs(cols, 12) if s[1] - s[0] > 20]
    # too many pieces: keep joining across the narrowest gap until there are n
    while len(spans) > n:
        gaps = [spans[i + 1][0] - spans[i][1] for i in range(len(spans) - 1)]
        i = gaps.index(min(gaps))
        spans[i:i + 2] = [[spans[i][0], spans[i + 1][1]]]
    if len(spans) < n:  # (touching: fall back to equal parts)
        w = img.width // n
        spans = [[i * w, (i + 1) * w] for i in range(n)]
    pieces = []
    for x0, x1 in spans:
        p = img.crop((x0, 0, x1, img.height))
        box = p.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
        if box: p = p.crop((max(0, box[0] - 4), max(0, box[1] - 4), min(p.width, box[2] + 4), min(p.height, box[3] + 4)))
        pieces.append(p)
    return pieces


def main(src):
    src = Path(src)
    for raw, names in JOBS.items():
        f = src / raw
        if not f.exists():
            print(f'skip {raw} (not there)'); continue
        for name, p in zip(names, split(key(Image.open(f)), len(names))):
            if p.height > MAX: p = p.resize((round(p.width * MAX / p.height), MAX), Image.LANCZOS)
            p.save(OUT / f'{name}.png', optimize=True)
            print(f'{raw} -> {name}.png {p.width}x{p.height}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'assets/incoming/level2')
