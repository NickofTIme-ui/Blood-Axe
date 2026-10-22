const fs=await import('node:fs');
const{createRequire}=await import('node:module');const req=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const{createCanvas,loadImage}=req('@napi-rs/canvas');
const jobs=JSON.parse(fs.readFileSync('art/hero-refresh/manifest.json'));
fs.mkdirSync('art/hero-refresh/animation-frames',{recursive:true});
for(const j of jobs.filter(j=>!j.id.endsWith('idle'))){
 const old=await loadImage('art/hero-refresh/'+j.current.file),fresh=await loadImage('art/hero-refresh/'+j.proposed.file);
 for(let i=0;i<j.frames;i++){
  const c=createCanvas(900,460),g=c.getContext('2d');g.fillStyle='#292529';g.fillRect(0,0,900,460);
  g.fillStyle='#eee2cb';g.textAlign='center';g.font='bold 23px sans-serif';g.fillText(j.hero.toUpperCase()+' — MOTION ART REVIEW',450,36);
  g.font='17px sans-serif';g.fillText('CURRENT',225,75);g.fillText('PROPOSED',675,75);
  for(const[im,s,cx]of[[old,j.current,225],[fresh,j.proposed,675]]){const w=s.fw/s.res*2.2,h=s.fh/s.res*2.2;g.drawImage(im,i*s.fw,0,s.fw,s.fh,cx-w/2,424-h,w,h);}
  fs.writeFileSync('art/hero-refresh/animation-frames/'+j.id+'-'+i+'.png',c.toBuffer('image/png'));
 }
}
