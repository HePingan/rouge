// HUD and UI Rendering
let messageQueue = [];

function updateHUD(player, dungeonLevel) {
  document.getElementById('hud-realm').textContent = `境界: ${player.realm.name}`;
  document.getElementById('hud-floor').textContent = `深渊第 ${dungeonLevel} 层`;
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

function showMessage(text, color = '#d4c8b0') {
  messageQueue.push({ text, color, ttl: 60 });
  // Keep only last 5 messages
  if (messageQueue.length > 5) messageQueue.shift();
}

function renderMessageLog() {
  const container = document.getElementById('message-log');
  if (!container) return;
  const escape = typeof escapeHtml === 'function'
    ? escapeHtml
    : value => String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch]));
  const safeColor = color => /^#[0-9a-f]{3,8}$/i.test(String(color || '')) ? color : '#d4c8b0';
  container.innerHTML = messageQueue.map(m =>
    `<div class="msg" style="color:${safeColor(m.color)}">${escape(m.text)}</div>`
  ).join('');
}

function tickMessages() {
  messageQueue = messageQueue.filter(m => { m.ttl--; return m.ttl > 0; });
}
