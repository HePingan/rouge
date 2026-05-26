// Stage / Dungeon Chapter System — 梦西游式副本关卡

const STAGE_CHAPTERS = {
  qingyun: {
    id: 'qingyun',
    name: '青云山',
    icon: '⛰️',
    color: '#8ed8ff',
    desc: '新手山门，适合练气期修士历练。',
    realmRequired: 0,
    stages: ['qingyun_foot', 'qingyun_peak'],
    chapterBonus: { desc: '青云试炼者', xp: 80, spiritStones: 40, materials: [{ id: 'qingyun_fur', count: 3 }] },
  },
  blood_cave: {
    id: 'blood_cave',
    name: '血煞洞',
    icon: '🩸',
    color: '#ff6688',
    desc: '妖气凝聚的洞窟，产出筑基装备与材料。',
    realmRequired: 1,
    stages: ['blood_entrance', 'blood_depth'],
    chapterBonus: { desc: '血煞讨伐者', xp: 180, spiritStones: 100, materials: [{ id: 'blood_crystal', count: 5 }] },
  },
  thunder_peak: {
    id: 'thunder_peak',
    name: '雷劫峰',
    icon: '⚡',
    color: '#ffe27a',
    desc: '雷云不散的山巅，首次通关会开启天劫成长线。',
    realmRequired: 2,
    stages: ['thunder_peak'],
    chapterBonus: { desc: '渡劫行者', xp: 260, spiritStones: 160, materials: [{ id: 'thunder_core', count: 3 }] },
  },
  yaogu_valley: {
    id: 'yaogu_valley', name: '万妖谷', icon: '🐍', color: '#7ee072',
    desc: '元婴期妖族谷地，开始进入中期主线。', realmRequired: 3,
    stages: ['yaogu_outer', 'yaogu_core'],
    chapterBonus: { desc: '万妖镇谷者', xp: 520, spiritStones: 260, materials: [{ id: 'yaogu_essence', count: 4 }] },
  },
  nether_palace: {
    id: 'nether_palace', name: '幽冥殿', icon: '👻', color: '#b086ff',
    desc: '化神期魂殿，考验持续作战。', realmRequired: 4,
    stages: ['nether_gate', 'nether_throne'],
    chapterBonus: { desc: '幽冥破殿者', xp: 760, spiritStones: 380, materials: [{ id: 'nether_jade', count: 4 }] },
  },
  void_rift: {
    id: 'void_rift', name: '虚空裂隙', icon: '🌀', color: '#8aa0ff',
    desc: '炼虚期空间裂隙，怪物强度显著提高。', realmRequired: 5,
    stages: ['void_edge', 'void_heart'],
    chapterBonus: { desc: '虚空行者', xp: 1100, spiritStones: 560, materials: [{ id: 'void_shard', count: 4 }] },
  },
  demon_battlefield: {
    id: 'demon_battlefield', name: '天魔战场', icon: '😈', color: '#ff8a55',
    desc: '合体期古战场，首领拥有强压制技能。', realmRequired: 6,
    stages: ['demon_front', 'demon_lord'],
    chapterBonus: { desc: '天魔斩将者', xp: 1580, spiritStones: 780, materials: [{ id: 'demon_blade', count: 4 }] },
  },
  ascension_platform: {
    id: 'ascension_platform', name: '登仙台', icon: '🌌', color: '#ffd98e',
    desc: '大乘期登仙试炼，通向渡劫前最后主线。', realmRequired: 7,
    stages: ['ascension_steps', 'ascension_guardian'],
    chapterBonus: { desc: '登仙问道者', xp: 2200, spiritStones: 1100, materials: [{ id: 'ascension_stone', count: 4 }] },
  },
  nine_thunder: {
    id: 'nine_thunder', name: '九重雷劫', icon: '🌩️', color: '#f6e05e',
    desc: '渡劫期终章试炼，九重天雷淬炼道体。', realmRequired: 8,
    stages: ['thunder_trial', 'thunder_palace'],
    chapterBonus: { desc: '九劫证道者', xp: 3200, spiritStones: 1600, materials: [{ id: 'nine_thunder_seal', count: 4 }] },
  },
  immortal_gate: {
    id: 'immortal_gate', name: '仙界之门', icon: '🚪', color: '#f7fafc',
    desc: '真仙境终章，叩开仙门完成当前主线。', realmRequired: 9,
    stages: ['immortal_path', 'immortal_gatekeeper'],
    chapterBonus: { desc: '真仙开门者', xp: 4800, spiritStones: 2400, materials: [{ id: 'immortal_jade', count: 4 }] },
  },
  reception_immortal_domain: {
    id: 'reception_immortal_domain', name: '接引仙域', icon: '☁️', color: '#c8f7ff',
    desc: '飞升后的第一片仙域，淬炼仙躯并积累仙玉。', realmRequired: 10,
    stages: ['reception_platform', 'cloudsea_road', 'immortal_spirit_trial'],
    chapterBonus: { desc: '接引散仙', xp: 12000, spiritStones: 5200, materials: [{ id: 'immortal_marrow', count: 4 }, { id: 'law_fragment_sword', count: 3 }] },
  },
  mystic_thunder_domain: {
    id: 'mystic_thunder_domain', name: '玄雷天域', icon: '⚡', color: '#ffe27a',
    desc: '仙界雷罚汇聚之地，产出雷之法则与雷劫仙髓。', realmRequired: 11,
    stages: ['mystic_thunder_pool', 'thunder_punish_palace', 'nine_sky_thunder_altar'],
    chapterBonus: { desc: '玄雷地仙', xp: 22000, spiritStones: 9600, materials: [{ id: 'law_fragment_thunder', count: 6 }, { id: 'immortal_marrow', count: 5 }] },
  },
  immortal_forge_palace: {
    id: 'immortal_forge_palace', name: '万器仙宫', icon: '🔨', color: '#ffcf8a',
    desc: '仙器炉火不熄，产出器之法则与仙炼材料。', realmRequired: 12,
    stages: ['forge_outer_hall', 'immortal_armory', 'haotian_forge'],
    chapterBonus: { desc: '万器仙匠', xp: 36000, spiritStones: 14800, materials: [{ id: 'law_fragment_forge', count: 7 }, { id: 'immortal_refine_stone', count: 4 }] },
  },
  nether_rift_domain: {
    id: 'nether_rift_domain', name: '幽都裂界', icon: '👻', color: '#b086ff',
    desc: '幽冥与仙界交叠的裂隙，产出幽冥法则。', realmRequired: 13,
    stages: ['nether_ferry', 'soul_river_bridge', 'nether_immortal_throne'],
    chapterBonus: { desc: '幽都冥仙', xp: 52000, spiritStones: 21000, materials: [{ id: 'law_fragment_nether', count: 8 }, { id: 'immortal_jade_ascended', count: 6 }] },
  },
  immortal_demon_battlefield: {
    id: 'immortal_demon_battlefield', name: '仙魔战场', icon: '😈', color: '#ff8a55',
    desc: '仙魔交战的终局战场，产出虚空法则与仙魔战旗。', realmRequired: 14,
    stages: ['heaven_gate_frontline', 'demon_tide_rift', 'immortal_demon_ancient_field', 'demon_lord_projection'],
    chapterBonus: { desc: '仙魔镇界者', xp: 76000, spiritStones: 32000, materials: [{ id: 'law_fragment_void', count: 8 }, { id: 'demon_war_banner', count: 2 }] },
  },
};

const STAGES = {
  qingyun_foot: {
    id: 'qingyun_foot', chapterId: 'qingyun', name: '青云山脚', icon: '🌿', color: '#8ed8ff',
    desc: '清理山脚妖物，熟悉副本推进。', recommendedRealm: 0, recommendedPower: 80,
    level: 1, roomCount: 3, boss: null, unlockNext: 'qingyun_peak', firstClearSkillPoints: 0,
    firstClearRewards: { xp: 60, spiritStones: 30, materials: [{ id: 'herb', count: 2 }], equipment: [{ setId: 'qingyun', rarity: '稀有', chance: 0.75 }] },
    clearRewards: { xp: 35, spiritStones: 15, equipment: [{ setId: 'qingyun', rarity: '魔法', chance: 0.18 }] },
  },
  qingyun_peak: {
    id: 'qingyun_peak', chapterId: 'qingyun', name: '青云山巅', icon: '🐺', color: '#8ed8ff',
    desc: '挑战青云狼王，通关后解锁血煞洞。', recommendedRealm: 0, recommendedPower: 150,
    level: 4, roomCount: 4, boss: { name: '青云狼王', symbol: '狼', color: '#6fc7ff', hpMult: 1.65, atkMult: 1.20, defMult: 1.10, skillIds: ['wolfHowl', 'frostBite', 'bossEnrage'], mechanicId: 'wolf_pack', mechanics: ['狼王号令：短暂提高攻击', '霜咬：造成迟缓'] },
    unlockNext: 'blood_entrance', firstClearSkillPoints: 1,
    firstClearRewards: { xp: 130, spiritStones: 80, materials: [{ id: 'qingyun_fur', count: 2 }, { id: 'artifact_soul', count: 1 }], equipment: [{ setId: 'qingyun', rarity: '传说', chance: 1 }] },
    clearRewards: { xp: 75, spiritStones: 36, materials: [{ id: 'qingyun_fur', count: 1 }], equipment: [{ setId: 'qingyun', rarity: '稀有', chance: 0.28 }] },
  },
  blood_entrance: {
    id: 'blood_entrance', chapterId: 'blood_cave', name: '血煞洞口', icon: '🦇', color: '#ff6688',
    desc: '洞口血蝠盘踞，适合筑基初期刷装备。', recommendedRealm: 1, recommendedPower: 260,
    level: 7, roomCount: 4, boss: { name: '血煞妖兵', symbol: '兵', color: '#ff5577', hpMult: 1.50, atkMult: 1.25, defMult: 1.12, skillIds: ['bloodBurst', 'venomFang', 'eliteFury'], mechanicId: 'blood_rage', mechanics: ['血煞爆：令你承伤加深', '毒牙：持续中毒'] },
    unlockNext: 'blood_depth', firstClearSkillPoints: 1,
    firstClearRewards: { xp: 220, spiritStones: 120, materials: [{ id: 'blood_crystal', count: 2 }, { id: 'beast_core', count: 2 }], equipment: [{ setId: 'bloodfiend', rarity: '传说', chance: 0.9 }] },
    clearRewards: { xp: 115, spiritStones: 55, materials: [{ id: 'blood_crystal', count: 1 }], equipment: [{ setId: 'bloodfiend', rarity: '稀有', chance: 0.26 }] },
  },
  blood_depth: {
    id: 'blood_depth', chapterId: 'blood_cave', name: '血煞洞深处', icon: '👹', color: '#ff5577',
    desc: '血煞妖将镇守深处，通关后解锁雷劫峰。', recommendedRealm: 1, recommendedPower: 420,
    level: 10, roomCount: 5, boss: { name: '血煞妖将', symbol: '将', color: '#ff3355', hpMult: 1.85, atkMult: 1.35, defMult: 1.20, skillIds: ['bloodDrain', 'bloodBurst', 'shuraCombo', 'bossEnrage'], mechanicId: 'blood_rage', mechanics: ['血祭汲取：造成伤害并回血', '血煞爆：承伤加深'] },
    unlockNext: 'thunder_peak', firstClearSkillPoints: 1,
    firstClearRewards: { xp: 360, spiritStones: 180, materials: [{ id: 'blood_crystal', count: 3 }, { id: 'artifact_soul', count: 2 }], equipment: [{ setId: 'bloodfiend', rarity: '神话', chance: 0.75 }] },
    clearRewards: { xp: 175, spiritStones: 82, materials: [{ id: 'blood_crystal', count: 2 }], equipment: [{ setId: 'bloodfiend', rarity: '传说', chance: 0.22 }] },
  },
  thunder_peak: {
    id: 'thunder_peak', chapterId: 'thunder_peak', name: '雷劫峰', icon: '⚡', color: '#ffe27a',
    desc: '雷劫兽盘踞峰顶，首通后天劫入口更有意义。', recommendedRealm: 2, recommendedPower: 680,
    level: 14, roomCount: 5, boss: { name: '雷劫兽', symbol: '劫', color: '#ffdd44', hpMult: 2.05, atkMult: 1.42, defMult: 1.22, skillIds: ['thunderParalyze', 'dragonBreath', 'bossEnrage'], mechanicId: 'thunder_strike', mechanics: ['雷击预警：迟缓并增伤', '魔龙吐息：持续灼烧'] },
    unlockNext: 'yaogu_outer', firstClearSkillPoints: 2,
    firstClearRewards: { xp: 620, spiritStones: 280, materials: [{ id: 'thunder_core', count: 2 }, { id: 'tribulation_essence', count: 3 }], equipment: [{ setId: 'thundertrib', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 260, spiritStones: 120, materials: [{ id: 'thunder_core', count: 1 }], equipment: [{ setId: 'thundertrib', rarity: '传说', chance: 0.24 }] },
  },
  yaogu_outer: {
    id: 'yaogu_outer', chapterId: 'yaogu_valley', name: '万妖谷外围', icon: '🐍', color: '#7ee072',
    desc: '妖藤毒雾盘踞，元婴期主线起点。', recommendedRealm: 3, recommendedPower: 980,
    level: 18, roomCount: 5, boss: { name: '万妖蛇姬', symbol: '蛇', color: '#66cc66', hpMult: 1.95, atkMult: 1.38, defMult: 1.18, skillIds: ['poisonDomain', 'venomFang', 'eliteFury'], mechanicId: 'poison_entangle', mechanics: ['万毒妖域：长回合中毒', '毒牙：持续掉血'] },
    unlockNext: 'yaogu_core', firstClearSkillPoints: 2,
    firstClearRewards: { xp: 820, spiritStones: 360, materials: [{ id: 'yaogu_essence', count: 2 }, { id: 'beast_core', count: 3 }], equipment: [{ setId: 'yaogu', rarity: '神话', chance: 0.8 }] },
    clearRewards: { xp: 340, spiritStones: 150, materials: [{ id: 'yaogu_essence', count: 1 }], equipment: [{ setId: 'yaogu', rarity: '传说', chance: 0.22 }] },
  },
  yaogu_core: {
    id: 'yaogu_core', chapterId: 'yaogu_valley', name: '万妖谷心', icon: '🌿', color: '#7ee072',
    desc: '谷心妖皇盘踞，通关后解锁幽冥殿。', recommendedRealm: 3, recommendedPower: 1280,
    level: 22, roomCount: 6, boss: { name: '万妖藤皇', symbol: '藤', color: '#55cc66', hpMult: 2.15, atkMult: 1.45, defMult: 1.28, skillIds: ['thornBind', 'poisonDomain', 'bossEnrage'], mechanicId: 'poison_entangle', mechanics: ['藤缚：降低行动与输出', '万毒妖域：持续中毒'] },
    unlockNext: 'nether_gate', firstClearSkillPoints: 2,
    firstClearRewards: { xp: 1080, spiritStones: 480, materials: [{ id: 'yaogu_essence', count: 3 }, { id: 'artifact_soul', count: 2 }], equipment: [{ setId: 'yaogu', rarity: '神话', chance: 0.85 }] },
    clearRewards: { xp: 460, spiritStones: 210, materials: [{ id: 'yaogu_essence', count: 2 }], equipment: [{ setId: 'yaogu', rarity: '传说', chance: 0.24 }] },
  },
  nether_gate: {
    id: 'nether_gate', chapterId: 'nether_palace', name: '幽冥殿门', icon: '👻', color: '#b086ff',
    desc: '魂火引路，化神修士可入。', recommendedRealm: 4, recommendedPower: 1680,
    level: 26, roomCount: 5, boss: { name: '幽冥判官', symbol: '判', color: '#aa66ff', hpMult: 2.05, atkMult: 1.48, defMult: 1.30, skillIds: ['ghostCurse', 'soulDrain', 'bossEnrage'], mechanicId: 'soul_drain', mechanics: ['幽冥咒：承伤加深', '摄魂：伤害并回血'] },
    unlockNext: 'nether_throne', firstClearSkillPoints: 2,
    firstClearRewards: { xp: 1380, spiritStones: 620, materials: [{ id: 'nether_jade', count: 2 }, { id: 'soulJade', count: 2 }], equipment: [{ setId: 'nether', rarity: '神话', chance: 0.9 }] },
    clearRewards: { xp: 560, spiritStones: 260, materials: [{ id: 'nether_jade', count: 1 }], equipment: [{ setId: 'nether', rarity: '传说', chance: 0.25 }] },
  },
  nether_throne: {
    id: 'nether_throne', chapterId: 'nether_palace', name: '幽冥王座', icon: '🟣', color: '#b086ff',
    desc: '幽冥鬼王镇守王座，通关后解锁虚空裂隙。', recommendedRealm: 4, recommendedPower: 2100,
    level: 30, roomCount: 6, boss: { name: '幽冥鬼帝', symbol: '帝', color: '#9944ff', hpMult: 2.30, atkMult: 1.56, defMult: 1.34, skillIds: ['ghostCurse', 'frostDomain', 'soulDrain'], mechanicId: 'soul_drain', mechanics: ['幽冥咒：持续压制', '摄魂：回复自身'] },
    unlockNext: 'void_edge', firstClearSkillPoints: 3,
    firstClearRewards: { xp: 1780, spiritStones: 780, materials: [{ id: 'nether_jade', count: 3 }, { id: 'artifact_soul', count: 3 }], equipment: [{ setId: 'nether', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 720, spiritStones: 330, materials: [{ id: 'nether_jade', count: 2 }], equipment: [{ setId: 'nether', rarity: '传说', chance: 0.28 }] },
  },
  void_edge: {
    id: 'void_edge', chapterId: 'void_rift', name: '裂隙边缘', icon: '🌀', color: '#8aa0ff',
    desc: '空间风暴撕裂边缘，炼虚期主线开启。', recommendedRealm: 5, recommendedPower: 2750,
    level: 34, roomCount: 5, boss: { name: '虚空游猎者', symbol: '虚', color: '#8aa0ff', hpMult: 2.18, atkMult: 1.60, defMult: 1.36, skillIds: ['shadowBackstab', 'frostDomain', 'eliteFury'], mechanicId: 'void_phase', mechanics: ['影袭：高倍率突袭', '冰狱领域：迟缓'] },
    unlockNext: 'void_heart', firstClearSkillPoints: 3,
    firstClearRewards: { xp: 2200, spiritStones: 960, materials: [{ id: 'void_shard', count: 2 }, { id: 'starDust', count: 1 }], equipment: [{ setId: 'voidstar', rarity: '神话', chance: 0.85 }] },
    clearRewards: { xp: 880, spiritStones: 420, materials: [{ id: 'void_shard', count: 1 }], equipment: [{ setId: 'voidstar', rarity: '传说', chance: 0.24 }] },
  },
  void_heart: {
    id: 'void_heart', chapterId: 'void_rift', name: '虚空核心', icon: '🌌', color: '#8aa0ff',
    desc: '击碎裂隙核心，通关后解锁天魔战场。', recommendedRealm: 5, recommendedPower: 3400,
    level: 38, roomCount: 6, boss: { name: '裂隙魔眼', symbol: '眼', color: '#7777ff', hpMult: 2.45, atkMult: 1.68, defMult: 1.42, skillIds: ['ghostCurse', 'shadowBackstab', 'bossEnrage'], mechanicId: 'void_phase', mechanics: ['裂隙凝视：承伤加深', '影袭：爆发突袭'] },
    unlockNext: 'demon_front', firstClearSkillPoints: 3,
    firstClearRewards: { xp: 2800, spiritStones: 1220, materials: [{ id: 'void_shard', count: 3 }, { id: 'starDust', count: 2 }], equipment: [{ setId: 'voidstar', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 1120, spiritStones: 520, materials: [{ id: 'void_shard', count: 2 }], equipment: [{ setId: 'voidstar', rarity: '传说', chance: 0.28 }] },
  },
  demon_front: {
    id: 'demon_front', chapterId: 'demon_battlefield', name: '天魔前线', icon: '😈', color: '#ff8a55',
    desc: '古战场魔影重重，合体期挑战。', recommendedRealm: 6, recommendedPower: 4300,
    level: 42, roomCount: 5, boss: { name: '天魔先锋', symbol: '魔', color: '#ff8a55', hpMult: 2.28, atkMult: 1.72, defMult: 1.44, skillIds: ['shuraCombo', 'abyssCleave', 'eliteFury'], mechanicId: 'demon_enrage', mechanics: ['修罗连斩：多段攻击', '深渊横扫：高伤害'] },
    unlockNext: 'demon_lord', firstClearSkillPoints: 3,
    firstClearRewards: { xp: 3600, spiritStones: 1560, materials: [{ id: 'demon_blade', count: 2 }, { id: 'artifact_soul', count: 3 }], equipment: [{ setId: 'demonwar', rarity: '神话', chance: 0.9 }] },
    clearRewards: { xp: 1420, spiritStones: 660, materials: [{ id: 'demon_blade', count: 1 }], equipment: [{ setId: 'demonwar', rarity: '传说', chance: 0.25 }] },
  },
  demon_lord: {
    id: 'demon_lord', chapterId: 'demon_battlefield', name: '天魔主阵', icon: '👹', color: '#ff8a55',
    desc: '击败天魔战将，通关后解锁登仙台。', recommendedRealm: 6, recommendedPower: 5200,
    level: 46, roomCount: 6, boss: { name: '天魔战将', symbol: '将', color: '#ff6633', hpMult: 2.60, atkMult: 1.82, defMult: 1.50, skillIds: ['shuraCombo', 'bloodBurst', 'bossEnrage'], mechanicId: 'demon_enrage', mechanics: ['修罗连斩：连续斩击', '血煞爆：承伤加深'] },
    unlockNext: 'ascension_steps', firstClearSkillPoints: 4,
    firstClearRewards: { xp: 4600, spiritStones: 1980, materials: [{ id: 'demon_blade', count: 3 }, { id: 'tribulation_essence', count: 3 }], equipment: [{ setId: 'demonwar', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 1800, spiritStones: 820, materials: [{ id: 'demon_blade', count: 2 }], equipment: [{ setId: 'demonwar', rarity: '传说', chance: 0.30 }] },
  },
  ascension_steps: {
    id: 'ascension_steps', chapterId: 'ascension_platform', name: '登仙阶', icon: '🌌', color: '#ffd98e',
    desc: '踏上登仙石阶，大乘期最终历练。', recommendedRealm: 7, recommendedPower: 6400,
    level: 50, roomCount: 5, boss: { name: '登仙台守卫', symbol: '卫', color: '#ffd98e', hpMult: 2.40, atkMult: 1.84, defMult: 1.58, skillIds: ['ironShell', 'thunderParalyze', 'bossEnrage'], mechanicId: 'ascension_shield', mechanics: ['铁甲：防御提升', '雷击预警：迟缓'] },
    unlockNext: 'ascension_guardian', firstClearSkillPoints: 4,
    firstClearRewards: { xp: 5800, spiritStones: 2480, materials: [{ id: 'ascension_stone', count: 2 }, { id: 'starDust', count: 2 }], equipment: [{ setId: 'ascensionjade', rarity: '神话', chance: 0.95 }] },
    clearRewards: { xp: 2280, spiritStones: 1040, materials: [{ id: 'ascension_stone', count: 1 }], equipment: [{ setId: 'ascensionjade', rarity: '传说', chance: 0.26 }] },
  },
  ascension_guardian: {
    id: 'ascension_guardian', chapterId: 'ascension_platform', name: '登仙守门人', icon: '☀️', color: '#ffd98e',
    desc: '守门人镇守天门前，通关后解锁九重雷劫。', recommendedRealm: 7, recommendedPower: 7600,
    level: 55, roomCount: 6, boss: { name: '登仙守门人', symbol: '仙', color: '#ffdd99', hpMult: 2.80, atkMult: 1.96, defMult: 1.68, skillIds: ['dragonBreath', 'thunderParalyze', 'bossEnrage'], mechanicId: 'ascension_shield', mechanics: ['仙门威压：承伤加深', '天雷锁定：迟缓增伤'] },
    unlockNext: 'thunder_trial', firstClearSkillPoints: 4,
    firstClearRewards: { xp: 7400, spiritStones: 3200, materials: [{ id: 'ascension_stone', count: 3 }, { id: 'tribulation_essence', count: 5 }], equipment: [{ setId: 'ascensionjade', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 2900, spiritStones: 1320, materials: [{ id: 'ascension_stone', count: 2 }], equipment: [{ setId: 'ascensionjade', rarity: '传说', chance: 0.32 }] },
  },
  thunder_trial: {
    id: 'thunder_trial', chapterId: 'nine_thunder', name: '一至六重雷', icon: '🌩️', color: '#f6e05e',
    desc: '连续承受天雷试炼，渡劫期主线开启。', recommendedRealm: 8, recommendedPower: 9200,
    level: 60, roomCount: 6, boss: { name: '六重雷君', symbol: '雷', color: '#f6e05e', hpMult: 2.65, atkMult: 2.05, defMult: 1.72, skillIds: ['thunderParalyze', 'dragonBreath', 'bossEnrage'], mechanicId: 'nine_thunder_punish', mechanics: ['天雷锁定：迟缓增伤', '雷火同降：持续灼烧'] },
    unlockNext: 'thunder_palace', firstClearSkillPoints: 4,
    firstClearRewards: { xp: 9000, spiritStones: 3900, materials: [{ id: 'nine_thunder_seal', count: 2 }, { id: 'tribulation_essence', count: 5 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 3500, spiritStones: 1580, materials: [{ id: 'nine_thunder_seal', count: 1 }], equipment: [{ setId: 'ninethunder', rarity: '传说', chance: 0.32 }] },
  },
  thunder_palace: {
    id: 'thunder_palace', chapterId: 'nine_thunder', name: '九霄雷宫', icon: '⚡', color: '#f6e05e',
    desc: '九霄雷宫降下最后雷罚，通关后解锁仙界之门。', recommendedRealm: 8, recommendedPower: 10800,
    level: 66, roomCount: 7, boss: { name: '九霄雷帝', symbol: '帝', color: '#ffef70', hpMult: 3.05, atkMult: 2.18, defMult: 1.84, skillIds: ['thunderParalyze', 'shuraCombo', 'bossEnrage'], mechanicId: 'nine_thunder_punish', mechanics: ['九霄雷罚：高压迟缓', '雷帝连裁：多段攻击'] },
    unlockNext: 'immortal_path', firstClearSkillPoints: 5,
    firstClearRewards: { xp: 11600, spiritStones: 5200, materials: [{ id: 'nine_thunder_seal', count: 3 }, { id: 'tribulation_essence', count: 8 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 4500, spiritStones: 2050, materials: [{ id: 'nine_thunder_seal', count: 2 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 0.24 }] },
  },
  immortal_path: {
    id: 'immortal_path', chapterId: 'immortal_gate', name: '接引仙路', icon: '🌠', color: '#f7fafc',
    desc: '踏上接引仙路，真仙境终章开启。', recommendedRealm: 9, recommendedPower: 13200,
    level: 72, roomCount: 6, boss: { name: '接引仙使', symbol: '使', color: '#e6f7ff', hpMult: 2.85, atkMult: 2.22, defMult: 1.92, skillIds: ['frostDomain', 'thunderParalyze', 'bossEnrage'], mechanicId: 'immortal_judgement', mechanics: ['仙路冰封：迟缓', '仙使威压：承伤加深'] },
    unlockNext: 'immortal_gatekeeper', firstClearSkillPoints: 5,
    firstClearRewards: { xp: 14800, spiritStones: 6800, materials: [{ id: 'immortal_jade', count: 2 }, { id: 'starDust', count: 3 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 5600, spiritStones: 2600, materials: [{ id: 'immortal_jade', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.22 }] },
  },
  immortal_gatekeeper: {
    id: 'immortal_gatekeeper', chapterId: 'immortal_gate', name: '仙门镇守者', icon: '🚪', color: '#f7fafc',
    desc: '当前主线终点，击败镇守者叩开仙界之门。', recommendedRealm: 9, recommendedPower: 15800,
    level: 80, roomCount: 7, boss: { name: '仙门镇守者', symbol: '门', color: '#ffffff', hpMult: 3.35, atkMult: 2.36, defMult: 2.05, skillIds: ['dragonBreath', 'frostDomain', 'bossEnrage'], mechanicId: 'immortal_judgement', mechanics: ['仙门审判：高额灼烧', '天门封锁：迟缓压制'] },
    unlockNext: 'reception_platform', firstClearSkillPoints: 6,
    firstClearRewards: { xp: 18800, spiritStones: 8800, materials: [{ id: 'immortal_jade', count: 3 }, { id: 'artifact_soul', count: 5 }, { id: 'ascension_trial_token', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 7200, spiritStones: 3400, materials: [{ id: 'immortal_jade', count: 2 }, { id: 'ascension_trial_token', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.28 }] },
  },
  reception_platform: {
    id: 'reception_platform', chapterId: 'reception_immortal_domain', name: '接引仙台', icon: '☁️', color: '#c8f7ff',
    desc: '飞升后踏上的第一座仙台，接引仙光洗去凡尘。', recommendedRealm: 10, recommendedPower: 18800,
    level: 88, roomCount: 6, boss: { name: '接引仙官', symbol: '官', color: '#c8f7ff', hpMult: 3.10, atkMult: 2.42, defMult: 2.08, skillIds: ['frostDomain', 'thunderParalyze', 'bossEnrage'], mechanicId: 'thunder_judicator', mechanics: ['雷罚审判：每3回合仙雷压制并麻痹', '天威低血爆发：生命低于40%时攻击提升'] },
    unlockNext: 'cloudsea_road', firstClearSkillPoints: 5,
    firstClearRewards: { xp: 22000, spiritStones: 9600, materials: [{ id: 'immortal_jade_ascended', count: 3 }, { id: 'immortal_marrow', count: 3 }, { id: 'law_fragment_sword', count: 2 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 8600, spiritStones: 4000, materials: [{ id: 'immortal_jade_ascended', count: 1 }, { id: 'immortal_marrow', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.32 }] },
  },
  cloudsea_road: {
    id: 'cloudsea_road', chapterId: 'reception_immortal_domain', name: '云海古道', icon: '🌫️', color: '#d8f3ff',
    desc: '云海深处有残缺剑痕，适合散仙稳固仙基。', recommendedRealm: 10, recommendedPower: 21800,
    level: 94, roomCount: 7, boss: { name: '云海守卫', symbol: '卫', color: '#d8f3ff', hpMult: 3.25, atkMult: 2.50, defMult: 2.16, skillIds: ['shadowBackstab', 'frostDomain', 'eliteFury'], mechanicId: 'nether_king', mechanics: ['幽冥魂锁：每3回合魂锁汲取', '云海魂雾：诅咒压制'] },
    unlockNext: 'immortal_spirit_trial', firstClearSkillPoints: 5,
    firstClearRewards: { xp: 28000, spiritStones: 11800, materials: [{ id: 'immortal_jade_ascended', count: 4 }, { id: 'immortal_marrow', count: 3 }, { id: 'law_fragment_sword', count: 3 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 10800, spiritStones: 4800, materials: [{ id: 'immortal_jade_ascended', count: 2 }, { id: 'law_fragment_sword', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.34 }] },
  },
  immortal_spirit_trial: {
    id: 'immortal_spirit_trial', chapterId: 'reception_immortal_domain', name: '仙灵试炼场', icon: '✨', color: '#88ffcc',
    desc: '仙灵布下试炼阵，首通后可稳定刷仙躯与法则材料。', recommendedRealm: 10, recommendedPower: 25500,
    level: 100, roomCount: 7, boss: { name: '试炼仙灵', symbol: '灵', color: '#88ffcc', hpMult: 3.45, atkMult: 2.62, defMult: 2.24, skillIds: ['dragonBreath', 'frostDomain', 'bossEnrage'], mechanicId: 'forge_spirit', mechanics: ['万器护主：低血量提高防御', '仙阵护盾：每4回合展开护盾'] },
    unlockNext: 'mystic_thunder_pool', firstClearSkillPoints: 6,
    firstClearRewards: { xp: 36000, spiritStones: 15000, materials: [{ id: 'immortal_jade_ascended', count: 5 }, { id: 'immortal_marrow', count: 4 }, { id: 'law_fragment_pill', count: 3 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 13600, spiritStones: 6200, materials: [{ id: 'immortal_marrow', count: 2 }, { id: 'law_fragment_pill', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.36 }] },
  },
  mystic_thunder_pool: {
    id: 'mystic_thunder_pool', chapterId: 'mystic_thunder_domain', name: '玄雷池', icon: '⚡', color: '#ffe27a',
    desc: '仙界玄雷凝成池水，地仙可入内淬体。', recommendedRealm: 11, recommendedPower: 31000,
    level: 108, roomCount: 7, boss: { name: '玄雷天将', symbol: '将', color: '#ffe27a', hpMult: 3.55, atkMult: 2.72, defMult: 2.32, skillIds: ['thunderParalyze', 'dragonBreath', 'bossEnrage'], mechanicId: 'thunder_judicator', mechanics: ['雷罚审判：每3回合仙雷压制并麻痹', '玄雷怒斩：低血量攻击提升'] },
    unlockNext: 'thunder_punish_palace', firstClearSkillPoints: 6,
    firstClearRewards: { xp: 46000, spiritStones: 19000, materials: [{ id: 'law_fragment_thunder', count: 5 }, { id: 'immortal_marrow', count: 5 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 16800, spiritStones: 7600, materials: [{ id: 'law_fragment_thunder', count: 2 }, { id: 'immortal_marrow', count: 1 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 0.38 }] },
  },
  thunder_punish_palace: {
    id: 'thunder_punish_palace', chapterId: 'mystic_thunder_domain', name: '雷罚殿', icon: '🌩️', color: '#f6e05e',
    desc: '雷罚使镇守仙殿，考验雷抗与持续输出。', recommendedRealm: 11, recommendedPower: 36500,
    level: 116, roomCount: 8, boss: { name: '雷罚使', symbol: '罚', color: '#f6e05e', hpMult: 3.75, atkMult: 2.86, defMult: 2.42, skillIds: ['thunderParalyze', 'shuraCombo', 'bossEnrage'], mechanicId: 'thunder_judicator', mechanics: ['雷罚审判：每3回合仙雷压制并麻痹', '天雷锁身：低血量攻击提升'] },
    unlockNext: 'nine_sky_thunder_altar', firstClearSkillPoints: 6,
    firstClearRewards: { xp: 56000, spiritStones: 23000, materials: [{ id: 'law_fragment_thunder', count: 6 }, { id: 'immortal_jade_ascended', count: 4 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 20400, spiritStones: 9200, materials: [{ id: 'law_fragment_thunder', count: 2 }, { id: 'immortal_jade_ascended', count: 1 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 0.40 }] },
  },
  nine_sky_thunder_altar: {
    id: 'nine_sky_thunder_altar', chapterId: 'mystic_thunder_domain', name: '九霄雷台', icon: '⚜️', color: '#ffef70',
    desc: '玄雷天域终点，雷君投影于此审判飞升者。', recommendedRealm: 11, recommendedPower: 43000,
    level: 126, roomCount: 8, boss: { name: '九霄雷君', symbol: '君', color: '#ffef70', hpMult: 4.05, atkMult: 3.02, defMult: 2.55, skillIds: ['thunderParalyze', 'dragonBreath', 'bossEnrage'], mechanicId: 'demon_lord_shadow', mechanics: ['魔尊投影：每2回合魔焰压制', '雷君裁决：半血后攻防齐升'] },
    unlockNext: 'forge_outer_hall', firstClearSkillPoints: 8,
    firstClearRewards: { xp: 72000, spiritStones: 30000, materials: [{ id: 'law_fragment_thunder', count: 8 }, { id: 'immortal_marrow', count: 8 }, { id: 'artifact_core', count: 1 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 26000, spiritStones: 12000, materials: [{ id: 'law_fragment_thunder', count: 3 }, { id: 'immortal_marrow', count: 2 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 0.42 }] },
  },

  forge_outer_hall: {
    id: 'forge_outer_hall', chapterId: 'immortal_forge_palace', name: '仙炉外殿', icon: '🔥', color: '#ffcf8a',
    desc: '仙炉余焰铺满外殿，器仙入门试炼。', recommendedRealm: 12, recommendedPower: 52000,
    level: 136, roomCount: 7, boss: { name: '外殿炉灵', symbol: '炉', color: '#ffcf8a', hpMult: 4.10, atkMult: 3.12, defMult: 2.70, skillIds: ['ironShell', 'dragonBreath', 'bossEnrage'], mechanicId: 'forge_spirit', mechanics: ['万器护主：低血量提高防御', '炉火护盾：每4回合展开护盾'] },
    unlockNext: 'immortal_armory', firstClearSkillPoints: 7,
    firstClearRewards: { xp: 88000, spiritStones: 36000, materials: [{ id: 'law_fragment_forge', count: 6 }, { id: 'immortal_refine_stone', count: 4 }, { id: 'immortal_jade_ascended', count: 4 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 31000, spiritStones: 14500, materials: [{ id: 'law_fragment_forge', count: 2 }, { id: 'immortal_refine_stone', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.44 }] },
  },
  immortal_armory: {
    id: 'immortal_armory', chapterId: 'immortal_forge_palace', name: '万器库', icon: '🛡️', color: '#ffd6a0',
    desc: '万器库中仙兵自鸣，适合刷仙炼材料。', recommendedRealm: 12, recommendedPower: 61000,
    level: 146, roomCount: 8, boss: { name: '万器守藏', symbol: '器', color: '#ffd6a0', hpMult: 4.35, atkMult: 3.24, defMult: 2.88, skillIds: ['ironShell', 'shuraCombo', 'eliteFury'], mechanicId: 'forge_spirit', mechanics: ['仙兵护主：防御暴涨', '器阵护盾：定时护盾'] },
    unlockNext: 'haotian_forge', firstClearSkillPoints: 7,
    firstClearRewards: { xp: 106000, spiritStones: 44000, materials: [{ id: 'law_fragment_forge', count: 7 }, { id: 'immortal_refine_stone', count: 5 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 37000, spiritStones: 17200, materials: [{ id: 'law_fragment_forge', count: 2 }, { id: 'immortal_refine_stone', count: 2 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 0.45 }] },
  },
  haotian_forge: {
    id: 'haotian_forge', chapterId: 'immortal_forge_palace', name: '昊天锻台', icon: '⚒️', color: '#ffc46b',
    desc: '昊天锻台可淬万器，器仙终章挑战。', recommendedRealm: 12, recommendedPower: 72000,
    level: 158, roomCount: 8, boss: { name: '昊天锻主', symbol: '锻', color: '#ffc46b', hpMult: 4.65, atkMult: 3.42, defMult: 3.08, skillIds: ['ironShell', 'dragonBreath', 'bossEnrage'], mechanicId: 'forge_spirit', mechanics: ['万器护主：低血防御暴涨', '昊天护盾：定时护盾'] },
    unlockNext: 'nether_ferry', firstClearSkillPoints: 9,
    firstClearRewards: { xp: 132000, spiritStones: 56000, materials: [{ id: 'law_fragment_forge', count: 9 }, { id: 'immortal_refine_stone', count: 6 }, { id: 'artifact_core', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 45500, spiritStones: 21000, materials: [{ id: 'law_fragment_forge', count: 3 }, { id: 'immortal_refine_stone', count: 2 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.46 }] },
  },
  nether_ferry: {
    id: 'nether_ferry', chapterId: 'nether_rift_domain', name: '幽都渡口', icon: '🛶', color: '#b086ff',
    desc: '魂河渡口通往幽都裂界，幽冥法则初现。', recommendedRealm: 13, recommendedPower: 86000,
    level: 170, roomCount: 7, boss: { name: '幽都渡魂使', symbol: '渡', color: '#b086ff', hpMult: 4.70, atkMult: 3.55, defMult: 3.02, skillIds: ['ghostCurse', 'soulDrain', 'bossEnrage'], mechanicId: 'nether_king', mechanics: ['幽冥魂锁：每3回合汲取', '渡魂诅咒：持续压制'] },
    unlockNext: 'soul_river_bridge', firstClearSkillPoints: 8,
    firstClearRewards: { xp: 158000, spiritStones: 66000, materials: [{ id: 'law_fragment_nether', count: 7 }, { id: 'immortal_jade_ascended', count: 5 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 54000, spiritStones: 25200, materials: [{ id: 'law_fragment_nether', count: 2 }, { id: 'immortal_jade_ascended', count: 2 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.46 }] },
  },
  soul_river_bridge: {
    id: 'soul_river_bridge', chapterId: 'nether_rift_domain', name: '魂河残桥', icon: '🌉', color: '#9f7aea',
    desc: '残桥下魂河奔流，诅咒与汲取交替压迫。', recommendedRealm: 13, recommendedPower: 101000,
    level: 184, roomCount: 8, boss: { name: '魂河桥主', symbol: '魂', color: '#9f7aea', hpMult: 4.95, atkMult: 3.72, defMult: 3.18, skillIds: ['ghostCurse', 'frostDomain', 'soulDrain'], mechanicId: 'nether_king', mechanics: ['魂河汲取：定时吸魂', '冥雾诅咒：压制输出'] },
    unlockNext: 'nether_immortal_throne', firstClearSkillPoints: 8,
    firstClearRewards: { xp: 188000, spiritStones: 78000, materials: [{ id: 'law_fragment_nether', count: 8 }, { id: 'law_fragment_void', count: 2 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 64000, spiritStones: 29600, materials: [{ id: 'law_fragment_nether', count: 3 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 0.47 }] },
  },
  nether_immortal_throne: {
    id: 'nether_immortal_throne', chapterId: 'nether_rift_domain', name: '冥仙王座', icon: '👑', color: '#8b5cf6',
    desc: '冥仙王座镇压裂界，幽冥线终章。', recommendedRealm: 13, recommendedPower: 118000,
    level: 198, roomCount: 8, boss: { name: '冥仙王', symbol: '冥', color: '#8b5cf6', hpMult: 5.25, atkMult: 3.92, defMult: 3.36, skillIds: ['ghostCurse', 'shadowBackstab', 'bossEnrage'], mechanicId: 'nether_king', mechanics: ['幽冥魂锁：定时汲取并诅咒', '王座冥压：持续压制'] },
    unlockNext: 'heaven_gate_frontline', firstClearSkillPoints: 10,
    firstClearRewards: { xp: 230000, spiritStones: 96000, materials: [{ id: 'law_fragment_nether', count: 10 }, { id: 'artifact_core', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 78000, spiritStones: 36000, materials: [{ id: 'law_fragment_nether', count: 3 }, { id: 'immortal_jade_ascended', count: 2 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.48 }] },
  },
  heaven_gate_frontline: {
    id: 'heaven_gate_frontline', chapterId: 'immortal_demon_battlefield', name: '天门防线', icon: '🛡️', color: '#ffb06b',
    desc: '天门前线魔潮翻涌，仙魔战场入口。', recommendedRealm: 14, recommendedPower: 138000,
    level: 214, roomCount: 8, boss: { name: '魔潮督军', symbol: '督', color: '#ffb06b', hpMult: 5.35, atkMult: 4.05, defMult: 3.40, skillIds: ['shuraCombo', 'abyssCleave', 'eliteFury'], mechanicId: 'demon_lord_shadow', mechanics: ['魔尊投影：每2回合魔焰压制', '魔潮号令：半血攻防齐升'] },
    unlockNext: 'demon_tide_rift', firstClearSkillPoints: 9,
    firstClearRewards: { xp: 276000, spiritStones: 116000, materials: [{ id: 'law_fragment_void', count: 7 }, { id: 'demon_war_banner', count: 1 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 92000, spiritStones: 43000, materials: [{ id: 'law_fragment_void', count: 2 }, { id: 'demon_war_banner', count: 1 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 0.48 }] },
  },
  demon_tide_rift: {
    id: 'demon_tide_rift', chapterId: 'immortal_demon_battlefield', name: '魔潮裂谷', icon: '🌋', color: '#ff7a45',
    desc: '魔潮撕开裂谷，虚空与魔气交织。', recommendedRealm: 14, recommendedPower: 162000,
    level: 232, roomCount: 9, boss: { name: '裂谷魔侯', symbol: '侯', color: '#ff7a45', hpMult: 5.65, atkMult: 4.22, defMult: 3.54, skillIds: ['shadowBackstab', 'abyssCleave', 'bossEnrage'], mechanicId: 'demon_lord_shadow', mechanics: ['魔焰压制：定时伤害', '半血魔化：攻防提升'] },
    unlockNext: 'immortal_demon_ancient_field', firstClearSkillPoints: 9,
    firstClearRewards: { xp: 330000, spiritStones: 138000, materials: [{ id: 'law_fragment_void', count: 8 }, { id: 'law_fragment_nether', count: 3 }, { id: 'demon_war_banner', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 108000, spiritStones: 51000, materials: [{ id: 'law_fragment_void', count: 3 }, { id: 'demon_war_banner', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.49 }] },
  },
  immortal_demon_ancient_field: {
    id: 'immortal_demon_ancient_field', chapterId: 'immortal_demon_battlefield', name: '仙魔古战场', icon: '⚔️', color: '#ff6633',
    desc: '古战场残留仙魔执念，终局循环资源集中地。', recommendedRealm: 14, recommendedPower: 188000,
    level: 252, roomCount: 9, boss: { name: '古战场魔影', symbol: '影', color: '#ff6633', hpMult: 5.95, atkMult: 4.45, defMult: 3.72, skillIds: ['shuraCombo', 'ghostCurse', 'bossEnrage'], mechanicId: 'demon_lord_shadow', mechanics: ['魔尊投影：定时压制', '古战魔化：半血强化'] },
    unlockNext: 'demon_lord_projection', firstClearSkillPoints: 10,
    firstClearRewards: { xp: 396000, spiritStones: 166000, materials: [{ id: 'law_fragment_void', count: 9 }, { id: 'demon_war_banner', count: 2 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 128000, spiritStones: 61000, materials: [{ id: 'law_fragment_void', count: 3 }, { id: 'demon_war_banner', count: 1 }], equipment: [{ setId: 'ninethunder', rarity: '神话', chance: 0.50 }] },
  },
  demon_lord_projection: {
    id: 'demon_lord_projection', chapterId: 'immortal_demon_battlefield', name: '魔尊投影', icon: '😈', color: '#ff3b30',
    desc: '魔尊投影降临战场，当前仙界主线终点。', recommendedRealm: 14, recommendedPower: 220000,
    level: 280, roomCount: 10, boss: { name: '魔尊投影', symbol: '尊', color: '#ff3b30', hpMult: 6.40, atkMult: 4.80, defMult: 4.05, skillIds: ['shuraCombo', 'abyssCleave', 'bossEnrage'], mechanicId: 'demon_lord_shadow', mechanics: ['魔尊投影：每2回合魔焰压制', '终局魔化：半血攻防齐升'] },
    unlockNext: null, firstClearSkillPoints: 12,
    firstClearRewards: { xp: 520000, spiritStones: 220000, materials: [{ id: 'law_fragment_void', count: 12 }, { id: 'law_fragment_nether', count: 6 }, { id: 'demon_war_banner', count: 3 }, { id: 'artifact_core', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 1 }] },
    clearRewards: { xp: 168000, spiritStones: 80000, materials: [{ id: 'law_fragment_void', count: 4 }, { id: 'demon_war_banner', count: 1 }], equipment: [{ setId: 'trueimmortal', rarity: '神话', chance: 0.52 }] },
  },
};

const FIRST_STAGE_ID = 'qingyun_foot';

const STAGE_BOSS_MECHANICS = {
  wolf_pack: { id: 'wolf_pack', name: '狼王号令', icon: '🐺', trigger: 'hp70', desc: '生命低于70%时狂嚎，攻击提高18% 2回合。', effect: { type: 'bossBuff', atkRatio: 0.18, turns: 2 } },
  blood_rage: { id: 'blood_rage', name: '血煞狂暴', icon: '🩸', trigger: 'hp70', desc: '生命低于70%时吸血反扑，立刻回复8%生命并提高攻击。', effect: { type: 'healBuff', healMaxHpRatio: 0.08, atkRatio: 0.16, turns: 2 } },
  thunder_strike: { id: 'thunder_strike', name: '定时落雷', icon: '⚡', trigger: 'turn3', desc: '每3个敌方回合落雷，造成额外雷伤并迟缓。', effect: { type: 'damageDebuff', damageAtkRatio: 0.45, debuff: { type: 'slow', turns: 1, ratio: 0.10 } } },
  poison_entangle: { id: 'poison_entangle', name: '毒藤缠绕', icon: '🌿', trigger: 'hp70', desc: '生命低于70%时缠绕并施毒，承伤提高。', effect: { type: 'debuff', debuff: { type: 'entangle', turns: 2, ratio: 0.12 }, status: { type: 'poison', turns: 2, ratio: 0.08 } } },
  soul_drain: { id: 'soul_drain', name: '摄魂魂火', icon: '👻', trigger: 'turn3', desc: '每3个敌方回合吸取生命并施加诅咒。', effect: { type: 'drainDebuff', mult: 0.75, healRatio: 0.45, debuff: { type: 'curse', turns: 2, ratio: 0.12 } } },
  void_phase: { id: 'void_phase', name: '虚空虚化', icon: '🌀', trigger: 'hp70', desc: '生命低于70%时虚化，防御提高22% 2回合。', effect: { type: 'bossBuff', defRatio: 0.22, turns: 2 } },
  demon_enrage: { id: 'demon_enrage', name: '天魔狂暴', icon: '😈', trigger: 'hp40', desc: '生命低于40%时大幅提高攻击。', effect: { type: 'bossBuff', atkRatio: 0.28, defRatio: 0.08, turns: 3 } },
  ascension_shield: { id: 'ascension_shield', name: '登仙护盾', icon: '🌌', trigger: 'hp70', desc: '生命低于70%时展开护盾，回复生命并提高防御。', effect: { type: 'healBuff', healMaxHpRatio: 0.06, defRatio: 0.28, turns: 2 } },
  nine_thunder_punish: { id: 'nine_thunder_punish', name: '九重雷罚', icon: '🌩️', trigger: 'turn3', desc: '每3个敌方回合降下多段雷罚。', effect: { type: 'multiHitDebuff', hits: 3, mult: 0.34, debuff: { type: 'slow', turns: 1, ratio: 0.12 } } },
  immortal_judgement: { id: 'immortal_judgement', name: '仙门审判', icon: '🚪', trigger: 'hp40', desc: '生命低于40%时发动最终审判，造成高额伤害和灼烧。', effect: { type: 'damageDebuff', damageAtkRatio: 0.90, status: { type: 'burn', turns: 2, ratio: 0.10 } } },
};

function getStageBossMechanic(stageOrId) {
  const stage = typeof stageOrId === 'string' ? STAGES?.[stageOrId] : stageOrId;
  const id = stage?.boss?.mechanicId;
  return id ? STAGE_BOSS_MECHANICS[id] || null : null;
}

const STAGE_THEMES = {
  qingyun: { id: 'stage_qingyun', name: '青云山路', icon: '🌿', bg: '#123c48', wall: '#22556a', wall2: '#173c50', floor: '#4d8c74', floor2: '#3f7866', border: 'rgba(142,216,255,0.28)', speck: 'rgba(190,255,220,0.55)', stairs: '#8ed8ff', decor: 'leaf', monsterMult: { hp: 1.00, atk: 1.00, def: 1.00, xp: 1.00, stones: 1.00 } },
  blood_cave: { id: 'stage_blood', name: '血煞洞窟', icon: '🩸', bg: '#32101b', wall: '#5a1b2a', wall2: '#3c101c', floor: '#692234', floor2: '#7d2a3c', border: 'rgba(255,102,136,0.32)', speck: 'rgba(255,120,150,0.55)', stairs: '#ff6688', decor: 'blood', monsterMult: { hp: 1.05, atk: 1.08, def: 1.02, xp: 1.06, stones: 1.04 } },
  thunder_peak: { id: 'stage_thunder', name: '雷劫焦土', icon: '⚡', bg: '#2f2a12', wall: '#66551c', wall2: '#453813', floor: '#796b2a', floor2: '#8f7c30', border: 'rgba(255,226,122,0.36)', speck: 'rgba(255,240,150,0.62)', stairs: '#ffe27a', decor: 'thunder', monsterMult: { hp: 1.08, atk: 1.12, def: 1.04, xp: 1.08, stones: 1.06 } },
  yaogu_valley: { id: 'stage_yaogu', name: '万妖藤谷', icon: '🐍', bg: '#123018', wall: '#2e5a30', wall2: '#1f4525', floor: '#3f733b', floor2: '#4f8b45', border: 'rgba(126,224,114,0.34)', speck: 'rgba(190,255,120,0.58)', stairs: '#7ee072', decor: 'vine', monsterMult: { hp: 1.12, atk: 1.10, def: 1.05, xp: 1.10, stones: 1.08 } },
  nether_palace: { id: 'stage_nether', name: '幽冥暗殿', icon: '👻', bg: '#1d1434', wall: '#3d2a67', wall2: '#2c1d4f', floor: '#46316f', floor2: '#37295c', border: 'rgba(176,134,255,0.34)', speck: 'rgba(210,180,255,0.55)', stairs: '#b086ff', decor: 'soul', monsterMult: { hp: 1.16, atk: 1.12, def: 1.08, xp: 1.12, stones: 1.10 } },
  void_rift: { id: 'stage_void', name: '虚空裂隙', icon: '🌀', bg: '#111833', wall: '#273564', wall2: '#1b254b', floor: '#303f78', floor2: '#263663', border: 'rgba(138,160,255,0.34)', speck: 'rgba(180,200,255,0.60)', stairs: '#8aa0ff', decor: 'void', monsterMult: { hp: 1.20, atk: 1.16, def: 1.10, xp: 1.14, stones: 1.12 } },
  demon_battlefield: { id: 'stage_demon', name: '天魔战场', icon: '😈', bg: '#33180f', wall: '#67301c', wall2: '#4c2114', floor: '#74361f', floor2: '#8a4328', border: 'rgba(255,138,85,0.36)', speck: 'rgba(255,170,100,0.60)', stairs: '#ff8a55', decor: 'banner', monsterMult: { hp: 1.24, atk: 1.22, def: 1.14, xp: 1.16, stones: 1.14 } },
  ascension_platform: { id: 'stage_ascension', name: '白玉登仙台', icon: '🌌', bg: '#2b2740', wall: '#6a5d7d', wall2: '#4d4566', floor: '#b8a77e', floor2: '#9e916f', border: 'rgba(255,217,142,0.36)', speck: 'rgba(255,245,190,0.62)', stairs: '#ffd98e', decor: 'cloud', monsterMult: { hp: 1.28, atk: 1.26, def: 1.18, xp: 1.18, stones: 1.16 } },
  nine_thunder: { id: 'stage_nine_thunder', name: '九重雷阵', icon: '🌩️', bg: '#29270d', wall: '#74651d', wall2: '#554912', floor: '#8c7a25', floor2: '#a08c2e', border: 'rgba(246,224,94,0.42)', speck: 'rgba(255,245,130,0.72)', stairs: '#f6e05e', decor: 'thunder', monsterMult: { hp: 1.34, atk: 1.32, def: 1.22, xp: 1.20, stones: 1.18 } },
  immortal_gate: { id: 'stage_immortal_gate', name: '仙门云海', icon: '🚪', bg: '#253246', wall: '#90a8bd', wall2: '#6f879e', floor: '#a8c0d4', floor2: '#92adc5', border: 'rgba(247,250,252,0.16)', speck: 'rgba(255,255,255,0.36)', stairs: '#f2fbff', decor: 'cloud', monsterMult: { hp: 1.42, atk: 1.38, def: 1.28, xp: 1.24, stones: 1.22 } },
  reception_immortal_domain: { id: 'stage_reception_immortal', name: '接引仙域', icon: '☁️', bg: '#183244', wall: '#73a6bd', wall2: '#4e7e98', floor: '#9ccdde', floor2: '#7fb8cc', border: 'rgba(200,247,255,0.30)', speck: 'rgba(235,255,255,0.68)', stairs: '#c8f7ff', decor: 'cloud', monsterMult: { hp: 1.52, atk: 1.46, def: 1.34, xp: 1.30, stones: 1.26 } },
  mystic_thunder_domain: { id: 'stage_mystic_thunder', name: '玄雷天域', icon: '⚡', bg: '#302a0b', wall: '#806e18', wall2: '#5d4e10', floor: '#9a8424', floor2: '#b99d31', border: 'rgba(255,226,122,0.44)', speck: 'rgba(255,244,150,0.76)', stairs: '#ffef70', decor: 'thunder', monsterMult: { hp: 1.62, atk: 1.58, def: 1.42, xp: 1.36, stones: 1.32 } },
  immortal_forge_palace: { id: 'stage_immortal_forge', name: '万器仙宫', icon: '🔨', bg: '#33210f', wall: '#8a5a24', wall2: '#5f3d18', floor: '#a87432', floor2: '#c28a3c', border: 'rgba(255,207,138,0.44)', speck: 'rgba(255,220,160,0.70)', stairs: '#ffcf8a', decor: 'forge', monsterMult: { hp: 1.72, atk: 1.68, def: 1.56, xp: 1.42, stones: 1.38 } },
  nether_rift_domain: { id: 'stage_nether_rift', name: '幽都裂界', icon: '👻', bg: '#1b1230', wall: '#4b2a73', wall2: '#321d55', floor: '#5b3a86', floor2: '#49306f', border: 'rgba(176,134,255,0.44)', speck: 'rgba(220,190,255,0.66)', stairs: '#b086ff', decor: 'soul', monsterMult: { hp: 1.84, atk: 1.78, def: 1.62, xp: 1.50, stones: 1.44 } },
  immortal_demon_battlefield: { id: 'stage_immortal_demon', name: '仙魔战场', icon: '😈', bg: '#35110b', wall: '#7a2818', wall2: '#53170f', floor: '#8c3920', floor2: '#a84625', border: 'rgba(255,102,51,0.48)', speck: 'rgba(255,150,100,0.72)', stairs: '#ff6633', decor: 'banner', monsterMult: { hp: 1.96, atk: 1.92, def: 1.72, xp: 1.60, stones: 1.52 } },
};

function getStageTheme(stageOrChapterId) {
  const chapterId = typeof stageOrChapterId === 'string' ? (STAGES?.[stageOrChapterId]?.chapterId || stageOrChapterId) : stageOrChapterId?.chapterId;
  return STAGE_THEMES[chapterId] || null;
}

const PLAYER_TITLES = {
  qingyun_trial: { id: 'qingyun_trial', chapterId: 'qingyun', name: '青云试炼者', icon: '🌿', color: '#8ed8ff', desc: '青云山全通称号，生命更加稳固。', stats: { maxHpPct: 0.03 } },
  blood_slayer: { id: 'blood_slayer', chapterId: 'blood_cave', name: '血煞讨伐者', icon: '🩸', color: '#ff6688', desc: '血煞洞全通称号，攻击更凌厉。', stats: { atkPct: 0.03 } },
  thunder_walker: { id: 'thunder_walker', chapterId: 'thunder_peak', name: '渡劫行者', icon: '⚡', color: '#ffe27a', desc: '雷劫峰全通称号，防御和雷法亲和提高。', stats: { defPct: 0.03, thunderAffinity: 5 } },
  yaogu_warden: { id: 'yaogu_warden', chapterId: 'yaogu_valley', name: '万妖镇谷者', icon: '🐍', color: '#7ee072', desc: '万妖谷全通称号，提升毒抗和闪避。', stats: { dodge: 4, poisonDmg: 6 } },
  nether_breaker: { id: 'nether_breaker', chapterId: 'nether_palace', name: '幽冥破殿者', icon: '👻', color: '#b086ff', desc: '幽冥殿全通称号，提升灵力与吸血。', stats: { maxMpPct: 0.04, lifesteal: 2 } },
  void_walker: { id: 'void_walker', chapterId: 'void_rift', name: '虚空行者', icon: '🌀', color: '#8aa0ff', desc: '虚空裂隙全通称号，提升速度与暴击。', stats: { speed: 5, crit: 4 } },
  demon_slayer: { id: 'demon_slayer', chapterId: 'demon_battlefield', name: '天魔斩将者', icon: '😈', color: '#ff8a55', desc: '天魔战场全通称号，提升攻击和首领伤害。', stats: { atkPct: 0.04, bossDmg: 8 } },
  ascension_seeker: { id: 'ascension_seeker', chapterId: 'ascension_platform', name: '登仙问道者', icon: '🌌', color: '#ffd98e', desc: '登仙台全通称号，生命和防御进一步提高。', stats: { maxHpPct: 0.04, defPct: 0.04 } },
  nine_thunder_prover: { id: 'nine_thunder_prover', chapterId: 'nine_thunder', name: '九劫证道者', icon: '🌩️', color: '#f6e05e', desc: '九重雷劫全通称号，雷法亲和与首领伤害提高。', stats: { thunderAffinity: 8, bossDmg: 10 } },
  true_immortal_opener: { id: 'true_immortal_opener', chapterId: 'immortal_gate', name: '真仙开门者', icon: '🚪', color: '#f7fafc', desc: '仙界之门全通称号，真仙道体大幅稳固。', stats: { maxHpPct: 0.05, atkPct: 0.05, defPct: 0.05 } },
  reception_ascender: { id: 'reception_ascender', chapterId: 'reception_immortal_domain', name: '接引散仙', icon: '☁️', color: '#c8f7ff', desc: '接引仙域全通称号，仙躯与仙力初成。', stats: { maxHpPct: 0.06, immortalPower: 8 } },
  mystic_thunder_immortal: { id: 'mystic_thunder_immortal', chapterId: 'mystic_thunder_domain', name: '玄雷地仙', icon: '⚡', color: '#ffe27a', desc: '玄雷天域全通称号，雷法与首领伤害提高。', stats: { lightningDmg: 10, thunderAffinity: 10, bossDmg: 10 } },
  immortal_forge_master: { id: 'immortal_forge_master', chapterId: 'immortal_forge_palace', name: '万器仙匠', icon: '🔨', color: '#ffcf8a', desc: '万器仙宫全通称号，仙炼与器之法则更强。', stats: { immortalPower: 12, defPct: 0.06, bossDmg: 8 } },
  nether_rift_immortal: { id: 'nether_rift_immortal', chapterId: 'nether_rift_domain', name: '幽都冥仙', icon: '👻', color: '#b086ff', desc: '幽都裂界全通称号，幽冥法则与吸血提高。', stats: { immortalPower: 14, lifesteal: 4, maxMpPct: 0.06 } },
  immortal_demon_conqueror: { id: 'immortal_demon_conqueror', chapterId: 'immortal_demon_battlefield', name: '仙魔镇界者', icon: '😈', color: '#ff8a55', desc: '仙魔战场全通称号，终局首领伤害大幅提高。', stats: { immortalPower: 18, atkPct: 0.08, bossDmg: 16 } },
};

function createDefaultTitleState() {
  return { unlocked: {}, equipped: null };
}

function normalizeTitleState(state) {
  const base = createDefaultTitleState();
  if (!state || typeof state !== 'object' || Array.isArray(state)) return base;
  const unlocked = { ...(state.unlocked || {}) };
  const equipped = PLAYER_TITLES[state.equipped] && unlocked[state.equipped] ? state.equipped : null;
  return { unlocked, equipped };
}

function getChapterTitleId(chapterId) {
  const entry = Object.values(PLAYER_TITLES).find(t => t.chapterId === chapterId);
  return entry?.id || null;
}

function unlockPlayerTitle(player, titleId, equipIfEmpty = true) {
  if (!player || !PLAYER_TITLES[titleId]) return null;
  player.titles = normalizeTitleState(player.titles);
  player.titles.unlocked[titleId] = true;
  if (equipIfEmpty && !player.titles.equipped) player.titles.equipped = titleId;
  return PLAYER_TITLES[titleId];
}

function getEquippedTitle(player) {
  const state = normalizeTitleState(player?.titles);
  return state.equipped ? PLAYER_TITLES[state.equipped] : null;
}

function getTitleStatBonuses(player) {
  const title = getEquippedTitle(player);
  return title ? { ...(title.stats || {}) } : {};
}

const STAGE_ROOM_EVENTS = {
  normal: { type: 'normal', icon: '⚔️', name: '妖物房', desc: '清理妖物后前进。' },
  elite: { type: 'elite', icon: '💀', name: '精英房', desc: '精英镇守，奖励更高。' },
  boss: { type: 'boss', icon: '👑', name: 'Boss房', desc: '击败首领完成副本。' },
  treasure: { type: 'treasure', icon: '🎁', name: '宝箱房', desc: '发现隐藏宝箱。', rewards: { spiritStones: 18, materials: [{ id: 'herb', count: 1 }] } },
  rest: { type: 'rest', icon: '🍵', name: '休息点', desc: '恢复生命和法力。', healHpRatio: 0.28, healMpRatio: 0.35 },
  trap: { type: 'trap', icon: '🕳️', name: '陷阱房', desc: '受到少量伤害，但获得额外材料。', damageHpRatio: 0.12, rewards: { spiritStones: 28 } },
  fortune: { type: 'fortune', icon: '✨', name: '奇遇房', desc: '遇见游方散修，获得历练。', rewards: { xp: 45, spiritStones: 12 } },
};

function createDefaultStageProgress() {
  return {
    unlockedStages: { [FIRST_STAGE_ID]: true },
    clearedStages: {},
    firstClearClaimed: {},
    stageStars: {},
    bestClearTurns: {},
    chapterBonusClaimed: {},
    selectedStageId: FIRST_STAGE_ID,
    lastRoomEvents: [],
    currentRun: null,
  };
}

function normalizeStageProgress(progress) {
  const base = createDefaultStageProgress();
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return base;
  return {
    unlockedStages: { ...base.unlockedStages, ...(progress.unlockedStages || {}) },
    clearedStages: { ...(progress.clearedStages || {}) },
    firstClearClaimed: { ...(progress.firstClearClaimed || {}) },
    stageStars: { ...(progress.stageStars || {}) },
    bestClearTurns: { ...(progress.bestClearTurns || {}) },
    chapterBonusClaimed: { ...(progress.chapterBonusClaimed || {}) },
    selectedStageId: STAGES[progress.selectedStageId] ? progress.selectedStageId : base.selectedStageId,
    lastRoomEvents: Array.isArray(progress.lastRoomEvents) ? progress.lastRoomEvents.slice(-8) : [],
    currentRun: progress.currentRun && STAGES[progress.currentRun.stageId] ? { ...progress.currentRun, events: Array.isArray(progress.currentRun.events) ? progress.currentRun.events.slice(-8) : [] } : null,
  };
}

function isStageUnlocked(player, stageId) {
  if (!player || !STAGES[stageId]) return false;
  player.stageProgress = normalizeStageProgress(player.stageProgress);
  const stage = STAGES[stageId];
  const chapter = STAGE_CHAPTERS[stage.chapterId];
  if ((player.realmIndex || 0) < (chapter?.realmRequired || 0)) return false;
  return !!player.stageProgress.unlockedStages[stageId];
}

function getStageLockedReason(player, stageId) {
  const stage = STAGES[stageId];
  if (!stage) return '未知副本';
  const chapter = STAGE_CHAPTERS[stage.chapterId];
  if ((player?.realmIndex || 0) < (chapter?.realmRequired || 0)) return `需要${REALMS?.[chapter.realmRequired]?.name || '更高境界'}`;
  if (!player?.stageProgress?.unlockedStages?.[stageId]) return '通关前置副本后解锁';
  return '';
}

function getStageRoomEventType(stage, roomIndex) {
  const idx = Number(roomIndex || 0);
  const total = Math.max(1, Number(stage?.roomCount || 1));
  if (stage?.boss && idx >= total - 1) return 'boss';
  if (idx === 0) return 'normal';
  if (idx === total - 2) return 'elite';
  const patterns = {
    qingyun_foot: ['normal', 'treasure', 'normal'],
    qingyun_peak: ['normal', 'rest', 'elite', 'boss'],
    blood_entrance: ['normal', 'trap', 'elite', 'boss'],
    blood_depth: ['normal', 'fortune', 'trap', 'elite', 'boss'],
    thunder_peak: ['normal', 'trap', 'rest', 'elite', 'boss'],
    yaogu_outer: ['normal', 'trap', 'fortune', 'elite', 'boss'],
    yaogu_core: ['normal', 'treasure', 'trap', 'rest', 'elite', 'boss'],
    nether_gate: ['normal', 'fortune', 'trap', 'elite', 'boss'],
    nether_throne: ['normal', 'trap', 'fortune', 'treasure', 'elite', 'boss'],
    void_edge: ['normal', 'trap', 'rest', 'elite', 'boss'],
    void_heart: ['normal', 'fortune', 'trap', 'treasure', 'elite', 'boss'],
    demon_front: ['normal', 'trap', 'elite', 'rest', 'boss'],
    demon_lord: ['normal', 'trap', 'treasure', 'fortune', 'elite', 'boss'],
    ascension_steps: ['normal', 'fortune', 'rest', 'elite', 'boss'],
    ascension_guardian: ['normal', 'treasure', 'trap', 'rest', 'elite', 'boss'],
    thunder_trial: ['normal', 'trap', 'rest', 'trap', 'elite', 'boss'],
    thunder_palace: ['normal', 'trap', 'fortune', 'treasure', 'trap', 'elite', 'boss'],
    immortal_path: ['normal', 'fortune', 'rest', 'treasure', 'elite', 'boss'],
    immortal_gatekeeper: ['normal', 'treasure', 'trap', 'fortune', 'rest', 'elite', 'boss'],
    reception_platform: ['normal', 'fortune', 'rest', 'elite', 'treasure', 'boss'],
    cloudsea_road: ['normal', 'trap', 'fortune', 'rest', 'elite', 'treasure', 'boss'],
    immortal_spirit_trial: ['normal', 'fortune', 'trap', 'rest', 'elite', 'treasure', 'boss'],
    mystic_thunder_pool: ['normal', 'trap', 'rest', 'fortune', 'elite', 'trap', 'boss'],
    thunder_punish_palace: ['normal', 'trap', 'fortune', 'treasure', 'rest', 'elite', 'trap', 'boss'],
    nine_sky_thunder_altar: ['normal', 'trap', 'fortune', 'treasure', 'rest', 'elite', 'trap', 'boss'],
    forge_outer_hall: ['normal', 'treasure', 'trap', 'rest', 'elite', 'fortune', 'boss'],
    immortal_armory: ['normal', 'treasure', 'trap', 'fortune', 'rest', 'elite', 'treasure', 'boss'],
    haotian_forge: ['normal', 'trap', 'treasure', 'fortune', 'rest', 'elite', 'trap', 'boss'],
    nether_ferry: ['normal', 'trap', 'fortune', 'rest', 'elite', 'treasure', 'boss'],
    soul_river_bridge: ['normal', 'trap', 'fortune', 'treasure', 'rest', 'elite', 'trap', 'boss'],
    nether_immortal_throne: ['normal', 'fortune', 'trap', 'treasure', 'rest', 'elite', 'trap', 'boss'],
    heaven_gate_frontline: ['normal', 'trap', 'rest', 'elite', 'treasure', 'fortune', 'trap', 'boss'],
    demon_tide_rift: ['normal', 'trap', 'fortune', 'trap', 'treasure', 'rest', 'elite', 'trap', 'boss'],
    immortal_demon_ancient_field: ['normal', 'fortune', 'trap', 'treasure', 'trap', 'rest', 'elite', 'trap', 'boss'],
    demon_lord_projection: ['normal', 'trap', 'fortune', 'treasure', 'trap', 'rest', 'elite', 'trap', 'treasure', 'boss'],
  };
  return patterns[stage?.id]?.[idx] || 'normal';
}

function getStageRoomEvent(stage, roomIndex) {
  const type = getStageRoomEventType(stage, roomIndex);
  return STAGE_ROOM_EVENTS[type] || STAGE_ROOM_EVENTS.normal;
}

function getStageRoomLabel(stage, roomIndex) {
  const idx = Number(roomIndex || 0);
  const event = getStageRoomEvent(stage, idx);
  if (idx === 0 && event.type === 'normal') return '入口';
  return `${event.icon || ''}${event.name || `房间${idx + 1}`}`;
}

function getStageMaterialName(id) {
  const mat = (typeof MATERIALS !== 'undefined' ? MATERIALS : []).find(m => m.id === id);
  return mat?.name || ({ herb: '灵草', beast_core: '妖核', artifact_soul: '神器残魂', artifact_core: '神器核心', immortal_refine_stone: '仙炼石', demon_war_banner: '仙魔战旗', tribulation_essence: '雷劫精华', qingyun_fur: '青云狼毫', blood_crystal: '血煞晶', thunder_core: '雷劫兽核', yaogu_essence: '万妖精魄', nether_jade: '幽冥魂玉', void_shard: '虚空碎片', demon_blade: '天魔刃片', ascension_stone: '登仙石', nine_thunder_seal: '九劫雷印', immortal_jade: '真仙玉', immortal_marrow: '仙髓', immortal_jade_ascended: '仙玉', law_fragment_sword: '剑之法则碎片', law_fragment_thunder: '雷之法则碎片', law_fragment_pill: '丹之法则碎片', law_fragment_forge: '器之法则碎片', law_fragment_void: '虚空法则碎片', law_fragment_nether: '幽冥法则碎片' }[id] || id);
}

const STAGE_MATERIAL_SOURCE_HINTS = {
  law_fragment_sword: '接引仙域 · 云海古道 / 接引仙台',
  law_fragment_pill: '接引仙域 · 仙灵试炼场',
  law_fragment_thunder: '玄雷天域 · 玄雷池 / 雷罚殿 / 九霄雷台',
  law_fragment_forge: '万器仙宫 · 仙炉外殿 / 万器库 / 昊天锻台',
  law_fragment_nether: '幽都裂界 · 幽都渡口 / 魂河残桥 / 冥仙王座',
  law_fragment_void: '仙魔战场 · 天门防线 / 魔潮裂谷 / 仙魔古战场 / 魔尊投影',
  immortal_refine_stone: '万器仙宫 · 仙炉外殿 / 万器库 / 昊天锻台',
  demon_war_banner: '仙魔战场 · 天门防线 / 魔潮裂谷 / 仙魔古战场 / 魔尊投影',
  immortal_marrow: '接引仙域 / 玄雷天域',
  immortal_jade_ascended: '仙界篇副本重复掉落',
  artifact_core: '九霄雷台 / 昊天锻台 / 冥仙王座 / 魔尊投影',
};

function getStageMaterialSources(materialId) {
  if (!materialId) return [];
  const sources = [];
  Object.values(STAGES || {}).forEach(stage => {
    const rewardBuckets = [stage.firstClearRewards, stage.clearRewards].filter(Boolean);
    const hit = rewardBuckets.some(bucket => (bucket.materials || []).some(mat => mat.id === materialId));
    if (hit) sources.push({ stageId: stage.id, stageName: stage.name, chapterId: stage.chapterId, chapterName: STAGE_CHAPTERS?.[stage.chapterId]?.name || stage.chapterId, recommendedPower: stage.recommendedPower });
  });
  return sources;
}

function getStageMaterialSourceText(materialId, limit = 3) {
  const sources = getStageMaterialSources(materialId);
  if (sources.length) {
    const shown = sources.slice(0, Math.max(1, limit)).map(src => `${src.chapterName}·${src.stageName}`);
    const more = sources.length > shown.length ? ` 等${sources.length}处` : '';
    return `可刷副本：${shown.join(' / ')}${more}`;
  }
  return STAGE_MATERIAL_SOURCE_HINTS[materialId] ? `来源提示：${STAGE_MATERIAL_SOURCE_HINTS[materialId]}` : '来源提示：主线、副本或活动奖励';
}

function getStageStarText(stars = 0) {
  const count = Math.max(0, Math.min(3, Number(stars) || 0));
  return '★'.repeat(count) + '☆'.repeat(3 - count);
}

function calculateStageStars(stage, run = {}, player = null) {
  if (!stage) return 1;
  let stars = 1;
  const hpRatio = player && player.maxHp > 0 ? player.hp / player.maxHp : 1;
  if (hpRatio >= 0.3) stars++;
  if (hpRatio >= 0.6) stars++;
  return Math.max(1, Math.min(3, stars));
}

function canSweepStage(player, stageId) {
  if (!player || !STAGES[stageId]) return { ok: false, reason: '未知副本' };
  const progress = normalizeStageProgress(player.stageProgress);
  const stars = Number(progress.stageStars?.[stageId] || 0);
  if (!progress.clearedStages?.[stageId]) return { ok: false, reason: '通关后可扫荡' };
  if (stars < 3) return { ok: false, reason: '三星后可扫荡' };
  return { ok: true, reason: '可扫荡' };
}

function getStageBossMechanicText(stage) {
  const boss = stage?.boss;
  if (!boss) return '无Boss';
  const mechanic = getStageBossMechanic(stage);
  const parts = [...(boss.mechanics || [])];
  if (mechanic) parts.unshift(`${mechanic.icon || '👑'}${mechanic.name}：${mechanic.desc}`);
  return parts.join('；') || `${boss.name}：常规首领技能`;
}

function getStageSetDropText(stage) {
  const ids = [];
  for (const bucket of [stage?.firstClearRewards, stage?.clearRewards]) {
    for (const eq of (bucket?.equipment || [])) if (eq.setId && !ids.includes(eq.setId)) ids.push(eq.setId);
  }
  return ids.map(id => {
    const set = typeof getEquipmentSet === 'function' ? getEquipmentSet(id) : null;
    return set ? `${set.icon || ''}${set.name}套` : id;
  }).join('、');
}

function getStageDropText(stage) {
  const mats = [];
  for (const bucket of [stage?.firstClearRewards, stage?.clearRewards]) {
    for (const mat of (bucket?.materials || [])) {
      const name = getStageMaterialName(mat.id);
      if (!mats.includes(name)) mats.push(name);
    }
  }
  const setText = getStageSetDropText(stage);
  if (setText) mats.push(setText);
  return mats.length ? mats.join('、') : '经验、灵石';
}

function getChapterProgress(player, chapterId) {
  const chapter = STAGE_CHAPTERS[chapterId];
  if (!chapter) return { total: 0, cleared: 0, stars: 0 };
  const progress = normalizeStageProgress(player?.stageProgress);
  let cleared = 0, starSum = 0;
  for (const sid of chapter.stages) {
    if (progress.clearedStages?.[sid]) cleared++;
    starSum += Number(progress.stageStars?.[sid] || 0);
  }
  return { total: chapter.stages.length, cleared, stars: starSum };
}

function isChapterAllCleared(player, chapterId) {
  const cp = getChapterProgress(player, chapterId);
  return cp.total > 0 && cp.cleared >= cp.total;
}

function getStageCodexSummary(player) {
  const progress = normalizeStageProgress(player?.stageProgress);
  const chapterIds = Object.keys(STAGE_CHAPTERS || {});
  let totalStages = 0, clearedStages = 0, totalStars = 0, earnedStars = 0, claimable = 0, sweepable = 0;
  let nextStageId = null;
  const chapters = chapterIds.map(chapterId => {
    const chapter = STAGE_CHAPTERS[chapterId];
    const cp = getChapterProgress(player, chapterId);
    const maxStars = cp.total * 3;
    totalStages += cp.total;
    clearedStages += cp.cleared;
    totalStars += maxStars;
    earnedStars += cp.stars;
    if (canClaimChapterBonus(player, chapterId).ok) claimable++;
    for (const sid of chapter.stages || []) {
      if (!nextStageId && isStageUnlocked(player, sid) && !progress.clearedStages?.[sid]) nextStageId = sid;
      if (canSweepStage(player, sid).ok) sweepable++;
    }
    return {
      id: chapterId,
      name: chapter.name,
      icon: chapter.icon,
      color: chapter.color,
      cleared: cp.cleared,
      total: cp.total,
      stars: cp.stars,
      maxStars,
      bonusClaimed: !!progress.chapterBonusClaimed?.[chapterId],
      claimable: canClaimChapterBonus(player, chapterId).ok,
      theme: typeof getStageTheme === 'function' ? getStageTheme(chapterId) : null,
      title: typeof getChapterTitleId === 'function' ? PLAYER_TITLES?.[getChapterTitleId(chapterId)] : null,
    };
  });
  if (!nextStageId) nextStageId = chapterIds.flatMap(id => STAGE_CHAPTERS[id].stages || []).find(sid => isStageUnlocked(player, sid)) || FIRST_STAGE_ID;
  return { totalStages, clearedStages, totalStars, earnedStars, claimable, sweepable, nextStageId, chapters };
}

function canClaimChapterBonus(player, chapterId) {
  const chapter = STAGE_CHAPTERS[chapterId];
  if (!chapter?.chapterBonus) return { ok: false, reason: '无章节奖励' };
  const progress = normalizeStageProgress(player?.stageProgress);
  if (progress.chapterBonusClaimed?.[chapterId]) return { ok: false, reason: '已领取' };
  const cp = getChapterProgress(player, chapterId);
  if (cp.cleared < cp.total) return { ok: false, reason: `需全通章节（${cp.cleared}/${cp.total}）` };
  return { ok: true, reason: '可领取' };
}

function getStageStarConditionText(stage) {
  return '★通关 ★★剩余血量≥30% ★★★剩余血量≥60%';
}
