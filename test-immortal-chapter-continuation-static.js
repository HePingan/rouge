const fs = require('fs');
const assert = require('assert');

const stages = fs.readFileSync('js/stages.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

for (const chapter of ['immortal_forge_palace', 'nether_rift_domain', 'immortal_demon_battlefield']) {
  mustInclude(stages, chapter, `missing immortal continuation chapter ${chapter}`);
}
for (const stageId of ['forge_outer_hall', 'immortal_armory', 'haotian_forge', 'nether_ferry', 'soul_river_bridge', 'nether_immortal_throne', 'heaven_gate_frontline', 'demon_tide_rift', 'immortal_demon_ancient_field', 'demon_lord_projection']) {
  mustInclude(stages, `${stageId}:`, `missing continuation stage ${stageId}`);
}
for (const unlock of ["unlockNext: 'forge_outer_hall'", "unlockNext: 'nether_ferry'", "unlockNext: 'heaven_gate_frontline'", "unlockNext: 'demon_lord_projection'"]) {
  mustInclude(stages, unlock, `missing continuation unlock ${unlock}`);
}
for (const title of ['immortal_forge_master', 'nether_rift_immortal', 'immortal_demon_conqueror']) {
  mustInclude(stages, title, `missing continuation title ${title}`);
}
for (const theme of ['stage_immortal_forge', 'stage_nether_rift', 'stage_immortal_demon']) {
  mustInclude(stages, theme, `missing continuation theme ${theme}`);
}
mustInclude(stages, 'law_fragment_forge', 'forge palace should reward forge law fragments');
mustInclude(stages, 'law_fragment_nether', 'nether rift should reward nether law fragments');
mustInclude(stages, 'law_fragment_void', 'immortal demon battlefield should reward void law fragments');
mustInclude(stages, 'demon_war_banner', 'immortal demon battlefield should reward demon war banners');
assert(index.includes('20260530ascguard1'), 'cachebuster should bump to endgame6 for immortal continuation chapters');
assert(!index.includes('20260524endgame5'), 'index should not keep stale endgame5 token');
mustInclude(css, 'Mobile Universal Interface Layout 20260530ascguard1', 'mobile layout marker should bump');
console.log('immortal chapter continuation static assertions passed');
