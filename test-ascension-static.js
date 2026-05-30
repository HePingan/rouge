const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = {
  console,
  Math,
  Date,
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
  },
};
vm.createContext(context);

function runFile(path, expose = '') {
  const source = fs.readFileSync(path, 'utf8');
  vm.runInContext(`${source}\n${expose}`, context, { filename: path });
}

runFile('js/stages.js', `
this.STAGE_CHAPTERS = STAGE_CHAPTERS;
this.STAGES = STAGES;
this.STAGE_THEMES = STAGE_THEMES;
this.PLAYER_TITLES = PLAYER_TITLES;
this.createDefaultStageProgress = createDefaultStageProgress;
this.normalizeStageProgress = normalizeStageProgress;
this.isStageUnlocked = isStageUnlocked;
this.getStageMaterialName = getStageMaterialName;
`);
runFile('js/entities.js', 'this.REALMS = REALMS; this.Player = Player;');
runFile('js/ascension.js', `
this.ASCENSION_REALM_START_INDEX = ASCENSION_REALM_START_INDEX;
this.IMMORTAL_REALMS = IMMORTAL_REALMS;
this.ASCENSION_REQUIREMENTS = ASCENSION_REQUIREMENTS;
this.ASCENSION_CLASSES = ASCENSION_CLASSES;
this.LAW_DEFINITIONS = LAW_DEFINITIONS;
this.createDefaultAscensionState = createDefaultAscensionState;
this.normalizeAscensionState = normalizeAscensionState;
this.getAscensionStatus = getAscensionStatus;
this.performAscension = performAscension;
this.upgradeImmortalBody = upgradeImmortalBody;
this.chooseAscensionClass = chooseAscensionClass;
this.upgradeLaw = upgradeLaw;
this.getAscensionStatBonuses = getAscensionStatBonuses;
`);
runFile('js/save.js', `
this.SAVE_VERSION = SAVE_VERSION;
this.migrateSave = migrateSave;
this.validateSave = validateSave;
this.parseSaveRaw = parseSaveRaw;
`);

assert(context.REALMS.some(r => r.name === '散仙'), 'REALMS should include ascended realm 散仙');
assert(context.REALMS.some(r => r.name === '大罗金仙'), 'REALMS should include late immortal realm 大罗金仙');
assert(context.ASCENSION_REALM_START_INDEX > 9, 'ascension realms should start after true immortal');
assert(context.STAGE_CHAPTERS.reception_immortal_domain, '仙界第一章 接引仙域 missing');
assert(context.STAGE_CHAPTERS.mystic_thunder_domain, '仙界雷域 chapter missing');
assert(context.STAGES.reception_platform?.unlockNext === 'cloudsea_road', '接引仙台 should unlock 云海古道');
assert(context.STAGES.immortal_gatekeeper.unlockNext === 'reception_platform', '仙门镇守者 should unlock first immortal stage after ascension');
assert(context.STAGE_THEMES.reception_immortal_domain?.name.includes('接引'), '仙界主题 missing');
assert(context.getStageMaterialName('immortal_marrow') === '仙髓', '仙髓 material name should be known to stage UI');
assert(context.getStageMaterialName('law_fragment_thunder') === '雷之法则碎片', '法则碎片 material name should be known to stage UI');

const progress = context.createDefaultStageProgress();
progress.clearedStages = { immortal_gatekeeper: true };
progress.unlockedStages = { qingyun_foot: true, immortal_gatekeeper: true };
const player = new context.Player();
player.realmIndex = context.REALMS.findIndex(r => r.name === '真仙境');
player.stageProgress = progress;
player.tribulationClears = { nine: true, major: true };
player.ascension.trial.cleared = ['heart', 'body', 'gate'];
const materials = { immortal_jade: 3, nine_thunder_seal: 1, artifact_core: 1, starDust: 3 };

const ready = context.getAscensionStatus(player, materials);
assert.strictEqual(ready.ready, true, `expected ascension ready, got ${JSON.stringify(ready)}`);
const result = context.performAscension(player, materials, { now: 12345 });
assert.strictEqual(result.ok, true, 'performAscension should succeed when requirements met');
assert.strictEqual(player.ascension.ascended, true, 'player should be marked ascended');
assert.strictEqual(context.REALMS[player.realmIndex].name, '散仙', 'ascension should move realm to 散仙');
assert.strictEqual(player.stageProgress.unlockedStages.reception_platform, true, 'ascension should unlock 接引仙台');
assert.strictEqual(materials.immortal_marrow >= 2, true, 'ascension grants starting immortal marrow');

const body = context.upgradeImmortalBody(player, materials);
assert.strictEqual(body.ok, true, 'immortal body upgrade should consume immortal marrow');
assert.strictEqual(player.ascension.immortalBody.level, 1, 'immortal body level should increment');
assert(context.getAscensionStatBonuses(player).maxHpPct > 0, 'immortal body should grant stat bonuses');

assert.strictEqual(context.chooseAscensionClass(player, 'sword').ok, true, 'should choose Sword Immortal class');
assert.strictEqual(player.ascension.classId, 'sword', 'class id should persist on player');
materials.law_fragment_sword = 10;
assert.strictEqual(context.upgradeLaw(player, 'sword', materials).ok, true, 'should upgrade sword law with fragments');
assert.strictEqual(player.ascension.laws.sword, 1, 'law level should increment');

const migrated = context.migrateSave({ version: 4, realmIndex: 9, equipment: {}, inventory: [], learnedSkills: [], materials: { immortal_jade: 3 } });
assert.strictEqual(migrated.version >= 5, true, 'SAVE_VERSION should bump for ascension schema');
assert.strictEqual(migrated.ascension.ascended, false, 'legacy save should migrate ascension defaults');
assert.strictEqual(context.validateSave(migrated), true, 'migrated ascension save should validate');
const parsed = context.parseSaveRaw(JSON.stringify({ version: 4, realmIndex: 9, equipment: {}, inventory: [], learnedSkills: [] }));
assert.strictEqual(parsed.ascension.immortalBody.level, 0, 'parseSaveRaw should normalize ascension state');

const index = fs.readFileSync('index.html', 'utf8');
assert(index.includes('js/ascension.js?v=20260530ascguard1'), 'index should load ascension.js with current cachebuster');
assert(index.includes('btn-ascension'), 'mobile more menu should expose 飞升/仙界 entry');
assert(index.includes('20260530ascguard1'), 'cachebuster should use ascension version');
const main = fs.readFileSync('js/main.js', 'utf8');
assert(main.includes('showAscensionUI'), 'main should track ascension panel state');
assert(main.includes('renderAscensionDomPanel'), 'main should render ascension DOM panel');
assert(main.includes("openPanel('ascension')") || main.includes("panel === 'ascension'"), 'openPanel should support ascension panel');

console.log('ascension static integration ok');
