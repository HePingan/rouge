const assert = require('assert');
const fs = require('fs');

const main = fs.readFileSync('js/main.js', 'utf8');

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

const overlay = extractFunctionBlock(main, 'function renderDomMapOverlay');
assert(main.includes('const MAP_HINT_UPDATE_INTERVAL = 8'), 'map hints should be throttled separately from player movement');
assert(main.includes('const MAP_MINIMAP_UPDATE_INTERVAL = 12'), 'minimap should be throttled separately from player movement');
assert(overlay.includes('if (mapRenderCache.layerTransform !== transform)'), 'camera transform writes should be diffed');
assert(main.includes('mapRenderCache.playerTransform !== playerTransform'), 'player marker transform should be diffed before writing');
assert(/mapRenderCache\.playerEl = mapRenderCache\.entitiesEl\.querySelector\('#map-player'\);[\s\S]*mapRenderCache\.playerTransform = ''/.test(main), 'player transform cache should reset after DOM player node rebuild');
assert(main.includes('hiddenMiniMap') && main.includes('mapRenderCache.hiddenMiniMap = true'), 'hidden minimap state should avoid repeated clears');
assert(overlay.includes('if (shouldRefreshEntities) renderDomMapEntities'), 'entity DOM rebuild should be gated');
assert(overlay.includes('updateDomMapPlayerTransform();'), 'player transform should update every movement frame independent of entity rebuilds');
assert(!/gameTicks % MAP_DOM_UPDATE_INTERVAL/.test(overlay), 'entity DOM should not rebuild on a fixed frame interval during movement');
assert(!/renderDomMapEntities\(startCol, endCol, startRow, endRow\);\s*const shouldRefreshHints/.test(overlay), 'entity rebuild should not run unconditionally before hints');
assert(overlay.includes('if (shouldRefreshHints)'), 'hint scan/rebuild should be gated');
assert(overlay.includes('if (shouldRefreshMiniMap)'), 'minimap rebuild should be gated');
assert(overlay.includes('tileKey !== mapRenderCache.hintTileKey'), 'hints should refresh on tile changes');
assert(overlay.includes('tileKey !== mapRenderCache.miniTileKey'), 'minimap should refresh on tile changes');
assert(!/layer\.style\.width\s*=\s*`\$\{dungeon\.width \* CELL_SIZE\}px`/.test(overlay), 'layer width should not be assigned unconditionally per frame');
assert(!/renderDomMapHints\(startCol, endCol, startRow, endRow\);\s*renderDomMiniMap/.test(overlay), 'hints/minimap should not run unconditionally every frame');

const drawBiomeFloor = extractFunctionBlock(main, 'function drawBiomeFloor');
assert(!drawBiomeFloor.includes('createLinearGradient'), 'drawBiomeFloor should avoid per-tile CanvasGradient allocation in movement frames');
assert(drawBiomeFloor.includes('top/bottom strips below preserve depth'), 'drawBiomeFloor should use cheap strip highlights instead of gradients');

console.log('stage performance budget static checks passed');
