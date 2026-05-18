// Loot System — Diablo-style random affix equipment generation

const RARITY = {
  COMMON:    { name: '普通', color: '#aaaaaa', affixes: 0, dropWeight: 40 },
  MAGIC:     { name: '魔法', color: '#4499ff', affixes: 1, dropWeight: 30 },
  RARE:      { name: '稀有', color: '#ffdd44', affixes: 2, dropWeight: 18 },
  LEGENDARY: { name: '传说', color: '#ff8822', affixes: 3, dropWeight: 8 },
  MYTHIC:    { name: '神话', color: '#ff3366', affixes: 4, dropWeight: 4 },
};

const SLOTS = ['weapon', 'armor', 'accessory'];

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

const SLOT_NAMES = {
  weapon: { name: '武器', baseStat: 'atk', baseRange: [5, 15] },
  armor:  { name: '防具', baseStat: 'def', baseRange: [3, 10] },
  accessory: { name: '饰品', baseStat: 'hp', baseRange: [10, 30] },
};

// Weapon sub-types for visual variety
const WEAPON_TYPES = [
  { name: '长剑', icon: '⚔️' },
  { name: '短刃', icon: '🗡️' },
  { name: '法杖', icon: '🪄' },
  { name: '长弓', icon: '🏹' },
  { name: '战锤', icon: '🔨' },
  { name: '战戟', icon: '🔱' },
  { name: '拳套', icon: '🥊' },
  { name: '灵符', icon: '📜' },
];
const ARMOR_ICONS = ['🛡️', '⛑️', '🧥', '👘'];
const ACCESSORY_ICONS = ['💍', '📿', '🔮', '🪬'];

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

  // Build name
  const prefixNames = affixes.filter(a => a.type === 'prefix').map(a => a.name).join('');
  const suffixNames = affixes.filter(a => a.type === 'suffix').map(a => a.name).join('');
  const fullName = prefixNames + slotInfo.name + suffixNames;

  // Total stats summary
  const stats = {};
  stats[slotInfo.baseStat] = (stats[slotInfo.baseStat] || 0) + baseValue;
  for (const affix of affixes) {
    stats[affix.stat] = (stats[affix.stat] || 0) + affix.value;
  }

  // Pick sub-type & icon for more visual variety
  let itemIcon, subType;
  if (slot === 'weapon') {
    const wt = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    subType = wt.name;
    itemIcon = wt.icon;
  } else if (slot === 'armor') {
    subType = '防具';
    itemIcon = ARMOR_ICONS[Math.floor(Math.random() * ARMOR_ICONS.length)];
  } else {
    subType = '饰品';
    itemIcon = ACCESSORY_ICONS[Math.floor(Math.random() * ACCESSORY_ICONS.length)];
  }

  return {
    name: fullName,
    rarity: rarity.name,
    rarityColor: rarity.color,
    slot: slot,
    subType: subType,
    icon: itemIcon,
    baseStat: slotInfo.baseStat,
    baseValue: baseValue,
    affixes: affixes,
    stats: stats,
    floorLevel: floorLevel,
  };
}

// Generate drop from a monster kill
function generateLootDrop(floorLevel = 1) {
  const roll = Math.random();
  if (roll < 0.55) return null; // 45% drop chance
  return generateEquipment(floorLevel);
}

// Apply equipment stats to player
function applyEquipmentStats(player, equipment) {
  if (!equipment) return;
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
  if (!item) return false;

  // Unequip current item in same slot
  const current = player.equipment[item.slot];
  if (current) {
    removeEquipmentStats(player, current);
    player.inventory.push(current);
  }

  // Equip new item
  player.equipment[item.slot] = item;
  player.inventory.splice(invIndex, 1);
  applyEquipmentStats(player, item);
  autoSave();
  return true;
}

// Unequip an item
function unequipItem(player, slot) {
  const item = player.equipment[slot];
  if (!item) return false;
  removeEquipmentStats(player, item);
  player.equipment[slot] = null;
  player.inventory.push(item);
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
