const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

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

runFile('js/alchemy.js', 'this.MATERIALS = MATERIALS;');
runFile('js/stages.js', 'this.STAGES = STAGES; this.STAGE_CHAPTERS = STAGE_CHAPTERS;');
runFile('js/ascension.js', `
this.createDemonWarState = createDemonWarState;
this.normalizeAscensionState = normalizeAscensionState;
this.completeDemonWarRun = completeDemonWarRun;
this.getDemonWarActionState = getDemonWarActionState;
`);

const byId = Object.fromEntries(context.MATERIALS.map(m => [m.id, m]));
for (const id of ['ascension_trial_token', 'demon_war_banner']) {
  assert(byId[id], `${id} should exist in MATERIALS`);
  assert(String(byId[id].source || '').length > 0, `${id} should expose readable source text`);
}

const hasMat = (rewards, id) => (rewards?.materials || []).some(mat => mat.id === id && Number(mat.count || 0) > 0);
assert(hasMat(context.STAGES.immortal_gatekeeper.firstClearRewards, 'ascension_trial_token'), '仙门镇守者首通应保底产出飞升试炼令');
assert(hasMat(context.STAGES.immortal_gatekeeper.clearRewards, 'ascension_trial_token'), '仙门镇守者复刷应真实产出飞升试炼令');
assert(hasMat(context.STAGES.demon_lord_projection.firstClearRewards, 'demon_war_banner'), '魔尊投影首通应保底产出仙魔战旗');
assert(hasMat(context.STAGES.demon_lord_projection.clearRewards, 'demon_war_banner'), '魔尊投影复刷应真实产出仙魔战旗');

const activeRun = {
  ascension: context.normalizeAscensionState({
    ascended: true,
    demonWar: {
      active: true,
      progress: 4,
      bestClear: 0,
      clears: 0,
      nodes: ['天门防线', '魔潮裂谷', '仙魔古战场', '魔尊投影'],
    },
  }),
};
const materials = {};
const settled = context.completeDemonWarRun(activeRun, materials, { rng: () => 0 });
assert.strictEqual(settled.ok, true, 'complete demon war run should settle when all nodes are cleared');
assert(Number(materials.demon_war_banner || 0) >= 1, '每轮仙魔战场结算应返还/掉落仙魔战旗，避免入口闭环断掉');
assert(settled.rewards && Number(settled.rewards.demon_war_banner || 0) >= 1, '结算返回值应声明仙魔战旗奖励，便于 UI 展示');

const source = fs.readFileSync('js/ascension.js', 'utf8');
assert(source.includes('options.rng') && source.includes('Math.random'), '飞升/战旗奖励 helper 应保留可注入 RNG seam');
assert(source.includes('demon_war_banner'), '仙魔战场结算逻辑应显式写入仙魔战旗');

console.log('ascension reward loop static tests passed');
