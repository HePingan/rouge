const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const CURRENT_TOKEN = '20260527invfix1';
const PREVIOUS_TOKEN = '20260525demonstate' + '1';

assert(main.includes('function getStageSweepCost'), 'missing sweep cost helper');
assert(main.includes('function getRecommendedSweepStage'), 'missing recommended sweep helper');
assert(main.includes('function summarizeSweepRewards'), 'missing sweep reward summary helper');
assert(main.includes('function formatSweepSummary'), 'missing sweep summary formatter');
assert(main.includes('function sweepStage(stageId, count = 1)'), 'sweepStage should accept count');
assert(main.includes('data-stage-sweep-count'), 'missing sweep count dataset');
assert(main.includes('[1, 5, 10]'), 'missing batch sweep 1/5/10 buttons');
assert(main.includes('推荐扫荡') || main.includes('recSweep'), 'missing recommended farming copy');
assert(main.includes('每次消耗') || main.includes('每次💎'), 'missing sweep cost display');
assert(main.includes('player.spiritStones -= cost'), 'sweep should consume spirit stones');
assert(main.includes('背包已满') && main.includes('summary.full'), 'missing inventory full stop/summary');
assert(css.includes('.stage-sweep-group'), 'missing sweep group style');
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale demonstate token');
assert(index.includes(CURRENT_TOKEN), 'cache version not bumped');

console.log('stage sweep2 static ok');
