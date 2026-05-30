const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = {
  console,
  Math,
  Date,
  setTimeout: () => 0,
  clearTimeout: () => {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

function runFile(path, expose = '') {
  const src = fs.readFileSync(path, 'utf8');
  vm.runInContext(`${src}\n${expose}`, context, { filename: path });
}

runFile('js/entities.js', 'this.Player = Player; this.REALMS = REALMS;');
runFile('js/artifacts.js', `
this.ARTIFACTS = ARTIFACTS;
this.createDefaultArtifactsState = createDefaultArtifactsState;
this.normalizeArtifactsState = normalizeArtifactsState;
this.activateArtifact = activateArtifact;
this.awakenArtifact = awakenArtifact;
this.getArtifactAwakeningCost = getArtifactAwakeningCost;
this.getArtifactEffectValue = getArtifactEffectValue;
`);
runFile('js/ascension.js', `
this.createDefaultAscensionState = createDefaultAscensionState;
this.normalizeAscensionState = normalizeAscensionState;
this.performAscension = performAscension;
this.getAscensionTrialPlan = getAscensionTrialPlan;
this.startAscensionTrial = startAscensionTrial;
this.advanceAscensionTrialNode = advanceAscensionTrialNode;
this.ASCENSION_TRIALS = ASCENSION_TRIALS;
this.ASCENSION_CLASS_TREES = ASCENSION_CLASS_TREES;
this.upgradeAscensionClassSkill = upgradeAscensionClassSkill;
this.getAscensionClassSkillBonuses = getAscensionClassSkillBonuses;
this.LAW_BREAKTHROUGH_NODES = LAW_BREAKTHROUGH_NODES;
this.getLawMilestoneBonuses = getLawMilestoneBonuses;
this.getAscensionStatBonuses = getAscensionStatBonuses;
this.immortalRefineItem = immortalRefineItem;
this.getImmortalRefineCost = getImmortalRefineCost;
this.getImmortalBossMechanic = getImmortalBossMechanic;
this.applyImmortalBossMechanic = applyImmortalBossMechanic;
this.createDemonWarState = createDemonWarState;
this.startDemonWarRun = startDemonWarRun;
this.advanceDemonWarNode = advanceDemonWarNode;
this.completeDemonWarRun = completeDemonWarRun;
`);

const p = new context.Player();
p.realmIndex = 9;
p.stageProgress = { clearedStages: { immortal_gatekeeper: true }, unlockedStages: {} };
p.tribulationClears = { nine: 1 };
p.spiritStones = 200000;
p.artifacts = context.createDefaultArtifactsState();
p.recalcStats = p.recalcStats.bind(p);
const mats = {
  immortal_jade: 9,
  nine_thunder_seal: 3,
  artifact_core: 8,
  starDust: 20,
  immortal_marrow: 50,
  immortal_jade_ascended: 50,
  law_fragment_sword: 80,
  law_fragment_thunder: 80,
  law_fragment_forge: 80,
  ascension_trial_token: 3,
  immortal_refine_stone: 20,
  demon_war_banner: 2,
  artifact_essence: 20,
  artifact_shard_zhuxian: 30,
};

assert.strictEqual(context.ASCENSION_TRIALS.length, 3, '飞升仪式应包含问心劫/炼体劫/叩仙门三阶段');
assert.strictEqual(JSON.stringify(context.ASCENSION_TRIALS.map(t => t.id)), JSON.stringify(['heart', 'body', 'gate']));
const trialPlan = context.getAscensionTrialPlan(p);
assert.strictEqual(trialPlan.nodes.length, 3, 'trial plan should expose 3 combat nodes');
assert(trialPlan.nodes.every(n => n.enemy && n.enemy.ascensionTrial), 'each trial node should create a combat enemy');
assert.strictEqual(context.startAscensionTrial(p, mats).ok, true, 'should start ascension trial before final ascension');
assert.strictEqual(p.ascension.trial.active, true, 'trial state should be active');
assert.strictEqual(context.advanceAscensionTrialNode(p).node.id, 'heart', 'first trial node should be 问心劫');

p.ascension.trial.cleared = ['heart', 'body', 'gate'];
assert.strictEqual(context.performAscension(p, mats, { now: 123 }).ok, true, 'performAscension should require and consume completed trial');
assert.strictEqual(p.ascension.ascended, true);

assert(context.LAW_BREAKTHROUGH_NODES.sword[3], 'law 3 milestone should exist');
p.ascension.laws.sword = 10;
p.ascension.classId = 'sword';
const milestone = context.getLawMilestoneBonuses(p);
assert(milestone.atkPct > 0 && milestone.armorPen > 0 && milestone.bossDmg > 0, 'law 3/6/9/10 milestones should grant real stat bonuses');

assert(context.ASCENSION_CLASS_TREES.sword.nodes.length >= 4, 'sword class tree should have multiple nodes');
assert.strictEqual(context.upgradeAscensionClassSkill(p, 'sword_flow', mats).ok, true, 'should upgrade ascension class skill');
assert(context.getAscensionClassSkillBonuses(p).crit > 0, 'class skill should contribute stats');

p.artifacts.owned.zhuxian = { level: 12, awakened: false };
p.artifacts.activeId = 'zhuxian';
assert.strictEqual(context.awakenArtifact(p, mats, 'zhuxian').ok, true, 'should awaken level 12 artifact');
assert.strictEqual(p.artifacts.owned.zhuxian.awakened, true);
assert(context.getArtifactEffectValue('swordArrayChance', p) > 0, 'awakened artifact should unlock ultimate effect');

const item = { name: '真仙剑', slot: 'weapon', rarity: 'mythic', stats: { atk: 100 }, affixes: [], enhanceLevel: 12 };
assert.strictEqual(context.immortalRefineItem(item, p, mats).ok, true, 'mythic enhanced equipment should be immortal refined');
assert.strictEqual(item.immortalRefined, true);
assert(item.stats.immortalPower > 0 && item.affixes.some(a => a.id === 'immortal_refine'), 'immortal refine should add stat and affix');

const mech = context.getImmortalBossMechanic('thunder_judicator');
assert(mech && mech.triggers.some(t => t.type === 'turnInterval'), 'immortal boss mechanic should define runtime triggers');
const enemy = { id: 'thunder_judicator', name: '雷罚使', hp: 500, maxHp: 1000, atk: 100, def: 50, _bossMechanicState: { turn: 3 } };
const result = context.applyImmortalBossMechanic(enemy, p, 'turn');
assert(result && result.effects.length > 0, 'boss mechanism should produce effects on trigger');

p.ascension.demonWar = context.createDemonWarState();
assert.strictEqual(context.startDemonWarRun(p, mats).ok, true, 'should start demon war endgame run');
const node = context.advanceDemonWarNode(p);
assert(node.enemy && node.enemy.demonWar, 'demon war should generate staged enemies');
const earlyComplete = context.completeDemonWarRun(p, mats);
assert.strictEqual(earlyComplete.ok, false, 'demon war must not be completable before all nodes are cleared');
assert(String(earlyComplete.reason).includes('尚未打通'), 'early demon war completion should explain remaining nodes');
assert.strictEqual(p.ascension.demonWar.active, true, 'failed early completion should keep demon war active');
p.ascension.demonWar.progress = p.ascension.demonWar.nodes.length;
assert.strictEqual(context.completeDemonWarRun(p, mats).ok, true, 'should complete demon war and grant rewards after all nodes');
assert((mats.immortal_jade_ascended || 0) > 0, 'demon war should grant immortal jade rewards');

const asc = fs.readFileSync('js/ascension.js', 'utf8');
const artifactSrc = fs.readFileSync('js/artifacts.js', 'utf8');
for (const needle of ['问心劫', '炼体劫', '叩仙门', '仙炼', '仙魔战场', 'sword_flow']) {
  assert(asc.includes(needle), `ascension.js should contain ${needle}`);
}
assert(artifactSrc.includes('神器觉醒'), 'artifacts.js should contain 神器觉醒');
const index = fs.readFileSync('index.html', 'utf8');
assert(index.includes('20260530ascguard1'), 'cachebuster should bump for immortal endgame systems');

console.log('immortal endgame static ok');
