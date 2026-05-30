const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-verify.html', 'utf8');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260526closeright1';

assert(main.includes('data-asc-resource-source'), 'ascension resource guide rows should expose actionable source jump buttons');
assert(main.includes('getAscensionResourceStageSources'), 'ascension resource guide should derive concrete stage sources from stage rewards');
assert(main.includes('openAscensionResourceStageSource'), 'ascension source buttons should route into the stage panel');
assert(/selectedStageId\s*=\s*stageId/.test(main), 'ascension source route should select the concrete source stage');
assert(/player\.stageProgress\.selectedStageId\s*=\s*stageId/.test(main), 'ascension source route should persist selected stage');
assert(/selectedStageChapterId\s*=\s*STAGES\[stageId\]\?\.chapterId/.test(main), 'ascension source route should switch chapter to source stage chapter');
assert(/popPanelFromStack\('ascension'\)/.test(main), 'ascension source route should pop ascension from panel stack');
assert(/pushPanelToStack\('stages'\)/.test(main), 'ascension source route should push stages onto panel stack');
assert(/stageDetailOpen\s*=\s*true/.test(main), 'ascension source route should keep target stage detail open');
assert(main.includes("[data-asc-resource-source]"), 'ascension source buttons should be bound after render');
assert(main.includes('immortal_refine_stone') && main.includes('ascension_trial_token') && main.includes('demon_war_banner'), 'key late-game materials should keep guide coverage');

assert(css.includes(`Ascension Resource Source Navigation ${CURRENT_TOKEN}`), 'CSS should include current ascension source navigation marker');
assert(css.includes('.asc-source-actions') && css.includes('.asc-source-btn'), 'CSS should style compact ascension source buttons');

const tokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(tokens.length > 0, 'index should link versioned assets');
assert(tokens.every(token => token === CURRENT_TOKEN), `all linked assets should use ${CURRENT_TOKEN}`);
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep previous cache token');
assert(mobile.includes(CURRENT_TOKEN), 'mobile verify should load current ascension source token');
assert(!mobile.includes(PREVIOUS_TOKEN), 'mobile verify should not keep previous cache token');

console.log('ascension resource source navigation static tests passed');
