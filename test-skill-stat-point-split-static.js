const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function loadSkillsContext() {
  const context = {
    console,
    Math: Object.create(Math),
    REALMS: [
      { name: '炼气', hpMult: 1, mpMult: 1, atkBonus: 0, defBonus: 0, xpNeeded: 100 },
      { name: '筑基', hpMult: 1.2, mpMult: 1.2, atkBonus: 2, defBonus: 1, xpNeeded: 200 },
      { name: '金丹', hpMult: 1.45, mpMult: 1.45, atkBonus: 5, defBonus: 2, xpNeeded: 400 },
    ],
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
      recalcStats() {
        this.maxHp = this.baseHp;
        this.maxMp = this.baseMp;
        this.atk = this.baseAtk;
        this.def = this.baseDef;
      },
    },
    autoSave() {},
    showMessage() {},
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync('js/skills.js', 'utf8')}\n
this.SKILL_TREES = SKILL_TREES;
this.getAvailableSkillPoints = () => availableSkillPoints;
this.setAvailableSkillPoints = v => { availableSkillPoints = v; };
this.getAvailableStatPoints = () => availableStatPoints;
this.setAvailableStatPoints = v => { availableStatPoints = v; };
this.learnSkill = learnSkill;
this.allocateAttr = allocateAttr;
this.getRealmSkillPointReward = getRealmSkillPointReward;
this.getRealmStatPointReward = getRealmStatPointReward;
`, context, { filename: 'js/skills.js' });
  return context;
}

{
  const ctx = loadSkillsContext();
  ctx.setAvailableSkillPoints(1);
  ctx.setAvailableStatPoints(2);

  assert.strictEqual(ctx.learnSkill('fire', 0), true, 'learning a skill spends a skill point');
  assert.strictEqual(ctx.getAvailableSkillPoints(), 0);
  assert.strictEqual(ctx.getAvailableStatPoints(), 2, 'learning skills must not spend stat points');

  assert.strictEqual(ctx.allocateAttr('atk'), true, 'attribute allocation spends stat points');
  assert.strictEqual(ctx.getAvailableSkillPoints(), 0, 'attribute allocation must not spend skill points');
  assert.strictEqual(ctx.getAvailableStatPoints(), 1);
  assert.strictEqual(ctx.player.baseAtk, 13);
}

{
  const ctx = loadSkillsContext();
  assert.ok(ctx.getRealmSkillPointReward(1) >= 1, 'breakthrough still grants skill-learning points');
  assert.ok(ctx.getRealmStatPointReward(1) >= 1, 'breakthrough grants separate stat points');
}

console.log('skill/stat point split static checks passed');
