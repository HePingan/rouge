const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260526ascsrc1';

assert(html.includes('id="hud-next-step"'), 'index should include a lightweight next-step HUD hint');
assert(/function getHudNextStepHint\s*\(player\)[\s\S]*点击「副本」选择青云山/.test(ui), 'HUD next-step helper should guide fresh saves to the stage selector');
assert(/function getHudNextStepHint\s*\(player\)[\s\S]*突破/.test(ui), 'HUD next-step helper should mention breakthrough when XP is capped');
assert(/function getHudNextStepHint\s*\(player\)[\s\S]*接引仙域[\s\S]*淬炼仙躯/.test(ui), '飞升后 HUD 应优先提示接引仙域/仙躯成长，而不是继续显示旧副本线');
assert(/function getHudNextStepHint\s*\(player\)[\s\S]*仙魔战场[\s\S]*法则/.test(ui), '仙界后期 HUD 应提示仙魔战场/法则闭环');
assert(/function updateHUD[\s\S]*document\.getElementById\('hud-next-step'\)[\s\S]*getHudNextStepHint\(player\)/.test(ui), 'updateHUD should refresh the next-step HUD text');
assert(/#hud-next-step[\s\S]*pointer-events:\s*none[\s\S]*max-width:\s*min\(68vw, 300px\)/.test(css), 'next-step HUD should be compact and not block map/touch controls');

const linkedTokens = Array.from(html.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length > 0, 'index should link versioned assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!html.includes(PREVIOUS_TOKEN), 'index should not keep stale ascsrc cachebuster');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current next-step cachebuster');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify iframe should not keep stale ascsrc token');
assert(css.includes(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`), 'mobile CSS marker should bump with next-step cachebuster');

console.log('hud next-step static tests passed');
