const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');

// 1. Panel stack infrastructure exists
assert(main.includes('let panelStack = []'), 'panelStack array should be declared');
assert(main.includes('function updatePanelFlagsFromStack()'), 'updatePanelFlagsFromStack helper should exist');
assert(main.includes('function isPanelTypeInStack(type)'), 'isPanelTypeInStack helper should exist');
assert(main.includes('function popPanelFromStack(type)'), 'popPanelFromStack helper should exist');

// 2. updatePanelFlagsFromStack derives all panel flags from the stack
const flagsUpdateStart = main.indexOf('function updatePanelFlagsFromStack()');
const flagsUpdateEnd = main.indexOf('function isPanelTypeInStack', flagsUpdateStart);
const flagsBlock = main.slice(flagsUpdateStart, flagsUpdateEnd);
for (const flag of [
  'showInventory', 'showCharacterPanel', 'showSkillTreeUI',
  'showArtifactUI', 'showAlchemyUI', 'showBreakthroughUI',
  'showSecretRealmUI', 'showStageSelectUI', 'showTribulationUI', 'showAscensionUI',
]) {
  assert(flagsBlock.includes(flag), `updatePanelFlagsFromStack should derive ${flag} from stack`);
}

// 3. openPanel uses pushPanelToStack instead of closeAllPanels / raw pushes
const openStart = main.indexOf('function openPanel(panel)');
const openEnd = main.indexOf('function drawPanelFrame', openStart);
const openBlock = main.slice(openStart, openEnd);
assert(openBlock.includes('pushPanelToStack(panel)'), 'openPanel should push panel type through the stack helper');
assert(openBlock.includes('syncBodyPanelState()'), 'openPanel should sync body visibility after push/toggle');
assert(!openBlock.includes('closeAllPanels({ sync: false })'), 'openPanel should NOT call closeAllPanels to destroy previous panels');
assert(!openBlock.includes('closeAllPanels({ sync: true })'), 'openPanel toggle should NOT wipe older stacked panels');

// 4. closeAllPanels clears the stack
const closeStart = main.indexOf('function closeAllPanels(options = {})');
const closeEnd = main.indexOf('const PANEL_TAP_MOVE_THRESHOLD', closeStart);
const closeBlock = main.slice(closeStart, closeEnd);
assert(closeBlock.includes('panelStack = []'), 'closeAllPanels should clear the panel stack');
assert(closeBlock.includes('updatePanelFlagsFromStack()'), 'closeAllPanels should sync flags after clearing');

// 5. Individual close functions use popPanelFromStack
assert(main.includes("popPanelFromStack('inventory')"), 'inventory close should pop from stack');
assert(main.includes("popPanelFromStack('character')"), 'character close should pop from stack');
assert(main.includes("popPanelFromStack('skills')"), 'skills close should pop from stack');
assert(main.includes("popPanelFromStack('artifact')"), 'artifact close should pop from stack');
assert(main.includes("popPanelFromStack('alchemy')"), 'alchemy close should pop from stack');
assert(main.includes("popPanelFromStack('breakthrough')"), 'breakthrough close should pop from stack');
assert(main.includes("popPanelFromStack('secretRealm')"), 'secret realm close should pop from stack');
assert(main.includes("popPanelFromStack('stages')"), 'stage close should pop from stack');
assert(main.includes("popPanelFromStack('tribulation')"), 'tribulation close should pop from stack');
assert(main.includes("popPanelFromStack('ascension')"), 'ascension close should pop from stack');

// 6. No direct flag=true assignments remain (all go through stack)
assert(!main.includes('showInventory = true'), 'no direct showInventory = true');
assert(!main.includes('showCharacterPanel = true'), 'no direct showCharacterPanel = true');
assert(!main.includes('showSkillTreeUI = true'), 'no direct showSkillTreeUI = true');
assert(!main.includes('showArtifactUI = true'), 'no direct showArtifactUI = true');
assert(!main.includes('showAlchemyUI = true'), 'no direct showAlchemyUI = true');
assert(!main.includes('showBreakthroughUI = true'), 'no direct showBreakthroughUI = true');
assert(!main.includes('showSecretRealmUI = true'), 'no direct showSecretRealmUI = true');
assert(!main.includes('showStageSelectUI = true'), 'no direct showStageSelectUI = true');
assert(!main.includes('showTribulationUI = true'), 'no direct showTribulationUI = true');
assert(!main.includes('showAscensionUI = true'), 'no direct showAscensionUI = true');

// 7. isAnyPanelOpen uses panelStack
const anyOpenStart = main.indexOf('function isAnyPanelOpen()');
const anyOpenEnd = main.indexOf('function syncMainNavState', anyOpenStart);
const anyOpenBlock = main.slice(anyOpenStart, anyOpenEnd);
assert(anyOpenBlock.includes('panelStack.length'), 'isAnyPanelOpen should check panelStack length');

// 8. syncBodyPanelState uses top-of-stack to determine visibility
const syncStart = main.indexOf('function syncBodyPanelState()');
const syncEnd = main.indexOf('function clearTouchMovementState', syncStart);
const syncBlock = main.slice(syncStart, syncEnd);
assert(syncBlock.includes('topType'), 'syncBodyPanelState should compute top panel type from stack');
assert(syncBlock.includes('panelStack.length'), 'syncBodyPanelState should check stack length');

console.log('panel stack behavior static tests passed');
