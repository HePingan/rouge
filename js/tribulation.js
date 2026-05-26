// Tribulation System — breakthrough-adjacent thunder trials

const TRIBULATION_AFFIXES = {
  flame: { id: 'flame', name: '赤焰雷', icon: '🔥', desc: '雷劫攻击提高，附带灼烧', atkMult: 1.10, status: { type: 'burn', turns: 2, ratio: 0.10 } },
  frost: { id: 'frost', name: '玄冰雷', icon: '❄️', desc: '雷劫防御提高，附带减速', defMult: 1.12, debuff: { type: 'slow', turns: 2, ratio: 0.12 } },
  demon: { id: 'demon', name: '心魔雷', icon: '👁️', desc: '消耗灵力，心魔抗性可抵消', mpDrain: 0.12 },
  sunder: { id: 'sunder', name: '破甲雷', icon: '🪓', desc: '雷劫破甲，防御承压更高', atkMult: 1.08, defPierce: 0.18 },
  devour: { id: 'devour', name: '噬灵雷', icon: '🌀', desc: '每道雷劫额外噬灵', mpDrain: 0.18 },
  punishment: { id: 'punishment', name: '天罚雷', icon: '⚡', desc: 'Boss雷劫大幅增强', bossAtkMult: 1.22, bossHpMult: 1.16 },
  lifeDeath: { id: 'lifeDeath', name: '生灭雷', icon: '☯️', desc: '低血更危险，胜后恢复更多', atkMult: 1.06, recoverBoost: 0.16 },
  temper: { id: 'temper', name: '淬体雷', icon: '💪', desc: '难度提高，但淬体进度增加', hpMult: 1.12, temperBonus: 16 },
};

const TRIBULATIONS = {
  minor: {
    id: 'minor', name: '小天劫', icon: '🌩️', unlockRealm: 7, waves: 3,
    desc: '大乘期开放的入门雷劫，适合积累雷劫精华与淬体进度。',
    cost: { spiritStones: 120 }, rewards: { essence: 3, bodyTemper: 18, xp: 320 },
    affixes: ['flame', 'frost', 'temper'], enemyMult: { hp: 1.0, atk: 1.0, def: 1.0 }, requiredClear: null,
  },
  three_nine: {
    id: 'three_nine', name: '三九天劫', icon: '⚡', unlockRealm: 8, waves: 3,
    desc: '渡劫期核心门槛，成功后获得三九雷印。',
    cost: { spiritStones: 260, essence: 2 }, rewards: { essence: 6, bodyTemper: 28, xp: 720, mark: '三九雷印' },
    affixes: ['flame', 'demon', 'sunder', 'temper'], enemyMult: { hp: 1.28, atk: 1.24, def: 1.12 }, requiredClear: null,
  },
  six_nine: {
    id: 'six_nine', name: '六九天劫', icon: '🌌', unlockRealm: 8, waves: 6,
    desc: '高风险高收益的连续雷劫，失败也能获得保底淬体。',
    cost: { spiritStones: 520, essence: 5 }, rewards: { essence: 12, bodyTemper: 46, xp: 1380, mark: '六九雷印' },
    affixes: ['flame', 'frost', 'demon', 'sunder', 'devour', 'temper'], enemyMult: { hp: 1.55, atk: 1.48, def: 1.30 }, requiredClear: 'three_nine',
  },
  nine_nine: {
    id: 'nine_nine', name: '九九天劫', icon: '👑', unlockRealm: 9, waves: 9,
    desc: '飞升前终极考验，九道劫雷全部扛过才算功成。',
    cost: { spiritStones: 1080, essence: 12 }, rewards: { essence: 24, bodyTemper: 80, xp: 3200, mark: '九九雷印' },
    affixes: ['flame', 'frost', 'demon', 'sunder', 'devour', 'punishment', 'lifeDeath', 'temper'], enemyMult: { hp: 1.95, atk: 1.86, def: 1.55 }, requiredClear: 'six_nine',
  },
};

function getTribulationClears(player, tribulationId) {
  return Number(player?.tribulationClears?.[tribulationId] || 0);
}

function getTribulationCostText(trial) {
  const parts = [];
  const cost = trial?.cost || {};
  if (cost.spiritStones) parts.push(`灵石 x${cost.spiritStones}`);
  if (cost.essence) parts.push(`雷劫精华 x${cost.essence}`);
  return parts.join('、') || '无消耗';
}

function getTribulationAvailability(player, tribulationId) {
  const trial = TRIBULATIONS[tribulationId];
  if (!trial) return { ok: false, reason: '未知天劫' };
  if (Number(player?.realmIndex || 0) < trial.unlockRealm) return { ok: false, reason: `需要达到${REALMS?.[trial.unlockRealm]?.name || trial.unlockRealm}后开放` };
  if (trial.requiredClear && getTribulationClears(player, trial.requiredClear) <= 0) {
    const prev = TRIBULATIONS[trial.requiredClear];
    return { ok: false, reason: `需先通关${prev?.name || trial.requiredClear}` };
  }
  const cost = trial.cost || {};
  if (Number(player?.spiritStones || 0) < Number(cost.spiritStones || 0)) return { ok: false, reason: `缺少灵石 x${Number(cost.spiritStones || 0) - Number(player?.spiritStones || 0)}` };
  if (Number(player?.tribulationEssence || 0) < Number(cost.essence || 0)) return { ok: false, reason: `缺少雷劫精华 x${Number(cost.essence || 0) - Number(player?.tribulationEssence || 0)}` };
  return { ok: true, reason: '可挑战', costText: getTribulationCostText(trial) };
}

function consumeTribulationCost(player, tribulationId) {
  const trial = TRIBULATIONS[tribulationId];
  const check = getTribulationAvailability(player, tribulationId);
  if (!check.ok) return check;
  const cost = trial.cost || {};
  player.spiritStones = Math.max(0, Number(player.spiritStones || 0) - Number(cost.spiritStones || 0));
  player.tribulationEssence = Math.max(0, Number(player.tribulationEssence || 0) - Number(cost.essence || 0));
  return { ok: true, costText: getTribulationCostText(trial) };
}

function selectTribulationAffix(trial, waveIndex) {
  const ids = trial?.affixes || Object.keys(TRIBULATION_AFFIXES);
  const id = ids[waveIndex % ids.length];
  return TRIBULATION_AFFIXES[id] || TRIBULATION_AFFIXES.flame;
}

function buildTribulationEnemy(player, tribulationId, waveIndex) {
  const trial = TRIBULATIONS[tribulationId] || TRIBULATIONS.minor;
  const affix = selectTribulationAffix(trial, waveIndex);
  const realm = Math.max(0, Number(player?.realmIndex || 0));
  const wave = Math.max(0, Number(waveIndex || 0));
  const isBoss = wave >= trial.waves - 1;
  const resist = Math.max(0, Number(player?.tribulationResist || 0)) / 100;
  const base = 70 + realm * 48 + wave * 28;
  const hpMult = (trial.enemyMult?.hp || 1) * (affix.hpMult || 1) * (isBoss ? (1.55 * (affix.bossHpMult || 1)) : 1) * Math.max(0.72, 1 - resist * 0.35);
  const atkMult = (trial.enemyMult?.atk || 1) * (affix.atkMult || 1) * (isBoss ? (1.28 * (affix.bossAtkMult || 1)) : 1) * Math.max(0.68, 1 - resist * 0.45);
  const defMult = (trial.enemyMult?.def || 1) * (affix.defMult || 1) * (isBoss ? 1.18 : 1);
  return {
    name: `${affix.name}·第${wave + 1}道`, title: `${trial.icon}${trial.name} ${affix.icon}${affix.name}`,
    symbol: '劫', color: '#ffe27a', isBoss, isElite: true, isTribulation: true,
    tribulationId, tribulationWave: wave, affixId: affix.id,
    hp: Math.floor(base * hpMult), maxHp: Math.floor(base * hpMult),
    atk: Math.floor((16 + realm * 9 + wave * 5) * atkMult),
    def: Math.floor((7 + realm * 5 + wave * 3) * defMult),
    xp: Math.floor((45 + realm * 26 + wave * 18) * (isBoss ? 1.8 : 1)),
    stones: 0,
    skillIds: isBoss ? ['bossEnrage', 'dragonBreath'] : ['rockSmash'],
    _tribulationAffix: affix,
  };
}

function getTribulationRewards(player, tribulationId, success = true) {
  const trial = TRIBULATIONS[tribulationId] || TRIBULATIONS.minor;
  const rewards = trial.rewards || {};
  const mult = success ? 1 : 0.35;
  return {
    xp: Math.max(1, Math.floor(Number(rewards.xp || 0) * mult)),
    essence: Math.max(success ? 1 : 0, Math.floor(Number(rewards.essence || 0) * mult)),
    bodyTemper: Math.max(1, Math.floor(Number(rewards.bodyTemper || 0) * (success ? 1 : 0.45))),
    mark: success ? rewards.mark : null,
  };
}

function applyTribulationSuccess(player, tribulationId) {
  const rewards = getTribulationRewards(player, tribulationId, true);
  player.gainXp?.(rewards.xp);
  player.tribulationEssence = Number(player.tribulationEssence || 0) + rewards.essence;
  player.bodyTemperLevel = Number(player.bodyTemperLevel || 0) + rewards.bodyTemper;
  player.tribulationClears = player.tribulationClears || {};
  player.tribulationClears[tribulationId] = getTribulationClears(player, tribulationId) + 1;
  if (rewards.mark) {
    player.tribulationMarks = player.tribulationMarks || {};
    player.tribulationMarks[tribulationId] = rewards.mark;
  }
  return rewards;
}

function applyTribulationFailure(player, tribulationId) {
  const rewards = getTribulationRewards(player, tribulationId, false);
  player.gainXp?.(rewards.xp);
  player.tribulationEssence = Number(player.tribulationEssence || 0) + rewards.essence;
  player.bodyTemperLevel = Number(player.bodyTemperLevel || 0) + rewards.bodyTemper;
  return rewards;
}
