const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260526panelcleanup1';

assert(main.includes('const PANEL_TAP_MOVE_THRESHOLD = 12'), 'panel tap helper should keep a move threshold for scroll-safe taps');
assert(/function findPanelScrollParent[\s\S]*classList\?\.contains\('stage-body'\)[\s\S]*classList\?\.contains\('stage-chapter-strip'\)[\s\S]*classList\?\.contains\('stage-card-grid'\)/.test(main), 'stage card/chapter taps should measure their own scroll containers');
assert(/function findPanelScrollParent[\s\S]*overflowX[\s\S]*scrollWidth > node\.clientWidth \+ 1/.test(main), 'panel tap helper should detect horizontal scroll strips, not only vertical scroll parents');
assert(/function bindPanelTap[\s\S]*const scrollSnapshot = \(\) => \{[\s\S]*left:\s*parent\?\.scrollLeft[\s\S]*top:\s*parent\?\.scrollTop/.test(main), 'panel tap helper should compare both scrollLeft and scrollTop before firing tap actions');
assert(/function bindPanelTap[\s\S]*Math\.abs\(scroll\.left - start\.scrollLeft\) > 2/.test(main), 'panel tap helper should suppress taps after horizontal scroll movement');
assert(/\.stage-chapter-tab,[\s\S]*#stage-dom-panel \.stage-card[\s\S]*touch-action:\s*pan-y/.test(css), 'stage tappable cards should opt into scroll-safe touch-action instead of manipulation-only behavior');

const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length > 0, 'index should link versioned assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale panelcleanup cachebuster');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current stage tap token');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify iframe should not keep stale panelcleanup token');
assert(css.includes(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`), 'mobile CSS marker should bump with stage tap cachebuster');

console.log('stage panel scroll-safe tap static tests passed');
