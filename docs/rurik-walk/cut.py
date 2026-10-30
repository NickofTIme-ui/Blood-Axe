import sys, numpy as np
from PIL import Image
def key(im):
    a=np.asarray(im.convert('RGB')).astype(int)
    r,g,b=a[...,0],a[...,1],a[...,2]
    bg=(r>150)&(b>150)&(r-g>80)&(b-g>80)
    alpha=np.where(bg,0,255).astype(np.uint8)
    # despill: pixels near magenta, reduce
    rgba=np.dstack([a.astype(np.uint8),alpha])
    out=Image.fromarray(rgba,'RGBA')
    return out
def cells(path,cols=4,rows=2):
    im=key(Image.open(path)); W,H=im.size; cw,ch=W//cols,H//rows
    res=[]
    for i in range(cols*rows):
        c,r=i%cols,i//cols
        res.append(im.crop((c*cw,r*ch,c*cw+cw,r*ch+ch)))
    return res
if __name__=='__main__':
    path,out=sys.argv[1],sys.argv[2]
    cs=cells(path)
    frames=[]
    for c in cs:
        bb=c.getbbox(); print(bb)
        bg=Image.new('RGBA',c.size,(70,70,80,255)); bg.alpha_composite(c); frames.append(bg.convert('RGB'))
    frames[0].save(out,save_all=True,append_images=frames[1:],duration=95,loop=0)
