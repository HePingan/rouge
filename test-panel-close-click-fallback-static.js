const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const mobileVerify = fs.readFileSync('mobile-verify.html', 'utf8');

function sliceFunction(name, nextMarker) {
  const start = main.indexOf(`function ${name}()`);
  const end = nextMarker ? main.indexOf(nextMarker, start) : main.indexOf('\n  function ', start + 20);
  assert(start >= 0 && end > start, `${name} block should exist`);
  return main.slice(start, end);
}

function assertCaptureClose(name, nextMarker, selectorSnippet, closeCall) {
  const block = sliceFunction(name, nextMarker);
  assert(block.includes("p.addEventListener('pointerdown'"), `${name} should close immediately on pointerdown for mobile`);
  assert(block.includes("p.addEventListener('touchstart'"), `${name} should close immediately on touchstart for older mobile browsers`);
  assert(block.includes("p.addEventListener('click'"), `${name} should have a delegated click close fallback`);
  assert((block.match(/capture: true/g) || []).length >= 3, `${name} close fallback should use capture phase for pointer/touch/click`);
  assert(block.includes(selectorSnippet), `${name} delegated close handler should target ${selectorSnippet}`);
  assert(block.includes(closeCall), `${name} delegated close handler should call ${closeCall}`);
}

assertCaptureClose('ensureStageDomPanel', 'function addStageEquipmentReward', "closest('.pclose, [data-stage-close]')", 'closeStagePanel(e)');
assertCaptureClose('ensureSecretRealmDomPanel', 'function renderSecretRealmDomPanel()', "closest('.pclose, .sr-close')", 'closeSecretRealmPanel(e)');
assertCaptureClose('ensureAscensionDomPanel', 'function getEquippedWeaponForAscension()', "closest('.pclose')", 'closeAscensionPanel(e)');
assertCaptureClose('ensureSkillsDomPanel', 'function ensureSkillDetailLayer()', "closest('.pclose')", 'closeSkillsPanelDom(e)');
assertCaptureClose('ensureAlchemyDomPanel', 'function renderAlchemyDomPanel()', "closest('.pclose')", "popPanelFromStack('alchemy')");
assertCaptureClose('ensureArtifactDomPanel', 'function renderArtifactDomPanel()', "closest('.pclose')", "popPanelFromStack('artifact')");
assertCaptureClose('ensureBreakthroughDomPanel', 'function renderBreakthroughDomPanel()', "closest('.pclose')", 'closeBreakthroughPanel()');
assertCaptureClose('ensureTribulationDomPanel', 'function renderTribulationDomPanel()', "closest('.pclose')", 'closeTribulationPanel(e)');

const mobileBlockStart = css.indexOf('@media (max-width: 620px)');
assert(mobileBlockStart >= 0, 'mobile media query should exist');
const mobileCss = css.slice(mobileBlockStart);
assert(mobileCss.includes('#secretrealm-dom-panel,\n  #tribulation-dom-panel,\n  #ascension-dom-panel {\n    display: none !important;'), 'secret/tribulation/ascension should be hidden by default on mobile');
assert(mobileCss.includes('body.secretrealm-open #secretrealm-dom-panel') && mobileCss.includes('body.tribulation-open #tribulation-dom-panel') && mobileCss.includes('body.ascension-open #ascension-dom-panel'), 'secret/tribulation/ascension should only display when matching body class is open');
assert(mobileCss.includes('z-index: 10010 !important'), 'top panels should sit above HUD/nav after audit');

assert(indexHtml.includes('20260530ascguard1'), 'index.html should use current panel audit cache token');
assert(mobileVerify.includes('20260530ascguard1'), 'mobile-verify iframe should use current panel audit cache token');
assert(!indexHtml.includes('20260530stagetop1'), 'index.html should not keep stale stage top cache token');
assert(!mobileVerify.includes('20260530stagetop1'), 'mobile-verify should not keep stale stage top cache token');

console.log('panel close click fallback static tests passed');
