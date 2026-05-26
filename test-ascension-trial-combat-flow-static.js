const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const messages = [];
const context = {
  console,
  Math,
  Date,
  setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; },
  clearTimeout() {},
  document: { body: { classList: { add() {}, remove() {}, toggle() {} } } },
  showMessage(msg) { messages.push(String(msg)); },
  autoSave() {},
  spawnDeathEffect() {},
  sfxDrop() {},
  sfxLevelUp() {},
  generateLootDrop() { return null; },
  generateMaterialDrop() { return null; },
  generateArtifactMaterialDrop() { return null; },
  generateArtifactTreasureEchoDrop() { return null; },
  MATERIALS: [{ id: 'fallback_dust', name: '兜底灵尘' }],
  TILE: { FLOOR: 0, STAIRS_DOWN: 2 },
  CELL_SIZE: 18,
  dungeon: null,
  dungeonLevel: 1,
  playerMaterials: {},
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

function runFile(path, expose = '') {
  const src = fs.readFileSync(path, 'utf8');
  vm.runInContext(`${src}\n${expose}`, context, { filename: path });
}

runFile('js/ascension.js', `
this.createDefaultAscensionState = createDefaultAscensionState;
this.startAscensionTrial = startAscensionTrial;
this.advanceAscensionTrialNode = advanceAscensionTrialNode;
this.completeAscensionTrialNode = completeAscensionTrialNode;
`);
runFile('js/alchemy.js', 'this.MATERIALS = MATERIALS;');
runFile('js/combat.js', `
this.startCombat = startCombat;
this.onVictory = onVictory;
`);

const player = {
  x: 2,
  y: 3,
  maxHp: 1200,
  hp: 1200,
  maxMp: 300,
  mp: 300,
  atk: 160,
  def: 80,
  xp: 0,
  spiritStones: 0,
  inventory: [],
  ascension: context.createDefaultAscensionState(),
  gainXp(value) { this.xp += Number(value || 0); },
  addSpiritStones(value) { this.spiritStones += Number(value || 0); },
  recalcStats() {},
};
context.player = player;

const start = context.startAscensionTrial(player, { ascension_trial_token: 1 });
assert.strictEqual(start.ok, true, 'trial should start before combat verification');
const node = context.advanceAscensionTrialNode(player);
assert.strictEqual(node.node.id, 'heart', 'first trial combat should be 问心劫');
assert.strictEqual(node.enemy.ascensionTrial, true, 'trial enemy should be marked as ascension trial combat');

context.startCombat(node.enemy);
context.onVictory();

assert(player.ascension.trial.cleared.includes('heart'), 'combat victory should clear defeated ascension trial node');
assert.strictEqual(player.ascension.trial.index, 1, 'combat victory should advance to the next trial node');
assert.strictEqual(player.ascension.trial.active, true, 'trial should remain active until all three nodes are defeated');
assert(messages.some(msg => msg.includes('问心劫') && msg.includes('1/3')), 'victory message should report trial node progress');

console.log('ascension trial combat flow static tests passed');
