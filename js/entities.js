// Player and Monster Entity Definitions

const REALMS = [
  { name: '炼气期', xpNeeded: 80, hpMult: 1.0, mpMult: 1.0, atkBonus: 0, defBonus: 0 },
  { name: '筑基期', xpNeeded: 250, hpMult: 1.4, mpMult: 1.2, atkBonus: 4, defBonus: 2 },
  { name: '金丹期', xpNeeded: 550, hpMult: 2.0, mpMult: 1.6, atkBonus: 10, defBonus: 6 },
  { name: '元婴期', xpNeeded: 1200, hpMult: 2.8, mpMult: 2.2, atkBonus: 20, defBonus: 12 },
  { name: '化神期', xpNeeded: 2400, hpMult: 3.8, mpMult: 3.2, atkBonus: 32, defBonus: 22 },
  { name: '炼虚期', xpNeeded: 4800, hpMult: 5.0, mpMult: 4.4, atkBonus: 48, defBonus: 34 },
  { name: '合体期', xpNeeded: 9000, hpMult: 6.4, mpMult: 5.8, atkBonus: 68, defBonus: 50 },
  { name: '大乘期', xpNeeded: 16000, hpMult: 8.0, mpMult: 7.4, atkBonus: 94, defBonus: 70 },
  { name: '渡劫期', xpNeeded: 28000, hpMult: 10.0, mpMult: 9.3, atkBonus: 128, defBonus: 96 },
  { name: '真仙境', xpNeeded: 48000, hpMult: 12.5, mpMult: 11.6, atkBonus: 172, defBonus: 130 },
];

class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.realmIndex = 0;
    this.xp = 0;
    this.spiritStones = 0;
    this.daoFoundation = null;
    this.breakthroughFails = 0;
    this.breakthroughChanceBonus = 0;
    this.breakthroughProtect = 0;

    // Base stats
    this.baseHp = 100;
    this.baseMp = 50;
    this.baseAtk = 10;
    this.baseDef = 3;

    // Current stats (after equipment, buffs, etc.)
    this.maxHp = this.baseHp;
    this.hp = this.maxHp;
    this.maxMp = this.baseMp;
    this.mp = this.maxMp;
    this.atk = this.baseAtk;
    this.def = this.baseDef;
    this.tempAtkBuff = 0;
    this.tempDefBuff = 0;

    // Inventory
    this.equipment = {
      weapon: null,
      helmet: null,
      armor: null,
      gloves: null,
      belt: null,
      pants: null,
      boots: null,
      accessory: null,
    };
    this.inventory = [];
    this.artifacts = typeof createDefaultArtifactsState === 'function' ? createDefaultArtifactsState() : { activeId: null, owned: {} };
    this.skillPoints = 0;
    this.learnedSkills = [];
  }

  get realm() { return REALMS[this.realmIndex]; }

  recalcStats() {
    const r = this.realm;
    const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    const mpRatio = this.maxMp > 0 ? this.mp / this.maxMp : 1;
    this.maxHp = Math.floor(this.baseHp * r.hpMult);
    this.maxMp = Math.floor(this.baseMp * r.mpMult);
    this.atk = this.baseAtk + r.atkBonus;
    this.def = this.baseDef + r.defBonus;
    // Reset every derived non-core stat before rebuilding equipment / set / skill bonuses.
    // Otherwise repeated recalcStats() calls can keep stale bonuses or stack them forever.
    const derivedStats = [
      'crit', 'dodge', 'speed', 'lifesteal', 'armorPen', 'goldFind', 'xpBonus',
      'fireDmg', 'iceDmg', 'poisonDmg', 'lightningDmg', 'hpRegen', 'mpRegen', 'allRes',
      'killMpRestore', 'thorns', 'bossDmg', 'extraHitChance', 'weakenOnHit', 'critWeaken',
      'lowHpGuard', 'dmgReduce', 'burnOnHit', 'freezeOnHit', 'shadowCounter', 'flameBurst',
      'thunderChain', 'frostBarrier', 'victoryRecoverPct'
    ];
    for (const stat of derivedStats) this[stat] = 0;
    this._equipmentSetEffects = {};
    this._equipmentSetActive = [];
    const applyStatBonus = (stat, value) => {
      switch (stat) {
        case 'atk': this.atk += value; break;
        case 'def': this.def += value; break;
        case 'hp':
        case 'maxHp': this.maxHp += value; break;
        case 'mp':
        case 'maxMp': this.maxMp += value; break;
        case 'atkPct': this.atk = Math.floor(this.atk * (1 + value)); break;
        case 'defPct': this.def = Math.floor(this.def * (1 + value)); break;
        case 'maxHpPct': this.maxHp = Math.floor(this.maxHp * (1 + value)); break;
        case 'maxMpPct': this.maxMp = Math.floor(this.maxMp * (1 + value)); break;
        default: this[stat] = (this[stat] || 0) + value; break;
      }
    };
    if (this.equipment) {
      for (const item of Object.values(this.equipment)) {
        if (!item) continue;
        if (typeof rebuildEquipmentStats === 'function') rebuildEquipmentStats(item);
        for (const [stat, value] of Object.entries(item.stats || {})) applyStatBonus(stat, value);
      }
      if (typeof getEquipmentSetBonuses === 'function') {
        const setBonuses = getEquipmentSetBonuses(this.equipment);
        this._equipmentSetEffects = setBonuses.effects || {};
        this._equipmentSetActive = setBonuses.active || [];
        for (const [stat, value] of Object.entries(setBonuses.stats || {})) applyStatBonus(stat, value);
      }
    }
    if (typeof getSkillPassiveBonuses === 'function') {
      const skillBonuses = getSkillPassiveBonuses();
      for (const [stat, value] of Object.entries(skillBonuses || {})) applyStatBonus(stat, value);
    }
    if (typeof getArtifactStatBonuses === 'function') {
      const artifactBonuses = getArtifactStatBonuses(this);
      for (const [stat, value] of Object.entries(artifactBonuses || {})) applyStatBonus(stat, value);
    }
    if (this.tempAtkBuff) this.atk = Math.floor(this.atk * (1 + this.tempAtkBuff));
    if (this.tempDefBuff) this.def = Math.floor(this.def * (1 + this.tempDefBuff));
    this.hp = Math.max(1, Math.min(this.maxHp, Math.floor(this.maxHp * hpRatio)));
    this.mp = Math.max(0, Math.min(this.maxMp, Math.floor(this.maxMp * mpRatio)));
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    if (this.mp > this.maxMp) this.mp = this.maxMp;
  }

  gainXp(amount) {
    this.xp += amount;
  }

  addSpiritStones(amount) {
    this.spiritStones += amount;
  }
}

// ─── Monster & Boss Definitions ───
const MONSTER_SKILLS = {
  rockSmash: { name: '裂石重击', icon: '🪨', chance: 0.28, type: 'damage', mult: 1.45, color: '#c0b090', log: '抡起巨石猛砸' },
  venomFang: { name: '毒牙', icon: '☠️', chance: 0.30, type: 'damageStatus', mult: 0.85, status: { type: 'poison', turns: 3, ratio: 0.08 }, color: '#aa66aa', log: '咬出腐毒' },
  soulDrain: { name: '摄魂', icon: '👻', chance: 0.24, type: 'drain', mult: 1.05, healRatio: 0.55, color: '#88a0ff', log: '吞噬魂息' },
  flameSpit: { name: '喷火', icon: '🔥', chance: 0.30, type: 'damageStatus', mult: 1.15, status: { type: 'burn', turns: 2, ratio: 0.10 }, color: '#ff7744', log: '吐出妖火' },
  shadowBackstab: { name: '影袭', icon: '🌑', chance: 0.34, type: 'damage', mult: 1.65, color: '#b090ff', log: '遁入阴影突袭' },
  frostBite: { name: '霜咬', icon: '❄️', chance: 0.28, type: 'damageDebuff', mult: 0.95, debuff: { type: 'slow', turns: 2, ratio: 0.12 }, color: '#88ccff', log: '寒气侵体' },
  thornBind: { name: '藤缚', icon: '🌿', chance: 0.30, type: 'damageDebuff', mult: 0.9, debuff: { type: 'entangle', turns: 1, ratio: 0.18 }, color: '#77cc66', log: '藤蔓缠身' },
  lavaBurst: { name: '熔爆', icon: '🌋', chance: 0.32, type: 'damageStatus', mult: 1.25, status: { type: 'burn', turns: 2, ratio: 0.12 }, color: '#ff5522', log: '引爆岩浆' },
  ironShell: { name: '铁甲', icon: '🛡️', chance: 0.22, type: 'selfBuff', buff: { defRatio: 0.18, turns: 2 }, color: '#aaddff', log: '缩入坚甲' },
  abyssCleave: { name: '深渊横扫', icon: '👑', chance: 0.40, type: 'damage', mult: 1.55, color: '#ff4444', log: '挥出深渊横扫' },
  dragonBreath: { name: '魔龙吐息', icon: '🐉', chance: 0.45, type: 'damageStatus', mult: 1.35, status: { type: 'burn', turns: 3, ratio: 0.12 }, color: '#ff6622', log: '喷吐魔焰' },
  ghostCurse: { name: '幽冥咒', icon: '🟣', chance: 0.44, type: 'damageDebuff', mult: 1.15, debuff: { type: 'curse', turns: 2, ratio: 0.16 }, color: '#aa66ff', log: '降下幽冥咒' },
  shuraCombo: { name: '修罗连斩', icon: '🩸', chance: 0.46, type: 'multiHit', hits: 3, mult: 0.62, color: '#ff3366', log: '斩出修罗血光' },
  frostDomain: { name: '冰狱领域', icon: '🧊', chance: 0.44, type: 'damageDebuff', mult: 1.10, debuff: { type: 'slow', turns: 3, ratio: 0.2 }, color: '#66ddff', log: '展开冰狱领域' },
  poisonDomain: { name: '万毒妖域', icon: '🐍', chance: 0.44, type: 'damageStatus', mult: 1.05, status: { type: 'poison', turns: 4, ratio: 0.10 }, color: '#66cc66', log: '释放万毒妖域' },
};

const MONSTERS = [
  { name: '石魔',    symbol: '石', hp: 34, atk: 7,  def: 3, xp: 16, stones: 3, color: '#8a8a8a', weight: 30, skillIds: ['rockSmash', 'ironShell'] },
  { name: '毒蝠',    symbol: '蝠', hp: 24, atk: 10, def: 1, xp: 13, stones: 2, color: '#aa66aa', weight: 25, skillIds: ['venomFang'] },
  { name: '魂妖',    symbol: '魂', hp: 28, atk: 8,  def: 2, xp: 19, stones: 4, color: '#6688ff', weight: 20, skillIds: ['soulDrain'] },
  { name: '火蜥',    symbol: '蜥', hp: 38, atk: 12, def: 3, xp: 23, stones: 5, color: '#ff6644', weight: 15, skillIds: ['flameSpit'] },
  { name: '暗影刺客', symbol: '影', hp: 26, atk: 15, def: 1, xp: 27, stones: 6, color: '#444444', weight: 10, skillIds: ['shadowBackstab'] },
];

const BOSSES = [
  { floor: 5,  name: '深渊守卫',   symbol: '守', hp: 110, atk: 16, def: 7, xp: 95,  stones: 36, isBoss: true, color: '#ff4444', skillIds: ['abyssCleave', 'ironShell'] },
  { floor: 10, name: '暗黑魔龙',   symbol: '龙', hp: 210, atk: 25, def: 11, xp: 180, stones: 72, isBoss: true, color: '#ff6622', skillIds: ['dragonBreath', 'rockSmash'] },
  { floor: 15, name: '幽冥鬼王',   symbol: '王', hp: 340, atk: 34, def: 15, xp: 300, stones: 120, isBoss: true, color: '#aa44ff', skillIds: ['ghostCurse', 'soulDrain'] },
  { floor: 20, name: '无间修罗',   symbol: '罗', hp: 520, atk: 45, def: 21, xp: 480, stones: 210, isBoss: true, color: '#ff0066', skillIds: ['shuraCombo', 'abyssCleave'] },
  { floor: 25, name: '冰狱妖后',   symbol: '后', hp: 680, atk: 52, def: 24, xp: 650, stones: 280, isBoss: true, color: '#66ddff', skillIds: ['frostDomain', 'frostBite'] },
  { floor: 30, name: '万毒魔君',   symbol: '毒', hp: 820, atk: 60, def: 26, xp: 820, stones: 360, isBoss: true, color: '#66cc66', skillIds: ['poisonDomain', 'venomFang'] },
  { floor: 35, name: '炼虚天魔',   symbol: '虚', hp: 1050, atk: 72, def: 32, xp: 1080, stones: 480, isBoss: true, color: '#bb88ff', skillIds: ['ghostCurse', 'frostDomain'] },
  { floor: 40, name: '合体妖皇',   symbol: '皇', hp: 1360, atk: 86, def: 40, xp: 1400, stones: 640, isBoss: true, color: '#ffbb44', skillIds: ['shuraCombo', 'ironShell'] },
  { floor: 45, name: '大乘古魔',   symbol: '古', hp: 1760, atk: 104, def: 50, xp: 1820, stones: 860, isBoss: true, color: '#ff5577', skillIds: ['abyssCleave', 'poisonDomain'] },
  { floor: 50, name: '渡劫雷君',   symbol: '劫', hp: 2280, atk: 126, def: 62, xp: 2380, stones: 1160, isBoss: true, color: '#ffdd44', skillIds: ['dragonBreath', 'shuraCombo'] },
];

function getMonsterSkill(id) {
  return MONSTER_SKILLS[id] ? { ...MONSTER_SKILLS[id] } : null;
}

function getEnemySkills(enemy) {
  return (enemy?.skillIds || []).map(getMonsterSkill).filter(Boolean);
}

function isBossFloor(level) {
  return level > 0 && level % 5 === 0;
}

function getBossForLevel(level) {
  const exact = BOSSES.find(b => b.floor === level);
  if (exact) return exact;
  if (!isBossFloor(level)) return null;
  return BOSSES[(Math.floor(level / 5) - 1) % BOSSES.length];
}

function getMonsterScale(level, isBoss = false) {
  const depth = Math.max(0, level - 1);
  const hp = 1 + depth * 0.15 + Math.pow(depth, 1.25) * 0.018;
  const atk = 1 + depth * 0.12 + Math.pow(depth, 1.18) * 0.012;
  const def = 1 + depth * 0.10 + Math.pow(depth, 1.15) * 0.010;
  const reward = 1 + depth * 0.16;
  return isBoss ? { hp: hp * 1.10, atk: atk * 1.08, def: def * 1.05, xp: reward * 1.25, stones: reward * 1.25 } : { hp, atk, def, xp: reward, stones: reward };
}

function createScaledEnemy(template, level, biomeMult = {}, x = 0, y = 0, extra = {}) {
  const isElite = !!extra.isElite;
  const baseScale = getMonsterScale(level, !!template.isBoss);
  const mult = { hp: 1, atk: 1, def: 1, xp: 1, stones: 1, ...biomeMult };
  const eliteMult = isElite ? { hp: 1.75, atk: 1.28, def: 1.18, xp: 2.1, stones: 2.2 } : { hp: 1, atk: 1, def: 1, xp: 1, stones: 1 };
  const maxHp = Math.floor(template.hp * baseScale.hp * mult.hp * eliteMult.hp);
  const skillIds = [...(template.skillIds || [])];
  return {
    ...template,
    ...extra,
    name: isElite ? `精英·${template.name}` : template.name,
    title: isElite ? `精英·${template.name}` : template.title,
    hp: maxHp,
    maxHp,
    atk: Math.floor(template.atk * baseScale.atk * mult.atk * eliteMult.atk),
    def: Math.floor(template.def * baseScale.def * mult.def * eliteMult.def),
    xp: Math.floor(template.xp * baseScale.xp * mult.xp * eliteMult.xp),
    stones: Math.floor(template.stones * baseScale.stones * mult.stones * eliteMult.stones),
    skillIds,
    x,
    y,
  };
}

function spawnMonsters(dungeonObj, level) {
  const roomCount = Math.max(1, (dungeonObj.rooms || []).length - 1);
  const count = Math.min(18, Math.max(4, Math.floor(roomCount * 1.35) + Math.floor(level * 0.45)));
  const rooms = dungeonObj.rooms;
  const grid = dungeonObj.grid;
  const biome = dungeonObj.biome || (typeof getBiomeForLevel === 'function' ? getBiomeForLevel(level) : null);
  const biomeMult = biome?.monsterMult || { hp: 1, atk: 1, def: 1, xp: 1, stones: 1 };
  const monsterPool = biome?.monsters || MONSTERS;

  // Place boss first if boss floor
  if (isBossFloor(level)) {
    const boss = getBossForLevel(level);
    if (boss && rooms.length > 1) {
      const bossRoom = rooms[rooms.length - 1];
      const bx = Math.floor(bossRoom.x + bossRoom.w / 2);
      const by = Math.floor(bossRoom.y + bossRoom.h / 2);
      if (grid[by][bx] === TILE.FLOOR || grid[by][bx] === TILE.STAIRS_DOWN) {
        const scaledBoss = createScaledEnemy(boss, level, biomeMult, bx, by);
        scaledBoss.biome = biome?.name;
        scaledBoss.title = level > boss.floor ? `${boss.name}·轮回${Math.floor(level / 30) + 1}` : boss.name;
        dungeonObj._monsters.set(`${bx},${by}`, scaledBoss);
      }
    }
  }

  // Place one elite guardian in the elite room for a clear risk/reward target.
  const eliteRoom = rooms.find(r => r.type === ROOM_TYPE.ELITE);
  if (eliteRoom) {
    const ex = Math.floor(eliteRoom.x + eliteRoom.w / 2);
    const ey = Math.floor(eliteRoom.y + eliteRoom.h / 2);
    if ((grid[ey][ex] === TILE.FLOOR || grid[ey][ex] === TILE.STAIRS_DOWN) && !dungeonObj._monsters.has(`${ex},${ey}`)) {
      const totalWeight = monsterPool.reduce((s, m) => s + m.weight, 0);
      let roll = Math.random() * totalWeight;
      let picked = monsterPool[0];
      for (const mon of monsterPool) {
        roll -= mon.weight;
        if (roll <= 0) { picked = mon; break; }
      }
      const elite = createScaledEnemy(picked, level, biomeMult, ex, ey, { isElite: true, eliteRewardMult: 2.0, color: picked.color || '#ff7744' });
      elite.biome = biome?.name;
      dungeonObj._monsters.set(`${ex},${ey}`, elite);
    }
  }

  // Place normal monsters
  for (let i = 0; i < count; i++) {
    const roomIndex = 1 + Math.floor(Math.random() * (rooms.length - 2));
    const room = rooms[Math.min(Math.max(roomIndex, 0), rooms.length - 1)];
    const mx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
    const my = room.y + 1 + Math.floor(Math.random() * (room.h - 2));

    if (grid[my][mx] === TILE.FLOOR && !dungeonObj._monsters.has(`${mx},${my}`) &&
        !(dungeonObj._materials && dungeonObj._materials.some(m => m.x === mx && m.y === my))) {
      // Weighted random pick
      const totalWeight = monsterPool.reduce((s, m) => s + m.weight, 0);
      let roll = Math.random() * totalWeight;
      let picked = monsterPool[0];
      for (const mon of monsterPool) {
        roll -= mon.weight;
        if (roll <= 0) { picked = mon; break; }
      }
      const scaledMonster = createScaledEnemy(picked, level, biomeMult, mx, my);
      scaledMonster.biome = biome?.name;
      dungeonObj._monsters.set(`${mx},${my}`, scaledMonster);
    }
  }
}
