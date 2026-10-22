import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire}from'node:module';import{HERO_HD}from'../src/data/heroHdAssets.js';
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');const{createCanvas,loadImage}=require('@napi-rs/canvas');
const report=JSON.parse(fs.readFileSync('art/hero-refresh/production/hd-import-report.json'));assert.equal(report.missing.length,0);assert.equal(report.jobs.length,99);assert.equal(report.jobs.reduce((n,j)=>n+j.frames.length,0),640);
const unique=[...new Map(HERO_HD.sheets.map(s=>[s.id,s])).values()];fs.mkdirSync('art/hero-refresh/hd-review',{recursive:true});
for(let page=0;page<Math.ceil(unique.length/10);page++){
 const c=createCanvas(1800,1850),g=c.getContext('2d');g.fillStyle='#29232a';g.fillRect(0,0,c.width,c.height);g.font='16px Arial';
 for(const[j,s]of unique.slice(page*10,page*10+10).entries()){
  const im=await loadImage(s.file);assert(im.width<=4096&&im.height<=4096);g.fillStyle='#ead8b5';g.fillText(s.id,8,j*180+25);
  for(let i=0;i<s.frames;i++){
   const x=210+i*190,y=j*180+174,scale=.5/2;
   g.drawImage(im,i%s.cols*s.fw,Math.floor(i/s.cols)*s.fh,s.fw,s.fh,x-s.fw*scale*.5,y-s.fh*scale,s.fw*scale,s.fh*scale);
  }
 }
 fs.writeFileSync(`art/hero-refresh/hd-review/page-${page}.png`,c.toBuffer('image/png'));
}
console.log('99 sheets / 640 poses compiled. All runtime atlas dimensions fit 4096 pixels. Review pages:',Math.ceil(unique.length/10));
