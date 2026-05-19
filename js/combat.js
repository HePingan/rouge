// Combat System — Turn-based roguelike combat with skills and messages
const COMBAT_STATE = { IDLE: 0, PLAYER_TURN: 1, ENEMY_TURN: 2, VICTORY: 3, DEFEAT: 4, FLEE: 5 };
let combatState = COMBAT_STATE.IDLE;
let currentEnemy = null;
let combatLogBuffer = [];
let combatLogSeq = 0;
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
  if (!currentEnemy._statusEffects) currentEnemy._statusEffects = [];
  if (!currentEnemy._skillCooldowns) currentEnemy._skillCooldowns = {};
  if (!currentEnemy._buffs) currentEnemy._buffs = [];
  combatState = COMBAT_STATE.PLAYER_TURN;
  combatLogBuffer = [];
  if (typeof applyPassiveOnCombatStart === 'function') applyPassiveOnCombatStart();
  const enemySkills = typeof getEnemySkills === 'function' ? getEnemySkills(enemy) : [];
  const skillText = enemySkills.length ? ` · 技能：${enemySkills.map(s => `${s.icon || '✦'}${s.name}`).join('、')}` : '';
  combatLog(`⚔️ ${enemy.title || enemy.name} 出现了！${skillText}`, enemy.isBoss ? '#ff3333' : '#ff6644');
  showMessage(`${enemy.isBoss ? '👑 ' : ''}${enemy.title || enemy.name} 挡住了去路！${skillText}`, enemy.isBoss ? '#ff2200' : '#ff6644');
  document.body.classList.add('combat-active');
}
function getCombatLogTone(text, color = '#d4c8b0') {
  const s = String(text || '');
  if (/击败|获得|掉落|成功|回复|恢复|回春|回元|返还/.test(s)) return 'good';
  if (/造成\s*\d+|攻击|使用|施放|追加|暴击|重击|连击|追伤/.test(s)) return 'hit';
  if (/被击败|失败|中毒|灼烧|诅咒|迟缓|束缚|灵力不足|遗失/.test(s)) return 'bad';
  if (/防御|护体|减免|闪避|冻结|麻痹|削弱|破防|护甲/.test(s)) return 'status';
  if (/出现|挡住|Boss|技能/.test(s)) return 'info';
  return /^#(55|66|88|99|aa|bb|cc|dd|ee|ff)/i.test(String(color || '')) ? 'info' : 'neutral';
}
function combatLog(text, color = '#d4c8b0') {
  const entry = { text, color, tone: getCombatLogTone(text, color), seq: ++combatLogSeq };
  combatLogBuffer.push(entry);
  if (combatLogBuffer.length > 12) combatLogBuffer.shift();
}
function equipmentAbilityValue(key) {
  return typeof getEquipmentAbility === 'function' ? Number(getEquipmentAbility(key) || 0) : 0;
}
function applyEquipmentOnHitEffects(damage, crit) {
  if (!player || !currentEnemy || currentEnemy.hp <= 0) return;
  const lifesteal = equipmentAbilityValue('lifesteal');
  if (lifesteal > 0 && damage > 0) {
    const heal = Math.max(1, Math.floor(damage * lifesteal / 100));
    player.hp = Math.min(player.maxHp, player.hp + heal);
    combatLog(`🩸 装备吸血回复 ${heal} 生命`, '#ff99aa');
  }
  const burnChance = equipmentAbilityValue('burnOnHit');
  if (burnChance > 0 && Math.random() * 100 < burnChance && typeof addCombatStatus === 'function') {
    addCombatStatus(currentEnemy, { type: 'burn', turns: 2, ratio: 0.18, sourceAtk: player.atk });
    combatLog('🔥 套装触发灼烧', '#ff8844');
  }
  const freezeChance = equipmentAbilityValue('freezeOnHit');
  if (freezeChance > 0 && Math.random() * 100 < freezeChance && typeof addCombatStatus === 'function') {
    addCombatStatus(currentEnemy, { type: 'freeze', turns: 1 });
    combatLog('❄️ 套装触发冻结', '#88ccff');
  }
  const weakenChance = equipmentAbilityValue('weakenOnHit');
  const critWeaken = crit ? equipmentAbilityValue('critWeaken') : 0;
  if ((weakenChance > 0 && Math.random() * 100 < weakenChance) || critWeaken > 0) {
    if (typeof addCombatStatus === 'function') addCombatStatus(currentEnemy, { type: 'weaken', turns: 2, ratio: critWeaken || 0.15 });
    combatLog('🌑 装备削弱敌人攻击', '#c0a0ff');
  }
}
function applyEquipmentTurnRegen() {
  if (!player) return;
  const hpRegen = equipmentAbilityValue('hpRegen');
  const mpRegen = equipmentAbilityValue('mpRegen');
  let parts = [];
  if (hpRegen > 0 && player.hp < player.maxHp) {
    const heal = Math.min(Math.floor(hpRegen), player.maxHp - player.hp);
    if (heal > 0) { player.hp += heal; parts.push(`生命+${heal}`); }
  }
  if (mpRegen > 0 && player.mp < player.maxMp) {
    const mana = Math.min(Math.floor(mpRegen), player.maxMp - player.mp);
    if (mana > 0) { player.mp += mana; parts.push(`灵力+${mana}`); }
  }
  if (parts.length) combatLog(`🌿 装备恢复：${parts.join('、')}`, '#90ee90');
}
function applyEquipmentOnVictory() {
  if (!player) return;
  const mp = equipmentAbilityValue('killMpRestore');
  if (mp > 0) player.mp = Math.min(player.maxMp, player.mp + Math.floor(mp));
  const pct = equipmentAbilityValue('victoryRecoverPct');
  if (pct > 0) {
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * pct));
    player.mp = Math.min(player.maxMp, player.mp + Math.floor(player.maxMp * pct));
  }
}
function playerAttack() {
  if (combatState !== COMBAT_STATE.PLAYER_TURN) return;
  const pierce = (typeof getPassiveArmorPierce === 'function' ? getPassiveArmorPierce() : 0) + equipmentAbilityValue('armorPen') / 100;
  const defMult = typeof getEnemyDefenseMultiplier === 'function' ? getEnemyDefenseMultiplier() : 1;
  const buffDefMult = typeof getEnemyDefenseBuffMultiplier === 'function' ? getEnemyDefenseBuffMultiplier() : 1;
  const effectiveDef = Math.max(0, Math.floor(currentEnemy.def * buffDefMult * defMult * (1 - Math.min(0.85, pierce))));
  let baseDmg = Math.max(1, player.atk - effectiveDef);
  if (currentEnemy.isBoss) baseDmg = Math.floor(baseDmg * (1 + equipmentAbilityValue('bossDmg') / 100));
  const critBonus = (typeof getPassiveCritBonus === 'function' ? getPassiveCritBonus() : 0) + equipmentAbilityValue('crit') / 100;
  const crit = Math.random() < (0.12 + critBonus);
  let dmg = crit ? Math.floor(baseDmg * 2) : Math.max(1, Math.floor(baseDmg + (Math.random() - 0.5) * 4));
  if (player._shadowCounterReady) { dmg = Math.floor(dmg * (1 + equipmentAbilityValue('shadowCounter'))); player._shadowCounterReady = false; }
  currentEnemy.hp -= dmg;
  const flameBurst = equipmentAbilityValue('flameBurst');
  if (flameBurst > 0) { const extra = Math.max(1, Math.floor(player.atk * flameBurst)); currentEnemy.hp -= extra; dmg += extra; combatLog(`🔥 焚天真火追加 ${extra} 火焰伤害`, '#ff8844'); }
  combatLog(`你攻击 ${currentEnemy.name}，造成 ${dmg} 点伤害${crit ? ' 💥暴击！' : ''}${pierce > 0 || defMult < 1 ? '（破防）' : ''}`, '#ffaa44');
  if (typeof applyPassiveAfterPlayerHit === 'function') applyPassiveAfterPlayerHit(dmg, crit);
  applyEquipmentOnHitEffects(dmg, crit);
  const extraChance = equipmentAbilityValue('extraHitChance');
  const thunderChain = equipmentAbilityValue('thunderChain');
  if (currentEnemy.hp > 0 && ((extraChance > 0 && Math.random() * 100 < extraChance) || (thunderChain > 0 && Math.random() < thunderChain))) {
    const ratio = thunderChain > 0 ? 0.5 : 0.35;
    const extra = Math.max(1, Math.floor(baseDmg * ratio));
    currentEnemy.hp -= extra;
    combatLog(`⚡ 装备连击追加 ${extra} 点伤害`, '#d9c3ff');
  }
  // Effects
  const wx = currentEnemy.x * CELL_SIZE + CELL_SIZE / 2;
  const wy = currentEnemy.y * CELL_SIZE + CELL_SIZE / 2;
  if (crit) { spawnCritEffect(wx, wy); sfxCrit(); }
  else { spawnHitEffect(wx, wy); sfxHit(); }
  if (currentEnemy.hp <= 0) {
    currentEnemy.hp = 0;
    if (typeof applyPassiveOnVictory === 'function') applyPassiveOnVictory();
    applyEquipmentOnVictory();
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
function getPlayerTakenDamageMultiplier() {
  if (!player || !player._statusEffects) return 1;
  let mult = 1;
  for (const st of player._statusEffects) {
    if (st.type === 'curse') mult *= 1 + (st.ratio || 0.15);
    if (st.type === 'slow') mult *= 1 + (st.ratio || 0.10);
    if (st.type === 'entangle') mult *= 1 + (st.ratio || 0.12);
  }
  return mult;
}

function addPlayerDebuff(status) {
  if (!player || typeof addCombatStatus !== 'function') return;
  addCombatStatus(player, status);
}

function tickPlayerStatusStartEnemyTurn() {
  if (!player || !player._statusEffects) return false;
  for (const st of player._statusEffects) {
    if (st.type === 'poison' || st.type === 'burn') {
      const dmg = Math.max(1, Math.floor((currentEnemy?.atk || 1) * (st.ratio || 0.08)));
      player.hp -= dmg;
      combatLog(`${st.type === 'poison' ? '☠️ 中毒' : '🔥 灼烧'}造成 ${dmg} 点伤害`, st.type === 'poison' ? '#99dd66' : '#ff8844');
      if (player.hp <= 0) {
        player.hp = 0;
        combatLog('💀 你被持续伤害击败了...', '#ff3333');
        combatState = COMBAT_STATE.DEFEAT;
        onDefeat();
        return true;
      }
    }
    if (st.type === 'poison' || st.type === 'burn' || st.type === 'curse' || st.type === 'slow' || st.type === 'entangle') st.turns -= 1;
  }
  player._statusEffects = player._statusEffects.filter(st => st.turns > 0);
  return false;
}

function tickEnemyBuffsStartTurn() {
  if (!currentEnemy || !currentEnemy._buffs) return;
  for (const buff of currentEnemy._buffs) buff.turns -= 1;
  currentEnemy._buffs = currentEnemy._buffs.filter(buff => buff.turns > 0);
}

function getEnemyDefenseBuffMultiplier() {
  if (!currentEnemy || !currentEnemy._buffs) return 1;
  return currentEnemy._buffs.reduce((mult, buff) => mult * (1 + (buff.defRatio || 0)), 1);
}

function calculateEnemyDamage(mult = 1) {
  const attackMult = typeof getEnemyAttackMultiplier === 'function' ? getEnemyAttackMultiplier() : 1;
  const guardMult = typeof getPlayerGuardMultiplier === 'function' ? getPlayerGuardMultiplier() : 1;
  const baseDmg = Math.max(1, Math.floor(currentEnemy.atk * attackMult * mult) - player.def);
  let dmg = Math.max(1, Math.floor(baseDmg + (Math.random() - 0.5) * 3));
  if (currentEnemy._defendDebuff) {
    dmg = Math.floor(dmg * 0.5);
    currentEnemy._defendDebuff = false;
  }
  if (guardMult < 1) dmg = Math.max(1, Math.floor(dmg * guardMult));
  const takenMult = getPlayerTakenDamageMultiplier();
  if (takenMult !== 1) dmg = Math.max(1, Math.floor(dmg * takenMult));
  const reduce = equipmentAbilityValue('dmgReduce') / 100;
  if (reduce > 0) dmg = Math.max(1, Math.floor(dmg * (1 - Math.min(0.7, reduce))));
  if (equipmentAbilityValue('lowHpGuard') > 0 && player.hp / Math.max(1, player.maxHp) <= 0.35) dmg = Math.max(1, Math.floor(dmg * (1 - Math.min(0.5, equipmentAbilityValue('lowHpGuard') / 100))));
  if (equipmentAbilityValue('frostBarrier') > 0 && player.hp / Math.max(1, player.maxHp) <= 0.35) dmg = Math.max(1, Math.floor(dmg * (1 - equipmentAbilityValue('frostBarrier'))));
  return { dmg, guardMult, takenMult };
}

function finishEnemyDamage(dmg, label, color = '#ff6666', crit = false, guardMult = 1, takenMult = 1) {
  player.hp -= dmg;
  const thorns = equipmentAbilityValue('thorns');
  if (thorns > 0 && currentEnemy) {
    const reflected = Math.max(1, Math.floor(dmg * thorns / 100));
    currentEnemy.hp -= reflected;
    combatLog(`🛡️ 装备反震 ${reflected} 点伤害`, '#aaddff');
  }
  if (typeof applyPassiveAfterEnemyHit === 'function') applyPassiveAfterEnemyHit(dmg);
  if (typeof tickPlayerStatusesAfterHit === 'function') tickPlayerStatusesAfterHit();
  combatLog(`${label}，造成 ${dmg} 点伤害${crit ? ' 💢重击！' : ''}${guardMult < 1 ? '（护体减免）' : ''}${takenMult > 1 ? '（负面状态加深）' : ''}`, color);
  const px = player.x * CELL_SIZE + CELL_SIZE / 2;
  const py = player.y * CELL_SIZE + CELL_SIZE / 2;
  if (crit) { spawnHitEffect(px, py); sfxCrit(); }
  else { spawnHitEffect(px, py); sfxHit(); }
}

function chooseEnemySkill() {
  const skills = typeof getEnemySkills === 'function' ? getEnemySkills(currentEnemy) : [];
  const usable = skills.filter(s => !currentEnemy._skillCooldowns?.[s.name]);
  for (const skill of usable) {
    const chance = currentEnemy.isBoss ? Math.min(0.68, (skill.chance || 0.25) + 0.12) : (skill.chance || 0.25);
    if (Math.random() < chance) return skill;
  }
  return null;
}

function useEnemySkill(skill) {
  if (!skill || !currentEnemy) return false;
  if (!currentEnemy._skillCooldowns) currentEnemy._skillCooldowns = {};
  currentEnemy._skillCooldowns[skill.name] = currentEnemy.isBoss ? 1 : 2;
  const label = `${skill.icon || '✦'} ${currentEnemy.title || currentEnemy.name}施放【${skill.name}】${skill.log ? `，${skill.log}` : ''}`;
  if (skill.type === 'selfBuff') {
    if (!currentEnemy._buffs) currentEnemy._buffs = [];
    currentEnemy._buffs.push({ ...(skill.buff || { defRatio: 0.15, turns: 2 }) });
    combatLog(`${label}，防御提升`, skill.color || '#aaddff');
    return true;
  }
  if (skill.type === 'multiHit') {
    const hits = skill.hits || 2;
    let total = 0;
    let guardMult = 1;
    let takenMult = 1;
    for (let i = 0; i < hits; i++) {
      const result = calculateEnemyDamage(skill.mult || 0.6);
      total += result.dmg;
      guardMult = result.guardMult;
      takenMult = result.takenMult;
    }
    finishEnemyDamage(total, `${label}（${hits}段）`, skill.color || '#ff6666', false, guardMult, takenMult);
    return true;
  }
  const result = calculateEnemyDamage(skill.mult || 1);
  finishEnemyDamage(result.dmg, label, skill.color || '#ff6666', false, result.guardMult, result.takenMult);
  if (skill.type === 'drain' && currentEnemy.hp > 0) {
    const heal = Math.max(1, Math.floor(result.dmg * (skill.healRatio || 0.45)));
    currentEnemy.hp = Math.min(currentEnemy.maxHp, currentEnemy.hp + heal);
    combatLog(`👻 ${currentEnemy.name} 回复 ${heal} 生命`, skill.color || '#88a0ff');
  }
  if ((skill.type === 'damageStatus' || skill.type === 'damageDebuff') && skill.status) {
    addPlayerDebuff({ ...skill.status, sourceAtk: currentEnemy.atk });
    combatLog(`${skill.status.type === 'poison' ? '☠️ 毒素' : '🔥 灼烧'}缠身 ${skill.status.turns || 2} 回合`, skill.color || '#ff8844');
  }
  if ((skill.type === 'damageStatus' || skill.type === 'damageDebuff') && skill.debuff) {
    addPlayerDebuff({ ...skill.debuff });
    combatLog(`⚠️ ${skill.debuff.type === 'curse' ? '诅咒' : skill.debuff.type === 'slow' ? '迟缓' : '束缚'} ${skill.debuff.turns || 1} 回合`, skill.color || '#d4a0ff');
  }
  return true;
}

function finishEnemyTurn() {
  if (player.hp <= 0) {
    player.hp = 0;
    combatLog('💀 你被击败了...', '#ff3333');
    combatState = COMBAT_STATE.DEFEAT;
    onDefeat();
    return;
  }
  if (currentEnemy && currentEnemy.hp <= 0) {
    currentEnemy.hp = 0;
    if (typeof applyPassiveOnVictory === 'function') applyPassiveOnVictory();
    applyEquipmentOnVictory();
    combatLog(`✅ 你反震击败了 ${currentEnemy.name}！`, '#55ff55');
    combatState = COMBAT_STATE.VICTORY;
    onVictory();
    return;
  }
  if (typeof applyPassiveOnPlayerTurnStart === 'function') applyPassiveOnPlayerTurnStart();
  applyEquipmentTurnRegen();
  combatState = COMBAT_STATE.PLAYER_TURN;
}

function enemyAttack() {
  if (combatState !== COMBAT_STATE.ENEMY_TURN) return;
  if (!currentEnemy || currentEnemy.hp <= 0) return;
  if (typeof tickEnemyStatusStartTurn === 'function' && tickEnemyStatusStartTurn()) return;
  if (tickPlayerStatusStartEnemyTurn()) return;
  tickEnemyBuffsStartTurn();
  if (currentEnemy._skillCooldowns) {
    for (const key of Object.keys(currentEnemy._skillCooldowns)) {
      currentEnemy._skillCooldowns[key] -= 1;
      if (currentEnemy._skillCooldowns[key] <= 0) delete currentEnemy._skillCooldowns[key];
    }
  }
  const dodgeChance = Math.min(0.55, equipmentAbilityValue('dodge') / 100);
  if (dodgeChance > 0 && Math.random() < dodgeChance) {
    combatLog(`${currentEnemy.name} 的攻击被你闪避！`, '#88ccff');
    if (equipmentAbilityValue('shadowCounter') > 0) player._shadowCounterReady = true;
    finishEnemyTurn();
    return;
  }
  const skill = chooseEnemySkill();
  if (skill && useEnemySkill(skill)) {
    finishEnemyTurn();
    return;
  }
  const result = calculateEnemyDamage(1);
  const crit = Math.random() < (currentEnemy.isBoss ? 0.12 : 0.08);
  const dmg = crit ? Math.floor(result.dmg * 1.8) : result.dmg;
  finishEnemyDamage(dmg, `${currentEnemy.name} 攻击你`, '#ff6666', crit, result.guardMult, result.takenMult);
  finishEnemyTurn();
}
function onVictory() {
  const xpReward = Math.ceil((currentEnemy.xp || 20) * 1.35);
  const stonesReward = Math.ceil((currentEnemy.stones || 5) * 1.45);
  player.gainXp(xpReward);
  player.addSpiritStones(stonesReward);
  // 休闲节奏：地图更短，单场战斗奖励更爽，减少重复刷怪压力
  const lootCount = currentEnemy.isBoss ? 4 : (Math.random() < 0.65 ? 2 : 1);
  let msg = `获得 ${xpReward} 经验，💎 ${stonesReward} 灵石`;
  if (currentEnemy.isBoss) msg += ' | 👑 Boss击杀！';
  const MAX_INVENTORY = 24;
  for (let l = 0; l < lootCount; l++) {
    const loot = generateLootDrop(dungeonLevel, currentEnemy);
    if (loot) {
      if (player.inventory.length >= MAX_INVENTORY) {
        msg += ` | ⚠️ 背包已满，${loot.name} 无法拾取`;
        break;
      }
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
  // Clear enemy tile and remove from monsters map.
  // Boss guards spawn on the same cell as STAIRS_DOWN, so preserve/reveal the exit.
  if (dungeon && currentEnemy) {
    const key = `${currentEnemy.x},${currentEnemy.y}`;
    const wasBossGuard = !!currentEnemy.isBoss;
    dungeon.grid[currentEnemy.y][currentEnemy.x] = wasBossGuard ? TILE.STAIRS_DOWN : TILE.FLOOR;
    if (dungeon._monsters) dungeon._monsters.delete(key);
    if (wasBossGuard) {
      if (typeof discoveredMap !== 'undefined') discoveredMap.add(key);
      if (typeof visibleMap !== 'undefined') visibleMap.add(key);
      if (typeof resetDomMapCache === 'function') resetDomMapCache();
      combatLog('▽ 守卫倒下，通往下一层的入口显现！', '#ffdd55');
      msg += ' | ▽ 下一层入口已开启';
    }
  }
  showMessage(msg, '#55ff55');
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
