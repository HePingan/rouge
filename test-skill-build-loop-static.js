const assert = require('assert');
const fs = require('fs');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

function extractFunction(name) {
  const start = main.indexOf(`function ${name}`);
  assert(start >= 0, `${name} should exist`);
  let depth = 0;
  const bodyStart = main.indexOf('{', start);
  for (let i = bodyStart; i < main.length; i++) {
    if (main[i] === '{') depth++;
    if (main[i] === '}') {
      depth--;
      if (depth === 0) return main.slice(start, i + 1);
    }
  }
  throw new Error(`could not extract ${name}`);
}

const jumpTarget = extractFunction('getCharacterBuildJumpTargetDom');
assert(jumpTarget.includes('getRecommendedSkillNodesForBuild(1)'), 'character build jump target should reuse recommendation helper');
assert(jumpTarget.includes('skillNodeState(tree, index)'), 'character build jump should fallback through real skill node state');

const openJump = extractFunction('openCharacterBuildSkillTargetDom');
assert(openJump.includes("popPanelFromStack('character')"), 'build jump should pop character panel');
assert(openJump.includes("pushPanelToStack('skills')"), 'build jump should push skills panel');
assert(openJump.includes('selectedSkillTreeNode = { tree: jump.tree'), 'build jump should select the target skill node');
assert(openJump.includes('skillDetailModalOpen = !!jump'), 'build jump should open skill detail modal');
assert(openJump.includes("characterPanelLastHtml = ''"), 'build jump should invalidate character cache');
assert(openJump.includes('characterEquipmentDetailSlot = null') && openJump.includes('characterEquipmentSlotHint = null'), 'build jump should clear character transient equipment states');

assert(main.includes('data-char-build-jump="1"'), 'character panel should render stable build jump CTA');
assert(main.includes('data-tree=') && main.includes('data-index='), 'build jump CTA should carry target tree/index');
const characterEvents = main.slice(main.indexOf("p.querySelectorAll('[data-char-build-jump]')"), main.indexOf('function getCharacterEquipmentSlotHintDom'));
assert(characterEvents.includes('bindInventoryTapDom'), 'character build jump should use scroll-safe tap binding');

const skillActions = extractFunction('runSkillsPanelAction');
assert(skillActions.includes('learnSkill(t, idx)'), 'skills delegated action should learn the selected skill');
assert(skillActions.includes('selectedSkillTreeNode = { tree: t, index: idx }'), 'learning should keep learned skill selected');
assert(skillActions.includes('skillDetailModalOpen = true'), 'learning should keep skill detail modal in learned state');
assert(!extractFunction('renderSkillsDomPanel').includes('.addEventListener('), 'renderSkillsDomPanel should not accumulate native listeners per render');

assert(css.includes('.char-build-jump') && /\.char-build-jump\s*\{[^}]*min-height:\s*28px/s.test(css), 'character build jump CTA should keep compact touch target');
assert(css.includes('.skill-detail-modal') && /\.skill-detail-modal\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto/s.test(css), 'skill detail modal should have max-height and internal scrolling budget');
assert(css.includes('.skill-learn-btn') && /\.skill-learn-btn,\s*\.skill-forget-btn\s*\{[^}]*min-height:\s*34px/s.test(css), 'skill action buttons should keep mobile touch target');

console.log('skill build loop static passed');
