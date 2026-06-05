const assert = require('assert');
const fs = require('fs');

const main = fs.readFileSync('js/main.js', 'utf8');

function extractFunction(name) {
  const marker = `function ${name}`;
  const start = main.indexOf(marker);
  assert(start >= 0, `${name} should exist`);
  const open = main.indexOf('{', start);
  let depth = 1;
  let i = open + 1;
  while (i < main.length && depth > 0) {
    const ch = main[i++];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  assert(depth === 0, `${name} function body should parse by braces`);
  return main.slice(open + 1, i - 1);
}

const renderNames = Array.from(main.matchAll(/function\s+(render\w*DomPanel)\s*\(/g), m => m[1]);
assert(renderNames.length >= 8, 'should audit all render*DomPanel functions');

const allowedRenderListenerFunctions = new Set([
  // keep empty: static controls belong in ensure* creation-level delegated handlers.
]);

const offenders = [];
for (const name of renderNames) {
  const body = extractFunction(name);
  if (!allowedRenderListenerFunctions.has(name) && /\.addEventListener\s*\(/.test(body)) {
    offenders.push(name);
  }
}
assert.deepStrictEqual(offenders, [], `render*DomPanel functions should not bind per-render listeners: ${offenders.join(', ')}`);

const directPushes = Array.from(main.matchAll(/panelStack\.push\s*\(/g), m => main.slice(Math.max(0, m.index - 140), m.index + 80));
assert.strictEqual(directPushes.length, 1, 'panelStack.push should only appear inside pushPanelToStack');
assert(extractFunction('pushPanelToStack').includes('panelStack.push(type)'), 'pushPanelToStack should be the only direct stack push route');

for (const name of ['ensureInventoryDomPanel', 'ensureStageDomPanel', 'ensureSecretRealmDomPanel', 'ensureAscensionDomPanel', 'ensureSkillsDomPanel', 'ensureTribulationDomPanel']) {
  const body = extractFunction(name);
  assert(/addEventListener\s*\(\s*['"]pointerdown['"]/.test(body) || /addEventListener\s*\(\s*['"]touchstart['"]/.test(body), `${name} should bind mobile delegated/capture handlers at creation time`);
}

console.log('render panel delegation audit static passed');
