const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');

const CURRENT_TOKEN = '20260526nexthint1';
const PREVIOUS_TOKEN = '20260525asc' + 'action1';

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

mustInclude(main, 'artifactAwakeningCardHtmlDom', 'artifact panel should render an in-panel awakening status/cost card');
mustInclude(main, 'getArtifactAwakeningCost(selected.id)', 'artifact panel should read the real awakening cost');
mustInclude(main, 'data-artifact-awaken', 'artifact panel should expose a direct awakening action');
mustInclude(main, 'awakenArtifact(player, playerMaterials, btn.dataset.artifactAwaken)', 'artifact panel awakening action should call the runtime system');
mustInclude(main, 'aria-disabled="true"', 'disabled artifact awakening action should expose aria state on mobile');
mustInclude(main, '觉醒消耗', 'artifact panel should label awakening costs clearly');
mustInclude(main, '满级后可觉醒', 'artifact panel should explain the max-level prerequisite');

mustInclude(css, '.artifact-awakening-card', 'artifact awakening card should have mobile styles');
mustInclude(css, '.artifact-action.awaken', 'artifact awakening action should have a distinct touch target style');
assert(/\.artifact-action\.awaken[\s\S]*?min-height:\s*42px/.test(css), 'artifact awakening button should remain thumb-sized');

const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale artifact awakening cache token');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current artifact awakening token');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify iframe should not keep stale artifact awakening token');
mustInclude(css, `Mobile Universal Interface Layout ${CURRENT_TOKEN}`, 'mobile layout marker should bump with artifact awakening UI');

console.log('artifact awakening UI static assertions passed');
