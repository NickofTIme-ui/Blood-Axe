// Sword landmarks in the source artwork. They are transformed with the imported
// poses, then with the displayed sprite, so trails cannot drift away from the blade.
const normalized=rows=>rows.map(r=>r.map((v,i)=>v/(i%2?683:2048)));
export const RURIK_COMBO_ART={
  ulric:[
    normalized([[230,365,345,160],[575,305,386,277],[1005,325,1236,325],[1585,325,1767,325],[1928,366,2030,210]]),
    normalized([[245,340,354,140],[665,282,876,277],[1092,295,891,293],[1380,284,1185,252],[1900,180,1734,80]]),
    normalized([[225,390,338,220],[649,217,484,113],[1010,187,955,12],[1558,454,1637,610],[1955,490,2033,617]]),
  ],
  ulricOath:[
    normalized([[247,328,365,208],[525,306,363,279],[1029,311,806,299],[1577,328,1736,331],[1910,327,2032,210]]),
    normalized([[237,332,345,222],[645,306,843,307],[1069,313,887,288],[1420,299,1246,282],[1885,188,1779,111]]),
    normalized([[249,392,377,279],[621,217,469,136],[979,184,898,18],[1488,469,1558,612],[1910,504,2012,618]]),
  ],
};

export function installRurikCombo(strips,overrides){
  for(const [key,blades]of Object.entries(RURIK_COMBO_ART)){
    for(let i=0;i<3;i++){
      const name=['swingCrossV2','swingReturnV2','swingChopV2'][i];
      strips[key][name]={file:`assets/sprites/strips/rurik-combo-v2/${key}-${i+1}.png`,frames:5,ref:0,target:116,ground:'drawn',wide:35,swords:blades[i]};
      const seq=ids=>ids.map(j=>`${name}:${j}`);
      overrides[key][`light${i+1}`]={needs:[name],phases:{startup:seq(i===2?[0,1,2]:[0,1]),active:seq(i===2?[3]:[2,3]),recovery:seq(i===2?[3,4]:[4])}};
    }
  }
}
