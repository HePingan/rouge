const fs = require('fs');
const assert = require('assert');

const CURRENT_TOKEN = '20260605combatp3';
const PREVIOUS_TOKEN = '20260604charloop1';
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length > 10, 'index should expose versioned JS/CSS assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all index assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep previous synergy cachebuster');
assert(mobile.includes(`./index.html?v=${CURRENT_TOKEN}`), 'mobile verify iframe should load current cachebuster');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep previous synergy cachebuster');
assert(css.includes(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`), 'mobile universal marker should bump with HUD guidance cachebuster');
assert(css.includes(`Mobile Skill Compact Layout 20260601skillstrip1`), 'skill compact marker should remain at last skill layout change marker');
assert(css.includes(`Mobile Stage Footer Readability + Scroll Fix 20260531resonance1`), 'stage footer marker should remain at last layout change marker');
assert(css.includes(`Ascension Resource Source Navigation 20260605combatp3`), 'ascension source marker should remain at last layout change marker');
assert(css.includes(`Combat Mobile Bottom Sheet 20260601drawercap1`), 'combat sheet marker should remain at last combat layout change marker');

console.log('cachebuster consistency static checks passed');
