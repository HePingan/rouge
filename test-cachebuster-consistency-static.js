const assert = require('assert');
const fs = require('fs');
const path = require('path');

const CURRENT_TOKEN = '20260606safearea6';
const KNOWN_PREVIOUS_TOKENS = [
  '20260524endgame1',
  '20260524secretQuick1',
  '20260524secretQuick2',
  '20260526ascsrc1',
  '20260526closeright1',
  '20260527detailfix1',
  '20260530stageclose1',
  '20260605combatp3',
  '20260606safearea1',
  '20260606safearea2',
  '20260606safearea3',
  '20260606safearea4',
  '20260606safearea5',
];

function read(file) { return fs.readFileSync(file, 'utf8'); }
function tokensIn(text) { return Array.from(text.matchAll(/\?v=([^"'<>\s]+)/g), m => m[1]); }

const index = read('index.html');
const mobile = read('mobile-verify.html');
const css = read('css/style.css');

const indexTokens = tokensIn(index);
assert(indexTokens.length > 10, 'index.html should expose versioned JS/CSS assets');
assert(indexTokens.every(token => token === CURRENT_TOKEN), `all index.html assets should use ${CURRENT_TOKEN}: ${[...new Set(indexTokens)].join(', ')}`);
assert(mobile.includes(`./index.html?v=${CURRENT_TOKEN}`), 'mobile-verify iframe should load the current cachebuster');

const smokeFiles = fs.readdirSync('.').filter(name => /^test-.*\.html$/.test(name));
const staleSmokeFiles = [];
for (const file of smokeFiles) {
  const fileTokens = tokensIn(read(file));
  if (fileTokens.length && !fileTokens.every(token => token === CURRENT_TOKEN)) {
    staleSmokeFiles.push(`${file}: ${[...new Set(fileTokens)].join(',')}`);
  }
}
assert.deepStrictEqual(staleSmokeFiles, [], `browser smoke HTML entrypoints should use ${CURRENT_TOKEN}: ${staleSmokeFiles.join('; ')}`);

for (const marker of [
  'DOM Character Panel',
  'Artifact Mobile Sheet',
  'Global Panel Close Right',
  'Stage Header Layout',
  'Mobile Universal Interface Layout',
  'Ascension Resource Source Navigation',
  'Mobile Stage Compact Layout',
  'Mobile Stage Detail Sheet Safe Area',
]) {
  assert(css.includes(`${marker} ${CURRENT_TOKEN}`), `CSS marker should include current token: ${marker}`);
}

for (const token of KNOWN_PREVIOUS_TOKENS) {
  assert(!index.includes(token), `index.html should not include stale cachebuster ${token}`);
  assert(!mobile.includes(token), `mobile-verify.html should not include stale cachebuster ${token}`);
}

console.log('cachebuster consistency static passed');
