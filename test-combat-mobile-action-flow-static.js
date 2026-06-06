const assert = require('assert');
const fs = require('fs');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

function extractFunction(name) {
  const marker = `function ${name}`;
  const start = main.indexOf(marker);
  assert(start >= 0, `${name} should exist`);
  const bodyStart = main.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < main.length; i++) {
    if (main[i] === '{') depth++;
    if (main[i] === '}') {
      depth--;
      if (depth === 0) return main.slice(start, i + 1);
    }
  }
  throw new Error(`${name} body not found`);
}

const ensureCombat = extractFunction('ensureCombatDomPanel');
const renderCombat = extractFunction('renderCombatDomPanel');

assert(ensureCombat.includes('combatDelegatedTouchUntil'), 'combat panel should suppress synthetic click after pointer/touch actions');
assert(ensureCombat.includes("p.addEventListener('pointerdown'"), 'combat panel should delegate pointerdown once in ensureCombatDomPanel');
assert(ensureCombat.includes("p.addEventListener('touchstart'"), 'combat panel should delegate touchstart once in ensureCombatDomPanel');
assert(ensureCombat.includes("p.addEventListener('click'"), 'combat panel should keep click fallback once in ensureCombatDomPanel');
assert(!/\.addEventListener\s*\(/.test(renderCombat), 'renderCombatDomPanel must not bind listeners on every render');
assert(renderCombat.includes('class="cbt-log"'), 'combat render should include capped combat log container');
assert(renderCombat.includes('id="cbt-attack"') && renderCombat.includes('id="cbt-defend"') && renderCombat.includes('id="cbt-flee"'), 'combat render should expose stable action button ids');

assert(/\.cbt-log\s*\{[^}]*max-height\s*:/s.test(css), 'combat log should have max-height cap');
assert(/\.cbt-log\s*\{[^}]*overflow\s*:\s*hidden/s.test(css), 'combat log should hide overflow instead of growing forever');
assert(/#combat-dom-panel\s*\{[^}]*max-height\s*:/s.test(css), 'combat panel should have a max-height budget');
assert(/@media \(max-width: 420px\)[\s\S]*\.cbt-act-btn\s*\{[^}]*min-height\s*:\s*44px/s.test(css), 'phone combat action buttons should keep 44px touch targets');

console.log('combat mobile action flow static passed');
