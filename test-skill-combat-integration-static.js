const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function loadContext() {
  const logs = [];
  const context = {
    console,
    Math: Object.create(Math),
    REALMS: [{ name: '炼气', xpNeeded: 100 }, { name: '筑基', xpNeeded: 200 }, { name: '金丹', xpNeeded: 400 }],
    COMBAT_STATE: { PLAYER_TURN: 'player', ENEMY_TURN: 'enemy', VICTORY: 'victory' },
    combatState: 'player',
    player: {
      realmIndex: 2,
      realm: { name: '金丹', xpNeeded: 400 },
      daoFoundation: null,
      baseHp: 100,
      baseMp: 50,
      baseAtk: 10,
      baseDef: 3,
      maxHp: 100,
      maxMp: 50,
      hp: 100,
      mp: 50,
      atk: 10,
      def: 3,
      recalcStats() {},
    },
    currentEnemy: { name: '试炼妖', hp: 200, maxHp: 200, def: 3, x: 0, y: 0, _statusEffects: [] },
    combatLog(msg) { logs.push(msg); },
    showMessage() {},
    autoSave() {},
    spawnSkillEffect() {},
    sfxCrit() {},
    sfxAttack() {},
    onVictory() { context.victoryCalled = true; },
    enemyAttack() {},
    setTimeout() {},
    maybeTriggerBossMechanic(phase) { context.bossPhases.push(phase); return false; },
    didBossMechanicTrigger(result) { return !!(result && (result === true || result.effects?.length)); },
    applyEquipmentOnVictory() { context.equipmentVictory += 1; },
    applyArtifactVictoryEffects() { context.artifactVictory += 1; return { ok: true, hp: 1, mp: 2 }; },
    getEnemyAffinityMultiplier(enemy, tree) { return enemy?.weaknesses?.includes(tree) ? 1.16 : 1; },
    getSkillAffinityText(skill, enemy) { return enemy?.weaknesses?.includes(skill?.tree) ? `克雷+16%` : ''; },
    renderCombatDomPanel() { context.renderCombatDomPanelCalls += 1; },
    CELL_SIZE: 32,
    logs,
    bossPhases: [],
    renderCombatDomPanelCalls: 0,
    equipmentVictory: 0,
    artifactVictory: 0,
    victoryCalled: false,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync('js/skills.js', 'utf8')}\n
this.setLearnedSkills = v => { learnedSkills = v; };
this.setCombatState = v => { combatState = v; this.combatState = v; };
this.getCombatState = () => combatState;
this.playerUseSkill = playerUseSkill;
this.getCombatSkills = getCombatSkills;
this.addCombatStatus = addCombatStatus;
this.getCombatSkillComboPrimer = getCombatSkillComboPrimer;
this.getSkillSynergyCombatHint = getSkillSynergyCombatHint;
this.applyPassiveAfterEnemyHit = applyPassiveAfterEnemyHit;
this.getPassiveCritBonus = getPassiveCritBonus;
this.applySynergyAfterPlayerHit = applySynergyAfterPlayerHit;
`, context, { filename: 'js/skills.js' });
  return context;
}

{
  const ctx = loadContext();
  ctx.setLearnedSkills([
    { tree: 'fire', index: 0 }, { tree: 'fire', index: 3 },
    { tree: 'thunder', index: 0 }, { tree: 'thunder', index: 3 },
  ]);
  ctx.addCombatStatus(ctx.currentEnemy, { type: 'burn', turns: 2, ratio: 0.2, sourceAtk: 10 });
  assert(ctx.getPassiveCritBonus({ tree: 'thunder' }) >= 0.16, 'thunder skill should receive burnCritBonus against burning enemy on top of learned passive');
  assert.strictEqual(ctx.getPassiveCritBonus({ tree: 'fire' }), 0.08, 'fire skill should keep learned passive crit but not receive thunder-only burnCritBonus');
  assert.strictEqual(ctx.getPassiveCritBonus({ tree: 'sword', basicAttack: true }), 0.08, 'basic/sword attack should keep learned passive crit but not receive thunder-only burnCritBonus');
}

{
  const ctx = loadContext();
  ctx.setLearnedSkills([
    { tree: 'fire', index: 0 }, { tree: 'fire', index: 4 },
    { tree: 'earth', index: 0 }, { tree: 'earth', index: 4 },
  ]);
  ctx.player.maxHp = 200;
  ctx.player.hp = 20;
  ctx.applyPassiveAfterEnemyHit(80);
  assert(ctx.logs.some(l => l.includes('余烬回春')), 'fire low-hp trigger should fire');
  assert(ctx.logs.some(l => l.includes('反震罡甲')), 'earth low-hp trigger should fire independently in the same combat');
  const afterFirst = ctx.logs.length;
  ctx.applyPassiveAfterEnemyHit(1);
  assert.strictEqual(ctx.logs.length, afterFirst, 'each low-hp trigger should still be once per combat');
}

{
  const ctx = loadContext();
  ctx.setLearnedSkills([
    { tree: 'fire', index: 0 }, { tree: 'fire', index: 3 },
    { tree: 'thunder', index: 0 }, { tree: 'thunder', index: 3 },
  ]);
  ctx.currentEnemy.hp = 220;
  ctx.currentEnemy.weaknesses = ['thunder'];
  ctx.addCombatStatus(ctx.currentEnemy, { type: 'burn', turns: 2, ratio: 0.2, sourceAtk: 10 });
  ctx.player.mp = 50;
  ctx.setCombatState('player');
  const thunderIndex = ctx.getCombatSkills().findIndex(s => s.tree === 'thunder');
  ctx.playerUseSkill(thunderIndex);
  assert(ctx.logs.some(l => l.includes('连携命中') && l.includes('灼烧后接雷') && l.includes('克雷+16%')), 'using the recommended synergy skill should log deterministic combo-hit feedback');
  assert(ctx.renderCombatDomPanelCalls >= 1, 'skill use should refresh combat DOM before enemy turn so combo/status feedback is visible immediately');
}

{
  const ctx = loadContext();
  ctx.setLearnedSkills([
    { tree: 'fire', index: 0 }, { tree: 'fire', index: 3 },
    { tree: 'thunder', index: 0 }, { tree: 'thunder', index: 3 },
  ]);
  const skills = ctx.getCombatSkills();
  const fireSkill = skills.find(s => s.tree === 'fire' && s.effects?.some(e => e.type === 'burn'));
  const thunderSkill = skills.find(s => s.tree === 'thunder');
  const primer = ctx.getCombatSkillComboPrimer(fireSkill, ctx.currentEnemy, skills);
  const thunderHint = ctx.getSkillSynergyCombatHint(thunderSkill, ctx.currentEnemy);
  assert(primer && primer.label.includes('先灼烧，后接雷暴'), 'fire burn skill should surface a setup combo primer before the enemy is burning');
  assert(thunderHint.readinessText.includes('需先灼烧'), 'thunder resonance hint should tell players the burn prerequisite before it is active');
  ctx.addCombatStatus(ctx.currentEnemy, { type: 'burn', turns: 2, ratio: 0.2, sourceAtk: 10 });
  assert(ctx.getSkillSynergyCombatHint(thunderSkill, ctx.currentEnemy).readinessText.includes('当前可爆发'), 'thunder resonance hint should switch to active burst feedback when burn exists');
}

{
  const ctx = loadContext();
  ctx.setLearnedSkills([{ tree: 'fire', index: 0 }]);
  ctx.player.mp = 50;
  ctx.setCombatState('player');
  ctx.playerUseSkill(0);
  assert(ctx.bossPhases.includes('hp'), 'skill damage should check boss hp mechanics when target survives');
}

{
  const ctx = loadContext();
  ctx.setLearnedSkills([{ tree: 'fire', index: 0 }]);
  ctx.maybeTriggerBossMechanic = phase => { ctx.bossPhases.push(phase); return { effects: [{ type: 'drain', value: 6 }] }; };
  ctx.currentEnemy.hp = 100;
  ctx.player.mp = 50;
  ctx.setCombatState('player');
  ctx.playerUseSkill(0);
  assert.strictEqual(ctx.getCombatState(), 'player', 'skill hp boss mechanic should consume the action through combat bridge instead of also scheduling enemyAttack');
}

{
  const ctx = loadContext();
  ctx.setLearnedSkills([{ tree: 'fire', index: 0 }]);
  ctx.currentEnemy.hp = 1;
  ctx.player.mp = 50;
  ctx.setCombatState('player');
  ctx.playerUseSkill(0);
  assert.strictEqual(ctx.equipmentVictory, 1, 'skill kill should trigger equipment victory effects');
  assert.strictEqual(ctx.artifactVictory, 1, 'skill kill should trigger artifact victory effects');
  assert(ctx.logs.some(l => l.includes('炼妖壶')), 'skill kill should log artifact victory recovery');
  assert(ctx.victoryCalled, 'skill kill should still call onVictory');
}

const main = fs.readFileSync('js/main.js', 'utf8');
assert(!main.includes("['斩杀', `生命≤"), 'execute UI chip should not describe current-life damage as a threshold execute');
assert(main.includes("['追伤', `当前生命"), 'execute UI chip should describe current HP extra damage');
assert(main.includes('getPassiveCritBonus(skill)'), 'skill UI crit estimate should pass skill context');
assert(main.includes('getPassiveArmorPierce(skill)'), 'skill UI pierce estimate should pass skill context so earth+sword does not inflate unrelated trees');
const skillsSrc = fs.readFileSync('js/skills.js', 'utf8');
assert(skillsSrc.includes('(skill.armorPierce || 0) + getPassiveArmorPierce(skill)'), 'runtime skill damage should pass skill context to passive/synergy armor pierce');
assert(!skillsSrc.includes('(skill.armorPierce || 0) + getPassiveArmorPierce();'), 'runtime skill damage should not apply earth+sword armorPierceBonus to every skill tree');
assert(main.includes('runtimeEffectBonus') && main.includes('healGuardAmp') && main.includes('controlExtendTurns'), 'skill UI estimates should include mastery and synergy runtime bonuses');
assert(main.includes("eff.type === 'stunChance') chips.push(['麻痹', `${Math.round((eff.chance ?? 0.25) * 100)}%×${(eff.turns || 1) + controlExtendTurns}回合`]") || main.includes("(eff.turns || 1) + controlExtendTurns"), 'skill UI estimates should include water+wood control extension for stun skills');

console.log('skill combat integration regression checks passed');
