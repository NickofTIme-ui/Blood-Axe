import fs from 'node:fs';import {createRequire} from 'node:module';import {drawMillHanging,hangingPose} from '../src/view/MillHangingArt.js';
const require=createRequire('C:/Users/nickr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root='art/mill-rescue';const images={};for(const [key,file]of Object.entries({gallows:'gallows-without-lever.png',body:'irvolino-bound-source.png',mechanisms:'gallows-mechanisms.png',executioner:'executioner-actions-clean.png',lever:'../../assets/npcs/mill-rescue/executioner-lever.png'}))images[key]=await loadImage(`${root}/${file}`);
fs.mkdirSync(`${root}/hanging-frames`,{recursive:true});const c=createCanvas(960,600),ctx=c.getContext('2d');for(let i=0;i<96;i++){drawMillHanging(ctx,images,i/12);fs.writeFileSync(`${root}/hanging-frames/${String(i).padStart(3,'0')}.png`,c.toBuffer('image/png'));}
if(hangingPose(2).dropped||!hangingPose(3.3).dropped||hangingPose(3.3).drop<40)throw Error('Invalid drop timing');console.log('96 animation frames rendered; drop timing checked.');



