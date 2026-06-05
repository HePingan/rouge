const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');

function blockBetween(startNeedle, endNeedle) {
  const start = main.indexOf(startNeedle);
  assert(start >= 0, `missing ${startNeedle}`);
  const end = main.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing end ${endNeedle}`);
  return main.slice(start, end);
}

const ensureBlock = blockBetween('function ensureCombatDomPanel()', 'function renderCombatDomPanel()');
const renderBlock = blockBetween('function renderCombatDomPanel()', 'function drawCombatUI()');

assert(ensureBlock.includes('const onCombatAction = e =>'), 'combat panel should use creation-level delegated handler');
assert(main.includes('let combatDelegatedTouchUntil = 0;'), 'combat panel should keep its own synthetic-click guard timestamp');
assert(ensureBlock.includes("e.target.closest('#cbt-attack, #cbt-defend, #cbt-flee, #cbt-skill-toggle, #cbt-skill-toggle-action, .cbt-skill-btn, .cbt-drawer-skill')"), 'combat delegated handler should route all combat controls');
assert(ensureBlock.includes("if (e.type === 'touchstart' || e.type === 'pointerdown') combatDelegatedTouchUntil = Date.now() + 650"), 'combat pointer/touch actions should arm panel-local synthetic-click suppression');
assert(ensureBlock.includes("const scrollCard = target.closest('.cbt-drawer-skill')"), 'combat drawer skills should use scroll-safe tap tracking inside the drawer');
assert(ensureBlock.includes("scrollCard._combatTapStart"), 'combat drawer tap state should survive until click fallback to distinguish scroll from tap');
assert(ensureBlock.includes('Math.abs((drawer ? drawer.scrollTop : 0) - start.scrollTop) > 2'), 'combat drawer actions should ignore clicks produced after vertical scrolling');
assert(ensureBlock.includes('combatDelegatedTouchUntil = Date.now() + 250'), 'combat drawer scroll suppression should guard the synthetic click window after movement');
assert(ensureBlock.includes("if (e.type === 'click' && Date.now() < combatDelegatedTouchUntil)"), 'combat click fallback should ignore the synthetic click after a touch/pointer action');
assert(ensureBlock.indexOf("if (e.type === 'click' && Date.now() < combatDelegatedTouchUntil)") < ensureBlock.indexOf("if (target.classList.contains('disabled')) return"), 'combat synthetic-click suppression should run before disabled-state early return');
assert(!ensureBlock.includes('skillsLastTouchActionAt'), 'combat panel should not share the skills panel synthetic-click timestamp');
assert(ensureBlock.includes("p.addEventListener('pointerdown', onCombatAction, { passive: false })"), 'combat actions should fire immediately on PointerEvent mobile browsers');
assert(ensureBlock.includes("p.addEventListener('touchstart', onCombatAction, { passive: false })"), 'combat actions should fire immediately on older touch browsers');
assert(ensureBlock.includes("p.addEventListener('click', onCombatAction)"), 'combat actions should keep click fallback');
assert(ensureBlock.includes("target.id === 'cbt-attack'"), 'combat delegated handler should route attack');
assert(ensureBlock.includes("target.id === 'cbt-defend'"), 'combat delegated handler should route defend');
assert(ensureBlock.includes("target.id === 'cbt-flee'"), 'combat delegated handler should route flee');
assert(ensureBlock.includes('combatSkillDrawerOpen = !combatSkillDrawerOpen'), 'combat delegated handler should toggle skill drawer');
assert(ensureBlock.includes('const idx = parseInt(target.dataset.skill, 10) || 0') && ensureBlock.includes('playerUseSkill(idx)'), 'combat delegated handler should cast selected skill');
assert(!/\.addEventListener\(/.test(renderBlock), 'renderCombatDomPanel should not bind per-render listeners');
assert(!renderBlock.includes('const bindTap ='), 'renderCombatDomPanel should not create per-render bindTap closure');
assert(renderBlock.includes('data-skill="${i}"'), 'combat render should still expose skill data indexes');
assert(renderBlock.includes('id="cbt-attack"'), 'combat render should still expose attack button');
assert(renderBlock.includes('id="cbt-skill-toggle-action"'), 'combat render should still expose bottom skill toggle');
assert(renderBlock.includes('role="button" tabindex="0" aria-disabled="${isPlayerTurn ? \'false\' : \'true\'}" id="cbt-attack"'), 'attack action should expose disabled state to assistive/mobile automation');
assert(renderBlock.includes('role="button" tabindex="0" aria-disabled="${isPlayerTurn ? \'false\' : \'true\'}" id="cbt-defend"'), 'defend action should expose disabled state to assistive/mobile automation');
assert(renderBlock.includes('role="button" tabindex="0" aria-disabled="${isPlayerTurn ? \'false\' : \'true\'}" id="cbt-skill-toggle-action"'), 'skill action should expose disabled state to assistive/mobile automation');
assert(renderBlock.includes('aria-disabled="${reason ? \'true\' : \'false\'}" data-skill="${i}"'), 'combat quick skill buttons should expose MP/turn disabled state');
assert(renderBlock.includes('class="cbt-drawer-skill${reason ? \' disabled\' : \'\'}'), 'combat drawer skills should render disabled class when MP/turn gated');

console.log('combat delegated action static assertions passed');
