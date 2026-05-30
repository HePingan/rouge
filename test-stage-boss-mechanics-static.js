const fs = require('fs');
const assert = require('assert');

const stages = fs.readFileSync('js/stages.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260525demonstate' + '1';

assert(stages.includes('const STAGE_BOSS_MECHANICS'), 'missing boss mechanic config');
assert(stages.includes('function getStageBossMechanic'), 'missing boss mechanic helper');
assert(stages.includes('mechanicId:'), 'bosses should reference mechanicId');

const mechanicIds = [
  'wolf_pack',
  'blood_rage',
  'thunder_strike',
  'poison_entangle',
  'soul_drain',
  'void_phase',
  'demon_enrage',
  'ascension_shield',
  'nine_thunder_punish',
  'immortal_judgement',
];
for (const id of mechanicIds) {
  assert(stages.includes(`${id}: { id: '${id}'`), `missing mechanic ${id}`);
  assert(stages.includes(`mechanicId: '${id}'`), `no stage uses mechanic ${id}`);
}

assert(main.includes('bossMechanicId: bossDef.mechanicId'), 'stage boss should carry mechanic id into enemy');
assert(main.includes('stageId: stage.id'), 'stage boss should carry stage id');
assert(combat.includes('function maybeTriggerBossMechanic'), 'missing boss mechanic trigger runtime');
assert(combat.includes("maybeTriggerBossMechanic('hp')"), 'missing hp threshold trigger');
assert(combat.includes("maybeTriggerBossMechanic('turn')"), 'missing turn trigger');
assert(combat.includes('triggerBossMechanic'), 'missing mechanic effect handler');
assert(combat.includes('mechanicText'), 'combat start should show mechanic text');
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale demonstate token');
assert(index.includes(CURRENT_TOKEN), 'cache version not bumped');

console.log('stage boss mechanics static ok');
