// Combat System — Turn-based roguelike combat with skills and messages
const COMBAT_STATE = { IDLE: 0, PLAYER_TURN: 1, ENEMY_TURN: 2, VICTORY: 3, DEFEAT: 4, FLEE: 5 };
let combatState = COMBAT_STATE.IDLE;
let currentEnemy = null;
let combatLogBuffer = [];
function resetTemporaryCombatBuffs() {
  if (!player) return;
  if (!player.tempAtkBuff && !player.tempDefBuff && !player._statusEffects && !player._combatTriggers) return;
  player.tempAtkBuff = 0;
  player.tempDefBuff = 0;
  player._statusEffects = [];
  player._combatTriggers = {};
  player.recalcStats();
}
function startCombat(enemy) {
  currentEnemy = enemy;
  combatState = COMBAT_STATE.PLAYER_TURN;
  combatLogBuffer = [];
  if (typeof applyPassiveOnCombatStart === 'function') applyPassiveOnCombatStart();
  combatLog(`⚔️ ${enemy.name} 出现了！`, '#ff6644');
  showMessage(`${enemy.name} 挡住了去路！`, '#ff6644');
  document.body.classList.add('combat-active');
}
function combatLog(text, color = '#d4c8b0') {
  combatLogBuffer.push({ text, color });
  if (combatLogBuffer.length > 8) combatLogBuffer.shift();
}
function playerAttack() {
  if (combatState !== COMBAT_STATE.PLAYER_TURN) return;
  const pierce = typeof getPassiveArmorPierce === 'function' ? getPassiveArmorPierce() : 0;
  const defMult = typeof getEnemyDefenseMultiplier === 'function' ? getEnemyDefenseMultiplier() : 1;
  const effectiveDef = Math.max(0, Math.floor(currentEnemy.def * defMult * (1 - Math.min(0.85, pierce))));
  const baseDmg = Math.max(1, player.atk - effectiveDef);
  const critBonus = typeof getPassiveCritBonus === 'function' ? getPassiveCritBonus() : 0;
  const crit = Math.random() < (0.12 + critBonus);
  const dmg = crit ? Math.floor(baseDmg * 2) : Math.max(1, Math.floor(baseDmg + (Math.random() - 0.5) * 4));
  currentEnemy.hp -= dmg;
  combatLog(`你攻击 ${currentEnemy.name}，造成 ${dmg} 点伤害${crit ? ' 💥暴击！' : ''}${pierce > 0 || defMult < 1 ? '（破防）' : ''}`, '#ffaa44');
  if (typeof applyPassiveAfterPlayerHit === 'function') applyPassiveAfterPlayerHit(dmg, crit);
  // Effects
  const wx = currentEnemy.x * CELL_SIZE + CELL_SIZE / 2;
  const wy = currentEnemy.y * CELL_SIZE + CELL_SIZE / 2;
  if (crit) { spawnCritEffect(wx, wy); sfxCrit(); }
  else { spawnHitEffect(wx, wy); sfxHit(); }
  if (currentEnemy.hp <= 0) {
    currentEnemy.hp = 0;
    if (typeof applyPassiveOnVictory === 'function') applyPassiveOnVictory();
    combatLog(`✅ 你击败了 ${currentEnemy.name}！`, '#55ff55');
    combatState = COMBAT_STATE.VICTORY;
    onVictory();
    return;
  }
  // Enemy retaliates
  combatState = COMBAT_STATE.ENEMY_TURN;
  setTimeout(enemyAttack, 500);
}
function playerDefend() {
  if (combatState !== COMBAT_STATE.PLAYER_TURN) return;
  combatLog('你凝神防御，减少下次受到的伤害。', '#66aaff');
  currentEnemy._defendDebuff = true; // Flag for enemy attack
  combatState = COMBAT_STATE.ENEMY_TURN;
  setTimeout(enemyAttack, 500);
}
function playerFlee() {
  if (combatState !== COMBAT_STATE.PLAYER_TURN) return;
  const fleeChance = 0.5 + (player.realmIndex * 0.08);
  if (Math.random() < fleeChance) {
    combatLog('🏃 你成功逃脱了！', '#88ccff');
    combatState = COMBAT_STATE.FLEE;
    onFlee();
  } else {
    combatLog('逃跑失败！', '#ff4444');
    combatState = COMBAT_STATE.ENEMY_TURN;
    setTimeout(enemyAttack, 500);
  }
}
function enemyAttack() {
  if (combatState !== COMBAT_STATE.ENEMY_TURN) return;
  if (!currentEnemy || currentEnemy.hp <= 0) return;
  if (typeof tickEnemyStatusStartTurn === 'function' && tickEnemyStatusStartTurn()) return;
  const attackMult = typeof getEnemyAttackMultiplier === 'function' ? getEnemyAttackMultiplier() : 1;
  const guardMult = typeof getPlayerGuardMultiplier === 'function' ? getPlayerGuardMultiplier() : 1;
  const baseDmg = Math.max(1, Math.floor(currentEnemy.atk * attackMult) - player.def);
  let dmg = Math.max(1, Math.floor(baseDmg + (Math.random() - 0.5) * 3));
  if (currentEnemy._defendDebuff) {
    dmg = Math.floor(dmg * 0.5);
    currentEnemy._defendDebuff = false;
  }
  if (guardMult < 1) dmg = Math.max(1, Math.floor(dmg * guardMult));
  const crit = Math.random() < 0.08;
  if (crit) dmg = Math.floor(dmg * 1.8);
  player.hp -= dmg;
  if (typeof applyPassiveAfterEnemyHit === 'function') applyPassiveAfterEnemyHit(dmg);
  if (typeof tickPlayerStatusesAfterHit === 'function') tickPlayerStatusesAfterHit();
  combatLog(`${currentEnemy.name} 攻击你，造成 ${dmg} 点伤害${crit ? ' 💢重击！' : ''}${guardMult < 1 ? '（护体减免）' : ''}`, '#ff6666');
  // Effects
  const px = player.x * CELL_SIZE + CELL_SIZE / 2;
  const py = player.y * CELL_SIZE + CELL_SIZE / 2;
  if (crit) { spawnHitEffect(px, py); sfxCrit(); }
  else { spawnHitEffect(px, py); sfxHit(); }
  if (player.hp <= 0) {
    player.hp = 0;
    combatLog('💀 你被击败了...', '#ff3333');
    combatState = COMBAT_STATE.DEFEAT;
    onDefeat();
    return;
  }
  if (typeof applyPassiveOnPlayerTurnStart === 'function') applyPassiveOnPlayerTurnStart();
  combatState = COMBAT_STATE.PLAYER_TURN;
}
function onVictory() {
  const xpReward = currentEnemy.xp || 20;
  const stonesReward = currentEnemy.stones || 5;
  player.gainXp(xpReward);
  player.addSpiritStones(stonesReward);
  // Loot drop (bosses drop extra)
  const lootCount = currentEnemy.isBoss ? 2 : 1;
  let msg = `获得 ${xpReward} 经验，💎 ${stonesReward} 灵石`;
  if (currentEnemy.isBoss) msg += ' | 👑 Boss击杀！';
  for (let l = 0; l < lootCount; l++) {
    const loot = generateLootDrop(dungeonLevel);
    if (loot) {
      player.inventory.push(loot);
      msg += ` | 🎁 掉落: ${loot.name}`;
    }
  }
  // Material drop (bosses always drop 2 materials)
  const matCount = currentEnemy.isBoss ? 2 : 1;
  for (let m = 0; m < matCount; m++) {
    const matDrop = generateMaterialDrop();
    if (matDrop || currentEnemy.isBoss) {
      const drop = matDrop || MATERIALS[Math.floor(Math.random() * 3)];
      playerMaterials[drop.id] = (playerMaterials[drop.id] || 0) + 1;
      msg += ` | 🔹 ${drop.name}`;
    }
  }
  showMessage(msg, '#55ff55');
  // Clear enemy tile (replace with floor) and remove from monsters map
  if (dungeon) {
    const key = `${currentEnemy.x},${currentEnemy.y}`;
    dungeon.grid[currentEnemy.y][currentEnemy.x] = TILE.FLOOR;
    if (dungeon._monsters) dungeon._monsters.delete(key);
  }
  // Effects
  sfxDrop();
  if (currentEnemy.isBoss) {
    const wx = currentEnemy.x * CELL_SIZE + CELL_SIZE / 2;
    const wy = currentEnemy.y * CELL_SIZE + CELL_SIZE / 2;
    spawnDeathEffect(wx, wy);
    sfxLevelUp();
  }
  resetTemporaryCombatBuffs();
  combatState = COMBAT_STATE.IDLE;
  combatLogBuffer = [];
  currentEnemy = null;
  document.body.classList.remove('combat-active');
  autoSave();
}

function onDefeat() {
  combatLog('💀 你被击败了...', '#ff3333');
  combatLog('境界修为护住了你的魂魄，但装备和灵石尽数遗失...', '#ff8844');
  combatState = COMBAT_STATE.DEFEAT;
  const dx = player.x * CELL_SIZE + CELL_SIZE / 2;
  const dy = player.y * CELL_SIZE + CELL_SIZE / 2;
  spawnDeathEffect(dx, dy);
  sfxDeath();
  currentEnemy = null;
  // Trigger respawn after a short delay
  setTimeout(() => {
    // Save what persists
    const savedRealm = player.realmIndex;
    const savedXp = player.xp;
    const savedSkills = [...learnedSkills];
    const savedSkillPoints = availableSkillPoints;
    const savedMaterials = {...playerMaterials};
    const savedBaseHp = player.baseHp;
    const savedBaseMp = player.baseMp;
    const savedBaseAtk = player.baseAtk;
    const savedBaseDef = player.baseDef;
    // Reset player resources but keep cultivation
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.spiritStones = 0;
    // Clear equipment
    for (const slot of Object.keys(player.equipment)) {
      if (player.equipment[slot]) {
        removeEquipmentStats(player, player.equipment[slot]);
        player.equipment[slot] = null;
      }
    }
    player.inventory = [];
    // Keep cultivation progress
    player.realmIndex = savedRealm;
    player.xp = savedXp;
    player.baseHp = savedBaseHp;
    player.baseMp = savedBaseMp;
    player.baseAtk = savedBaseAtk;
    player.baseDef = savedBaseDef;
    player.tempAtkBuff = 0;
    player.tempDefBuff = 0;
    player.recalcStats();
    learnedSkills = savedSkills;
    availableSkillPoints = savedSkillPoints;
    playerMaterials = savedMaterials;
    // Reset dungeon level to 1
    dungeonLevel = 1;
    generateNewFloor();
    combatLogBuffer = [];
    combatState = COMBAT_STATE.IDLE;
    document.body.classList.remove('combat-active');
    showMessage('你在深渊入口重生，修为尚在，从头再来！', '#ffdd44');
    autoSave();
  }, 1500);
}
function onFlee() {
  const fallbackX = Number.isFinite(player.prevX) ? player.prevX : player.x;
  const fallbackY = Number.isFinite(player.prevY) ? player.prevY : player.y;
  player.x = Math.round(fallbackX);
  player.y = Math.round(fallbackY);
  resetTemporaryCombatBuffs();
  combatState = COMBAT_STATE.IDLE;
  combatLogBuffer = [];
  currentEnemy = null;
  document.body.classList.remove('combat-active');
  showMessage('你趁机后撤，暂时脱离了战斗。', '#88ccff');
}
function isInCombat() {
  return combatState === COMBAT_STATE.PLAYER_TURN || combatState === COMBAT_STATE.ENEMY_TURN;
}
// Check adjacency for combat trigger (main loop calls this)
function checkCombatTrigger() {
  if (isInCombat()) return false;
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  if (dungeon._monsters && dungeon._monsters.has(`${px},${py}`)) {
    const enemy = dungeon._monsters.get(`${px},${py}`);
    startCombat(enemy);
    return true;
  }
  return false;
}
