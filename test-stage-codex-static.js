const fs = require('fs');
const assert = require('assert');

const stages = fs.readFileSync('js/stages.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(stages.includes('function getStageCodexSummary'), 'stage codex summary helper missing');
assert(stages.includes('claimable'), 'codex claimable chapter status missing');
assert(stages.includes('sweepable'), 'codex sweepable count missing');
assert(main.includes('function getStageCodexDom'), 'stage codex dom helper missing');
assert(main.includes('📖 副本图鉴'), 'codex title missing');
assert(main.includes('推荐下一关'), 'codex next stage guidance missing');
assert(main.includes('下一步挑战') && main.includes('codex-guide-card primary'), 'codex should provide a tappable next-step challenge card');
assert(main.includes('<div class="stage-guide-strip"') && main.includes('下一步：'), 'stage selector should show a compact next-step guide above stage cards');
assert(main.includes('<div class="stage-body stage-codex-body"') && main.includes('${getStageCodexDom()}</div>'), 'codex tab body should render the codex DOM');
assert(css.includes('.stage-guide-strip'), 'stage next-step guide css missing');
assert(css.includes('.stage-codex'), 'codex css missing');
assert(css.includes('.codex-stats'), 'codex stat css missing');
const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === '20260530ascguard1'), 'all linked assets should use current panel audit cachebuster');
assert(!index.includes('20260527detailfix1'), 'index should not keep stale detailfix token');

console.log('stage codex static ok');
