const assert = require('assert');
const fs = require('fs');
const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

assert(index.includes('viewport-fit=cover'), 'viewport meta should opt into covering the mobile safe-area instead of leaving a black bottom strip');
assert(index.includes('<meta name="theme-color" content="#12111f">'), 'browser/system bottom bar should be tinted to the game background instead of default black');
assert(css.includes('--safe-bottom: max(24px, env(safe-area-inset-bottom, 0px))'), 'CSS should reserve a minimum 24px bottom gesture area when env(safe-area-inset-bottom) is 0');
assert(css.includes('html {') && css.includes('linear-gradient(180deg, #151022 0%, #101827 58%, #12111f 100%)'), 'html/body background should paint the exposed bottom safe-area instead of leaving a black strip');
assert(css.includes('body::after') && css.includes('height: max(42px, calc(env(safe-area-inset-bottom, 0px) + 18px))') && css.includes('pointer-events: none'), 'body should draw a non-interactive bottom gradient mask over the exposed system/safe-area strip');
assert(css.includes('height: 100dvh'), 'game container should fill the dynamic viewport height');
assert(css.includes('bottom: var(--menu-bottom)'), 'menu should stay above the safe-area via menu-bottom token');
assert(css.includes('bottom: var(--control-bottom)'), 'touch controls should stay above the safe-area via control-bottom token');
console.log('bottom safe-area strip static passed');
