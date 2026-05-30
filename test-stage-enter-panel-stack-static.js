const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const start = main.indexOf('function enterStage(stageId)');
const end = main.indexOf('window.advanceStageRoom', start);
assert(start >= 0 && end > start, 'enterStage function should exist');
const block = main.slice(start, end);

assert(block.includes("popPanelFromStack('stages')"), 'enterStage should pop the stage selector from panelStack');
assert(block.includes('showStageSelectUI = false'), 'enterStage should clear stage selector flag');
assert(block.includes("document.body.classList.add('stage-run-active')"), 'enterStage should activate stage-run body class');
assert(block.includes('syncBodyPanelState()'), 'enterStage should sync body classes after popping the panel');

const popIndex = block.indexOf("popPanelFromStack('stages')");
const syncIndex = block.indexOf('syncBodyPanelState()', popIndex);
assert(syncIndex > popIndex, 'enterStage should sync after popping stages from the stack');

console.log('stage enter panel-stack static test passed');
