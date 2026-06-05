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

const ensureBlock = blockBetween('function ensureSecretRealmDomPanel()', 'function renderSecretRealmDomPanel()');
const renderBlock = blockBetween('function renderSecretRealmDomPanel()', 'function enterSecretRealm(');

assert(ensureBlock.includes('const onCloseHit = e =>'), 'secret realm should keep creation-level close fallback');
assert(ensureBlock.includes("p.addEventListener('pointerdown', onCloseHit, { passive: false, capture: true })"), 'secret realm close should handle pointer in capture phase');
assert(ensureBlock.includes("p.addEventListener('touchstart', onCloseHit, { passive: false, capture: true })"), 'secret realm close should handle touchstart in capture phase');
assert(ensureBlock.includes('const onSecretRealmAction = e =>'), 'secret realm should use creation-level delegated actions');
assert(ensureBlock.includes("e.target.closest('[data-sr-diff], .sr-result-more, .sr-run-quick, .sr-run-exit')"), 'secret realm delegated handler should route difficulty/progress/result buttons');
assert(ensureBlock.includes('secretRealmSelectedDifficulty = diffTarget.dataset.srDiff'), 'secret realm delegated handler should update selected difficulty');
assert(main.includes('let secretRealmDelegatedTouchUntil = 0;'), 'secret realm should keep a global synthetic-click guard timestamp');
assert(ensureBlock.includes("if (e.type === 'touchstart' || e.type === 'pointerdown') secretRealmDelegatedTouchUntil = Date.now() + 650"), 'secret realm pointer/touch actions should arm synthetic-click suppression');
assert(ensureBlock.includes("if (e.type === 'click' && Date.now() < secretRealmDelegatedTouchUntil) return;"), 'secret realm click fallback should ignore the synthetic click after a touch/pointer action');
assert(ensureBlock.includes("p.addEventListener('pointerdown', onSecretRealmAction, { passive: false })"), 'secret realm difficulty should respond on mobile pointerdown');
assert(ensureBlock.includes("p.addEventListener('touchstart', onSecretRealmAction, { passive: false })"), 'secret realm difficulty should support older touch browsers');
assert(ensureBlock.includes("p.addEventListener('click', onSecretRealmAction)"), 'secret realm difficulty should keep click fallback');
assert(!/\.addEventListener\(/.test(renderBlock), 'renderSecretRealmDomPanel should not bind direct per-render listeners');
assert(renderBlock.includes('bindPanelTap(card'), 'secret realm cards should keep scroll-safe tap helpers');
assert(renderBlock.includes('data-sr-diff'), 'secret realm render should still expose difficulty buttons');

console.log('secret realm delegated action static assertions passed');
