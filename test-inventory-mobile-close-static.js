const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('css/style.css', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');
const CURRENT_TOKEN = '20260606safearea3';

assert(css.includes('Inventory Mobile Close Hitbox 20260604charclose1'), 'inventory close hitbox marker should document current polish pass');
assert(/const closeFallback = e => \{[\s\S]*closest\('\.inv-close'\)[\s\S]*panel\.addEventListener\('pointerdown', closeFallback, \{ passive: false, capture: true \}\)[\s\S]*panel\.addEventListener\('touchstart', closeFallback, \{ passive: false, capture: true \}\)[\s\S]*panel\.addEventListener\('click', closeFallback, \{ capture: true \}\)/.test(main), 'inventory close should use capture-phase root fallback for real mobile taps before panel suppression');
assert(/markInventoryTouchActionDom\(\);[\s\S]*popPanelFromStack\('inventory'\);[\s\S]*syncBodyPanelState\(\);/.test(main), 'inventory capture close should pop panel stack and sync body state while suppressing synthetic clicks');
assert(/#inventory-dom-panel \.inv-head \{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*44px minmax\(0, 1fr\) 44px;/.test(css), 'inventory mobile header should reserve a stable 44px close column');
assert(/#inventory-dom-panel \.inv-head::before \{[\s\S]*content:\s*'';[\s\S]*width:\s*44px;/.test(css), 'inventory header should balance the right close target with a left spacer');
assert(/#inventory-dom-panel \.inv-close \{[\s\S]*position:\s*static !important;[\s\S]*width:\s*44px !important;[\s\S]*height:\s*44px !important;[\s\S]*touch-action:\s*manipulation;/.test(css), 'inventory close button should be a reliable 44px in-flow mobile touch target');
assert(/#inventory-dom-panel \.inv-body \{[\s\S]*overflow-x:\s*hidden !important;/.test(css), 'inventory mobile body should explicitly prevent horizontal overflow');

const tokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(tokens.length > 10, 'index should expose versioned assets');
assert(tokens.every(token => token === CURRENT_TOKEN), `all index assets should use ${CURRENT_TOKEN}`);
assert(mobile.includes(`./index.html?v=${CURRENT_TOKEN}`), 'mobile verify iframe should load current inventory close polish cachebuster');

console.log('inventory mobile close hitbox static checks passed');
