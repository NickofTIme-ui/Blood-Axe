"""bake-blood-layers.py — Rurik's blood, on EVERY pose, sitting exactly on his own drawing.

ChatGPT repainted a few of his sheets soaked in blood (walk2 + combo1, both swords:
tools/blood-source/*-soaked.png, the twins lined up by tools/line-up-bloodied.py + tools/soak-bloodied.py).
Drawn whole over him those repaints showed as a second Rurik (ChatGPT never paints his
limbs, sword and cape in quite the same place), and every other pose had no blood.

So instead this bakes a BLOOD LAYER per sheet: only the blood, transparent elsewhere,
in his own geometry, frame for frame like the clean sheet but at half size (he's drawn at
half his HD size; view/BloodCoat.js fades it over him).
  1. The painted sheets: each repaint is warped onto the clean frame (dense optical
     flow), and the blood is what the repaint made redder and darker than his own paint.
  2. Every other sheet: each pixel takes the blood that ChatGPT painted on the closest
     matching bits of him in the painted frames (same colours/material around it, same
     height on his body: steel, face, blade, cloak...), nearest-neighbour lookup.

  python3 tools/bake-blood-layers.py            (writes assets/sprites/heroes-hd/blood/)
  python3 tools/bake-blood-layers.py --preview out.jpg sheet-name...
Needs: numpy, pillow, opencv-python-headless, scipy.
"""
import json, os, re, sys
import cv2, numpy as np
from PIL import Image
from scipy.spatial import cKDTree

HD = 'assets/sprites/heroes-hd/'
OUT = HD + 'blood/'
SRC = 'tools/blood-source/'  # the ChatGPT repaints (lined up + soaked), kept out of the game build
PAINTED = ['ulric-walk2', 'ulricOath-walk2', 'ulric-combo1', 'ulricOath-combo1']
K = 2           # neighbours averaged per pixel (more = smoother, fewer = splattier)
TRAIN = 400000  # painted pixels kept for the lookup
BLOOD_FROM, BLOOD_RAMP = 4, 18  # how much redder (Lab a*) than his own paint starts / is full blood

# --vexa: Vexa's sheets instead, learned from her repaints (run, idle, combo1: lined up by
# tools/line-up-bloodied.py from the grids tools/blood-grid.py makes, then soaked)
VEXA = '--vexa' in sys.argv
if VEXA:
    sys.argv.remove('--vexa')
    PAINTED = ['rogue-run', 'rogue-idle', 'rogue-combo1']

def vexa_sheets():
    """every Vexa sheet the game draws: (file, fw, fh, cols, frames)"""
    src = open('src/data/heroHdAssets.js').read()
    hd = json.loads(src[src.index('{'):src.rindex('}') + 1])
    out = {s['file']: (s['fw'], s['fh'], s['cols'], s['frames']) for s in hd['sheets'] if s['hero'] == 'vexa'}
    for m in re.finditer(r"sheet\('(\w+)', (\d+)\)", open('src/data/vexaArt.js').read()):
        out[HD + f'vexa-rogue-{m.group(1)}.png'] = (416, 480, int(m.group(2)), int(m.group(2)))
    return out

def sheets():
    """every Rurik sheet the game draws: (file, fw, fh, cols, frames)"""
    if VEXA: return vexa_sheets()
    src = open('src/data/heroHdAssets.js').read()
    hd = json.loads(src[src.index('{'):src.rindex('}') + 1])
    out = {hd['base']['file']: (hd['base']['fw'], hd['base']['fh'], hd['base']['cols'], hd['base']['frames'])}
    for s in hd['sheets']:
        if s['hero'] == 'rurik' and s.get('baseFirst') is None:
            out[s['file']] = (s['fw'], s['fh'], s['cols'], s['frames'])
    for m in re.finditer(r"sheet\('(\w+)', '([\w.-]+)'", open('src/data/grabArt.js').read()):
        out[HD + m.group(2)] = (696, 480, 4, 8)
    return out

def load(p): return np.asarray(Image.open(p).convert('RGBA'))
def cells(a, fw, fh, cols, n): return [((i % cols) * fw, (i // cols) * fh) for i in range(n)]

def gray(a):
    g = cv2.cvtColor(np.ascontiguousarray(a[..., :3]), cv2.COLOR_RGB2GRAY).astype(np.float32)
    return (g * (a[..., 3] / 255.)).astype(np.uint8)

DIS = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_ULTRAFAST)
DIS.setFinestScale(0); DIS.setPatchSize(12); DIS.setPatchStride(3)
DIS.setGradientDescentIterations(25); DIS.setVariationalRefinementIterations(10); DIS.setVariationalRefinementAlpha(40)

def redness(rgb): rgb = rgb.astype(np.float32); return rgb[..., 0] - np.maximum(rgb[..., 1], rgb[..., 2])

def painted_layer(cc, bb):
    """(alpha 0..1, blood rgb) of a repaint, in the clean frame's geometry"""
    flow = DIS.calc(gray(cc), gray(bb), None)
    h, w = cc.shape[:2]; gx, gy = np.meshgrid(np.arange(w), np.arange(h))
    wb = cv2.remap(bb, (gx + flow[..., 0]).astype(np.float32), (gy + flow[..., 1]).astype(np.float32), cv2.INTER_LINEAR)
    # blood: where the repaint is redder than his own paint (Lab a*), and not lighter
    lc = cv2.cvtColor(np.ascontiguousarray(cc[..., :3]), cv2.COLOR_RGB2LAB).astype(np.float32)
    lw = cv2.cvtColor(np.ascontiguousarray(wb[..., :3]), cv2.COLOR_RGB2LAB).astype(np.float32)
    a = np.clip((lw[..., 1] - lc[..., 1] - BLOOD_FROM) / BLOOD_RAMP, 0, 1) * np.clip(1 - (lw[..., 0] - lc[..., 0] - 12) / 40, 0, 1)
    a *= (cc[..., 3] > 128) * (wb[..., 3] > 128)
    return cv2.GaussianBlur(a.astype(np.float32), (0, 0), 0.7), wb[..., :3].astype(np.float32)

def features(cc):
    """per pixel: its colour, the colour around it (2 sizes), and its height on his body"""
    lab = cv2.cvtColor(np.ascontiguousarray(cc[..., :3]), cv2.COLOR_RGB2LAB).astype(np.float32)
    m = (cc[..., 3] > 128).astype(np.float32)
    F = [lab]
    for r in (5, 15):
        F.append(cv2.blur(lab * m[..., None], (r, r)) / (cv2.blur(m, (r, r))[..., None] + 1e-3))
    ys = np.nonzero(m)[0]
    y0, y1 = (ys.min(), ys.max()) if len(ys) else (0, 1)
    yn = np.broadcast_to(((np.arange(cc.shape[0]) - y0) / max(1, y1 - y0))[:, None], m.shape)[..., None] * 60
    return np.concatenate(F + [yn], -1), m > 0

def layer_png(a, col, alpha_src):
    rgba = np.zeros(a.shape + (4,), np.uint8)
    a = np.where(a > 0.03, a, 0) * (alpha_src / 255.)
    rgba[..., :3] = np.where(a[..., None] > 0, col, 0).clip(0, 255).astype(np.uint8)
    rgba[..., 3] = (a * 255).round().astype(np.uint8)
    return rgba

def main():
    args = sys.argv[1:]
    preview = None
    if args[:1] == ['--preview']: preview, args = args[1], args[2:]
    S = sheets()
    X, Y, painted = [], [], {}
    for key in PAINTED:
        who = 'vexa' if VEXA else 'rurik'
        f = HD + f'{who}-{key}.png'; fw, fh, cols, n = S[f]
        c, b = load(f), load(SRC + f'{who}-{key}-soaked.png')
        lay = np.zeros(c.shape, np.uint8)
        for x, y in cells(c, fw, fh, cols, n):
            cc, bb = c[y:y + fh, x:x + fw], b[y:y + fh, x:x + fw]
            a, col = painted_layer(cc, bb)
            F, m = features(cc)
            X.append(F[m]); Y.append(np.concatenate([a[m][:, None], col[m]], 1))
            lay[y:y + fh, x:x + fw] = layer_png(a, col, cc[..., 3].astype(np.float32))
        painted[f] = lay
    X, Y = np.concatenate(X), np.concatenate(Y)
    pick = np.random.default_rng(7).choice(len(X), min(len(X), TRAIN), replace=False)
    tree, Yt = cKDTree(X[pick]), Y[pick]
    print(f'{len(pick)} painted pixels to learn from')

    todo = [f for f in S if not args or any(a in f for a in args)]
    os.makedirs(OUT, exist_ok=True)
    shown = []
    for f in todo:
        fw, fh, cols, n = S[f]
        c = load(f)
        if f in painted: lay = painted[f]
        else:
            lay = np.zeros(c.shape, np.uint8)
            for x, y in cells(c, fw, fh, cols, n):
                cc = c[y:y + fh, x:x + fw]
                F, m = features(cc)
                if not m.any(): continue
                d, j = tree.query(F[m], k=K, workers=-1)
                w = 1 / (d + 4); w /= w.sum(1, keepdims=True)
                p = (Yt[j] * w[..., None]).sum(1)
                a = np.zeros(m.shape, np.float32); col = np.zeros(m.shape + (3,), np.float32)
                a[m], col[m] = p[:, 0], p[:, 1:]
                a = cv2.GaussianBlur(cv2.medianBlur((a * 255).astype(np.uint8), 5).astype(np.float32) / 255, (0, 0), 0.7)
                a = np.clip(a * 1.25, 0, 1) * m
                lay[y:y + fh, x:x + fw] = layer_png(a, col, cc[..., 3].astype(np.float32))
        name = os.path.basename(f)[:-4] + '-blood.png'
        if preview: shown.append((f, c, lay, fw, fh, cols, n))
        else:
            # 128-colour palette (blood is a narrow range of reds): ~5x smaller, itch is near its size cap
            # at half size: he's drawn at half his HD size anyway (view/BloodCoat.js doubles it back)
            half = Image.fromarray(lay, 'RGBA').convert('RGBa').resize((lay.shape[1] // 2, lay.shape[0] // 2), Image.LANCZOS).convert('RGBA')
            half.quantize(colors=128, method=Image.Quantize.FASTOCTREE,
                                                  dither=Image.Dither.NONE).save(OUT + name, optimize=True)
            print(name, os.path.getsize(OUT + name) // 1024, 'KB')
    if preview:
        rows = []
        for f, c, lay, fw, fh, cols, n in shown:
            for x, y in cells(c, fw, fh, cols, n)[:3]:
                cc, ll = c[y:y + fh, x:x + fw].astype(np.float32), lay[y:y + fh, x:x + fw].astype(np.float32)
                ys, xs = np.nonzero(cc[..., 3] > 0); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
                cc, ll = cc[y0:y1, x0:x1], ll[y0:y1, x0:x1]
                row = []
                for t in (0, 0.5, 1):
                    al = ll[..., 3:4] / 255 * t
                    rgb = cc[..., :3] * (1 - al) + ll[..., :3] * al
                    a = cc[..., 3:4] / 255
                    row.append((rgb * a + 90 * (1 - a)).astype(np.uint8))
                im = np.hstack(row)
                hh = 420; rows.append(cv2.resize(im, (int(im.shape[1] * hh / im.shape[0]), hh)))
        W = max(r.shape[1] for r in rows); rows = [np.pad(r, ((0, 0), (0, W - r.shape[1]), (0, 0)), constant_values=90) for r in rows]
        Image.fromarray(np.vstack(rows)).save(preview, quality=88)

main()
