// Orsk's garrison: shield infantry controlling space and heavy siege labourers.
export function installAscentEnemies(E){
 const guard=structuredClone(E.grunt);
 Object.assign(guard,{id:'siegeguard',name:'Ashen Siege Guard',title:"Orsk's shield line",look:'siegeguard',art:'grunt',body:{w:48,h:110},maxHealth:105,maxStamina:110,walkSpeed:140,depthSpeed:100,blockReduction:.78,variety:{speed:[.94,1.06],size:[.98,1.04],toughness:.4}});
 guard.ai={...guard.ai,blockChance:.43,blockHold:[18,30],maxCrowd:2,attackCooldown:[45,75],heavyChance:.22,specialEvery:90,specials:[{press:'special1',min:120,max:270,chance:.55}]};
 guard.moves.special1={...structuredClone(E.berserker.moves.special1),name:'Shield Drive',startup:44,active:12,recovery:40,damage:12,lunge:300,superArmor:false,breaksGuard:false,guardDamage:22,hitbox:{x:8,y:25,w:65,h:70}};
 guard.damageProfile={blade:.55,magic:1.4,shock:2}; guard.armorTint=0xd8dce4; // (a cold steel cast: 0x525968 turned his painted silver plate pitch black in play)
 E.siegeguard=guard;
 const brute=structuredClone(E.berserker);
 Object.assign(brute,{id:'stonebreaker',name:'Ashen Stonebreaker',title:'The siege hammer',look:'stonebreaker',art:'berserker',body:{w:62,h:132},maxHealth:145,walkSpeed:125,depthSpeed:90,variety:{speed:[.94,1.04],size:[1,1.06],toughness:.5},tuned:null}); // (Vorn's 30% growth is his own: the Stonebreaker keeps his size)
 brute.ai={...brute.ai,maxCrowd:1,attackCooldown:[65,100],heavyChance:.5,comboChance:.15,blockChance:.04};
 for(const m of Object.values(brute.moves))m.cut='blunt';
 brute.moves.heavy={...brute.moves.heavy,name:'Break the Line',startup:52,recovery:46,damage:24,lunge:70};
 brute.moves.special1={...brute.moves.special1,name:'Hammer Drive',startup:48,recovery:46,lunge:310,damage:16};
 E.stonebreaker=brute;
}
