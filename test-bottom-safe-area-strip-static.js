const assert = require('assert');
const fs = require('fs');
const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

assert(index.includes('viewport-fit=cover'), 'viewport meta should opt into covering the mobile safe-area instead of leaving a black bottom strip');
assert(css.includes('--safe-bottom: max(24px, env(safe-area-inset-bottom, 0px))'), 'CSS should reserve a minimum 24px bottom gesture area when env(safe-area-inset-bottom) is 0');
assert(css.includes('height: 100dvh'), 'game container should fill the dynamic viewport height');
assert(css.includes('bottom: var(--menu-bottom)'), 'menu should stay above the safe-area via menu-bottom token');
assert(css.includes('bottom: var(--control-bottom)'), 'touch controls should stay above the safe-area via control-bottom token');
console.log('bottom safe-area strip static passed');
