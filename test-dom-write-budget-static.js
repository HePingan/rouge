const assert = require('assert');
const fs = require('fs');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const p77 = fs.readFileSync('test-p77-panel-dom-budget-browser-smoke.html', 'utf8');

function extractFunction(name) {
  const start = main.indexOf(`function ${name}`);
  assert(start >= 0, `${name} should exist`);
  const bodyStart = main.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < main.length; i += 1) {
    if (main[i] === '{') depth += 1;
    if (main[i] === '}') {
      depth -= 1;
      if (depth === 0) return main.slice(start, i + 1);
    }
  }
  throw new Error(`could not extract ${name}`);
}

assert(p77.includes('./index.html?v=20260606safearea4'), 'P77 smoke should use current cachebuster token');
assert(p77.includes("Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML')"), 'P77 smoke should count innerHTML writes');
assert(p77.includes('Node.prototype.appendChild'), 'P77 smoke should count appendChild calls');
assert(p77.includes('Element.prototype.replaceChildren'), 'P77 smoke should count replaceChildren calls');
assert(p77.includes('overflowX>1'), 'P77 smoke should guard horizontal overflow');

assert(!/innerHTML\s*\+=/.test(main), 'runtime code should not append raw innerHTML strings');
assert(main.includes('let runBodyClassCache = { combat: null, stage: null, secret: null }'), 'runtime body classes should be cache-guarded');
const syncRun = extractFunction('syncRunBodyClasses');
assert(syncRun.includes('runBodyClassCache.combat !== nextCombat'), 'combat body class toggle should be no-op guarded');
assert(syncRun.includes('runBodyClassCache.stage !== nextStage'), 'stage body class toggle should be no-op guarded');
assert(syncRun.includes('runBodyClassCache.secret !== nextSecret'), 'secret run body class toggle should be no-op guarded');

const gameLoop = extractFunction('gameLoop');
assert(gameLoop.includes('syncRunBodyClasses();'), 'game loop should use centralized cached run body sync');
assert(gameLoop.includes('const shouldCheckTileInteractions = interactionTileKey !== lastInteractionTileKey'), 'tile interactions should be gated by tile changes');
assert(gameLoop.includes('if (shouldCheckTileInteractions) {'), 'expensive tile checks should run behind change gate');
assert(main.includes("let lastInteractionTileKey = ''"), 'tile interaction cache should exist');
assert(main.includes('lastInteractionTileKey = interactionTileKey'), 'tile interaction cache should advance after checks');

const combatRender = extractFunction('renderCombatDomPanel');
assert(/combatLogBuffer\.slice\(-\d+\)/.test(combatRender) || /combatLog\.slice\(-\d+\)/.test(combatRender), 'combat panel should cap visible log rows');
assert(!combatRender.includes('.addEventListener('), 'combat render should not add native listeners per render');
assert(!extractFunction('renderSkillsDomPanel').includes('.addEventListener('), 'skills render should not add native listeners per render');

assert(/#touch-controls\s*\{[\s\S]*(?:inset:\s*0|top:\s*0;[\s\S]*bottom:\s*0;[\s\S]*left:\s*0;[\s\S]*right:\s*0)[\s\S]*touch-action:\s*none/.test(css), 'touch plane should be full-area with touch-action none');
assert(/stage-run-active[\s\S]*#touch-controls\.show[\s\S]*pointer-events:\s*auto[\s\S]*touch-action:\s*none/.test(css), 'stage-run touch controls should stay enabled in final cascade');

console.log('dom write budget static passed');
