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
const CURRENT_TOKEN = '20260607safearea12';
assert(html.includes(CURRENT_TOKEN), 'index cachebuster should include current mobile layout token');
assert(!html.includes('20260601skillstrip1'), 'index should not keep stale skill strip token');
assert(!html.includes('20260530stageclose1'), 'index should not keep stale stage close token');

const mobileVerify = fs.readFileSync('mobile-verify.html', 'utf8');
assert(
  new RegExp(`<iframe[^>]+src="\\./index\\.html\\?v=${CURRENT_TOKEN}"`).test(mobileVerify),
  'mobile-verify iframe should load this project entrypoint, not the web root'
);

// Universal mobile sheet contract: panels should feel native on phones.
mustInclude('mobile layout marker', `Mobile Universal Interface Layout ${CURRENT_TOKEN}`);
mustInclude('skill compact layout marker', 'Mobile Skill Compact Layout 20260601skillstrip1');
mustInclude('stage top overlay marker', `Mobile Stage Footer Readability + Scroll Fix 20260531resonance1`);
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
mustMatch('skill attr bar not sticky on mobile', /#skills-dom-panel \.skill-attr-bar\s*\{[^}]*position:\s*static !important[^}]*bottom:\s*auto !important[^}]*\}/);
const mobileUniversalStart = css.indexOf(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`);
const mobileUniversalBlock = css.slice(mobileUniversalStart, css.indexOf('/* Ascension panel', mobileUniversalStart));
const mobileSkillAttrMatch = mobileUniversalBlock.match(/#skills-dom-panel \.skill-attr-bar\s*\{[^}]*\}/);
assert(mobileSkillAttrMatch, 'mobile skill attr bar override block missing');
assert(!/position:\s*sticky/.test(mobileSkillAttrMatch[0]), 'mobile skill attr bar should not keep covering synergy claim buttons');

mustMatch('recommended skill buttons use full readable touch rows', /#skills-dom-panel \.synergy-recommend-strip button\s*\{[^}]*min-height:\s*44px[^}]*white-space:\s*normal[^}]*touch-action:\s*manipulation/);
mustMatch('recommended skill detail text wraps instead of clipping', /#skills-dom-panel \.synergy-recommend-strip button small\s*\{[^}]*white-space:\s*normal[^}]*overflow:\s*visible/);
mustMatch('synergy title hint wraps instead of clipping on mobile', /#skills-dom-panel \.synergy-title small\s*\{[^}]*white-space:\s*normal[^}]*overflow:\s*visible[^}]*text-overflow:\s*clip/);

console.log('mobile layout static assertions passed');
