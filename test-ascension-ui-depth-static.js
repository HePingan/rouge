const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

mustInclude(main, 'renderAscensionSkillTree', 'ascension UI should extract skill-tree rendering helper');
mustInclude(main, 'renderAscensionEndgamePanel', 'ascension UI should extract endgame rendering helper');
mustInclude(main, 'renderAscensionTrialPanel', 'ascension UI should extract trial rendering helper');
mustInclude(main, '已仙炼', 'endgame UI should show refined equipment state');
mustInclude(main, '可仙炼', 'endgame UI should explain eligible equipment state');
mustInclude(main, '未装备武器', 'endgame UI should explain missing weapon state');
mustInclude(main, '神器已觉醒', 'endgame UI should show awakened artifact state');
mustInclude(main, '满级后可觉醒', 'endgame UI should explain artifact awakening requirement');
mustInclude(main, 'data-asc-demon-next', 'endgame UI should advance next demon-war node');
mustInclude(main, 'advanceDemonWarNode', 'demon war UI should call advanceDemonWarNode');
mustInclude(main, 'data-asc-tab="endgame"', 'overview should provide quick endgame route');

mustInclude(css, '.asc-status-grid', 'status grid style');
mustInclude(css, '.asc-badge', 'badge style');
mustInclude(css, '.asc-muted', 'muted status style');

assert(index.includes('20260527invfix1'), 'cachebuster should bump to endgame3 for UI depth pass');
assert(!index.includes('20260524endgame2'), 'index should not keep stale endgame2 token');
console.log('ascension UI depth static assertions passed');
