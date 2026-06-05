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

const handlerBlock = blockBetween('function handleSkillsPanelDelegatedAction(e)', 'function runSkillsPanelAction(target, e)');
const runBlock = blockBetween('function runSkillsPanelAction(target, e)', 'function ensureSkillsDomPanel()');
const ensureSkillsBlock = blockBetween('function ensureSkillsDomPanel()', 'function ensureSkillDetailLayer()');
const ensureLayerBlock = blockBetween('function ensureSkillDetailLayer()', 'function skillTreeShortName');
const renderSkillsBlock = blockBetween('function renderSkillsDomPanel()', 'function ensureAlchemyDomPanel()');

assert(handlerBlock.includes('INVENTORY_TAP_MOVE_THRESHOLD'), 'skill panel delegated touch handling should keep scroll/tap movement threshold');
assert(handlerBlock.includes('skillPanelSuppressClickUntil'), 'skill panel should suppress synthetic clicks after touch actions');
assert(handlerBlock.includes('skillDetailCloseSwallowUntil') && handlerBlock.includes("target.closest?.('.pclose')"), 'skill detail close should swallow same-gesture panel close hits');
assert(handlerBlock.includes('isInteractiveSkillAction') && handlerBlock.includes("e.type !== 'click'") && handlerBlock.includes('skillsLastTouchActionAt = Date.now()'), 'recommended skill taps and other touch actions should mark touch time without blocking desktop click fallback');
assert(handlerBlock.includes('inventoryScrollableParentDom'), 'skill panel should treat scroll as non-tap on mobile');
assert(handlerBlock.includes("e.type === 'pointercancel' || e.type === 'touchcancel'"), 'skill panel should clear tap state on pointer/touch cancel');
assert(handlerBlock.includes('runSkillsPanelAction(tapTarget, e)'), 'skill panel touchend should route to shared action handler');
assert(handlerBlock.includes('runSkillsPanelAction(target, e)'), 'skill panel click fallback should route to shared action handler');

const requiredActions = [
  '.synergy-recommend-strip button',
  '.skill-node',
  '.skill-learn-btn:not([disabled])',
  '.skill-forget-btn:not([disabled])',
  '.mastery-claim-btn:not([disabled])',
  '.synergy-claim-btn:not([disabled]):not(.mastery-claim-btn)',
  '.attr-btn:not(.disabled)',
  '.skill-modal-close',
];
for (const action of requiredActions) {
  assert(runBlock.includes(action) || handlerBlock.includes(action), `skill delegated handler should route ${action}`);
}
assert(runBlock.includes('claimSkillMasteryReward(tree, count)'), 'skill delegated action should claim mastery milestone rewards');
assert(runBlock.includes('claimSkillSynergyReward(id)'), 'skill delegated action should claim synergy rewards');
assert(runBlock.includes('learnSkill(t, idx)'), 'skill delegated action should learn skills');
assert(runBlock.includes('unlearnSkill(t, idx)'), 'skill delegated action should forget skills');
assert(runBlock.includes('allocateAttr(attrBtn.dataset.attr)'), 'skill delegated action should allocate stat points');
assert(renderSkillsBlock.indexOf('${synergyPanelHtml}') < renderSkillsBlock.indexOf('skill-codex-panel'), 'mobile skills should render flow resonance before codex/footer so resonance is visible without hunting at the bottom');
assert(renderSkillsBlock.indexOf('${masteryPanelHtml}') < renderSkillsBlock.indexOf('skill-codex-panel'), 'mobile skills should render mastery rewards before codex/footer');

assert(ensureSkillsBlock.includes("p.addEventListener('pointerdown', handleSkillsPanelDelegatedAction") && ensureSkillsBlock.includes("p.addEventListener('pointerup', handleSkillsPanelDelegatedAction"), 'skills root should bind delegated pointer tap lifecycle once');
assert(ensureSkillsBlock.includes('skillDetailCloseSwallowUntil') && ensureSkillsBlock.includes('stopImmediatePropagation?.()'), 'skills root close handler should ignore freshly bubbled detail-close gestures');
assert(ensureSkillsBlock.includes('skillPanelSuppressClickUntil = Date.now() + 650') && ensureSkillsBlock.includes('.synergy-recommend-strip button'), 'recommended skill touchstart should suppress synthetic close/click leakage');
assert(ensureSkillsBlock.includes("p.addEventListener('click', handleSkillsPanelDelegatedAction"), 'skills root should bind delegated click fallback once');
assert(ensureLayerBlock.includes("layer.addEventListener('pointerdown', handleSkillsPanelDelegatedAction") && ensureLayerBlock.includes("layer.addEventListener('click', handleSkillsPanelDelegatedAction"), 'skill modal layer should share delegated action handling');
assert(ensureLayerBlock.includes('skillDetailCloseSwallowUntil') && !ensureLayerBlock.includes('Date.now() >= skillPanelSuppressClickUntil'), 'skill modal layer should use the detail-close swallow lock, not the broader click suppress timer');
assert(!renderSkillsBlock.includes('.addEventListener('), 'renderSkillsDomPanel should not add event listeners per render');
assert(!renderSkillsBlock.includes('bindInventoryTapDom('), 'renderSkillsDomPanel should not use per-render tap bindings');

console.log('skill panel delegated mobile action assertions passed');
