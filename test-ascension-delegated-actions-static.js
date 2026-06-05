const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');

function functionBlock(name) {
  const start = main.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} should exist`);
  const next = main.indexOf('\n  window.renderAscensionDomPanel', start + 1);
  return main.slice(start, next >= 0 ? next : main.length);
}

const ensureAscension = functionBlock('ensureAscensionDomPanel');
const renderAscension = functionBlock('renderAscensionDomPanel');

assert(ensureAscension.includes('onAscensionDelegatedAction'), 'ascension panel should use creation-level delegated action routing');
assert(ensureAscension.includes("p.addEventListener('pointerdown', onDelegatedAscensionClose, { passive: false, capture: true })"), 'ascension close should keep capture pointer fallback');
assert(ensureAscension.includes("p.addEventListener('touchstart', onDelegatedAscensionClose, { passive: false, capture: true })"), 'ascension close should keep capture touch fallback');
assert(ensureAscension.includes("p.addEventListener('click', onDelegatedAscensionClose, { capture: true })"), 'ascension close should keep capture click fallback');
assert(ensureAscension.includes("p.addEventListener('pointerdown', onAscensionDelegatedAction, { passive: false })"), 'ascension actions should respond on mobile pointerdown');
assert(ensureAscension.includes("p.addEventListener('touchstart', onAscensionDelegatedAction, { passive: false })"), 'ascension actions should respond on older mobile touchstart');
assert(ensureAscension.includes("p.addEventListener('click', onAscensionDelegatedAction)"), 'ascension actions should keep click fallback');
assert(ensureAscension.includes('ascensionDelegatedTouchUntil'), 'ascension delegated handler should suppress synthetic clicks after touch/pointer actions');
assert(ensureAscension.includes("target.matches('[data-asc-refine-item]')"), 'delegated handler should support dynamic refine rows after rerender');
assert(ensureAscension.includes("target.matches('[data-asc-law]')"), 'delegated handler should support law upgrade cards');

assert(!/\.addEventListener\(/.test(renderAscension), 'renderAscensionDomPanel should not bind direct per-render addEventListener handlers');
assert(ensureAscension.includes("target.matches('[data-asc-resource-source]')"), 'delegated handler should support material source navigation buttons');

console.log('ascension delegated mobile action assertions passed');
