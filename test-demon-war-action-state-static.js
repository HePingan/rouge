const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
assert(main.includes('getDemonWarActionState(player, playerMaterials)'), 'endgame panel should use shared demon-war action-state guard instead of enabling start by active flag only');
assert(!main.includes('const canStartDemonWar = !dw.active;'), 'endgame panel should not allow start without checking ascension and demon-war banner');
assert(main.includes('demonActionState.startReason'), 'disabled demon-war start button should surface the reason on mobile');

const context = {
  console,
  Date,
  Math,
  Object,
  Number,
  String,
  Array,
};
vm.createContext(context);

function runFile(path, expose = '') {
  vm.runInContext(`${fs.readFileSync(path, 'utf8')}\n${expose}`, context, { filename: path });
}

runFile('js/ascension.js', `
this.normalizeAscensionState = normalizeAscensionState;
this.createDemonWarState = createDemonWarState;
this.getDemonWarActionState = getDemonWarActionState;
this.advanceDemonWarNode = advanceDemonWarNode;
`);

function playerWithAscension(overrides = {}) {
  return {
    ascension: context.normalizeAscensionState({
      ascended: true,
      demonWar: context.createDemonWarState(),
      ...overrides,
    }),
  };
}

const notAscended = playerWithAscension({ ascended: false });
let state = context.getDemonWarActionState(notAscended, { demon_war_banner: 1 });
assert.strictEqual(state.canStart, false, 'non-ascended players should not be able to start demon war');
assert(/飞升/.test(state.startReason), 'start reason should explain ascension requirement');

const noBanner = playerWithAscension();
state = context.getDemonWarActionState(noBanner, { demon_war_banner: 0 });
assert.strictEqual(state.canStart, false, 'missing banner should disable start action before click');
assert(/仙魔战旗/.test(state.startReason), 'start reason should name the required demon war banner');
assert(state.startReason.includes('0/1'), 'missing banner reason should show owned/needed count for mobile players');

const ready = playerWithAscension();
state = context.getDemonWarActionState(ready, { demon_war_banner: 1 });
assert.strictEqual(state.canStart, true, 'ascended player with a banner should be able to start');
assert.strictEqual(state.canAdvance, false, 'inactive run should not expose next-node action');
assert.strictEqual(state.canSettle, false, 'inactive run should not expose settlement');

const readyForCombat = playerWithAscension({ demonWar: { active: true, progress: 0, bestClear: 0, clears: 0, nodes: ['天门防线', '魔潮裂谷', '仙魔古战场', '魔尊投影'] } });
const firstNode = context.advanceDemonWarNode(readyForCombat);
assert.strictEqual(firstNode.ok, true, 'advance helper should build the current demon-war combat node');
assert.strictEqual(readyForCombat.ascension.demonWar.progress, 0, 'building the combat enemy must not advance progress before victory');
assert.strictEqual(firstNode.index, 0, 'combat node should expose the current node index for UI/logging');
assert.strictEqual(firstNode.total, 4, 'combat node should expose total node count for mobile progress copy');
assert.strictEqual(firstNode.enemy.demonWarNodeIndex, 0, 'combat enemy should carry its demon-war node index into combat settlement');
assert.strictEqual(firstNode.enemy.demonWarTotal, 4, 'combat enemy should carry total node count into combat settlement');
assert.strictEqual(firstNode.enemy.demonWarNodeName, '天门防线', 'combat enemy should carry readable node name into combat settlement');

const active = playerWithAscension({ demonWar: { active: true, progress: 1, bestClear: 0, clears: 0, nodes: ['天门防线', '魔潮裂谷', '仙魔古战场', '魔尊投影'] } });
state = context.getDemonWarActionState(active, { demon_war_banner: 1 });
assert.strictEqual(state.canStart, false, 'active run should disable start action');
assert.strictEqual(state.canAdvance, true, 'incomplete active run should allow advancing the next combat node');
assert.strictEqual(state.canSettle, false, 'incomplete active run should not settle early');
assert.strictEqual(state.progress, 1, 'progress should reflect the normalized demon-war node index');
assert.strictEqual(state.total, 4, 'total should reflect configured demon-war node count');

const complete = playerWithAscension({ demonWar: { active: true, progress: 4, bestClear: 0, clears: 0, nodes: ['天门防线', '魔潮裂谷', '仙魔古战场', '魔尊投影'] } });
state = context.getDemonWarActionState(complete, { demon_war_banner: 1 });
assert.strictEqual(state.canAdvance, false, 'complete active run should disable next-node action');
assert.strictEqual(state.canSettle, true, 'complete active run should enable settlement');

console.log('demon war action state static tests passed');
