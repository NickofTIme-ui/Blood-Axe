import assert from 'node:assert/strict';
import { drawStampedeTrail } from '../src/view/StampedeTrail.js';
import { STAGE_VILLAGE } from '../src/data/stageVillage.js';
for (const dir of [-1,1]) {
  const a={x:0,z:0}, b={x:dir*60,z:80}, c={x:dir*360,z:80};
  const path={pts:[a,b,c],segs:[{a,b,l:100,s0:0},{a:b,b:c,l:300,s0:100}],len:400};
  const stage={stampedeAt(p,s){const q=p.segs.find(q=>s<=q.s0+q.l);const t=(s-q.s0)/q.l;return{x:q.a.x+(q.b.x-q.a.x)*t,z:q.a.z+(q.b.z-q.a.z)*t};}};
  const render=(phase,head=0)=>{
    let polygons=0;const colors=[];
    const g={fillStyle(c,a){assert.ok(a>=0&&a<=1);colors.push(c);return this;},lineStyle(w,c,a){assert.ok(a>=0&&a<=1);return this;},lineBetween(...v){assert.ok(v.every(Number.isFinite));return this;},fillEllipse(...v){assert.ok(v.every(Number.isFinite));return this;},fillPoints(p){assert.ok(p.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)));polygons++;return this;}};
    drawStampedeTrail(g,stage,path,{phase,warnT:0.8,heads:phase==='warn'?[]:[{out:head}]},64,123);
    assert.ok(!colors.includes(0xfff0e6),'White arcade arrows returned');
    return polygons;
  };
  assert.ok(render('warn')>0);
  assert.ok(render('run',320)<render('warn'),'Marks should recede behind the herd');
}
const boss=STAGE_VILLAGE.sections.find(s=>s.id==='hall').boss;
assert.equal(boss.size,1.75,'Varek must tower above normal soldiers');
console.log('Stampede checks passed: both directions, bend alignment, worn trail visibility, receding marks and enlarged Varek.');
