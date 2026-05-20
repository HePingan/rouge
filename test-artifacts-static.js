const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = {
  console,
  Math,
  window: {},
};
context.global = context;
vm.createContext(context);

function runFile(path, expose = '') {
  vm.runInContext(`${fs.readFileSync(path, 'utf8')}\n${expose}`, context, { filename: path });
}

runFile('js/entities.js', 'this.Player = Player;');
runFile('js/loot.js', 'this.generateArtifactMaterialDrop = generateArtifactMaterialDrop;');
runFile('js/artifacts.js');
runFile('js/skills.js', 'this.REALM_UNLOCKS = REALM_UNLOCKS;');
runFile('js/alchemy.js', 'this.MATERIALS = MATERIALS; this.generateMaterialDrop = generateMaterialDrop;');
runFile('js/combat.js', 'this.rollArtifactAttackEffects = rollArtifactAttackEffects; this.applyArtifactDeathSave = applyArtifactDeathSave; this.applyArtifactVictoryEffects = applyArtifactVictoryEffects;');
runFile('js/save.js', 'this.SAVE_VERSION = SAVE_VERSION; this.migrateSave = migrateSave; this.parseSaveRaw = parseSaveRaw; this.validateSave = validateSave;');

assert(context.ARTIFACTS, 'ARTIFACTS should exist');
assert.strictEqual(Object.keys(context.ARTIFACTS).length, 5, 'should define 5 first-wave artifacts');
assert(context.ARTIFACTS.zhuxian, 'zhuxian artifact should exist');
assert(context.ARTIFACTS.haotian, 'haotian artifact should exist');
assert(context.ARTIFACTS.lianyao, 'lianyao artifact should exist');
assert(context.ARTIFACTS.qiankun, 'qiankun artifact should exist');
assert(context.ARTIFACTS.leifa, 'leifa artifact should exist');

const defaultState = context.createDefaultArtifactsState();
assert.strictEqual(JSON.stringify(defaultState), JSON.stringify({ activeId: null, owned: {} }), 'default artifact state should be empty and compatible with old saves');

const player = new context.Player();
context.player = player;
assert.strictEqual(JSON.stringify(player.artifacts), JSON.stringify({ activeId: null, owned: {} }), 'Player should initialize artifact state');

assert.strictEqual(context.getArtifactLevelCap(0), 0, '炼气期 artifact cap should be 0');
assert.strictEqual(context.getArtifactLevelCap(2), 1, '金丹期 artifact cap should be 1');
assert.strictEqual(context.getArtifactLevelCap(9), 12, '真仙境 artifact cap should be 12');

assert(context.getArtifactUpgradeCost('zhuxian', 1).materials.artifact_shard_zhuxian > 0, 'upgrade should require dedicated shard');
assert.strictEqual(context.getArtifactUnlockRealm(), 2, 'artifact system should unlock at 金丹期 index 2');

assert.strictEqual(context.activateArtifact(player, 'zhuxian').ok, false, 'locked realm should not activate artifacts');
player.realmIndex = 2;
assert.strictEqual(context.activateArtifact(player, 'zhuxian').ok, true, '金丹期 should activate artifact');
assert.strictEqual(player.artifacts.activeId, 'zhuxian', 'activated artifact should become active');
assert.strictEqual(player.artifacts.owned.zhuxian.level, 1, 'activating should create level 1 artifact ownership');
player.recalcStats();
assert.strictEqual(player.atk, 28, 'active zhuxian should add atk bonus after recalc');
assert.strictEqual(context.deactivateArtifact(player).ok, true, 'deactivate should succeed');
player.recalcStats();
assert.strictEqual(player.atk, 20, 'deactivated artifact should remove atk bonus after recalc');

player.realmIndex = 3;
player.spiritStones = 1000;
context.playerMaterials = {
  artifact_shard_zhuxian: 10,
  artifact_essence: 3,
  artifact_core: 1,
};
assert.strictEqual(context.activateArtifact(player, 'zhuxian').ok, true, 'should reactivate zhuxian for upgrade test');
const upgradeResult = context.upgradeArtifact(player, context.playerMaterials, 'zhuxian');
assert.strictEqual(upgradeResult.ok, true, 'upgrade should succeed with enough materials and realm cap');
assert.strictEqual(player.artifacts.owned.zhuxian.level, 2, 'artifact should level up to 2');
assert.strictEqual(context.playerMaterials.artifact_shard_zhuxian, 5, 'upgrade should consume level 1 shard cost');
assert.strictEqual(player.spiritStones, 920, 'upgrade should consume level 1 spirit stone cost');
player.realmIndex = 2;
assert.strictEqual(context.upgradeArtifact(player, context.playerMaterials, 'zhuxian').ok, false, 'realm cap should block further upgrade');

const materialIds = context.MATERIALS.map(m => m.id);
assert(materialIds.includes('artifact_essence'), 'MATERIALS should include 神源');
assert(materialIds.includes('artifact_core'), 'MATERIALS should include 神器核心');
assert(materialIds.includes('artifact_shard_zhuxian'), 'MATERIALS should include 诛仙剑碎片');
assert.strictEqual(context.generateArtifactMaterialDrop({ realmIndex: 0 }, { isBoss: true }, () => 0), null, '炼气期 should not drop artifact materials');
const eliteShardDrop = context.generateArtifactMaterialDrop({ realmIndex: 1 }, { isElite: true }, () => 0);
assert(eliteShardDrop && eliteShardDrop.id.startsWith('artifact_shard_'), '筑基期 elite should be able to drop artifact shard');
let bossRolls = [0, 0.99];
const bossCoreDrop = context.generateArtifactMaterialDrop({ realmIndex: 3 }, { isBoss: true }, () => bossRolls.shift() ?? 0);
assert.strictEqual(bossCoreDrop.id, 'artifact_core', 'higher realm boss should be able to drop artifact core');

player.realmIndex = 3;
assert.strictEqual(context.activateArtifact(player, 'zhuxian').ok, true, 'should activate zhuxian for combat effect test');
player.artifacts.owned.zhuxian.level = 2;
let swordRolls = [0];
let swordEffects = context.rollArtifactAttackEffects(player, 100, () => swordRolls.shift() ?? 0);
assert.strictEqual(swordEffects.length, 1, 'zhuxian should trigger sword qi when roll succeeds');
assert.strictEqual(swordEffects[0].damage, 35, 'zhuxian sword qi should use configured damage ratio');
assert.strictEqual(swordEffects[0].label, '诛仙剑气', 'zhuxian effect should have Chinese label');

assert.strictEqual(context.activateArtifact(player, 'leifa').ok, true, 'should activate leifa for combat effect test');
let thunderRolls = [0];
let thunderEffects = context.rollArtifactAttackEffects(player, 100, () => thunderRolls.shift() ?? 0);
assert.strictEqual(thunderEffects[0].label, '雷罚天雷', 'leifa effect should trigger thunder label');
assert.strictEqual(thunderEffects[0].damage, 35, 'leifa thunder should use configured damage ratio');

assert.strictEqual(context.activateArtifact(player, 'haotian').ok, true, 'should activate haotian for death save test');
player.hp = 0;
player.maxHp = 200;
assert.strictEqual(context.applyArtifactDeathSave(player).ok, true, 'haotian should save from lethal damage once');
assert.strictEqual(player.hp, 60, 'death save should restore 30% max hp');
assert.strictEqual(context.applyArtifactDeathSave(player).ok, false, 'death save should only trigger once per combat');

assert.strictEqual(context.activateArtifact(player, 'lianyao').ok, true, 'should activate lianyao for victory recover test');
player.hp = 50;
player.mp = 20;
player.maxHp = 200;
player.maxMp = 100;
const recoverResult = context.applyArtifactVictoryEffects(player);
assert.strictEqual(recoverResult.ok, true, 'lianyao should recover on victory');
assert.strictEqual(player.hp, 66, 'lianyao should recover hp by configured pct');
assert.strictEqual(player.mp, 28, 'lianyao should recover mp by configured pct');

const legacySave = {
  version: 1,
  timestamp: 1,
  realmIndex: 3,
  xp: 123,
  spiritStones: 456,
  equipment: {},
  inventory: [],
  learnedSkills: [],
  materials: { artifact_shard_zhuxian: 7, herb: 2 },
  floor: 9,
};
const migratedLegacy = context.migrateSave(legacySave);
assert.strictEqual(JSON.stringify(migratedLegacy.artifacts), JSON.stringify({ activeId: null, owned: {} }), 'legacy save without artifacts should migrate to default artifact state');
assert.strictEqual(migratedLegacy.materials.artifact_shard_zhuxian, 7, 'artifact materials should survive save migration');
assert.strictEqual(context.validateSave(migratedLegacy), true, 'migrated legacy save should validate');
const parsedLegacy = context.parseSaveRaw(JSON.stringify(legacySave));
assert.strictEqual(JSON.stringify(parsedLegacy.artifacts), JSON.stringify({ activeId: null, owned: {} }), 'parseSaveRaw should migrate missing artifact field');
const malformedArtifactSave = { ...legacySave, artifacts: { activeId: 'missing', owned: { zhuxian: { level: 999, awakened: 1 }, bad: { level: 2 } } } };
const migratedMalformed = context.migrateSave(malformedArtifactSave);
assert.strictEqual(migratedMalformed.artifacts.activeId, null, 'migration should drop invalid active artifact id');
assert.strictEqual(migratedMalformed.artifacts.owned.zhuxian.level, context.ARTIFACTS.zhuxian.maxLevel, 'migration should clamp artifact level to max');
assert.strictEqual(migratedMalformed.artifacts.owned.zhuxian.awakened, true, 'migration should normalize awakened boolean');
assert.strictEqual(migratedMalformed.artifacts.owned.bad, undefined, 'migration should drop unknown artifact ownership');
assert.strictEqual(context.SAVE_VERSION >= 3, true, 'SAVE_VERSION should bump for artifact save schema');

const unlockText = JSON.stringify(context.REALM_UNLOCKS);
assert(!unlockText.includes('宠物'), 'realm unlock text should not mention pets');
assert(unlockText.includes('神器系统'), 'realm unlock text should mention artifact system');
assert(unlockText.includes('神器碎片'), 'realm unlock text should mention artifact shards');

console.log('artifact static tests passed');
