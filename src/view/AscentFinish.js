// Shared finishing for the Ascent's painted surfaces; no collision changes.
import {DEPTH} from './depths.js';
export function blendedFloor(scene,key,x0,x1,y,h,edge=120){
 const name=`ascent-floor-blend-v4-${key}-${x0}-${x1}`,w=x1-x0;
 if(!scene.textures.exists(name)){
  const img=scene.textures.get(key).getSourceImage(),r=Math.min(2,4090/w),sc=h/img.height,tw=img.width*sc;
  const cv=document.createElement('canvas');cv.width=Math.ceil(w*r);cv.height=Math.ceil(h*r);const c=cv.getContext('2d');c.imageSmoothingQuality='high';
  for(let x=-(x0%tw);x<w;x+=tw)c.drawImage(img,x*r,0,tw*r,h*r);
  c.globalCompositeOperation='destination-in';const f=Math.min(.3,edge/w),g=c.createLinearGradient(0,0,cv.width,0);g.addColorStop(0,'transparent');g.addColorStop(f,'white');g.addColorStop(1-f,'white');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,cv.width,cv.height);
  scene.textures.addCanvas(name,cv);
 }
 return scene.add.image(x0,y,name).setOrigin(0).setDisplaySize(w,h).setDepth(DEPTH.floor+.01);
}
export function roadApron(scene,width){
 const source='lvl-ascent-ground',name='ascent-road-apron-v4';if(!scene.textures.exists(source))return;
 if(!scene.textures.exists(name)){
  const img=scene.textures.get(source).getSourceImage(),sc=348/img.height,r=2,h=82,w=Math.round(img.width*sc),cv=document.createElement('canvas');cv.width=w*r;cv.height=h*r;const c=cv.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(img,0,0,img.width,h/sc,0,0,cv.width,cv.height);
  c.globalCompositeOperation='destination-in';const g=c.createLinearGradient(0,0,0,cv.height);g.addColorStop(0,'transparent');g.addColorStop(.28,'rgba(255,255,255,.85)');g.addColorStop(.6,'rgba(255,255,255,.65)');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,cv.width,cv.height);scene.textures.addCanvas(name,cv);
 }
 const img=scene.textures.get(name).getSourceImage();return scene.add.tileSprite(0,208,width,82,name).setOrigin(0).setTileScale(.5,.5).setTint(0xb9c2bc).setDepth(DEPTH.floor+.11);
}
