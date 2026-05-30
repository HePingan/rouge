const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const closeStart = main.indexOf('function closeAllPanels(options = {})');
assert(closeStart >= 0, 'closeAllPanels should accept options and exist');
const closeEnd = main.indexOf('const PANEL_TAP_MOVE_THRESHOLD', closeStart);
assert(closeEnd > closeStart, 'closeAllPanels block should end before panel tap helper');
const closeBlock = main.slice(closeStart, closeEnd);

for (const id of [
  'stage-dom-panel',
  'secretrealm-dom-panel',
  'tribulation-dom-panel',
  'ascension-dom-panel',
  'inventory-dom-panel',
  'character-dom-panel',
]) {
  assert(closeBlock.includes(`'${id}'`), `closeAllPanels must explicitly list stale ${id}`);
}
assert(closeBlock.includes('.forEach(id => {') && closeBlock.includes('hideDomPanelById(id)'), 'closeAllPanels should iterate panels and hide them via hideDomPanelById (conditional on shouldSync)');

const openPanelStart = main.indexOf('function openPanel(panel)');
const openPanelEnd = main.indexOf('function drawPanelFrame', openPanelStart);
const openBlock = main.slice(openPanelStart, openPanelEnd);
assert(openBlock.includes('pushPanelToStack(panel)'), 'openPanel should push the new panel through the stack helper');
assert(openBlock.includes('syncBodyPanelState()'), 'openPanel should sync body/panel visibility after push');
assert(openBlock.includes('popPanelFromStack(panel)'), 'openPanel should pop and close when toggling the top-of-stack panel');
assert(!openBlock.includes('closeAllPanels({ sync: true })'), 'openPanel toggle must not clear the whole panel stack');

console.log('closeAllPanels stale DOM cleanup static tests passed');
