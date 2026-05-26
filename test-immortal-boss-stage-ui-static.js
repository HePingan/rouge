const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const stages = fs.readFileSync('js/stages.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

mustInclude(main, 'getImmortalStageBossMechanic', 'stage UI should resolve immortal boss mechanics');
mustInclude(main, 'formatImmortalBossTriggerText', 'stage UI should format immortal trigger timing');
mustInclude(main, 'renderImmortalBossMechanicCard', 'stage UI should render immortal boss mechanic card');
mustInclude(main, '仙界机制', 'stage UI should label immortal boss mechanics');
mustInclude(main, 'stage-immortal-mechanic-card', 'stage detail should include immortal mechanic card markup');
mustInclude(main, 'renderImmortalBossMechanicCard(selected)', 'stage UI should use ascension boss mechanic table in selected detail');
mustInclude(main, 'getImmortalBossMechanic(stage.boss?.mechanicId', 'stage cards should show immortal mechanic badge');

for (const id of ['thunder_judicator', 'forge_spirit', 'nether_king', 'demon_lord_shadow']) {
  mustInclude(stages, `mechanicId: '${id}'`, `immortal stage data should use ${id}`);
}

mustInclude(css, '.stage-immortal-mechanic-card', 'immortal mechanic card styles missing');
mustInclude(css, '.stage-card-mechanic', 'stage card mechanic badge styles missing');
assert(index.includes('20260526nexthint1'), 'cachebuster should bump to endgame5 for immortal boss stage UI');
assert(!index.includes('20260524endgame4'), 'index should not keep stale endgame4 token');
console.log('immortal boss stage UI static assertions passed');
