// Loot System — Diablo-style random affix equipment generation

const RARITY = {
  COMMON:    { name: '普通', color: '#aaaaaa', affixes: 0, dropWeight: 40 },
  MAGIC:     { name: '魔法', color: '#4499ff', affixes: 1, dropWeight: 30 },
  RARE:      { name: '稀有', color: '#ffdd44', affixes: 2, dropWeight: 18 },
  LEGENDARY: { name: '传说', color: '#ff8822', affixes: 3, dropWeight: 8 },
  MYTHIC:    { name: '神话', color: '#ff3366', affixes: 4, dropWeight: 4 },
};

const EQUIPMENT_SLOT_ORDER = ['weapon', 'helmet', 'armor', 'gloves', 'belt', 'pants', 'boots', 'accessory'];
const SLOTS = EQUIPMENT_SLOT_ORDER;

const PREFIXES = [
  { name: '锋利的',   stat: 'atk',  value: 3,  weight: 10 },
  { name: '坚硬的',   stat: 'def',  value: 2,  weight: 10 },
  { name: '灵动的',   stat: 'dodge', value: 3, weight: 6 },
  { name: '灼热的',   stat: 'fireDmg', value: 5, weight: 5 },
  { name: '寒冰的',   stat: 'iceDmg',  value: 5, weight: 5 },
  { name: '致命的',   stat: 'crit',    value: 3, weight: 4 },
  { name: '厚重的',   stat: 'hp',      value: 15, weight: 8 },
  { name: '清澈的',   stat: 'mp',      value: 10, weight: 6 },
  { name: '毒蛇的',   stat: 'poisonDmg', value: 4, weight: 4 },
  { name: '雷霆的',   stat: 'lightningDmg', value: 4, weight: 4 },
  { name: '血饮的',   stat: 'lifesteal', value: 2, weight: 3 },
  { name: '破甲的',   stat: 'armorPen', value: 2, weight: 4 },
  { name: '疾风的',   stat: 'speed', value: 2, weight: 4 },
  { name: '贪婪的',   stat: 'goldFind', value: 10, weight: 5 },
  { name: '悟道的',   stat: 'xpBonus', value: 8, weight: 5 },
];

const SUFFIXES = [
  { name: '之烈焰',   stat: 'fireDmg',  value: 3,  weight: 8 },
  { name: '之冰霜',   stat: 'iceDmg',   value: 3,  weight: 8 },
  { name: '之猛虎',   stat: 'atk',  value: 2,  weight: 10 },
  { name: '之玄龟',   stat: 'def',  value: 2,  weight: 10 },
  { name: '之灵猴',   stat: 'dodge', value: 2, weight: 6 },
  { name: '之暗影',   stat: 'poisonDmg', value: 3, weight: 5 },
  { name: '之惊雷',   stat: 'lightningDmg', value: 3, weight: 5 },
  { name: '之凤凰',   stat: 'hpRegen',  value: 2,  weight: 4 },
  { name: '之灵泉',   stat: 'mpRegen',  value: 2,  weight: 4 },
  { name: '之追魂',   stat: 'crit',     value: 2,  weight: 4 },
  { name: '之守护',   stat: 'allRes',   value: 3,  weight: 5 },
  { name: '之先知',   stat: 'xpBonus',  value: 5,  weight: 4 },
  { name: '之寻宝',   stat: 'goldFind', value: 8,  weight: 5 },
  { name: '之不朽',   stat: 'maxHp',    value: 20, weight: 6 },
  { name: '之浩瀚',   stat: 'maxMp',    value: 15, weight: 5 },
];

const SPECIAL_AFFIXES = [
  { name: '噬魂', desc: '命中回复生命', stat: 'lifesteal', value: 2, minRarity: '魔法', weight: 5 },
  { name: '穿云', desc: '忽视部分防御', stat: 'armorPen', value: 3, minRarity: '魔法', weight: 5 },
  { name: '凝神', desc: '击杀后回复灵力', stat: 'killMpRestore', value: 4, minRarity: '稀有', weight: 4 },
  { name: '反震', desc: '受击反弹伤害', stat: 'thorns', value: 3, minRarity: '稀有', weight: 4 },
  { name: '破势', desc: '对首领伤害提升', stat: 'bossDmg', value: 5, minRarity: '稀有', weight: 3 },
  { name: '回春', desc: '每回合恢复生命', stat: 'hpRegen', value: 3, minRarity: '魔法', weight: 5 },
  { name: '聚灵', desc: '每回合恢复灵力', stat: 'mpRegen', value: 3, minRarity: '魔法', weight: 5 },
  { name: '连击', desc: '普通攻击有概率追加一击', stat: 'extraHitChance', value: 4, minRarity: '传说', weight: 2 },
  { name: '镇魂', desc: '命中概率降低敌方攻击', stat: 'weakenOnHit', value: 5, minRarity: '传说', weight: 2 },
  { name: '神佑', desc: '低生命时减免伤害', stat: 'lowHpGuard', value: 5, minRarity: '神话', weight: 1 },
];

const RARITY_RANK = { '普通': 1, '魔法': 2, '稀有': 3, '传说': 4, '神话': 5 };
const SET_DROP_CHANCE = { '普通': 0.06, '魔法': 0.12, '稀有': 0.2, '传说': 0.34, '神话': 0.48 };

const EQUIPMENT_SETS = {
  flame: {
    name: '焚天', icon: '🔥', color: '#ff8844', weight: 24,
    prefixes: ['赤焰', '焚天', '炎魂', '流火'],
    bonuses: [
      { count: 2, label: '火伤 +12', stats: { fireDmg: 12 } },
      { count: 4, label: '攻击 +10%，命中附加灼烧', stats: { atkPct: 0.10 }, effects: { burnOnHit: 8 } },
      { count: 6, label: '暴击 +8%，首领伤害 +12%', stats: { crit: 8, bossDmg: 12 } },
      { count: 8, label: '焚天真火：普通攻击额外造成 25% 火焰伤害', effects: { flameBurst: 0.25 } },
    ],
  },
  frost: {
    name: '玄冰', icon: '❄️', color: '#88ccff', weight: 22,
    prefixes: ['玄冰', '霜华', '寒魄', '凝霜'],
    bonuses: [
      { count: 2, label: '防御 +8，全抗 +8', stats: { def: 8, allRes: 8 } },
      { count: 4, label: '受击伤害 -10%，命中概率冻结', stats: { dmgReduce: 10 }, effects: { freezeOnHit: 7 } },
      { count: 6, label: '生命上限 +12%，闪避 +6%', stats: { maxHpPct: 0.12, dodge: 6 } },
      { count: 8, label: '玄冰护体：低生命时伤害再减免 25%', effects: { frostBarrier: 0.25 } },
    ],
  },
  thunder: {
    name: '雷罚', icon: '⚡', color: '#d9c3ff', weight: 20,
    prefixes: ['雷罚', '紫电', '惊雷', '奔雷'],
    bonuses: [
      { count: 2, label: '雷伤 +10，速度 +4', stats: { lightningDmg: 10, speed: 4 } },
      { count: 4, label: '暴击 +10%，暴击削弱敌人', stats: { crit: 10 }, effects: { critWeaken: 0.18 } },
      { count: 6, label: '普通攻击 15% 追加雷击', stats: { extraHitChance: 15 } },
      { count: 8, label: '雷罚天引：普通攻击后 25% 再触发一次半伤害连击', effects: { thunderChain: 0.25 } },
    ],
  },
  shadow: {
    name: '幽影', icon: '🌑', color: '#aa88ff', weight: 18,
    prefixes: ['幽影', '夜隐', '鬼魅', '无声'],
    bonuses: [
      { count: 2, label: '闪避 +8%，吸血 +3%', stats: { dodge: 8, lifesteal: 3 } },
      { count: 4, label: '破甲 +10%，毒伤 +8', stats: { armorPen: 10, poisonDmg: 8 } },
      { count: 6, label: '攻击 +8%，命中概率虚弱敌人', stats: { atkPct: 0.08 }, effects: { weakenOnHit: 10 } },
      { count: 8, label: '幽影刺杀：闪避后下次攻击伤害 +40%', effects: { shadowCounter: 0.40 } },
    ],
  },
  immortal: {
    name: '长生', icon: '🌿', color: '#90ee90', weight: 16,
    prefixes: ['长生', '青木', '灵根', '回春'],
    bonuses: [
      { count: 2, label: '生命上限 +35，生命恢复 +4', stats: { maxHp: 35, hpRegen: 4 } },
      { count: 4, label: '灵力上限 +25，每回合回灵 +3', stats: { maxMp: 25, mpRegen: 3 } },
      { count: 6, label: '经验 +12%，灵石 +12%', stats: { xpBonus: 12, goldFind: 12 } },
      { count: 8, label: '长生道体：击杀恢复 12% 生命与灵力', effects: { victoryRecoverPct: 0.12 } },
    ],
  },
};

function rarityRank(name) {
  return RARITY_RANK[name] || 1;
}

function getEquipmentSet(setId) {
  return EQUIPMENT_SETS?.[setId] || null;
}

function equipmentSetCounts(equipment) {
  const counts = {};
  for (const item of Object.values(equipment || {})) {
    if (!item?.setId) continue;
    counts[item.setId] = (counts[item.setId] || 0) + 1;
  }
  return counts;
}

function equipmentStatFromItems(equipment, stat) {
  return Object.values(equipment || {}).reduce((sum, item) => sum + Number(item?.stats?.[stat] || 0), 0);
}

function getEquipmentAbility(stat) {
  const itemValue = equipmentStatFromItems(player?.equipment, stat);
  const setValue = Number(player?._equipmentSetEffects?.[stat] || 0);
  return itemValue + setValue;
}

function getActiveSetBonuses(equipment) {
  const counts = equipmentSetCounts(equipment);
  const active = [];
  for (const [setId, count] of Object.entries(counts)) {
    const set = getEquipmentSet(setId);
    if (!set) continue;
    for (const bonus of set.bonuses || []) {
      active.push({ ...bonus, setId, setName: set.name, setIcon: set.icon, setColor: set.color, active: count >= bonus.count, owned: count });
    }
  }
  return active;
}

function getEquipmentSetBonuses(equipment) {
  const totals = { stats: {}, effects: {}, active: getActiveSetBonuses(equipment) };
  for (const bonus of totals.active) {
    if (!bonus.active) continue;
    for (const [stat, value] of Object.entries(bonus.stats || {})) totals.stats[stat] = (totals.stats[stat] || 0) + value;
    for (const [effect, value] of Object.entries(bonus.effects || {})) totals.effects[effect] = Math.max(Number(totals.effects[effect] || 0), Number(value || 0));
  }
  return totals;
}

function rollEquipmentSet(rarityName, floorLevel = 1) {
  const chance = (SET_DROP_CHANCE[rarityName] || 0.08) + Math.min(0.12, Math.max(0, floorLevel - 1) * 0.004);
  if (Math.random() > chance) return null;
  return weightedPick(Object.entries(EQUIPMENT_SETS).map(([id, set]) => ({ id, ...set })), 'weight');
}

const SLOT_NAMES = {
  weapon: { name: '武器', baseStat: 'atk', baseRange: [5, 15], icon: '⚔️', subTypes: [
    { name: '长剑', icon: '⚔️' }, { name: '短刃', icon: '🗡️' }, { name: '法杖', icon: '🪄' }, { name: '长弓', icon: '🏹' },
    { name: '战锤', icon: '🔨' }, { name: '战戟', icon: '🔱' }, { name: '拳套', icon: '🥊' }, { name: '灵符', icon: '📜' },
  ] },
  helmet: { name: '头盔', baseStat: 'maxHp', baseRange: [8, 24], icon: '⛑️', subTypes: [
    { name: '战盔', icon: '⛑️' }, { name: '灵冠', icon: '👑' }, { name: '斗笠', icon: '👒' }, { name: '法帽', icon: '🎩' },
  ] },
  armor:  { name: '护甲', baseStat: 'def', baseRange: [3, 10], icon: '🛡️', subTypes: [
    { name: '护甲', icon: '🛡️' }, { name: '战袍', icon: '🥋' }, { name: '法衣', icon: '👘' }, { name: '披风', icon: '🧥' },
  ] },
  gloves: { name: '护手', baseStat: 'crit', baseRange: [1, 4], icon: '🧤', subTypes: [
    { name: '护手', icon: '🧤' }, { name: '拳套', icon: '🥊' }, { name: '腕甲', icon: '⌚' }, { name: '灵镯', icon: '📿' },
  ] },
  belt: { name: '腰带', baseStat: 'hp', baseRange: [10, 28], icon: '🪢', subTypes: [
    { name: '腰带', icon: '🪢' }, { name: '玉带', icon: '🎗️' }, { name: '束甲', icon: '🔗' }, { name: '符囊', icon: '👝' },
  ] },
  pants: { name: '护腿', baseStat: 'def', baseRange: [2, 8], icon: '👖', subTypes: [
    { name: '护腿', icon: '👖' }, { name: '腿甲', icon: '🦿' }, { name: '灵裤', icon: '👖' }, { name: '行者裤', icon: '🥾' },
  ] },
  boots: { name: '鞋子', baseStat: 'speed', baseRange: [1, 4], icon: '🥾', subTypes: [
    { name: '鞋子', icon: '🥾' }, { name: '战靴', icon: '👢' }, { name: '云履', icon: '👞' }, { name: '踏风靴', icon: '🪽' },
  ] },
  accessory: { name: '饰品', baseStat: 'mp', baseRange: [8, 24], icon: '💍', subTypes: [
    { name: '戒指', icon: '💍' }, { name: '项链', icon: '📿' }, { name: '灵珠', icon: '🔮' }, { name: '护符', icon: '🪬' },
  ] },
};

function equipmentSlotKeys() {
  return EQUIPMENT_SLOT_ORDER.slice();
}

const MAX_EQUIPMENT_ENHANCE_LEVEL = 15;
function getCurrentEquipmentEnhanceCap() {
  return typeof getRealmEnhanceCap === 'function' ? getRealmEnhanceCap(player?.realmIndex || 0) : MAX_EQUIPMENT_ENHANCE_LEVEL;
}
const EQUIPMENT_ENHANCE_PERCENT_STATS = new Set(['crit', 'dodge', 'lifesteal', 'armorPen', 'goldFind', 'xpBonus', 'bossDmg', 'extraHitChance', 'dmgReduce', 'allRes']);

function getEquipmentEnhanceLevel(item) {
  return Math.max(0, Math.min(getCurrentEquipmentEnhanceCap(), Number(item?.enhanceLevel) || 0));
}

function getEquipmentEnhanceStat(item) {
  return item?.baseStat || SLOT_NAMES?.[item?.slot]?.baseStat || Object.keys(item?.baseStats || item?.stats || {})[0] || 'atk';
}

function ensureEquipmentBaseStats(item) {
  if (!item) return {};
  if (!item.baseStats || typeof item.baseStats !== 'object') {
    const stats = { ...(item.stats || {}) };
    const oldBonus = item.enhanceBonus || {};
    for (const [stat, value] of Object.entries(oldBonus)) {
      stats[stat] = Number(stats[stat] || 0) - Number(value || 0);
      if (stats[stat] === 0) delete stats[stat];
    }
    item.baseStats = stats;
  }
  return item.baseStats;
}

function equipmentEnhanceBonusValue(item, level = getEquipmentEnhanceLevel(item)) {
  const stat = getEquipmentEnhanceStat(item);
  const baseStats = ensureEquipmentBaseStats(item);
  const base = Math.max(1, Number(item?.baseValue) || Number(baseStats?.[stat]) || Number(item?.stats?.[stat]) || 1);
  const lv = Math.max(0, Math.min(getCurrentEquipmentEnhanceCap(), Number(level) || 0));
  if (lv <= 0) return 0;
  if (EQUIPMENT_ENHANCE_PERCENT_STATS.has(stat) || stat === 'speed') {
    return Math.max(1, Math.floor(lv * 0.55 + base * lv * 0.08));
  }
  const scale = lv <= 5 ? lv * 0.14 : lv <= 10 ? 0.70 + (lv - 5) * 0.18 : 1.60 + (lv - 10) * 0.24;
  return Math.max(lv, Math.floor(base * scale));
}

function rebuildEquipmentStats(item) {
  if (!item) return item;
  const baseStats = ensureEquipmentBaseStats(item);
  const stats = { ...baseStats };
  const level = getEquipmentEnhanceLevel(item);
  const stat = getEquipmentEnhanceStat(item);
  const bonusValue = equipmentEnhanceBonusValue(item, level);
  item.enhanceLevel = level;
  item.enhanceBonus = bonusValue > 0 ? { [stat]: bonusValue } : {};
  if (bonusValue > 0) stats[stat] = Number(stats[stat] || 0) + bonusValue;
  item.stats = stats;
  return item;
}

function getEquipmentEnhanceCost(item, nextLevel = getEquipmentEnhanceLevel(item) + 1) {
  const lv = Math.max(1, Math.min(getCurrentEquipmentEnhanceCap(), Number(nextLevel) || 1));
  const rank = rarityRank(item?.rarity || '普通');
  const floor = Math.max(1, Number(item?.floorLevel) || 1);
  const cost = {
    spiritStones: Math.floor((18 + lv * 10 + floor * 2) * (1 + rank * 0.32)),
    materials: {
      stoneMarrow: Math.max(1, Math.ceil(lv / 2) + rank - 1 + Math.floor(floor / 10)),
    },
  };
  if (lv >= 4) cost.materials.ginseng = Math.max(1, Math.floor((lv - 1) / 4));
  if (lv >= 7) cost.materials.soulJade = Math.max(1, Math.floor((lv - 4) / 3));
  if (lv >= 11) cost.materials.starDust = Math.max(1, Math.ceil((lv - 10) / 3));
  return cost;
}

function getEquipmentEnhanceChance(currentLevel = 0) {
  const next = Math.max(1, Number(currentLevel || 0) + 1);
  if (next <= 5) return 1;
  if (next <= 10) return Math.max(0.55, 0.75 - (next - 6) * 0.05);
  return Math.max(0.34, 0.50 - (next - 11) * 0.04);
}

function canPayEquipmentEnhanceCost(cost, materials, playerObj) {
  if (!cost) return false;
  if (Number(playerObj?.spiritStones || 0) < Number(cost.spiritStones || 0)) return false;
  for (const [id, count] of Object.entries(cost.materials || {})) {
    if (Number(materials?.[id] || 0) < Number(count || 0)) return false;
  }
  return true;
}

function payEquipmentEnhanceCost(cost, materials, playerObj) {
  if (!canPayEquipmentEnhanceCost(cost, materials, playerObj)) return false;
  playerObj.spiritStones = Math.max(0, Number(playerObj.spiritStones || 0) - Number(cost.spiritStones || 0));
  for (const [id, count] of Object.entries(cost.materials || {})) {
    materials[id] = Math.max(0, Number(materials[id] || 0) - Number(count || 0));
  }
  return true;
}

function enhanceEquipment(item, materials, playerObj, rng = Math.random) {
  if (!item) return { ok: false, reason: 'no_item' };
  rebuildEquipmentStats(item);
  const beforeLevel = getEquipmentEnhanceLevel(item);
  const maxCap = getCurrentEquipmentEnhanceCap();
  if (beforeLevel >= maxCap) return { ok: false, reason: 'max_level', beforeLevel, afterLevel: beforeLevel, maxCap };
  const nextLevel = beforeLevel + 1;
  const cost = getEquipmentEnhanceCost(item, nextLevel);
  if (!canPayEquipmentEnhanceCost(cost, materials, playerObj)) return { ok: false, reason: 'not_enough', beforeLevel, afterLevel: beforeLevel, cost };
  payEquipmentEnhanceCost(cost, materials, playerObj);
  const chance = getEquipmentEnhanceChance(beforeLevel);
  const success = rng() < chance;
  let afterLevel = beforeLevel;
  if (success) {
    afterLevel = nextLevel;
  } else if (nextLevel >= 11) {
    const protectedFail = playerObj?.daoFoundation === 'body' && Math.random() < 0.35;
    afterLevel = protectedFail ? beforeLevel : Math.max(10, beforeLevel - 1);
  }
  item.enhanceLevel = afterLevel;
  rebuildEquipmentStats(item);
  return { ok: true, success, beforeLevel, afterLevel, nextLevel, chance, cost, degraded: afterLevel < beforeLevel };
}

// Weighted random pick — handles both arrays and objects
function weightedPick(items, weightKey = 'weight') {
  // If items is a plain object (like RARITY), convert to array
  if (items && typeof items === 'object' && !Array.isArray(items)) {
    items = Object.values(items);
  }
  // Guard against empty or invalid input
  if (!items || !Array.isArray(items) || items.length === 0) return null;
  const total = items.reduce((s, i) => s + (i[weightKey] || 0), 0);
  if (total <= 0) return items[0];
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= (item[weightKey] || 0);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function generateEquipment(floorLevel = 1) {
  // Pick rarity
  const rarity = weightedPick(RARITY, 'dropWeight');
  // Pick slot
  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const slotInfo = SLOT_NAMES[slot];

  // Base stat
  const [minBase, maxBase] = slotInfo.baseRange;
  const scale = 1 + (floorLevel - 1) * 0.2;
  const baseValue = Math.floor((minBase + Math.random() * (maxBase - minBase + 1)) * scale);

  // Affixes
  const affixes = [];
  const usedStats = new Set();

  // Pick random prefixes (without duplicate stat)
  const availablePrefixes = PREFIXES.filter(p => !usedStats.has(p.stat));
  for (let i = 0; i < rarity.affixes && availablePrefixes.length > 0; i++) {
    const affix = weightedPick(availablePrefixes);
    const scaledValue = Math.floor(affix.value * (1 + (floorLevel - 1) * 0.15));
    affixes.push({ type: 'prefix', name: affix.name, stat: affix.stat, value: scaledValue });
    usedStats.add(affix.stat);
    availablePrefixes.splice(availablePrefixes.indexOf(affix), 1);
  }

  // Pick random suffixes
  const availableSuffixes = SUFFIXES.filter(s => !usedStats.has(s.stat));
  for (let i = 0; i < rarity.affixes && availableSuffixes.length > 0; i++) {
    const affix = weightedPick(availableSuffixes);
    const scaledValue = Math.floor(affix.value * (1 + (floorLevel - 1) * 0.15));
    affixes.push({ type: 'suffix', name: affix.name, stat: affix.stat, value: scaledValue });
    usedStats.add(affix.stat);
    availableSuffixes.splice(availableSuffixes.indexOf(affix), 1);
  }

  // Special affixes: ability-like entries, mostly on high rarity equipment
  const specialAffixes = [];
  const specialSlots = (player?.realmIndex || 0) >= 1 ? Math.max(0, rarityRank(rarity.name) - 2) : 0;
  const availableSpecials = SPECIAL_AFFIXES.filter(a => rarityRank(rarity.name) >= rarityRank(a.minRarity) && !usedStats.has(a.stat));
  for (let i = 0; i < specialSlots && availableSpecials.length > 0; i++) {
    if (Math.random() > 0.72) continue;
    const affix = weightedPick(availableSpecials);
    const scaledValue = Math.max(1, Math.floor(affix.value * (1 + (floorLevel - 1) * 0.08)));
    specialAffixes.push({ type: 'special', name: affix.name, desc: affix.desc, stat: affix.stat, value: scaledValue });
    usedStats.add(affix.stat);
    availableSpecials.splice(availableSpecials.indexOf(affix), 1);
  }
  affixes.push(...specialAffixes);

  // Optional set identity; matching pieces unlock 2/4/6/8-piece abilities
  const set = (player?.realmIndex || 0) >= 2 ? rollEquipmentSet(rarity.name, floorLevel) : null;

  // Pick sub-type & icon for more visual variety
  const types = slotInfo.subTypes || [{ name: slotInfo.name, icon: slotInfo.icon || '■' }];
  const pickedType = types[Math.floor(Math.random() * types.length)] || types[0];
  const subType = pickedType.name || slotInfo.name;
  const itemIcon = pickedType.icon || slotInfo.icon || '■';

  // Build name
  const prefixNames = affixes.filter(a => a.type === 'prefix').map(a => a.name).join('');
  const suffixNames = affixes.filter(a => a.type === 'suffix').map(a => a.name).join('');
  const specialNames = affixes.filter(a => a.type === 'special').map(a => `·${a.name}`).join('');
  const setPrefix = set ? `${set.prefixes[Math.floor(Math.random() * set.prefixes.length)]}` : '';
  const fullName = `${setPrefix}${prefixNames}${subType}${suffixNames}${specialNames}`;

  // Total stats summary
  const stats = {};
  stats[slotInfo.baseStat] = (stats[slotInfo.baseStat] || 0) + baseValue;
  for (const affix of affixes) {
    stats[affix.stat] = (stats[affix.stat] || 0) + affix.value;
  }

  const item = {
    name: fullName,
    rarity: rarity.name,
    rarityColor: set?.color || rarity.color,
    slot: slot,
    subType: subType,
    icon: set?.icon || itemIcon,
    baseStat: slotInfo.baseStat,
    baseValue: baseValue,
    affixes: affixes,
    baseStats: { ...stats },
    stats: stats,
    enhanceLevel: 0,
    enhanceBonus: {},
    setId: set?.id || null,
    setName: set?.name || null,
    setIcon: set?.icon || null,
    floorLevel: floorLevel,
  };
  return rebuildEquipmentStats(item);
}

// Generate drop from a monster kill
function generateLootDrop(floorLevel = 1, enemy = null) {
  const roll = Math.random();
  const dropChance = (enemy?.isBoss || enemy?.isElite) ? 1.0 : 0.72;
  if (roll > dropChance) return null; // normal 72%, boss guaranteed per roll
  return generateEquipment(floorLevel);
}

// Apply equipment stats to player
function applyEquipmentStats(player, equipment) {
  if (!equipment) return;
  if (typeof rebuildEquipmentStats === 'function') rebuildEquipmentStats(equipment);
  for (const [stat, value] of Object.entries(equipment.stats)) {
    switch (stat) {
      case 'atk': player.atk += value; break;
      case 'def': player.def += value; break;
      case 'hp': player.maxHp += value; player.hp += value; break;
      case 'mp': player.maxMp += value; player.mp += value; break;
      case 'maxHp': player.maxHp += value; player.hp += value; break;
      case 'maxMp': player.maxMp += value; player.mp += value; break;
      case 'dodge': player.dodge = (player.dodge || 0) + value; break;
      case 'crit': player.crit = (player.crit || 0) + value; break;
      case 'xpBonus': player.xpBonus = (player.xpBonus || 0) + value; break;
      case 'goldFind': player.goldFind = (player.goldFind || 0) + value; break;
      // Elemental damage, lifesteal, etc. — additive for now
      default: player[stat] = (player[stat] || 0) + value; break;
    }
  }
}

// Remove equipment stats from player
function removeEquipmentStats(player, equipment) {
  if (!equipment) return;
  for (const [stat, value] of Object.entries(equipment.stats)) {
    switch (stat) {
      case 'atk': player.atk -= value; break;
      case 'def': player.def -= value; break;
      case 'hp': player.maxHp -= value; player.hp = Math.min(player.hp, player.maxHp); break;
      case 'mp': player.maxMp -= value; player.mp = Math.min(player.mp, player.maxMp); break;
      case 'maxHp': player.maxHp -= value; player.hp = Math.min(player.hp, player.maxHp); break;
      case 'maxMp': player.maxMp -= value; player.mp = Math.min(player.mp, player.maxMp); break;
      case 'dodge': player.dodge = (player.dodge || 0) - value; break;
      case 'crit': player.crit = (player.crit || 0) - value; break;
      case 'xpBonus': player.xpBonus = (player.xpBonus || 0) - value; break;
      case 'goldFind': player.goldFind = (player.goldFind || 0) - value; break;
      default: player[stat] = (player[stat] || 0) - value; break;
    }
  }
}

// Equip an item from inventory
function equipItem(player, invIndex) {
  if (invIndex < 0 || invIndex >= player.inventory.length) return false;
  const item = player.inventory[invIndex];
  if (!item || !item.slot) return false;

  const current = player.equipment[item.slot] || null;
  // Replace in-place first: when the bag is full, the old equipment occupies the new item's old slot.
  // This avoids silently deleting equipped gear during a full-bag replacement.
  player.inventory.splice(invIndex, 1, current);
  if (!current) player.inventory.splice(invIndex, 1);
  player.equipment[item.slot] = item;
  if (typeof player.recalcStats === 'function') player.recalcStats();
  autoSave();
  return true;
}

// Unequip an item
function unequipItem(player, slot) {
  const item = player.equipment[slot];
  if (!item) return false;
  if (player.inventory.length >= 24) {
    showMessage(`⚠️ 背包已满，无法取下 ${item.name}`, '#ff4444');
    return false;
  }
  player.equipment[slot] = null;
  player.inventory.push(item);
  if (typeof player.recalcStats === 'function') player.recalcStats();
  autoSave();
  return true;
}

// Inventory UI state
let showInventory = false;

function toggleInventory() {
  showInventory = !showInventory;
  if (showInventory && typeof showCharacterPanel !== 'undefined') showCharacterPanel = false;
  if (showInventory) {
    // Disable movement while inventory is open
  }
}
