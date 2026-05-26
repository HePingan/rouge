// Artifact System — 独立于装备的长期神器养成线

var ARTIFACT_LEVEL_CAP_BY_REALM = [0, 0, 1, 3, 4, 6, 7, 9, 10, 12];
var ARTIFACT_UNLOCK_REALM = 2; // 金丹期：神器入口正式开放；筑基期先掉碎片。

var ARTIFACT_MATERIALS = [
  { id: 'artifact_essence', name: '神源', rarity: 'epic', color: '#d4a0ff', weight: 8, source: '高阶精英 / Boss / 神器秘境' },
  { id: 'artifact_core', name: '神器核心', rarity: 'mythic', color: '#ffdd66', weight: 2, source: 'Boss / 神器秘境 / 高阶章节' },
  { id: 'artifact_shard_zhuxian', name: '诛仙剑碎片', rarity: 'legendary', color: '#ff5577', weight: 10, source: '精英怪 / Boss / 神器秘境' },
  { id: 'artifact_shard_haotian', name: '昊天塔碎片', rarity: 'legendary', color: '#ffd166', weight: 10, source: '防御型精英 / Boss / 神器秘境' },
  { id: 'artifact_shard_lianyao', name: '炼妖壶碎片', rarity: 'legendary', color: '#90ee90', weight: 10, source: '刷图掉落 / 精英怪 / 神器秘境' },
  { id: 'artifact_shard_qiankun', name: '乾坤镜碎片', rarity: 'legendary', color: '#88ccff', weight: 10, source: '宝箱 / 精英怪 / 神器秘境' },
  { id: 'artifact_shard_leifa', name: '雷罚印碎片', rarity: 'legendary', color: '#d9c3ff', weight: 10, source: '雷系敌人 / Boss / 天劫秘境' },
];

var ARTIFACTS = {
  zhuxian: {
    id: 'zhuxian', name: '诛仙剑', icon: '🗡️', color: '#ff5577',
    desc: '上古杀伐神器，擅长暴击与斩杀首领。',
    tags: ['Boss', '暴击', '输出'], role: 'Boss',
    unlockRealm: 2, maxLevel: 12,
    baseStats: { atk: 8, crit: 3, bossDmg: 5 },
    perLevelStats: { atk: 4, crit: 1, bossDmg: 2 },
    effects: { swordQiChance: 8, swordQiRatio: 0.35 },
    awakenEffect: { armorPenOnCrit: 12 },
  },
  haotian: {
    id: 'haotian', name: '昊天塔', icon: '🗼', color: '#ffd166',
    desc: '镇压诸邪的防御神器，提供生命、防御与保命能力。',
    tags: ['生存', '减伤', '保命'], role: '生存',
    unlockRealm: 2, maxLevel: 12,
    baseStats: { maxHp: 35, def: 6, dmgReduce: 4 },
    perLevelStats: { maxHp: 18, def: 3, dmgReduce: 1 },
    effects: { deathSave: 1, lowHpGuard: 8 },
    awakenEffect: { lowHpGuard: 16 },
  },
  lianyao: {
    id: 'lianyao', name: '炼妖壶', icon: '🏺', color: '#90ee90',
    desc: '炼化妖力反哺自身，偏向续航、吸血与刷图恢复。',
    tags: ['续航', '刷图', '恢复'], role: '续航',
    unlockRealm: 2, maxLevel: 12,
    baseStats: { lifesteal: 3, hpRegen: 3, mpRegen: 2 },
    perLevelStats: { lifesteal: 1, hpRegen: 2, mpRegen: 1 },
    effects: { killRecoverPct: 0.08 },
    awakenEffect: { artifactDropBonus: 8 },
  },
  qiankun: {
    id: 'qiankun', name: '乾坤镜', icon: '🪞', color: '#88ccff',
    desc: '照见乾坤机缘，提升发育、闪避与额外收益。',
    tags: ['发育', '收益', '闪避'], role: '发育',
    unlockRealm: 2, maxLevel: 12,
    baseStats: { xpBonus: 6, goldFind: 8, dodge: 3 },
    perLevelStats: { xpBonus: 2, goldFind: 3, dodge: 1 },
    effects: { treasureEchoChance: 6 },
    awakenEffect: { reflectHeavyHit: 0.22 },
  },
  leifa: {
    id: 'leifa', name: '雷罚印', icon: '⚡', color: '#d9c3ff',
    desc: '掌御雷罚的攻击神器，擅长雷伤、速度与追加打击。',
    tags: ['连击', '雷伤', '清怪'], role: '连击',
    unlockRealm: 2, maxLevel: 12,
    baseStats: { lightningDmg: 8, speed: 3, extraHitChance: 4 },
    perLevelStats: { lightningDmg: 4, speed: 1, extraHitChance: 1 },
    effects: { thunderSealChain: 8, thunderSealRatio: 0.35 },
    awakenEffect: { thunderSealChain: 16 },
  },
};

function createDefaultArtifactsState() {
  return { activeId: null, owned: {} };
}

function normalizeArtifactsState(state) {
  const normalized = createDefaultArtifactsState();
  if (!state || typeof state !== 'object' || Array.isArray(state)) return normalized;
  normalized.activeId = ARTIFACTS[state.activeId] ? state.activeId : null;
  const owned = state.owned && typeof state.owned === 'object' && !Array.isArray(state.owned) ? state.owned : {};
  for (const [id, raw] of Object.entries(owned)) {
    if (!ARTIFACTS[id]) continue;
    const level = Math.max(1, Math.min(ARTIFACTS[id].maxLevel, Number(raw?.level) || 1));
    normalized.owned[id] = {
      level,
      awakened: !!raw?.awakened,
    };
  }
  if (normalized.activeId && !normalized.owned[normalized.activeId]) normalized.activeId = null;
  return normalized;
}

function serializeArtifactsState(state) {
  return normalizeArtifactsState(state);
}

function getArtifactUnlockRealm() {
  return ARTIFACT_UNLOCK_REALM;
}

function getArtifactLevelCap(realmIndex = player?.realmIndex || 0) {
  const idx = Math.max(0, Math.min(ARTIFACT_LEVEL_CAP_BY_REALM.length - 1, Number(realmIndex) || 0));
  return ARTIFACT_LEVEL_CAP_BY_REALM[idx] || 0;
}

function getArtifactState(p = player) {
  if (!p) return createDefaultArtifactsState();
  p.artifacts = normalizeArtifactsState(p.artifacts);
  return p.artifacts;
}

function getArtifactProgress(id, p = player) {
  const state = getArtifactState(p);
  return state.owned?.[id] || null;
}

function canUseArtifact(id, p = player) {
  const artifact = ARTIFACTS[id];
  if (!artifact || !p) return { ok: false, reason: 'not_found' };
  if ((Number(p.realmIndex) || 0) < (artifact.unlockRealm || ARTIFACT_UNLOCK_REALM)) return { ok: false, reason: 'locked_realm' };
  if (getArtifactLevelCap(p.realmIndex) <= 0) return { ok: false, reason: 'level_cap_zero' };
  return { ok: true };
}

function activateArtifact(p = player, id) {
  const usable = canUseArtifact(id, p);
  if (!usable.ok) return usable;
  const state = getArtifactState(p);
  if (!state.owned[id]) state.owned[id] = { level: 1, awakened: false };
  state.activeId = id;
  p.artifacts = state;
  if (typeof p.recalcStats === 'function') p.recalcStats();
  return { ok: true, artifact: ARTIFACTS[id], progress: state.owned[id] };
}

function deactivateArtifact(p = player) {
  if (!p) return { ok: false, reason: 'no_player' };
  const state = getArtifactState(p);
  state.activeId = null;
  p.artifacts = state;
  if (typeof p.recalcStats === 'function') p.recalcStats();
  return { ok: true };
}

function getActiveArtifact(p = player) {
  const state = getArtifactState(p);
  const id = state.activeId;
  if (!id || !ARTIFACTS[id] || !state.owned[id]) return null;
  return { ...ARTIFACTS[id], progress: state.owned[id] };
}

function artifactShardId(id) {
  return `artifact_shard_${id}`;
}

function getArtifactUpgradeCost(id, level = 1) {
  const artifact = ARTIFACTS[id];
  if (!artifact) return null;
  const lv = Math.max(1, Number(level) || 1);
  if (lv >= artifact.maxLevel) return null;
  const materials = { [artifactShardId(id)]: 3 + lv * 2 };
  if (lv >= 3) materials.artifact_essence = Math.ceil((lv - 2) / 2);
  if (lv >= 7) materials.artifact_core = Math.ceil((lv - 6) / 3);
  return {
    spiritStones: 80 * lv * lv,
    materials,
  };
}

const ARTIFACT_AWAKENING_COPY = {
  zhuxian: { name: '诛仙剑阵', effectKey: 'swordArrayChance', value: 18 },
  haotian: { name: '镇界天威', effectKey: 'deathSaveShieldPct', value: 0.45 },
  lianyao: { name: '万妖归壶', effectKey: 'artifactDropBonus', value: 16 },
  qiankun: { name: '乾坤定界', effectKey: 'bindChance', value: 12 },
  leifa: { name: '九霄神罚', effectKey: 'thunderSealChain', value: 22 },
};

function getArtifactAwakeningCost(id) {
  const artifact = ARTIFACTS[id];
  if (!artifact) return null;
  return {
    spiritStones: 28800,
    materials: {
      artifact_core: 2,
      artifact_essence: 8,
      [artifactShardId(id)]: 24,
      immortal_jade_ascended: 3,
    },
  };
}

function getArtifactAwakenActionState(p = player, materials = playerMaterials, id = p?.artifacts?.activeId) {
  const artifact = ARTIFACTS[id];
  if (!artifact || !p) return { canAwaken: false, reason: '未激活神器', code: 'not_found' };
  const state = getArtifactState(p);
  const progress = state.owned[id];
  const cost = getArtifactAwakeningCost(id);
  if (!progress) return { canAwaken: false, reason: '未获得神器', code: 'not_owned', artifact, cost };
  if (progress.awakened) return { canAwaken: false, reason: '神器已觉醒', code: 'awakened', artifact, progress, cost };
  if (Number(progress.level || 0) < Number(artifact.maxLevel || 12)) return { canAwaken: false, reason: `满级后可觉醒（${Number(progress.level || 0)}/${Number(artifact.maxLevel || 12)}）`, code: 'level_cap', artifact, progress, cost };
  if (!cost) return { canAwaken: false, reason: '暂无觉醒消耗', code: 'no_cost', artifact, progress };
  if (Number(p.spiritStones || 0) < Number(cost.spiritStones || 0)) return { canAwaken: false, reason: `灵石不足（${Number(p.spiritStones || 0)}/${Number(cost.spiritStones || 0)}）`, code: 'stones', artifact, progress, cost };
  for (const [mid, count] of Object.entries(cost.materials || {})) {
    if (Number(materials?.[mid] || 0) < Number(count || 0)) return { canAwaken: false, reason: `材料不足：${mid} ${Number(materials?.[mid] || 0)}/${Number(count || 0)}`, code: 'materials', missing: mid, artifact, progress, cost };
  }
  return { canAwaken: true, reason: '可觉醒', code: 'ready', artifact, progress, cost };
}

function awakenArtifact(p = player, materials = playerMaterials, id = p?.artifacts?.activeId) {
  const actionState = getArtifactAwakenActionState(p, materials, id);
  if (!actionState.canAwaken) return { ok: false, reason: actionState.reason, code: actionState.code, missing: actionState.missing, cost: actionState.cost };
  const { artifact, progress, cost } = actionState;
  p.spiritStones = Math.max(0, Number(p.spiritStones || 0) - cost.spiritStones);
  for (const [mid, count] of Object.entries(cost.materials || {})) materials[mid] = Math.max(0, Number(materials[mid] || 0) - Number(count || 0));
  progress.awakened = true;
  progress.awakenName = ARTIFACT_AWAKENING_COPY[artifact.id]?.name || '神器觉醒';
  const state = getArtifactState(p);
  state.owned[artifact.id] = progress;
  p.artifacts = state;
  if (typeof p.recalcStats === 'function') p.recalcStats();
  return { ok: true, artifact, progress, cost, awaken: ARTIFACT_AWAKENING_COPY[artifact.id] };
}

function hasArtifactUpgradeMaterials(p = player, materials = playerMaterials, id) {
  const progress = getArtifactProgress(id, p);
  const cost = progress ? getArtifactUpgradeCost(id, progress.level) : null;
  if (!progress) return { ok: false, reason: 'not_owned' };
  if (!cost) return { ok: false, reason: 'max_level' };
  if (progress.level >= getArtifactLevelCap(p?.realmIndex || 0)) return { ok: false, reason: 'realm_cap', cost };
  if (Number(p?.spiritStones || 0) < cost.spiritStones) return { ok: false, reason: 'stones', cost };
  for (const [mid, count] of Object.entries(cost.materials || {})) {
    if (Number(materials?.[mid] || 0) < Number(count || 0)) return { ok: false, reason: 'materials', cost, missing: mid };
  }
  return { ok: true, cost };
}

function upgradeArtifact(p = player, materials = playerMaterials, id = p?.artifacts?.activeId) {
  const artifact = ARTIFACTS[id];
  if (!artifact || !p) return { ok: false, reason: 'not_found' };
  const state = getArtifactState(p);
  if (!state.owned[id]) return { ok: false, reason: 'not_owned' };
  const check = hasArtifactUpgradeMaterials(p, materials, id);
  if (!check.ok) return check;
  p.spiritStones = Math.max(0, Number(p.spiritStones || 0) - check.cost.spiritStones);
  for (const [mid, count] of Object.entries(check.cost.materials || {})) {
    materials[mid] = Math.max(0, Number(materials[mid] || 0) - Number(count || 0));
  }
  state.owned[id].level += 1;
  p.artifacts = state;
  if (typeof p.recalcStats === 'function') p.recalcStats();
  return { ok: true, artifact, progress: state.owned[id], cost: check.cost };
}

function artifactStatTotal(base, perLevel, level) {
  return Number(base || 0) + Number(perLevel || 0) * Math.max(0, Number(level || 1) - 1);
}

function getArtifactStatBonuses(p = player) {
  const active = getActiveArtifact(p);
  if (!active) return {};
  const progress = active.progress || { level: 1, awakened: false };
  const stats = {};
  for (const [stat, base] of Object.entries(active.baseStats || {})) {
    stats[stat] = artifactStatTotal(base, active.perLevelStats?.[stat], progress.level);
  }
  return stats;
}

function getArtifactEffectValue(key, p = player) {
  const active = getActiveArtifact(p);
  if (!active) return 0;
  const progress = active.progress || {};
  let value = Number(active.effects?.[key] || 0);
  if (progress.awakened && active.awakenEffect?.[key] !== undefined) {
    value = Math.max(value, Number(active.awakenEffect[key]) || 0);
  }
  if (progress.awakened && ARTIFACT_AWAKENING_COPY?.[active.id]?.effectKey === key) {
    value = Math.max(value, Number(ARTIFACT_AWAKENING_COPY[active.id].value) || 0);
  }
  return value;
}
