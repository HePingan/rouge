// Ascension / Immortal World Progression — 飞升仙界篇

const ASCENSION_REALM_START_INDEX = 10;
const IMMORTAL_REALMS = [
  { name: '散仙', xpNeeded: 90000, hpMult: 15.0, mpMult: 14.0, atkBonus: 230, defBonus: 176 },
  { name: '地仙', xpNeeded: 145000, hpMult: 18.0, mpMult: 16.5, atkBonus: 310, defBonus: 235 },
  { name: '天仙', xpNeeded: 220000, hpMult: 22.0, mpMult: 20.0, atkBonus: 420, defBonus: 320 },
  { name: '玄仙', xpNeeded: 330000, hpMult: 27.0, mpMult: 24.0, atkBonus: 560, defBonus: 430 },
  { name: '金仙', xpNeeded: 500000, hpMult: 34.0, mpMult: 30.0, atkBonus: 760, defBonus: 580 },
  { name: '太乙金仙', xpNeeded: 760000, hpMult: 43.0, mpMult: 38.0, atkBonus: 1020, defBonus: 780 },
  { name: '大罗金仙', xpNeeded: 1100000, hpMult: 55.0, mpMult: 49.0, atkBonus: 1380, defBonus: 1050 },
  { name: '仙君', xpNeeded: 1600000, hpMult: 70.0, mpMult: 63.0, atkBonus: 1850, defBonus: 1420 },
  { name: '仙帝', xpNeeded: 0, hpMult: 90.0, mpMult: 80.0, atkBonus: 2500, defBonus: 1920 },
];

if (typeof REALMS !== 'undefined' && !REALMS.some(r => r.name === '散仙')) {
  REALMS.push(...IMMORTAL_REALMS);
}

const ASCENSION_REQUIREMENTS = {
  realmIndex: 9,
  stageId: 'immortal_gatekeeper',
  tribulationClears: ['nine'],
  materials: [
    { id: 'immortal_jade', count: 3, name: '真仙玉' },
    { id: 'nine_thunder_seal', count: 1, name: '九劫雷印' },
    { id: 'artifact_core', count: 1, name: '神器核心' },
    { id: 'starDust', count: 3, name: '星辰砂' },
  ],
};

const ASCENSION_TRIALS = [
  { id: 'heart', name: '问心劫', icon: '🪷', desc: '心魔拷问，考验持续作战。', enemy: { hpMult: 1.15, atkMult: 0.95, defMult: 1.0, mechanism: 'heart_demon' }, animation: 'heart-lotus' },
  { id: 'body', name: '炼体劫', icon: '⚡', desc: '雷火炼体，考验防御恢复。', enemy: { hpMult: 1.3, atkMult: 1.08, defMult: 1.15, mechanism: 'body_thunder' }, animation: 'thunder-body' },
  { id: 'gate', name: '叩仙门', icon: '🚪', desc: '仙门镇压，限定爆发破界。', enemy: { hpMult: 1.55, atkMult: 1.18, defMult: 1.05, mechanism: 'gate_break' }, animation: 'gate-beam' },
];

const ASCENSION_CLASSES = {
  sword: { id: 'sword', name: '剑仙', icon: '🗡️', color: '#d8f3ff', desc: '爆发、暴击、斩杀', stats: { atkPct: 0.08, crit: 6, bossDmg: 8 } },
  pill: { id: 'pill', name: '丹仙', icon: '丹', color: '#88ffcc', desc: '恢复、炼丹、持续作战', stats: { maxHpPct: 0.06, hpRegen: 8, victoryRecoverPct: 0.06 } },
  thunder: { id: 'thunder', name: '雷仙', icon: '⚡', color: '#ffe27a', desc: '天劫、雷法、控制', stats: { lightningDmg: 14, thunderAffinity: 10, bossDmg: 4 } },
  forge: { id: 'forge', name: '器仙', icon: '🔨', color: '#ffcc88', desc: '装备、强化、神器', stats: { defPct: 0.06, artifactPower: 8, allRes: 6 } },
};

const ASCENSION_CLASS_TREES = {
  sword: { id: 'sword', nodes: [
    { id: 'sword_flow', name: '剑气长河', cost: 4, stats: { crit: 4, atkPct: 0.03 } },
    { id: 'sword_slash', name: '仙门斩', cost: 6, stats: { bossDmg: 6, armorPen: 4 } },
    { id: 'sword_heart', name: '剑心通明', cost: 8, stats: { crit: 5, speed: 3 } },
    { id: 'sword_domain', name: '万剑仙域', cost: 12, stats: { atkPct: 0.07, bossDmg: 10 } },
  ]},
  pill: { id: 'pill', nodes: [
    { id: 'pill_recover', name: '仙丹回春', cost: 4, stats: { maxHpPct: 0.04, hpRegen: 5 } },
    { id: 'pill_spirit', name: '丹火养神', cost: 6, stats: { mpRegen: 4, victoryRecoverPct: 0.04 } },
    { id: 'pill_purity', name: '药性纯化', cost: 8, stats: { allRes: 4, maxHpPct: 0.05 } },
    { id: 'pill_rebirth', name: '九转还生', cost: 12, stats: { dmgReduce: 5, victoryRecoverPct: 0.08 } },
  ]},
  thunder: { id: 'thunder', nodes: [
    { id: 'thunder_spark', name: '雷元涌动', cost: 4, stats: { lightningDmg: 6, speed: 2 } },
    { id: 'thunder_jail', name: '雷狱锁敌', cost: 6, stats: { thunderAffinity: 6, bossDmg: 4 } },
    { id: 'thunder_body', name: '劫雷淬身', cost: 8, stats: { allRes: 5, defPct: 0.04 } },
    { id: 'thunder_god', name: '九霄雷神', cost: 12, stats: { lightningDmg: 14, bossDmg: 8 } },
  ]},
  forge: { id: 'forge', nodes: [
    { id: 'forge_temper', name: '仙火锻胚', cost: 4, stats: { defPct: 0.04, artifactPower: 4 } },
    { id: 'forge_soul', name: '器魂共鸣', cost: 6, stats: { artifactPower: 8, allRes: 3 } },
    { id: 'forge_armor', name: '万器护身', cost: 8, stats: { dmgReduce: 4, maxHpPct: 0.04 } },
    { id: 'forge_master', name: '仙匠宗师', cost: 12, stats: { defPct: 0.08, immortalPower: 18 } },
  ]},
};

const LAW_DEFINITIONS = {
  sword: { id: 'sword', name: '剑之法则', icon: '🗡️', materialId: 'law_fragment_sword', color: '#d8f3ff', statsPerLevel: { atkPct: 0.012, crit: 1 } },
  thunder: { id: 'thunder', name: '雷之法则', icon: '⚡', materialId: 'law_fragment_thunder', color: '#ffe27a', statsPerLevel: { lightningDmg: 2, thunderAffinity: 1 } },
  pill: { id: 'pill', name: '丹之法则', icon: '丹', materialId: 'law_fragment_pill', color: '#88ffcc', statsPerLevel: { maxHpPct: 0.01, hpRegen: 1 } },
  forge: { id: 'forge', name: '器之法则', icon: '🔨', materialId: 'law_fragment_forge', color: '#ffcc88', statsPerLevel: { defPct: 0.01, allRes: 1 } },
  void: { id: 'void', name: '虚空法则', icon: '🌀', materialId: 'law_fragment_void', color: '#9aa8ff', statsPerLevel: { dodge: 1, speed: 1 } },
  nether: { id: 'nether', name: '幽冥法则', icon: '👻', materialId: 'law_fragment_nether', color: '#b086ff', statsPerLevel: { lifesteal: 1, poisonDmg: 1 } },
};

const LAW_BREAKTHROUGH_NODES = {
  sword: { 3: { crit: 3 }, 6: { armorPen: 5 }, 9: { bossDmg: 8 }, 10: { atkPct: 0.08, swordArrayChance: 8 } },
  thunder: { 3: { lightningDmg: 8 }, 6: { speed: 4 }, 9: { bossDmg: 6 }, 10: { thunderChain: 0.18, thunderAffinity: 10 } },
  pill: { 3: { hpRegen: 6 }, 6: { victoryRecoverPct: 0.05 }, 9: { dmgReduce: 4 }, 10: { maxHpPct: 0.12 } },
  forge: { 3: { artifactPower: 6 }, 6: { allRes: 6 }, 9: { defPct: 0.06 }, 10: { immortalPower: 24 } },
  void: { 3: { dodge: 4 }, 6: { speed: 5 }, 9: { extraHitChance: 5 }, 10: { armorPen: 8 } },
  nether: { 3: { lifesteal: 3 }, 6: { poisonDmg: 8 }, 9: { dmgReduce: 4 }, 10: { bossDmg: 7 } },
};

const IMMORTAL_BODY_TIERS = [
  { level: 0, name: '凡骨余蜕', cost: 0, stats: {} },
  { level: 1, name: '仙骨初成', cost: 2, stats: { maxHpPct: 0.05, immortalPower: 6 } },
  { level: 2, name: '玉骨流光', cost: 4, stats: { maxHpPct: 0.08, defPct: 0.03, immortalPower: 12 } },
  { level: 3, name: '道骨铭纹', cost: 7, stats: { maxHpPct: 0.12, atkPct: 0.04, immortalPower: 20 } },
  { level: 4, name: '不灭仙躯', cost: 11, stats: { maxHpPct: 0.18, atkPct: 0.06, defPct: 0.06, immortalPower: 32 } },
];

const IMMORTAL_BOSS_MECHANICS = {
  thunder_judicator: { id: 'thunder_judicator', name: '雷罚审判', icon: '⚡', triggers: [{ type: 'turnInterval', every: 3, effect: { damagePct: 0.08, status: 'paralyze' } }, { type: 'hpBelow', threshold: 0.4, effect: { atkBuff: 0.2 } }] },
  forge_spirit: { id: 'forge_spirit', name: '万器护主', icon: '🔨', triggers: [{ type: 'hpBelow', threshold: 0.6, effect: { defBuff: 0.25 } }, { type: 'turnInterval', every: 4, effect: { shieldPct: 0.1 } }] },
  nether_king: { id: 'nether_king', name: '幽冥魂锁', icon: '👻', triggers: [{ type: 'turnInterval', every: 3, effect: { drainPct: 0.06, status: 'curse' } }] },
  demon_lord_shadow: { id: 'demon_lord_shadow', name: '魔尊投影', icon: '😈', triggers: [{ type: 'turnInterval', every: 2, effect: { damagePct: 0.06 } }, { type: 'hpBelow', threshold: 0.5, effect: { atkBuff: 0.3, defBuff: 0.15 } }] },
};

const DEMON_WAR_NODES = ['天门防线', '魔潮裂谷', '仙魔古战场', '魔尊投影'];

function createDefaultAscensionState() {
  return { ascended: false, ascendedAt: null, classId: null, immortalBody: { level: 0, xp: 0 }, laws: Object.fromEntries(Object.keys(LAW_DEFINITIONS).map(id => [id, 0])), classSkills: {}, trial: { active: false, index: 0, cleared: [] }, demonWar: createDemonWarState(), unlockedStages: {} };
}
function createDemonWarState() { return { active: false, progress: 0, bestClear: 0, clears: 0, nodes: [] }; }
function normalizeAscensionState(state) {
  const base = createDefaultAscensionState();
  if (!state || typeof state !== 'object' || Array.isArray(state)) return base;
  const laws = { ...base.laws };
  if (state.laws && typeof state.laws === 'object' && !Array.isArray(state.laws)) for (const id of Object.keys(laws)) laws[id] = Math.max(0, Math.min(10, Number(state.laws[id]) || 0));
  const classSkills = {};
  for (const tree of Object.values(ASCENSION_CLASS_TREES)) for (const node of tree.nodes) classSkills[node.id] = Math.max(0, Math.min(1, Number(state.classSkills?.[node.id]) || 0));
  const bodyLevel = Math.max(0, Math.min(IMMORTAL_BODY_TIERS.length - 1, Number(state.immortalBody?.level) || 0));
  const trial = state.trial && typeof state.trial === 'object' ? state.trial : {};
  const demonWar = state.demonWar && typeof state.demonWar === 'object' ? state.demonWar : {};
  const demonWarNodes = Array.isArray(demonWar.nodes) && demonWar.nodes.length > 0
    ? demonWar.nodes
    : (demonWar.active ? [...DEMON_WAR_NODES] : []);
  return { ascended: !!state.ascended, ascendedAt: Number(state.ascendedAt) || null, classId: ASCENSION_CLASSES[state.classId] ? state.classId : null, immortalBody: { level: bodyLevel, xp: Math.max(0, Number(state.immortalBody?.xp) || 0) }, laws, classSkills, trial: { active: !!trial.active, index: Math.max(0, Number(trial.index) || 0), cleared: Array.isArray(trial.cleared) ? trial.cleared.filter(id => ASCENSION_TRIALS.some(t => t.id === id)) : [] }, demonWar: { active: !!demonWar.active, progress: Math.max(0, Number(demonWar.progress) || 0), bestClear: Math.max(0, Number(demonWar.bestClear) || 0), clears: Math.max(0, Number(demonWar.clears) || 0), nodes: demonWarNodes }, unlockedStages: state.unlockedStages && typeof state.unlockedStages === 'object' && !Array.isArray(state.unlockedStages) ? { ...state.unlockedStages } : {} };
}
function hasCompletedAscensionTrial(player) { const s = normalizeAscensionState(player?.ascension); return ASCENSION_TRIALS.every(t => s.trial.cleared.includes(t.id)); }
function getAscensionStatus(player, materials = (typeof playerMaterials !== 'undefined' ? playerMaterials : {})) {
  const missing = [];
  if (!player) return { ready: false, missing: ['角色未初始化'] };
  player.stageProgress = typeof normalizeStageProgress === 'function' ? normalizeStageProgress(player.stageProgress) : (player.stageProgress || {});
  if ((player.realmIndex || 0) < ASCENSION_REQUIREMENTS.realmIndex) missing.push('境界需达到真仙境');
  if (!player.stageProgress?.clearedStages?.[ASCENSION_REQUIREMENTS.stageId]) missing.push('需通关仙门镇守者');
  const trib = player.tribulationClears || {}; const hasNine = trib.nine || trib.major || trib.nine_thunder || trib.final;
  if (!hasNine) missing.push('需完成九九天劫');
  if (!hasCompletedAscensionTrial(player)) missing.push('需完成飞升三劫');
  for (const mat of ASCENSION_REQUIREMENTS.materials) if ((materials?.[mat.id] || 0) < mat.count) missing.push(`${mat.name || mat.id}x${mat.count}`);
  return { ready: missing.length === 0, missing, requirements: ASCENSION_REQUIREMENTS };
}
function buildAscensionTrialEnemy(player, trial) { const power = Math.max(100, Number(player?.atk || 80) + Number(player?.def || 30)); return { id: `ascension_${trial.id}`, name: trial.name, title: `${trial.icon}${trial.name}`, hp: Math.floor((player?.maxHp || 1000) * trial.enemy.hpMult), maxHp: Math.floor((player?.maxHp || 1000) * trial.enemy.hpMult), atk: Math.floor((player?.atk || power) * trial.enemy.atkMult), def: Math.floor((player?.def || 50) * trial.enemy.defMult), isBoss: true, ascensionTrial: true, trialId: trial.id, bossMechanicId: trial.enemy.mechanism, animation: trial.animation }; }
function getAscensionTrialPlan(player) { return { nodes: ASCENSION_TRIALS.map(t => ({ ...t, enemy: buildAscensionTrialEnemy(player, t) })) }; }
function getAscensionTrialActionState(player, materials = (typeof playerMaterials !== 'undefined' ? playerMaterials : {})) {
  const state = normalizeAscensionState(player?.ascension);
  const cleared = Array.isArray(state.trial?.cleared) ? state.trial.cleared : [];
  const trialDone = ASCENSION_TRIALS.every(t => cleared.includes(t.id));
  const active = !!state.trial?.active && !trialDone;
  const tokenCount = Math.max(0, Number(materials?.ascension_trial_token || 0));
  let startReason = '';
  if (!player) startReason = '角色未初始化';
  else if (state.ascended) startReason = '已飞升仙界';
  else if (trialDone) startReason = '飞升三劫已完成';
  else if (active) startReason = '飞升三劫进行中';
  else if (tokenCount <= 0) startReason = `需要飞升试炼令（${tokenCount}/1）`;
  return {
    active,
    index: Math.max(0, Number(state.trial?.index || 0)),
    total: ASCENSION_TRIALS.length,
    tokenCount,
    trialDone,
    canStart: !startReason,
    canChallenge: active,
    startReason,
    challengeReason: active ? '' : (trialDone ? '飞升三劫已完成' : '请先消耗飞升试炼令开启三劫'),
  };
}
function startAscensionTrial(player, materials = {}) { if (!player) return { ok: false, reason: '角色未初始化' }; player.ascension = normalizeAscensionState(player.ascension); const actionState = getAscensionTrialActionState(player, materials); if (!actionState.canStart) return { ok: false, reason: actionState.startReason || '无法开启飞升三劫', actionState }; materials.ascension_trial_token = Math.max(0, Number(materials.ascension_trial_token || 0) - 1); player.ascension.trial = { active: true, index: 0, cleared: [] }; return { ok: true, plan: getAscensionTrialPlan(player), actionState }; }
function advanceAscensionTrialNode(player) { player.ascension = normalizeAscensionState(player.ascension); const node = ASCENSION_TRIALS[player.ascension.trial.index || 0]; if (!node) return { ok: false, done: true }; return { ok: true, node, enemy: buildAscensionTrialEnemy(player, node) }; }
function completeAscensionTrialNode(player, nodeId) { player.ascension = normalizeAscensionState(player.ascension); const id = nodeId || ASCENSION_TRIALS[player.ascension.trial.index]?.id; if (id && !player.ascension.trial.cleared.includes(id)) player.ascension.trial.cleared.push(id); player.ascension.trial.index += 1; if (player.ascension.trial.cleared.length >= ASCENSION_TRIALS.length) player.ascension.trial.active = false; return { ok: true, completed: id, done: !player.ascension.trial.active }; }
function performAscension(player, materials = (typeof playerMaterials !== 'undefined' ? playerMaterials : {}), options = {}) { const status = getAscensionStatus(player, materials); if (!status.ready) return { ok: false, reason: status.missing.join('、'), status }; player.ascension = normalizeAscensionState(player.ascension); if (player.ascension.ascended) return { ok: false, reason: '已飞升仙界', status }; for (const mat of ASCENSION_REQUIREMENTS.materials) materials[mat.id] = Math.max(0, (materials[mat.id] || 0) - mat.count); materials.immortal_marrow = (materials.immortal_marrow || 0) + 3; materials.immortal_jade_ascended = (materials.immortal_jade_ascended || 0) + 2; player.ascension.ascended = true; player.ascension.ascendedAt = options.now || Date.now(); player.realmIndex = ASCENSION_REALM_START_INDEX; player.xp = 0; player.stageProgress = typeof normalizeStageProgress === 'function' ? normalizeStageProgress(player.stageProgress) : (player.stageProgress || {}); player.stageProgress.unlockedStages = { ...(player.stageProgress.unlockedStages || {}), reception_platform: true }; player.stageProgress.selectedStageId = 'reception_platform'; player.ascension.unlockedStages.reception_platform = true; if (typeof player.recalcStats === 'function') player.recalcStats(); return { ok: true, message: '金光贯体，凡骨尽褪，你已飞升仙界。', status }; }
function getImmortalBodyTier(player) { const state = normalizeAscensionState(player?.ascension); return IMMORTAL_BODY_TIERS[state.immortalBody.level] || IMMORTAL_BODY_TIERS[0]; }
function getNextImmortalBodyTier(player) { const state = normalizeAscensionState(player?.ascension); return IMMORTAL_BODY_TIERS[state.immortalBody.level + 1] || null; }
function upgradeImmortalBody(player, materials = (typeof playerMaterials !== 'undefined' ? playerMaterials : {})) { if (!player) return { ok: false, reason: '角色未初始化' }; player.ascension = normalizeAscensionState(player.ascension); if (!player.ascension.ascended) return { ok: false, reason: '飞升后可淬炼仙躯' }; const next = getNextImmortalBodyTier(player); if (!next) return { ok: false, reason: '仙躯已达顶峰' }; if ((materials.immortal_marrow || 0) < next.cost) return { ok: false, reason: `需要仙髓x${next.cost}` }; materials.immortal_marrow -= next.cost; player.ascension.immortalBody.level = next.level; if (typeof player.recalcStats === 'function') player.recalcStats(); return { ok: true, tier: next }; }
function chooseAscensionClass(player, classId) { if (!player) return { ok: false, reason: '角色未初始化' }; player.ascension = normalizeAscensionState(player.ascension); if (!player.ascension.ascended) return { ok: false, reason: '飞升后可选择仙职' }; if (!ASCENSION_CLASSES[classId]) return { ok: false, reason: '未知仙职' }; if (player.ascension.classId && player.ascension.classId !== classId) return { ok: false, reason: '已选择仙职，后续开放重修' }; player.ascension.classId = classId; if (typeof player.recalcStats === 'function') player.recalcStats(); return { ok: true, classInfo: ASCENSION_CLASSES[classId] }; }
function getLawUpgradeCost(level) { return Math.max(2, 2 + Number(level || 0) * 2); }
function upgradeLaw(player, lawId, materials = (typeof playerMaterials !== 'undefined' ? playerMaterials : {})) { if (!player) return { ok: false, reason: '角色未初始化' }; const law = LAW_DEFINITIONS[lawId]; if (!law) return { ok: false, reason: '未知法则' }; player.ascension = normalizeAscensionState(player.ascension); if (!player.ascension.ascended) return { ok: false, reason: '飞升后可参悟法则' }; const level = Number(player.ascension.laws[lawId] || 0); if (level >= 10) return { ok: false, reason: '法则已圆满' }; const cost = getLawUpgradeCost(level); if ((materials[law.materialId] || 0) < cost) return { ok: false, reason: `需要${law.name}碎片x${cost}` }; materials[law.materialId] -= cost; player.ascension.laws[lawId] = level + 1; if (typeof player.recalcStats === 'function') player.recalcStats(); return { ok: true, law, level: level + 1 }; }
function mergeStatBonus(target, source, mult = 1) { for (const [stat, value] of Object.entries(source || {})) target[stat] = (target[stat] || 0) + value * mult; return target; }
function getLawMilestoneBonuses(player) { const state = normalizeAscensionState(player?.ascension); const stats = {}; for (const [lawId, level] of Object.entries(state.laws || {})) { const nodes = LAW_BREAKTHROUGH_NODES[lawId] || {}; for (const [need, bonus] of Object.entries(nodes)) if (level >= Number(need)) mergeStatBonus(stats, bonus); } return stats; }
function upgradeAscensionClassSkill(player, nodeId, materials = {}) { if (!player) return { ok: false, reason: '角色未初始化' }; player.ascension = normalizeAscensionState(player.ascension); const cls = player.ascension.classId; if (!cls) return { ok: false, reason: '请先选择仙职' }; const node = (ASCENSION_CLASS_TREES[cls]?.nodes || []).find(n => n.id === nodeId); if (!node) return { ok: false, reason: '该仙职无此节点' }; if (player.ascension.classSkills[nodeId]) return { ok: false, reason: '节点已习得' }; if ((materials.immortal_jade_ascended || 0) < node.cost) return { ok: false, reason: `需要仙玉x${node.cost}` }; materials.immortal_jade_ascended -= node.cost; player.ascension.classSkills[nodeId] = 1; if (typeof player.recalcStats === 'function') player.recalcStats(); return { ok: true, node }; }
function getAscensionClassSkillBonuses(player) { const state = normalizeAscensionState(player?.ascension); const stats = {}; for (const tree of Object.values(ASCENSION_CLASS_TREES)) for (const node of tree.nodes) if (state.classSkills[node.id]) mergeStatBonus(stats, node.stats || {}); return stats; }
function getAscensionStatBonuses(player) { const state = normalizeAscensionState(player?.ascension); const stats = {}; mergeStatBonus(stats, getImmortalBodyTier({ ascension: state }).stats || {}); if (state.classId && ASCENSION_CLASSES[state.classId]) mergeStatBonus(stats, ASCENSION_CLASSES[state.classId].stats || {}); for (const [lawId, level] of Object.entries(state.laws || {})) { const law = LAW_DEFINITIONS[lawId]; if (law && level > 0) mergeStatBonus(stats, law.statsPerLevel || {}, level); } mergeStatBonus(stats, getLawMilestoneBonuses({ ascension: state })); mergeStatBonus(stats, getAscensionClassSkillBonuses({ ascension: state })); return stats; }
function getImmortalRefineCost(item) { return { spiritStones: 18000 + (Number(item?.enhanceLevel || 0) * 1200), materials: { immortal_refine_stone: 3, immortal_jade_ascended: 2 } }; }
function isImmortalRefineEligibleRarity(item) { return ['mythic', 'legendary', '神话', '传说'].includes(item?.rarity); }
function getMaterialDisplayName(id) {
  const mat = typeof MATERIALS !== 'undefined' ? MATERIALS.find(m => m.id === id) : null;
  return mat?.name || id;
}
function getImmortalRefineActionState(player, materials = {}, item = player?.equipment?.weapon || null) {
  const cost = item ? getImmortalRefineCost(item) : getImmortalRefineCost({ enhanceLevel: 0 });
  const state = normalizeAscensionState(player?.ascension);
  if (!player) return { canRefine: false, reason: '角色未初始化', code: 'no_player', item, cost };
  if (!state.ascended) return { canRefine: false, reason: '飞升后可仙炼装备', code: 'not_ascended', item, cost };
  if (!item) return { canRefine: false, reason: '未装备武器', code: 'no_weapon', item, cost };
  if (item.immortalRefined) return { canRefine: false, reason: '武器已仙炼', code: 'refined', item, cost };
  if (!isImmortalRefineEligibleRarity(item)) return { canRefine: false, reason: '仅神话/传说装备可仙炼', code: 'rarity', item, cost };
  if (Number(item.enhanceLevel || 0) < 10) return { canRefine: false, reason: '强化+10后可仙炼', code: 'enhance', item, cost };
  if (Number(player.spiritStones || 0) < Number(cost.spiritStones || 0)) return { canRefine: false, reason: `灵石不足（${Number(player.spiritStones || 0)}/${Number(cost.spiritStones || 0)}）`, code: 'stones', item, cost };
  for (const [id, count] of Object.entries(cost.materials || {})) {
    if (Number(materials?.[id] || 0) < Number(count || 0)) return { canRefine: false, reason: `材料不足：${getMaterialDisplayName(id)} ${Number(materials?.[id] || 0)}/${Number(count || 0)}`, code: 'materials', missing: id, item, cost };
  }
  return { canRefine: true, reason: '可仙炼', code: 'ready', item, cost };
}
function immortalRefineItem(item, player, materials = {}) { const actionState = getImmortalRefineActionState(player, materials, item); if (!actionState.canRefine) return { ok: false, reason: actionState.reason, code: actionState.code, cost: actionState.cost, missing: actionState.missing }; const cost = actionState.cost; if (player) player.spiritStones -= cost.spiritStones; for (const [id, count] of Object.entries(cost.materials)) materials[id] -= count; item.immortalRefined = true; item.immortalRefinePower = 18 + Math.floor(Number(item.enhanceLevel || 0) / 2); item.immortalRefineBossDmg = 4; item.stats = { ...(item.stats || {}) }; item.stats.immortalPower = (item.stats.immortalPower || 0) + item.immortalRefinePower; item.stats.bossDmg = (item.stats.bossDmg || 0) + item.immortalRefineBossDmg; item.affixes = Array.isArray(item.affixes) ? item.affixes : []; item.affixes.push({ id: 'immortal_refine', name: '仙炼', desc: '仙力与破界伤害提升' }); if (player && typeof player.recalcStats === 'function') player.recalcStats(); return { ok: true, item, cost }; }
function getImmortalBossMechanic(id) { return IMMORTAL_BOSS_MECHANICS[id] || IMMORTAL_BOSS_MECHANICS[String(id || '').replace(/^stage_/, '')] || null; }
function applyImmortalBossMechanic(enemy, player, phase = 'turn') { const mech = getImmortalBossMechanic(enemy?.bossMechanicId || enemy?.id || enemy?.stageId); if (!mech || !enemy) return null; const state = enemy._bossMechanicState || (enemy._bossMechanicState = { turn: 0 }); const effects = []; for (const trigger of mech.triggers) { let fire = false; if (phase === 'turn' && trigger.type === 'turnInterval' && (state.turn || 0) > 0 && state.turn % trigger.every === 0) fire = true; if (phase === 'hp' && trigger.type === 'hpBelow' && enemy.maxHp && enemy.hp / enemy.maxHp <= trigger.threshold && !state[`hp${trigger.threshold}`]) { fire = true; state[`hp${trigger.threshold}`] = true; } if (fire) { const effect = trigger.effect || {}; if (effect.damagePct && player) { const dmg = Math.max(1, Math.floor((player.maxHp || 100) * effect.damagePct)); player.hp = Math.max(1, (player.hp || player.maxHp || 100) - dmg); effects.push({ type: 'damage', value: dmg }); } if (effect.drainPct && player) { const drain = Math.max(1, Math.floor((player.maxHp || 100) * effect.drainPct)); player.hp = Math.max(1, (player.hp || player.maxHp || 100) - drain); enemy.hp = Math.min(enemy.maxHp || enemy.hp || drain, (enemy.hp || 0) + drain); effects.push({ type: 'drain', value: drain }); } if (effect.atkBuff) { enemy.atk = Math.floor(enemy.atk * (1 + effect.atkBuff)); effects.push({ type: 'atkBuff', value: effect.atkBuff }); } if (effect.defBuff) { enemy.def = Math.floor(enemy.def * (1 + effect.defBuff)); effects.push({ type: 'defBuff', value: effect.defBuff }); } if (effect.status) effects.push({ type: 'status', value: effect.status }); if (effect.shieldPct) { enemy.hp = Math.min(enemy.maxHp || enemy.hp, enemy.hp + Math.floor((enemy.maxHp || enemy.hp) * effect.shieldPct)); effects.push({ type: 'shield', value: effect.shieldPct }); } } } return { mechanic: mech, effects }; }
function getDemonWarActionState(player, materials = {}) {
  const state = normalizeAscensionState(player?.ascension);
  const dw = state.demonWar || createDemonWarState();
  const nodes = Array.isArray(dw.nodes) && dw.nodes.length > 0 ? dw.nodes : DEMON_WAR_NODES;
  const total = nodes.length;
  const progress = Math.min(total, Math.max(0, Number(dw.progress || 0)));
  const bannerCount = Math.max(0, Number(materials?.demon_war_banner || 0));
  const hasBanner = bannerCount > 0;
  let startReason = '';
  if (!state.ascended) startReason = '飞升后可进入仙魔战场';
  else if (dw.active) startReason = '仙魔战场进行中';
  else if (!hasBanner) startReason = `需要仙魔战旗（${bannerCount}/1）`;
  return {
    active: !!dw.active,
    progress,
    total,
    nodes,
    nextNode: dw.active && progress < total ? nodes[progress] : null,
    canStart: !!state.ascended && !dw.active && hasBanner,
    canAdvance: !!dw.active && progress < total,
    canSettle: !!dw.active && progress >= total,
    startReason,
    advanceReason: !dw.active ? '请先开启仙魔战场' : (progress >= total ? '已完成全部节点' : ''),
    settleReason: !dw.active ? '未在仙魔战场' : (progress < total ? `尚未打通仙魔战场（${progress}/${total}）` : ''),
  };
}
function startDemonWarRun(player, materials = {}) { if (!player) return { ok: false, reason: '角色未初始化' }; player.ascension = normalizeAscensionState(player.ascension); const actionState = getDemonWarActionState(player, materials); if (!actionState.canStart) return { ok: false, reason: actionState.startReason || '无法开启仙魔战场' }; materials.demon_war_banner = Math.max(0, Number(materials.demon_war_banner || 0) - 1); const nodes = [...DEMON_WAR_NODES]; player.ascension.demonWar = { active: true, progress: 0, bestClear: player.ascension.demonWar?.bestClear || 0, clears: player.ascension.demonWar?.clears || 0, nodes }; return { ok: true, nodes }; }
function advanceDemonWarNode(player) { player.ascension = normalizeAscensionState(player?.ascension); const idx = player.ascension.demonWar.progress || 0; const nodes = player.ascension.demonWar.nodes?.length ? player.ascension.demonWar.nodes : DEMON_WAR_NODES; const total = nodes.length; const name = nodes[idx]; if (!name) return { ok: false, done: true, index: idx, total }; const boss = idx >= total - 1; return { ok: true, index: idx, total, nodeName: name, enemy: { id: boss ? 'demon_lord_shadow' : `demon_war_${idx}`, name, title: `${boss ? '😈' : '🛡️'}${name}`, hp: 1800 + idx * 900, maxHp: 1800 + idx * 900, atk: 220 + idx * 90, def: 120 + idx * 45, isBoss: boss, demonWar: true, demonWarNodeIndex: idx, demonWarTotal: total, demonWarNodeName: name, bossMechanicId: boss ? 'demon_lord_shadow' : 'nether_king' } }; }
function completeDemonWarRun(player, materials = {}) { player.ascension = normalizeAscensionState(player?.ascension); const actionState = getDemonWarActionState(player, materials); if (!actionState.active) return { ok: false, reason: actionState.settleReason || '未在仙魔战场' }; const total = actionState.total; const score = actionState.progress; if (!actionState.canSettle) return { ok: false, reason: actionState.settleReason || `尚未打通仙魔战场（${score}/${total}）`, score, total }; player.ascension.demonWar.active = false; player.ascension.demonWar.clears += 1; player.ascension.demonWar.bestClear = Math.max(player.ascension.demonWar.bestClear, score); materials.immortal_jade_ascended = (materials.immortal_jade_ascended || 0) + 8 + score * 2; materials.law_fragment_void = (materials.law_fragment_void || 0) + 2; materials.law_fragment_nether = (materials.law_fragment_nether || 0) + 2; return { ok: true, score, rewards: { immortal_jade_ascended: 8 + score * 2 } }; }
