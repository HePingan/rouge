const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260526stagehead1';

function mustMatch(re, label) {
  assert(re.test(main), label);
}

mustMatch(/<div class="sr-head">[\s\S]*<b>🏞️ 秘境<\/b>[\s\S]*<span class="sr-sub">短副本 · 材料定向刷取<\/span>[\s\S]*<span class="pclose"[^>]*>×<\/span>[\s\S]*<\/div>/, 'secret realm main header should put close after title/subtitle so CSS can pin it top-right');
mustMatch(/<div class="sr-progress-head">[\s\S]*<b>🏞️ \$\{escapeHtml\(realmName\)\}<\/b>[\s\S]*<span class="pclose"[^>]*>×<\/span>[\s\S]*<\/div>/, 'secret realm progress header should put close after title');
assert(!main.includes('<div class="sr-head">\n      <span class="pclose">×</span>\n      <b>🏞️ 秘境</b>'), 'secret realm should not keep left-side close before the title');

mustMatch(/<div class="trib-head"><b>⚡ 天劫<\/b><span>[\s\S]*<\/span><button class="pclose"[^>]*>×<\/button><\/div>/, 'tribulation header should put close after title/meta');
assert(!main.includes('<div class="trib-head"><button class="pclose" type="button">×</button><b>⚡ 天劫</b>'), 'tribulation should not keep left-side close before the title');

mustMatch(/<div class="asc-head"><b>☁️ 飞升仙界<\/b><span>[\s\S]*<\/span><button class="pclose"[^>]*>×<\/button><\/div>/, 'ascension header should put close after title/meta');
assert(!main.includes('<div class="asc-head"><button class="pclose" type="button">×</button><b>☁️ 飞升仙界</b>'), 'ascension should not keep left-side close before the title');

assert(/\.panel-head,\s*#secretrealm-dom-panel \.sr-head,\s*#tribulation-dom-panel \.trib-head,\s*#ascension-dom-panel \.asc-head \{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*auto\) 34px/.test(css), 'shared panel headers should use grid with a fixed right close column');
assert(/\.panel-head \.pclose,[\s\S]*#secretrealm-dom-panel \.sr-head \.pclose,[\s\S]*#tribulation-dom-panel \.trib-head \.pclose,[\s\S]*#ascension-dom-panel \.asc-head \.pclose \{[\s\S]*grid-column:\s*3[\s\S]*justify-self:\s*end/.test(css), 'shared close buttons should pin to grid column 3/right edge');

const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length > 0, 'index should link versioned assets');
assert(linkedTokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale stagehead cachebuster');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify iframe should use current close-right token');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify iframe should not keep stale stagehead token');
assert(css.includes(`Global Panel Close Right ${CURRENT_TOKEN}`), 'CSS marker should bump for global close-right pass');

console.log('global panel close-right static tests passed');
