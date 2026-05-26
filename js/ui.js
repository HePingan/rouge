// HUD and UI Rendering
let messageQueue = [];
let messageDedupeMap = {};  // text -> lastTimestamp, for duplicate suppression

function getHudNextStepHint(player) {
  if (!player) return '点击「副本」选择青云山';
  if (Number(player.xp || 0) >= Number(player.xpToNext || Infinity)) return '经验已满，点击「更多」→「突破」提升境界';
  const progress = player.stageProgress || {};
  const cleared = progress.clearedStages || {};
  if (!Object.keys(cleared).length) return '点击「副本」选择青云山';
  if (progress.currentRun?.stageId && typeof STAGES !== 'undefined' && STAGES[progress.currentRun.stageId]) {
    const stage = STAGES[progress.currentRun.stageId];
    const room = Number(progress.currentRun.roomIndex || 0) + 1;
    return `推进 ${stage.name} ${room}/${stage.roomCount}`;
  }
  if (typeof STAGES !== 'undefined') {
    const next = Object.values(STAGES).find(stage => stage && !cleared[stage.id]);
    if (next) return `下一步：挑战 ${next.name}`;
  }
  return '已通关当前副本线，查看图鉴/飞升继续成长';
}

function updateHUD(player, dungeonLevel) {
  document.getElementById('hud-realm').textContent = `境界: ${player.realm.name}`;
  const nextStepEl = document.getElementById('hud-next-step');
  if (nextStepEl) nextStepEl.textContent = getHudNextStepHint(player);
  const activeStage = player?.stageProgress?.currentRun?.stageId && typeof STAGES !== 'undefined' ? STAGES[player.stageProgress.currentRun.stageId] : null;
  const roomIndex = Number(player?.stageProgress?.currentRun?.roomIndex || 0);
  document.getElementById('hud-floor').textContent = activeStage ? `${activeStage.name} ${roomIndex + 1}/${activeStage.roomCount}` : '副本入口';
  const biomeEl = document.getElementById('hud-biome');
  if (biomeEl) {
    const biome = window.dungeon?.biome || (typeof dungeon !== 'undefined' ? dungeon?.biome : null);
    biomeEl.textContent = biome ? `${biome.icon} ${biome.name}` : '';
  }
  document.getElementById('hud-spirit-stones').textContent = `💎 灵石: ${player.spiritStones}`;

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
      if (iconEl) iconEl.textContent = activeArtifact.icon || '🗡️';
      if (nameEl) nameEl.textContent = activeArtifact.name || '已激活神器';
      if (badgeEl) badgeEl.textContent = String(level);
    } else {
      artifactHud.classList.add('empty');
      artifactHud.style.setProperty('--artifact-color', '#6d5a78');
      if (iconEl) iconEl.textContent = '🗡️';
      if (nameEl) nameEl.textContent = '未激活神器';
      if (badgeEl) badgeEl.textContent = '-';
    }
  }

  // Stat bars
  const hpPct = player.maxHp > 0 ? (player.hp / player.maxHp * 100) : 0;
  const mpPct = player.maxMp > 0 ? (player.mp / player.maxMp * 100) : 0;
  const xpNeeded = player.realm.xpNeeded || 100;
  const xpPct = xpNeeded > 0 ? (player.xp / xpNeeded * 100) : 0;

  document.getElementById('hp-fill').style.width = hpPct + '%';
  document.getElementById('mp-fill').style.width = mpPct + '%';
  document.getElementById('xp-fill').style.width = xpPct + '%';
  document.getElementById('hp-text').textContent = `${player.hp}/${player.maxHp}`;
  document.getElementById('mp-text').textContent = `${player.mp}/${player.maxMp}`;
  document.getElementById('xp-text').textContent = `${player.xp}/${xpNeeded}`;
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
  const ticks = typeof gameTicks !== 'undefined' ? gameTicks : 0;
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
