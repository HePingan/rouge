const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

mustInclude(main, 'data-stage-material-source', 'material source rows should be actionable buttons');
mustInclude(main, 'source.stageId', 'material source buttons should carry target stage id');
mustInclude(main, 'getStageMaterialSources(id).slice(0, 4)', 'UI should render concrete source stages');
mustInclude(main, 'stageMaterialSourceHint', 'UI should preserve fallback source hint text');
mustInclude(main, 'selectedStageId = btn.dataset.stageMaterialSource', 'tap source should select target stage');
mustInclude(main, 'selectedStageChapterId = STAGES[selectedStageId]?.chapterId', 'tap source should switch chapter');
mustInclude(main, 'stageDetailOpen = true', 'tap source should keep detail sheet open for the target');
mustInclude(css, '.stage-material-source button', 'material source button style missing');
mustInclude(css, '.stage-material-source button:active', 'material source tap feedback missing');
assert(index.includes('20260527invfix1'), 'cachebuster should bump to drain3 for material source navigation');
assert(!index.includes('20260525drain2'), 'index should not keep stale drain2 token');
console.log('stage material source navigation static assertions passed');
