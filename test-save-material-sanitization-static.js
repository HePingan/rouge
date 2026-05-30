const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = {
  console,
  Date,
  Math,
  Number,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

function runFile(path, expose = '') {
  vm.runInContext(`${fs.readFileSync(path, 'utf8')}\n${expose}`, context, { filename: path });
}

runFile('js/save.js', `
this.SAVE_VERSION = SAVE_VERSION;
this.normalizeMaterialIds = normalizeMaterialIds;
this.migrateSave = migrateSave;
this.parseSaveRaw = parseSaveRaw;
this.validateSave = validateSave;
`);

const normalized = context.normalizeMaterialIds({
  herb: '3.8',
  demon_war_banner: '2',
  artifact_shard_zhuxian: '1',
  artifact_dust: '4.9',
  law_fragment_void: '-2',
  immortal_jade_ascended: Infinity,
  immortal_refine_stone: null,
  fake_material: 'not-a-number',
});

assert.strictEqual(normalized.herb, 3, 'positive string material counts should be floored to safe integers');
assert.strictEqual(normalized.demon_war_banner, 2, 'endgame currency counts should survive migration as integers');
assert.strictEqual(normalized.artifact_shard_zhuxian, 5, 'legacy artifact_dust should convert after count sanitization');
assert.strictEqual(normalized.artifact_dust, undefined, 'legacy artifact_dust should not remain after migration');
assert.strictEqual(normalized.law_fragment_void, undefined, 'negative material counts should be dropped rather than saved');
assert.strictEqual(normalized.immortal_jade_ascended, undefined, 'infinite material counts should be dropped rather than saved');
assert.strictEqual(normalized.immortal_refine_stone, undefined, 'null material counts should be dropped rather than saved');
assert.strictEqual(normalized.fake_material, undefined, 'non-numeric material counts should be dropped rather than saved');
assert(Object.values(normalized).every(v => Number.isInteger(v) && v > 0), 'all normalized material counts should be positive finite integers');

const parsed = context.parseSaveRaw(JSON.stringify({
  version: 5,
  timestamp: 1,
  realmIndex: 9,
  equipment: {},
  inventory: [],
  learnedSkills: [],
  materials: {
    herb: '2',
    demon_war_banner: '-9',
    artifact_dust: '2',
    law_fragment_nether: '6.2',
  },
  floor: 1,
}));
assert.strictEqual(parsed.materials.herb, 2, 'parseSaveRaw should normalize material counts through migration');
assert.strictEqual(parsed.materials.artifact_shard_zhuxian, 2, 'parseSaveRaw should migrate legacy artifact dust safely');
assert.strictEqual(parsed.materials.law_fragment_nether, 6, 'parseSaveRaw should floor decimal endgame materials');
assert.strictEqual(parsed.materials.demon_war_banner, undefined, 'parseSaveRaw should drop negative endgame currencies');
assert.strictEqual(context.validateSave(parsed), true, 'sanitized save should validate');
assert.strictEqual(context.SAVE_VERSION >= 6, true, 'SAVE_VERSION should bump for stricter material-count migration');

const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260525demonstate' + '1';
const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale demonstate cachebuster');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current cachebuster');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep stale demonstate cachebuster');
assert(css.includes(`Mobile Universal Interface Layout ${CURRENT_TOKEN}`), 'mobile CSS marker should be bumped with cachebuster');

console.log('save material sanitization static tests passed');
