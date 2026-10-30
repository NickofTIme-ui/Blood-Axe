# bake.py partsdir old_hd.png out_hd.png out_strip.png [N]
import sys, math, numpy as np
sys.path.insert(0,__import__('os').path.dirname(__file__))
import rig
from PIL import Image
pdir,old,out_hd,out_strip=sys.argv[1:5]; N=int(sys.argv[5]) if len(sys.argv)>5 else 12
import json, os
if os.path.exists(pdir+'/cfg.json'): rig.CFG.update({k:tuple(v) if isinstance(v,list) else v for k,v in json.load(open(pdir+'/cfg.json')).items()})
rig.load(pdir)
FW,FH,COLS=416,480,6
frames=[rig.frame(i/N)[0] for i in range(N)]
GROUND=1220
hs=[GROUND-f.getbbox()[1] for f in frames]; H=np.median(hs)
scale=224/H
def headx(f):
    a=np.array(f)[...,3]; bb=f.getbbox(); h=bb[3]-bb[1]; ys,xs=np.where(a[bb[1]:bb[1]+int(h*.1)]>32); return xs.mean()
oa=np.array(Image.open(old))[...,3][:, :FW]; ys,xs=np.where(oa[235:258]>32); target=xs.mean()
hx=headx(frames[0])
rows=math.ceil(N/COLS)
hd=Image.new('RGBA',(FW*COLS,FH*rows)); strip=Image.new('RGBA',(FW*N,FH))
for i,f in enumerate(frames):
    s=f.resize((round(f.width*scale),round(f.height*scale)),Image.LANCZOS)
    cell=Image.new('RGBA',(FW,FH)); cell.alpha_composite(s,(int(round(target-hx*scale)),int(round(457-GROUND*scale))))
    hd.alpha_composite(cell,((i%COLS)*FW,(i//COLS)*FH)); strip.alpha_composite(cell,(i*FW,0))
    print(i,cell.getbbox())
hd.save(out_hd); strip.save(out_strip)
# world px per cycle (HD res 2 => /2)
X0=rig.ankx(rig.KF[0][1],rig.KF[0][2]); X1=rig.ankx(rig.KF[4][1],rig.KF[4][2])
print('stride_world', (X0-X1)/rig.ST*scale/2)
