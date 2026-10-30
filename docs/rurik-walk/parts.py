import sys, numpy as np
from PIL import Image
from scipy import ndimage
def extract(path, outdir, names=None):
    a=np.asarray(Image.open(path).convert('RGB')).astype(int)
    r,g,b=a[...,0],a[...,1],a[...,2]
    bg=(r>140)&(b>140)&(r-g>70)&(b-g>70)
    fg=~bg
    fg=ndimage.binary_opening(fg,iterations=1)
    lab,n=ndimage.label(ndimage.binary_dilation(fg,iterations=4))
    sizes=ndimage.sum(fg,lab,range(1,n+1))
    parts=[]
    for i,s in enumerate(sizes):
        if s<2000: continue
        ys,xs=np.where(lab==i+1); parts.append((xs.min(),ys.min(),xs.max()+1,ys.max()+1,int(s),i+1))
    parts.sort(key=lambda p:(p[1]>650, p[0]))
    if names and names[0]=='torso':
        top=[p for p in parts if p[1]<=650]; bot=[p for p in parts if p[1]>650]
        torso=max(top,key=lambda p:p[4]); rest=[p for p in top if p is not torso]
        head=min(rest,key=lambda p:p[1]); rest=[p for p in rest if p is not head]
        sarm=max(rest,key=lambda p:p[3]-p[1]); arm=[p for p in rest if p is not sarm][0]
        parts=[torso,head,sarm,arm]+bot
    rgba=np.dstack([a,np.where(fg,255,0)]).astype(np.uint8)
    # despill
    rgb=rgba[...,:3].astype(int); spill=np.minimum(rgb[...,0],rgb[...,2])-rgb[...,1]
    edge=ndimage.binary_dilation(bg,iterations=3)&fg
    fix=edge&(spill>30)
    rgb[...,0]=np.where(fix,np.minimum(rgb[...,0],rgb[...,1]+50),rgb[...,0]); rgb[...,2]=np.where(fix,np.minimum(rgb[...,2],rgb[...,1]+25),rgb[...,2])
    rgba[...,:3]=rgb.clip(0,255)
    names=names or ['body','nthigh','nshin','nboot','fthigh','fshin','fboot']
    for nm,p in zip(names,parts):
        x0,y0,x1,y1,s,l=p
        m=(lab[y0:y1,x0:x1]==l)
        crop=rgba[y0:y1,x0:x1].copy(); crop[...,3]=np.where(m,crop[...,3],0)
        Image.fromarray(crop,'RGBA').save(f'{outdir}/{nm}.png'); print(nm,p[:4],s)
if __name__=='__main__': extract(sys.argv[1],sys.argv[2],sys.argv[3].split(',') if len(sys.argv)>3 else None)
