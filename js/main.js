// Game Main Loop — Entry Point, Input, Rendering, Camera
     let CELL_SIZE = (window.innerWidth < 600) ? Math.max(20, Math.floor(Math.min(window.innerWidth, window.innerHeight) / 22)) : 18;
     let canvasW = 1280;
     let canvasH = 720;
     let canvas, ctx;
     let dungeon, player, camera;
     let dungeonLevel = 1;
     let keys = {};
     let gameTicks = 0;
     let discoveredMap = new Set();
     let visibleMap = new Set();
     let mapRenderCache = {
       floorKey: '', boundsKey: '', visibilityKey: '', entityKey: '', hintKey: '', miniKey: '',
       lastPx: NaN, lastPy: NaN, tilesEl: null, entitiesEl: null, hintsEl: null, miniEl: null, playerEl: null,
       canvasFloorKey: '', canvasBoundsKey: '', canvasVisibilityKey: ''
     };
     const MAP_VISION_RADIUS = 8;
     const MAP_MEMORY_RADIUS = 11;
     // Character panel state. Must be declared before gameLoop/openPanel reads it;
     // otherwise ReferenceError stops rendering and makes the map/buttons look dead.
     let showCharacterPanel = false;
     let characterPanelTouchState = null;
     let characterPanelLastHtml = '';
     let characterEquipmentDetailSlot = null;
     let characterTab = 'attributes';
    let showArtifactUI = false;
    let inventoryBulkRarity = '普通';
    let inventoryBulkMode = 'sell';
    let inventoryTab = 'equipment';
    let inventoryBulkConfirm = null;
    let inventoryDetailScrollKey = '';
    let selectedSkillTreeNode = null;
    let skillDetailModalOpen = false;
    let combatSkillDrawerOpen = false;
    let skillsLastTouchActionAt = 0;
    let selectedDaoFoundation = 'sword';
    let inventoryLastTouchActionAt = 0;
    const INVENTORY_TAP_MOVE_THRESHOLD = 12;
     function markInventoryTouchActionDom() {
       inventoryLastTouchActionAt = Date.now();
     }
     function shouldIgnoreInventorySyntheticClickDom() {
       return Date.now() - inventoryLastTouchActionAt < 700;
     }
     function inventoryScrollableParentDom(el) {
       let node = el?.parentElement || null;
       while (node) {
         const style = window.getComputedStyle(node);
         const canScrollY = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
         if (canScrollY) return node;
         if (node.classList?.contains('inv-body') || node.classList?.contains('char-body')) return node;
         node = node.parentElement;
       }
       return el?.closest?.('.char-body, .inv-body, .bag-list, .equip-list, .material-list') || null;
     }
     function bindInventoryTapDom(el, onTap, options = {}) {
       let start = null;
       let moved = false;
       let suppressClickUntil = 0;
       const threshold = options.threshold || INVENTORY_TAP_MOVE_THRESHOLD;
       const ignoreSelector = options.ignoreSelector || '';
       const point = e => {
         const t = e.changedTouches?.[0] || e.touches?.[0] || e;
         return { x: Number(t.clientX) || 0, y: Number(t.clientY) || 0 };
       };
       const scrollTop = () => inventoryScrollableParentDom(el)?.scrollTop || 0;
       const begin = e => {
         if (ignoreSelector && e.target.closest(ignoreSelector)) return;
         const p = point(e);
         start = { x: p.x, y: p.y, scrollTop: scrollTop() };
         moved = false;
       };
       const move = e => {
         if (!start) return;
         const p = point(e);
         if (Math.hypot(p.x - start.x, p.y - start.y) > threshold || Math.abs(scrollTop() - start.scrollTop) > 2) moved = true;
       };
       const end = () => {
         if (start && (moved || Math.abs(scrollTop() - start.scrollTop) > 2)) suppressClickUntil = Date.now() + 450;
         start = null;
         moved = false;
       };
       el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') begin(e); }, { passive: true });
       el.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') move(e); }, { passive: true });
       el.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') end(e); }, { passive: true });
       el.addEventListener('pointercancel', e => { if (e.pointerType !== 'mouse') { suppressClickUntil = Date.now() + 450; end(e); } }, { passive: true });
       el.addEventListener('touchstart', begin, { passive: true });
       el.addEventListener('touchmove', move, { passive: true });
       el.addEventListener('touchend', end, { passive: true });
       el.addEventListener('touchcancel', () => { suppressClickUntil = Date.now() + 450; end(); }, { passive: true });
       el.addEventListener('click', e => {
         if (ignoreSelector && e.target.closest(ignoreSelector)) return;
         if (Date.now() < suppressClickUntil) {
           e.preventDefault();
           e.stopPropagation();
           return;
         }
         e.preventDefault();
         e.stopPropagation();
         onTap(e);
       });
    }
    function bindPanelActionDom(el, onAction) {
      if (!el || typeof onAction !== 'function') return;
      el.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (shouldIgnoreInventorySyntheticClickDom()) return;
        onAction(e);
      });
      el.addEventListener('touchstart', e => {
        markInventoryTouchActionDom();
        e.preventDefault();
        e.stopPropagation();
        onAction(e);
      }, { passive: false });
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
     window.player = player;
     window.dungeon = dungeon;
     window.gameReady = true;
     setInterval(gameLoop, 1000 / 30);  // 30 FPS
   }
   function resizeCanvas() {
     canvasW = window.innerWidth;
     canvasH = window.innerHeight;
     canvas.width = canvasW;
     canvas.height = canvasH;
     if (typeof resetDomMapCache === 'function') resetDomMapCache();
   }
  function isAnyPanelOpen() {
    return showInventory || showCharacterPanel || showSkillTreeUI || showArtifactUI || showAlchemyUI || showBreakthroughUI;
  }
  function syncMainNavState() {
    if (typeof document === 'undefined') return;
    const map = {
      'btn-bag': !!showInventory,
      'btn-character': !!showCharacterPanel,
      'btn-skills': !!showSkillTreeUI,
      'btn-more': !!document.getElementById('more-menu')?.classList.contains('open'),
    };
    Object.entries(map).forEach(([id, active]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', active);
    });
  }
  function syncBodyPanelState() {
    if (typeof document === 'undefined') return;
    const open = isAnyPanelOpen();
    document.body.classList.toggle('panel-open', open);
    document.body.classList.toggle('inventory-open', !!showInventory);
    document.body.classList.toggle('character-open', !!showCharacterPanel);
    document.body.classList.toggle('skills-open', !!showSkillTreeUI);
    document.body.classList.toggle('artifact-open', !!showArtifactUI);
    document.body.classList.toggle('alchemy-open', !!showAlchemyUI);
    document.body.classList.toggle('breakthrough-open', !!showBreakthroughUI);
    const moreMenu = document.getElementById('more-menu');
    if (moreMenu && open) {
      moreMenu.classList.remove('open');
      moreMenu.setAttribute('aria-hidden', 'true');
    }
    syncMainNavState();
    if (showInventory && typeof renderInventoryDomPanel === 'function') renderInventoryDomPanel();
    if (showCharacterPanel && typeof renderCharacterDomPanel === 'function') renderCharacterDomPanel();
    if (showSkillTreeUI && typeof renderSkillsDomPanel === 'function') renderSkillsDomPanel();
    if (showArtifactUI && typeof renderArtifactDomPanel === 'function') renderArtifactDomPanel();
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

  function getRealmThreshold(realmIdx) {
  if (!REALMS || !REALMS[realmIdx]) return 0;
  return REALMS[realmIdx].xpNeeded || 0;
}
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }
  function safeCssColor(value, fallback = '#d4a0ff') {
    const s = String(value || '').trim();
    return /^#[0-9a-f]{3,8}$/i.test(s) || /^rgba?\([0-9\s,.%]+\)$/i.test(s) ? s : fallback;
  }
  function cssClassToken(value, fallback = 'x') {
    const s = String(value || '').trim();
    return /^[a-z0-9_-]+$/i.test(s) ? s : fallback;
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
    killMpRestore: '击杀回灵', thorns: '反震', bossDmg: '首领伤害',
    extraHitChance: '连击', weakenOnHit: '虚弱命中', lowHpGuard: '濒危减伤',
    dmgReduce: '伤害减免', atkPct: '攻击加成', defPct: '防御加成', maxHpPct: '生命加成', maxMpPct: '灵力加成',
  };
  function statLabelDom(key) {
    return STAT_NAMES[key] || (typeof getCharacterStatMeta === 'function' ? getCharacterStatMeta(key)[0] : key) || key;
  }
  function formatStatValueDom(key, value) {
    const n = Number(value || 0);
    const suffix = /crit|dodge|rate|Find|Bonus|lifesteal|Pen|Dmg|Chance|Guard|Reduce|Pct/i.test(key) ? '%' : '';
    return `${n > 0 ? '+' : ''}${Number.isInteger(n) ? n : n.toFixed(1)}${suffix}`;
  }
  function itemStatsTextDom(item) {
    return Object.entries(item?.stats || {}).filter(([, v]) => Number(v || 0) !== 0).map(([k, v]) => `${statLabelDom(k)}${formatStatValueDom(k, v)}`).join(' ');
  }
  function itemStatsHtmlDom(item) {
    const order = ['atk', 'def', 'maxHp', 'hp', 'maxMp', 'mp', 'crit', 'dodge', 'armorPen', 'lifesteal', 'speed', 'fireDmg', 'iceDmg', 'poisonDmg', 'lightningDmg', 'killMpRestore', 'thorns', 'bossDmg', 'extraHitChance', 'weakenOnHit', 'lowHpGuard'];
    const entries = Object.entries(item?.stats || {}).filter(([, v]) => Number(v || 0) !== 0)
      .sort(([a], [b]) => (order.indexOf(a) < 0 ? 999 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 999 : order.indexOf(b)) || a.localeCompare(b));
    if (!entries.length) return '<span class="stat-chip empty">无词条</span>';
    return entries.map(([k, v]) => `<span class="stat-chip"><em>${escapeHtml(statLabelDom(k))}</em><b>${escapeHtml(formatStatValueDom(k, v))}</b></span>`).join('');
  }
  function itemAffixesHtmlDom(item) {
    const affixes = item?.affixes || [];
    if (!affixes.length) return '<div class="affix-list empty">无额外词条</div>';
    return `<div class="affix-list">${affixes.map(affix => `<span class="affix-chip ${escapeHtml(affix.type || '')}"><b>${escapeHtml(affix.name)}</b><em>${escapeHtml(affix.desc || statLabelDom(affix.stat))}</em><strong>${escapeHtml(formatStatValueDom(affix.stat, affix.value))}</strong></span>`).join('')}</div>`;
  }
  function itemSetHtmlDom(item) {
    if (!item?.setId || typeof getEquipmentSet !== 'function') return '<div class="set-panel empty">非套装装备</div>';
    const set = getEquipmentSet(item.setId);
    const equippedCount = Object.values(player?.equipment || {}).filter(eq => eq?.setId === item.setId).length;
    const count = Math.max(equippedCount, player?.equipment?.[item.slot] === item ? equippedCount : equippedCount + 1);
    const bonuses = (set?.bonuses || []).map(b => `<div class="set-bonus ${count >= b.count ? 'active' : ''}"><b>${b.count}件</b><span>${escapeHtml(b.label)}</span></div>`).join('');
    return `<div class="set-panel" style="--set-color:${escapeHtml(set?.color || item.rarityColor || '#d4a0ff')}"><div class="set-title">${escapeHtml(set?.icon || item.setIcon || '◇')} ${escapeHtml(set?.name || item.setName)}套装 <small>${count}/8</small></div>${bonuses}</div>`;
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
  function materialTextDom(materials, options = {}) {
    const entries = Object.entries(materials || {});
    if (!entries.length) return '无';
    return entries.map(([id, count]) => {
      const mat = MATERIALS?.find(m => m.id === id);
      const owned = Number(playerMaterials?.[id] || 0);
      const lackClass = options.withOwned && owned < Number(count || 0) ? ' lack' : '';
      const text = options.withOwned ? `${mat?.name || id} ${owned}/${count}` : `${mat?.name || id}x${count}`;
      return options.asHtml ? `<span class="mat-cost${lackClass}">${escapeHtml(text)}</span>` : text;
    }).join(options.asHtml ? '' : '、');
  }
  function equipmentEnhanceLevelDom(item) {
    return typeof getEquipmentEnhanceLevel === 'function' ? getEquipmentEnhanceLevel(item) : Math.max(0, Number(item?.enhanceLevel) || 0);
  }
  function equipmentEnhanceStatDom(item) {
    return typeof getEquipmentEnhanceStat === 'function' ? getEquipmentEnhanceStat(item) : (item?.baseStat || Object.keys(item?.stats || {})[0] || 'atk');
  }
  function equipmentEnhanceCostHtmlDom(cost) {
    if (!cost) return '';
    const stoneClass = Number(player?.spiritStones || 0) < Number(cost.spiritStones || 0) ? ' lack' : '';
    return `<span class="mat-cost${stoneClass}">灵石 ${Number(player?.spiritStones || 0)}/${cost.spiritStones || 0}</span>${materialTextDom(cost.materials || {}, { asHtml: true, withOwned: true })}`;
  }
  function itemEnhanceHtmlDom(item) {
    if (!item || typeof getEquipmentEnhanceCost !== 'function') return '';
    if (typeof rebuildEquipmentStats === 'function') rebuildEquipmentStats(item);
    const level = equipmentEnhanceLevelDom(item);
    const maxLevel = typeof getCurrentEquipmentEnhanceCap === 'function' ? getCurrentEquipmentEnhanceCap() : (typeof MAX_EQUIPMENT_ENHANCE_LEVEL !== 'undefined' ? MAX_EQUIPMENT_ENHANCE_LEVEL : 15);
    const stat = equipmentEnhanceStatDom(item);
    const curBonus = item?.enhanceBonus?.[stat] || 0;
    const nextBonus = typeof equipmentEnhanceBonusValue === 'function' ? equipmentEnhanceBonusValue(item, Math.min(maxLevel, level + 1)) : curBonus;
    const chance = typeof getEquipmentEnhanceChance === 'function' ? Math.round(getEquipmentEnhanceChance(level) * 100) : 100;
    const maxed = level >= maxLevel;
    const cost = maxed ? null : getEquipmentEnhanceCost(item, level + 1);
    const risk = maxed ? '已达最高强化' : level + 1 <= 5 ? '必定成功' : level + 1 <= 10 ? '失败不掉级' : level + 1 <= 20 ? '失败掉1级（最低+10）' : '失败掉1级（最低+20）';
    return `<div class="enhance-panel">
      <div class="enhance-head"><b>强化 +${level}</b><span>${escapeHtml(risk)}</span></div>
      <div class="enhance-main"><span>${escapeHtml(statLabelDom(stat))}强化</span><b>${escapeHtml(formatStatValueDom(stat, curBonus))}${maxed ? '' : ` → ${escapeHtml(formatStatValueDom(stat, nextBonus))}`}</b></div>
      <div class="enhance-meta">成功率：${maxed ? '—' : `${chance}%`} · 上限 +${maxLevel}</div>
      ${maxed ? '<div class="enhance-cost maxed">这件装备已强化至最高等级</div>' : `<div class="enhance-cost">${equipmentEnhanceCostHtmlDom(cost)}</div>`}
    </div>`;
  }
  function enhanceInventoryTargetDom(detail) {
    const item = detail?.item;
    if (!item || typeof enhanceEquipment !== 'function') return false;
    const result = enhanceEquipment(item, playerMaterials, player);
    if (!result.ok) {
      showMessage(result.reason === 'max_level' ? '已强化到最高等级' : '强化材料不足', '#ff7777');
      refreshEquipmentPanelsDom();
      return false;
    }
    if (player?.recalcStats) player.recalcStats();
    autoSave();
    if (typeof updateUI === 'function') updateUI();
    const name = item.name || '装备';
    if (result.success) {
      showMessage(`${name} 强化成功：+${result.beforeLevel} → +${result.afterLevel}`, '#77ff99');
    } else if (result.degraded) {
      showMessage(`${name} 强化失败，等级回落到 +${result.afterLevel}`, '#ff9966');
    } else {
      showMessage(`${name} 强化失败，等级保持 +${result.afterLevel}`, '#ffcc66');
    }
    refreshEquipmentPanelsDom();
    return true;
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
    refreshEquipmentPanelsDom();
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
    refreshEquipmentPanelsDom();
    return true;
  }
  function inventoryItemsByRarityDom(rarity) {
    if (!player?.inventory) return [];
    return player.inventory.map((item, index) => ({ item, index })).filter(entry => entry.item?.rarity === rarity);
  }
  function bulkBreakdownTotalDom(entries) {
    const totalGains = {};
    for (const { item } of entries || []) {
      const gains = itemBreakdownDom(item);
      for (const [id, count] of Object.entries(gains)) totalGains[id] = (totalGains[id] || 0) + Number(count || 0);
    }
    return totalGains;
  }
  function bulkPreviewDom(rarity = inventoryBulkRarity) {
    const entries = inventoryItemsByRarityDom(rarity);
    const sellValue = entries.reduce((sum, entry) => sum + itemSellValueDom(entry.item), 0);
    const gains = bulkBreakdownTotalDom(entries);
    const power = entries.reduce((sum, entry) => sum + itemPowerDom(entry.item), 0);
    const names = entries.slice(0, 4).map(entry => entry.item?.name || '装备');
    return { rarity, entries, count: entries.length, sellValue, gains, power, names };
  }
  function bulkPreviewHtmlDom(preview, mode = inventoryBulkMode) {
    const count = Number(preview?.count || 0);
    const reward = mode === 'sell' ? `${preview?.sellValue || 0} 灵石` : materialTextDom(preview?.gains || {});
    const action = mode === 'sell' ? '售卖' : '分解';
    const sample = preview?.names?.length ? preview.names.map(escapeHtml).join('、') + (count > preview.names.length ? ` 等${count}件` : '') : '暂无装备';
    return `<div class="bulk-preview ${count ? '' : 'empty'}">
      <div class="bulk-preview-main"><b>${escapeHtml(preview?.rarity || '普通')}</b><span>${count ? `${count} 件 · ${action}预览` : '当前品质暂无装备'}</span></div>
      <div class="bulk-preview-reward ${mode}">${escapeHtml(reward)}</div>
      <div class="bulk-preview-sample">${sample}</div>
    </div>`;
  }
  function openBulkConfirmDom(mode, rarity) {
    const preview = bulkPreviewDom(rarity);
    if (!preview.count) {
      showMessage(`没有${rarity}品质装备可${mode === 'sell' ? '售卖' : '分解'}`, '#aaa');
      return false;
    }
    inventoryBulkMode = mode;
    inventoryBulkConfirm = { mode, rarity, stamp: Date.now() };
    inventoryDetailTarget = null;
    renderInventoryDomPanel();
    return true;
  }
  function closeBulkConfirmDom() {
    inventoryBulkConfirm = null;
    renderInventoryDomPanel();
  }
  function bulkConfirmLayerHtmlDom() {
    if (!inventoryBulkConfirm) return '';
    const { mode, rarity } = inventoryBulkConfirm;
    const preview = bulkPreviewDom(rarity);
    if (!preview.count) return '';
    const isSell = mode === 'sell';
    const title = isSell ? '确认一键售卖' : '确认一键分解';
    const reward = isSell ? `${preview.sellValue} 灵石` : materialTextDom(preview.gains);
    const rewardHtml = isSell ? `<span class="bulk-reward-stone">${preview.sellValue} 灵石</span>` : materialTextDom(preview.gains, { asHtml: true });
    const sample = preview.names.map(escapeHtml).join('、') + (preview.count > preview.names.length ? ` 等${preview.count}件` : '');
    return `<div class="bulk-confirm-layer show" data-bulk-layer="1">
      <div class="bulk-confirm-card ${isSell ? 'sell' : 'decompose'}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <button class="bulk-close" type="button" data-bulk-cancel="1" aria-label="取消">×</button>
        <div class="bulk-confirm-title">${escapeHtml(title)}</div>
        <div class="bulk-confirm-sub">${escapeHtml(rarity)}品质 · ${preview.count} 件装备</div>
        <div class="bulk-confirm-reward"><span>预计获得</span><b>${rewardHtml}</b></div>
        <div class="bulk-confirm-list">${sample}</div>
        <div class="bulk-warning">操作后装备会从背包移除，请确认这些品质装备都不需要保留。</div>
        <div class="bulk-confirm-actions">
          <button type="button" class="bulk-cancel" data-bulk-cancel="1">取消</button>
          <button type="button" class="bulk-confirm-btn ${isSell ? 'sell' : 'decompose'}" data-bulk-confirm="${escapeHtml(mode)}">确认${isSell ? '售卖' : '分解'} · ${escapeHtml(reward)}</button>
        </div>
      </div>
    </div>`;
  }
  function executeBulkInventoryActionDom(mode, rarity) {
    const preview = bulkPreviewDom(rarity);
    if (!preview.count) { inventoryBulkConfirm = null; renderInventoryDomPanel(); return false; }
    const indices = new Set(preview.entries.map(entry => entry.index));
    player.inventory = player.inventory.filter((_, index) => !indices.has(index));
    if (mode === 'sell') {
      player.addSpiritStones(preview.sellValue);
      showMessage(`已售卖 ${preview.count} 件${rarity}装备，获得 ${preview.sellValue} 灵石`, '#ffcc44');
    } else {
      for (const [id, count] of Object.entries(preview.gains)) playerMaterials[id] = (playerMaterials[id] || 0) + count;
      showMessage(`已分解 ${preview.count} 件${rarity}装备，获得 ${materialTextDom(preview.gains)}`, '#aaddff');
    }
    inventoryDetailTarget = null;
    inventoryBulkConfirm = null;
    autoSave();
    if (typeof updateUI === 'function') updateUI();
    refreshEquipmentPanelsDom();
    return true;
  }
  function bulkSellInventoryByRarityDom(rarity) {
    return openBulkConfirmDom('sell', rarity);
  }
  function bulkDecomposeInventoryByRarityDom(rarity) {
    return openBulkConfirmDom('decompose', rarity);
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
  function previewEquipItemDom(index) {
    const item = player?.inventory?.[Number(index)];
    if (!item) return false;
    inventoryDetailTarget = { type: 'compare', index: Number(index) };
    renderInventoryDomPanel();
    return true;
  }
  function drawInventorySlotCardDom(slot, item, active = false) {
    const slotInfo = SLOT_NAMES?.[slot] || { name: slot || '装备' };
    const color = item?.rarityColor || '#7d708d';
    const icon = itemIconDom(item, slot);
    if (item && typeof rebuildEquipmentStats === 'function') rebuildEquipmentStats(item);
    const stats = item ? itemStatsInlineDom(item, 2) : '<span class="stat-chip empty">空</span>';
    const level = item ? equipmentEnhanceLevelDom(item) : 0;
    const name = item ? `${item.name}${level > 0 ? ` +${level}` : ''}` : '未装备';
    return `<div class="equip-slot-card ${item ? '' : 'empty'}${active ? ' active' : ''}" data-slot="${escapeHtml(slot)}" role="button" aria-label="${escapeHtml(slotInfo.name)} ${escapeHtml(name)}" style="--rarity-color:${escapeHtml(color)}">
      <div class="slot-icon"><span>${escapeHtml(icon)}</span>${item ? `<i>${escapeHtml(rarityShortDom(item.rarity))}</i>` : '<i>空</i>'}</div>
      <div class="slot-info"><b>${escapeHtml(slotInfo.name)}</b><span>${escapeHtml(name)}</span></div>
      <div class="slot-stats">${stats}</div>
      <div class="slot-actions">${item ? `<button class="item-action detail" type="button" data-detail-slot="${escapeHtml(slot)}" title="详情">详</button><button class="item-action unequip" type="button" data-unequip-slot="${escapeHtml(slot)}" title="卸下">卸</button>` : ''}</div>
    </div>`;
  }
  function drawBagItemCardDom(item, index, active = false) {
    if (item && typeof rebuildEquipmentStats === 'function') rebuildEquipmentStats(item);
    const color = item?.rarityColor || '#d4a0ff';
    const typeName = SLOT_NAMES?.[item.slot]?.name || '装备';
    const level = equipmentEnhanceLevelDom(item);
    const name = `${item.name}${level > 0 ? ` +${level}` : ''}`;
    return `<button class="bag-item-card icon-card${active ? ' active' : ''}" type="button" data-index="${index}" aria-label="查看${escapeHtml(name)}详情" title="${escapeHtml(name)}" style="--rarity-color:${escapeHtml(color)}">
      <div class="bag-icon"><span>${escapeHtml(itemIconDom(item))}</span><i>${escapeHtml(rarityShortDom(item.rarity))}</i></div>
      ${level > 0 ? `<span class="enhance-badge">+${level}</span>` : ''}
      <span class="bag-slot-tag">${escapeHtml(typeName.slice(0, 1))}</span>
    </button>`;
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
    const fallbackIcons = { weapon: '⚔️', helmet: '⛑️', armor: '🛡️', gloves: '🧤', belt: '🪢', pants: '👖', boots: '🥾', accessory: '💍' };
    return item?.icon || fallbackIcons[slot || item?.slot] || '■';
  }
  function sortedItemStatEntriesDom(item) {
    const order = ['atk', 'def', 'maxHp', 'hp', 'maxMp', 'mp', 'crit', 'dodge', 'armorPen', 'lifesteal', 'speed', 'fireDmg', 'iceDmg', 'poisonDmg', 'lightningDmg', 'hpRegen', 'mpRegen', 'allRes', 'goldFind', 'xpBonus'];
    return Object.entries(item?.stats || {}).filter(([, v]) => Number(v || 0) !== 0)
      .sort(([a], [b]) => (order.indexOf(a) < 0 ? 999 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 999 : order.indexOf(b)) || a.localeCompare(b));
  }
  function itemMiniCardDom(item, label = '', extraClass = '') {
    if (!item) {
      return `<div class="compare-item-card empty ${escapeHtml(extraClass)}"><div class="compare-empty-icon">∅</div><div><b>${escapeHtml(label || '当前')}</b><span>未装备</span></div></div>`;
    }
    const color = item.rarityColor || '#d4a0ff';
    const meta = itemCardMetaDom(item, label || (SLOT_NAMES?.[item.slot]?.name || '装备'));
    return `<div class="compare-item-card ${escapeHtml(extraClass)}" style="--rarity-color:${escapeHtml(color)}">
      <div class="item-icon-box compare-icon"><span>${escapeHtml(itemIconDom(item))}</span><span class="rarity-corner">${escapeHtml(rarityShortDom(item.rarity))}</span></div>
      <div class="compare-item-main"><b>${escapeHtml(item.name)}</b><span>${escapeHtml(meta)}</span></div>
    </div>`;
  }
  function statDeltaHtmlDom(nextItem, currentItem) {
    const keys = Array.from(new Set([...Object.keys(currentItem?.stats || {}), ...Object.keys(nextItem?.stats || {})]));
    if (!keys.length) return '<span class="stat-chip empty">无属性变化</span>';
    const order = ['atk', 'def', 'maxHp', 'hp', 'maxMp', 'mp', 'crit', 'dodge', 'armorPen', 'lifesteal', 'speed', 'fireDmg', 'iceDmg', 'poisonDmg', 'lightningDmg', 'hpRegen', 'mpRegen', 'allRes', 'goldFind', 'xpBonus'];
    keys.sort((a, b) => (order.indexOf(a) < 0 ? 999 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 999 : order.indexOf(b)) || a.localeCompare(b));
    return keys.map(key => {
      const cur = Number(currentItem?.stats?.[key] || 0);
      const nxt = Number(nextItem?.stats?.[key] || 0);
      const delta = nxt - cur;
      const cls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
      const text = delta === 0 ? '不变' : formatStatValueDom(key, delta);
      return `<span class="stat-delta ${cls}"><em>${escapeHtml(statLabelDom(key))}</em><b>${escapeHtml(text)}</b><small>${escapeHtml(formatStatValueDom(key, cur))} → ${escapeHtml(formatStatValueDom(key, nxt))}</small></span>`;
    }).join('');
  }
  function equipmentSlotKeys() {
    if (typeof EQUIPMENT_SLOT_ORDER !== 'undefined') return EQUIPMENT_SLOT_ORDER.slice();
    if (typeof SLOT_NAMES !== 'undefined') return Object.keys(SLOT_NAMES);
    return ['weapon','helmet','armor','gloves','belt','pants','boots','accessory'];
  }
  let inventoryDetailTarget = null;
  function inventoryDetailItemDom() {
    if (!inventoryDetailTarget || !player) return null;
    if (inventoryDetailTarget.type === 'equipped') {
      const slot = inventoryDetailTarget.slot;
      const item = player.equipment?.[slot];
      return item ? { type: 'detail', item, label: SLOT_NAMES?.[slot]?.name || slot || '装备', slot } : null;
    }
    if (inventoryDetailTarget.type === 'bag') {
      const index = Number(inventoryDetailTarget.index);
      const item = player.inventory?.[index];
      return item ? { type: 'detail', item, label: SLOT_NAMES?.[item.slot]?.name || item.slot || '装备', index } : null;
    }
    if (inventoryDetailTarget.type === 'compare') {
      const index = Number(inventoryDetailTarget.index);
      const item = player.inventory?.[index];
      if (!item) return null;
      const slot = item.slot;
      return {
        type: 'compare',
        item,
        current: player.equipment?.[slot] || null,
        label: SLOT_NAMES?.[slot]?.name || slot || '装备',
        slot,
        index,
      };
    }
    return null;
  }
  function itemCompareHtmlDom(detail) {
    const item = detail.item;
    const current = detail.current;
    const color = item.rarityColor || '#d4a0ff';
    const title = current ? `替换${detail.label}` : `装备到${detail.label}`;
    return `<div class="item-detail compare-detail" style="--rarity-color:${escapeHtml(color)}">
      <button class="detail-close" type="button" data-detail-close="1">×</button>
      <div class="compare-title">${escapeHtml(title)} · 属性对比</div>
      <div class="compare-items">
        ${itemMiniCardDom(current, `当前${detail.label}`, 'current')}
        <div class="compare-arrow">➜</div>
        ${itemMiniCardDom(item, `背包${detail.label}`, 'next')}
      </div>
      <div class="compare-delta-list">${statDeltaHtmlDom(item, current)}</div>
      <div class="compare-actions">
        <button class="item-action equip confirm-equip" type="button" data-confirm-equip-index="${detail.index}">${current ? '确认替换' : '确认装备'}</button>
        <button class="item-action detail" type="button" data-detail-index="${detail.index}">看详情</button>
        <button class="item-action cancel" type="button" data-detail-close="1">取消</button>
      </div>
    </div>`;
  }
  function itemDetailHtmlDom(detail, emptyText = '点背包小图标查看详情；再选择对比、售卖或分解') {
    if (!detail?.item) return `<div class="item-detail empty">${escapeHtml(emptyText)}</div>`;
    if (detail.type === 'compare') return itemCompareHtmlDom(detail);
    const item = detail.item;
    if (typeof rebuildEquipmentStats === 'function') rebuildEquipmentStats(item);
    const color = item.rarityColor || '#d4a0ff';
    const floor = item.floorLevel ? `掉落层数：${item.floorLevel}` : `当前层数：${dungeonLevel || 1}`;
    const typeText = detail.label || SLOT_NAMES?.[item.slot]?.name || item.slot || '装备';
    const level = equipmentEnhanceLevelDom(item);
    const enhancedName = `${item.name}${level > 0 ? ` +${level}` : ''}`;
    const maxLevel = typeof getCurrentEquipmentEnhanceCap === 'function' ? getCurrentEquipmentEnhanceCap() : (typeof MAX_EQUIPMENT_ENHANCE_LEVEL !== 'undefined' ? MAX_EQUIPMENT_ENHANCE_LEVEL : 15);
    const enhanceButton = level >= maxLevel ? `<button class="item-action enhance disabled" type="button" disabled>已满级</button>` : `<button class="item-action enhance" type="button" data-enhance-target="1">强化</button>`;
    const bagActions = Number.isInteger(detail.index) ? `<div class="detail-actions enhance-actions">
        ${enhanceButton}
        <button class="item-action equip" type="button" data-equip-action-index="${detail.index}">对比</button>
        <button class="item-action sell" type="button" data-sell-index="${detail.index}">售卖</button>
        <button class="item-action decompose" type="button" data-decompose-index="${detail.index}">分解</button>
      </div>` : '';
    const equipActions = detail.slot ? `<div class="detail-actions enhance-actions">${enhanceButton}<button class="item-action unequip" type="button" data-unequip-slot="${escapeHtml(detail.slot)}">卸下</button></div>` : '';
    return `<div class="item-detail" style="--rarity-color:${escapeHtml(color)}">
      <button class="detail-close" type="button" data-detail-close="1">×</button>
      <div class="detail-top">
        <div class="item-icon-box detail-icon"><span>${escapeHtml(itemIconDom(item))}</span><span class="rarity-corner">${escapeHtml(rarityShortDom(item.rarity))}</span></div>
        <div class="detail-main">
          <div class="detail-name">${escapeHtml(enhancedName)}</div>
          <div class="detail-meta">${escapeHtml(typeText)} · ${escapeHtml(item.rarity || '未知')} · 强化 +${level} · 战力 ${itemPowerDom(item)}</div>
        </div>
      </div>
      <div class="detail-stats">${itemStatsHtmlDom(item)}</div>
      ${itemEnhanceHtmlDom(item)}
      ${itemAffixesHtmlDom(item)}
      ${itemSetHtmlDom(item)}
      <div class="detail-extra"><span>${escapeHtml(floor)}</span><span>售卖估值：${itemSellValueDom(item)} 灵石</span><span>分解：${escapeHtml(materialTextDom(itemBreakdownDom(item)))}</span></div>
      ${bagActions || equipActions}
    </div>`;
  }
  function materialCardsHtmlDom() {
    if (typeof MATERIALS === 'undefined') return '<div class="empty-note">暂无材料定义</div>';
    const cards = MATERIALS.map(mat => {
      const count = Number(playerMaterials?.[mat.id] || 0);
      const empty = count <= 0 ? ' empty' : '';
      return `<div class="mat-card${empty}" style="--mat-color:${escapeHtml(mat.color || '#aaa')}"><span class="mat-dot">✦</span><div><b>${escapeHtml(mat.name || mat.id)}</b><em>${escapeHtml(mat.rarity || '')}</em></div><strong>x${count}</strong></div>`;
    }).join('');
    return cards || '<div class="empty-note">暂无材料</div>';
  }
  function refreshEquipmentPanelsDom() {
    if (typeof updateUI === 'function') updateUI();
    if (showInventory) renderInventoryDomPanel();
    if (showCharacterPanel) {
      characterPanelLastHtml = '';
      renderCharacterDomPanel();
    }
  }
  function bindInventoryDetailActionsDom(root, detailWrap, getDetail = () => inventoryDetailItemDom(), rerender = () => renderInventoryDomPanel(), clearDetail = () => { inventoryDetailTarget = null; }) {
    if (!detailWrap) return;
    detailWrap.querySelectorAll('[data-detail-close]').forEach(btn => {
      bindPanelActionDom(btn, () => { clearDetail(); rerender(); });
    });
    detailWrap.querySelectorAll('[data-equip-action-index]').forEach(btn => {
      bindPanelActionDom(btn, () => previewEquipItemDom(Number(btn.dataset.equipActionIndex)));
    });
    detailWrap.querySelectorAll('[data-confirm-equip-index]').forEach(btn => {
      bindPanelActionDom(btn, () => {
        const equipped = equipItem(player, Number(btn.dataset.confirmEquipIndex));
        clearDetail();
        if (equipped) {
          showInventory = false;
          showCharacterPanel = true;
          characterPanelLastHtml = '';
          characterEquipmentDetailSlot = null;
          showMessage('已装备，切换到角色页查看整体效果', '#d4a0ff');
          syncBodyPanelState();
        }
        refreshEquipmentPanelsDom();
      });
    });
    detailWrap.querySelectorAll('[data-enhance-target]').forEach(btn => {
      bindPanelActionDom(btn, () => enhanceInventoryTargetDom(getDetail()));
    });
    detailWrap.querySelectorAll('[data-unequip-slot]').forEach(btn => {
      bindPanelActionDom(btn, () => {
        unequipItem(player, btn.dataset.unequipSlot);
        clearDetail();
        refreshEquipmentPanelsDom();
      });
    });
    detailWrap.querySelectorAll('[data-sell-index]').forEach(btn => {
      bindPanelActionDom(btn, () => { clearDetail(); sellInventoryItemDom(Number(btn.dataset.sellIndex)); });
    });
    detailWrap.querySelectorAll('[data-decompose-index]').forEach(btn => {
      bindPanelActionDom(btn, () => { clearDetail(); decomposeInventoryItemDom(Number(btn.dataset.decomposeIndex)); });
    });
  }
  function ensureInventoryDomPanel() {
    let panel = document.getElementById('inventory-dom-panel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'inventory-dom-panel';
    panel.innerHTML = `
      <div class="inv-head">
        <button class="inv-close" type="button" aria-label="关闭背包">×</button>
        <div class="inv-title">🎒 背包</div>
        <div class="inv-sub">物品容器：装备库存、材料库存、售卖/分解处理</div>
        <div class="inv-tabs" role="tablist"><button class="inv-tab" type="button" data-inv-tab="equipment">装备</button><button class="inv-tab" type="button" data-inv-tab="materials">材料</button><button class="inv-tab" type="button" data-inv-tab="process">处理</button></div>
      </div>
      <div class="inv-body">
        <section class="inv-section bag-section" data-tab-panel="equipment"><div class="section-title bag-title">装备库存 0/36</div><div class="bag-list"></div></section>
        <section class="inv-section material-section" data-tab-panel="materials"><div class="section-title">材料库存</div><div class="material-list"></div></section>
        <section class="inv-section process-section" data-tab-panel="process"><div class="section-title">售卖 / 分解</div><div class="bulk-panel"><div class="bulk-tabs"><button class="bulk-tab sell" type="button" data-bulk-mode="sell">售卖</button><button class="bulk-tab decompose" type="button" data-bulk-mode="decompose">分解</button></div><div class="bulk-tools"><select class="bulk-rarity" aria-label="选择品质"></select><button class="bulk-action sell" type="button" data-bulk-sell="1">一键售卖</button><button class="bulk-action decompose" type="button" data-bulk-decompose="1">一键分解</button></div><div class="bulk-summary"></div></div><div class="process-note">只处理背包库存，不影响角色页当前装备。高品质请先点装备卡片查看详情。</div></section>
      </div>
      <div class="inv-detail-layer"><div class="inv-detail-card"><div class="inv-detail-wrap"></div></div></div><div class="bulk-confirm-root"></div>
      <div class="inv-hint">背包只管理库存；穿上装备后到「角色」页查看属性、套装与战力</div>`;
    const container = document.getElementById('game-container') || document.body;
    container.appendChild(panel);
    const close = () => closeAllPanels();
    panel.querySelector('.inv-close').addEventListener('click', e => { if (shouldIgnoreInventorySyntheticClickDom()) return; close(); });
    panel.querySelector('.inv-close').addEventListener('touchstart', e => { markInventoryTouchActionDom(); e.preventDefault(); e.stopPropagation(); close(); }, { passive: false });
    panel.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    panel.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    panel.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    const detailLayer = panel.querySelector('.inv-detail-layer');
    const detailCard = panel.querySelector('.inv-detail-card');
    if (detailLayer) {
      const closeDetail = e => {
        if (e.target !== detailLayer && !e.target.closest('[data-detail-close]')) return;
        e.preventDefault();
        e.stopPropagation();
        inventoryDetailTarget = null;
        renderInventoryDomPanel();
      };
      detailLayer.addEventListener('click', closeDetail);
      detailLayer.addEventListener('touchstart', closeDetail, { passive: false });
      detailLayer.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    }
    if (detailCard) {
      detailCard.addEventListener('click', e => e.stopPropagation());
      detailCard.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
      detailCard.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
      detailCard.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    }
    panel.addEventListener('click', e => {
      if (e.target.closest('[data-bulk-cancel]') || e.target.classList?.contains('bulk-confirm-layer')) {
        e.preventDefault(); e.stopPropagation(); closeBulkConfirmDom(); return;
      }
      const confirmBtn = e.target.closest('[data-bulk-confirm]');
      if (confirmBtn) {
        e.preventDefault(); e.stopPropagation();
        const mode = confirmBtn.dataset.bulkConfirm;
        const rarity = inventoryBulkConfirm?.rarity || inventoryBulkRarity;
        executeBulkInventoryActionDom(mode, rarity);
      }
    });
    panel.addEventListener('touchstart', e => {
      if (e.target.closest('.bulk-confirm-card')) e.stopPropagation();
    }, { passive: true });
    return panel;
  }
  function renderInventoryDomPanel() {
    const panel = ensureInventoryDomPanel();
    if (!showInventory || !player) return;
    const bagList = panel.querySelector('.bag-list');
    const materialList = panel.querySelector('.material-list');
    const detailWrap = panel.querySelector('.inv-detail-wrap');
    const detailLayer = panel.querySelector('.inv-detail-layer');
    const bulkSelect = panel.querySelector('.bulk-rarity');
    const bulkSummary = panel.querySelector('.bulk-summary');
    const inventoryCapacity = typeof getInventoryCapacity === 'function' ? getInventoryCapacity(player) : 36;
    const nextCapacityUnlock = typeof getNextInventoryCapacityUnlock === 'function' ? getNextInventoryCapacityUnlock(player) : null;
    panel.querySelector('.bag-title').textContent = `装备库存 ${player.inventory.length}/${inventoryCapacity}`;
    const invSub = panel.querySelector('.inv-sub');
    if (invSub) {
      invSub.textContent = nextCapacityUnlock
        ? `物品容器：装备库存、材料库存、售卖/分解处理 · ${nextCapacityUnlock.realmName}解锁 ${nextCapacityUnlock.capacity} 格（+${nextCapacityUnlock.increase}）`
        : `物品容器：装备库存、材料库存、售卖/分解处理 · 背包容量已满阶 ${inventoryCapacity} 格`;
    }
    panel.querySelectorAll('.inv-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.invTab === inventoryTab));
    panel.querySelectorAll('[data-tab-panel]').forEach(section => section.classList.toggle('active', section.dataset.tabPanel === inventoryTab));
    const availableRarities = ITEM_RARITIES_DOM.filter(rarity => player.inventory.some(item => item?.rarity === rarity));
    if (!availableRarities.includes(inventoryBulkRarity)) inventoryBulkRarity = availableRarities[0] || '普通';
    if (bulkSelect) {
      bulkSelect.innerHTML = ITEM_RARITIES_DOM.map(rarity => `<option value="${escapeHtml(rarity)}"${rarity === inventoryBulkRarity ? ' selected' : ''}>${escapeHtml(rarity)}</option>`).join('');
    }
    const selectedEntries = inventoryItemsByRarityDom(inventoryBulkRarity);
    const selectedPreview = bulkPreviewDom(inventoryBulkRarity);
    if (bulkSummary) bulkSummary.innerHTML = bulkPreviewHtmlDom(selectedPreview, inventoryBulkMode);
    panel.querySelectorAll('[data-bulk-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bulkMode === inventoryBulkMode);
    });
    panel.querySelectorAll('.bulk-action').forEach(btn => {
      btn.classList.toggle('active', (btn.classList.contains('sell') && inventoryBulkMode === 'sell') || (btn.classList.contains('decompose') && inventoryBulkMode === 'decompose'));
      btn.disabled = !selectedPreview.count;
    });
    if (!player.inventory.length) {
      bagList.innerHTML = '<div class="empty-note">暂无装备，击败怪物可掉落</div>';
    } else {
      bagList.innerHTML = player.inventory.map((item, index) => {
        const targetIndex = Number(inventoryDetailTarget?.index);
        const active = (inventoryDetailTarget?.type === 'bag' || inventoryDetailTarget?.type === 'compare') && targetIndex === index;
        return drawBagItemCardDom(item, index, active);
      }).join('');
    }
    if (materialList) materialList.innerHTML = materialCardsHtmlDom();
    const detail = inventoryDetailItemDom();
    detailWrap.innerHTML = itemDetailHtmlDom(detail);
    if (detailLayer) detailLayer.classList.toggle('show', !!detail?.item);
    const bulkRoot = panel.querySelector('.bulk-confirm-root');
    if (bulkRoot) bulkRoot.innerHTML = bulkConfirmLayerHtmlDom();
    const detailCard = panel.querySelector('.inv-detail-card');
    const detailKey = detail?.item ? `${inventoryDetailTarget?.type || ''}:${inventoryDetailTarget?.index ?? ''}:${detail.item.name || ''}:${detail.item.enhanceLevel || 0}` : '';
    if (detailCard && detailKey !== inventoryDetailScrollKey) detailCard.scrollTop = 0;
    inventoryDetailScrollKey = detailKey;
    bindInventoryDetailActionsDom(panel, detailWrap);
    // 背包小图标：只响应真正点击；滑动超过阈值时不弹出详情，避免滚动时误触。
    bagList.querySelectorAll('.bag-item-card[data-index]').forEach(card => {
      bindInventoryTapDom(card, () => { inventoryDetailTarget = { type: 'bag', index: Number(card.dataset.index) }; renderInventoryDomPanel(); });
    });
    panel.querySelectorAll('[data-inv-tab]').forEach(btn => {
      bindPanelActionDom(btn, () => { inventoryTab = btn.dataset.invTab || 'equipment'; inventoryBulkConfirm = null; renderInventoryDomPanel(); });
    });
    if (bulkSelect) {
      bulkSelect.addEventListener('change', e => { inventoryBulkRarity = e.target.value; inventoryBulkConfirm = null; renderInventoryDomPanel(); });
      bulkSelect.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    }
    panel.querySelectorAll('[data-bulk-mode]').forEach(btn => {
      bindPanelActionDom(btn, () => { inventoryBulkMode = btn.dataset.bulkMode || 'sell'; inventoryBulkConfirm = null; renderInventoryDomPanel(); });
    });
    panel.querySelectorAll('[data-bulk-sell]').forEach(btn => {
      bindPanelActionDom(btn, () => bulkSellInventoryByRarityDom(inventoryBulkRarity));
    });
    panel.querySelectorAll('[data-bulk-decompose]').forEach(btn => {
      bindPanelActionDom(btn, () => bulkDecomposeInventoryByRarityDom(inventoryBulkRarity));
    });
  }
  function closeAllPanels() {
    showInventory = false;
    showCharacterPanel = false;
    characterPanelLastHtml = '';
    characterPanelTouchState = null;
    characterEquipmentDetailSlot = null;
    inventoryDetailTarget = null;
    inventoryBulkConfirm = null;
    inventoryDetailScrollKey = '';
    showSkillTreeUI = false;
    showArtifactUI = false;
    skillDetailModalOpen = false;
    const skillLayer = document.getElementById('skill-detail-layer');
    if (skillLayer) skillLayer.innerHTML = '';
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
      artifact: showArtifactUI,
      alchemy: showAlchemyUI,
      breakthrough: showBreakthroughUI,
    }[panel];
    closeAllPanels();
    if (wasOpen) return;
    if (panel === 'inventory') showInventory = true;
    if (panel === 'character') showCharacterPanel = true;
    if (panel === 'skills') showSkillTreeUI = true;
    if (panel === 'artifact') showArtifactUI = true;
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
      ? drawPanelFrame('🎒 背包', compact ? '装备库存 · 材料 · 分解售卖' : '物品容器 · 装备库存 · 材料库存 · 分解售卖', '#d4a0ff')
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
      slotH: compact ? 40 : 48,
      cardPadX: compact ? 9 : 12,
      cardPadY: compact ? 6 : 8,
      itemH: compact ? 46 : 52,
      itemGap: compact ? 7 : 8,
      rowH: compact ? 24 : 28,
    };
  }
   
   // Joystick state
   let joystick = { active: false, dx: 0, dy: 0, distance: 0 };
   let playerSpeed = 6.6;
   function setupTouchControls() {
     // ─── Full-screen floating joystick ───
     const touchControls = document.getElementById('touch-controls');
     const joystickZone = document.getElementById('joystick-zone');
     const joystickBase = document.getElementById('joystick-base');
     const joystickThumb = document.getElementById('joystick-thumb');
     if (!touchControls || !joystickZone || !joystickBase || !joystickThumb) return;
     let jsTouchId = null;
     let joystickOrigin = null;
     const resetJoystickVisual = () => {
       joystick.active = false;
       joystick.dx = 0;
       joystick.dy = 0;
       joystick.distance = 0;
       joystickOrigin = null;
       joystickZone.classList.remove('active');
       joystickZone.style.left = '';
       joystickZone.style.top = '';
       joystickZone.style.bottom = '';
       joystickZone.style.right = '';
       joystickThumb.style.transform = 'translate(-50%, -50%)';
     };
     function canStartMovement(e) {
       if (isInCombat() || isAnyPanelOpen()) return false;
       if (e.target.closest('#menu-bar, #more-menu, #action-buttons, button, .menu-btn, .more-menu-btn, .act-btn, input, select, textarea, a')) return false;
       return true;
     }
     function pointFromEvent(e, wantedId = jsTouchId) {
       const list = e.changedTouches || e.touches;
       if (list && list.length) {
         for (let i = 0; i < list.length; i++) {
           const t = list[i];
           if (wantedId === null || t.identifier === wantedId) return t;
         }
         return null;
       }
       return e;
     }
     function placeJoystickAt(touch) {
       const zoneW = joystickZone.offsetWidth || 96;
       const zoneH = joystickZone.offsetHeight || 96;
       const margin = 8;
       const x = Math.max(margin + zoneW / 2, Math.min(window.innerWidth - margin - zoneW / 2, touch.clientX));
       const y = Math.max(margin + zoneH / 2, Math.min(window.innerHeight - margin - zoneH / 2, touch.clientY));
       joystickOrigin = { x, y };
       joystickZone.style.left = `${x - zoneW / 2}px`;
       joystickZone.style.top = `${y - zoneH / 2}px`;
       joystickZone.style.bottom = 'auto';
       joystickZone.style.right = 'auto';
       joystickZone.classList.add('active');
     }
     function updateJoystickPos(touch) {
       if (!joystickOrigin) placeJoystickAt(touch);
       const rect = joystickBase.getBoundingClientRect();
       const maxR = Math.max(18, Math.min(rect.width, rect.height) / 2 - 12);
       let dx = touch.clientX - joystickOrigin.x;
       let dy = touch.clientY - joystickOrigin.y;
       let dist = Math.sqrt(dx * dx + dy * dy);
       if (dist > maxR) {
         dx = (dx / dist) * maxR;
         dy = (dy / dist) * maxR;
         dist = maxR;
       }
       const deadZone = 6;
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
     touchControls.addEventListener('touchstart', e => {
       if (jsTouchId !== null || !canStartMovement(e)) return;
       const t = e.changedTouches[0];
       jsTouchId = t.identifier;
       joystick.active = true;
       placeJoystickAt(t);
       updateJoystickPos(t);
       e.preventDefault();
     }, { passive: false });
     touchControls.addEventListener('touchmove', e => {
       if (jsTouchId === null) return;
       const t = pointFromEvent(e);
       if (t) updateJoystickPos(t);
       e.preventDefault();
     }, { passive: false });
     touchControls.addEventListener('touchend', e => {
       const t = pointFromEvent(e);
       if (!t) return;
       if (t.identifier === jsTouchId) {
         jsTouchId = null;
         resetJoystickVisual();
       }
     }, { passive: true });
     touchControls.addEventListener('touchcancel', () => {
       jsTouchId = null;
       resetJoystickVisual();
     }, { passive: true });
     touchControls.addEventListener('pointerdown', e => {
       if (e.pointerType === 'mouse' || jsTouchId !== null || !canStartMovement(e)) return;
       jsTouchId = 'pointer';
       joystick.active = true;
       placeJoystickAt(e);
       updateJoystickPos(e);
       e.preventDefault();
     });
     touchControls.addEventListener('pointermove', e => {
       if (jsTouchId !== 'pointer') return;
       updateJoystickPos(e);
       e.preventDefault();
     });
     touchControls.addEventListener('pointerup', () => {
       if (jsTouchId === 'pointer') {
         jsTouchId = null;
         resetJoystickVisual();
       }
     });
     touchControls.addEventListener('pointercancel', () => {
       if (jsTouchId === 'pointer') {
         jsTouchId = null;
         resetJoystickVisual();
       }
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
    const moreMenu = document.getElementById('more-menu');
    function closeMoreMenu() {
      if (!moreMenu) return;
      moreMenu.classList.remove('open');
      moreMenu.setAttribute('aria-hidden', 'true');
      syncMainNavState();
    }
    function toggleMoreMenu(e) {
      if (e) e.preventDefault();
      if (isInCombat() || isAnyPanelOpen() || !moreMenu) return;
      const open = !moreMenu.classList.contains('open');
      moreMenu.classList.toggle('open', open);
      moreMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
      syncMainNavState();
    }
    let menuLastTouchActionAt = 0;
    function bindTap(el, fn) {
      if (!el) return;
      el.addEventListener('touchstart', e => {
        menuLastTouchActionAt = Date.now();
        e.preventDefault();
        e.stopPropagation();
        fn(e);
      }, { passive: false });
      el.addEventListener('click', e => {
        // Mobile Safari/Chrome fires a synthetic click after touchstart.
        // For the More button that means: touch opens the sheet, click immediately closes it.
        if (Date.now() - menuLastTouchActionAt < 700) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        fn(e);
      });
    }
    function onBag() { closeMoreMenu(); openPanel('inventory'); }
    function onCharacter() { closeMoreMenu(); openPanel('character'); }
    function onSkills() { closeMoreMenu(); openPanel('skills'); }
    function onArtifact() { closeMoreMenu(); openPanel('artifact'); }
    function onAlchemy() { closeMoreMenu(); openPanel('alchemy'); }
    function onBreakthrough() { closeMoreMenu(); openPanel('breakthrough'); }
    function onSave() { closeMoreMenu(); saveGame(); showMessage('💾 存档已保存！', '#88cc88'); }
    bindTap(document.getElementById('btn-bag'), onBag);
    bindTap(document.getElementById('btn-character'), onCharacter);
    bindTap(document.getElementById('btn-skills'), onSkills);
    bindTap(document.getElementById('btn-more'), toggleMoreMenu);
    bindTap(document.getElementById('btn-artifact'), onArtifact);
    bindTap(document.getElementById('hud-artifact'), onArtifact);
    bindTap(document.getElementById('btn-alchemy'), onAlchemy);
    bindTap(document.getElementById('btn-break'), onBreakthrough);
    bindTap(document.getElementById('btn-save'), onSave);
    document.addEventListener('click', e => {
      if (!moreMenu?.classList.contains('open')) return;
      if (e.target.closest('#more-menu') || e.target.closest('#btn-more')) return;
      closeMoreMenu();
    });
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
      const slotKeys = typeof equipmentSlotKeys === 'function' ? equipmentSlotKeys() : Object.keys(SLOT_NAMES || {});
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
      const treeNames = Object.keys(SKILL_TREES);
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
     dungeon._chests = [];
     discoveredMap = new Set();
     visibleMap = new Set();
     resetDomMapCache();
     window.dungeon = dungeon;
     spawnMonsters(dungeon, dungeonLevel);
     scatterMaterials(dungeon, dungeonLevel);
     spawnTreasureChests(dungeon, dungeonLevel);
     // Boss floor notification
     if (isBossFloor(dungeonLevel)) {
       const boss = typeof getBossForLevel === 'function' ? getBossForLevel(dungeonLevel) : BOSSES.find(b => b.floor === dungeonLevel);
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

   function roomTypeAt(x, y) {
     return dungeon?.roomTypeByCell?.get?.(`${x},${y}`) || ROOM_TYPE?.NORMAL || 'normal';
   }

   function roomLabelForType(type) {
     switch (type) {
       case 'treasure': return { label: '宝藏房', cls: 'treasure' };
       case 'elite': return { label: '精英房', cls: 'elite' };
       case 'boss': return { label: 'Boss房', cls: 'boss' };
       default: return null;
     }
   }

   function findFreeRoomCell(room, avoid = () => false) {
     if (!room || !dungeon) return null;
     const cells = [];
     for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
       for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
         if (dungeon.grid?.[y]?.[x] === TILE.FLOOR && !avoid(x, y)) cells.push({ x, y });
       }
     }
     if (!cells.length) return null;
     return cells[Math.floor(Math.random() * cells.length)];
   }

   function spawnTreasureChests(dungeonObj, floorLevel = 1) {
     if (!dungeonObj) return [];
     dungeonObj._chests = dungeonObj._chests || [];
     const treasureRooms = (dungeonObj.rooms || []).filter(r => r.type === ROOM_TYPE.TREASURE);
     for (const room of treasureRooms) {
       const count = floorLevel >= 6 && room.w * room.h >= 56 ? 2 : 1;
       for (let i = 0; i < count; i++) {
         const cell = findFreeRoomCell(room, (x, y) =>
           dungeonObj._chests.some(c => c.x === x && c.y === y) ||
           dungeonObj._materials?.some?.(m => m.x === x && m.y === y) ||
           dungeonObj._monsters?.has?.(`${x},${y}`)
         );
         if (!cell) continue;
         dungeonObj._chests.push({
           ...cell,
           roomIndex: room.index,
           opened: false,
           name: floorLevel >= 8 ? '秘藏宝匣' : '宝藏木匣',
           rewardLevel: floorLevel,
         });
       }
     }
     return dungeonObj._chests;
   }

   function addChestRewardMaterial(msgParts, floorLevel) {
     if (typeof MATERIALS === 'undefined') return;
     const matCount = floorLevel >= 8 ? 3 : 2;
     for (let i = 0; i < matCount; i++) {
       const mat = (typeof generateMaterialDrop === 'function' && generateMaterialDrop()) || MATERIALS[Math.floor(Math.random() * Math.min(5, MATERIALS.length))];
       if (!mat) continue;
       playerMaterials[mat.id] = (playerMaterials[mat.id] || 0) + 1;
       msgParts.push(`🔹${mat.name}`);
     }
   }

   function checkTreasureChestPickup() {
     if (!dungeon?._chests?.length || !player) return false;
     const px = Math.floor(player.x);
     const py = Math.floor(player.y);
     const idx = dungeon._chests.findIndex(c => c.x === px && c.y === py);
     if (idx < 0) return false;
     const chest = dungeon._chests[idx];
     const rewardLevel = chest.rewardLevel || dungeonLevel;
     const stones = Math.ceil((18 + rewardLevel * 7) * (1 + Math.random() * 0.35));
     player.addSpiritStones(stones);
     const msgParts = [`💰${stones}灵石`];
     const maxInventory = typeof getInventoryCapacity === 'function' ? getInventoryCapacity(player) : 36;
     const lootRolls = rewardLevel >= 6 ? 2 : 1;
     for (let i = 0; i < lootRolls; i++) {
       if (player.inventory.length >= maxInventory) {
         msgParts.push(`⚠️背包已满(${maxInventory}格)`);
         break;
       }
       const item = generateEquipment(Math.max(1, rewardLevel + 1));
       if (item) {
         player.inventory.push(item);
         msgParts.push(`🎁${item.name}`);
       }
     }
     addChestRewardMaterial(msgParts, rewardLevel);
     dungeon._chests.splice(idx, 1);
     if (typeof resetDomMapCache === 'function') resetDomMapCache();
     showMessage(`开启${chest.name || '宝箱'}：${msgParts.join(' · ')}`, '#ffdd66');
     if (typeof sfxDrop === 'function') sfxDrop();
     autoSave();
     return true;
   }

   function roomTint(type) {
     switch (type) {
       case 'start': return 'rgba(130,210,255,0.13)';
       case 'treasure': return 'rgba(255,210,80,0.16)';
       case 'elite': return 'rgba(255,110,80,0.13)';
       case 'boss': return 'rgba(210,80,255,0.16)';
       default: return '';
     }
   }

   function updateMapVisibility() {
     if (!dungeon || !player) return;
     visibleMap.clear();
     const px = Math.floor(player.x);
     const py = Math.floor(player.y);
     const r = MAP_MEMORY_RADIUS;
     for (let y = Math.max(0, py - r); y <= Math.min(dungeon.height - 1, py + r); y++) {
       for (let x = Math.max(0, px - r); x <= Math.min(dungeon.width - 1, px + r); x++) {
         const dist = Math.hypot(x - px, y - py);
         if (dist <= MAP_VISION_RADIUS || (dist <= MAP_MEMORY_RADIUS && dungeon.grid[y][x] !== TILE.WALL)) {
           const key = `${x},${y}`;
           visibleMap.add(key);
           discoveredMap.add(key);
         }
       }
     }
     for (const room of dungeon.rooms || []) {
       if (Math.hypot(room.cx - px, room.cy - py) <= MAP_VISION_RADIUS + 2) {
         for (let y = room.y; y < room.y + room.h; y++) {
           for (let x = room.x; x < room.x + room.w; x++) {
             const key = `${x},${y}`;
             visibleMap.add(key);
             discoveredMap.add(key);
           }
         }
       }
     }
   }


   function resetDomMapCache() {
     mapRenderCache = {
       floorKey: '', boundsKey: '', visibilityKey: '', entityKey: '', hintKey: '', miniKey: '',
       lastPx: NaN, lastPy: NaN, tilesEl: null, entitiesEl: null, hintsEl: null, miniEl: null, playerEl: null,
       canvasFloorKey: '', canvasBoundsKey: '', canvasVisibilityKey: ''
     };
     const layer = document.getElementById('map-layer');
     if (layer) layer.innerHTML = '';
   }

   function domRoomClass(type) {
     return type === 'start' ? 'room-start' : type === 'treasure' ? 'room-treasure' : type === 'elite' ? 'room-elite' : type === 'boss' ? 'room-boss' : 'room-normal';
   }

   function domRoomEdgeClasses(x, y) {
     if (!dungeon?.roomTypeByCell?.has?.(`${x},${y}`)) return '';
     const c = [];
     if (!dungeon.roomTypeByCell.has(`${x},${y - 1}`)) c.push('edge-n');
     if (!dungeon.roomTypeByCell.has(`${x},${y + 1}`)) c.push('edge-s');
     if (!dungeon.roomTypeByCell.has(`${x - 1},${y}`)) c.push('edge-w');
     if (!dungeon.roomTypeByCell.has(`${x + 1},${y}`)) c.push('edge-e');
     return c.join(' ');
   }

   function ensureDomMapLayers(layer) {
     if (!mapRenderCache.entitiesEl || !mapRenderCache.entitiesEl.isConnected) {
       layer.innerHTML = '<div id="map-entities"></div><div id="map-hints"></div><div id="dom-minimap"></div>';
       mapRenderCache.tilesEl = null;
       mapRenderCache.entitiesEl = layer.querySelector('#map-entities');
       mapRenderCache.hintsEl = layer.querySelector('#map-hints');
       mapRenderCache.miniEl = layer.querySelector('#dom-minimap');
       mapRenderCache.playerEl = null;
       mapRenderCache.boundsKey = '';
       mapRenderCache.visibilityKey = '';
       mapRenderCache.entityKey = '';
       mapRenderCache.hintKey = '';
       mapRenderCache.miniKey = '';
     }
   }

   function mapTileHtml(x, y, tile, biome, key) {
     const alt = ((x * 13 + y * 17) % 7) < 3;
     const visible = visibleMap.has(key);
     const discovered = discoveredMap.has(key);
     const type = roomTypeAt(x, y);
     const fog = !discovered ? 'fog-undiscovered' : (!visible ? 'fog-memory' : '');
     const left = x * CELL_SIZE;
     const top = y * CELL_SIZE;
     if (tile === TILE.WALL) {
       const wv = ((x * 11 + y * 7) % 5) < 2 ? 'tile-wall-a' : 'tile-wall-b';
       return `<div class="map-tile ${wv} ${fog}" style="transform:translate3d(${left}px,${top}px,0)"></div>`;
     }
     const floorCls = `${alt ? 'tile-floor-a' : 'tile-floor-b'} ${domRoomClass(type)} ${domRoomEdgeClasses(x, y)}`;
     let inner = '';
     if ((x + y * 3) % 11 === 0) inner += '<i class="tile-speck"></i>';
     if (tile === TILE.STAIRS_DOWN) inner += '<b class="tile-stairs-icon">▽</b>';
     else if (type === 'treasure' && (x + y) % 9 === 0) inner += '<b class="tile-deco deco-treasure">✦</b>';
     else if (type === 'boss' && (x * 3 + y) % 10 === 0) inner += '<b class="tile-deco deco-boss">◆</b>';
     else if (biome?.id === 'jungle' && (x * 5 + y) % 13 === 0) inner += '<b class="tile-deco deco-jungle">⌁</b>';
     else if (biome?.id === 'snow' && (x * 7 + y) % 10 === 0) inner += '<b class="tile-deco deco-snow">✧</b>';
     else if (biome?.id === 'lava' && (x + y * 2) % 9 === 0) inner += '<i class="tile-lava-crack"></i>';
     return `<div class="map-tile ${floorCls} ${fog}" style="transform:translate3d(${left}px,${top}px,0)">${inner}</div>`;
   }

   function renderDomMapOverlay() {
     if (!dungeon || !player || !camera) return;
     const layer = document.getElementById('map-layer');
     if (!layer) return;
     const px = Math.floor(player.x);
     const py = Math.floor(player.y);
     const cellChanged = px !== mapRenderCache.lastPx || py !== mapRenderCache.lastPy;
     if (cellChanged || !mapRenderCache.visibilityKey) {
       updateMapVisibility();
       mapRenderCache.lastPx = px;
       mapRenderCache.lastPy = py;
     }
     const biome = dungeon.biome || getBiomeForLevel?.(dungeonLevel) || {};
     const floorKey = `${dungeonLevel}:${biome.id || ''}:${dungeon.width}x${dungeon.height}:${CELL_SIZE}`;
     if (floorKey !== mapRenderCache.floorKey) {
       resetDomMapCache();
       mapRenderCache.floorKey = floorKey;
     }
     ensureDomMapLayers(layer);
     layer.style.setProperty('--cs', `${CELL_SIZE}px`);
     layer.style.width = `${dungeon.width * CELL_SIZE}px`;
     layer.style.height = `${dungeon.height * CELL_SIZE}px`;
     layer.style.transform = `translate3d(${-Math.round(camera.x)}px,${-Math.round(camera.y)}px,0)`;
     const grid = dungeon.grid;
     const startCol = Math.max(0, Math.floor(camera.x / CELL_SIZE) - 3);
     const endCol = Math.min(grid[0].length, startCol + Math.ceil(canvasW / CELL_SIZE) + 6);
     const startRow = Math.max(0, Math.floor(camera.y / CELL_SIZE) - 3);
     const endRow = Math.min(grid.length, startRow + Math.ceil(canvasH / CELL_SIZE) + 6);
     const boundsKey = `${startCol},${endCol},${startRow},${endRow}`;
     const visibilityKey = `${boundsKey}:${discoveredMap.size}:${visibleMap.size}:${px},${py}`;
     mapRenderCache.boundsKey = boundsKey;
     mapRenderCache.visibilityKey = visibilityKey;
     renderDomMapEntities(startCol, endCol, startRow, endRow);
     renderDomMapHints(startCol, endCol, startRow, endRow);
     renderDomMiniMap(px, py);
   }

   function renderDomMap() {
     renderDomMapOverlay();
   }


   function renderDomMapEntities(startCol, endCol, startRow, endRow) {
     const parts = [];
     if (dungeon._materials) {
       for (const mat of dungeon._materials) {
         const key = `${mat.x},${mat.y}`;
         if (!visibleMap.has(key) || mat.x < startCol || mat.x >= endCol || mat.y < startRow || mat.y >= endRow) continue;
         parts.push(`<div class="map-material" style="--mat-color:${escapeHtml(mat.color || '#aaddff')};color:${escapeHtml(mat.color || '#aaddff')};transform:translate3d(${mat.x * CELL_SIZE}px,${mat.y * CELL_SIZE}px,0)">✦</div>`);
       }
     }
     if (dungeon._chests) {
       for (const chest of dungeon._chests) {
         const key = `${chest.x},${chest.y}`;
         if (!visibleMap.has(key) || chest.x < startCol || chest.x >= endCol || chest.y < startRow || chest.y >= endRow) continue;
         parts.push(`<div class="map-chest" style="transform:translate3d(${chest.x * CELL_SIZE}px,${chest.y * CELL_SIZE}px,0)"><span>宝</span></div>`);
       }
     }
     if (dungeon._monsters && !isInCombat()) {
       for (const [key, mon] of dungeon._monsters.entries()) {
         if (!visibleMap.has(key)) continue;
         const [mx, my] = key.split(',').map(Number);
         if (mx < startCol || mx >= endCol || my < startRow || my >= endRow) continue;
         const mobCls = mon.isBoss ? ' boss' : (mon.isElite ? ' elite' : '');
         parts.push(`<div class="map-monster${mobCls}" style="--mob-color:${escapeHtml(mon.color || '#c05060')};transform:translate3d(${mx * CELL_SIZE}px,${my * CELL_SIZE}px,0)"><span>${escapeHtml(mon.symbol || '妖')}</span></div>`);
       }
     }
     parts.push(`<div id="map-player"><i class="map-player-glow"></i><i class="map-player-body"></i><i class="map-player-head"></i><i class="map-player-eyes"><b></b><b></b></i></div>`);
     const entityKey = `${parts.length}:${dungeon._materials?.length || 0}:${dungeon._chests?.length || 0}:${dungeon._monsters?.size || 0}:${isInCombat() ? 1 : 0}:${mapRenderCache.visibilityKey}`;
     if (entityKey !== mapRenderCache.entityKey || !mapRenderCache.playerEl?.isConnected) {
       mapRenderCache.entitiesEl.innerHTML = parts.join('');
       mapRenderCache.playerEl = mapRenderCache.entitiesEl.querySelector('#map-player');
       mapRenderCache.entityKey = entityKey;
     }
     if (mapRenderCache.playerEl) {
       mapRenderCache.playerEl.style.transform = `translate3d(${player.x * CELL_SIZE}px,${player.y * CELL_SIZE}px,0)`;
     }
   }

   function renderDomMapHints(startCol, endCol, startRow, endRow) {
     const px = Math.floor(player?.x ?? 0);
     const py = Math.floor(player?.y ?? 0);
     const hints = [];
     for (let y = 0; y < dungeon.height; y++) {
       for (let x = 0; x < dungeon.width; x++) {
         if (dungeon.grid[y][x] === TILE.STAIRS_DOWN && discoveredMap.has(`${x},${y}`)) hints.push({ x, y, label: '出口', cls: 'exit' });
       }
     }
     if (dungeon._monsters) {
       let nearest = null;
       for (const [key, mon] of dungeon._monsters.entries()) {
         if (!visibleMap.has(key)) continue;
         const [x, y] = key.split(',').map(Number);
         const dist = Math.hypot(x - px, y - py);
         const label = mon.isBoss ? 'Boss' : (mon.isElite ? '精英' : '妖物');
         const cls = mon.isBoss ? 'boss' : (mon.isElite ? 'elite' : 'mob');
         if (!nearest || dist < nearest.dist) nearest = { x, y, dist, label, cls };
       }
       if (nearest) hints.push(nearest);
     }
     const html = hints.filter(h => h.x >= startCol && h.x < endCol && h.y >= startRow && h.y < endRow)
       .map(h => `<div class="map-hint ${h.cls}" style="transform:translate3d(${h.x * CELL_SIZE + CELL_SIZE / 2}px,${h.y * CELL_SIZE - 14}px,0)">${h.label}</div>`).join('');
     const hintKey = `${html.length}:${px},${py}:${mapRenderCache.visibilityKey}`;
     if (hintKey !== mapRenderCache.hintKey) {
       mapRenderCache.hintsEl.innerHTML = html;
       mapRenderCache.hintKey = hintKey;
     }
   }

   function renderDomMiniMap(px, py) {
     if (!mapRenderCache.miniEl) return;
     if (!dungeon || canvasW < 320) { mapRenderCache.miniEl.innerHTML = ''; return; }
     const scale = Math.max(2, Math.min(4, Math.floor(canvasW / 140)));
     const w = dungeon.width * scale;
     const h = dungeon.height * scale;
     if (w + 18 > canvasW || h > canvasH * 0.36) { mapRenderCache.miniEl.innerHTML = ''; return; }
     const miniKey = `${discoveredMap.size}:${visibleMap.size}:${dungeon._monsters?.size || 0}:${px},${py}:${scale}:${canvasW}x${canvasH}`;
     if (miniKey === mapRenderCache.miniKey) return;
     const cells = [];
     for (let y = 0; y < dungeon.height; y++) {
       for (let x = 0; x < dungeon.width; x++) {
         const key = `${x},${y}`;
         if (!discoveredMap.has(key)) continue;
         const tile = dungeon.grid[y][x];
         const type = roomTypeAt(x, y);
         const cls = tile === TILE.WALL ? 'mm-wall' : tile === TILE.STAIRS_DOWN ? 'mm-stairs' : `mm-${type || 'normal'}`;
         const dim = visibleMap.has(key) ? '' : ' mm-memory';
         cells.push(`<i class="${cls}${dim}" style="left:${x * scale}px;top:${y * scale}px;width:${scale}px;height:${scale}px"></i>`);
       }
     }
     if (dungeon._monsters) {
       for (const [key, mon] of dungeon._monsters.entries()) {
         if (!visibleMap.has(key)) continue;
         const [mx, my] = key.split(',').map(Number);
         cells.push(`<b class="${mon.isBoss ? 'mm-bossmark' : 'mm-mobmark'}" style="left:${mx * scale - 1}px;top:${my * scale - 1}px;width:${scale + 2}px;height:${scale + 2}px"></b>`);
       }
     }
     cells.push(`<em class="mm-player" style="left:${px * scale - 2}px;top:${py * scale - 2}px;width:${scale + 4}px;height:${scale + 4}px"></em>`);
     mapRenderCache.miniEl.style.width = `${w}px`;
     mapRenderCache.miniEl.style.height = `${h}px`;
     mapRenderCache.miniEl.innerHTML = cells.join('');
     mapRenderCache.miniKey = miniKey;
   }


   function applyTileFog(sx, sy, x, y) {
     const key = `${x},${y}`;
     if (!discoveredMap.has(key)) {
       ctx.fillStyle = 'rgba(3,6,14,0.88)';
       ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
       return false;
     }
     if (!visibleMap.has(key)) {
       ctx.fillStyle = 'rgba(5,10,22,0.42)';
       ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
     }
     return visibleMap.has(key);
   }

   function drawRoomEdge(sx, sy, x, y, type) {
     if (!dungeon?.roomTypeByCell?.has?.(`${x},${y}`)) return;
     const edgeColor = type === 'boss' ? 'rgba(230,120,255,0.38)' : type === 'treasure' ? 'rgba(255,220,90,0.34)' : type === 'elite' ? 'rgba(255,120,90,0.30)' : 'rgba(255,255,255,0.10)';
     ctx.strokeStyle = edgeColor;
     ctx.lineWidth = 1;
     ctx.beginPath();
     if (!dungeon.roomTypeByCell.has(`${x},${y - 1}`)) { ctx.moveTo(sx + 1, sy + 1); ctx.lineTo(sx + CELL_SIZE - 1, sy + 1); }
     if (!dungeon.roomTypeByCell.has(`${x},${y + 1}`)) { ctx.moveTo(sx + 1, sy + CELL_SIZE - 1); ctx.lineTo(sx + CELL_SIZE - 1, sy + CELL_SIZE - 1); }
     if (!dungeon.roomTypeByCell.has(`${x - 1},${y}`)) { ctx.moveTo(sx + 1, sy + 1); ctx.lineTo(sx + 1, sy + CELL_SIZE - 1); }
     if (!dungeon.roomTypeByCell.has(`${x + 1},${y}`)) { ctx.moveTo(sx + CELL_SIZE - 1, sy + 1); ctx.lineTo(sx + CELL_SIZE - 1, sy + CELL_SIZE - 1); }
     ctx.stroke();
   }

   function drawBiomeFloor(ctx, sx, sy, x, y, biome = {}) {
     const alt = ((x * 13 + y * 17) % 7) < 3;
     const type = roomTypeAt(x, y);
     const floorA = biome.floor || '#3b2846';
     const floorB = biome.floor2 || '#30243d';
     ctx.fillStyle = alt ? floorB : floorA;
     ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
     const grad = ctx.createLinearGradient(sx, sy, sx, sy + CELL_SIZE);
     grad.addColorStop(0, 'rgba(255,255,255,0.075)');
     grad.addColorStop(0.58, 'rgba(255,255,255,0)');
     grad.addColorStop(1, 'rgba(0,0,0,0.16)');
     ctx.fillStyle = grad;
     ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
     const tint = roomTint(type);
     if (tint) { ctx.fillStyle = tint; ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE); }
     ctx.fillStyle = 'rgba(255,255,255,0.07)';
     ctx.fillRect(sx + 1, sy + 1, CELL_SIZE - 2, 1);
     ctx.fillStyle = 'rgba(0,0,0,0.12)';
     ctx.fillRect(sx + 1, sy + CELL_SIZE - 3, CELL_SIZE - 2, 2);
     ctx.strokeStyle = biome.border || 'rgba(245,225,255,0.12)';
     ctx.strokeRect(sx + 0.5, sy + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
     drawRoomEdge(sx, sy, x, y, type);
     if ((x + y * 3) % 11 === 0) {
       ctx.fillStyle = biome.speck || 'rgba(255,255,255,0.25)';
       ctx.fillRect(sx + 3, sy + 3, 2, 2);
     }
     if (type === 'treasure' && (x + y) % 9 === 0) {
       ctx.fillStyle = 'rgba(255,225,100,0.45)';
       ctx.fillText('✦', sx + CELL_SIZE - 9, sy + 9);
     } else if (type === 'boss' && (x * 3 + y) % 10 === 0) {
       ctx.fillStyle = 'rgba(220,90,255,0.42)';
       ctx.fillText('◆', sx + 4, sy + CELL_SIZE - 5);
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
     if (!dungeon || !player || !camera) return;
     updateMapVisibility();
     const biome = dungeon.biome || getBiomeForLevel?.(dungeonLevel) || {};
     const grid = dungeon.grid;
     const startCol = Math.max(0, Math.floor(camera.x / CELL_SIZE) - 2);
     const endCol = Math.min(grid[0].length, startCol + Math.ceil(canvasW / CELL_SIZE) + 4);
     const startRow = Math.max(0, Math.floor(camera.y / CELL_SIZE) - 2);
     const endRow = Math.min(grid.length, startRow + Math.ceil(canvasH / CELL_SIZE) + 4);
     const px = Math.floor(player.x);
     const py = Math.floor(player.y);
     const floorKey = `${dungeonLevel}:${biome.id || ''}:${dungeon.width}x${dungeon.height}:${CELL_SIZE}`;
     const boundsKey = `${startCol},${endCol},${startRow},${endRow}:${Math.round(camera.x)},${Math.round(camera.y)}`;
     const visibilityKey = `${discoveredMap.size}:${visibleMap.size}:${px},${py}`;
     // Canvas 主地图每帧重画可见区域，DOM 只叠加动态单位/提示，降低移动时 DOM 重排成本。
     mapRenderCache.canvasFloorKey = floorKey;
     mapRenderCache.canvasBoundsKey = boundsKey;
     mapRenderCache.canvasVisibilityKey = visibilityKey;
     ctx.save();
     ctx.font = `bold ${Math.max(10, CELL_SIZE - 8)}px "KaiTi","SimSun",serif`;
     ctx.textAlign = 'center';
     ctx.textBaseline = 'middle';
     for (let y = startRow; y < endRow; y++) {
       for (let x = startCol; x < endCol; x++) {
         const sx = Math.round(x * CELL_SIZE - camera.x);
         const sy = Math.round(y * CELL_SIZE - camera.y);
         const tile = grid[y][x];
         if (tile === TILE.WALL) {
           const alt = ((x * 11 + y * 7) % 5) < 2;
           ctx.fillStyle = alt ? (biome.wall || '#514065') : (biome.wall2 || '#342a45');
           ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
           ctx.fillStyle = 'rgba(255,255,255,0.07)';
           ctx.fillRect(sx + 1, sy + 1, CELL_SIZE - 2, 2);
           ctx.fillStyle = 'rgba(0,0,0,0.18)';
           ctx.fillRect(sx + 1, sy + CELL_SIZE - 4, CELL_SIZE - 2, 3);
           ctx.strokeStyle = biome.border || 'rgba(210,170,255,0.30)';
           ctx.strokeRect(sx + 0.5, sy + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
         } else {
           drawBiomeFloor(ctx, sx, sy, x, y, biome);
           if (tile === TILE.STAIRS_DOWN) {
             const cx = sx + CELL_SIZE / 2;
             const cy = sy + CELL_SIZE / 2;
             ctx.save();
             ctx.shadowColor = 'rgba(255,190,70,0.9)';
             ctx.shadowBlur = 10;
             ctx.fillStyle = 'rgba(255,172,54,0.20)';
             ctx.beginPath();
             ctx.arc(cx, cy, CELL_SIZE * 0.48, 0, Math.PI * 2);
             ctx.fill();
             ctx.fillStyle = biome.stairs || '#ffcf5a';
             ctx.font = `bold ${Math.max(14, CELL_SIZE - 2)}px "KaiTi","SimSun",serif`;
             ctx.fillText('▽', cx, cy + 1);
             ctx.restore();
           }
         }
         applyTileFog(sx, sy, x, y);
       }
     }
     ctx.restore();
     renderDomMapOverlay();
   }

   function drawMapHints() {
     const px = Math.floor(player?.x ?? 0);
     const py = Math.floor(player?.y ?? 0);
     const hints = [];
     let stairs = null;
     for (let y = 0; y < dungeon.height; y++) {
       for (let x = 0; x < dungeon.width; x++) {
         if (dungeon.grid[y][x] === TILE.STAIRS_DOWN && discoveredMap.has(`${x},${y}`)) stairs = { x, y, label: '出口' };
       }
     }
     if (stairs) hints.push(stairs);
     for (const room of dungeon.rooms || []) {
       const meta = roomLabelForType(room.type);
       if (!meta) continue;
       const key = `${room.cx},${room.cy}`;
       if (discoveredMap.has(key) || visibleMap.has(key)) hints.push({ x: room.cx, y: room.cy, label: meta.label, cls: meta.cls });
     }
     if (dungeon._chests) {
       for (const chest of dungeon._chests) {
         const key = `${chest.x},${chest.y}`;
         if (visibleMap.has(key)) hints.push({ x: chest.x, y: chest.y, label: '宝箱', cls: 'treasure' });
       }
     }
     if (dungeon._monsters) {
       let nearest = null;
       for (const [key, mon] of dungeon._monsters.entries()) {
         const [x, y] = key.split(',').map(Number);
         if (!visibleMap.has(key)) continue;
         const dist = Math.hypot(x - px, y - py);
         if (!nearest || dist < nearest.dist) nearest = { x, y, dist, label: mon.isBoss ? 'Boss' : '妖物', boss: !!mon.isBoss };
       }
       if (nearest) hints.push(nearest);
     }
     ctx.save();
     ctx.textAlign = 'center';
     ctx.textBaseline = 'middle';
     ctx.font = 'bold 11px "KaiTi","SimSun",serif';
     for (const hint of hints) {
       const sx = hint.x * CELL_SIZE - camera.x + CELL_SIZE / 2;
       const sy = hint.y * CELL_SIZE - camera.y - 10;
       if (sx < 8 || sx > canvasW - 8 || sy < 20 || sy > canvasH - 140) continue;
       ctx.fillStyle = hint.boss ? 'rgba(120,30,150,0.86)' : 'rgba(20,28,42,0.78)';
       ctx.strokeStyle = hint.boss ? 'rgba(245,160,255,0.85)' : 'rgba(255,220,120,0.65)';
       ctx.lineWidth = 1;
       const w = hint.label.length * 12 + 14;
       ctx.beginPath();
       ctx.roundRect(sx - w / 2, sy - 9, w, 18, 8);
       ctx.fill();
       ctx.stroke();
       ctx.fillStyle = hint.boss ? '#ffd6ff' : '#ffeaa0';
       ctx.fillText(hint.label, sx, sy);
     }
     ctx.restore();
   }

   function drawMiniMap() {
     if (!dungeon || canvasW < 320) return;
     const scale = Math.max(2, Math.min(4, Math.floor(canvasW / 140)));
     const w = dungeon.width * scale;
     const h = dungeon.height * scale;
     const x0 = canvasW - w - 10;
     const y0 = 48;
     if (x0 < 8 || h > canvasH * 0.36) return;
     ctx.save();
     ctx.fillStyle = 'rgba(8,12,22,0.68)';
     ctx.strokeStyle = 'rgba(220,190,255,0.28)';
     ctx.lineWidth = 1;
     ctx.beginPath();
     ctx.roundRect(x0 - 5, y0 - 5, w + 10, h + 10, 8);
     ctx.fill();
     ctx.stroke();
     for (let y = 0; y < dungeon.height; y++) {
       for (let x = 0; x < dungeon.width; x++) {
         const key = `${x},${y}`;
         if (!discoveredMap.has(key)) continue;
         const tile = dungeon.grid[y][x];
         if (tile === TILE.WALL) ctx.fillStyle = 'rgba(80,70,95,0.42)';
         else if (tile === TILE.STAIRS_DOWN) ctx.fillStyle = '#ffdd55';
         else {
           const type = roomTypeAt(x, y);
           ctx.fillStyle = type === 'boss' ? '#b45cff' : type === 'treasure' ? '#f5c849' : type === 'elite' ? '#f06b56' : '#8fb0c8';
         }
         ctx.globalAlpha = visibleMap.has(key) ? 0.95 : 0.45;
         ctx.fillRect(x0 + x * scale, y0 + y * scale, scale, scale);
       }
     }
     ctx.globalAlpha = 1;
     if (dungeon._monsters) {
       for (const [key, mon] of dungeon._monsters.entries()) {
         if (!visibleMap.has(key)) continue;
         const [mx, my] = key.split(',').map(Number);
         ctx.fillStyle = mon.isBoss ? '#ff80ff' : '#ff5a5a';
         ctx.fillRect(x0 + mx * scale - 1, y0 + my * scale - 1, scale + 2, scale + 2);
       }
     }
     ctx.fillStyle = '#7dffb2';
     ctx.strokeStyle = 'rgba(0,0,0,0.75)';
     const px = x0 + Math.floor(player.x) * scale;
     const py = y0 + Math.floor(player.y) * scale;
     ctx.fillRect(px - 2, py - 2, scale + 4, scale + 4);
     ctx.strokeRect(px - 2.5, py - 2.5, scale + 5, scale + 5);
     ctx.restore();
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
    // Player is rendered in the DOM HD map layer for crisper mobile display.
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
     ctx.clearRect(0, 0, canvasW, canvasH);
     if (screenShake.duration > 0) {
       ctx.translate(screenShake.x, screenShake.y);
     }
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
        characterPanelLastHtml = '';
        closeCharacterDetailPopupDom();
        syncBodyPanelState();
      }
    });
    p.addEventListener('touchstart', e => {
      if (e.target.closest('.char-close')) {
        e.preventDefault();
        showCharacterPanel = false;
        characterPanelLastHtml = '';
        closeCharacterDetailPopupDom();
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
  function characterDetailDom() {
    const slot = characterEquipmentDetailSlot;
    const item = slot ? player.equipment?.[slot] : null;
    return item ? { type: 'detail', item, slot, label: SLOT_NAMES?.[slot]?.name || slot } : null;
  }
  function closeCharacterDetailPopupDom() {
    characterEquipmentDetailSlot = null;
    const popup = document.querySelector('#character-dom-panel .char-detail-popup-layer');
    if (popup) popup.remove();
    const p = document.getElementById('character-dom-panel');
    if (p) p.querySelectorAll('.char-equip-card.active').forEach(card => card.classList.remove('active'));
  }
  function showCharacterDetailPopupDom() {
    const p = document.getElementById('character-dom-panel');
    if (!p) return;
    const detail = characterDetailDom();
    if (!detail) { closeCharacterDetailPopupDom(); return; }
    let layer = p.querySelector('.char-detail-popup-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'char-detail-popup-layer';
      p.appendChild(layer);
      layer.addEventListener('click', e => {
        if (e.target === layer || e.target.closest('[data-popup-close]')) {
          e.preventDefault();
          closeCharacterDetailPopupDom();
        }
      });
      layer.addEventListener('touchstart', e => {
        if (e.target === layer || e.target.closest('[data-popup-close]')) {
          e.preventDefault();
          closeCharacterDetailPopupDom();
        }
        e.stopPropagation();
      }, { passive: false });
      layer.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    }
    const title = `${detail.label || '装备'}详情`;
    layer.innerHTML = `<div class="char-detail-popup-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <button class="popup-close" type="button" data-popup-close="1" aria-label="关闭详情">×</button>
      <div class="popup-title">${escapeHtml(title)}</div>
      <div class="char-detail-wrap">${itemDetailHtmlDom(detail)}</div>
    </div>`;
    bindInventoryDetailActionsDom(
      p,
      layer.querySelector('.char-detail-wrap'),
      () => characterDetailDom(),
      () => { characterPanelLastHtml = ''; renderCharacterDomPanel(); showCharacterDetailPopupDom(); },
      () => { closeCharacterDetailPopupDom(); }
    );
  }
  function bindCharacterPanelActionsDom(p) {
    if (!p) return;
    p.querySelectorAll('[data-char-tab]').forEach(btn => {
      bindPanelActionDom(btn, () => {
        characterTab = btn.dataset.charTab || 'attributes';
        characterPanelLastHtml = '';
        closeCharacterDetailPopupDom();
        renderCharacterDomPanel();
      });
    });
    p.querySelectorAll('.char-equip-card[data-char-equip-slot]').forEach(card => {
      bindInventoryTapDom(card, () => {
        const slot = card.dataset.charEquipSlot;
        if (!player.equipment?.[slot]) return;
        characterEquipmentDetailSlot = slot;
        p.querySelectorAll('.char-equip-card.active').forEach(el => el.classList.remove('active'));
        card.classList.add('active');
        showCharacterDetailPopupDom();
      });
    });
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
  function getEquipmentSetRowsDom() {
    if (!player || typeof getActiveSetBonuses !== 'function') return '<div class="set-summary empty">暂无套装效果</div>';
    const bonuses = getActiveSetBonuses(player.equipment || {});
    if (!bonuses.length) return '<div class="set-summary empty">暂无套装效果</div>';
    const grouped = {};
    bonuses.forEach(bonus => {
      const id = bonus.setId || bonus.setName || 'set';
      if (!grouped[id]) grouped[id] = { name: bonus.setName || '套装', icon: bonus.setIcon || '◇', color: bonus.setColor || '#d4a0ff', rows: [] };
      grouped[id].rows.push(bonus);
    });
    return Object.values(grouped).map(set => `<div class="set-summary" style="--set-color:${escapeHtml(set.color)}">
      <div class="set-summary-title"><span>${escapeHtml(set.icon)} ${escapeHtml(set.name)}</span><small>${Math.max(...set.rows.map(r => Number(r.owned || 0)))}/8</small></div>
      ${set.rows.map(row => `<div class="set-summary-row ${row.active ? 'active' : ''}"><b>${row.count}件</b><span>${escapeHtml(row.label || '')}</span></div>`).join('')}
    </div>`).join('');
  }
  function scrollCharacterDetailIntoViewDom() {
    const p = document.getElementById('character-dom-panel');
    const section = p?.querySelector('.char-focus-detail');
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderCharacterDomPanel() {
    const p = ensureCharacterDomPanel();
    if (!showCharacterPanel) return;
    const realm = player.realm?.name || '炼气期';
    const isMaxRealm = player.realmIndex >= REALMS.length - 1;
    const nextXp = isMaxRealm ? 0 : (typeof getRealmThreshold === 'function') ? getRealmThreshold((player.realmIndex || 0) + 1) : 0;
    const xpPct = nextXp ? Math.min(100, Math.max(0, player.xp / nextXp * 100)) : (isMaxRealm ? 100 : 0);
    const slotKeys = typeof equipmentSlotKeys === 'function' ? equipmentSlotKeys() : Object.keys(SLOT_NAMES || {});
    if (characterEquipmentDetailSlot && !slotKeys.includes(characterEquipmentDetailSlot)) characterEquipmentDetailSlot = null;
    const slots = slotKeys.map(slot => {
      const item = player.equipment?.[slot];
      const slotInfo = SLOT_NAMES?.[slot] || { name: slot, icon: itemIconDom(null, slot) };
      const stats = item ? itemPrimaryStatsHtmlDom(item, 2) : '<span class="stat-chip empty">空槽位</span>';
      const color = item ? (item.rarityColor || '#d4a0ff') : '#5a4b68';
      const level = item ? equipmentEnhanceLevelDom(item) : 0;
      const active = characterEquipmentDetailSlot === slot;
      const displayName = item ? `${item.name}${level > 0 ? ` +${level}` : ''}` : '未装备';
      return `<button class="char-equip-card${item ? '' : ' empty'}${active ? ' active' : ''}" type="button" data-char-equip-slot="${escapeHtml(slot)}" style="--rarity-color:${escapeHtml(color)}" aria-label="查看${escapeHtml(slotInfo.name)}详情">
        <div class="eq-icon"><span>${escapeHtml(item ? itemIconDom(item, slot) : (slotInfo.icon || itemIconDom(null, slot)))}</span>${item ? `<i>${escapeHtml(rarityShortDom(item.rarity))}</i>` : '<i>空</i>'}</div>
        <div class="eq-info"><div class="eq-name-row"><b>${escapeHtml(slotInfo.name)}</b><span>${escapeHtml(displayName)}</span></div><div class="eq-stats">${stats}</div></div>
      </button>`;
    }).join('');
    const detailItem = characterDetailDom()?.item || null;
    const tabKeys = ['equipment', 'attributes', 'bonus', 'sets'];
    if (!tabKeys.includes(characterTab)) characterTab = 'attributes';
    const equipmentPanel = `<section class="char-tab-panel char-equipment-section top-equipment" data-char-tab-panel="equipment"><h3>当前装备 <small>点击已装备槽位，直接弹出详情卡片</small></h3><div class="char-equip-grid">${slots}</div></section>`;
    const attributesPanel = `<section class="char-tab-panel" data-char-tab-panel="attributes">
      <div class="char-section char-realm">
        <div class="realm-top"><div><div class="realm-name">${realm}</div><div class="xptext">第 ${dungeonLevel} 层 · 坐标 (${Math.floor(player.x)}, ${Math.floor(player.y)})</div></div><div class="stones">灵石 ${player.spiritStones || 0}</div></div>
        <div class="xpbar"><i style="width:${xpPct}%"></i></div><div class="xptext">${isMaxRealm ? '已登顶峰' : `经验 ${player.xp || 0} / ${nextXp || 0}`}</div>
      </div>
      <div class="char-stats-grid">
        <div><b>${player.hp}</b><span>/ ${player.maxHp}</span><em>生命</em></div>
        <div><b>${player.mp}</b><span>/ ${player.maxMp}</span><em>灵力</em></div>
        <div><b>${player.atk}</b><span></span><em>攻击</em></div>
        <div><b>${player.def}</b><span></span><em>防御</em></div>
        <div><b>${Number(typeof getEquipmentAbility === 'function' ? getEquipmentAbility('crit') : (player.crit || 0))}</b><span>%</span><em>暴击</em></div>
        <div><b>${Number(typeof getEquipmentAbility === 'function' ? getEquipmentAbility('dodge') : (player.dodge || 0))}</b><span>%</span><em>闪避</em></div>
        <div><b>${Number(typeof getEquipmentAbility === 'function' ? getEquipmentAbility('speed') : (player.speed || 0))}</b><span></span><em>速度</em></div>
        <div><b>${availableSkillPoints || 0}</b><span></span><em>技能点</em></div>
        <div><b>${(player.inventory || []).length}</b><span></span><em>背包装备</em></div>
      </div>
    </section>`;
    const bonusPanel = `<section class="char-tab-panel" data-char-tab-panel="bonus"><div class="char-section"><h3>装备加成</h3><div class="bonus-list">${getEquipmentBonusRows()}</div></div></section>`;
    const setsPanel = `<section class="char-tab-panel" data-char-tab-panel="sets"><div class="char-section"><h3>套装效果</h3><div class="char-set-list">${getEquipmentSetRowsDom()}</div></div></section>`;
    const html = `
      <div class="char-head"><div><div class="char-title">👤 角色</div><div class="char-sub">装备 · 属性 · 加成 · 套装</div></div><button class="char-close">×</button></div>
      <div class="char-tabs" role="tablist"><button class="char-tab" type="button" data-char-tab="equipment">装备</button><button class="char-tab" type="button" data-char-tab="attributes">属性</button><button class="char-tab" type="button" data-char-tab="bonus">加成</button><button class="char-tab" type="button" data-char-tab="sets">套装</button></div>
      <div class="char-body" data-active-char-tab="${escapeHtml(characterTab)}">
        ${equipmentPanel}
        ${attributesPanel}
        ${bonusPanel}
        ${setsPanel}
      </div>`;
    if (html !== characterPanelLastHtml) {
      const body = p.querySelector('.char-body');
      const previousScrollTop = body ? body.scrollTop : 0;
      p.innerHTML = html;
      const nextBody = p.querySelector('.char-body');
      if (nextBody) nextBody.scrollTop = previousScrollTop;
      p.querySelectorAll('.char-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.charTab === characterTab));
      p.querySelectorAll('[data-char-tab-panel]').forEach(section => section.classList.toggle('active', section.dataset.charTabPanel === characterTab));
      characterPanelLastHtml = html;
      bindCharacterPanelActionsDom(p);
      if (detailItem) showCharacterDetailPopupDom();
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
    const slotLabels = Object.fromEntries((typeof equipmentSlotKeys === 'function' ? equipmentSlotKeys() : Object.keys(SLOT_NAMES || {})).map(slot => [slot, SLOT_NAMES?.[slot] || { icon: itemIconDom(null, slot), name: slot }]));
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
    const inventoryCapacity = typeof getInventoryCapacity === 'function' ? getInventoryCapacity(player) : 36;
    const nextCapacityUnlock = typeof getNextInventoryCapacityUnlock === 'function' ? getNextInventoryCapacityUnlock(player) : null;
    ctx.fillText(`背包 ${player.inventory.length}/${inventoryCapacity}`, rightX, invTitleY);
    if (nextCapacityUnlock) {
      ctx.fillStyle = '#a897b8';
      ctx.font = `${compact ? 9 : 10}px monospace`;
      ctx.fillText(`${nextCapacityUnlock.realmName}解锁${nextCapacityUnlock.capacity}格`, rightX, invTitleY + (compact ? 12 : 14));
    }

    let invY = invTitleY + (nextCapacityUnlock ? (compact ? 24 : 30) : (compact ? 12 : 16));
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
      const itemIcon = item.icon || { weapon: '⚔️', helmet: '⛑️', armor: '🛡️', gloves: '🧤', belt: '🪢', pants: '👖', boots: '🥾', accessory: '💍' }[item.slot] || '■';
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
        skillDetailModalOpen = false;
        const layer = document.getElementById('skill-detail-layer');
        if (layer) layer.innerHTML = '';
        syncBodyPanelState();
      }
    });
    p.addEventListener('touchstart', e => {
      if (e.target.closest('.skill-node, .skill-learn-btn, .skill-forget-btn, .attr-btn, .pclose')) {
        e.stopPropagation();
      }
    }, { passive: true });
    document.body.appendChild(p);
    return p;
  }
  function ensureSkillDetailLayer() {
    let layer = document.getElementById('skill-detail-layer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'skill-detail-layer';
    layer.addEventListener('touchstart', e => {
      if (e.target.closest('.skill-detail-modal, .skill-modal-close, .skill-learn-btn, .skill-forget-btn')) {
        skillsLastTouchActionAt = Date.now();
        e.stopPropagation();
      }
    }, { passive: true });
    layer.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    layer.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    document.body.appendChild(layer);
    return layer;
  }
  function skillTreeShortName(treeName) {
    return String(treeName || '').replace(/[🔥💧⚡⚔️\s]/g, '').replace('功法', '').replace('之道', '') || '技能';
  }
  function skillRealmName(idx) {
    return (REALMS && REALMS[idx] && REALMS[idx].name) ? REALMS[idx].name : `境界${idx + 1}`;
  }
  function getActualSkillMpCostDom(skill) {
    if (!skill) return 0;
    const mult = typeof getDoctrineMpCostMultiplier === 'function' ? getDoctrineMpCostMultiplier(skill) : 1;
    return Math.max(0, Math.floor((skill.mpCost || 0) * mult));
  }
  function getSkillEstimatedValuesDom(skill, enemy = null) {
    if (!skill || !player) return { damage: '—', mpCost: 0, chips: [] };
    const mpCost = getActualSkillMpCostDom(skill);
    const hits = Math.max(1, Number(skill.hits || 1));
    const doctrineBonus = typeof getDoctrineSkillDamageBonus === 'function' ? getDoctrineSkillDamageBonus(skill) : 0;
    const pierce = Math.min(0.85, Number(skill.armorPierce || 0) + (typeof getPassiveArmorPierce === 'function' ? getPassiveArmorPierce() : 0));
    const defMult = enemy && typeof getEnemyDefenseMultiplier === 'function' ? getEnemyDefenseMultiplier() : 1;
    const enemyDef = enemy ? Math.max(0, Math.floor((enemy.def || 0) * defMult * (1 - pierce))) : 0;
    const dmgMult = Number(skill.dmgMult || 0);
    const basePerHit = dmgMult > 0 ? Math.max(1, Math.floor(player.atk * (dmgMult * (1 + doctrineBonus)) / hits - enemyDef)) : 0;
    const low = dmgMult > 0 ? Math.max(1, (basePerHit - 3) * hits) : 0;
    const high = dmgMult > 0 ? Math.max(low, (basePerHit + 3) * hits) : 0;
    const critPct = Math.round((0.15 + Number(skill.critBonus || 0) + (typeof getPassiveCritBonus === 'function' ? getPassiveCritBonus() : 0)) * 100);
    const chips = [];
    if (dmgMult > 0) chips.push(['预计伤害', low === high ? `${low}` : `${low}-${high}`]);
    if (hits > 1) chips.push(['段数', `${hits}段`]);
    if (pierce > 0) chips.push(['破防', `${Math.round(pierce * 100)}%`]);
    if (dmgMult > 0) chips.push(['暴击', `${critPct}%`]);
    for (const eff of skill.effects || []) {
      if (eff.type === 'burn' || eff.type === 'bleed') {
        const amp = eff.type === 'burn' && typeof getPassiveBurnAmp === 'function' ? getPassiveBurnAmp() : 0;
        const tick = Math.max(1, Math.floor(player.atk * Number(eff.ratio || 0.15) * (1 + amp)));
        chips.push([eff.type === 'burn' ? '灼烧' : '流血', `${tick}/回合×${eff.turns || 2}`]);
      } else if (eff.type === 'weaken') chips.push(['虚弱', `${Math.round((eff.ratio || 0.15) * 100)}%×${eff.turns || 2}回合`]);
      else if (eff.type === 'defBreak') chips.push(['破甲', `${Math.round((eff.ratio || 0.15) * 100)}%×${eff.turns || 2}回合`]);
      else if (eff.type === 'freeze') chips.push(['冻结', `${Math.round((eff.chance ?? 1) * 100)}%×${eff.turns || 1}回合`]);
      else if (eff.type === 'stunChance') chips.push(['麻痹', `${Math.round((eff.chance ?? 0.25) * 100)}%×${eff.turns || 1}回合`]);
      else if (eff.type === 'healSelf') chips.push(['治疗', `${Math.floor(player.maxHp * (eff.ratio || 0.15))}`]);
      else if (eff.type === 'guard') chips.push(['护盾', `${Math.round((eff.ratio || 0.25) * 100)}%×${eff.turns || 2}回合`]);
      else if (eff.type === 'splash') chips.push(['溅射', `${eff.count || 2}目标×${Math.round((eff.ratio || 0.35) * 100)}%`]);
      else if (eff.type === 'execute') chips.push(['斩杀', `生命≤${Math.round((eff.ratio || 0.1) * 100)}%`]);
      else if (eff.type === 'refundOnKill') chips.push(['击杀返灵', `${Math.round((eff.ratio || 0.4) * 100)}%`]);
      else if (eff.type === 'passiveStat') chips.push(['被动属性', `${statLabelDom(eff.stat)} +${Math.round((eff.value || 0) * 100)}%`]);
      else if (eff.type === 'burnAmp') chips.push(['灼烧强化', `+${Math.round((eff.value || 0) * 100)}%`]);
      else if (eff.type === 'critBonusPassive') chips.push(['暴击精通', `+${Math.round((eff.value || 0) * 100)}%`]);
      else if (eff.type === 'armorPiercePassive') chips.push(['破甲精通', `+${Math.round((eff.value || 0) * 100)}%`]);
      else if (eff.type === 'turnMpRegen') chips.push(['回合回灵', `${Math.max(1, Math.floor(player.maxMp * (eff.ratio || 0.03)))}`]);
      else if (eff.type === 'lowHpHeal') chips.push(['濒死触发', `血量≤${Math.round((eff.threshold || 0.3) * 100)}%`]);
      else if (eff.type === 'victoryRecover') chips.push(['击杀回元', `命${Math.round((eff.hpRatio || 0) * 100)}% 灵${Math.round((eff.mpRatio || 0) * 100)}%`]);
    }
    return { damage: low ? (low === high ? `${low}` : `${low}-${high}`) : '—', mpCost, chips };
  }
  function skillValueChipsHtmlDom(skill, enemy = null) {
    const values = getSkillEstimatedValuesDom(skill, enemy);
    return values.chips.map(([k, v]) => `<span><em>${escapeHtml(k)}</em><b>${escapeHtml(v)}</b></span>`).join('');
  }
  function skillNodeState(tree, row) {
    const skill = SKILL_TREES[tree].skills[row];
    const learned = learnedSkills.some(s => s.tree === tree && s.index === row);
    const locked = skill.unlockRealm > player.realmIndex;
    const prereqs = typeof getSkillPrereqs === 'function' ? getSkillPrereqs(tree, row) : (row === 0 ? [] : [row - 1]);
    const prereqMet = typeof areSkillPrereqsMet === 'function' ? areSkillPrereqsMet(tree, row) : (row === 0 || learnedSkills.some(s => s.tree === tree && s.index === row - 1));
    const requiredByLearned = typeof isSkillRequiredByLearned === 'function' ? isSkillRequiredByLearned(tree, row) : learnedSkills.some(s => s.tree === tree && s.index === row + 1);
    const canLearn = !learned && !locked && prereqMet && availableSkillPoints > 0;
    const canForget = learned && !requiredByLearned;
    const blocked = !learned && !locked && !prereqMet;
    return { skill, learned, locked, canLearn, canForget, blocked, prereqs };
  }
  function renderSkillsDomPanel() {
    const p = ensureSkillsDomPanel();
    const treeNames = Object.keys(SKILL_TREES);
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
    const selectedReqText = selectedState.prereqs?.length ? selectedState.prereqs.map(i => SKILL_TREES[selectedTree].skills[i]?.name).filter(Boolean).join(' / ') : '无';
    const selectedStatus = selectedState.learned ? '已习得' : selectedState.locked ? `需${skillRealmName(selectedSkill.unlockRealm)}` : selectedState.blocked ? `前置：${selectedReqText}` : selectedState.canLearn ? '可学习' : '技能点不足';
    const selectedKind = selectedSkill.kind || 'active';
    const selectedKindLabel = SKILL_KIND_LABELS[selectedKind] || '技能';
    const selectedSummary = getSkillEffectSummary(selectedSkill);
    const selectedEffectText = selectedSkill.effectText || selectedSummary;
    const learnedCount = learnedSkills.length;
    const totalCount = treeNames.reduce((n, t) => n + SKILL_TREES[t].skills.length, 0);
    const selectedReqTextSafe = escapeHtml(selectedReqText);
    const detailTagsHtml = selectedSummary.split(' · ').map(t => `<span>${escapeHtml(t)}</span>`).join('');
    const skillDmgText = selectedSkill.dmgMult ? `×${selectedSkill.dmgMult}${selectedSkill.hits ? ` / ${selectedSkill.hits}段` : ''}` : '—';
    const detailHtml = `<div class="detail-kicker">${escapeHtml(selectedData.name)} · 第 ${selectedIndex + 1} 阶 · ${escapeHtml(selectedKindLabel)}</div>
        <div class="detail-title">${escapeHtml(selectedSkill.icon || '✦')} ${escapeHtml(selectedSkill.name)}</div>
        <div class="detail-status ${selectedState.learned ? 'ok' : selectedState.canLearn ? 'ready' : 'no'}">${escapeHtml(selectedStatus)}</div>
        <p class="detail-desc">${escapeHtml(selectedSkill.desc)}</p>
        <p class="detail-effect">${escapeHtml(selectedEffectText)}</p>
        <div class="detail-tags">${detailTagsHtml}</div>
        <div class="detail-stats compact-stats">
          <span>类型 <b>${escapeHtml(selectedKindLabel)}</b></span>
          <span>灵力 <b>${escapeHtml(getActualSkillMpCostDom(selectedSkill))}</b></span>
          <span>伤害 <b>${escapeHtml(skillDmgText)}</b></span>
          <span>境界 <b>${escapeHtml(skillRealmName(selectedSkill.unlockRealm))}</b></span>
          <span>前置 <b>${selectedReqTextSafe}</b></span>
        </div>
        <div class="skill-value-grid">${skillValueChipsHtmlDom(selectedSkill, currentEnemy)}</div>
        <div class="skill-action-row">
          <button class="skill-learn-btn" data-tree="${escapeHtml(selectedTree)}" data-index="${selectedIndex}" ${selectedState.canLearn ? '' : 'disabled'}>${selectedState.learned ? '已点亮' : selectedState.canLearn ? '消耗 1 点技能点学习' : '暂不可学习'}</button>
          <button class="skill-forget-btn" data-tree="${escapeHtml(selectedTree)}" data-index="${selectedIndex}" ${selectedState.canForget ? '' : 'disabled'}>${selectedState.learned ? (selectedState.canForget ? '遗忘并返还 1 点' : '有后续技能，不能遗忘') : '未学习'}</button>
        </div>`;
    let html = `<div class="panel-head skill-panel-head">
      <span class="ptitle" style="color:#d4a0ff">📜 星盘技能树</span>
      <span class="psub">技能点 ${availableSkillPoints} · 已悟 ${learnedCount}/${totalCount}</span>
      <button class="pclose">×</button>
    </div>
    <div class="panel-body skills-panel-body">
      <div class="skill-orbit-board">`;
    treeNames.forEach(tree => {
      const td = SKILL_TREES[tree];
      html += `<section class="skill-branch branch-${cssClassToken(tree)}" style="--branch-color:${safeCssColor(td.color)}">
        <div class="skill-branch-title"><span>${escapeHtml(td.name)}</span><em>${escapeHtml(skillTreeShortName(td.name))}</em></div>
        <div class="skill-path branch-layout">`;
      td.skills.forEach((skill, row) => {
        const st = skillNodeState(tree, row);
        const slot = typeof getSkillBranchSlot === 'function' ? getSkillBranchSlot(skill, row) : `n${row}`;
        const slotLabel = typeof getSkillBranchLabel === 'function' ? getSkillBranchLabel(slot) : '分支';
        const cls = ['skill-node', `branch-slot-${slot}`];
        if (st.learned) cls.push('learned');
        if (st.locked) cls.push('locked');
        if (st.canLearn) cls.push('learnable');
        if (st.blocked) cls.push('blocked');
        if (selectedTree === tree && selectedIndex === row) cls.push('selected');
        const icon = st.learned ? '✦' : st.locked ? '🔒' : st.blocked ? '◇' : (skill.icon || '＋');
        const reqNames = st.prereqs?.map(i => SKILL_TREES[tree].skills[i]?.name).filter(Boolean).join('/') || '';
        const hint = st.learned ? '已激活' : st.locked ? skillRealmName(skill.unlockRealm) : st.blocked ? `需${reqNames}` : st.canLearn ? '可点亮' : '缺点数';
        const kind = skill.kind || 'active';
        const kindLabel = SKILL_KIND_LABELS[kind] || '技能';
        html += `<button class="${cls.map(c => cssClassToken(c)).join(' ')} kind-${cssClassToken(kind)}" data-tree="${escapeHtml(tree)}" data-index="${row}" aria-label="${escapeHtml(skill.name)}">
          <span class="node-ring"><b>${escapeHtml(icon)}</b></span>
          <span class="node-copy">
            <span class="node-name">${escapeHtml(skill.name)}</span>
            <span class="node-meta"><i>${escapeHtml(slotLabel)}</i><i>${escapeHtml(kindLabel)}</i><small>${escapeHtml(hint)}</small></span>
          </span>
        </button>`;
      });
      html += `</div></section>`;
    });
    html += `</div>
      <aside class="skill-detail-card" style="--branch-color:${safeCssColor(selectedData.color)}">
        ${detailHtml}
      </aside>
      <div class="attr-bar skill-attr-bar">
        <span class="attr-title">属性加点</span>`;
    const attrBtns = [['atk','攻+3','#ff6644'],['def','防+2','#4488ff'],['hp','命+20','#55ff55'],['mp','灵+10','#aaddff']];
    for (const [k,label,clr] of attrBtns) {
      const dis = availableSkillPoints <= 0 ? ' disabled' : '';
      html += `<button class="attr-btn${dis}" data-attr="${k}" style="--attr-color:${safeCssColor(clr)};border-color:${safeCssColor(clr)};color:${safeCssColor(clr)}">${escapeHtml(label)}</button>`;
    }
    html += `</div></div>`;
    p.innerHTML = html;
    const detailLayer = ensureSkillDetailLayer();
    detailLayer.innerHTML = skillDetailModalOpen ? `<div class="skill-modal-backdrop"><aside class="skill-detail-card skill-detail-modal" style="--branch-color:${safeCssColor(selectedData.color)}">
        <button class="skill-modal-close" aria-label="关闭技能详情">×</button>
        ${detailHtml}
      </aside></div>` : '';
    // Click backdrop or close button to dismiss modal
    const backdropEl = detailLayer.querySelector('.skill-modal-backdrop');
    if (backdropEl) {
      backdropEl.addEventListener('click', e => {
        if (e.target === backdropEl || e.target.closest('.skill-modal-close')) {
          skillDetailModalOpen = false;
          renderSkillsDomPanel();
        }
      }, { once: true });
    }
    p.querySelectorAll('.skill-node').forEach(el => {
      const openSkillDetail = () => {
        selectedSkillTreeNode = { tree: el.dataset.tree, index: parseInt(el.dataset.index, 10) || 0 };
        // 只响应真正点击；滑动技能树时不弹详情，避免滚动误触。
        skillDetailModalOpen = true;
        renderSkillsDomPanel();
      };
      bindInventoryTapDom(el, openSkillDetail);
    });
    document.querySelectorAll('#skills-dom-panel .skill-learn-btn:not([disabled]), #skill-detail-layer .skill-learn-btn:not([disabled])').forEach(el => {
      const fn = () => {
        const t = el.dataset.tree, idx = parseInt(el.dataset.index, 10) || 0;
        if (learnSkill(t, idx)) {
          showMessage(`习得技能: 【${SKILL_TREES[t].skills[idx].name}】！`, '#ffdd44');
          selectedSkillTreeNode = { tree: t, index: idx };
          skillDetailModalOpen = true;
          renderSkillsDomPanel();
        }
      };
      bindInventoryTapDom(el, fn);
    });
    document.querySelectorAll('#skills-dom-panel .skill-forget-btn:not([disabled]), #skill-detail-layer .skill-forget-btn:not([disabled])').forEach(el => {
      const fn = () => {
        const t = el.dataset.tree, idx = parseInt(el.dataset.index, 10) || 0;
        if (typeof unlearnSkill === 'function' && unlearnSkill(t, idx)) {
          showMessage(`遗忘技能: 【${SKILL_TREES[t].skills[idx].name}】，返还 1 点技能点`, '#aaddff');
          selectedSkillTreeNode = { tree: t, index: idx };
          skillDetailModalOpen = true;
          renderSkillsDomPanel();
        }
      };
      bindInventoryTapDom(el, fn);
    });
    p.querySelectorAll('.attr-btn:not(.disabled)').forEach(el => {
      const fn = () => { allocateAttr(el.dataset.attr); renderSkillsDomPanel(); };
      bindInventoryTapDom(el, fn);
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
    for (const mat of MATERIALS) {
      const c = playerMaterials[mat.id] || 0;
      if (c > 0) {
        html += `<div class="mat-row" style="color:${safeCssColor(mat.color, '#d4c8b0')}">${escapeHtml(mat.name)} x${escapeHtml(c)}</div>`;
        shown++;
      }
    }
    if (!shown) html += '<div class="mat-row" style="color:#666">(空)</div>';
    html += '</div></div><div><div class="alch-section-title" style="color:#ff8844">丹方</div><div class="recipe-list">';
    for (let i = 0; i < RECIPES.length; i++) {
      const r = RECIPES[i];
      let canCraft = true;
      for (const [mid, req] of Object.entries(r.materials)) { if ((playerMaterials[mid] || 0) < req) { canCraft = false; break; } }
      const matList = Object.entries(r.materials).map(([mid, cnt]) => {
        const m = MATERIALS.find(x => x.id === mid);
        return `${m?.name || mid}x${cnt}`;
      }).join(' ');
      const color = safeCssColor(r.color, '#ff8844');
      html += `<div class="recipe-card${canCraft ? '' : ' cant-craft'}" data-recipe="${i}" style="border-color:${color}">
        <div class="rc-name" style="color:${color}">${escapeHtml(r.name)}</div>
        <div class="rc-desc">${escapeHtml(r.desc)}</div>
        <div class="rc-mats">材料: ${escapeHtml(matList)}</div>
      </div>`;
    }
    html += '</div></div></div></div>';
    p.innerHTML = html;
    p.querySelectorAll('.recipe-card:not(.cant-craft)').forEach(el => {
      const fn = () => { craftPill(parseInt(el.dataset.recipe)); renderAlchemyDomPanel(); };
      // 炼丹卡片也只响应真正点击；滑动丹方列表不触发炼制。
      bindInventoryTapDom(el, fn);
    });
  }

  // ─── DOM HD: Artifact Panel ───
  function ensureArtifactDomPanel() {
    let p = document.getElementById('artifact-dom-panel');
    if (p) return p;
    p = document.createElement('div'); p.id = 'artifact-dom-panel';
    p.addEventListener('click', e => { if (e.target.closest('.pclose')) { showArtifactUI = false; syncBodyPanelState(); } });
    p.addEventListener('touchstart', e => { if (e.target.closest('.pclose')) { e.preventDefault(); showArtifactUI = false; syncBodyPanelState(); } }, { passive: false });
    document.body.appendChild(p);
    return p;
  }
  function artifactStatsHtmlDom(artifact, progress = { level: 1 }) {
    const stats = {};
    for (const [stat, base] of Object.entries(artifact?.baseStats || {})) {
      stats[stat] = typeof artifactStatTotal === 'function' ? artifactStatTotal(base, artifact.perLevelStats?.[stat], progress.level || 1) : base;
    }
    return Object.entries(stats).map(([k, v]) => `<span><em>${escapeHtml(statLabelDom(k))}</em><b>${escapeHtml(formatStatValueDom(k, v))}</b></span>`).join('');
  }
  function renderArtifactDomPanel() {
    const p = ensureArtifactDomPanel();
    const realmCap = typeof getArtifactLevelCap === 'function' ? getArtifactLevelCap(player?.realmIndex || 0) : 0;
    const unlockRealm = typeof getArtifactUnlockRealm === 'function' ? getArtifactUnlockRealm() : 2;
    const unlocked = (player?.realmIndex || 0) >= unlockRealm;
    const state = typeof getArtifactState === 'function' ? getArtifactState(player) : { activeId: null, owned: {} };
    const active = state.activeId && ARTIFACTS?.[state.activeId] ? ARTIFACTS[state.activeId] : null;
    const activeProgress = active ? state.owned?.[active.id] : null;
    const listHtml = Object.values(typeof ARTIFACTS !== 'undefined' ? ARTIFACTS : {}).map(artifact => {
      const progress = state.owned?.[artifact.id] || null;
      const isActive = state.activeId === artifact.id;
      const levelText = progress ? `Lv.${progress.level}${progress.awakened ? ' · 已觉醒' : ''}` : '未获得';
      const canUse = typeof canUseArtifact === 'function' ? canUseArtifact(artifact.id, player).ok : unlocked;
      const upgradeCheck = progress && typeof hasArtifactUpgradeMaterials === 'function' ? hasArtifactUpgradeMaterials(player, playerMaterials, artifact.id) : null;
      const cost = progress && typeof getArtifactUpgradeCost === 'function' ? getArtifactUpgradeCost(artifact.id, progress.level) : null;
      const costHtml = progress && cost
        ? `<div class="artifact-cost"><b>升阶消耗</b><span>灵石 ${escapeHtml(player?.spiritStones || 0)}/${escapeHtml(cost.spiritStones)}</span>${materialTextDom(cost.materials, { withOwned: true, asHtml: true })}</div>`
        : `<div class="artifact-cost muted">${progress ? '已达当前最高阶' : '激活后可查看升阶消耗'}</div>`;
      const activateHtml = isActive
        ? `<button class="artifact-action" type="button" data-artifact-off="1">卸下</button>`
        : `<button class="artifact-action" type="button" data-artifact-id="${escapeHtml(artifact.id)}"${canUse ? '' : ' disabled'}>${canUse ? (progress ? '激活' : '解锁并激活') : '未解锁'}</button>`;
      const upgradeText = upgradeCheck?.reason === 'realm_cap' ? `境界上限 Lv.${realmCap}` : (upgradeCheck?.reason === 'max_level' ? '已满级' : '升阶');
      const upgradeHtml = progress ? `<button class="artifact-action upgrade" type="button" data-artifact-upgrade="${escapeHtml(artifact.id)}"${upgradeCheck?.ok ? '' : ' disabled'}>${escapeHtml(upgradeText)}</button>` : '';
      return `<div class="artifact-card${isActive ? ' active' : ''}${progress ? '' : ' locked'}" style="--artifact-color:${escapeHtml(artifact.color)}">
        <div class="artifact-top"><i>${escapeHtml(artifact.icon)}</i><div><b>${escapeHtml(artifact.name)}</b><em>${escapeHtml(levelText)}</em></div></div>
        <p>${escapeHtml(artifact.desc)}</p>
        <div class="artifact-stats">${artifactStatsHtmlDom(artifact, progress || { level: 1 })}</div>
        ${costHtml}
        <div class="artifact-actions">${activateHtml}${upgradeHtml}</div>
      </div>`;
    }).join('');
    const matHtml = (typeof ARTIFACT_MATERIALS !== 'undefined' ? ARTIFACT_MATERIALS : []).map(mat => {
      const count = Number(playerMaterials?.[mat.id] || 0);
      return `<div class="mat-row" style="color:${safeCssColor(mat.color, '#d4c8b0')}">${escapeHtml(mat.name)} x${escapeHtml(count)}</div>`;
    }).join('') || '<div class="mat-row" style="color:#666">暂无神器材料</div>';
    p.innerHTML = `<div class="panel-head">
      <span class="ptitle" style="color:#ffdd66">🗡️ 神器</span>
      <span class="psub">${unlocked ? `当前境界上限 Lv.${realmCap}` : `金丹期解锁，筑基期开始收集碎片`}</span>
      <button class="pclose" type="button">×</button>
    </div><div class="panel-body">
      <section class="bt-section">
        <div class="bt-section-title">当前激活</div>
        ${active ? `<div class="dao-current" style="--dao-color:${escapeHtml(active.color)}"><i>${escapeHtml(active.icon)}</i><b>${escapeHtml(active.name)} ${escapeHtml(activeProgress ? `Lv.${activeProgress.level}` : '')}</b><span>${escapeHtml(active.desc)}</span></div>` : `<div class="dao-current" style="--dao-color:#777"><i>○</i><b>${unlocked ? '尚未激活神器' : '神器未解锁'}</b><span>${unlocked ? '选择一件神器激活；同一时间只生效一件' : '到达金丹期后开放神器激活与升阶'}</span></div>`}
      </section>
      <section class="bt-section">
        <div class="bt-section-title">神器列表 <small>激活 / 升阶 / 战斗触发</small></div>
        <div class="artifact-list">${listHtml}</div>
      </section>
      <section class="bt-section">
        <div class="bt-section-title">神器材料</div>
        <div class="mat-list">${matHtml}</div>
      </section>
    </div>`;
    p.querySelectorAll('[data-artifact-id]').forEach(btn => {
      bindInventoryTapDom(btn, () => {
        const result = typeof activateArtifact === 'function' ? activateArtifact(player, btn.dataset.artifactId) : { ok: false };
        if (result.ok) showMessage(`🗡️ 已激活神器：${result.artifact.name}`, result.artifact.color || '#ffdd66');
        else showMessage('神器尚未解锁', '#ff7777');
        renderArtifactDomPanel();
        if (typeof updateUI === 'function') updateUI();
        if (typeof autoSave === 'function') autoSave();
      });
    });
    p.querySelectorAll('[data-artifact-off]').forEach(btn => {
      bindInventoryTapDom(btn, () => {
        if (typeof deactivateArtifact === 'function') deactivateArtifact(player);
        showMessage('已卸下神器', '#aaaaff');
        renderArtifactDomPanel();
        if (typeof updateUI === 'function') updateUI();
        if (typeof autoSave === 'function') autoSave();
      });
    });
    p.querySelectorAll('[data-artifact-upgrade]').forEach(btn => {
      bindInventoryTapDom(btn, () => {
        const result = typeof upgradeArtifact === 'function' ? upgradeArtifact(player, playerMaterials, btn.dataset.artifactUpgrade) : { ok: false };
        if (result.ok) showMessage(`🗡️ ${result.artifact.name} 升至 Lv.${result.progress.level}`, result.artifact.color || '#ffdd66');
        else {
          const reasonText = result.reason === 'realm_cap' ? '当前境界上限不足' : (result.reason === 'stones' ? '灵石不足' : (result.reason === 'materials' ? '神器材料不足' : '暂时无法升阶'));
          showMessage(reasonText, '#ff7777');
        }
        renderArtifactDomPanel();
        if (typeof updateUI === 'function') updateUI();
        if (typeof autoSave === 'function') autoSave();
      });
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
  function percentTextDom(value) { return `${Math.round(Number(value || 0) * 100)}%`; }
  function statDeltaListHtmlDom(delta) {
    if (!delta) return '';
    const items = [
      ['生命', delta.hp], ['灵力', delta.mp], ['攻击', delta.atk], ['防御', delta.def], ['技能点', delta.skillPoints],
    ].filter(([,v]) => Number(v || 0) !== 0);
    return items.map(([k,v]) => `<span><em>${escapeHtml(k)}</em><b>+${escapeHtml(v)}</b></span>`).join('');
  }
  function doctrineStatHtmlDom(info) {
    return Object.entries(info?.stats || {}).map(([k, v]) => `<span>${escapeHtml(statLabelDom(k))} ${escapeHtml(formatStatValueDom(k, /Pct$/.test(k) ? v : v))}</span>`).join('');
  }
  function renderBreakthroughDomPanel() {
    const p = ensureBreakthroughDomPanel();
    const next = REALMS[player.realmIndex + 1];
    const hasBreakthrough = breakthroughQueue && next;
    const preview = typeof getBreakthroughPreview === 'function' ? getBreakthroughPreview() : null;
    const chance = typeof getBreakthroughChanceBreakdown === 'function' ? getBreakthroughChanceBreakdown() : { total: 0.8, parts: [{ label: '基础', value: 0.8 }] };
    const doctrine = typeof getDoctrineInfo === 'function' ? getDoctrineInfo() : null;
    const needFoundation = !!(hasBreakthrough && player.realmIndex === 0 && !player.daoFoundation);
    if (!selectedDaoFoundation || !(typeof DAO_FOUNDATIONS !== 'undefined' && DAO_FOUNDATIONS[selectedDaoFoundation])) selectedDaoFoundation = 'sword';
    const progressPct = next ? Math.min(100, Math.floor((player.xp / Math.max(1, player.realm.xpNeeded)) * 100)) : 100;
    const foundationHtml = needFoundation && typeof DAO_FOUNDATIONS !== 'undefined' ? `<section class="bt-section bt-foundation">
      <div class="bt-section-title">选择道基 <small>首次突破必选，决定长期流派</small></div>
      <div class="dao-grid">${Object.values(DAO_FOUNDATIONS).map(info => `<button type="button" class="dao-card ${selectedDaoFoundation === info.id ? 'active' : ''}" data-dao="${escapeHtml(info.id)}" style="--dao-color:${escapeHtml(info.color)}">
        <i>${escapeHtml(info.icon)}</i><b>${escapeHtml(info.name)}</b><p>${escapeHtml(info.desc)}</p>
        <div class="dao-stats">${doctrineStatHtmlDom(info)}</div>
      </button>`).join('')}</div>
    </section>` : `<section class="bt-section bt-foundation locked">
      <div class="bt-section-title">当前道基</div>
      <div class="dao-current" style="--dao-color:${escapeHtml((doctrine && doctrine.color) || '#9f8fb0')}"><i>${escapeHtml((doctrine && doctrine.icon) || '○')}</i><b>${escapeHtml((doctrine && doctrine.name) || '尚未奠基')}</b><span>${escapeHtml((doctrine && doctrine.desc) || '筑基时选择一道基方向')}</span></div>
    </section>`;
    p.innerHTML = `<div class="panel-head bt-head">
      <span class="ptitle" style="color:#ffdd44">⚡ 渡劫突破</span>
      <span class="psub">${hasBreakthrough ? `成功率 ${percentTextDom(chance.total)}` : (next ? '经验不足，继续修炼' : '已达顶峰')}</span>
      <button class="pclose" type="button">×</button>
    </div><div class="panel-body bt-body">
      <section class="bt-hero">
        <div><em>当前境界</em><strong>${escapeHtml(player.realm.name)}</strong></div>
        <div class="bt-arrow">→</div>
        <div><em>下一境界</em><strong>${escapeHtml(next?.name || '顶峰')}</strong></div>
      </section>
      <div class="bt-xp"><div class="bt-xp-top"><span>修为经验</span><b>${escapeHtml(player.xp)} / ${escapeHtml(player.realm.xpNeeded || '∞')}</b></div><div class="bt-xp-bar"><i style="width:${progressPct}%"></i></div></div>
      ${foundationHtml}
      <section class="bt-section">
        <div class="bt-section-title">突破收益预览</div>
        <div class="bt-reward-grid">${preview ? statDeltaListHtmlDom(preview) : '<span><em>状态</em><b>已达顶峰</b></span>'}</div>
        <div class="bt-unlocks">${(preview?.unlocks || ['暂无新解锁']).map(x => `<span>✦ ${escapeHtml(x)}</span>`).join('')}</div>
      </section>
      <section class="bt-section bt-chance">
        <div class="bt-section-title">成功率来源 <small>失败会累计补偿，不再纯惩罚</small></div>
        <div class="chance-meter"><i style="width:${Math.round((chance.total || 0) * 100)}%"></i><b>${percentTextDom(chance.total)}</b></div>
        <div class="chance-parts">${(chance.parts || []).map(part => `<span><em>${escapeHtml(part.label)}</em><b>+${percentTextDom(part.value)}</b></span>`).join('')}</div>
        <div class="bt-fail-note">失败：保留 ${player.daoFoundation === 'body' || Number(player.breakthroughProtect || 0) > 0 ? '约 86%' : '约 72%'} 经验，并获得下次成功率补偿${Number(player.breakthroughProtect || 0) > 0 ? '（固元丹保护中）' : ''}</div>
      </section>
      <button class="bt-btn" id="bt-go-btn"${hasBreakthrough ? '' : ' disabled style="opacity:0.45"'}>${hasBreakthrough ? '确认突破' : (next ? '经验不足，无法突破' : '已至顶峰')}</button>
    </div>`;
    p.querySelectorAll('[data-dao]').forEach(el => {
      const fn = () => { selectedDaoFoundation = el.dataset.dao || 'sword'; renderBreakthroughDomPanel(); };
      bindInventoryTapDom(el, fn);
    });
    const btn = document.getElementById('bt-go-btn');
    if (btn && !btn.disabled) {
      const fn = () => { doBreakthrough(selectedDaoFoundation); if (showBreakthroughUI) renderBreakthroughDomPanel(); };
      bindInventoryTapDom(btn, fn);
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
    if (combatState !== COMBAT_STATE.DEFEAT) {
      const ds = document.getElementById('death-dom-screen');
      if (ds) ds.classList.remove('active');
      return;
    }
    // Show DOM death screen for crisp text on mobile
    const ds = document.getElementById('death-dom-screen');
    if (ds && !ds.classList.contains('active')) {
      ds.innerHTML = `<div class="death-title">💀 你已陨落 💀</div>
        <div class="death-realm">境界【${player.realm.name}】护住了你的魂魄</div>
        <div class="death-msg">装备和灵石已遗失，但修为尚在...</div>
        <div class="death-respawn">正在深渊入口重生...</div>`;
      ds.classList.add('active');
    }
    // Canvas dark overlay as fallback / visual reinforcement
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, canvasW, canvasH);
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
    if (!isInCombat() || !currentEnemy) { p.innerHTML=''; combatSkillDrawerOpen = false; return; }
    const eHpPct = currentEnemy.maxHp ? Math.max(0, currentEnemy.hp / currentEnemy.maxHp) : 1;
    const enemyDisplayName = currentEnemy.title || currentEnemy.name;
    const enemySkills = typeof getEnemySkills === 'function' ? getEnemySkills(currentEnemy) : [];
    const enemySkillText = enemySkills.length ? enemySkills.map(s => `${s.icon || '✦'}${s.name}`).join('、') : '无';
    const enemyBuffDef = typeof getEnemyDefenseBuffMultiplier === 'function' ? getEnemyDefenseBuffMultiplier() : 1;
    const enemyAtkText = Number(currentEnemy.atk || 0);
    const enemyDefText = Math.floor(currentEnemy.def * enemyBuffDef);
    const playerHpPct = player.maxHp ? Math.max(0, Math.min(100, player.hp / player.maxHp * 100)) : 100;
    const playerMpPct = player.maxMp ? Math.max(0, Math.min(100, player.mp / player.maxMp * 100)) : 100;
    const pEnemyName = `${currentEnemy.isBoss ? '👑' : '👺'} ${enemyDisplayName}`;
    const safeCombatColor = color => /^#[0-9a-f]{3,8}$/i.test(String(color || '')) ? color : '#d4c8b0';
    const statusLabelMap = {
      burn: ['🔥', '灼烧'], bleed: ['🩸', '流血'], freeze: ['🧊', '冻结'], stun: ['⚡', '麻痹'],
      weaken: ['🌑', '虚弱'], defBreak: ['🗡️', '破甲'], poison: ['☠️', '中毒'], curse: ['🌘', '诅咒'],
      slow: ['🕸️', '迟缓'], entangle: ['🌿', '束缚'], guard: ['🛡️', '护体']
    };
    const statusChipsHtml = (list = []) => (list || []).slice(0, 5).map(st => {
      const [icon, label] = statusLabelMap[st.type] || ['✦', st.type || '状态'];
      return `<span class="cbt-status-chip status-${cssClassToken(st.type || 'x')}">${escapeHtml(icon)}${escapeHtml(label)}<em>${escapeHtml(st.turns || 1)}</em></span>`;
    }).join('');
    const enemyStatusHtml = statusChipsHtml(currentEnemy._statusEffects || []);
    const playerStatusHtml = statusChipsHtml(player._statusEffects || []);
    const logsHtml = combatLogBuffer.slice(-6).map(l => `<div class="cbt-log-entry tone-${cssClassToken(l.tone || 'neutral')}" style="--log-color:${safeCombatColor(l.color)}"><i>${escapeHtml(String(l.seq || ''))}</i><span>${escapeHtml(l.text)}</span></div>`).join('');
    const combatSkills = getCombatSkills();
    const isPlayerTurn = combatState === COMBAT_STATE.PLAYER_TURN;
    let skillsHtml = '';
    if (combatSkills.length > 0) {
      const maxShow = Math.min(combatSkills.length, 3);
      skillsHtml = '<div class="cbt-skills-row">';
      for (let i = 0; i < maxShow; i++) {
        const s = combatSkills[i];
        const color = safeCssColor(s.treeColor, '#d4a0ff');
        const mpCost = getActualSkillMpCostDom(s);
        const reason = !isPlayerTurn ? '等待回合' : player.mp < mpCost ? '灵力不足' : '';
        const values = getSkillEstimatedValuesDom(s, currentEnemy);
        skillsHtml += `<div class="cbt-skill-btn${reason ? ' disabled' : ''}" data-skill="${i}" style="--skill-color:${color};color:${color};border-color:${color}"><b>${escapeHtml(s.icon || '✦')}${escapeHtml(s.name)}</b><small>${escapeHtml(reason || `灵${mpCost} · ${values.damage}伤`)}</small></div>`;
      }
      if (combatSkills.length > 3) skillsHtml += `<div class="cbt-skill-more ${combatSkillDrawerOpen ? 'active' : ''}" id="cbt-skill-toggle">${combatSkillDrawerOpen ? '收起' : `技能 ${combatSkills.length}`}</div>`;
      skillsHtml += '</div>';
    }
    const drawerHtml = combatSkillDrawerOpen && combatSkills.length > 0 ? `<div class="cbt-skill-drawer"><div class="cbt-drawer-title"><b>选择功法</b><span>${isPlayerTurn ? '点击释放，灵力不足会灰显' : '等待敌方行动结束'}</span></div><div class="cbt-drawer-grid">${combatSkills.map((s, i) => {
      const color = safeCssColor(s.treeColor, '#d4a0ff');
      const mpCost = getActualSkillMpCostDom(s);
      const values = getSkillEstimatedValuesDom(s, currentEnemy);
      const summary = typeof getSkillEffectSummary === 'function' ? getSkillEffectSummary(s) : '';
      const reason = !isPlayerTurn ? '等待回合' : player.mp < mpCost ? '灵力不足' : '';
      return `<button type="button" class="cbt-drawer-skill${reason ? ' disabled' : ''}" data-skill="${i}" style="--skill-color:${color};border-color:${color};color:${color}"><i>${escapeHtml(s.icon || '✦')}</i><b>${escapeHtml(s.name)}</b><em>灵力 ${escapeHtml(mpCost)}</em><small>${escapeHtml(reason || `预计 ${values.damage} 伤`)}</small><span>${escapeHtml(summary)}</span></button>`;
    }).join('')}</div></div>` : '';
    p.innerHTML = `<div class="cbt-topline">
      <div class="cbt-enemy-block">
        <div class="cbt-enemy-name">${escapeHtml(pEnemyName)}</div>
        <div class="cbt-enemy-tags"><span class="stat-tag atk">攻 ${escapeHtml(enemyAtkText)}</span><span class="stat-tag def">防 ${escapeHtml(enemyDefText)}</span>${enemySkills.length ? `<span class="skill-tag">技 ${escapeHtml(enemySkillText)}</span>` : ''}</div>
      </div>
      <div class="cbt-turn ${isPlayerTurn ? 'player' : 'enemy'}">${isPlayerTurn ? '我方回合' : '敌方行动'}</div>
    </div>
    <div class="cbt-hp-bar-wrap enemy"><b>妖血</b><div class="cbt-hp-bar-outer"><div class="cbt-hp-bar-inner" style="width:${Math.max(0, Math.min(100, eHpPct * 100))}%"></div></div><span class="cbt-hp-text">${escapeHtml(Number(currentEnemy.hp || 0))}/${escapeHtml(Number(currentEnemy.maxHp || 0))}</span></div>
    <div class="cbt-status-row">${enemyStatusHtml || '<span class="cbt-status-empty">敌方无状态</span>'}</div>
    <div class="cbt-player-card compact">
      <div class="cbt-player-bars">
        <div class="cbt-mini-bar hp"><span>生命</span><i><b style="width:${playerHpPct}%"></b></i><em>${escapeHtml(Number(player.hp || 0))}/${escapeHtml(Number(player.maxHp || 0))}</em></div>
        <div class="cbt-mini-bar mp"><span>灵力</span><i><b style="width:${playerMpPct}%"></b></i><em>${escapeHtml(Number(player.mp || 0))}/${escapeHtml(Number(player.maxMp || 0))}</em></div>
      </div>
    </div>
    <div class="cbt-status-row player-status">${playerStatusHtml || '<span class="cbt-status-empty">我方无状态</span>'}</div>
    <div class="cbt-log">${logsHtml || '<div class="cbt-log-entry tone-info"><span>战斗记录将在这里显示</span></div>'}</div>${skillsHtml}${drawerHtml}<div class="cbt-actions-row"><div class="cbt-act-btn${isPlayerTurn?'':' disabled'}" id="cbt-attack" style="--act-color:#ff6633">⚔️<b>攻击</b></div><div class="cbt-act-btn${isPlayerTurn?'':' disabled'}" id="cbt-defend" style="--act-color:#dd9944">🛡️<b>防御</b></div><div class="cbt-act-btn${isPlayerTurn?'':' disabled'}" id="cbt-skill-toggle-action" style="--act-color:#d4a0ff">📜<b>技能</b></div><div class="cbt-act-btn${isPlayerTurn?'':' disabled'}" id="cbt-flee" style="--act-color:#66bbcc">🏃<b>逃跑</b></div></div>`;
    const bindTap = (el, fn) => {
      if (!el) return;
      const run = e => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        fn();
      };
      el.addEventListener('touchstart', e => {
        // This panel is rebuilt immediately after toggling the skill drawer. The later
        // synthetic click may land on the freshly-rendered toggle button, so the guard
        // must be global, not stored in the old DOM node's closure.
        skillsLastTouchActionAt = Date.now();
        run(e);
      }, { passive: false });
      el.addEventListener('click', e => {
        if (Date.now() - skillsLastTouchActionAt < 700) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        run(e);
      });
    };
    if (isPlayerTurn) {
      bindTap(p.querySelector('#cbt-attack'), () => { combatSkillDrawerOpen = false; playerAttack(); });
      bindTap(p.querySelector('#cbt-defend'), () => { combatSkillDrawerOpen = false; playerDefend(); });
      bindTap(p.querySelector('#cbt-flee'), () => { combatSkillDrawerOpen = false; playerFlee(); });
    }
    const toggleDrawer = () => { combatSkillDrawerOpen = !combatSkillDrawerOpen; renderCombatDomPanel(); };
    bindTap(p.querySelector('#cbt-skill-toggle'), toggleDrawer);
    bindTap(p.querySelector('#cbt-skill-toggle-action'), toggleDrawer);
    p.querySelectorAll('.cbt-skill-btn:not(.disabled), .cbt-drawer-skill:not(.disabled)').forEach(el => bindTap(el, () => { combatSkillDrawerOpen = false; playerUseSkill(parseInt(el.dataset.skill, 10) || 0); }));
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
     if (!isInCombat()) checkTreasureChestPickup();
     if (!isInCombat()) checkStairs();
     updateCamera();
     tickMessages();
     if (typeof document !== 'undefined') document.body.classList.toggle('combat-active', isInCombat());
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
     showMessage('休闲爽刷模式：地图更短、移动更快、奖励更足。', '#d4a0ff');
   });
   // Expose for debugging
   window.player = player;
   window.TILE = TILE;
   window.DUNGEON_WIDTH = DUNGEON_WIDTH;
   window.DUNGEON_HEIGHT = DUNGEON_HEIGHT;