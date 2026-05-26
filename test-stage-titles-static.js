const fs = require('fs');
const assert = require('assert');

const stages = fs.readFileSync('js/stages.js', 'utf8');
const entities = fs.readFileSync('js/entities.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const save = fs.readFileSync('js/save.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const CURRENT_TOKEN = '20260526nexthint1';
const PREVIOUS_TOKEN = '20260525demonstate' + '1';

assert(stages.includes('const PLAYER_TITLES'), 'title data missing');
assert(stages.includes('qingyun_trial'), 'qingyun title missing');
assert(stages.includes('blood_slayer'), 'blood title missing');
assert(stages.includes('thunder_walker'), 'thunder title missing');
assert(stages.includes('function normalizeTitleState'), 'title normalizer missing');
assert(stages.includes('function getTitleStatBonuses'), 'title stat helper missing');
assert(entities.includes('this.titles'), 'player title state missing');
assert(entities.includes('getTitleStatBonuses'), 'title bonuses not applied in recalcStats');
assert(save.includes('titles:'), 'title save missing');
assert(save.includes('normalizeTitleState(data.titles)'), 'title load missing');
assert(main.includes('data-equip-title'), 'title equip binding missing');
assert(main.includes('称号 <small>章节全通后解锁'), 'title panel missing');
assert(main.includes('unlockPlayerTitle'), 'chapter title unlock missing');
assert(main.includes('bindInventoryTapDom(btn, () => {\n        const titleId = btn.dataset.equipTitle;'), 'title cards should use move-threshold tap binding so vertical scrolling is not hijacked');
assert(!main.includes("p.querySelectorAll('[data-equip-title]').forEach(btn => {\n      bindPanelActionDom(btn"), 'title cards must not use old action binding directly');
assert(css.includes('.title-card'), 'title css missing');
assert(css.includes('#character-dom-panel .title-card {') && css.includes('touch-action: pan-y;'), 'title card touch-action pan-y missing');
assert(main.includes('统一改为“移动阈值 tap”'), 'shared panel action binding should be scroll-safe');
assert(!main.includes("el.addEventListener('touchstart', e => {\n        markInventoryTouchActionDom();\n        e.preventDefault();"), 'bindPanelActionDom must not preventDefault on touchstart');
assert(main.includes("bindPanelTap(card, () => selectSecretRealm(card.dataset.srId));"), 'secret realm cards should use scroll-safe tap binding');
assert(css.includes('#secretrealm-dom-panel {') && css.includes('touch-action: pan-y;') && css.includes('overscroll-behavior: contain;'), 'secret realm panel should allow vertical pan scrolling');
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale demonstate token');
assert(index.includes(`js/stages.js?v=${CURRENT_TOKEN}`), 'cachebuster missing');
assert(index.includes(`js/main.js?v=${CURRENT_TOKEN}`), 'main cachebuster missing');
assert(index.includes(`css/style.css?v=${CURRENT_TOKEN}`), 'css cachebuster missing');

console.log('stage titles static ok');
