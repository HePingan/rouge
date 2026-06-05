const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');

function blockBetween(startNeedle, endNeedle) {
  const start = main.indexOf(startNeedle);
  assert(start >= 0, `missing ${startNeedle}`);
  const end = main.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing end ${endNeedle}`);
  return main.slice(start, end);
}

const ensureBlock = blockBetween('function ensureAscensionDomPanel()', 'function getEquippedWeaponForAscension()');
const renderBlock = blockBetween('function renderAscensionDomPanel()', 'window.renderAscensionDomPanel = renderAscensionDomPanel;');
const resourceGuideBlock = blockBetween('function renderAscensionResourceGuide(items = [])', 'function renderAscensionTrialPanel()');

assert(ensureBlock.includes("'[data-asc-resource-source]'"), 'ascension delegated handler should include material source buttons');
assert(ensureBlock.includes('openAscensionResourceStageSource(target.dataset.ascResourceSource)'), 'ascension delegated handler should open resource stage source');
assert(ensureBlock.includes("p.addEventListener('pointerdown', onAscensionDelegatedAction, { passive: false })"), 'ascension delegated actions should fire on pointerdown');
assert(ensureBlock.includes("p.addEventListener('touchstart', onAscensionDelegatedAction, { passive: false })"), 'ascension delegated actions should support touchstart fallback');
assert(ensureBlock.includes("p.addEventListener('click', onAscensionDelegatedAction)"), 'ascension delegated actions should keep click fallback');
assert(resourceGuideBlock.includes('data-asc-resource-source'), 'ascension resource guide should still emit resource source buttons');
assert(!renderBlock.includes('querySelectorAll(\'[data-asc-resource-source]\')'), 'renderAscensionDomPanel should not bind resource-source listeners per render');
assert(!/\.addEventListener\(/.test(renderBlock), 'renderAscensionDomPanel should not bind listeners per render');

console.log('ascension resource source delegated action assertions passed');
