const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');
const entities = fs.readFileSync('js/entities.js', 'utf8');
const save = fs.readFileSync('js/save.js', 'utf8');
const skills = fs.readFileSync('js/skills.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const trib = fs.readFileSync('js/tribulation.js', 'utf8');

assert(html.includes('id="btn-tribulation"'), 'more menu should expose tribulation entry');
assert(/js\/tribulation\.js\?v=20260530ascguard1/.test(html), 'tribulation.js should load before main with current cachebuster');
assert(html.includes('css/style.css?v=20260530ascguard1'), 'style cachebuster should be bumped');
assert(html.includes('js/main.js?v=20260530ascguard1'), 'main cachebuster should be bumped');
assert(!html.includes('20260521secretrealm7'), 'old secret realm cachebuster should be removed from index');

assert(trib.includes('const TRIBULATIONS'), 'tribulation data table should exist');
for (const id of ['minor','three_nine','six_nine','nine_nine']) assert(trib.includes(`${id}:`), `tribulation ${id} should exist`);
for (const text of ['小天劫','三九天劫','六九天劫','九九天劫','赤焰雷','玄冰雷','心魔雷','破甲雷','噬灵雷','天罚雷','生灭雷','淬体雷']) assert(trib.includes(text), `tribulation should include ${text}`);
assert(trib.includes('function getTribulationAvailability'), 'availability helper should exist');
assert(trib.includes('function buildTribulationEnemy'), 'enemy builder should exist');
assert(trib.includes('function getTribulationRewards'), 'reward helper should exist');
assert(trib.includes('function applyTribulationSuccess'), 'success helper should exist');
assert(trib.includes('function applyTribulationFailure'), 'failure helper should exist');

for (const field of ['tribulationClears','tribulationProgress','tribulationResist','heartDemonResist','bodyTemperLevel','thunderAffinity','tribulationEssence']) {
  assert(entities.includes(`this.${field}`), `Player should initialize ${field}`);
}
assert(entities.includes("'tribulationResist'"), 'recalcStats should reset tribulationResist derived stat');

assert(main.includes('let showTribulationUI = false'), 'main should track tribulation panel flag');
assert(main.includes("openPanel('tribulation')"), 'tribulation button should open panel');
assert(main.includes('renderTribulationDomPanel'), 'tribulation DOM panel should render');
assert(main.includes('enterTribulation'), 'main should implement enterTribulation');
assert(main.includes('advanceTribulationNode'), 'main should expose advanceTribulationNode');
assert(main.includes('onTribulationComplete'), 'main should expose completion handler');
assert(main.includes('onTribulationDefeat'), 'main should expose defeat handler');
assert(main.includes('onTribulationFlee'), 'main should expose flee handler');
assert(main.includes('data-trib-enter'), 'panel should bind challenge button');

assert(combat.includes('let isInTribulation = false'), 'combat should track tribulation mode');
assert(combat.includes('if (isInTribulation && currentEnemy)'), 'onVictory should short-circuit tribulation victories');
assert(combat.includes('onTribulationComplete'), 'combat should call tribulation complete');
assert(combat.includes('onTribulationDefeat'), 'combat should call tribulation defeat');
assert(combat.includes('onTribulationFlee'), 'combat should call tribulation flee');

assert(save.includes('tribulationClears:'), 'save should persist tribulation clears');
assert(save.includes('tribulationEssence:'), 'save should persist tribulation essence');
assert(save.includes('player.tribulationClears'), 'load should restore tribulation clears');
assert(save.includes('player.tribulationEssence'), 'load should restore tribulation essence');

assert(skills.includes('小天劫开放') && skills.includes('三九天劫开放') && skills.includes('六九天劫开放'), 'realm unlocks should mention tribulation stages');
assert(css.includes('#tribulation-dom-panel'), 'tribulation panel CSS should exist');

console.log('tribulation static tests passed');
