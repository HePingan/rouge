const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

mustInclude(main, "['trial','三劫']", 'ascension tab should expose trial flow');
mustInclude(main, "['skills','技能']", 'ascension tab should expose class skill tree');
mustInclude(main, "['endgame','终局']", 'ascension tab should expose demon war');
mustInclude(main, 'data-asc-trial-start', 'UI should start ascension trial');
mustInclude(main, 'data-asc-trial-complete', 'UI should advance ascension trial nodes');
mustInclude(main, 'data-asc-skill=', 'UI should upgrade ascension class skills');
mustInclude(main, 'data-asc-demon-start', 'UI should start demon war');
mustInclude(main, 'data-asc-demon-complete', 'UI should complete demon war');
mustInclude(main, 'data-asc-refine', 'UI should expose immortal equipment refine');
mustInclude(main, 'data-asc-awaken', 'UI should expose artifact awakening');
mustInclude(main, 'getImmortalRefineActionState(player, playerMaterials)', 'endgame UI should compute immortal refine availability before taps');
mustInclude(main, 'getArtifactAwakenActionState(player, playerMaterials)', 'endgame UI should compute artifact awakening availability before taps');
mustInclude(main, 'data-asc-refine title="${escapeHtml(refineAction.reason || \'\')}"${refineState.attr}', 'refine button should be disabled with a mobile-readable reason when requirements are missing');
mustInclude(main, 'data-asc-awaken title="${escapeHtml(awakenAction.reason || \'\')}"${awakenState.attr}', 'awaken button should be disabled with a mobile-readable reason when requirements are missing');
mustInclude(main, "if (!refineAction.canRefine) return;", 'refine click handler should honor disabled guard before calling runtime mutation');
mustInclude(main, "if (!awakenAction.canAwaken) return;", 'awaken click handler should honor disabled guard before calling runtime mutation');

mustInclude(css, '.asc-progress', 'ascension progress styles');
mustInclude(css, '.asc-skill-tree', 'ascension skill tree styles');
mustInclude(css, '.asc-action-row', 'ascension action row styles');

assert(index.includes('20260526nexthint1'), 'cachebuster should bump to endgame2 for UI integration');
assert(!index.includes('20260524endgame1'), 'index should not keep stale endgame1 cachebuster');
console.log('ascension endgame UI static assertions passed');
