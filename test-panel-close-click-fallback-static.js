const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');

const stageEnsureStart = main.indexOf('function ensureStageDomPanel()');
const stageEnsureEnd = main.indexOf('function addStageEquipmentReward', stageEnsureStart);
assert(stageEnsureStart >= 0 && stageEnsureEnd > stageEnsureStart, 'ensureStageDomPanel block should exist');
const stageEnsure = main.slice(stageEnsureStart, stageEnsureEnd);
assert(stageEnsure.includes("p.addEventListener('click'"), 'stage panel should have a delegated click close fallback for desktop/browser automation');
assert(stageEnsure.includes("p.addEventListener('pointerdown'"), 'stage panel should close immediately on pointerdown for mobile');
assert(stageEnsure.includes("p.addEventListener('touchstart'"), 'stage panel should close immediately on touchstart for older mobile browsers');
assert(stageEnsure.includes(".closest('.pclose')") && stageEnsure.includes("[data-stage-close]"), 'stage delegated close handler should target pclose and result close buttons');

const srEnsureStart = main.indexOf('function ensureSecretRealmDomPanel()');
const srEnsureEnd = main.indexOf('function renderSecretRealmDomPanel()', srEnsureStart);
assert(srEnsureStart >= 0 && srEnsureEnd > srEnsureStart, 'ensureSecretRealmDomPanel block should exist');
const srEnsure = main.slice(srEnsureStart, srEnsureEnd);
assert(srEnsure.includes("p.addEventListener('click'"), 'secret realm panel should have a delegated click close fallback');
assert(srEnsure.includes("p.addEventListener('pointerdown'"), 'secret realm panel should close immediately on pointerdown for mobile');
assert(srEnsure.includes("p.addEventListener('touchstart'"), 'secret realm panel should close immediately on touchstart for older mobile browsers');
assert(srEnsure.includes(".closest('.pclose')") && srEnsure.includes(".closest('.sr-close')"), 'secret realm delegated close handler should target pclose and result close buttons');

const ascEnsureStart = main.indexOf('function ensureAscensionDomPanel()');
const ascEnsureEnd = main.indexOf('function getEquippedWeaponForAscension()', ascEnsureStart);
assert(ascEnsureStart >= 0 && ascEnsureEnd > ascEnsureStart, 'ensureAscensionDomPanel block should exist');
const ascEnsure = main.slice(ascEnsureStart, ascEnsureEnd);
assert(ascEnsure.includes("p.addEventListener('click'"), 'ascension panel should have a delegated click close fallback for desktop/browser automation');
assert(ascEnsure.includes("p.addEventListener('pointerdown'"), 'ascension panel should close immediately on pointerdown for mobile');
assert(ascEnsure.includes("p.addEventListener('touchstart'"), 'ascension panel should close immediately on touchstart for older mobile browsers');
assert(ascEnsure.includes(".closest('.pclose')"), 'ascension delegated close handler should target pclose after innerHTML re-renders');

console.log('panel close click fallback static tests passed');
