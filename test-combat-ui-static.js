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
assert(!renderSection.includes('<span>攻 '), 'combat panel should not show player/enemy attack stat chips');
assert(!renderSection.includes('<span>防 '), 'combat panel should not show player/enemy defense stat chips');
assert(!renderSection.includes('currentEnemy.atk'), 'combat panel HUD should not show enemy attack value');
assert(!renderSection.includes('shownEnemyDef'), 'combat panel HUD should not show enemy defense value');
assert(renderSection.includes('cbt-player-card compact'), 'combat panel should use compact player life/mana card layout');
assert(renderSection.includes('生命') && renderSection.includes('灵力'), 'combat panel should keep player life/mana bars');
assert(renderSection.includes('skill-tag'), 'combat panel can keep enemy skill tag for readability');

assert(!css.includes('.cbt-weapon {'), 'combat CSS should not keep obsolete cbt-weapon block');
assert(!css.includes('.cbt-weapon-icon-box'), 'combat CSS should not keep obsolete weapon icon styles');
assert(css.includes('.cbt-player-card.compact'), 'combat CSS should include compact player card override');
assert(css.includes('grid-template-columns:minmax(0,1fr)'), 'compact player card should prioritize life/mana bars');
assert(css.includes('.cbt-enemy-tags .skill-tag'), 'enemy tags should retain only skill/status style');

assert(html.includes('v=20260520combatclean1'), 'index cachebuster should update for combat UI');

const mustBust = [
  'css/style.css',
  'js/main.js',
];
for (const file of mustBust) {
  const re = new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=20260520combatclean1`);
  assert(re.test(html), `${file} should use combatclean1 cachebuster`);
}

console.log('combat UI static tests passed');
