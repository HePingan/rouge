const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('css/style.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function mustInclude(label, needle) {
  assert(css.includes(needle), `${label}: missing ${needle}`);
}

function mustMatch(label, regex) {
  assert(regex.test(css), `${label}: missing pattern ${regex}`);
}

// Cache token must be bumped when mobile layout changes.
const CURRENT_TOKEN = '20260530ascguard1';
assert(html.includes(CURRENT_TOKEN), 'index cachebuster should include current mobile layout token');
assert(!html.includes('20260530stageclose1'), 'index should not keep stale stage close token');

const mobileVerify = fs.readFileSync('mobile-verify.html', 'utf8');
assert(
  new RegExp(`<iframe[^>]+src="\\./index\\.html\\?v=${CURRENT_TOKEN}"`).test(mobileVerify),
  'mobile-verify iframe should load this project entrypoint, not the web root'
);

// Universal mobile sheet contract: panels should feel native on phones.
mustInclude('mobile layout marker', 'Mobile Universal Interface Layout 20260530ascguard1');
mustInclude('stage top overlay marker', `Mobile Stage Footer Readability + Scroll Fix ${CURRENT_TOKEN}`);
mustInclude('panel list includes character', '#character-dom-panel');
mustInclude('panel list includes inventory', '#inventory-dom-panel');
mustInclude('panel list includes skill', '#skills-dom-panel');
mustInclude('panel list includes artifact', '#artifact-dom-panel');
mustInclude('panel list includes secret realm', '#secretrealm-dom-panel');
mustInclude('panel list includes stage', '#stage-dom-panel');
mustInclude('panel list includes tribulation', '#tribulation-dom-panel');
mustInclude('panel list includes alchemy', '#alchemy-dom-panel');
mustInclude('panel list includes breakthrough', '#breakthrough-dom-panel');
mustInclude('uses dynamic viewport height', '100dvh');
mustInclude('bottom-sheet rounded top', 'border-radius: 22px 22px 0 0');
mustInclude('safe-area bottom padding', 'env(safe-area-inset-bottom)');
mustInclude('sticky panel headers', 'position: sticky');
mustInclude('scroll-safe touch', 'touch-action: pan-y');
mustInclude('native scrolling', '-webkit-overflow-scrolling: touch');

// Main UI should stay map-first: compact top HUD, bottom nav, joystick above nav.
mustMatch('main nav bottom zone', /--main-nav-bottom:\s*calc\(12px \+ var\(--safe-bottom\)\)/);
mustMatch('nav is four primary actions', /#menu-bar\s*\{[\s\S]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
mustMatch('panel mode hides map controls', /body\.panel-open #menu-bar,[\s\S]*body\.panel-open #action-buttons[\s\S]*display:\s*none !important/);
mustMatch('hud bottom has no implicit top stretch', /#hud-bottom\s*\{[\s\S]*top:\s*auto\s*!important[\s\S]*max-height:\s*calc\(100dvh - var\(--stats-bottom\) - 54px\)/);

console.log('mobile layout static assertions passed');
