# Draw an 8-pose hero-strut pose guide (side view, facing right) + preview GIF.
import math, sys
from PIL import Image, ImageDraw
OUT = sys.argv[1]
W, H = 300, 420
GROUND = 390
L1, L2 = 92, 92           # thigh, shin
HIPH = 186
S = 140
NEAR = (215, 40, 40); FAR = (60, 70, 150); BODY = (150, 150, 150); ARMN=(230,120,60); ARMF=(90,110,170)

def ease(u): return 0.5 - 0.5*math.cos(math.pi*u)
def foot(t):
    t %= 1
    if t < 0.5:          # stance: foot slides from front to back (body moves over it)
        u = t/0.5; return (S/2 - S*u, 0.0)
    u = (t-0.5)/0.5       # swing: comes forward and up
    return (-S/2 + S*ease(u), 26*math.sin(math.pi*u)**1.3)
def ik(hip, ft):
    hx, hy = hip; fx, fy = ft
    dx, dy = fx-hx, fy-hy; d = min(math.hypot(dx, dy), L1+L2-0.5)
    a = math.atan2(dy, dx)
    b = math.acos((L1*L1 + d*d - L2*L2)/(2*L1*d))
    ka = a - b            # knee bends forward (to the right) in screen coords (y down)
    return (hx + L1*math.cos(ka), hy + L1*math.sin(ka))
def pose(t, cx):
    # hip: lowest just after contact (weight drop), highest at passing
    # hip height: the planted leg stays nearly straight (a small dip just after each contact)
    fn0, ff0 = foot(t), foot(t+0.5)
    reach = max(abs(f[0]) for f in (fn0, ff0) if f[1] < 1)
    hh = math.sqrt((0.995*(L1+L2))**2 - reach**2) - 4*max(0, math.sin(4*math.pi*t))
    hip = (cx, GROUND - 10 - hh)
    fn = foot(t); ff = foot(t+0.5)
    to = lambda f: (cx + f[0], GROUND - f[1] - 10)
    return hip, to(fn), to(ff)
def draw(d, t, cx, label=None):
    hip, fn, ff = pose(t, cx)
    # far side first
    for (ft, col, w) in ((ff, FAR, 15), (fn, NEAR, 18)):
        k = ik(hip, ft)
        d.line([hip, k, ft], fill=col, width=w, joint='curve')
        d.ellipse([k[0]-7, k[1]-7, k[0]+7, k[1]+7], fill=col)
        d.polygon([(ft[0]-10, ft[1]-6), (ft[0]+26, ft[1]+4), (ft[0]-12, ft[1]+10)], fill=col)
    sw = math.sin(2*math.pi*t)    # + when near leg is forward
    # torso: chest out, leans a touch forward into each step; shoulders counter-rock
    lean = 4 + 3*math.cos(4*math.pi*(t-0.06))
    sh = (hip[0]+lean, hip[1]-118)
    shF = (sh[0]-4*sw, sh[1]-1.5*sw)   # far shoulder (sword) swings back when near leg forward
    shN = (sh[0]+4*sw, sh[1]+1.5*sw)
    d.line([hip, sh], fill=BODY, width=34)
    # head: rides the bob a frame late, nods slightly
    hd = (sh[0]+4, sh[1]-44 + 1.5*math.cos(4*math.pi*(t-0.18)))
    d.ellipse([hd[0]-17, hd[1]-18, hd[0]+17, hd[1]+18], fill=BODY)
    d.line([(hd[0]+4, hd[1]), (hd[0]+18, hd[1]+2)], fill=(60,60,60), width=4)  # facing
    # sword arm (far side, behind body): swings opposite the far leg, blade trails low
    a2 = math.radians(90 + 12*sw)
    el2 = (shF[0] + 50*math.cos(a2), shF[1] + 50*math.sin(a2))
    hand = (el2[0]+14 + 5*sw, el2[1]+38)
    tip = (hand[0] + 120*math.cos(math.radians(35+4*sw)), hand[1] + 120*math.sin(math.radians(35+4*sw)))
    d.line([hand, tip], fill=(120,120,120), width=6)
    d.line([shF, el2, hand], fill=ARMF, width=12)
    # free arm (near side): swings opposite the near leg, fist loose
    a1 = math.radians(90 - 16*sw)
    el = (shN[0] + 52*math.cos(a1), shN[1] + 52*math.sin(a1))
    fist = (el[0] + 18*math.cos(a1-0.5), el[1] + 44)
    d.line([shN, el, fist], fill=ARMN, width=12)
    d.ellipse([fist[0]-8, fist[1]-8, fist[0]+8, fist[1]+8], fill=ARMN)
    if label: d.text((cx-140, 8), label, fill=(0,0,0))

names = ['1 CONTACT', '2 DOWN', '3 PASSING', '4 UP', '5 CONTACT', '6 DOWN', '7 PASSING', '8 UP']
sheet = Image.new('RGB', (W*8, H), 'white'); d = ImageDraw.Draw(sheet)
for i in range(8):
    x0 = i*W
    d.line([(x0, GROUND), (x0+W, GROUND)], fill=(0,0,0), width=2)
    for k in range(-2, 3): d.line([(x0+W/2+k*S/2, GROUND), (x0+W/2+k*S/2, GROUND+12)], fill=(0,0,0), width=1)
    draw(d, i/8, x0+W/2, names[i])
    if i: d.line([(x0, 0), (x0, H)], fill=(200,200,200))
sheet.save(OUT + '/pose-guide.png')
# preview: in place and walking across
frames = []
for j in range(32):
    t = (j % 8)/8
    im = Image.new('RGB', (W, H), 'white'); dd = ImageDraw.Draw(im)
    dd.line([(0, GROUND), (W, GROUND)], fill=(0,0,0), width=2)
    draw(dd, t, W/2); frames.append(im)
frames[0].save(OUT + '/pose-guide.gif', save_all=True, append_images=frames[1:], duration=95, loop=0)
