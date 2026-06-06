const assert = require('assert');
const fs = require('fs');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

assert(main.includes('function getCharacterEquipmentSlotHintDom'), 'character equipment slot hint helper should exist');
assert(main.includes('data-char-open-inventory-slot'), 'empty character equipment slot should expose inventory CTA');
assert(main.includes('let inventorySlotFilter'), 'inventory slot filter state should exist');
assert(main.includes("inventoryListHtmlCacheKeyDom = ''"), 'inventory list cache should be invalidatable');
assert(/return `\$\{inventorySortMode\}:\$\{inventorySlotFilter \|\| 'all'\}/.test(main), 'inventory list cache key should include slot filter');
assert(/\.filter\(entry => !inventorySlotFilter \|\| entry\.item\?\.slot === inventorySlotFilter\)/.test(main), 'inventory entries should be filtered by slot');
assert(main.includes('data-clear-slot-filter'), 'inventory filtered view should expose clear filter control');
assert(main.includes('data-confirm-equip-index'), 'inventory compare route should expose confirm equip action');
assert(main.includes("popPanelFromStack('inventory')") && main.includes("pushPanelToStack('character')"), 'confirmed equip should return from inventory to character panel');
assert(main.includes("showMessage('已装备！前往角色页一览全身修为'"), 'confirmed equip should give a clear route feedback message');
assert(/characterPanelLastHtml\s*=\s*''/.test(main), 'confirmed equip should invalidate character HTML cache');
assert(/characterEquipmentDetailSlot\s*=\s*null/.test(main), 'confirmed equip should close character equipment detail state');
assert(/characterEquipmentSlotHint\s*=\s*null/.test(main), 'confirmed equip should clear stale empty-slot hint after item is equipped');

assert(css.includes('#inventory-dom-panel .bag-list') && /#inventory-dom-panel \.equip-list, #inventory-dom-panel \.bag-list, #inventory-dom-panel \.material-list \{[^}]*overflow-y:\s*auto/s.test(css), 'mobile inventory lists should scroll internally');
assert(/#inventory-dom-panel \.item-action \{[^}]*min-height:\s*25px/s.test(css), 'inventory action buttons should keep explicit touch target budget');
assert(css.includes('#inventory-dom-panel .bag-slot-filter'), 'inventory filtered state should be styled');
assert(css.includes('#character-dom-panel .char-equip-grid'), 'character equipment grid should be styled for mobile');

console.log('inventory equipment loop static passed');
