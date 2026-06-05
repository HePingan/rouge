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

const menuStart = main.indexOf('function onStages()');
const menuEnd = main.indexOf('function onArtifact()', menuStart);
assert(menuStart >= 0 && menuEnd > menuStart, 'stage nav handler should exist');
const menuBlock = main.slice(menuStart, menuEnd);
assert(menuBlock.includes('if (isInStageRun && !isInCombat())'), 'stage nav should not reopen selector while already in a stage run');
assert(menuBlock.includes("popPanelFromStack('stages')"), 'stage nav should clear stale stage panel stack during a run');
assert(menuBlock.includes('showStageSelectUI = false'), 'stage nav should keep selector closed during a run');
assert(menuBlock.includes('syncBodyPanelState()'), 'stage nav run guard should resync body state');

const bindEnterLine = main.split('\n').find(line => line.includes("querySelectorAll('[data-stage-enter]')")) || '';
assert(!bindEnterLine.includes('suppressPanelSyntheticClickUntil'), 'stage enter handler should not globally suppress later clicks after the panel closes');

console.log('stage enter panel-stack static test passed');
