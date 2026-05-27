const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const CURRENT_TOKEN = '20260527invfix1';
const PREVIOUS_TOKEN = '20260525action' + 'guard1';

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

runFile('js/ascension.js', `
this.createDefaultAscensionState = createDefaultAscensionState;
this.normalizeAscensionState = normalizeAscensionState;
this.getAscensionTrialActionState = getAscensionTrialActionState;
this.startAscensionTrial = startAscensionTrial;
`);

function makePlayer(ascensionPatch = {}) {
  return {
    ascension: context.normalizeAscensionState({
      ...context.createDefaultAscensionState(),
      ...ascensionPatch,
    }),
  };
}

const noTokenPlayer = makePlayer();
let action = context.getAscensionTrialActionState(noTokenPlayer, { ascension_trial_token: 0 });
assert.strictEqual(action.canStart, false, '飞升三劫没有试炼令时应在点击前禁用开启');
assert(String(action.startReason).includes('飞升试炼令'), '缺少试炼令的禁用原因应适合移动端提示');
const denied = context.startAscensionTrial(noTokenPlayer, { ascension_trial_token: 0 });
assert.strictEqual(denied.ok, false, 'startAscensionTrial 不应允许无试炼令免费开启');
assert.strictEqual(noTokenPlayer.ascension.trial.active, false, '无试炼令失败后不应改写试炼状态');

const readyPlayer = makePlayer();
const readyMaterials = { ascension_trial_token: 1 };
action = context.getAscensionTrialActionState(readyPlayer, readyMaterials);
assert.strictEqual(action.canStart, true, '有试炼令且未完成时应允许开启飞升三劫');
assert.strictEqual(action.tokenCount, 1, '动作状态应暴露试炼令数量给移动端 UI');
const started = context.startAscensionTrial(readyPlayer, readyMaterials);
assert.strictEqual(started.ok, true, '有试炼令时应能开启飞升三劫');
assert.strictEqual(readyMaterials.ascension_trial_token, 0, '开启飞升三劫应消耗 1 枚试炼令');
assert.strictEqual(readyPlayer.ascension.trial.active, true, '开启后试炼状态应变为进行中');

action = context.getAscensionTrialActionState(readyPlayer, readyMaterials);
assert.strictEqual(action.canStart, false, '试炼进行中不能重复开启');
assert.strictEqual(action.canChallenge, true, '试炼进行中应允许挑战当前劫');
assert(String(action.startReason).includes('进行中'), '重复开启的禁用原因应说明三劫进行中');

const completedPlayer = makePlayer({ trial: { active: false, index: 3, cleared: ['heart', 'body', 'gate'] } });
action = context.getAscensionTrialActionState(completedPlayer, { ascension_trial_token: 2 });
assert.strictEqual(action.canStart, false, '三劫完成后即使有试炼令也不能重复开启');
assert.strictEqual(action.canChallenge, false, '三劫完成后不应继续挑战');
assert(String(action.startReason).includes('已完成'), '三劫完成后的禁用原因应明确');

runFile('js/alchemy.js', 'this.MATERIALS = MATERIALS;');
runFile('js/stages.js', 'this.STAGES = STAGES;');
const tokenMat = context.MATERIALS.find(mat => mat.id === 'ascension_trial_token');
assert(tokenMat, '飞升试炼令应登记到材料表，背包材料页才能显示');
assert(String(tokenMat.source || '').includes('仙门镇守者'), '飞升试炼令材料应说明真实来源');
const gatekeeper = context.STAGES.immortal_gatekeeper;
const rewardHasToken = rewards => (rewards?.materials || []).some(mat => mat.id === 'ascension_trial_token' && Number(mat.count || 0) > 0);
assert(rewardHasToken(gatekeeper.firstClearRewards) || rewardHasToken(gatekeeper.clearRewards), '仙门镇守者应产出飞升试炼令，形成飞升三劫闭环');

const main = fs.readFileSync('js/main.js', 'utf8');
assert(main.includes('getAscensionTrialActionState(player, playerMaterials)'), '飞升三劫面板应使用共享动作状态禁用无令开启');
assert(main.includes('trialActionState.startReason'), '移动端飞升三劫开启按钮应暴露禁用原因');
assert(main.includes('trialActionState.tokenCount'), '飞升三劫面板应显示试炼令数量');

const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), match => match[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep previous actionguard cache token');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current cachebuster');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep previous actionguard cache token');
assert(css.includes(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`), 'mobile CSS marker should bump with trial-token cachebuster');

console.log('ascension trial token guard static tests passed');
