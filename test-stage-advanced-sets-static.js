const fs = require('fs');
const assert = require('assert');

const loot = fs.readFileSync('js/loot.js', 'utf8');
const stages = fs.readFileSync('js/stages.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const setIds = ['yaogu', 'nether', 'voidstar', 'demonwar', 'ascensionjade', 'ninethunder', 'trueimmortal'];
const setNames = ['万妖毒藤', '幽冥魂火', '虚空星痕', '天魔战甲', '登仙白玉', '九劫雷纹', '真仙云门'];
for (const id of setIds) {
  assert(loot.includes(`${id}: {`), `missing equipment set ${id}`);
  assert(stages.includes(`setId: '${id}'`), `no stage drops set ${id}`);
}
for (const name of setNames) assert(loot.includes(`name: '${name}'`), `missing set name ${name}`);

const stageSetPairs = {
  yaogu_outer: 'yaogu',
  yaogu_core: 'yaogu',
  nether_gate: 'nether',
  nether_throne: 'nether',
  void_edge: 'voidstar',
  void_heart: 'voidstar',
  demon_front: 'demonwar',
  demon_lord: 'demonwar',
  ascension_steps: 'ascensionjade',
  ascension_guardian: 'ascensionjade',
  thunder_trial: 'ninethunder',
  thunder_palace: 'ninethunder',
  immortal_path: 'trueimmortal',
  immortal_gatekeeper: 'trueimmortal',
};
for (const [stageId, setId] of Object.entries(stageSetPairs)) {
  const idx = stages.indexOf(`${stageId}: {`);
  assert(idx >= 0, `missing stage ${stageId}`);
  const block = stages.slice(idx, stages.indexOf('\n  },', idx));
  assert(block.includes(`setId: '${setId}'`), `${stageId} should drop ${setId}`);
}
assert(loot.includes('thunderAffinity'), 'advanced thunder set should use thunder affinity');
assert(index.includes('20260530ascguard1'), 'cache version not bumped');

console.log('stage advanced sets static ok');
