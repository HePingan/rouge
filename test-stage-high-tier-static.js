const fs = require('fs');
const assert = require('assert');

const stages = fs.readFileSync('js/stages.js', 'utf8');
const alchemy = fs.readFileSync('js/alchemy.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const CURRENT_TOKEN = '20260526nexthint1';
const PREVIOUS_TOKEN = '20260525demonstate' + '1';

const chapters = ['yaogu_valley', 'nether_palace', 'void_rift', 'demon_battlefield', 'ascension_platform'];
const stageIds = ['yaogu_outer', 'yaogu_core', 'nether_gate', 'nether_throne', 'void_edge', 'void_heart', 'demon_front', 'demon_lord', 'ascension_steps', 'ascension_guardian'];
const materials = ['yaogu_essence', 'nether_jade', 'void_shard', 'demon_blade', 'ascension_stone'];
const titles = ['yaogu_warden', 'nether_breaker', 'void_walker', 'demon_slayer', 'ascension_seeker'];

for (const id of chapters) assert(stages.includes(id), `chapter ${id} missing`);
for (const id of stageIds) assert(stages.includes(id), `stage ${id} missing`);
for (const id of materials) assert(stages.includes(id) && alchemy.includes(id), `material ${id} missing`);
for (const id of titles) assert(stages.includes(id), `title ${id} missing`);

assert(stages.includes("unlockNext: 'yaogu_outer'"), 'thunder to high-tier unlock missing');
assert(stages.includes("unlockNext: 'nether_gate'"), 'yaogu to nether unlock missing');
assert(stages.includes("unlockNext: 'void_edge'"), 'nether to void unlock missing');
assert(stages.includes("unlockNext: 'demon_front'"), 'void to demon unlock missing');
assert(stages.includes("unlockNext: 'ascension_steps'"), 'demon to ascension unlock missing');
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale demonstate token');
assert(index.includes(`js/stages.js?v=${CURRENT_TOKEN}`), 'cachebuster missing');

console.log('stage high-tier static ok');
