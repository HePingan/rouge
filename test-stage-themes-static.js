const fs = require('fs');
const assert = require('assert');

const stages = fs.readFileSync('js/stages.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(stages.includes('const STAGE_THEMES'), 'stage themes config missing');
assert(stages.includes('function getStageTheme'), 'stage theme helper missing');
['qingyun','blood_cave','thunder_peak','yaogu_valley','nether_palace','void_rift','demon_battlefield','ascension_platform','nine_thunder','immortal_gate'].forEach(id => {
  assert(stages.includes(`${id}: { id: 'stage_`), `theme missing for ${id}`);
});
assert(main.includes('dungeon.biome = getStageTheme(activeStage) || dungeon.biome'), 'stage dungeon biome override missing');
assert(main.includes('const theme = typeof getStageTheme'), 'stage card theme display missing');
assert(main.includes('selectedTheme') && main.includes('地图'), 'stage footer/detail theme text missing');
assert(main.includes("biome?.decor === 'thunder'"), 'theme decor rendering missing');
assert(index.includes('js/stages.js?v=20260530ascguard1'), 'cachebuster missing');

console.log('stage themes static ok');
