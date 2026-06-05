const assert = require('assert');
const fs = require('fs');

const ui = fs.readFileSync('js/ui.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const save = fs.readFileSync('js/save.js', 'utf8');
const smoke = fs.readFileSync('test-stage-performance-budget-browser-smoke.js', 'utf8');

function extractFunctionBlock(source, signature) {
  const start = source.indexOf(signature);
  assert(start >= 0, `${signature} should exist`);
  const open = source.indexOf('{', source.indexOf(')', start));
  assert(open > start, `${signature} should have a body`);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${signature} body should close`);
}

const updateHUD = extractFunctionBlock(ui, 'function updateHUD');
assert(updateHUD.includes('setTextIfChanged('), 'updateHUD should use text diff helper instead of unconditional textContent writes');
assert(updateHUD.includes('setWidthIfChanged('), 'updateHUD should use width diff helper instead of unconditional bar width writes');
assert(!/document\.getElementById\('hud-realm'\)\.textContent\s*=/.test(updateHUD), 'hud realm text should not be written unconditionally');
assert(!/document\.getElementById\('hp-fill'\)\.style\.width\s*=/.test(updateHUD), 'hp bar width should not be written unconditionally');

const renderLog = extractFunctionBlock(ui, 'function renderMessageLog');
assert(renderLog.includes('messageLogCacheKey'), 'message log should keep a render cache key');
assert(renderLog.includes('if (cacheKey === messageLogCacheKey) return'), 'message log should skip identical innerHTML rebuilds');

const combatRender = extractFunctionBlock(main, 'function renderCombatDomPanel');
assert(main.includes('let combatDomRenderCacheKey'), 'combat DOM panel should keep a render cache key');
assert(combatRender.includes('combatDomRenderCacheKey'), 'renderCombatDomPanel should compute/use a render cache key');
assert(combatRender.includes('if (cacheKey === combatDomRenderCacheKey) return'), 'combat DOM panel should skip identical innerHTML rebuilds');
assert(combatRender.includes('combatDomRenderCacheKey = \'\''), 'combat DOM cache should reset when leaving combat');

assert(save.includes('let pendingAutoSaveTimer'), 'autoSave should support deferred/throttled writes');
assert(save.includes('function flushAutoSave'), 'save module should expose flushAutoSave for immediate critical persistence');
const autoSave = extractFunctionBlock(save, 'function autoSave');
assert(autoSave.includes('pendingAutoSaveTimer = setTimeout'), 'autoSave should debounce localStorage writes instead of writing immediately every call');
assert(autoSave.includes('.unref'), 'autoSave debounce timer should not keep headless browser smokes alive');
assert(!/const ok = saveGame\(\)/.test(autoSave), 'autoSave should not call saveGame synchronously on every trigger');

assert(save.includes('function saveGame(options = {})'), 'saveGame should accept options so debounced auto-save can skip heavy backup writes');
assert(save.includes('const shouldBackup = options.backup !== false'), 'saveGame should default to backup only for explicit/manual saves');
assert(save.includes('if (shouldBackup) backupExistingSave();'), 'saveGame backup should be conditional');
assert(save.includes('const ok = saveGame({ backup: false });'), 'flushAutoSave should avoid synchronous backup duplication during gameplay auto-saves');
assert(save.includes('const delay = Number(options.delay ?? 1500)'), 'autoSave should use a longer default debounce to stay off immediate movement frames');
assert(main.includes('autoSave({ delay: 8000 });'), 'stage room transitions should defer save well past the first movement frames');
assert(save.includes('window.addEventListener(\'pagehide\', flushAutoSave)'), 'pending auto-save should flush when the page is hidden/closed');
assert(smoke.includes("proc.on('close'"), 'stage performance browser smoke should wait for close event, not exit');
assert(!smoke.includes('timeout accepted'), 'browser smoke should not accept timeout as pass');
assert(smoke.includes('server.lastMetrics'), 'browser smoke should collect beacon metrics');

const gameLoop = extractFunctionBlock(main, 'function gameLoop');
const syncRunBodyClasses = extractFunctionBlock(main, 'function syncRunBodyClasses');
assert(main.includes('let runBodyClassCache = { combat: null, stage: null, secret: null }'), 'run/combat body class state should be cached');
assert(gameLoop.includes('syncRunBodyClasses();'), 'gameLoop should sync run body classes through a diffed helper');
assert(!/document\.body\.classList\.toggle\('combat-active',[\s\S]*document\.body\.classList\.toggle\('stage-run-active',[\s\S]*document\.body\.classList\.toggle\('secret-realm-run-active'/.test(gameLoop), 'gameLoop should not toggle body run classes unconditionally every frame');
assert(syncRunBodyClasses.includes('runBodyClassCache.combat !== nextCombat'), 'combat body class should only toggle when changed');
assert(syncRunBodyClasses.includes('runBodyClassCache.stage !== nextStage'), 'stage run body class should only toggle when changed');
assert(syncRunBodyClasses.includes('runBodyClassCache.secret !== nextSecret'), 'secret realm body class should only toggle when changed');

assert(main.includes("let lastInteractionTileKey = ''"), 'tile interactions should keep a last tile cache');
assert(main.includes('const shouldCheckTileInteractions = interactionTileKey !== lastInteractionTileKey'), 'pickup/combat/stairs checks should be gated by tile changes');
assert(gameLoop.includes('if (shouldCheckTileInteractions) {'), 'gameLoop should only run tile interaction checks after entering a new tile');
assert(gameLoop.includes('lastInteractionTileKey = interactionTileKey'), 'tile interaction cache should update after checking the current tile');
assert(main.includes("lastInteractionTileKey = '';\n     resetDomMapCache();"), 'new dungeons should reset the tile interaction cache');

console.log('performance closeout static checks passed');
