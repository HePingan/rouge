const assert=require('assert');const fs=require('fs');const combat=fs.readFileSync('js/combat.js','utf8');const html=fs.readFileSync('test-p85-trait-defensive-combat-feedback-browser-smoke.html','utf8');
assert(combat.includes('回灵')&&combat.includes('疾影')&&combat.includes('铁山减伤'),'combat should log defensive trait labels');
for(const id of ['guiyuan','jiying','tieshan']) assert(combat.includes(`getEquippedTraitCombatHint('${id}')`)||combat.includes(`traitId:'${id}'`), `combat/smoke should cover ${id}`);
assert(/refreshCombatDomPanelNow/.test(combat),'trait combat feedback should refresh combat DOM immediately');
assert(html.includes('#cbt-defend')&&html.includes('tap(d().querySelector'), 'P85 smoke should click real defend button');
assert(html.includes("seedTrait('guiyuan'")&&html.includes("seedTrait('jiying'")&&html.includes("seedTrait('tieshan'"),'P85 smoke should force all defensive traits');
assert(html.includes('combatText')&&html.includes('overflowX')&&html.includes('__p85Errors'),'P85 smoke should assert DOM/log/geometry/errors');
console.log('p85 defensive trait combat feedback static passed');
