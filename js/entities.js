// Player and Monster Entity Definitions

const REALMS = [
  { name: '炼气期', xpNeeded: 80, hpMult: 1.0, mpMult: 1.0, atkBonus: 0, defBonus: 0 },
  { name: '筑基期', xpNeeded: 250, hpMult: 1.4, mpMult: 1.2, atkBonus: 4, defBonus: 2 },
  { name: '金丹期', xpNeeded: 550, hpMult: 2.0, mpMult: 1.6, atkBonus: 10, defBonus: 6 },
  { name: '元婴期', xpNeeded: 1200, hpMult: 2.8, mpMult: 2.2, atkBonus: 20, defBonus: 12 },
  { name: '化神期', xpNeeded: 2400, hpMult: 3.8, mpMult: 3.2, atkBonus: 32, defBonus: 22 },
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
      armor: null,
      accessory: null,
    };
    this.inventory = [];
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
    if (this.equipment) {
      for (const item of Object.values(this.equipment)) {
        if (!item) continue;
        for (const [stat, value] of Object.entries(item.stats || {})) {
          switch (stat) {
            case 'atk': this.atk += value; break;
            case 'def': this.def += value; break;
            case 'hp':
            case 'maxHp': this.maxHp += value; break;
            case 'mp':
            case 'maxMp': this.maxMp += value; break;
            default: this[stat] = (this[stat] || 0) + value; break;
          }
        }
      }
    }
    if (typeof getSkillPassiveBonuses === 'function') {
      const skillBonuses = getSkillPassiveBonuses();
      if (skillBonuses.maxHpPct) this.maxHp = Math.floor(this.maxHp * (1 + skillBonuses.maxHpPct));
      if (skillBonuses.maxMpPct) this.maxMp = Math.floor(this.maxMp * (1 + skillBonuses.maxMpPct));
      if (skillBonuses.atkPct) this.atk = Math.floor(this.atk * (1 + skillBonuses.atkPct));
      if (skillBonuses.defPct) this.def = Math.floor(this.def * (1 + skillBonuses.defPct));
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
const MONSTERS = [
  { name: '石魔',    symbol: '石', hp: 30, atk: 7,  def: 2, xp: 15, stones: 3, color: '#8a8a8a', weight: 30 },
  { name: '毒蝠',    symbol: '蝠', hp: 20, atk: 10, def: 1, xp: 12, stones: 2, color: '#aa66aa', weight: 25 },
  { name: '魂妖',    symbol: '魂', hp: 25, atk: 8,  def: 2, xp: 18, stones: 4, color: '#6688ff', weight: 20 },
  { name: '火蜥',    symbol: '蜥', hp: 35, atk: 12, def: 3, xp: 22, stones: 5, color: '#ff6644', weight: 15 },
  { name: '暗影刺客', symbol: '影', hp: 22, atk: 15, def: 1, xp: 25, stones: 6, color: '#444444', weight: 10 },
];

const BOSSES = [
  { floor: 5,  name: '深渊守卫',   symbol: '守', hp: 80,  atk: 15, def: 6, xp: 80,  stones: 30, isBoss: true, color: '#ff4444' },
  { floor: 10, name: '暗黑魔龙',   symbol: '龙', hp: 150, atk: 22, def: 10, xp: 150, stones: 60, isBoss: true, color: '#ff6622' },
  { floor: 15, name: '幽冥鬼王',   symbol: '王', hp: 250, atk: 30, def: 15, xp: 250, stones: 100, isBoss: true, color: '#aa44ff' },
  { floor: 20, name: '无间修罗',   symbol: '罗', hp: 400, atk: 40, def: 20, xp: 400, stones: 180, isBoss: true, color: '#ff0066' },
];

function isBossFloor(level) {
  return BOSSES.some(b => b.floor === level);
}

function spawnMonsters(dungeonObj, level) {
  const count = 8 + Math.floor(level * 1.5);
  const rooms = dungeonObj.rooms;
  const grid = dungeonObj.grid;
  const scale = 1 + (level - 1) * 0.2;
  const biome = dungeonObj.biome || (typeof getBiomeForLevel === 'function' ? getBiomeForLevel(level) : null);
  const biomeMult = biome?.monsterMult || { hp: 1, atk: 1, def: 1, xp: 1, stones: 1 };
  const monsterPool = biome?.monsters || MONSTERS;

  // Place boss first if boss floor
  if (isBossFloor(level)) {
    const boss = BOSSES.find(b => b.floor === level);
    if (boss && rooms.length > 1) {
      const bossRoom = rooms[rooms.length - 1];
      const bx = Math.floor(bossRoom.x + bossRoom.w / 2);
      const by = Math.floor(bossRoom.y + bossRoom.h / 2);
      if (grid[by][bx] === TILE.FLOOR) {
        dungeonObj._monsters.set(`${bx},${by}`, {
          ...boss,
          hp: Math.floor(boss.hp * scale * biomeMult.hp),
          atk: Math.floor(boss.atk * scale * biomeMult.atk),
          def: Math.floor(boss.def * scale * biomeMult.def),
          maxHp: Math.floor(boss.hp * scale * biomeMult.hp),
          xp: Math.floor(boss.xp * scale * biomeMult.xp),
          stones: Math.floor(boss.stones * scale * biomeMult.stones),
          biome: biome?.name,
          x: bx,
          y: by,
        });
      }
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
      dungeonObj._monsters.set(`${mx},${my}`, {
        ...picked,
        hp: Math.floor(picked.hp * scale * biomeMult.hp),
        atk: Math.floor(picked.atk * scale * biomeMult.atk),
        def: Math.floor(picked.def * scale * biomeMult.def),
        maxHp: Math.floor(picked.hp * scale * biomeMult.hp),
        xp: Math.floor(picked.xp * scale * biomeMult.xp),
        stones: Math.floor(picked.stones * scale * biomeMult.stones),
        biome: biome?.name,
        x: mx,
        y: my,
      });
    }
  }
}
