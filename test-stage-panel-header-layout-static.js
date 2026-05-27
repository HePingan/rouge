const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');

const CURRENT_TOKEN = '20260527invfix1';
const PREVIOUS_TOKEN = '20260526guide1';

assert(/<div class="stage-head">\s*<b>🗺️ 副本<\/b>[\s\S]*<div class="stage-tabs">[\s\S]*<button class="pclose" type="button" data-stage-close="1" aria-label="关闭副本界面">×<\/button>[\s\S]*<\/div>/.test(main), 'stage panel header should render title + tabs first and put the close button as the last/rightmost header item');
assert(!main.includes('<div class="stage-head"><button class="pclose" type="button">×</button><b>🗺️ 副本</b>'), 'stage panel header should not keep the old left-side close button before the title');
assert(/#stage-dom-panel \.stage-head \{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*auto\) minmax\(0,\s*1fr\) 34px[\s\S]*position:\s*sticky[\s\S]*top:\s*0[\s\S]*z-index:\s*12/.test(css), 'stage header should be a sticky 3-column row so tabs remain visible and close stays at the right edge');
assert(/#stage-dom-panel \.stage-head \.pclose \{[\s\S]*justify-self:\s*end[\s\S]*grid-column:\s*3[\s\S]*grid-row:\s*1/.test(css), 'stage close button should be pinned to the top-right header cell');
assert(/#stage-dom-panel \.stage-tabs \{[\s\S]*grid-column:\s*2[\s\S]*min-width:\s*0[\s\S]*overflow-x:\s*auto/.test(css), 'stage tabs should occupy the middle column and scroll horizontally instead of being covered');
assert(/#stage-dom-panel \.stage-body \{[\s\S]*scroll-padding-top:\s*\d+px/.test(css), 'stage body should reserve scroll padding under the sticky header');

const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length > 0, 'index should link versioned assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale guide cachebuster after stage header layout changes');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current stage header token');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify iframe should not keep stale guide token');
assert(css.includes(`Stage Header Layout ${CURRENT_TOKEN}`), 'CSS marker should bump with stage header layout cachebuster');

console.log('stage panel header layout static tests passed');
