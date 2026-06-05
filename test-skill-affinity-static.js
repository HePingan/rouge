const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const entitiesSrc = fs.readFileSync('js/entities.js', 'utf8');
const skillsSrc = fs.readFileSync('js/skills.js', 'utf8');
const combatSrc = fs.readFileSync('js/combat.js', 'utf8');
const mainSrc = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

function loadAffinityContext() {
  const logs = [];
  const context = {
    console,
    Math: Object.create(Math),
    TILE: { FLOOR: 0, STAIRS_DOWN: 2 },
    ROOM_TYPE: { ELITE: 'elite' },
    REALMS: [{ name: '炼气', hpMult: 1, mpMult: 1, atkBonus: 0, defBonus: 0, xpNeeded: 100 }],
    COMBAT_STATE: { PLAYER_TURN: 'player', ENEMY_TURN: 'enemy', VICTORY: 'victory' },
    combatState: 'player',
    player: {
      realmIndex: 0,
      realm: { name: '炼气', xpNeeded: 100 },
      baseHp: 100, baseMp: 50, baseAtk: 10, baseDef: 3,
      maxHp: 100, maxMp: 50, hp: 100, mp: 999, atk: 30, def: 3,
      recalcStats() {},
    },
    currentEnemy: { name: '石魔', hp: 100, maxHp: 100, def: 3, x: 0, y: 0, weaknesses: ['water', 'wood'], resists: ['earth', 'sword'], _statusEffects: [] },
    combatLog(msg) { logs.push(msg); },
    autoSave() {}, showMessage() {}, spawnSkillEffect() {}, sfxCrit() {}, sfxAttack() {}, onVictory() {}, enemyAttack() {}, setTimeout() {},
    dungeon: null, CELL_SIZE: 32, logs,
  };
  context.Math.random = () => 0.99;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${entitiesSrc}\nthis.MONSTERS = MONSTERS; this.BOSSES = BOSSES; this.getEnemyAffinitySummary = getEnemyAffinitySummary; this.getEnemyAffinityMultiplier = getEnemyAffinityMultiplier;`, context, { filename: 'js/entities.js' });
  vm.runInContext(`${skillsSrc}\nthis.setLearnedSkills = v => { learnedSkills = v; }; this.getSkillAffinityText = getSkillAffinityText; this.getSkillAffinityMeta = getSkillAffinityMeta; this.getSkillSynergyShortTagText = getSkillSynergyShortTagText; this.getSkillBuildAffinityMatch = getSkillBuildAffinityMatch; this.getSkillBuildAffinityText = getSkillBuildAffinityText; this.getSkillCombatBenefitSummary = getSkillCombatBenefitSummary; this.playerUseSkill = playerUseSkill; this.getCombatSkills = getCombatSkills;`, context, { filename: 'js/skills.js' });
  return context;
}

{
  const ctx = loadAffinityContext();
  const stone = ctx.MONSTERS.find(m => m.name === '石魔');
  const summary = ctx.getEnemyAffinitySummary(stone);
  assert(summary.weakText.includes('水') && summary.weakText.includes('木'), 'monster affinity summary should expose weak elements');
  assert(summary.resistText.includes('土') && summary.resistText.includes('剑'), 'monster affinity summary should expose resisted elements');
  assert(ctx.getEnemyAffinityMultiplier(stone, 'water') > 1, 'weakness should increase matching skill damage');
  assert(ctx.getEnemyAffinityMultiplier(stone, 'sword') < 1, 'resistance should reduce matching skill damage');
  assert(ctx.BOSSES.every(b => Array.isArray(b.weaknesses) && Array.isArray(b.resists)), 'all bosses should declare weakness/resistance arrays');
}

{
  const context = { console, ENEMY_AFFINITY_LABELS: { fire: '火', water: '水', thunder: '雷', sword: '剑', wood: '木', earth: '土' } };
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync('js/stages.js', 'utf8')}\nthis.STAGES = STAGES; this.STAGE_AFFINITY_PLANS = STAGE_AFFINITY_PLANS; this.getStageAffinityPlan = getStageAffinityPlan; this.getStageAffinityText = getStageAffinityText; this.getStageRecommendedBuildText = getStageRecommendedBuildText; this.getStageBossAffinity = getStageBossAffinity;`, context, { filename: 'js/stages.js' });
  assert(context.STAGE_AFFINITY_PLANS.thunder_peak.resists.includes('thunder'), 'thunder peak should explicitly resist thunder builds');
  assert(context.getStageAffinityText(context.STAGES.thunder_peak).includes('抗 雷'), 'stage affinity text should expose stage resistance');
  assert(context.getStageRecommendedBuildText(context.STAGES.blood_depth).includes('水木续航'), 'stage recommendation should expose build guidance');
  const bossAff = context.getStageBossAffinity(context.STAGES.blood_depth, { weaknesses: ['fire'], resists: ['earth'] });
  assert(bossAff.weaknesses.includes('water') && bossAff.weaknesses.includes('sword'), 'stage boss should inherit chapter weakness plan');
}

{
  const ctx = loadAffinityContext();
  ctx.setLearnedSkills([{ tree: 'water', index: 0 }]);
  const before = ctx.currentEnemy.hp;
  ctx.playerUseSkill(0);
  assert(ctx.currentEnemy.hp < before, 'water skill should damage weak stone monster');
  assert(ctx.logs.some(l => l.includes('克水+') || l.includes('克水')), 'skill combat log should mention enemy weakness multiplier');
  assert(ctx.getSkillAffinityText({ tree: 'sword' }, ctx.currentEnemy).includes('抗剑'), 'sword skill should show resistance short text');
  const resistMeta = ctx.getSkillAffinityMeta({ tree: 'sword' }, ctx.currentEnemy);
  assert(resistMeta.text === '抗剑-14%' && resistMeta.type === 'resist' && resistMeta.badge === '抗', 'resisted skills should expose warning metadata instead of being styled as 克制');
  assert(resistMeta.counterText === '建议换水/木' && resistMeta.tip.includes('建议换水/木'), 'resisted skill metadata should point to real weak counter trees');
}

{
  const ctx = loadAffinityContext();
  ctx.setLearnedSkills([{ tree: 'water', index: 0 }, { tree: 'wood', index: 0 }, { tree: 'sword', index: 0 }]);
  const buildMatch = ctx.getSkillBuildAffinityMatch(ctx.currentEnemy);
  assert(buildMatch.label.includes('克制已覆盖') && buildMatch.detail.includes('被抗 剑'), 'build affinity match should summarize covered weakness and resisted learned trees');
  assert(ctx.getSkillCombatBenefitSummary(ctx.currentEnemy).affinity.status, 'combat benefit summary should include target affinity match');
}

{
  assert(mainSrc.includes('getEnemyAffinitySummary') && mainSrc.includes('enemyAffinity?.weakText') && mainSrc.includes('getSkillAffinityMeta'), 'combat panel should render enemy affinity tags and skill affinity metadata');
  assert(mainSrc.includes('getSkillSynergyShortTagText') && mainSrc.includes('synergyShortTag'), 'combat picker should use compact synergy labels');
  assert(css.includes('.cbt-threat-line .weak') && css.includes('.cbt-skill-btn.affinity-hit') && css.includes('.cbt-skill-btn.affinity-resist'), 'CSS should style affinity enemy tags plus weak/resist skill buttons');
  assert(skillsSrc.includes('SKILL_SYNERGY_SHORT_LABELS') && skillsSrc.includes('共鸣就绪'), 'skills runtime should include compact synergy feedback log');
  assert(combatSrc.includes('getEnemyAffinityMultiplier(currentEnemy, \'sword\')'), 'normal attack should consume sword affinity multiplier');
  assert(mainSrc.includes('getStageAffinityText') && mainSrc.includes('stage-card-affinity') && mainSrc.includes('stage-affinity-chip'), 'stage UI should render chapter affinity and recommended builds');
  assert(mainSrc.includes('getSkillBuildAffinityMatch') && mainSrc.includes('当前构筑') && mainSrc.includes('相性：'), 'stage/combat UI should render current build affinity guidance');
  assert(mainSrc.includes('const affinityMult = dmgMult > 0 && enemy && typeof getEnemyAffinityMultiplier === \'function\'') && mainSrc.includes('Math.floor(lowRaw * affinityMult)'), 'skill detail/preview estimated damage should include enemy affinity multipliers');
  assert(skillsSrc.includes('getSkillAffinityCounterTrees') && mainSrc.includes('affinityMeta?.tip || affinityTag'), 'resisted combat skill affordances should include recommended weak counter trees');
  assert(mainSrc.includes('getStageBossAffinity(stage, base)') && mainSrc.includes('weaknesses: bossAffinity.weaknesses'), 'stage boss spawn should inherit chapter affinity plan');
  assert(css.includes('.stage-affinity-chip.player') && css.includes('.cbt-build-badge.affinity-good'), 'CSS should style current build affinity guidance');
  assert(css.includes('.stage-card-affinity') && css.includes('.stage-affinity-chip'), 'CSS should style stage affinity guidance');
}

console.log('skill affinity static checks passed');
