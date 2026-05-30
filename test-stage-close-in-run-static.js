const fs = require('fs');
const code = fs.readFileSync('js/main.js', 'utf8');
let passed = 0, total = 0;
function assert(cond, msg) { total++; if (cond) passed++; else { console.log('FAIL:', msg); process.exit(1); } }

// closeStagePanel delegates to onStageFlee when isInStageRun is true
assert(
  code.includes("if (isInStageRun) { onStageFlee(); return; }"),
  'closeStagePanel should call onStageFlee when in active run'
);

// The guard is before popPanelFromStack so it takes priority
const closeIdx = code.indexOf('function closeStagePanel');
const fleeIdx = code.indexOf("onStageFlee(); return;", closeIdx);
const popIdx = code.indexOf("popPanelFromStack('stages')", closeIdx);
assert(fleeIdx < popIdx, 'onStageFlee guard must come before popPanelFromStack');

// onStageFlee resets isInStageRun
const fleeFn = code.substring(code.indexOf('window.onStageFlee'));
assert(fleeFn.includes('isInStageRun = false'), 'onStageFlee must reset isInStageRun');
assert(fleeFn.includes('stageProgress.currentRun = null'), 'onStageFlee must clear currentRun');
assert(fleeFn.includes('stage-run-active'), 'onStageFlee must remove stage-run-active class');
assert(fleeFn.includes('pushPanelToStack'), 'onStageFlee must push stages back to stack');
assert(fleeFn.includes('syncBodyPanelState'), 'onStageFlee must sync panel state');

console.log(`${passed}/${total} stage close-in-run tests passed`);
