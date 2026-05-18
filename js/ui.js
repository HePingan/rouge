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

  const weaponHud = document.getElementById('hud-weapon');
  if (weaponHud) {
    const weapon = player.equipment?.weapon;
    const wrapEl = weaponHud.querySelector('.weapon-icon-wrap');
    const iconEl = weaponHud.querySelector('.weapon-icon');
    const nameEl = weaponHud.querySelector('.weapon-name');
    const badgeEl = weaponHud.querySelector('.rarity-corner');
    if (weapon) {
      weaponHud.classList.remove('empty');
      weaponHud.style.setProperty('--rarity-color', weapon.rarityColor || '#d4a0ff');
      if (iconEl) iconEl.textContent = weapon.icon || '⚔️';
      if (nameEl) nameEl.textContent = weapon.name || '已装备';
      if (badgeEl) badgeEl.textContent = ({ '普通': '普', '魔法': '魔', '稀有': '稀', '传说': '传', '神话': '神' }[weapon.rarity] || weapon.rarity?.[0] || '?');
    } else {
      weaponHud.classList.add('empty');
      weaponHud.style.setProperty('--rarity-color', '#6d5a78');
      if (iconEl) iconEl.textContent = '⚔️';
      if (nameEl) nameEl.textContent = '未装备';
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
  container.innerHTML = messageQueue.map(m =>
    `<div class="msg" style="color:${m.color}">${m.text}</div>`
  ).join('');
}

function tickMessages() {
  messageQueue = messageQueue.filter(m => { m.ttl--; return m.ttl > 0; });
}
