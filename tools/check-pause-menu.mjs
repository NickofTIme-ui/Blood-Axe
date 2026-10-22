import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {PauseMenu} from '../src/view/PauseMenu.js';
import {bitOf} from '../src/core/TickInput.js';
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {createCanvas}=require('@napi-rs/canvas');
const nodes=[];
function node(type,data){const n={type,...data,active:true,visible:true,ox:type==='rect'?.5:0,oy:.5};nodes.push(n);
 n.setOrigin=(x,y=x)=>{n.ox=x;n.oy=y;return n;};n.setDepth=()=>n;n.setInteractive=()=>n;n.on=()=>n;
 n.setStrokeStyle=(width,color)=>{n.stroke={width,color};return n;};n.setFillStyle=color=>{n.color=color;return n;};n.setColor=color=>{n.style.color=color;return n;};n.setVisible=visible=>{n.visible=visible;return n;};n.destroy=()=>{n.active=false;n.children?.forEach(c=>c.destroy());};return n;}
const scene={add:{text:(x,y,text,style)=>node('text',{x,y,text,style}),rectangle:(x,y,w,h,color,alpha)=>node('rect',{x,y,w,h,color,alpha}),container:(x,y,children)=>node('container',{children})}};
let paused=true,destination;
const arena={mode:'solo',setPaused(v){paused=v;},scene:{start(...args){destination=args;}}};
const menu=new PauseMenu(scene,arena),record=action=>[0,bitOf(action),0,0];
const output=createCanvas(960,1080),g=output.getContext('2d');
const hex=n=>'#'+n.toString(16).padStart(6,'0');
function paint(offset){g.save();g.translate(0,offset);g.fillStyle='#282320';g.fillRect(0,0,960,540);
 for(const n of nodes){if(!n.active||!n.visible||n.type==='container')continue;g.save();
 if(n.type==='rect'){const x=n.x-n.w*n.ox,y=n.y-n.h*n.oy;g.globalAlpha=n.alpha??1;g.fillStyle=hex(n.color);g.fillRect(x,y,n.w,n.h);if(n.stroke){g.strokeStyle=hex(n.stroke.color);g.lineWidth=n.stroke.width;g.strokeRect(x,y,n.w,n.h);}}
 else{g.font=`${n.style.fontSize} ${n.style.fontFamily}`;g.fillStyle=n.style.color;g.textBaseline='middle';g.fillText(n.text,n.x,n.y);}
 g.restore();}g.restore();}
menu.show(true);assert.equal(menu.items.length,4);paint(0);
menu.handle([record('down')]);assert.equal(menu.index,1);
menu.handle([record('confirm')]);assert.equal(menu.page,'controls');assert.equal(paused,true);paint(540);
menu.handle([record('menu')]);assert.equal(menu.page,'main');assert.equal(menu.index,1);
menu.handle([record('up')]);assert.equal(menu.index,0);
menu.handle([record('confirm')]);assert.equal(paused,false);
paused=true;menu.show(true);menu.index=2;menu.choose();assert.equal(destination[0],'Select');
paused=true;menu.show(true);menu.index=3;menu.choose();assert.equal(destination[0],'Title');
fs.writeFileSync('docs/pause-menu-review.png',output.toBuffer('image/png'));
console.log('Pause navigation, nested controls, resume, character select and main-menu routes passed.');
