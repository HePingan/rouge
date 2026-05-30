const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');

const pushStart = main.indexOf('function pushPanelToStack(type)');
const pushEnd = main.indexOf('let combatSkillDrawerOpen', pushStart);
const pushBlock = main.slice(pushStart, pushEnd);
assert(pushBlock.includes('lastIndexOf(type)'), 'pushPanelToStack should locate existing panel entry');
assert(pushBlock.includes('panelStack.splice(existing, 1)'), 'pushPanelToStack should remove stale existing panel entry before re-pushing');
assert(pushBlock.includes('panelStack.push(type)'), 'pushPanelToStack should make the requested panel top-of-stack');

const openStart = main.indexOf('function openPanel(panel)');
const openEnd = main.indexOf('function drawPanelFrame', openStart);
const openBlock = main.slice(openStart, openEnd);
assert(openBlock.includes('pushPanelToStack(panel)'), 'openPanel should route pushes through dedup/top helper');
assert(!openBlock.includes('closeAllPanels({ sync: true })'), 'tapping the active nav panel should not wipe the entire stack');
assert(openBlock.includes('popPanelFromStack(panel)') && openBlock.includes('syncBodyPanelState()'), 'active panel toggle should pop only the top panel and resync');

assert(!/panelStack\.push\('(breakthrough|character|stages)'\)/.test(main), 'known direct panel pushes should use pushPanelToStack');
assert(main.includes("pushPanelToStack('character')"), 'inventory equip transition should use pushPanelToStack for character panel');
assert(main.includes("pushPanelToStack('breakthrough')"), 'breakthrough panel opener should use pushPanelToStack');

console.log('panel stack reopen static tests passed');
