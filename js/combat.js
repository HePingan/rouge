// Combat System — Turn-based roguelike combat with skills and messages
const COMBAT_STATE = { IDLE: 0, PLAYER_TURN: 1, ENEMY_TURN: 2, VICTORY: 3, DEFEAT: 4, FLEE: 5 };
let combatState = COMBAT_STATE.IDLE;
let currentEnemy = null;
let combatLogBuffer = [];
let combatLogSeq = 0;
let isInSecretRealm = false;
let secretRealmNodeIndex = 0;
let secretRealmNodeCount = 0;
let isInStageRun = false;
let stageRoomIndex = 0;
let stageRoomCount = 0;
let isInTribulation = false;
let tribulationNodeIndex = 0;
let tribulationNodeCount = 0;
function resetTemporaryCombatBuffs() {
  if (!player) return;
  if (!player.tempAtkBuff && !player.tempDefBuff && !player._statusEffects && !player._combatTriggers && !player._secretRealmDebuffs) return;
  player.tempAtkBuff = 0;
  player.tempDefBuff = 0;
  player._statusEffects = [];
  player._combatTriggers = {};
  player._secretRealmDebuffs = [];
  player.recalcStats();
}
function startCombat(enemy) {
  if (!enemy || Number(enemy.hp || 0) <= 0) {
    // Defensive cleanup: do not start combat with a dead/stale monster reference.
    if (dungeon && enemy && Number.isFinite(enemy.x) && Number.isFinite(enemy.y)) {
      const key = `${enemy.x},${enemy.y}`;
      if (dungeon._monsters) dungeon._monsters.delete(key);
      if (dungeon.grid?.[enemy.y]?.[enemy.x] !== undefined && dungeon.grid[enemy.y][enemy.x] !== TILE.STAIRS_DOWN) {
        dungeon.grid[enemy.y][enemy.x] = TILE.FLOOR;
      }
      if (typeof resetDomMapCache === 'function') resetDomMapCache();
    }
    return;
  }
  currentEnemy = enemy;
  if (!currentEnemy._statusEffects) currentEnemy._statusEffects = [];
  if (!currentEnemy._skillCooldowns) currentEnemy._skillCooldowns = {};
  if (!currentEnemy._buffs) currentEnemy._buffs = [];
  combatState = COMBAT_STATE.PLAYER_TURN;
  combatLogBuffer = [];
  if (typeof applyPassiveOnCombatStart === 'function') applyPassiveOnCombatStart();
  currentEnemy._bossMechanicState = { turn: 0, hp70: false, hp40: false };
  const enemySkills = typeof getEnemySkills === 'function' ? getEnemySkills(enemy) : [];
  const immortalBossMechanic = typeof getImmortalBossMechanic === 'function'
    ? getImmortalBossMechanic(enemy.bossMechanicId || enemy.id || enemy.stageId)
    : null;
  const stageBossMechanic = typeof getStageBossMechanic === 'function'
    ? (getStageBossMechanic(enemy.stageId) || (enemy.bossMechanicId && typeof STAGE_BOSS_MECHANICS !== 'undefined' ? STAGE_BOSS_MECHANICS[enemy.bossMechanicId] : null))
    : null;
  const bossMechanic = immortalBossMechanic || stageBossMechanic;
  const skillText = enemySkills.length ? ` · 技能：${enemySkills.map(s => `${s.icon || '✦'}${s.name}`).join('、')}` : '';
  const mechanicText = bossMechanic ? ` · 机制：${bossMechanic.icon || '👑'}${bossMechanic.name}` : '';
  combatLog(`⚔️ ${enemy.title || enemy.name} 出现了！${skillText}${mechanicText}`, enemy.isBoss ? '#ff3333' : '#ff6644');
  showMessage(`${enemy.isBoss ? '👑 ' : ''}${enemy.title || enemy.name} 挡住了去路！${skillText}${mechanicText}`, enemy.isBoss ? '#ff2200' : '#ff6644');
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
function activeArtifactIdForCombat(p = player) {
  return (typeof getActiveArtifact === 'function' && getActiveArtifact(p)?.id) || null;
}
function rollArtifactAttackEffects(p = player, baseDamage = 1, rng = Math.random) {
  const id = activeArtifactIdForCombat(p);
  const effects = [];
  if (!id || typeof getArtifactEffectValue !== 'function') return effects;
  if (id === 'zhuxian') {
    const chance = Number(getArtifactEffectValue('swordQiChance', p) || 0);
    if (chance > 0 && rng() * 100 < chance) {
      const ratio = Number(getArtifactEffectValue('swordQiRatio', p) || 0.35);
      effects.push({ id: 'zhuxian', label: '诛仙剑气', icon: '🗡️', color: '#ff5577', damage: Math.max(1, Math.floor(baseDamage * ratio)) });
    }
  }
  if (id === 'leifa') {
    const chance = Number(getArtifactEffectValue('thunderSealChain', p) || 0);
    if (chance > 0 && rng() * 100 < chance) {
      const ratio = Number(getArtifactEffectValue('thunderSealRatio', p) || 0.35);
      effects.push({ id: 'leifa', label: '雷罚天雷', icon: '⚡', color: '#d9c3ff', damage: Math.max(1, Math.floor(baseDamage * ratio)) });
    }
  }
  return effects;
}
function applyArtifactDeathSave(p = player) {
  if (!p || typeof getArtifactEffectValue !== 'function') return { ok: false, reason: 'unavailable' };
  if (activeArtifactIdForCombat(p) !== 'haotian') return { ok: false, reason: 'not_active' };
  if (Number(getArtifactEffectValue('deathSave', p) || 0) <= 0) return { ok: false, reason: 'no_effect' };
  p._combatTriggers = p._combatTriggers || {};
  if (p._combatTriggers.haotianDeathSave) return { ok: false, reason: 'used' };
  if (p.hp > 0) return { ok: false, reason: 'not_lethal' };
  p._combatTriggers.haotianDeathSave = true;
  p.hp = Math.max(1, Math.floor(Number(p.maxHp || 1) * 0.30));
  return { ok: true, hp: p.hp };
}
function applyArtifactVictoryEffects(p = player) {
  if (!p || typeof getArtifactEffectValue !== 'function') return { ok: false, reason: 'unavailable' };
  const pct = Number(getArtifactEffectValue('killRecoverPct', p) || 0);
  if (activeArtifactIdForCombat(p) !== 'lianyao' || pct <= 0) return { ok: false, reason: 'not_active' };
  const hp = Math.floor(Number(p.maxHp || 0) * pct);
  const mp = Math.floor(Number(p.maxMp || 0) * pct);
  p.hp = Math.min(p.maxHp, Number(p.hp || 0) + hp);
  p.mp = Math.min(p.maxMp, Number(p.mp || 0) + mp);
  return { ok: true, hp, mp };
}
function notifyArtifactTrigger({ label = '神器共鸣', icon = '🗡️', color = '#ffdd66', text = '', worldX = null, worldY = null, quietToast = false } = {}) {
  const msg = `${icon} ${label}${text ? `：${text}` : ''}`;
  combatLog(msg, color);
  if (!quietToast && typeof showMessage === 'function') showMessage(msg, color, { ttl: 46, quiet: true });
  if (typeof spawnArtifactTriggerEffect === 'function' && Number.isFinite(worldX) && Number.isFinite(worldY)) {
    spawnArtifactTriggerEffect(worldX, worldY, color);
  }
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
  const artifactEffects = typeof rollArtifactAttackEffects === 'function' ? rollArtifactAttackEffects(player, baseDmg) : [];
  for (const effect of artifactEffects) {
    if (currentEnemy.hp <= 0) break;
    currentEnemy.hp -= effect.damage;
    dmg += effect.damage;
    const ex = currentEnemy.x * CELL_SIZE + CELL_SIZE / 2;
    const ey = currentEnemy.y * CELL_SIZE + CELL_SIZE / 2;
    notifyArtifactTrigger({ label: effect.label, icon: effect.icon || '🗡️', color: effect.color || '#ffdd66', text: `追加 ${effect.damage} 点伤害`, worldX: ex, worldY: ey });
  }
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
  if (currentEnemy.hp > 0) maybeTriggerBossMechanic('hp');
  if (currentEnemy.hp <= 0) {
    currentEnemy.hp = 0;
    if (typeof applyPassiveOnVictory === 'function') applyPassiveOnVictory();
    applyEquipmentOnVictory();
    const artifactRecover = typeof applyArtifactVictoryEffects === 'function' ? applyArtifactVictoryEffects(player) : null;
    if (artifactRecover?.ok) combatLog(`🏺 炼妖壶炼化妖力，恢复生命 ${artifactRecover.hp}、灵力 ${artifactRecover.mp}`, '#90ee90');
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
  if (!player) return 1;
  let mult = 1;
  for (const st of (player._statusEffects || [])) {
    if (st.type === 'curse') mult *= 1 + (st.ratio || 0.15);
    if (st.type === 'slow') mult *= 1 + (st.ratio || 0.10);
    if (st.type === 'entangle') mult *= 1 + (st.ratio || 0.12);
  }
  for (const st of (player._secretRealmDebuffs || [])) {
    if (st.type === 'takenDmgUp') mult *= 1 + (st.ratio || 0.10);
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

function getEnemyAttackBuffMultiplier() {
  if (!currentEnemy || !currentEnemy._buffs) return 1;
  return currentEnemy._buffs.reduce((mult, buff) => mult * (1 + (buff.atkRatio || 0)), 1);
}

function calculateEnemyDamage(mult = 1) {
  const attackMult = (typeof getEnemyAttackMultiplier === 'function' ? getEnemyAttackMultiplier() : 1) * getEnemyAttackBuffMultiplier();
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
    let chance = skill.chance || 0.25;
    if (currentEnemy.isElite) chance += 0.08;
    if (currentEnemy.isBoss) chance += 0.16;
    chance = Math.min(currentEnemy.isBoss ? 0.76 : 0.56, chance);
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
    const buff = { ...(skill.buff || { defRatio: 0.15, turns: 2 }) };
    currentEnemy._buffs.push(buff);
    const parts = [];
    if (buff.atkRatio) parts.push(`攻击+${Math.round(buff.atkRatio * 100)}%`);
    if (buff.defRatio) parts.push(`防御+${Math.round(buff.defRatio * 100)}%`);
    combatLog(`${label}，${parts.join('、') || '妖力提升'}`, skill.color || '#aaddff');
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

function getCurrentImmortalBossMechanic() {
  if (!currentEnemy?.isBoss || typeof getImmortalBossMechanic !== 'function') return null;
  return getImmortalBossMechanic(currentEnemy.bossMechanicId || currentEnemy.id || currentEnemy.stageId);
}

function getCurrentBossMechanic() {
  if (!currentEnemy?.isBoss) return null;
  const immortalMechanic = getCurrentImmortalBossMechanic();
  if (immortalMechanic?.triggers) return immortalMechanic;
  if (typeof getStageBossMechanic === 'function' && currentEnemy.stageId) return getStageBossMechanic(currentEnemy.stageId);
  return currentEnemy.bossMechanicId && typeof STAGE_BOSS_MECHANICS !== 'undefined' ? STAGE_BOSS_MECHANICS[currentEnemy.bossMechanicId] : null;
}

function describeImmortalBossEffect(effect) {
  if (!effect) return '异象涌动';
  if (effect.type === 'damage') return `造成 ${effect.value} 伤害`;
  if (effect.type === 'drain') return `吸取 ${effect.value} 生命`;
  if (effect.type === 'status') return `附加${effect.value}`;
  if (effect.type === 'atkBuff') return '攻击提升';
  if (effect.type === 'defBuff') return '防御提升';
  if (effect.type === 'shield') return '护盾回升';
  return effect.type || '异象';
}

function triggerImmortalBossMechanic(mechanic, phase = 'turn') {
  if (!mechanic?.triggers || !currentEnemy || !player || typeof applyImmortalBossMechanic !== 'function') return false;
  const result = applyImmortalBossMechanic(currentEnemy, player, phase);
  if (!result?.effects?.length) return false;
  const detail = result.effects.map(describeImmortalBossEffect).join('、');
  combatLog(`${mechanic.icon || '👑'} ${currentEnemy.name}触发【仙界机制·${mechanic.name}】：${detail}`, '#ffcc88');
  return true;
}

function triggerBossMechanic(mechanic) {
  if (!mechanic || !currentEnemy || !player) return false;
  const effect = mechanic.effect || {};
  const label = `${mechanic.icon || '👑'} ${currentEnemy.name}触发【${mechanic.name}】`;
  if (effect.type === 'bossBuff') {
    currentEnemy._buffs = currentEnemy._buffs || [];
    currentEnemy._buffs.push({ atkRatio: effect.atkRatio || 0, defRatio: effect.defRatio || 0, turns: effect.turns || 2 });
    combatLog(`${label}，气势暴涨`, '#ffdd66');
    return true;
  }
  if (effect.type === 'healBuff') {
    const heal = Math.max(1, Math.floor((currentEnemy.maxHp || currentEnemy.hp || 1) * (effect.healMaxHpRatio || 0.05)));
    currentEnemy.hp = Math.min(currentEnemy.maxHp || currentEnemy.hp, currentEnemy.hp + heal);
    currentEnemy._buffs = currentEnemy._buffs || [];
    currentEnemy._buffs.push({ atkRatio: effect.atkRatio || 0, defRatio: effect.defRatio || 0, turns: effect.turns || 2 });
    combatLog(`${label}，回复 ${heal} 生命并强化自身`, '#ffdd66');
    return true;
  }
  if (effect.type === 'debuff') {
    if (effect.debuff) addPlayerDebuff({ ...effect.debuff });
    if (effect.status) addPlayerDebuff({ ...effect.status, sourceAtk: currentEnemy.atk });
    combatLog(`${label}，负面状态缠身`, '#d4a0ff');
    return true;
  }
  if (effect.type === 'drainDebuff') {
    const result = calculateEnemyDamage(effect.mult || 0.75);
    finishEnemyDamage(result.dmg, label, '#b086ff', false, result.guardMult, result.takenMult);
    const heal = Math.max(1, Math.floor(result.dmg * (effect.healRatio || 0.4)));
    currentEnemy.hp = Math.min(currentEnemy.maxHp || currentEnemy.hp, currentEnemy.hp + heal);
    if (effect.debuff) addPlayerDebuff({ ...effect.debuff });
    combatLog(`👻 ${currentEnemy.name} 摄魂回复 ${heal} 生命`, '#b086ff');
    return true;
  }
  if (effect.type === 'multiHitDebuff') {
    let total = 0, guardMult = 1, takenMult = 1;
    for (let i = 0; i < (effect.hits || 2); i++) { const r = calculateEnemyDamage(effect.mult || 0.35); total += r.dmg; guardMult = r.guardMult; takenMult = r.takenMult; }
    finishEnemyDamage(total, `${label}（${effect.hits || 2}段）`, '#f6e05e', false, guardMult, takenMult);
    if (effect.debuff) addPlayerDebuff({ ...effect.debuff });
    return true;
  }
  if (effect.type === 'damageDebuff') {
    const dmg = Math.max(1, Math.floor((currentEnemy.atk || 1) * (effect.damageAtkRatio || 0.5)));
    finishEnemyDamage(dmg, label, '#ff8844');
    if (effect.debuff) addPlayerDebuff({ ...effect.debuff });
    if (effect.status) addPlayerDebuff({ ...effect.status, sourceAtk: currentEnemy.atk });
    return true;
  }
  return false;
}

function maybeTriggerBossMechanic(phase = 'turn') {
  const mechanic = getCurrentBossMechanic();
  if (!mechanic || !currentEnemy || currentEnemy.hp <= 0) return false;
  currentEnemy._bossMechanicState = currentEnemy._bossMechanicState || { turn: 0, hp70: false, hp40: false };
  const state = currentEnemy._bossMechanicState;
  if (mechanic.triggers) {
    if (phase === 'turn') state.turn = (state.turn || 0) + 1;
    return triggerImmortalBossMechanic(mechanic, phase);
  }
  const hpRatio = currentEnemy.hp / Math.max(1, currentEnemy.maxHp || currentEnemy.hp);
  if (phase === 'hp' && mechanic.trigger === 'hp70' && hpRatio <= 0.70 && !state.hp70) { state.hp70 = true; return triggerBossMechanic(mechanic); }
  if (phase === 'hp' && mechanic.trigger === 'hp40' && hpRatio <= 0.40 && !state.hp40) { state.hp40 = true; return triggerBossMechanic(mechanic); }
  if (phase === 'turn' && mechanic.trigger === 'turn3') { state.turn = (state.turn || 0) + 1; if (state.turn % 3 === 0) return triggerBossMechanic(mechanic); }
  return false;
}

function finishEnemyTurn() {
  if (player.hp <= 0) {
    const saved = typeof applyArtifactDeathSave === 'function' ? applyArtifactDeathSave(player) : null;
    if (saved?.ok) {
      const px = player.x * CELL_SIZE + CELL_SIZE / 2;
      const py = player.y * CELL_SIZE + CELL_SIZE / 2;
      notifyArtifactTrigger({ label: '昊天塔护体', icon: '🗼', color: '#ffd166', text: `生命恢复至 ${player.hp}`, worldX: px, worldY: py });
    } else {
      player.hp = 0;
      combatLog('💀 你被击败了...', '#ff3333');
      combatState = COMBAT_STATE.DEFEAT;
      onDefeat();
      return;
    }
  }
  if (currentEnemy && currentEnemy.hp <= 0) {
    currentEnemy.hp = 0;
    if (typeof applyPassiveOnVictory === 'function') applyPassiveOnVictory();
    applyEquipmentOnVictory();
    const artifactRecover = typeof applyArtifactVictoryEffects === 'function' ? applyArtifactVictoryEffects(player) : null;
    if (artifactRecover?.ok) combatLog(`🏺 炼妖壶炼化妖力，恢复生命 ${artifactRecover.hp}、灵力 ${artifactRecover.mp}`, '#90ee90');
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
  if (maybeTriggerBossMechanic('turn')) { finishEnemyTurn(); return; }
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
function isAscensionTrialCombat() {
  return !!(currentEnemy?.ascensionTrial && player?.ascension?.trial?.active);
}
function isDemonWarCombat() {
  return !!(currentEnemy?.demonWar && player?.ascension?.demonWar?.active);
}
function onDemonWarDefeat() {
  if (!player?.ascension?.demonWar) return;
  player.ascension.demonWar.active = false;
  player.ascension.demonWar.progress = 0;
  showMessage('仙魔战场失利，战旗燃尽，需重新开启。', '#ff8844');
  if (typeof autoSave === 'function') autoSave();
}
function onVictory() {
  if (isAscensionTrialCombat() && currentEnemy) {
    const result = typeof completeAscensionTrialNode === 'function' ? completeAscensionTrialNode(player, currentEnemy.trialId) : null;
    const total = typeof ASCENSION_TRIALS !== 'undefined' ? ASCENSION_TRIALS.length : 3;
    const cleared = player.ascension?.trial?.cleared?.length || 0;
    const xpReward = Math.ceil((currentEnemy.xp || 70) * 1.2);
    player.gainXp(xpReward);
    showMessage(`飞升三劫胜利：${currentEnemy.name}（${cleared}/${total}）· 获得 ${xpReward} 修为${result?.done ? ' · 三劫已全部通过' : ''}`, result?.done ? '#ffdd66' : '#c8f7ff');
    resetTemporaryCombatBuffs();
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    if (typeof showAscensionUI !== 'undefined') showAscensionUI = true;
    if (typeof ascensionTab !== 'undefined') ascensionTab = 'trial';
    if (typeof renderAscensionDomPanel === 'function') renderAscensionDomPanel();
    if (typeof syncBodyPanelState === 'function') syncBodyPanelState();
    if (typeof autoSave === 'function') autoSave();
    return;
  }
  if (isDemonWarCombat() && currentEnemy) {
    const dw = player.ascension.demonWar;
    const total = dw.nodes?.length || 4;
    const before = Number(dw.progress || 0);
    const nextProgress = Math.min(total, before + 1);
    const xpReward = Math.ceil((currentEnemy.xp || 80) * 1.35);
    const stonesReward = Math.ceil((currentEnemy.stones || 20) * 1.5);
    player.gainXp(xpReward);
    player.addSpiritStones(stonesReward);
    player.ascension.demonWar.progress = Math.min(total, nextProgress);
    showMessage(`仙魔战场胜利：${currentEnemy.name}（${nextProgress}/${total}）· 获得 ${xpReward} 修为、${stonesReward} 灵石${nextProgress >= total ? ' · 可结算终局奖励' : ''}`, nextProgress >= total ? '#ffdd66' : '#ffcc88');
    resetTemporaryCombatBuffs();
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    if (typeof showAscensionUI !== 'undefined') showAscensionUI = true;
    if (typeof ascensionTab !== 'undefined') ascensionTab = 'endgame';
    if (typeof renderAscensionDomPanel === 'function') renderAscensionDomPanel();
    if (typeof syncBodyPanelState === 'function') syncBodyPanelState();
    if (typeof autoSave === 'function') autoSave();
    return;
  }
  if (isInTribulation && currentEnemy) {
    const xpReward = Math.ceil((currentEnemy.xp || 30) * 1.15);
    player.gainXp(xpReward);
    combatLog(`⚡ 扛过第 ${tribulationNodeIndex + 1}/${tribulationNodeCount} 道劫雷，获得 ${xpReward} 修为`, '#ffe27a');
    resetTemporaryCombatBuffs();
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    tribulationNodeIndex++;
    if (tribulationNodeIndex >= tribulationNodeCount) {
      isInTribulation = false;
      if (typeof onTribulationComplete === 'function') onTribulationComplete();
    } else {
      setTimeout(() => { if (typeof advanceTribulationNode === 'function') advanceTribulationNode(); }, 700);
    }
    return;
  }
  if (isInSecretRealm && currentEnemy) {
    // Secret realm victory: use shared node reward logic so manual combat and quick challenge settle consistently.
    const summary = player?.secretRealmProgress?.nodeSummary || null;
    const beforeXp = summary?.xp || 0;
    const beforeStones = summary?.stones || 0;
    const beforeLootCount = summary?.loot?.length || 0;
    if (typeof grantSecretRealmNodeRewards === 'function') {
      grantSecretRealmNodeRewards(currentEnemy, summary);
    }
    const xpReward = summary ? summary.xp - beforeXp : Math.ceil((currentEnemy.xp || 20) * 1.35);
    const stonesReward = summary ? summary.stones - beforeStones : Math.ceil((currentEnemy.stones || 5) * 1.45);
    const newLoot = summary?.loot?.slice(beforeLootCount) || [];
    let msg = `🏞️ 秘境·${currentEnemy.title || currentEnemy.name}击败！获得 ${xpReward} 经验，💎 ${stonesReward} 灵石`;
    if (newLoot.length) msg += ` | 🎁 ${newLoot.join('、')}`;
    showMessage(msg, currentEnemy.isBoss ? '#ffdd55' : '#88ddff');
    resetTemporaryCombatBuffs();
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    // Advance node
    secretRealmNodeIndex++;
    if (secretRealmNodeIndex >= secretRealmNodeCount) {
      // Secret realm complete!
      isInSecretRealm = false;
      if (typeof onSecretRealmComplete === 'function') {
        onSecretRealmComplete();
      }
    } else {
      // Next enemy
      setTimeout(() => {
        if (typeof advanceSecretRealmNode === 'function') {
          advanceSecretRealmNode();
        }
      }, 800);
    }
    return;
  }

  if (isInStageRun && currentEnemy) {
    const xpReward = Math.ceil((currentEnemy.xp || 20) * (currentEnemy.isBoss ? 1.55 : 1.25));
    const stonesReward = Math.ceil((currentEnemy.stones || 5) * (currentEnemy.isBoss ? 1.7 : 1.3));
    player.gainXp(xpReward);
    player.addSpiritStones(stonesReward);
    let msg = `🗺️ ${currentEnemy.title || currentEnemy.name}击败！获得 ${xpReward} 经验，💎 ${stonesReward} 灵石`;
    const lootRolls = currentEnemy.isBoss ? 2 : (currentEnemy.isElite ? 1 : (Math.random() < 0.45 ? 1 : 0));
    const maxInv = typeof getInventoryCapacity === 'function' ? getInventoryCapacity(player) : 36;
    for (let i = 0; i < lootRolls; i++) {
      const loot = generateLootDrop(dungeonLevel, currentEnemy);
      if (!loot) continue;
      if (player.inventory.length < maxInv) { player.inventory.push(loot); msg += ` | 🎁 ${loot.name}`; }
      else { msg += ` | ⚠️ 背包已满(${maxInv}格)`; break; }
    }
    const echoDrop = typeof generateArtifactTreasureEchoDrop === 'function' ? generateArtifactTreasureEchoDrop(player, currentEnemy) : null;
    if (echoDrop) {
      playerMaterials[echoDrop.id] = (playerMaterials[echoDrop.id] || 0) + 1;
      msg += ` | 🪞机缘回响：${echoDrop.name}`;
      const ex = currentEnemy.x * CELL_SIZE + CELL_SIZE / 2;
      const ey = currentEnemy.y * CELL_SIZE + CELL_SIZE / 2;
      notifyArtifactTrigger({ label: '乾坤镜机缘回响', icon: '🪞', color: '#88ccff', text: `额外获得 ${echoDrop.name}`, worldX: ex, worldY: ey });
    }
    clearCurrentEnemyFromDungeon(false);
    const roomCleared = typeof revealStageRoomExitIfCleared === 'function' ? revealStageRoomExitIfCleared(dungeon) : true;
    if (roomCleared) msg += ' | ▽ 出口已开启';
    showMessage(msg, currentEnemy.isBoss ? '#ffdd55' : '#88ddff');
    resetTemporaryCombatBuffs();
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    return;
  }

  const rewardMult = currentEnemy.isElite ? (currentEnemy.eliteRewardMult || 1.8) : 1;
  const xpReward = Math.ceil((currentEnemy.xp || 20) * 1.35 * rewardMult);
  const stonesReward = Math.ceil((currentEnemy.stones || 5) * 1.45 * rewardMult);
  player.gainXp(xpReward);
  player.addSpiritStones(stonesReward);
  // 休闲节奏：地图更短，单场战斗奖励更爽，减少重复刷怪压力
  const lootCount = currentEnemy.isBoss ? 4 : (currentEnemy.isElite ? 3 : (Math.random() < 0.65 ? 2 : 1));
  let msg = `获得 ${xpReward} 经验，💎 ${stonesReward} 灵石`;
  if (currentEnemy.isBoss) msg += ' | 👑 Boss击杀！';
  else if (currentEnemy.isElite) msg += ' | 🔥 精英击杀！';
  const maxInventory = typeof getInventoryCapacity === 'function' ? getInventoryCapacity(player) : 36;
  for (let l = 0; l < lootCount; l++) {
    const loot = generateLootDrop(dungeonLevel, currentEnemy);
    if (loot) {
      if (player.inventory.length >= maxInventory) {
        msg += ` | ⚠️ 背包已满（${maxInventory}格），${loot.name} 无法拾取`;
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
  const artifactDropCount = currentEnemy.isBoss ? 2 : (currentEnemy.isElite ? 1 : 1);
  for (let a = 0; a < artifactDropCount; a++) {
    const artifactMat = typeof generateArtifactMaterialDrop === 'function' ? generateArtifactMaterialDrop(player, currentEnemy) : null;
    if (!artifactMat) continue;
    playerMaterials[artifactMat.id] = (playerMaterials[artifactMat.id] || 0) + 1;
    msg += ` | 🗡️ ${artifactMat.name}`;
  }
  const echoDrop = typeof generateArtifactTreasureEchoDrop === 'function' ? generateArtifactTreasureEchoDrop(player, currentEnemy) : null;
  if (echoDrop) {
    playerMaterials[echoDrop.id] = (playerMaterials[echoDrop.id] || 0) + 1;
    msg += ` | 🪞机缘回响：${echoDrop.name}`;
    const ex = currentEnemy.x * CELL_SIZE + CELL_SIZE / 2;
    const ey = currentEnemy.y * CELL_SIZE + CELL_SIZE / 2;
    notifyArtifactTrigger({ label: '乾坤镜机缘回响', icon: '🪞', color: '#88ccff', text: `额外获得 ${echoDrop.name}`, worldX: ex, worldY: ey });
  }
  // Clear enemy tile and remove from monsters map.
  // Boss guards spawn on the same cell as STAIRS_DOWN, so preserve/reveal the exit.
  if (dungeon && currentEnemy) {
    const wasBossGuard = !!currentEnemy.isBoss;
    clearCurrentEnemyFromDungeon(wasBossGuard);
    if (wasBossGuard) {
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
  if (isDemonWarCombat()) {
    combatLog('仙魔战场失利，你被战场法则送回仙门...', '#ff8844');
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    setTimeout(() => { if (typeof onDemonWarDefeat === 'function') onDemonWarDefeat(); }, 500);
    return;
  }
  if (isInTribulation) {
    combatLog('天劫暂歇，你带着雷痕坠回凡尘...', '#ff8844');
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    setTimeout(() => { if (typeof onTribulationDefeat === 'function') onTribulationDefeat(); }, 500);
    return;
  }
  if (isInSecretRealm) {
    combatLog('秘境溃散，你被传送出来...', '#ff8844');
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    setTimeout(() => {
      if (typeof onSecretRealmDefeat === 'function') onSecretRealmDefeat();
    }, 500);
    return;
  }
  if (isInStageRun) {
    combatLog('副本挑战失败，你被传回入口...', '#ff8844');
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    setTimeout(() => { if (typeof onStageDefeat === 'function') onStageDefeat(); }, 500);
    return;
  }
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
    const savedStatPoints = availableStatPoints;
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
    availableStatPoints = savedStatPoints;
    playerMaterials = savedMaterials;
    // Reset dungeon level to 1
    dungeonLevel = 1;
    generateNewFloor();
    combatLogBuffer = [];
    combatState = COMBAT_STATE.IDLE;
    document.body.classList.remove('combat-active');
    showMessage('道心未灭，肉身重塑！深渊入口，仙途再启...', '#ffdd44');
    autoSave();
  }, 1500);
}
function onFlee() {
  const fallbackX = Number.isFinite(player.prevX) ? player.prevX : player.x;
  const fallbackY = Number.isFinite(player.prevY) ? player.prevY : player.y;
  player.x = Math.round(fallbackX);
  player.y = Math.round(fallbackY);
  resetTemporaryCombatBuffs();

  // If fleeing from a secret realm combat, end the realm run
  if (isDemonWarCombat()) {
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    if (typeof onDemonWarDefeat === 'function') onDemonWarDefeat();
    return;
  }

  if (isInTribulation) {
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    if (typeof onTribulationFlee === 'function') onTribulationFlee();
    return;
  }

  // If fleeing from a secret realm combat, end the realm run
  if (isInSecretRealm) {
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    if (typeof onSecretRealmFlee === 'function') onSecretRealmFlee();
    return;
  }

  if (isInStageRun) {
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    currentEnemy = null;
    document.body.classList.remove('combat-active');
    if (typeof onStageFlee === 'function') onStageFlee();
    return;
  }

  combatState = COMBAT_STATE.IDLE;
  combatLogBuffer = [];
  currentEnemy = null;
  document.body.classList.remove('combat-active');
  showMessage('御风遁走！暂避锋芒，来日再战。', '#88ccff');
}
function isInCombat() {
  return combatState === COMBAT_STATE.PLAYER_TURN || combatState === COMBAT_STATE.ENEMY_TURN;
}
function clearCurrentEnemyFromDungeon(preserveBossStairs = false) {
  if (!dungeon || !currentEnemy || !Number.isFinite(currentEnemy.x) || !Number.isFinite(currentEnemy.y)) return;
  const key = `${currentEnemy.x},${currentEnemy.y}`;
  const currentTile = dungeon.grid?.[currentEnemy.y]?.[currentEnemy.x];
  const shouldPreserveStairs = preserveBossStairs || currentTile === TILE.STAIRS_DOWN;
  if (dungeon.grid?.[currentEnemy.y]?.[currentEnemy.x] !== undefined) {
    dungeon.grid[currentEnemy.y][currentEnemy.x] = shouldPreserveStairs ? TILE.STAIRS_DOWN : TILE.FLOOR;
  }
  if (dungeon._monsters) dungeon._monsters.delete(key);
  if (shouldPreserveStairs) {
    if (typeof discoveredMap !== 'undefined') discoveredMap.add(key);
    if (typeof visibleMap !== 'undefined') visibleMap.add(key);
  }
  if (typeof resetDomMapCache === 'function') resetDomMapCache();
}
// Check adjacency for combat trigger (main loop calls this)
function checkCombatTrigger() {
  if (isInCombat()) return false;
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  if (dungeon._monsters && dungeon._monsters.has(`${px},${py}`)) {
    const enemy = dungeon._monsters.get(`${px},${py}`);
    if (!enemy || Number(enemy.hp || 0) <= 0) {
      dungeon._monsters.delete(`${px},${py}`);
      if (dungeon.grid?.[py]?.[px] !== undefined && dungeon.grid[py][px] !== TILE.STAIRS_DOWN) dungeon.grid[py][px] = TILE.FLOOR;
      if (typeof resetDomMapCache === 'function') resetDomMapCache();
      return false;
    }
    startCombat(enemy);
    return true;
  }
}
