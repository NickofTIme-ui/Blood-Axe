#!/usr/bin/env python3
"""ground-fit.py - drops a Magnific-enhanced level ground back into the game.

Magnific returns the ground 2x (or 4x) bigger and usually a little brighter and more
saturated than the painting it started from. This fits it back:
  1. resizes it to the original's height, keeping its own width-to-height shape (the
     game fits the ground's height to the floor band and repeats it sideways, so any
     width works; the game shows it at about 1:1 on a 1080p screen, so extra pixels
     would only cost download size, and shrinking a 2x result down makes it crisper),
  2. matches its colour and brightness to the original's (each channel's mean and
     spread), so the level keeps its mood and fighters and blood still read on top,
  3. optionally mixes a little of the original back in (--keep) to tame anything
     Magnific invented,
  4. writes assets/env/<level>/ground.png, and a before/after preview at in-game scale
     next to the Magnific file.

The left/right seam needs nothing: the game cross-fades the ground's edges at load
(view/envArt.js makeSeamless).

Needs Pillow + numpy.  Usage:
  python3 tools/ground-fit.py <magnific-output.png> <level> [--match 1.0] [--keep 0.0]
    level: village | wood | gates | ascent | mine
"""
import argparse, os, subprocess
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def original(level):
    """The ground as last committed (so re-running never matches against itself)."""
    path = f'assets/env/{level}/ground.png'
    try:
        data = subprocess.run(['git', 'show', f'HEAD:{path}'], cwd=ROOT, capture_output=True, check=True).stdout
        import io
        return Image.open(io.BytesIO(data)).convert('RGB')
    except (subprocess.CalledProcessError, FileNotFoundError):
        return Image.open(os.path.join(ROOT, path)).convert('RGB')


def match_colour(img, ref, strength):
    a = np.asarray(img, dtype=np.float32)
    r = np.asarray(ref, dtype=np.float32)
    out = a.copy()
    for c in range(3):
        am, asd = a[..., c].mean(), a[..., c].std() + 1e-6
        rm, rsd = r[..., c].mean(), r[..., c].std()
        out[..., c] = (a[..., c] - am) * (rsd / asd) + rm
    out = a + (out - a) * strength
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def preview(before, after, path):
    """A 1:1 crop of each (what a 1080p screen shows), side by side."""
    def crop(im):
        w, h = im.size
        return im.crop((w // 2 - 500, h - 480, w // 2 + 500, h))
    b, a = crop(before), crop(after)
    sheet = Image.new('RGB', (b.width, b.height * 2 + 8), (20, 20, 20))
    sheet.paste(b, (0, 0))
    sheet.paste(a, (0, b.height + 8))
    sheet.save(path)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('enhanced')
    p.add_argument('level')
    p.add_argument('--match', type=float, default=1.0, help='colour/brightness match to the original, 0..1 (default 1)')
    p.add_argument('--keep', type=float, default=0.0, help='how much of the original to mix back in, 0..1 (default 0)')
    p.add_argument('--out', help='where to write (default assets/env/<level>/ground.png)')
    args = p.parse_args()

    ref = original(args.level)
    img = Image.open(args.enhanced).convert('RGB')
    img = img.resize((round(img.width * ref.height / img.height), ref.height), Image.LANCZOS)
    if args.match > 0:
        img = match_colour(img, ref, args.match)
    if args.keep > 0:
        if img.size != ref.size:
            p.error('--keep needs the Magnific image to have the same shape as the original')
        img = Image.blend(img, ref, args.keep)

    out = args.out or os.path.join(ROOT, f'assets/env/{args.level}/ground.png')
    img.save(out, optimize=True)
    # next to the Magnific file, not in assets/ (the release build would ship it)
    prev = os.path.splitext(args.enhanced)[0] + '-before-after.png'
    preview(ref, img, prev)
    print(f'wrote {out} ({img.width}x{img.height})\npreview {prev} (top: before, bottom: after, 1:1)')


if __name__ == '__main__':
    main()
