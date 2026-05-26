const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const CURRENT_TOKEN = '20260526nexthint1';
const PREVIOUS_TOKEN = '20260525art' + 'awake1';

const context = {
  console,
  Math,
  Date,
  playerMaterials: {},
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

function runFile(path, expose = '') {
  vm.runInContext(`${fs.readFileSync(path, 'utf8')}\n${expose}`, context, { filename: path });
}

runFile('js/artifacts.js', `
this.activateArtifact = activateArtifact;
this.getArtifactAwakenActionState = getArtifactAwakenActionState;
`);
runFile('js/ascension.js', `
this.getImmortalRefineActionState = getImmortalRefineActionState;
`);

const unascendedPlayer = { spiritStones: 100000, ascension: { ascended: false }, equipment: { weapon: { rarity: 'mythic', enhanceLevel: 12, stats: {}, affixes: [] } } };
const unascendedRefine = context.getImmortalRefineActionState(unascendedPlayer, { immortal_refine_stone: 3, immortal_jade_ascended: 2 });
assert.strictEqual(unascendedRefine.canRefine, false, '仙炼动作应先要求飞升');
assert(String(unascendedRefine.reason).includes('飞升后'), '仙炼禁用原因应适合移动端提示');
assert(unascendedRefine.cost && unascendedRefine.cost.materials.immortal_refine_stone === 3, '仙炼动作状态应附带真实消耗');

const missingWeapon = { spiritStones: 100000, ascension: { ascended: true }, equipment: {} };
assert.strictEqual(context.getImmortalRefineActionState(missingWeapon, {}).canRefine, false, '未装备武器时不能仙炼');
assert(String(context.getImmortalRefineActionState(missingWeapon, {}).reason).includes('未装备武器'), '仙炼应说明未装备武器');

const eligiblePlayer = { spiritStones: 100000, ascension: { ascended: true }, equipment: { weapon: { rarity: 'mythic', enhanceLevel: 12, stats: {}, affixes: [] } } };
assert.strictEqual(context.getImmortalRefineActionState(eligiblePlayer, { immortal_refine_stone: 3, immortal_jade_ascended: 2 }).canRefine, true, '满足飞升、装备、材料与灵石后应允许仙炼');

const awakenedPlayer = {
  realmIndex: 9,
  spiritStones: 100000,
  artifacts: { activeId: 'zhuxian', owned: { zhuxian: { level: 12, awakened: true } } },
};
const awakenedState = context.getArtifactAwakenActionState(awakenedPlayer, { artifact_core: 2, artifact_essence: 8, artifact_shard_zhuxian: 24, immortal_jade_ascended: 3 });
assert.strictEqual(awakenedState.canAwaken, false, '已觉醒神器不能重复觉醒');
assert(String(awakenedState.reason).includes('已觉醒'), '神器觉醒状态应说明已觉醒');

const readyArtifactPlayer = {
  realmIndex: 9,
  spiritStones: 100000,
  artifacts: { activeId: 'zhuxian', owned: { zhuxian: { level: 12, awakened: false } } },
};
const readyAwaken = context.getArtifactAwakenActionState(readyArtifactPlayer, { artifact_core: 2, artifact_essence: 8, artifact_shard_zhuxian: 24, immortal_jade_ascended: 3 });
assert.strictEqual(readyAwaken.canAwaken, true, '满级神器且材料齐全应允许觉醒');
assert(readyAwaken.cost && readyAwaken.cost.materials.artifact_core === 2, '神器觉醒动作状态应附带真实消耗');

const lowLevelAwaken = context.getArtifactAwakenActionState({
  realmIndex: 9,
  spiritStones: 100000,
  artifacts: { activeId: 'zhuxian', owned: { zhuxian: { level: 8, awakened: false } } },
}, { artifact_core: 2, artifact_essence: 8, artifact_shard_zhuxian: 24, immortal_jade_ascended: 3 });
assert.strictEqual(lowLevelAwaken.canAwaken, false, '未满级神器不能觉醒');
assert(String(lowLevelAwaken.reason).includes('满级后可觉醒'), '神器未满级时应提供明确移动端提示');

const main = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
assert(main.includes('getImmortalRefineActionState(player, playerMaterials)'), '终局面板应通过共享状态计算仙炼按钮');
assert(main.includes('getArtifactAwakenActionState(player, playerMaterials)'), '终局面板应通过共享状态计算觉醒按钮');
assert(main.includes("if (!refineAction.canRefine) return;"), '仙炼点击处理应尊重禁用状态');
assert(main.includes("if (!awakenAction.canAwaken) return;"), '觉醒点击处理应尊重禁用状态');
const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale action guard cache token');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current action guard cachebuster');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep stale action guard cache token');
assert(css.includes(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`), 'mobile CSS marker should bump with action guard cachebuster');

console.log('ascension endgame action-state behavior tests passed');
