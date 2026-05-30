const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260524endgame' + '9';
const STALE_DEMONSTATE_TOKEN = '20260525demonstate' + '1';

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

mustInclude(main, 'getAscensionTrialActionState(player, playerMaterials)', 'trial UI should use shared action-state guard');
mustInclude(main, 'const trialDone = !!trialActionState.trialDone', 'trial UI should derive completed state from shared action state');
mustInclude(main, 'const startState = buttonState(trialActionState.canStart);', 'trial start should be disabled by action-state guard');
mustInclude(main, 'const challengeState = buttonState(trialActionState.canChallenge);', 'trial challenge should only be enabled during an unfinished active run');
mustInclude(main, 'trialActionState.tokenCount', 'trial UI should show 飞升试炼令 count');
mustInclude(main, 'trialActionState.startReason', 'trial start button should surface disabled reason on mobile');
mustInclude(main, "p.querySelector('[data-asc-trial-complete]')", 'trial challenge handler should bind the guarded complete button');

const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale endgame9 token');
assert(!index.includes(STALE_DEMONSTATE_TOKEN), 'index should not keep stale demonstate token');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current cachebuster');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep stale endgame9 token');
assert(!mobile.includes(STALE_DEMONSTATE_TOKEN), 'mobile verify should not keep stale demonstate token');
assert(css.includes(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`), 'mobile CSS marker should be bumped with cachebuster');

console.log('ascension trial action-state static assertions passed');
