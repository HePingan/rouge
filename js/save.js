// Save/Load System — localStorage-based persistence
// Saves player progress, inventory, skills, materials between sessions

const SAVE_KEY = 'xian_save_v1';

function getEquipmentSlotOrder() {
  return typeof EQUIPMENT_SLOT_ORDER !== 'undefined' ? EQUIPMENT_SLOT_ORDER : Object.keys(player?.equipment || {});
}

function saveGame() {
  try {
    const data = {
      version: 1,
      timestamp: Date.now(),
      // Player cultivation
      realmIndex: player.realmIndex,
      xp: player.xp,
      spiritStones: player.spiritStones,
      daoFoundation: player.daoFoundation || null,
      breakthroughFails: Number(player.breakthroughFails || 0),
      breakthroughChanceBonus: Number(player.breakthroughChanceBonus || 0),
      breakthroughProtect: Number(player.breakthroughProtect || 0),
      // Base attributes
      baseHp: player.baseHp,
      baseMp: player.baseMp,
      baseAtk: player.baseAtk,
      baseDef: player.baseDef,
      // Current HP/MP ratio (restore proportionally on load)
      hpRatio: player.maxHp > 0 ? player.hp / player.maxHp : 1,
      mpRatio: player.maxMp > 0 ? player.mp / player.maxMp : 1,
      // Equipment & inventory
      equipment: Object.fromEntries((getEquipmentSlotOrder()).map(slot => [slot, player.equipment[slot] ? serializeItem(player.equipment[slot]) : null])),
      inventory: player.inventory.map(serializeItem),
      // Skills
      skillPoints: availableSkillPoints,
      learnedSkills: learnedSkills.map(s => ({ tree: s.tree, index: s.index })),
      // Materials
      materials: { ...playerMaterials },
      // Dungeon progress
      floor: dungeonLevel,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('[Save] FAILED:', e);
    return false;
  }
}

function serializeItem(item) {
  if (typeof rebuildEquipmentStats === 'function') rebuildEquipmentStats(item);
  return {
    name: item.name,
    icon: item.icon,
    slot: item.slot,
    subType: item.subType,
    baseStat: item.baseStat,
    baseValue: item.baseValue,
    baseStats: { ...(item.baseStats || item.stats || {}) },
    stats: { ...item.stats },
    affixes: (item.affixes || []).map(a => ({ ...a })),
    enhanceLevel: Number(item.enhanceLevel) || 0,
    enhanceBonus: { ...(item.enhanceBonus || {}) },
    setId: item.setId || null,
    setName: item.setName || null,
    setIcon: item.setIcon || null,
    floorLevel: item.floorLevel,
    rarity: item.rarity,
    rarityColor: item.rarityColor,
  };
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (!data.version) return false;

    // Restore cultivation
    player.realmIndex = data.realmIndex ?? 0;
    player.xp = data.xp ?? 0;
    player.spiritStones = data.spiritStones ?? 0;
    player.daoFoundation = data.daoFoundation || null;
    player.breakthroughFails = Number(data.breakthroughFails || 0);
    player.breakthroughChanceBonus = Number(data.breakthroughChanceBonus || 0);
    player.breakthroughProtect = Number(data.breakthroughProtect || 0);
    player.baseHp = data.baseHp ?? 100;
    player.baseMp = data.baseMp ?? 50;
    player.baseAtk = data.baseAtk ?? 10;
    player.baseDef = data.baseDef ?? 3;

    // Restore equipment
    for (const slot of (getEquipmentSlotOrder())) {
      if (data.equipment?.[slot]) {
        player.equipment[slot] = deserializeItem(data.equipment[slot]);
      } else {
        player.equipment[slot] = null;
      }
    }

    // Restore inventory
    player.inventory = (data.inventory || []).map(deserializeItem);

    // Recalc stats (this also restores HP/MP via ratio)
    player.recalcStats();

    // Apply saved HP/MP ratios
    if (typeof data.hpRatio === 'number') {
      player.hp = Math.max(1, Math.floor(player.maxHp * data.hpRatio));
    }
    if (typeof data.mpRatio === 'number') {
      player.mp = Math.max(0, Math.floor(player.maxMp * data.mpRatio));
    }

    // Restore skills
    availableSkillPoints = data.skillPoints ?? 0;
    learnedSkills = (data.learnedSkills || []).map(s => ({
      tree: s.tree,
      index: s.index,
    }));

    // Restore materials
    playerMaterials = data.materials ? { ...data.materials } : {};

    // Restore floor level
    dungeonLevel = data.floor ?? 1;

    return true;
  } catch (e) {
    console.warn('Load failed:', e);
    return false;
  }
}

function deserializeItem(data) {
  const item = {
    name: data.name,
    icon: data.icon,
    slot: data.slot,
    subType: data.subType,
    baseStat: data.baseStat || (typeof SLOT_NAMES !== 'undefined' ? SLOT_NAMES?.[data.slot]?.baseStat : undefined),
    baseValue: data.baseValue,
    baseStats: { ...(data.baseStats || data.stats || {}) },
    stats: { ...(data.stats || {}) },
    affixes: (data.affixes || []).map(a => ({ ...a })),
    enhanceLevel: Number(data.enhanceLevel) || 0,
    enhanceBonus: { ...(data.enhanceBonus || {}) },
    setId: data.setId || null,
    setName: data.setName || null,
    setIcon: data.setIcon || null,
    floorLevel: data.floorLevel,
    rarity: data.rarity,
    rarityColor: data.rarityColor,
  };
  return typeof rebuildEquipmentStats === 'function' ? rebuildEquipmentStats(item) : item;
}

function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

function hasSaveData() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

// ─── Auto-save triggers ───

// Call after any significant state change
function autoSave() {
  const ok = saveGame();
  if (ok) {
    // Brief flash on save icon if present
    const el = document.getElementById('btn-save-feedback');
    if (el) {
      el.textContent = '✓';
      clearTimeout(el._saveClear);
      el._saveClear = setTimeout(() => { el.textContent = '💾'; }, 1500);
    }
  }
}
