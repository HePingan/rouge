const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function loadSkillsContext() {
  const logs = [];
  const context = {
    console,
    Math: Object.create(Math),
    REALMS: [
      { name: '炼气', hpMult: 1, mpMult: 1, atkBonus: 0, defBonus: 0, xpNeeded: 100 },
      { name: '筑基', hpMult: 1.2, mpMult: 1.2, atkBonus: 2, defBonus: 1, xpNeeded: 200 },
      { name: '金丹', hpMult: 1.45, mpMult: 1.45, atkBonus: 5, defBonus: 2, xpNeeded: 400 },
    ],
    COMBAT_STATE: { PLAYER_TURN: 'player', ENEMY_TURN: 'enemy', VICTORY: 'victory' },
    combatState: 'player',
    player: {
      realmIndex: 2,
      realm: { name: '金丹', xpNeeded: 400 },
      xp: 0,
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
    currentEnemy: { name: '试炼妖', hp: 200, def: 3, x: 0, y: 0, _statusEffects: [] },
    combatLog(msg) { logs.push(msg); },
    autoSave() {},
    showMessage() {},
    spawnSkillEffect() {},
    sfxCrit() {},
    sfxAttack() {},
    setTimeout(fn) {},
    CELL_SIZE: 32,
    logs,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync('js/skills.js', 'utf8')}\n
this.SKILL_SYNERGIES = SKILL_SYNERGIES;
this.getActiveSkillSynergies = getActiveSkillSynergies;
this.getSkillSynergyProgress = getSkillSynergyProgress;
this.getSkillCodexSummary = getSkillCodexSummary;
this.getSkillSynergiesForTree = getSkillSynergiesForTree;
this.getNextSkillSynergyHint = getNextSkillSynergyHint;
this.getNextSkillSynergyRecommendation = getNextSkillSynergyRecommendation;
this.getSkillSynergyRecommendationForTree = getSkillSynergyRecommendationForTree;
this.getActiveSkillBuildSummary = getActiveSkillBuildSummary;
this.getActiveSkillSynergyTagsForSkill = getActiveSkillSynergyTagsForSkill;
this.getSkillSynergyTagText = getSkillSynergyTagText;
this.getSkillTreeMastery = getSkillTreeMastery;
this.getSkillLearningImpact = getSkillLearningImpact;
this.getRecommendedSkillNodesForBuild = getRecommendedSkillNodesForBuild;
this.getSkillCombatBenefitSummary = getSkillCombatBenefitSummary;
this.getDoctrineSkillDamageBonus = getDoctrineSkillDamageBonus;
this.getPassiveCritBonus = getPassiveCritBonus;
this.getPassiveArmorPierce = getPassiveArmorPierce;
this.applySkillEffects = applySkillEffects;
this.applySynergyAfterPlayerHit = applySynergyAfterPlayerHit;
this.addCombatStatus = addCombatStatus;
this.claimSkillSynergyReward = claimSkillSynergyReward;
this.canClaimSkillSynergy = canClaimSkillSynergy;
this.isSkillSynergyClaimed = isSkillSynergyClaimed;
this.normalizeClaimedSkillSynergies = normalizeClaimedSkillSynergies;
this.SKILL_MASTERY_MILESTONES = SKILL_MASTERY_MILESTONES;
this.getSkillMasteryMilestoneProgress = getSkillMasteryMilestoneProgress;
this.claimSkillMasteryReward = claimSkillMasteryReward;
this.canClaimSkillMasteryReward = canClaimSkillMasteryReward;
this.isSkillMasteryClaimed = isSkillMasteryClaimed;
this.normalizeClaimedSkillMasteries = normalizeClaimedSkillMasteries;
this.setLearnedSkills = v => { learnedSkills = v; };
this.setClaimedSkillSynergies = v => { claimedSkillSynergies = normalizeClaimedSkillSynergies(v); };
this.setClaimedSkillMasteries = v => { claimedSkillMasteries = normalizeClaimedSkillMasteries(v); };
this.getClaimedSkillSynergies = () => ({ ...claimedSkillSynergies });
this.getClaimedSkillMasteries = () => ({ ...claimedSkillMasteries });
this.logs = logs;
`, context, { filename: 'js/skills.js' });
  return context;
}

{
  const ctx = loadSkillsContext();
  ctx.setLearnedSkills([{ tree: 'fire', index: 0 }, { tree: 'thunder', index: 0 }, { tree: 'thunder', index: 3 }]);
  const progress = ctx.getSkillSynergyProgress().find(s => s.id === 'fire_thunder');
  assert(progress && !progress.active, 'partial fire+thunder should report locked synergy progress');
  const fire = progress.progress.find(p => p.tree === 'fire');
  const thunder = progress.progress.find(p => p.tree === 'thunder');
  assert(fire.learned === 1 && fire.required === 2 && fire.missing === 1, 'fire progress should be 1/2 missing 1');
  assert(thunder.learned === 2 && thunder.missing === 0, 'thunder progress should be complete');
  assert(ctx.getNextSkillSynergyHint().includes('雷火焚天') && ctx.getNextSkillSynergyHint().includes('火系功法1 个'), 'next hint should point to missing fire skill for 雷火焚天');
  const rec = ctx.getNextSkillSynergyRecommendation();
  assert(rec.type === 'synergy' && rec.id === 'fire_thunder', 'recommendation should target closest locked synergy');
  assert(JSON.stringify(rec.recommendedTrees) === JSON.stringify(['fire']), 'recommendation should point only at missing tree');
  assert(ctx.getSkillSynergyRecommendationForTree('fire')?.id === 'fire_thunder', 'missing fire tree should be recommended');
  assert.strictEqual(ctx.getSkillSynergyRecommendationForTree('thunder'), null, 'complete thunder side should not be recommended for this synergy');
  assert(ctx.getSkillSynergiesForTree('fire').some(s => s.id === 'fire_thunder'), 'fire skill detail should list fire_thunder as related synergy');
  const impact = ctx.getSkillLearningImpact('fire', 1);
  assert(impact.text.includes('将激活「雷火焚天」'), 'learning the missing fire node should preview newly activated synergy');
  const recommended = ctx.getRecommendedSkillNodesForBuild(2);
  assert(recommended.some(r => r.tree === 'fire' && r.impact.text.includes('雷火焚天')), 'recommended build nodes should include actionable missing fire skill');
}

{
  const ctx = loadSkillsContext();
  ctx.setLearnedSkills([
    { tree: 'fire', index: 0 }, { tree: 'fire', index: 3 },
    { tree: 'thunder', index: 0 }, { tree: 'thunder', index: 3 },
  ]);
  assert(ctx.getActiveSkillSynergies().some(s => s.id === 'fire_thunder'), 'fire+thunder 2/2 should activate 雷火焚天');
  const summary = ctx.getActiveSkillBuildSummary();
  assert(summary.activeText.includes('雷火焚天'), 'build summary should expose active synergy for combat badges');
  assert(ctx.getSkillSynergyTagText({ tree: 'thunder', effects: [{ type: 'stunChance' }] }).includes('暴击延烧'), 'thunder skill should show 雷火焚天 combat tag');
  ctx.addCombatStatus(ctx.currentEnemy, { type: 'burn', turns: 2, ratio: 0.2, sourceAtk: 10 });
  assert(ctx.getPassiveCritBonus() >= 0.16, 'burning enemy should grant thunder-fire crit bonus on top of learned passive');
}

{
  const ctx = loadSkillsContext();
  ctx.setLearnedSkills([{ tree: 'fire', index: 0 }, { tree: 'fire', index: 1 }, { tree: 'fire', index: 3 }]);
  const mastery = ctx.getSkillTreeMastery('fire');
  assert(mastery.active, 'three same-tree skills should activate single-tree mastery');
  assert(mastery.damageBonus > 0 && mastery.effectBonus > 0, 'mastery should provide real runtime bonuses');
}

{
  const ctx = loadSkillsContext();
  ctx.setLearnedSkills([{ tree: 'earth', index: 0 }, { tree: 'earth', index: 1 }, { tree: 'sword', index: 0 }, { tree: 'sword', index: 3 }]);
  assert(ctx.getActiveSkillSynergies().some(s => s.id === 'earth_sword'), 'earth+sword should activate 山河剑骨');
  assert(ctx.getPassiveArmorPierce() >= 0.18, 'earth+sword synergy should add armor pierce beyond sword passive');
  const guardSkill = { tree: 'earth', effects: [{ type: 'guard', turns: 2, ratio: 0.4 }] };
  ctx.applySkillEffects(guardSkill, 0, false);
  ctx.applySynergyAfterPlayerHit(0, false, guardSkill);
  assert(ctx.currentEnemy._statusEffects.some(s => s.type === 'defBreak'), 'guard skill under earth+sword should apply enemy defBreak');
  const before = ctx.currentEnemy.hp;
  ctx.applySynergyAfterPlayerHit(0, false, { tree: 'sword', effects: [{ type: 'bleed', turns: 2, ratio: 0.16 }] });
  assert(ctx.currentEnemy.hp < before, 'sword hit against defBroken enemy should trigger 山河剑骨 execute damage');
}

{
  const ctx = loadSkillsContext();
  ctx.setLearnedSkills([{ tree: 'water', index: 0 }, { tree: 'water', index: 1 }, { tree: 'wood', index: 0 }, { tree: 'wood', index: 1 }]);
  assert(ctx.getActiveSkillSynergies().some(s => s.id === 'water_wood'), 'water+wood should activate 水木长生');
  ctx.currentEnemy._statusEffects = [];
  ctx.applySkillEffects({ tree: 'water', effects: [{ type: 'weaken', turns: 2, ratio: 0.18 }] }, 0, false);
  const weakened = ctx.currentEnemy._statusEffects.find(s => s.type === 'weaken');
  assert(weakened && weakened.turns >= 3, 'water+wood should extend weaken/control duration');
  assert(ctx.logs.some(l => l.includes('水木长生') && l.includes('削弱延长')), 'control extension should log visible synergy feedback');
  assert(ctx.getSkillSynergyTagText({ tree: 'water', effects: [{ type: 'weaken' }] }).includes('控制延长'), 'control skills should show synergy tag in combat picker');
  ctx.player.hp = 50;
  ctx.applySkillEffects({ tree: 'wood', effects: [{ type: 'healSelf', ratio: 0.1 }, { type: 'guard', turns: 2, ratio: 0.2 }] }, 0, false);
  assert(ctx.player.hp > 60, 'water+wood should amplify healing beyond base ratio');
  assert(ctx.player._statusEffects.some(s => s.type === 'guard' && s.ratio > 0.2), 'water+wood should amplify guard ratio');
  assert(ctx.logs.some(l => l.includes('治疗强化')) && ctx.logs.some(l => l.includes('护盾强化')), 'heal/guard amplification should log visible synergy feedback');
}

{
  const ctx = loadSkillsContext();
  ctx.setLearnedSkills([
    { tree: 'fire', index: 0 }, { tree: 'fire', index: 3 },
    { tree: 'thunder', index: 0 }, { tree: 'thunder', index: 3 },
  ]);
  const syn = ctx.getSkillSynergyProgress().find(s => s.id === 'fire_thunder');
  assert(syn.active && syn.claimable && !syn.claimed, 'active unclaimed synergy should be claimable');
  const codexBefore = ctx.getSkillCodexSummary();
  assert(codexBefore.claimableCount === 1 && codexBefore.headline.includes('待领取'), 'codex should surface claimable formation rewards');
  assert(codexBefore.treeStats.some(t => t.tree === 'fire' && t.learned === 2), 'codex should summarize per-tree learned counts');
  const atkBefore = ctx.player.baseAtk;
  const mpBefore = ctx.player.baseMp;
  assert.strictEqual(ctx.claimSkillSynergyReward('fire_thunder'), true, 'claiming active synergy should succeed');
  assert.strictEqual(ctx.player.baseAtk, atkBefore + ctx.SKILL_SYNERGIES.fire_thunder.reward.baseAtk, 'claim should grant permanent base attack');
  assert.strictEqual(ctx.player.baseMp, mpBefore + ctx.SKILL_SYNERGIES.fire_thunder.reward.baseMp, 'claim should grant permanent base mp');
  assert.strictEqual(ctx.isSkillSynergyClaimed('fire_thunder'), true, 'claimed synergy should be tracked');
  assert.strictEqual(ctx.claimSkillSynergyReward('fire_thunder'), false, 'synergy reward must not be claimable twice');
  assert.strictEqual(ctx.player.baseAtk, atkBefore + ctx.SKILL_SYNERGIES.fire_thunder.reward.baseAtk, 'second claim must not duplicate rewards');
}

{
  const ctx = loadSkillsContext();
  ctx.setLearnedSkills([{ tree: 'fire', index: 0 }, { tree: 'fire', index: 1 }, { tree: 'fire', index: 3 }]);
  const milestones = ctx.getSkillMasteryMilestoneProgress();
  const fire3 = milestones.find(m => m.tree === 'fire' && m.count === 3);
  const fire5 = milestones.find(m => m.tree === 'fire' && m.count === 5);
  assert(fire3 && fire3.claimable && !fire3.claimed, 'fire 3-skill mastery milestone should be claimable');
  assert(fire5 && !fire5.active && !fire5.claimable, 'fire 5-skill mastery milestone should remain locked at 3 learned');
  const codexBefore = ctx.getSkillCodexSummary();
  assert(codexBefore.claimableMasteries.some(m => m.tree === 'fire' && m.count === 3), 'codex should include claimable mastery milestones');
  const statBefore = ctx.availableStatPoints || 0;
  assert.strictEqual(ctx.claimSkillMasteryReward('fire', 3), true, 'claiming active mastery milestone should succeed');
  assert.strictEqual(ctx.isSkillMasteryClaimed('fire', 3), true, 'claimed mastery milestone should be tracked');
  assert.strictEqual(ctx.claimSkillMasteryReward('fire', 3), false, 'mastery milestone reward must not be claimable twice');
  assert(ctx.getClaimedSkillMasteries().fire_3, 'normalized claimed mastery id should persist');
}

{
  const ctx = loadSkillsContext();
  ctx.setLearnedSkills([
    { tree: 'fire', index: 0 }, { tree: 'fire', index: 3 },
    { tree: 'thunder', index: 0 }, { tree: 'thunder', index: 3 },
    { tree: 'water', index: 0 }, { tree: 'water', index: 1 },
    { tree: 'wood', index: 0 }, { tree: 'wood', index: 1 },
    { tree: 'earth', index: 0 }, { tree: 'earth', index: 1 },
    { tree: 'sword', index: 0 }, { tree: 'sword', index: 3 },
  ]);
  assert(ctx.getSkillSynergyProgress().every(s => s.active), 'all base synergies should be active with 2/2 requirements met');
  assert(ctx.getNextSkillSynergyHint().includes('基础共鸣已全部激活'), 'hint should switch to mastery when all synergies are active');
  const rec = ctx.getNextSkillSynergyRecommendation();
  assert(rec.type === 'mastery' && rec.recommendedTrees.length === 1, 'after base synergies, recommendation should switch to single-tree mastery');
  assert(ctx.getActiveSkillBuildSummary().activeLabels.length >= 3, 'build summary should include multiple active combat badges');
  assert(ctx.getSkillCombatBenefitSummary().text.includes('雷火焚天') && ctx.getSkillCombatBenefitSummary().text.includes('水木长生'), 'combat benefit summary should expose active synergies');
}

{
  const main = fs.readFileSync('js/main.js', 'utf8');
  const css = fs.readFileSync('css/style.css', 'utf8');
  assert(main.includes('node-reco-badge') && main.includes('skill-build-hint'), 'skill panel should render recommendation badge and detail hint');
  assert(main.includes('skill-codex-panel') && main.includes('codex-claim-guide'), 'skill panel should render codex summary and claim guide');
  assert(main.includes('mastery-milestone-panel') && main.includes('claimSkillMasteryReward(tree, count)'), 'skill panel should render and claim mastery milestone rewards');
  assert(main.includes('skill-impact-preview') && main.includes('synergy-recommend-strip'), 'skill panel should render learning impact preview and next-skill recommendations');
  assert(main.includes('getSkillCombatBenefitSummary') && main.includes('cbt-build-badge'), 'combat panel should render active build badges from combat benefit summary');
  assert(main.includes('getSkillSynergyTagText') && main.includes('synergy-ready'), 'combat picker should mark skills affected by active synergies');
  assert(css.includes('.skill-node.recommended') && css.includes('.cbt-build-badge'), 'CSS should style recommended nodes and combat build badges');
  assert(css.includes('.skill-impact-preview') && css.includes('.synergy-recommend-strip'), 'CSS should style learning preview and recommendation strip');
  assert(css.includes('.synergy-card.mastery-card'), 'CSS should style mastery milestone cards');
  assert(css.includes('.cbt-skill-btn.synergy-ready') && css.includes('.cbt-drawer-skill.synergy-ready'), 'CSS should style synergy-ready combat skill choices');
}

console.log('skill synergy static checks passed');
