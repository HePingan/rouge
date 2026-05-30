const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('css/style.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260527detailfix1';

function mustInclude(label, needle) {
  assert(css.includes(needle), `${label} missing: ${needle}`);
}
function mustMatch(label, regex) {
  assert(regex.test(css), `${label} missing pattern ${regex}`);
}

mustInclude('compact stage marker', `Mobile Stage Compact Layout ${CURRENT_TOKEN}`);
mustMatch('stage body should be grid with fixed footer row', /#stage-dom-panel \.stage-body\.stage-select-body \{[\s\S]*display:\s*grid[\s\S]*grid-template-rows:\s*auto auto auto minmax\(0,\s*1fr\)[\s\S]*overflow:\s*hidden/);
mustMatch('stage card grid should scroll independently', /#stage-dom-panel \.stage-card-grid \{[\s\S]*overflow-y:\s*auto[\s\S]*min-height:\s*0[\s\S]*padding-bottom:\s*6px/);
mustMatch('stage foot should be compact grid not tall column', /#stage-dom-panel \.stage-foot \{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto[\s\S]*position:\s*static/);
mustMatch('stage foot actions should be one compact row', /#stage-dom-panel \.stage-foot \.stage-foot-actions \{[\s\S]*display:\s*grid[\s\S]*grid-auto-flow:\s*column[\s\S]*grid-template-columns:\s*none[\s\S]*grid-auto-columns:\s*minmax\(58px,\s*auto\)[\s\S]*overflow-x:\s*auto/);
mustMatch('stage card should be short horizontal scan row', /#stage-dom-panel \.stage-card \{[\s\S]*min-height:\s*74px[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*34px minmax\(0,\s*1fr\) auto/);
mustMatch('mobile should force one-column readable stage cards', /@media \(max-width:\s*620px\), \(pointer:\s*coarse\) \{[\s\S]*#stage-dom-panel \.stage-card-grid \{\s*grid-template-columns:\s*1fr;/);
mustInclude('footer readability override marker', `Mobile Stage Footer Readability + Scroll Fix ${CURRENT_TOKEN}`);
mustMatch('mobile stage list remains the touch scroll target', /#stage-dom-panel \.stage-body\.stage-select-body > \.stage-card-grid \{[\s\S]*min-height:\s*112px[\s\S]*overflow-y:\s*auto[\s\S]*touch-action:\s*pan-y/);
mustMatch('mobile footer buttons stay three readable columns', /#stage-dom-panel \.stage-foot \.stage-foot-actions \{[\s\S]*grid-auto-flow:\s*initial[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)[\s\S]*overflow:\s*visible/);
mustMatch('mobile footer button labels do not clip vertically', /#stage-dom-panel \.stage-foot \.stage-foot-actions > button,[\s\S]*#stage-dom-panel \.stage-foot \.stage-enter-btn \{[\s\S]*display:\s*flex[\s\S]*align-items:\s*center[\s\S]*height:\s*36px[\s\S]*line-height:\s*1[\s\S]*white-space:\s*nowrap/);
mustMatch('mobile chapter strip keeps horizontal touch scroll', /#stage-dom-panel \.stage-body\.stage-select-body > \.stage-chapter-strip \{[\s\S]*overflow-x:\s*auto[\s\S]*touch-action:\s*pan-x[\s\S]*\.stage-chapter-tab \{\s*touch-action:\s*pan-x/);
mustMatch('narrow mobile should not force enter button to span two columns', /@media \(max-width:\s*360px\) \{[\s\S]*#stage-dom-panel \.stage-foot \.stage-enter-btn \{\s*grid-column:\s*auto;/);
assert(html.includes(CURRENT_TOKEN), 'index cachebuster should use compact stage token');
assert(!html.includes(PREVIOUS_TOKEN), 'index should not keep previous bulk sell token after stage layout changes');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify should use compact stage token');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep previous bulk sell token');
console.log('stage compact layout static tests passed');
