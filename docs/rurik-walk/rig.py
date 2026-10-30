# rig.py: Rurik's side walk from ChatGPT-painted pieces (docs/rurik-walk/README.md)
import math, numpy as np
from PIL import Image
NAMES=['body','arm','nthigh','nshin','nboot','fthigh','fshin','fboot']
parts={}
def load(pdir):
    for n in NAMES: parts[n]=Image.open(f'{pdir}/{n}.png').convert('RGBA')
    parts['nboot']=scale(parts['nboot'],CFG['boot_scale']); parts['fboot']=scale(parts['fboot'],CFG['boot_scale'])
def scale(im,s): return im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
# piece coords (px in each cut-out); body piece origin is its own bbox
CFG=dict(hip=(464,470), farhip=(-16,-6), shoulder=(530,225), arm_top=(60,45),
         thigh_top=40, thigh_knee=30, shin_top=45, shin_ankle=25, boot_scale=0.82,
         ankle=0.30, ankle_y=0.15, sole_in=0.04)
KF=[(0.00,32,4,16),(0.12,25,18,0),(0.30,10,10,0),(0.48,-12,8,0),(0.60,-28,22,-22),(0.72,-12,62,-16),(0.86,18,48,0)]
ST=0.60
def interp(t,idx):
    t%=1; n=len(KF); ts=[k[0] for k in KF]
    i=max(j for j in range(n) if ts[j]<=t); j=(i+1)%n
    t0=ts[i]; t1=ts[j] if j else 1.0; u=(t-t0)/(t1-t0)
    p0=KF[(i-1)%n][idx]; p1=KF[i][idx]; p2=KF[j][idx]; p3=KF[(j+1)%n][idx]
    return 0.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u**3)
def lens():
    th=parts['nthigh']; sh=parts['nshin']
    return th.height-CFG['thigh_top']-CFG['thigh_knee'], sh.height-CFG['shin_top']-CFG['shin_ankle']
def ankx(a,k):
    L1,L2=lens(); return L1*math.sin(math.radians(a))+L2*math.sin(math.radians(a-k))
def solve_a(x,k,a):
    for _ in range(30):
        f=ankx(a,k)-x; df=(ankx(a+0.01,k)-ankx(a,k))/0.01; a-=f/df
    return a
def d(a): r=math.radians(a); return (math.sin(r), math.cos(r))
def leg(hip,t):
    t%=1; a=interp(t,1); k=interp(t,2); c=interp(t,3)
    if t<=ST:
        X0=ankx(KF[0][1],KF[0][2]); X1=ankx(KF[4][1],KF[4][2]); a=solve_a(X0+(X1-X0)*t/ST,k,a)
    L1,L2=lens(); knee=(hip[0]+L1*d(a)[0],hip[1]+L1*d(a)[1]); b=a-k
    return dict(a=a,b=b,c=c,hip=hip,knee=knee,ank=(knee[0]+L2*d(b)[0],knee[1]+L2*d(b)[1]))
def boot_pts():
    bt=parts['nboot']; w,h=bt.size
    return (w*CFG['ankle'],h*CFG['ankle_y']), (w*CFG['sole_in'],h-3), (w*(1-CFG['sole_in']),h-3)
def rotpt(p,piv,ang):
    r=math.radians(-ang); x,y=p[0]-piv[0],p[1]-piv[1]
    return (x*math.cos(r)-y*math.sin(r), x*math.sin(r)+y*math.cos(r))
def soles(L):
    piv,heel,toe=boot_pts(); out=[]
    for sp in (heel,toe):
        v=rotpt(sp,piv,L['c']); out.append((L['ank'][0]+v[0],L['ank'][1]+v[1]))
    return out
def paste(canvas,im,piv,ang,pos):
    R=int(math.hypot(*im.size))+4
    pad=Image.new('RGBA',(2*R,2*R)); pad.paste(im,(int(R-piv[0]),int(R-piv[1])))
    pad=pad.rotate(ang,resample=Image.BICUBIC,center=(R,R))
    canvas.alpha_composite(pad,(int(round(pos[0]-R)),int(round(pos[1]-R))))
def draw_leg(canvas,L,pre,off):
    th,sh,bt=parts[pre+'thigh'],parts[pre+'shin'],parts[pre+'boot']
    o=lambda p:(p[0]+off[0],p[1]+off[1])
    paste(canvas,bt,boot_pts()[0],L['c'],o(L['ank']))
    paste(canvas,sh,(sh.width/2,CFG['shin_top']),L['b'],o(L['knee']))
    paste(canvas,th,(th.width/2,CFG['thigh_top']),L['a'],o(L['hip']))
def sway_body(t,bob_vel):
    # cape and hair trail: everything behind the back moves with a lag, more toward the ends
    b=np.array(parts['body']).astype(np.float32); H,W=b.shape[:2]
    hx,hy=CFG['hip']; back=hx-120
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    w=np.clip((back-xx)/250,0,1)*np.clip((yy-60)/450,0,1.2)          # cape: behind the back, lower = more
    hair=np.clip((back+60-xx)/200,0,1)*np.clip((220-yy)/120,0,1)       # hair streaming back
    ph=2*math.pi*2*t
    dx=w*(10*math.sin(ph-1.2))+hair*(6*math.sin(ph-0.8))
    dy=w*(-bob_vel*0.9)+w*(5*math.cos(ph-1.2))
    sx=np.clip(xx-dx,0,W-1); sy=np.clip(yy-dy,0,H-1)
    x0=np.floor(sx).astype(int); y0=np.floor(sy).astype(int); x1=np.minimum(x0+1,W-1); y1=np.minimum(y0+1,H-1)
    fx=(sx-x0)[...,None]; fy=(sy-y0)[...,None]
    out=b[y0,x0]*(1-fx)*(1-fy)+b[y0,x1]*fx*(1-fy)+b[y1,x0]*(1-fx)*fy+b[y1,x1]*fx*fy
    return Image.fromarray(out.clip(0,255).astype(np.uint8),'RGBA')
def hip_drop(t):
    hipN=(0,0); hipF=(CFG['farhip'][0],CFG['farhip'][1])
    Ln=leg(hipN,t); Lf=leg(hipF,t+0.5)
    return max(p[1] for L in (Ln,Lf) for p in soles(L)),Ln,Lf
def frame(t,W=1600,H=1300,ground=1220,cx=760):
    low,Ln,Lf=hip_drop(t); hy=ground-low
    vel=(hip_drop(t+0.01)[0]-hip_drop(t-0.01)[0])/0.02/40   # px per 1/40 cycle
    ph=2*math.pi*t
    lean=1.6*math.sin(2*ph+0.6)+1.0                            # slight forward lean, rocks each step
    c=Image.new('RGBA',(W,H))
    hip=(cx,hy)
    # free (far) arm: swings opposite the far leg, i.e. with the near leg; behind the body
    arm_ang=22*math.cos(ph)+4
    sh=rotpt((CFG['shoulder'][0],CFG['shoulder'][1]),CFG['hip'],lean)
    paste(c,parts['arm'],CFG['arm_top'],arm_ang+lean*0.5,(hip[0]+sh[0],hip[1]+sh[1]))
    draw_leg(c,Lf,'f',(cx,hy)); draw_leg(c,Ln,'n',(cx,hy))
    body=sway_body(t,vel)
    paste(c,body,CFG['hip'],-lean,hip)
    return c,hy,Ln,Lf
