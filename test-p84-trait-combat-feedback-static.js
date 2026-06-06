const assert=require('assert');const fs=require('fs');const combat=fs.readFileSync('js/combat.js','utf8');const html=fs.readFileSync('test-p84-trait-combat-feedback-browser-smoke.html','utf8');
assert(/function getEquippedTraitCombatHint/.test(combat),'combat trait helper should exist');
assert(/getEquippedTraitCombatHint\('pojun'\)/.test(combat),'player attack should check Pojun trait');
assert(/bossDmgBonus/.test(combat)&&/formatCombatPercentBonus/.test(combat),'boss damage bonus should be formatted in combat log');
assert(/首领伤害/.test(combat),'combat log should expose Pojun boss damage');
assert(html.includes("traitId:'pojun'")&&html.includes('isBoss:true')&&html.includes('#cbt-attack'),'P84 smoke should force Pojun boss and click attack');
console.log('p84 trait combat feedback static passed');
