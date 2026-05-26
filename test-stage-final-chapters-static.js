const fs = require('fs');
const assert = require('assert');

const stages = fs.readFileSync('js/stages.js', 'utf8');
const alchemy = fs.readFileSync('js/alchemy.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const chapters = ['nine_thunder', 'immortal_gate'];
const stageIds = ['thunder_trial', 'thunder_palace', 'immortal_path', 'immortal_gatekeeper'];
const materials = ['nine_thunder_seal', 'immortal_jade'];
const titles = ['nine_thunder_prover', 'true_immortal_opener'];

for (const id of chapters) assert(stages.includes(id), `chapter ${id} missing`);
for (const id of stageIds) assert(stages.includes(id), `stage ${id} missing`);
for (const id of materials) assert(stages.includes(id) && alchemy.includes(id), `material ${id} missing`);
for (const id of titles) assert(stages.includes(id), `title ${id} missing`);

assert(stages.includes("unlockNext: 'thunder_trial'"), 'ascension to thunder unlock missing');
assert(stages.includes("unlockNext: 'immortal_path'"), 'thunder to immortal unlock missing');
assert(stages.includes('九霄雷帝'), 'final thunder boss missing');
assert(stages.includes('仙门镇守者'), 'immortal final boss missing');
assert(index.includes('js/stages.js?v=20260526nexthint1'), 'cachebuster missing');

console.log('stage final chapters static ok');
