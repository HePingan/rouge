const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260527invfix' + '1';

assert(main.includes("emptyText = '点背包小图标查看详情；点「装备」进入属性对比，确认后才会穿上'"), 'empty detail hint should mention equip instead of sell/decompose');
assert(main.includes('bag-detail-actions'), 'bag detail should use a dedicated compact action row');
assert(main.includes('primary-equip'), 'bag detail equip button should be highlighted as the primary action');
assert(main.includes('data-equip-action-index'), 'bag detail should keep equip/compare flow binding');
assert(main.includes('>装备</button>'), 'bag detail bottom action should be labelled 装备');
assert(!main.includes('data-sell-index="${detail.index}"'), 'bag detail should not render per-item sell button');
assert(!main.includes('data-decompose-index="${detail.index}"'), 'bag detail should not render per-item decompose button');
assert(!main.includes('>对比</button>'), 'bag detail bottom action should no longer be labelled 对比');
assert(!main.includes('function confirmDom('), 'inventory cleanup should remove native confirm helper after destructive actions moved to explicit process tab');
assert(!main.includes('window.confirm('), 'main gameplay UI should not use native confirm dialogs that block mobile touch flow');
assert(!main.includes('function sellInventoryItemDom('), 'single-item sell helper should be removed when no UI route exposes it');
assert(!main.includes('function decomposeInventoryItemDom('), 'single-item decompose helper should be removed when no UI route exposes it');
assert(!main.includes("detailWrap.querySelectorAll('[data-sell-index]')"), 'detail binder should not keep orphaned sell selectors');
assert(!main.includes("detailWrap.querySelectorAll('[data-decompose-index]')"), 'detail binder should not keep orphaned decompose selectors');

assert(main.includes("let inventorySortMode = 'power';"), 'inventory should default to power sorting');
assert(main.includes('function sortedInventoryEntriesDom()'), 'inventory should sort rendered bag entries through a helper');
assert(main.includes('data-bag-sort="power"') && main.includes('data-bag-sort="rarity"'), 'bag toolbar should expose power and rarity sort buttons');
assert(main.includes("btn.setAttribute('aria-pressed'"), 'sort buttons should expose pressed state for accessibility');
assert(main.includes('function inventoryListHtmlDom()') && main.includes('inventoryListHtmlCacheKeyDom'), 'inventory sorting should cache generated bag HTML to avoid repeated full rebuild work');
assert(main.includes("scheduleInventoryRenderDom('sort')"), 'sort switching should batch rerender through requestAnimationFrame');
assert(main.includes('if (inventorySortMode === mode) return;'), 'clicking the active sort should not rerender');
assert(main.includes('invalidateInventoryListCacheDom();'), 'inventory mutations should be able to invalidate sort cache');
assert(css.includes('.bag-sort-toggle') && css.includes('.bag-sort-btn.active'), 'CSS should style the sort toggle and active button');

assert(css.includes('.detail-actions.bag-detail-actions'), 'CSS should style the new bag detail action row');
assert(css.includes('grid-template-columns: minmax(0, .9fr) minmax(0, 1.35fr)'), 'bag detail action row should use two optimized columns');
assert(css.includes('.bag-detail-actions .primary-equip'), 'primary equip button should have dedicated styling');
assert(css.includes('grid-template-columns: repeat(7, minmax(0, 1fr))'), 'mobile bag grid should show seven equipment icons per row to reduce scrolling');
assert(css.includes('grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px'), 'narrow mobile bag grid should still show six equipment icons per row');
assert(css.includes('#inventory-dom-panel .material-list {') && css.includes('grid-template-columns: repeat(6, minmax(0, 1fr));') && css.includes('#inventory-dom-panel .mat-card.grid-mat-card .mat-dot'), 'mobile material grid should match compact equipment icon density');
assert(css.includes('#inventory-dom-panel .mat-card.grid-mat-card em {\n  display: none;\n}'), 'material grid should hide long usage text in compact tile mode');
assert(main.includes('inventoryMaterialHtmlCacheKeyDom') && main.includes('function materialCardsHtmlDom()') && main.includes('return inventoryMaterialHtmlCacheDom'), 'material card HTML should be cached to avoid rebuild jank while switching inventory tabs');
assert(!main.includes("scheduleInventoryRenderDom('stagechange')"), 'opening stages should not schedule inventory rerender and cause tab-switch jank');
assert(css.includes('#inventory-dom-panel .bag-item-card .bag-main,') && css.includes('#inventory-dom-panel .bag-item-card .bag-power,') && css.includes('#inventory-dom-panel .bag-item-card .bag-stats { display: none; }'), 'mobile bag cards should hide verbose text/stats and keep compact icon tiles');
assert(css.includes('#inventory-dom-panel .equip-list { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }'), 'mobile equipped slots should not fall back to two columns');
assert(!css.includes('#inventory-dom-panel .equip-list { grid-template-columns: repeat(2, minmax(64px, 1fr));'), 'old two-column equipped-slot mobile rule should be removed');
assert(css.includes('#character-dom-panel .char-equip-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }'), 'character equipment grid should show four slots per row on mobile');
assert(!css.includes('#character-dom-panel .char-equip-grid { grid-template-columns: repeat(2, minmax(0, 1fr));'), 'old two-column character equipment mobile rule should be removed');

assert(!html.includes('20260521realmcap1'), 'index cachebuster should be bumped from realmcap token');
assert(!html.includes('20260521bagequip1'), 'index cachebuster should be bumped from bag equip token');
assert(!html.includes('20260524endgame7'), 'index cachebuster should be bumped from previous native-confirm cleanup token');
assert(!html.includes(PREVIOUS_TOKEN), 'index cachebuster should be bumped from demonstate token');
assert(html.includes(CURRENT_TOKEN), 'index cachebuster should use inventory cleanup token');
for (const file of ['css/style.css', 'js/main.js']) {
  const re = new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=${CURRENT_TOKEN}`);
  assert(re.test(html), `${file} should use monster buff cachebuster`);
}

console.log('inventory equip actions static tests passed');
