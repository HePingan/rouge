const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const CURRENT_TOKEN = '20260526nexthint1';
const PREVIOUS_TOKEN = '20260525trialtoken1';

const context = { console, Math, Date };
context.window = context;
context.globalThis = context;
vm.createContext(context);

vm.runInContext(`${fs.readFileSync('js/ascension.js', 'utf8')}\nthis.applyImmortalBossMechanic = applyImmortalBossMechanic;`, context, { filename: 'js/ascension.js' });
const combatContext = {
  console,
  Math,
  Date,
  window: {},
  document: { body: { classList: { add() {}, remove() {}, toggle() {} } } },
  player: { hp: 1000, maxHp: 1000, def: 0, recalcStats() {} },
  CELL_SIZE: 24,
  showMessage() {},
  spawnHitEffect() {},
  spawnCritEffect() {},
  sfxHit() {},
  sfxCrit() {},
};
vm.createContext(combatContext);
vm.runInContext(`
  ${fs.readFileSync('js/combat.js', 'utf8')}
  this.__describeImmortalBossEffect = describeImmortalBossEffect;
`, combatContext, { filename: 'js/combat.js' });

const player = { hp: 1000, maxHp: 1000 };
const enemy = {
  id: 'nether_king',
  bossMechanicId: 'nether_king',
  name: '幽冥王',
  hp: 500,
  maxHp: 1000,
  atk: 100,
  def: 50,
  _bossMechanicState: { turn: 3 },
};

const result = context.applyImmortalBossMechanic(enemy, player, 'turn');
assert(result, '幽冥魂锁机制应返回触发结果');
assert(result.effects.some(effect => effect.type === 'drain'), 'drainPct 机制应产生 drain 效果，便于战斗日志展示');
assert.strictEqual(player.hp, 940, '幽冥魂锁应按玩家最大生命 6% 吸血扣血');
assert.strictEqual(enemy.hp, 560, '幽冥魂锁应把吸取的生命回复给 Boss 且不超过最大生命');
assert.strictEqual(combatContext.__describeImmortalBossEffect({ type: 'drain', value: 60 }), '吸取 60 生命', '战斗日志应把 drain 效果显示为可读的吸取生命文本');

const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale trialtoken cachebuster');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current cachebuster');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep stale trialtoken cachebuster');
assert(css.includes(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`), 'mobile CSS marker should bump with drain mechanic cachebuster');

console.log('immortal boss drain mechanic test passed');
