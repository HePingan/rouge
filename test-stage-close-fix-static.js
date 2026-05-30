const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');

// pushPanelToStack must exist and prevent duplicates
assert(main.includes('function pushPanelToStack('), 'pushPanelToStack helper must exist');
assert(/function pushPanelToStack\([^)]*\)\s*\{[^}]*lastIndexOf\(type\)[^}]*splice\(existing, 1\)[^}]*panelStack\.push\(type\)/s.test(main), 'pushPanelToStack must remove an existing entry before re-pushing it to the top');

// No direct panelStack.push('stages') should remain - all must go through pushPanelToStack
assert(!/panelStack\.push\('stages'\)/.test(main), 'no direct panelStack.push for stages - must use pushPanelToStack');

// pushPanelToStack('stages') should be used in the three known locations
const pushMatches = main.match(/pushPanelToStack\('stages'\)/g);
assert(pushMatches && pushMatches.length >= 3, `pushPanelToStack('stages') should appear at least 3 times, got ${pushMatches ? pushMatches.length : 0}`);

// closeStagePanel must still call popPanelFromStack
assert(/function closeStagePanel/.test(main), 'closeStagePanel must exist');
assert(main.includes("popPanelFromStack('stages')"), 'closeStagePanel must pop stages from stack');

// popPanelFromStack removes only ONE occurrence (lastIndexOf + splice)
assert(main.includes('lastIndexOf') && main.includes('popPanelFromStack'), 'popPanelFromStack uses lastIndexOf to remove single occurrence');

console.log('stage close fix static tests passed');
