const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const renderStart = main.indexOf('function renderCombatDomPanel()');
assert(renderStart >= 0, 'renderCombatDomPanel should exist');
const renderEnd = main.indexOf('const bindTap = (el, fn) =>', renderStart);
assert(renderEnd > renderStart, 'renderCombatDomPanel template section should be detectable');
const renderSection = main.slice(renderStart, renderEnd);

assert(!renderSection.includes('cbt-weapon'), 'combat panel should not render equipment/weapon icon under player life');
assert(!renderSection.includes('weaponHtml'), 'combat panel should not build weaponHtml');
assert(!renderSection.includes('player.equipment?.weapon'), 'combat panel should not read player weapon for combat HUD');
assert(!renderSection.includes('Number(player.atk'), 'combat panel should not show player attack stat chip');
assert(!renderSection.includes('Number(player.def'), 'combat panel should not show player defense stat chip');
assert(renderSection.includes('const enemyBuffAtk = typeof getEnemyAttackBuffMultiplier'), 'combat panel should compute buff-aware enemy attack multiplier');
assert(renderSection.includes('const enemyAtkText = Math.floor(Number(currentEnemy.atk || 0) * enemyBuffAtk)'), 'combat panel should compute buff-aware enemy attack text');
assert(renderSection.includes('const enemyDefText = Math.floor(currentEnemy.def * enemyBuffDef)'), 'combat panel should compute buff-aware enemy defense text');
assert(renderSection.includes('class="stat-tag atk"'), 'combat panel should render enemy attack as a compact stat tag');
assert(renderSection.includes('class="stat-tag def"'), 'combat panel should render enemy defense as a compact stat tag');
assert(renderSection.includes('攻 ${escapeHtml(enemyAtkText)}'), 'enemy attack tag should use Chinese short label');
assert(renderSection.includes('防 ${escapeHtml(enemyDefText)}'), 'enemy defense tag should use Chinese short label');
assert(renderSection.includes('cbt-player-card compact'), 'combat panel should use compact player life/mana card layout');
assert(renderSection.includes('生命') && renderSection.includes('灵力'), 'combat panel should keep player life/mana bars');
assert(renderSection.includes('skill-tag'), 'combat panel can keep enemy skill tag for readability');

assert(!css.includes('.cbt-weapon {'), 'combat CSS should not keep obsolete cbt-weapon block');
assert(!css.includes('.cbt-weapon-icon-box'), 'combat CSS should not keep obsolete weapon icon styles');
assert(css.includes('.cbt-player-card.compact'), 'combat CSS should include compact player card override');
assert(css.includes('grid-template-columns:minmax(0,1fr)'), 'compact player card should prioritize life/mana bars');
assert(css.includes('.cbt-enemy-tags .stat-tag'), 'enemy stat tags should have dedicated compact styling');
assert(css.includes('.cbt-enemy-tags .stat-tag.atk'), 'enemy attack tag should be styled distinctly');
assert(css.includes('.cbt-enemy-tags .stat-tag.def'), 'enemy defense tag should be styled distinctly');
assert(css.includes('.cbt-enemy-tags .skill-tag'), 'enemy skill tag should retain only skill/status style');

assert(css.includes('Combat Mobile Bottom Sheet 20260526nexthint1'), 'mobile combat layout marker should be bumped for combat HUD optimization');
assert(/#combat-dom-panel\s*\{[\s\S]*?max-height:\s*min\(44dvh, 360px\)/.test(css), 'combat bottom sheet should leave most of the map visible on mobile');
assert(/body\.combat-active #hud-bottom\s*\{[\s\S]*?top:\s*calc\(6px \+ var\(--safe-top\)\)/.test(css), 'combat mini stats should stay as a tiny top-right overlay');
assert(/\.cbt-log\s*\{[\s\S]*?max-height:\s*74px/.test(css), 'combat log should be capped so actions do not push the panel over the map');
assert(/body\.stage-run-active:not\(\.combat-active\):not\(\.panel-open\) #action-buttons,[\s\S]*bottom:\s*calc\(96px \+ var\(--safe-bottom\)\)/.test(css), 'stage/secret run quick buttons should sit above bottom nav without floating high over the map');
assert(/body\.stage-run-active:not\(\.combat-active\):not\(\.panel-open\) #action-buttons,[\s\S]*flex-direction:\s*row/.test(css), 'stage/secret run quick buttons should use a compact horizontal pair');

assert(html.includes('v=20260526nexthint1'), 'index cachebuster should update for combat HUD optimization');

const mustBust = [
  'css/style.css',
  'js/main.js',
];
for (const file of mustBust) {
  const re = new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=20260526nexthint1`);
  assert(re.test(html), `${file} should use combat HUD cachebuster`);
}

console.log('combat UI static tests passed');
