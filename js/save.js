// Save/Load System — localStorage-based persistence
// Saves player progress, inventory, skills, materials between sessions

const SAVE_KEY = 'xian_save_v1';
const SAVE_VERSION = 2;
const SAVE_BACKUP_KEY = `${SAVE_KEY}_backup`;
const SAVE_CORRUPT_KEY = `${SAVE_KEY}_corrupt`;

function backupExistingSave() {
  try {
    const oldRaw = localStorage.getItem(SAVE_KEY);
    if (oldRaw !== null) {
      localStorage.setItem(SAVE_BACKUP_KEY, oldRaw);
    }
  } catch (e) {
    console.warn('[Save] Backup failed:', e);
  }
}

function preserveCorruptSave(raw, reason) {
  try {
    localStorage.setItem(SAVE_CORRUPT_KEY, JSON.stringify({
      timestamp: Date.now(),
      reason: reason || 'unknown',
      raw: raw == null ? '' : String(raw),
    }));
  } catch (e) {
    console.warn('[Save] Preserve corrupt save failed:', e);
  }
}

function normalizeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRatio(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function migrateSave(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;

  const migrated = { ...data };
  migrated.version = normalizeNumber(migrated.version, 1) || 1;
  migrated.timestamp = normalizeNumber(migrated.timestamp, Date.now());

  migrated.realmIndex = normalizeNumber(migrated.realmIndex, 0);
  migrated.xp = normalizeNumber(migrated.xp, 0);
  migrated.spiritStones = normalizeNumber(migrated.spiritStones, 0);
  migrated.breakthroughFails = normalizeNumber(migrated.breakthroughFails, 0);
  migrated.breakthroughChanceBonus = normalizeNumber(migrated.breakthroughChanceBonus, 0);
  migrated.breakthroughProtect = normalizeNumber(migrated.breakthroughProtect, 0);
  migrated.baseHp = normalizeNumber(migrated.baseHp, 100);
  migrated.baseMp = normalizeNumber(migrated.baseMp, 50);
  migrated.baseAtk = normalizeNumber(migrated.baseAtk, 10);
  migrated.baseDef = normalizeNumber(migrated.baseDef, 3);
  migrated.hpRatio = normalizeRatio(migrated.hpRatio, 1);
  migrated.mpRatio = normalizeRatio(migrated.mpRatio, 1);

  if (!migrated.equipment || typeof migrated.equipment !== 'object' || Array.isArray(migrated.equipment)) {
    migrated.equipment = {};
  }
  if (!Array.isArray(migrated.inventory)) migrated.inventory = [];
  migrated.inventory = migrated.inventory.filter(item => item && typeof item === 'object');
  migrated.skillPoints = normalizeNumber(migrated.skillPoints, 0);
  if (!Array.isArray(migrated.learnedSkills)) migrated.learnedSkills = [];
  migrated.learnedSkills = migrated.learnedSkills.filter(s => s && typeof s === 'object');
  if (!migrated.materials || typeof migrated.materials !== 'object' || Array.isArray(migrated.materials)) {
    migrated.materials = {};
  }
  migrated.floor = normalizeNumber(migrated.floor, 1);

  return migrated;
}

function validateSave(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!Number.isFinite(Number(data.version))) return false;
  if (data.equipment !== undefined && (!data.equipment || typeof data.equipment !== 'object' || Array.isArray(data.equipment))) return false;
  if (data.inventory !== undefined && !Array.isArray(data.inventory)) return false;
  if (data.learnedSkills !== undefined && !Array.isArray(data.learnedSkills)) return false;
  if (data.materials !== undefined && (!data.materials || typeof data.materials !== 'object' || Array.isArray(data.materials))) return false;

  const numericFields = [
    'realmIndex', 'xp', 'spiritStones', 'breakthroughFails', 'breakthroughChanceBonus',
    'breakthroughProtect', 'baseHp', 'baseMp', 'baseAtk', 'baseDef', 'hpRatio', 'mpRatio',
    'skillPoints', 'floor', 'timestamp',
  ];
  return numericFields.every(field => data[field] === undefined || Number.isFinite(Number(data[field])));
}

function parseSaveRaw(raw) {
  if (raw == null) return null;
  if (String(raw).trim() === '') throw new Error('Empty save data');
  const data = migrateSave(JSON.parse(raw));
  if (!validateSave(data)) {
    throw new Error('Invalid save data');
  }
  return data;
}

function getEquipmentSlotOrder() {
  return typeof EQUIPMENT_SLOT_ORDER !== 'undefined' ? EQUIPMENT_SLOT_ORDER : Object.keys(player?.equipment || {});
}

function saveGame() {
  try {
    const data = {
      version: SAVE_VERSION,
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
    backupExistingSave();
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

function applySaveData(data) {
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
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    applySaveData(parseSaveRaw(raw));
    return true;
  } catch (e) {
    console.warn('Load failed, trying backup:', e);
    preserveCorruptSave(raw, e?.message || 'load failed');

    const backupRaw = localStorage.getItem(SAVE_BACKUP_KEY);
    if (backupRaw && backupRaw !== raw) {
      try {
        const backupData = parseSaveRaw(backupRaw);
        localStorage.setItem(SAVE_KEY, JSON.stringify(backupData));
        applySaveData(backupData);
        return true;
      } catch (backupError) {
        console.warn('Backup load failed:', backupError);
        preserveCorruptSave(backupRaw, backupError?.message || 'backup load failed');
      }
    }
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

function exportSaveJson() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  const data = parseSaveRaw(raw);
  return JSON.stringify(data, null, 2);
}

function importSaveJson(json) {
  try {
    const raw = typeof json === 'string' ? json : JSON.stringify(json);
    const data = parseSaveRaw(raw);
    backupExistingSave();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('[Save] Import failed:', e);
    try {
      preserveCorruptSave(typeof json === 'string' ? json : JSON.stringify(json), e?.message || 'import failed');
    } catch (stringifyError) {
      preserveCorruptSave('', stringifyError?.message || 'import stringify failed');
    }
    return false;
  }
}

function getSaveSummary() {
  const summarizeRaw = (raw) => {
    if (!raw) return null;
    try {
      const data = parseSaveRaw(raw);
      return {
        version: data.version,
        timestamp: data.timestamp || null,
        realmIndex: data.realmIndex ?? 0,
        xp: data.xp ?? 0,
        spiritStones: data.spiritStones ?? 0,
        floor: data.floor ?? 1,
        inventoryCount: Array.isArray(data.inventory) ? data.inventory.length : 0,
        learnedSkillCount: Array.isArray(data.learnedSkills) ? data.learnedSkills.length : 0,
      };
    } catch (e) {
      return { invalid: true, reason: e?.message || 'invalid save data' };
    }
  };

  return {
    hasSave: hasSaveData(),
    save: summarizeRaw(localStorage.getItem(SAVE_KEY)),
    backup: summarizeRaw(localStorage.getItem(SAVE_BACKUP_KEY)),
    hasCorrupt: localStorage.getItem(SAVE_CORRUPT_KEY) !== null,
  };
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
