const assert = require('assert');
const fs = require('fs');

const main = fs.readFileSync('js/main.js', 'utf8');
const start = main.indexOf('function syncBodyPanelState()');
assert(start >= 0, 'syncBodyPanelState should exist');
const end = main.indexOf('function hasVisibleBlockingPanel()', start);
assert(end > start, 'syncBodyPanelState block should be readable');
const block = main.slice(start, end);

assert(block.includes("runBodyClassCache.combat = isInCombat()"), 'syncBodyPanelState should refresh combat cache');
assert(block.includes("document.body.classList.toggle('combat-active', runBodyClassCache.combat)"), 'syncBodyPanelState should also update body combat-active class when refreshing cache');
assert(block.indexOf("runBodyClassCache.combat = isInCombat()") < block.indexOf("document.body.classList.toggle('combat-active', runBodyClassCache.combat)"), 'combat-active class should be toggled after computing the current combat state');

console.log('run body class sync static passed');
