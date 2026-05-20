const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');

assert(html.includes('id="btn-artifact"'), 'index.html should expose an artifact button');
assert(html.includes('js/artifacts.js'), 'index.html should load artifact logic before main.js');
assert(main.includes("if (panel === 'artifact') showArtifactUI = true;"), 'openPanel should support artifact panel state');
assert(main.includes("bindTap(document.getElementById('btn-artifact'), onArtifact);"), 'artifact button should be bound to onArtifact');
assert(main.includes("if (showArtifactUI && typeof renderArtifactDomPanel === 'function') renderArtifactDomPanel();"), 'syncBodyPanelState should render artifact DOM panel');

const mustBust = [
  'css/style.css',
  'js/entities.js',
  'js/combat.js',
  'js/loot.js',
  'js/artifacts.js',
  'js/skills.js',
  'js/alchemy.js',
  'js/save.js',
  'js/main.js',
];
for (const file of mustBust) {
  const re = new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=20260520artifact2`);
  assert(re.test(html), `${file} should use the artifact2 cachebuster so mobile browsers do not keep stale pre-artifact code`);
}

console.log('artifact UI static tests passed');
