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

const ensureBlock = blockBetween('function ensureTribulationDomPanel()', 'function renderTribulationDomPanel()');
const renderBlock = blockBetween('function renderTribulationDomPanel()', 'function enterTribulation(');

assert(ensureBlock.includes('const onCloseHit = e =>'), 'tribulation panel should keep delegated capture close fallback');
assert(ensureBlock.includes("p.addEventListener('pointerdown', onCloseHit, { passive: false, capture: true })"), 'tribulation close should handle mobile pointer in capture phase');
assert(ensureBlock.includes("p.addEventListener('touchstart', onCloseHit, { passive: false, capture: true })"), 'tribulation close should handle touchstart in capture phase');
assert(ensureBlock.includes('const onTribulationAction = e =>'), 'tribulation panel should use creation-level delegated actions');
assert(ensureBlock.includes("target.matches('[data-trib-id]')"), 'tribulation delegated handler should route card selection');
assert(ensureBlock.includes('enterTribulation(target.dataset.tribEnter)'), 'tribulation delegated handler should route enter button');
assert(main.includes('let tribulationDelegatedTouchUntil = 0;'), 'tribulation should keep a global synthetic-click guard timestamp');
assert(ensureBlock.includes("if (e.type === 'touchstart' || e.type === 'pointerdown') tribulationDelegatedTouchUntil = Date.now() + 650"), 'tribulation pointer/touch actions should arm synthetic-click suppression');
assert(ensureBlock.includes("if (e.type === 'click' && Date.now() < tribulationDelegatedTouchUntil) return;"), 'tribulation click fallback should ignore the synthetic click after a touch/pointer action');
assert(ensureBlock.includes("p.addEventListener('pointerdown', onTribulationAction, { passive: false })"), 'tribulation action should respond immediately on mobile pointerdown');
assert(ensureBlock.includes("p.addEventListener('touchstart', onTribulationAction, { passive: false })"), 'tribulation action should support older touch browsers');
assert(ensureBlock.includes("p.addEventListener('click', onTribulationAction)"), 'tribulation action should keep click fallback');
assert(!/\.addEventListener\(/.test(renderBlock), 'renderTribulationDomPanel should not bind direct per-render listeners');
assert(renderBlock.includes('data-trib-id'), 'tribulation render should still expose selectable trial cards');
assert(renderBlock.includes('data-trib-enter'), 'tribulation render should still expose enter action');

console.log('tribulation delegated action static assertions passed');
