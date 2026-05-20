// Alchemy & Synthesis — materials, recipes, pill crafting UI
// ─── Material Definitions ───
const MATERIALS = [
  { id: 'herb', name: '灵草', rarity: 'common', color: '#55aa55', weight: 40 },
  { id: 'stoneMarrow', name: '石髓', rarity: 'common', color: '#aaaaaa', weight: 30 },
  { id: 'ginseng', name: '千年人参', rarity: 'uncommon', color: '#ffcc44', weight: 15 },
  { id: 'fireCrystal', name: '火晶石', rarity: 'uncommon', color: '#ff6644', weight: 12 },
  { id: 'icePetal', name: '冰魄花瓣', rarity: 'uncommon', color: '#4488ff', weight: 12 },
  { id: 'dragonScale', name: '龙鳞', rarity: 'rare', color: '#ff8822', weight: 6 },
  { id: 'phoenixFeather', name: '凤凰羽', rarity: 'rare', color: '#ff3366', weight: 4 },
  { id: 'soulJade', name: '魂玉', rarity: 'rare', color: '#aa44ff', weight: 5 },
  { id: 'starDust', name: '星辰砂', rarity: 'legendary', color: '#ffdd44', weight: 2 },
  ...(typeof ARTIFACT_MATERIALS !== 'undefined' ? ARTIFACT_MATERIALS : []),
];
// ─── Pill Recipes ───
const RECIPES = [
  {
    name: '回血丹', desc: '恢复 30% 生命', effect: 'healPct', value: 0.3, color: '#ff6666',
    materials: { herb: 2, stoneMarrow: 1 }, difficulty: 1,
  },
  {
    name: '回灵丹', desc: '恢复 30% 灵力', effect: 'restoreMpPct', value: 0.3, color: '#4488ff',
    materials: { herb: 1, ginseng: 1 }, difficulty: 1,
  },
  {
    name: '金创药', desc: '恢复 60% 生命', effect: 'healPct', value: 0.6, color: '#ff8888',
    materials: { ginseng: 2, stoneMarrow: 2 }, difficulty: 2,
  },
  {
    name: '大力丸', desc: '临时提升攻击 50%，持续至下次战斗结束', effect: 'tempAtkBuff', value: 0.5, color: '#ffaa44',
    materials: { fireCrystal: 2, dragonScale: 1 }, difficulty: 3,
  },
  {
    name: '金钟罩', desc: '临时提升防御 50%，持续至下次战斗结束', effect: 'tempDefBuff', value: 0.5, color: '#aaaaaa',
    materials: { icePetal: 2, stoneMarrow: 3 }, difficulty: 3,
  },
  {
    name: '洗髓丹', desc: '永久提升生命上限 20', effect: 'permMaxHp', value: 20, color: '#ffdd44',
    materials: { dragonScale: 2, phoenixFeather: 1, soulJade: 1 }, difficulty: 4,
  },
  {
    name: '悟道丹', desc: '立即获得 200 经验', effect: 'gainXp', value: 200, color: '#aa44ff',
    materials: { soulJade: 2, starDust: 1 }, difficulty: 5,
  },
  {
    name: '破境丹', desc: '下次突破成功率 +12%', effect: 'breakthroughChance', value: 0.12, color: '#ffdd66',
    materials: { ginseng: 2, soulJade: 1, starDust: 1 }, difficulty: 5,
  },
  {
    name: '固元丹', desc: '下次突破失败少损失经验', effect: 'breakthroughProtect', value: 1, color: '#88ffcc',
    materials: { stoneMarrow: 4, dragonScale: 1, soulJade: 1 }, difficulty: 4,
  },
  {
    name: '涅槃丹', desc: '满血满灵复活', effect: 'fullRestore', value: 1, color: '#ff3366',
    materials: { phoenixFeather: 3, soulJade: 2, starDust: 1 }, difficulty: 6,
  },
];
// ─── Player materials inventory ───
let playerMaterials = {};  // { materialId: count }
let showAlchemyUI = false;
// ─── Scatter materials on dungeon floor ───
function scatterMaterials(dungeonObj, floorLevel) {
  const roomCount = Math.max(1, (dungeonObj.rooms || []).length);
  const count = Math.min(18, Math.max(8, Math.floor(roomCount * 1.6) + Math.floor(floorLevel * 0.8)));
  const rooms = dungeonObj.rooms;
  dungeonObj._materials = dungeonObj._materials || [];
  for (let i = 0; i < count; i++) {
    const roomIndex = Math.floor(Math.random() * rooms.length);
    const room = rooms[roomIndex];
    const mx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
    const my = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
    if (dungeonObj.grid[my][mx] === TILE.FLOOR &&
        !dungeonObj._materials.some(m => m.x === mx && m.y === my) &&
        !(dungeonObj._monsters && dungeonObj._monsters.has(`${mx},${my}`))) {
      // Weighted material pick (rarer mats more common at deeper floors)
      const weights = MATERIALS.map(m => ({
        ...m,
        adjustedWeight: m.weight * (1 + (floorLevel - 1) * 0.15 * (m.rarity === 'legendary' ? 3 : m.rarity === 'rare' ? 2 : 1))
      }));
      const total = weights.reduce((s, m) => s + m.adjustedWeight, 0);
      let roll = Math.random() * total;
      let picked = MATERIALS[0];
      for (const w of weights) {
        roll -= w.adjustedWeight;
        if (roll <= 0) { picked = w; break; }
      }
      dungeonObj._materials.push({ id: picked.id, x: mx, y: my, name: picked.name, color: picked.color });
    }
  }
}
// ─── Check if player steps on a material ───
function checkMaterialPickup() {
  if (!dungeon || !dungeon._materials) return;
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  const idx = dungeon._materials.findIndex(m => m.x === px && m.y === py);
  if (idx >= 0) {
    const mat = dungeon._materials[idx];
    playerMaterials[mat.id] = (playerMaterials[mat.id] || 0) + 1;
    showMessage(`拾取材料: ${mat.name}`, mat.color);
    dungeon._materials.splice(idx, 1);
    autoSave();
  }
}
// ─── Drop materials from monster kill ───
function generateMaterialDrop() {
  const roll = Math.random();
  if (roll < 0.5) return null; // 50% drop chance
  const weights = MATERIALS.filter(m => m.rarity !== 'legendary').map(m => ({ ...m }));
  const total = weights.reduce((s, m) => s + m.weight, 0);
  let r = Math.random() * total;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w;
  }
  return MATERIALS[0];
}
// ─── Craft a pill ───
function craftPill(recipeIndex) {
  if (recipeIndex < 0 || recipeIndex >= RECIPES.length) return false;
  const recipe = RECIPES[recipeIndex];
  // Check materials
  for (const [matId, required] of Object.entries(recipe.materials)) {
    if ((playerMaterials[matId] || 0) < required) {
      showMessage('材料不足！', '#ff4444');
      return false;
    }
  }
  // Success check (difficulty-based)
  const successRate = Math.max(0.3, 1.0 - (recipe.difficulty - 1) * 0.12);
  const success = Math.random() < successRate;
  // Consume materials
  for (const [matId, required] of Object.entries(recipe.materials)) {
    playerMaterials[matId] -= required;
  }
  if (success) {
    // Apply effect
    switch (recipe.effect) {
      case 'healPct':
        const healAmt = Math.floor(player.maxHp * recipe.value);
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        showMessage(`服用【${recipe.name}】！恢复 ${healAmt} 生命`, '#55ff55');
        break;
      case 'restoreMpPct':
        const mpAmt = Math.floor(player.maxMp * recipe.value);
        player.mp = Math.min(player.maxMp, player.mp + mpAmt);
        showMessage(`服用【${recipe.name}】！恢复 ${mpAmt} 灵力`, '#4488ff');
        break;
      case 'tempAtkBuff':
        player.tempAtkBuff = recipe.value;
        player.recalcStats();
        showMessage(`服用【${recipe.name}】！攻击力暂时大幅提升`, '#ffaa44');
        break;
      case 'tempDefBuff':
        player.tempDefBuff = recipe.value;
        player.recalcStats();
        showMessage(`服用【${recipe.name}】！防御力暂时大幅提升`, '#aaaaaa');
        break;
      case 'permMaxHp':
        player.baseHp += recipe.value;
        player.recalcStats();
        player.hp = Math.min(player.maxHp, player.hp + recipe.value);
        showMessage(`服用【${recipe.name}】！永久提升生命上限 +${recipe.value}`, '#ffdd44');
        break;
      case 'gainXp':
        player.gainXp(recipe.value);
        showMessage(`服用【${recipe.name}】！获得 ${recipe.value} 经验`, '#aa44ff');
        if (typeof checkBreakthrough === 'function') checkBreakthrough();
        break;
      case 'breakthroughChance':
        player.breakthroughChanceBonus = Math.min(0.24, Number(player.breakthroughChanceBonus || 0) + recipe.value);
        showMessage(`服用【${recipe.name}】！下次突破成功率提升`, '#ffdd66');
        break;
      case 'breakthroughProtect':
        player.breakthroughProtect = Math.max(Number(player.breakthroughProtect || 0), Number(recipe.value || 1));
        showMessage(`服用【${recipe.name}】！下次突破失败将护住根基`, '#88ffcc');
        break;
      case 'fullRestore':
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        showMessage(`服用【${recipe.name}】！生命灵力完全恢复`, '#ff3366');
        break;
    }
    autoSave();
  } else {
    showMessage(`炼丹失败！材料化为灰烬...`, '#ff4444');
  }
  return true;
}
