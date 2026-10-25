import { SETTINGS } from '../config/settings.js';
import { CONTROLS } from '../config/controls.js';
import { pressed } from '../core/TickInput.js';

const TYPE = "'Source Sans 3', Arial, sans-serif";
const TITLE = "'Cinzel', Georgia, serif";
const PAD = {0:'A',1:'B',2:'X',3:'Y',4:'LB',5:'RB',6:'LT',7:'RT',8:'View',9:'Menu',10:'L3',12:'D-pad Up',13:'D-pad Down',14:'D-pad Left',15:'D-pad Right'};
const ACTIONS = [['Move','move'],['Light attack / combo','attack'],['Heavy attack','heavy'],['Block / parry','block'],['Dodge roll','dodge'],['Kick','kick'],['Jump','jump'],['Spell','magic'],['Sprint','sprint'],['Talk / interact','padUp']];

// One compact pause panel; control bindings live on their own nested page. The main page has
// the buttons on the left and, on the right, what the HUD used to show in play: where you are,
// the objective, kills, secrets, level, gore (HUDScene.pauseInfo; Nick, 2026-10-25).
export class PauseMenu {
  constructor(scene, arena) { this.scene=scene;this.arena=arena;this.page='main';this.index=0;this.nodes=[];this.visible=false; }
  show(on) { this.visible=on;if(on){this.page='main';this.index=0;this.render();}else this.root?.setVisible(false); }
  text(x,y,value,size=18,color='#ece4d7',family=TYPE) {
    const n=this.scene.add.text(x,y,value,{fontFamily:family,fontSize:`${size}px`,color,fontStyle:family===TITLE?'600':'normal',shadow:{offsetX:0,offsetY:1,color:'#000000',blur:3,fill:true}}).setOrigin(0,.5);
    this.nodes.push(n);return n;
  }
  rect(x,y,w,h,color,alpha=1) { const n=this.scene.add.rectangle(x,y,w,h,color,alpha);this.nodes.push(n);return n; }
  render() {
    this.root?.destroy(true);this.nodes=[];this.rows=[];
    const W=SETTINGS.width,H=SETTINGS.height,cx=W/2;
    this.rect(cx,H/2,W,H,0x080606,.68).setInteractive();
    const frame=this.scene.add.image(cx,H/2,'pause-frame').setDisplaySize(740,518);this.nodes.push(frame);
    this.text(cx,122,this.page==='main'?'PAUSED':'CONTROLLER SETTINGS',this.page==='main'?34:27,'#f1dfb8',TITLE).setOrigin(.5);
    this.text(cx,155,this.page==='main'?'OATH OF VENGEANCE':'Keyboard & Gamepad',15,'#baaa8b',TYPE).setOrigin(.5);
    if(this.page==='main') {
      this.items=['Resume','Controller Settings','Character Select','Quit to Main Menu'];
      const info=this.scene.pauseInfo?.()??[];
      const bx=info.length?cx-150:cx;
      this.items.forEach((label,i)=>this.button(label,i,211+i*56,bx,info.length?290:532));
      if(info.length)this.info(info,cx+20,190);
      this.text(cx,438,'↑ ↓ / D-pad   Navigate     Enter / A   Select     Esc / B   Resume',15,'#c2b394').setOrigin(.5);
    } else {
      this.items=['Back'];
      const controls=this.arena.controls?.bindings??CONTROLS;
      this.text(cx-264,187,'ACTION',13,'#c9a86b',TITLE);this.text(cx-25,187,'KEYBOARD',13,'#c9a86b',TITLE);this.text(cx+135,187,'CONTROLLER',13,'#c9a86b',TITLE);
      ACTIONS.forEach(([label,key],i)=>{
        const y=212+i*21;
        const keys=key==='move'?'W A S D / Arrows':(controls.keyboard?.[key]??CONTROLS.keyboard[key]??[]).join(' / ');
        const pads=key==='move'?'Left stick':(controls.gamepad?.[key]??CONTROLS.gamepad[key]??[]).map(n=>PAD[n]??String(n)).join(' / ');
        this.text(cx-264,y,label,17);this.text(cx-25,y,keys.replace('SPACE','Space').replace('SHIFT','Shift'),16,'#d4c7ae');this.text(cx+135,y,pads,16,'#d4c7ae');
      });
      this.button('Back',0,438);
    }
    this.root=this.scene.add.container(0,0,this.nodes).setDepth(2000);
    this.refresh();
  }
  // the run so far: a gold label over each value, down a thin rule
  // (short values, the counts, share a line: KILLS  SECRETS  GORE)
  info(rows,x,y) {
    this.rect(x-12,y+120,1,248,0x584631,.9);
    const short=([,v])=>!v.includes('\n')&&v.length<=10;
    for(let i=0;i<rows.length;){
      const line=[rows[i++]];
      if(short(line[0]))while(i<rows.length&&line.length<3&&short(rows[i]))line.push(rows[i++]);
      let h=0;
      line.forEach(([label,value],k)=>{
        const lx=x+k*100;
        this.text(lx,y,label,12,'#c9a86b',TITLE).setOrigin(0,0);
        const v=this.text(lx,y+15,value,15,'#e6d8bd').setOrigin(0,0).setWordWrapWidth(290).setLineSpacing(1);
        h=Math.max(h,v.height);
      });
      y+=15+h+8;
    }
  }
  button(label,i,y,cx=SETTINGS.width/2,w=532) {
    const bg=this.rect(cx,y,w,44,0x191410,.82).setStrokeStyle(1,0x584631).setInteractive({useHandCursor:true});
    const text=this.text(cx,y,label,20,'#e6d8bd',TITLE).setOrigin(.5);
    const arrow=this.text(cx-w/2+20,y,'◆',12,'#e2b969');
    bg.on('pointerover',()=>{this.index=i;this.refresh();});
    bg.on('pointerdown',()=>{this.index=i;this.choose();});
    this.rows.push({bg,text,arrow});
  }
  refresh() { this.rows.forEach((r,i)=>{const selected=i===this.index;r.bg.setFillStyle(selected?0x4c3020:0x191410,selected?.94:.82);r.bg.setStrokeStyle(selected?2:1,selected?0xcba86a:0x584631);r.text.setColor(selected?'#ffe7b7':'#e6d8bd');r.arrow.setVisible(selected);}); }
  move(dir) { this.index=(this.index+dir+this.items.length)%this.items.length;this.refresh(); }
  handle(recs) {
    const any=a=>recs.some(r=>pressed(r,a));
    const axis=recs.reduce((v,r)=>Math.abs(r[3])>Math.abs(v)?r[3]:v,0);
    const dir=axis>45?1:axis< -45?-1:0;
    if(any('menu')||any('dodge'))this.back();
    else if(any('pause')&&!any('confirm'))this.arena.setPaused(false);
    else if(any('confirm'))this.choose();
    else if(any('padDown')||any('down')||(dir&&dir!==this.axis))this.move(dir||1);
    else if(any('padUp')||any('up'))this.move(-1);
    this.axis=dir;
    return !!this.leaving;
  }
  back() { if(this.page==='main')this.arena.setPaused(false);else{this.page='main';this.index=1;this.render();} }
  choose() {
    if(this.page!=='main'){this.back();return;}
    if(this.index===0){this.arena.setPaused(false);return;}
    if(this.index===1){this.page='controls';this.index=0;this.render();return;}
    this.arena.setPaused(false);
    this.leaving=true;
    if(this.index===2)this.arena.scene.start('Select',this.arena.selectData());
    else this.arena.scene.start('Title');
  }
}
