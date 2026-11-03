"""Cut the ChatGPT skill tree art (project files skill-tree-art/originals/) into game assets.

  python3 tools/cut-skilltree-art.py <originals dir>

Writes assets/ui/skilltree/: bg.jpg, plate-{dormant,awake,major}.png, banner-cloth.png,
banner-trim.png (the cloth is split from its gold trim and pole so the game can dye only the
cloth in each branch's colour), desk.png (nine-sliced in game) and icons/<skill id>.png.
"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'ui', 'skilltree')
os.makedirs(os.path.join(OUT, 'icons'), exist_ok=True)

def trim(im, t=8):
    a = np.array(im)[:, :, 3] > t
    ys, xs = np.where(a)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

def fit(im, w):
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)

# the backdrop
Image.open(f'{SRC}/skilltree-bg.png').convert('RGB').resize((1920, 1080), Image.LANCZOS).save(f'{OUT}/bg.jpg', quality=84)

# the plaques: three bands, split where the opaque art has a gap
P = Image.open(f'{SRC}/skilltree-plates.png').convert('RGBA')
for name, (y0, y1) in zip(['dormant', 'awake', 'major'], [(0, 320), (320, 636), (636, P.height)]):
    fit(trim(P.crop((0, y0, P.width, y1))), 560).save(f'{OUT}/plate-{name}.png', optimize=True)

# the banner and the reading desk
B = Image.open(f'{SRC}/skilltree-banner-panel.png').convert('RGBA')
banner = trim(B.crop((0, 0, 430, B.height)))
banner = fit(banner, 300)
arr = np.array(banner).astype(float)
rgb = arr[:, :, :3] / 255
mx, mn = rgb.max(2), rgb.min(2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
# the cloth is what lies inside the gold embroidered border: flood it from the middle, with the
# saturated gold as the wall (so the gold trim, tassels and the iron pole keep their colours)
from scipy import ndimage
gold = ndimage.binary_dilation((sat > 0.4) & (mx > 0.3), iterations=1)
open_ = (arr[:, :, 3] > 160) & ~gold
lab, _ = ndimage.label(open_)
h, w = open_.shape
core = lab[h * 2 // 5, w // 2]
cloth = ndimage.binary_fill_holes(ndimage.binary_closing(lab == core, iterations=3))
cloth = np.array(Image.fromarray((cloth * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))) / 255
c = arr.copy(); c[:, :, 3] *= cloth
t = arr.copy(); t[:, :, 3] *= (1 - cloth)
Image.fromarray(c.astype(np.uint8)).save(f'{OUT}/banner-cloth.png', optimize=True)
Image.fromarray(t.astype(np.uint8)).save(f'{OUT}/banner-trim.png', optimize=True)
fit(trim(B.crop((430, 0, B.width, B.height))), 1200).save(f'{OUT}/desk.png', optimize=True)

# the icons: a grid of round medallions on black; each is cut to a clean circle
def icons(file, rows, cols, ids):
    im = Image.open(f'{SRC}/{file}').convert('RGB')
    g = np.array(im).astype(int).max(2)
    H, W = g.shape
    for r in range(rows):
        for c in range(cols):
            x0, x1 = W * c // cols, W * (c + 1) // cols
            y0, y1 = H * r // rows, H * (r + 1) // rows
            cell = g[y0:y1, x0:x1] > 45
            ys, xs = np.where(cell)
            cx, cy = x0 + (xs.min() + xs.max()) / 2, y0 + (ys.min() + ys.max()) / 2
            rad = min(xs.max() - xs.min(), ys.max() - ys.min()) / 2
            box = (round(cx - rad), round(cy - rad), round(cx + rad), round(cy + rad))
            icon = im.crop(box).resize((256, 256), Image.LANCZOS).convert('RGBA')
            m = Image.new('L', (1024, 1024), 0)
            ImageDraw.Draw(m).ellipse((6, 6, 1018, 1018), fill=255)
            icon.putalpha(m.resize((256, 256), Image.LANCZOS))
            icon.resize((160, 160), Image.LANCZOS).save(f'{OUT}/icons/{ids[r * cols + c]}.png', optimize=True)

icons('skilltree-icons-rurik.png', 4, 3, ['keenEdge', 'executionersArc', 'berserk', 'bloodrush', 'ironWall', 'oathOfFury',
                                           'windStep', 'leapSmash', 'skyfall', 'oathkeeperWakes', 'kingsfire', 'kingsWrath'])
icons('skilltree-icons-oryn.png', 3, 3, ['forkedBolt', 'staticCharge', 'thunderhead', 'secondWall', 'shatter', 'livingRock',
                                          'blinkStrike', 'longStep', 'phaseWalk'])
print('ok')
