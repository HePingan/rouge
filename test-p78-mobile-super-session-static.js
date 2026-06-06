const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('test-p78-mobile-super-session-browser-smoke.html', 'utf8');
const js = fs.readFileSync('test-p78-mobile-super-session-browser-smoke.js', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');

assert(html.includes('index.html?v=20260606safearea6'), 'P78 smoke should use current cachebuster token');
assert(html.includes('stage-run-active') && html.includes('combatStep') && html.includes('equipStep') && html.includes('skillStep') && html.includes('ascensionSourceStep'), 'P78 should cover movement/combat/equip/skill/ascension chain');
assert(html.includes('__p78Errors') && html.includes('overflowX') && html.includes('movementBlocked'), 'P78 should guard console errors, horizontal overflow, and movement blocking');
assert(html.includes('[data-char-equip-slot="armor"]') && html.includes('[data-confirm-equip-index]'), 'P78 should use real character slot and equip confirmation controls');
assert(html.includes('[data-char-build-jump]') && html.includes('.skill-learn-btn:not(:disabled)'), 'P78 should use real build jump and learn controls');
assert(html.includes('[data-asc-resource-source]') && html.includes('[data-stage-enter]:not([disabled])'), 'P78 should use real ascension source and enabled stage enter controls');
assert(js.includes('/__result') && js.includes('timeout waiting for p78 mobile super session result'), 'P78 node wrapper should receive beacon-backed result');
assert(/player\?\.realm\?\.name/.test(ui) && /REALMS\?\.\[player\?\.realmIndex\]\?\.name/.test(ui), 'HUD realm text should tolerate seeded high realmIndex without player.realm object');
assert(/realmForXp/.test(ui) && /realmForXp\.xpNeeded/.test(ui), 'HUD xp budget should tolerate missing player.realm object');
console.log('p78 super session static passed');
