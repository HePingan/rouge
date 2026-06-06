const assert = require('assert');
const fs = require('fs');
const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

assert(index.includes('viewport-fit=cover'), 'viewport meta should opt into covering the mobile safe-area instead of leaving a black bottom strip');
assert(index.includes('<meta name="theme-color" content="#243856">'), 'browser/system bottom bar should be tinted to the brighter game background instead of default black');
assert(css.includes('--safe-bottom: max(24px, env(safe-area-inset-bottom, 0px))'), 'CSS should reserve a minimum 24px bottom gesture area when env(safe-area-inset-bottom) is 0');
assert(css.includes('html {') && css.includes('linear-gradient(180deg, #151022 0%, #182743 58%, #243856 100%)'), 'html/body background should paint the exposed bottom safe-area with a non-black game gradient');
assert(css.includes('body::after') && css.includes('#game-container::after') && css.includes('height: max(72px, calc(env(safe-area-inset-bottom, 0px) + 42px))') && css.includes('z-index: 24') && css.includes('pointer-events: none') && css.includes('#2c4568'), 'body/game-container should draw a non-interactive brighter bottom gradient mask above canvas and below menu');
assert(css.includes('height: 100dvh'), 'game container should fill the dynamic viewport height');
assert(css.includes('bottom: var(--menu-bottom)'), 'menu should stay above the safe-area via menu-bottom token');
assert(css.includes('bottom: var(--control-bottom)'), 'touch controls should stay above the safe-area via control-bottom token');
assert(css.includes('#touch-controls') && css.includes('z-index: 30'), 'touch controls should render above the bottom mask');
console.log('bottom safe-area strip static passed');
