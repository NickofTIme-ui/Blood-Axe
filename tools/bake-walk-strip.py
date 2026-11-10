# Bake painted walk poses (black background) into an HD sheet for the game.
#   python tools/bake-walk-strip.py spec.json
# spec: { "sources": [{"file", "rows", "cols", "match": "median"|"tallest"}],   (first source sets the size)
#         "order": [[source, pose], ...], "height": 224, "outCols": 7,
#         "out": "hd.png", "legacy": "strip.png" }
# Cells are 416x480, feet on y=460, every pose lined up on his armoured chest so he does
# not wobble. Prints where the grounded feet are in each pose (cell px) for stride / keys.
import sys, json, numpy as np
from PIL import Image
spec = json.load(open(sys.argv[1]))
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
def component(sub, seed):
    cur=np.zeros_like(sub); cur[seed]=True; cur&=sub
    while True:
        g=cur.copy(); g[1:]|=cur[:-1]; g[:-1]|=cur[1:]; g[:,1:]|=cur[:,:-1]; g[:,:-1]|=cur[:,1:]; g&=sub
        if (g==cur).all(): return cur
        cur=g
def load(src):
    a = np.asarray(Image.open(src['file']).convert('RGB')).astype(np.int32)
    lum = a.max(2); mask = lum > 30; solid = lum > 9; R, C = src['rows'], src['cols']
    rows = runs(mask.sum(1) > 3, 12, 80); assert len(rows) == R, ('rows', rows)
    figs=[]; keep=np.zeros_like(mask); Wd=a.shape[1]
    for (y0,y1) in rows:
        prof=mask[y0:y1].sum(0); cuts=[0]
        for k in range(1,C):
            x=int(k*Wd/C); lo=x-45; cuts.append(lo+int(np.argmin(prof[lo:x+45])))
        cuts.append(Wd)
        for k in range(C):
            x0,x1=cuts[k],cuts[k+1]; ya=max(0,y0-8); sub=solid[ya:y1+8,x0:x1]
            ys,xs=np.where(sub); cy,cx_=int(np.median(ys)),int(np.median(xs))
            comp=component(sub,(slice(max(0,cy-25),cy+25),slice(max(0,cx_-25),cx_+25))); keep[ya:ya+sub.shape[0],x0:x1]=comp
            ys,xs=np.where(comp)
            full=np.zeros_like(mask); full[ya:ya+sub.shape[0],x0:x1]=comp
            figs.append(dict(x0=x0+int(xs.min()),x1=x0+int(xs.max())+1,y0=ya+int(ys.min()),y1=ya+int(ys.max()),comp=full))
    mask&=keep
    dark = lum <= 5
    bgm=np.zeros_like(dark); bgm[0,:]=dark[0,:]; bgm[-1,:]=dark[-1,:]; bgm[:,0]=dark[:,0]; bgm[:,-1]=dark[:,-1]
    while True:
        gg=bgm.copy(); gg[1:]|=bgm[:-1]; gg[:-1]|=bgm[1:]; gg[:,1:]|=bgm[:,:-1]; gg[:,:-1]|=bgm[:,1:]; gg&=dark
        if (gg==bgm).all(): break
        bgm=gg
    alpha=np.where(bgm,0,255).astype(np.uint8)
    nb=np.zeros_like(bgm); nb[1:]|=bgm[:-1]; nb[:-1]|=bgm[1:]; nb[:,1:]|=bgm[:,:-1]; nb[:,:-1]|=bgm[:,1:]
    edge=nb&~bgm; alpha[edge]=np.clip(lum[edge]*12,40,255); alpha[~keep]=0
    r,g = a[...,0],a[...,1]
    armour = mask & ~((r > 1.5*g) & (r > 80)) & (lum < 215)
    return dict(a=a, mask=mask, armour=armour, figs=figs, alpha=alpha)
S=[load(s) for s in spec['sources']]
H0=[f['y1']-f['y0'] for f in S[0]['figs']]; ref_h=spec.get('height',224)
for s,src in zip(S,spec['sources']):
    hs=[f['y1']-f['y0'] for f in s['figs']]
    s['scale'] = ref_h/np.median(H0) if s is S[0] else (max(H0)*ref_h/np.median(H0))/np.median(hs) * src.get('size',1)
FW,FH=416,480; order=spec['order']; N=len(order); OC=spec.get('outCols',N)
sheet=Image.new('RGBA',(FW*min(N,OC),FH*((N+OC-1)//OC)),(0,0,0,0)); legacy=Image.new('RGB',(300*N,int(max(H0))+60),(0,0,0)); feet=[]
for i,(si,pi) in enumerate(order):
    s=S[si]; f=s['figs'][pi]; sc=s['scale']; h=f['y1']-f['y0']
    t=f['y0']+int(h*0.17); bt=f['y0']+int(h*0.33)
    cx=f['x0']+float(np.median(np.where(s['armour'][t:bt,f['x0']:f['x1']])[1]))
    pad=6; x0=max(0,f['x0']-pad); x1=min(s['a'].shape[1],f['x1']+pad)
    al=np.where(f['comp'],s['alpha'],0).astype(np.uint8)
    crop=Image.fromarray(np.dstack([s['a'].astype(np.uint8),al]),'RGBA').crop((x0,f['y0'],x1,f['y1']+1)); w,hh=crop.size
    big=crop.resize((round(w*sc),round(hh*sc)),Image.LANCZOS)
    ox=round(214+(x0-cx)*sc); oy=460-big.size[1]; assert ox>=0 and ox+big.size[0]<=FW,(i,ox,big.size)
    cell=Image.new('RGBA',(FW,FH),(0,0,0,0)); cell.alpha_composite(big,(ox,oy)); sheet.paste(cell,((i%OC)*FW,(i//OC)*FH))
    ls=sc*np.median(H0)/ref_h; lg=crop.resize((round(w*ls),round(hh*ls)),Image.LANCZOS)   # fallback strip at the first source's size
    bl=Image.new('RGBA',lg.size,(0,0,0,255)); bl.alpha_composite(lg); legacy.paste(bl.convert('RGB'),(int(i*300+150-(cx-x0)*ls), legacy.height-20-lg.size[1]))
    band=s['mask'][f['y1']-int(h*0.035):f['y1']+1, f['x0']:f['x1']]; fc=np.where(band.any(0))[0]; g=[]; a0=p=fc[0]
    for c in fc[1:]:
        if c>p+5: g.append((a0,p)); a0=c
        p=c
    g.append((a0,p)); feet.append([round(214+(f['x0']+(lo+hi)/2-cx)*sc) for lo,hi in g if hi-lo>8])
sheet.save(spec['out'], optimize=True)
if spec.get('legacy'): legacy.save(spec['legacy'], optimize=True)
print('grounded feet per pose (cell px, chest at 214):', feet)
