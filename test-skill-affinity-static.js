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
  vm.runInContext(`${skillsSrc}\nthis.setLearnedSkills = v => { learnedSkills = v; }; this.getSkillAffinityText = getSkillAffinityText; this.getSkillSynergyShortTagText = getSkillSynergyShortTagText; this.playerUseSkill = playerUseSkill; this.getCombatSkills = getCombatSkills;`, context, { filename: 'js/skills.js' });
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
  const ctx = loadAffinityContext();
  ctx.setLearnedSkills([{ tree: 'water', index: 0 }]);
  const before = ctx.currentEnemy.hp;
  ctx.playerUseSkill(0);
  assert(ctx.currentEnemy.hp < before, 'water skill should damage weak stone monster');
  assert(ctx.logs.some(l => l.includes('克水+') || l.includes('克水')), 'skill combat log should mention enemy weakness multiplier');
  assert(ctx.getSkillAffinityText({ tree: 'sword' }, ctx.currentEnemy).includes('抗剑'), 'sword skill should show resistance short text');
}

{
  assert(mainSrc.includes('getEnemyAffinitySummary') && mainSrc.includes('affinity-tag weak') && mainSrc.includes('getSkillAffinityText'), 'combat panel should render enemy affinity tags and skill affinity hints');
  assert(mainSrc.includes('getSkillSynergyShortTagText') && mainSrc.includes('synergyShortTag'), 'combat picker should use compact synergy labels');
  assert(css.includes('.cbt-enemy-tags .affinity-tag.weak') && css.includes('.cbt-skill-btn.affinity-hit'), 'CSS should style affinity enemy tags and skill buttons');
  assert(skillsSrc.includes('SKILL_SYNERGY_SHORT_LABELS') && skillsSrc.includes('共鸣就绪'), 'skills runtime should include compact synergy feedback log');
  assert(combatSrc.includes('getEnemyAffinityMultiplier(currentEnemy, \'sword\')'), 'normal attack should consume sword affinity multiplier');
}

console.log('skill affinity static checks passed');
