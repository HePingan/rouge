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

runFile('js/ascension.js', `
this.normalizeAscensionState = normalizeAscensionState;
this.createDemonWarState = createDemonWarState;
this.getDemonWarActionState = getDemonWarActionState;
this.startDemonWarRun = startDemonWarRun;
this.DEMON_WAR_NODES = DEMON_WAR_NODES;
`);

function ascendedPlayer(overrides = {}) {
  return {
    ascension: context.normalizeAscensionState({
      ascended: true,
      demonWar: context.createDemonWarState(),
      ...overrides,
    }),
  };
}

const normalizedNoNodes = ascendedPlayer({ demonWar: { active: true, progress: 0, bestClear: 0, clears: 0, nodes: [] } });
let state = context.getDemonWarActionState(normalizedNoNodes, { demon_war_banner: 1 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(state.nodes)), JSON.parse(JSON.stringify(context.DEMON_WAR_NODES)), 'empty stored demon-war nodes should fall back to default runtime nodes');
assert.strictEqual(normalizedNoNodes.ascension.demonWar.nodes.length, context.DEMON_WAR_NODES.length, 'normalization should persist fallback nodes so save/load and mobile UI stay consistent');

const materialsWithTextCount = { demon_war_banner: '2' };
const starter = ascendedPlayer();
const start = context.startDemonWarRun(starter, materialsWithTextCount);
assert.strictEqual(start.ok, true, 'numeric string demon-war banner count should be accepted by the start guard');
assert.strictEqual(materialsWithTextCount.demon_war_banner, 1, 'starting demon war should sanitize and decrement numeric-string banners to a number');
assert.deepStrictEqual(JSON.parse(JSON.stringify(starter.ascension.demonWar.nodes)), JSON.parse(JSON.stringify(context.DEMON_WAR_NODES)), 'starting demon war should store a full node plan for persistence and UI progress');

console.log('demon war start guard normalization tests passed');
