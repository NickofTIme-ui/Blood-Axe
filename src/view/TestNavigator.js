import { STAGES } from '../data/stages.js';
import { campaignLevels } from '../config/testMode.js';
import { Progress } from '../progression/Progress.js';

export function makePreviewProgress(source,stage,section){
  const copy=new Progress();copy.data=JSON.parse(JSON.stringify(source.data));
  for(const npc of stage.npcs??[])if(npc.rescue)copy.rescue(npc.id);
  if(stage.id==='village'&&section===6)delete copy.data.campaign.flags.oathkeeper;
  return copy;
}

// The quick jumps, all in THE BURNING VILLAGE (level 1): [label, section, moment, group].
export const TEST_SCENES=[
  ['Opening formation',0,'opening','Level 1 moments'],
  ['Irvolino: rescue at the mill',3,'mill-rescue','Level 1 moments'],['Irvolino: trapdoor failure',3,'mill-failure','Level 1 moments'],
  ['Mill yard: Brother Cinder',3,'cinder','Level 1 moments'],
  ['Stable stampede',4,'horses','Level 1 moments'],['Varek’s last stand',5,'varek','Level 1 moments'],
  ['Hakon hands over Oathkeeper',6,'handoff','Level 1 moments'],['Raised-sword reveal',6,'raise','Level 1 moments'],
  ['Severed pieces: bounce & settle',1,'gore','Combat tests'],
  ['Impale finisher (hold attack behind a runner)',2,'impale','Combat tests'],
  ['Throat finisher (tap attack behind a runner)',2,'throat','Combat tests'],
];

// The Black Keep scenes (scenes/CutawayScene.js), played straight over the arena: [label, kind]
// (listed here, not imported: CutawayScene needs Phaser to load, and the tests load this file)
export const KEEP_SCENES=[
  ['I · The village stands (after level 1)','learns'],['II · The cages are empty (after level 2)','convoy'],
  ['III · The mountain could not hold them (after level 3)','collapse'],['IV · The army runs (after level 4)','retreat'],
  ['V · No one left to send (after level 5)','fear'],
];

// The level picker: the campaign's levels in play order, named as the game names them
// ("Level 2: GALLOWS WOOD"). The Director's Cut's old stages (THE OATH ROAD, THE GALLOWS
// ASCENT) are left out: they're on the title's SETTINGS menu.
export function levelChoices(stages=STAGES){
  return campaignLevels(stages).map((id,i)=>({id,label:`Level ${i+1}: ${stages[id].name}`}));
}

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
    const heading=(text)=>{const h=document.createElement('h3');h.textContent=text;p.appendChild(h);};
    heading('Any level or checkpoint');
    const select=document.createElement('select');select.style.cssText='font:17px Georgia;padding:10px;margin:6px';
    const levels=levelChoices();
    for(const {id,label}of levels){const opt=document.createElement('option');opt.value=id;opt.textContent=label;select.appendChild(opt);}
    select.value=levels.some(l=>l.id===this.arena.stageId)?this.arena.stageId:levels[0].id;p.appendChild(select);
    const checkpoints=document.createElement('div');p.appendChild(checkpoints);
    const fill=()=>{checkpoints.replaceChildren();STAGES[select.value].sections.forEach((sec,i)=>{const b=document.createElement('button');b.textContent=`${i+1}. ${sec.name}`;b.style.cssText='padding:10px;margin:5px;cursor:pointer';b.onclick=()=>{const id=select.value;this.close();this.go(id,i,'checkpoint');};checkpoints.appendChild(b);});};
    select.onchange=fill;fill();
    let group=null;
    for(const [label,section,moment,g]of TEST_SCENES){if(g!==group)heading(group=g);add(label,()=>{this.close();this.go('village',section,moment);});}
    heading('The Black Keep scenes');
    for(const [label,kind]of KEEP_SCENES)add(label,()=>{this.close();this.arena.playKeepScene?.(kind);});
    heading('Test arenas');
    add('Practice yard (the tutorial)',()=>{this.close();this.go('practice',0,'checkpoint');});
    p.appendChild(document.createElement('hr'));add('Close',()=>this.close());document.body.appendChild(p);
  }
  close(){this.panel?.remove();this.panel=null;this.arena.setPaused(!!this.wasPaused);}
  destroy(){this.panel?.remove();this.button.remove();}
}
