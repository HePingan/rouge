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
  wood: {
    name: '🌿 木系功法',
    color: '#55cc88',
    skills: [
      {
        name: '青木藤缚', icon: '🌿', kind: 'active', mpCost: 11, dmgMult: 1.18,
        desc: '灵藤缠绕妖物，刺入经络削弱攻势。', unlockRealm: 0,
        effectText: '主动：造成伤害，并使敌人攻击降低 16% 2 回合，同时留下 2 回合藤刺流血。',
        effects: [{ type: 'weaken', turns: 2, ratio: 0.16 }, { type: 'bleed', turns: 2, ratio: 0.1 }],
      },
      {
        name: '回春诀', icon: '🍃', kind: 'active', mpCost: 18, dmgMult: 1.05,
        desc: '以木灵生机护住经脉，攻守之间回补自身。', unlockRealm: 2,
        effectText: '主动：造成伤害，恢复 16% 最大生命，并获得 2 回合生机护盾。',
        effects: [{ type: 'healSelf', ratio: 0.16 }, { type: 'guard', turns: 2, ratio: 0.24 }],
      },
      {
        name: '万木成林', icon: '🌳', kind: 'active', mpCost: 34, dmgMult: 1.55,
        desc: '木灵化林，枝叶同时压制周围妖物。', unlockRealm: 4,
        effectText: '主动：造成伤害并削弱敌人；木灵扩散额外波及本层最多 2 个其它妖物。',
        effects: [{ type: 'weaken', turns: 3, ratio: 0.22 }, { type: 'splash', count: 2, ratio: 0.32 }],
      },
      {
        name: '木灵体', icon: '🌱', kind: 'passive', mpCost: 0, dmgMult: 0,
        desc: '筋骨如灵木扎根，生命与防御更稳。', unlockRealm: 1,
        effectText: '被动：最大生命 +10%，防御 +4%。',
        effects: [{ type: 'passiveStat', stat: 'maxHpPct', value: 0.1 }, { type: 'passiveStat', stat: 'defPct', value: 0.04 }],
      },
      {
        name: '生生不息', icon: '🌸', kind: 'trigger', mpCost: 0, dmgMult: 0,
        desc: '木灵循环不绝，战斗轮转与胜利后持续回元。', unlockRealm: 3,
        effectText: '触发：每次重新轮到你行动时恢复 3% 最大灵力；击败敌人时恢复 4% 最大生命。',
        effects: [{ type: 'turnMpRegen', ratio: 0.03 }, { type: 'victoryRecover', hpRatio: 0.04, mpRatio: 0 }],
      },
    ],
  },
  earth: {
    name: '⛰️ 土系功法',
    color: '#c79a48',
    skills: [
      {
        name: '岩突', icon: '🪨', kind: 'active', mpCost: 10, dmgMult: 1.28,
        desc: '地脉突起击碎妖甲，让后续攻势更容易破防。', unlockRealm: 0,
        armorPierce: 0.18,
        effectText: '主动：无视敌人 18% 防御，并使敌人防御降低 15% 2 回合。',
        effects: [{ type: 'defBreak', turns: 2, ratio: 0.15 }],
      },
      {
        name: '磐石护身', icon: '🛡️', kind: 'active', mpCost: 20, dmgMult: 1.1,
        desc: '厚土化甲，反压敌势。', unlockRealm: 2,
        effectText: '主动：造成伤害，获得 3 回合 40% 减伤护盾，并削弱敌人攻击 15%。',
        effects: [{ type: 'guard', turns: 3, ratio: 0.4 }, { type: 'weaken', turns: 2, ratio: 0.15 }],
      },
      {
        name: '山崩地裂', icon: '🏔️', kind: 'active', mpCost: 36, dmgMult: 1.8,
        desc: '引动地脉崩裂，重创并震慑目标。', unlockRealm: 4,
        armorPierce: 0.25,
        effectText: '主动：高额伤害并无视 25% 防御；35% 概率麻痹 1 回合，护甲再降低 25%。',
        effects: [{ type: 'stunChance', chance: 0.35, turns: 1 }, { type: 'defBreak', turns: 3, ratio: 0.25 }],
      },
      {
        name: '厚土根基', icon: '⛰️', kind: 'passive', mpCost: 0, dmgMult: 0,
        desc: '根基如山，血肉与护体灵罡更坚实。', unlockRealm: 1,
        effectText: '被动：最大生命 +12%，防御 +8%。',
        effects: [{ type: 'passiveStat', stat: 'maxHpPct', value: 0.12 }, { type: 'passiveStat', stat: 'defPct', value: 0.08 }],
      },
      {
        name: '反震罡甲', icon: '🟫', kind: 'trigger', mpCost: 0, dmgMult: 0,
        desc: '危急时厚土罡甲自动凝结，扛住下一轮冲击。', unlockRealm: 3,
        effectText: '触发：每场战斗一次，生命低于 35% 时恢复 10% 最大生命，并获得 1 回合 45% 减伤护盾。',
        effects: [{ type: 'lowHpHeal', threshold: 0.35, healRatio: 0.1, guardRatio: 0.45, turns: 1 }],
      },
    ],
  },
};

const SKILL_KIND_LABELS = { active: '主动', passive: '被动', trigger: '触发' };
const SKILL_EFFECT_LABELS = {
  burn: '灼烧', bleed: '流血', splash: '溅射', healSelf: '治疗', guard: '护盾', weaken: '虚弱', defBreak: '破甲', freeze: '冻结', stun: '麻痹',
  shockOnCrit: '暴击震慑', stunChance: '麻痹', execute: '斩杀', refundOnKill: '击杀返灵',
  passiveStat: '属性强化', burnAmp: '灼烧强化', lowHpHeal: '濒死回春', turnMpRegen: '潮汐回灵',
  critBonusPassive: '暴击精通', critWeakenChance: '暴击虚弱', armorPiercePassive: '破甲精通', victoryRecover: '击杀回元',
};

const DAO_FOUNDATIONS = {
  sword: {
    id: 'sword', name: '剑修道基', icon: '⚔️', color: '#d8d8ff',
    desc: '偏向爆发与破甲，适合高攻速清怪与首领斩杀。',
    stats: { atkPct: 0.08, crit: 5, armorPen: 5 },
    skillFocus: ['剑修技能伤害 +8%', '破甲类效果更适配装备词条'],
  },
  spell: {
    id: 'spell', name: '法修道基', icon: '🔮', color: '#b78cff',
    desc: '偏向灵力与术法，适合频繁释放火、水、雷、木、土功法。',
    stats: { maxMpPct: 0.16, fireDmg: 6, lightningDmg: 6, iceDmg: 6 },
    skillFocus: ['主动技能灵力消耗 -8%', '元素伤害词条收益更高'],
  },
  body: {
    id: 'body', name: '体修道基', icon: '🛡️', color: '#8ff0b2',
    desc: '偏向生存与容错，适合稳扎稳打推进深层。',
    stats: { maxHpPct: 0.14, defPct: 0.08, dmgReduce: 5 },
    skillFocus: ['护盾/回复技能收益更稳定', '强化失败保护更有价值'],
  },
};

const REALM_UNLOCKS = {
  1: ['装备强化上限提升到 +8', '背包容量提升到 48 格', '解锁道基选择与装备副词条', '获得悟道点与炼体点'],
  2: ['装备强化上限提升到 +10', '背包容量提升到 60 格', '解锁套装掉落', '神器碎片开始掉落'],
  3: ['装备强化上限提升到 +12', '背包容量提升到 72 格', '解锁神器系统入口', '神器最高可升到 1 阶'],
  4: ['装备强化上限提升到 +15', '背包容量提升到 90 格', '神器最高可升到 3 阶', '终阶功法开放'],
  5: ['装备强化上限提升到 +18', '背包容量提升到 108 格', '解锁神器主动效果', '秘境钥匙开始掉落'],
  6: ['装备强化上限提升到 +21', '背包容量提升到 126 格', '神器最高可升到 6 阶', '灵草秘境·炼器秘境开放'],
  7: ['装备强化上限提升到 +24', '背包容量提升到 148 格', '小天劫开放', '解锁神器第二被动'],
  8: ['装备强化上限提升到 +27', '背包容量提升到 172 格', '三九天劫开放', '六九天劫开放', '神器秘境·天劫秘境开放'],
  9: ['装备强化上限提升到 +30', '背包容量提升到 200 格', '九九天劫开放', '神器最高可升到 12 阶并开放终极效果'],
};

const REALM_ENHANCE_CAPS = [5, 8, 10, 12, 15, 18, 21, 24, 27, 30];
const REALM_SKILL_POINT_REWARDS = [0, 2, 2, 2, 2, 3, 3, 3, 4, 4];
const REALM_STAT_POINT_REWARDS = [0, 3, 3, 3, 3, 4, 4, 4, 5, 5];

function getRealmEnhanceCap(realmIndex = player?.realmIndex || 0) {
  const idx = Math.max(0, Math.min(REALM_ENHANCE_CAPS.length - 1, Number(realmIndex) || 0));
  return REALM_ENHANCE_CAPS[idx] || REALM_ENHANCE_CAPS[0];
}

function getRealmSkillPointReward(realmIndex = player?.realmIndex || 0) {
  const idx = Math.max(0, Math.min(REALM_SKILL_POINT_REWARDS.length - 1, Number(realmIndex) || 0));
  return REALM_SKILL_POINT_REWARDS[idx] || 2;
}

function getRealmStatPointReward(realmIndex = player?.realmIndex || 0) {
  const idx = Math.max(0, Math.min(REALM_STAT_POINT_REWARDS.length - 1, Number(realmIndex) || 0));
  return REALM_STAT_POINT_REWARDS[idx] || 3;
}

function getDoctrineInfo(id = player?.daoFoundation) {
  return id && DAO_FOUNDATIONS[id] ? DAO_FOUNDATIONS[id] : null;
}

function getDoctrineStatBonuses() {
  const info = getDoctrineInfo();
  return info ? { ...(info.stats || {}) } : {};
}

function getBreakthroughPreview() {
  const cur = player?.realm || REALMS[0];
  const next = REALMS[(player?.realmIndex || 0) + 1];
  if (!next) return null;
  const hpNow = Math.floor((player?.baseHp || 100) * cur.hpMult);
  const mpNow = Math.floor((player?.baseMp || 50) * cur.mpMult);
  return {
    hp: Math.floor((player?.baseHp || 100) * next.hpMult) - hpNow,
    mp: Math.floor((player?.baseMp || 50) * next.mpMult) - mpNow,
    atk: (next.atkBonus || 0) - (cur.atkBonus || 0),
    def: (next.defBonus || 0) - (cur.defBonus || 0),
    skillPoints: getRealmSkillPointReward((player?.realmIndex || 0) + 1),
    statPoints: getRealmStatPointReward((player?.realmIndex || 0) + 1),
    unlocks: REALM_UNLOCKS[(player?.realmIndex || 0) + 1] || ['更高境界属性成长'],
  };
}

function getBreakthroughChanceBreakdown() {
  const next = REALMS[(player?.realmIndex || 0) + 1];
  if (!next) return { total: 0, parts: [] };
  const needed = Math.max(1, player?.realm?.xpNeeded || 1);
  const xp = Math.max(0, Number(player?.xp || 0));
  const overflow = Math.min(0.08, Math.max(0, xp - needed) / needed * 0.08);
  const failBonus = Math.min(0.12, Number(player?.breakthroughFails || 0) * 0.04);
  const pillBonus = Math.min(0.16, Number(player?.breakthroughChanceBonus || 0));
  const base = 0.68;
  const parts = [
    { label: '根基基础', value: base },
    { label: '经验溢出', value: overflow },
    { label: '失败补偿', value: failBonus },
  ];
  if (pillBonus > 0) parts.push({ label: '破境丹药力', value: pillBonus });
  const total = Math.max(0.25, Math.min(0.95, parts.reduce((s, p) => s + p.value, 0)));
  return { total, parts };
}

// Player cultivation state
let availableSkillPoints = 0;
let availableStatPoints = 0;
let learnedSkills = [];  // [{ tree: 'fire', index: 0 }, ...]
let showBreakthroughUI = false;
let showSkillTreeUI = false;
let breakthroughQueue = false;  // true when player just leveled up and needs to see breakthrough

function getSkillKind(skill) { return skill.kind || 'active'; }
function isSkillLearned(tree, index) { return learnedSkills.some(s => s.tree === tree && s.index === index); }
function getSkillPrereqs(tree, index) {
  const skill = SKILL_TREES?.[tree]?.skills?.[index];
  if (!skill) return [];
  if (Array.isArray(skill.requires)) return skill.requires;
  // Backward-compatible branch shape for the existing 5-node trees:
  // 0 基础；1 输出进阶；3 核心被动；4 触发/生存；2 终式。
  if (index === 0) return [];
  if (index === 2) return [1, 3];
  return [0];
}
function areSkillPrereqsMet(tree, index) {
  return getSkillPrereqs(tree, index).every(req => isSkillLearned(tree, req));
}
function isSkillRequiredByLearned(tree, index) {
  return learnedSkills.some(s => s.tree === tree && getSkillPrereqs(tree, s.index).includes(index));
}
function getSkillBranchSlot(skill, index) {
  if (index === 0) return 'core';
  if (index === 2) return 'ultimate';
  if ((skill?.kind || 'active') === 'passive') return 'passive';
  if ((skill?.kind || 'active') === 'trigger') return 'trigger';
  return 'offense';
}
function getSkillBranchLabel(slot) {
  return { core: '基础', offense: '输出', passive: '核心', trigger: '触发', ultimate: '终式' }[slot] || '分支';
}

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
  if (!areSkillPrereqsMet(tree, index)) return false;
  learnedSkills.push({ tree, index });
  availableSkillPoints--;
  if (player && typeof player.recalcStats === 'function') player.recalcStats();
  autoSave();
  return true;
}

function unlearnSkill(tree, index) {
  const pos = learnedSkills.findIndex(s => s.tree === tree && s.index === index);
  if (pos < 0) return false;
  if (isSkillRequiredByLearned(tree, index)) return false;
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
  for (const [stat, value] of Object.entries(getDoctrineStatBonuses())) bonuses[stat] = (bonuses[stat] || 0) + value;
  for (const skill of getLearnedSkillDefinitions()) {
    for (const eff of skill.effects || []) {
      if (eff.type === 'passiveStat' && eff.stat) bonuses[eff.stat] = (bonuses[eff.stat] || 0) + (eff.value || 0);
    }
  }
  return bonuses;
}

function getVictoryRecoverValues() {
  let hpRatio = 0;
  let mpRatio = 0;
  for (const skill of getLearnedSkillDefinitions('trigger')) {
    for (const eff of skill.effects || []) {
      if (eff.type === 'victoryRecover') {
        hpRatio += eff.hpRatio || 0;
        mpRatio += eff.mpRatio || 0;
      }
    }
  }
  return { hpRatio, mpRatio };
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

function getPassiveCritBonus() { return sumLearnedEffect('critBonusPassive') + Number(getDoctrineStatBonuses().crit || 0) / 100; }
function getPassiveArmorPierce() { return sumLearnedEffect('armorPiercePassive') + Number(getDoctrineStatBonuses().armorPen || 0) / 100; }
function getPassiveBurnAmp() { return sumLearnedEffect('burnAmp'); }
function getDoctrineSkillDamageBonus(skill) {
  const doctrine = player?.daoFoundation;
  if (doctrine === 'sword' && skill?.tree === 'sword') return 0.08;
  if (doctrine === 'spell' && ['fire','water','thunder','wood','earth'].includes(skill?.tree)) return 0.08;
  return 0;
}
function getDoctrineMpCostMultiplier(skill) {
  return player?.daoFoundation === 'spell' && getSkillKind(skill) === 'active' ? 0.92 : 1;
}

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
        const hpGain = Math.floor(player.maxHp * (eff.hpRatio || 0));
        const mpGain = Math.floor(player.maxMp * (eff.mpRatio || 0));
        const hpBefore = player.hp, mpBefore = player.mp;
        if (hpGain > 0) player.hp = Math.min(player.maxHp, player.hp + hpGain);
        if (mpGain > 0) player.mp = Math.min(player.maxMp, player.mp + mpGain);
        const hpDelta = player.hp - hpBefore;
        const mpDelta = player.mp - mpBefore;
        if (hpDelta > 0 || mpDelta > 0) combatLog(`✨ ${skill.name}回元：生命+${hpDelta} 灵力+${mpDelta}`, '#ddddff');
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
  const actualMpCost = Math.max(0, Math.floor((skill.mpCost || 0) * getDoctrineMpCostMultiplier(skill)));
  if (player.mp < actualMpCost) {
    combatLog('灵力不足！', '#ff4444');
    return;
  }

  player.mp -= actualMpCost;
  const hits = Math.max(1, skill.hits || 1);
  const pierce = Math.min(0.85, (skill.armorPierce || 0) + getPassiveArmorPierce());
  const defMult = typeof getEnemyDefenseMultiplier === 'function' ? getEnemyDefenseMultiplier() : 1;
  const effectiveDef = Math.max(0, Math.floor(currentEnemy.def * defMult * (1 - pierce)));
  let totalDamage = 0;
  let anyCrit = false;
  const hitDamages = [];
  for (let i = 0; i < hits; i++) {
    const perHitMult = (skill.dmgMult * (1 + getDoctrineSkillDamageBonus(skill))) / hits;
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
  combatLog(`你使用【${skill.name}】，造成 ${totalDamage} 点伤害${detail}${anyCrit ? ' 💥暴击！' : ''} (-${actualMpCost} 灵力)`, skill.treeColor);

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
      const refund = Math.floor(actualMpCost * (refundEffect.ratio || 0.4));
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
function doBreakthrough(selectedFoundation = null) {
  if (!breakthroughQueue) return;
  const nextRealm = REALMS[player.realmIndex + 1];
  if (!nextRealm) return;
  const needsFoundation = player.realmIndex === 0 && !player.daoFoundation;
  if (needsFoundation && !DAO_FOUNDATIONS[selectedFoundation]) {
    showMessage('请选择一道基方向后再突破', '#ffdd88');
    return;
  }
  const chanceInfo = getBreakthroughChanceBreakdown();
  const success = Math.random() < chanceInfo.total;
  if (success) {
    player.xp = Math.max(0, player.xp - player.realm.xpNeeded);
    player.realmIndex++;
    if (needsFoundation) player.daoFoundation = selectedFoundation;
    player.breakthroughFails = 0;
    player.breakthroughChanceBonus = 0;
    player.breakthroughProtect = 0;
    player.recalcStats();
    const skillPointReward = getRealmSkillPointReward(player.realmIndex);
    const statPointReward = getRealmStatPointReward(player.realmIndex);
    availableSkillPoints += skillPointReward;
    availableStatPoints += statPointReward;
    const doctrineText = needsFoundation ? ` · 奠定【${DAO_FOUNDATIONS[selectedFoundation].name}】` : '';
    showMessage(`🌟 突破成功！踏入【${player.realm.name}】${doctrineText}，获得 ${skillPointReward} 点悟道点、${statPointReward} 点炼体点`, '#ffdd44');
    const bx = player.x * CELL_SIZE + CELL_SIZE / 2;
    const by = player.y * CELL_SIZE + CELL_SIZE / 2;
    spawnBreakthroughEffect(bx, by);
    sfxBreakthrough();
    if (typeof closeBreakthroughPanel === 'function') closeBreakthroughPanel();
    else showBreakthroughUI = false;
    breakthroughQueue = false;
    autoSave();
  } else {
    player.breakthroughFails = Number(player.breakthroughFails || 0) + 1;
    const protectedFail = Number(player.breakthroughProtect || 0) > 0;
    if (protectedFail) player.breakthroughProtect = Math.max(0, Number(player.breakthroughProtect || 0) - 1);
    player.breakthroughChanceBonus = 0;
    const keepRatio = protectedFail || player.daoFoundation === 'body' ? 0.86 : 0.72;
    player.xp = Math.max(Math.floor(player.realm.xpNeeded * keepRatio), Math.floor(player.xp * keepRatio));
    showMessage(protectedFail ? '🧿 突破失败，但固元丹护住根基，下次成功率提高' : '💢 渡劫失败，保留部分经验并获得下次成功率补偿', '#ff8844');
    if (typeof renderBreakthroughDomPanel === 'function') renderBreakthroughDomPanel();
    autoSave();
  }
}

// ─── Allocate attribute point ───
function allocateAttr(attr) {
  if (availableStatPoints <= 0) return false;
  switch (attr) {
    case 'atk': player.baseAtk += 3; break;
    case 'def': player.baseDef += 2; break;
    case 'hp': player.baseHp += 20; break;
    case 'mp': player.baseMp += 10; break;
    default: return false;
  }
  availableStatPoints--;
  player.recalcStats();
  showMessage(`道基铸成！剩余炼体点: ${availableStatPoints}`, '#aaddff');
  autoSave();
  return true;
}
