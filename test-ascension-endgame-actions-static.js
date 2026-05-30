const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260524endgame' + '8';

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

mustInclude(main, 'getDemonWarActionState(player, playerMaterials)', 'endgame UI should compute demon-war availability through shared guard');
mustInclude(main, 'buttonState(demonActionState.canStart)', 'start button should be disabled unless ascended, inactive, and carrying a banner');
mustInclude(main, 'buttonState(demonActionState.canAdvance)', 'next-node button should be disabled until a run is active and unfinished');
mustInclude(main, 'buttonState(demonActionState.canSettle)', 'settlement button should be disabled until all demon-war nodes are cleared');
mustInclude(main, 'data-asc-demon-start title="${escapeHtml(demonActionState.startReason || \'\')}"${startState.attr}', 'start button should expose disabled reason for mobile users');
mustInclude(main, 'data-asc-demon-next${advanceState.attr}', 'next-node button should render disabled/aria-disabled state');
mustInclude(main, 'data-asc-demon-complete${settleState.attr}', 'settlement button should render disabled/aria-disabled state');

const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale endgame8 token');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current cachebuster');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep stale endgame8 token');
assert(css.includes(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`), 'mobile CSS marker should be bumped with cachebuster');

console.log('ascension endgame action-state static assertions passed');
