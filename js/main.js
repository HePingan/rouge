// Game Main Loop — Entry Point, Input, Rendering, Camera
     let CELL_SIZE = (window.innerWidth < 600) ? Math.max(20, Math.floor(Math.min(window.innerWidth, window.innerHeight) / 22)) : 18;
     let canvasW = 1280;
     let canvasH = 720;
     let canvas, ctx;
     let dungeon, player, camera;
     let dungeonLevel = 1;
     let keys = {};
     let gameTicks = 0;
     // Character panel state. Must be declared before gameLoop/openPanel reads it;
     // otherwise ReferenceError stops rendering and makes the map/buttons look dead.
     let showCharacterPanel = false;
     let characterPanelTouchState = null;
     let characterPanelLastHtml = '';
    let inventoryBulkRarity = '普通';
    let selectedSkillTreeNode = null;
    let skillDetailModalOpen = false;
    let skillsLastTouchActionAt = 0;
    let inventoryLastTouchActionAt = 0;
     function markInventoryTouchActionDom() {
       inventoryLastTouchActionAt = Date.now();
     }
     function shouldIgnoreInventorySyntheticClickDom() {
       return Date.now() - inventoryLastTouchActionAt < 700;
     }
    function init() {
      canvas = document.getElementById('game-canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      ctx = canvas.getContext('2d');
      player = new Player();
      const loaded = loadGame();
      if (!loaded) generateNewFloor();
      else generateNewFloor();  // generates floor at saved dungeonLevel
      // If save was loaded, show welcome message
      if (loaded) showMessage('📂 读取存档成功，继续你的仙途之旅！', '#d4a0ff');
      // Keyboard listeners
      window.addEventListener('keydown', e => {
        initAudio();  // Initialize audio on first keypress
        keys[e.key] = true;
        e.preventDefault();
      });
      window.addEventListener('keyup', e => {
        keys[e.key] = false;
      });
      // Combat key bindings (legacy, kept minimal for Esc)
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeAllPanels();
          e.preventDefault();
        }
        if (e.key === 'p' || e.key === 'P') {
          openPanel('character');
          e.preventDefault();
        }
      });
     // Resize handling
     resizeCanvas();
     window.addEventListener('resize', resizeCanvas);
     window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 150));
     // Menu buttons — always active (touch + mouse)
     setupMenuButtons();
     ensureInventoryDomPanel();
    initParticlePool();     // DOM particle system
    // Touch controls — always visible for mobile-first design
    document.getElementById('touch-controls').classList.add('show');
    setupTouchControls();
    setupCanvasClicks();
     setInterval(gameLoop, 1000 / 30);  // 30 FPS
   }
   function resizeCanvas() {
     canvasW = window.innerWidth;
     canvasH = window.innerHeight;
     canvas.width = canvasW;
     canvas.height = canvasH;
   }
  function isAnyPanelOpen() {
    return showInventory || showCharacterPanel || showSkillTreeUI || showAlchemyUI || showBreakthroughUI;
  }
  function syncBodyPanelState() {
    if (!document.body) return;
    document.body.classList.toggle('panel-open', isAnyPanelOpen());
    document.body.classList.toggle('inventory-open', !!showInventory);
    document.body.classList.toggle('character-open', !!showCharacterPanel);
    document.body.classList.toggle('skills-open', !!showSkillTreeUI);
    document.body.classList.toggle('alchemy-open', !!showAlchemyUI);
    document.body.classList.toggle('breakthrough-open', !!showBreakthroughUI);
    if (showInventory && typeof renderInventoryDomPanel === 'function') renderInventoryDomPanel();
    if (showCharacterPanel && typeof renderCharacterDomPanel === 'function') renderCharacterDomPanel();
    if (showSkillTreeUI && typeof renderSkillsDomPanel === 'function') renderSkillsDomPanel();
    if (showAlchemyUI && typeof renderAlchemyDomPanel === 'function') renderAlchemyDomPanel();
    if (showBreakthroughUI && typeof renderBreakthroughDomPanel === 'function') renderBreakthroughDomPanel();
  }
  function clearTouchMovementState() {
    if (typeof joystick === 'undefined') return;
    joystick.active = false;
    joystick.dx = 0;
    joystick.dy = 0;
    joystick.distance = 0;
    const thumb = document.getElementById('joystick-thumb');
    if (thumb) thumb.style.transform = 'translate(-50%, -50%)';
  }
  function closeBreakthroughPanel() {
    showBreakthroughUI = false;
    clearTouchMovementState();
    syncBodyPanelState();
  }
  function openBreakthroughPanel() {
    if (isInCombat()) return;
    showBreakthroughUI = true;
    clearTouchMovementState();
    syncBodyPanelState();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }
  const ITEM_RARITIES_DOM = ['普通', '魔法', '稀有', '传说', '神话'];
  function rarityShortDom(rarity) {
    return ({ '普通': '普', '魔法': '魔', '稀有': '稀', '传说': '传', '神话': '神' }[rarity] || String(rarity || '?').slice(0, 1));
  }
  function confirmDom(message) {
    return window.confirm(message);
  }
  const STAT_NAMES = {
    atk: '攻击', def: '防御', hp: '生命', mp: '灵力',
    maxHp: '生命上限', maxMp: '灵力上限',
    dodge: '闪避', crit: '暴击', speed: '速度',
    fireDmg: '火伤', iceDmg: '冰伤', poisonDmg: '毒伤', lightningDmg: '雷伤',
    lifesteal: '吸血', armorPen: '破甲',
    goldFind: '灵石', xpBonus: '经验',
    hpRegen: '生命恢复', mpRegen: '灵力恢复', allRes: '全抗',
  };
  function statLabelDom(key) {
    return STAT_NAMES[key] || (typeof getCharacterStatMeta === 'function' ? getCharacterStatMeta(key)[0] : key) || key;
  }
  function formatStatValueDom(key, value) {
    const n = Number(value || 0);
    const suffix = /crit|dodge|rate|Find|Bonus|lifesteal/i.test(key) ? '%' : '';
    return `${n > 0 ? '+' : ''}${Number.isInteger(n) ? n : n.toFixed(1)}${suffix}`;
  }
  function itemStatsTextDom(item) {
    return Object.entries(item?.stats || {}).filter(([, v]) => Number(v || 0) !== 0).map(([k, v]) => `${statLabelDom(k)}${formatStatValueDom(k, v)}`).join(' ');
  }
  function itemStatsHtmlDom(item) {
    const order = ['atk', 'def', 'maxHp', 'hp', 'maxMp', 'mp', 'crit', 'dodge', 'armorPen', 'lifesteal', 'speed', 'fireDmg', 'iceDmg', 'poisonDmg', 'lightningDmg'];
    const entries = Object.entries(item?.stats || {}).filter(([, v]) => Number(v || 0) !== 0)
      .sort(([a], [b]) => (order.indexOf(a) < 0 ? 999 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 999 : order.indexOf(b)) || a.localeCompare(b));
    if (!entries.length) return '<span class="stat-chip empty">无词条</span>';
    return entries.map(([k, v]) => `<span class="stat-chip"><em>${escapeHtml(statLabelDom(k))}</em><b>${escapeHtml(formatStatValueDom(k, v))}</b></span>`).join('');
  }
  function rarityValueDom(rarity) {
    return ({ '普通': 1, '魔法': 2, '稀有': 4, '传说': 8, '神话': 14 }[rarity] || 1);
  }
  function itemPowerDom(item) {
    return Object.values(item?.stats || {}).reduce((sum, v) => sum + Math.max(0, Number(v) || 0), 0);
  }
  function itemSellValueDom(item) {
    const floor = Math.max(1, Number(item?.floorLevel) || dungeonLevel || 1);
    return Math.max(2, Math.floor((6 + floor * 3 + itemPowerDom(item)) * rarityValueDom(item?.rarity) * 0.55));
  }
  function itemBreakdownDom(item) {
    const r = rarityValueDom(item?.rarity);
    const floor = Math.max(1, Number(item?.floorLevel) || dungeonLevel || 1);
    const stone = Math.max(1, Math.floor(r + floor / 5));
    const result = { stoneMarrow: stone };
    if (r >= 2) result.herb = Math.max(1, Math.floor(r / 2));
    if (r >= 4) result.ginseng = Math.max(1, Math.floor(r / 4));
    if (r >= 8) result.soulJade = Math.max(1, Math.floor(r / 6));
    if (r >= 14) result.starDust = 1;
    return result;
  }
  function materialTextDom(materials) {
    return Object.entries(materials).map(([id, count]) => {
      const mat = MATERIALS?.find(m => m.id === id);
      return `${mat?.name || id}x${count}`;
    }).join('、');
  }
  function removeInventoryItemDom(index) {
    if (!player || index < 0 || index >= player.inventory.length) return null;
    return player.inventory.splice(index, 1)[0] || null;
  }
  function sellInventoryItemDom(index, skipConfirm = false) {
    const item = player?.inventory?.[index];
    if (!item) return false;
    const value = itemSellValueDom(item);
    if (!skipConfirm && !confirmDom(`确认售卖 ${item.name}？\n品质：${item.rarity || '未知'}\n可获得：${value} 灵石`)) return false;
    removeInventoryItemDom(index);
    player.addSpiritStones(value);
    autoSave();
    if (typeof updateUI === 'function') updateUI();
    showMessage(`售卖 ${item.name}，获得 ${value} 灵石`, '#ffcc44');
    renderInventoryDomPanel();
    return true;
  }
  function decomposeInventoryItemDom(index, skipConfirm = false) {
    const item = player?.inventory?.[index];
    if (!item) return false;
    const gains = itemBreakdownDom(item);
    if (!skipConfirm && !confirmDom(`确认分解 ${item.name}？\n品质：${item.rarity || '未知'}\n可获得：${materialTextDom(gains)}`)) return false;
    removeInventoryItemDom(index);
    for (const [id, count] of Object.entries(gains)) {
      playerMaterials[id] = (playerMaterials[id] || 0) + count;
    }
    autoSave();
    if (typeof updateUI === 'function') updateUI();
    showMessage(`分解 ${item.name}，获得 ${materialTextDom(gains)}`, '#aaddff');
    renderInventoryDomPanel();
    return true;
  }
  function inventoryItemsByRarityDom(rarity) {
    if (!player?.inventory) return [];
    return player.inventory.map((item, index) => ({ item, index })).filter(entry => entry.item?.rarity === rarity);
  }
  function bulkSellInventoryByRarityDom(rarity) {
    const entries = inventoryItemsByRarityDom(rarity);
    if (!entries.length) { showMessage(`没有${rarity}品质装备可售卖`, '#aaa'); return false; }
    const total = entries.reduce((sum, entry) => sum + itemSellValueDom(entry.item), 0);
    if (!confirmDom(`确认一键售卖 ${entries.length} 件${rarity}装备？\n预计获得：${total} 灵石`)) return false;
    const indices = new Set(entries.map(entry => entry.index));
    player.inventory = player.inventory.filter((_, index) => !indices.has(index));
    player.addSpiritStones(total);
    inventoryDetailTarget = null;
    autoSave();
    if (typeof updateUI === 'function') updateUI();
    showMessage(`已售卖 ${entries.length} 件${rarity}装备，获得 ${total} 灵石`, '#ffcc44');
    renderInventoryDomPanel();
    return true;
  }
  function bulkDecomposeInventoryByRarityDom(rarity) {
    const entries = inventoryItemsByRarityDom(rarity);
    if (!entries.length) { showMessage(`没有${rarity}品质装备可分解`, '#aaa'); return false; }
    const totalGains = {};
    for (const { item } of entries) {
      const gains = itemBreakdownDom(item);
      for (const [id, count] of Object.entries(gains)) totalGains[id] = (totalGains[id] || 0) + count;
    }
    if (!confirmDom(`确认一键分解 ${entries.length} 件${rarity}装备？\n预计获得：${materialTextDom(totalGains)}`)) return false;
    const indices = new Set(entries.map(entry => entry.index));
    player.inventory = player.inventory.filter((_, index) => !indices.has(index));
    for (const [id, count] of Object.entries(totalGains)) playerMaterials[id] = (playerMaterials[id] || 0) + count;
    inventoryDetailTarget = null;
    autoSave();
    if (typeof updateUI === 'function') updateUI();
    showMessage(`已分解 ${entries.length} 件${rarity}装备，获得 ${materialTextDom(totalGains)}`, '#aaddff');
    renderInventoryDomPanel();
    return true;
  }
  function itemPrimaryStatsHtmlDom(item, limit = 2) {
    if (!item?.stats) return '<span class="stat-chip empty">无词条</span>';
    const priority = ['atk', 'def', 'maxHp', 'hp', 'maxMp', 'mp', 'crit', 'dodge', 'armorPen', 'lifesteal', 'speed', 'fireDmg', 'iceDmg', 'poisonDmg', 'lightningDmg'];
    const entries = Object.entries(item.stats).filter(([, value]) => Number(value || 0) !== 0);
    entries.sort((a, b) => (priority.indexOf(a[0]) === -1 ? 99 : priority.indexOf(a[0])) - (priority.indexOf(b[0]) === -1 ? 99 : priority.indexOf(b[0])) || a[0].localeCompare(b[0]));
    if (!entries.length) return '<span class="stat-chip empty">无词条</span>';
    return entries.slice(0, limit).map(([stat, value]) => `<span class="stat-chip primary"><em>${escapeHtml(statLabelDom(stat))}</em><b>${escapeHtml(formatStatValueDom(stat, value))}</b></span>`).join('');
  }
  function itemStatsInlineDom(item, limit = 3) {
    const chips = itemPrimaryStatsHtmlDom(item, limit);
    const total = Object.keys(item?.stats || {}).filter(k => Number(item.stats[k] || 0) !== 0).length;
    const more = total > limit ? `<span class="stat-chip more">+${total - limit}</span>` : '';
    return chips + more;
  }
  function drawInventorySlotCardDom(slot, item, active = false) {
    const slotInfo = SLOT_NAMES?.[slot] || { name: slot || '装备' };
    const color = item?.rarityColor || '#7d708d';
    const icon = itemIconDom(item, slot);
    const stats = item ? itemStatsInlineDom(item, 3) : '<span class="stat-chip empty">空槽位</span>';
    return `<div class="equip-slot-card ${item ? '' : 'empty'}${active ? ' active' : ''}" data-slot="${escapeHtml(slot)}" style="--rarity-color:${escapeHtml(color)}">
      <div class="slot-icon"><span>${escapeHtml(icon)}</span>${item ? `<i>${escapeHtml(rarityShortDom(item.rarity))}</i>` : '<i>空</i>'}</div>
      <div class="slot-info"><b>${escapeHtml(slotInfo.name)}</b><span>${item ? escapeHtml(item.name) : '未装备'}</span></div>
      <div class="slot-stats">${stats}</div>
      <div class="slot-actions">${item ? `<button class="item-action detail" type="button" data-detail-slot="${escapeHtml(slot)}">详情</button><button class="item-action unequip" type="button" data-unequip-slot="${escapeHtml(slot)}">卸下</button>` : '<span class="empty-tip">点背包装备</span>'}</div>
    </div>`;
  }
  function drawBagItemCardDom(item, index, active = false) {
    const color = item?.rarityColor || '#d4a0ff';
    const typeName = SLOT_NAMES?.[item.slot]?.name || '装备';
    return `<div class="bag-item-card${active ? ' active' : ''}" data-index="${index}" style="--rarity-color:${escapeHtml(color)}">
      <div class="bag-icon"><span>${escapeHtml(itemIconDom(item))}</span><i>${escapeHtml(rarityShortDom(item.rarity))}</i></div>
      <div class="bag-main">
        <div class="bag-name-row"><span class="slot-pill">${escapeHtml(typeName)}</span><b>${escapeHtml(item.name)}</b></div>
        <div class="bag-meta">${escapeHtml(item.rarity || '未知')} · ${escapeHtml(item.floorLevel ? item.floorLevel + '层' : '当前层')} · 战力 ${itemPowerDom(item)} · 卖 ${itemSellValueDom(item)}</div>
        <div class="bag-stats">${itemStatsInlineDom(item, 3)}</div>
      </div>
      <div class="bag-actions">
        <button class="item-action equip" type="button" data-equip-action-index="${index}">装备</button>
        <button class="item-action detail" type="button" data-detail-index="${index}">详情</button>
        <button class="item-action sell" type="button" data-sell-index="${index}">卖出</button>
        <button class="item-action decompose" type="button" data-decompose-index="${index}">分解</button>
      </div>
    </div>`;
  }
  function itemCardMetaDom(item, label = '') {
    const parts = [];
    if (label) parts.push(label);
    if (item?.subType && item.subType !== label) parts.push(item.subType);
    if (item?.floorLevel) parts.push(`${item.floorLevel}层`);
    parts.push(`战力${itemPowerDom(item)}`);
    return parts.filter(Boolean).join(' · ');
  }
  function itemIconDom(item, slot) {
    return item?.icon || { weapon: '⚔️', armor: '🛡️', accessory: '💍' }[slot || item?.slot] || '■';
  }
  let inventoryDetailTarget = null;
  function inventoryDetailItemDom() {
    if (!inventoryDetailTarget || !player) return null;
    if (inventoryDetailTarget.type === 'equipped') {
      const slot = inventoryDetailTarget.slot;
      const item = player.equipment?.[slot];
      return item ? { item, label: SLOT_NAMES?.[slot]?.name || slot || '装备', slot } : null;
    }
    if (inventoryDetailTarget.type === 'bag') {
      const index = Number(inventoryDetailTarget.index);
      const item = player.inventory?.[index];
      return item ? { item, label: SLOT_NAMES?.[item.slot]?.name || item.slot || '装备', index } : null;
    }
    return null;
  }
  function itemDetailHtmlDom(detail) {
    if (!detail?.item) return '<div class="item-detail empty">选择一件装备查看详细信息</div>';
    const item = detail.item;
    const color = item.rarityColor || '#d4a0ff';
    const floor = item.floorLevel ? `掉落层数：${item.floorLevel}` : `当前层数：${dungeonLevel || 1}`;
    const typeText = detail.label || SLOT_NAMES?.[item.slot]?.name || item.slot || '装备';
    return `<div class="item-detail" style="--rarity-color:${escapeHtml(color)}">
      <button class="detail-close" type="button" data-detail-close="1">×</button>
      <div class="detail-top">
        <div class="item-icon-box detail-icon"><span>${escapeHtml(itemIconDom(item))}</span><span class="rarity-corner">${escapeHtml(rarityShortDom(item.rarity))}</span></div>
        <div class="detail-main">
          <div class="detail-name">${escapeHtml(item.name)}</div>
          <div class="detail-meta">${escapeHtml(typeText)} · ${escapeHtml(item.rarity || '未知')} · 战力 ${itemPowerDom(item)}</div>
        </div>
      </div>
      <div class="detail-stats">${itemStatsHtmlDom(item)}</div>
      <div class="detail-extra"><span>${escapeHtml(floor)}</span><span>售卖估值：${itemSellValueDom(item)} 灵石</span><span>分解：${escapeHtml(materialTextDom(itemBreakdownDom(item)))}</span></div>
    </div>`;
  }
  function ensureInventoryDomPanel() {
    let panel = document.getElementById('inventory-dom-panel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'inventory-dom-panel';
    panel.innerHTML = `
      <div class="inv-head">
        <button class="inv-close" type="button" aria-label="关闭背包">×</button>
        <div class="inv-title">🎒 装备栏</div>
        <div class="inv-sub">上方装备槽一眼看品质；下方背包点装备/详情</div>
      </div>
      <div class="inv-body">
        <section class="inv-section equip-section"><div class="section-title">已装备</div><div class="equip-list"></div></section>
        <section class="inv-section bag-section"><div class="section-title bag-title">背包 0/24</div><div class="bulk-tools"><select class="bulk-rarity" aria-label="选择品质"></select><button class="bulk-action sell" type="button" data-bulk-sell="1">一键售卖</button><button class="bulk-action decompose" type="button" data-bulk-decompose="1">一键分解</button></div><div class="bulk-summary"></div><div class="bag-list"></div></section>
      </div>
      <div class="inv-detail-wrap"></div>
      <div class="inv-hint">售卖/分解会二次确认；可按品质批量处理背包装备</div>`;
    const container = document.getElementById('game-container') || document.body;
    container.appendChild(panel);
    const close = () => closeAllPanels();
    panel.querySelector('.inv-close').addEventListener('click', e => { if (shouldIgnoreInventorySyntheticClickDom()) return; close(); });
    panel.querySelector('.inv-close').addEventListener('touchstart', e => { markInventoryTouchActionDom(); e.preventDefault(); e.stopPropagation(); close(); }, { passive: false });
    return panel;
  }
  function renderInventoryDomPanel() {
    const panel = ensureInventoryDomPanel();
    if (!showInventory || !player) return;
    const slotLabels = {
      weapon: { icon: '⚔️', name: '武器' },
      armor: { icon: '🛡️', name: '防具' },
      accessory: { icon: '💍', name: '饰品' },
    };
    const equipList = panel.querySelector('.equip-list');
    const bagList = panel.querySelector('.bag-list');
    const detailWrap = panel.querySelector('.inv-detail-wrap');
    const bulkSelect = panel.querySelector('.bulk-rarity');
    const bulkSummary = panel.querySelector('.bulk-summary');
    panel.querySelector('.bag-title').textContent = `背包 ${player.inventory.length}/24`;
    const availableRarities = ITEM_RARITIES_DOM.filter(rarity => player.inventory.some(item => item?.rarity === rarity));
    if (!availableRarities.includes(inventoryBulkRarity)) inventoryBulkRarity = availableRarities[0] || '普通';
    if (bulkSelect) {
      bulkSelect.innerHTML = ITEM_RARITIES_DOM.map(rarity => `<option value="${escapeHtml(rarity)}"${rarity === inventoryBulkRarity ? ' selected' : ''}>${escapeHtml(rarity)}</option>`).join('');
    }
    const selectedEntries = inventoryItemsByRarityDom(inventoryBulkRarity);
    const selectedSellValue = selectedEntries.reduce((sum, entry) => sum + itemSellValueDom(entry.item), 0);
    if (bulkSummary) bulkSummary.textContent = selectedEntries.length ? `${inventoryBulkRarity}：${selectedEntries.length}件 · 售卖约${selectedSellValue}灵石` : `${inventoryBulkRarity}：暂无可处理装备`;
    equipList.innerHTML = Object.keys(slotLabels).map(slot => {
      const item = player.equipment[slot];
      const active = item && inventoryDetailTarget?.type === 'equipped' && inventoryDetailTarget.slot === slot;
      return drawInventorySlotCardDom(slot, item, active);
    }).join('');
    if (!player.inventory.length) {
      bagList.innerHTML = '<div class="empty-note">暂无装备，击败怪物可掉落</div>';
    } else {
      bagList.innerHTML = player.inventory.map((item, index) => {
        const active = inventoryDetailTarget?.type === 'bag' && Number(inventoryDetailTarget.index) === index;
        return drawBagItemCardDom(item, index, active);
      }).join('');
    }
    const detail = inventoryDetailItemDom();
    detailWrap.innerHTML = itemDetailHtmlDom(detail);
    detailWrap.querySelectorAll('[data-detail-close]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); inventoryDetailTarget = null; renderInventoryDomPanel(); });
      btn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); inventoryDetailTarget = null; renderInventoryDomPanel(); }, { passive: false });
    });
    equipList.querySelectorAll('[data-detail-slot]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); inventoryDetailTarget = { type: 'equipped', slot: btn.dataset.detailSlot }; renderInventoryDomPanel(); });
      btn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); inventoryDetailTarget = { type: 'equipped', slot: btn.dataset.detailSlot }; renderInventoryDomPanel(); }, { passive: false });
    });
    bagList.querySelectorAll('[data-detail-index]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); inventoryDetailTarget = { type: 'bag', index: Number(btn.dataset.detailIndex) }; renderInventoryDomPanel(); });
      btn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); inventoryDetailTarget = { type: 'bag', index: Number(btn.dataset.detailIndex) }; renderInventoryDomPanel(); }, { passive: false });
    });
    equipList.querySelectorAll('[data-unequip-slot]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); unequipItem(player, btn.dataset.unequipSlot); inventoryDetailTarget = null; renderInventoryDomPanel(); });
      btn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); unequipItem(player, btn.dataset.unequipSlot); inventoryDetailTarget = null; renderInventoryDomPanel(); }, { passive: false });
    });
    bagList.querySelectorAll('[data-equip-action-index]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); equipItem(player, Number(btn.dataset.equipActionIndex)); inventoryDetailTarget = null; renderInventoryDomPanel(); });
      btn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); equipItem(player, Number(btn.dataset.equipActionIndex)); inventoryDetailTarget = null; renderInventoryDomPanel(); }, { passive: false });
    });
    bagList.querySelectorAll('[data-sell-index]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); if (shouldIgnoreInventorySyntheticClickDom()) return; inventoryDetailTarget = null; sellInventoryItemDom(Number(btn.dataset.sellIndex)); });
      btn.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
    });
    bagList.querySelectorAll('[data-decompose-index]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); if (shouldIgnoreInventorySyntheticClickDom()) return; inventoryDetailTarget = null; decomposeInventoryItemDom(Number(btn.dataset.decomposeIndex)); });
      btn.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
    });
    if (bulkSelect) {
      bulkSelect.addEventListener('change', e => { inventoryBulkRarity = e.target.value; renderInventoryDomPanel(); });
      bulkSelect.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    }
    panel.querySelectorAll('[data-bulk-sell]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); if (shouldIgnoreInventorySyntheticClickDom()) return; bulkSellInventoryByRarityDom(inventoryBulkRarity); });
      btn.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
    });
    panel.querySelectorAll('[data-bulk-decompose]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); if (shouldIgnoreInventorySyntheticClickDom()) return; bulkDecomposeInventoryByRarityDom(inventoryBulkRarity); });
      btn.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
    });
  }
  function closeAllPanels() {
    showInventory = false;
    showCharacterPanel = false;
    characterPanelLastHtml = '';
    characterPanelTouchState = null;
    inventoryDetailTarget = null;
    showSkillTreeUI = false;
    showAlchemyUI = false;
    showBreakthroughUI = false;
    clearTouchMovementState();
    syncBodyPanelState();
  }
  function openPanel(panel) {
    if (isInCombat()) return;
    const wasOpen = {
      inventory: showInventory,
      character: showCharacterPanel,
      skills: showSkillTreeUI,
      alchemy: showAlchemyUI,
      breakthrough: showBreakthroughUI,
    }[panel];
    closeAllPanels();
    if (wasOpen) return;
    if (panel === 'inventory') showInventory = true;
    if (panel === 'character') showCharacterPanel = true;
    if (panel === 'skills') showSkillTreeUI = true;
    if (panel === 'alchemy') showAlchemyUI = true;
    if (panel === 'breakthrough') {
      openBreakthroughPanel();
      return;
    }
    syncBodyPanelState();
  }
  function drawPanelFrame(title, subtitle, color = '#d4a0ff') {
     const margin = canvasW < 520 ? 10 : 28;
     const top = canvasH < 520 ? 42 : 54;
     const bottomPad = canvasH < 520 ? 62 : 88;
     const panelX = margin;
     const panelY = top;
     const panelW = canvasW - margin * 2;
     const panelH = Math.max(180, canvasH - top - bottomPad);
     ctx.fillStyle = 'rgba(0,0,0,0.92)';
     ctx.fillRect(0, 0, canvasW, canvasH);
     ctx.fillStyle = '#12091f';
     ctx.fillRect(panelX, panelY, panelW, panelH);
     ctx.fillStyle = 'rgba(255,255,255,0.045)';
     ctx.fillRect(panelX + 1, panelY + 1, panelW - 2, 1);
     ctx.strokeStyle = 'rgba(212,160,255,0.62)';
     ctx.lineWidth = 1;
     ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);
     ctx.fillStyle = color;
     ctx.font = `${canvasW < 520 ? 19 : 24}px "KaiTi","SimSun",serif`;
     ctx.textAlign = 'center';
     ctx.fillText(title, canvasW / 2, panelY + (canvasW < 520 ? 28 : 36));
     if (subtitle) {
       ctx.fillStyle = '#b8a8c8';
       ctx.font = `${canvasW < 520 ? 11 : 13}px monospace`;
       ctx.fillText(subtitle, canvasW / 2, panelY + (canvasW < 520 ? 48 : 58));
     }
    ctx.textAlign = 'start';
    // ── Close button (×) ──
    const btnSize = canvasW < 520 ? 20 : 24;
    const closeBtnX = panelX + panelW - btnSize - (canvasW < 520 ? 4 : 8);
    const closeBtnY = panelY + (canvasW < 520 ? 12 : 16);
    ctx.fillStyle = 'rgba(220,80,80,0.5)';
    ctx.beginPath();
    ctx.arc(closeBtnX + btnSize/2, closeBtnY + btnSize/2, btnSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${canvasW < 520 ? 14 : 16}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('×', closeBtnX + btnSize/2, closeBtnY + btnSize/2 + (canvasW < 520 ? 4 : 5));
    ctx.textAlign = 'start';
    return { x: panelX, y: panelY, w: panelW, h: panelH, contentY: panelY + (subtitle ? 72 : 58), closeBtn: { x: closeBtnX, y: closeBtnY, w: btnSize, h: btnSize } };
   }
   function fitText(text, maxChars) {
     text = String(text);
     return text.length > maxChars ? text.slice(0, Math.max(0, maxChars - 1)) + '…' : text;
   }
   function drawPanelHint(text) {
     ctx.fillStyle = '#777';
     ctx.font = `${canvasW < 520 ? 11 : 13}px monospace`;
     ctx.textAlign = 'center';
     ctx.fillText(text, canvasW / 2, canvasH - (canvasH < 520 ? 18 : 26));
     ctx.textAlign = 'start';
   }
  function getInventoryLayout(compact, drawFrame = true) {
    const frame = drawFrame
      ? drawPanelFrame('🎒 背包与装备', compact ? '点击装备·点击卸下·×关闭' : '点击物品装备·点击槽位卸下·点击×关闭', '#d4a0ff')
      : (() => {
          const margin = canvasW < 520 ? 10 : 28;
          const top = canvasH < 520 ? 42 : 54;
          const bottomPad = canvasH < 520 ? 62 : 88;
          const panelW = canvasW - margin * 2;
          const panelH = Math.max(180, canvasH - top - bottomPad);
          return { x: margin, y: top, w: panelW, h: panelH, contentY: top + 72 };
        })();
    const pad = compact ? 14 : 28;
    const innerX = frame.x + pad;
    const innerW = frame.w - pad * 2;
    const gap = compact ? 10 : 16;
    const stacked = innerW < (compact ? 380 : 520);
    const leftW = stacked ? innerW : Math.min(compact ? 190 : 260, Math.floor(innerW * 0.42));
    const rightW = stacked ? innerW : innerW - leftW - gap;
    const leftX = innerX;
    const rightX = stacked ? innerX : innerX + leftW + gap;
    return {
      frame,
      compact,
      stacked,
      pad,
      innerX,
      innerW,
      leftX,
      rightX,
      leftW,
      rightW,
      equipTitleY: frame.contentY,
      invTitleY: frame.contentY,
      equipGap: compact ? 8 : 10,
      slotH: compact ? 48 : 52,
      cardPadX: compact ? 9 : 12,
      cardPadY: compact ? 7 : 8,
      itemH: compact ? 48 : 52,
      itemGap: compact ? 7 : 8,
      rowH: compact ? 24 : 28,
    };
  }
   
   // Joystick state
   let joystick = { active: false, dx: 0, dy: 0, distance: 0 };
   let playerSpeed = 5.0;
   function setupTouchControls() {
     // ─── Virtual Joystick ───
     const joystickZone = document.getElementById('joystick-zone');
     const joystickBase = document.getElementById('joystick-base');
     const joystickThumb = document.getElementById('joystick-thumb');
     if (!joystickZone || !joystickBase || !joystickThumb) return;
     let jsTouchId = null;
     function updateJoystickPos(touch) {
       const rect = joystickBase.getBoundingClientRect();
       const cx = rect.left + rect.width / 2;
       const cy = rect.top + rect.height / 2;
       const maxR = rect.width / 2 - 22;
       let dx = touch.clientX - cx;
       let dy = touch.clientY - cy;
       let dist = Math.sqrt(dx * dx + dy * dy);
       if (dist > maxR) {
         dx = (dx / dist) * maxR;
         dy = (dy / dist) * maxR;
         dist = maxR;
       }
       const deadZone = 8;
       if (dist < deadZone) {
         joystick.dx = 0; joystick.dy = 0; joystick.distance = 0;
         joystickThumb.style.transform = 'translate(-50%, -50%)';
       } else {
         joystick.dx = dx / maxR;
         joystick.dy = dy / maxR;
         joystick.distance = Math.min(1, dist / maxR);
         joystickThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
       }
     }
     joystickZone.addEventListener('touchstart', e => {
       e.preventDefault();
       if (jsTouchId !== null) return;
       const t = e.changedTouches[0];
       jsTouchId = t.identifier;
       joystick.active = true;
       updateJoystickPos(t);
     });
     joystickZone.addEventListener('touchmove', e => {
       e.preventDefault();
       for (let t of e.changedTouches) {
         if (t.identifier === jsTouchId) { updateJoystickPos(t); break; }
       }
     });
     joystickZone.addEventListener('touchend', e => {
       for (let t of e.changedTouches) {
         if (t.identifier === jsTouchId) {
           jsTouchId = null; joystick.active = false;
           joystick.dx = 0; joystick.dy = 0; joystick.distance = 0;
           joystickThumb.style.transform = 'translate(-50%, -50%)';
           break;
         }
       }
     });
     joystickZone.addEventListener('touchcancel', () => {
       jsTouchId = null; joystick.active = false;
       joystick.dx = 0; joystick.dy = 0; joystick.distance = 0;
       joystickThumb.style.transform = 'translate(-50%, -50%)';
     });
     // Action buttons
     document.getElementById('btn-attack').addEventListener('touchstart', e => {
       e.preventDefault();
       if (isInCombat() && combatState === COMBAT_STATE.PLAYER_TURN) playerAttack();
     });
     document.getElementById('btn-defend').addEventListener('touchstart', e => {
       e.preventDefault();
       if (isInCombat() && combatState === COMBAT_STATE.PLAYER_TURN) playerDefend();
     });
     document.getElementById('btn-flee').addEventListener('touchstart', e => {
       e.preventDefault();
       if (isInCombat() && combatState === COMBAT_STATE.PLAYER_TURN) playerFlee();
     });
   }
   function setupMenuButtons() {
     // Menu buttons — always active (touch + mouse click)
    function onBag() { openPanel('inventory'); }
    function onCharacter() { openPanel('character'); }
    function onSkills() { openPanel('skills'); }
    function onAlchemy() { openPanel('alchemy'); }
    function onBreakthrough() { openPanel('breakthrough'); }
    const btnBag = document.getElementById('btn-bag');
    const btnCharacter = document.getElementById('btn-character');
    const btnSkills = document.getElementById('btn-skills');
     const btnAlchemy = document.getElementById('btn-alchemy');
     const btnBreak = document.getElementById('btn-break');
    if (btnBag) {
      btnBag.addEventListener('click', e => { e.preventDefault(); onBag(); });
      btnBag.addEventListener('touchstart', e => { e.preventDefault(); onBag(); });
    }
    if (btnCharacter) {
      btnCharacter.addEventListener('click', e => { e.preventDefault(); onCharacter(); });
      btnCharacter.addEventListener('touchstart', e => { e.preventDefault(); onCharacter(); });
    }
    if (btnSkills) {
       btnSkills.addEventListener('click', e => { e.preventDefault(); onSkills(); });
       btnSkills.addEventListener('touchstart', e => { e.preventDefault(); onSkills(); });
     }
     if (btnAlchemy) {
       btnAlchemy.addEventListener('click', e => { e.preventDefault(); onAlchemy(); });
       btnAlchemy.addEventListener('touchstart', e => { e.preventDefault(); onAlchemy(); });
     }
    if (btnBreak) {
      btnBreak.addEventListener('click', e => { e.preventDefault(); onBreakthrough(); });
      btnBreak.addEventListener('touchstart', e => { e.preventDefault(); onBreakthrough(); });
    }
    // Save button
    const btnSave = document.getElementById('btn-save');
    function onSave() { saveGame(); showMessage('💾 存档已保存！', '#88cc88'); }
    if (btnSave) {
      btnSave.addEventListener('click', e => { e.preventDefault(); onSave(); });
      btnSave.addEventListener('touchstart', e => { e.preventDefault(); onSave(); });
    }
  }
  function setupCanvasClicks() {
    function getCanvasPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      // Scale CSS coordinates to canvas internal coordinates
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }
    function handleClick(e) {
      e.preventDefault();
      const pos = getCanvasPos(e);
      const compact = canvasW < 620;
      // ─── Detect which panel is open ───
      const isInv = showInventory;
      const isSkills = showSkillTreeUI;
      const isAlch = showAlchemyUI;
      const isBreak = showBreakthroughUI;
      if (isInCombat()) {
        handleCombatTap(pos);
        return;
      }
      if (!isInv && !isSkills && !isAlch && !isBreak) return;
      const margin = canvasW < 520 ? 10 : 28;
      const top = canvasH < 520 ? 42 : 54;
      const bottomPad = canvasH < 520 ? 62 : 88;
      const panelW = canvasW - margin * 2;
      const panelH = Math.max(180, canvasH - top - bottomPad);
      // Tap outside panel → close
      if (pos.x < margin || pos.x > canvasW - margin || pos.y < top || pos.y > top + panelH) {
        closeAllPanels(); return;
      }
      // Close button (same coords as drawPanelFrame computes)
      const btnSize = canvasW < 520 ? 20 : 24;
      const closeX = canvasW - margin - btnSize - (canvasW < 520 ? 4 : 8);
      const closeY = top + (canvasW < 520 ? 12 : 16);
      if (pos.x >= closeX && pos.x <= closeX + btnSize && pos.y >= closeY && pos.y <= closeY + btnSize) {
        closeAllPanels(); return;
      }
      const contentY = top + 72;
      // DOM HD panels handle clicks via event listeners
      return;
    }
    function handleInventoryTap(pos, compact, margin, contentY) {
      const layout = getInventoryLayout(compact, false);
      const slotKeys = ['weapon', 'armor', 'accessory'];
      let equipY = layout.equipTitleY + (compact ? 13 : 16);
      for (let s = 0; s < slotKeys.length; s++) {
        if (pos.x >= layout.leftX && pos.x <= layout.leftX + layout.leftW &&
            pos.y >= equipY && pos.y <= equipY + layout.slotH) {
          unequipItem(player, slotKeys[s]);
          return;
        }
        equipY += layout.slotH + layout.equipGap;
      }

      const invTitleY = layout.stacked ? Math.min(equipY + 14, layout.frame.y + layout.frame.h - 72) : layout.invTitleY;
      const invY = invTitleY + (compact ? 12 : 16);
      const availableBottom = layout.frame.y + layout.frame.h - (compact ? 18 : 24);
      const itemStep = layout.itemH + layout.itemGap;
      const maxFit = Math.max(0, Math.floor((availableBottom - invY) / itemStep));
      const maxShow = Math.min(player.inventory.length, layout.stacked ? Math.min(4, maxFit) : Math.min(8, maxFit));
      for (let i = 0; i < maxShow; i++) {
        const itemY = invY + i * itemStep;
        if (pos.x >= layout.rightX && pos.x <= layout.rightX + layout.rightW &&
            pos.y >= itemY && pos.y <= itemY + layout.itemH) {
          equipItem(player, i);
          return;
        }
      }
    }
    function handleSkillTreeTap(pos, compact, margin, contentY) {
      const frame = { x: margin, y: contentY - 72, w: canvasW - margin * 2, h: 0 };
      const cols = compact ? 2 : 4;
      const colW = frame.w / cols;
      const rowSkillH = compact ? 40 : 48;
      const available = getAvailableSkills(player.realmIndex);
      // Check each tree's skills
      const treeNames = ['fire', 'water', 'thunder', 'sword'];
      let skillIdx = 0;
      treeNames.forEach((tree, idxTree) => {
        const treeData = SKILL_TREES[tree];
        const col = idxTree % cols;
        const rowBlock = Math.floor(idxTree / cols);
        const x = frame.x + 14 + col * colW;
        const y0 = contentY + rowBlock * (compact ? 160 : 0);
        treeData.skills.forEach((skill, row) => {
          const sy = y0 + 26 + row * rowSkillH;
          if (pos.x >= x && pos.x <= x + colW - 14 && pos.y >= sy - rowSkillH && pos.y <= sy + 8) {
            // Find matching available skill
            for (let i = 0; i < available.length; i++) {
              if (available[i].tree === tree && available[i].index === row && !available[i].learned) {
                if (learnSkill(tree, row)) {
                  showMessage(`习得技能: 【${skill.name}】！`, '#ffdd44');
                }
                return;
              }
            }
          }
        });
      });
      // Attribute allocation zone (bottom of panel)
      if (availableSkillPoints > 0) {
        const attrY = canvasH - (compact ? 36 : 48);
        const attrH = 18;
        if (pos.y >= attrY - attrH && pos.y <= attrY) {
          const parts = ['atk', 'def', 'hp', 'mp'];
          const labels = canvasW < 520 ? ['攻+3','防+2','命+20','灵+10'] : ['[Z]攻+3','[X]防+2','[C]命+20','[V]灵+10'];
          const totalW = canvasW * 0.7;
          const segW = totalW / 4;
          const startX = (canvasW - totalW) / 2;
          for (let i = 0; i < 4; i++) {
            if (pos.x >= startX + segW * i && pos.x <= startX + segW * (i + 1)) {
              allocateAttr(parts[i]); return;
            }
          }
        }
      }
    }
    function handleAlchemyTap(pos, compact, margin, contentY, top, panelH) {
      const frame = { x: margin, w: canvasW - margin * 2 };
      const rightX = compact ? margin + 16 : frame.x + Math.min(430, frame.w * 0.42);
      let recipeY = compact ? Math.max(contentY + 88, contentY + 88) : contentY;
      // Find the "丹方" header and recipe start
      recipeY += compact ? 24 : 30; // after "丹方" label
      const rowH = compact ? 38 : 44;
      for (let i = 0; i < Math.min(RECIPES.length, compact ? 6 : 8); i++) {
        if (recipeY > top + panelH - 36) break;
        if (pos.x >= rightX && pos.x <= rightX + (compact ? 260 : 400) && pos.y >= recipeY - rowH && pos.y <= recipeY + 4) {
          craftPill(i); return;
        }
        recipeY += rowH;
      }
    }
    function handleBreakthroughTap(pos, margin, contentY) {
      // Breakthrough button area
      const compact = canvasW < 520;
      const bx = canvasW / 2;
      const by = contentY + (compact ? 78 : 92);
      if (pos.y >= by - 20 && pos.y <= by + 6 && pos.x >= bx - 80 && pos.x <= bx + 80) {
        doBreakthrough();
      }
    }
    function handleCombatTap(pos) {
      // DOM HD panels handle combat clicks via event listeners
    }
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleClick, { passive: false });
}
function generateNewFloor() {
     dungeon = generateDungeon(DUNGEON_WIDTH, DUNGEON_HEIGHT, MAX_DEPTH, dungeonLevel);
     dungeon._monsters = new Map();
     dungeon._materials = [];
     window.dungeon = dungeon;
     spawnMonsters(dungeon, dungeonLevel);
     scatterMaterials(dungeon, dungeonLevel);
     // Boss floor notification
     if (isBossFloor(dungeonLevel)) {
       const boss = BOSSES.find(b => b.floor === dungeonLevel);
       if (boss) {
         showMessage(`⚠️ Boss层！${boss.name} 在此镇守！`, '#ff2200');
       }
     }
     // Place player at spawn room center
     const r = dungeon.spawnRoom;
     player.x = Math.floor(r.x + r.w / 2);
     player.y = Math.floor(r.y + r.h / 2);
     // Reset camera
     camera = {
       x: player.x * CELL_SIZE - canvasW / 2,
       y: player.y * CELL_SIZE - canvasH / 2,
     };
   }
   function handleInput() {
     if (isInCombat() || isAnyPanelOpen() || combatState === COMBAT_STATE.DEFEAT) return;
     let dx = 0, dy = 0;
     // Keyboard input
     if (keys['ArrowUp'] || keys['w']) dy = -1;
     if (keys['ArrowDown'] || keys['s']) dy = 1;
     if (keys['ArrowLeft'] || keys['a']) dx = -1;
     if (keys['ArrowRight'] || keys['d']) dx = 1;
     // Joystick override
     if (joystick.active && (joystick.dx !== 0 || joystick.dy !== 0)) {
       dx = joystick.dx;
       dy = joystick.dy;
     }
     // Normalize diagonal movement
     if (dx !== 0 && dy !== 0) {
       const len = Math.sqrt(dx * dx + dy * dy);
       dx /= len;
       dy /= len;
     }
     if (dx === 0 && dy === 0) return;
     // Continuous movement (cells per frame, 30 FPS -> speed / 30)
     const speed = playerSpeed / 30;
     const stepX = dx * speed;
     const stepY = dy * speed;
     let newX = player.x + stepX;
     let newY = player.y + stepY;
     // Determine destination cell
     const gridX = Math.floor(newX + (dx > 0 ? 0.3 : -0.3));
     const gridY = Math.floor(newY + (dy > 0 ? 0.3 : -0.3));
     // Boundary check
     if (gridX < 0 || gridX >= dungeon.width || gridY < 0 || gridY >= dungeon.height) return;
     const tile = dungeon.grid[gridY][gridX];
     if (tile === TILE.WALL) {
       // Try sliding along walls
       const slideX = Math.floor(newX + (dx > 0 ? 0.3 : -0.3));
       const sy1 = Math.floor(player.y);
       const canSlideX = slideX >= 0 && slideX < dungeon.width && dungeon.grid[sy1][slideX] !== TILE.WALL;
       const sx2 = Math.floor(player.x);
       const slideY = Math.floor(newY + (dy > 0 ? 0.3 : -0.3));
       const canSlideY = slideY >= 0 && slideY < dungeon.height && dungeon.grid[slideY][sx2] !== TILE.WALL;
       if (canSlideX) newX = player.x + stepX; else newX = player.x;
       if (canSlideY) newY = player.y + stepY; else newY = player.y;
       if (!canSlideX && !canSlideY) return;
     }
     player.prevX = player.x;
     player.prevY = player.y;
     player.x = newX;
     player.y = newY;
     // Snap to cell center when idle
     const snapThreshold = 0.07;
     if (Math.abs(dx) < 0.01 && Math.abs(player.x - Math.round(player.x)) < snapThreshold) {
       player.x = Math.round(player.x);
     }
     if (Math.abs(dy) < 0.01 && Math.abs(player.y - Math.round(player.y)) < snapThreshold) {
       player.y = Math.round(player.y);
     }
   }
   function updateCamera() {
     const targetX = player.x * CELL_SIZE - canvasW / 2;
     const targetY = player.y * CELL_SIZE - canvasH / 2;
     camera.x += (targetX - camera.x) * 0.15;
     camera.y += (targetY - camera.y) * 0.15;
     // Clamp camera to dungeon bounds (prevent black borders)
     const mapW = dungeon.width * CELL_SIZE;
     const mapH = dungeon.height * CELL_SIZE;
     camera.x = Math.max(0, Math.min(camera.x, mapW - canvasW));
     camera.y = Math.max(0, Math.min(camera.y, mapH - canvasH));
     // If canvas is larger than map, center the map
     if (canvasW > mapW) camera.x = (mapW - canvasW) / 2;
     if (canvasH > mapH) camera.y = (mapH - canvasH) / 2;
   }

   function drawBiomeFloor(ctx, sx, sy, x, y, biome = {}) {
     const alt = ((x * 13 + y * 17) % 7) < 3;
     ctx.fillStyle = alt ? (biome.floor2 || '#2a2130') : (biome.floor || '#34233d');
     ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
     ctx.fillStyle = 'rgba(255,255,255,0.045)';
     ctx.fillRect(sx + 1, sy + 1, CELL_SIZE - 2, 1);
     ctx.fillStyle = 'rgba(0,0,0,0.055)';
     ctx.fillRect(sx + 1, sy + CELL_SIZE - 3, CELL_SIZE - 2, 2);
     ctx.strokeStyle = biome.border || 'rgba(255,255,255,0.08)';
     ctx.strokeRect(sx + 0.5, sy + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
     if ((x + y * 3) % 11 === 0) {
       ctx.fillStyle = biome.speck || 'rgba(255,255,255,0.25)';
       ctx.fillRect(sx + 3, sy + 3, 2, 2);
     }
     if (biome.id === 'jungle' && (x * 5 + y) % 13 === 0) {
       ctx.fillStyle = 'rgba(40,120,35,0.55)';
       ctx.fillText('⌁', sx + 3, sy + CELL_SIZE - 4);
     } else if (biome.id === 'lava' && (x + y * 2) % 9 === 0) {
       ctx.fillStyle = 'rgba(255,110,20,0.45)';
       ctx.fillRect(sx + 2, sy + CELL_SIZE - 5, CELL_SIZE - 4, 2);
     } else if (biome.id === 'snow' && (x * 7 + y) % 10 === 0) {
       ctx.fillStyle = 'rgba(235,250,255,0.45)';
       ctx.fillText('✧', sx + CELL_SIZE - 9, sy + 8);
     }
   }

   function drawDungeon() {
     const grid = dungeon.grid;
     const startCol = Math.max(0, Math.floor(camera.x / CELL_SIZE) - 1);
     const endCol = Math.min(grid[0].length, startCol + Math.ceil(canvasW / CELL_SIZE) + 2);
     const startRow = Math.max(0, Math.floor(camera.y / CELL_SIZE) - 1);
     const endRow = Math.min(grid.length, startRow + Math.ceil(canvasH / CELL_SIZE) + 2);
     for (let y = startRow; y < endRow; y++) {
       for (let x = startCol; x < endCol; x++) {
         const sx = x * CELL_SIZE - camera.x;
         const sy = y * CELL_SIZE - camera.y;
         const tile = grid[y][x];
         const biome = dungeon.biome || getBiomeForLevel?.(dungeonLevel) || {};
         if (tile === TILE.WALL) {
           const alt = ((x * 11 + y * 7) % 5) < 2;
           ctx.fillStyle = alt ? (biome.wall2 || '#2c2338') : (biome.wall || '#463052');
           ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
          ctx.fillStyle = 'rgba(255,255,255,0.045)';
          ctx.fillRect(sx + 2, sy + 2, CELL_SIZE - 4, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(sx + 1, sy + CELL_SIZE - 4, CELL_SIZE - 2, 3);
           ctx.strokeStyle = biome.border || 'rgba(160,120,220,0.28)';
           ctx.strokeRect(sx + 0.5, sy + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
         } else if (tile === TILE.FLOOR) {
           // Check if monster is on this tile
           const key = `${x},${y}`;
           if (dungeon._monsters && dungeon._monsters.has(key) && !isInCombat()) {
             const mon = dungeon._monsters.get(key);
             drawBiomeFloor(ctx, sx, sy, x, y, dungeon.biome);
             drawMonsterOnMap(mon, sx, sy, x, y);
             continue; // Skip floor rendering
           }
           drawBiomeFloor(ctx, sx, sy, x, y, dungeon.biome);
           // Check for material on this tile
           const matIdx = dungeon._materials ? dungeon._materials.findIndex(m => m.x === x && m.y === y) : -1;
           if (matIdx >= 0) {
             const mat = dungeon._materials[matIdx];
             // Draw material sprite
             ctx.fillStyle = mat.color;
             ctx.fillRect(sx + 5, sy + 5, 8, 8);
             ctx.fillStyle = 'rgba(255,255,255,0.5)';
             ctx.font = '8px serif';
             ctx.fillText('✦', sx + 5, sy + 11);
           } else {
             // Floor texture dots
             if ((x + y * 3) % 17 === 0) {
               ctx.fillStyle = 'rgba(30,18,40,0.5)';
               ctx.fillRect(sx + 2, sy + 2, 2, 2);
             }
           }
         } else if (tile === TILE.STAIRS_DOWN) {
           drawBiomeFloor(ctx, sx, sy, x, y, dungeon.biome);
           // Draw stairs icon (descending steps)
           ctx.fillStyle = dungeon.biome?.stairs || '#ff9944';
           ctx.font = `${CELL_SIZE - 2}px serif`;
           ctx.fillText('▽', sx + 1, sy + CELL_SIZE - 3);
         }
       }
     }
   }

   function drawMonsterOnMap(mon, sx, sy, mapX, mapY) {
     const px = Math.floor(player?.x ?? 0);
     const py = Math.floor(player?.y ?? 0);
     const dist = Math.hypot(mapX - px, mapY - py);
     if (dist > 6) {
       const fog = Math.min(0.32, 0.1 + (dist - 6) * 0.04);
       ctx.fillStyle = `rgba(8,18,28,${fog})`;
       ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
       return;
     }
     const alpha = dist > 4 ? 0.38 : dist > 2.5 ? 0.62 : 0.96;
     const t = gameTicks * 0.08;
     const pad = Math.max(3, Math.floor(CELL_SIZE * 0.18));
     const cx = sx + CELL_SIZE / 2;
     const cy = sy + CELL_SIZE / 2 + Math.sin(t) * 0.7;
     const r = Math.max(5, CELL_SIZE * 0.36);
     const color = mon.color || '#7b2d38';
     ctx.save();
     ctx.globalAlpha = alpha;
     ctx.shadowColor = 'rgba(0,0,0,0.55)';
     ctx.shadowBlur = 4;
     ctx.fillStyle = color;
     ctx.beginPath();
     ctx.roundRect(sx + pad, sy + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, Math.max(3, CELL_SIZE * 0.18));
     ctx.fill();
     ctx.shadowBlur = 0;
     ctx.strokeStyle = 'rgba(255,80,80,0.55)';
     ctx.lineWidth = 1.2;
     ctx.stroke();
     ctx.fillStyle = 'rgba(255,230,210,0.9)';
     ctx.beginPath();
     ctx.arc(cx - r * 0.32, cy - r * 0.1, 1.2, 0, Math.PI * 2);
     ctx.arc(cx + r * 0.32, cy - r * 0.1, 1.2, 0, Math.PI * 2);
     ctx.fill();
     ctx.fillStyle = 'rgba(255,70,70,0.95)';
     ctx.beginPath();
     ctx.arc(cx, sy + pad + 1, 2.4, 0, Math.PI * 2);
     ctx.fill();
     ctx.fillStyle = '#f7edf0';
     ctx.font = `bold ${Math.max(9, CELL_SIZE - 8)}px "KaiTi","SimSun",serif`;
     ctx.textAlign = 'center';
     ctx.textBaseline = 'middle';
     ctx.fillText(mon.symbol || '妖', cx, cy + 0.5);
     ctx.restore();
   }
   function drawPlayer() {
     const sx = player.x * CELL_SIZE - camera.x;
     const sy = player.y * CELL_SIZE - camera.y;
     // Body
     ctx.fillStyle = '#d4a0ff';
     ctx.fillRect(sx + 4, sy + 3, CELL_SIZE - 8, CELL_SIZE - 6);
     // Head
     ctx.fillStyle = '#ffccaa';
     ctx.fillRect(sx + 5, sy + 1, CELL_SIZE - 10, 4);
     // Eyes
     ctx.fillStyle = '#1a1025';
     ctx.fillRect(sx + 6, sy + 2, 2, 2);
     ctx.fillRect(sx + CELL_SIZE - 10, sy + 2, 2, 2);
     // Glow aura
     ctx.fillStyle = `rgba(180,130,220,${0.2 + Math.sin(gameTicks * 0.05) * 0.1})`;
     ctx.fillRect(sx - 1, sy - 1, CELL_SIZE + 2, CELL_SIZE + 2);
   }
   // ─── Simple Sound Effects (Web Audio API) ───
   let audioCtx = null;
   function initAudio() {
     if (!audioCtx) {
       try {
         audioCtx = new (window.AudioContext || window.webkitAudioContext)();
       } catch(e) {
         audioCtx = null;
       }
     }
   }
   function playBeep(freq, duration, type = 'square', volume = 0.08) {
     if (!audioCtx) initAudio();
     if (!audioCtx) return;
     const osc = audioCtx.createOscillator();
     const gain = audioCtx.createGain();
     osc.type = type;
     osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
     gain.gain.setValueAtTime(volume, audioCtx.currentTime);
     gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
     osc.connect(gain);
     gain.connect(audioCtx.destination);
     osc.start(audioCtx.currentTime);
     osc.stop(audioCtx.currentTime + duration);
   }
   function sfxAttack() { playBeep(220, 0.1, 'square', 0.06); }
   function sfxHit() { playBeep(180, 0.12, 'triangle', 0.08); }
   function sfxSkill() { playBeep(440, 0.15, 'sawtooth', 0.06); playBeep(660, 0.1, 'sawtooth', 0.04); }
   function sfxCrit() { playBeep(880, 0.08, 'square', 0.08); playBeep(660, 0.06, 'square', 0.06); }
   function sfxDrop() { playBeep(600, 0.1, 'sine', 0.05); playBeep(800, 0.08, 'sine', 0.03); }
   function sfxBreakthrough() { playBeep(220, 0.3, 'sawtooth', 0.06); playBeep(440, 0.2, 'sawtooth', 0.05); playBeep(880, 0.15, 'sine', 0.04); }
   function sfxDeath() { playBeep(110, 0.4, 'triangle', 0.08); playBeep(82, 0.5, 'triangle', 0.06); }
   function sfxPickup() { playBeep(1000, 0.05, 'sine', 0.04); playBeep(1200, 0.05, 'sine', 0.03); }
   function sfxLevelUp() { playBeep(330, 0.15, 'sine', 0.04); playBeep(440, 0.12, 'sine', 0.03); playBeep(550, 0.1, 'sine', 0.03); }
   function clearCanvas() {
     ctx.save();
     if (screenShake.duration > 0) {
       ctx.translate(screenShake.x, screenShake.y);
     }
     const biome = dungeon?.biome || {};
     ctx.fillStyle = biome.bg || '#101018';
     ctx.fillRect(-4, -4, canvasW + 8, canvasH + 8);
   }
  function drawInventory() {
    if (!showInventory) return;
    // DOM 背包面板只在打开/操作/筛选变化时重绘。
    // 之前这里每帧 30FPS 重建 select/options，移动端点品质筛选会被反复刷新导致闪动/下拉框收起。
    ensureInventoryDomPanel();
  }
  function ensureCharacterDomPanel() {
    let p = document.getElementById('character-dom-panel');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'character-dom-panel';
    p.addEventListener('click', e => {
      if (e.target.closest('.char-close')) {
        showCharacterPanel = false;
        syncBodyPanelState();
      }
    });
    p.addEventListener('touchstart', e => {
      if (e.target.closest('.char-close')) {
        e.preventDefault();
        showCharacterPanel = false;
        characterPanelLastHtml = '';
        syncBodyPanelState();
        return;
      }
      const body = e.target.closest('.char-body');
      const touch = e.touches && e.touches[0];
      characterPanelTouchState = body && touch ? { y: touch.clientY, scrollTop: body.scrollTop, body } : null;
      e.stopPropagation();
    }, { passive: false });
    // Keep panel touches away from canvas/joystick, but do not preventDefault here:
    // native overflow scrolling works best once body.character-open restores touch-action.
    p.addEventListener('touchmove', e => {
      if (characterPanelTouchState && characterPanelTouchState.body) {
        const touch = e.touches && e.touches[0];
        if (touch) {
          const dy = touch.clientY - characterPanelTouchState.y;
          characterPanelTouchState.body.scrollTop = characterPanelTouchState.scrollTop - dy;
        }
      }
      e.stopPropagation();
    }, { passive: true });
    p.addEventListener('touchend', e => { characterPanelTouchState = null; e.stopPropagation(); }, { passive: true });
    p.addEventListener('touchcancel', e => { characterPanelTouchState = null; e.stopPropagation(); }, { passive: true });
    p.addEventListener('wheel', e => { e.stopPropagation(); }, { passive: true });
    document.body.appendChild(p);
    return p;
  }
  function formatCharStatValue(v, suffix = '') {
    const n = Number(v || 0);
    const sign = n > 0 ? '+' : '';
    return `${sign}${n}${suffix}`;
  }
  function getCharacterStatMeta(key) {
    const meta = {
      atk: ['攻击', ''], def: ['防御', ''], hp: ['生命', ''], maxHp: ['生命上限', ''],
      mp: ['灵力', ''], maxMp: ['灵力上限', ''], speed: ['速度', ''],
      crit: ['暴击', '%'], critRate: ['暴击', '%'], dodge: ['闪避', '%'], dodgeRate: ['闪避', '%'],
      fireDmg: ['火焰伤害', ''], iceDmg: ['寒冰伤害', ''], poisonDmg: ['毒素伤害', ''], lightningDmg: ['雷电伤害', ''],
      lifesteal: ['吸血', '%'], armorPen: ['破甲', ''], goldFind: ['灵石获取', '%'], xpBonus: ['经验获取', '%'],
      hpRegen: ['生命恢复', ''], mpRegen: ['灵力恢复', ''], allRes: ['全元素抗性', ''],
    };
    return meta[key] || [STAT_NAMES[key] || key, ''];
  }
  function getEquipmentBonusRows() {
    const totals = {};
    Object.values(player.equipment || {}).forEach(item => {
      if (!item || !item.stats) return;
      Object.entries(item.stats).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + Number(v || 0); });
    });
    const order = ['atk','def','maxHp','hp','maxMp','mp','speed','crit','dodge','lifesteal','armorPen','fireDmg','iceDmg','poisonDmg','lightningDmg','hpRegen','mpRegen','allRes','goldFind','xpBonus'];
    const entries = Object.entries(totals).filter(([, v]) => Number(v || 0) !== 0)
      .sort(([a], [b]) => (order.indexOf(a) < 0 ? 999 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 999 : order.indexOf(b)) || a.localeCompare(b));
    return entries.map(([k, v]) => {
      const [label, suffix] = getCharacterStatMeta(k);
      return `<span class="bonus-chip"><em>${escapeHtml(label)}</em><b>${formatCharStatValue(v, suffix)}</b></span>`;
    }).join('') || '<span class="muted">暂无装备加成</span>';
  }
  function renderCharacterDomPanel() {
    const p = ensureCharacterDomPanel();
    if (!showCharacterPanel) return;
    const realm = player.realm?.name || '炼气期';
    const nextXp = (typeof getRealmThreshold === 'function') ? getRealmThreshold((player.realmIndex || 0) + 1) : 0;
    const xpPct = nextXp ? Math.min(100, Math.max(0, player.xp / nextXp * 100)) : 100;
    const slots = [
      ['武器', player.equipment?.weapon],
      ['护甲', player.equipment?.armor],
      ['饰品', player.equipment?.accessory],
    ].map(([slot, item]) => {
      const stats = item ? itemPrimaryStatsHtmlDom(item, 3) : '<span class="stat-chip empty">空槽位</span>';
      const color = item ? (item.rarityColor || '#d4a0ff') : '#5a4b68';
      return `<div class="char-equip-card${item ? '' : ' empty'}" style="--rarity-color:${escapeHtml(color)}">
        <div class="eq-icon"><span>${escapeHtml(item ? itemIconDom(item) : '＋')}</span>${item ? `<i>${escapeHtml(rarityShortDom(item.rarity))}</i>` : ''}</div>
        <div class="eq-info"><div class="eq-name-row"><b>${slot}</b><span>${item ? escapeHtml(item.name) : '未装备'}</span></div><div class="eq-stats">${stats}</div></div>
      </div>`;
    }).join('');
    const html = `
      <div class="char-head"><div><div class="char-title">👤 角色属性</div><div class="char-sub">${realm} · 第 ${dungeonLevel} 层 · (${Math.floor(player.x)}, ${Math.floor(player.y)})</div></div><button class="char-close">×</button></div>
      <div class="char-body">
        <div class="char-section char-realm"><div class="realm-name">${realm}</div><div class="stones">灵石 ${player.spiritStones || 0}</div><div class="xpbar"><i style="width:${xpPct}%"></i></div><div class="xptext">经验 ${player.xp || 0} / ${nextXp || 'MAX'}</div></div>
        <div class="char-stats-grid">
          <div><b>${player.hp}</b><span>/ ${player.maxHp}</span><em>生命</em></div>
          <div><b>${player.mp}</b><span>/ ${player.maxMp}</span><em>灵力</em></div>
          <div><b>${player.atk}</b><span></span><em>攻击</em></div>
          <div><b>${player.def}</b><span></span><em>防御</em></div>
          <div><b>${player.skillPoints || 0}</b><span></span><em>技能点</em></div>
          <div><b>${(player.inventory || []).length}</b><span></span><em>物品</em></div>
        </div>
        <div class="char-section"><h3>装备加成</h3><div class="bonus-list">${getEquipmentBonusRows()}</div></div>
        <div class="char-section"><h3>当前装备</h3><div class="char-equip-grid">${slots}</div></div>
      </div>`;
    if (html !== characterPanelLastHtml) {
      const body = p.querySelector('.char-body');
      const previousScrollTop = body ? body.scrollTop : 0;
      p.innerHTML = html;
      const nextBody = p.querySelector('.char-body');
      if (nextBody) nextBody.scrollTop = previousScrollTop;
      characterPanelLastHtml = html;
    }
  }
  function drawCharacterPanel() {
    if (!showCharacterPanel) return;
    renderCharacterDomPanel();
  }
  function renderSkillsLegacyCanvasPanel() {
    const compact = canvasW < 620;
    const layout = getInventoryLayout(compact);
    const { frame, stacked, leftX, rightX, leftW, rightW } = layout;
    const statText = (item) => Object.entries(item.stats).map(([k, v]) => `${STAT_NAMES[k] || k}+${v}`).join(' ');
    const drawCard = (x, y, w, h, stroke, fill = '#190d2a') => {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(x + 1, y + 1, w - 2, 1);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.restore();
    };
    const rarityShort = (rarity) => ({
      '普通': '普',
      '魔法': '魔',
      '稀有': '稀',
      '传说': '传',
      '神话': '神',
    }[rarity] || rarity?.[0] || '?');
    const drawBadge = (x, y, text, color) => {
      ctx.save();
      ctx.font = `bold ${compact ? 9 : 10}px monospace`;
      const padX = 5;
      const tw = ctx.measureText(text).width;
      const bw = tw + padX * 2;
      const bh = compact ? 16 : 18;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.98;
      ctx.fillRect(x - bw, y, bw, bh);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.strokeRect(x - bw + 0.5, y + 0.5, bw - 1, bh - 1);
      ctx.fillStyle = '#100818';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x - bw / 2, y + bh / 2 + 0.5);
      ctx.restore();
    };
    const slotLabels = {
      weapon: { icon: '⚔️', name: '武器' },
      armor: { icon: '🛡️', name: '防具' },
      accessory: { icon: '💍', name: '饰品' }
    };
    const drawItemIcon = (icon, x, y, size, color, badgeText) => {
      ctx.save();
      ctx.fillStyle = '#0d0715';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(x + 1, y + 1, size - 2, 2);
      ctx.strokeStyle = color || '#d4a0ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      ctx.fillStyle = color || '#d4a0ff';
      ctx.font = `${Math.floor(size * 0.62)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon || '■', x + size / 2, y + size / 2 + 0.5);
      if (badgeText) {
        const b = compact ? 13 : 14;
        ctx.fillStyle = color || '#d4a0ff';
        ctx.fillRect(x + size - b, y, b, b);
        ctx.fillStyle = '#100818';
        ctx.font = `bold ${compact ? 8 : 9}px monospace`;
        ctx.fillText(badgeText, x + size - b / 2, y + b / 2 + 0.5);
      }
      ctx.restore();
    };

    ctx.fillStyle = '#e7d5ff';
    ctx.font = `${compact ? 14 : 16}px "KaiTi","SimSun",serif`;
    ctx.fillText('已装备', leftX, layout.equipTitleY);

    let equipY = layout.equipTitleY + (compact ? 13 : 16);
    Object.keys(slotLabels).forEach((slot) => {
      const item = player.equipment[slot];
      const cardY = equipY;
      drawCard(leftX, cardY, leftW, layout.slotH, item ? (item.rarityColor || '#d4a0ff') : 'rgba(160,140,180,0.36)', item ? '#1b0f2c' : '#140d20');
      ctx.font = `bold ${compact ? 11 : 13}px "KaiTi","SimSun",serif`;
      ctx.fillStyle = '#b9abc8';
      ctx.fillText(slotLabels[slot].name, leftX + layout.cardPadX, cardY + (compact ? 16 : 18));
      if (item) {
        const iconSize = compact ? 28 : 32;
        const iconX = leftX + (compact ? 46 : 58);
        const iconY = cardY + Math.floor((layout.slotH - iconSize) / 2);
        drawItemIcon(item.icon || slotLabels[slot].icon, iconX, iconY, iconSize, item.rarityColor, rarityShort(item.rarity));
        ctx.fillStyle = item.rarityColor;
        ctx.font = `bold ${compact ? 12 : 14}px "KaiTi","SimSun",serif`;
        const textX = iconX + iconSize + 8;
        ctx.fillText(fitText(item.name, Math.max(8, Math.floor((leftX + leftW - textX - 8) / (compact ? 12 : 14)))), textX, cardY + (compact ? 17 : 19));
        ctx.fillStyle = '#c8bfd2';
        ctx.font = `${compact ? 9 : 10}px monospace`;
        ctx.fillText(fitText(statText(item), Math.max(18, Math.floor((leftX + leftW - textX - 8) / 6))), textX, cardY + (compact ? 34 : 37));
      } else {
        const iconSize = compact ? 28 : 32;
        const iconX = leftX + (compact ? 46 : 58);
        const iconY = cardY + Math.floor((layout.slotH - iconSize) / 2);
        drawItemIcon(slotLabels[slot].icon, iconX, iconY, iconSize, 'rgba(150,130,170,0.7)', '');
        ctx.fillStyle = '#777080';
        ctx.font = `${compact ? 11 : 13}px "KaiTi","SimSun",serif`;
        ctx.fillText('(空)', iconX + iconSize + 8, cardY + (compact ? 27 : 30));
      }
      equipY += layout.slotH + layout.equipGap;
    });

    const invTitleY = stacked ? Math.min(equipY + 14, frame.y + frame.h - 72) : layout.invTitleY;
    ctx.fillStyle = '#e7d5ff';
    ctx.font = `${compact ? 14 : 16}px "KaiTi","SimSun",serif`;
    ctx.fillText(`背包 ${player.inventory.length}/24`, rightX, invTitleY);

    let invY = invTitleY + (compact ? 12 : 16);
    const availableBottom = frame.y + frame.h - (compact ? 18 : 24);
    const itemStep = layout.itemH + layout.itemGap;
    const maxFit = Math.max(0, Math.floor((availableBottom - invY) / itemStep));
    const maxShow = Math.min(player.inventory.length, stacked ? Math.min(4, maxFit) : Math.min(8, maxFit));
    if (maxShow === 0) {
      ctx.fillStyle = '#666';
      ctx.font = `${compact ? 12 : 14}px "KaiTi","SimSun",serif`;
      ctx.fillText(player.inventory.length ? '(空间不足，请切换横屏查看)' : '(暂无装备，击败怪物可掉落)', rightX, invY + 18);
    }
    for (let i = 0; i < maxShow; i++) {
      const item = player.inventory[i];
      const cardY = invY + i * itemStep;
      drawCard(rightX, cardY, rightW, layout.itemH, item.rarityColor || '#d4a0ff', '#180c28');
      const typeName = SLOT_NAMES?.[item.slot]?.name || '';
      const itemIcon = item.icon || { weapon: '⚔️', armor: '🛡️', accessory: '💍' }[item.slot] || '■';
      const iconSize = compact ? 28 : 32;
      const iconX = rightX + layout.cardPadX;
      const iconY = cardY + Math.floor((layout.itemH - iconSize) / 2);
      drawItemIcon(itemIcon, iconX, iconY, iconSize, item.rarityColor, rarityShort(item.rarity));
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = item.rarityColor;
      ctx.font = `bold ${compact ? 12 : 14}px "KaiTi","SimSun",serif`;
      const textX = rightX + layout.cardPadX + iconSize + 8;
      ctx.fillText(fitText(`${typeName ? typeName + ' · ' : ''}${item.name}`, Math.max(12, Math.floor((rightX + rightW - textX - 8) / (compact ? 12 : 14)))), textX, cardY + (compact ? 17 : 19));
      ctx.fillStyle = '#c8bfd2';
      ctx.font = `${compact ? 9 : 10}px monospace`;
      ctx.fillText(fitText(statText(item), Math.max(24, Math.floor((rightX + rightW - textX - 8) / 6))), textX, cardY + (compact ? 34 : 37));
    }
    drawPanelHint('点击装备卡卸下，点击背包物品装备');
  }

  // ─── DOM HD: Skills Panel ───
  function ensureSkillsDomPanel() {
    let p = document.getElementById('skills-dom-panel');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'skills-dom-panel';
    p.addEventListener('click', e => {
      if (e.target.closest('.pclose')) {
        showSkillTreeUI = false;
        selectedSkillTreeNode = null;
        syncBodyPanelState();
      }
      if (e.target.classList.contains('skill-modal-backdrop') || e.target.closest('.skill-modal-close')) {
        skillDetailModalOpen = false;
        renderSkillsDomPanel();
      }
    });
    p.addEventListener('touchstart', e => {
      if (e.target.closest('.skill-node, .skill-learn-btn, .skill-forget-btn, .skill-modal-close, .attr-btn, .pclose, .skill-modal-backdrop')) {
        skillsLastTouchActionAt = Date.now();
        e.stopPropagation();
      }
    }, { passive: true });
    document.body.appendChild(p);
    return p;
  }
  function skillTreeShortName(treeName) {
    return String(treeName || '').replace(/[🔥💧⚡⚔️\s]/g, '').replace('功法', '').replace('之道', '') || '技能';
  }
  function skillRealmName(idx) {
    return (REALMS && REALMS[idx] && REALMS[idx].name) ? REALMS[idx].name : `境界${idx + 1}`;
  }
  function skillNodeState(tree, row) {
    const skill = SKILL_TREES[tree].skills[row];
    const learned = learnedSkills.some(s => s.tree === tree && s.index === row);
    const locked = skill.unlockRealm > player.realmIndex;
    const prevLearned = row === 0 || learnedSkills.some(s => s.tree === tree && s.index === row - 1);
    const nextLearned = learnedSkills.some(s => s.tree === tree && s.index === row + 1);
    const canLearn = !learned && !locked && prevLearned && availableSkillPoints > 0;
    const canForget = learned && !nextLearned;
    const blocked = !learned && !locked && !prevLearned;
    return { skill, learned, locked, canLearn, canForget, blocked };
  }
  function renderSkillsDomPanel() {
    const p = ensureSkillsDomPanel();
    const treeNames = ['fire', 'water', 'thunder', 'sword'];
    if (!selectedSkillTreeNode) {
      const firstLearnable = treeNames.flatMap(t => SKILL_TREES[t].skills.map((_, i) => ({ tree: t, index: i })))
        .find(n => {
          const st = skillNodeState(n.tree, n.index);
          return st.canLearn || st.learned;
        });
      selectedSkillTreeNode = firstLearnable || { tree: 'fire', index: 0 };
    }
    const selectedTree = SKILL_TREES[selectedSkillTreeNode.tree] ? selectedSkillTreeNode.tree : 'fire';
    const selectedIndex = Math.min(selectedSkillTreeNode.index || 0, SKILL_TREES[selectedTree].skills.length - 1);
    selectedSkillTreeNode = { tree: selectedTree, index: selectedIndex };
    const selectedState = skillNodeState(selectedTree, selectedIndex);
    const selectedData = SKILL_TREES[selectedTree];
    const selectedSkill = selectedState.skill;
    const selectedStatus = selectedState.learned ? '已习得' : selectedState.locked ? `需${skillRealmName(selectedSkill.unlockRealm)}` : selectedState.blocked ? '需先学前置' : selectedState.canLearn ? '可学习' : '技能点不足';
    const selectedKind = selectedSkill.kind || 'active';
    const selectedKindLabel = SKILL_KIND_LABELS[selectedKind] || '技能';
    const selectedSummary = getSkillEffectSummary(selectedSkill);
    const selectedEffectText = selectedSkill.effectText || selectedSummary;
    const learnedCount = learnedSkills.length;
    const totalCount = treeNames.reduce((n, t) => n + SKILL_TREES[t].skills.length, 0);
    let html = `<div class="panel-head skill-panel-head">
      <span class="ptitle" style="color:#d4a0ff">📜 星盘技能树</span>
      <span class="psub">技能点 ${availableSkillPoints} · 已悟 ${learnedCount}/${totalCount}</span>
      <button class="pclose">×</button>
    </div>
    <div class="panel-body skills-panel-body">
      <div class="skill-orbit-board">`;
    treeNames.forEach(tree => {
      const td = SKILL_TREES[tree];
      html += `<section class="skill-branch branch-${tree}" style="--branch-color:${td.color}">
        <div class="skill-branch-title"><span>${td.name}</span><em>${skillTreeShortName(td.name)}</em></div>
        <div class="skill-path">`;
      td.skills.forEach((skill, row) => {
        const st = skillNodeState(tree, row);
        const cls = ['skill-node'];
        if (st.learned) cls.push('learned');
        if (st.locked) cls.push('locked');
        if (st.canLearn) cls.push('learnable');
        if (st.blocked) cls.push('blocked');
        if (selectedTree === tree && selectedIndex === row) cls.push('selected');
        const icon = st.learned ? '✦' : st.locked ? '🔒' : st.blocked ? '◇' : (skill.icon || '＋');
        const hint = st.learned ? '已激活' : st.locked ? skillRealmName(skill.unlockRealm) : st.blocked ? '前置' : st.canLearn ? '可点亮' : '缺点数';
        const kind = skill.kind || 'active';
        const kindLabel = SKILL_KIND_LABELS[kind] || '技能';
        html += `<button class="${cls.join(' ')} kind-${kind}" data-tree="${tree}" data-index="${row}" aria-label="${skill.name}">
          <span class="node-ring"><b>${icon}</b></span>
          <span class="node-copy">
            <span class="node-name">${skill.name}</span>
            <span class="node-meta"><i>${kindLabel}</i><small>${hint}</small></span>
          </span>
        </button>`;
      });
      html += `</div></section>`;
    });
    html += `</div>
      <aside class="skill-detail-card" style="--branch-color:${selectedData.color}">
        <div class="detail-kicker">${selectedData.name} · 第 ${selectedIndex + 1} 阶 · ${selectedKindLabel}</div>
        <div class="detail-title">${selectedSkill.icon || '✦'} ${selectedSkill.name}</div>
        <div class="detail-status ${selectedState.learned ? 'ok' : selectedState.canLearn ? 'ready' : 'no'}">${selectedStatus}</div>
        <p class="detail-desc">${selectedSkill.desc}</p>
        <p class="detail-effect">${selectedEffectText}</p>
        <div class="detail-tags">${selectedSummary.split(' · ').map(t => `<span>${t}</span>`).join('')}</div>
        <div class="detail-stats compact-stats">
          <span>类型 <b>${selectedKindLabel}</b></span>
          <span>灵力 <b>${selectedSkill.mpCost || 0}</b></span>
          <span>伤害 <b>${selectedSkill.dmgMult ? `×${selectedSkill.dmgMult}${selectedSkill.hits ? ` / ${selectedSkill.hits}段` : ''}` : '—'}</b></span>
          <span>境界 <b>${skillRealmName(selectedSkill.unlockRealm)}</b></span>
        </div>
        <div class="skill-action-row">
          <button class="skill-learn-btn" data-tree="${selectedTree}" data-index="${selectedIndex}" ${selectedState.canLearn ? '' : 'disabled'}>${selectedState.learned ? '已点亮' : selectedState.canLearn ? '消耗 1 点技能点学习' : '暂不可学习'}</button>
          <button class="skill-forget-btn" data-tree="${selectedTree}" data-index="${selectedIndex}" ${selectedState.canForget ? '' : 'disabled'}>${selectedState.learned ? (selectedState.canForget ? '遗忘并返还 1 点' : '有后续技能，不能遗忘') : '未学习'}</button>
        </div>
      </aside>
      ${skillDetailModalOpen ? `<div class="skill-modal-backdrop"><aside class="skill-detail-card skill-detail-modal" style="--branch-color:${selectedData.color}">
        <button class="skill-modal-close" aria-label="关闭技能详情">×</button>
        <div class="detail-kicker">${selectedData.name} · 第 ${selectedIndex + 1} 阶 · ${selectedKindLabel}</div>
        <div class="detail-title">${selectedSkill.icon || '✦'} ${selectedSkill.name}</div>
        <div class="detail-status ${selectedState.learned ? 'ok' : selectedState.canLearn ? 'ready' : 'no'}">${selectedStatus}</div>
        <p class="detail-desc">${selectedSkill.desc}</p>
        <p class="detail-effect">${selectedEffectText}</p>
        <div class="detail-tags">${selectedSummary.split(' · ').map(t => `<span>${t}</span>`).join('')}</div>
        <div class="detail-stats compact-stats">
          <span>类型 <b>${selectedKindLabel}</b></span>
          <span>灵力 <b>${selectedSkill.mpCost || 0}</b></span>
          <span>伤害 <b>${selectedSkill.dmgMult ? `×${selectedSkill.dmgMult}${selectedSkill.hits ? ` / ${selectedSkill.hits}段` : ''}` : '—'}</b></span>
          <span>境界 <b>${skillRealmName(selectedSkill.unlockRealm)}</b></span>
        </div>
        <div class="skill-action-row">
          <button class="skill-learn-btn" data-tree="${selectedTree}" data-index="${selectedIndex}" ${selectedState.canLearn ? '' : 'disabled'}>${selectedState.learned ? '已点亮' : selectedState.canLearn ? '消耗 1 点技能点学习' : '暂不可学习'}</button>
          <button class="skill-forget-btn" data-tree="${selectedTree}" data-index="${selectedIndex}" ${selectedState.canForget ? '' : 'disabled'}>${selectedState.learned ? (selectedState.canForget ? '遗忘并返还 1 点' : '有后续技能，不能遗忘') : '未学习'}</button>
        </div>
      </aside></div>` : ''}
      <div class="attr-bar skill-attr-bar">
        <span class="attr-title">属性加点</span>`;
    const attrBtns = [['atk','攻+3','#ff6644'],['def','防+2','#4488ff'],['hp','命+20','#55ff55'],['mp','灵+10','#aaddff']];
    for (const [k,label,clr] of attrBtns) {
      const dis = availableSkillPoints <= 0 ? ' disabled' : '';
      html += `<button class="attr-btn${dis}" data-attr="${k}" style="--attr-color:${clr};border-color:${clr};color:${clr}">${label}</button>`;
    }
    html += `</div></div>`;
    p.innerHTML = html;
    p.querySelectorAll('.skill-node').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        selectedSkillTreeNode = { tree: el.dataset.tree, index: parseInt(el.dataset.index, 10) || 0 };
        skillDetailModalOpen = window.innerWidth <= 620;
        renderSkillsDomPanel();
      });
    });
    p.querySelectorAll('.skill-learn-btn:not([disabled])').forEach(el => {
      const fn = () => {
        const t = el.dataset.tree, idx = parseInt(el.dataset.index, 10) || 0;
        if (learnSkill(t, idx)) {
          showMessage(`习得技能: 【${SKILL_TREES[t].skills[idx].name}】！`, '#ffdd44');
          selectedSkillTreeNode = { tree: t, index: idx };
          renderSkillsDomPanel();
        }
      };
      el.addEventListener('click', e => {
        e.stopPropagation();
        if (Date.now() - skillsLastTouchActionAt < 450) return;
        fn();
      });
      el.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    });
    p.querySelectorAll('.skill-forget-btn:not([disabled])').forEach(el => {
      const fn = () => {
        const t = el.dataset.tree, idx = parseInt(el.dataset.index, 10) || 0;
        if (typeof unlearnSkill === 'function' && unlearnSkill(t, idx)) {
          showMessage(`遗忘技能: 【${SKILL_TREES[t].skills[idx].name}】，返还 1 点技能点`, '#aaddff');
          selectedSkillTreeNode = { tree: t, index: idx };
          renderSkillsDomPanel();
        }
      };
      el.addEventListener('click', e => {
        e.stopPropagation();
        if (Date.now() - skillsLastTouchActionAt < 450) return;
        fn();
      });
      el.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    });
    p.querySelectorAll('.attr-btn:not(.disabled)').forEach(el => {
      const fn = () => { allocateAttr(el.dataset.attr); renderSkillsDomPanel(); };
      el.addEventListener('click', e => {
        e.stopPropagation();
        if (Date.now() - skillsLastTouchActionAt < 450) return;
        fn();
      });
      el.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    });
  }

  function ensureAlchemyDomPanel() {
    let p = document.getElementById('alchemy-dom-panel');
    if (p) return p;
    p = document.createElement('div'); p.id = 'alchemy-dom-panel';
    p.addEventListener('click', e => { if (e.target.closest('.pclose')) { showAlchemyUI = false; syncBodyPanelState(); } });
    document.body.appendChild(p);
    return p;
  }
  function renderAlchemyDomPanel() {
    const p = ensureAlchemyDomPanel();
    let html = `<div class="panel-head">
      <span class="ptitle" style="color:#ff8844">🔥 炼丹炉 — 材料合成</span>
      <span class="psub">点击丹方炼制</span>
      <button class="pclose">×</button>
    </div><div class="panel-body"><div class="alch-layout">
      <div><div class="alch-section-title" style="color:#aaddff">材料背包</div><div class="mat-list">`;
    let shown = 0;
    for (const mat of MATERIALS) { const c=playerMaterials[mat.id]||0; if(c>0){html+=`<div class="mat-row" style="color:${mat.color}">${mat.name} x${c}</div>`;shown++;} }
    if (!shown) html += '<div class="mat-row" style="color:#666">(空)</div>';
    html += '</div></div><div><div class="alch-section-title" style="color:#ff8844">丹方</div><div class="recipe-list">';
    for (let i = 0; i < RECIPES.length; i++) {
      const r = RECIPES[i];
      let canCraft = true;
      for (const [mid,req] of Object.entries(r.materials)) { if((playerMaterials[mid]||0)<req){canCraft=false;break;} }
      const matList = Object.entries(r.materials).map(([mid,cnt])=>{const m=MATERIALS.find(x=>x.id===mid);return `${m?.name||mid}x${cnt}`;}).join(' ');
      html += `<div class="recipe-card${canCraft?'':' cant-craft'}" data-recipe="${i}" style="border-color:${r.color}">
        <div class="rc-name" style="color:${r.color}">${r.name}</div>
        <div class="rc-desc">${r.desc}</div>
        <div class="rc-mats">材料: ${matList}</div>
      </div>`;
    }
    html += '</div></div></div></div>';
    p.innerHTML = html;
    p.querySelectorAll('.recipe-card:not(.cant-craft)').forEach(el => {
      const fn = () => { craftPill(parseInt(el.dataset.recipe)); renderAlchemyDomPanel(); };
      el.addEventListener('click', fn); el.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });
    });
  }

  // ─── DOM HD: Breakthrough Panel ───
  function ensureBreakthroughDomPanel() {
    let p = document.getElementById('breakthrough-dom-panel');
    if (p) return p;
    p = document.createElement('div'); p.id = 'breakthrough-dom-panel';
    p.addEventListener('click', e => { if (e.target.closest('.pclose')) closeBreakthroughPanel(); });
    p.addEventListener('touchstart', e => { if (e.target.closest('.pclose')) { e.preventDefault(); closeBreakthroughPanel(); } }, { passive: false });
    document.body.appendChild(p);
    return p;
  }
  function renderBreakthroughDomPanel() {
    const p = ensureBreakthroughDomPanel();
    const next = REALMS[player.realmIndex + 1];
    p.innerHTML = `<div class="panel-head">
      <span class="ptitle" style="color:#ffdd44">⚡ 渡劫突破 ⚡</span>
      <span class="psub">经验已满，突破成功率 80%</span>
      <button class="pclose">×</button>
    </div><div class="panel-body">
      <div class="bt-info">
        <div class="bt-realm">当前境界: ${player.realm.name}</div>
        <div class="bt-next">下一境界: ${next?.name||'顶峰'}</div>
      </div>
      <button class="bt-btn" id="bt-go-btn"${next?'':' disabled style="opacity:0.4"'}">「尝试突破」</button>
    </div>`;
    const btn = document.getElementById('bt-go-btn');
    if (btn && !btn.disabled) {
      const fn = () => { doBreakthrough(); if (showBreakthroughUI) renderBreakthroughDomPanel(); };
      btn.addEventListener('click', fn); btn.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });
    }
  }

  function drawSkillTreeUI() {
     if (!showSkillTreeUI) return;
     // DOM HD panel handles rendering
     return;
   }
   function drawAlchemyUI() {
     if (!showAlchemyUI) return;
     // DOM HD panel handles rendering
     return;
   }
   function drawDeathScreen() {
     if (combatState !== COMBAT_STATE.DEFEAT) return;
     // Full dark overlay with red tint
     ctx.fillStyle = 'rgba(80,0,0,0.85)';
     ctx.fillRect(0, 0, canvasW, canvasH);
     ctx.fillStyle = '#ff3333';
     ctx.font = '36px "KaiTi","SimSun",serif';
     ctx.textAlign = 'center';
     ctx.fillText('💀 你已陨落 💀', canvasW / 2, canvasH / 2 - 80);
     ctx.fillStyle = '#ff8844';
     ctx.font = '18px "KaiTi","SimSun",serif';
     ctx.fillText(`境界【${player.realm.name}】护住了你的魂魄`, canvasW / 2, canvasH / 2 - 30);
     ctx.fillStyle = '#d4c8b0';
     ctx.font = '16px "KaiTi","SimSun",serif';
     ctx.fillText('装备和灵石已遗失，但修为尚在...', canvasW / 2, canvasH / 2 + 10);
     ctx.fillStyle = '#aaddff';
     ctx.fillText('即将在深渊入口重生', canvasW / 2, canvasH / 2 + 50);
     ctx.textAlign = 'start';
   }
   function drawBreakthroughUI() {
     if (!showBreakthroughUI) return;
     // DOM HD panel handles rendering
     return;
   }

  // ─── DOM HD: Combat Panel ───
  function ensureCombatDomPanel() {
    let p = document.getElementById('combat-dom-panel');
    if (p) return p;
    p = document.createElement('div'); p.id = 'combat-dom-panel';
    document.body.appendChild(p);
    return p;
  }
  function renderCombatDomPanel() {
    const p = ensureCombatDomPanel();
    if (!isInCombat() || !currentEnemy) { p.innerHTML=''; return; }
    const eHpPct = currentEnemy.maxHp ? Math.max(0, currentEnemy.hp / currentEnemy.maxHp) : 1;
    const pEnemyName = `👺 ${currentEnemy.name}`;
    const pEnemyStats = `ATK:${currentEnemy.atk}  DEF:${currentEnemy.def}`;
    const pPlayerStats = `🧘 HP:${player.hp}/${player.maxHp}  MP:${player.mp}/${player.maxMp}  ATK:${player.atk}  DEF:${player.def}`;

    // Weapon display
    const weaponItem = player.equipment?.weapon;
    const weaponIcon = weaponItem?.icon || '⚔️';
    const weaponRarity = weaponItem?.rarity || null;
    const weaponRarityColor = weaponItem?.rarityColor || '#6d5a78';
    const rarityShort = rarityShortDom(weaponRarity);
    const weaponName = weaponItem ? weaponItem.name : '未装备武器';
    const weaponHtml = `<div class="cbt-weapon" ${weaponRarity ? `style="--weapon-color:${weaponRarityColor}"` : ''}>
      <div class="cbt-weapon-icon-box">
        <span class="cbt-weapon-icon">${weaponIcon}</span>
        <span class="cbt-weapon-rarity">${weaponRarity ? rarityShort : '-'}</span>
      </div>
      <span class="cbt-weapon-name">${weaponName}</span>
    </div>`;
    const logsHtml = combatLogBuffer.map(l => `<span class="cbt-log-entry" style="color:${l.color}">${l.text}</span>`).join(' · ');
    
    // Skill buttons
    const combatSkills = getCombatSkills();
    const isPlayerTurn = combatState === COMBAT_STATE.PLAYER_TURN;
    let skillsHtml = '';
    if (combatSkills.length > 0) {
      const maxShow = Math.min(combatSkills.length, 3);
      skillsHtml = '<div class="cbt-skills-row">';
      for (let i = 0; i < maxShow; i++) {
        const s = combatSkills[i];
        const color = s.treeColor || '#d4a0ff';
        const disCls = isPlayerTurn ? '' : ' disabled';
        const summary = typeof getSkillEffectSummary === 'function' ? getSkillEffectSummary(s) : '';
        skillsHtml += `<div class="cbt-skill-btn${disCls}" data-skill="${i}" style="color:${color};border-color:${color}"><b>${s.icon || '✦'}${s.name}</b><small>${summary}</small></div>`;
      }
      skillsHtml += '</div>';
    }

    p.innerHTML = `
      <div class="cbt-enemy-name">${pEnemyName} <span class="cbt-enemy-stats">${pEnemyStats}</span></div>
      <div class="cbt-hp-bar-wrap">
        <div class="cbt-hp-bar-outer"><div class="cbt-hp-bar-inner" style="width:${eHpPct*100}%"></div></div>
        <span class="cbt-hp-text">${currentEnemy.hp}/${currentEnemy.maxHp}</span>
      </div>
      <div class="cbt-player-stats">${pPlayerStats}</div>
      ${weaponHtml}
      <div class="cbt-log">${logsHtml}</div>
      ${skillsHtml}
      <div class="cbt-actions-row">
        <div class="cbt-act-btn${isPlayerTurn?'':' disabled'}" id="cbt-attack" style="color:#ff6633;border-color:#ff6633">⚔️攻击</div>
        <div class="cbt-act-btn${isPlayerTurn?'':' disabled'}" id="cbt-defend" style="color:#dd9944;border-color:#dd9944">🛡️防御</div>
        <div class="cbt-act-btn${isPlayerTurn?'':' disabled'}" id="cbt-flee" style="color:#66bbcc;border-color:#66bbcc">🏃逃跑</div>
      </div>`;

    // Re-bind action buttons
    if (isPlayerTurn) {
      p.querySelector('#cbt-attack').addEventListener('click', () => playerAttack());
      p.querySelector('#cbt-attack').addEventListener('touchstart', e => { e.preventDefault(); playerAttack(); }, { passive: false });
      p.querySelector('#cbt-defend').addEventListener('click', () => playerDefend());
      p.querySelector('#cbt-defend').addEventListener('touchstart', e => { e.preventDefault(); playerDefend(); }, { passive: false });
      p.querySelector('#cbt-flee').addEventListener('click', () => playerFlee());
      p.querySelector('#cbt-flee').addEventListener('touchstart', e => { e.preventDefault(); playerFlee(); }, { passive: false });
      // Skill buttons
      p.querySelectorAll('.cbt-skill-btn:not(.disabled)').forEach(el => {
        const idx = parseInt(el.dataset.skill);
        el.addEventListener('click', () => playerUseSkill(idx));
        el.addEventListener('touchstart', e => { e.preventDefault(); playerUseSkill(idx); }, { passive: false });
      });
    }
  }

  function drawCombatUI() {
    // DOM HD panel handles combat UI rendering
    if (typeof renderCombatDomPanel === 'function') renderCombatDomPanel();
    return;
  }
   function checkStairs() {
     const px = Math.floor(player.x);
     const py = Math.floor(player.y);
     if (px >= 0 && px < dungeon.width && py >= 0 && py < dungeon.height) {
       if (dungeon.grid[py][px] === TILE.STAIRS_DOWN) {
         dungeonLevel++;
         generateNewFloor();
         showMessage(`你进入了${dungeon.biome?.icon || ''}${dungeon.biome?.name || '深渊'}第 ${dungeonLevel} 层...`, '#ff9944');
        autoSave();
       }
     }
   }
   function gameLoop() {
     gameTicks++;
     updateParticles();
     handleInput();
     if (!isInCombat()) checkCombatTrigger();
     if (!isInCombat() && !breakthroughQueue) checkBreakthrough();
     if (!isInCombat()) checkMaterialPickup();
     if (!isInCombat()) checkStairs();
     updateCamera();
     tickMessages();
     clearCanvas();
     drawDungeon();
     drawPlayer();
     drawCombatUI();
     drawInventory();
     drawCharacterPanel();
     drawSkillTreeUI();
     drawBreakthroughUI();
     drawAlchemyUI();
     drawDeathScreen();
     drawParticlesDom(camera);
     renderMessageLog();
     updateHUD(player, dungeonLevel);
     ctx.restore();
   }
   // Start
   window.addEventListener('DOMContentLoaded', () => {
     init();
     showMessage('踏入无尽深渊，仙途由此开始...', '#d4a0ff');
   });
   // Expose for debugging
   window.TILE = TILE;
   window.DUNGEON_WIDTH = DUNGEON_WIDTH;
   window.DUNGEON_HEIGHT = DUNGEON_HEIGHT;