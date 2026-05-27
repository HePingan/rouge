const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const skills = fs.readFileSync('js/skills.js', 'utf8');
const loot = fs.readFileSync('js/loot.js', 'utf8');
const entities = fs.readFileSync('js/entities.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');

const CURRENT_TOKEN = '20260527invfix1';
const PREVIOUS_TOKEN = '20260525demonstate' + '1';

assert(/炼虚期[\s\S]*合体期[\s\S]*大乘期[\s\S]*渡劫期[\s\S]*真仙境/.test(entities), 'REALMS should extend to 真仙境 in order');
assert(skills.includes('const REALM_ENHANCE_CAPS = [5, 8, 10, 12, 15, 18, 21, 24, 27, 30]'), 'realm enhancement caps should reach +30');
assert(skills.includes('const REALM_SKILL_POINT_REWARDS = [0, 2, 2, 2, 2, 3, 3, 3, 4, 4]'), 'realm skill point rewards should be data-driven through all 10 realms');
assert(skills.includes('秘境钥匙开始掉落') && skills.includes('灵草秘境·炼器秘境开放') && skills.includes('神器秘境·天劫秘境开放'), 'unlock preview should include secret realm entrances');
assert(loot.includes('const INVENTORY_CAPACITY_BY_REALM = [36, 48, 60, 72, 90, 108, 126, 148, 172, 200]'), 'inventory capacity should scale by realm');
assert(!/MAX_INVENTORY|\/24|0\/24/.test(loot + main + combat), 'old fixed inventory capacity literals should not remain in game logic');
assert(main.includes('getInventoryCapacity(player)') && combat.includes('getInventoryCapacity(player)'), 'chest and combat drops should respect realm-derived capacity');
assert(loot.includes('showMessage(`⚠️ 乾坤袋已满（${capacity}格）'), 'unequip should block when realm-derived bag capacity is full');
assert(loot.includes('const MAX_EQUIPMENT_ENHANCE_LEVEL = 30'), 'equipment max enhance level should be +30');
assert(loot.includes('nextLevel >= 21 ? 20 : 10'), 'enhancement failure floors should protect +21~+30 down to +20');
assert(!html.includes('20260521realmcap1'), 'cachebuster should be bumped from the old token');
assert(!html.includes('20260521realmcap1'), 'cachebuster should be bumped from the realm-cap token');
assert(!html.includes('20260521bagequip1'), 'cachebuster should be bumped from the bag-equip token');
assert(!html.includes('20260521monsterbuff1'), 'cachebuster should be bumped from the monster-buff token');
assert(!html.includes(PREVIOUS_TOKEN), 'cachebuster should be bumped from the demonstate token');
assert(html.includes(CURRENT_TOKEN), 'index.html should use secret-realm cachebuster');

const context = {
  console,
  Math,
  player: { realmIndex: 0 },
  showMessage() {},
  autoSave() {},
};
vm.createContext(context);
vm.runInContext(`${entities}\nthis.REALMS = REALMS;`, context);
vm.runInContext(`${skills}\nthis.getRealmEnhanceCap = getRealmEnhanceCap; this.getRealmSkillPointReward = getRealmSkillPointReward; this.REALM_UNLOCKS = REALM_UNLOCKS;`, context);
vm.runInContext(`${loot}\nthis.getInventoryCapacity = getInventoryCapacity; this.getNextInventoryCapacityUnlock = getNextInventoryCapacityUnlock;`, context);

assert.strictEqual(context.REALMS.length, 10, 'there should be exactly 10 realm entries');
assert.strictEqual(context.getRealmEnhanceCap(9), 30, '真仙境 enhance cap should be +30');
assert.strictEqual(context.getRealmSkillPointReward(9), 4, '真仙境 skill point reward should be +4');
assert.strictEqual(context.getInventoryCapacity({ realmIndex: 0 }), 36, '炼气背包容量 should be 36');
assert.strictEqual(context.getInventoryCapacity({ realmIndex: 9 }), 200, '真仙背包容量 should be 200');
const nextCapacity = context.getNextInventoryCapacityUnlock({ realmIndex: 8 });
assert.strictEqual(nextCapacity.realmIndex, 9, 'next capacity unlock realm index should be 真仙境');
assert.strictEqual(nextCapacity.realmName, '真仙境', 'next capacity unlock should name 真仙境');
assert.strictEqual(nextCapacity.capacity, 200, 'next capacity unlock should be 200');
assert.strictEqual(nextCapacity.increase, 28, 'next capacity unlock increase should be 28');

console.log('realm cap static tests passed');
