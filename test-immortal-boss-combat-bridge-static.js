const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const combat = fs.readFileSync('js/combat.js', 'utf8');
const asc = fs.readFileSync('js/ascension.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260525saveguard' + '1';

function runBrowserScript(file, expose, context) {
  const src = fs.readFileSync(file, 'utf8');
  vm.runInContext(`${src}\n${expose || ''}`, context, { filename: file });
}

const context = {
  console,
  Math,
  Date,
  setTimeout: fn => fn(),
  clearTimeout: () => {},
  document: { body: { classList: { add() {}, remove() {}, toggle() {} } } },
  showMessage() {},
  spawnHitEffect() {},
  spawnCritEffect() {},
  sfxHit() {},
  sfxCrit() {},
  player: { hp: 1000, maxHp: 1000, def: 0, _statusEffects: [], recalcStats() {}, x: 0, y: 0 },
  CELL_SIZE: 24,
};
context.window = context;
vm.createContext(context);
runBrowserScript('js/ascension.js', `
this.getImmortalBossMechanic = getImmortalBossMechanic;
this.applyImmortalBossMechanic = applyImmortalBossMechanic;
`, context);
runBrowserScript('js/combat.js', `
this.__combatBridgeTest = { startCombat, maybeTriggerBossMechanic, getLog: () => combatLogBuffer, getEnemy: () => currentEnemy };
`, context);

const thunderBoss = { id: 'thunder_judicator', name: '雷罚使', title: '⚡雷罚使', hp: 1000, maxHp: 1000, atk: 100, def: 40, isBoss: true, bossMechanicId: 'thunder_judicator', x: 0, y: 0 };
context.__combatBridgeTest.startCombat(thunderBoss);
assert(context.__combatBridgeTest.getLog().some(entry => String(entry.text).includes('雷罚审判')), 'combat intro should surface immortal boss mechanic names before the first turn');
assert(context.__combatBridgeTest.getLog().some(entry => String(entry.text).includes('机制')), 'combat intro should make boss mechanics visible in the mobile combat log');
assert.strictEqual(context.__combatBridgeTest.maybeTriggerBossMechanic('turn'), false, 'immortal turn mechanic should wait for interval');
assert.strictEqual(context.__combatBridgeTest.maybeTriggerBossMechanic('turn'), false, 'immortal turn mechanic should wait until third turn');
assert.strictEqual(context.__combatBridgeTest.maybeTriggerBossMechanic('turn'), true, 'third immortal boss turn should trigger through combat bridge');
assert(context.player.hp < 1000, 'turn-interval immortal boss mechanic should damage the player');
assert(context.__combatBridgeTest.getLog().some(entry => String(entry.text).includes('仙界机制·雷罚审判')), 'combat log should report the triggered immortal boss mechanic');

function mustInclude(src, needle, label) {
  assert(src.includes(needle), `${label}: missing ${needle}`);
}

mustInclude(combat, 'getCurrentImmortalBossMechanic', 'combat should expose immortal boss mechanic resolver');
mustInclude(combat, 'triggerImmortalBossMechanic', 'combat should bridge immortal boss effects into combat log');
mustInclude(combat, 'applyImmortalBossMechanic(currentEnemy, player, phase)', 'combat should call ascension mechanic runtime');
mustInclude(combat, '仙界机制', 'combat log should label immortal boss mechanics');
mustInclude(combat, 'mechanic.triggers', 'combat should detect trigger-table mechanics');
mustInclude(combat, 'effect.type === \'shield\'', 'combat should log shield effects');
mustInclude(combat, 'effect.type === \'status\'', 'combat should log status effects');
mustInclude(combat, 'effect.type === \'damage\'', 'combat should log damage effects');

mustInclude(asc, 'IMMORTAL_BOSS_MECHANICS', 'ascension mechanics table should exist');
const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes('20260524endgame3'), 'index should not keep stale endgame3 token');
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep previous boss-intro cache token');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current cachebuster');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep previous boss-intro cache token');
assert(css.includes(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`), 'mobile CSS marker should bump with current cachebuster');
console.log('immortal boss combat bridge static assertions passed');
