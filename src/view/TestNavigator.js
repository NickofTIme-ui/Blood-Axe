import { STAGES } from '../data/stages.js';
import { Progress } from '../progression/Progress.js';

export function makePreviewProgress(source,stage,section){
  const copy=new Progress();copy.data=JSON.parse(JSON.stringify(source.data));
  for(const npc of stage.npcs??[])if(npc.rescue)copy.rescue(npc.id);
  if(stage.id==='village'&&section===6)delete copy.data.campaign.flags.oathkeeper;
  return copy;
}

export const TEST_SCENES=[
  ['Irvolino: rescue at the mill',3,'mill-rescue'],['Irvolino: trapdoor failure',3,'mill-failure'],
  ['Opening formation',0,'opening'],['Mill yard / Brother Cinder',3,'cinder'],
  ['Stable stampede',4,'horses'],['Varek’s last stand',5,'varek'],
  ['Hakon & Oathkeeper',6,'handoff'],['Raised-sword reveal',6,'raise'],
  ['Severed pieces: bounce & settle',1,'gore'],
  ['Impale finisher (hold attack behind a runner)',2,'impale'],
];

export class TestNavigator {
  constructor(arena,go){
    this.arena=arena;this.go=go;
    this.button=document.createElement('button');this.button.textContent='TEST SCENES · F8';
    this.button.style.cssText='position:fixed;right:12px;bottom:12px;z-index:30;background:#201713;color:#edcf9a;border:1px solid #9b713c;padding:9px 14px;font:14px Georgia;cursor:pointer';
    this.button.onclick=()=>this.toggle();document.body.appendChild(this.button);
    arena.events.once('shutdown',()=>this.destroy());
  }
  toggle(){if(this.panel){this.close();return;}
    this.wasPaused=this.arena.paused;this.arena.setPaused(true);
    const p=this.panel=document.createElement('div');p.setAttribute('role','dialog');p.setAttribute('aria-label','Test scene selector');
    p.style.cssText='position:fixed;inset:8% 15%;z-index:40;background:#130f0ef5;border:2px solid #94703e;color:#ead6b5;padding:24px;overflow:auto;font:17px Georgia;box-shadow:0 0 0 100vmax #0009';
    const title=document.createElement('h2');title.textContent='Jump to a test scene';p.appendChild(title);
    const note=document.createElement('p');note.textContent='Test jumps use a temporary save. Your campaign progress is preserved.';p.appendChild(note);
    const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='padding:12px;margin:5px;background:#38291e;color:#ffe2ac;border:1px solid #967345;cursor:pointer;font:16px Georgia';b.onclick=fn;p.appendChild(b);};
    for(const [label,section,moment]of TEST_SCENES)add(label,()=>{this.close();this.go('village',section,moment);});
    const h=document.createElement('h3');h.textContent='Any level or checkpoint';p.appendChild(h);
    const select=document.createElement('select');select.style.cssText='font:17px Georgia;padding:10px;margin:6px';
    for(const [id,stage]of Object.entries(STAGES)){const opt=document.createElement('option');opt.value=id;opt.textContent=stage.name;select.appendChild(opt);}
    select.value=this.arena.stageId;p.appendChild(select);
    const checkpoints=document.createElement('div');p.appendChild(checkpoints);
    const fill=()=>{checkpoints.replaceChildren();STAGES[select.value].sections.forEach((sec,i)=>{const b=document.createElement('button');b.textContent=`${i+1}. ${sec.name}`;b.style.cssText='padding:10px;margin:5px;cursor:pointer';b.onclick=()=>{const id=select.value;this.close();this.go(id,i,'checkpoint');};checkpoints.appendChild(b);});};
    select.onchange=fill;fill();add('Close',()=>this.close());document.body.appendChild(p);
  }
  close(){this.panel?.remove();this.panel=null;this.arena.setPaused(!!this.wasPaused);}
  destroy(){this.panel?.remove();this.button.remove();}
}
