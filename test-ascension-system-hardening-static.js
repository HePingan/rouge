const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const asc = fs.readFileSync('js/ascension.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');
const save = fs.readFileSync('js/save.js', 'utf8');
const stages = fs.readFileSync('js/stages.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';

assert(index.includes(`js/ascension.js?v=${CURRENT_TOKEN}`), 'index loads ascension.js with current cachebuster');
assert(asc.includes('function normalizeAscensionState'), 'ascension state normalizer exists');
assert(asc.includes('function getAscensionTrialActionState'), 'trial action guard exists');
assert(asc.includes('function startAscensionTrial'), 'trial start helper exists');
assert(asc.includes('function performAscension'), 'final ascension helper exists');
assert(asc.includes('function getDemonWarActionState'), 'demon war action guard exists');

assert(asc.includes('function getImmortalBodyActionState'), 'immortal body action guard exists');
assert(asc.includes('function getLawUpgradeActionState'), 'law upgrade action guard exists');
assert(asc.includes('function getAscensionClassSkillActionState'), 'class skill action guard exists');
assert(main.includes('getImmortalBodyActionState(player, playerMaterials)'), 'body UI consumes shared body action guard');
assert(main.includes('getLawUpgradeActionState(player, law.id, playerMaterials)'), 'law UI consumes shared law action guard');
assert(main.includes('getAscensionClassSkillActionState(player, n.id, playerMaterials)'), 'skill UI consumes shared skill action guard');
assert(main.includes("p.addEventListener('pointerdown', onDelegatedAscensionClose, { passive: false, capture: true })"), 'ascension close uses capture pointer fallback');
assert(combat.includes('isAscensionTrialCombat'), 'combat bridges ascension trial');
assert(combat.includes('isDemonWarCombat'), 'combat bridges demon war');
assert(save.includes('normalizeAscensionState(data.ascension)'), 'save load normalizes ascension');
assert(stages.includes("unlockNext: 'reception_platform'"), 'immortal gate links to post-ascension stage');

const context = { console, Date, Math };
vm.createContext(context);
function runFile(file, expose = '') {
  vm.runInContext(`${fs.readFileSync(file, 'utf8')}\n${expose}`, context, { filename: file });
}
runFile('js/alchemy.js', 'this.MATERIALS = MATERIALS;');
runFile('js/stages.js', 'this.STAGE_CHAPTERS = STAGE_CHAPTERS; this.STAGES = STAGES; this.getStageMaterialName = getStageMaterialName; this.getStageMaterialSources = getStageMaterialSources;');
runFile('js/ascension.js', `
this.ASCENSION_REQUIREMENTS = ASCENSION_REQUIREMENTS;
this.ASCENSION_TRIALS = ASCENSION_TRIALS;
this.ASCENSION_CLASSES = ASCENSION_CLASSES;
this.ASCENSION_CLASS_TREES = ASCENSION_CLASS_TREES;
this.LAW_DEFINITIONS = LAW_DEFINITIONS;
this.DEMON_WAR_NODES = DEMON_WAR_NODES;
this.createDefaultAscensionState = createDefaultAscensionState;
this.normalizeAscensionState = normalizeAscensionState;
this.hasCompletedAscensionTrial = hasCompletedAscensionTrial;
this.getAscensionStatus = getAscensionStatus;
this.getAscensionTrialActionState = getAscensionTrialActionState;
this.startAscensionTrial = startAscensionTrial;
this.completeAscensionTrialNode = completeAscensionTrialNode;
this.performAscension = performAscension;
this.getImmortalBodyActionState = getImmortalBodyActionState;
this.getLawUpgradeActionState = getLawUpgradeActionState;
this.getAscensionClassSkillActionState = getAscensionClassSkillActionState;
this.upgradeImmortalBody = upgradeImmortalBody;
this.upgradeLaw = upgradeLaw;
this.upgradeAscensionClassSkill = upgradeAscensionClassSkill;
this.getDemonWarActionState = getDemonWarActionState;
this.startDemonWarRun = startDemonWarRun;
this.completeDemonWarRun = completeDemonWarRun;
`);

const defaultState = context.createDefaultAscensionState();
assert.strictEqual(defaultState.ascended, false, 'default ascension state is not ascended');
assert.strictEqual(defaultState.trial.active, false, 'default trial inactive');
assert.strictEqual(defaultState.demonWar.active, false, 'default demon war inactive');
for (const id of ['sword', 'thunder', 'pill', 'forge', 'void', 'nether']) {
  assert(Object.prototype.hasOwnProperty.call(defaultState.laws, id), `default laws include ${id}`);
}

const malformed = context.normalizeAscensionState({
  ascended: 'yes',
  classId: 'bad',
  immortalBody: { level: 999, xp: -5 },
  laws: { sword: 99, thunder: -3 },
  classSkills: { sword_flow: 99 },
  trial: { active: true, index: -2, cleared: ['heart', 'bad'] },
  demonWar: { active: true, progress: '2', nodes: [] },
});
assert.strictEqual(malformed.classId, null, 'invalid class id is normalized');
assert(malformed.immortalBody.level >= 0 && malformed.immortalBody.level <= 4, 'body level is clamped');
assert.strictEqual(malformed.immortalBody.xp, 0, 'negative body xp normalized');
assert.strictEqual(malformed.laws.sword, 10, 'law level upper clamp');
assert.strictEqual(malformed.laws.thunder, 0, 'law level lower clamp');
assert.deepStrictEqual(JSON.parse(JSON.stringify(malformed.trial.cleared)), ['heart'], 'invalid trial clears filtered');
assert.strictEqual(malformed.demonWar.progress, 2, 'demon war numeric string progress normalized');
assert(malformed.demonWar.nodes.length >= 4, 'active demon war gets node list');

const noTokenPlayer = { ascension: context.createDefaultAscensionState(), maxHp: 1000, atk: 100, def: 50 };
const noTokenMaterials = { ascension_trial_token: 0 };
const noTokenResult = context.startAscensionTrial(noTokenPlayer, noTokenMaterials);
assert.strictEqual(noTokenResult.ok, false, 'cannot start trial without token');
assert.strictEqual(noTokenMaterials.ascension_trial_token, 0, 'failed trial start does not mutate token');
assert(noTokenResult.reason.includes('需要飞升试炼令（0/1）'), 'missing token reason includes owned/needed count');

const tokenPlayer = { ascension: context.createDefaultAscensionState(), maxHp: 1000, atk: 100, def: 50 };
const tokenMaterials = { ascension_trial_token: 1 };
const tokenResult = context.startAscensionTrial(tokenPlayer, tokenMaterials);
assert.strictEqual(tokenResult.ok, true, 'trial starts with token');
assert.strictEqual(tokenMaterials.ascension_trial_token, 0, 'trial start consumes one token');
assert.strictEqual(tokenPlayer.ascension.trial.active, true, 'trial becomes active');
assert.strictEqual(tokenPlayer.ascension.trial.index, 0, 'trial starts at first node');
assert.strictEqual(tokenPlayer.ascension.trial.cleared.length, 0, 'trial cleared list reset');

const notTrialDonePlayer = {
  realmIndex: 9,
  stageProgress: { clearedStages: { immortal_gatekeeper: true } },
  tribulationClears: { nine: true },
  ascension: context.createDefaultAscensionState(),
};
const richMaterials = { immortal_jade: 3, nine_thunder_seal: 1, artifact_core: 1, starDust: 3 };
const blockedAscension = context.performAscension(notTrialDonePlayer, richMaterials, { now: 1 });
assert.strictEqual(blockedAscension.ok, false, 'cannot perform ascension before finishing trial');
assert(blockedAscension.reason.includes('需完成飞升三劫'), 'blocked ascension reports missing trial');

const alreadyAscended = {
  realmIndex: 10,
  stageProgress: { clearedStages: {} },
  tribulationClears: {},
  ascension: { ...context.createDefaultAscensionState(), ascended: true, trial: { active: false, index: 0, cleared: [] } },
};
const alreadyMaterials = { immortal_jade: 0, nine_thunder_seal: 0, artifact_core: 0, starDust: 0, immortal_marrow: 5, immortal_jade_ascended: 5 };
const beforeAlreadyMaterials = JSON.stringify(alreadyMaterials);
const alreadyResult = context.performAscension(alreadyAscended, alreadyMaterials, { now: 2 });
assert.strictEqual(alreadyResult.ok, false, 'already ascended cannot perform ascension again even if old requirements are now missing');
assert.strictEqual(alreadyResult.reason, '已飞升仙界', 'already ascended reports idempotent reason before requirement checks');
assert.strictEqual(JSON.stringify(alreadyMaterials), beforeAlreadyMaterials, 'already ascended path does not mutate materials');


const preAscBodyPlayer = { ascension: context.createDefaultAscensionState() };
const preAscBodyState = context.getImmortalBodyActionState(preAscBodyPlayer, { immortal_marrow: 99 });
assert.strictEqual(preAscBodyState.canUpgrade, false, 'body guard blocks before ascension');
assert.strictEqual(preAscBodyState.reason, '飞升后可淬炼仙躯', 'body guard reports pre-ascension reason');
const ascBodyPlayer = { ascension: { ...context.createDefaultAscensionState(), ascended: true }, recalcStats() {} };
const bodyNoMat = context.getImmortalBodyActionState(ascBodyPlayer, { immortal_marrow: 0 });
assert.strictEqual(bodyNoMat.canUpgrade, false, 'body guard blocks missing marrow');
assert(bodyNoMat.reason.includes('仙髓（0/2）'), 'body missing reason includes owned/needed count');
const bodyMat = { immortal_marrow: 2 };
const beforeBodyMat = JSON.stringify(bodyMat);
const blockedBodyRuntime = context.upgradeImmortalBody(preAscBodyPlayer, { immortal_marrow: 99 });
assert.strictEqual(blockedBodyRuntime.ok, false, 'body runtime uses same pre-ascension guard');
assert.strictEqual(context.upgradeImmortalBody(ascBodyPlayer, bodyMat).ok, true, 'body runtime upgrades when guard ready');
assert.notStrictEqual(JSON.stringify(bodyMat), beforeBodyMat, 'body runtime consumes marrow when ready');

const noClassPlayer = { ascension: { ...context.createDefaultAscensionState(), ascended: true } };
const noClassSkillState = context.getAscensionClassSkillActionState(noClassPlayer, 'sword_flow', { immortal_jade_ascended: 99 });
assert.strictEqual(noClassSkillState.canLearn, false, 'skill guard blocks without class');
assert.strictEqual(noClassSkillState.reason, '请先选择仙职', 'skill guard reports missing class');
const swordPlayer = { ascension: { ...context.createDefaultAscensionState(), ascended: true, classId: 'sword' }, recalcStats() {} };
const skillNoMat = context.getAscensionClassSkillActionState(swordPlayer, 'sword_flow', { immortal_jade_ascended: 0 });
assert.strictEqual(skillNoMat.canLearn, false, 'skill guard blocks missing immortal jade');
assert(skillNoMat.reason.includes('仙玉（0/4）'), 'skill missing reason includes owned/needed count');
const skillMats = { immortal_jade_ascended: 4 };
assert.strictEqual(context.upgradeAscensionClassSkill(swordPlayer, 'sword_flow', skillMats).ok, true, 'skill runtime learns when guard ready');
assert.strictEqual(skillMats.immortal_jade_ascended, 0, 'skill runtime consumes ascended jade');

const lawPlayer = { ascension: { ...context.createDefaultAscensionState(), ascended: true }, recalcStats() {} };
const lawNoMat = context.getLawUpgradeActionState(lawPlayer, 'sword', { law_fragment_sword: 0 });
assert.strictEqual(lawNoMat.canUpgrade, false, 'law guard blocks missing fragment');
assert(lawNoMat.reason.includes('剑之法则碎片（0/2）'), 'law missing reason uses readable material and count');
const lawMats = { law_fragment_sword: 2 };
assert.strictEqual(context.upgradeLaw(lawPlayer, 'sword', lawMats).ok, true, 'law runtime upgrades when guard ready');
assert.strictEqual(lawMats.law_fragment_sword, 0, 'law runtime consumes law fragments');

const incompleteDemonPlayer = {
  ascension: { ...context.createDefaultAscensionState(), ascended: true, demonWar: { active: true, progress: 2, bestClear: 0, clears: 0, nodes: ['a', 'b', 'c', 'd'] } },
};
const demonMaterials = { immortal_jade_ascended: 0, law_fragment_void: 0, law_fragment_nether: 0 };
const beforeDemonMaterials = JSON.stringify(demonMaterials);
const earlySettle = context.completeDemonWarRun(incompleteDemonPlayer, demonMaterials);
assert.strictEqual(earlySettle.ok, false, 'cannot settle incomplete demon war');
assert.strictEqual(JSON.stringify(demonMaterials), beforeDemonMaterials, 'failed demon war settle does not grant rewards');

assert(!asc.includes("missing.push('境界需达到真仙境')"), 'ascension requirement should not hard-code misleading true-immortal wording');
assert(asc.includes('function getAscensionRequirementRealmName'), 'ascension requirement realm name helper exists');
assert(combat.includes('completeAscensionTrialNode(player'), 'combat victory completes ascension trial node');
assert(combat.includes('trialId'), 'combat completion uses trial id');

console.log('ascension system hardening static tests passed');
