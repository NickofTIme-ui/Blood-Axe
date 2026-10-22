import fs from 'node:fs';
import {createRequire} from 'node:module';
import {PauseMenu} from '../src/view/PauseMenu.js';
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('assets/fonts/Cinzel.ttf','Cinzel');GlobalFonts.registerFromPath('assets/fonts/SourceSans3.ttf','Source Sans 3');
const frame=await loadImage('assets/ui/pause-frame.png');
const node=(o)=>Object.assign(o,{ox:0,oy:.5,visible:true,setOrigin(x,y=x){this.ox=x;this.oy=y;return this},setInteractive(){return this},setStrokeStyle(w,c){this.stroke=[w,c];return this},setDisplaySize(w,h){this.w=w;this.h=h;return this},setFillStyle(c,a=1){this.color=c;this.alpha=a;return this},setColor(c){this.style.color=c;return this},setVisible(v){this.visible=v;return this},setDepth(){return this},on(){return this},destroy(){}});
const scene={add:{text:(x,y,value,style)=>node({type:'text',x,y,value,style}),rectangle:(x,y,w,h,color,alpha)=>node({type:'rect',x,y,w,h,color,alpha}),image:(x,y,key)=>node({type:'image',x,y,key,ox:.5,oy:.5}),container:()=>node({})}};
const menu=new PauseMenu(scene,{});fs.mkdirSync('art/pause-menu',{recursive:true});
const hex=n=>'#'+n.toString(16).padStart(6,'0');
for(const page of ['main','controls']){menu.page=page;menu.index=0;menu.render();const c=createCanvas(1920,1080),g=c.getContext('2d');g.scale(2,2);g.fillStyle='#25201b';g.fillRect(0,0,960,540);
for(const n of menu.nodes){if(!n.visible)continue;g.globalAlpha=n.alpha??1;if(n.type==='rect'){g.fillStyle=hex(n.color);g.fillRect(n.x-n.w/2,n.y-n.h/2,n.w,n.h);if(n.stroke){g.strokeStyle=hex(n.stroke[1]);g.lineWidth=n.stroke[0];g.strokeRect(n.x-n.w/2,n.y-n.h/2,n.w,n.h)}}else if(n.type==='image')g.drawImage(frame,n.x-n.w/2,n.y-n.h/2,n.w,n.h);else if(n.type==='text'){g.font=`${n.style.fontStyle==='600'?'600':'400'} ${n.style.fontSize} ${n.style.fontFamily}`;g.fillStyle=n.style.color;g.textBaseline='middle';g.textAlign=n.ox===.5?'center':'left';g.fillText(n.value,n.x,n.y)}}
fs.writeFileSync(`art/pause-menu/${page}.png`,c.toBuffer('image/png'));console.log(page,menu.nodes.length+' objects rendered');}
