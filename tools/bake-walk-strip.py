# bake a black-bg 8-pose walk strip into an HD sheet (416x480 cells, feet anchor 208,460)
# torso-registered in x, ground-registered in y. Prints stride (world px per cycle).
import sys, json, numpy as np
from PIL import Image, ImageDraw
src, out, ref_h = sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv)>3 else 224
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.int32)
lum = a.max(2); mask = lum > 30
cols = mask.sum(0) > 2
runs=[]; inr=False
for x,c in enumerate(cols):
    if c and not inr: s=x; inr=True
    if not c and inr: runs.append([s,x]); inr=False
if inr: runs.append([s,len(cols)])
m=[]
for r in runs:
    if r[1]-r[0] < 3: continue
    if m and r[0]-m[-1][1] < 25: m[-1][1]=r[1]
    else: m.append(r)
m=[r for r in m if r[1]-r[0]>60]
assert len(m)==8, m
figs=[]
for x0,x1 in m:
    pad=10; x0=max(0,x0-pad); x1=min(a.shape[1],x1+pad)
    sub=mask[:,x0:x1]; ys=np.where(sub.any(1))[0]
    figs.append(dict(x0=x0,x1=x1,y0=int(ys[0]),y1=int(ys[-1])))
H=np.median([f['y1']-f['y0'] for f in figs]); scale=ref_h/H
# torso band of the first figure as template
def band(f, dx=0):
    h=f['y1']-f['y0']; t=f['y0']+int(h*0.16); b=f['y0']+int(h*0.40)
    return t,b
ref=figs[0]; t,b=band(ref)
tmpl=(lum[t:b, ref['x0']:ref['x1']]>30).astype(float)
cx=[]
for f in figs:
    best=None
    reg=(lum[t-10:b+10, :]>30).astype(float)
    for dy in range(-6,7):
      for x in range(f['x0']-40, f['x1']-tmpl.shape[1]+40):
        if x<0 or x+tmpl.shape[1]>a.shape[1]: continue
        win=reg[10+dy:10+dy+tmpl.shape[0], x:x+tmpl.shape[1]]
        sc=(win*tmpl).sum()-0.5*np.abs(win-tmpl).sum()
        if best is None or sc>best[0]: best=(sc,x,dy)
    cx.append(best[1]-ref['x0'])   # offset of this figure's torso vs ref torso
# anchor: ref torso center maps to x=208 (shifted so feet centre on average)
FW,FH=416,480
sheet=Image.new('RGBA',(FW*8,FH),(0,0,0,0))
dark=lum<=5
bgm=np.zeros_like(dark); bgm[0,:]=dark[0,:]; bgm[-1,:]=dark[-1,:]; bgm[:,0]=dark[:,0]; bgm[:,-1]=dark[:,-1]
while True:
    g=bgm.copy(); g[1:]|=bgm[:-1]; g[:-1]|=bgm[1:]; g[:,1:]|=bgm[:,:-1]; g[:,:-1]|=bgm[:,1:]
    g&=dark
    if (g==bgm).all(): break
    bgm=g
alpha=np.where(bgm,0,255).astype(np.uint8)
# soften: non-bg pixels touching bg that are dark get partial alpha
nb=np.zeros_like(bgm)
nb[1:]|=bgm[:-1]; nb[:-1]|=bgm[1:]; nb[:,1:]|=bgm[:,:-1]; nb[:,:-1]|=bgm[:,1:]
edge=nb&~bgm
alpha[edge]=np.clip(lum[edge]*12,40,255)
rgba=np.dstack([a.astype(np.uint8), alpha])
src_rgba=Image.fromarray(rgba,'RGBA')
anchor_src = ref['x0'] + (ref['x1']-ref['x0'])/2
feet=[]
for i,f in enumerate(figs):
    crop=src_rgba.crop((f['x0'],f['y0'],f['x1'],f['y1']+1))
    w,h=crop.size; crop=crop.resize((max(1,round(w*scale)),max(1,round(h*scale))),Image.LANCZOS)
    # x: torso of figure i lands where ref torso lands
    ox = 208 + (f['x0'] - (anchor_src + cx[i]))*scale
    oy = 460 - (f['y1']+1-f['y0'])*scale
    sheet.alpha_composite(crop,(int(round(ox)) + i*FW, int(round(oy))))
    # feet clusters (in cell coords)
    sub=mask[f['y1']-int((f['y1']-f['y0'])*0.06):f['y1']+1, f['x0']:f['x1']]
    fc=np.where(sub.any(0))[0]; g=[];s=fc[0];p=fc[0]
    for c in fc[1:]:
        if c>p+4: g.append((s,p)); s=c
        p=c
    g.append((s,p))
    feet.append([round(ox+(lo+hi)/2*scale) for lo,hi in g])
sheet.save(out)
print('scale',round(scale,3),'torso offsets',cx)
print('grounded feet x per frame (cell px, anchor 208):',feet)
