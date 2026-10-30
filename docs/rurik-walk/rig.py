import math, json, sys, numpy as np
from PIL import Image, ImageDraw
P='parts/'
def load(n): return Image.open(P+n+'.png').convert('RGBA')
parts={n:load(n) for n in ['body','nthigh','nshin','nboot','fthigh','fshin','fboot']}
CFG=dict(hip=(464,470), farhip=(-14,-6), thigh_top=30, thigh_knee=22, shin_top=40, shin_ankle=18,
         ankle=(51,22), sole_heel=(12,104), sole_toe=(170,104))

# keyframes: t, hip, knee, foot
KF=[(0.00,32,4,16),(0.12,25,18,0),(0.30,10,10,0),(0.48,-12,8,0),(0.60,-28,22,-22),(0.72,-12,62,-16),(0.86,18,48,0)]
def interp(t,idx):
    t%=1; n=len(KF); ts=[k[0] for k in KF]
    i=max(j for j in range(n) if ts[j]<=t); j=(i+1)%n
    t0=ts[i]; t1=ts[j] if j else 1.0
    u=(t-t0)/(t1-t0)
    p0=KF[(i-1)%n][idx]; p1=KF[i][idx]; p2=KF[j][idx]; p3=KF[(j+1)%n][idx]
    return 0.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u**3)
def d(a): r=math.radians(a); return (math.sin(r), math.cos(r))
ST=0.60
def lens():
    th=parts['nthigh']; sh=parts['nshin']
    return th.height-CFG['thigh_top']-CFG['thigh_knee'], sh.height-CFG['shin_top']-CFG['shin_ankle']
def ankx(a,k):
    L1,L2=lens(); return L1*math.sin(math.radians(a))+L2*math.sin(math.radians(a-k))
def solve_a(x,k,guess):
    a=guess
    for _ in range(30):
        f=ankx(a,k)-x; df=(ankx(a+0.01,k)-ankx(a,k))/0.01; a-=f/df
    return a
def leg(hip,t):
    t%=1
    a=interp(t,1); k=interp(t,2); c=interp(t,3)
    if t<=ST:
        X0=ankx(KF[0][1],KF[0][2]); X1=ankx(KF[4][1],KF[4][2])
        a=solve_a(X0+(X1-X0)*t/ST,k,a)
    L1,L2=lens()
    knee=(hip[0]+L1*d(a)[0],hip[1]+L1*d(a)[1]); b=a-k
    ank=(knee[0]+L2*d(b)[0],knee[1]+L2*d(b)[1])
    return dict(a=a,b=b,c=c,hip=hip,knee=knee,ank=ank)
def rotpt(p,piv,ang):
    r=math.radians(-ang); x,y=p[0]-piv[0],p[1]-piv[1]
    return (x*math.cos(r)-y*math.sin(r), x*math.sin(r)+y*math.cos(r))
def soles(L):
    out=[]
    for sp in (CFG['sole_heel'],CFG['sole_toe']):
        v=rotpt(sp,CFG['ankle'],L['c']); out.append((L['ank'][0]+v[0],L['ank'][1]+v[1]))
    return out
def paste(canvas,im,piv,ang,pos):
    R=int(math.hypot(*im.size))+4
    pad=Image.new('RGBA',(2*R,2*R)); pad.paste(im,(int(R-piv[0]),int(R-piv[1])))
    pad=pad.rotate(ang,resample=Image.BICUBIC,center=(R,R))
    canvas.alpha_composite(pad,(int(round(pos[0]-R)),int(round(pos[1]-R))))
def draw_leg(canvas,L,pre,dy):
    th,sh,bt=parts[pre+'thigh'],parts[pre+'shin'],parts[pre+'boot']
    sh_off=lambda p:(p[0],p[1]+dy)
    paste(canvas,bt,CFG['ankle'],L['c'],sh_off(L['ank']))
    paste(canvas,sh,(sh.width/2,CFG['shin_top']),L['b'],sh_off(L['knee']))
    paste(canvas,th,(th.width/2,CFG['thigh_top']),L['a'],sh_off(L['hip']))
def frame(t,W=1400,H=1250,ground=1180,cx=700):
    hipN=(cx,0); hipF=(cx+CFG['farhip'][0],CFG['farhip'][1])
    Ln=leg(hipN,t); Lf=leg(hipF,t+0.5)
    low=max(p[1] for L in (Ln,Lf) for p in soles(L))
    dy=ground-low
    c=Image.new('RGBA',(W,H))
    draw_leg(c,Lf,'f',dy); draw_leg(c,Ln,'n',dy)
    b=parts['body']; c.alpha_composite(b,(int(cx-CFG['hip'][0]),int(dy-CFG['hip'][1])))
    # stance foot x (for stride calc)
    feet=[min(soles(L),key=lambda p:-p[1])[0] for L in (Ln,Lf)]
    return c,dy,Ln,Lf
if __name__=='__main__':
    out=sys.argv[1]; N=8
    fr=[frame(i/N)[0] for i in range(N)]
    sheet=Image.new('RGBA',(N*350,330),(60,58,66,255))
    for i,f in enumerate(fr):
        bb=f.getbbox(); s=f.resize((f.width//4,f.height//4),Image.LANCZOS); sheet.alpha_composite(s,(i*350,0))
    sheet.convert('RGB').save(out)
    # stride: track near ankle x relative while stance between t=0.05..0.5
    xs=[leg((0,0),t)['ank'][0] for t in (0.02,0.5)]; print('stance sweep',xs[0]-xs[1])
