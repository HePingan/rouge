const assert = require('assert');
const fs = require('fs');

const main = fs.readFileSync('js/main.js','utf8');
const css = fs.readFileSync('css/style.css','utf8');
const html = fs.readFileSync('test-p79-panel-backstack-audit-browser-smoke.html','utf8');

assert(html.includes('index.html?v=20260607safearea7'), 'P79 smoke should use current cachebuster token');
assert(html.includes('skills-after-char-jump') && html.includes('character-after-skill-return'), 'P79 should audit character-skill backstack');
assert(html.includes('inventory-from-character') && html.includes('character-after-equip'), 'P79 should audit character-inventory equip backstack');
assert(html.includes('stage-run-after-source-enter') && html.includes('movementBlocked'), 'P79 should audit ascension source enter cleanup and movement unblock');
assert(html.includes('visible.length>1') && html.includes('overflowX') && html.includes('__p79Errors'), 'P79 should guard single visible panel, overflow, and console errors');

assert(/function\s+openCharacterBuildSkillTargetDom/.test(main), 'character build jump helper should exist');
assert(/popPanelFromStack\('character'\)[\s\S]{0,220}pushPanelToStack\('skills'\)/.test(main), 'character build jump should replace character with skills');
assert(/openInventoryForCharacterSlotDom/.test(main) && /popPanelFromStack\('character'\)[\s\S]{0,260}pushPanelToStack\('inventory'\)/.test(main), 'character slot CTA should replace character with inventory');
assert(/popPanelFromStack\('inventory'\)[\s\S]{0,180}pushPanelToStack\('character'\)/.test(main), 'equip confirm should return to character without keeping inventory');
assert(/stageDetailOpen\s*=\s*false/.test(main) && /panelStack\s*=\s*\[\]/.test(main), 'stage run enter/closeAllPanels paths should clear detail and stack');

assert(/\.char-next-action[\s\S]*button[\s\S]*min-height:\s*(?:3[0-9]|4[0-9])px/.test(css), 'character next action button should have mobile touch height');
assert(/\.char-build-jump\s*\{[^}]*min-height:\s*(?:2[8-9]|3[0-9])px/s.test(css), 'char build jump should keep compact touch target');
assert(/\.skill-learn-btn, \.skill-forget-btn\s*\{[^}]*min-height:\s*34px/s.test(css), 'skill learn button should have touch target');
assert(/\.skill-detail-modal\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto/s.test(css), 'skill detail modal should be height capped and scroll internally');
assert(/#inventory-dom-panel \.inv-detail-card/.test(css) && /#inventory-dom-panel \.inv-detail-card\s*\{[^}]*max-height:/s.test(css), 'inventory detail should be height capped');
console.log('p79 mobile ui/backstack static passed');
