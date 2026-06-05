// HUD and UI Rendering
let messageQueue = [];
let messageDedupeMap = {};  // text -> lastTimestamp, for duplicate suppression
let hudRenderCache = {};
let messageLogCacheKey = '';

function setTextIfChanged(el, value) {
  if (el && el.textContent !== value) el.textContent = value;
}

function setWidthIfChanged(el, value) {
  if (el && el.style.width !== value) el.style.width = value;
}

function getSharedNextActionRecommendation(player, options = {}) {
  if (!player) return { title: '选择副本', reason: '新存档先进入青云山开始刷怪', hud: '点击「副本」选择青云山', cta: '去副本', kind: 'stages' };
  const progress = player.stageProgress || {};
  const cleared = progress.clearedStages || {};
  const asc = player.ascension || {};
  if (Number(player.xp || 0) >= Number(player.xpToNext || Infinity)) return { title: '突破境界', reason: '经验已满，先突破再继续刷怪收益更高', hud: '经验已满，点击「更多」→「突破」提升境界', cta: '去突破', kind: 'breakthrough' };
  if (progress.currentRun?.stageId && typeof STAGES !== 'undefined' && STAGES[progress.currentRun.stageId]) {
    const stage = STAGES[progress.currentRun.stageId];
    const room = Number(progress.currentRun.roomIndex || 0) + 1;
    return { title: `推进${stage.name}`, reason: `当前副本进度 ${room}/${stage.roomCount}，优先清完本轮房间`, hud: `推进 ${stage.name} ${room}/${stage.roomCount}`, cta: '继续战斗', kind: 'close' };
  }
  const buildProfile = options.buildProfile || null;
  const claimableCount = Number(buildProfile?.claimableCount || (typeof getSkillCodexSummary === 'function' ? getSkillCodexSummary()?.claimableCount || 0 : 0));
  if (claimableCount > 0) return { title: '领取流派奖励', reason: `当前有 ${claimableCount} 个共鸣/专精奖励待领`, hud: `技能有 ${claimableCount} 项奖励可领，点「技能」领取`, cta: '去技能页', kind: 'skills' };
  if (Number(typeof availableSkillPoints !== 'undefined' ? availableSkillPoints : player.skillPoints || 0) > 0) {
    const points = Number(typeof availableSkillPoints !== 'undefined' ? availableSkillPoints : player.skillPoints || 0);
    return { title: '分配悟道点', reason: `还有 ${points} 点悟道可用于强化技能路线`, hud: `有 ${points} 点悟道点，点「技能」强化路线`, cta: '去技能页', kind: 'skills' };
  }
  const slotKeys = Array.isArray(options.slotKeys) ? options.slotKeys : (typeof equipmentSlotKeys === 'function' ? equipmentSlotKeys() : Object.keys(typeof SLOT_NAMES !== 'undefined' ? SLOT_NAMES || {} : {}));
  const emptySlots = slotKeys.filter(slot => !player.equipment?.[slot]);
  if (emptySlots.length && Object.keys(cleared).length) {
    const slotName = (typeof SLOT_NAMES !== 'undefined' && SLOT_NAMES?.[emptySlots[0]]?.name) || '空槽';
    return { title: `补齐${slotName}装备`, reason: `还有 ${emptySlots.length} 个空槽，优先补齐能直接提升战力`, hud: `角色有 ${emptySlots.length} 个空装备槽，点「角色」补装`, cta: '去装备页', kind: 'equipment', slot: emptySlots[0] };
  }
  const enhanceLevel = item => (typeof equipmentEnhanceLevelDom === 'function' ? equipmentEnhanceLevelDom(item) : Number(item?.enhanceLevel || item?.level || 0));
  const maxEnhance = typeof getCurrentEquipmentEnhanceCap === 'function' ? getCurrentEquipmentEnhanceCap() : (typeof MAX_EQUIPMENT_ENHANCE_LEVEL !== 'undefined' ? MAX_EQUIPMENT_ENHANCE_LEVEL : 15);
  const equippedSlots = slotKeys.filter(slot => player.equipment?.[slot]);
  const unupgraded = equippedSlots.filter(slot => enhanceLevel(player.equipment?.[slot]) <= 0);
  if (unupgraded.length) {
    const slotName = (typeof SLOT_NAMES !== 'undefined' && SLOT_NAMES?.[unupgraded[0]]?.name) || '装备';
    return { title: `强化${slotName}`, reason: `有 ${unupgraded.length} 件装备未强化，分解材料后优先强化核心装备`, hud: `有 ${unupgraded.length} 件装备未强化，点「角色」处理`, cta: '去装备页', kind: 'equipment', slot: unupgraded[0] };
  }
  const setCounts = typeof equipmentSetCounts === 'function' ? equipmentSetCounts(player.equipment || {}) : {};
  const topSet = Object.entries(setCounts).sort(([, a], [, b]) => Number(b || 0) - Number(a || 0))[0] || null;
  const topSetObj = topSet && typeof getEquipmentSet === 'function' ? getEquipmentSet(topSet[0]) : null;
  const topSetCount = topSet ? Number(topSet[1] || 0) : 0;
  const topSetNext = topSetObj ? (topSetObj.bonuses || []).slice().sort((a, b) => Number(a.count || 0) - Number(b.count || 0)).find(b => topSetCount < Number(b.count || 0)) : null;
  if (topSetNext) return { title: '凑下一档套装', reason: `${topSetObj?.name || '套装'}还差 ${Math.max(0, Number(topSetNext.count || 0) - topSetCount)} 件解锁 ${topSetNext.count}件效果`, hud: `${topSetObj?.name || '套装'}还差 ${Math.max(0, Number(topSetNext.count || 0) - topSetCount)} 件到下一档`, cta: '看套装', kind: 'sets' };
  if (Number(player.statPoints || 0) > 0) return { title: '分配炼体点', reason: `还有 ${Number(player.statPoints || 0)} 点炼体可增强基础属性`, hud: `有 ${Number(player.statPoints || 0)} 点炼体点，点「角色」分配属性`, cta: '看属性', kind: 'attributes' };
  const enhanceable = equippedSlots.filter(slot => enhanceLevel(player.equipment?.[slot]) < maxEnhance);
  if (enhanceable.length) return { title: '继续强化装备', reason: `${enhanceable.length} 件装备仍可强化，优先提升武器/护甲`, hud: `${enhanceable.length} 件装备仍可强化，点「角色」查看`, cta: '去装备页', kind: 'equipment', slot: enhanceable[0] };
  if (asc.ascended) {
    if (!cleared.reception_platform) return { title: '接引仙域', reason: '飞升后先战接引仙域，拿仙髓淬炼仙躯', hud: '飞升后先战接引仙域，拿仙髓淬炼仙躯', cta: '关闭面板', kind: 'close' };
    if (!cleared.immortal_spirit_trial) return { title: '淬炼仙躯', reason: '继续接引仙域，补仙髓/仙玉解锁仙躯与仙职', hud: '继续接引仙域，补仙髓/仙玉解锁仙躯与仙职', cta: '关闭面板', kind: 'close' };
    if (!cleared.demon_lord_projection) return { title: '推进仙魔战场', reason: '推进仙界副本到仙魔战场，刷法则碎片与战旗', hud: '推进仙界副本到仙魔战场，刷法则碎片与战旗', cta: '关闭面板', kind: 'close' };
    return { title: '仙界循环成长', reason: '仙魔战场刷战旗，法则/仙躯/仙职继续成长', hud: '仙界循环：仙魔战场刷战旗，法则/仙躯/仙职继续成长', cta: '关闭面板', kind: 'close' };
  }
  if (!Object.keys(cleared).length) return { title: '选择副本', reason: '新存档先进入青云山开始刷怪', hud: '点击「副本」选择青云山', cta: '去副本', kind: 'stages' };
  if (typeof STAGES !== 'undefined') {
    const next = Object.values(STAGES).find(stage => stage && !cleared[stage.id]);
    if (next) return { title: `挑战${next.name}`, reason: '角色养成暂无明显短板，继续推进章节获取装备与材料', hud: `下一步：挑战 ${next.name}`, cta: '关闭面板', kind: 'close' };
  }
  return { title: '继续成长', reason: '已通关当前副本线，查看图鉴/飞升继续成长', hud: '已通关当前副本线，查看图鉴/飞升继续成长', cta: '关闭面板', kind: 'close' };
}

function getHudNextStepHint(player) {
  return getSharedNextActionRecommendation(player).hud;
}

function updateHUD(player, dungeonLevel) {
  setTextIfChanged(document.getElementById('hud-realm'), `境界: ${player.realm.name}`);
  const nextStepEl = document.getElementById('hud-next-step');
  setTextIfChanged(nextStepEl, getHudNextStepHint(player));
  const skillClaimCount = typeof getSkillCodexSummary === 'function' ? (getSkillCodexSummary().claimableCount || 0) : 0;
  if (typeof document.querySelectorAll === 'function') document.querySelectorAll('#btn-skills').forEach(el => {
    if (!el) return;
    const hasClaim = skillClaimCount > 0;
    if (el.classList.contains('has-claim') !== hasClaim) el.classList.toggle('has-claim', hasClaim);
    const nextCount = hasClaim ? String(skillClaimCount) : '';
    if (el.dataset.claimCount !== nextCount) el.dataset.claimCount = nextCount;
  });
  const activeStage = player?.stageProgress?.currentRun?.stageId && typeof STAGES !== 'undefined' ? STAGES[player.stageProgress.currentRun.stageId] : null;
  const roomIndex = Number(player?.stageProgress?.currentRun?.roomIndex || 0);
  setTextIfChanged(document.getElementById('hud-floor'), activeStage ? `${activeStage.name} ${roomIndex + 1}/${activeStage.roomCount}` : '副本入口');
  const biomeEl = document.getElementById('hud-biome');
  if (biomeEl) {
    const biome = window.dungeon?.biome || (typeof dungeon !== 'undefined' ? dungeon?.biome : null);
    setTextIfChanged(biomeEl, biome ? `${biome.icon} ${biome.name}` : '');
  }
  setTextIfChanged(document.getElementById('hud-spirit-stones'), `💎 灵石: ${player.spiritStones}`);

  const artifactHud = document.getElementById('hud-artifact');
  if (artifactHud) {
    const activeArtifact = typeof getActiveArtifact === 'function' ? getActiveArtifact(player) : null;
    const iconEl = artifactHud.querySelector('.artifact-icon');
    const nameEl = artifactHud.querySelector('.artifact-name');
    const badgeEl = artifactHud.querySelector('.artifact-level-badge') || artifactHud.querySelector('.rarity-corner');
    if (activeArtifact) {
      const level = Number(activeArtifact.progress?.level || 1);
      artifactHud.classList.remove('empty');
      artifactHud.style.setProperty('--artifact-color', activeArtifact.color || '#ffdd66');
      setTextIfChanged(iconEl, activeArtifact.icon || '🗡️');
      setTextIfChanged(nameEl, activeArtifact.name || '已激活神器');
      setTextIfChanged(badgeEl, String(level));
    } else {
      artifactHud.classList.add('empty');
      artifactHud.style.setProperty('--artifact-color', '#6d5a78');
      setTextIfChanged(iconEl, '🗡️');
      setTextIfChanged(nameEl, '未激活神器');
      setTextIfChanged(badgeEl, '-');
    }
  }

  // Stat bars
  const hpPct = player.maxHp > 0 ? (player.hp / player.maxHp * 100) : 0;
  const mpPct = player.maxMp > 0 ? (player.mp / player.maxMp * 100) : 0;
  const xpNeeded = player.realm.xpNeeded || 100;
  const xpPct = xpNeeded > 0 ? (player.xp / xpNeeded * 100) : 0;

  setWidthIfChanged(document.getElementById('hp-fill'), hpPct + '%');
  setWidthIfChanged(document.getElementById('mp-fill'), mpPct + '%');
  setWidthIfChanged(document.getElementById('xp-fill'), xpPct + '%');
  setTextIfChanged(document.getElementById('hp-text'), `${player.hp}/${player.maxHp}`);
  setTextIfChanged(document.getElementById('mp-text'), `${player.mp}/${player.maxMp}`);
  setTextIfChanged(document.getElementById('xp-text'), `${player.xp}/${xpNeeded}`);
}

function showMessage(text, color = '#d4c8b0', options = {}) {
  const now = Date.now();
  const key = String(text || '').slice(0, 80);
  const ttl = Number(options.ttl || 48);
  const maxMessages = options.quiet ? 1 : 3;
  // ── Dedupe: if the same text was shown < 1200ms ago, refresh TTL instead of stacking ──
  if (messageDedupeMap[key] && now - messageDedupeMap[key] < 1200) {
    const existing = messageQueue.find(m => m.text === text);
    if (existing) {
      existing.ttl = ttl;
      existing.color = color;
      return;
    }
  }
  messageDedupeMap[key] = now;
  messageQueue.push({ text, color, ttl, born: (typeof gameTicks !== 'undefined' ? gameTicks : 0), quiet: !!options.quiet });
  // Main view should stay map-first: keep toast stack short, and quiet hints replace older noise.
  if (options.quiet) messageQueue = messageQueue.filter((m, i) => m.quiet || i === messageQueue.length - 1).slice(-1);
  while (messageQueue.length > maxMessages) messageQueue.shift();
}

function renderMessageLog() {
  const container = document.getElementById('message-log');
  if (!container) return;
  const escape = typeof escapeHtml === 'function'
    ? escapeHtml
    : value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const safeColor = color => /^#[0-9a-f]{3,8}$/i.test(String(color || '')) ? color : '#d4c8b0';
  const cacheKey = messageQueue.map(m => `${m.text}|${m.color}|${m.ttl <= 8 ? 1 : 0}`).join('~');
  if (cacheKey === messageLogCacheKey) return;
  messageLogCacheKey = cacheKey;
  container.innerHTML = messageQueue.map(m => {
    // Fade-out in last 8 ticks (≈0.27s at 30fps)
    const isFading = m.ttl <= 8;
    const cls = isFading ? 'msg fade' : 'msg';
    return `<div class="${cls}" style="color:${safeColor(m.color)}">${escape(m.text)}</div>`;
  }).join('');
}

function tickMessages() {
  // ── Pause TTL countdown when a panel is open (messages hidden) ──
  const panelOpen = typeof isAnyPanelOpen === 'function' ? isAnyPanelOpen() : false;
  const combatActive = typeof isInCombat === 'function' ? isInCombat() : false;
  // Still tick during combat so combat messages don't pile up; pause only when a panel covers the view
  const shouldTick = !panelOpen;
  const ticks = typeof gameTicks !== 'undefined' ? gameTicks : 0;
  messageQueue = messageQueue.filter(m => {
    if (shouldTick) m.ttl--;
    return m.ttl > 0;
  });
  // Clean up dedupe map entries older than 2 seconds
  const cutoff = Date.now() - 2000;
  for (const k in messageDedupeMap) {
    if (messageDedupeMap[k] < cutoff) delete messageDedupeMap[k];
  }
}
