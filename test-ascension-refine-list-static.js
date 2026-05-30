const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

for (const fn of ['getAscensionRefineCandidates', 'renderAscensionRefineList', 'formatAscensionRefineCandidateName']) {
  mustInclude(main, fn, `missing refine list helper ${fn}`);
}
mustInclude(main, 'data-asc-refine-item', 'refine list should expose item-level refine buttons');
mustInclude(main, 'player.inventory?.items', 'refine candidates should include inventory items');
mustInclude(main, 'player.equipment', 'refine candidates should include equipped items');
mustInclude(main, 'getImmortalRefineActionState(player, playerMaterials, entry.item)', 'each candidate should show action state');
mustInclude(main, 'immortalRefineItem(entry.item, player, playerMaterials)', 'item-level refine should call immortalRefineItem with selected item');
for (const text of ['仙炼装备列表', '已装备', '背包', '可仙炼', '已仙炼']) {
  mustInclude(main, text, `refine list UI text ${text}`);
}
mustInclude(css, 'asc-refine-list', 'refine list CSS missing');
mustInclude(css, 'asc-refine-item', 'refine item CSS missing');
const PREVIOUS_TOKEN = '20260525drain' + '3';
assert(index.includes('20260530ascguard1'), 'cachebuster should bump to drain4 for ascension refine list');
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale drain3 token');
console.log('ascension refine list static assertions passed');
