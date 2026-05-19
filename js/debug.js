// Mobile debug/error overlay for Rouge. Loaded before game scripts on purpose.
(function () {
  'use strict';

  const SAVE_KEY = 'xian_save_v1';
  const MAX_ERRORS = 30;
  const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
  const lastErrors = [];
  let overlayEl = null;
  let bodyEl = null;
  let badgeEl = null;
  let collapsed = false;

  function nowText() {
    const d = new Date();
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  }

  function safeRead(name, fallback) {
    try {
      if (name in window) return window[name];
    } catch (e) {
      // ignored
    }
    return fallback;
  }

  function cloneLite(value, depth = 0, seen = new WeakSet()) {
    if (value == null || typeof value !== 'object') return value;
    if (seen.has(value)) return '[Circular]';
    if (depth >= 3) return Array.isArray(value) ? `[Array(${value.length})]` : '[Object]';
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 20).map(v => cloneLite(v, depth + 1, seen));
    const out = {};
    Object.keys(value).slice(0, 40).forEach(key => {
      const v = value[key];
      if (typeof v !== 'function') out[key] = cloneLite(v, depth + 1, seen);
    });
    return out;
  }

  function formatError(err) {
    if (!err) return '未知错误';
    if (err instanceof Error) return `${err.name}: ${err.message}\n${err.stack || ''}`.trim();
    if (typeof err === 'string') return err;
    try {
      return JSON.stringify(err, null, 2);
    } catch (e) {
      return String(err);
    }
  }

  function addError(type, detail) {
    const item = {
      type,
      time: new Date().toISOString(),
      message: detail.message || formatError(detail.error || detail.reason || detail),
      source: detail.filename || detail.source || '',
      line: detail.lineno || detail.line || 0,
      col: detail.colno || detail.col || 0,
      stack: detail.error?.stack || detail.reason?.stack || '',
    };
    lastErrors.unshift(item);
    if (lastErrors.length > MAX_ERRORS) lastErrors.length = MAX_ERRORS;
    updateOverlay();
  }

  function getSaveRaw() {
    try {
      return localStorage.getItem(SAVE_KEY);
    } catch (e) {
      return null;
    }
  }

  function getSaveInfo() {
    const raw = getSaveRaw();
    if (!raw) return { exists: false, bytes: 0, parsed: null };
    try {
      const parsed = JSON.parse(raw);
      return {
        exists: true,
        bytes: raw.length,
        version: parsed.version,
        timestamp: parsed.timestamp || null,
        floor: parsed.floor ?? null,
        realmIndex: parsed.realmIndex ?? null,
        xp: parsed.xp ?? null,
        spiritStones: parsed.spiritStones ?? null,
      };
    } catch (e) {
      return { exists: true, bytes: raw.length, parseError: String(e) };
    }
  }

  function getState() {
    const p = safeRead('player', null);
    const d = safeRead('dungeon', null);
    return {
      url: location.href,
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 },
      gameReady: !!safeRead('gameReady', false),
      dungeonLevel: safeRead('dungeonLevel', null),
      inCombat: typeof window.isInCombat === 'function' ? safeCall(window.isInCombat, false) : null,
      player: p ? {
        realmIndex: p.realmIndex ?? null,
        hp: p.hp ?? null,
        maxHp: p.maxHp ?? null,
        mp: p.mp ?? null,
        maxMp: p.maxMp ?? null,
        xp: p.xp ?? null,
        spiritStones: p.spiritStones ?? null,
        inventoryCount: Array.isArray(p.inventory) ? p.inventory.length : null,
        equipment: cloneLite(p.equipment || null),
      } : null,
      dungeon: d ? {
        width: d.width ?? d.w ?? null,
        height: d.height ?? d.h ?? null,
        rooms: Array.isArray(d.rooms) ? d.rooms.length : null,
        enemies: Array.isArray(d.enemies) ? d.enemies.length : null,
        items: Array.isArray(d.items) ? d.items.length : null,
      } : null,
      save: getSaveInfo(),
      lastErrors: lastErrors.slice(),
    };
  }

  function safeCall(fn, fallback) {
    try {
      return fn();
    } catch (e) {
      return fallback;
    }
  }

  function exportSave() {
    const raw = getSaveRaw();
    if (!raw) return null;
    const payload = {
      exportedAt: new Date().toISOString(),
      key: SAVE_KEY,
      data: raw,
    };
    const text = JSON.stringify(payload, null, 2);
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
    } catch (e) {
      // ignored
    }
    return text;
  }

  function deleteSave() {
    if (!window.confirm('确定删除本地存档？此操作不可恢复。')) return false;
    try {
      localStorage.removeItem(SAVE_KEY);
      updateOverlay();
      return true;
    } catch (e) {
      addError('deleteSave', { error: e, message: e.message });
      return false;
    }
  }

  function toggleOverlay(force) {
    if (!overlayEl) createOverlay();
    const shouldShow = typeof force === 'boolean' ? force : overlayEl.style.display === 'none';
    overlayEl.style.display = shouldShow ? 'block' : 'none';
    if (shouldShow) updateOverlay();
    return shouldShow;
  }

  function toggleCollapse(force) {
    collapsed = typeof force === 'boolean' ? force : !collapsed;
    if (overlayEl) overlayEl.classList.toggle('rouge-debug-collapsed', collapsed);
    updateOverlay();
  }

  function injectStyle() {
    if (document.getElementById('rouge-debug-style')) return;
    const style = document.createElement('style');
    style.id = 'rouge-debug-style';
    style.textContent = `
      #rouge-debug-overlay{position:fixed;z-index:2147483647;left:8px;right:8px;bottom:8px;max-height:52vh;background:rgba(8,10,18,.94);color:#e8f0ff;border:1px solid rgba(212,160,255,.65);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.5);font:12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;touch-action:manipulation}
      #rouge-debug-overlay *{box-sizing:border-box}
      #rouge-debug-head{display:flex;align-items:center;gap:8px;padding:7px 8px;background:rgba(212,160,255,.16);user-select:none}
      #rouge-debug-head strong{font-size:13px;margin-right:auto;color:#fff}
      #rouge-debug-head button,#rouge-debug-actions button{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;border-radius:7px;padding:5px 8px;font-size:12px}
      #rouge-debug-badge{color:#ff9c9c;font-weight:700}
      #rouge-debug-body{padding:8px;overflow:auto;max-height:calc(52vh - 36px);-webkit-overflow-scrolling:touch}
      #rouge-debug-actions{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px}
      #rouge-debug-output{white-space:pre-wrap;word-break:break-word;background:rgba(0,0,0,.28);border-radius:8px;padding:7px;max-height:30vh;overflow:auto}
      .rouge-debug-error{border-top:1px solid rgba(255,255,255,.12);padding-top:6px;margin-top:6px;color:#ffd1d1}
      #rouge-debug-overlay.rouge-debug-collapsed{left:auto;width:auto;right:8px;bottom:8px}
      #rouge-debug-overlay.rouge-debug-collapsed #rouge-debug-body{display:none}
    `;
    document.head.appendChild(style);
  }

  function createOverlay() {
    if (overlayEl || !document.body) return;
    injectStyle();
    overlayEl = document.createElement('div');
    overlayEl.id = 'rouge-debug-overlay';
    overlayEl.innerHTML = `
      <div id="rouge-debug-head">
        <strong>ROUGE Debug</strong><span id="rouge-debug-badge"></span>
        <button type="button" data-act="refresh">刷新</button>
        <button type="button" data-act="collapse">折叠</button>
      </div>
      <div id="rouge-debug-body">
        <div id="rouge-debug-actions">
          <button type="button" data-act="state">状态</button>
          <button type="button" data-act="export">导出存档</button>
          <button type="button" data-act="delete">删存档</button>
          <button type="button" data-act="clear">清错误</button>
        </div>
        <div id="rouge-debug-output"></div>
      </div>`;
    document.body.appendChild(overlayEl);
    bodyEl = document.getElementById('rouge-debug-output');
    badgeEl = document.getElementById('rouge-debug-badge');
    overlayEl.addEventListener('click', handleOverlayClick);
    updateOverlay();
  }

  function handleOverlayClick(e) {
    const act = e.target?.getAttribute?.('data-act');
    if (!act) return;
    e.preventDefault();
    e.stopPropagation();
    if (act === 'collapse') toggleCollapse();
    if (act === 'refresh' || act === 'state') renderState();
    if (act === 'export') renderExport();
    if (act === 'delete') deleteSave();
    if (act === 'clear') { lastErrors.length = 0; updateOverlay(); }
  }

  function renderState() {
    if (!bodyEl) return;
    bodyEl.textContent = JSON.stringify(getState(), null, 2);
  }

  function renderExport() {
    if (!bodyEl) return;
    const text = exportSave();
    bodyEl.textContent = text || '无本地存档可导出';
  }

  function updateOverlay() {
    if (!overlayEl || !bodyEl) return;
    if (badgeEl) badgeEl.textContent = lastErrors.length ? `错误 ${lastErrors.length}` : 'OK';
    if (!bodyEl.textContent || lastErrors.length) {
      const state = getState();
      const errors = lastErrors.slice(0, 5).map(err => `\n[${err.type}] ${err.time}\n${err.message}${err.source ? `\n${err.source}:${err.line}:${err.col}` : ''}${err.stack ? `\n${err.stack}` : ''}`).join('\n');
      bodyEl.textContent = `ready=${state.gameReady} floor=${state.dungeonLevel ?? '-'} save=${state.save.exists ? 'yes' : 'no'} errors=${lastErrors.length}${errors ? `\n${errors}` : ''}`;
    }
  }

  window.addEventListener('error', event => {
    addError('error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener('unhandledrejection', event => {
    addError('unhandledrejection', { reason: event.reason, message: formatError(event.reason) });
  });

  window.ROUGE_DEBUG = {
    getState,
    exportSave,
    deleteSave,
    toggleOverlay,
    lastErrors,
  };

  if (debugEnabled) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => toggleOverlay(true), { once: true });
    } else {
      toggleOverlay(true);
    }
  }
}());
