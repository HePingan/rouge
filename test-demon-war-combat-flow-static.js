const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260525demonstate' + '1';

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

mustInclude(main, 'function startDemonWarCombatNode', 'ascension UI should route demon war nodes into real combat');
mustInclude(main, 'startCombat(r.enemy)', 'demon war node launcher should start combat with generated enemy');
mustInclude(main, 'showAscensionUI = false', 'demon war combat launch should close the ascension panel before combat');
mustInclude(main, 'data-asc-demon-next', 'endgame UI should still expose next-node action');
mustInclude(main, 'startDemonWarCombatNode()', 'next-node button should use combat launcher');
assert(!/data-asc-demon-next[\s\S]{0,360}demonWar\.progress\s*=/.test(main), 'next-node UI must not directly increment demon war progress without combat');

mustInclude(combat, 'function isDemonWarCombat()', 'combat should detect active demon war fights');
mustInclude(combat, 'player.ascension.demonWar.progress = Math.min', 'demon war victory should advance progress only after winning combat');
mustInclude(combat, '可结算终局奖励', 'final demon war node victory should guide the player to settle rewards');
mustInclude(combat, 'onDemonWarDefeat', 'demon war defeat/flee should cleanly abort the run');

assert(index.includes(CURRENT_TOKEN), 'cachebuster should stay current for demon war combat flow');
assert(!index.includes('20260524endgame7'), 'index should not keep stale endgame6 token');
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale demonstate token');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current cachebuster');
assert(!mobile.includes('20260524endgame7'), 'mobile verify should not keep stale endgame6 token');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep stale demonstate token');

console.log('demon war combat flow static assertions passed');
