"""
make_ulric.py - Generates the pixel-art sprite sheet for Ulric Varr (the Warrior).

He is built like a puppet: a skeleton (hips, torso, arms, legs, axe) is posed per
frame and drawn with flat pixel shapes, then outlined. Poses are simple numbers, so
you can tweak an animation and re-run this script instead of redrawing frames.

Output:
  assets/sprites/ulric.png   the sprite sheet (8 frames per row)
  assets/sprites/ulric.json  frame size, anchor point and the animation list

Optional to run (needs Python 3 + Pillow):  python tools/sprite-gen/make_ulric.py
"""

import json
import math
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'sprites'))

FW, FH = 112, 112         # frame size in pixels
AX, AY = 56, 106          # anchor: where his feet touch the ground
COLS = 8

# ---------------------------------------------------------------- palette
C = {
    'outline': (20, 12, 10, 255),
    'skin': (176, 122, 85, 255), 'skin_d': (138, 90, 60, 255), 'skin_l': (206, 152, 112, 255),
    'hair': (30, 22, 18, 255), 'grey': (96, 88, 80, 255),
    'iron': (140, 145, 150, 255), 'iron_l': (205, 209, 214, 255), 'iron_d': (78, 83, 88, 255),
    'leather': (58, 42, 32, 255), 'leather_d': (34, 24, 15, 255),
    'fur': (92, 70, 50, 255), 'fur_l': (123, 98, 71, 255),
    'crimson': (142, 22, 18, 255), 'crimson_d': (94, 14, 11, 255),
    'ember': (224, 118, 43, 255), 'ember_l': (255, 190, 110, 255),
    'brass': (201, 163, 106, 255), 'haft': (59, 42, 30, 255),
    'trousers': (46, 33, 26, 255), 'trousers_d': (32, 23, 18, 255),
}

# body proportions (pixels)
THIGH, SHIN = 12, 12
TORSO = 18
UPPER, FORE = 9.5, 9.5


# ---------------------------------------------------------------- vector helpers
def v(a, b): return (a, b)
def add(p, q): return (p[0] + q[0], p[1] + q[1])
def sub(p, q): return (p[0] - q[0], p[1] - q[1])
def mul(p, s): return (p[0] * s, p[1] * s)
def length(p): return math.hypot(p[0], p[1])


def unit(p):
    l = length(p) or 1.0
    return (p[0] / l, p[1] / l)


def dirv(deg):
    """Angle -> direction. 0 = straight down, 90 = forward (+x), 180 = up."""
    r = math.radians(deg)
    return (math.sin(r), math.cos(r))


def perp_cw(d):
    """Rotate a direction 90 degrees clockwise on screen."""
    return (-d[1], d[0])


# ---------------------------------------------------------------- drawing helpers
class Canvas:
    def __init__(self):
        self.img = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)

    def P(self, p):
        return (round(AX + p[0]), round(AY + p[1]))

    def poly(self, pts, col):
        self.d.polygon([self.P(p) for p in pts], fill=C[col])

    def circle(self, c, r, col):
        x, y = AX + c[0], AY + c[1]
        self.d.ellipse([round(x - r), round(y - r), round(x + r), round(y + r)], fill=C[col])

    def line(self, a, b, col, w=1):
        self.d.line([self.P(a), self.P(b)], fill=C[col], width=w)

    def px(self, p, col):
        self.d.point(self.P(p), fill=C[col])

    def limb(self, a, b, wa, wb, col):
        """A tapered capsule from a (width wa) to b (width wb)."""
        d = unit(sub(b, a))
        n = (-d[1], d[0])
        self.poly([add(a, mul(n, wa / 2)), add(b, mul(n, wb / 2)),
                   sub(b, mul(n, wb / 2)), sub(a, mul(n, wa / 2))], col)
        self.circle(a, wa / 2 - 0.3, col)
        self.circle(b, wb / 2 - 0.3, col)


def ik(shoulder, target, l1, l2):
    """Two-bone IK: returns (elbow, hand). Elbow bends to the lower side."""
    d = sub(target, shoulder)
    dist = min(length(d), l1 + l2 - 0.01)
    dist = max(dist, abs(l1 - l2) + 0.01)
    base = math.atan2(d[1], d[0])
    cos_a = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
    a = math.acos(max(-1, min(1, cos_a)))
    options = []
    for sgn in (1, -1):
        ang = base + sgn * a
        elbow = add(shoulder, (math.cos(ang) * l1, math.sin(ang) * l1))
        options.append(elbow)
    elbow = max(options, key=lambda e: e[1])  # lower elbow looks natural
    hand = add(shoulder, mul(unit(d), dist)) if length(d) > l1 + l2 else target
    return elbow, hand


# ---------------------------------------------------------------- the character
DEFAULT = dict(
    hip=(0, -26), lean=5,
    nThigh=12, nKnee=-6, fThigh=-10, fKnee=-4,
    grip=(45, 12),      # near hand: (angle, distance) from the near shoulder
    axe=200,            # haft direction (0 down, 90 forward, 180 up)
    cape=0,             # cape flutter
    glow=0,             # rune glow 0..2
    sparks=False,
)


def draw_pose(pose):
    p = dict(DEFAULT)
    p.update(pose)
    cv = Canvas()

    hip = p['hip']
    lean = p['lean']
    up = (math.sin(math.radians(lean)), -math.cos(math.radians(lean)))
    fwd = (math.cos(math.radians(lean)), math.sin(math.radians(lean)))
    chest = add(hip, mul(up, TORSO))
    n_sh = add(add(chest, mul(up, -3.5)), mul(fwd, 0.5))
    f_sh = add(n_sh, mul(fwd, -1.5))

    # legs (forward kinematics)
    def leg(hip_pt, thigh, knee):
        k = add(hip_pt, mul(dirv(thigh), THIGH))
        f = add(k, mul(dirv(thigh + knee), SHIN))
        return k, f

    n_hip = add(hip, mul(fwd, 1.5))
    f_hip = add(hip, mul(fwd, -1.5))
    n_knee, n_foot = leg(n_hip, p['nThigh'], p['nKnee'])
    f_knee, f_foot = leg(f_hip, p['fThigh'], p['fKnee'])

    # axe + hands
    ga, gd = p['grip']
    grip = add(n_sh, mul(dirv(ga), gd))
    ad = dirv(p['axe'])
    far_grip = sub(grip, mul(ad, 5))
    n_elbow, n_hand = ik(n_sh, grip, UPPER, FORE)
    f_elbow, f_hand = ik(f_sh, far_grip, UPPER, FORE)

    # ---- 1. cape (behind everything)
    fl = p['cape']
    down = unit(add(mul(sub(n_knee, n_hip), 0.3), (0, 1)))
    back = mul(fwd, -1)
    a0 = add(chest, mul(fwd, -3.5))
    cape = [add(chest, mul(fwd, -1)), a0,
            add(add(a0, mul(back, 5 + fl)), mul(down, 12)),
            add(add(hip, mul(back, 11 + fl * 1.6)), mul(down, 20)),
            add(add(hip, mul(back, 5 + fl)), mul(down, 22)),
            add(add(hip, mul(back, 0 + fl * 0.5)), mul(down, 15)),
            add(hip, mul(back, 1))]
    cv.poly(cape, 'crimson_d')
    cv.line(add(a0, mul(back, 1)), add(add(hip, mul(back, 5 + fl)), mul(down, 16)), 'crimson')

    # ---- 2. far leg + far arm (shaded, behind the body)
    def draw_leg(h, k, f, shade):
        tr = 'trousers_d' if shade else 'trousers'
        cv.limb(h, k, 7.5, 6.5, tr)
        cv.limb(k, f, 6.5, 5, tr)
        s = unit(sub(f, k))
        fw = (s[1], -s[0])  # foot points forward
        cv.poly([add(f, mul(s, -3)), add(add(f, mul(s, -3)), mul(fw, 4)),
                 add(add(f, mul(s, 0.5)), mul(fw, 5)), add(f, mul(s, 0.5)), add(add(f, mul(s, 0.5)), mul(fw, -2)),
                 add(add(f, mul(s, -3)), mul(fw, -2))], 'leather_d')
        cv.limb(add(k, mul(s, 5)), add(k, mul(s, 7)), 6, 6, 'fur' if not shade else 'leather')
        cv.circle(k, 2.2, 'iron_d' if shade else 'iron')  # knee guard

    draw_leg(f_hip, f_knee, f_foot, True)
    cv.limb(f_sh, f_elbow, 6.5, 5.5, 'skin_d')
    cv.limb(f_elbow, f_hand, 5.5, 4.5, 'skin_d')
    cv.limb(add(f_elbow, mul(unit(sub(f_hand, f_elbow)), 3)), f_hand, 6, 5, 'iron_d')

    # ---- 3. torso (bare, scarred chest)
    torso = [add(hip, mul(fwd, 5)), add(add(hip, mul(up, TORSO * 0.5)), mul(fwd, 7.5)),
             add(add(chest, mul(fwd, 7.5)), mul(up, -1.5)), add(chest, mul(fwd, 5)),
             add(add(chest, mul(fwd, -6.5)), mul(up, -0.5)),
             add(add(hip, mul(up, TORSO * 0.5)), mul(fwd, -6.5)), add(hip, mul(fwd, -5))]
    cv.poly(torso, 'skin')
    cv.poly([add(add(hip, mul(up, TORSO * 0.1)), mul(fwd, -5)), add(add(hip, mul(up, TORSO * 0.5)), mul(fwd, -6.5)),
             add(add(chest, mul(fwd, -6.5)), mul(up, -0.5)), add(add(chest, mul(fwd, -3.5)), mul(up, -2)),
             add(add(hip, mul(up, TORSO * 0.4)), mul(fwd, -3))], 'skin_d')
    cv.line(add(add(chest, mul(fwd, 6.5)), mul(up, -2.5)), add(add(hip, mul(up, TORSO * 0.55)), mul(fwd, 7)), 'skin_l')
    cv.line(add(add(hip, mul(up, TORSO * 0.62)), mul(fwd, 7)), add(add(hip, mul(up, TORSO * 0.62)), mul(fwd, 2)), 'skin_d')
    cv.line(add(add(hip, mul(up, TORSO * 0.4)), mul(fwd, 5.5)), add(add(hip, mul(up, 3)), mul(fwd, 5)), 'skin_d')
    # the Flayer's brand
    cv.circle(add(add(hip, mul(up, TORSO * 0.72)), mul(fwd, 3.2)), 1.6, 'crimson_d')
    cv.px(add(add(hip, mul(up, TORSO * 0.72)), mul(fwd, 3.2)), 'ember')

    # ---- 4. near leg
    draw_leg(n_hip, n_knee, n_foot, False)

    # ---- 5. tabard, belt, strap, Tam's knife
    tdir = unit(add(mul(dirv(p['nThigh']), 0.6), mul(dirv(p['fThigh']), 0.4)))
    b_front = add(hip, mul(fwd, 4.8))
    b_back = add(hip, mul(fwd, 0))
    tab = [b_front, b_back, add(b_back, mul(tdir, 13)), add(add(b_back, mul(tdir, 14)), mul(fwd, 2)),
           add(add(b_front, mul(tdir, 13)), mul(fwd, 0.5)), add(b_front, mul(tdir, 12))]
    cv.poly(tab, 'crimson')
    cv.line(add(b_back, mul(tdir, 1)), add(b_back, mul(tdir, 13)), 'crimson_d')
    cv.px(add(add(b_front, mul(tdir, 6)), mul(fwd, -2)), 'brass')
    cv.limb(add(hip, mul(fwd, -4.8)), add(hip, mul(fwd, 5)), 2.6, 2.6, 'leather')
    cv.px(add(hip, mul(fwd, 3.5)), 'brass')
    cv.limb(add(add(hip, mul(fwd, -4)), mul(up, 1)), add(add(hip, mul(fwd, -6)), mul(up, -5)), 1.6, 1.4, 'leather_d')
    cv.px(add(add(hip, mul(fwd, -4)), mul(up, 1.5)), 'iron_l')
    cv.line(add(n_sh, mul(fwd, 3)), add(add(hip, mul(fwd, -3.5)), mul(up, 2)), 'leather', 2)

    # ---- 6. wolf-pelt mantle
    mantle = [add(chest, mul(fwd, -6.5)), add(add(chest, mul(fwd, -5)), mul(up, 2.5)),
              add(add(chest, mul(fwd, -3)), mul(up, 1)), add(add(chest, mul(fwd, -1)), mul(up, 3)),
              add(add(chest, mul(fwd, 1)), mul(up, 1.2)), add(add(chest, mul(fwd, 1.5)), mul(up, -1.5)),
              add(add(chest, mul(fwd, -3)), mul(up, -3.5)), add(add(chest, mul(fwd, -6.5)), mul(up, -3))]
    cv.poly(mantle, 'fur')
    cv.px(add(add(chest, mul(fwd, -4)), mul(up, 0.5)), 'fur_l')
    cv.px(add(add(chest, mul(fwd, -1.5)), mul(up, 1)), 'fur_l')

    # ---- 7. head: hair, face, beard, circlet
    head = add(chest, mul(up, 7))
    cv.limb(chest, add(chest, mul(up, 4)), 6, 5, 'skin_d')                  # thick neck
    cv.circle(add(head, mul(fwd, -1)), 5.2, 'hair')                       # hair mass
    cv.limb(add(head, mul(fwd, -4)), add(add(head, mul(fwd, -6)), mul(up, -8)), 3, 2.2, 'hair')  # braid
    cv.px(add(add(head, mul(fwd, -6)), mul(up, -6)), 'iron')
    face = [add(add(head, mul(fwd, -0.5)), mul(up, 3.5)), add(add(head, mul(fwd, 4)), mul(up, 2.5)),
            add(add(head, mul(fwd, 5)), mul(up, -0.5)), add(add(head, mul(fwd, 3.5)), mul(up, -4)),
            add(add(head, mul(fwd, -0.5)), mul(up, -4))]
    cv.poly(face, 'skin')
    beard = [add(add(head, mul(fwd, -0.5)), mul(up, -0.5)), add(add(head, mul(fwd, 5)), mul(up, -1)),
             add(add(head, mul(fwd, 4)), mul(up, -5)), add(add(head, mul(fwd, 1.5)), mul(up, -7)),
             add(add(head, mul(fwd, -1)), mul(up, -4))]
    cv.poly(beard, 'hair')
    cv.px(add(add(head, mul(fwd, 2)), mul(up, -4)), 'grey')
    cv.px(add(add(head, mul(fwd, 1.5)), mul(up, -6.5)), 'iron')          # beard ring
    cv.line(add(add(head, mul(fwd, -4.5)), mul(up, 2.5)), add(add(head, mul(fwd, 4.2)), mul(up, 2.2)), 'iron')  # circlet
    cv.px(add(add(head, mul(fwd, 3.5)), mul(up, 2.3)), 'ember')
    cv.px(add(add(head, mul(fwd, 2.8)), mul(up, 0.8)), 'outline')        # eye
    cv.px(add(add(head, mul(fwd, 3.8)), mul(up, 1.4)), 'hair')           # brow

    # ---- 8. the axe: Oathcleaver
    pommel = sub(grip, mul(ad, 9))
    tip = add(grip, mul(ad, 23))
    cv.line(pommel, tip, 'haft', 2)
    cv.circle(pommel, 1.2, 'iron')
    nrm = perp_cw(ad)

    def AP(a, n):
        return add(add(grip, mul(ad, 14 + a)), mul(nrm, n))

    blade = [AP(0, 0.5), AP(8, 0.5), AP(11, 7.5), AP(9.5, 10), AP(3, 10.5), AP(-3, 9.5), AP(-1, 5.5), AP(0.5, 1.5)]
    cv.poly(blade, 'iron')
    cv.poly([AP(1, 0.5), AP(8, 0.5), AP(8, 2.5), AP(1, 2.5)], 'iron_d')
    cv.line(AP(11, 7.5), AP(9.5, 10), 'iron_l')
    cv.line(AP(9.5, 10), AP(3, 10.5), 'iron_l')
    cv.line(AP(3, 10.5), AP(-3, 9.5), 'iron_l')
    cv.poly([AP(3, -0.5), AP(7, -0.5), AP(5, -5)], 'iron_d')                  # back spike
    rune = 'ember_l' if p['glow'] >= 2 else 'ember'
    if p['glow']:
        cv.px(AP(3, 5), rune)
        cv.px(AP(5, 6), rune)
        cv.px(AP(7, 5), rune)
    else:
        cv.px(AP(4, 5), 'iron_d')
        cv.px(AP(6, 6), 'iron_d')

    # far hand grips the haft
    cv.circle(f_hand, 2.4, 'skin_d')

    # ---- 9. near arm with bracer, pauldron and fist
    cv.limb(n_sh, n_elbow, 7, 6, 'skin')
    cv.line(add(n_sh, mul(fwd, 2.5)), add(n_elbow, mul(unit(perp_cw(unit(sub(n_elbow, n_sh)))), -2.2)), 'skin_l')
    cv.limb(n_elbow, n_hand, 6, 5, 'skin')
    cv.limb(add(n_elbow, mul(unit(sub(n_hand, n_elbow)), 3)), n_hand, 6.5, 5.5, 'iron_d')
    cv.px(add(n_elbow, mul(unit(sub(n_hand, n_elbow)), 4)), 'iron')
    cv.px(add(n_elbow, mul(unit(sub(n_hand, n_elbow)), 6)), 'iron')
    # Dawnward pauldron: layered steel dome
    pc = add(add(n_sh, mul(up, 0.2)), mul(fwd, -0.5))
    cv.circle(pc, 5, 'iron_d')
    cv.circle(add(pc, mul(up, 0.8)), 4.2, 'iron')
    cv.poly([add(add(pc, mul(up, 3.5)), mul(fwd, -2.5)), add(add(pc, mul(up, 4.3)), mul(fwd, 0.5)),
             add(add(pc, mul(up, 3)), mul(fwd, 2.5)), add(add(pc, mul(up, 2.5)), mul(fwd, 0))], 'iron_l')
    cv.line(add(add(pc, mul(up, -1.5)), mul(fwd, -4)), add(add(pc, mul(up, -1.5)), mul(fwd, 4)), 'iron_d')
    cv.px(add(add(pc, mul(up, 1)), mul(fwd, 0.5)), 'brass')
    cv.circle(n_hand, 2.6, 'skin')
    cv.px(add(n_hand, (0.5, -0.5)), 'skin_l')

    # ---- 10. sparks (Earth Shatter impact)
    if p['sparks']:
        base = add(grip, mul(ad, 24))
        for i, (dx, dy) in enumerate([(-6, -2), (-3, -6), (2, -8), (6, -4), (9, -1), (-9, 0), (4, -11), (-1, -3)]):
            cv.px(add(base, (dx, dy)), 'ember_l' if i % 2 else 'ember')

    return outline(cv.img)


def outline(img):
    """Adds a 1px dark outline around the sprite - the classic pixel-art look."""
    w, h = img.size
    src = img.load()
    out = img.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3]:
                    dst[x, y] = C['outline']
                    break
    return out


def rotate_frame(img, deg, center):
    cx, cy = center
    return img.rotate(deg, resample=Image.NEAREST, center=(AX + cx, AY + cy))


# ---------------------------------------------------------------- animations
def lerp_pose(a, b, t):
    out = {}
    for k in set(a) | set(b):
        va = a.get(k, DEFAULT[k])
        vb = b.get(k, DEFAULT[k])
        if isinstance(va, tuple):
            out[k] = tuple(x + (y - x) * t for x, y in zip(va, vb))
        elif isinstance(va, bool):
            out[k] = vb if t >= 0.5 else va
        else:
            out[k] = va + (vb - va) * t
    return out


IDLE = dict(lean=8, nThigh=16, nKnee=-10, fThigh=-14, fKnee=-4, grip=(50, 12), axe=140)
READY_LOW = dict(lean=10, nThigh=22, nKnee=-12, fThigh=-18, fKnee=-6, grip=(60, 13), axe=150)


def anim_idle():
    frames = []
    for i in range(4):
        b = [0, -0.4, -0.8, -0.4][i]
        pose = dict(IDLE)
        pose['hip'] = (0, -26 + b + 0.4)
        pose['grip'] = (50, 12 + b * 0.5)
        pose['cape'] = [0, 0.5, 1, 0.5][i]
        frames.append(draw_pose(pose))
    return frames


def anim_walk():
    frames = []
    for i in range(6):
        ph = i / 6 * math.tau
        s = math.sin(ph)
        pose = dict(IDLE)
        pose.update(
            hip=(0, -26 - abs(math.cos(ph)) * 1.0),
            nThigh=6 + 26 * s, nKnee=-4 - max(0, -s) * 30 - 6,
            fThigh=6 - 26 * s, fKnee=-4 - max(0, s) * 30 - 6,
            lean=10, grip=(50 + 4 * s, 12), axe=140 + 4 * s, cape=1.5 + math.cos(ph),
        )
        frames.append(draw_pose(pose))
    return frames


LUNGE = dict(nThigh=28, nKnee=-14, fThigh=-24, fKnee=-6, hip=(1, -27))


def seq(*poses):
    return [draw_pose(pz) for pz in poses]


def anim_light1():
    wind = dict(IDLE, lean=-4, grip=(70, 9), axe=255, cape=1)
    strike = dict(LUNGE, lean=16, grip=(92, 17), axe=92, cape=3)
    follow = dict(LUNGE, lean=12, grip=(70, 16), axe=55, cape=2)
    return {'startup': seq(wind, lerp_pose(wind, strike, 0.45)), 'active': seq(strike),
            'recovery': seq(follow, lerp_pose(follow, IDLE, 0.5))}


def anim_light2():
    low = dict(LUNGE, lean=14, grip=(45, 14), axe=35, cape=2)
    rise = dict(LUNGE, lean=-4, grip=(125, 16), axe=150, cape=3)
    top = dict(LUNGE, lean=-6, grip=(150, 14), axe=185, cape=2)
    return {'startup': seq(low, lerp_pose(low, rise, 0.4)), 'active': seq(rise),
            'recovery': seq(top, lerp_pose(top, IDLE, 0.5))}


def anim_light3():
    up = dict(IDLE, lean=-10, hip=(0, -27), grip=(165, 16), axe=195, nThigh=18, nKnee=-10, cape=1)
    chop = dict(LUNGE, lean=26, hip=(3, -22), grip=(82, 17), axe=70, nThigh=40, nKnee=-40, fThigh=-34, cape=4)
    down = dict(chop, grip=(55, 16), axe=28, cape=3)
    return {'startup': seq(up, lerp_pose(up, chop, 0.4)), 'active': seq(chop),
            'recovery': seq(down, lerp_pose(down, IDLE, 0.5))}


def anim_heavy():
    wind1 = dict(IDLE, lean=-12, hip=(-1, -27), grip=(160, 16), axe=210, cape=1)
    wind2 = dict(wind1, lean=-20, hip=(-2, -27.5), grip=(178, 17), axe=232, glow=1, cape=0)
    slam = dict(LUNGE, lean=32, hip=(4, -20), grip=(75, 17), axe=58, nThigh=45, nKnee=-50, fThigh=-38,
                fKnee=-10, glow=2, cape=5)
    ground = dict(slam, grip=(48, 16), axe=18, glow=1, sparks=True, cape=4)
    return {'startup': seq(wind1, wind2, wind2), 'active': seq(slam),
            'recovery': seq(ground, ground, lerp_pose(ground, IDLE, 0.5))}


def anim_air():
    tuck = dict(hip=(0, -26), lean=10, nThigh=60, nKnee=-95, fThigh=35, fKnee=-100, cape=4)
    start = dict(tuck, grip=(150, 15), axe=205)
    slash = dict(tuck, grip=(95, 17), axe=95, lean=16)
    return {'startup': seq(start), 'active': seq(slash)}


def anim_jump():
    rise = dict(lean=4, nThigh=45, nKnee=-75, fThigh=-5, fKnee=-45, grip=(150, 14), axe=200, cape=4)
    fall = dict(lean=8, nThigh=18, nKnee=-18, fThigh=-14, fKnee=-10, grip=(40, 12), axe=205, cape=-2)
    return {'rise': seq(rise), 'fall': seq(fall)}


def anim_block():
    guard = dict(lean=-4, hip=(0, -24), nThigh=26, nKnee=-26, fThigh=-24, fKnee=-10, grip=(85, 11), axe=180, cape=0)
    return seq(guard)


def anim_dodge():
    ball = dict(hip=(0, -15), lean=55, nThigh=110, nKnee=-140, fThigh=95, fKnee=-140, grip=(100, 9), axe=120, cape=2)
    base = draw_pose(ball)
    return [rotate_frame(base, -90 * i, (0, -14)) for i in range(4)]


def anim_cast():
    raise1 = dict(IDLE, lean=-10, hip=(0, -27), grip=(170, 16), axe=190, glow=1, cape=0)
    raise2 = dict(raise1, lean=-16, grip=(178, 17), axe=200, glow=2)
    slam = dict(LUNGE, lean=36, hip=(3, -19), grip=(62, 16), axe=12, nThigh=48, nKnee=-60, fThigh=-40,
                glow=2, sparks=True, cape=5)
    return seq(raise1, raise2, slam, dict(slam, glow=1))


def anim_hit():
    h1 = dict(IDLE, lean=-16, hip=(-2, -25), grip=(25, 12), axe=140, cape=-2)
    h2 = dict(h1, lean=-9, hip=(-1, -25.5))
    return seq(h1, h2)


LYING = dict(hip=(0, -3), lean=-90, nThigh=88, nKnee=-4, fThigh=92, fKnee=-2, grip=(45, 14), axe=70, cape=0)


def anim_knockdown():
    air = dict(lean=-50, hip=(0, -26), nThigh=55, nKnee=-20, fThigh=35, fKnee=-10, grip=(150, 15), axe=250, cape=-4)
    return {'air': seq(air), 'lying': seq(LYING)}


def anim_getup():
    sit = dict(hip=(0, -5), lean=-35, nThigh=85, nKnee=-35, fThigh=80, fKnee=-20, grip=(90, 12), axe=150, cape=0)
    kneel = dict(hip=(0, -16), lean=10, nThigh=85, nKnee=-90, fThigh=-25, fKnee=-80, grip=(70, 12), axe=175)
    return seq(sit, kneel)


# ---------------------------------------------------------------- build the sheet
def build():
    anims = {}
    frames = []

    def put(imgs):
        start = len(frames)
        frames.extend(imgs)
        return list(range(start, len(frames)))

    anims['idle'] = {'frames': put(anim_idle()), 'fps': 5, 'loop': True}
    anims['walk'] = {'frames': put(anim_walk()), 'fps': 10, 'loop': True}
    for name, fn in (('light1', anim_light1), ('light2', anim_light2), ('light3', anim_light3),
                     ('heavy', anim_heavy), ('airAttack', anim_air)):
        parts = fn()
        anims[name] = {'phases': {k: put(v) for k, v in parts.items()}}
    j = anim_jump()
    anims['jump'] = {'rise': put(j['rise']), 'fall': put(j['fall'])}
    anims['block'] = {'frames': put(anim_block()), 'fps': 1, 'loop': True}
    anims['dodge'] = {'frames': put(anim_dodge()), 'fps': 14, 'loop': True}
    anims['cast'] = {'frames': put(anim_cast()), 'fps': 1, 'spread': True}
    anims['hitstun'] = {'frames': put(anim_hit()), 'fps': 8, 'loop': False}
    k = anim_knockdown()
    anims['knockdown'] = {'air': put(k['air']), 'lying': put(k['lying'])}
    anims['getup'] = {'frames': put(anim_getup()), 'fps': 1, 'spread': True}

    rows = math.ceil(len(frames) / COLS)
    sheet = Image.new('RGBA', (FW * COLS, FH * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, ((i % COLS) * FW, (i // COLS) * FH))

    os.makedirs(OUT_DIR, exist_ok=True)
    sheet.save(os.path.join(OUT_DIR, 'ulric.png'))
    meta = {
        'name': 'Ulric Varr', 'image': 'assets/sprites/ulric.png',
        'frameWidth': FW, 'frameHeight': FH, 'anchorX': AX, 'anchorY': AY,
        'scale': 2, 'frameCount': len(frames), 'anims': anims,
    }
    with open(os.path.join(OUT_DIR, 'ulric.json'), 'w') as fh:
        json.dump(meta, fh, indent=1)
    return sheet, frames, meta


if __name__ == '__main__':
    s, f, m = build()
    print(f'Wrote {len(f)} frames -> {OUT_DIR}')
