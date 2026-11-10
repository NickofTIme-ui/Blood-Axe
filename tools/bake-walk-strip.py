# Bake a black-background walk sheet (R rows x C cols of poses, read row by row) into an HD
# strip: 416x480 cells in one row, feet on y=460, every pose lined up on his armoured chest
# so he does not wobble. Prints stride (world px per cycle) and pose keys for MarchCycle.
#   python tools/bake-walk-strip.py in.png out.png ROWS COLS [figure_height_hd=224]
import sys, json, numpy as np
from PIL import Image
src, out, R, C = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
ref_h = float(sys.argv[5]) if len(sys.argv) > 5 else 224
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.int32)
lum = a.max(2); mask = lum > 30; solid = lum > 9
def runs(v, gap, minlen):
    out=[]; s=None
    for i,c in enumerate(list(v)+[False]):
        if c and s is None: s=i
        if not c and s is not None: out.append([s,i]); s=None
    m=[]
    for r in out:
        if m and r[0]-m[-1][1] < gap: m[-1][1]=r[1]
        else: m.append(r)
    return [r for r in m if r[1]-r[0] >= minlen]
rows = runs(mask.sum(1) > 3, 12, 80)
assert len(rows) == R, ('rows', rows)
figs=[]; keep=np.zeros_like(mask)
def component(sub, seed):
    cur=np.zeros_like(sub); cur[seed]=True; cur&=sub
    while True:
        g=cur.copy(); g[1:]|=cur[:-1]; g[:-1]|=cur[1:]; g[:,1:]|=cur[:,:-1]; g[:,:-1]|=cur[:,1:]; g&=sub
        if (g==cur).all(): return cur
        cur=g
Wd=a.shape[1]
for (y0,y1) in rows:
    prof=mask[y0:y1].sum(0); cuts=[0]
    for k in range(1,C):
        x=int(k*Wd/C); lo=x-45; cuts.append(lo+int(np.argmin(prof[lo:x+45])))
    cuts.append(Wd)
    for k in range(C):
        x0,x1=cuts[k],cuts[k+1]; sub=solid[max(0,y0-8):y1+8,x0:x1]; y0_=max(0,y0-8)
        ys,xs=np.where(sub); cy,cx_=int(np.median(ys)),int(np.median(xs))
        seed=(slice(max(0,cy-25),cy+25), slice(max(0,cx_-25),cx_+25))
        comp=component(sub, seed); keep[y0_:y0_+sub.shape[0],x0:x1]=comp
        ys,xs=np.where(comp)
        figs.append(dict(x0=x0+int(xs.min()), x1=x0+int(xs.max())+1, y0=y0_+int(ys.min()), y1=y0_+int(ys.max())))
mask=mask&keep
order=json.loads(sys.argv[6]) if len(sys.argv)>6 else list(range(len(figs)))
figs=[figs[i] for i in order]
N=len(figs); H=np.median([f['y1']-f['y0'] for f in figs]); scale=ref_h/H
r,g,b = a[...,0],a[...,1],a[...,2]
armour = mask & ~((r > 1.5*g) & (r > 80)) & (lum < 215)      # not cape red, not blade white
def chest_x(f):
    h=f['y1']-f['y0']; t=f['y0']+int(h*0.17); bt=f['y0']+int(h*0.33)
    xs=np.where(armour[t:bt, f['x0']:f['x1']])[1]
    return f['x0'] + float(np.median(xs))
def feet(f):
    h=f['y1']-f['y0']; band=mask[f['y1']-int(h*0.035):f['y1']+1, f['x0']:f['x1']]
    fc=np.where(band.any(0))[0]; g=[]; s=p=fc[0]
    for c in fc[1:]:
        if c>p+5: g.append((s,p)); s=c
        p=c
    g.append((s,p)); return [f['x0']+(lo+hi)/2 for lo,hi in g if hi-lo>8]
# background -> alpha (flood from the border through near-black)
dark = lum <= 5
bgm=np.zeros_like(dark); bgm[0,:]=dark[0,:]; bgm[-1,:]=dark[-1,:]; bgm[:,0]=dark[:,0]; bgm[:,-1]=dark[:,-1]
while True:
    gg=bgm.copy(); gg[1:]|=bgm[:-1]; gg[:-1]|=bgm[1:]; gg[:,1:]|=bgm[:,:-1]; gg[:,:-1]|=bgm[:,1:]; gg&=dark
    if (gg==bgm).all(): break
    bgm=gg
alpha=np.where(bgm|~keep,0,255).astype(np.uint8)
nb=np.zeros_like(bgm); nb[1:]|=bgm[:-1]; nb[:-1]|=bgm[1:]; nb[:,1:]|=bgm[:,:-1]; nb[:,:-1]|=bgm[:,1:]
edge=nb&~bgm; alpha[edge]=np.clip(lum[edge]*12,40,255); alpha[~keep]=0
rgba=Image.fromarray(np.dstack([a.astype(np.uint8),alpha]),'RGBA')
FW,FH=416,480
OC=int(sys.argv[7]) if len(sys.argv)>7 else N
sheet=Image.new('RGBA',(FW*min(N,OC),FH*((N+OC-1)//OC)),(0,0,0,0)); rel=[]
legacy=Image.new('RGB',(300*N,int(H)+40),(0,0,0))
cx=[chest_x(f) for f in figs]
for i,f in enumerate(figs):
    pad=6; x0=max(0,f['x0']-pad); x1=min(a.shape[1],f['x1']+pad)
    crop=rgba.crop((x0,f['y0'],x1,f['y1']+1)); w,h=crop.size
    crop=crop.resize((round(w*scale),round(h*scale)),Image.LANCZOS)
    ox=round(214+(x0-cx[i])*scale); oy=460-crop.size[1]      # chest a little ahead of the anchor
    assert ox>=0 and ox+crop.size[0]<=FW, (i, ox, crop.size)
    cell=Image.new('RGBA',(FW,FH),(0,0,0,0)); cell.alpha_composite(crop,(ox,oy)); sheet.paste(cell,((i%OC)*FW,(i//OC)*FH))
    lg=Image.new('RGBA',(x1-x0,f['y1']+1-f['y0']),(0,0,0,255)); lg.alpha_composite(rgba.crop((x0,f['y0'],x1,f['y1']+1))); legacy.paste(lg.convert('RGB'),(int(i*300+150-(cx[i]-x0)), legacy.height-20-lg.height))
    rel.append(sorted(214+(x-cx[i])*scale for x in feet(f)))
sheet.save(out, optimize=True)
if len(sys.argv)>8: legacy.save(sys.argv[8], optimize=True)
if len(sys.argv)>6: print('feet', [[round(x) for x in fr] for fr in rel]); sys.exit(0)
# planted-foot track: each half cycle starts with the front foot (largest x) and it slides back
half=N//2; keys=[]; travel=[]
for h0 in (0,half):
    p=[max(rel[h0])]
    for i in range(h0+1,h0+half+1):
        cand=rel[i%N]; prev=p[-1]
        want = min(cand) if i==h0+half else min(cand, key=lambda x: abs(x-(prev-12)))
        p.append(min(prev, want))
    d=p[0]-p[-1]; travel.append(d)
    keys += [round(0.5*(h0//half) + 0.5*(p[0]-p[k])/d, 3) for k in range(half)]
print('feet', [[round(x) for x in fr] for fr in rel])
print(json.dumps({'stride': round(sum(travel)/2), 'keys': keys, 'travelHD': [round(t) for t in travel]}))
