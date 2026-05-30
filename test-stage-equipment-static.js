const fs = require('fs');
const assert = require('assert');

const loot = fs.readFileSync('js/loot.js', 'utf8');
const stages = fs.readFileSync('js/stages.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

for (const setId of ['qingyun', 'bloodfiend', 'thundertrib']) {
  assert(loot.includes(`${setId}:`), `equipment set missing: ${setId}`);
  assert(stages.includes(`setId: '${setId}'`), `stage reward missing set: ${setId}`);
}
assert(loot.includes('function generateEquipment(floorLevel = 1, options = {})'), 'generateEquipment options missing');
assert(loot.includes('options.setId'), 'forced set generation missing');
assert(main.includes('function addStageEquipmentReward'), 'stage equipment reward helper missing');
assert(main.includes('rewards.equipment'), 'equipment rewards not applied/formatted');
assert(stages.includes('function getStageSetDropText'), 'set drop text helper missing');
assert(main.includes('套装目标'), 'stage UI set target missing');
assert(index.includes('js/stages.js?v=20260530ascguard1'), 'cachebuster missing');
console.log('stage equipment static ok');
