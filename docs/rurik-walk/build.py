# usage: build.py sheet.png out_hd.png out_strip.png old_hd.png [order]
import sys, numpy as np
from PIL import Image
sys.path.insert(0,__import__('os').path.dirname(__file__))
from cut import cells
src,out_hd,out_strip,old=sys.argv[1:5]
order=[int(x) for x in sys.argv[5].split(',')] if len(sys.argv)>5 else list(range(8))
cs=cells(src)
def clean(c):
    a=np.array(c); al=a[...,3]
    # drop islands touching cell edge (neighbour bleed): keep largest component
    from scipy import ndimage
    lab,n=ndimage.label(al>32)
    if n>1:
        sizes=ndimage.sum(al>32,lab,range(1,n+1)); keep=1+int(np.argmax(sizes))
        mask=(lab==keep)|((lab>0)&np.isin(lab,[i+1 for i,s in enumerate(sizes) if s>sizes.max()*0.003 and i+1!=keep]))
        # keep small parts only if not touching cell border
        for i,s in enumerate(sizes):
            l=i+1
            if l==keep: continue
            ys,xs=np.where(lab==l)
            if xs.min()==0 or xs.max()==a.shape[1]-1 or ys.min()==0 or ys.max()==a.shape[0]-1: mask[lab==l]=False
        a[...,3]=np.where(mask,al,0)
    # despill magenta fringe
    rgb=a[...,:3].astype(int); edge=(a[...,3]>0)
    spill=np.minimum(rgb[...,0],rgb[...,2])-rgb[...,1]
    fix=edge&(spill>40)
    g=rgb[...,1]; rgb[...,0]=np.where(fix,np.minimum(rgb[...,0],g+40),rgb[...,0]); rgb[...,2]=np.where(fix,np.minimum(rgb[...,2],g+20),rgb[...,2])
    a[...,:3]=rgb.clip(0,255)
    return Image.fromarray(a,'RGBA')
cs=[clean(c) for c in cs]
bbs=[c.getbbox() for c in cs]
def torso_x(c,bb):
    a=np.array(c)[...,3]; t,b=bb[1],bb[3]; h=b-t
    band=a[t+int(h*.12):t+int(h*.45)]  # chest band
    ys,xs=np.where(band>32)
    return xs.max()-30  # front edge of chest/arms is stable-ish; use rightmost minus
# row baselines and anchors
rows=[[0,1,2,3],[4,5,6,7]]
base={};anch={}
for r in rows:
    b=max(bbs[i][3] for i in r)
    for i in r: base[i]=b
oldim=Image.open(old)
FW,FH=416,480
H_old=224; FEET=457
h0=np.median([bbs[i][3]-bbs[i][1] for i in range(8)])
scale=H_old/h0
# horizontal: head position (top 10% centroid) per frame, then per row mean
def head_x(c,bb):
    a=np.array(c)[...,3]; t=bb[1]; h=bb[3]-bb[1]
    ys,xs=np.where(a[t:t+int(h*.10)]>32); return xs.mean()
hx={i:head_x(cs[i],bbs[i]) for i in range(8)}
rowmean={}
for r in rows:
    m=np.mean([hx[i] for i in r])
    for i in r: rowmean[i]=m
# old frame head x for target
oa=np.array(oldim)[...,3][:, :FW]; ys,xs=np.where(oa[235:258]>32); target_head=xs.mean()
hd=Image.new('RGBA',(FW*8,FH),(0,0,0,0))
strip=Image.new('RGBA',(8*220,260),(0,0,0,0))
for k,i in enumerate(order):
    c=cs[i]; w,h=c.size
    sc=c.resize((round(w*scale),round(h*scale)),Image.LANCZOS)
    dx=target_head-rowmean[i]*scale
    dy=FEET-base[i]*scale
    cell=Image.new('RGBA',(FW,FH),(0,0,0,0)); cell.alpha_composite(sc,(int(round(dx)),int(round(dy))))
    hd.alpha_composite(cell,(k*FW,0))
    st=cell.resize((FW//2,FH//2),Image.LANCZOS).crop((0,0,208,240)); strip.alpha_composite(st,(k*220,10))
    print(k,i,cell.getbbox())
hd.save(out_hd); strip.save(out_strip)
