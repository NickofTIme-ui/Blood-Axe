# Hero swagger pose guide v2: loose, weighty, 12 poses (2 rows of 6). Side view, facing right.
import math, sys
from PIL import Image, ImageDraw
OUT = sys.argv[1]; N = 12; COLS = 6
W, H = 340, 470
GROUND = 430
L1, L2 = 96, 96
S = 170                    # step length
NEAR=(215,40,40); FAR=(60,70,150); BODY=(165,165,165); BODYD=(120,120,120); ARMN=(235,125,60); ARMF=(85,105,170); SW=(110,110,110)

def ease(u): return 0.5-0.5*math.cos(math.pi*u)
def foot(t):
    """x, lift, pitch (deg; + = toe up)"""
    t %= 1
    if t < 0.5:
        u = t/0.5; x = S/2 - S*u
        if u < 0.14: pitch = 22*(1-u/0.14)           # heel strike, toe still up
        elif u > 0.72: pitch = -38*((u-0.72)/0.28)   # heel peels off, pushing off the toe
        else: pitch = 0
        return x, 0.0, pitch
    u = (t-0.5)/0.5
    x = -S/2 + S*ease(u**1.15)
    lift = 30*math.sin(math.pi*u)**1.2
    pitch = -38*(1-u)**2 + 22*u**3
    return x, lift, pitch
def ik(hip, ank):
    dx, dy = ank[0]-hip[0], ank[1]-hip[1]; d = min(math.hypot(dx,dy), L1+L2-0.5)
    a = math.atan2(dy,dx); b = math.acos((L1*L1+d*d-L2*L2)/(2*L1*d))
    return (hip[0]+L1*math.cos(a-b), hip[1]+L1*math.sin(a-b))
def limb(d, pts, col, w):
    d.line(pts, fill=col, width=w, joint='curve')
    for p in pts: d.ellipse([p[0]-w/2, p[1]-w/2, p[0]+w/2, p[1]+w/2], fill=col)
def boot(d, ank, pitch, col):
    a = math.radians(-pitch); c, s = math.cos(a), math.sin(a)
    shape = [(-14,-8),(10,-8),(34,6),(34,12),(-14,12)]
    d.polygon([(ank[0]+x*c-y*s, ank[1]+x*s+y*c) for x,y in shape], fill=col)

def draw(d, t, cx, label=None):
    fn, ff = foot(t), foot(t+0.5)
    sw = math.cos(2*math.pi*t)          # +1 when the NEAR leg is forward (pose 1)
    # hips: drop after each contact, rise over the passing leg
    grounded = [f for f in (fn, ff) if f[1] < 1]
    reach = max(abs(f[0]) for f in grounded)
    hh = math.sqrt((0.992*(L1+L2))**2 - reach**2) - 7*max(0, math.sin(4*math.pi*(t+0.02)))
    def ankle(f):
        return (cx+f[0], GROUND-12-f[1])
    hip = (cx - 4, GROUND-12-hh)
    hipN = (hip[0]+5*sw, hip[1]); hipF = (hip[0]-5*sw, hip[1])   # pelvis turns with the legs
    # far leg, then far arm + sword, torso, near leg, near arm
    aF, aN = ankle(ff), ankle(fn)
    limb(d, [hipF, ik(hipF,aF), aF], FAR, 19); boot(d, aF, ff[2], FAR)
    lean = math.radians(7 + 2.5*math.cos(4*math.pi*(t-0.05)))    # into the step, a touch more on each footfall
    chest = (hip[0]+128*math.sin(lean), hip[1]-128*math.cos(lean))
    # shoulders counter the hips: near shoulder comes forward as the near leg goes back
    shN = (chest[0]-13*sw, chest[1]+3*sw+4); shF = (chest[0]+13*sw, chest[1]-3*sw+4)
    # sword arm (far): hangs relaxed, swings with its shoulder, blade trails low behind the hand
    a2 = math.radians(96 - 20*sw); el2 = (shF[0]+54*math.cos(a2), shF[1]+54*math.sin(a2))
    f2 = math.radians(82 - 26*sw); hand2 = (el2[0]+48*math.cos(f2), el2[1]+48*math.sin(f2))
    b = math.radians(38 - 9*sw); tip = (hand2[0]+135*math.cos(b), hand2[1]+135*math.sin(b))
    d.line([hand2, tip], fill=SW, width=7); limb(d, [shF, el2, hand2], ARMF, 13)
    # torso: pelvis + ribcage, chest leading
    d.polygon([(hip[0]-20,hip[1]+6),(hip[0]+18,hip[1]+6),(chest[0]+26,chest[1]+18),(chest[0]+20,chest[1]-8),(chest[0]-22,chest[1]-8),(chest[0]-26,chest[1]+30)], fill=BODY)
    d.line([(hip[0]-20,hip[1]-14),(hip[0]+19,hip[1]-14)], fill=BODYD, width=5)   # belt
    # head: level and forward, rides the bob late
    hd = (chest[0]+10, chest[1]-34 + 2*math.cos(4*math.pi*(t-0.16)))
    d.ellipse([hd[0]-19,hd[1]-21,hd[0]+19,hd[1]+21], fill=BODY)
    d.polygon([(hd[0]+14,hd[1]-2),(hd[0]+27,hd[1]+3),(hd[0]+14,hd[1]+8)], fill=BODYD)
    limb(d, [hipN, ik(hipN,aN), aN], NEAR, 22); boot(d, aN, fn[2], NEAR)
    # free arm (near): loose swing opposite the near leg; elbow bends more as it comes forward
    a1 = math.radians(92 + 30*sw); el = (shN[0]+56*math.cos(a1), shN[1]+56*math.sin(a1))
    f1 = math.radians(78 + 44*sw - 18*max(0,-sw)); fist = (el[0]+50*math.cos(f1), el[1]+50*math.sin(f1))
    limb(d, [shN, el, fist], ARMN, 14); d.ellipse([fist[0]-10,fist[1]-10,fist[0]+10,fist[1]+10], fill=ARMN)
    if label: d.text((cx-W/2+10, 8), label, fill=(0,0,0))

rows = N//COLS
sheet = Image.new('RGB', (W*COLS, H*rows), 'white'); d = ImageDraw.Draw(sheet)
for i in range(N):
    x0, y0 = (i%COLS)*W, (i//COLS)*H
    cell = Image.new('RGB', (W, H), 'white'); dd = ImageDraw.Draw(cell)
    dd.line([(0,GROUND),(W,GROUND)], fill=(0,0,0), width=2)
    draw(dd, i/N, W/2, str(i+1))
    dd.rectangle([0,0,W-1,H-1], outline=(205,205,205))
    sheet.paste(cell, (x0, y0))
sheet.save(OUT+'/pose-guide-v2.png')
frames=[]
for j in range(N*2):
    im = Image.new('RGB', (W, H), 'white'); dd = ImageDraw.Draw(im)
    dd.line([(0,GROUND),(W,GROUND)], fill=(0,0,0), width=2); draw(dd, (j%N)/N, W/2); frames.append(im)
frames[0].save(OUT+'/pose-guide-v2.gif', save_all=True, append_images=frames[1:], duration=70, loop=0)
