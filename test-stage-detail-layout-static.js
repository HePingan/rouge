const fs = require('fs');
const assert = require('assert');
const css = fs.readFileSync('css/style.css', 'utf8');
const js = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(css.includes('Mobile Stage Detail Sheet Safe Area 20260530ascguard1'), 'detail sheet safe-area marker missing');
assert(/#stage-dom-panel \.stage-detail-sheet,\s*#stage-dom-panel \.stage-sweep-sheet\s*\{[\s\S]*bottom:\s*calc\(max\(10px, env\(safe-area-inset-bottom\)\) \+ 8px\)/.test(css), 'detail/sweep sheets should sit above viewport bottom with safe gap');
assert(/max-height:\s*min\(calc\(100dvh - max\(24px, env\(safe-area-inset-top\)\) - max\(24px, env\(safe-area-inset-bottom\)\) - 20px\), 560px\)/.test(css), 'detail/sweep sheets should cap height to viewport minus safe areas');
assert(/#stage-dom-panel \.stage-detail-sheet \{[\s\S]*scroll-padding-bottom:\s*66px/.test(css), 'detail sheet should reserve scroll padding for sticky actions');
assert(/#stage-dom-panel \.stage-detail-sheet \.stage-sheet-actions\s*\{[\s\S]*bottom:\s*0/.test(css), 'sticky detail actions should not use negative bottom');
assert(/padding-bottom:\s*calc\(8px \+ env\(safe-area-inset-bottom\)\)/.test(css), 'sticky detail actions should keep safe bottom padding');
assert(/#stage-dom-panel \.stage-detail-section \{[\s\S]*padding:\s*8px/.test(css), 'detail sections should be compact on mobile');
assert(index.includes('20260530ascguard1'), 'index cachebuster should include detailfix token');
assert(!index.includes('20260527stagecompact1'), 'old stagecompact cachebuster should be removed');
console.log('stage detail layout static checks passed');
