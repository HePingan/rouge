const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const renderStart = main.indexOf('function renderCombatDomPanel()');
assert(renderStart >= 0, 'renderCombatDomPanel should exist');
const renderEnd = main.indexOf('function drawCombatUI()', renderStart);
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
assert(renderSection.includes('cbt-threat-line'), 'combat panel should render compact enemy threat line');
assert(renderSection.includes('enemyAffinity?.weakText'), 'combat panel should render enemy weak affinity text');
assert(renderSection.includes('enemyAffinity?.resistText'), 'combat panel should render enemy resist affinity text');
assert(renderSection.includes('cbt-player-bars'), 'combat panel should use compact player life/mana bar layout');
assert(renderSection.includes('cbt-mini-bar hp') && renderSection.includes('cbt-mini-bar mp'), 'combat panel should keep player life/mana bars');
assert(renderSection.includes('enemySkills.length') && renderSection.includes('技'), 'combat panel can keep enemy skill count for readability');

assert(!css.includes('.cbt-weapon {'), 'combat CSS should not keep obsolete cbt-weapon block');
assert(!css.includes('.cbt-weapon-icon-box'), 'combat CSS should not keep obsolete weapon icon styles');
assert(css.includes('.cbt-player-bars'), 'combat CSS should include compact player bars styling');
assert(css.includes('grid-template-columns:minmax(0,1fr)'), 'compact player card should prioritize life/mana bars');
assert(css.includes('.cbt-threat-line'), 'enemy threat line should have compact styling');
assert(css.includes('.cbt-threat-line .weak'), 'enemy weak tag should be styled distinctly');
assert(css.includes('.cbt-threat-line .resist'), 'enemy resist tag should be styled distinctly');

assert(css.includes('Combat Mobile Bottom Sheet 20260601drawercap1'), 'mobile combat layout marker should be bumped for combat HUD optimization');
assert(/#combat-dom-panel\s*\{[\s\S]*?max-height:\s*min\(46dvh, 368px\)/.test(css), 'combat bottom sheet should leave most of the map visible while fitting readable combo hints on mobile');
assert(/#combat-dom-panel\.drawer-open\s*\{[\s\S]*?max-height:\s*min\(50dvh, 420px\)/.test(css), 'expanded combat skill drawer should get a bounded taller sheet so options stay inside the panel');
assert(/\.cbt-combo-guide\s*\{[\s\S]*?display:\s*grid[\s\S]*?border-radius:\s*9px/.test(css), 'combo recommendation should be a compact two-line readable card, not a truncating pill');
assert(/\.cbt-combo-guide span\s*\{[\s\S]*?white-space:\s*normal[\s\S]*?-webkit-line-clamp:\s*2/.test(css), 'combo recommendation text should wrap to two lines instead of ellipsis clipping');
assert(/\.cbt-resonance-strip span\s*\{[\s\S]*?white-space:\s*normal[\s\S]*?-webkit-line-clamp:\s*2/.test(css), 'combat resonance chips should wrap to two lines instead of clipping key hints');
assert(/body\.combat-active #hud-bottom\s*\{[\s\S]*?top:\s*calc\(6px \+ var\(--safe-top\)\)/.test(css), 'combat mini stats should stay as a tiny top-right overlay');
assert(/\.cbt-skill-drawer\s*\{[\s\S]*?max-height:\s*min\(20dvh, 132px\)[\s\S]*?touch-action:\s*pan-y/.test(css), 'mobile combat skill drawer should be capped and scrollable instead of overflowing below the sheet');
assert(/\.cbt-drawer-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/.test(css), 'mobile combat drawer should use one-column skill rows for readability');
assert(/\.cbt-drawer-skill span \{ display:none; \}/.test(css), 'drawer skill hints should hide in the tight mobile combat sheet instead of overflowing');
assert(/body\.stage-run-active:not\(\.combat-active\):not\(\.panel-open\) #action-buttons,[\s\S]*bottom:\s*calc\(96px \+ var\(--safe-bottom\)\)/.test(css), 'stage/secret run quick buttons should sit above bottom nav without floating high over the map');
assert(/body\.stage-run-active:not\(\.combat-active\):not\(\.panel-open\) #action-buttons,[\s\S]*flex-direction:\s*row/.test(css), 'stage/secret run quick buttons should use a compact horizontal pair');

assert(html.includes('v=20260606safearea4'), 'index cachebuster should update for combat HUD optimization');

const mustBust = [
  'css/style.css',
  'js/main.js',
];
for (const file of mustBust) {
  const re = new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=20260606safearea4`);
  assert(re.test(html), `${file} should use combat HUD cachebuster`);
}

console.log('combat UI static tests passed');
