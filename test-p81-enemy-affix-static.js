const assert = require('assert');
const fs = require('fs');
const entities = fs.readFileSync('js/entities.js','utf8');
const combat = fs.readFileSync('js/combat.js','utf8');
const main = fs.readFileSync('js/main.js','utf8');
const css = fs.readFileSync('css/style.css','utf8');
const html = fs.readFileSync('test-p81-enemy-affix-combat-browser-smoke.html','utf8');

assert(/const ENEMY_AFFIXES\s*=\s*\[/.test(entities), 'enemy affix data table should exist');
['raging','armored','swift'].forEach(id=>assert(entities.includes(`id: '${id}'`), `missing affix ${id}`));
assert(/function pickEnemyAffix/.test(entities) && /function applyEnemyAffix/.test(entities), 'affix pick/apply helpers should exist');
assert(/extra\.affixId/.test(entities) && /pickEnemyAffix\(level, enemy\)/.test(entities), 'createScaledEnemy should support forced and random affix');
assert(/enemy\.weaknesses = \[\.\.\.new Set/.test(entities), 'affixes should merge weakness/resist metadata');
assert(/词缀：/.test(combat) && /enemy\.affix\?\.color/.test(combat), 'combat start should log affix and color');
assert(/enemyAffixHtml/.test(main) && /cbt-threat-line/.test(main) && /currentEnemy\.affix\?\.id/.test(main), 'combat DOM should render and cache affix badge');
assert(/\.cbt-threat-line \.affix/.test(css), 'affix badge CSS should exist');
assert(html.includes('createScaledEnemy(base,8') && html.includes("affixId:'armored'"), 'P81 smoke should force a deterministic affix enemy');
assert(html.includes('.cbt-threat-line .affix') && html.includes('cbt-attack') && html.includes('overflowX'), 'P81 smoke should verify visible badge, real attack, and overflow');
console.log('p81 enemy affix static passed');
