const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(
  main.includes('const overviewGuide = renderAscensionResourceGuide(ASCENSION_REQUIREMENTS.materials);'),
  'ascension overview should build a material source guide from the real ASCENSION_REQUIREMENTS table'
);
assert(
  main.includes('${overviewGuide}'),
  'ascension overview should render the material source guide next to missing requirements'
);
assert(
  main.includes('title="${escapeHtml(status.ready || player.ascension.ascended ? \'\' : status.missing.join(\'、\'))}"'),
  'disabled ascension button should expose the full missing-condition reason in title text'
);
assert(
  main.includes('aria-disabled="true"'),
  'disabled ascension actions should expose aria-disabled for mobile/accessibility state checks'
);
assert(index.includes('20260530ascguard1'), 'cachebuster should be bumped for ascension overview guide changes');
assert(!index.includes('20260526' + 'stagetap1'), 'index should not keep previous stagetap cachebuster after production change');

console.log('ascension overview resource guide static assertions passed');
