const fs = require('fs');
const assert = require('assert');

const stages = fs.readFileSync('js/stages.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

for (const fn of ['getStageMaterialSources', 'getStageMaterialSourceText', 'renderStageMaterialSourcePanel']) {
  mustInclude(stages + main, fn, `material source helper ${fn}`);
}
for (const mat of ['law_fragment_forge', 'law_fragment_nether', 'law_fragment_void', 'immortal_refine_stone', 'demon_war_banner']) {
  mustInclude(stages, mat, `material source coverage ${mat}`);
}
for (const text of ['材料来源', '万器仙宫', '幽都裂界', '仙魔战场', '可刷副本']) {
  mustInclude(main + stages, text, `material source UI text ${text}`);
}
mustInclude(css, 'stage-material-source', 'material source CSS class');
assert(index.includes('20260527invfix1'), 'cachebuster should bump to drain2 for material source UI');
assert(!index.includes('20260525drain1'), 'index should not keep stale drain1 token');
console.log('immortal material source UI static assertions passed');
