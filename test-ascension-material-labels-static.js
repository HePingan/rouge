const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = { console, Math, Date };
context.window = context;
context.globalThis = context;
vm.createContext(context);

function runFile(path, expose = '') {
  vm.runInContext(`${fs.readFileSync(path, 'utf8')}\n${expose}`, context, { filename: path });
}

runFile('js/artifacts.js', `
this.ARTIFACT_MATERIALS = ARTIFACT_MATERIALS;
`);
runFile('js/alchemy.js', `
this.MATERIALS = MATERIALS;
`);
runFile('js/ascension.js', `
this.getImmortalRefineActionState = getImmortalRefineActionState;
this.getImmortalRefineCost = getImmortalRefineCost;
`);

const byId = Object.fromEntries(context.MATERIALS.map(m => [m.id, m]));
for (const id of ['immortal_jade', 'immortal_refine_stone', 'immortal_jade_ascended', 'demon_war_banner', 'artifact_essence']) {
  assert(byId[id], `${id} should be listed in MATERIALS for inventory/source UI`);
  assert(byId[id].name && byId[id].name !== id, `${id} should have a readable Chinese name`);
  assert(byId[id].source && !String(byId[id].source).includes('undefined'), `${id} should show an acquisition source for mobile players`);
}

const player = {
  ascension: { ascended: true },
  spiritStones: 999999,
  equipment: { weapon: { name: '真仙剑', rarity: 'mythic', enhanceLevel: 12 } },
};
const missing = context.getImmortalRefineActionState(player, { immortal_refine_stone: 0, immortal_jade_ascended: 9 });
assert.strictEqual(missing.canRefine, false, 'missing refine material should block action');
assert(missing.reason.includes('仙炼石'), 'refine guard should use readable material name instead of raw id');
assert(missing.reason.includes('0/3'), 'refine guard should keep owned/needed counts');

console.log('ascension material labels static tests passed');
