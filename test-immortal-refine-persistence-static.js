const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = {
  console,
  Math,
  Date,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
};
context.window = context;
context.globalThis = context;
context.player = { equipment: {}, inventory: [] };
context.playerMaterials = {};
vm.createContext(context);

function runFile(path, expose = '') {
  const src = fs.readFileSync(path, 'utf8');
  vm.runInContext(`${src}\n${expose}`, context, { filename: path });
}

runFile('js/loot.js', `
this.rebuildEquipmentStats = rebuildEquipmentStats;
`);
runFile('js/artifacts.js', `
this.normalizeArtifactsState = normalizeArtifactsState;
`);
runFile('js/ascension.js', `
this.immortalRefineItem = immortalRefineItem;
`);
runFile('js/save.js', `
this.serializeItem = serializeItem;
this.deserializeItem = deserializeItem;
`);

const player = { spiritStones: 100000, ascension: { ascended: true }, recalcStats() { this.recalced = true; } };
const materials = { immortal_refine_stone: 10, immortal_jade_ascended: 10 };
const item = {
  name: '持久仙炼剑',
  icon: '🗡️',
  slot: 'weapon',
  baseStat: 'atk',
  baseValue: 100,
  baseStats: { atk: 100 },
  stats: { atk: 100 },
  affixes: [],
  enhanceLevel: 12,
  rarity: 'mythic',
  rarityColor: '#ff3366',
};

const refined = context.immortalRefineItem(item, player, materials);
assert.strictEqual(refined.ok, true, 'eligible item should refine successfully');
const refinedPower = item.stats.immortalPower;
assert(refinedPower > 0, 'refine should add immortal power before rebuild');

context.rebuildEquipmentStats(item);
assert.strictEqual(item.immortalRefined, true, 'rebuild should not clear immortal refined flag');
assert.strictEqual(item.stats.immortalPower, refinedPower, 'rebuild should preserve immortal refine power bonus');
assert(item.stats.bossDmg >= 4, 'rebuild should preserve immortal refine boss damage bonus');

const saved = context.serializeItem(item);
assert.strictEqual(saved.immortalRefined, true, 'serializeItem should persist immortal refined flag');
assert(saved.stats.immortalPower >= refinedPower, 'serialized stats should include immortal refine power');
assert(saved.affixes.some(a => a.id === 'immortal_refine'), 'serialized affixes should keep immortal refine label');

const loaded = context.deserializeItem(saved);
assert.strictEqual(loaded.immortalRefined, true, 'deserializeItem should restore immortal refined flag');
assert(loaded.stats.immortalPower >= refinedPower, 'deserialized item should still grant immortal refine power after rebuild');
assert(loaded.affixes.some(a => a.id === 'immortal_refine'), 'deserialized affixes should keep immortal refine label');

console.log('immortal refine persistence static tests passed');
