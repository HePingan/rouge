// Game Main Loop — Entry Point, Input, Rendering, Camera
if (typeof STAGES === 'undefined') console.error('[致命] stages.js 未加载或变量不可访问'); else console.log('[OK] STAGES loaded:', Object.keys(STAGES).length, 'stages');
if (typeof SECRET_REALMS === 'undefined') console.error('[致命] secretRealms.js 未加载或变量不可访问'); else console.log('[OK] SECRET_REALMS loaded:', Object.keys(SECRET_REALMS).length, 'realms');
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
       canvasFloorKey: '', canvasBoundsKey: '', canvasVisibilityKey: '',
       layerCellSize: NaN, layerW: '', layerH: '', layerTransform: '',
       hintTileKey: '', hintVisibilityKey: '', miniTileKey: '', miniVisibilityKey: '',
       playerTransform: '', hiddenMiniMap: false
     };
     let runBodyClassCache = { combat: null, stage: null, secret: null };
     let lastInteractionTileKey = '';
     const MAP_HINT_UPDATE_INTERVAL = 8;
     const MAP_MINIMAP_UPDATE_INTERVAL = 12;
     const MAP_VISION_RADIUS = 8;
     const MAP_MEMORY_RADIUS = 11;
     // Character panel state. Must be declared before gameLoop/openPanel reads it;
     // otherwise ReferenceError stops rendering and makes the map/buttons look dead.
     let showCharacterPanel = false;
     let characterPanelTouchState = null;
     let characterPanelLastHtml = '';
     let characterEquipmentDetailSlot = null;
     let characterEquipmentSlotHint = null;
     let characterTab = 'attributes';
    let showArtifactUI = false;
    let selectedArtifactId = null;
    let inventoryBulkRarity = '普通';
    let inventoryBulkMode = 'sell';
    let inventorySortMode = 'power';
    let inventorySlotFilter = '';
    let inventoryListHtmlCacheKeyDom = '';
    let inventoryListHtmlCacheDom = '';
    let inventoryMaterialHtmlCacheKeyDom = '';
    let inventoryMaterialHtmlCacheDom = '';
    let showSecretRealmUI = false;
    let showStageSelectUI = false;
    let selectedStageId = 'qingyun_foot';
    let showStageClearPanel = false;
    let stageTab = 'stages'; // 'stages' | 'codex'
    let stageDetailOpen = false;
    let stageSweepOpen = false;
    let selectedStageChapterId = 'qingyun';
    let lastStageClearSummary = null;
    let showTribulationUI = false;
    let showAscensionUI = false;
    let ascensionTab = 'overview';
    let selectedAscensionLawId = 'sword';
    let ascensionDelegatedTouchUntil = 0;
    let tribulationDelegatedTouchUntil = 0;
    let selectedTribulationId = 'minor';
    let inventoryTab = 'equipment';
    let inventoryBulkConfirm = null;
    let inventoryDetailScrollKey = '';
    let selectedSkillTreeNode = null;
    let skillDetailModalOpen = false;
    // Panel stack: tracks open panels in order so ❌ closes them LIFO (last-opened first).
    // Fixes bug where openPanel(closeAllPanels) destroyed previous panels.
    let panelStack = [];
    function updatePanelFlagsFromStack() {
      showInventory = isPanelTypeInStack('inventory');
      showCharacterPanel = isPanelTypeInStack('character');
      showSkillTreeUI = isPanelTypeInStack('skills');
      showArtifactUI = isPanelTypeInStack('artifact');
      showAlchemyUI = isPanelTypeInStack('alchemy');
      showBreakthroughUI = isPanelTypeInStack('breakthrough');
      showSecretRealmUI = isPanelTypeInStack('secretRealm');
      showStageSelectUI = isPanelTypeInStack('stages');
      showTribulationUI = isPanelTypeInStack('tribulation');
      showAscensionUI = isPanelTypeInStack('ascension');
    }
    function isPanelTypeInStack(type) {
      return panelStack.includes(type);
    }
    function popPanelFromStack(type) {
      const i = panelStack.lastIndexOf(type);
      if (i >= 0) { panelStack.splice(i, 1); updatePanelFlagsFromStack(); }
    }
    function pushPanelToStack(type) {
      const existing = panelStack.lastIndexOf(type);
      if (existing >= 0) panelStack.splice(existing, 1);
      panelStack.push(type);
      updatePanelFlagsFromStack();
    }
    let combatSkillDrawerOpen = false;
    let combatDomRenderCacheKey = '';
    let combatDelegatedTouchUntil = 0;
    let combatActionFeedback = { id: '', until: 0 };
    function markCombatActionFeedback(id, skillIndex = null) {
      if (!id) return;
      combatActionFeedback = { id: String(id), skillIndex, until: Date.now() + 260 };
      const panel = typeof document !== 'undefined' ? document.getElementById('combat-dom-panel') : null;
      if (panel) {
        panel.classList.remove('feedback-attack', 'feedback-defend', 'feedback-skill', 'feedback-flee', 'feedback-toggle', 'feedback-mp');
        panel.classList.add(`feedback-${cssClassToken(id)}`);
        window.setTimeout(() => panel.classList.remove(`feedback-${cssClassToken(id)}`), 280);
      }
    }
    let skillsLastTouchActionAt = 0;
    let skillPanelTapState = null;
    let skillPanelSuppressClickUntil = 0;
    let skillDetailCloseSwallowUntil = 0;
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
      // 可滚动面板里的按钮不能在 touchstart 阶段 preventDefault，否则从按钮/卡片上起手会抢走滚动。
      // 统一改为“移动阈值 tap”：滑动只滚动，未移动的轻触才执行动作并抑制后续合成 click。
      let start = null;
      let moved = false;
      let handledTouchUntil = 0;
      const point = e => {
        const t = e.changedTouches?.[0] || e.touches?.[0] || e;
        return { x: Number(t.clientX) || 0, y: Number(t.clientY) || 0 };
      };
      const scrollTop = () => inventoryScrollableParentDom(el)?.scrollTop || 0;
      const begin = e => {
        const p = point(e);
        start = { x: p.x, y: p.y, scrollTop: scrollTop() };
        moved = false;
      };
      const move = e => {
        if (!start) return;
        const p = point(e);
        if (Math.hypot(p.x - start.x, p.y - start.y) > INVENTORY_TAP_MOVE_THRESHOLD || Math.abs(scrollTop() - start.scrollTop) > 2) moved = true;
      };
      const finish = e => {
        const shouldTap = start && !moved && Math.abs(scrollTop() - start.scrollTop) <= 2;
        start = null;
        moved = false;
        if (!shouldTap) return;
        markInventoryTouchActionDom();
        handledTouchUntil = Date.now() + 700;
        e.preventDefault();
        e.stopPropagation();
        onAction(e);
      };
      const cancel = () => { start = null; moved = false; handledTouchUntil = Date.now() + 450; };
      if (window.PointerEvent) {
        el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') begin(e); }, { passive: true });
        el.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') move(e); }, { passive: true });
        el.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') finish(e); }, { passive: false });
        el.addEventListener('pointercancel', cancel, { passive: true });
      } else {
        el.addEventListener('touchstart', begin, { passive: true });
        el.addEventListener('touchmove', move, { passive: true });
        el.addEventListener('touchend', finish, { passive: false });
        el.addEventListener('touchcancel', cancel, { passive: true });
      }
      el.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (Date.now() < handledTouchUntil || shouldIgnoreInventorySyntheticClickDom()) return;
        onAction(e);
      });
    }
    let inventoryRenderQueuedDom = false;
    let inventoryRenderReasonDom = '';
    function scheduleInventoryRenderDom(reason = '') {
      inventoryRenderReasonDom = reason || inventoryRenderReasonDom;
      if (!showInventory || typeof renderInventoryDomPanel !== 'function') return;
      if (inventoryRenderQueuedDom) return;
      inventoryRenderQueuedDom = true;
      const run = () => {
        inventoryRenderQueuedDom = false;
        const r = inventoryRenderReasonDom;
        inventoryRenderReasonDom = '';
        if (showInventory) renderInventoryDomPanel(r);
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
      else setTimeout(run, 0);
    }
   function init() {
      canvas = document.getElementById('game-canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      ctx = canvas.getContext('2d');
      player = new Player();
      const loaded = loadGame();
      if (player.stageProgress?.currentRun?.stageId) {
        const runStage = STAGES?.[player.stageProgress.currentRun.stageId];
        isInStageRun = !!runStage;
        stageRoomIndex = Number(player.stageProgress.currentRun.roomIndex || 0);
        stageRoomCount = Number(runStage?.roomCount || 0);
      }
      if (!loaded) {
        generateHomeMap({ welcome: true });
        showStageSelectUI = false;
      } else if (isInStageRun) {
        generateNewFloor();
      } else {
        generateHomeMap();
      }
      // If save was loaded, show welcome message
      if (loaded) showMessage('📂 仙缘未断，旧梦重续！道友，仙途再起！', '#d4a0ff');
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
     startGameLoop();
   }
   function resizeCanvas() {
     canvasW = window.innerWidth;
     canvasH = window.innerHeight;
     canvas.width = canvasW;
     canvas.height = canvasH;
     if (typeof resetDomMapCache === 'function') resetDomMapCache();
   }
  function isAnyPanelOpen() {
    return panelStack.length > 0 || showStageClearPanel;
  }
  function syncMainNavState() {
    if (typeof document === 'undefined') return;
    const map = {
      'btn-bag': !!showInventory,
      'btn-character': !!showCharacterPanel,
      'btn-skills': !!showSkillTreeUI,
      'btn-stages': !!showStageSelectUI,
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
    runBodyClassCache.combat = isInCombat();
    runBodyClassCache.stage = !!isInStageRun;
    runBodyClassCache.secret = !!isInSecretRealm;
    document.body.classList.toggle('panel-open', open);
    document.body.classList.toggle('combat-active', runBodyClassCache.combat);
    document.body.classList.toggle('stage-run-active', runBodyClassCache.stage);
    document.body.classList.toggle('secret-realm-run-active', runBodyClassCache.secret);
    /* Only the top panel in the stack is visually shown.
       Previously all open-panel flags were toggled, which made stacked
       panels overlap at the same z-index. Now we derive the top type
       and only set its body class / clear its inline display:none. */
    const topType = panelStack.length > 0 ? panelStack[panelStack.length - 1] : null;
    const panelVisible = {
      inventory: topType === 'inventory',
      character: topType === 'character',
      skills: topType === 'skills',
      artifact: topType === 'artifact',
      alchemy: topType === 'alchemy',
      breakthrough: topType === 'breakthrough',
      secretrealm: topType === 'secretRealm',
      stage: topType === 'stages' || !!showStageClearPanel,
      tribulation: topType === 'tribulation',
      ascension: topType === 'ascension',
    };
    document.body.classList.toggle('inventory-open', panelVisible.inventory);
    document.body.classList.toggle('character-open', panelVisible.character);
    document.body.classList.toggle('skills-open', panelVisible.skills);
    document.body.classList.toggle('artifact-open', panelVisible.artifact);
    document.body.classList.toggle('alchemy-open', panelVisible.alchemy);
    document.body.classList.toggle('breakthrough-open', panelVisible.breakthrough);
    document.body.classList.toggle('secretrealm-open', panelVisible.secretrealm);
    document.body.classList.toggle('stage-open', panelVisible.stage);
    document.body.classList.toggle('tribulation-open', panelVisible.tribulation);
    document.body.classList.toggle('ascension-open', panelVisible.ascension);
    /* Clear stale inline display styles so CSS class rules can control visibility.
       hideDomPanelById sets panel.style.display = 'none' which has higher priority
       than body.<panel>-open CSS selectors; removing it lets the stylesheet win. */
    if (open) {
      const allPanelIds = [
        'inventory-dom-panel', 'character-dom-panel', 'skills-dom-panel',
        'artifact-dom-panel', 'alchemy-dom-panel', 'breakthrough-dom-panel',
        'secretrealm-dom-panel', 'stage-dom-panel', 'tribulation-dom-panel',
        'ascension-dom-panel',
      ];
      const visibleIds = [];
      if (panelVisible.inventory) visibleIds.push('inventory-dom-panel');
      if (panelVisible.character) visibleIds.push('character-dom-panel');
      if (panelVisible.skills) visibleIds.push('skills-dom-panel');
      if (panelVisible.artifact) visibleIds.push('artifact-dom-panel');
      if (panelVisible.alchemy) visibleIds.push('alchemy-dom-panel');
      if (panelVisible.breakthrough) visibleIds.push('breakthrough-dom-panel');
      if (panelVisible.secretrealm) visibleIds.push('secretrealm-dom-panel');
      if (panelVisible.stage) visibleIds.push('stage-dom-panel');
      if (panelVisible.tribulation) visibleIds.push('tribulation-dom-panel');
      if (panelVisible.ascension) visibleIds.push('ascension-dom-panel');
      visibleIds.forEach(id => { const el = document.getElementById(id); if (el) el.style.removeProperty('display'); });
      /* Hide panels not in visible set — their inline display:'' would otherwise
         override the CSS display:none default. */
      allPanelIds.forEach(id => {
        if (!visibleIds.includes(id)) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
      });
    }
    const moreMenu = document.getElementById('more-menu');
    if (moreMenu && open) {
      moreMenu.classList.remove('open');
      moreMenu.setAttribute('aria-hidden', 'true');
    }
    syncMainNavState();
    if (showInventory && typeof scheduleInventoryRenderDom === 'function') scheduleInventoryRenderDom('sync');
    if (showCharacterPanel && typeof renderCharacterDomPanel === 'function') renderCharacterDomPanel();
    if (showSkillTreeUI && typeof renderSkillsDomPanel === 'function') renderSkillsDomPanel();
    if (showArtifactUI && typeof renderArtifactDomPanel === 'function') renderArtifactDomPanel();
    if (showAlchemyUI && typeof renderAlchemyDomPanel === 'function') renderAlchemyDomPanel();
    if (showBreakthroughUI && typeof renderBreakthroughDomPanel === 'function') renderBreakthroughDomPanel();
    if (showSecretRealmUI && typeof renderSecretRealmDomPanel === 'function') renderSecretRealmDomPanel();
    if ((showStageSelectUI || showStageClearPanel) && typeof renderStageDomPanel === 'function') renderStageDomPanel();
    if (showTribulationUI && typeof renderTribulationDomPanel === 'function') renderTribulationDomPanel();
    if (showAscensionUI && typeof renderAscensionDomPanel === 'function') renderAscensionDomPanel();
  }
  function clearTouchMovementState() {
    if (typeof joystick === 'undefined') return;
    joystick.active = false;
    joystick.dx = 0;
    joystick.dy = 0;
    joystick.distance = 0;
    if (typeof window !== 'undefined' && typeof window.__resetMovementTouchInput === 'function') {
      window.__resetMovementTouchInput('external-clear');
    }
    const thumb = typeof document !== 'undefined' ? document.getElementById('joystick-thumb') : null;
    if (thumb) thumb.style.transform = 'translate(-50%, -50%)';
  }
  function hasVisibleBlockingPanel() {
    if (typeof document === 'undefined') return false;
    const panelIds = [
      'inventory-dom-panel',
      'character-dom-panel',
      'skills-dom-panel',
      'artifact-dom-panel',
      'alchemy-dom-panel',
      'breakthrough-dom-panel',
      'secret-realm-dom-panel',
      'stage-dom-panel',
      'tribulation-dom-panel',
      'ascension-dom-panel',
    ];
    return panelIds.some(id => {
      const el = document.getElementById(id);
      if (!el) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none' || Number(style.opacity) === 0) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 2 && rect.height > 2;
    });
  }
  function isMovementBlockedByUi() {
    if (isInCombat() || combatState === COMBAT_STATE.DEFEAT) return true;
    if (hasVisibleBlockingPanel()) return true;
    if (!isInStageRun && !isInSecretRealm && isAnyPanelOpen()) return true;
    return false;
  }
  function closeBreakthroughPanel() {
    popPanelFromStack('breakthrough');
    clearTouchMovementState();
    syncBodyPanelState();
  }
  function openBreakthroughPanel() {
    if (isInCombat()) return;
    pushPanelToStack('breakthrough');
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
  function getInventoryBulkSelectableRaritiesDom() {
    const seen = new Set(ITEM_RARITIES_DOM);
    for (const item of player?.inventory || []) {
      const rarity = String(item?.rarity || '').trim();
      if (rarity) seen.add(rarity);
    }
    return Array.from(seen);
  }
  function rarityShortDom(rarity) {
    return ({ '普通': '普', '魔法': '魔', '稀有': '稀', '传说': '传', '神话': '神' }[rarity] || String(rarity || '?').slice(0, 1));
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
  function rarityRankDom(rarity) {
    return ({ '普通': 1, '魔法': 2, '稀有': 3, '传说': 4, '神话': 5 }[rarity] || 0);
  }
  function inventoryItemStableKeyDom(item, index) {
    return [
      index, item?.id || '', item?.name || '', item?.slot || '', item?.rarity || '',
      item?.floorLevel || 0, item?.enhanceLevel || 0, JSON.stringify(item?.stats || {})
    ].join('|');
  }
  function inventoryItemsVersionDom() {
    return `${inventorySortMode}:${inventorySlotFilter || 'all'}:${(player?.inventory || []).map(inventoryItemStableKeyDom).join('~')}`;
  }
  function sortedInventoryEntriesDom() {
    return (player?.inventory || []).map((item, index) => {
      if (item && typeof rebuildEquipmentStats === 'function') rebuildEquipmentStats(item);
      return { item, index, power: itemPowerDom(item), rarityRank: rarityRankDom(item?.rarity), floor: Number(item?.floorLevel) || 0 };
    }).filter(entry => !inventorySlotFilter || entry.item?.slot === inventorySlotFilter).sort((a, b) => {
      if (inventorySortMode === 'rarity') {
        const rarityDiff = b.rarityRank - a.rarityRank;
        if (rarityDiff) return rarityDiff;
      }
      const powerDiff = b.power - a.power;
      if (powerDiff) return powerDiff;
      if (inventorySortMode === 'power') {
        const rarityDiff = b.rarityRank - a.rarityRank;
        if (rarityDiff) return rarityDiff;
      }
      const floorDiff = b.floor - a.floor;
      if (floorDiff) return floorDiff;
      return a.index - b.index;
    });
  }
  function inventoryListHtmlDom() {
    const key = `${inventoryItemsVersionDom()}:${inventoryDetailTarget?.type || ''}:${inventoryDetailTarget?.index ?? ''}`;
    if (key === inventoryListHtmlCacheKeyDom) return inventoryListHtmlCacheDom;
    inventoryListHtmlCacheKeyDom = key;
    const rows = sortedInventoryEntriesDom();
    inventoryListHtmlCacheDom = rows.length ? rows.map(({ item, index }) => {
      const targetIndex = Number(inventoryDetailTarget?.index);
      const active = (inventoryDetailTarget?.type === 'bag' || inventoryDetailTarget?.type === 'compare') && targetIndex === index;
      return drawBagItemCardDom(item, index, active);
    }).join('') : `<div class="empty-note">${escapeHtml(inventorySlotFilter ? `暂无${SLOT_NAMES?.[inventorySlotFilter]?.name || inventorySlotFilter}装备` : '暂无装备，击败怪物可掉落')}</div>`;
    return inventoryListHtmlCacheDom;
  }
  function invalidateInventoryListCacheDom() {
    inventoryListHtmlCacheKeyDom = '';
    inventoryListHtmlCacheDom = '';
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
    const removed = player.inventory.splice(index, 1)[0] || null;
    if (removed) invalidateInventoryListCacheDom();
    return removed;
  }
  function inventoryItemsByRarityDom(rarity) {
    if (!player?.inventory) return [];
    return player.inventory.map((item, index) => ({ item, index })).filter(entry => entry.item && entry.item.rarity === rarity);
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
    const isSell = mode === 'sell';
    const rewardHtml = isSell ? `<span class="bulk-reward-stone">${preview?.sellValue || 0} 灵石</span>` : materialTextDom(preview?.gains || {}, { asHtml: true });
    const action = isSell ? '售卖' : '分解';
    const actionIcon = isSell ? '💰' : '🔧';
    const sample = preview?.names?.length ? preview.names.map(escapeHtml).join('、') + (count > preview.names.length ? ` 等${count}件` : '') : '暂无';
    const empty = count ? '' : ' empty';
    /* Build reward detail chips for decompose */
    let rewardDetail = '';
    if (!isSell && count && preview?.gains) {
      rewardDetail = Object.entries(preview.gains).map(([id, cnt]) => {
        if (!cnt) return '';
        const mat = (typeof MATERIALS !== 'undefined') ? MATERIALS.find(m => m.id === id) : null;
        const name = mat ? mat.name : id;
        const icon = mat ? materialIconDom(mat) : '📦';
        const color = mat ? (mat.color || '#aaddff') : '#aaddff';
        return `<span class="bulk-reward-chip" style="--mat-color:${escapeHtml(color)}"><i>${escapeHtml(icon)}</i><em>${escapeHtml(name)}</em><b>x${cnt}</b></span>`;
      }).filter(Boolean).join('');
    }
    return `<div class="bulk-preview-card ${escapeHtml(mode)}${empty}">
      <div class="bulk-preview-head"><span class="bulk-action-icon">${actionIcon}</span><b>${escapeHtml(preview?.rarity || '普通')}</b><em>${count ? `${count}件` : '暂无'}</em></div>
      <div class="bulk-preview-reward ${escapeHtml(mode)}"><small>预计获得</small><strong>${count ? rewardHtml : '—'}</strong></div>
      ${rewardDetail ? `<div class="bulk-reward-detail">${rewardDetail}</div>` : ''}
      ${count ? `<div class="bulk-preview-meta"><span>总战力 ${escapeHtml(preview?.power || 0)}</span><span>${escapeHtml(sample)}</span></div>` : ''}
      <button class="bulk-primary ${escapeHtml(mode)}" type="button" data-bulk-${isSell ? 'sell' : 'decompose'}="1" ${count ? '' : 'disabled'}>${count ? `确认${action}（${count}件）` : `无可${action}装备`}</button>
      <div class="bulk-safe-tip">仅处理背包库存；已穿装备不会受影响。</div>
    </div>`;
  }
  function openBulkConfirmDom(mode, rarity) {
    if (isInCombat()) { showMessage('战斗中无法处理装备', '#ff7777'); return false; }
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
    const titleIcon = isSell ? '💰' : '🔧';
    const title = isSell ? '确认售卖' : '确认分解';
    const rewardHtml = isSell ? `<span class="bulk-reward-stone">${preview.sellValue} 灵石</span>` : materialTextDom(preview.gains, { asHtml: true });
    const sample = preview.names.map(escapeHtml).join('、') + (preview.count > preview.names.length ? ` 等${preview.count}件` : '');
    /* Build reward detail chips for decompose confirm */
    let rewardDetail = '';
    if (!isSell && preview?.gains) {
      rewardDetail = Object.entries(preview.gains).map(([id, cnt]) => {
        if (!cnt) return '';
        const mat = (typeof MATERIALS !== 'undefined') ? MATERIALS.find(m => m.id === id) : null;
        const name = mat ? mat.name : id;
        const icon = mat ? materialIconDom(mat) : '📦';
        const color = mat ? (mat.color || '#aaddff') : '#aaddff';
        return `<span class="bulk-reward-chip" style="--mat-color:${escapeHtml(color)}"><i>${escapeHtml(icon)}</i><em>${escapeHtml(name)}</em><b>x${cnt}</b></span>`;
      }).filter(Boolean).join('');
    }
    return `<div class="bulk-confirm-layer show" data-bulk-layer="1">
      <div class="bulk-confirm-card ${isSell ? 'sell' : 'decompose'}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <button class="bulk-close" type="button" data-bulk-cancel="1" aria-label="取消">×</button>
        <div class="bulk-confirm-title">${titleIcon} ${escapeHtml(title)}</div>
        <div class="bulk-confirm-sub">${escapeHtml(rarity)}品质 · ${preview.count} 件装备</div>
        <div class="bulk-confirm-reward"><span>预计获得</span><b>${rewardHtml}</b></div>
        ${rewardDetail ? `<div class="bulk-reward-detail">${rewardDetail}</div>` : ''}
        <div class="bulk-confirm-list">${sample}</div>
        <div class="bulk-warning">操作后装备会从背包移除，请确认这些品质装备都不需要保留。</div>
        <div class="bulk-confirm-actions">
          <button type="button" class="bulk-cancel" data-bulk-cancel="1">取消</button>
          <button type="button" class="bulk-confirm-btn ${isSell ? 'sell' : 'decompose'}" data-bulk-confirm="${escapeHtml(mode)}">确认${isSell ? '售卖' : '分解'} · ${isSell ? preview.sellValue + ' 灵石' : materialTextDom(preview.gains)}</button>
        </div>
      </div>
    </div>`;
  }
  function executeBulkInventoryActionDom(mode, rarity) {
    if (isInCombat()) { showMessage('战斗中无法处理装备', '#ff7777'); inventoryBulkConfirm = null; renderInventoryDomPanel(); return false; }
    if (!player) { inventoryBulkConfirm = null; return false; }
    const preview = bulkPreviewDom(rarity);
    if (!preview.count) { inventoryBulkConfirm = null; renderInventoryDomPanel(); return false; }
    const indices = new Set(preview.entries.map(entry => entry.index));
    player.inventory = player.inventory.filter((_, index) => !indices.has(index));
    invalidateInventoryListCacheDom();
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
    refreshEquipmentPanelsDom({ deferInventory: true });
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
  function itemPowerDeltaDom(item) {
    if (!item) return { value: 0, tone: 'same', text: '=' };
    const current = player?.equipment?.[item.slot] || null;
    const delta = itemPowerDom(item) - itemPowerDom(current);
    return {
      value: delta,
      tone: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same',
      text: delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : '='
    };
  }
  function drawBagItemCardDom(item, index, active = false) {
    const color = item?.rarityColor || '#d4a0ff';
    const typeName = SLOT_NAMES?.[item.slot]?.name || '装备';
    const level = equipmentEnhanceLevelDom(item);
    const name = `${item.name}${level > 0 ? ` +${level}` : ''}`;
    const power = itemPowerDom(item);
    const delta = itemPowerDeltaDom(item);
    const primaryStats = itemPrimaryStatsHtmlDom(item, 2);
    const traitBadge = item?.trait ? `<span class="bag-trait-badge" style="--trait-color:${escapeHtml(item.trait.color || color)}">${escapeHtml(item.trait.icon || '✦')}${escapeHtml(item.trait.name || '特质')}</span>` : '';
    const floorText = item?.floorLevel ? `${item.floorLevel}层` : (item?.subType || typeName);
    return `<button class="bag-item-card scan-card${active ? ' active' : ''}" type="button" data-index="${index}" aria-label="查看${escapeHtml(name)}详情，战力${escapeHtml(power)}，${escapeHtml(delta.text)}" title="${escapeHtml(name)}" style="--rarity-color:${escapeHtml(color)}">
      <div class="bag-icon"><span>${escapeHtml(itemIconDom(item))}</span><i>${escapeHtml(rarityShortDom(item.rarity))}</i></div>
      ${level > 0 ? `<span class="enhance-badge">+${level}</span>` : ''}
      <span class="bag-slot-tag">${escapeHtml(typeName.slice(0, 1))}</span>
      <div class="bag-main"><div class="bag-name-row"><b>${escapeHtml(item.name || '装备')}</b>${traitBadge}</div><div class="bag-meta"><span>${escapeHtml(typeName)}</span><em>${escapeHtml(floorText)}</em></div></div>
      <div class="bag-power"><b>战力 ${escapeHtml(power)}</b><strong class="${escapeHtml(delta.tone)}">${escapeHtml(delta.text)}</strong></div>
      <div class="bag-stats">${primaryStats}</div>
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
  function itemDetailSummaryHtmlDom(item, detail = {}) {
    if (!item) return '';
    const level = equipmentEnhanceLevelDom(item);
    const maxLevel = typeof getCurrentEquipmentEnhanceCap === 'function' ? getCurrentEquipmentEnhanceCap() : (typeof MAX_EQUIPMENT_ENHANCE_LEVEL !== 'undefined' ? MAX_EQUIPMENT_ENHANCE_LEVEL : 15);
    const set = item.setId && typeof getEquipmentSet === 'function' ? getEquipmentSet(item.setId) : null;
    const setText = item.setId ? `${set?.icon || '◇'} ${set?.name || item.setName || '套装'}` : '无套装';
    const typeText = detail.label || SLOT_NAMES?.[item.slot]?.name || item.slot || '装备';
    const chips = [
      { label: '战力', value: String(itemPowerDom(item)) },
      { label: '强化', value: `+${level}/${maxLevel}` },
      { label: '部位', value: typeText },
      { label: '套装', value: setText },
    ];
    return `<div class="detail-summary-row">${chips.map(chip => `<span><b>${escapeHtml(chip.value)}</b><em>${escapeHtml(chip.label)}</em></span>`).join('')}</div>`;
  }
  function itemGroupedStatsHtmlDom(item) {
    const stats = item?.stats || {};
    const groups = [
      { title: '核心', keys: ['atk','def','maxHp','hp','maxMp','mp','speed'] },
      { title: '战斗', keys: ['crit','critRate','dodge','dodgeRate','lifesteal','armorPen'] },
      { title: '元素', keys: ['fireDmg','iceDmg','poisonDmg','lightningDmg','allRes'] },
      { title: '成长', keys: ['goldFind','xpBonus','hpRegen','mpRegen'] },
    ];
    const seen = new Set();
    const renderChip = (key) => {
      const value = Number(stats[key] || 0);
      if (!value) return '';
      seen.add(key);
      const [label, suffix] = getCharacterStatMeta(key);
      return `<span class="stat-chip"><em>${escapeHtml(label)}</em><b>${formatCharStatValue(value, suffix)}</b></span>`;
    };
    const sections = groups.map(group => {
      const chips = group.keys.map(renderChip).filter(Boolean).join('');
      return chips ? `<div class="detail-stat-group"><h4>${escapeHtml(group.title)}</h4><div>${chips}</div></div>` : '';
    }).filter(Boolean);
    const extra = Object.keys(stats).filter(key => !seen.has(key) && Number(stats[key] || 0)).map(renderChip).filter(Boolean).join('');
    if (extra) sections.push(`<div class="detail-stat-group"><h4>其他</h4><div>${extra}</div></div>`);
    return sections.length ? `<div class="detail-stats grouped">${sections.join('')}</div>` : `<div class="detail-stats">${itemStatsHtmlDom(item)}</div>`;
  }
  function itemTraitHtmlDom(item) {
    const trait = item?.trait;
    if (!trait) return '';
    const stats = item?.traitStats || {};
    const statText = Object.entries(stats).map(([k, v]) => `${statLabelDom(k)} ${formatStatValueDom(k, v)}`).join(' · ');
    return `<div class="trait-panel" style="--trait-color:${escapeHtml(trait.color || item.rarityColor || '#ffd98e')}"><div class="trait-title"><b>${escapeHtml(trait.icon || '✦')} ${escapeHtml(trait.name || '装备特质')}</b><span>${escapeHtml(trait.desc || '特殊属性')}</span></div>${statText ? `<div class="trait-stats">${escapeHtml(statText)}</div>` : ''}</div>`;
  }
  function itemDetailHtmlDom(detail, emptyText = '点背包小图标查看详情；点「装备」进入属性对比，确认后才会穿上') {
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
    const bagActions = Number.isInteger(detail.index) ? `<div class="detail-actions enhance-actions bag-detail-actions">
        ${enhanceButton}
        <button class="item-action equip primary-equip" type="button" data-equip-action-index="${detail.index}">装备</button>
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
      ${itemDetailSummaryHtmlDom(item, detail)}
      ${itemGroupedStatsHtmlDom(item)}
      ${itemTraitHtmlDom(item)}
      ${itemEnhanceHtmlDom(item)}
      ${itemAffixesHtmlDom(item)}
      ${itemSetHtmlDom(item)}
      <div class="detail-extra"><span>${escapeHtml(floor)}</span><span>售卖估值：${itemSellValueDom(item)} 灵石</span><span>分解：${escapeHtml(materialTextDom(itemBreakdownDom(item)))}</span></div>
      ${bagActions || equipActions}
    </div>`;
  }
  function materialRarityLabelDom(rarity) {
    return ({ common: '凡', uncommon: '良', rare: '稀', epic: '史', legendary: '传', mythic: '神' }[rarity] || String(rarity || '?').slice(0, 1));
  }
  function materialIconDom(mat) {
    const id = String(mat?.id || '');
    if (/fire|blood|demon/i.test(id)) return '🔥';
    if (/ice|void/i.test(id)) return '❄️';
    if (/dragon|scale/i.test(id)) return '🐉';
    if (/phoenix|feather/i.test(id)) return '🪶';
    if (/soul|jade|essence|artifact/i.test(id)) return '💠';
    if (/thunder|tribulation|seal/i.test(id)) return '⚡';
    if (/star|dust/i.test(id)) return '✨';
    if (/key|mark/i.test(id)) return '🔑';
    if (/stone|core|marrow/i.test(id)) return '🪨';
    if (/herb|ginseng|petal|fur/i.test(id)) return '🌿';
    return '✦';
  }
  function materialUseTextDom(mat) {
    const id = String(mat?.id || '');
    if (/secret_key/i.test(id)) return '秘境开启';
    if (/artifact|shard|core|essence/i.test(id)) return '神器养成';
    if (/qingyun|blood|thunder|yaogu|nether|void|demon|ascension|nine_thunder|immortal/i.test(id)) return '副本材料';
    if (/tribulation/i.test(id)) return '渡劫相关';
    if (/stone|core|marrow/i.test(id)) return '强化/炼制';
    return '炼丹材料';
  }
  function materialSourceTextDom(mat) {
    const id = String(mat?.id || '');
    if (mat?.source) return mat.source;
    if (/secret_key_herb/i.test(id)) return '灵草秘境通关 / 秘境商人';
    if (/secret_key_forge/i.test(id)) return '炼器秘境通关 / 秘境商人';
    if (/secret_key_artifact/i.test(id)) return '神器秘境通关 / 高阶 Boss';
    if (/tribulation/i.test(id)) return '天劫秘境通关 / 雷系 Boss';
    if (/artifact|shard|core|essence/i.test(id)) return '精英怪 / Boss / 神器秘境';
    if (/qingyun|blood|thunder|yaogu|nether|void|demon|ascension|nine_thunder|immortal/i.test(id)) return '章节副本 / 首领掉落';
    if (/stone|core|marrow/i.test(id)) return '炼器秘境 / 地图采集 / 分解装备';
    return '地图采集 / 怪物掉落 / 灵草秘境';
  }
  function materialCardsHtmlDom() {
    if (typeof MATERIALS === 'undefined') return '<div class="empty-note">暂无材料定义</div>';
    if (typeof normalizeMaterialIds === 'function') playerMaterials = normalizeMaterialIds(playerMaterials);
    const visibleMaterials = MATERIALS.filter(mat => mat?.id !== 'artifact_dust');
    const key = visibleMaterials.map(mat => `${mat.id}:${Number(playerMaterials?.[mat.id] || 0)}`).join('|');
    if (key === inventoryMaterialHtmlCacheKeyDom) return inventoryMaterialHtmlCacheDom;
    inventoryMaterialHtmlCacheKeyDom = key;
    inventoryMaterialHtmlCacheDom = visibleMaterials.map(mat => {
      const count = Number(playerMaterials?.[mat.id] || 0);
      const empty = count <= 0 ? ' empty' : '';
      const rarity = materialRarityLabelDom(mat.rarity);
      const icon = materialIconDom(mat);
      const useText = materialUseTextDom(mat);
      const sourceText = materialSourceTextDom(mat);
      return `<div class="mat-card grid-mat-card${empty}" style="--mat-color:${escapeHtml(mat.color || '#aaa')}" title="${escapeHtml(mat.name || mat.id)} x${count} · 来源：${escapeHtml(sourceText)}">
        <span class="mat-rarity">${escapeHtml(rarity)}</span>
        <span class="mat-dot">${escapeHtml(icon)}</span>
        <b>${escapeHtml(mat.name || mat.id)}</b>
        <em>${escapeHtml(useText)} · 来源：${escapeHtml(sourceText)}</em>
        <strong>x${count}</strong>
      </div>`;
    }).join('');
    return inventoryMaterialHtmlCacheDom || '<div class="empty-note">暂无材料</div>';
  }
  function refreshEquipmentPanelsDom(options = {}) {
    const deferInventory = !!options.deferInventory;
    if (typeof updateUI === 'function') updateUI();
    if (showInventory) {
      if (deferInventory) scheduleInventoryRenderDom('equipment-change');
      else scheduleInventoryRenderDom('materials-only');
    }
    if (showCharacterPanel) {
      characterPanelLastHtml = '';
      renderCharacterDomPanel();
    }
  }
  function closeInventoryDetailDom() {
    inventoryDetailTarget = null;
    renderInventoryDomPanel();
    return true;
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
          popPanelFromStack('inventory');
          pushPanelToStack('character');
          characterPanelLastHtml = '';
          characterEquipmentDetailSlot = null;
          characterEquipmentSlotHint = null;
          showMessage('已装备！前往角色页一览全身修为', '#d4a0ff');
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
        <section class="inv-section bag-section" data-tab-panel="equipment"><div class="bag-toolbar"><div class="section-title bag-title">装备库存 0/36</div><div class="bag-sort-toggle" role="group" aria-label="装备排序"><button class="bag-sort-btn" type="button" data-bag-sort="power">战力</button><button class="bag-sort-btn" type="button" data-bag-sort="rarity">品质</button></div></div><div class="bag-slot-filter"></div><div class="bag-list"></div></section>
        <section class="inv-section material-section" data-tab-panel="materials"><div class="section-title">材料库存</div><div class="material-list"></div></section>
        <section class="inv-section process-section" data-tab-panel="process"><div class="section-title">处理 · 售卖/分解</div><div class="bulk-panel"><div class="bulk-tabs"><button class="bulk-tab sell" type="button" data-bulk-mode="sell">💰 售卖</button><button class="bulk-tab decompose" type="button" data-bulk-mode="decompose">🔧 分解</button></div><div class="bulk-quality-row"><span>品质</span><div class="bulk-rarity-chips"></div></div><select class="bulk-rarity" aria-label="选择品质"></select><div class="bulk-summary"></div></div></section>
      </div>
      <div class="inv-detail-layer"><div class="inv-detail-card"><div class="inv-detail-wrap"></div></div></div><div class="bulk-confirm-root"></div>
      <div class="inv-hint">背包只管理库存；穿上装备后到「角色」页查看属性、套装与战力</div>`;
    const container = document.getElementById('game-container') || document.body;
    container.appendChild(panel);
    const close = (e = null) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      markInventoryTouchActionDom();
      popPanelFromStack('inventory');
      syncBodyPanelState();
    };
    const closeFallback = e => {
      if (!e.target.closest('.inv-close')) return;
      if (e.type === 'click' && shouldIgnoreInventorySyntheticClickDom()) return;
      close(e);
    };
    panel.addEventListener('pointerdown', closeFallback, { passive: false, capture: true });
    panel.addEventListener('touchstart', closeFallback, { passive: false, capture: true });
    panel.addEventListener('click', closeFallback, { capture: true });
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
        closeInventoryDetailDom();
      };
      detailLayer.addEventListener('click', closeDetail);
      detailLayer.addEventListener('touchstart', closeDetail, { passive: false });
      detailLayer.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
      const closeDetailButtonFallback = e => {
        if (!e.target.closest('[data-detail-close]')) return;
        e.preventDefault();
        e.stopPropagation();
        markInventoryTouchActionDom();
        closeInventoryDetailDom();
      };
      detailLayer.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') closeDetailButtonFallback(e); }, { passive: false, capture: true });
      detailLayer.addEventListener('click', closeDetailButtonFallback, { capture: true });
      panel.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') closeDetailButtonFallback(e); }, { passive: false, capture: true });
      panel.addEventListener('click', closeDetailButtonFallback, { capture: true });
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
    /* Delegated tap handler for all static panel controls — prevents per-render listener leak */
    let invStart = null, invMoved = false;
    const invPoint = e => { const t = e.changedTouches?.[0] || e.touches?.[0] || e; return { x: Number(t.clientX) || 0, y: Number(t.clientY) || 0 }; };
    const invScrollTop = () => inventoryScrollableParentDom(panel)?.scrollTop || 0;
    panel.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { const p = invPoint(e); invStart = { x: p.x, y: p.y, scrollTop: invScrollTop() }; invMoved = false; } }, { passive: true });
    panel.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' && invStart) { const p = invPoint(e); if (Math.hypot(p.x - invStart.x, p.y - invStart.y) > INVENTORY_TAP_MOVE_THRESHOLD || Math.abs(invScrollTop() - invStart.scrollTop) > 2) invMoved = true; } }, { passive: true });
    panel.addEventListener('pointerup', e => {
      if (e.pointerType !== 'mouse' || !invStart) return;
      const shouldTap = !invMoved && Math.abs(invScrollTop() - invStart.scrollTop) <= 2;
      invStart = null; invMoved = false;
      if (!shouldTap) return;
      markInventoryTouchActionDom();
      handleInventoryDelegatedTapDom(e);
    }, { passive: false });
    panel.addEventListener('click', e => {
      if (shouldIgnoreInventorySyntheticClickDom()) return;
      handleInventoryDelegatedTapDom(e);
    });
    const bulkSelect = panel.querySelector('.bulk-rarity');
    if (bulkSelect) {
      bulkSelect.addEventListener('change', e => { inventoryBulkRarity = e.target.value; inventoryBulkConfirm = null; renderInventoryDomPanel(); });
      bulkSelect.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    }
    return panel;
  }
  function handleInventoryDelegatedTapDom(e) {
    const target = e.target;
    const closest = sel => target.closest(sel);
    if (closest('[data-inv-tab]')) { e.preventDefault(); e.stopPropagation(); inventoryTab = closest('[data-inv-tab]').dataset.invTab || 'equipment'; inventoryBulkConfirm = null; renderInventoryDomPanel(); return; }
    if (closest('[data-clear-slot-filter]')) { e.preventDefault(); e.stopPropagation(); inventorySlotFilter = ''; inventoryDetailTarget = null; invalidateInventoryListCacheDom(); renderInventoryDomPanel(); return; }
    if (closest('[data-bag-sort]')) { e.preventDefault(); e.stopPropagation(); const mode = closest('[data-bag-sort]').dataset.bagSort || 'power'; if (inventorySortMode === mode) return; inventorySortMode = mode; inventoryDetailTarget = null; scheduleInventoryRenderDom('sort'); return; }
    if (closest('[data-bulk-rarity-chip]')) { e.preventDefault(); e.stopPropagation(); inventoryBulkRarity = closest('[data-bulk-rarity-chip]').dataset.bulkRarityChip || inventoryBulkRarity; inventoryBulkConfirm = null; renderInventoryDomPanel(); return; }
    if (closest('[data-bulk-mode]')) { e.preventDefault(); e.stopPropagation(); inventoryBulkMode = closest('[data-bulk-mode]').dataset.bulkMode || 'sell'; inventoryBulkConfirm = null; renderInventoryDomPanel(); return; }
    if (closest('[data-bulk-sell]')) { e.preventDefault(); e.stopPropagation(); bulkSellInventoryByRarityDom(inventoryBulkRarity); return; }
    if (closest('[data-bulk-decompose]')) { e.preventDefault(); e.stopPropagation(); bulkDecomposeInventoryByRarityDom(inventoryBulkRarity); return; }
  }
  function renderInventoryDomPanel(reason = '') {
    const panel = ensureInventoryDomPanel();
    if (!showInventory || !player) return;
    const renderMaterialsOnly = reason === 'materials-only';
    const bagList = panel.querySelector('.bag-list');
    const materialList = panel.querySelector('.material-list');
    const detailWrap = panel.querySelector('.inv-detail-wrap');
    const detailLayer = panel.querySelector('.inv-detail-layer');
    const bulkSelect = panel.querySelector('.bulk-rarity');
    const bulkSummary = panel.querySelector('.bulk-summary');
    const inventoryCapacity = typeof getInventoryCapacity === 'function' ? getInventoryCapacity(player) : 36;
    const nextCapacityUnlock = typeof getNextInventoryCapacityUnlock === 'function' ? getNextInventoryCapacityUnlock(player) : null;
    panel.querySelector('.bag-title').innerHTML = `装备库存 <span class="cap-num">${player.inventory.length}</span>/<span class="cap-max">${inventoryCapacity}</span><span class="cap-bar"><span class="cap-fill${player.inventory.length >= inventoryCapacity ? ' full' : ''}" style="width:${Math.min(100, (player.inventory.length / inventoryCapacity) * 100).toFixed(1)}%"></span></span>`;
    const filterWrap = panel.querySelector('.bag-slot-filter');
    if (filterWrap) {
      const filterName = inventorySlotFilter ? (SLOT_NAMES?.[inventorySlotFilter]?.name || inventorySlotFilter) : '';
      filterWrap.innerHTML = inventorySlotFilter ? `<span>筛选：${escapeHtml(filterName)}</span><button type="button" data-clear-slot-filter="1" aria-label="清除${escapeHtml(filterName)}筛选" title="清除筛选，显示全部装备">全部装备</button>` : '';
      filterWrap.classList.toggle('active', !!inventorySlotFilter);
    }
    const invSub = panel.querySelector('.inv-sub');
    if (invSub) {
      invSub.textContent = nextCapacityUnlock
        ? `物品容器：装备库存、材料库存、售卖/分解处理 · ${nextCapacityUnlock.realmName}解锁 ${nextCapacityUnlock.capacity} 格（+${nextCapacityUnlock.increase}）`
        : `物品容器：装备库存、材料库存、售卖/分解处理 · 背包容量已满阶 ${inventoryCapacity} 格`;
    }
    panel.querySelectorAll('.inv-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.invTab === inventoryTab));
    panel.querySelectorAll('[data-tab-panel]').forEach(section => section.classList.toggle('active', section.dataset.tabPanel === inventoryTab));
    const allRarities = getInventoryBulkSelectableRaritiesDom();
    const availableRarities = allRarities.filter(rarity => player.inventory.some(item => item?.rarity === rarity));
    if (!allRarities.includes(inventoryBulkRarity)) inventoryBulkRarity = allRarities[0] || '普通';
    if (!availableRarities.includes(inventoryBulkRarity)) inventoryBulkRarity = availableRarities[0] || allRarities[0] || '普通';
    if (bulkSelect) {
      bulkSelect.innerHTML = allRarities.map(rarity => `<option value="${escapeHtml(rarity)}"${rarity === inventoryBulkRarity ? ' selected' : ''}>${escapeHtml(rarity)}</option>`).join('');
    }
    const selectedEntries = inventoryItemsByRarityDom(inventoryBulkRarity);
    const selectedPreview = bulkPreviewDom(inventoryBulkRarity);
    const rarityChips = panel.querySelector('.bulk-rarity-chips');
    if (rarityChips) {
      rarityChips.innerHTML = allRarities.map(rarity => {
        const preview = bulkPreviewDom(rarity);
        const active = rarity === inventoryBulkRarity ? ' active' : '';
        const disabled = preview.count ? '' : ' disabled';
        return `<button class="bulk-rarity-chip${active}${disabled}" type="button" data-bulk-rarity-chip="${escapeHtml(rarity)}" ${preview.count ? '' : 'disabled'}><b>${escapeHtml(rarityShortDom(rarity))}</b><span>${preview.count}</span></button>`;
      }).join('');
    }
    if (bulkSummary) bulkSummary.innerHTML = bulkPreviewHtmlDom(selectedPreview, inventoryBulkMode);
    panel.querySelectorAll('[data-bulk-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bulkMode === inventoryBulkMode);
    });
    if (!renderMaterialsOnly) {
      if (!player.inventory.length) {
        bagList.innerHTML = '<div class="empty-note">暂无装备，击败怪物可掉落</div>';
      } else {
        const nextBagHtml = inventoryListHtmlDom();
        if (bagList.dataset.htmlKey !== inventoryListHtmlCacheKeyDom || bagList.innerHTML !== nextBagHtml) {
          bagList.innerHTML = nextBagHtml;
          bagList.dataset.htmlKey = inventoryListHtmlCacheKeyDom;
        }
      }
    }
    if (materialList && inventoryTab === 'materials') materialList.innerHTML = materialCardsHtmlDom();
    const detail = inventoryDetailItemDom();
    if (!renderMaterialsOnly) {
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
    }
    panel.querySelectorAll('[data-inv-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.invTab === inventoryTab));
    panel.querySelectorAll('[data-bag-sort]').forEach(btn => {
      const mode = btn.dataset.bagSort || 'power';
      btn.classList.toggle('active', mode === inventorySortMode);
      btn.setAttribute('aria-pressed', mode === inventorySortMode ? 'true' : 'false');
    });
    panel.querySelectorAll('[data-bulk-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.bulkMode === inventoryBulkMode));
  }
  function hideDomPanelById(id) {
    const panel = typeof document !== 'undefined' ? document.getElementById(id) : null;
    if (panel) panel.style.display = 'none';
  }
  function closeAllPanels(options = {}) {
    const shouldSync = options.sync !== false;
    panelStack = [];
    showStageClearPanel = false;
    characterPanelLastHtml = '';
    characterPanelTouchState = null;
    characterEquipmentDetailSlot = null;
    characterEquipmentSlotHint = null;
    inventoryDetailTarget = null;
    inventorySlotFilter = '';
    inventoryBulkConfirm = null;
    inventoryDetailScrollKey = '';
    invalidateInventoryListCacheDom();
    skillDetailModalOpen = false;
    const skillLayer = typeof document !== 'undefined' ? document.getElementById('skill-detail-layer') : null;
    if (skillLayer) skillLayer.innerHTML = '';
    lastStageClearSummary = null;
    updatePanelFlagsFromStack();
    [
      'inventory-dom-panel',
      'character-dom-panel',
      'stage-dom-panel',
      'secretrealm-dom-panel',
      'tribulation-dom-panel',
      'ascension-dom-panel',
      'artifact-dom-panel',
      'alchemy-dom-panel',
      'breakthrough-dom-panel',
    ].forEach(id => {
      if (!shouldSync) hideDomPanelById(id);
    });
    clearTouchMovementState();
    if (shouldSync) syncBodyPanelState();
  }
  const PANEL_TAP_MOVE_THRESHOLD = 12;
  let suppressPanelSyntheticClickUntil = 0;
  function getPanelEventPoint(e) {
    const t = e?.changedTouches?.[0] || e?.touches?.[0] || e;
    return { x: Number(t?.clientX || 0), y: Number(t?.clientY || 0) };
  }
  function findPanelScrollParent(el) {
    let node = el?.parentElement || null;
    while (node) {
      if (
        node.classList?.contains('stage-body') ||
        node.classList?.contains('stage-chapter-strip') ||
        node.classList?.contains('stage-card-grid') ||
        node.classList?.contains('panel-body') ||
        node.classList?.contains('inv-body')
      ) return node;
      const style = typeof window !== 'undefined' ? window.getComputedStyle(node) : null;
      const canScrollY = style && /(auto|scroll)/.test(style.overflowY || '') && node.scrollHeight > node.clientHeight + 1;
      const canScrollX = style && /(auto|scroll)/.test(style.overflowX || '') && node.scrollWidth > node.clientWidth + 1;
      if (canScrollY || canScrollX) return node;
      node = node.parentElement;
    }
    return el?.parentElement || null;
  }
  function bindPanelTap(el, fn) {
    if (!el) return;
    let start = null;
    let moved = false;
    let handledTouchUntil = 0;
    const scrollSnapshot = () => {
      const parent = findPanelScrollParent(el);
      return { left: parent?.scrollLeft || 0, top: parent?.scrollTop || 0 };
    };
    const begin = e => {
      const p = getPanelEventPoint(e);
      const scroll = scrollSnapshot();
      start = { x: p.x, y: p.y, scrollLeft: scroll.left, scrollTop: scroll.top };
      moved = false;
    };
    const move = e => {
      if (!start) return;
      const p = getPanelEventPoint(e);
      const scroll = scrollSnapshot();
      if (
        Math.hypot(p.x - start.x, p.y - start.y) > PANEL_TAP_MOVE_THRESHOLD ||
        Math.abs(scroll.top - start.scrollTop) > 2 ||
        Math.abs(scroll.left - start.scrollLeft) > 2
      ) moved = true;
    };
    const finishTouch = e => {
      const scroll = scrollSnapshot();
      const shouldTap = start && !moved && Math.abs(scroll.top - start.scrollTop) <= 2 && Math.abs(scroll.left - start.scrollLeft) <= 2;
      start = null;
      moved = false;
      if (!shouldTap) return;
      handledTouchUntil = Date.now() + 500;
      suppressPanelSyntheticClickUntil = Math.max(suppressPanelSyntheticClickUntil, handledTouchUntil);
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      fn(e);
    };
    const cancel = () => { start = null; moved = false; handledTouchUntil = Date.now() + 180; suppressPanelSyntheticClickUntil = Math.max(suppressPanelSyntheticClickUntil, handledTouchUntil); };
    if (window.PointerEvent) {
      el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') begin(e); }, { passive: true });
      el.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') move(e); }, { passive: true });
      el.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') finishTouch(e); }, { passive: false });
      el.addEventListener('pointercancel', cancel, { passive: true });
    } else {
      el.addEventListener('touchstart', begin, { passive: true });
      el.addEventListener('touchmove', move, { passive: true });
      el.addEventListener('touchend', finishTouch, { passive: false });
      el.addEventListener('touchcancel', cancel, { passive: true });
    }
    el.addEventListener('click', e => {
      if (Date.now() < handledTouchUntil || Date.now() < suppressPanelSyntheticClickUntil) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      fn(e);
    });
  }
  function ensureDomPanelForType(panel) {
    if (typeof document === 'undefined') return null;
    const map = {
      inventory: () => typeof ensureInventoryDomPanel === 'function' && ensureInventoryDomPanel(),
      character: () => typeof ensureCharacterDomPanel === 'function' && ensureCharacterDomPanel(),
      skills: () => typeof ensureSkillsDomPanel === 'function' && ensureSkillsDomPanel(),
      artifact: () => typeof ensureArtifactDomPanel === 'function' && ensureArtifactDomPanel(),
      alchemy: () => typeof ensureAlchemyDomPanel === 'function' && ensureAlchemyDomPanel(),
      breakthrough: () => typeof ensureBreakthroughDomPanel === 'function' && ensureBreakthroughDomPanel(),
      secretrealm: () => typeof ensureSecretRealmDomPanel === 'function' && ensureSecretRealmDomPanel(),
      stages: () => typeof ensureStageDomPanel === 'function' && ensureStageDomPanel(),
      tribulation: () => typeof ensureTribulationDomPanel === 'function' && ensureTribulationDomPanel(),
      ascension: () => typeof ensureAscensionDomPanel === 'function' && ensureAscensionDomPanel(),
    };
    return map[panel]?.() || null;
  }
  function openPanel(panel) {
    if (isInCombat()) return;
    /* Toggle: if this exact panel type is the top of the stack, close it. */
    if (panelStack.length > 0 && panelStack[panelStack.length - 1] === panel) {
      popPanelFromStack(panel);
      syncBodyPanelState();
      return;
    }
    const primaryPanelTypes = new Set(['inventory', 'character', 'skills', 'stages', 'ascension', 'secretrealm']);
    const topType = panelStack.length > 0 ? panelStack[panelStack.length - 1] : null;
    if (primaryPanelTypes.has(panel) && primaryPanelTypes.has(topType)) {
      panelStack = [];
      updatePanelFlagsFromStack();
      characterPanelLastHtml = '';
      inventoryDetailTarget = null;
      characterEquipmentDetailSlot = null;
      characterEquipmentSlotHint = null;
      if (typeof closeSkillDetailModal === 'function') closeSkillDetailModal();
    }
    ensureDomPanelForType(panel);
    pushPanelToStack(panel);
    if (panel === 'stages') {
      const selectedStage = (typeof STAGES !== 'undefined' && STAGES) ? STAGES[selectedStageId] : null;
      stageTab = 'stages';
      stageDetailOpen = false;
      stageSweepOpen = false;
      selectedStageChapterId = selectedStage?.chapterId || selectedStageChapterId;
    }
    if (panel === 'breakthrough') {
      openBreakthroughPanel();
      return;
    }
    syncBodyPanelState();
    const currentPanelEl = ensureDomPanelForType(panel);
    if (currentPanelEl) currentPanelEl.style.removeProperty('display');
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
   let playerSpeed = 5.2;
   let lastFrameTime = 0;
   let gameLoopStarted = false;
   let currentFrameDt = 1 / 60;
   const MAX_MOVEMENT_DT = 1 / 30;
   const TARGET_FRAME_DT = 1 / 60;
   function startGameLoop() {
     if (gameLoopStarted) return;
     gameLoopStarted = true;
     lastFrameTime = 0;
     const tick = timestamp => {
       if (!lastFrameTime) lastFrameTime = timestamp;
       const rawDt = Math.max(0, (timestamp - lastFrameTime) / 1000);
       lastFrameTime = timestamp;
       currentFrameDt = Math.min(MAX_MOVEMENT_DT, rawDt || TARGET_FRAME_DT);
       gameLoop();
       requestAnimationFrame(tick);
     };
     if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
     else setInterval(() => { currentFrameDt = MAX_MOVEMENT_DT; gameLoop(); }, 1000 / 30);
   }
   function setupTouchControls() {
     // ─── Full-screen floating joystick ───
     const touchControls = document.getElementById('touch-controls');
     const joystickZone = document.getElementById('joystick-zone');
     const joystickBase = document.getElementById('joystick-base');
     const joystickThumb = document.getElementById('joystick-thumb');
     if (!touchControls || !joystickZone || !joystickBase || !joystickThumb) return;
    let jsTouchId = null;
    let jsPointerMode = null;
    let joystickOrigin = null;
    let lastJoystickMoveAt = 0;
    const joystickMetrics = {
      zoneW: 96,
      zoneH: 96,
      baseSize: 86,
      maxR: 31,
    };
    function refreshJoystickMetrics() {
      joystickMetrics.zoneW = joystickZone.offsetWidth || 96;
      joystickMetrics.zoneH = joystickZone.offsetHeight || 96;
      joystickMetrics.baseSize = joystickBase.offsetWidth || 86;
      joystickMetrics.maxR = Math.max(18, joystickMetrics.baseSize / 2 - 12);
    }
    refreshJoystickMetrics();
    const resetJoystickVisual = () => {
      joystick.active = false;
      joystick.dx = 0;
      joystick.dy = 0;
      joystick.distance = 0;
      joystickOrigin = null;
      jsTouchId = null;
      jsPointerMode = null;
      lastJoystickMoveAt = 0;
      joystickZone.classList.remove('active');
      joystickZone.style.left = '';
      joystickZone.style.top = '';
      joystickZone.style.bottom = '';
      joystickZone.style.right = '';
      joystickThumb.style.transform = 'translate(-50%, -50%)';
    };
    if (typeof window !== 'undefined') {
      window.__resetMovementTouchInput = () => resetJoystickVisual();
      window.addEventListener('blur', resetJoystickVisual);
      window.addEventListener('resize', refreshJoystickMetrics);
      window.addEventListener('orientationchange', refreshJoystickMetrics);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) resetJoystickVisual();
      });
    }
    function canStartMovement(e) {
      if (isMovementBlockedByUi()) return false;
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
       const zoneW = joystickMetrics.zoneW;
       const zoneH = joystickMetrics.zoneH;
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
      const maxR = joystickMetrics.maxR;
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
      if (jsPointerMode === 'pointer') return;
      if (jsTouchId !== null || !canStartMovement(e)) return;
      const t = e.changedTouches[0];
      jsPointerMode = 'touch';
      jsTouchId = t.identifier;
      joystick.active = true;
      lastJoystickMoveAt = performance.now();
      refreshJoystickMetrics();
      placeJoystickAt(t);
      updateJoystickPos(t);
      e.preventDefault();
    }, { passive: false });
    touchControls.addEventListener('touchmove', e => {
      if (jsPointerMode !== 'touch' || jsTouchId === null) return;
      const t = pointFromEvent(e);
      if (t) {
        lastJoystickMoveAt = performance.now();
        updateJoystickPos(t);
      }
      e.preventDefault();
    }, { passive: false });
    touchControls.addEventListener('touchend', e => {
      if (jsPointerMode !== 'touch') return;
      const t = pointFromEvent(e);
      if (!t) return;
      if (t.identifier === jsTouchId) resetJoystickVisual();
    }, { passive: true });
    touchControls.addEventListener('touchcancel', e => {
      if (jsPointerMode === 'touch') resetJoystickVisual();
    }, { passive: true });
    touchControls.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || jsTouchId !== null || !canStartMovement(e)) return;
      jsPointerMode = 'pointer';
      jsTouchId = e.pointerId;
      joystick.active = true;
      lastJoystickMoveAt = performance.now();
      refreshJoystickMetrics();
      placeJoystickAt(e);
      updateJoystickPos(e);
      if (typeof touchControls.setPointerCapture === 'function' && e.pointerId != null) {
        try { touchControls.setPointerCapture(e.pointerId); } catch (_) {}
      }
      e.preventDefault();
    }, { passive: false });
    touchControls.addEventListener('pointermove', e => {
      if (jsPointerMode !== 'pointer' || e.pointerId !== jsTouchId) return;
      lastJoystickMoveAt = performance.now();
      updateJoystickPos(e);
      e.preventDefault();
    }, { passive: false });
    touchControls.addEventListener('pointerup', e => {
      if (jsPointerMode === 'pointer' && e.pointerId === jsTouchId) resetJoystickVisual();
    }, { passive: true });
    touchControls.addEventListener('pointercancel', e => {
      if (jsPointerMode === 'pointer' && e.pointerId === jsTouchId) resetJoystickVisual();
    }, { passive: true });
    touchControls.addEventListener('lostpointercapture', e => {
      // Some mobile browsers fire lostpointercapture immediately after touchstart
      // during scrolling/overlay changes even though pointermove events still arrive
      // on the full-screen touch plane. Do not clear the active joystick here;
      // pointerup/pointercancel/blur/visibilitychange remain the authoritative reset paths.
    }, { passive: true });
    setInterval(() => {
      if (!joystick.active || jsTouchId === null) return;
      if (isMovementBlockedByUi()) { resetJoystickVisual(); return; }
      if (performance.now() - lastJoystickMoveAt > 4500) resetJoystickVisual();
    }, 1000);
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
     const quickClearBtn = document.getElementById('btn-stage-quick-clear');
     let quickClearLastTouchAt = 0;
     const onQuickClear = e => {
       e.preventDefault();
       e.stopPropagation();
       if (e.type === 'touchstart') quickClearLastTouchAt = Date.now();
       if (e.type === 'click' && Date.now() - quickClearLastTouchAt < 700) return;
       if (typeof quickClearStageRoom === 'function') quickClearStageRoom();
     };
     if (quickClearBtn) {
       quickClearBtn.addEventListener('touchstart', onQuickClear, { passive: false });
       quickClearBtn.addEventListener('click', onQuickClear);
     }
     const stageExitBtn = document.getElementById('btn-stage-exit');
     let stageExitLastTouchAt = 0;
     const onStageExit = e => {
       e.preventDefault();
       e.stopPropagation();
       if (e.type === 'touchstart') stageExitLastTouchAt = Date.now();
       if (e.type === 'click' && Date.now() - stageExitLastTouchAt < 700) return;
       if (typeof onStageFlee === 'function' && isInStageRun && !isInCombat() && !isAnyPanelOpen()) onStageFlee();
     };
     if (stageExitBtn) {
       stageExitBtn.addEventListener('touchstart', onStageExit, { passive: false });
       stageExitBtn.addEventListener('click', onStageExit);
     }
     const secretQuickBtn = document.getElementById('btn-secret-quick-challenge');
     let secretQuickLastTouchAt = 0;
     const onSecretQuick = e => {
       e.preventDefault();
       e.stopPropagation();
       if (e.type === 'touchstart') secretQuickLastTouchAt = Date.now();
       if (e.type === 'click' && Date.now() - secretQuickLastTouchAt < 700) return;
       if (typeof quickChallengeSecretRealm === 'function') quickChallengeSecretRealm();
     };
     if (secretQuickBtn) {
       secretQuickBtn.addEventListener('touchstart', onSecretQuick, { passive: false });
       secretQuickBtn.addEventListener('click', onSecretQuick);
     }
     const secretExitBtn = document.getElementById('btn-secret-exit');
     let secretExitLastTouchAt = 0;
     const onSecretExit = e => {
       e.preventDefault();
       e.stopPropagation();
       if (e.type === 'touchstart') secretExitLastTouchAt = Date.now();
       if (e.type === 'click' && Date.now() - secretExitLastTouchAt < 700) return;
       if (typeof onSecretRealmFlee === 'function' && isInSecretRealm && !isInCombat() && !isAnyPanelOpen()) onSecretRealmFlee();
     };
     if (secretExitBtn) {
       secretExitBtn.addEventListener('touchstart', onSecretExit, { passive: false });
       secretExitBtn.addEventListener('click', onSecretExit);
     }
   }
   function setupMenuButtons() {
     // Menu buttons — always active (touch + mouse click)
    const moreMenu = document.getElementById('more-menu');
    function closeMoreMenu() {
      if (!moreMenu) return;
      moreMenu.classList.remove('open');
      moreMenu.setAttribute('aria-hidden', 'true');
      moreMenu.setAttribute('inert', '');
      syncMainNavState();
    }
    function toggleMoreMenu(e) {
      if (e) e.preventDefault();
      if (e) e.stopPropagation();
      if (Date.now() < suppressPanelSyntheticClickUntil) return;
      if (isInCombat() || isAnyPanelOpen() || !moreMenu) return;
      const open = !moreMenu.classList.contains('open');
      moreMenu.classList.toggle('open', open);
      moreMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
      moreMenu.toggleAttribute('inert', !open);
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
    function onStages() {
      closeMoreMenu();
      if (isInStageRun && !isInCombat()) {
        popPanelFromStack('stages');
        showStageSelectUI = false;
        showStageClearPanel = false;
        const sp = document.getElementById('stage-dom-panel');
        if (sp) sp.style.display = 'none';
        syncBodyPanelState();
        showMessage('已在副本中，点击右下“离开”可退出当前副本。', '#ffdd66');
        return;
      }
      openPanel('stages');
    }
    function onArtifact() { closeMoreMenu(); openPanel('artifact'); }
    function onAlchemy() { closeMoreMenu(); openPanel('alchemy'); }
    function onBreakthrough() { closeMoreMenu(); openPanel('breakthrough'); }
    function onSecretRealm() {
      closeMoreMenu();
      openPanel('secretRealm');
    }
    function onTribulation() {
      closeMoreMenu();
      openPanel('tribulation');
    }
    function onAscension() {
      closeMoreMenu();
      openPanel('ascension');
    }
    function onSave() { closeMoreMenu(); saveGame(); showMessage('💾 道基已封！存档一片安宁。', '#88cc88'); }
    bindTap(document.getElementById('btn-bag'), onBag);
    bindTap(document.getElementById('btn-character'), onCharacter);
    bindTap(document.getElementById('btn-skills'), onSkills);
    bindTap(document.getElementById('btn-stages'), onStages);
    bindTap(document.getElementById('btn-more'), toggleMoreMenu);
    bindTap(document.getElementById('btn-artifact'), onArtifact);
    bindTap(document.getElementById('hud-artifact'), onArtifact);
    bindTap(document.getElementById('btn-alchemy'), onAlchemy);
    bindTap(document.getElementById('btn-break'), onBreakthrough);
    bindTap(document.getElementById('btn-secret-realm'), onSecretRealm);
    bindTap(document.getElementById('btn-tribulation'), onTribulation);
    bindTap(document.getElementById('btn-ascension'), onAscension);
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
      if (availableStatPoints > 0) {
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
function getActiveStage() {
  return player?.stageProgress?.currentRun?.stageId ? STAGES?.[player.stageProgress.currentRun.stageId] : null;
}
function getStageLevel(stageId = null, roomIndex = null) {
  const stage = stageId ? STAGES?.[stageId] : getActiveStage();
  const idx = roomIndex ?? player?.stageProgress?.currentRun?.roomIndex ?? 0;
  return Math.max(1, Number(stage?.level || dungeonLevel || 1) + Number(idx || 0));
}
function pickStageMonsterTemplate(stage, roomIndex) {
  const level = getStageLevel(stage.id, roomIndex);
  const biome = (typeof getStageTheme === 'function' ? getStageTheme(stage) : null) || (typeof getBiomeForLevel === 'function' ? getBiomeForLevel(level) : null);
  const pool = biome?.monsters || MONSTERS;
  const total = pool.reduce((s, m) => s + (m.weight || 1), 0);
  let roll = Math.random() * total;
  for (const mon of pool) { roll -= (mon.weight || 1); if (roll <= 0) return mon; }
  return pool[0];
}
function spawnStageMonsters(dungeonObj, stage, roomIndex = 0) {
  if (!dungeonObj || !stage) return;
  const event = getStageRoomEvent(stage, roomIndex);
  if (['treasure', 'rest', 'trap', 'fortune'].includes(event.type)) return;
  const level = getStageLevel(stage.id, roomIndex);
  const biome = dungeonObj.biome || (typeof getBiomeForLevel === 'function' ? getBiomeForLevel(level) : null);
  const biomeMult = biome?.monsterMult || { hp: 1, atk: 1, def: 1, xp: 1, stones: 1 };
  const rooms = dungeonObj.rooms || [];
  const isBossRoom = event.type === 'boss';
  if (isBossRoom && rooms.length > 1) {
    const room = rooms[rooms.length - 1];
    const bx = Math.floor(room.x + room.w / 2), by = Math.floor(room.y + room.h / 2);
    const base = pickStageMonsterTemplate(stage, roomIndex) || MONSTERS[0];
    const bossDef = stage.boss;
    const bossAffinity = typeof getStageBossAffinity === 'function' ? getStageBossAffinity(stage, base) : { weaknesses: bossDef.weaknesses || base.weaknesses || [], resists: bossDef.resists || base.resists || [] };
    const boss = createScaledEnemy({ ...base, name: bossDef.name, title: bossDef.name, symbol: bossDef.symbol || '首', color: bossDef.color || stage.color, isBoss: true, isStageBoss: true, stageId: stage.id, bossMechanicId: bossDef.mechanicId || null, skillIds: bossDef.skillIds || ['bossEnrage'], weaknesses: bossAffinity.weaknesses, resists: bossAffinity.resists, hp: Math.floor((base.hp || 40) * (bossDef.hpMult || 1.8)), atk: Math.floor((base.atk || 10) * (bossDef.atkMult || 1.3)), def: Math.floor((base.def || 3) * (bossDef.defMult || 1.15)), xp: Math.floor((base.xp || 20) * 3), stones: Math.floor((base.stones || 5) * 3) }, level, biomeMult, bx, by, { isBoss: true, isStageBoss: true, stageId: stage.id, bossMechanicId: bossDef.mechanicId || null, weaknesses: bossAffinity.weaknesses, resists: bossAffinity.resists });
    dungeonObj._monsters.set(`${bx},${by}`, boss);
    return;
  }
  const targetRooms = rooms.slice(1, -1).length ? rooms.slice(1, -1) : rooms.slice(1);
  const count = Math.min(10, Math.max(3, 3 + roomIndex + Math.floor((stage.level || 1) / 4)));
  const eliteRoom = targetRooms[Math.min(targetRooms.length - 1, Math.max(0, Math.floor(targetRooms.length / 2)))] || rooms[1];
  if (eliteRoom && roomIndex >= Math.max(1, (stage.roomCount || 3) - 2)) {
    const ex = Math.floor(eliteRoom.x + eliteRoom.w / 2), ey = Math.floor(eliteRoom.y + eliteRoom.h / 2);
    const tmpl = pickStageMonsterTemplate(stage, roomIndex);
    dungeonObj._monsters.set(`${ex},${ey}`, createScaledEnemy(tmpl, level, biomeMult, ex, ey, { isElite: true, eliteRewardMult: 2.0 }));
  }
  for (let i = 0; i < count; i++) {
    const room = targetRooms[Math.floor(Math.random() * targetRooms.length)] || rooms[0];
    if (!room) continue;
    const mx = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
    const my = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
    if (dungeonObj.grid?.[my]?.[mx] !== TILE.FLOOR || dungeonObj._monsters.has(`${mx},${my}`)) continue;
    dungeonObj._monsters.set(`${mx},${my}`, createScaledEnemy(pickStageMonsterTemplate(stage, roomIndex), level, biomeMult, mx, my));
  }
}
function getDungeonStairsCell(dungeonObj = dungeon) {
     if (!dungeonObj?.grid) return null;
     for (let y = 0; y < dungeonObj.grid.length; y++) {
       const row = dungeonObj.grid[y] || [];
       for (let x = 0; x < row.length; x++) {
         if (row[x] === TILE.STAIRS_DOWN) return { x, y };
       }
     }
     return dungeonObj._stageExit || null;
   }
function countStageAliveMonsters(dungeonObj = dungeon) {
     if (!dungeonObj?._monsters) return 0;
     let count = 0;
     for (const enemy of dungeonObj._monsters.values()) {
       if (enemy && Number(enemy.hp || 0) > 0) count++;
     }
     return count;
   }
function setStageRoomExitLocked(dungeonObj = dungeon, locked = true) {
     if (!dungeonObj?.grid) return;
     const exit = dungeonObj._stageExit || getDungeonStairsCell(dungeonObj);
     if (!exit || dungeonObj.grid?.[exit.y]?.[exit.x] === undefined) return;
     dungeonObj._stageExit = { x: exit.x, y: exit.y };
     dungeonObj.grid[exit.y][exit.x] = locked ? TILE.FLOOR : TILE.STAIRS_DOWN;
     if (!locked) {
       const key = `${exit.x},${exit.y}`;
       discoveredMap.add(key);
       visibleMap.add(key);
     }
     if (typeof resetDomMapCache === 'function') resetDomMapCache();
   }
function configureStageRoomExit(stage, roomIndex, dungeonObj = dungeon) {
     if (!stage || !dungeonObj) return;
     const event = getStageRoomEvent(stage, roomIndex);
     const combatRoom = ['normal', 'elite', 'boss'].includes(event?.type);
     const hasMonsters = countStageAliveMonsters(dungeonObj) > 0;
     setStageRoomExitLocked(dungeonObj, combatRoom && hasMonsters);
   }
function revealStageRoomExitIfCleared(dungeonObj = dungeon) {
     if (!dungeonObj || countStageAliveMonsters(dungeonObj) > 0) return false;
     setStageRoomExitLocked(dungeonObj, false);
     return true;
   }
function generateHomeMap(options = {}) {
     if (typeof normalizeStageProgress === 'function') player.stageProgress = normalizeStageProgress(player.stageProgress);
     if (player.stageProgress) player.stageProgress.currentRun = null;
     isInStageRun = false;
     stageRoomIndex = 0;
     stageRoomCount = 0;
     dungeon = generateDungeon(DUNGEON_WIDTH, DUNGEON_HEIGHT, MAX_DEPTH, 1);
     dungeon._monsters = new Map();
     dungeon._materials = [];
     dungeon._chests = [];
     discoveredMap = new Set();
     visibleMap = new Set();
     lastInteractionTileKey = '';
     resetDomMapCache();
     window.dungeon = dungeon;
     const r = dungeon.spawnRoom;
     player.x = Math.floor(r.x + r.w / 2);
     player.y = Math.floor(r.y + r.h / 2);
     camera = { x: player.x * CELL_SIZE - canvasW / 2, y: player.y * CELL_SIZE - canvasH / 2 };
     if (options.welcome) showMessage('点击底部「副本」选择关卡', '#d4a0ff', { ttl: 90, quiet: true });
   }
function generateNewFloor() {
     const activeStage = getActiveStage();
     const activeRoomIndex = player?.stageProgress?.currentRun?.roomIndex || 0;
     if (activeStage) dungeonLevel = getStageLevel(activeStage.id, activeRoomIndex);
     dungeon = generateDungeon(DUNGEON_WIDTH, DUNGEON_HEIGHT, MAX_DEPTH, dungeonLevel);
     if (activeStage && typeof getStageTheme === 'function') dungeon.biome = getStageTheme(activeStage) || dungeon.biome;
     dungeon._monsters = new Map();
     dungeon._materials = [];
     dungeon._chests = [];
     discoveredMap = new Set();
     visibleMap = new Set();
     lastInteractionTileKey = '';
     resetDomMapCache();
     window.dungeon = dungeon;
     if (activeStage) {
       spawnStageMonsters(dungeon, activeStage, activeRoomIndex);
       configureStageRoomExit(activeStage, activeRoomIndex, dungeon);
     }
     else spawnMonsters(dungeon, dungeonLevel);
     if (!activeStage) {
       scatterMaterials(dungeon, dungeonLevel);
       spawnTreasureChests(dungeon, dungeonLevel);
     }
     // Boss floor notification
     if (!activeStage && isBossFloor(dungeonLevel)) {
       const boss = typeof getBossForLevel === 'function' ? getBossForLevel(dungeonLevel) : BOSSES.find(b => b.floor === dungeonLevel);
       if (boss) {
         showMessage(`⚠️ Boss层！${boss.name} 在此镇守！`, '#ff2200');
       }
     } else if (activeStage) {
       const event = getStageRoomEvent(activeStage, activeRoomIndex);
       showMessage(`🗺️ ${activeStage.name} · ${getStageRoomLabel(activeStage, activeRoomIndex)}（${activeRoomIndex + 1}/${activeStage.roomCount}）${event.desc ? '：' + event.desc : ''}`, activeStage.color || '#d4a0ff');
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
    if (isMovementBlockedByUi()) {
      if (joystick?.active && typeof clearTouchMovementState === 'function') clearTouchMovementState();
      return;
    }
     let dx = 0, dy = 0;
     let movingWithJoystick = false;
     // Keyboard input
     if (keys['ArrowUp'] || keys['w']) dy = -1;
     if (keys['ArrowDown'] || keys['s']) dy = 1;
     if (keys['ArrowLeft'] || keys['a']) dx = -1;
     if (keys['ArrowRight'] || keys['d']) dx = 1;
     // Joystick override
     if (joystick.active && (joystick.dx !== 0 || joystick.dy !== 0)) {
       dx = joystick.dx;
       dy = joystick.dy;
       movingWithJoystick = true;
     }
     // Normalize diagonal movement
     if (dx !== 0 && dy !== 0) {
       const len = Math.sqrt(dx * dx + dy * dy);
       dx /= len;
       dy /= len;
     }
     if (dx === 0 && dy === 0) {
      // Keep an active joystick alive while the finger is still inside the dead zone.
      // Mobile browsers often deliver rAF between touchstart and the first touchmove;
      // clearing here makes the following drag get ignored, which feels like the
      // movement button was touched but never grabbed.
      return;
    }
     // Continuous movement based on real frame delta. The old fixed 30 FPS
     // step made mobile movement feel sticky and then jump when frames were
     // delayed by DOM work/browser throttling.
     const frameDt = Math.min(MAX_MOVEMENT_DT, Math.max(0, Number.isFinite(currentFrameDt) ? currentFrameDt : TARGET_FRAME_DT));
     const analogBoost = movingWithJoystick ? Math.max(0.62, Math.min(1, Number(joystick.distance || 1))) : 1;
     const speed = playerSpeed * frameDt * analogBoost;
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
    if (isInStageRun && player?.stageProgress?.currentRun) player.stageProgress.currentRun.turns = Number(player.stageProgress.currentRun.turns || 0) + 1;
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
     const frameDt = Math.min(MAX_MOVEMENT_DT, Math.max(0, Number.isFinite(currentFrameDt) ? currentFrameDt : TARGET_FRAME_DT));
     const follow = Math.min(0.68, 1 - Math.pow(0.68, frameDt / TARGET_FRAME_DT));
     camera.x += (targetX - camera.x) * follow;
     camera.y += (targetY - camera.y) * follow;
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
         invalidateInventoryListCacheDom();
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
   function updateMapVisibilityIfNeeded(force = false) {
     if (!dungeon || !player) return;
     const px = Math.floor(player.x);
     const py = Math.floor(player.y);
     if (!force && mapRenderCache.lastPx === px && mapRenderCache.lastPy === py && mapRenderCache.visibilityKey) return;
     updateMapVisibility();
     mapRenderCache.lastPx = px;
     mapRenderCache.lastPy = py;
   }
   function resetDomMapCache() {
     mapRenderCache = {
       floorKey: '', boundsKey: '', visibilityKey: '', entityKey: '', hintKey: '', miniKey: '',
       lastPx: NaN, lastPy: NaN, tilesEl: null, entitiesEl: null, hintsEl: null, miniEl: null, playerEl: null,
       canvasFloorKey: '', canvasBoundsKey: '', canvasVisibilityKey: '',
       layerCellSize: NaN, layerW: '', layerH: '', layerTransform: '',
       hintTileKey: '', hintVisibilityKey: '', miniTileKey: '', miniVisibilityKey: '',
       playerTransform: '', hiddenMiniMap: false
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
     else if (biome?.decor === 'thunder' && (x * 7 + y) % 11 === 0) inner += '<b class="tile-deco deco-snow">ϟ</b>';
     else if (biome?.decor === 'cloud' && (x * 5 + y) % 12 === 0) inner += '<b class="tile-deco deco-snow">☁</b>';
     else if (biome?.decor === 'void' && (x * 3 + y) % 13 === 0) inner += '<b class="tile-deco deco-snow">✧</b>';
     else if ((biome?.decor === 'vine' || biome?.id === 'jungle') && (x * 5 + y) % 13 === 0) inner += '<b class="tile-deco deco-jungle">⌁</b>';
     else if (biome?.id === 'snow' && (x * 7 + y) % 10 === 0) inner += '<b class="tile-deco deco-snow">✧</b>';
     else if ((biome?.decor === 'blood' || biome?.id === 'lava') && (x + y * 2) % 9 === 0) inner += '<i class="tile-lava-crack"></i>';
     return `<div class="map-tile ${floorCls} ${fog}" style="transform:translate3d(${left}px,${top}px,0)">${inner}</div>`;
   }

   function renderDomMapOverlay(force = false) {
     if (!dungeon || !player || !camera) return;
     const layer = document.getElementById('map-layer');
     if (!layer) return;
     const px = Math.floor(player.x);
     const py = Math.floor(player.y);
     updateMapVisibilityIfNeeded();
     const biome = dungeon.biome || getBiomeForLevel?.(dungeonLevel) || {};
     const floorKey = `${dungeonLevel}:${biome.id || ''}:${dungeon.width}x${dungeon.height}:${CELL_SIZE}`;
     if (floorKey !== mapRenderCache.floorKey) {
       resetDomMapCache();
       mapRenderCache.floorKey = floorKey;
       force = true;
     }
     ensureDomMapLayers(layer);
     const layerW = `${dungeon.width * CELL_SIZE}px`;
     const layerH = `${dungeon.height * CELL_SIZE}px`;
     if (mapRenderCache.layerCellSize !== CELL_SIZE) {
       layer.style.setProperty('--cs', `${CELL_SIZE}px`);
       mapRenderCache.layerCellSize = CELL_SIZE;
     }
     if (mapRenderCache.layerW !== layerW) {
       layer.style.width = layerW;
       mapRenderCache.layerW = layerW;
     }
     if (mapRenderCache.layerH !== layerH) {
       layer.style.height = layerH;
       mapRenderCache.layerH = layerH;
     }
     const transform = `translate3d(${-Math.round(camera.x)}px,${-Math.round(camera.y)}px,0)`;
     if (mapRenderCache.layerTransform !== transform) {
       layer.style.transform = transform;
       mapRenderCache.layerTransform = transform;
     }
     const grid = dungeon.grid;
     const startCol = Math.max(0, Math.floor(camera.x / CELL_SIZE) - 3);
     const endCol = Math.min(grid[0].length, startCol + Math.ceil(canvasW / CELL_SIZE) + 6);
     const startRow = Math.max(0, Math.floor(camera.y / CELL_SIZE) - 3);
     const endRow = Math.min(grid.length, startRow + Math.ceil(canvasH / CELL_SIZE) + 6);
     const boundsKey = `${startCol},${endCol},${startRow},${endRow}`;
     const tileKey = `${px},${py}`;
     const visibilityKey = `${boundsKey}:${discoveredMap.size}:${visibleMap.size}:${tileKey}`;
    const shouldRefreshEntities = force || visibilityKey !== mapRenderCache.visibilityKey || boundsKey !== mapRenderCache.boundsKey || !mapRenderCache.playerEl?.isConnected;
    mapRenderCache.boundsKey = boundsKey;
    mapRenderCache.visibilityKey = visibilityKey;
    if (shouldRefreshEntities) renderDomMapEntities(startCol, endCol, startRow, endRow, px, py);
    updateDomMapPlayerTransform();
     const shouldRefreshHints = force || tileKey !== mapRenderCache.hintTileKey || visibilityKey !== mapRenderCache.hintVisibilityKey || (gameTicks % MAP_HINT_UPDATE_INTERVAL === 0);
     if (shouldRefreshHints) {
       renderDomMapHints(startCol, endCol, startRow, endRow);
       mapRenderCache.hintTileKey = tileKey;
       mapRenderCache.hintVisibilityKey = visibilityKey;
     }
     const shouldRefreshMiniMap = force || tileKey !== mapRenderCache.miniTileKey || visibilityKey !== mapRenderCache.miniVisibilityKey || (gameTicks % MAP_MINIMAP_UPDATE_INTERVAL === 0);
     if (shouldRefreshMiniMap) {
       renderDomMiniMap(px, py);
       mapRenderCache.miniTileKey = tileKey;
       mapRenderCache.miniVisibilityKey = visibilityKey;
     }
   }

   function renderDomMap() {
     renderDomMapOverlay();
   }


   function renderDomMapEntities(startCol, endCol, startRow, endRow, px = Math.floor(player?.x ?? 0), py = Math.floor(player?.y ?? 0)) {
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
        const dist = Math.hypot(mx - px, my - py);
        const reveal = dist > 6 ? ' far' : (dist > 4 ? ' dim' : (dist > 2.5 ? ' near' : ' close'));
        const mobCls = mon.isBoss ? ' boss' : (mon.isElite ? ' elite' : '');
        const label = dist <= 4 || mon.isBoss || mon.isElite ? escapeHtml(mon.symbol || '妖') : '';
        parts.push(`<div class="map-monster${mobCls}${reveal}" style="--mob-color:${escapeHtml(mon.color || '#45525d')};transform:translate3d(${mx * CELL_SIZE}px,${my * CELL_SIZE}px,0)"><span>${label}</span></div>`);
       }
     }
     parts.push(`<div id="map-player"><i class="map-player-glow"></i><i class="map-player-body"></i><i class="map-player-head"></i><i class="map-player-eyes"><b></b><b></b></i></div>`);
     const entityKey = `${parts.length}:${dungeon._materials?.length || 0}:${dungeon._chests?.length || 0}:${dungeon._monsters?.size || 0}:${isInCombat() ? 1 : 0}:${mapRenderCache.visibilityKey}`;
     if (entityKey !== mapRenderCache.entityKey || !mapRenderCache.playerEl?.isConnected) {
      mapRenderCache.entitiesEl.innerHTML = parts.join('');
      mapRenderCache.playerEl = mapRenderCache.entitiesEl.querySelector('#map-player');
      // A DOM rebuild creates a fresh player node with no inline transform. Reset
      // the cached transform so entering a dungeon (or changing floor/visibility)
      // always positions the character immediately instead of reusing the prior
      // string and leaving the new marker at its default/offscreen position.
      mapRenderCache.playerTransform = '';
      mapRenderCache.entityKey = entityKey;
     }
   }

   function updateDomMapPlayerTransform() {
     if (!mapRenderCache.playerEl) return;
     const playerTransform = `translate3d(${player.x * CELL_SIZE}px,${player.y * CELL_SIZE}px,0)`;
     if (mapRenderCache.playerTransform !== playerTransform) {
       mapRenderCache.playerEl.style.transform = playerTransform;
       mapRenderCache.playerTransform = playerTransform;
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
        if (!mon.isBoss && !mon.isElite && dist > 4.5) continue;
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
     if (!dungeon || canvasW < 320) {
       if (!mapRenderCache.hiddenMiniMap) {
         mapRenderCache.miniEl.innerHTML = '';
         mapRenderCache.miniKey = '';
         mapRenderCache.hiddenMiniMap = true;
       }
       return;
     }
     const scale = Math.max(2, Math.min(4, Math.floor(canvasW / 140)));
     const w = dungeon.width * scale;
     const h = dungeon.height * scale;
     if (w + 18 > canvasW || h > canvasH * 0.36) {
       if (!mapRenderCache.hiddenMiniMap) {
         mapRenderCache.miniEl.innerHTML = '';
         mapRenderCache.miniKey = '';
         mapRenderCache.hiddenMiniMap = true;
       }
       return;
     }
     mapRenderCache.hiddenMiniMap = false;
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
        const dist = Math.hypot(mx - px, my - py);
        if (!mon.isBoss && !mon.isElite && dist > 6) continue;
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
     // Avoid per-tile CanvasGradient allocation during movement frames. The small
     // top/bottom strips below preserve depth while keeping drawDungeon() cheap.
     const tint = roomTint(type);
     if (tint) { ctx.fillStyle = tint; ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE); }
     ctx.fillStyle = 'rgba(255,255,255,0.045)';
     ctx.fillRect(sx + 1, sy + 1, CELL_SIZE - 2, 1);
     ctx.fillStyle = 'rgba(0,0,0,0.075)';
     ctx.fillRect(sx + 1, sy + CELL_SIZE - 3, CELL_SIZE - 2, 2);
     ctx.strokeStyle = biome.border || 'rgba(245,225,255,0.12)';
     ctx.strokeRect(sx + 0.5, sy + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
     drawRoomEdge(sx, sy, x, y, type);
     if ((x + y * 3) % 11 === 0) {
       ctx.fillStyle = biome.speck || 'rgba(255,255,255,0.20)';
       ctx.fillRect(sx + 3, sy + 3, 2, 2);
     }
     if (type === 'treasure' && (x + y) % 9 === 0) {
       ctx.fillStyle = 'rgba(255,225,100,0.45)';
       ctx.fillText('✦', sx + CELL_SIZE - 9, sy + 9);
     } else if (type === 'boss' && (x * 3 + y) % 10 === 0) {
       ctx.fillStyle = 'rgba(220,90,255,0.42)';
       ctx.fillText('◆', sx + 4, sy + CELL_SIZE - 5);
     }
     if ((biome.decor === 'vine' || biome.id === 'jungle') && (x * 5 + y) % 13 === 0) {
       ctx.fillStyle = 'rgba(40,120,35,0.55)';
       ctx.fillText('⌁', sx + 3, sy + CELL_SIZE - 4);
     } else if ((biome.decor === 'blood' || biome.id === 'lava') && (x + y * 2) % 9 === 0) {
       ctx.fillStyle = 'rgba(255,110,20,0.45)';
       ctx.fillRect(sx + 2, sy + CELL_SIZE - 5, CELL_SIZE - 4, 2);
     } else if (biome.decor === 'thunder' && (x * 7 + y) % 11 === 0) {
       ctx.fillStyle = 'rgba(255,240,80,0.55)';
       ctx.fillText('ϟ', sx + CELL_SIZE - 9, sy + 9);
     } else if (biome.decor === 'cloud' && (x * 5 + y) % 12 === 0) {
       ctx.fillStyle = 'rgba(255,255,255,0.45)';
       ctx.fillText('☁', sx + 2, sy + CELL_SIZE - 5);
     } else if ((biome.decor === 'void' || biome.id === 'snow') && (x * 7 + y) % 10 === 0) {
       ctx.fillStyle = 'rgba(235,250,255,0.30)';
       ctx.fillText('✧', sx + CELL_SIZE - 9, sy + 8);
     }
   }

   function drawDungeon() {
     if (!dungeon || !player || !camera) return;
     updateMapVisibilityIfNeeded();
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
           ctx.fillStyle = 'rgba(255,255,255,0.045)';
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
    const closeCharacterPanelDom = e => {
      if (!e?.target?.closest?.('.char-close,[data-char-close-panel]')) return false;
      e.preventDefault?.();
      e.stopPropagation?.();
      popPanelFromStack('character');
      characterPanelLastHtml = '';
      closeCharacterDetailPopupDom();
      syncBodyPanelState();
      return true;
    };
    p.addEventListener('pointerdown', closeCharacterPanelDom, { passive: false, capture: true });
    p.addEventListener('touchstart', closeCharacterPanelDom, { passive: false, capture: true });
    p.addEventListener('click', closeCharacterPanelDom, { capture: true });
    p.addEventListener('click', e => {
      if (e.target.closest('.char-close')) {
        closeCharacterPanelDom(e);
      }
    });
    p.addEventListener('touchstart', e => {
      if (e.target.closest('.char-close')) {
        closeCharacterPanelDom(e);
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
        if (!player.equipment?.[slot]) {
          characterEquipmentDetailSlot = null;
          characterEquipmentSlotHint = slot;
          characterPanelLastHtml = '';
          renderCharacterDomPanel();
          const hint = document.querySelector('#character-dom-panel .char-equip-slot-tip');
          if (hint) hint.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return;
        }
        characterEquipmentSlotHint = null;
        characterEquipmentDetailSlot = slot;
        p.querySelectorAll('.char-equip-card.active').forEach(el => el.classList.remove('active'));
        card.classList.add('active');
        showCharacterDetailPopupDom();
      });
    });
    p.querySelectorAll('[data-char-build-jump]').forEach(btn => {
      bindInventoryTapDom(btn, () => {
        openCharacterBuildSkillTargetDom({ tree: btn.dataset.tree, index: parseInt(btn.dataset.index, 10) || 0, label: btn.textContent?.replace(/去技能页/g, '').trim() || '推荐技能' });
      });
    });
    p.querySelectorAll('[data-char-open-inventory-slot]').forEach(btn => {
      bindInventoryTapDom(btn, () => openInventoryForCharacterSlotDom(btn.dataset.charOpenInventorySlot));
    });
    p.querySelectorAll('[data-char-tab-jump]').forEach(btn => {
      bindInventoryTapDom(btn, () => { characterTab = btn.dataset.charTabJump || 'attributes'; characterPanelLastHtml = ''; closeCharacterDetailPopupDom(); renderCharacterDomPanel(); });
    });
    p.querySelectorAll('[data-char-open-skills]').forEach(btn => {
      bindInventoryTapDom(btn, () => { popPanelFromStack('character'); pushPanelToStack('skills'); syncBodyPanelState(); });
    });
    p.querySelectorAll('[data-char-close-panel]').forEach(btn => {
      bindInventoryTapDom(btn, () => { popPanelFromStack('character'); syncBodyPanelState(); });
    });
    p.querySelectorAll('[data-equip-title]').forEach(btn => {
      // 称号卡片位于可滚动列表内：使用移动阈值 tap 绑定，避免 touchstart preventDefault 抢走纵向滑动。
      bindInventoryTapDom(btn, () => {
        const titleId = btn.dataset.equipTitle;
        player.titles = typeof normalizeTitleState === 'function' ? normalizeTitleState(player.titles) : (player.titles || { unlocked: {}, equipped: null });
        if (!player.titles.unlocked?.[titleId]) return;
        player.titles.equipped = player.titles.equipped === titleId ? null : titleId;
        if (typeof player.recalcStats === 'function') player.recalcStats();
        autoSave();
        characterPanelLastHtml = '';
        renderCharacterDomPanel();
        showMessage(player.titles.equipped ? `🏷️ 已佩戴称号：${PLAYER_TITLES[titleId]?.name || '称号'}` : '已卸下称号', '#ffd36e');
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
      atk: ['攻击', ''], def: ['防御', ''], hp: ['生命', ''], maxHp: ['生命上限', ''], maxHpPct: ['生命上限', '%'],
      atkPct: ['攻击', '%'], defPct: ['防御', '%'], mp: ['灵力', ''], maxMp: ['灵力上限', ''], maxMpPct: ['灵力上限', '%'], speed: ['速度', ''],
      crit: ['暴击', '%'], critRate: ['暴击', '%'], dodge: ['闪避', '%'], dodgeRate: ['闪避', '%'],
      fireDmg: ['火焰伤害', ''], iceDmg: ['寒冰伤害', ''], poisonDmg: ['毒素伤害', ''], lightningDmg: ['雷电伤害', ''],
      lifesteal: ['吸血', '%'], armorPen: ['破甲', ''], goldFind: ['灵石获取', '%'], xpBonus: ['经验获取', '%'],
      hpRegen: ['生命恢复', ''], mpRegen: ['灵力恢复', ''], allRes: ['全元素抗性', ''],
    };
    return meta[key] || [STAT_NAMES[key] || key, ''];
  }
  function getTitleRowsDom() {
    if (typeof PLAYER_TITLES === 'undefined') return '<span class="muted">暂无称号</span>';
    player.titles = typeof normalizeTitleState === 'function' ? normalizeTitleState(player.titles) : (player.titles || { unlocked: {}, equipped: null });
    const rows = Object.values(PLAYER_TITLES).map(title => {
      const unlocked = !!player.titles.unlocked?.[title.id];
      const equipped = player.titles.equipped === title.id;
      const stats = Object.entries(title.stats || {}).map(([k, v]) => {
        const [label, suffix] = getCharacterStatMeta(k);
        const value = String(k).endsWith('Pct') ? Math.round(Number(v || 0) * 100) : Number(v || 0);
        return `${label}${formatCharStatValue(value, suffix || (String(k).endsWith('Pct') ? '%' : ''))}`;
      }).join('、');
      return `<button class="title-card ${unlocked ? 'unlocked' : 'locked'} ${equipped ? 'equipped' : ''}" type="button" ${unlocked ? `data-equip-title="${escapeHtml(title.id)}"` : ''} style="--title-color:${escapeHtml(title.color || '#d4a0ff')}">
        <b>${escapeHtml(title.icon || '🏷️')} ${escapeHtml(title.name)}</b><small>${unlocked ? (equipped ? '佩戴中' : '点击佩戴') : '未解锁'}</small><span>${escapeHtml(stats || title.desc || '')}</span>
      </button>`;
    }).join('');
    return `<div class="title-grid">${rows}</div>`;
  }
  function getEquipmentBonusTotals() {
    const totals = {};
    Object.values(player.equipment || {}).forEach(item => {
      if (!item || !item.stats) return;
      Object.entries(item.stats).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + Number(v || 0); });
    });
    return totals;
  }
  function getEquipmentBonusRows(totals = null) {
    const source = totals || getEquipmentBonusTotals();
    const order = ['atk','def','maxHp','hp','maxMp','mp','speed','crit','dodge','lifesteal','armorPen','fireDmg','iceDmg','poisonDmg','lightningDmg','hpRegen','mpRegen','allRes','goldFind','xpBonus'];
    const entries = Object.entries(source).filter(([, v]) => Number(v || 0) !== 0)
      .sort(([a], [b]) => (order.indexOf(a) < 0 ? 999 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 999 : order.indexOf(b)) || a.localeCompare(b));
    return entries.map(([k, v]) => {
      const [label, suffix] = getCharacterStatMeta(k);
      return `<span class="bonus-chip"><em>${escapeHtml(label)}</em><b>${formatCharStatValue(v, suffix)}</b></span>`;
    }).join('') || '<span class="muted">暂无装备加成</span>';
  }
  function getCharacterBonusOverviewDom() {
    const totals = getEquipmentBonusTotals();
    const hasBonus = Object.values(totals).some(v => Number(v || 0) !== 0);
    if (!hasBonus) return '<div class="char-bonus-overview empty">暂无装备加成，先穿戴装备提升战力</div>';
    const score = (keys, weights) => Math.round(keys.reduce((sum, key, i) => sum + Number(totals[key] || 0) * (weights?.[i] || 1), 0));
    const pillars = [
      { label: '输出', value: score(['atk','crit','armorPen','fireDmg','iceDmg','poisonDmg','lightningDmg'], [3,2,2,1,1,1,1]) },
      { label: '生存', value: score(['def','maxHp','hp','dodge','allRes'], [3,.35,.25,2,1.5]) },
      { label: '续航', value: score(['lifesteal','hpRegen','mpRegen','maxMp','mp'], [3,2,2,.2,.15]) },
    ];
    const groups = [
      { title: '核心', keys: ['atk','def','maxHp','maxMp','speed'] },
      { title: '战斗', keys: ['crit','dodge','lifesteal','armorPen'] },
      { title: '元素', keys: ['fireDmg','iceDmg','poisonDmg','lightningDmg','allRes'] },
      { title: '成长', keys: ['goldFind','xpBonus','hpRegen','mpRegen'] },
    ].map(group => {
      const chips = group.keys.filter(k => Number(totals[k] || 0) !== 0).map(k => {
        const [label, suffix] = getCharacterStatMeta(k);
        return `<span class="bonus-chip"><em>${escapeHtml(label)}</em><b>${formatCharStatValue(totals[k], suffix)}</b></span>`;
      }).join('');
      return chips ? `<div class="char-bonus-group"><h4>${escapeHtml(group.title)}</h4><div>${chips}</div></div>` : '';
    }).filter(Boolean).join('');
    return `<div class="char-bonus-overview">
      <div class="char-bonus-pillars">${pillars.map(p => `<span><b>${escapeHtml(p.value)}</b><em>${escapeHtml(p.label)}</em></span>`).join('')}</div>
      <div class="char-bonus-groups">${groups || `<div class="char-bonus-group"><div>${getEquipmentBonusRows(totals)}</div></div>`}</div>
    </div>`;
  }
  function getEquippedTraitSkillHintDom() {
    const map = {
      pojun: { tree: 'sword', label: '剑修爆发', hint: '破军特质适合剑修破甲与首领斩杀', icon: '⚔️' },
      guiyuan: { tree: 'water', label: '水系续航', hint: '归元特质适合水系回复与灵力循环', icon: '💧' },
      jiying: { tree: 'thunder', label: '雷系机动', hint: '疾影特质适合雷系暴击与先手', icon: '💨' },
      tieshan: { tree: 'earth', label: '土系守御', hint: '铁山特质适合土系护盾与稳推进', icon: '⛰️' },
    };
    const equipped = Object.values(player?.equipment || {}).filter(Boolean);
    for (const item of equipped) {
      const id = item?.trait?.id;
      if (id && map[id]) return { ...map[id], trait: item.trait, item };
    }
    return null;
  }
  function getTraitSkillJumpTargetDom(hint = getEquippedTraitSkillHintDom()) {
    if (!hint?.tree || typeof SKILL_TREES === 'undefined') return null;
    const skills = SKILL_TREES[hint.tree]?.skills || [];
    for (let index = 0; index < skills.length; index++) {
      const st = typeof skillNodeState === 'function' ? skillNodeState(hint.tree, index) : null;
      if (st?.canLearn || st?.learned || !st) return { tree: hint.tree, index, label: `${hint.trait?.name || '特质'}·${skills[index]?.name || hint.label}` };
    }
    return null;
  }
  function getCharacterBuildJumpTargetDom() {
    const traitHint = getEquippedTraitSkillHintDom();
    const traitTarget = getTraitSkillJumpTargetDom(traitHint);
    if (traitTarget) return traitTarget;
    const recs = typeof getRecommendedSkillNodesForBuild === 'function' ? getRecommendedSkillNodesForBuild(1) : [];
    const rec = recs && recs[0];
    if (rec?.tree && Number.isFinite(Number(rec.index))) return { tree: rec.tree, index: Number(rec.index), label: rec.skill?.name || '推荐技能' };
    const treeNames = Object.keys(typeof SKILL_TREES !== 'undefined' ? SKILL_TREES : {});
    for (const tree of treeNames) {
      const skills = SKILL_TREES[tree]?.skills || [];
      for (let index = 0; index < skills.length; index++) {
        const st = typeof skillNodeState === 'function' ? skillNodeState(tree, index) : null;
        if (st?.canLearn || st?.learned) return { tree, index, label: skills[index]?.name || '技能节点' };
      }
    }
    return null;
  }
  function openCharacterBuildSkillTargetDom(target = null) {
    const jump = target || getCharacterBuildJumpTargetDom();
    if (jump?.tree) selectedSkillTreeNode = { tree: jump.tree, index: Number(jump.index) || 0 };
    skillDetailModalOpen = !!jump;
    popPanelFromStack('character');
    characterPanelLastHtml = '';
    closeCharacterDetailPopupDom();
    characterEquipmentDetailSlot = null;
    characterEquipmentSlotHint = null;
    pushPanelToStack('skills');
    syncBodyPanelState();
    if (jump?.label && typeof showMessage === 'function') showMessage(`已定位：${jump.label}`, '#ffe28a');
  }
  function getCharacterBuildProfileDom() {
    const build = typeof getActiveSkillBuildSummary === 'function' ? getActiveSkillBuildSummary() : null;
    const codex = typeof getSkillCodexSummary === 'function' ? getSkillCodexSummary() : null;
    const activeSynergies = build?.synergies || (typeof getActiveSkillSynergies === 'function' ? getActiveSkillSynergies() : []);
    const activeMasteries = build?.masteries || (typeof getActiveSkillMasteries === 'function' ? getActiveSkillMasteries() : []);
    const next = build?.next || (typeof getNextSkillSynergyRecommendation === 'function' ? getNextSkillSynergyRecommendation() : null);
    const traitHint = getEquippedTraitSkillHintDom();
    const jumpTarget = getCharacterBuildJumpTargetDom();
    const headline = activeSynergies.length
      ? activeSynergies.slice(0, 2).map(s => `${s.icon || '✦'}${s.name}`).join(' · ')
      : (activeMasteries.length ? activeMasteries.slice(0, 2).map(m => `${SKILL_TREES?.[m.tree]?.icon || '✦'}${m.shortName || SKILL_TREES?.[m.tree]?.name || '专精'}专精`).join(' · ') : '流派未成型');
    const tags = [];
    activeSynergies.slice(0, 3).forEach(s => tags.push({ label: s.name, icon: s.icon || '✦', tone: 'synergy' }));
    if (traitHint) tags.unshift({ label: traitHint.label, icon: traitHint.icon || traitHint.trait?.icon || '✦', tone: 'trait' });
    activeMasteries.slice(0, 3).forEach(m => tags.push({ label: `${m.shortName || SKILL_TREES?.[m.tree]?.name || '单系'}专精`, icon: SKILL_TREES?.[m.tree]?.icon || '✦', tone: 'mastery' }));
    if (!tags.length && next) tags.push({ label: next.name || '路线推荐', icon: next.icon || '✦', tone: 'next' });
    const progressRows = (codex?.treeSummaries || []).filter(row => row.learned > 0 || row.mastery?.active)
      .sort((a, b) => (b.learned - a.learned) || (a.shortName || '').localeCompare(b.shortName || ''))
      .slice(0, 3);
    const progressHtml = progressRows.length ? progressRows.map(row => {
      const pct = row.total ? Math.min(100, Math.round(row.learned / row.total * 100)) : 0;
      return `<div class="char-build-row"><span>${escapeHtml(row.shortName || row.name || row.tree)}</span><i><b style="width:${pct}%"></b></i><em>${row.learned}/${row.total}</em></div>`;
    }).join('') : '<div class="char-build-empty">尚未领悟技能，先去「技能」选择路线</div>';
    return {
      headline,
      subline: traitHint ? traitHint.hint : (build?.activeLabels?.length ? `已成型 ${build.activeLabels.length} 项` : (next?.hint || '继续领悟技能可解锁共鸣与专精')),
      tags,
      nextHint: traitHint?.hint || next?.hint || build?.hint || '',
      progressHtml,
      claimableCount: codex?.claimableCount || 0,
      jumpTarget,
    };
  }
  function getCharacterBuildProfileHtmlDom(profile = null) {
    const data = profile || getCharacterBuildProfileDom();
    const tagHtml = (data.tags || []).map(tag => `<span class="char-build-tag ${escapeHtml(tag.tone || '')}">${escapeHtml(tag.icon || '✦')} ${escapeHtml(tag.label || '')}</span>`).join('') || '<span class="char-build-tag empty">未成型</span>';
    const claimHtml = data.claimableCount ? `<span class="char-build-claim">待领 ${data.claimableCount}</span>` : '';
    const jump = data.jumpTarget;
    const jumpAttrs = jump ? ` data-char-build-jump="1" data-tree="${escapeHtml(jump.tree)}" data-index="${escapeHtml(jump.index)}"` : '';
    const jumpCta = jump ? `<button class="char-build-jump" type="button"${jumpAttrs}>去技能页</button>` : '';
    return `<section class="char-section char-build-profile${jump ? ' actionable' : ''}">
      <div class="char-build-main"><div><b>${escapeHtml(data.headline)}</b><small>${escapeHtml(data.subline || '')}</small></div><div class="char-build-actions">${claimHtml}${jumpCta}</div></div>
      <div class="char-build-tags">${tagHtml}</div>
      <div class="char-build-progress">${data.progressHtml}</div>
      ${data.nextHint ? `<div class="char-build-next">下一步：${escapeHtml(data.nextHint)}${jump?.label ? ` · 点「去技能页」定位「${escapeHtml(jump.label)}」` : ''}</div>` : ''}
    </section>`;
  }
  function getCharacterIdentityOverviewDom(options = {}) {
    const slotKeys = Array.isArray(options.slotKeys) ? options.slotKeys : (typeof equipmentSlotKeys === 'function' ? equipmentSlotKeys() : Object.keys(SLOT_NAMES || {}));
    const equippedCount = slotKeys.filter(slot => !!player.equipment?.[slot]).length;
    const crit = Number(typeof getEquipmentAbility === 'function' ? getEquipmentAbility('crit') : (player.crit || 0));
    const dodge = Number(typeof getEquipmentAbility === 'function' ? getEquipmentAbility('dodge') : (player.dodge || 0));
    const speed = Number(typeof getEquipmentAbility === 'function' ? getEquipmentAbility('speed') : (player.speed || 0));
    const power = Math.max(1, Math.round(
      Number(player.atk || 0) * 4 + Number(player.def || 0) * 3 +
      Number(player.maxHp || 0) * 0.35 + Number(player.maxMp || 0) * 0.22 +
      crit * 2 + dodge * 2 + speed + equippedCount * 18
    ));
    const title = options.equippedTitle;
    const buildProfile = options.buildProfile || getCharacterBuildProfileDom();
    const realm = options.realm || player.realm?.name || '炼气期';
    const titleText = title ? `${title.icon || '🏷️'} ${title.name}` : buildProfile.headline;
    return `<section class="char-section char-identity-card">
      <div class="char-identity-main"><div class="char-avatar">👤</div><div><b>${escapeHtml(realm)}</b><small>${escapeHtml(titleText || '未佩戴称号')}</small></div><em>战力 ${power}</em></div>
      <div class="char-identity-grid">
        <span><b>${escapeHtml(player.hp)}/${escapeHtml(player.maxHp)}</b><em>生命</em></span>
        <span><b>${escapeHtml(player.mp)}/${escapeHtml(player.maxMp)}</b><em>灵力</em></span>
        <span><b>${escapeHtml(player.atk)}</b><em>攻击</em></span>
        <span><b>${escapeHtml(player.def)}</b><em>防御</em></span>
      </div>
      <div class="char-identity-foot">装备 ${equippedCount}/${slotKeys.length} · 悟道 ${availableSkillPoints || 0} · 炼体 ${availableStatPoints || 0} · 坐标 (${Math.floor(player.x)}, ${Math.floor(player.y)})</div>
    </section>`;
  }
  function getCharacterNextActionDom(options = {}) {
    const slotKeys = Array.isArray(options.slotKeys) ? options.slotKeys : (typeof equipmentSlotKeys === 'function' ? equipmentSlotKeys() : Object.keys(SLOT_NAMES || {}));
    const buildProfile = options.buildProfile || getCharacterBuildProfileDom();
    const action = typeof getSharedNextActionRecommendation === 'function'
      ? getSharedNextActionRecommendation(player, { slotKeys, buildProfile })
      : { title: '推进下一场战斗', reason: '角色养成暂无明显短板，继续刷怪/章节获取装备与材料', cta: '关闭面板', kind: 'close' };
    const jump = buildProfile.jumpTarget;
    const kind = action.kind || 'close';
    const attrs = kind === 'skills' && jump ? ` data-char-build-jump="1" data-tree="${escapeHtml(jump.tree)}" data-index="${escapeHtml(jump.index)}"` : (kind === 'skills' ? ' data-char-open-skills="1"' : (kind === 'close' || kind === 'stages' || kind === 'breakthrough' ? ' data-char-close-panel="1"' : ` data-char-tab-jump="${escapeHtml(kind)}"`));
    return `<section class="char-section char-next-action"><div><small>下一步</small><b>${escapeHtml(action.title)}</b><span>${escapeHtml(action.reason)}</span></div><button type="button"${attrs}>${escapeHtml(action.cta || '关闭面板')}</button></section>`;
  }
  function getCharacterEquipmentSlotBadgeDom(slot, item, level = null) {
    const rankOf = eq => (typeof rarityRank === 'function' ? rarityRank(eq?.rarity) : ({ '普通':1, '魔法':2, '稀有':3, '传说':4, '神话':5 }[eq?.rarity] || 1));
    let state = { label: '空', tone: 'empty' };
    if (item) {
      const lv = Number.isFinite(Number(level)) ? Number(level) : equipmentEnhanceLevelDom(item);
      if (rankOf(item) <= 2) state = { label: '低品', tone: 'low' };
      else if (lv <= 0) state = { label: '未强', tone: 'unupgraded' };
      else if (item.setId) state = { label: '套装', tone: 'set' };
      else state = { label: `+${lv}`, tone: 'enhanced' };
    }
    return `<i class="eq-status-badge ${escapeHtml(state.tone)}">${escapeHtml(state.label)}</i>`;
  }
  function getCharacterEquipmentDiagnosisDom(slotKeys = null) {
    const keys = Array.isArray(slotKeys) ? slotKeys : (typeof equipmentSlotKeys === 'function' ? equipmentSlotKeys() : Object.keys(SLOT_NAMES || {}));
    const equipped = keys.map(slot => ({ slot, item: player.equipment?.[slot] || null }));
    const equippedItems = equipped.filter(row => !!row.item);
    const emptySlots = equipped.filter(row => !row.item);
    const maxEnhance = typeof getCurrentEquipmentEnhanceCap === 'function' ? getCurrentEquipmentEnhanceCap() : (typeof MAX_EQUIPMENT_ENHANCE_LEVEL !== 'undefined' ? MAX_EQUIPMENT_ENHANCE_LEVEL : 15);
    const rankOf = item => (typeof rarityRank === 'function' ? rarityRank(item?.rarity) : ({ '普通':1, '魔法':2, '稀有':3, '传说':4, '神话':5 }[item?.rarity] || 1));
    const lowQuality = equippedItems.filter(row => rankOf(row.item) <= 2);
    const enhanceable = equippedItems.filter(row => equipmentEnhanceLevelDom(row.item) < maxEnhance);
    const setCounts = typeof equipmentSetCounts === 'function' ? equipmentSetCounts(player.equipment || {}) : {};
    const topSet = Object.entries(setCounts).sort(([, a], [, b]) => Number(b || 0) - Number(a || 0))[0] || null;
    const topSetObj = topSet ? (typeof getEquipmentSet === 'function' ? getEquipmentSet(topSet[0]) : null) : null;
    const topSetCount = topSet ? Number(topSet[1] || 0) : 0;
    const topSetText = topSet ? `${topSetObj?.icon || '◇'}${topSetObj?.name || '套装'} ${topSetCount}件` : '套装未成型';
    const topSetNext = topSetObj ? (topSetObj.bonuses || []).slice().sort((a, b) => Number(a.count || 0) - Number(b.count || 0)).find(b => topSetCount < Number(b.count || 0)) : null;
    const setGapText = topSet ? (topSetNext ? `${topSetObj?.name || '套装'}下一档：还差 ${Math.max(0, Number(topSetNext.count || 0) - topSetCount)} 件解锁 ${topSetNext.count}件` : `${topSetObj?.name || '套装'}已激活满档`) : '套装未成型：优先保留同名套装装备';
    const weaknessRows = [
      ...emptySlots.map(row => ({ row, priority: 0, reason: '空' })),
      ...lowQuality.map(row => ({ row, priority: 1, reason: '低品' })),
      ...enhanceable.filter(row => equipmentEnhanceLevelDom(row.item) <= 0).map(row => ({ row, priority: 2, reason: '未强' })),
    ];
    const seen = new Set();
    const weakness = weaknessRows.sort((a, b) => a.priority - b.priority).filter(item => {
      if (seen.has(item.row.slot)) return false;
      seen.add(item.row.slot);
      return true;
    }).slice(0, 3);
    const weaknessText = weakness.length ? weakness.map(item => `${SLOT_NAMES?.[item.row.slot]?.name || item.row.slot}${item.reason !== '空' ? `·${item.reason}` : ''}`).join(' / ') : '暂无明显短板';
    const chips = [
      { label: '装备', value: `${equippedItems.length}/${keys.length}` },
      { label: '套装', value: topSetText },
      { label: '可强化', value: `${enhanceable.length}件` },
      { label: '低品', value: `${lowQuality.length}件` },
    ];
    return `<div class="char-equip-diagnosis">
      <div class="char-equip-diag-main">${chips.map(chip => `<span><b>${escapeHtml(chip.value)}</b><em>${escapeHtml(chip.label)}</em></span>`).join('')}</div>
      <div class="char-equip-diag-foot"><b>短板</b><span>${escapeHtml(weaknessText)}</span></div>
      <div class="char-equip-diag-setgap"><b>套装</b><span>${escapeHtml(setGapText)}</span></div>
    </div>`;
  }
  function getCharacterSetProgressDom() {
    if (!player || typeof equipmentSetCounts !== 'function') return '<div class="char-set-progress empty">暂无套装进度</div>';
    const counts = equipmentSetCounts(player.equipment || {});
    const entries = Object.entries(counts).filter(([, count]) => Number(count || 0) > 0);
    if (!entries.length) return '<div class="char-set-progress empty">暂无套装装备，穿戴同名套装可激活额外效果</div>';
    const slotLabelForSet = (setId) => Object.entries(player.equipment || {}).filter(([, item]) => item?.setId === setId).map(([slot]) => SLOT_NAMES?.[slot]?.name || slot).slice(0, 4).join('、');
    const cards = entries.sort(([, a], [, b]) => Number(b || 0) - Number(a || 0)).map(([setId, countRaw]) => {
      const count = Number(countRaw || 0);
      const set = typeof getEquipmentSet === 'function' ? getEquipmentSet(setId) : null;
      const bonuses = (set?.bonuses || []).slice().sort((a, b) => Number(a.count || 0) - Number(b.count || 0));
      const maxCount = Math.max(8, ...bonuses.map(b => Number(b.count || 0)));
      const active = bonuses.filter(b => count >= Number(b.count || 0));
      const next = bonuses.find(b => count < Number(b.count || 0));
      const current = active.length ? active[active.length - 1] : null;
      const pct = Math.min(100, Math.max(4, Math.round(count / maxCount * 100)));
      const nextText = next ? `还差 ${Math.max(0, Number(next.count || 0) - count)} 件解锁 ${next.count}件` : '已激活满档';
      const ownedSlots = slotLabelForSet(setId) || '已装备';
      return `<div class="char-set-card" style="--set-color:${escapeHtml(set?.color || '#d4a0ff')}">
        <div class="char-set-card-head"><span>${escapeHtml(set?.icon || '◇')} ${escapeHtml(set?.name || '套装')}</span><b>${count}/${maxCount}</b></div>
        <div class="char-set-meter"><i style="width:${pct}%"></i></div>
        <div class="char-set-owned">${escapeHtml(ownedSlots)}</div>
        <div class="char-set-next"><b>${escapeHtml(current ? `${current.count}件已激活` : '未激活')}</b><span>${escapeHtml(current?.label || '先凑齐 2 件套')}</span></div>
        <div class="char-set-gap">${escapeHtml(nextText)}</div>
      </div>`;
    }).join('');
    return `<div class="char-set-progress">${cards}</div>`;
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
  function getCharacterEquipmentSlotHintDom() {
    if (!characterEquipmentSlotHint) return '';
    const slotName = SLOT_NAMES?.[characterEquipmentSlotHint]?.name || characterEquipmentSlotHint;
    return `<div class="char-equip-slot-tip"><b>${escapeHtml(slotName)}槽为空</b><span>可在背包中装备${escapeHtml(slotName)}</span><button type="button" data-char-open-inventory-slot="${escapeHtml(characterEquipmentSlotHint)}">去背包</button></div>`;
  }
  function openInventoryForCharacterSlotDom(slot) {
    characterEquipmentSlotHint = slot || characterEquipmentSlotHint;
    inventoryTab = 'equipment';
    inventorySlotFilter = slot || '';
    inventoryDetailTarget = null;
    invalidateInventoryListCacheDom();
    popPanelFromStack('character');
    pushPanelToStack('inventory');
    syncBodyPanelState();
    if (typeof scheduleInventoryRenderDom === 'function') scheduleInventoryRenderDom('character-slot');
    const slotName = SLOT_NAMES?.[slot]?.name || slot || '装备';
    showMessage(`已打开背包：寻找${slotName}`, '#8ee8c2');
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
      const statusBadge = getCharacterEquipmentSlotBadgeDom(slot, item, level);
      return `<button class="char-equip-card${item ? '' : ' empty'}${active ? ' active' : ''}" type="button" data-char-equip-slot="${escapeHtml(slot)}" style="--rarity-color:${escapeHtml(color)}" aria-label="查看${escapeHtml(slotInfo.name)}详情">
        ${statusBadge}
        <div class="eq-icon"><span>${escapeHtml(item ? itemIconDom(item, slot) : (slotInfo.icon || itemIconDom(null, slot)))}</span>${item ? `<i>${escapeHtml(rarityShortDom(item.rarity))}</i>` : '<i>空</i>'}</div>
        <div class="eq-info"><div class="eq-name-row"><b>${escapeHtml(slotInfo.name)}</b><span>${escapeHtml(displayName)}</span></div><div class="eq-stats">${stats}</div></div>
      </button>`;
    }).join('');
    const detailItem = characterDetailDom()?.item || null;
    const equippedTitle = typeof getEquippedTitle === 'function' ? getEquippedTitle(player) : null;
    const buildProfile = getCharacterBuildProfileDom();
    const buildProfileHtml = getCharacterBuildProfileHtmlDom(buildProfile);
    const identityHtml = getCharacterIdentityOverviewDom({ slotKeys, equippedTitle, buildProfile, realm });
    const nextActionHtml = getCharacterNextActionDom({ slotKeys, buildProfile });
    const tabKeys = ['equipment', 'attributes', 'bonus', 'sets', 'titles'];
    if (!tabKeys.includes(characterTab)) characterTab = 'attributes';
    const equipmentHintHtml = getCharacterEquipmentSlotHintDom();
    const equipmentPanel = `<section class="char-tab-panel char-equipment-section top-equipment" data-char-tab-panel="equipment"><h3>当前装备 <small>诊断短板并点击槽位查看</small></h3>${getCharacterEquipmentDiagnosisDom(slotKeys)}${equipmentHintHtml}<div class="char-equip-grid">${slots}</div></section>`;
    const attributesPanel = `<section class="char-tab-panel" data-char-tab-panel="attributes">
      ${identityHtml}
      ${nextActionHtml}
      ${buildProfileHtml}
      <div class="char-section char-realm">
        <div class="realm-top"><div><div class="realm-name">${realm}</div><div class="xptext">${equippedTitle ? `${equippedTitle.icon} ${equippedTitle.name}` : '未佩戴称号'} · 坐标 (${Math.floor(player.x)}, ${Math.floor(player.y)})</div></div><div class="stones">灵石 ${player.spiritStones || 0}</div></div>
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
        <div><b>${availableSkillPoints || 0}</b><span></span><em>悟道点</em></div>
        <div><b>${availableStatPoints || 0}</b><span></span><em>炼体点</em></div>
      </div>
    </section>`;
    const bonusPanel = `<section class="char-tab-panel" data-char-tab-panel="bonus"><div class="char-section"><h3>装备加成 <small>按战斗用途归类</small></h3>${getCharacterBonusOverviewDom()}</div></section>`;
    const setsPanel = `<section class="char-tab-panel" data-char-tab-panel="sets"><div class="char-section"><h3>套装效果 <small>当前进度与下一档</small></h3>${getCharacterSetProgressDom()}<div class="char-set-list">${getEquipmentSetRowsDom()}</div></div></section>`;
    const titlesPanel = `<section class="char-tab-panel" data-char-tab-panel="titles"><div class="char-section"><h3>称号 <small>章节全通后解锁，可佩戴一个</small></h3>${getTitleRowsDom()}</div></section>`;
    const html = `
      <div class="char-head"><div><div class="char-title">👤 角色</div><div class="char-sub">${escapeHtml(buildProfile.headline)} · 装备 · 属性 · 流派</div></div><button class="char-close">×</button></div>
      <div class="char-tabs" role="tablist"><button class="char-tab" type="button" data-char-tab="equipment">装备</button><button class="char-tab" type="button" data-char-tab="attributes">属性</button><button class="char-tab" type="button" data-char-tab="bonus">加成</button><button class="char-tab" type="button" data-char-tab="sets">套装</button><button class="char-tab" type="button" data-char-tab="titles">称号</button></div>
      <div class="char-body" data-active-char-tab="${escapeHtml(characterTab)}">
        ${equipmentPanel}
        ${attributesPanel}
        ${bonusPanel}
        ${setsPanel}
        ${titlesPanel}
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
  function closeSkillsPanelDom(e) {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    popPanelFromStack('skills');
    selectedSkillTreeNode = null;
    skillDetailModalOpen = false;
    const layer = typeof document !== 'undefined' ? document.getElementById('skill-detail-layer') : null;
    if (layer) layer.innerHTML = '';
    syncBodyPanelState();
  }
  function closeSkillDetailModalDom(e) {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }
    skillDetailModalOpen = false;
    renderSkillsDomPanel();
  }
  function closeSkillDetailModalImmediatelyDom(e) {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }
    skillPanelTapState = null;
    skillsLastTouchActionAt = Date.now();
    skillPanelSuppressClickUntil = Date.now() + 900;
    skillDetailCloseSwallowUntil = Date.now() + 900;
    closeSkillDetailModalDom(e);
  }
  function handleSkillsPanelDelegatedAction(e) {
    const p = document.getElementById('skills-dom-panel');
    const layer = document.getElementById('skill-detail-layer');
    if (!p && !layer) return;
    const inSkillPanel = p?.contains(e.target) || layer?.contains(e.target);
    if (!inSkillPanel) return;
    const target = e.target.closest('.synergy-recommend-strip button, .skill-node, .skill-learn-btn:not([disabled]), .skill-forget-btn:not([disabled]), .mastery-claim-btn:not([disabled]), .synergy-claim-btn:not([disabled]):not(.mastery-claim-btn), .attr-btn:not(.disabled), .skill-modal-backdrop, .skill-modal-close, [data-skill-detail-close]');
    if (!target) return;
    const isInteractiveSkillAction = target.matches?.('.synergy-recommend-strip button, .skill-node, .skill-learn-btn:not([disabled]), .skill-forget-btn:not([disabled]), .mastery-claim-btn:not([disabled]), .synergy-claim-btn:not([disabled]):not(.mastery-claim-btn), .attr-btn:not(.disabled)');
    if (isInteractiveSkillAction && e.type !== 'click') {
      skillsLastTouchActionAt = Date.now();
    }
    if (Date.now() < skillDetailCloseSwallowUntil && target.closest?.('.pclose')) {
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
      return;
    }
    const isPointerTouch = e.type === 'pointerdown' && e.pointerType !== 'mouse';
    const isTouch = e.type === 'touchstart';
    if (isPointerTouch || isTouch) {
      const t = e.changedTouches?.[0] || e.touches?.[0] || e;
      skillPanelTapState = {
        x: Number(t.clientX) || 0,
        y: Number(t.clientY) || 0,
        scrollTop: inventoryScrollableParentDom(target)?.scrollTop || 0,
        target,
      };
      return;
    }
    if (e.type === 'pointerup' || e.type === 'touchend') {
      if (!skillPanelTapState) return;
      const t = e.changedTouches?.[0] || e.touches?.[0] || e;
      const moved = Math.hypot((Number(t.clientX) || 0) - skillPanelTapState.x, (Number(t.clientY) || 0) - skillPanelTapState.y);
      const scrolled = Math.abs((inventoryScrollableParentDom(skillPanelTapState.target)?.scrollTop || 0) - skillPanelTapState.scrollTop);
      const tapTarget = skillPanelTapState.target;
      skillPanelTapState = null;
      if (moved > INVENTORY_TAP_MOVE_THRESHOLD || scrolled > 2) {
        skillPanelSuppressClickUntil = Date.now() + 450;
        return;
      }
      skillsLastTouchActionAt = Date.now();
      skillPanelSuppressClickUntil = Date.now() + 700;
      e.preventDefault?.();
      e.stopPropagation?.();
      runSkillsPanelAction(tapTarget, e);
      return;
    }
    if (e.type === 'pointercancel' || e.type === 'touchcancel') {
      skillPanelTapState = null;
      skillPanelSuppressClickUntil = Date.now() + 450;
      return;
    }
    if (e.type === 'click') {
      if (Date.now() < skillPanelSuppressClickUntil || Date.now() - skillsLastTouchActionAt < 700) {
        e.preventDefault?.();
        e.stopPropagation?.();
        return;
      }
      e.preventDefault?.();
      e.stopPropagation?.();
      runSkillsPanelAction(target, e);
    }
  }
  function runSkillsPanelAction(target, e) {
    const backdrop = target.classList?.contains('skill-modal-backdrop') ? target : null;
    if (backdrop && e.target === backdrop) {
      closeSkillDetailModalDom(e);
      return;
    }
    if (target.closest?.('.skill-modal-close, [data-skill-detail-close]')) {
      closeSkillDetailModalDom(e);
      return;
    }
    const recommend = target.closest?.('.synergy-recommend-strip button');
    if (recommend) {
      selectedSkillTreeNode = { tree: recommend.dataset.tree, index: parseInt(recommend.dataset.index, 10) || 0 };
      skillDetailModalOpen = true;
      renderSkillsDomPanel();
      return;
    }
    const node = target.closest?.('.skill-node');
    if (node) {
      selectedSkillTreeNode = { tree: node.dataset.tree, index: parseInt(node.dataset.index, 10) || 0 };
      skillDetailModalOpen = true;
      renderSkillsDomPanel();
      return;
    }
    const learnBtn = target.closest?.('.skill-learn-btn:not([disabled])');
    if (learnBtn) {
      const t = learnBtn.dataset.tree, idx = parseInt(learnBtn.dataset.index, 10) || 0;
      if (learnSkill(t, idx)) {
        showMessage(`✨ 领悟技能: 【${SKILL_TREES[t].skills[idx].name}】！道法渐明。`, '#ffdd44');
        selectedSkillTreeNode = { tree: t, index: idx };
        skillDetailModalOpen = true;
        renderSkillsDomPanel();
      }
      return;
    }
    const forgetBtn = target.closest?.('.skill-forget-btn:not([disabled])');
    if (forgetBtn) {
      const t = forgetBtn.dataset.tree, idx = parseInt(forgetBtn.dataset.index, 10) || 0;
      if (typeof unlearnSkill === 'function' && unlearnSkill(t, idx)) {
        showMessage(`化道归虚: 【${SKILL_TREES[t].skills[idx].name}】，悟道点已归还`, '#aaddff');
        selectedSkillTreeNode = { tree: t, index: idx };
        skillDetailModalOpen = true;
        renderSkillsDomPanel();
      }
      return;
    }
    const masteryBtn = target.closest?.('.mastery-claim-btn:not([disabled])');
    if (masteryBtn) {
      const tree = masteryBtn.dataset.tree;
      const count = parseInt(masteryBtn.dataset.count, 10) || 0;
      const treeName = (typeof SKILL_TREES !== 'undefined' && SKILL_TREES[tree]?.name) || '单系专精';
      if (typeof claimSkillMasteryReward === 'function' && claimSkillMasteryReward(tree, count)) {
        showMessage(`🌟 ${treeName}${count}重专精，奖励已入体！`, '#b0ffbe');
        renderSkillsDomPanel();
      }
      return;
    }
    const synergyBtn = target.closest?.('.synergy-claim-btn:not([disabled]):not(.mastery-claim-btn)');
    if (synergyBtn) {
      const id = synergyBtn.dataset.synergy;
      const syn = (typeof SKILL_SYNERGIES !== 'undefined' && SKILL_SYNERGIES[id]) || null;
      if (typeof claimSkillSynergyReward === 'function' && claimSkillSynergyReward(id)) {
        showMessage(`🌟 ${syn?.name || '流派共鸣'}成型，奖励已入体！`, '#ffe28a');
        renderSkillsDomPanel();
      }
      return;
    }
    const attrBtn = target.closest?.('.attr-btn:not(.disabled)');
    if (attrBtn) {
      allocateAttr(attrBtn.dataset.attr);
      renderSkillsDomPanel();
    }
  }
  function ensureSkillsDomPanel() {
    let p = document.getElementById('skills-dom-panel');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'skills-dom-panel';
    const onCloseHit = e => {
      if (Date.now() < skillDetailCloseSwallowUntil) {
        e.preventDefault?.();
        e.stopPropagation?.();
        e.stopImmediatePropagation?.();
        return;
      }
      const closeTarget = e.target.closest('.pclose');
      if (!closeTarget) return;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      closeSkillsPanelDom(e);
    };
    p.addEventListener('pointerdown', onCloseHit, { passive: false, capture: true });
    p.addEventListener('touchstart', onCloseHit, { passive: false, capture: true });
    p.addEventListener('click', onCloseHit, { capture: true });
    p.addEventListener('touchstart', e => {
      if (e.target.closest('.skill-node, .skill-learn-btn, .skill-forget-btn, .attr-btn, .synergy-claim-btn, .synergy-recommend-strip button')) {
        skillsLastTouchActionAt = Date.now();
        skillPanelSuppressClickUntil = Date.now() + 650;
        e.stopPropagation();
      }
    }, { passive: false });
    p.addEventListener('pointerdown', handleSkillsPanelDelegatedAction, { passive: true });
    p.addEventListener('pointerup', handleSkillsPanelDelegatedAction, { passive: false });
    p.addEventListener('pointercancel', handleSkillsPanelDelegatedAction, { passive: true });
    p.addEventListener('touchstart', handleSkillsPanelDelegatedAction, { passive: true });
    p.addEventListener('touchend', handleSkillsPanelDelegatedAction, { passive: false });
    p.addEventListener('touchcancel', handleSkillsPanelDelegatedAction, { passive: true });
    p.addEventListener('click', handleSkillsPanelDelegatedAction);
    document.body.appendChild(p);
    return p;
  }
  function ensureSkillDetailLayer() {
    let layer = document.getElementById('skill-detail-layer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'skill-detail-layer';
    const onSkillDetailCloseHit = e => {
      const closeTarget = e.target.closest?.('.skill-modal-close, [data-skill-detail-close]');
      const backdropTarget = e.target.classList?.contains('skill-modal-backdrop');
      if (!closeTarget && !backdropTarget) return;
      closeSkillDetailModalImmediatelyDom(e);
    };
    layer.addEventListener('pointerdown', onSkillDetailCloseHit, { passive: false, capture: true });
    layer.addEventListener('touchstart', onSkillDetailCloseHit, { passive: false, capture: true });
    layer.addEventListener('click', onSkillDetailCloseHit, { capture: true });
    layer.addEventListener('pointerup', e => {
      if (Date.now() >= skillDetailCloseSwallowUntil) return;
      if (!e.target.closest?.('.skill-modal-backdrop, .skill-detail-modal, .skill-modal-close, [data-skill-detail-close]')) return;
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }, { passive: false, capture: true });
    layer.addEventListener('touchend', e => {
      if (Date.now() >= skillDetailCloseSwallowUntil) return;
      if (!e.target.closest?.('.skill-modal-backdrop, .skill-detail-modal, .skill-modal-close, [data-skill-detail-close]')) return;
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }, { passive: false, capture: true });
    layer.addEventListener('touchstart', e => {
      if (e.target.closest('.skill-detail-modal, .skill-modal-close, .skill-learn-btn, .skill-forget-btn, .synergy-claim-btn')) {
        skillsLastTouchActionAt = Date.now();
        e.stopPropagation();
      }
    }, { passive: true });
    layer.addEventListener('pointerdown', handleSkillsPanelDelegatedAction, { passive: true });
    layer.addEventListener('pointerup', handleSkillsPanelDelegatedAction, { passive: false });
    layer.addEventListener('pointercancel', handleSkillsPanelDelegatedAction, { passive: true });
    layer.addEventListener('touchstart', handleSkillsPanelDelegatedAction, { passive: true });
    layer.addEventListener('touchend', handleSkillsPanelDelegatedAction, { passive: false });
    layer.addEventListener('touchcancel', handleSkillsPanelDelegatedAction, { passive: true });
    layer.addEventListener('click', handleSkillsPanelDelegatedAction);
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
    const pierce = Math.min(0.85, Number(skill.armorPierce || 0) + (typeof getPassiveArmorPierce === 'function' ? getPassiveArmorPierce(skill) : 0));
    const defMult = enemy && typeof getEnemyDefenseMultiplier === 'function' ? getEnemyDefenseMultiplier() : 1;
    const enemyDef = enemy ? Math.max(0, Math.floor((enemy.def || 0) * defMult * (1 - pierce))) : 0;
    const dmgMult = Number(skill.dmgMult || 0);
    const basePerHit = dmgMult > 0 ? Math.max(1, Math.floor(player.atk * (dmgMult * (1 + doctrineBonus)) / hits - enemyDef)) : 0;
    const lowRaw = dmgMult > 0 ? Math.max(1, (basePerHit - 3) * hits) : 0;
    const highRaw = dmgMult > 0 ? Math.max(lowRaw, (basePerHit + 3) * hits) : 0;
    const affinityMult = dmgMult > 0 && enemy && typeof getEnemyAffinityMultiplier === 'function' ? getEnemyAffinityMultiplier(enemy, skill.tree) : 1;
    const low = lowRaw ? Math.max(1, Math.floor(lowRaw * affinityMult)) : 0;
    const high = highRaw ? Math.max(low, Math.floor(highRaw * affinityMult)) : 0;
    const critPct = Math.round((0.15 + Number(skill.critBonus || 0) + (typeof getPassiveCritBonus === 'function' ? getPassiveCritBonus(skill) : 0)) * 100);
    const runtimeEffectBonus = typeof getSkillRuntimeEffectBonus === 'function' ? getSkillRuntimeEffectBonus(skill) : 0;
    const healGuardAmp = typeof sumActiveSynergyEffect === 'function' ? sumActiveSynergyEffect('healGuardAmp') : 0;
    const controlExtendTurns = typeof sumActiveSynergyEffect === 'function' ? sumActiveSynergyEffect('controlExtend', 'turns') : 0;
    const chips = [];
    if (dmgMult > 0) chips.push(['预计伤害', low === high ? `${low}` : `${low}-${high}`]);
    if (hits > 1) chips.push(['段数', `${hits}段`]);
    if (pierce > 0) chips.push(['破防', `${Math.round(pierce * 100)}%`]);
    if (dmgMult > 0) chips.push(['暴击', `${critPct}%`]);
    for (const eff of skill.effects || []) {
      if (eff.type === 'burn' || eff.type === 'bleed') {
        const amp = (eff.type === 'burn' && typeof getPassiveBurnAmp === 'function' ? getPassiveBurnAmp() : 0) + runtimeEffectBonus;
        const tick = Math.max(1, Math.floor(player.atk * Number(eff.ratio || 0.15) * (1 + amp)));
        chips.push([eff.type === 'burn' ? '灼烧' : '流血', `${tick}/回合×${eff.turns || 2}`]);
      } else if (eff.type === 'weaken') chips.push(['虚弱', `${Math.round((eff.ratio || 0.15) * (1 + runtimeEffectBonus) * 100)}%×${(eff.turns || 2) + controlExtendTurns}回合`]);
      else if (eff.type === 'defBreak') chips.push(['破甲', `${Math.round((eff.ratio || 0.15) * (1 + runtimeEffectBonus) * 100)}%×${(eff.turns || 2) + controlExtendTurns}回合`]);
      else if (eff.type === 'freeze') chips.push(['冻结', `${Math.round((eff.chance ?? 1) * 100)}%×${(eff.turns || 1) + controlExtendTurns}回合`]);
      else if (eff.type === 'stunChance') chips.push(['麻痹', `${Math.round((eff.chance ?? 0.25) * 100)}%×${(eff.turns || 1) + controlExtendTurns}回合`]);
      else if (eff.type === 'healSelf') chips.push(['治疗', `${Math.floor(player.maxHp * (eff.ratio || 0.15) * (1 + runtimeEffectBonus + healGuardAmp))}`]);
      else if (eff.type === 'guard') chips.push(['护盾', `${Math.round((eff.ratio || 0.25) * (1 + runtimeEffectBonus + healGuardAmp) * 100)}%×${eff.turns || 2}回合`]);
      else if (eff.type === 'splash') chips.push(['溅射', `${eff.count || 2}目标×${Math.round((eff.ratio || 0.35) * 100)}%`]);
      else if (eff.type === 'execute') chips.push(['追伤', `当前生命${Math.round((eff.ratio || 0.1) * 100)}%${eff.bossCapAtkRatio ? ` · Boss上限${Math.round(eff.bossCapAtkRatio * 100)}%攻` : ''}`]);
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
    const selectedStatus = selectedState.learned ? '已习得' : selectedState.locked ? `需${skillRealmName(selectedSkill.unlockRealm)}` : selectedState.blocked ? `前置：${selectedReqText}` : selectedState.canLearn ? '可学习' : '悟道点不足';
    const selectedKind = selectedSkill.kind || 'active';
    const selectedKindLabel = SKILL_KIND_LABELS[selectedKind] || '技能';
    const selectedSummary = getSkillEffectSummary(selectedSkill);
    const selectedEffectText = selectedSkill.effectText || selectedSummary;
    const learnedCount = learnedSkills.length;
    const totalCount = treeNames.reduce((n, t) => n + SKILL_TREES[t].skills.length, 0);
    const activeMasteries = typeof getActiveSkillMasteries === 'function' ? getActiveSkillMasteries() : [];
    const activeSynergies = typeof getActiveSkillSynergies === 'function' ? getActiveSkillSynergies() : [];
    const synergyProgress = typeof getSkillSynergyProgress === 'function' ? getSkillSynergyProgress() : [];
    const skillCodex = typeof getSkillCodexSummary === 'function' ? getSkillCodexSummary() : null;
    const synergyHint = typeof getNextSkillSynergyHint === 'function' ? getNextSkillSynergyHint() : '';
    const claimableHint = skillCodex?.claimableCount ? ` · 待领${skillCodex.claimableCount}` : '';
    const buildSummary = typeof getActiveSkillBuildSummary === 'function' ? getActiveSkillBuildSummary() : null;
    const synergyTitleSmall = skillCodex ? `${skillCodex.headline}${claimableHint} · ${buildSummary?.hint || synergyHint}` : (buildSummary ? `${(buildSummary.activeLabels || []).length ? `已成型：${buildSummary.activeText}` : '路线推荐'} · ${buildSummary.hint || synergyHint}` : synergyHint);
    const selectedMastery = typeof getSkillTreeMastery === 'function' ? getSkillTreeMastery(selectedTree) : null;
    const selectedTreeSynergies = typeof getSkillSynergiesForTree === 'function' ? getSkillSynergiesForTree(selectedTree) : [];
    const selectedRecommendation = typeof getSkillSynergyRecommendationForTree === 'function' ? getSkillSynergyRecommendationForTree(selectedTree) : null;
    const selectedImpact = typeof getSkillLearningImpact === 'function' ? getSkillLearningImpact(selectedTree, selectedIndex) : null;
    const buildRecommendations = typeof getRecommendedSkillNodesForBuild === 'function' ? getRecommendedSkillNodesForBuild(3) : [];
    const sortedSynergyProgress = (synergyProgress.length ? synergyProgress : Object.entries(typeof SKILL_SYNERGIES !== 'undefined' ? SKILL_SYNERGIES : {}).map(([id, syn]) => ({ id, ...syn, active: activeSynergies.some(s => s.id === id), progress: [] }))).slice().sort((a, b) => {
      const ar = a.claimable ? 0 : a.active ? 1 : 2;
      const br = b.claimable ? 0 : b.active ? 1 : 2;
      if (ar !== br) return ar - br;
      return (a.missingTotal || 0) - (b.missingTotal || 0);
    });
    const visibleSynergyProgress = sortedSynergyProgress.slice(0, 6);
    const visibleMasteryMilestones = (skillCodex?.masteryMilestones || []).slice().sort((a, b) => {
      const ar = a.claimable ? 0 : a.active ? 1 : 2;
      const br = b.claimable ? 0 : b.active ? 1 : 2;
      if (ar !== br) return ar - br;
      return (a.missing || 0) - (b.missing || 0);
    }).slice(0, 6);
    const selectedReqTextSafe = escapeHtml(selectedReqText);
    const detailTagsHtml = selectedSummary.split(' · ').map(t => `<span>${escapeHtml(t)}</span>`).join('');
    const selectedBuildHintHtml = selectedRecommendation ? `<div class="skill-build-hint ${selectedRecommendation.type === 'mastery' ? 'mastery' : 'synergy'}"><b>${escapeHtml(selectedRecommendation.icon || '✦')} 推荐路线</b><span>${escapeHtml(selectedRecommendation.hint || '')}</span></div>` : '';
    const selectedImpactHtml = selectedImpact ? `<div class="skill-impact-preview"><b>${selectedState.learned ? '当前贡献' : '领悟预览'}</b><span>${escapeHtml(selectedImpact.text || '')}</span></div>` : '';
    const selectedSynergyHtml = selectedTreeSynergies.length ? `<div class="skill-related-synergy"><b>参与共鸣</b>${selectedTreeSynergies.map(s => {
      const prog = (s.progress || []).map(p => `${p.shortName}${Math.min(p.learned, p.required)}/${p.required}`).join(' · ');
      return `<span class="${s.active ? 'active' : 'locked'}">${escapeHtml(s.icon || '✦')} ${escapeHtml(s.name)}<small>${escapeHtml(prog)}</small></span>`;
    }).join('')}</div>` : '';
    const skillDmgText = selectedSkill.dmgMult ? `×${selectedSkill.dmgMult}${selectedSkill.hits ? ` / ${selectedSkill.hits}段` : ''}` : '—';
    const detailHtml = `<div class="detail-kicker">${escapeHtml(selectedData.name)} · 第 ${selectedIndex + 1} 阶 · ${escapeHtml(selectedKindLabel)}</div>
        <div class="detail-title">${escapeHtml(selectedSkill.icon || '✦')} ${escapeHtml(selectedSkill.name)}</div>
        <div class="detail-status ${selectedState.learned ? 'ok' : selectedState.canLearn ? 'ready' : 'no'}">${escapeHtml(selectedStatus)}</div>
        <p class="detail-desc">${escapeHtml(selectedSkill.desc)}</p>
        <p class="detail-effect">${escapeHtml(selectedEffectText)}</p>
        <div class="detail-tags">${detailTagsHtml}</div>
        ${selectedBuildHintHtml}
        ${selectedImpactHtml}
        ${selectedSynergyHtml}
        ${selectedMastery?.active ? `<div class="skill-mastery-note">单系专精：伤害 +${Math.round(selectedMastery.damageBonus * 100)}%，效果 +${Math.round(selectedMastery.effectBonus * 100)}%</div>` : ''}
        <div class="detail-stats compact-stats">
          <span>类型 <b>${escapeHtml(selectedKindLabel)}</b></span>
          <span>灵力 <b>${escapeHtml(getActualSkillMpCostDom(selectedSkill))}</b></span>
          <span>伤害 <b>${escapeHtml(skillDmgText)}</b></span>
          <span>境界 <b>${escapeHtml(skillRealmName(selectedSkill.unlockRealm))}</b></span>
          <span>前置 <b>${selectedReqTextSafe}</b></span>
        </div>
        <div class="skill-value-grid">${skillValueChipsHtmlDom(selectedSkill, currentEnemy)}</div>
        <div class="skill-action-row">
          <button class="skill-learn-btn" data-tree="${escapeHtml(selectedTree)}" data-index="${selectedIndex}" ${selectedState.canLearn ? '' : 'disabled'}>${selectedState.learned ? '已点亮' : selectedState.canLearn ? '消耗 1 悟道点领悟' : '暂不可学习'}</button>
          <button class="skill-forget-btn" data-tree="${escapeHtml(selectedTree)}" data-index="${selectedIndex}" ${selectedState.canForget ? '' : 'disabled'}>${selectedState.learned ? (selectedState.canForget ? '遗忘并归还悟道点' : '具有后续技能，不能遗忘') : '未学习'}</button>
        </div>`;
    let html = `<div class="panel-head skill-panel-head">
      <span class="ptitle" style="color:#d4a0ff">📜 星盘技能树</span>
      <span class="psub">悟道 ${availableSkillPoints} · 炼体 ${availableStatPoints} · 已悟 ${learnedCount}/${totalCount}${synergyHint ? ` · ${escapeHtml(synergyHint)}` : ''}</span>
      <button class="pclose">×</button>
    </div>
    <div class="panel-body skills-panel-body">
      <div class="skill-orbit-board">`;
    treeNames.forEach(tree => {
      const td = SKILL_TREES[tree];
      const mastery = typeof getSkillTreeMastery === 'function' ? getSkillTreeMastery(tree) : null;
      html += `<section class="skill-branch branch-${cssClassToken(tree)}${mastery?.active ? ' mastery-active' : ''}" style="--branch-color:${safeCssColor(td.color)}">
        <div class="skill-branch-title"><span>${escapeHtml(td.name)}</span><em>${escapeHtml(skillTreeShortName(td.name))}${mastery?.active ? ` · 专精+${Math.round(mastery.damageBonus * 100)}%` : ''}</em></div>
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
        const nodeRecommendation = typeof getSkillSynergyRecommendationForTree === 'function' ? getSkillSynergyRecommendationForTree(tree) : null;
        if (nodeRecommendation && !st.learned && !st.locked && !st.blocked) cls.push('recommended');
        if (selectedTree === tree && selectedIndex === row) cls.push('selected');
        const icon = st.learned ? '✦' : st.locked ? '🔒' : st.blocked ? '◇' : (skill.icon || '＋');
        const reqNames = st.prereqs?.map(i => SKILL_TREES[tree].skills[i]?.name).filter(Boolean).join('/') || '';
        const hint = st.learned ? '已激活' : st.locked ? skillRealmName(skill.unlockRealm) : st.blocked ? `需${reqNames}` : st.canLearn ? '可点亮' : '缺点数';
        const kind = skill.kind || 'active';
        const kindLabel = SKILL_KIND_LABELS[kind] || '技能';
        const recommendationBadge = nodeRecommendation && !st.learned && !st.locked && !st.blocked ? `<span class="node-reco-badge">${nodeRecommendation.type === 'mastery' ? '专精' : '共鸣'}</span>` : '';
        html += `<button class="${cls.map(c => cssClassToken(c)).join(' ')} kind-${cssClassToken(kind)}" data-tree="${escapeHtml(tree)}" data-index="${row}" aria-label="${escapeHtml(skill.name)}">
          <span class="node-ring"><b>${escapeHtml(icon)}</b></span>
          <span class="node-copy">
            <span class="node-name">${escapeHtml(skill.name)}</span>
            <span class="node-meta"><i>${escapeHtml(slotLabel)}</i><i>${escapeHtml(kindLabel)}</i><small>${escapeHtml(hint)}</small></span>
          </span>
          ${recommendationBadge}
        </button>`;
      });
      html += `</div></section>`;
    });
    const masteryPanelHtml = skillCodex ? `<section class="skill-synergy-panel mastery-milestone-panel">
        <div class="synergy-title">单系专精奖励<small>${visibleMasteryMilestones.some(m => m.claimable) ? '有阶段奖励可领' : '3/5 同系阶段奖励'}</small></div>
        <div class="synergy-list">
          ${visibleMasteryMilestones.map(m => {
            const state = m.claimed ? '已领取' : m.claimable ? '可领取' : m.active ? '已达成' : `还差 ${escapeHtml(m.missing)} 个`;
            const rewardShort = (m.rewardText || '').replace('阶段奖励：', '').replace(/炼体点/g, '炼体').replace(/悟道点/g, '悟道').replace(/\s+/g, ' ').trim();
            return `<div class="synergy-card mastery-card ${m.active ? 'active' : 'locked'} ${m.claimed ? 'claimed' : ''} ${m.claimable ? 'claimable' : ''}" style="--tree-color:${safeCssColor(m.color)}"><b>${escapeHtml(m.icon)} ${escapeHtml(m.shortName)}${escapeHtml(m.name)}</b><span>${state} · ${escapeHtml(Math.min(m.learned, m.count))}/${escapeHtml(m.count)}</span>${rewardShort ? `<small class="synergy-reward">${escapeHtml(rewardShort)}</small>` : ''}${m.claimable ? `<button class="synergy-claim-btn mastery-claim-btn" data-tree="${escapeHtml(m.tree)}" data-count="${escapeHtml(m.count)}">领取</button>` : m.claimed ? `<button class="synergy-claim-btn claimed" disabled>已领</button>` : ''}</div>`;
          }).join('') || '<div class="synergy-card locked"><b>暂无专精阶段</b><span>继续悟道解锁</span></div>'}
        </div>
      </section>` : '';
    const synergyPanelHtml = `<section class="skill-synergy-panel">
        <div class="synergy-title">流派共鸣${synergyTitleSmall ? `<small>${escapeHtml(synergyTitleSmall)}</small>` : ''}</div>
        ${buildRecommendations.length ? `<div class="synergy-recommend-strip"><b>下一手推荐</b>${buildRecommendations.map(r => `<button type="button" data-tree="${escapeHtml(r.tree)}" data-index="${r.index}">${escapeHtml(r.skill.icon || '✦')} ${escapeHtml(r.skill.name)}<small>${escapeHtml(r.impact?.text || '')}</small></button>`).join('')}</div>` : ''}
        <div class="synergy-list">
          ${visibleSynergyProgress.map(syn => {
            const active = !!syn.active;
            const req = (syn.trees || []).map(t => `${skillTreeShortName(SKILL_TREES[t]?.name || t)}${syn.minLearnedEach || 1}`).join(' + ');
            const progressText = (syn.progress || []).map(p => `${p.shortName}${Math.min(p.learned, p.required)}/${p.required}`).join(' · ');
            const missingText = active ? '已激活' : (syn.progress || []).filter(p => p.missing > 0).map(p => `${p.shortName}${p.missing}`).join('、');
            const effectText = (syn.effects || []).map(e => SKILL_EFFECT_LABELS[e.type] || e.type).slice(0, 1).join(' / ');
            const claimState = syn.claimed ? '已领取' : syn.claimable ? '可领取' : active ? '已成型' : `需要 ${escapeHtml(req)}`;
            const mobileHint = active ? effectText : (missingText ? `还差：${missingText}` : req);
            const rewardShort = (syn.rewardText || '').replace('成型奖励：', '').replace(/攻击/g, '攻').replace(/灵力上限/g, '灵').replace(/生命上限/g, '命').replace(/防御/g, '防').replace(/\s+/g, ' ').trim();
            return `<div class="synergy-card ${active ? 'active' : 'locked'} ${syn.claimed ? 'claimed' : ''} ${syn.claimable ? 'claimable' : ''}"><b>${escapeHtml(syn.icon || '✦')} ${escapeHtml(syn.name)}</b><span>${claimState}</span>${progressText ? `<strong>${escapeHtml(progressText)}</strong>` : ''}${mobileHint ? `<em>${escapeHtml(mobileHint)}</em>` : ''}${rewardShort ? `<small class="synergy-reward">${escapeHtml(rewardShort)}</small>` : ''}${syn.claimable ? `<button class="synergy-claim-btn" data-synergy="${escapeHtml(syn.id)}">领取</button>` : syn.claimed ? `<button class="synergy-claim-btn claimed" disabled>已领</button>` : ''}</div>`;
          }).join('') || '<div class="synergy-card locked"><b>暂无共鸣</b><span>继续悟道解锁</span></div>'}
        </div>
      </section>`;
    html += `</div>
      ${synergyPanelHtml}
      ${masteryPanelHtml}
      <aside class="skill-detail-card" style="--branch-color:${safeCssColor(selectedData.color)}">
        ${detailHtml}
      </aside>
      ${skillCodex ? `<section class="skill-codex-panel">
        <div class="codex-head"><b>流派图鉴</b><span>${escapeHtml(skillCodex.learnedCount)}/${escapeHtml(skillCodex.totalSkills)} 已悟 · ${escapeHtml(skillCodex.completionPct)}%</span></div>
        <div class="codex-stats-row">
          <span class="${skillCodex.claimableCount ? 'claimable' : ''}"><b>${escapeHtml(skillCodex.claimableCount)}</b><small>待领奖励</small></span>
          <span><b>${escapeHtml(skillCodex.activeCount)}/${escapeHtml(skillCodex.synergyCount)}</b><small>共鸣成型</small></span>
          <span><b>${escapeHtml(skillCodex.masteryCount)}</b><small>单系专精</small></span>
        </div>
        <div class="codex-tree-row">${(skillCodex.treeStats || []).map(t => `<i style="--tree-color:${safeCssColor(t.color)}" class="${t.mastery?.active ? 'mastery' : ''}">${escapeHtml(t.shortName)} ${escapeHtml(t.learned)}/${escapeHtml(t.total)}</i>`).join('')}</div>
        ${skillCodex.claimableCount ? `<div class="codex-claim-guide">可领取：${[...(skillCodex.claimableSynergies || []).map(s => `「${s.name}」`), ...(skillCodex.claimableMasteries || []).map(m => `「${m.shortName}${m.name}」`)].join('、')}，下滑点击领取。</div>` : `<div class="codex-claim-guide muted">${escapeHtml(skillCodex.next?.hint || skillCodex.headline || '')}</div>`}
      </section>` : ''}
      <div class="attr-bar skill-attr-bar">
        <span class="attr-title">悟道加点</span>`;
    const attrBtns = [['atk','攻+3','#ff6644'],['def','防+2','#4488ff'],['hp','命+20','#55ff55'],['mp','灵+10','#aaddff']];
    const attrValues = [`⚔️${player.atk}`,`🛡️${player.def}`,`❤️${player.maxHp}`,`✨${player.maxMp}`];
    for (let i = 0; i < attrBtns.length; i++) {
      const [k,label,clr] = attrBtns[i];
      const valText = attrValues[i];
      const dis = availableStatPoints <= 0 ? ' disabled' : '';
      html += `<button class="attr-btn${dis}" data-attr="${k}" style="--attr-color:${safeCssColor(clr)};border-color:${safeCssColor(clr)};color:${safeCssColor(clr)}">${escapeHtml(label)} <small>${escapeHtml(valText)}</small></button>`;
    }
    html += `</div></div>`;
    p.innerHTML = html;
    const detailLayer = ensureSkillDetailLayer();
    detailLayer.innerHTML = skillDetailModalOpen ? `<div class="skill-modal-backdrop"><aside class="skill-detail-card skill-detail-modal" style="--branch-color:${safeCssColor(selectedData.color)}">
        <button class="skill-modal-close" data-skill-detail-close="1" aria-label="关闭技能详情">×</button>
        ${detailHtml}
      </aside></div>` : '';
    // Static skill panel actions are delegated in ensureSkillsDomPanel()/ensureSkillDetailLayer().
    // renderSkillsDomPanel() only refreshes markup so rerenders cannot accumulate duplicate mobile listeners.
    // ── Scroll reset: ensure panel body starts at top when opened ──
    const panelBody = p.querySelector('.panel-body, .skills-panel-body');
    if (panelBody) panelBody.scrollTop = 0;
    p.scrollTop = 0;
  }

  function ensureAlchemyDomPanel() {
    let p = document.getElementById('alchemy-dom-panel');
    if (p) return p;
    p = document.createElement('div'); p.id = 'alchemy-dom-panel';
    const onCloseHit = e => {
      const closeTarget = e.target.closest('.pclose');
      if (!closeTarget) return;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      popPanelFromStack('alchemy');
      syncBodyPanelState();
    };
    p.addEventListener('pointerdown', onCloseHit, { passive: false, capture: true });
    p.addEventListener('touchstart', onCloseHit, { passive: false, capture: true });
    p.addEventListener('click', onCloseHit, { capture: true });
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
    const onCloseHit = e => {
      const closeTarget = e.target.closest('.pclose');
      if (!closeTarget) return;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      popPanelFromStack('artifact');
      syncBodyPanelState();
    };
    p.addEventListener('pointerdown', onCloseHit, { passive: false, capture: true });
    p.addEventListener('touchstart', onCloseHit, { passive: false, capture: true });
    p.addEventListener('click', onCloseHit, { capture: true });
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
  function artifactShortNameDom(artifact) {
    return String(artifact?.name || '').replace(/[神器印镜壶塔剑]+$/g, '') || artifact?.name || '神器';
  }
  function artifactMaterialMetaDom(id) {
    return (typeof ARTIFACT_MATERIALS !== 'undefined' ? ARTIFACT_MATERIALS : []).find(m => m.id === id)
      || (typeof MATERIALS !== 'undefined' ? MATERIALS : []).find(m => m.id === id)
      || { id, name: id, color: '#d4c8b0' };
  }
  function artifactCostHtmlDom(cost) {
    if (!cost) return '<div class="artifact-cost muted">已达当前最高阶</div>';
    const stoneNeed = Number(cost.spiritStones || 0);
    const stoneOwn = Number(player?.spiritStones || 0);
    const stoneClass = stoneOwn < stoneNeed ? ' lack' : '';
    const mats = Object.entries(cost.materials || {}).map(([id, need]) => {
      const mat = artifactMaterialMetaDom(id);
      const own = Number(playerMaterials?.[id] || 0);
      const lack = own < Number(need || 0) ? ' lack' : '';
      return `<span class="mat-cost${lack}" style="--mat-color:${safeCssColor(mat.color, '#d4c8b0')}">${escapeHtml(mat.name)} ${escapeHtml(own)}/${escapeHtml(need)}</span>`;
    }).join('');
    return `<div class="artifact-cost"><b>升阶消耗</b><span class="mat-cost${stoneClass}">灵石 ${escapeHtml(stoneOwn)}/${escapeHtml(stoneNeed)}</span>${mats}</div>`;
  }
  function artifactAwakeningCheckDom(artifact, progress, cost) {
    if (!artifact || !progress) return { ok: false, label: '未获得', reason: 'not_owned' };
    if (progress.awakened) return { ok: false, label: '已觉醒', reason: 'awakened' };
    if (Number(progress.level || 0) < Number(artifact.maxLevel || 12)) return { ok: false, label: '满级后可觉醒', reason: 'level_cap' };
    if (!cost) return { ok: false, label: '暂不可觉醒', reason: 'no_cost' };
    if (Number(player?.spiritStones || 0) < Number(cost.spiritStones || 0)) return { ok: false, label: '灵石不足', reason: 'stones' };
    for (const [id, need] of Object.entries(cost.materials || {})) {
      if (Number(playerMaterials?.[id] || 0) < Number(need || 0)) return { ok: false, label: '材料不足', reason: 'materials', missing: id };
    }
    return { ok: true, label: '觉醒', reason: 'ready' };
  }
  function artifactAwakeningCardHtmlDom(artifact, progress, cost) {
    if (!artifact || !progress) return '';
    const check = artifactAwakeningCheckDom(artifact, progress, cost);
    const copy = typeof ARTIFACT_AWAKENING_COPY !== 'undefined' ? ARTIFACT_AWAKENING_COPY?.[artifact.id] : null;
    if (progress.awakened) {
      return `<section class="artifact-awakening-card done"><b>神器觉醒</b><p>${escapeHtml(progress.awakenName || copy?.name || '神器已觉醒')} · 终极效果已生效。</p></section>`;
    }
    if (check.reason === 'level_cap') {
      return `<section class="artifact-awakening-card blocked"><b>神器觉醒</b><p>满级后可觉醒：当前 Lv.${escapeHtml(progress.level || 1)}/${escapeHtml(artifact.maxLevel || 12)}。</p></section>`;
    }
    const stoneNeed = Number(cost?.spiritStones || 0);
    const stoneOwn = Number(player?.spiritStones || 0);
    const stoneClass = stoneOwn < stoneNeed ? ' lack' : '';
    const mats = Object.entries(cost?.materials || {}).map(([id, need]) => {
      const mat = artifactMaterialMetaDom(id);
      const own = Number(playerMaterials?.[id] || 0);
      const lack = own < Number(need || 0) ? ' lack' : '';
      return `<span class="mat-cost${lack}" style="--mat-color:${safeCssColor(mat.color, '#d4c8b0')}">${escapeHtml(mat.name)} ${escapeHtml(own)}/${escapeHtml(need)}</span>`;
    }).join('');
    const effectText = copy ? `${copy.name} · ${copy.effectKey} +${copy.value}` : '解锁终极觉醒效果';
    return `<section class="artifact-awakening-card ${check.ok ? 'ready' : 'blocked'}"><b>神器觉醒</b><p>${escapeHtml(effectText)}</p><div class="artifact-cost awakening"><b>觉醒消耗</b><span class="mat-cost${stoneClass}">灵石 ${escapeHtml(stoneOwn)}/${escapeHtml(stoneNeed)}</span>${mats}</div></section>`;
  }
  function artifactEffectTextDom(artifact, progress = {}) {
    const effects = artifact?.effects || {};
    const awakened = !!progress?.awakened;
    const parts = [];
    if (effects.swordQiChance) parts.push(`剑气 ${effects.swordQiChance}% · 追加${Math.round(Number(effects.swordQiRatio || 0) * 100)}%伤害`);
    if (effects.deathSave) parts.push(`濒死护体 · 每层保命${effects.deathSave}次`);
    if (effects.killRecoverPct) parts.push(`击杀恢复 ${Math.round(Number(effects.killRecoverPct || 0) * 100)}%生命`);
    if (effects.treasureEchoChance) parts.push(`机缘回响 ${effects.treasureEchoChance}%`);
    if (effects.thunderSealChain) parts.push(`雷印连锁 ${effects.thunderSealChain}%`);
    if (!parts.length) parts.push('战斗中触发神器被动效果');
    if (awakened) parts.push('已觉醒');
    return parts.join(' · ');
  }
  function artifactTagsHtmlDom(artifact) {
    const tags = Array.isArray(artifact?.tags) ? artifact.tags : [];
    return tags.map(tag => `<span class="artifact-tag">${escapeHtml(tag)}</span>`).join('');
  }
  function artifactNextGainHtmlDom(artifact, progress) {
    if (!artifact || !progress) return '';
    const level = Number(progress.level || 1);
    if (level >= Number(artifact.maxLevel || 0)) return '<span class="artifact-next-muted">已达神器最高等级</span>';
    return Object.entries(artifact.perLevelStats || {}).map(([k, v]) => `<span><em>${escapeHtml(statLabelDom(k))}</em><b>${escapeHtml(formatStatValueDom(k, v))}</b></span>`).join('') || '<span class="artifact-next-muted">下阶提升神器效果</span>';
  }
  function artifactMissingEntriesDom(cost) {
    const missing = [];
    if (!cost) return missing;
    const stoneNeed = Number(cost.spiritStones || 0);
    const stoneOwn = Number(player?.spiritStones || 0);
    if (stoneOwn < stoneNeed) missing.push({ id: 'spiritStones', name: '灵石', color: '#8fd3ff', own: stoneOwn, need: stoneNeed, source: '副本 / 扫荡 / 宝箱' });
    for (const [id, needRaw] of Object.entries(cost.materials || {})) {
      const need = Number(needRaw || 0);
      const own = Number(playerMaterials?.[id] || 0);
      if (own >= need) continue;
      const mat = artifactMaterialMetaDom(id);
      missing.push({ id, name: mat.name || id, color: mat.color || '#d4c8b0', own, need, source: mat.source || '精英怪 / Boss / 秘境' });
    }
    return missing;
  }
  function artifactNextGoalHtmlDom(artifact, progress, cost, realmCap) {
    if (!artifact) return '';
    if (!progress) {
      const shard = artifactMaterialMetaDom(artifactShardId(artifact.id));
      return `<section class="artifact-next-card"><b>下一步</b><p>激活 ${escapeHtml(artifact.name)} 后开启升阶养成。</p><div class="artifact-source-list"><span style="--mat-color:${safeCssColor(shard.color, '#d4c8b0')}"><em>${escapeHtml(shard.name)}</em><strong>${escapeHtml(shard.source || '精英怪 / Boss / 神器秘境')}</strong></span></div></section>`;
    }
    const level = Number(progress.level || 1);
    if (level >= Number(artifact.maxLevel || 0)) return `<section class="artifact-next-card done"><b>下一步</b><p>已达当前神器最高等级。</p></section>`;
    if (level >= Number(realmCap || 0)) return `<section class="artifact-next-card blocked"><b>下一步</b><p>升至 Lv.${escapeHtml(level + 1)} 需要更高境界，当前上限 Lv.${escapeHtml(realmCap)}。</p></section>`;
    const missing = artifactMissingEntriesDom(cost);
    const missingHtml = missing.length
      ? `<div class="artifact-missing"><em>缺少</em>${missing.map(m => `<span style="--mat-color:${safeCssColor(m.color, '#d4c8b0')}">${escapeHtml(m.name)} ${escapeHtml(m.own)}/${escapeHtml(m.need)}</span>`).join('')}</div>`
      : '<div class="artifact-missing ready"><em>材料已齐</em><span>可以升阶</span></div>';
    const sourceItems = (missing.length ? missing : Object.entries(cost?.materials || {}).map(([id]) => {
      const mat = artifactMaterialMetaDom(id); return { ...mat, source: mat.source || '精英怪 / Boss / 秘境' };
    })).slice(0, 3);
    const sourceHtml = sourceItems.length ? `<div class="artifact-source-list">${sourceItems.map(m => `<span style="--mat-color:${safeCssColor(m.color, '#d4c8b0')}"><em>${escapeHtml(m.name)}</em><strong>${escapeHtml(m.source)}</strong></span>`).join('')}</div>` : '';
    return `<section class="artifact-next-card"><b>下一步：升至 Lv.${escapeHtml(level + 1)}</b><div class="artifact-next-gain">${artifactNextGainHtmlDom(artifact, progress)}</div>${missingHtml}${sourceHtml}</section>`;
  }
  function artifactActionStateDom(artifact, progress, isActive, canUse, upgradeCheck, realmCap) {
    const activateLabel = isActive ? '卸下' : (canUse ? '激活神器' : '金丹解锁');
    const activateAttr = isActive ? 'data-artifact-off="1"' : `data-artifact-id="${escapeHtml(artifact.id)}"${canUse ? '' : ' disabled'}`;
    let upgradeLabel = '升阶';
    let upgradeDisabled = true;
    if (!progress) upgradeLabel = '未获得';
    else if (upgradeCheck?.reason === 'realm_cap') upgradeLabel = `境界上限 Lv.${realmCap}`;
    else if (upgradeCheck?.reason === 'max_level') upgradeLabel = '已满级';
    else {
      upgradeDisabled = !upgradeCheck?.ok;
      upgradeLabel = '升阶';
    }
    return { activateLabel, activateAttr, upgradeLabel, upgradeDisabled };
  }
  function renderArtifactDomPanel() {
    const p = ensureArtifactDomPanel();
    const artifacts = Object.values(typeof ARTIFACTS !== 'undefined' ? ARTIFACTS : {});
    const realmCap = typeof getArtifactLevelCap === 'function' ? getArtifactLevelCap(player?.realmIndex || 0) : 0;
    const unlockRealm = typeof getArtifactUnlockRealm === 'function' ? getArtifactUnlockRealm() : 2;
    const unlocked = (player?.realmIndex || 0) >= unlockRealm;
    const state = typeof getArtifactState === 'function' ? getArtifactState(player) : { activeId: null, owned: {} };
    const active = state.activeId && ARTIFACTS?.[state.activeId] ? ARTIFACTS[state.activeId] : null;
    const activeProgress = active ? state.owned?.[active.id] : null;
    if (!selectedArtifactId || !ARTIFACTS?.[selectedArtifactId]) selectedArtifactId = state.activeId || artifacts[0]?.id || null;
    const selected = selectedArtifactId && ARTIFACTS?.[selectedArtifactId] ? ARTIFACTS[selectedArtifactId] : artifacts[0];
    const selectedProgress = selected ? (state.owned?.[selected.id] || null) : null;
    const selectedIsActive = !!selected && state.activeId === selected.id;
    const selectedCanUse = selected && typeof canUseArtifact === 'function' ? canUseArtifact(selected.id, player).ok : unlocked;
    const selectedUpgradeCheck = selectedProgress && typeof hasArtifactUpgradeMaterials === 'function' ? hasArtifactUpgradeMaterials(player, playerMaterials, selected.id) : null;
    const selectedCost = selectedProgress && typeof getArtifactUpgradeCost === 'function' ? getArtifactUpgradeCost(selected.id, selectedProgress.level) : null;
    const selectedAwakenCost = selectedProgress && typeof getArtifactAwakeningCost === 'function' ? getArtifactAwakeningCost(selected.id) : null;
    const selectedAwakenCheck = selectedProgress ? artifactAwakeningCheckDom(selected, selectedProgress, selectedAwakenCost) : { ok: false, label: '未获得', reason: 'not_owned' };
    const action = selected ? artifactActionStateDom(selected, selectedProgress, selectedIsActive, selectedCanUse, selectedUpgradeCheck, realmCap) : null;
    const stripHtml = artifacts.map(artifact => {
      const progress = state.owned?.[artifact.id] || null;
      const isActive = state.activeId === artifact.id;
      const isSelected = selected?.id === artifact.id;
      const canUse = typeof canUseArtifact === 'function' ? canUseArtifact(artifact.id, player).ok : unlocked;
      const upgradeCheck = progress && typeof hasArtifactUpgradeMaterials === 'function' ? hasArtifactUpgradeMaterials(player, playerMaterials, artifact.id) : null;
      const classes = ['artifact-orb'];
      if (isSelected) classes.push('selected');
      if (isActive) classes.push('active');
      if (!progress) classes.push('locked');
      if (!canUse) classes.push('sealed');
      if (upgradeCheck?.ok) classes.push('upgradable');
      return `<button class="${classes.join(' ')}" type="button" data-artifact-select="${escapeHtml(artifact.id)}" style="--artifact-color:${escapeHtml(artifact.color)}">
        <span class="artifact-orb-icon">${escapeHtml(artifact.icon)}</span>
        <span class="artifact-orb-name">${escapeHtml(artifactShortNameDom(artifact))}</span>
        <span class="artifact-orb-level">${progress ? `Lv.${escapeHtml(progress.level)}` : (canUse ? '未得' : '锁')} · ${escapeHtml(artifact.role || artifact.tags?.[0] || '')}</span>
        ${isActive ? '<span class="artifact-orb-tag">已用</span>' : ''}
      </button>`;
    }).join('');
    const activeHero = active
      ? `<div class="artifact-hero active" style="--artifact-color:${escapeHtml(active.color)}"><div class="artifact-hero-icon">${escapeHtml(active.icon)}</div><div class="artifact-hero-main"><span>当前激活</span><b>${escapeHtml(active.name)} ${escapeHtml(activeProgress ? `Lv.${activeProgress.level}` : '')}</b><em>${escapeHtml(artifactEffectTextDom(active, activeProgress))}</em></div></div>`
      : `<div class="artifact-hero empty" style="--artifact-color:#777"><div class="artifact-hero-icon">○</div><div class="artifact-hero-main"><span>${unlocked ? '当前未激活' : '神器未解锁'}</span><b>${unlocked ? '选择下方神器激活' : '金丹期开放神器'}</b><em>${unlocked ? '同一时间只生效一件神器' : '筑基期可先收集碎片'}</em></div></div>`;
    const detailHtml = selected ? `<section class="artifact-detail-card" style="--artifact-color:${escapeHtml(selected.color)}">
      <div class="artifact-detail-head"><div class="artifact-detail-icon">${escapeHtml(selected.icon)}</div><div><span>选中神器</span><b>${escapeHtml(selected.name)}</b><em>${selectedProgress ? `Lv.${escapeHtml(selectedProgress.level)}${selectedProgress.awakened ? ' · 已觉醒' : ''}` : '未获得'}</em></div></div>
      <p>${escapeHtml(selected.desc)}</p>
      <div class="artifact-tags">${artifactTagsHtmlDom(selected)}</div>
      <div class="artifact-stats">${artifactStatsHtmlDom(selected, selectedProgress || { level: 1 })}</div>
      <div class="artifact-effect"><b>战斗效果</b><span>${escapeHtml(artifactEffectTextDom(selected, selectedProgress || {}))}</span></div>
      ${artifactNextGoalHtmlDom(selected, selectedProgress, selectedCost, realmCap)}
      ${selectedProgress ? artifactCostHtmlDom(selectedCost) : `<div class="artifact-cost muted">激活后显示升阶消耗</div>`}
      ${artifactAwakeningCardHtmlDom(selected, selectedProgress, selectedAwakenCost)}
    </section>` : '<section class="artifact-detail-card empty">暂无神器</section>';
    const matHtml = (typeof ARTIFACT_MATERIALS !== 'undefined' ? ARTIFACT_MATERIALS : []).map(mat => {
      const count = Number(playerMaterials?.[mat.id] || 0);
      return `<span class="artifact-mat-chip" style="--mat-color:${safeCssColor(mat.color, '#d4c8b0')}">${escapeHtml(mat.name)} x${escapeHtml(count)}</span>`;
    }).join('') || '<span class="artifact-mat-chip empty">暂无神器材料</span>';
    p.innerHTML = `<div class="panel-head artifact-head">
      <span class="ptitle" style="color:#ffdd66">🗡️ 神器</span>
      <span class="psub">${unlocked ? `境界上限 Lv.${realmCap}` : `金丹期解锁 · 筑基期掉碎片`}</span>
      <button class="pclose" type="button">×</button>
    </div><div class="panel-body artifact-body">
      ${activeHero}
      <section class="artifact-section"><div class="bt-section-title">神器选择 <small>横滑选择</small></div><div class="artifact-strip">${stripHtml}</div></section>
      ${detailHtml}
      <details class="artifact-materials"><summary>神器材料总览</summary><div class="artifact-material-grid">${matHtml}</div></details>
    </div>
    ${selected ? `<div class="artifact-sticky-actions" style="--artifact-color:${escapeHtml(selected.color)}">
      <button class="artifact-action primary" type="button" ${action.activateAttr}>${escapeHtml(action.activateLabel)}</button>
      <button class="artifact-action upgrade" type="button" data-artifact-upgrade="${escapeHtml(selected.id)}"${action.upgradeDisabled ? ' disabled aria-disabled="true"' : ''}>${escapeHtml(action.upgradeLabel)}</button>
      <button class="artifact-action awaken" type="button" data-artifact-awaken="${escapeHtml(selected.id)}"${selectedAwakenCheck.ok ? '' : ' disabled aria-disabled="true"'}>${escapeHtml(selectedAwakenCheck.label)}</button>
    </div>` : ''}`;
    p.querySelectorAll('[data-artifact-select]').forEach(btn => {
      bindInventoryTapDom(btn, () => {
        selectedArtifactId = btn.dataset.artifactSelect;
        renderArtifactDomPanel();
      });
    });
    p.querySelectorAll('[data-artifact-id]').forEach(btn => {
      bindInventoryTapDom(btn, () => {
        selectedArtifactId = btn.dataset.artifactId;
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
        selectedArtifactId = btn.dataset.artifactUpgrade;
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
    p.querySelectorAll('[data-artifact-awaken]').forEach(btn => {
      bindInventoryTapDom(btn, () => {
        selectedArtifactId = btn.dataset.artifactAwaken;
        const result = typeof awakenArtifact === 'function' ? awakenArtifact(player, playerMaterials, btn.dataset.artifactAwaken) : { ok: false };
        if (result.ok) showMessage(`✨ 神器觉醒：${result.awaken?.name || result.artifact.name}`, result.artifact.color || '#ffdd66');
        else {
          const reasonText = result.reason === 'level_cap' ? '满级后可觉醒' : (result.reason === 'stones' ? '灵石不足' : (result.reason === 'materials' ? '觉醒材料不足' : (result.reason === 'awakened' ? '神器已觉醒' : '暂时无法觉醒')));
          showMessage(reasonText, '#ff8844');
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
    const onCloseHit = e => {
      const closeTarget = e.target.closest('.pclose');
      if (!closeTarget) return;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      closeBreakthroughPanel();
    };
    p.addEventListener('pointerdown', onCloseHit, { passive: false, capture: true });
    p.addEventListener('touchstart', onCloseHit, { passive: false, capture: true });
    p.addEventListener('click', onCloseHit, { capture: true });
    document.body.appendChild(p);
    return p;
  }
  function percentTextDom(value) { return `${Math.round(Number(value || 0) * 100)}%`; }
  function statDeltaListHtmlDom(delta) {
    if (!delta) return '';
    const items = [
      ['生命', delta.hp], ['灵力', delta.mp], ['攻击', delta.atk], ['防御', delta.def], ['悟道点', delta.skillPoints], ['炼体点', delta.statPoints],
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
    let toast = document.getElementById('combat-result-toast');
    if (!toast) { toast = document.createElement('div'); toast.id = 'combat-result-toast'; toast.className = 'combat-result-toast'; toast.style.pointerEvents = 'none'; document.body.appendChild(toast); }
    p = document.createElement('div'); p.id = 'combat-dom-panel';
    const onCombatAction = e => {
      const target = e.target.closest('#cbt-attack, #cbt-defend, #cbt-flee, #cbt-skill-toggle, #cbt-skill-toggle-action, .cbt-skill-btn, .cbt-drawer-skill');
      if (!target) return;
      if (e.type === 'click' && Date.now() < combatDelegatedTouchUntil) {
        e.preventDefault?.();
        e.stopPropagation?.();
        return;
      }
      if (target.classList.contains('disabled')) return;
      const scrollCard = target.closest('.cbt-drawer-skill');
      if ((e.type === 'pointerdown' || e.type === 'touchstart') && scrollCard) {
        const drawer = scrollCard.closest('.cbt-skill-drawer');
        const point = e.touches?.[0] || e;
        scrollCard._combatTapStart = {
          x: Number(point.clientX || 0),
          y: Number(point.clientY || 0),
          scrollTop: drawer ? drawer.scrollTop : 0,
          at: Date.now()
        };
        return;
      }
      if (e.type === 'click' && scrollCard && scrollCard._combatTapStart) {
        const drawer = scrollCard.closest('.cbt-skill-drawer');
        const start = scrollCard._combatTapStart;
        scrollCard._combatTapStart = null;
        const moved = Math.abs(Number(e.clientX || 0) - start.x) > 10 || Math.abs(Number(e.clientY || 0) - start.y) > 10 || Math.abs((drawer ? drawer.scrollTop : 0) - start.scrollTop) > 2;
        if (moved) {
          e.preventDefault?.();
          e.stopPropagation?.();
          combatDelegatedTouchUntil = Date.now() + 250;
          return;
        }
      }
      if (e.type === 'touchstart' || e.type === 'pointerdown') combatDelegatedTouchUntil = Date.now() + 650;
      if (e.type === 'click' && Date.now() < combatDelegatedTouchUntil) {
        e.preventDefault?.();
        e.stopPropagation?.();
        return;
      }
      e.preventDefault?.();
      e.stopPropagation?.();
      if (!isInCombat() || !currentEnemy) return;
      const isPlayerTurn = combatState === COMBAT_STATE.PLAYER_TURN;
      if (target.id === 'cbt-skill-toggle' || target.id === 'cbt-skill-toggle-action') {
        markCombatActionFeedback('toggle');
        combatSkillDrawerOpen = !combatSkillDrawerOpen;
        combatDomRenderCacheKey = '';
        renderCombatDomPanel();
        return;
      }
      if (!isPlayerTurn) return;
      if (target.id === 'cbt-attack') { markCombatActionFeedback('attack'); combatSkillDrawerOpen = false; combatDomRenderCacheKey = ''; playerAttack(); return; }
      if (target.id === 'cbt-defend') { markCombatActionFeedback('defend'); combatSkillDrawerOpen = false; combatDomRenderCacheKey = ''; playerDefend(); return; }
      if (target.id === 'cbt-flee') { markCombatActionFeedback('flee'); combatSkillDrawerOpen = false; combatDomRenderCacheKey = ''; playerFlee(); return; }
      if (target.matches('.cbt-skill-btn, .cbt-drawer-skill')) {
        const idx = parseInt(target.dataset.skill, 10) || 0;
        const combatSkills = typeof getCombatSkills === 'function' ? getCombatSkills() : [];
        const skill = combatSkills[idx];
        const cost = skill && typeof getActualSkillMpCostDom === 'function' ? getActualSkillMpCostDom(skill) : Number(skill?.mpCost || 0);
        markCombatActionFeedback(player.mp < cost ? 'mp' : 'skill', idx);
        combatSkillDrawerOpen = false;
        combatDomRenderCacheKey = '';
        playerUseSkill(idx);
      }
    };
    p.addEventListener('pointerdown', onCombatAction, { passive: false });
    p.addEventListener('touchstart', onCombatAction, { passive: false });
    p.addEventListener('click', onCombatAction);
    document.body.appendChild(p);
    return p;
  }
  function getCombatDefensePreviewDom(enemy = currentEnemy, intent = null) {
    if (!enemy || !player) return null;
    const next = intent || enemy._nextIntent || null;
    const suggestion = String(next?.suggestion || '');
    const shouldDefend = /防御|护身|控场/.test(suggestion) || next?.attackType === 'heavy' || next?.type === 'boss' || ['multiHit', 'damageStatus', 'damageDebuff'].includes(next?.skill?.type || '');
    if (!shouldDefend) return null;
    const attackMult = (typeof getEnemyAttackBuffMultiplier === 'function' ? getEnemyAttackBuffMultiplier() : 1);
    const takenMult = (typeof getPlayerTakenDamageMultiplier === 'function' ? getPlayerTakenDamageMultiplier() : 1);
    const reduce = typeof equipmentAbilityValue === 'function' ? Math.min(0.7, Number(equipmentAbilityValue('dmgReduce') || 0) / 100) : 0;
    const skill = next?.skill || null;
    let mult = Number(skill?.dmgMult || 0) || (next?.attackType === 'heavy' ? 1.35 : 1);
    if (skill?.type === 'multiHit') mult = Math.max(mult, Number(skill.hits || 2) * 0.72);
    if (next?.type === 'boss') mult = Math.max(mult, 1.2);
    const raw = Math.max(1, Math.floor(Number(enemy.atk || 0) * attackMult * mult) - Number(player.def || 0));
    let normal = Math.max(1, Math.floor(raw * takenMult));
    if (reduce > 0) normal = Math.max(1, Math.floor(normal * (1 - reduce)));
    const defended = Math.max(1, Math.floor(normal * 0.5));
    const saved = Math.max(0, normal - defended);
    if (saved <= 0) return null;
    const hpPct = player.maxHp ? Number(player.hp || 0) / Math.max(1, Number(player.maxHp || 1)) : 1;
    const tone = normal >= Number(player.hp || 0) ? 'danger' : (hpPct < 0.45 || saved >= 10 ? 'warn' : 'safe');
    return { normal, defended, saved, tone, text: `防御少受约${saved}伤` };
  }
  function renderCombatDomPanel() {
    const p = ensureCombatDomPanel();
    if (!isInCombat() || !currentEnemy) {
      if (p.innerHTML) p.innerHTML='';
      combatDomRenderCacheKey = '';
      combatSkillDrawerOpen = false;
      p.classList.remove('drawer-open');
      return;
    }
    const combatSkills = getCombatSkills();
    const isPlayerTurn = combatState === COMBAT_STATE.PLAYER_TURN;
    const feedbackKey = combatActionFeedback.until > Date.now() ? `${combatActionFeedback.id}:${combatActionFeedback.until}` : '';
    const cacheKey = [
      currentEnemy.name, currentEnemy.title || '', currentEnemy.affix?.id || '', Math.ceil(Number(currentEnemy.hp || 0)), Number(currentEnemy.maxHp || 0),
      Math.ceil(Number(player.hp || 0)), Number(player.maxHp || 0), Math.ceil(Number(player.mp || 0)), Number(player.maxMp || 0), player.def || 0,
      combatState, combatSkillDrawerOpen ? 1 : 0, feedbackKey, combatLogBuffer.slice(-6).map(l => `${l.seq}:${l.text}:${l.tone}:${l.color}`).join('|'),
      (currentEnemy._statusEffects || []).map(s => `${s.type}:${s.turns}`).join('|'),
      (player._statusEffects || []).map(s => `${s.type}:${s.turns}`).join('|'),
      currentEnemy._nextIntent ? `${currentEnemy._nextIntent.type}:${currentEnemy._nextIntent.icon}:${currentEnemy._nextIntent.label}` : '',
      combatSkills.map(s => `${s.tree}:${s.index}:${s.name}:${getActualSkillMpCostDom(s)}`).join('|')
    ].join('~');
    if (cacheKey === combatDomRenderCacheKey) return;
    combatDomRenderCacheKey = cacheKey;
    p.classList.toggle('drawer-open', !!combatSkillDrawerOpen);
    const eHpPct = currentEnemy.maxHp ? Math.max(0, currentEnemy.hp / currentEnemy.maxHp) : 1;
    const enemyDisplayName = currentEnemy.title || currentEnemy.name;
    const enemySkills = typeof getEnemySkills === 'function' ? getEnemySkills(currentEnemy) : [];
    const enemySkillText = enemySkills.length ? enemySkills.map(s => `${s.icon || '✦'}${s.name}`).join('、') : '无';
    const lockedIntent = (currentEnemy && currentEnemy._nextIntent) || null;
    const enemyIntent = lockedIntent || null;
    const defensePreview = getCombatDefensePreviewDom(currentEnemy, enemyIntent);
    const suggestionHtml = enemyIntent && enemyIntent.suggestion ? `<span class="cbt-intent-suggestion">${escapeHtml(enemyIntent.suggestion)}</span>` : '';
    const defenseHintHtml = defensePreview ? `<span class="cbt-defense-hint ${escapeHtml(defensePreview.tone || 'safe')}" title="预计受${escapeHtml(defensePreview.normal)}伤；防御后约${escapeHtml(defensePreview.defended)}伤">🛡️${escapeHtml(defensePreview.text)}</span>` : '';
    const enemyIntentHtml = enemyIntent ? `<div class="cbt-intent intent-${cssClassToken(enemyIntent.type || 'attack')}" title="${escapeHtml(enemyIntent.detail || '')}"><b>下回合</b><span class="cbt-intent-main">${escapeHtml(enemyIntent.icon || '⚔️')}${escapeHtml(enemyIntent.label || '普攻')}</span><div class="cbt-intent-hints">${suggestionHtml}${defenseHintHtml}</div></div>` : '';
    const enemyAffinity = typeof getEnemyAffinitySummary === 'function' ? getEnemyAffinitySummary(currentEnemy) : null;
    const enemyAffix = currentEnemy.affix || null;
    const enemyAffixHtml = enemyAffix ? `<span class="affix" style="--affix-color:${safeCssColor(enemyAffix.color, '#ffdd88')}" title="${escapeHtml(enemyAffix.note || '词缀妖物')}">${escapeHtml(enemyAffix.icon || '✦')}${escapeHtml(enemyAffix.label || '词缀')}</span>` : '';
    const enemyBuffDef = typeof getEnemyDefenseBuffMultiplier === 'function' ? getEnemyDefenseBuffMultiplier() : 1;
    const enemyBuffAtk = typeof getEnemyAttackBuffMultiplier === 'function' ? getEnemyAttackBuffMultiplier() : 1;
    const enemyAtkText = Math.floor(Number(currentEnemy.atk || 0) * enemyBuffAtk);
    const enemyDefText = Math.floor(currentEnemy.def * enemyBuffDef);
    const playerHpPct = player.maxHp ? Math.max(0, Math.min(100, player.hp / player.maxHp * 100)) : 100;
    const playerMpPct = player.maxMp ? Math.max(0, Math.min(100, player.mp / player.maxMp * 100)) : 100;
    const pEnemyName = `${currentEnemy.isBoss ? '👑' : '👺'} ${enemyDisplayName}`;
    const buildSummary = typeof getActiveSkillBuildSummary === 'function' ? getActiveSkillBuildSummary() : null;
    const combatBenefit = typeof getSkillCombatBenefitSummary === 'function' ? getSkillCombatBenefitSummary(currentEnemy) : null;
    const buildAffinity = typeof getSkillBuildAffinityMatch === 'function' ? getSkillBuildAffinityMatch(currentEnemy) : null;
    const combatBuildBadges = buildSummary ? [
      ...(buildSummary.synergies || []).slice(0, 2).map(s => ({ cls: 'synergy', text: `${s.icon || '✦'} ${s.name}` })),
      ...(buildSummary.masteries || []).slice(0, 2).map(m => ({ cls: 'mastery', text: `${SKILL_TREES[m.tree]?.icon || '✦'} ${m.shortName || SKILL_TREES[m.tree]?.name || m.tree}专精` })),
    ] : [];
    const combatBuildHtml = combatBuildBadges.length || buildAffinity ? `<div class="cbt-build-row" title="${escapeHtml([combatBenefit?.text, buildAffinity?.detail].filter(Boolean).join(' · '))}">${combatBuildBadges.slice(0, 2).map(b => `<span class="cbt-build-badge ${cssClassToken(b.cls)}">${escapeHtml(b.text)}</span>`).join('')}${buildAffinity ? `<span class="cbt-build-badge affinity-${cssClassToken(buildAffinity.status || 'neutral')}">相性：${escapeHtml(buildAffinity.label || buildAffinity.detail || '一般')}</span>` : ''}</div>` : (combatBenefit?.text ? `<div class="cbt-build-row"><span class="cbt-build-badge hint">${escapeHtml(combatBenefit.text)}</span></div>` : '');
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
    const logsHtml = combatLogBuffer.slice(-4).map(l => `<div class="cbt-log-entry tone-${cssClassToken(l.tone || 'neutral')}" style="--log-color:${safeCombatColor(l.color)}"><i>${escapeHtml(String(l.seq || ''))}</i><span>${escapeHtml(l.text)}</span></div>`).join('');
    const comboPlan = typeof getCombatSkillComboPlan === 'function' ? getCombatSkillComboPlan(combatSkills, currentEnemy) : [];
    const recommendedCombo = comboPlan[0] || null;
    const recommendedActionText = recommendedCombo?.skill?.name ? `技能·${recommendedCombo.skill.name}` : (combatSkills.length ? '技能' : '普攻');
    const recommendedActionTitle = recommendedCombo ? `${recommendedCombo.skill?.icon || '✦'}${recommendedCombo.skill?.name || '技能'}：${recommendedCombo.label}` : (combatSkills.length ? '展开功法' : '暂无功法，建议普攻');
    const recommendedActionIcon = recommendedCombo?.skill?.icon || '📜';
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
        const synergyTag = typeof getSkillSynergyTagText === 'function' ? getSkillSynergyTagText(s) : '';
        const synergyShortTag = typeof getSkillSynergyShortTagText === 'function' ? getSkillSynergyShortTagText(s) : synergyTag;
        const synergyHint = typeof getSkillSynergyCombatHint === 'function' ? getSkillSynergyCombatHint(s, currentEnemy) : null;
        const comboPrimer = typeof getCombatSkillComboPrimer === 'function' ? getCombatSkillComboPrimer(s, currentEnemy, combatSkills) : null;
        const affinityMeta = typeof getSkillAffinityMeta === 'function' ? getSkillAffinityMeta(s, currentEnemy) : (typeof getSkillAffinityText === 'function' ? { text: getSkillAffinityText(s, currentEnemy), type: 'hit', badge: '克' } : null);
        const affinityTag = affinityMeta?.text || '';
        const affinityType = cssClassToken(affinityMeta?.type || 'hit');
        const metaText = [recommendedCombo?.index === i ? `荐：${recommendedCombo.label}` : '', comboPrimer?.label, synergyHint?.readinessText, synergyHint?.label || synergyShortTag, affinityMeta?.tip || affinityTag].filter(Boolean).join(' · ');
        const titleText = [recommendedCombo?.index === i ? `连携推荐：${recommendedCombo.label}` : '', comboPrimer?.detail, synergyHint?.text || synergyTag, synergyHint?.detailText, synergyHint?.readinessText, affinityMeta?.tip || affinityTag].filter(Boolean).join(' · ');
        skillsHtml += `<div class="cbt-skill-btn${reason ? ' disabled' : ''}${synergyTag ? ' synergy-ready' : ''}${affinityTag ? ` affinity-${affinityType}` : ''}${recommendedCombo?.index === i ? ' combo-recommended' : ''}${combatActionFeedback.id === 'skill' && combatActionFeedback.until > Date.now() && parseInt(combatActionFeedback.skillIndex, 10) === i ? ' just-used' : ''}" role="button" tabindex="0" aria-disabled="${reason ? 'true' : 'false'}" data-skill="${i}" title="${escapeHtml(titleText)}" aria-label="${escapeHtml([s.name, titleText].filter(Boolean).join('：'))}" style="--skill-color:${color};color:${color};border-color:${color}"><b>${escapeHtml(s.icon || '✦')}${escapeHtml(s.name)}${recommendedCombo?.index === i ? '<i class="combo">荐</i>' : ''}${synergyTag ? '<i>共</i>' : ''}${affinityTag ? `<i class="aff ${affinityType}">${escapeHtml(affinityMeta?.badge || '克')}</i>` : ''}</b><small>${escapeHtml(reason || (metaText || `灵${mpCost} · ${values.damage}伤`))}</small></div>`;
      }
      if (combatSkills.length > 3) skillsHtml += `<div class="cbt-skill-more ${combatSkillDrawerOpen ? 'active' : ''}" id="cbt-skill-toggle">${combatSkillDrawerOpen ? '收起' : `技能 ${combatSkills.length}`}</div>`;
      skillsHtml += '</div>';
    }
    const drawerHtml = combatSkillDrawerOpen && combatSkills.length > 0 ? `<div class="cbt-skill-drawer"><div class="cbt-drawer-title"><b>功法</b><span>${isPlayerTurn ? '点按释放 · 可滚动' : '敌方行动中'}</span></div><div class="cbt-drawer-grid">${combatSkills.map((s, i) => {
      const color = safeCssColor(s.treeColor, '#d4a0ff');
      const mpCost = getActualSkillMpCostDom(s);
      const values = getSkillEstimatedValuesDom(s, currentEnemy);
      const summary = typeof getSkillEffectSummary === 'function' ? getSkillEffectSummary(s) : '';
      const synergyTag = typeof getSkillSynergyTagText === 'function' ? getSkillSynergyTagText(s) : '';
      const synergyShortTag = typeof getSkillSynergyShortTagText === 'function' ? getSkillSynergyShortTagText(s) : synergyTag;
      const synergyHint = typeof getSkillSynergyCombatHint === 'function' ? getSkillSynergyCombatHint(s, currentEnemy) : null;
      const comboPrimer = typeof getCombatSkillComboPrimer === 'function' ? getCombatSkillComboPrimer(s, currentEnemy, combatSkills) : null;
      const affinityMeta = typeof getSkillAffinityMeta === 'function' ? getSkillAffinityMeta(s, currentEnemy) : (typeof getSkillAffinityText === 'function' ? { text: getSkillAffinityText(s, currentEnemy), type: 'hit', badge: '克' } : null);
      const affinityTag = affinityMeta?.text || '';
      const affinityType = cssClassToken(affinityMeta?.type || 'hit');
      const reason = !isPlayerTurn ? '等待回合' : player.mp < mpCost ? '灵力不足' : '';
      return `<button type="button" class="cbt-drawer-skill${reason ? ' disabled' : ''}${synergyTag ? ' synergy-ready' : ''}${affinityTag ? ` affinity-${affinityType}` : ''}${recommendedCombo?.index === i ? ' combo-recommended' : ''}" data-skill="${i}" title="${escapeHtml([recommendedCombo?.index === i ? `连携推荐：${recommendedCombo.label}` : '', comboPrimer?.detail, synergyHint?.text || synergyTag, synergyHint?.detailText, synergyHint?.readinessText, affinityMeta?.tip || affinityTag].filter(Boolean).join(' · '))}" style="--skill-color:${color};border-color:${color};color:${color}"><i>${escapeHtml(s.icon || '✦')}</i><b>${escapeHtml(s.name)}${recommendedCombo?.index === i ? '<strong class="combo">荐</strong>' : ''}${synergyTag ? '<strong>共</strong>' : ''}${affinityTag ? `<strong class="affinity ${affinityType}">${escapeHtml(affinityMeta?.badge === '抗' ? '抗' : '克')}</strong>` : ''}</b><em>灵${escapeHtml(mpCost)} · ${escapeHtml(values.damage)}伤</em><small>${escapeHtml(reason || [comboPrimer?.label, synergyHint?.readinessText, affinityMeta?.tip || affinityTag].filter(Boolean).join(' · ') || `预计${values.damage}伤`)}</small><span>${escapeHtml([recommendedCombo?.index === i ? `荐：${recommendedCombo.label}` : '', comboPrimer?.label, synergyHint?.label || synergyShortTag || synergyTag, affinityMeta?.tip || affinityTag, summary].filter(Boolean).join(' · '))}</span></button>`;
    }).join('')}</div></div>` : '';
    p.innerHTML = `<div class="cbt-topline">
      <div class="cbt-enemy-block">
        <div class="cbt-enemy-name">${escapeHtml(pEnemyName)}</div>
        <div class="cbt-threat-line" title="${escapeHtml([enemyAffix?.note ? `词缀：${enemyAffix.note}` : '', enemySkillText !== '无' ? `技能：${enemySkillText}` : '', enemyAffinity?.text || ''].filter(Boolean).join(' · '))}">${enemyAffixHtml}${enemyAffinity?.weakText ? `<span class="weak">弱${escapeHtml(enemyAffinity.weakText)}</span>` : ''}${enemyAffinity?.resistText ? `<span class="resist">抗${escapeHtml(enemyAffinity.resistText)}</span>` : ''}${enemySkills.length ? `<span>技${escapeHtml(enemySkills.length)}</span>` : ''}${!enemyAffix && !enemyAffinity?.weakText && !enemyAffinity?.resistText && !enemySkills.length ? '<span>常规妖物</span>' : ''}</div>
      </div>
      <div class="cbt-turn ${isPlayerTurn ? 'player' : 'enemy'}">${isPlayerTurn ? '我方回合' : '敌方行动'}</div>
    </div>
    <div class="cbt-hp-bar-wrap enemy"><b>敌</b><div class="cbt-hp-bar-outer"><div class="cbt-hp-bar-inner" style="width:${Math.max(0, Math.min(100, eHpPct * 100))}%"></div></div><span class="cbt-hp-text">${escapeHtml(Number(currentEnemy.hp || 0))}/${escapeHtml(Number(currentEnemy.maxHp || 0))}</span></div>
    ${enemyIntentHtml}
    <div class="cbt-combat-grid">
      <section class="cbt-side enemy-side"><div class="cbt-side-label">妖</div><div class="cbt-status-row compact">${enemyStatusHtml || '<span class="cbt-status-empty">无状态</span>'}</div></section>
      <section class="cbt-side player-side"><div class="cbt-player-bars">
        <div class="cbt-mini-bar hp"><span>命</span><i><b style="width:${playerHpPct}%"></b></i><em>${escapeHtml(Number(player.hp || 0))}/${escapeHtml(Number(player.maxHp || 0))}</em></div>
        <div class="cbt-mini-bar mp"><span>灵</span><i><b style="width:${playerMpPct}%"></b></i><em>${escapeHtml(Number(player.mp || 0))}/${escapeHtml(Number(player.maxMp || 0))}</em></div>
      </div><div class="cbt-status-row compact player-status">${playerStatusHtml || '<span class="cbt-status-empty">无状态</span>'}</div></section>
    </div>
    ${combatBuildHtml}
    ${recommendedCombo ? `<div class="cbt-combo-guide"><b>荐</b><span>${escapeHtml(recommendedCombo.skill?.icon || '✦')}${escapeHtml(recommendedCombo.skill?.name || '技能')}：${escapeHtml(recommendedCombo.label)}</span></div>` : ''}
    ${combatSkills.some(s => typeof getSkillSynergyCombatHint === 'function' && getSkillSynergyCombatHint(s, currentEnemy)) ? `<div class="cbt-resonance-strip">${combatSkills.slice(0, 3).map(s => {
      const hint = typeof getSkillSynergyCombatHint === 'function' ? getSkillSynergyCombatHint(s, currentEnemy) : null;
      const primer = typeof getCombatSkillComboPrimer === 'function' ? getCombatSkillComboPrimer(s, currentEnemy, combatSkills) : null;
      const label = [primer?.label, hint?.readinessText || hint?.label].filter(Boolean).join(' · ');
      return hint ? `<span title="${escapeHtml([primer?.detail, hint.detailText].filter(Boolean).join(' · '))}">${escapeHtml(s.icon || '✦')}${escapeHtml(s.name)}：${escapeHtml(label || hint.label)}</span>` : '';
    }).filter(Boolean).join('')}</div>` : ''}
    <div class="cbt-log">${logsHtml || '<div class="cbt-log-entry tone-info"><span>战斗记录将在这里显示</span></div>'}</div>${skillsHtml}${drawerHtml}<div class="cbt-actions-row"><div class="cbt-act-btn${isPlayerTurn?'':' disabled'}" role="button" tabindex="0" aria-disabled="${isPlayerTurn ? 'false' : 'true'}" id="cbt-attack" style="--act-color:#ff6633">⚔️<b>攻击</b></div><div class="cbt-act-btn${isPlayerTurn?'':' disabled'}" role="button" tabindex="0" aria-disabled="${isPlayerTurn ? 'false' : 'true'}" id="cbt-defend" style="--act-color:#dd9944">🛡️<b>防御</b></div><div class="cbt-act-btn rec${recommendedCombo ? ' has-rec' : ''}${isPlayerTurn?'':' disabled'}" role="button" tabindex="0" aria-disabled="${isPlayerTurn ? 'false' : 'true'}" id="cbt-skill-toggle-action" title="${escapeHtml(recommendedActionTitle)}" style="--act-color:#d4a0ff">${escapeHtml(recommendedActionIcon)}<b>${escapeHtml(recommendedActionText)}</b>${recommendedCombo ? '<small>推荐</small>' : ''}</div><div class="cbt-act-btn${isPlayerTurn?'':' disabled'}" role="button" tabindex="0" aria-disabled="${isPlayerTurn ? 'false' : 'true'}" id="cbt-flee" style="--act-color:#66bbcc">🏃<b>逃跑</b></div></div>`;
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
         const activeStage = getActiveStage();
         if (activeStage) {
           const nextIdx = (player.stageProgress.currentRun.roomIndex || 0) + 1;
           player.stageProgress.currentRun.roomIndex = nextIdx;
           stageRoomIndex = nextIdx;
           if (nextIdx >= activeStage.roomCount) {
             if (typeof onStageComplete === 'function') onStageComplete();
             return;
           }
           generateNewFloor();
           const eventText = typeof applyStageRoomEvent === 'function' ? applyStageRoomEvent(activeStage, nextIdx) : '';
           showMessage(eventText || `进入${activeStage.name} · ${getStageRoomLabel(activeStage, nextIdx)}...`, activeStage.color || '#ff9944');
           autoSave({ delay: 8000 });
        } else {
          pushPanelToStack('stages');
          stageTab = 'stages';
           stageDetailOpen = false;
           stageSweepOpen = false;
           selectedStageChapterId = STAGES[selectedStageId]?.chapterId || selectedStageChapterId;
           showMessage('此地为副本入口，请选关深入。', '#d4a0ff');
           syncBodyPanelState();
           autoSave();
         }
       }
     }
   }
   function syncRunBodyClasses() {
    if (typeof document === 'undefined') return;
    const nextCombat = isInCombat();
    const nextStage = !!isInStageRun;
    const nextSecret = !!isInSecretRealm;
    if (runBodyClassCache.combat !== nextCombat) {
      document.body.classList.toggle('combat-active', nextCombat);
      runBodyClassCache.combat = nextCombat;
    }
    if (runBodyClassCache.stage !== nextStage) {
      document.body.classList.toggle('stage-run-active', nextStage);
      runBodyClassCache.stage = nextStage;
    }
    if (runBodyClassCache.secret !== nextSecret) {
      document.body.classList.toggle('secret-realm-run-active', nextSecret);
      runBodyClassCache.secret = nextSecret;
    }
  }
  function gameLoop() {
     gameTicks++;
     const hudTick = gameTicks % 4 === 0;
     updateParticles();
     handleInput();
     const inCombatNow = isInCombat();
     if (!inCombatNow) {
       const interactionTileKey = `${Math.floor(player.x)},${Math.floor(player.y)}`;
       const shouldCheckTileInteractions = interactionTileKey !== lastInteractionTileKey;
       if (shouldCheckTileInteractions) {
         checkCombatTrigger();
         if (!isInCombat()) checkMaterialPickup();
         if (!isInCombat()) checkTreasureChestPickup();
         if (!isInCombat()) checkStairs();
         lastInteractionTileKey = interactionTileKey;
       }
       if (!isInCombat() && !breakthroughQueue) checkBreakthrough();
     }
     updateCamera();
     tickMessages();
     syncRunBodyClasses();
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
    drawSecretRealmUI();
    drawTribulationUI();
    drawParticlesDom(camera);
    if (hudTick) {
      renderMessageLog();
      updateHUD(player, dungeonLevel);
    }
    ctx.restore();
  }

  function drawSecretRealmUI() {
    if (!showSecretRealmUI) return;
    // DOM panel handles rendering — synced in syncBodyPanelState()
    return;
  }
  function drawTribulationUI() {
    if (!showTribulationUI) return;
    return;
  }

  // ─── Secret Realm System ───
  let secretRealmSelectedId = null;
  let secretRealmSelectedDifficulty = 'normal';
  let secretRealmDelegatedTouchUntil = 0;
  let secretRealmResultPanel = null;

  function getSecretRealmKeyCount(keyId) {
    return Number(playerMaterials?.[keyId] || 0);
  }
  function getSecretRealmClearCount(realmId, difficulty = secretRealmSelectedDifficulty) {
    return Number(player?.secretRealmClears?.[realmId]?.[difficulty] || 0);
  }
  function getSecretRealmTotalClears(realmId) {
    return Object.values(player?.secretRealmClears?.[realmId] || {}).reduce((sum, n) => sum + Number(n || 0), 0);
  }
  function getSecretRealmPreviewSafe(realmId, difficulty = secretRealmSelectedDifficulty) {
    if (typeof getSecretRealmPreview === 'function') return getSecretRealmPreview(player, realmId, difficulty, playerMaterials);
    const realm = SECRET_REALMS?.[realmId];
    const check = realm ? hasSecretRealmEntry(player, realmId, difficulty, playerMaterials) : null;
    return realm ? { entry: check, rooms: realm.rooms, featured: realm.materialRewards?.join('、') || '奖励', danger: '', xp: 0, spiritStones: 0, materialLines: [] } : null;
  }
  function formatSecretRealmLastRun() {
    const r = player?.lastSecretRealmRun;
    if (!r) return '';
    const state = r.result === 'complete' ? '上次通关' : (r.result === 'defeat' ? '上次失败' : '上次逃离');
    return `${state}：${r.realmName || '秘境'} · ${r.difficultyName || ''}${r.rewardText ? ' · ' + r.rewardText : ''}`;
  }

  function formatSecretRealmRunRewards(run) {
    if (!run) return [];
    const lines = [];
    const totalXp = Number(run.totalXp ?? ((run.nodeXp || 0) + (run.clearXp || 0))) || 0;
    const totalStones = Number(run.totalStones ?? ((run.nodeStones || 0) + (run.clearStones || 0))) || 0;
    if (totalXp || totalStones) lines.push(`修为 ${totalXp} · 💎${totalStones}`);
    if (run.materialText) lines.push(run.materialText);
    if (Array.isArray(run.loot) && run.loot.length) {
      lines.push(`装备 ${run.loot.slice(0, 4).join('、')}${run.loot.length > 4 ? `等${run.loot.length}件` : ''}`);
    }
    if (run.skipped) lines.push(`背包满，跳过${run.skipped}件`);
    if (run.eventCount) lines.push(`触发事件 ${run.eventCount} 个`);
    if (run.isFirstClear) lines.push('首通奖励已领取');
    return lines.length ? lines : [run.rewardText || '未获得通关奖励'];
  }

  function renderSecretRealmResultPanel(p) {
    const r = secretRealmResultPanel || player?.lastSecretRealmRun;
    if (!r) return false;
    const isComplete = r.result === 'complete';
    const title = isComplete ? '秘境结算' : (r.result === 'defeat' ? '挑战失败' : '挑战中断');
    const rewardLines = formatSecretRealmRunRewards(r);
    p.innerHTML = `<div class="sr-result" style="--sr-color:${escapeHtml(r.color || '#d4a0ff')}">
      <div class="sr-result-head"><b>${isComplete ? '🏆' : '🏞️'} ${escapeHtml(title)}</b><span class="pclose">×</span></div>
      <div class="sr-result-card">
        <div class="sr-result-title"><span>${escapeHtml(r.realmName || '秘境')}</span><em>${escapeHtml(r.difficultyName || '')}</em></div>
        <div class="sr-result-sub">${isComplete ? `已结算 ${escapeHtml(r.nodes || r.nodeCount || 0)} 个节点${r.quick ? ' · 速挑完成' : ''}` : escapeHtml(r.rewardText || '本次未通关')}</div>
        <div class="sr-result-grid">
          <span><b>${escapeHtml(Number(r.totalXp ?? ((r.nodeXp || 0) + (r.clearXp || 0))) || 0)}</b><em>修为</em></span>
          <span><b>${escapeHtml(Number(r.totalStones ?? ((r.nodeStones || 0) + (r.clearStones || 0))) || 0)}</b><em>灵石</em></span>
          <span><b>${escapeHtml((r.materialCount || 0) + (Array.isArray(r.loot) ? r.loot.length : 0))}</b><em>物品</em></span>
        </div>
        <div class="sr-result-lines">${rewardLines.map(line => `<div>${escapeHtml(line)}</div>`).join('')}</div>
      </div>
      <div class="sr-result-actions">
        <button class="sr-result-more">继续刷取</button>
        <button class="sr-result-close sr-close">关闭</button>
      </div>
    </div>`;
    return true;
  }

  function closeSecretRealmPanel(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    secretRealmResultPanel = null;
    popPanelFromStack('secretRealm');
    const p = document.getElementById('secretrealm-dom-panel');
    if (p) p.style.display = 'none';
    clearTouchMovementState();
    syncBodyPanelState();
  }

  function ensureSecretRealmDomPanel() {
    let p = document.getElementById('secretrealm-dom-panel');
    if (p) return p;
    p = document.createElement('div'); p.id = 'secretrealm-dom-panel';
    const onCloseHit = e => {
      const closeTarget = e.target.closest('.pclose, .sr-close');
      if (!closeTarget) return;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      closeSecretRealmPanel(e);
    };
    const onSecretRealmAction = e => {
      const target = e.target.closest('[data-sr-diff], .sr-result-more, .sr-run-quick, .sr-run-exit');
      if (!target || target.disabled) return;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      if (e.type === 'touchstart' || e.type === 'pointerdown') secretRealmDelegatedTouchUntil = Date.now() + 650;
      if (e.type === 'click' && Date.now() < secretRealmDelegatedTouchUntil) return;
      const diffTarget = target.closest('[data-sr-diff]');
      if (diffTarget) {
        secretRealmSelectedDifficulty = diffTarget.dataset.srDiff;
        renderSecretRealmDomPanel();
        return;
      }
      if (target.matches('.sr-result-more')) { secretRealmResultPanel = null; renderSecretRealmDomPanel(); return; }
      if (target.matches('.sr-run-quick')) { if (typeof quickChallengeSecretRealm === 'function') quickChallengeSecretRealm(); return; }
      if (target.matches('.sr-run-exit')) { if (typeof onSecretRealmFlee === 'function') onSecretRealmFlee(); }
    };
    p.addEventListener('pointerdown', onCloseHit, { passive: false, capture: true });
    p.addEventListener('touchstart', onCloseHit, { passive: false, capture: true });
    p.addEventListener('click', onCloseHit, { capture: true });
    p.addEventListener('pointerdown', onSecretRealmAction, { passive: false });
    p.addEventListener('touchstart', onSecretRealmAction, { passive: false });
    p.addEventListener('click', onSecretRealmAction);
    document.body.appendChild(p);
    return p;
  }

  function renderSecretRealmDomPanel() {
    const p = ensureSecretRealmDomPanel();
    if (!showSecretRealmUI) { p.style.display = 'none'; return; }
    p.style.display = '';

    if (secretRealmResultPanel) {
      renderSecretRealmResultPanel(p);
      return;
    }

    // Safety: check SECRET_REALMS loaded
    if (typeof SECRET_REALMS === 'undefined' || !SECRET_REALMS) {
      p.innerHTML = `<div class="sr-head"><b>🏞️ 秘境</b><span class="pclose">×</span></div><div class="sr-body"><div class="sr-empty">秘境数据未加载，请刷新页面重试</div></div>`;
      return;
    }

    // If we have active progress, show the battle view
    if (isInSecretRealm) {
      // Combat panel will handle it; show a mini-progress overlay
      const realm = Object.values(SECRET_REALMS).find(r => r.id === (player?.secretRealmProgress?.realmId || ''));
      const realmName = realm?.name || '秘境';
      const canQuick = !isInCombat();
      p.innerHTML = `<div class="sr-progress">
        <div class="sr-progress-head"><b>🏞️ ${escapeHtml(realmName)}</b><span class="pclose">×</span></div>
        <div class="sr-progress-bar">节点 ${secretRealmNodeIndex + 1}/${secretRealmNodeCount}</div>
        <div class="sr-progress-actions">
          <button class="sr-run-quick" ${canQuick ? '' : 'disabled'}>⚡ 快速挑战</button>
          <button class="sr-run-exit">🚪 离开秘境</button>
        </div>
        <div class="sr-progress-hint">${canQuick ? '一键结算剩余节点；也可用右下角“速挑”' : '战斗中请先完成当前回合'}</div>
      </div>`;
      return;
    }

    if (!player) { p.innerHTML = '<div class="sr-head"><b>🏞️ 秘境</b><span class="pclose">×</span></div><div class="sr-empty">数据未加载</div>'; return; }

    const realmList = Object.values(SECRET_REALMS);
    const firstOpenRealm = realmList.find(r => (player.realmIndex || 0) >= r.unlockRealm);
    if ((!secretRealmSelectedId || !SECRET_REALMS[secretRealmSelectedId] || (player.realmIndex || 0) < (SECRET_REALMS[secretRealmSelectedId]?.unlockRealm || 0)) && firstOpenRealm) {
      secretRealmSelectedId = firstOpenRealm.id;
    }
    const selectedRealm = secretRealmSelectedId ? SECRET_REALMS[secretRealmSelectedId] : null;
    const selectedPreview = selectedRealm ? getSecretRealmPreviewSafe(selectedRealm.id, secretRealmSelectedDifficulty) : null;
    const selectedEntryCheck = selectedPreview?.entry || (selectedRealm ? hasSecretRealmEntry(player, selectedRealm.id, secretRealmSelectedDifficulty, playerMaterials) : null);
    const canEnterSelected = !!(selectedRealm && selectedEntryCheck?.ok);
    const hasAny = !!firstOpenRealm;
    const lastRunText = formatSecretRealmLastRun();

    let html = `<div class="sr-head">
      <b>🏞️ 秘境</b>
      <span class="sr-sub">短副本 · 材料定向刷取</span>
      <span class="pclose">×</span>
    </div>
    ${lastRunText ? `<div class="sr-last-run">${escapeHtml(lastRunText)}</div>` : ''}
    <div class="sr-layout">
      <div class="sr-body">`;

    for (const realm of realmList) {
      const locked = (player.realmIndex || 0) < realm.unlockRealm;
      const unlockRealmName = REALMS[realm.unlockRealm]?.name || '';
      const keyCount = getSecretRealmKeyCount(realm.keyId);
      const preview = getSecretRealmPreviewSafe(realm.id, secretRealmSelectedDifficulty);
      const clearCount = getSecretRealmClearCount(realm.id, secretRealmSelectedDifficulty);
      const totalClears = getSecretRealmTotalClears(realm.id);
      const selectedRealmId = !locked && secretRealmSelectedId === realm.id;
      html += `<div class="sr-card ${locked ? 'locked' : ''} ${selectedRealmId ? 'selected' : ''}" style="--sr-color:${escapeHtml(realm.color)}" data-sr-id="${escapeHtml(realm.id)}" data-sr-selected="${selectedRealmId ? 'true' : 'false'}">
        <div class="sr-card-icon">${locked ? '🔒' : realm.icon}</div>
        <div class="sr-card-main">
          <div class="sr-card-name"><span>${escapeHtml(realm.name)}</span><small>${escapeHtml(realm.rooms)}关</small></div>
          <div class="sr-card-desc">${escapeHtml(realm.desc)}</div>
          <div class="sr-card-meta">${locked ? `🔒 ${unlockRealmName}后开放` : `令牌 ${escapeHtml(keyCount)} · 本难度 ${clearCount} 次 · 总计 ${totalClears} 次`}</div>
          <div class="sr-card-drops">${escapeHtml(preview?.featured || realm.tip || '材料奖励')}</div>
        </div>
        <div class="sr-card-check">${locked ? '未开' : (selectedRealmId ? '已选' : '选择')}</div>
      </div>`;
    }

    const enterLabel = !hasAny
      ? '暂无可用秘境'
      : !selectedRealm
        ? '请先选择秘境'
        : canEnterSelected
          ? `进入${selectedRealm.name}`
          : (selectedEntryCheck?.reason || '无法进入');
    const quickEnterLabel = !hasAny
      ? '暂无可速挑秘境'
      : !selectedRealm
        ? '请先选择秘境'
        : canEnterSelected
          ? `速挑${selectedRealm.name}`
          : (selectedEntryCheck?.reason || '无法速挑');
    const selectedCostHint = selectedRealm
      ? (selectedEntryCheck?.ok
        ? `消耗：${selectedEntryCheck.costText || '无'}`
        : (selectedEntryCheck?.hint || selectedEntryCheck?.reason || '条件不足'))
      : '普通可用灵石进入；困难/炼狱需要对应秘境令';
    const previewMaterials = selectedPreview?.materialLines?.length ? selectedPreview.materialLines.join(' · ') : (selectedPreview?.featured || '经验、灵石');
    const selectedClearCount = selectedRealm ? getSecretRealmClearCount(selectedRealm.id, secretRealmSelectedDifficulty) : 0;

    html += `</div>
      <aside class="sr-preview" style="--sr-color:${escapeHtml(selectedRealm?.color || '#d4a0ff')}">
        ${selectedRealm ? `<div class="sr-preview-title"><span>${selectedRealm.icon}</span><b>${escapeHtml(selectedRealm.name)}</b><em>${escapeHtml(selectedPreview?.difficultyName || '')}</em></div>
        <p>${escapeHtml(selectedRealm.flavor || selectedRealm.desc || '')}</p>
        <div class="sr-preview-stats">
          <span><b>${escapeHtml(selectedPreview?.rooms || selectedRealm.rooms)}</b><em>节点</em></span>
          <span><b>${escapeHtml(selectedClearCount)}</b><em>本难度</em></span>
          <span><b>${escapeHtml(`×${Number(selectedPreview?.rewardMult || 1).toFixed(1)}`)}</b><em>奖励</em></span>
        </div>
        <div class="sr-preview-line"><b>风险</b><span>${escapeHtml(selectedPreview?.danger || '随境界缩放')}</span></div>
        <div class="sr-preview-line"><b>奖励</b><span>${escapeHtml(`${selectedPreview?.xp || 0}经验 · 💎${selectedPreview?.spiritStones || 0} · ${previewMaterials}`)}</span></div>
        <div class="sr-preview-line"><b>提示</b><span>${escapeHtml(selectedRealm.tip || '首通会提高材料数量。')}</span></div>` : `<div class="sr-empty">提升境界后开放秘境</div>`}
      </aside>
    </div>
    <div class="sr-foot">
      <div class="sr-diff-select">
        <span>难度:</span>
        ${Object.entries(SECRET_REALM_DIFFICULTIES).map(([key, d]) =>
          `<button class="sr-diff-btn${key === secretRealmSelectedDifficulty ? ' active' : ''}" data-sr-diff="${escapeHtml(key)}">${escapeHtml(d.name)}</button>`
        ).join('')}
      </div>
      <div class="sr-enter-wrap">
        <div class="sr-cost-hint">${escapeHtml(selectedCostHint)}</div>
        <div class="sr-enter-actions">
          <button class="sr-enter-btn ${canEnterSelected ? '' : 'disabled'}" ${canEnterSelected ? '' : 'disabled'}>${escapeHtml(enterLabel)}</button>
          <button class="sr-quick-enter-btn ${canEnterSelected ? '' : 'disabled'}" ${canEnterSelected ? '' : 'disabled'}>${escapeHtml(quickEnterLabel)}</button>
        </div>
      </div>
    </div>`;

    p.innerHTML = html;

    function selectSecretRealm(realmId) {
      if (!realmId || !SECRET_REALMS[realmId]) return;
      secretRealmSelectedId = realmId;
      renderSecretRealmDomPanel();
    }

    // Bind card clicks: select first, then footer button enters. Use move-threshold tap so swiping the list is not hijacked.
    p.querySelectorAll('.sr-card:not(.locked)').forEach(card => {
      bindPanelTap(card, () => selectSecretRealm(card.dataset.srId));
    });

    const enterBtn = p.querySelector('.sr-enter-btn');
    if (enterBtn) {
      bindPanelTap(enterBtn, () => {
        if (!secretRealmSelectedId || enterBtn.disabled) return;
        enterSecretRealm(secretRealmSelectedId, secretRealmSelectedDifficulty);
      });
    }
    const quickEnterBtn = p.querySelector('.sr-quick-enter-btn');
    if (quickEnterBtn) {
      bindPanelTap(quickEnterBtn, () => {
        if (!secretRealmSelectedId || quickEnterBtn.disabled) return;
        enterSecretRealm(secretRealmSelectedId, secretRealmSelectedDifficulty, true);
      });
    }

    // Close is handled by the creation-level capture fallback in ensureSecretRealmDomPanel().
  }

  function enterSecretRealm(realmId, difficulty, quickMode = false) {
    if (isInCombat() || isInSecretRealm) return;
    const realm = SECRET_REALMS[realmId];
    if (!realm) { showMessage('未知秘境', '#ff4444'); return; }
    // Check entry
    const check = hasSecretRealmEntry(player, realmId, difficulty, playerMaterials);
    if (!check.ok) {
      showMessage(check.reason || '无法进入', '#ff8844');
      return;
    }
    // Pay cost
    if (!paySecretRealmEntry(player, realmId, difficulty, playerMaterials)) {
      showMessage('消耗品不足', '#ff4444');
      return;
    }
    // Start secret realm
    const nodeCount = realm.rooms;
    isInSecretRealm = true;
    secretRealmNodeIndex = 0;
    secretRealmNodeCount = nodeCount;
    player.secretRealmProgress = { realmId, difficulty, nodeCount, nodeSummary: createSecretRealmNodeSummary(), quickMode: !!quickMode };

    // Save real dungeon so we can restore after realm ends
    if (dungeon) {
      window._savedDungeonBeforeSecretRealm = dungeon;
      window._savedDungeonLevelBeforeSecretRealm = dungeonLevel;
    }

    // Close selector for normal runs. Quick mode settles synchronously and renders the final result once;
    // rendering an intermediate “结算中” state still produces a visible one-frame flash on mobile.
    if (quickMode) {
      const srp = document.getElementById('secretrealm-dom-panel');
      if (srp) srp.style.display = '';
      clearTouchMovementState();
      if (typeof quickChallengeSecretRealm === 'function') quickChallengeSecretRealm();
      return;
    }

    // Hide panel during combat (keep in stack — callbacks will re-render)
    const srp = document.getElementById('secretrealm-dom-panel');
    if (srp) srp.style.display = 'none';
    clearTouchMovementState();
    syncBodyPanelState();

    // Start first node for normal challenge.
    setTimeout(() => {
      advanceSecretRealmNode();
    }, 300);
  }

  function buildSecretRealmEnemy(realm, difficulty, nodeIndex, nodeCount) {
    const diff = SECRET_REALM_DIFFICULTIES[difficulty] || SECRET_REALM_DIFFICULTIES.normal;
    const isBoss = nodeIndex >= nodeCount - 1;
    const level = Math.max(1, (player.realmIndex || 0) * 3 + nodeIndex * 2 + 1);
    const pool = (typeof BIOMES !== 'undefined' && BIOMES[0]?.monsters) ? BIOMES[0].monsters : MONSTERS;
    const template = pool[Math.floor(Math.random() * pool.length)] || {};
    const enemy = {
      name: isBoss ? `${realm.name}守护者` : `${realm.name}妖物`,
      title: isBoss ? `${realm.name}守护者` : `${realm.name}妖物`,
      symbol: isBoss ? '首' : '妖',
      hp: Math.floor((template.hp || 30) * diff.mult.hp * (isBoss ? 1.8 : 1) * (1 + level * 0.15)),
      atk: Math.floor((template.atk || 8) * diff.mult.atk * (isBoss ? 1.35 : 1) * (1 + level * 0.12)),
      def: Math.floor((template.def || 2) * diff.mult.def * (isBoss ? 1.25 : 1) * (1 + level * 0.10)),
      xp: Math.floor((template.xp || 20) * diff.mult.reward * (isBoss ? 3 : 1.5)),
      stones: Math.floor((template.stones || 5) * diff.mult.reward * (isBoss ? 3 : 1.5)),
      maxHp: 0,
      isBoss,
      isElite: isBoss,
      color: realm.color || '#c05060',
      skillIds: [ ...(realm.monsterPool || []) ],
    };
    if (isBoss) {
      enemy.skillIds.push('bossEnrage');
      if (realm.bossSkillExtra) enemy.skillIds.push(...realm.bossSkillExtra);
    }
    enemy.maxHp = enemy.hp;
    return enemy;
  }

  function applySecretRealmEventForNode(realm, nodeIndex, options = {}) {
    const isBoss = nodeIndex >= secretRealmNodeCount - 1;
    if (isBoss || typeof generateSecretRealmRoomEvents !== 'function') return '';
    const event = generateSecretRealmRoomEvents(realm.id);
    if (!event || typeof event.apply !== 'function') return '';
    const result = event.apply(player) || {};
    if (typeof player.recalcStats === 'function') player.recalcStats();
    const text = `${event.icon || '✦'} ${event.name}：${result.msg || event.desc || '秘境异动'}`;
    if (!options.silent) showMessage(text, realm.color || '#d4a0ff');
    return text;
  }

  function createSecretRealmNodeSummary() {
    return { nodes: 0, boss: 0, xp: 0, stones: 0, loot: [], skipped: 0, events: [] };
  }
  window.createSecretRealmNodeSummary = createSecretRealmNodeSummary;

  function grantSecretRealmNodeRewards(enemy, summary = null) {
    const xpReward = Math.ceil((enemy.xp || 20) * 1.35);
    const stonesReward = Math.ceil((enemy.stones || 5) * 1.45);
    player.gainXp(xpReward);
    player.addSpiritStones(stonesReward);
    if (summary) {
      summary.xp += xpReward;
      summary.stones += stonesReward;
      summary.nodes += 1;
      if (enemy.isBoss) summary.boss += 1;
    }
    const loot = generateLootDrop(dungeonLevel, enemy);
    if (loot) {
      const maxInv = typeof getInventoryCapacity === 'function' ? getInventoryCapacity(player) : 36;
      if (player.inventory.length < maxInv) {
        player.inventory.push(loot);
        if (summary) summary.loot.push(loot.name || '装备');
        if (typeof invalidateInventoryListCacheDom === 'function') invalidateInventoryListCacheDom();
      } else if (summary) {
        summary.skipped += 1;
      }
    }
  }
  window.grantSecretRealmNodeRewards = grantSecretRealmNodeRewards;

  // Expose to combat.js
  window.advanceSecretRealmNode = function advanceSecretRealmNode() {
    if (!isInSecretRealm) return;
    const progress = player?.secretRealmProgress;
    if (!progress) { isInSecretRealm = false; return; }
    const realm = SECRET_REALMS[progress.realmId];
    if (!realm) { isInSecretRealm = false; return; }
    const difficulty = progress.difficulty || 'normal';
    const isBoss = secretRealmNodeIndex >= secretRealmNodeCount - 1;

    applySecretRealmEventForNode(realm, secretRealmNodeIndex);
    const enemy = buildSecretRealmEnemy(realm, difficulty, secretRealmNodeIndex, secretRealmNodeCount);

    // Save real dungeon before overwriting with combat placeholder
    if (!window._savedDungeonBeforeSecretRealm && dungeon) {
      window._savedDungeonBeforeSecretRealm = dungeon;
      window._savedDungeonLevelBeforeSecretRealm = dungeonLevel;
    }
    const combatPlaceholder = { _monsters: new Map(), grid: [[1]], width: 1, height: 1, rooms: [], roomTypeByCell: new Map(), biome: null };
    dungeon = combatPlaceholder;

    startCombat(enemy);

    const nodeLabel = isBoss ? '🏆 Boss战' : `⚔️ 第${secretRealmNodeIndex + 1}/${secretRealmNodeCount}关`;
    showMessage(`🏞️ ${realm.name} · ${nodeLabel}`, realm.color);
  };

  window.quickChallengeSecretRealm = function quickChallengeSecretRealm() {
    if (!isInSecretRealm || isInCombat()) return;
    const progress = player?.secretRealmProgress;
    if (!progress) { isInSecretRealm = false; syncBodyPanelState(); return; }
    const realm = SECRET_REALMS?.[progress.realmId];
    if (!realm) { isInSecretRealm = false; syncBodyPanelState(); return; }
    const difficulty = progress.difficulty || 'normal';
    const nodeCount = Number(secretRealmNodeCount || progress.nodeCount || realm.rooms || 1);
    const startNode = Math.max(0, Number(secretRealmNodeIndex || 0));
    const summary = progress.nodeSummary || createSecretRealmNodeSummary();
    progress.nodeSummary = summary;
    progress.quickMode = true;
    for (let idx = startNode; idx < nodeCount; idx++) {
      const eventText = applySecretRealmEventForNode(realm, idx, { silent: true });
      if (eventText) summary.events.push(eventText.split('：')[0]);
      const enemy = buildSecretRealmEnemy(realm, difficulty, idx, nodeCount);
      grantSecretRealmNodeRewards(enemy, summary);
    }
    secretRealmNodeIndex = nodeCount;
    currentEnemy = null;
    combatState = COMBAT_STATE.IDLE;
    combatLogBuffer = [];
    if (typeof document !== 'undefined') document.body.classList.remove('combat-active');
    resetTemporaryCombatBuffs();
    const lootText = summary.loot.length ? ` · 🎁${summary.loot.slice(0, 3).join('、')}${summary.loot.length > 3 ? '等' + summary.loot.length + '件' : ''}` : '';
    const eventText = summary.events.length ? ` · 事件${summary.events.length}个` : '';
    const fullText = summary.skipped ? ` · 背包满，跳过${summary.skipped}件` : '';
    if (!showSecretRealmUI) showMessage(`⚡ 快速挑战 ${realm.name}：结算${summary.nodes}关，${summary.xp}经验，💎${summary.stones}${lootText}${eventText}${fullText}`, realm.color || '#d4a0ff');
    isInSecretRealm = false;
    if (typeof onSecretRealmComplete === 'function') onSecretRealmComplete();
  };

  window.onSecretRealmComplete = function onSecretRealmComplete() {
    const progress = player?.secretRealmProgress;
    if (!progress) return;
    const realm = SECRET_REALMS[progress.realmId];
    const difficulty = progress.difficulty || 'normal';
    const diffName = SECRET_REALM_DIFFICULTIES[difficulty]?.name || difficulty;
    const isFirstClear = !player.secretRealmClears?.[realm.id]?.[difficulty];

    // Record clear
    if (!player.secretRealmClears) player.secretRealmClears = {};
    if (!player.secretRealmClears[realm.id]) player.secretRealmClears[realm.id] = {};
    player.secretRealmClears[realm.id][difficulty] = (player.secretRealmClears[realm.id][difficulty] || 0) + 1;

    // Bonus rewards
    const rewards = getSecretRealmRewards(player, realm.id, difficulty, isFirstClear);
    let msg = `🏞️ ${realm.name} 通关！获得 ${rewards.xp} 经验，💎 ${rewards.spiritStones} 灵石`;
    for (const mat of rewards.materials) {
      playerMaterials[mat.id] = (playerMaterials[mat.id] || 0) + mat.count;
      const matName = typeof getSecretRealmMaterialName === 'function' ? getSecretRealmMaterialName(mat.id) : (MATERIALS?.find(m => m.id === mat.id)?.name || mat.id);
      msg += ` | 🔹 ${matName}x${mat.count}`;
    }
    if (isFirstClear) msg += ' | 🏆 首通奖励！';
    const rewardText = msg.replace(/^🏞️ .*? 通关！获得\s*/, '');
    const nodeSummary = progress.nodeSummary || createSecretRealmNodeSummary();
    const materialText = rewards.materials.map(mat => {
      const matName = typeof getSecretRealmMaterialName === 'function' ? getSecretRealmMaterialName(mat.id) : (MATERIALS?.find(m => m.id === mat.id)?.name || mat.id);
      return `${matName}x${mat.count}`;
    }).join('、');
    const runSummary = {
      result: 'complete',
      realmId: realm.id,
      realmName: realm.name,
      difficulty,
      difficultyName: diffName,
      color: realm.color || '#d4a0ff',
      rewardText,
      nodes: nodeSummary.nodes || progress.nodeCount || secretRealmNodeCount || realm.rooms,
      nodeXp: nodeSummary.xp || 0,
      nodeStones: nodeSummary.stones || 0,
      clearXp: rewards.xp || 0,
      clearStones: rewards.spiritStones || 0,
      totalXp: (nodeSummary.xp || 0) + (rewards.xp || 0),
      totalStones: (nodeSummary.stones || 0) + (rewards.spiritStones || 0),
      loot: Array.isArray(nodeSummary.loot) ? [...nodeSummary.loot] : [],
      skipped: nodeSummary.skipped || 0,
      eventCount: Array.isArray(nodeSummary.events) ? nodeSummary.events.length : 0,
      materialText,
      materialCount: rewards.materials.reduce((sum, mat) => sum + (mat.count || 0), 0),
      isFirstClear,
      quick: !!progress.quickMode,
      at: Date.now(),
    };
    player.lastSecretRealmRun = runSummary;
    secretRealmResultPanel = runSummary;
    player.gainXp(rewards.xp);
    player.addSpiritStones(rewards.spiritStones);
    player.secretRealmProgress = null;
    player._secretRealmBuff = null;
    player._secretRealmDebuffs = null;
    isInSecretRealm = false;
    secretRealmNodeIndex = 0;
    secretRealmNodeCount = 0;
    resetTemporaryCombatBuffs();

    // Restore real dungeon
    if (window._savedDungeonBeforeSecretRealm) {
      dungeon = window._savedDungeonBeforeSecretRealm;
      dungeonLevel = window._savedDungeonLevelBeforeSecretRealm || dungeonLevel;
      window._savedDungeonBeforeSecretRealm = null;
      window._savedDungeonLevelBeforeSecretRealm = null;
    }

    showMessage(msg, '#ffdd55');
    // secret realm panel stays in stack — just re-sync
    syncBodyPanelState();
    autoSave();
  };

  window.onSecretRealmDefeat = function onSecretRealmDefeat() {
    // Secret realm failed — no completion rewards
    const progress = player?.secretRealmProgress;
    const realm = progress ? SECRET_REALMS?.[progress.realmId] : null;
    const difficulty = progress?.difficulty || 'normal';
    player.lastSecretRealmRun = {
      result: 'defeat',
      realmId: realm?.id || progress?.realmId || '',
      realmName: realm?.name || '秘境',
      difficulty,
      difficultyName: SECRET_REALM_DIFFICULTIES?.[difficulty]?.name || difficulty,
      rewardText: '未获得通关奖励',
      at: Date.now(),
    };
    player.secretRealmProgress = null;
    player._secretRealmBuff = null;
    player._secretRealmDebuffs = null;
    isInSecretRealm = false;
    secretRealmNodeIndex = 0;
    secretRealmNodeCount = 0;
    resetTemporaryCombatBuffs();

    // Restore HP to at least 30% so player isn't stuck at 0 HP
    if (player.hp <= 0 || player.hp < Math.floor(player.maxHp * 0.3)) {
      player.hp = Math.floor(player.maxHp * 0.3);
    }

    // Restore real dungeon
    if (window._savedDungeonBeforeSecretRealm) {
      dungeon = window._savedDungeonBeforeSecretRealm;
      dungeonLevel = window._savedDungeonLevelBeforeSecretRealm || dungeonLevel;
      window._savedDungeonBeforeSecretRealm = null;
      window._savedDungeonLevelBeforeSecretRealm = null;
    }

    showMessage('🏞️ 秘境挑战失败，失去进入消耗但修为尚在。', '#ffdd44');
    // secret realm panel stays in stack — just re-sync
    syncBodyPanelState();
    autoSave();
  };

  window.onSecretRealmFlee = function onSecretRealmFlee() {
    // Escaped from secret realm combat — end the run, no rewards
    const progress = player?.secretRealmProgress;
    const realm = progress ? SECRET_REALMS?.[progress.realmId] : null;
    const difficulty = progress?.difficulty || 'normal';
    player.lastSecretRealmRun = {
      result: 'flee',
      realmId: realm?.id || progress?.realmId || '',
      realmName: realm?.name || '秘境',
      difficulty,
      difficultyName: SECRET_REALM_DIFFICULTIES?.[difficulty]?.name || difficulty,
      rewardText: '挑战中断',
      at: Date.now(),
    };
    player.secretRealmProgress = null;
    player._secretRealmBuff = null;
    player._secretRealmDebuffs = null;
    isInSecretRealm = false;
    secretRealmNodeIndex = 0;
    secretRealmNodeCount = 0;
    resetTemporaryCombatBuffs();

    // Restore real dungeon
    if (window._savedDungeonBeforeSecretRealm) {
      dungeon = window._savedDungeonBeforeSecretRealm;
      dungeonLevel = window._savedDungeonLevelBeforeSecretRealm || dungeonLevel;
      window._savedDungeonBeforeSecretRealm = null;
      window._savedDungeonLevelBeforeSecretRealm = null;
    }

    showMessage('🏃 逃离秘境，挑战中断。', '#88ccff');
    // secret realm panel stays in stack — just re-sync
    syncBodyPanelState();
    autoSave();
  };


  // ─── Stage Dungeon System ───
  function closeStagePanel(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (isInStageRun) { onStageFlee(); return; }
    popPanelFromStack('stages');
    showStageClearPanel = false;
    lastStageClearSummary = null;
    clearTouchMovementState();
    const sp = typeof document !== 'undefined' ? document.getElementById('stage-dom-panel') : null;
    if (sp) sp.style.display = 'none';
    syncBodyPanelState();
    if (!isInStageRun && typeof generateHomeMap === 'function') generateHomeMap();
  }
  function ensureStageDomPanel() {
    let p = document.getElementById('stage-dom-panel');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'stage-dom-panel';
    const onCloseHit = e => {
      const closeTarget = e.target.closest('.pclose, [data-stage-close]');
      if (!closeTarget) return;
      // Close on the earliest real pointer/touch event so mobile users are not trapped
      // if a later synthetic click is swallowed by panel tap suppression.
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      closeStagePanel(e);
    };
    p.addEventListener('pointerdown', onCloseHit, { passive: false, capture: true });
    p.addEventListener('touchstart', onCloseHit, { passive: false, capture: true });
    p.addEventListener('click', onCloseHit, { capture: true });
    document.body.appendChild(p);
    return p;
  }
  function addStageEquipmentReward(eq = {}) {
    if (Math.random() > Number(eq.chance ?? 1)) return null;
    const maxInv = typeof getInventoryCapacity === 'function' ? getInventoryCapacity(player) : 36;
    if (player.inventory.length >= maxInv) return { full: true };
    const slot = eq.slot || (typeof SLOTS !== 'undefined' ? SLOTS[Math.floor(Math.random() * SLOTS.length)] : null);
    const item = generateEquipment(Math.max(1, Number(eq.level || eq.floorLevel || dungeonLevel || 1)), { setId: eq.setId, rarityName: eq.rarity, slot });
    if (!item) return null;
    player.inventory.push(item);
    invalidateInventoryListCacheDom();
    return item;
  }
  function applyConfiguredRewards(rewards = {}) {
    const gained = { items: [], full: false };
    if (rewards.xp) player.gainXp(Number(rewards.xp) || 0);
    if (rewards.spiritStones) player.addSpiritStones(Number(rewards.spiritStones) || 0);
    (rewards.materials || []).forEach(mat => {
      if (!mat?.id) return;
      playerMaterials[mat.id] = (playerMaterials[mat.id] || 0) + (Number(mat.count) || 1);
    });
    (rewards.equipment || []).forEach(eq => {
      const got = addStageEquipmentReward(eq);
      if (got?.full) gained.full = true;
      else if (got) gained.items.push(got);
    });
    return gained;
  }
  function formatConfiguredRewards(rewards = {}) {
    const parts = [];
    if (rewards.xp) parts.push(`${rewards.xp}经验`);
    if (rewards.spiritStones) parts.push(`💎${rewards.spiritStones}`);
    (rewards.materials || []).forEach(mat => parts.push(`${getStageMaterialName(mat.id)}x${mat.count || 1}`));
    (rewards.equipment || []).forEach(eq => {
      const set = typeof getEquipmentSet === 'function' ? getEquipmentSet(eq.setId) : null;
      const chance = eq.chance >= 1 ? '必得' : `${Math.round((eq.chance || 0) * 100)}%`;
      parts.push(`${chance}${set ? (set.icon || '') + set.name + '套' : '套装'}${eq.rarity ? `·${eq.rarity}` : ''}`);
    });
    return parts.join(' · ') || '装备掉落';
  }
  function getImmortalStageBossMechanic(stage) {
    if (!stage?.boss || typeof getImmortalBossMechanic !== 'function') return null;
    return getImmortalBossMechanic(stage.boss?.mechanicId || stage.id);
  }
  function formatImmortalBossTriggerText(trigger) {
    if (!trigger) return '触发未知';
    const effect = trigger.effect || {};
    const effectParts = [];
    if (effect.damagePct) effectParts.push(`伤害${Math.round(effect.damagePct * 100)}%`);
    if (effect.drainPct) effectParts.push(`汲取${Math.round(effect.drainPct * 100)}%`);
    if (effect.shieldPct) effectParts.push(`护盾${Math.round(effect.shieldPct * 100)}%`);
    if (effect.atkBuff) effectParts.push(`攻击+${Math.round(effect.atkBuff * 100)}%`);
    if (effect.defBuff) effectParts.push(`防御+${Math.round(effect.defBuff * 100)}%`);
    if (effect.status) effectParts.push(`状态:${effect.status}`);
    const effectText = effectParts.join('、') || '特殊压制';
    if (trigger.type === 'turnInterval') return `每${trigger.every || '?'}回合 · ${effectText}`;
    if (trigger.type === 'hpBelow') return `血量低于${Math.round((trigger.threshold || 0) * 100)}% · ${effectText}`;
    return `${trigger.type || '机制'} · ${effectText}`;
  }
  function renderImmortalBossMechanicCard(stage) {
    const mechanic = getImmortalStageBossMechanic(stage);
    if (!mechanic) return '';
    const triggerHtml = (mechanic.triggers || []).map(t => `<li>${escapeHtml(formatImmortalBossTriggerText(t))}</li>`).join('');
    return `<div class="stage-immortal-mechanic-card"><strong>${escapeHtml(mechanic.icon || '🌌')} 仙界机制：${escapeHtml(mechanic.name)}</strong><ul>${triggerHtml}</ul><small>进入战斗后按回合/血量阈值自动触发，已接入真实 Boss 机制。</small></div>`;
  }
  function renderStageMaterialSourcePanel(stage) {
    const ids = [];
    for (const bucket of [stage?.firstClearRewards, stage?.clearRewards]) {
      for (const mat of (bucket?.materials || [])) if (mat.id && !ids.includes(mat.id)) ids.push(mat.id);
    }
    if (!ids.length) return '';
    const rows = ids.slice(0, 6).map(id => {
      const sources = getStageMaterialSources(id).slice(0, 4);
      const buttons = sources.map(source => `<button type="button" data-stage-material-source="${escapeHtml(source.stageId)}"><span>${escapeHtml(source.chapterName)} · ${escapeHtml(source.stageName)}</span><em>战力${escapeHtml(source.recommendedPower || 0)}</em></button>`).join('');
      const stageMaterialSourceHint = getStageMaterialSourceText(id, 2);
      return `<span class="stage-material-source"><b>${escapeHtml(getStageMaterialName(id))}</b><em>${escapeHtml(stageMaterialSourceHint)}</em>${buttons ? `<i>${buttons}</i>` : ''}</span>`;
    }).join('');
    return `<section class="stage-material-source-panel"><h4>材料来源</h4><div>${rows}</div></section>`;
  }
  function getStageCodexDom() {
    if (typeof getStageCodexSummary !== 'function') return '';
    const codex = getStageCodexSummary(player);
    const progress = normalizeStageProgress(player?.stageProgress);
    const next = STAGES?.[codex.nextStageId];
    const nextChapter = next ? STAGE_CHAPTERS?.[next.chapterId] : null;
    const recSweep = getRecommendedSweepStage(player);
    const claimChapter = (codex.chapters || []).find(ch => ch.claimable);
    const nextStars = next ? Number(progress.stageStars?.[next.id] || 0) : 0;
    const nextText = next ? `${next.icon || ''}${next.name}` : '暂无';
    const nextReward = next ? formatConfiguredRewards(progress.clearedStages?.[next.id] ? next.clearRewards : next.firstClearRewards) : '所有已解锁副本已查看';
    const guideCards = [
      next ? `<button class="codex-guide-card primary" type="button" data-codex-stage="${escapeHtml(next.id)}" style="--stage-color:${escapeHtml(nextChapter?.color || next.color || '#d4a0ff')}"><b>下一步挑战</b><strong>${escapeHtml(nextText)}</strong><small>${escapeHtml(nextChapter?.name || '副本')} · ${escapeHtml(REALMS?.[next.recommendedRealm]?.name || '练气期')} · 战力${escapeHtml(next.recommendedPower)}</small><em>奖励：${escapeHtml(nextReward)}</em></button>` : '',
      claimChapter ? `<button class="codex-guide-card claim" type="button" data-codex-chapter="${escapeHtml(claimChapter.id)}" style="--stage-color:${escapeHtml(claimChapter.color || '#ffdf8a')}"><b>可领取章节奖</b><strong>${escapeHtml(claimChapter.icon || '')} ${escapeHtml(claimChapter.name)}</strong><small>${escapeHtml(claimChapter.stars)}/${escapeHtml(claimChapter.maxStars)}★ · 已全通</small><em>点此跳到章节领奖</em></button>` : '',
      recSweep ? `<button class="codex-guide-card sweep" type="button" data-codex-stage="${escapeHtml(recSweep.id)}" data-codex-open-sweep="1" style="--stage-color:${escapeHtml((STAGE_CHAPTERS?.[recSweep.chapterId]?.color) || recSweep.color || '#d4a0ff')}"><b>推荐扫荡</b><strong>${escapeHtml(recSweep.icon || '')}${escapeHtml(recSweep.name)}</strong><small>已三星 · 每次💎${escapeHtml(getStageSweepCost(recSweep, 1))}</small><em>${escapeHtml(getStageSetDropText(recSweep) || getStageDropText(recSweep))}</em></button>` : ''
    ].filter(Boolean).join('') || `<div class="codex-guide-empty">暂无推荐事项，继续推进已解锁副本。</div>`;
    const chapterRows = (codex.chapters || []).map(ch => {
      const pct = ch.maxStars ? Math.round((ch.stars / ch.maxStars) * 100) : 0;
      const status = ch.claimable ? '🔔可领奖' : (ch.bonusClaimed ? '已领奖' : `${ch.cleared}/${ch.total}`);
      const title = ch.title ? `称号：${ch.title.name}` : '称号：未配置';
      const theme = ch.theme ? `${ch.theme.icon || ''}${ch.theme.name}` : '默认地图';
      return `<button class="stage-codex-row ${ch.claimable ? 'claimable' : ''}" type="button" data-codex-chapter="${escapeHtml(ch.id)}" style="--stage-color:${escapeHtml(ch.color || '#d4a0ff')}"><b>${escapeHtml(ch.icon || '')} ${escapeHtml(ch.name)}</b><span>${escapeHtml(status)}</span><small>${escapeHtml(ch.stars)}/${escapeHtml(ch.maxStars)}★ · ${escapeHtml(theme)} · ${escapeHtml(title)}</small><i style="width:${pct}%"></i></button>`;
    }).join('');
    const nextStarText = next ? getStageStarText(progress.stageStars?.[next.id] || 0) : '';
    return `<section class="stage-codex"><div class="codex-head"><b>📖 副本图鉴</b><small>推荐下一关：${escapeHtml(nextText)} ${nextStarText}</small></div><div class="codex-guide-grid">${guideCards}</div><div class="codex-stats"><span><b>${codex.clearedStages}/${codex.totalStages}</b><em>关卡</em></span><span><b>${codex.earnedStars}/${codex.totalStars}</b><em>星级</em></span><span><b>${codex.claimable}</b><em>可领奖</em></span><span><b>${codex.sweepable}</b><em>可扫荡</em></span></div><div class="stage-codex-list">${chapterRows}</div></section>`;
  }
  function renderStageDomPanel() {
    const p = ensureStageDomPanel();
    if (!showStageSelectUI && !showStageClearPanel) { p.style.display = 'none'; return; }
    p.style.display = '';
    const prevChapterScrollLeft = p.querySelector('.stage-chapter-strip')?.scrollLeft || 0;
    player.stageProgress = normalizeStageProgress(player.stageProgress);
    const stageStarText = stageId => getStageStarText(player.stageProgress.stageStars?.[stageId] || 0);
    if (showStageClearPanel && lastStageClearSummary) {
      const s = lastStageClearSummary;
      p.innerHTML = `<div class="stage-clear"><button class="pclose" type="button" data-stage-close="1" aria-label="关闭副本界面">×</button><div class="stage-clear-icon">${s.success ? '🏆' : '💀'}</div><b>${escapeHtml(s.title)}</b><p>${escapeHtml(s.desc)}</p><div class="stage-reward-line">${escapeHtml(s.rewards || '')}</div><div class="stage-clear-actions"><button class="stage-detail-btn" type="button" data-stage-close="1">关闭</button><button class="stage-enter-btn" type="button" data-stage-back="1">返回副本</button></div></div>`;
    } else {
      const selected = STAGES[selectedStageId] || STAGES[player.stageProgress.selectedStageId] || STAGES[FIRST_STAGE_ID];
      selectedStageId = selected.id;
      if (!selectedStageChapterId || !STAGE_CHAPTERS[selectedStageChapterId]) selectedStageChapterId = selected.chapterId || Object.keys(STAGE_CHAPTERS)[0];
      const selectedChapter = STAGE_CHAPTERS[selectedStageChapterId] || STAGE_CHAPTERS[selected.chapterId] || Object.values(STAGE_CHAPTERS)[0];
      const chapterProgress = getChapterProgress(player, selectedChapter.id);
      const chapterTabs = Object.values(STAGE_CHAPTERS).map(ch => {
        const cp = getChapterProgress(player, ch.id);
        const active = ch.id === selectedStageChapterId;
        const claimCheck = canClaimChapterBonus(player, ch.id);
        return `<button class="stage-chapter-tab ${active ? 'active' : ''} ${claimCheck.ok ? 'claimable' : ''}" type="button" data-stage-chapter="${escapeHtml(ch.id)}" style="--stage-color:${ch.color}"><span>${ch.icon}</span><b>${escapeHtml(ch.name)}</b><em>${cp.stars}/${cp.total * 3}★</em></button>`;
      }).join('');
      const cards = selectedChapter.stages.map((stageId, idx) => {
        const stage = STAGES[stageId];
        const unlocked = isStageUnlocked(player, stageId);
        const cleared = !!player.stageProgress.clearedStages[stageId];
        const active = selectedStageId === stageId;
        const theme = typeof getStageTheme === 'function' ? getStageTheme(stage) : null;
        const status = active ? '已选' : (cleared ? '已通' : (unlocked ? '新' : '锁'));
        const stars = stageStarText(stageId);
        const immortalMechanic = typeof getImmortalBossMechanic === 'function' ? getImmortalBossMechanic(stage.boss?.mechanicId || stage.id) : null;
        const mechanicBadge = immortalMechanic ? `<span class="stage-card-mechanic">${escapeHtml(immortalMechanic.icon || '🌌')} ${escapeHtml(immortalMechanic.name)}</span>` : '';
        const stageAffinity = typeof getStageAffinityText === 'function' ? getStageAffinityText(stage) : '';
        const stageBuildText = typeof getStageRecommendedBuildText === 'function' ? getStageRecommendedBuildText(stage, true) : '';
        return `<button class="stage-card ${active ? 'selected' : ''} ${unlocked ? '' : 'locked'}" style="--stage-color:${theme?.stairs || stage.color || selectedChapter.color}" type="button" data-stage-id="${escapeHtml(stage.id)}">
          <span class="stage-card-icon">${stage.icon || selectedChapter.icon}</span><div class="stage-card-main"><b>${idx + 1}. ${escapeHtml(stage.name)}</b><em>${cleared ? stars : (unlocked ? '☆☆☆' : '未解锁')}</em><small>${escapeHtml(REALMS?.[stage.recommendedRealm]?.name || '练气期')} · 战力${escapeHtml(stage.recommendedPower)} · ${escapeHtml(stage.roomCount)}房</small>${stageBuildText ? `<span class="stage-card-affinity">${escapeHtml(stageBuildText)}</span>` : ''}${mechanicBadge}</div><strong>${status}</strong>
        </button>`;
      }).join('');
      const unlocked = isStageUnlocked(player, selected.id);
      const sweepCheck = canSweepStage(player, selected.id);
      const rewardText = formatConfiguredRewards(selected.clearRewards);
      const firstText = selected.firstClearSkillPoints ? `首通：悟道点+${selected.firstClearSkillPoints} · ${formatConfiguredRewards(selected.firstClearRewards)}` : `首通：${formatConfiguredRewards(selected.firstClearRewards)}`;
      const setText = getStageSetDropText(selected);
      const materialSourcePanel = renderStageMaterialSourcePanel(selected);
      const chId = selected.chapterId;
      const chClaim = canClaimChapterBonus(player, chId);
      const chBonus = STAGE_CHAPTERS[chId]?.chapterBonus;
      const chBonusText = chBonus ? `${chBonus.desc}：${formatConfiguredRewards(chBonus)}` : '';
      const starCond = getStageStarConditionText(selected);
      const selectedTheme = typeof getStageTheme === 'function' ? getStageTheme(selected) : null;
      const selectedAffinityText = typeof getStageAffinityText === 'function' ? getStageAffinityText(selected) : '';
      const selectedBuildText = typeof getStageRecommendedBuildText === 'function' ? getStageRecommendedBuildText(selected, true) : '';
      const selectedBuildMatch = typeof getSkillBuildAffinityMatch === 'function' ? getSkillBuildAffinityMatch(selected) : null;
      const recSweep = getRecommendedSweepStage(player);
      const recText = recSweep ? `${recSweep.icon || ''}${recSweep.name} · ${getStageSetDropText(recSweep) || getStageDropText(recSweep)}` : '暂无可扫荡副本';
      const codexSummary = typeof getStageCodexSummary === 'function' ? getStageCodexSummary(player) : null;
      const nextGuideStage = codexSummary?.nextStageId ? STAGES[codexSummary.nextStageId] : null;
      const nextGuideText = nextGuideStage
        ? `${nextGuideStage.icon || ''}${nextGuideStage.name} · ${REALMS?.[nextGuideStage.recommendedRealm]?.name || '练气期'} · 战力${nextGuideStage.recommendedPower}`
        : (recSweep ? `扫荡 ${recSweep.icon || ''}${recSweep.name} 补材料/套装` : '继续挑战已解锁副本，积累经验、灵石与装备');
      const sweepCost1 = getStageSweepCost(selected, 1);
      const bossText = selected.boss?.name ? `${selected.boss.name} · ${getStageBossMechanicText(selected)}` : '普通房间清剿，无首领机制';
      const immortalMechanicCard = renderImmortalBossMechanicCard(selected);
      const detailHtml = `<div class="stage-sheet-backdrop" data-stage-sheet-close="1"></div><aside class="stage-detail-sheet" style="--stage-color:${selectedTheme?.stairs || selected.color || '#d4a0ff'}"><div class="stage-sheet-grip"></div><div class="stage-detail-title"><span>${selected.icon || '🗺️'}</span><div><b>${escapeHtml(selected.name)} ${stageStarText(selected.id)}</b><em>${escapeHtml(selected.desc || '副本详情')}</em></div></div><section class="stage-detail-section"><h4>基础</h4><div class="stage-detail-chip-grid"><span><b>推荐</b><em>${escapeHtml(REALMS?.[selected.recommendedRealm]?.name || '练气期')} · 战力${escapeHtml(selected.recommendedPower)}</em></span><span><b>房间</b><em>${escapeHtml(selected.roomCount)}间</em></span><span><b>地图</b><em>${escapeHtml(selectedTheme ? `${selectedTheme.icon || ''} ${selectedTheme.name}` : '默认秘境')}</em></span><span><b>三星</b><em>${escapeHtml(starCond)}</em></span><span class="stage-affinity-chip"><b>克制</b><em>${escapeHtml(selectedAffinityText || '无明显克制')}</em></span><span class="stage-affinity-chip build"><b>推荐流派</b><em>${escapeHtml(selectedBuildText || '通用流派')}</em></span><span class="stage-affinity-chip player ${cssClassToken(selectedBuildMatch?.status || 'neutral')}"><b>当前构筑</b><em>${escapeHtml(selectedBuildMatch?.detail || '未形成明显相性')}</em></span></div></section><section class="stage-detail-section"><h4>战斗</h4><div class="stage-detail-line compact"><b>首领机制</b><span>${escapeHtml(bossText)}</span></div>${immortalMechanicCard}</section><section class="stage-detail-section"><h4>奖励</h4><div class="stage-detail-line compact"><b>掉落</b><span>${escapeHtml(getStageDropText(selected))}</span></div>${setText ? `<div class="stage-detail-line compact"><b>套装目标</b><span>${escapeHtml(setText)}</span></div>` : ''}<div class="stage-detail-line compact"><b>首通</b><span>${escapeHtml(firstText)}</span></div><div class="stage-detail-line compact"><b>重复</b><span>${escapeHtml(rewardText)}</span></div></section><section class="stage-detail-section"><h4>扫荡</h4><div class="stage-detail-line compact"><b>成本</b><span>每次💎${escapeHtml(sweepCost1)} · 推荐：${escapeHtml(recText)}</span></div></section>${materialSourcePanel}${chClaim.ok ? `<div class="stage-detail-alert">🔔 章节全通奖励可领：${escapeHtml(chBonusText)}</div>` : ''}<div class="stage-sheet-actions"><button class="stage-detail-btn" type="button" data-stage-sheet-close="1">关闭</button><button class="stage-enter-btn" type="button" data-stage-enter="${escapeHtml(selected.id)}" ${unlocked ? '' : 'disabled'}>${unlocked ? '开始挑战' : getStageLockedReason(player, selected.id)}</button></div></aside>`;
      const sweepPreview = getStageSweepPreview(selected, 1);
      const sweepSheet = `<div class="stage-sheet-backdrop" data-stage-sheet-close="1"></div><aside class="stage-sweep-sheet" style="--stage-color:${selectedTheme?.stairs || selected.color || '#d4a0ff'}"><div class="stage-sheet-grip"></div><b>扫荡 ${escapeHtml(selected.name)}</b><small>${sweepCheck.ok ? `每次消耗 💎${escapeHtml(sweepPreview.perCost)}，快速领取重复通关奖励` : escapeHtml(sweepCheck.reason)}</small><div class="stage-sweep-preview"><span><b>当前灵石</b><em class="${sweepPreview.maxRuns <= 0 ? 'lack' : ''}">💎${escapeHtml(sweepPreview.owned)}</em></span><span><b>最多可扫</b><em>${escapeHtml(sweepPreview.maxRuns)}次</em></span><span><b>基础收益</b><em>${escapeHtml(sweepPreview.rewardText)}</em></span><span><b>可能掉落</b><em>${escapeHtml(sweepPreview.dropText)}</em></span></div>${sweepCheck.ok ? `<div class="stage-sweep-options">${[1, 5, 10].map(n => { const pv = getStageSweepPreview(selected, n); return `<button class="stage-sweep-btn ${pv.enough ? '' : 'disabled'}" type="button" data-stage-sweep="${escapeHtml(selected.id)}" data-stage-sweep-count="${n}" ${pv.enough ? '' : 'disabled'}>扫荡${n}次<br><em>💎${pv.cost}</em></button>`; }).join('')}</div>${sweepPreview.maxRuns <= 0 ? `<span class="stage-sweep-hint warn">灵石不足，至少需要💎${escapeHtml(sweepPreview.perCost)}</span>` : ''}` : `<span class="stage-sweep-hint">${escapeHtml(sweepCheck.reason)}</span>`}</aside>`;
p.innerHTML = `<div class="stage-head"><b>🗺️ 副本</b><div class="stage-tabs"><button class="stage-tab${stageTab === 'stages' ? ' active' : ''}" type="button" data-stage-tab="stages">选关</button><button class="stage-tab${stageTab === 'codex' ? ' active' : ''}" type="button" data-stage-tab="codex">图鉴</button></div><button class="pclose" type="button" data-stage-close="1" aria-label="关闭副本界面">×</button></div><div class="stage-body stage-select-body"${stageTab === 'stages' ? '' : ' style="display:none"'}><div class="stage-chapter-strip">${chapterTabs}</div><div class="stage-chapter-summary" style="--stage-color:${selectedChapter.color}"><b>${selectedChapter.icon} ${escapeHtml(selectedChapter.name)}</b><span>${chapterProgress.cleared}/${chapterProgress.total}关 · ${chapterProgress.stars}/${chapterProgress.total * 3}★</span><small>${escapeHtml(selectedChapter.desc || '')}</small></div><div class="stage-guide-strip"><b>下一步：</b><span>${escapeHtml(nextGuideText)}</span></div><div class="stage-card-grid">${cards}</div></div><div class="stage-body stage-codex-body"${stageTab === 'codex' ? '' : ' style="display:none"'}>${getStageCodexDom()}</div><div class="stage-foot">${stageTab === 'stages' ? `<div class="stage-foot-info" style="--stage-color:${selectedTheme?.stairs || selected.color || '#d4a0ff'}"><b>${escapeHtml(selected.name)} ${stageStarText(selected.id)}</b><small>${escapeHtml(unlocked ? `${REALMS?.[selected.recommendedRealm]?.name || '练气期'} · 战力${selected.recommendedPower} · ${selected.roomCount}房` : getStageLockedReason(player, selected.id))}</small><em>${escapeHtml(setText || getStageDropText(selected) || '通关可获得经验、灵石与装备')}</em></div><div class="stage-foot-actions"><button class="stage-detail-btn ${stageDetailOpen ? 'active' : ''}" type="button" data-stage-detail-toggle="1">详情</button><button class="stage-detail-btn ${stageSweepOpen ? 'active' : ''}" type="button" data-stage-sweep-toggle="1" ${sweepCheck.ok ? '' : 'disabled'}>${sweepCheck.ok ? '扫荡' : sweepCheck.reason}</button>${chClaim.ok ? `<button class="stage-enter-btn" type="button" data-claim-chapter="${escapeHtml(chId)}">领奖</button>` : `<button class="stage-enter-btn ${unlocked ? '' : 'disabled'}" type="button" data-stage-enter="${escapeHtml(selected.id)}" ${unlocked ? '' : 'disabled'}>${unlocked ? '进入' : '未解锁'}</button>`}</div>` : `<div class="stage-foot-info"><b>副本图鉴</b><small>查看全章节进度</small><em>点击推荐卡可跳转到对应章节与关卡</em></div>`}</div>${stageDetailOpen ? detailHtml : ''}${stageSweepOpen ? sweepSheet : ''}`;
    }
    const restoreChapterScroll = () => {
      const chapterStrip = p.querySelector('.stage-chapter-strip');
      if (!chapterStrip) return;
      const cssEscape = window.CSS?.escape || (v => String(v).replace(/[^a-zA-Z0-9_-]/g, '\\$&'));
      const activeChapterBtn = chapterStrip.querySelector(`.stage-chapter-tab[data-stage-chapter="${cssEscape(selectedStageChapterId || '')}"]`);
      if (activeChapterBtn) {
        const targetLeft = Math.max(0, activeChapterBtn.offsetLeft - Math.max(0, (chapterStrip.clientWidth - activeChapterBtn.offsetWidth) / 2));
        chapterStrip.scrollLeft = targetLeft;
      } else {
        chapterStrip.scrollLeft = prevChapterScrollLeft;
      }
    };
    restoreChapterScroll();
    requestAnimationFrame(restoreChapterScroll);
    setTimeout(restoreChapterScroll, 80);
    p.querySelectorAll('.pclose, [data-stage-close]').forEach(btn => bindPanelTap(btn, closeStagePanel));
    p.querySelectorAll('[data-stage-tab]').forEach(btn => bindPanelTap(btn, e => { e.stopPropagation(); stageTab = btn.dataset.stageTab; stageDetailOpen = false; stageSweepOpen = false; renderStageDomPanel(); }));
    p.querySelectorAll('[data-stage-chapter]').forEach(btn => bindPanelTap(btn, () => {
      selectedStageChapterId = btn.dataset.stageChapter;
      const ch = STAGE_CHAPTERS[selectedStageChapterId];
      if (ch?.stages?.length && !ch.stages.includes(selectedStageId)) {
        const firstUnlocked = ch.stages.find(sid => isStageUnlocked(player, sid));
        selectedStageId = firstUnlocked || ch.stages[0];
        player.stageProgress.selectedStageId = selectedStageId;
      }
      stageDetailOpen = false;
      stageSweepOpen = false;
      renderStageDomPanel();
    }));
    p.querySelectorAll('[data-codex-chapter]').forEach(btn => bindPanelTap(btn, () => {
      selectedStageChapterId = btn.dataset.codexChapter;
      const ch = STAGE_CHAPTERS[selectedStageChapterId];
      if (ch?.stages?.length && !ch.stages.includes(selectedStageId)) {
        const firstUnlocked = ch.stages.find(sid => isStageUnlocked(player, sid));
        selectedStageId = firstUnlocked || ch.stages[0];
        player.stageProgress.selectedStageId = selectedStageId;
      }
      stageTab = 'stages';
      stageDetailOpen = false;
      stageSweepOpen = false;
      renderStageDomPanel();
    }));
    p.querySelectorAll('[data-stage-id]').forEach(btn => {
      bindPanelTap(btn, e => {
        if (e?.currentTarget && e.currentTarget !== btn) return;
        selectedStageId = btn.dataset.stageId;
        player.stageProgress.selectedStageId = selectedStageId;
        selectedStageChapterId = STAGES[selectedStageId]?.chapterId || selectedStageChapterId;
        stageTab = 'stages';
        stageDetailOpen = false;
        stageSweepOpen = false;
        renderStageDomPanel();
      });
    });
    p.querySelectorAll('[data-codex-stage]').forEach(btn => bindPanelTap(btn, () => {
      selectedStageId = btn.dataset.codexStage;
      player.stageProgress.selectedStageId = selectedStageId;
      selectedStageChapterId = STAGES[selectedStageId]?.chapterId || selectedStageChapterId;
      stageTab = 'stages';
      stageDetailOpen = false;
      stageSweepOpen = !!btn.dataset.codexOpenSweep;
      renderStageDomPanel();
    }));
    p.querySelectorAll('[data-stage-detail-toggle]').forEach(btn => bindPanelTap(btn, () => { stageDetailOpen = !stageDetailOpen; stageSweepOpen = false; renderStageDomPanel(); }));
    p.querySelectorAll('[data-stage-sweep-toggle]').forEach(btn => bindPanelTap(btn, () => { stageSweepOpen = !stageSweepOpen; stageDetailOpen = false; renderStageDomPanel(); }));
    p.querySelectorAll('[data-stage-sheet-close]').forEach(btn => bindPanelTap(btn, () => { stageDetailOpen = false; stageSweepOpen = false; renderStageDomPanel(); }));
    p.querySelectorAll('[data-stage-enter]').forEach(btn => bindPanelTap(btn, e => { if (e?.stopPropagation) e.stopPropagation(); enterStage(btn.dataset.stageEnter); }));
    p.querySelectorAll('[data-stage-sweep]').forEach(btn => bindPanelTap(btn, () => { stageSweepOpen = false; sweepStage(btn.dataset.stageSweep, btn.dataset.stageSweepCount || 1); }));
    p.querySelectorAll('[data-stage-material-source]').forEach(btn => bindPanelTap(btn, e => {
      if (e?.stopPropagation) e.stopPropagation();
      selectedStageId = btn.dataset.stageMaterialSource;
      player.stageProgress.selectedStageId = selectedStageId;
      selectedStageChapterId = STAGES[selectedStageId]?.chapterId || selectedStageChapterId;
      stageTab = 'stages';
      stageDetailOpen = true;
      stageSweepOpen = false;
      renderStageDomPanel();
    }));
    p.querySelectorAll('[data-claim-chapter]').forEach(btn => bindPanelTap(btn, () => claimChapterBonus(btn.dataset.claimChapter)));
    p.querySelectorAll('[data-stage-back]').forEach(btn => bindPanelTap(btn, () => { showStageClearPanel = false; stageTab = 'stages'; stageDetailOpen = false; stageSweepOpen = false; renderStageDomPanel(); syncBodyPanelState(); }));
  }
  function pushStageEventLog(text) {
    if (!player?.stageProgress?.currentRun || !text) return;
    const list = Array.isArray(player.stageProgress.currentRun.events) ? player.stageProgress.currentRun.events : [];
    list.push(text);
    player.stageProgress.currentRun.events = list.slice(-8);
  }
  function applyStageRoomEvent(stage, roomIndex) {
    const event = getStageRoomEvent(stage, roomIndex);
    if (!event || ['normal', 'elite', 'boss'].includes(event.type)) return '';
    const rewards = event.rewards ? JSON.parse(JSON.stringify(event.rewards)) : {};
    if (event.type === 'rest') {
      const hp = Math.max(1, Math.floor(player.maxHp * (event.healHpRatio || 0.25)));
      const mp = Math.max(1, Math.floor(player.maxMp * (event.healMpRatio || 0.25)));
      player.hp = Math.min(player.maxHp, player.hp + hp);
      player.mp = Math.min(player.maxMp, player.mp + mp);
      const text = `${event.icon}${event.name}：恢复生命${hp}、法力${mp}`;
      pushStageEventLog(text);
      return text;
    }
    if (event.type === 'trap') {
      const dmg = Math.max(1, Math.floor(player.maxHp * (event.damageHpRatio || 0.1)));
      player.hp = Math.max(1, player.hp - dmg);
      const gain = applyConfiguredRewards(rewards);
      const text = `${event.icon}${event.name}：损失生命${dmg}，获得${formatConfiguredRewards(rewards)}${gain.full ? '（背包已满）' : ''}`;
      pushStageEventLog(text);
      return text;
    }
    const gain = applyConfiguredRewards(rewards);
    const itemText = (gain.items || []).map(i => i.name).join('、');
    const text = `${event.icon}${event.name}：获得${formatConfiguredRewards(rewards)}${itemText ? ' · 装备：' + itemText : ''}${gain.full ? '（背包已满）' : ''}`;
    pushStageEventLog(text);
    return text;
  }
  function getStageSweepCost(stage, count = 1) {
    const base = Math.max(8, Math.floor(Number(stage?.recommendedPower || 100) / 120));
    return base * Math.max(1, Number(count) || 1);
  }
  function getStageSweepPreview(stage, count = 1) {
    const runs = Math.max(1, Math.min(10, Number(count) || 1));
    const cost = getStageSweepCost(stage, runs);
    const owned = Number(player?.spiritStones || 0);
    const perCost = getStageSweepCost(stage, 1);
    const affordable = perCost > 0 ? Math.floor(owned / perCost) : runs;
    const maxRuns = Math.max(0, Math.min(10, affordable));
    const rewards = stage?.clearRewards || {};
    const rewardParts = [];
    if (rewards.xp) rewardParts.push(`${Number(rewards.xp || 0) * runs}经验`);
    if (rewards.spiritStones) rewardParts.push(`💎${Number(rewards.spiritStones || 0) * runs}`);
    (rewards.materials || []).forEach(mat => rewardParts.push(`${getStageMaterialName(mat.id)}x${Number(mat.count || 1) * runs}`));
    const dropText = getStageSetDropText(stage) || getStageDropText(stage) || '装备/材料';
    return { runs, cost, owned, perCost, maxRuns, enough: owned >= cost, rewardText: rewardParts.join(' · ') || '经验、灵石', dropText };
  }
  function getRecommendedSweepStage(player) {
    const progress = normalizeStageProgress(player.stageProgress);
    const realm = Number(player.realmIndex || 0);
    const candidates = Object.values(STAGES).filter(s => canSweepStage(player, s.id).ok);
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const ar = Math.abs(Number(a.recommendedRealm || 0) - realm);
      const br = Math.abs(Number(b.recommendedRealm || 0) - realm);
      if (ar !== br) return ar - br;
      const ac = Number(progress.clearedStages[a.id] || 0);
      const bc = Number(progress.clearedStages[b.id] || 0);
      if (ac !== bc) return ac - bc;
      return Number(b.recommendedPower || 0) - Number(a.recommendedPower || 0);
    });
    return candidates[0];
  }
  function summarizeSweepRewards(summary, rewards = {}, gain = {}) {
    summary.xp += Number(rewards.xp || 0);
    summary.spiritStones += Number(rewards.spiritStones || 0);
    (rewards.materials || []).forEach(mat => {
      if (!mat?.id) return;
      summary.materials[mat.id] = (summary.materials[mat.id] || 0) + Number(mat.count || 1);
    });
    (gain.items || []).forEach(item => summary.items.push(item.name || '装备'));
    if (gain.full) summary.full = true;
  }
  function formatSweepSummary(summary) {
    const parts = [];
    if (summary.cost) parts.push(`消耗💎${summary.cost}`);
    if (summary.xp) parts.push(`${summary.xp}经验`);
    if (summary.spiritStones) parts.push(`💎${summary.spiritStones}`);
    Object.entries(summary.materials || {}).forEach(([id, count]) => parts.push(`${getStageMaterialName(id)}x${count}`));
    if (summary.items.length) parts.push(`装备：${summary.items.join('、')}`);
    if (summary.full) parts.push('背包已满，已停止或跳过部分装备');
    return parts.join(' · ') || '无奖励';
  }
  function sweepStage(stageId, count = 1) {
    const stage = STAGES[stageId];
    const check = canSweepStage(player, stageId);
    if (!stage || !check.ok) { showMessage(check.reason || '暂不可扫荡', '#ff8844'); return; }
    const target = Math.max(1, Math.min(10, Number(count) || 1));
    const summary = { runs: 0, cost: 0, xp: 0, spiritStones: 0, materials: {}, items: [], full: false };
    for (let i = 0; i < target; i++) {
      const cost = getStageSweepCost(stage, 1);
      if (Number(player.spiritStones || 0) < cost) {
        if (summary.runs === 0) { showMessage(`灵石不足，扫荡需要💎${cost}`, '#ff8844'); return; }
        break;
      }
      const maxInv = typeof getInventoryCapacity === 'function' ? getInventoryCapacity(player) : 36;
      const beforeFull = player.inventory.length >= maxInv;
      if (beforeFull && (stage.clearRewards?.equipment || []).length) { summary.full = true; break; }
      player.spiritStones -= cost;
      summary.cost += cost;
      const gain = applyConfiguredRewards(stage.clearRewards || {});
      summarizeSweepRewards(summary, stage.clearRewards || {}, gain);
      summary.runs++;
      if (gain.full) break;
    }
    lastStageClearSummary = { success: true, title: `${stage.name} 扫荡${summary.runs}次完成`, desc: summary.runs < target ? '资源不足或背包已满，已自动停止。' : '批量扫荡奖励已汇总发放。', rewards: formatSweepSummary(summary) };
    showStageClearPanel = true;
    showStageSelectUI = false;
    syncBodyPanelState();
    autoSave();
  }
  function claimChapterBonus(chapterId) {
    const check = canClaimChapterBonus(player, chapterId);
    const chapter = STAGE_CHAPTERS[chapterId];
    if (!chapter?.chapterBonus || !check.ok) { showMessage(check.reason || '暂不可领取', '#ff8844'); return; }
    player.stageProgress = normalizeStageProgress(player.stageProgress);
    player.stageProgress.chapterBonusClaimed[chapterId] = true;
    autoSave();
    applyConfiguredRewards(chapter.chapterBonus);
    const titleId = typeof getChapterTitleId === 'function' ? getChapterTitleId(chapterId) : null;
    const title = titleId && typeof unlockPlayerTitle === 'function' ? unlockPlayerTitle(player, titleId) : null;
    if (typeof player.recalcStats === 'function') player.recalcStats();
    const chBonusText = `${chapter.chapterBonus.desc}：${formatConfiguredRewards(chapter.chapterBonus)}${title ? ` · 解锁称号「${title.name}」` : ''}`;
    lastStageClearSummary = { success: true, title: `🏆 ${chapter.name} 全通奖励！`, desc: chBonusText, rewards: '' };
    showStageClearPanel = true;
    showStageSelectUI = false;
    syncBodyPanelState();
    autoSave();
    renderStageDomPanel();
  }
  function enterStage(stageId) {
    if (isInCombat() || isInSecretRealm || isInStageRun || isInTribulation) return;
    player.stageProgress = normalizeStageProgress(player.stageProgress);
    const stage = STAGES[stageId];
    if (!stage) { showMessage('未知副本', '#ff4444'); return; }
    if (!isStageUnlocked(player, stageId)) { showMessage(getStageLockedReason(player, stageId), '#ff8844'); return; }
    isInStageRun = true;
    if (typeof document !== 'undefined') document.body.classList.add('stage-run-active');
    stageRoomIndex = 0;
    stageRoomCount = stage.roomCount || 1;
    player.stageProgress.currentRun = { stageId, roomIndex: 0, startedAt: Date.now(), turns: 0, events: [] };
    selectedStageId = stageId;
    player.stageProgress.selectedStageId = stageId;
    stageDetailOpen = false;
    stageSweepOpen = false;
    popPanelFromStack('stages');
    closeAllPanels({ sync: false });
    showStageSelectUI = false;
    showStageClearPanel = false;
    const sp = document.getElementById('stage-dom-panel');
    if (sp) sp.style.display = 'none';
    clearTouchMovementState();
    syncBodyPanelState();
    generateNewFloor();
    const stagePlanText = typeof getStageRecommendedBuildText === 'function' ? getStageRecommendedBuildText(stage, true) : '';
    const buildMatch = typeof getSkillBuildAffinityMatch === 'function' ? getSkillBuildAffinityMatch(stage) : null;
    showMessage(`🗺️ 进入副本：${stage.name}${stagePlanText ? ` · ${stagePlanText}` : ''}${buildMatch?.label ? ` · 当前${buildMatch.label}` : ''}`, stage.color || '#d4a0ff');
    autoSave({ delay: 8000 });
  }
  window.advanceStageRoom = function advanceStageRoom() {
    if (!isInStageRun) return;
    const stage = getActiveStage();
    if (!stage) { isInStageRun = false; return; }
    player.stageProgress.currentRun.roomIndex = stageRoomIndex;
    generateNewFloor();
  };
  window.quickClearStageRoom = function quickClearStageRoom() {
    if (!isInStageRun || isInCombat() || isAnyPanelOpen()) return;
    const stage = getActiveStage();
    const monsters = dungeon?._monsters ? Array.from(dungeon._monsters.values()).filter(enemy => enemy && Number(enemy.hp || 0) > 0) : [];
    if (!stage) return;
    const currentRoomIndex = Number(player?.stageProgress?.currentRun?.roomIndex || 0);
    const roomEvent = typeof getStageRoomEvent === 'function' ? getStageRoomEvent(stage, currentRoomIndex) : null;
    if (monsters.length === 0) {
      if (roomEvent && !['normal', 'elite', 'boss'].includes(roomEvent.type)) {
        const eventText = typeof applyStageRoomEvent === 'function' ? applyStageRoomEvent(stage, currentRoomIndex) : `${roomEvent.icon || ''}${roomEvent.name || '事件房'}`;
        if (player?.stageProgress?.currentRun) player.stageProgress.currentRun.turns = Number(player.stageProgress.currentRun.turns || 0) + 1;
        showMessage(`⚡ 速战跳过${eventText ? '：' + eventText : '事件房'} · 自动前往下一房`, '#ffdd66');
        if (typeof revealStageRoomExitIfCleared === 'function') revealStageRoomExitIfCleared(dungeon);
        autoSave();
        setTimeout(() => {
          if (!isInStageRun || isInCombat()) return;
          const exit = dungeon?._stageExit || (typeof getDungeonStairsCell === 'function' ? getDungeonStairsCell(dungeon) : null);
          if (exit) { player.x = exit.x; player.y = exit.y; }
          checkStairs();
        }, 160);
        return;
      }
      showMessage('本房已无妖怪，出口已开启。', '#ffdd66');
      if (typeof revealStageRoomExitIfCleared === 'function') revealStageRoomExitIfCleared(dungeon);
      return;
    }
    if (player?.stageProgress?.currentRun) player.stageProgress.currentRun.turns = Number(player.stageProgress.currentRun.turns || 0) + monsters.length;
    const maxInv = typeof getInventoryCapacity === 'function' ? getInventoryCapacity(player) : 36;
    const summary = { xp: 0, stones: 0, loot: [], skipped: 0 };
    monsters.forEach(enemy => {
      const xpReward = Math.ceil((enemy.xp || 20) * (enemy.isBoss ? 1.55 : 1.25));
      const stonesReward = Math.ceil((enemy.stones || 5) * (enemy.isBoss ? 1.7 : 1.3));
      summary.xp += xpReward;
      summary.stones += stonesReward;
      player.gainXp(xpReward);
      player.addSpiritStones(stonesReward);
      const lootRolls = enemy.isBoss ? 2 : (enemy.isElite ? 1 : (Math.random() < 0.45 ? 1 : 0));
      for (let i = 0; i < lootRolls; i++) {
        const loot = generateLootDrop(dungeonLevel, enemy);
        if (!loot) continue;
        if (player.inventory.length < maxInv) {
          player.inventory.push(loot);
          invalidateInventoryListCacheDom();
          summary.loot.push(loot.name || '装备');
        } else {
          summary.skipped++;
          break;
        }
      }
    });
    dungeon._monsters.clear();
    if (dungeon.grid) {
      for (let y = 0; y < dungeon.grid.length; y++) {
        for (let x = 0; x < dungeon.grid[y].length; x++) {
          if (dungeon.grid[y][x] !== TILE.STAIRS_DOWN && dungeon.grid[y][x] !== TILE.WALL) dungeon.grid[y][x] = dungeon.grid[y][x];
        }
      }
    }
    if (typeof revealStageRoomExitIfCleared === 'function') revealStageRoomExitIfCleared(dungeon);
    if (typeof resetTemporaryCombatBuffs === 'function') resetTemporaryCombatBuffs();
    if (typeof resetDomMapCache === 'function') resetDomMapCache();
    const lootText = summary.loot.length ? ` · 🎁${summary.loot.slice(0, 3).join('、')}${summary.loot.length > 3 ? '等' + summary.loot.length + '件' : ''}` : '';
    const fullText = summary.skipped ? ` · 背包满，跳过${summary.skipped}件` : '';
    showMessage(`⚡ 速战清场 ${monsters.length} 只妖怪：${summary.xp}经验，💎${summary.stones}${lootText}${fullText} · 自动前往下一房`, '#ffdd66');
    autoSave({ delay: 8000 });
    setTimeout(() => {
      if (!isInStageRun || isInCombat()) return;
      const exit = dungeon?._stageExit || (typeof getDungeonStairsCell === 'function' ? getDungeonStairsCell(dungeon) : null);
      if (exit) { player.x = exit.x; player.y = exit.y; }
      checkStairs();
    }, 160);
  };
  window.onStageComplete = function onStageComplete() {
    const progress = normalizeStageProgress(player.stageProgress);
    const stageId = progress.currentRun?.stageId || selectedStageId;
    const stage = STAGES[stageId];
    if (!stage) return;
    const isFirst = !progress.firstClearClaimed[stageId];
    const run = progress.currentRun || {};
    const stars = calculateStageStars(stage, run, player);
    const eventLog = Array.isArray(run.events) ? run.events.slice(-5) : [];
    const clearGain = applyConfiguredRewards(stage.clearRewards || {});
    let firstGain = { items: [], full: false };
    if (isFirst) {
      progress.firstClearClaimed[stageId] = true;
      if (stage.unlockNext && STAGES[stage.unlockNext]) progress.unlockedStages[stage.unlockNext] = true;
      player.stageProgress = progress;
      autoSave();
      firstGain = applyConfiguredRewards(stage.firstClearRewards || {});
      if (stage.firstClearSkillPoints) availableSkillPoints += Number(stage.firstClearSkillPoints || 0);
    }
    progress.clearedStages[stageId] = (progress.clearedStages[stageId] || 0) + 1;
    progress.stageStars[stageId] = Math.max(Number(progress.stageStars[stageId] || 0), stars);
    if (!progress.bestClearTurns[stageId] || (run.turns && run.turns < progress.bestClearTurns[stageId])) progress.bestClearTurns[stageId] = Number(run.turns || 0);
    progress.lastRoomEvents = eventLog;
    progress.currentRun = null;
    progress.selectedStageId = stageId;
    player.stageProgress = progress;
    isInStageRun = false; stageRoomIndex = 0; stageRoomCount = 0;
    if (typeof document !== 'undefined') document.body.classList.remove('stage-run-active');
    const gainedItems = [...(clearGain.items || []), ...(firstGain.items || [])].map(i => i.name).join('、');
    const fullWarn = clearGain.full || firstGain.full ? ' · 背包已满，部分装备未获得' : '';
    lastStageClearSummary = { success: true, title: `${stage.name} 通关！ ${getStageStarText(stars)}`, desc: `${isFirst ? '首通奖励已领取，后续关卡已解锁。' : '重复通关奖励已发放。'}${eventLog.length ? ' 房间事件：' + eventLog.join('；') : ''}`, rewards: `${formatConfiguredRewards(stage.clearRewards)}${isFirst ? ' · ' + formatConfiguredRewards(stage.firstClearRewards) + (stage.firstClearSkillPoints ? ` · 悟道点+${stage.firstClearSkillPoints}` : '') : ''}${gainedItems ? ' · 获得装备：' + gainedItems : ''}${fullWarn}` };
    showStageClearPanel = true; showStageSelectUI = false;
    syncBodyPanelState();
    autoSave();
  };
  window.onStageDefeat = function onStageDefeat() {
    if (player.stageProgress) player.stageProgress.currentRun = null;
    isInStageRun = false; stageRoomIndex = 0; stageRoomCount = 0;
    if (typeof document !== 'undefined') document.body.classList.remove('stage-run-active');
    if (player.hp <= 0 || player.hp < Math.floor(player.maxHp * 0.3)) player.hp = Math.floor(player.maxHp * 0.3);
    lastStageClearSummary = { success: false, title: '副本挑战失败', desc: '未获得通关奖励，可调整装备技能后重试。', rewards: '' };
    showStageClearPanel = true; showStageSelectUI = false;
    syncBodyPanelState(); autoSave();
  };
  window.onStageFlee = function onStageFlee() {
    if (player.stageProgress) player.stageProgress.currentRun = null;
    isInStageRun = false; stageRoomIndex = 0; stageRoomCount = 0;
    if (typeof document !== 'undefined') document.body.classList.remove('stage-run-active');
    showMessage('🏃 已退出副本。', '#88ccff');
    pushPanelToStack('stages');
    showStageClearPanel = false;
    stageTab = 'stages';
    stageDetailOpen = false;
    stageSweepOpen = false;
    selectedStageChapterId = STAGES[selectedStageId]?.chapterId || selectedStageChapterId;
    syncBodyPanelState(); autoSave();
  };

  // ─── Tribulation System ───
  function closeTribulationPanel(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    popPanelFromStack('tribulation');
    clearTouchMovementState();
    syncBodyPanelState();
  }
  function ensureTribulationDomPanel() {
    let p = document.getElementById('tribulation-dom-panel');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'tribulation-dom-panel';
    const onCloseHit = e => {
      const closeTarget = e.target.closest('.pclose');
      if (!closeTarget) return;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      closeTribulationPanel(e);
    };
    const onTribulationAction = e => {
      const target = e.target.closest('[data-trib-id], [data-trib-enter]');
      if (!target || target.disabled) return;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      if (e.type === 'touchstart' || e.type === 'pointerdown') tribulationDelegatedTouchUntil = Date.now() + 650;
      if (e.type === 'click' && Date.now() < tribulationDelegatedTouchUntil) return;
      if (target.matches('[data-trib-id]')) {
        selectedTribulationId = target.dataset.tribId || 'minor';
        renderTribulationDomPanel();
        return;
      }
      enterTribulation(target.dataset.tribEnter);
    };
    p.addEventListener('pointerdown', onCloseHit, { passive: false, capture: true });
    p.addEventListener('touchstart', onCloseHit, { passive: false, capture: true });
    p.addEventListener('click', onCloseHit, { capture: true });
    p.addEventListener('pointerdown', onTribulationAction, { passive: false });
    p.addEventListener('touchstart', onTribulationAction, { passive: false });
    p.addEventListener('click', onTribulationAction);
    document.body.appendChild(p);
    return p;
  }
  function renderTribulationDomPanel() {
    const p = ensureTribulationDomPanel();
    if (!showTribulationUI) { p.style.display = 'none'; return; }
    p.style.display = '';
    if (typeof TRIBULATIONS === 'undefined') {
      p.innerHTML = '<div class="trib-head"><b>⚡ 天劫</b><span>数据未加载</span><button class="pclose">×</button></div><div class="trib-empty">天劫数据未加载</div>';
      return;
    }
    if (isInTribulation) {
      const trial = TRIBULATIONS[player?.tribulationProgress?.tribulationId] || TRIBULATIONS.minor;
      p.innerHTML = `<div class="trib-progress"><b>${trial.icon}${escapeHtml(trial.name)}</b><button class="pclose" type="button">×</button><div>劫雷 ${tribulationNodeIndex + 1}/${tribulationNodeCount}</div><span>战斗结束后自动推进</span></div>`;
    } else {
      const cards = Object.values(TRIBULATIONS).map(trial => {
        const check = getTribulationAvailability(player, trial.id);
        const selected = selectedTribulationId === trial.id;
        const clears = player?.tribulationClears?.[trial.id] || 0;
        return `<button class="trib-card ${selected ? 'selected' : ''} ${check.ok ? '' : 'locked'}" type="button" data-trib-id="${escapeHtml(trial.id)}">
          <span class="trib-icon">${trial.icon}</span><div><b>${escapeHtml(trial.name)}</b><em>${escapeHtml(trial.desc)}</em><small>${escapeHtml(check.ok ? `消耗：${check.costText || getTribulationCostText(trial)} · 已渡劫 ${clears} 次` : check.reason)}</small></div><strong>${trial.waves}道</strong>
        </button>`;
      }).join('');
      const selected = TRIBULATIONS[selectedTribulationId] || TRIBULATIONS.minor;
      const check = getTribulationAvailability(player, selected.id);
      p.innerHTML = `<div class="trib-head"><b>⚡ 天劫</b><span>雷劫精华 ${Number(player?.tribulationEssence || 0)} · 淬体 ${Number(player?.bodyTemperLevel || 0)}</span><button class="pclose" type="button">×</button></div><div class="trib-body">${cards}</div><div class="trib-foot"><div>${escapeHtml(check.ok ? `准备挑战：${selected.name}` : check.reason)}</div><button class="trib-enter ${check.ok ? '' : 'disabled'}" type="button" data-trib-enter="${escapeHtml(selected.id)}" ${check.ok ? '' : 'disabled'}>${check.ok ? `挑战${selected.name}` : '条件不足'}</button></div>`;
    }
  }
  function enterTribulation(tribulationId) {
    if (isInCombat() || isInTribulation) return;
    const trial = TRIBULATIONS[tribulationId];
    if (!trial) { showMessage('未知天劫', '#ff4444'); return; }
    const paid = consumeTribulationCost(player, tribulationId);
    if (!paid.ok) { showMessage(paid.reason || '条件不足', '#ff8844'); renderTribulationDomPanel(); return; }
    isInTribulation = true;
    tribulationNodeIndex = 0;
    tribulationNodeCount = trial.waves;
    player.tribulationProgress = { tribulationId, waves: trial.waves };
    popPanelFromStack('tribulation');
    syncBodyPanelState();
    setTimeout(() => { advanceTribulationNode(); }, 300);
  }
  window.advanceTribulationNode = function advanceTribulationNode() {
    if (!isInTribulation) return;
    const progress = player?.tribulationProgress;
    if (!progress) { isInTribulation = false; return; }
    const enemy = buildTribulationEnemy(player, progress.tribulationId, tribulationNodeIndex);
    startCombat(enemy);
    showMessage(`⚡ ${enemy.title} 降临（${tribulationNodeIndex + 1}/${tribulationNodeCount}）`, '#ffe27a');
  };
  window.onTribulationComplete = function onTribulationComplete() {
    const id = player?.tribulationProgress?.tribulationId;
    const trial = TRIBULATIONS[id] || TRIBULATIONS.minor;
    const rewards = applyTribulationSuccess(player, id);
    player.tribulationProgress = null;
    isInTribulation = false;
    tribulationNodeIndex = 0;
    tribulationNodeCount = 0;
    resetTemporaryCombatBuffs();
    player.hp = Math.min(player.maxHp, Math.max(1, player.hp + Math.floor(player.maxHp * 0.25)));
    showMessage(`⚡ ${trial.name} 成功！雷劫精华+${rewards.essence}，淬体+${rewards.bodyTemper}`, '#ffe27a');
    // tribulation panel stays in stack during combat
    syncBodyPanelState();
    autoSave();
  };
  window.onTribulationDefeat = function onTribulationDefeat() {
    const id = player?.tribulationProgress?.tribulationId;
    const trial = TRIBULATIONS[id] || TRIBULATIONS.minor;
    const rewards = applyTribulationFailure(player, id);
    player.tribulationProgress = null;
    isInTribulation = false;
    tribulationNodeIndex = 0;
    tribulationNodeCount = 0;
    resetTemporaryCombatBuffs();
    player.hp = Math.max(1, Math.floor(player.maxHp * 0.35));
    showMessage(`⚡ ${trial.name} 失败，但获得保底：雷劫精华+${rewards.essence}，淬体+${rewards.bodyTemper}`, '#ffdd88');
    // tribulation panel stays in stack during combat
    syncBodyPanelState();
    autoSave();
  };
  window.onTribulationFlee = function onTribulationFlee() {
    player.tribulationProgress = null;
    isInTribulation = false;
    tribulationNodeIndex = 0;
    tribulationNodeCount = 0;
    resetTemporaryCombatBuffs();
    showMessage('🏃 中断天劫，本次消耗不返还。', '#88ccff');
    // tribulation panel stays in stack during combat
    syncBodyPanelState();
    autoSave();
  };

  // ─── Ascension / Immortal World Panel ───
  function closeAscensionPanel(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    popPanelFromStack('ascension');
    clearTouchMovementState();
    syncBodyPanelState();
  }
  function ensureAscensionDomPanel() {
    let p = document.getElementById('ascension-dom-panel');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'ascension-dom-panel';
    const onDelegatedAscensionClose = e => {
      const closeTarget = e.target.closest('.pclose');
      if (!closeTarget) return;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      closeAscensionPanel(e);
    };
    const onAscensionDelegatedAction = e => {
      const target = e.target.closest([
        '[data-asc-tab]', '[data-asc-perform]', '[data-asc-trial-start]', '[data-asc-trial-complete]',
        '[data-asc-body]', '[data-asc-class]', '[data-asc-skill]', '[data-asc-demon-start]',
        '[data-asc-demon-next]', '[data-asc-demon-complete]', '[data-asc-refine]', '[data-asc-refine-item]',
        '[data-asc-awaken]', '[data-asc-law]', '[data-asc-resource-source]'
      ].join(','));
      if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      if (e.type === 'touchstart' || e.type === 'pointerdown') ascensionDelegatedTouchUntil = Date.now() + 650;
      if (e.type === 'click' && Date.now() < ascensionDelegatedTouchUntil) return;
      if (target.matches('[data-asc-tab]')) {
        ascensionTab = target.dataset.ascTab || 'overview';
        renderAscensionDomPanel();
        return;
      }
      if (target.matches('[data-asc-perform]')) {
        const r = performAscension(player, playerMaterials);
        showMessage(r.message || r.reason, r.ok ? '#c8f7ff' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-trial-start]')) {
        const r = startAscensionTrial(player, playerMaterials);
        showMessage(r.ok ? '飞升三劫已开启' : r.reason, r.ok ? '#c8f7ff' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-trial-complete]')) { startAscensionTrialCombatNode(); autoSave(); return; }
      if (target.matches('[data-asc-body]')) {
        const r = upgradeImmortalBody(player, playerMaterials);
        showMessage(r.ok ? `仙躯升级：${r.tier.name}` : r.reason, r.ok ? '#c8f7ff' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-class]')) {
        const r = chooseAscensionClass(player, target.dataset.ascClass);
        showMessage(r.ok ? `选择仙职：${r.classInfo.name}` : r.reason, r.ok ? '#c8f7ff' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-skill]')) {
        const r = upgradeAscensionClassSkill(player, target.dataset.ascSkill, playerMaterials);
        showMessage(r.ok ? `习得${r.node.name}` : r.reason, r.ok ? '#c8f7ff' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-demon-start]')) {
        const r = startDemonWarRun(player, playerMaterials);
        showMessage(r.ok ? '仙魔战场开启' : r.reason, r.ok ? '#ffcc88' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-demon-next]')) { startDemonWarCombatNode(); autoSave(); return; }
      if (target.matches('[data-asc-demon-complete]')) {
        const r = completeDemonWarRun(player, playerMaterials);
        showMessage(r.ok ? `仙魔战场结算：仙玉+${r.rewards?.immortal_jade_ascended || 0}` : r.reason, r.ok ? '#ffcc88' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-refine]')) {
        const refineAction = getImmortalRefineActionState(player, playerMaterials);
        if (!refineAction.canRefine) return;
        const item = getEquippedWeaponForAscension();
        const r = immortalRefineItem(item, player, playerMaterials);
        showMessage(r.ok ? '武器仙炼完成' : r.reason, r.ok ? '#ffcc88' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-refine-item]')) {
        const entry = getAscensionRefineCandidates()[Number(target.dataset.ascRefineItem || 0)];
        if (!entry) return;
        const action = getImmortalRefineActionState(player, playerMaterials, entry.item);
        if (!action.canRefine) return;
        const r = immortalRefineItem(entry.item, player, playerMaterials);
        showMessage(r.ok ? `仙炼完成：${entry.item.name || '装备'}` : r.reason, r.ok ? '#ffcc88' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-awaken]')) {
        const awakenAction = getArtifactAwakenActionState(player, playerMaterials);
        if (!awakenAction.canAwaken) return;
        const r = awakenArtifact(player, playerMaterials);
        showMessage(r.ok ? `神器觉醒：${r.awaken?.name || r.artifact.name}` : r.reason, r.ok ? '#ffdd66' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-law]')) {
        selectedAscensionLawId = target.dataset.ascLaw || 'sword';
        const r = upgradeLaw(player, selectedAscensionLawId, playerMaterials);
        showMessage(r.ok ? `${r.law.name}提升至Lv.${r.level}` : r.reason, r.ok ? '#ffe27a' : '#ff8844');
        renderAscensionDomPanel(); autoSave();
        return;
      }
      if (target.matches('[data-asc-resource-source]')) {
        openAscensionResourceStageSource(target.dataset.ascResourceSource);
      }
    };
    p.addEventListener('pointerdown', onDelegatedAscensionClose, { passive: false, capture: true });
    p.addEventListener('touchstart', onDelegatedAscensionClose, { passive: false, capture: true });
    p.addEventListener('click', onDelegatedAscensionClose, { capture: true });
    p.addEventListener('pointerdown', onAscensionDelegatedAction, { passive: false });
    p.addEventListener('touchstart', onAscensionDelegatedAction, { passive: false });
    p.addEventListener('click', onAscensionDelegatedAction);
    document.body.appendChild(p);
    return p;
  }
  function getEquippedWeaponForAscension() {
    return player?.equipment?.weapon || null;
  }
  function formatAscensionRefineCandidateName(item) {
    if (!item) return '未知装备';
    const lv = Number(item.enhanceLevel || item.level || 0);
    const rarity = item.rarity ? ` · ${item.rarity}` : '';
    return `${itemIconDom(item, item.slot)} ${item.name || '未命名装备'}${rarity}${lv > 0 ? ` · +${lv}` : ''}`;
  }
  function getAscensionRefineCandidates() {
    const entries = [];
    const seen = new Set();
    const push = (item, source, key) => {
      if (!item || typeof item !== 'object') return;
      const sig = item.id || item.uid || `${source}:${key}:${item.name || ''}:${item.slot || ''}`;
      if (seen.has(sig)) return;
      seen.add(sig);
      entries.push({ item, source, key, label: source === 'equipment' ? '已装备' : '背包' });
    };
    Object.entries(player.equipment || {}).forEach(([slot, item]) => push(item, 'equipment', slot));
    (player.inventory?.items || player.inventory || []).forEach((item, index) => push(item, 'inventory', index));
    return entries.filter(entry => entry.item?.slot || entry.item?.type).sort((a, b) => {
      const ar = getImmortalRefineActionState(player, playerMaterials, a.item);
      const br = getImmortalRefineActionState(player, playerMaterials, b.item);
      if (ar.canRefine !== br.canRefine) return ar.canRefine ? -1 : 1;
      if (!!a.item.immortalRefined !== !!b.item.immortalRefined) return a.item.immortalRefined ? 1 : -1;
      return itemPowerDom(b.item) - itemPowerDom(a.item);
    });
  }
  function renderAscensionRefineList() {
    const entries = getAscensionRefineCandidates().slice(0, 8);
    if (!entries.length) return `<div class="asc-refine-list empty"><b>仙炼装备列表</b><span>暂无装备。通关副本获取传说/神话装备后，可强化至+10再仙炼。</span></div>`;
    const rows = entries.map((entry, idx) => {
      const action = getImmortalRefineActionState(player, playerMaterials, entry.item);
      const state = entry.item.immortalRefined ? '已仙炼' : (action.canRefine ? '可仙炼' : action.reason || '暂不可仙炼');
      const stateCls = entry.item.immortalRefined ? 'done' : (action.canRefine ? 'ready' : 'locked');
      return `<div class="asc-refine-item ${stateCls}"><div><b>${escapeHtml(formatAscensionRefineCandidateName(entry.item))}</b><span>${escapeHtml(entry.label)} · 战力${escapeHtml(itemPowerDom(entry.item))}</span><small>${escapeHtml(state)}</small></div><button class="asc-action" type="button" data-asc-refine-item="${idx}" ${action.canRefine ? '' : 'disabled aria-disabled="true"'}>${action.canRefine ? '仙炼' : escapeHtml(state)}</button></div>`;
    }).join('');
    return `<div class="asc-refine-list"><b>仙炼装备列表</b>${rows}</div>`;
  }
  function getActiveArtifactProgressForAscension() {
    const active = typeof getActiveArtifact === 'function' ? getActiveArtifact(player) : null;
    const progress = active && typeof getArtifactProgress === 'function' ? getArtifactProgress(active.id, player) : null;
    return { active, progress };
  }
  function getAscensionResourceMeta(id, fallbackSource = '', fallbackName = '') {
    const mat = typeof MATERIALS !== 'undefined' ? MATERIALS.find(m => m.id === id) : null;
    return {
      id,
      name: mat?.name || fallbackName || (typeof getStageMaterialName === 'function' ? getStageMaterialName(id) : id),
      icon: mat ? materialIconDom(mat) : '✦',
      source: mat ? materialSourceTextDom(mat) : fallbackSource,
    };
  }
  function getAscensionResourceStageSources(id, limit = 3) {
    if (typeof getStageMaterialSources === 'function') return getStageMaterialSources(id).slice(0, limit);
    if (typeof STAGES === 'undefined' || !STAGES) return [];
    return Object.values(STAGES).filter(stage => {
      const buckets = [stage.firstClearRewards, stage.repeatRewards, stage.sweepRewards, stage.rewards].filter(Boolean);
      return buckets.some(reward => Object.prototype.hasOwnProperty.call(reward.materials || reward, id));
    }).slice(0, limit).map(stage => ({
      stageId: stage.id,
      stageName: stage.name,
      chapterId: stage.chapterId,
      chapterName: STAGE_CHAPTERS?.[stage.chapterId]?.name || stage.chapterId || '副本',
      recommendedPower: stage.recommendedPower || stage.power || 0,
    }));
  }
  function openAscensionResourceStageSource(stageId) {
    if (!stageId || typeof STAGES === 'undefined' || !STAGES?.[stageId]) return;
    selectedStageId = stageId;
    player.stageProgress = normalizeStageProgress(player.stageProgress || {});
    player.stageProgress.selectedStageId = stageId;
    selectedStageChapterId = STAGES[stageId]?.chapterId || selectedStageChapterId;
    stageTab = 'stages';
    stageDetailOpen = true;
    stageSweepOpen = false;
    popPanelFromStack('ascension');
    pushPanelToStack('stages');
    syncBodyPanelState();
  }
  function renderAscensionResourceGuide(items = []) {
    const rows = items.map(item => {
      const meta = getAscensionResourceMeta(item.id, item.source || '章节副本 / 首领掉落', item.name || '');
      const owned = Math.max(0, Number(playerMaterials?.[item.id] || 0));
      const need = Math.max(1, Number(item.need || 1));
      const ready = owned >= need;
      const stageSources = getAscensionResourceStageSources(item.id, 3);
      const sourceActions = stageSources.map(source => `<button class="asc-source-btn" type="button" data-asc-resource-source="${escapeHtml(source.stageId)}"><span>${escapeHtml(source.chapterName)} · ${escapeHtml(source.stageName)}</span><em>战力${escapeHtml(source.recommendedPower || 0)}</em></button>`).join('');
      return `<div class="asc-resource-row ${ready ? 'ready' : 'lack'}"><b>${escapeHtml(meta.icon)} ${escapeHtml(meta.name)}</b><span>${escapeHtml(owned)}/${escapeHtml(need)}</span><small>材料来源：${escapeHtml(meta.source || item.source || '章节副本 / 首领掉落')}</small>${sourceActions ? `<div class="asc-source-actions">${sourceActions}</div>` : ''}</div>`;
    }).join('');
    return rows ? `<div class="asc-resource-guide"><strong>材料来源</strong>${rows}</div>` : '';
  }
  function renderAscensionTrialPanel() {
    const plan = typeof getAscensionTrialPlan === 'function' ? getAscensionTrialPlan(player) : { nodes: [] };
    const trial = player.ascension.trial || { active: false, index: 0, cleared: [] };
    const trialActionState = typeof getAscensionTrialActionState === 'function'
      ? getAscensionTrialActionState(player, playerMaterials)
      : { canStart: false, canChallenge: !!trial.active, tokenCount: Number(playerMaterials.ascension_trial_token || 0), startReason: '飞升三劫数据未加载' };
    const trialDone = !!trialActionState.trialDone || (plan.nodes.length > 0 && plan.nodes.every(n => trial.cleared?.includes(n.id)));
    const buttonState = ok => ({ cls: ok ? '' : ' disabled', attr: ok ? '' : ' disabled aria-disabled="true"' });
    const startState = buttonState(trialActionState.canStart);
    const challengeState = buttonState(trialActionState.canChallenge);
    const startLabel = trialDone ? '三劫已完成' : (trial.active ? '三劫进行中' : '开启三劫');
    const challengeLabel = trialDone ? '三劫已完成' : (trial.active ? '挑战当前劫' : '请先开启');
    const tokenText = `飞升试炼令：${trialActionState.tokenCount || 0}/1`;
    const guide = renderAscensionResourceGuide([{ id: 'ascension_trial_token', name: '飞升试炼令', need: 1, source: '仙门镇守者首通 / 仙门镇守者复刷' }]);
    const cards = plan.nodes.map((n, i) => `<div class="asc-step ${trial.cleared?.includes(n.id) ? 'done' : (trial.index === i ? 'active' : '')}"><b>${n.icon} ${escapeHtml(n.name)}</b><span>${escapeHtml(n.desc || '')}</span><small>${trial.cleared?.includes(n.id) ? '已通过' : (trial.index === i ? '当前节点' : '待挑战')}</small></div>`).join('');
    return `<section class="asc-card"><h3>飞升三劫</h3><p>先过问心劫、炼体劫、叩仙门，再执行最终飞升。</p><div class="asc-token-line"><b>${escapeHtml(tokenText)}</b><span>${escapeHtml(trialActionState.startReason || '可开启三劫')}</span></div>${guide}<div class="asc-progress">${cards}</div><div class="asc-action-row"><button class="asc-action${startState.cls}" type="button" data-asc-trial-start title="${escapeHtml(trialActionState.startReason || '')}"${startState.attr}>${startLabel}</button><button class="asc-action${challengeState.cls}" type="button" data-asc-trial-complete title="${escapeHtml(trialActionState.challengeReason || '')}"${challengeState.attr}>${challengeLabel}</button></div></section>`;
  }
  function startAscensionTrialCombatNode() {
    if (isInCombat()) return;
    if (!player?.ascension?.trial?.active) {
      showMessage('请先开启飞升三劫', '#ff8844');
      renderAscensionDomPanel();
      return;
    }
    const r = typeof advanceAscensionTrialNode === 'function' ? advanceAscensionTrialNode(player) : null;
    if (!r?.ok || !r.enemy) {
      showMessage('飞升三劫已完成，可返回总览叩仙门', '#c8f7ff');
      renderAscensionDomPanel();
      return;
    }
    r.enemy.x = Math.floor(Number(player.x || 0));
    r.enemy.y = Math.floor(Number(player.y || 0));
    popPanelFromStack('ascension');
    syncBodyPanelState();
    startCombat(r.enemy);
    showMessage(`⚔️ 飞升三劫：${r.enemy.name} 开战！`, '#c8f7ff');
  }
  function renderAscensionSkillTree() {
    const tree = ASCENSION_CLASS_TREES?.[player.ascension.classId || ''] || null;
    const skillGuide = renderAscensionResourceGuide([{ id: 'immortal_jade_ascended', name: '仙玉', need: 4, source: '飞升仪式 / 仙界副本 / 仙魔战场' }]);
    if (!tree) return `<section class="asc-card"><h3>仙职技能</h3><p>请先选择仙职，再学习专属技能树。</p>${skillGuide}</section>`;
    return `<div class="asc-skill-tree">${tree.nodes.map(n => { const action = typeof getAscensionClassSkillActionState === 'function' ? getAscensionClassSkillActionState(player, n.id, playerMaterials) : { canLearn: false, reason: '技能数据未加载' }; return `<button class="asc-choice ${player.ascension.classSkills?.[n.id] ? 'selected' : ''}" type="button" data-asc-skill="${n.id}" title="${escapeHtml(action.reason || '')}" ${action.canLearn ? '' : 'aria-disabled="true"'}><b>${escapeHtml(n.name)}</b><span>仙玉x${escapeHtml(n.cost)}</span><small>${player.ascension.classSkills?.[n.id] ? '已习得' : escapeHtml(action.canLearn ? '点击学习' : (action.reason || '暂不可学'))}</small></button>`; }).join('')}${skillGuide}</div>`;
  }
  function renderAscensionEndgamePanel() {
    const dw = player.ascension.demonWar || { active: false, progress: 0, bestClear: 0, clears: 0, nodes: [] };
    const demonActionState = typeof getDemonWarActionState === 'function'
      ? getDemonWarActionState(player, playerMaterials)
      : { active: !!dw.active, progress: Math.max(0, Number(dw.progress || 0)), total: dw.nodes?.length || 4, canStart: false, canAdvance: false, canSettle: false, startReason: '战场数据未加载' };
    const weapon = getEquippedWeaponForAscension();
    const refineAction = typeof getImmortalRefineActionState === 'function'
      ? getImmortalRefineActionState(player, playerMaterials)
      : { canRefine: false, reason: '仙炼数据未加载', item: weapon };
    const weaponState = weapon?.immortalRefined ? '已仙炼' : (refineAction.canRefine ? '可仙炼' : (refineAction.reason || (!weapon ? '未装备武器' : '强化+10后可仙炼')));
    const { active, progress } = getActiveArtifactProgressForAscension();
    const awakenAction = typeof getArtifactAwakenActionState === 'function'
      ? getArtifactAwakenActionState(player, playerMaterials)
      : { canAwaken: false, reason: '觉醒数据未加载', artifact: active, progress };
    const artifactState = progress?.awakened ? '神器已觉醒' : (awakenAction.canAwaken ? '可觉醒' : (awakenAction.reason || (!active ? '未激活神器' : '满级后可觉醒')));
    const demonTotal = demonActionState.total || 4;
    const demonProgress = demonActionState.progress || 0;
    const buttonState = ok => ({ cls: ok ? '' : ' disabled', attr: ok ? '' : ' disabled aria-disabled="true"' });
    const startState = buttonState(demonActionState.canStart);
    const advanceState = buttonState(demonActionState.canAdvance);
    const settleState = buttonState(demonActionState.canSettle);
    const refineState = buttonState(refineAction.canRefine);
    const awakenState = buttonState(awakenAction.canAwaken);
    const refineList = renderAscensionRefineList();
    const refineCost = refineAction.cost || (typeof getImmortalRefineCost === 'function' ? getImmortalRefineCost(weapon || { enhanceLevel: 0 }) : { materials: { immortal_refine_stone: 3, immortal_jade_ascended: 2 } });
    const resourceGuide = renderAscensionResourceGuide([
      { id: 'demon_war_banner', name: '仙魔战旗', need: 1, source: '仙界副本首通 / 魔尊投影 / 每轮仙魔战场结算' },
      ...Object.entries(refineCost.materials || {}).map(([id, need]) => ({ id, need, name: id === 'immortal_refine_stone' ? '仙炼石' : '仙玉', source: id === 'immortal_refine_stone' ? '万器仙宫 / 仙魔战场 / 高阶仙域首通' : '仙界副本 / 仙职突破 / 仙魔战场' })),
    ]);
    const next = demonActionState.canAdvance && typeof advanceDemonWarNode === 'function' ? advanceDemonWarNode(player) : null;
    const nextLabel = next?.enemy ? escapeHtml(next.enemy.name) : (demonActionState.canSettle ? '可结算' : (demonActionState.startReason || '待开启'));
    return `<section class="asc-card"><h3>仙魔战场</h3><p>终局连续战：当前${demonActionState.active ? '进行中' : '未开启'} · 进度${demonProgress}/${demonTotal} · 最高${dw.bestClear || 0}</p><div class="asc-status-grid"><div><b>战场节点</b><span class="asc-badge">${nextLabel}</span></div><div><b>武器仙炼</b><span class="asc-badge ${weapon ? '' : 'asc-muted'}">${escapeHtml(weaponState)}</span></div><div><b>神器觉醒</b><span class="asc-badge ${active ? '' : 'asc-muted'}">${escapeHtml(artifactState)}</span></div></div>${resourceGuide}<div class="asc-action-row"><button class="asc-action${startState.cls}" type="button" data-asc-demon-start title="${escapeHtml(demonActionState.startReason || '')}"${startState.attr}>消耗战旗开启</button><button class="asc-action${advanceState.cls}" type="button" data-asc-demon-next${advanceState.attr}>推进下一节点</button><button class="asc-action${settleState.cls}" type="button" data-asc-demon-complete${settleState.attr}>结算战场</button></div><div class="asc-action-row"><button class="asc-action${refineState.cls}" type="button" data-asc-refine title="${escapeHtml(refineAction.reason || '')}"${refineState.attr}>${refineAction.canRefine ? '仙炼已装备武器' : escapeHtml(refineAction.reason || '暂不可仙炼')}</button><button class="asc-action${awakenState.cls}" type="button" data-asc-awaken title="${escapeHtml(awakenAction.reason || '')}"${awakenState.attr}>${awakenAction.canAwaken ? '觉醒当前神器' : escapeHtml(awakenAction.reason || '暂不可觉醒')}</button></div>${refineList}</section>`;
  }
  function startDemonWarCombatNode() {
    if (isInCombat()) return;
    if (!player?.ascension?.demonWar?.active) {
      showMessage('请先消耗战旗开启仙魔战场', '#ff8844');
      renderAscensionDomPanel();
      return;
    }
    const r = typeof advanceDemonWarNode === 'function' ? advanceDemonWarNode(player) : null;
    if (!r?.ok || !r.enemy) {
      showMessage('仙魔战场已推进至终点，可结算奖励', '#88ccff');
      renderAscensionDomPanel();
      return;
    }
    r.enemy.x = Math.floor(Number(player.x || 0));
    r.enemy.y = Math.floor(Number(player.y || 0));
    popPanelFromStack('ascension');
    syncBodyPanelState();
    startCombat(r.enemy);
    showMessage(`⚔️ 仙魔战场：${r.enemy.name} 开战！`, '#ffcc88');
  }
  function renderAscensionDomPanel() {
    const p = ensureAscensionDomPanel();
    if (!showAscensionUI) { p.style.display = 'none'; return; }
    p.style.display = '';
    if (typeof normalizeAscensionState !== 'function') {
      p.innerHTML = '<div class="asc-head"><b>☁️ 飞升仙界</b><span>数据未加载</span><button class="pclose">×</button></div><div class="asc-empty">飞升数据未加载</div>';
      return;
    }
    player.ascension = normalizeAscensionState(player.ascension);
    const status = getAscensionStatus(player, playerMaterials);
    const cls = player.ascension.classId ? ASCENSION_CLASSES[player.ascension.classId] : null;
    const bodyTier = getImmortalBodyTier(player);
    const nextBody = getNextImmortalBodyTier(player);
    const bonuses = getAscensionStatBonuses(player);
    const tabs = [['overview','飞升'], ['trial','三劫'], ['body','仙躯'], ['class','仙职'], ['skills','技能'], ['law','法则'], ['endgame','终局']].map(([id,label]) => `<button class="asc-tab ${ascensionTab === id ? 'active' : ''}" type="button" data-asc-tab="${id}">${label}</button>`).join('');
    let body = '';
    if (ascensionTab === 'overview') {
      const req = status.ready ? '<li class="ok">条件已满足，可叩仙门</li>' : status.missing.map(x => `<li>${escapeHtml(x)}</li>`).join('');
      const overviewGuide = renderAscensionResourceGuide(ASCENSION_REQUIREMENTS.materials);
      const performReady = status.ready && !player.ascension.ascended;
      body = `<section class="asc-card hero"><h3>${player.ascension.ascended ? '☁️ 已飞升仙界' : '🚪 叩开仙界之门'}</h3><p>${player.ascension.ascended ? '凡骨尽褪，当前主线转入仙界篇。继续刷接引仙域、淬炼仙躯、选择仙职并参悟法则。' : '通关仙门镇守者并备齐材料后，可飞升为散仙，解锁接引仙域与仙界成长线。'}</p><ul>${req}</ul>${overviewGuide}<div class="asc-action-row"><button class="asc-action" type="button" data-asc-tab="trial">查看三劫</button><button class="asc-action" type="button" data-asc-tab="endgame">终局养成</button><button class="asc-action ${performReady ? '' : 'disabled'}" type="button" data-asc-perform title="${escapeHtml(status.ready || player.ascension.ascended ? '' : status.missing.join('、'))}" ${performReady ? '' : 'disabled aria-disabled="true"'}>${player.ascension.ascended ? '已完成飞升' : '开始飞升'}</button></div></section>`;
    } else if (ascensionTab === 'trial') {
      body = renderAscensionTrialPanel();
    } else if (ascensionTab === 'body') {
      const bodyAction = typeof getImmortalBodyActionState === 'function' ? getImmortalBodyActionState(player, playerMaterials) : { canUpgrade: false, reason: '仙躯数据未加载', next: nextBody, need: nextBody ? Number(nextBody.cost || 1) : 1 };
      const bodyNeed = bodyAction.need || (nextBody ? Number(nextBody.cost || 1) : Math.max(1, Number(playerMaterials.immortal_marrow || 0)));
      const bodyGuide = renderAscensionResourceGuide([{ id: 'immortal_marrow', name: '仙髓', need: bodyNeed, source: '飞升仪式 / 仙界副本 / 仙界秘境' }]);
      body = `<section class="asc-card"><h3>仙躯：${escapeHtml(bodyTier.name)}</h3><p>仙髓 ${Number(playerMaterials.immortal_marrow || 0)} · 当前加成：生命${Math.round((bonuses.maxHpPct || 0) * 100)}% / 仙力${Math.round(bonuses.immortalPower || 0)}</p>${bodyGuide}<button class="asc-action ${bodyAction.canUpgrade ? '' : 'disabled'}" type="button" data-asc-body title="${escapeHtml(bodyAction.reason || '')}" ${bodyAction.canUpgrade ? '' : 'disabled aria-disabled="true"'}>${nextBody ? `消耗仙髓x${nextBody.cost} 升至${nextBody.name}` : '仙躯已满'}</button></section>`;
    } else if (ascensionTab === 'class') {
      body = `<div class="asc-grid">${Object.values(ASCENSION_CLASSES).map(c => `<button class="asc-choice ${player.ascension.classId === c.id ? 'selected' : ''}" type="button" data-asc-class="${c.id}" style="--asc-color:${c.color}"><b>${c.icon} ${escapeHtml(c.name)}</b><span>${escapeHtml(c.desc)}</span><small>${player.ascension.classId === c.id ? '当前仙职' : (player.ascension.classId ? '已定仙职' : '选择')}</small></button>`).join('')}</div>`;
    } else if (ascensionTab === 'skills') {
      body = renderAscensionSkillTree();
    } else if (ascensionTab === 'endgame') {
      body = renderAscensionEndgamePanel();
    } else {
      body = `<div class="asc-grid laws">${Object.values(LAW_DEFINITIONS).map(law => {
        const action = typeof getLawUpgradeActionState === 'function' ? getLawUpgradeActionState(player, law.id, playerMaterials) : { canUpgrade: false, reason: '法则数据未加载', level: player.ascension.laws[law.id] || 0, cost: getLawUpgradeCost(player.ascension.laws[law.id] || 0), owned: Number(playerMaterials[law.materialId] || 0) };
        const lv = action.level;
        const cost = action.cost;
        const owned = action.owned;
        const guide = renderAscensionResourceGuide([{ id: law.materialId, name: getStageMaterialName(law.materialId), need: cost, source: law.source || '仙界副本 / 法则试炼 / 高阶仙域' }]);
        return `<button class="asc-choice ${selectedAscensionLawId === law.id ? 'selected' : ''}" type="button" data-asc-law="${law.id}" style="--asc-color:${law.color}" title="${escapeHtml(action.reason || '')}" ${action.canUpgrade ? '' : 'aria-disabled="true"'}><b>${law.icon} ${escapeHtml(law.name)} Lv.${lv}</b><span>材料 ${escapeHtml(getStageMaterialName(law.materialId))}：${owned}/${cost}</span><small>${escapeHtml(action.reason || '')}</small>${guide}</button>`;
      }).join('')}</div>`;
    }
    p.innerHTML = `<div class="asc-head"><b>☁️ 飞升仙界</b><span>${escapeHtml(REALMS?.[player.realmIndex]?.name || '修士')} · ${cls ? cls.icon + cls.name : '未选仙职'}</span><button class="pclose" type="button">×</button></div><div class="asc-tabs">${tabs}</div><div class="asc-body">${body}</div>`;
  }
  window.renderAscensionDomPanel = renderAscensionDomPanel;

  // ─── End Secret Realm System ───
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