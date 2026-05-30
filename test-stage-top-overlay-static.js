const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260530stageclose1';

assert(css.includes(`Mobile Stage Footer Readability + Scroll Fix ${CURRENT_TOKEN}`), 'stage top overlay CSS marker should be current');
assert(css.includes('top: calc(50px + env(safe-area-inset-top)) !important;'), 'stage panel should use the same top overlay offset as inventory');
assert(css.includes('bottom: calc(12px + env(safe-area-inset-bottom)) !important;'), 'stage panel should use the same bottom safe area as inventory');
assert(css.includes('z-index: 10010 !important;'), 'stage panel should be above HUD/nav/touch controls');
assert(css.includes('body.stage-open #stage-dom-panel') && css.includes('display: flex !important'), 'stage panel should only display when stage-open is active');
assert(!/#stage-dom-panel,\s*\n\s*#secretrealm-dom-panel,\s*\n\s*#tribulation-dom-panel,\s*\n\s*#ascension-dom-panel\s*\{\s*display:\s*flex/.test(css), 'stage panel must not be included in always-flex mobile panel group');
assert(css.includes('border-radius: 16px !important;'), 'stage panel should visually match inventory top overlay radius');

const tokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(tokens.length >= 10, 'index should expose versioned assets');
assert(tokens.every(token => token === CURRENT_TOKEN), `all index assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale stage close token');
assert(mobile.includes(`./index.html?v=${CURRENT_TOKEN}`), 'mobile verify should load current stage top token');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep stale stage close token');

console.log('stage top overlay static assertions passed');
