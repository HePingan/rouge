const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');
const CURRENT_TOKEN = '20260607safearea9';

assert(css.includes(`DOM Character Panel ${CURRENT_TOKEN}`), 'character panel CSS marker should document current polish pass');
assert(/#character-dom-panel \.char-close \{[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;[\s\S]*touch-action:\s*manipulation;/.test(css), 'character close button should be a reliable 44px mobile touch target');
assert(/#character-dom-panel \.char-head \{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) 44px;/.test(css), 'character header should reserve a right close column without squeezing title text');
assert(/#character-dom-panel \.char-tabs \{[\s\S]*display:\s*flex;[\s\S]*overflow-x:\s*auto;[\s\S]*touch-action:\s*pan-x;/.test(css), 'mobile character tabs should be horizontally scrollable instead of cramped fixed columns');
assert(/#character-dom-panel \.char-tab \{[\s\S]*min-height:\s*34px;/.test(css), 'mobile character tabs should remain tappable after compacting');

assert(/p\.addEventListener\('pointerdown', closeCharacterPanelDom, \{ passive: false, capture: true \}\);/.test(main), 'character panel should close on capture-phase pointerdown before scroll/tap guards');
assert(/p\.addEventListener\('touchstart', closeCharacterPanelDom, \{ passive: false, capture: true \}\);/.test(main), 'character panel should close on capture-phase touchstart before synthetic click guards');
assert(/p\.addEventListener\('click', closeCharacterPanelDom, \{ capture: true \}\);/.test(main), 'character panel should retain capture click fallback for desktop/browser automation');

const tokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(tokens.length > 10, 'index should expose versioned assets');
assert(tokens.every(token => token === CURRENT_TOKEN), `all index assets should use ${CURRENT_TOKEN}`);
assert(mobile.includes(`./index.html?v=${CURRENT_TOKEN}`), 'mobile verify iframe should load current character polish cachebuster');

console.log('character mobile polish static checks passed');
