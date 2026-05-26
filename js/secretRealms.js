// Secret Realm System — short high-risk instanced dungeons
// Each realm is a 3-5 node gauntlet with scaled enemies, event rooms, and a boss reward.

const SECRET_REALM_KEYS = {
  herb:  { id: 'secret_key_herb',  name: '灵草秘境令', icon: '🌿', rarity: 'uncommon', color: '#55aa55', desc: '开启灵草秘境所需凭证' },
  forge: { id: 'secret_key_forge', name: '炼器秘境令', icon: '⛏️', rarity: 'uncommon', color: '#cc8844', desc: '开启炼器秘境所需凭证' },
  artifact: { id: 'secret_key_artifact', name: '神器秘境令', icon: '🗡️', rarity: 'rare', color: '#d4a0ff', desc: '开启神器秘境所需凭证' },
  tribulation: { id: 'tribulation_mark', name: '天劫印记', icon: '⚡', rarity: 'legendary', color: '#ffdd44', desc: '渡劫秘境所需凭证，雷劫淬体所用' },
};

const SECRET_REALMS = {
  herb: {
    id: 'herb',
    name: '灵草秘境',
    icon: '🌿',
    desc: '草木灵气浓郁，可采集炼丹材料。',
    unlockRealm: 1, // 筑基期
    rooms: 4,
    flavor: '灵气充沛的低阶秘境，妖兽以草木精怪为主，掉落大量炼丹灵材。',
    monsterPool: ['venomFang', 'thornBind', 'flameSpit'],
    bossSkillExtra: [],
    keyId: 'secret_key_herb',
    materialRewards: ['herb', 'ginseng'],
    rewardType: 'alchemy',
    featuredDrops: ['herb', 'ginseng'],
    tip: '适合补炼丹材料，首通额外给大量灵草。',
    color: '#55aa55',
    strongAgainst: 'atk',
  },
  forge: {
    id: 'forge',
    name: '炼器秘境',
    icon: '⛏️',
    desc: '残破古矿中埋有强化灵材，妖兽甲壳坚硬。',
    unlockRealm: 2, // 金丹期
    rooms: 5,
    flavor: '废弃矿脉中妖兽甲壳坚如磐石，击败后可获得大量强化材料。',
    monsterPool: ['rockSmash', 'ironShell', 'lavaBurst'],
    bossSkillExtra: ['ironShell'],
    keyId: 'secret_key_forge',
    materialRewards: ['stoneMarrow', 'starDust'],
    rewardType: 'enhance',
    featuredDrops: ['stoneMarrow', 'starDust'],
    tip: '适合强化装备，妖兽防御较高，建议带破防/灼烧。',
    color: '#cc8844',
    strongAgainst: 'def',
  },
  artifact: {
    id: 'artifact',
    name: '神器秘境',
    icon: '🗡️',
    desc: '上古神器气息残留，首领镇守核心碎片。',
    unlockRealm: 4, // 化神期
    rooms: 5,
    flavor: '上古战场遗址，残存神器威压。精英层层守卫，Boss 持有纯净神器核心。',
    monsterPool: ['shadowBackstab', 'ghostCurse', 'abyssCleave'],
    bossSkillExtra: ['bossEnrage'],
    keyId: 'secret_key_artifact',
    materialRewards: ['artifact_shard_zhuxian', 'artifact_shard_haotian', 'artifact_shard_lianyao', 'artifact_shard_qiankun', 'artifact_shard_leifa', 'artifact_essence', 'artifact_core'],
    rewardType: 'artifact',
    featuredDrops: ['artifact_shard_zhuxian', 'artifact_shard_haotian', 'artifact_shard_lianyao', 'artifact_shard_qiankun', 'artifact_shard_leifa', 'artifact_essence', 'artifact_core'],
    tip: '高阶神器材料来源，主要产出各神器碎片，少量产出神源/神器核心。',
    color: '#d4a0ff',
    strongAgainst: 'atk',
  },
  tribulation: {
    id: 'tribulation',
    name: '天劫秘境',
    icon: '⚡',
    desc: '提前感应雷劫，磨炼肉身与元神。',
    unlockRealm: 8, // 渡劫期
    rooms: 3,
    flavor: '天地雷劫之力在此凝聚。每关承受雷击式战斗，失败亦有淬体收益。',
    monsterPool: ['dragonBreath', 'frostDomain', 'shuraCombo'],
    bossSkillExtra: ['bossEnrage', 'dragonBreath'],
    keyId: 'tribulation_mark',
    materialRewards: ['soulJade', 'starDust'],
    rewardType: 'tribulation',
    featuredDrops: ['tribulation_mark', 'soulJade', 'starDust'],
    tip: '偏高压挑战，失败不返还消耗，适合渡劫前冲刺。',
    color: '#ffdd44',
    strongAgainst: 'atk',
  },
};

const SECRET_REALM_DIFFICULTIES = {
  normal: { name: '普通', mult: { hp: 1, atk: 1, def: 1, reward: 1 }, stoneCost: 0 },
  hard:   { name: '困难', mult: { hp: 1.45, atk: 1.35, def: 1.25, reward: 1.6 }, stoneCost: 0 },
  hell:   { name: '炼狱', mult: { hp: 2.2, atk: 1.9, def: 1.65, reward: 2.6 }, stoneCost: 0 },
};

// Events that can appear in non-boss rooms
const SECRET_REALM_EVENTS = [
  {
    id: 'spring',
    name: '灵泉',
    icon: '🫧',
    desc: '发现灵泉，恢复 30% 生命和灵力。',
    apply: (player) => {
      player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.3));
      player.mp = Math.min(player.maxMp, player.mp + Math.floor(player.maxMp * 0.3));
      return { msg: '灵泉滋润身心，生命和灵力恢复 30%' };
    },
    weight: 20,
  },
  {
    id: 'stele',
    name: '古碑',
    icon: '🪦',
    desc: '参悟古碑，本次秘境攻击 +15%，但受到伤害 +10%。',
    apply: (player) => {
      player.tempAtkBuff = (player.tempAtkBuff || 0) + 0.15;
      if (!player._secretRealmDebuffs) player._secretRealmDebuffs = [];
      player._secretRealmDebuffs.push({ type: 'takenDmgUp', ratio: 0.10, turns: 99 });
      return { msg: '领悟上古战技，攻击提升 15%，但所受伤害 +10%' };
    },
    weight: 16,
  },
  {
    id: 'merchant',
    name: '云游商人',
    icon: '🧳',
    desc: '秘境商人出现，可用灵石购买材料或钥匙。',
    apply: (player) => {
      return { msg: '商人只留下一个空摊子，匆匆离开了。', id: 'merchant' };
    },
    weight: 14,
  },
  {
    id: 'altar',
    name: '血祭坛',
    icon: '🔴',
    desc: '献祭 20% 当前生命，提升最终奖励 30%。',
    apply: (player) => {
      const cost = Math.floor(player.hp * 0.2);
      player.hp = Math.max(1, player.hp - cost);
      if (!player._secretRealmBuff) player._secretRealmBuff = { rewardBoost: 0 };
      player._secretRealmBuff.rewardBoost += 0.30;
      return { msg: `献祭 ${cost} 生命，最终奖励提升 30%` };
    },
    weight: 12,
  },
  {
    id: 'trap',
    name: '残阵',
    icon: '⚠️',
    desc: '触发残阵，损失 12% 当前生命。',
    apply: (player) => {
      const dmg = Math.floor(player.hp * 0.12);
      player.hp = Math.max(1, player.hp - dmg);
      return { msg: `残阵爆发，损失 ${dmg} 生命` };
    },
    weight: 18,
  },
];

function getShuffledEvents(rng = Math.random) {
  const pool = [...SECRET_REALM_EVENTS];
  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
  const result = [];
  const used = new Set();
  for (let i = 0; i < Math.min(2, pool.length); i++) {
    let roll = rng() * totalWeight;
    for (const e of pool) {
      if (used.has(e.id)) continue;
      roll -= e.weight;
      if (roll <= 0) {
        result.push(e);
        used.add(e.id);
        break;
      }
    }
  }
  return result;
}

function getSecretRealmKeyInfo(keyId) {
  const key = Object.values(SECRET_REALM_KEYS).find(k => k.id === keyId);
  if (key) return key;
  const material = (typeof MATERIALS !== 'undefined' ? MATERIALS : []).find(m => m.id === keyId);
  if (material) return material;
  return { id: keyId, name: '秘境令', icon: '🔑' };
}

function getSecretRealmEntryCost(realmId, difficulty = 'normal') {
  const realm = SECRET_REALMS[realmId];
  if (!realm) return { ok: false, reason: '未知秘境' };
  // Normal difficulty: can use key OR spirit stones
  if (difficulty === 'normal') {
    return { ok: true, keyId: realm.keyId, stones: 50, keyRequired: false };
  }
  return { ok: true, keyId: realm.keyId, stones: 0, keyRequired: true };
}

function hasSecretRealmEntry(player, realmId, difficulty = 'normal', materials = playerMaterials) {
  const realm = SECRET_REALMS[realmId];
  if (!realm) return { ok: false, reason: '未知秘境' };
  if ((player.realmIndex || 0) < realm.unlockRealm) {
    return { ok: false, reason: `${REALMS[realm.unlockRealm]?.name || ''}后可进入` };
  }
  const keyInfo = getSecretRealmKeyInfo(realm.keyId);
  const keyName = `${keyInfo.icon || '🔑'}${keyInfo.name || '秘境令'}`;
  if (difficulty === 'normal') {
    const hasKey = materials?.[realm.keyId] > 0;
    if (hasKey) return { ok: true, cost: { key: realm.keyId }, costText: `${keyName} x1` };
    return { ok: true, cost: { stones: 50 }, costText: '灵石 x50' }; // fallback for normal difficulty
  }
  if (!materials?.[realm.keyId]) {
    return { ok: false, reason: `缺少 ${keyName} x1`, hint: '困难/炼狱需要对应秘境令', materials: true };
  }
  return { ok: true, cost: { key: realm.keyId }, costText: `${keyName} x1` };
}

function paySecretRealmEntry(player, realmId, difficulty, materials) {
  const check = hasSecretRealmEntry(player, realmId, difficulty, materials);
  if (!check.ok) return false;
  if (check.cost?.key) {
    materials[check.cost.key] = (materials[check.cost.key] || 0) - 1;
    return true;
  }
  if (check.cost?.stones) {
    if (player.spiritStones < check.cost.stones) return false;
    player.spiritStones -= check.cost.stones;
    return true;
  }
  return true;
}

function generateSecretRealmRoomEvents(realmId, rng = Math.random) {
  const events = getShuffledEvents(rng);
  return events.length > 0 ? events[0] : null;
}

function getSecretRealmMaterialName(id) {
  const key = getSecretRealmKeyInfo(id);
  if (key && key.id === id && key.name && key.name !== '秘境令') return `${key.icon || ''}${key.name}`;
  const material = (typeof MATERIALS !== 'undefined' ? MATERIALS : []).find(m => m.id === id);
  if (material) return `${material.icon || ''}${material.name}`;
  const artifactMat = (typeof ARTIFACT_MATERIALS !== 'undefined' ? ARTIFACT_MATERIALS : []).find(m => m.id === id);
  if (artifactMat) return `${artifactMat.icon || ''}${artifactMat.name}`;
  const fallback = {
    herb: '🌿灵草',
    ginseng: '🪴人参',
    stoneMarrow: '🪨石髓',
    starDust: '✨星尘',
    soulJade: '💠魂玉',
    artifact_core: '🗡️神器核心',
  };
  return fallback[id] || String(id || '材料');
}

function getSecretRealmPreview(player, realmId, difficulty = 'normal', materials = (typeof playerMaterials !== 'undefined' ? playerMaterials : {})) {
  const realm = SECRET_REALMS[realmId];
  if (!realm) return null;
  const diff = SECRET_REALM_DIFFICULTIES[difficulty] || SECRET_REALM_DIFFICULTIES.normal;
  const entry = hasSecretRealmEntry(player, realmId, difficulty, materials);
  const isFirstClear = !(player?.secretRealmClears?.[realmId]?.[difficulty]);
  const rewardBoost = Math.max(0, Number(player?._secretRealmBuff?.rewardBoost || 0));
  const rewardMult = diff.mult.reward * (1 + rewardBoost);
  const xp = Math.floor(80 * rewardMult);
  const spiritStones = Math.floor(60 * rewardMult);
  const materialLines = (realm.materialRewards || []).map(id => {
    const baseMin = 1 + (isFirstClear ? 2 : 0);
    const baseMax = 2 + (isFirstClear ? 2 : 0);
    return `${getSecretRealmMaterialName(id)}x${Math.max(1, Math.floor(baseMin * rewardMult))}-${Math.max(1, Math.floor(baseMax * rewardMult))}`;
  });
  const featured = (realm.featuredDrops || realm.materialRewards || []).map(getSecretRealmMaterialName).join('、') || '经验、灵石';
  return {
    realmId,
    difficulty,
    difficultyName: diff.name,
    rooms: realm.rooms,
    entry,
    isFirstClear,
    rewardMult,
    xp,
    spiritStones,
    materialLines,
    featured,
    danger: `生命×${diff.mult.hp} 攻击×${diff.mult.atk} 防御×${diff.mult.def}`,
  };
}

function createSecretRealmEnemy(realm, difficulty, floorLevel, baseTemplate, isBoss = false, rng = Math.random) {
  const diff = SECRET_REALM_DIFFICULTIES[difficulty] || SECRET_REALM_DIFFICULTIES.normal;
  const mult = diff.mult;
  const template = {
    name: baseTemplate.name,
    symbol: baseTemplate.symbol || '妖',
    hp: Math.floor(baseTemplate.hp * mult.hp * (isBoss ? 1.5 : 1)),
    atk: Math.floor(baseTemplate.atk * mult.atk * (isBoss ? 1.25 : 1)),
    def: Math.floor(baseTemplate.def * mult.def * (isBoss ? 1.2 : 1)),
    xp: Math.floor((baseTemplate.xp || 20) * mult.reward * (isBoss ? 2 : 1)),
    stones: Math.floor((baseTemplate.stones || 5) * mult.reward * (isBoss ? 2.5 : 1)),
    color: realm.color || '#c05060',
    isBoss,
    title: isBoss ? `${realm.name}守护者` : `${realm.name}妖物`,
    skillIds: [...(isBoss ? [...realm.bossSkillExtra || [], ...realm.monsterPool || []] : realm.monsterPool || [])],
  };
  return template;
}

function pickSecretRealmRewardMaterials(realm, isFirstClear, rewardMult, rng = Math.random) {
  const rewards = [];
  const pool = Array.isArray(realm?.materialRewards) ? realm.materialRewards.filter(Boolean) : [];
  if (!pool.length) return rewards;
  if (realm.rewardType !== 'artifact') {
    return pool.map(id => {
      const count = Math.max(1, Math.floor(rng() * 2 + 1) + (isFirstClear ? 2 : 0));
      return { id, count: Math.floor(count * rewardMult) };
    });
  }
  const shardPool = pool.filter(id => String(id).startsWith('artifact_shard_'));
  const rarePool = pool.filter(id => id === 'artifact_essence' || id === 'artifact_core');
  const picks = [];
  const shardPickCount = isFirstClear ? 3 : 2;
  for (let i = 0; i < shardPickCount; i++) {
    const id = shardPool[Math.floor(rng() * shardPool.length)];
    if (id) picks.push(id);
  }
  if (rarePool.length) {
    const rareChance = isFirstClear ? 0.85 : 0.38;
    if (rng() < rareChance) picks.push(rng() < 0.18 ? 'artifact_core' : 'artifact_essence');
  }
  const merged = {};
  picks.forEach(id => { merged[id] = (merged[id] || 0) + Math.max(1, Math.floor((1 + (isFirstClear ? 1 : 0)) * rewardMult)); });
  Object.entries(merged).forEach(([id, count]) => rewards.push({ id, count }));
  return rewards;
}

function getSecretRealmRewards(player, realmId, difficulty, isFirstClear, rng = Math.random) {
  const realm = SECRET_REALMS[realmId];
  if (!realm) return { xp: 0, spiritStones: 0, materials: [] };
  const diff = SECRET_REALM_DIFFICULTIES[difficulty] || SECRET_REALM_DIFFICULTIES.normal;
  const rewardBoost = Math.max(0, Number(player._secretRealmBuff?.rewardBoost || 0));
  const rewardMult = diff.mult.reward * (1 + rewardBoost);

  const xp = Math.floor(80 * rewardMult);
  const stones = Math.floor(60 * rewardMult);
  
  const materials = pickSecretRealmRewardMaterials(realm, isFirstClear, rewardMult, rng);
  const tokenChanceByDifficulty = { normal: 0.35, hard: 0.55, hell: 0.85 };
  const tokenChance = tokenChanceByDifficulty[difficulty] ?? tokenChanceByDifficulty.normal;
  if (realm.keyId && (isFirstClear || rng() < tokenChance)) {
    const tokenCount = isFirstClear ? 1 : (difficulty === 'hell' ? 2 : 1);
    materials.push({ id: realm.keyId, count: tokenCount });
  }

  return { xp, spiritStones: stones, materials };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SECRET_REALMS, SECRET_REALM_DIFFICULTIES, SECRET_REALM_KEYS, SECRET_REALM_EVENTS,
    getShuffledEvents, getSecretRealmKeyInfo, getSecretRealmEntryCost, hasSecretRealmEntry, paySecretRealmEntry,
    generateSecretRealmRoomEvents, getSecretRealmMaterialName, getSecretRealmPreview, createSecretRealmEnemy, pickSecretRealmRewardMaterials, getSecretRealmRewards,
  };
}
