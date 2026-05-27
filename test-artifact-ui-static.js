const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

assert(html.includes('id="btn-artifact"'), 'index.html should expose an artifact button');
assert(html.includes('js/artifacts.js'), 'index.html should load artifact logic before main.js');
assert(html.includes('id="hud-artifact"'), 'top-left HUD should be the artifact HUD, not equipment');
assert(html.includes('artifact-icon-wrap') && html.includes('artifact-icon') && html.includes('artifact-name'), 'artifact HUD should expose icon, badge, and name nodes');
assert(!html.includes('id="hud-weapon"'), 'top-left equipment HUD should be removed from the main screen');
assert(main.includes("if (panel === 'artifact') showArtifactUI = true;"), 'openPanel should support artifact panel state');
assert(main.includes("bindTap(document.getElementById('btn-artifact'), onArtifact);"), 'artifact button should be bound to onArtifact');
assert(main.includes("bindTap(document.getElementById('hud-artifact'), onArtifact);"), 'top-left artifact HUD should open the artifact panel');
assert(main.includes("if (showArtifactUI && typeof renderArtifactDomPanel === 'function') renderArtifactDomPanel();"), 'syncBodyPanelState should render artifact DOM panel');
assert(main.includes("p.addEventListener('touchstart', e => { if (e.target.closest('.pclose'))"), 'artifact panel close button should handle mobile touch');
assert(main.includes("data-artifact-id"), 'artifact cards should expose activation action');
assert(main.includes("data-artifact-upgrade"), 'artifact cards should expose upgrade action');
assert(main.includes("data-artifact-off"), 'active artifact card should expose unequip action');

assert(css.includes('body.artifact-open #artifact-dom-panel'), 'CSS should display artifact panel when body has artifact-open');
assert(/body\.artifact-open[\s\S]*?#artifact-dom-panel[\s\S]*?touch-action:\s*pan-y/.test(css), 'artifact open state should restore vertical pan for mobile scrolling');
assert(/body\.artifact-open[\s\S]*?#artifact-dom-panel \.panel-body[\s\S]*?overflow-y:\s*auto/.test(css), 'artifact panel body should be the mobile scroll container');
assert(/#artifact-dom-panel \.artifact-action[\s\S]*?min-height:\s*38px/.test(css), 'artifact action buttons should have thumb-sized touch targets');

const mustBust = [
  'css/style.css',
  'js/entities.js',
  'js/combat.js',
  'js/loot.js',
  'js/artifacts.js',
  'js/skills.js',
  'js/alchemy.js',
  'js/save.js',
  'js/ui.js',
  'js/main.js',
];
for (const file of mustBust) {
  const re = new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=20260527invfix1`);
  assert(re.test(html), `${file} should use the current cachebuster so mobile browsers do not keep stale artifact HUD/UI code`);
}

console.log('artifact UI static tests passed');
