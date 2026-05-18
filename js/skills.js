// Skills & Cultivation System — Skill trees, breakthrough, attribute allocation

// ─── Skill Definitions ───
const SKILL_TREES = {
  fire: {
    name: '🔥 火系功法',
    color: '#ff6644',
    skills: [
      {
        name: '烈焰掌', icon: '🔥', kind: 'active', mpCost: 12, dmgMult: 1.35,
        desc: '掌劲附着灵火，命中后灼烧敌人。', unlockRealm: 0,
        effectText: '主动：造成伤害，并附加 3 回合灼烧（每回合受施法者攻击 18% 伤害）。',
        effects: [{ type: 'burn', turns: 3, ratio: 0.18 }],
      },
      {
        name: '焚天火雨', icon: '☄️', kind: 'active', mpCost: 25, dmgMult: 1.7,
        desc: '火雨覆盖战场，当前敌人与周围妖物同受波及。', unlockRealm: 2,
        effectText: '主动：主目标受伤并灼烧；额外轰击本层最多 2 个其它妖物。',
        effects: [{ type: 'burn', turns: 3, ratio: 0.24 }, { type: 'splash', count: 2, ratio: 0.45 }],
      },
      {
        name: '凤凰涅槃', icon: '🕊️', kind: 'active', mpCost: 40, dmgMult: 2.15,
        desc: '以凤凰真火焚敌，同时借余烬回补自身。', unlockRealm: 4,
        effectText: '主动：造成伤害，恢复自身 18% 最大生命，并获得 2 回合火羽护盾。',
        effects: [{ type: 'healSelf', ratio: 0.18 }, { type: 'guard', turns: 2, ratio: 0.28 }, { type: 'burn', turns: 3, ratio: 0.3 }],
      },
      {
        name: '火灵根', icon: '🔥', kind: 'passive', mpCost: 0, dmgMult: 0,
        desc: '丹田蕴火，灵力转化为更稳定的攻势。', unlockRealm: 1,
        effectText: '被动：攻击 +8%，所有灼烧伤害提高 30%。',
        effects: [{ type: 'passiveStat', stat: 'atkPct', value: 0.08 }, { type: 'burnAmp', value: 0.3 }],
      },
      {
        name: '余烬回春', icon: '🌋', kind: 'trigger', mpCost: 0, dmgMult: 0,
        desc: '濒死时体内余烬护住心脉。', unlockRealm: 3,
        effectText: '触发：每场战斗一次，生命低于 30% 时立即恢复 18% 最大生命并获得 1 回合护盾。',
        effects: [{ type: 'lowHpHeal', threshold: 0.3, healRatio: 0.18, guardRatio: 0.25, turns: 1 }],
      },
    ],
  },
  water: {
    name: '💧 水系功法',
    color: '#4488ff',
    skills: [
      {
        name: '寒冰刺', icon: '❄️', kind: 'active', mpCost: 10, dmgMult: 1.2,
        desc: '冰锥穿刺并迟滞敌人行动。', unlockRealm: 0,
        effectText: '主动：造成伤害，并削弱敌人 18% 攻击 2 回合。',
        effects: [{ type: 'weaken', turns: 2, ratio: 0.18 }],
      },
      {
        name: '冰封万里', icon: '🧊', kind: 'active', mpCost: 22, dmgMult: 1.45,
        desc: '寒气冻结经脉，让敌人下回合难以出手。', unlockRealm: 2,
        effectText: '主动：造成伤害，70% 概率冻结敌人 1 回合，并附加攻击削弱。',
        effects: [{ type: 'freeze', chance: 0.7, turns: 1 }, { type: 'weaken', turns: 3, ratio: 0.25 }],
      },
      {
        name: '玄水真解', icon: '🌊', kind: 'active', mpCost: 35, dmgMult: 1.75,
        desc: '玄水护体，以柔克刚。', unlockRealm: 4,
        effectText: '主动：造成伤害，恢复 24% 最大生命，并获得 3 回合玄水护盾。',
        effects: [{ type: 'healSelf', ratio: 0.24 }, { type: 'guard', turns: 3, ratio: 0.35 }, { type: 'weaken', turns: 2, ratio: 0.2 }],
      },
      {
        name: '灵泉脉', icon: '💦', kind: 'passive', mpCost: 0, dmgMult: 0,
        desc: '灵泉流转，拓宽气海并滋养肉身。', unlockRealm: 1,
        effectText: '被动：最大生命 +8%，最大灵力 +12%。',
        effects: [{ type: 'passiveStat', stat: 'maxHpPct', value: 0.08 }, { type: 'passiveStat', stat: 'maxMpPct', value: 0.12 }],
      },
      {
        name: '潮汐回灵', icon: '🌙', kind: 'trigger', mpCost: 0, dmgMult: 0,
        desc: '每逢攻守轮转，灵海潮汐自生。', unlockRealm: 3,
        effectText: '触发：每次重新轮到你行动时，恢复 4% 最大灵力。',
        effects: [{ type: 'turnMpRegen', ratio: 0.04 }],
      },
    ],
  },
  thunder: {
    name: '⚡ 雷系功法',
    color: '#ffcc00',
    skills: [
      {
        name: '雷击术', icon: '⚡', kind: 'active', mpCost: 15, dmgMult: 1.45,
        desc: '雷霆迅猛，暴击率远高于普通攻击。', unlockRealm: 0,
        critBonus: 0.25,
        effectText: '主动：暴击率 +25%；若暴击，震慑敌人使其攻击下降。',
        effects: [{ type: 'shockOnCrit', turns: 2, ratio: 0.2 }],
      },
      {
        name: '五雷轰顶', icon: '🌩️', kind: 'active', mpCost: 28, dmgMult: 1.65,
        desc: '五道雷光连环劈落。', unlockRealm: 2,
        hits: 3, critBonus: 0.12,
        effectText: '主动：3 段雷击，每段独立暴击；每次命中都有概率麻痹敌人。',
        effects: [{ type: 'stunChance', chance: 0.25, turns: 1 }],
      },
      {
        name: '天劫降临', icon: '☯️', kind: 'active', mpCost: 45, dmgMult: 2.0,
        desc: '引动天劫，越强的敌人越惧天威。', unlockRealm: 4,
        critBonus: 0.2,
        effectText: '主动：附加敌人当前生命 12% 的天劫伤害（对 Boss 上限为自身攻击 180%），并可能麻痹。',
        effects: [{ type: 'execute', ratio: 0.12, bossCapAtkRatio: 1.8 }, { type: 'stunChance', chance: 0.45, turns: 1 }],
      },
      {
        name: '雷心诀', icon: '💛', kind: 'passive', mpCost: 0, dmgMult: 0,
        desc: '心如奔雷，出手更易洞穿破绽。', unlockRealm: 1,
        effectText: '被动：所有攻击暴击率 +8%。',
        effects: [{ type: 'critBonusPassive', value: 0.08 }],
      },
      {
        name: '雷鸣震魄', icon: '🔆', kind: 'trigger', mpCost: 0, dmgMult: 0,
        desc: '暴击时雷音贯耳，震散妖物凶性。', unlockRealm: 3,
        effectText: '触发：普通攻击或技能暴击时，45% 概率使敌人攻击降低 18% 2 回合。',
        effects: [{ type: 'critWeakenChance', chance: 0.45, turns: 2, ratio: 0.18 }],
      },
    ],
  },
  sword: {
    name: '⚔️ 剑修之道',
    color: '#aaaaaa',
    skills: [
      {
        name: '剑气斩', icon: '🗡️', kind: 'active', mpCost: 8, dmgMult: 1.25,
        desc: '剑气破甲，专斩护体妖甲。', unlockRealm: 0,
        armorPierce: 0.35,
        effectText: '主动：无视敌人 35% 防御，并撕裂护甲 2 回合（防御 -18%）。',
        effects: [{ type: 'defBreak', turns: 2, ratio: 0.18 }],
      },
      {
        name: '万剑归宗', icon: '⚔️', kind: 'active', mpCost: 20, dmgMult: 1.1,
        desc: '万千剑影连续追击。', unlockRealm: 2,
        hits: 4, armorPierce: 0.2,
        effectText: '主动：4 段剑气，每段无视 20% 防御；命中后留下剑痕，敌人下回合持续流血。',
        effects: [{ type: 'bleed', turns: 2, ratio: 0.16 }],
      },
      {
        name: '剑开天门', icon: '🌌', kind: 'active', mpCost: 32, dmgMult: 1.95,
        desc: '一剑开天门，斩敌亦明心。', unlockRealm: 4,
        armorPierce: 0.5,
        effectText: '主动：无视 50% 防御；若击杀敌人，返还 45% 灵力消耗。',
        effects: [{ type: 'refundOnKill', ratio: 0.45 }],
      },
      {
        name: '剑骨', icon: '🦴', kind: 'passive', mpCost: 0, dmgMult: 0,
        desc: '以剑意淬骨，攻守皆如锋刃。', unlockRealm: 1,
        effectText: '被动：攻击 +5%，防御 +5%，所有攻击额外无视 10% 防御。',
        effects: [{ type: 'passiveStat', stat: 'atkPct', value: 0.05 }, { type: 'passiveStat', stat: 'defPct', value: 0.05 }, { type: 'armorPiercePassive', value: 0.1 }],
      },
      {
        name: '斩念归元', icon: '✨', kind: 'trigger', mpCost: 0, dmgMult: 0,
        desc: '斩妖后剑意回流，反哺气海与经脉。', unlockRealm: 3,
        effectText: '触发：击败敌人时，恢复 6% 最大生命与 8% 最大灵力。',
        effects: [{ type: 'victoryRecover', hpRatio: 0.06, mpRatio: 0.08 }],
      },
    ],
  },
};

const SKILL_KIND_LABELS = { active: '主动', passive: '被动', trigger: '触发' };
const SKILL_EFFECT_LABELS = {
  burn: '灼烧', bleed: '流血', splash: '溅射', healSelf: '治疗', guard: '护盾', weaken: '虚弱', defBreak: '破甲', freeze: '冻结',
  shockOnCrit: '暴击震慑', stunChance: '麻痹', execute: '斩杀', refundOnKill: '击杀返灵',
  passiveStat: '属性强化', burnAmp: '灼烧强化', lowHpHeal: '濒死回春', turnMpRegen: '潮汐回灵',
  critBonusPassive: '暴击精通', critWeakenChance: '暴击虚弱', armorPiercePassive: '破甲精通', victoryRecover: '击杀回元',
};

// Player cultivation state
let availableSkillPoints = 0;
let learnedSkills = [];  // [{ tree: 'fire', index: 0 }, ...]
let showBreakthroughUI = false;
let showSkillTreeUI = false;
let breakthroughQueue = false;  // true when player just leveled up and needs to see breakthrough

function getSkillKind(skill) { return skill.kind || 'active'; }
function isSkillLearned(tree, index) { return learnedSkills.some(s => s.tree === tree && s.index === index); }

// ─── Get available skills based on current realm ───
function getAvailableSkills(realmIndex) {
  const available = [];
  for (const [treeKey, tree] of Object.entries(SKILL_TREES)) {
    for (let i = 0; i < tree.skills.length; i++) {
      if (tree.skills[i].unlockRealm <= realmIndex) {
        const alreadyLearned = isSkillLearned(treeKey, i);
        available.push({ tree: treeKey, treeName: tree.name, color: tree.color, index: i, ...tree.skills[i], learned: alreadyLearned });
      }
    }
  }
  return available;
}

// ─── Learn / unlearn skills ───
function learnSkill(tree, index) {
  if (availableSkillPoints <= 0) return false;
  if (!SKILL_TREES[tree] || !SKILL_TREES[tree].skills[index]) return false;
  if (isSkillLearned(tree, index)) return false;
  const skill = SKILL_TREES[tree].skills[index];
  if (skill.unlockRealm > player.realmIndex) return false;
  learnedSkills.push({ tree, index });
  availableSkillPoints--;
  if (player && typeof player.recalcStats === 'function') player.recalcStats();
  autoSave();
  return true;
}

function unlearnSkill(tree, index) {
  const pos = learnedSkills.findIndex(s => s.tree === tree && s.index === index);
  if (pos < 0) return false;
  if (learnedSkills.some(s => s.tree === tree && s.index === index + 1)) return false;
  learnedSkills.splice(pos, 1);
  availableSkillPoints++;
  if (player && typeof player.recalcStats === 'function') player.recalcStats();
  if (player) {
    player.hp = Math.min(player.hp, player.maxHp);
    player.mp = Math.min(player.mp, player.maxMp);
  }
  autoSave();
  return true;
}

function getLearnedSkillDefinitions(kind = null) {
  return learnedSkills
    .map(s => {
      const tree = SKILL_TREES[s.tree];
      const skill = tree && tree.skills[s.index];
      return skill ? { tree: s.tree, treeColor: tree.color, index: s.index, ...skill } : null;
    })
    .filter(Boolean)
    .filter(s => !kind || getSkillKind(s) === kind);
}

function getSkillPassiveBonuses() {
  const bonuses = { atkPct: 0, defPct: 0, maxHpPct: 0, maxMpPct: 0 };
  for (const skill of getLearnedSkillDefinitions()) {
    for (const eff of skill.effects || []) {
      if (eff.type === 'passiveStat' && eff.stat) bonuses[eff.stat] = (bonuses[eff.stat] || 0) + (eff.value || 0);
    }
  }
  return bonuses;
}

function sumLearnedEffect(type, field = 'value') {
  let total = 0;
  for (const skill of getLearnedSkillDefinitions()) {
    for (const eff of skill.effects || []) if (eff.type === type) total += eff[field] || 0;
  }
  return total;
}

// ─── Get combat-usable active skills ───
function getCombatSkills() {
  return getLearnedSkillDefinitions('active');
}

function getSkillEffectSummary(skill) {
  const parts = [SKILL_KIND_LABELS[getSkillKind(skill)] || '技能'];
  if (skill.hits && skill.hits > 1) parts.push(`${skill.hits}段`);
  if (skill.armorPierce) parts.push(`破防${Math.round(skill.armorPierce * 100)}%`);
  if (skill.critBonus) parts.push(`暴击+${Math.round(skill.critBonus * 100)}%`);
  for (const eff of skill.effects || []) parts.push(SKILL_EFFECT_LABELS[eff.type] || eff.type);
  return [...new Set(parts)].join(' · ');
}

function ensureCombatEffects(target) {
  if (!target._statusEffects) target._statusEffects = [];
  return target._statusEffects;
}

function addCombatStatus(target, status) {
  const list = ensureCombatEffects(target);
  const existing = list.find(s => s.type === status.type);
  if (existing) {
    existing.turns = Math.max(existing.turns || 0, status.turns || 0);
    existing.ratio = Math.max(existing.ratio || 0, status.ratio || 0);
    existing.sourceAtk = Math.max(existing.sourceAtk || 0, status.sourceAtk || 0);
  } else {
    list.push({ ...status });
  }
}

function tickEnemyStatusStartTurn() {
  if (!currentEnemy || !currentEnemy._statusEffects) return false;
  let skipTurn = false;
  for (const st of currentEnemy._statusEffects) {
    if (st.type === 'burn' || st.type === 'bleed') {
      const dmg = Math.max(1, Math.floor((st.sourceAtk || player.atk) * (st.ratio || 0.15)));
      currentEnemy.hp -= dmg;
      combatLog(`${st.type === 'burn' ? '🔥 灼烧' : '🩸 流血'}造成 ${dmg} 点伤害`, st.type === 'burn' ? '#ff8844' : '#ff6688');
      if (currentEnemy.hp <= 0) {
        currentEnemy.hp = 0;
        combatLog(`✅ ${currentEnemy.name} 被${st.type === 'burn' ? '灼烧' : '流血'}击败！`, '#55ff55');
        combatState = COMBAT_STATE.VICTORY;
        onVictory();
        return true;
      }
    } else if (st.type === 'freeze' || st.type === 'stun') {
      skipTurn = true;
      combatLog(`${st.type === 'freeze' ? '🧊 冻结' : '⚡ 麻痹'}生效，${currentEnemy.name} 无法行动！`, st.type === 'freeze' ? '#88ccff' : '#ffdd44');
    }
    st.turns -= 1;
  }
  currentEnemy._statusEffects = currentEnemy._statusEffects.filter(st => st.turns > 0);
  if (skipTurn) {
    if (typeof applyPassiveOnPlayerTurnStart === 'function') applyPassiveOnPlayerTurnStart();
    combatState = COMBAT_STATE.PLAYER_TURN;
    return true;
  }
  return false;
}

function getEnemyAttackMultiplier() {
  if (!currentEnemy || !currentEnemy._statusEffects) return 1;
  let mult = 1;
  for (const st of currentEnemy._statusEffects) {
    if (st.type === 'weaken') mult *= Math.max(0.25, 1 - (st.ratio || 0.15));
  }
  return mult;
}

function getPlayerGuardMultiplier() {
  if (!player || !player._statusEffects) return 1;
  let mult = 1;
  for (const st of player._statusEffects) {
    if (st.type === 'guard') mult *= Math.max(0.2, 1 - (st.ratio || 0.2));
  }
  return mult;
}

function getEnemyDefenseMultiplier() {
  if (!currentEnemy || !currentEnemy._statusEffects) return 1;
  let mult = 1;
  for (const st of currentEnemy._statusEffects) {
    if (st.type === 'defBreak') mult *= Math.max(0.25, 1 - (st.ratio || 0.15));
  }
  return mult;
}

function tickPlayerStatusesAfterHit() {
  if (!player || !player._statusEffects) return;
  for (const st of player._statusEffects) if (st.type === 'guard') st.turns -= 1;
  player._statusEffects = player._statusEffects.filter(st => st.turns > 0);
}

function getPassiveCritBonus() { return sumLearnedEffect('critBonusPassive'); }
function getPassiveArmorPierce() { return sumLearnedEffect('armorPiercePassive'); }
function getPassiveBurnAmp() { return sumLearnedEffect('burnAmp'); }

function applySkillEffects(skill, totalDamage, killed) {
  for (const eff of skill.effects || []) {
    switch (eff.type) {
      case 'burn': {
        const ratio = (eff.ratio || 0.15) * (1 + getPassiveBurnAmp());
        addCombatStatus(currentEnemy, { type: 'burn', turns: eff.turns || 2, ratio, sourceAtk: player.atk });
        combatLog(`🔥 ${currentEnemy.name} 被灼烧 ${eff.turns || 2} 回合`, '#ff8844');
        break;
      }
      case 'bleed':
        addCombatStatus(currentEnemy, { type: 'bleed', turns: eff.turns || 2, ratio: eff.ratio || 0.12, sourceAtk: player.atk });
        combatLog(`🩸 ${currentEnemy.name} 留下剑痕，持续流血`, '#ff6688');
        break;
      case 'defBreak':
        addCombatStatus(currentEnemy, { type: 'defBreak', turns: eff.turns || 2, ratio: eff.ratio || 0.15 });
        combatLog(`🗡️ ${currentEnemy.name} 护甲被撕裂`, '#ddddff');
        break;
      case 'weaken':
        addCombatStatus(currentEnemy, { type: 'weaken', turns: eff.turns || 2, ratio: eff.ratio || 0.15 });
        combatLog(`💧 ${currentEnemy.name} 攻击被削弱`, '#88ccff');
        break;
      case 'freeze':
        if (Math.random() < (eff.chance ?? 1)) {
          addCombatStatus(currentEnemy, { type: 'freeze', turns: eff.turns || 1 });
          combatLog(`🧊 ${currentEnemy.name} 被冻结！`, '#88ccff');
        }
        break;
      case 'stunChance':
        if (Math.random() < (eff.chance ?? 0.25)) {
          addCombatStatus(currentEnemy, { type: 'stun', turns: eff.turns || 1 });
          combatLog(`⚡ ${currentEnemy.name} 被麻痹！`, '#ffdd44');
        }
        break;
      case 'healSelf': {
        const heal = Math.max(1, Math.floor(player.maxHp * (eff.ratio || 0.15)));
        const before = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        combatLog(`🌿 回春 ${player.hp - before} 点生命`, '#55ff99');
        break;
      }
      case 'guard':
        addCombatStatus(player, { type: 'guard', turns: eff.turns || 2, ratio: eff.ratio || 0.25 });
        combatLog(`🛡️ 护体减伤 ${Math.round((eff.ratio || 0.25) * 100)}%`, '#aaddff');
        break;
      case 'splash':
        splashDamageOtherMonsters(eff, totalDamage, skill.treeColor);
        break;
      case 'execute': {
        const cap = currentEnemy.isBoss ? Math.floor(player.atk * (eff.bossCapAtkRatio || 1.5)) : Infinity;
        const extra = Math.max(1, Math.min(cap, Math.floor(currentEnemy.hp * (eff.ratio || 0.1))));
        currentEnemy.hp -= extra;
        combatLog(`☯️ 天劫追伤 ${extra}`, '#ffdd44');
        break;
      }
      case 'shockOnCrit':
        if (skill._lastCrit) {
          addCombatStatus(currentEnemy, { type: 'weaken', turns: eff.turns || 2, ratio: eff.ratio || 0.2 });
          combatLog('⚡ 暴雷震慑，敌攻下降', '#ffdd44');
        }
        break;
      case 'refundOnKill':
        break;
    }
  }
}

function splashDamageOtherMonsters(effect, totalDamage, color) {
  if (!dungeon || !dungeon._monsters || dungeon._monsters.size <= 1) return;
  let left = effect.count || 2;
  const splashDmg = Math.max(1, Math.floor(totalDamage * (effect.ratio || 0.35)));
  for (const [key, mon] of dungeon._monsters.entries()) {
    if (left <= 0) break;
    if (mon === currentEnemy || (mon.x === currentEnemy.x && mon.y === currentEnemy.y)) continue;
    mon.hp -= splashDmg;
    const wx = mon.x * CELL_SIZE + CELL_SIZE / 2;
    const wy = mon.y * CELL_SIZE + CELL_SIZE / 2;
    spawnSkillEffect(wx, wy, color || '#ff8844');
    if (mon.hp <= 0) {
      mon.hp = 0;
      dungeon.grid[mon.y][mon.x] = TILE.FLOOR;
      dungeon._monsters.delete(key);
    }
    left--;
  }
  combatLog(`☄️ 火雨波及 ${effect.count - left} 个目标，各 ${splashDmg} 伤害`, color || '#ff8844');
}

function applyPassiveAfterPlayerHit(damage, crit) {
  if (!currentEnemy || currentEnemy.hp <= 0) return;
  for (const skill of getLearnedSkillDefinitions()) {
    for (const eff of skill.effects || []) {
      if (eff.type === 'critWeakenChance' && crit && Math.random() < (eff.chance || 0.35)) {
        addCombatStatus(currentEnemy, { type: 'weaken', turns: eff.turns || 2, ratio: eff.ratio || 0.15 });
        combatLog(`🔆 ${skill.name}触发，敌攻下降`, '#ffdd44');
      }
    }
  }
}

function applyPassiveOnPlayerTurnStart() {
  for (const skill of getLearnedSkillDefinitions('trigger')) {
    for (const eff of skill.effects || []) {
      if (eff.type === 'turnMpRegen') {
        const gain = Math.max(1, Math.floor(player.maxMp * (eff.ratio || 0.03)));
        const before = player.mp;
        player.mp = Math.min(player.maxMp, player.mp + gain);
        if (player.mp > before) combatLog(`🌙 ${skill.name}恢复 ${player.mp - before} 灵力`, '#88ccff');
      }
    }
  }
}

function applyPassiveOnCombatStart() {
  player._combatTriggers = {};
}

function applyPassiveAfterEnemyHit(damage) {
  for (const skill of getLearnedSkillDefinitions('trigger')) {
    for (const eff of skill.effects || []) {
      if (eff.type === 'lowHpHeal' && !player._combatTriggers?.lowHpHeal && player.hp > 0 && player.hp / player.maxHp <= (eff.threshold || 0.3)) {
        if (!player._combatTriggers) player._combatTriggers = {};
        player._combatTriggers.lowHpHeal = true;
        const heal = Math.max(1, Math.floor(player.maxHp * (eff.healRatio || 0.15)));
        const before = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        if (eff.guardRatio) addCombatStatus(player, { type: 'guard', turns: eff.turns || 1, ratio: eff.guardRatio });
        combatLog(`🌋 ${skill.name}触发，恢复 ${player.hp - before} 生命`, '#ff8844');
      }
    }
  }
}

function applyPassiveOnVictory() {
  for (const skill of getLearnedSkillDefinitions('trigger')) {
    for (const eff of skill.effects || []) {
      if (eff.type === 'victoryRecover') {
        const hpGain = Math.max(1, Math.floor(player.maxHp * (eff.hpRatio || 0)));
        const mpGain = Math.max(1, Math.floor(player.maxMp * (eff.mpRatio || 0)));
        const hpBefore = player.hp, mpBefore = player.mp;
        player.hp = Math.min(player.maxHp, player.hp + hpGain);
        player.mp = Math.min(player.maxMp, player.mp + mpGain);
        combatLog(`✨ ${skill.name}回元：生命+${player.hp - hpBefore} 灵力+${player.mp - mpBefore}`, '#ddddff');
      }
    }
  }
}

// ─── Use a skill in combat ───
function playerUseSkill(skillIndex) {
  if (combatState !== COMBAT_STATE.PLAYER_TURN) return;
  const skills = getCombatSkills();
  if (skillIndex < 0 || skillIndex >= skills.length) return;
  const skill = skills[skillIndex];
  if (player.mp < skill.mpCost) {
    combatLog('灵力不足！', '#ff4444');
    return;
  }

  player.mp -= skill.mpCost;
  const hits = Math.max(1, skill.hits || 1);
  const pierce = Math.min(0.85, (skill.armorPierce || 0) + getPassiveArmorPierce());
  const defMult = typeof getEnemyDefenseMultiplier === 'function' ? getEnemyDefenseMultiplier() : 1;
  const effectiveDef = Math.max(0, Math.floor(currentEnemy.def * defMult * (1 - pierce)));
  let totalDamage = 0;
  let anyCrit = false;
  const hitDamages = [];
  for (let i = 0; i < hits; i++) {
    const perHitMult = skill.dmgMult / hits;
    const baseDmg = Math.max(1, Math.floor(player.atk * perHitMult - effectiveDef));
    const crit = Math.random() < (0.15 + (skill.critBonus || 0) + getPassiveCritBonus());
    anyCrit = anyCrit || crit;
    const variance = Math.floor((Math.random() - 0.5) * 6);
    const dmg = crit ? Math.floor(baseDmg * 2) : Math.max(1, baseDmg + variance);
    currentEnemy.hp -= dmg;
    totalDamage += dmg;
    hitDamages.push(dmg);
  }
  skill._lastCrit = anyCrit;

  const detail = hits > 1 ? `（${hitDamages.join('+')}）` : '';
  combatLog(`你使用【${skill.name}】，造成 ${totalDamage} 点伤害${detail}${anyCrit ? ' 💥暴击！' : ''} (-${skill.mpCost} 灵力)`, skill.treeColor);

  const wx = currentEnemy.x * CELL_SIZE + CELL_SIZE / 2;
  const wy = currentEnemy.y * CELL_SIZE + CELL_SIZE / 2;
  spawnSkillEffect(wx, wy, skill.treeColor);
  if (anyCrit) sfxCrit(); else sfxAttack();

  applyPassiveAfterPlayerHit(totalDamage, anyCrit);
  let killed = currentEnemy.hp <= 0;
  applySkillEffects(skill, totalDamage, killed);
  killed = currentEnemy.hp <= 0;

  if (killed) {
    currentEnemy.hp = 0;
    const refundEffect = (skill.effects || []).find(e => e.type === 'refundOnKill');
    if (refundEffect) {
      const refund = Math.floor(skill.mpCost * (refundEffect.ratio || 0.4));
      player.mp = Math.min(player.maxMp, player.mp + refund);
      combatLog(`🌌 剑意回流，返还 ${refund} 灵力`, '#ddddff');
    }
    if (typeof applyPassiveOnVictory === 'function') applyPassiveOnVictory();
    combatLog(`✅ 你击败了 ${currentEnemy.name}！`, '#55ff55');
    combatState = COMBAT_STATE.VICTORY;
    onVictory();
    return;
  }

  combatState = COMBAT_STATE.ENEMY_TURN;
  setTimeout(enemyAttack, 500);
}

// ─── Breakthrough ───
function checkBreakthrough() {
  if (player.realmIndex >= REALMS.length - 1) return;
  if (player.xp >= player.realm.xpNeeded) {
    breakthroughQueue = true;
    if (typeof openBreakthroughPanel === 'function') openBreakthroughPanel();
    else showBreakthroughUI = true;
  }
}

// ─── Execute breakthrough ───
function doBreakthrough() {
  if (!breakthroughQueue) return;
  const success = Math.random() < 0.8;
  if (success) {
    player.xp -= player.realm.xpNeeded;
    player.realmIndex++;
    player.recalcStats();
    availableSkillPoints += 2;
    showMessage(`🌟 突破成功！你已踏入【${player.realm.name}】！获得 2 点技能点`, '#ffdd44');
    const bx = player.x * CELL_SIZE + CELL_SIZE / 2;
    const by = player.y * CELL_SIZE + CELL_SIZE / 2;
    spawnBreakthroughEffect(bx, by);
    sfxBreakthrough();
    if (typeof closeBreakthroughPanel === 'function') closeBreakthroughPanel();
    else showBreakthroughUI = false;
    breakthroughQueue = false;
    autoSave();
  } else {
    player.xp = Math.floor(player.realm.xpNeeded * 0.6);
    showMessage('💢 渡劫失败，根基受损，继续修炼吧...', '#ff4444');
    if (typeof closeBreakthroughPanel === 'function') closeBreakthroughPanel();
    else showBreakthroughUI = false;
    breakthroughQueue = false;
  }
}

// ─── Allocate attribute point ───
function allocateAttr(attr) {
  if (availableSkillPoints <= 0) return false;
  switch (attr) {
    case 'atk': player.baseAtk += 3; break;
    case 'def': player.baseDef += 2; break;
    case 'hp': player.baseHp += 20; break;
    case 'mp': player.baseMp += 10; break;
    default: return false;
  }
  availableSkillPoints--;
  player.recalcStats();
  showMessage(`属性提升！剩余技能点: ${availableSkillPoints}`, '#aaddff');
  autoSave();
  return true;
}
