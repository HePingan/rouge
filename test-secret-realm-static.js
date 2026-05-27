const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const secretRealms = fs.readFileSync('js/secretRealms.js', 'utf8');
const alchemy = fs.readFileSync('js/alchemy.js', 'utf8');
const skills = fs.readFileSync('js/skills.js', 'utf8');
const entities = fs.readFileSync('js/entities.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

// 1. Data definitions
assert(secretRealms.includes('const SECRET_REALMS'), 'SECRET_REALMS should be defined');
assert(secretRealms.includes('const SECRET_REALM_DIFFICULTIES'), 'difficulties should be defined');
assert(secretRealms.includes('const SECRET_REALM_KEYS'), 'keys should be defined');
assert(secretRealms.includes('const SECRET_REALM_EVENTS'), 'events should be defined');

// 2. No pet references
assert(!secretRealms.includes('pet'), 'secret realm data should not reference pet system');
assert(!skills.includes('宠物蛋'), 'REALM_UNLOCKS should not mention pet egg');

// 3. Secret realm unlocks in REALM_UNLOCKS
assert(skills.includes('秘境钥匙开始掉落'), 'realm 5 should mention secret realm keys');
assert(skills.includes('灵草秘境·炼器秘境开放'), 'realm 6 should open herb and forge realms');
assert(skills.includes('神器秘境·天劫秘境开放'), 'realm 8 should open artifact and tribulation realms');

// 4. Key materials in MATERIALS
assert(alchemy.includes("id: 'secret_key_herb'"), 'MATERIALS should include herb key');
assert(alchemy.includes("id: 'secret_key_forge'"), 'MATERIALS should include forge key');
assert(alchemy.includes("id: 'secret_key_artifact'"), 'MATERIALS should include artifact key');
assert(alchemy.includes("id: 'tribulation_mark'"), 'MATERIALS should include tribulation mark');

// 5. Player fields
assert(entities.includes('secretRealmKeys'), 'Player should have secretRealmKeys');
assert(entities.includes('secretRealmClears'), 'Player should have secretRealmClears');
assert(entities.includes('secretRealmProgress'), 'Player should have secretRealmProgress');

// 6. Panel and UI
assert(main.includes('showSecretRealmUI'), 'secret realm UI flag should exist');
assert(main.includes('renderSecretRealmDomPanel'), 'render function should exist');
assert(main.includes('ensureSecretRealmDomPanel'), 'ensure function should exist');
assert(main.includes('enterSecretRealm'), 'enter function should exist');
assert(main.includes('advanceSecretRealmNode'), 'advance function should exist');
assert(main.includes('onSecretRealmComplete'), 'complete handler should exist');
assert(html.includes('btn-secret-realm'), 'more-menu should have secret realm button');

// 7. Combat integration
assert(combat.includes('isInSecretRealm'), 'combat should know about secret realm flag');
assert(combat.includes('secretRealmNodeIndex'), 'combat should track node index');
assert(combat.includes('secretRealmNodeCount'), 'combat should track node count');

// 8. Both onVictory and onDefeat handle secret realm
assert(combat.includes("if (isInSecretRealm && currentEnemy)"), 'onVictory should check secret realm');
assert(combat.includes("if (isInSecretRealm)"), 'onDefeat should check secret realm');

// 9. Save integration
const save = fs.readFileSync('js/save.js', 'utf8');
assert(save.includes('secretRealmClears'), 'save should persist clear data');

// 10. CSS
const css = fs.readFileSync('css/style.css', 'utf8');
assert(css.includes('secretrealm-dom-panel'), 'CSS should style secret realm panel');

// 11. Index script order
const secretRealmScriptIdx = html.indexOf('secretRealms.js');
const mainScriptIdx = html.indexOf('main.js');
assert(secretRealmScriptIdx > 0 && mainScriptIdx > secretRealmScriptIdx, 'secretRealms.js should load before main.js');

// 12. VM integration test
const artifactData = fs.readFileSync('js/artifacts.js', 'utf8');

const context = {
  console, Math, Array,
  REALMS: [
    { name: '炼气期', xpNeeded: 80, hpMult: 1.0, mpMult: 1.0, atkBonus: 0, defBonus: 0 },
    { name: '筑基期', xpNeeded: 250, hpMult: 1.4, mpMult: 1.2, atkBonus: 4, defBonus: 2 },
    { name: '金丹期', xpNeeded: 550, hpMult: 2.0, mpMult: 1.6, atkBonus: 10, defBonus: 6 },
    { name: '元婴期', xpNeeded: 1200, hpMult: 2.8, mpMult: 2.2, atkBonus: 20, defBonus: 12 },
    { name: '化神期', xpNeeded: 2400, hpMult: 3.8, mpMult: 3.2, atkBonus: 32, defBonus: 22 },
    { name: '炼虚期', xpNeeded: 4800, hpMult: 5.0, mpMult: 4.4, atkBonus: 48, defBonus: 34 },
    { name: '合体期', xpNeeded: 9000, hpMult: 6.4, mpMult: 5.8, atkBonus: 68, defBonus: 50 },
    { name: '大乘期', xpNeeded: 16000, hpMult: 8.0, mpMult: 7.4, atkBonus: 94, defBonus: 70 },
    { name: '渡劫期', xpNeeded: 28000, hpMult: 10.0, mpMult: 9.3, atkBonus: 128, defBonus: 96 },
    { name: '真仙境', xpNeeded: 48000, hpMult: 12.5, mpMult: 11.6, atkBonus: 172, defBonus: 130 },
  ],
  ARTIFACT_MATERIALS: [],
  MATERIALS: [],
};
vm.createContext(context);
vm.runInContext(`${artifactData}\nthis.ARTIFACT_MATERIALS = ARTIFACT_MATERIALS;`, context);
context.MATERIALS = context.ARTIFACT_MATERIALS;
vm.runInContext(`
  ${secretRealms}
  this.SECRET_REALMS = SECRET_REALMS;
  this.SECRET_REALM_DIFFICULTIES = SECRET_REALM_DIFFICULTIES;
  this.SECRET_REALM_KEYS = SECRET_REALM_KEYS;
  this.getSecretRealmKeyInfo = getSecretRealmKeyInfo;
  this.getSecretRealmEntryCost = getSecretRealmEntryCost;
  this.hasSecretRealmEntry = hasSecretRealmEntry;
  this.paySecretRealmEntry = paySecretRealmEntry;
  this.getSecretRealmMaterialName = getSecretRealmMaterialName;
  this.getSecretRealmPreview = getSecretRealmPreview;
  this.getSecretRealmRewards = getSecretRealmRewards;
`, context);

assert(Object.keys(context.SECRET_REALMS).length >= 3, 'should have at least 3 secret realms');
assert(Object.keys(context.SECRET_REALM_DIFFICULTIES).length === 3, 'should have 3 difficulties');

// Test entry check
const player = { realmIndex: 0, spiritStones: 100 };
const materials = {};
assert(!context.hasSecretRealmEntry(player, 'herb', 'normal', materials).ok, '炼气期 should not enter herb realm');
player.realmIndex = 1;
assert(context.hasSecretRealmEntry(player, 'herb', 'normal', materials).ok, '筑基期 should enter herb realm with stones');
assert(context.paySecretRealmEntry(player, 'herb', 'normal', materials), 'should pay 50 stones');
assert.strictEqual(player.spiritStones, 50, 'stones should be deducted');

// Regression: hard/hell key requirement must show readable Chinese names, never raw ids like secret_key_herb.
const hardNoKey = context.hasSecretRealmEntry(player, 'herb', 'hard', materials);
assert(!hardNoKey.ok, 'hard difficulty should require the realm token when no key is available');
assert(hardNoKey.reason.includes('灵草秘境令'), 'missing key reason should use readable key name');
assert(!hardNoKey.reason.includes('secret_key_herb'), 'missing key reason should not expose raw key id');
assert(hardNoKey.hint.includes('困难/炼狱'), 'missing key reason should explain hard/hell requirement');
materials.secret_key_herb = 1;
const hardWithKey = context.hasSecretRealmEntry(player, 'herb', 'hard', materials);
assert(hardWithKey.ok, 'hard difficulty should allow entry with a realm token');
assert.strictEqual(hardWithKey.costText, '🌿灵草秘境令 x1', 'cost text should be readable');

// Regression: realm tokens must have real obtainable sources, and normal clears should seed tokens for hard/hell.
for (const keyId of ['secret_key_herb', 'secret_key_forge', 'secret_key_artifact', 'tribulation_mark']) {
  assert(new RegExp(`id: '${keyId}'[\\s\\S]*?source:`).test(alchemy), `${keyId} should expose a readable source in the materials panel`);
}
assert(main.includes('function materialSourceTextDom'), 'materials panel should render source text for materials/tokens');
assert(main.includes('来源：'), 'material cards should label the source instead of only use text');
assert(secretRealms.includes('tokenChanceByDifficulty'), 'secret realm reward logic should include realm-token drop chances by difficulty');
assert(secretRealms.includes('materials.push({ id: realm.keyId'), 'secret realm clears should actually award the matching realm token');

// Test rewards
const rewards = context.getSecretRealmRewards(player, 'herb', 'normal', true);
assert(rewards.xp > 0, 'rewards should include xp');
assert(rewards.spiritStones > 0, 'rewards should include stones');
assert(rewards.materials.some(mat => mat.id === 'secret_key_herb'), 'first herb realm clear should grant a herb token for higher difficulties');

// Regression: altar rewardBoost is a bonus ratio, so 0.30 means 130% rewards, not 30% rewards
const boosted = { realmIndex: 1, spiritStones: 100, _secretRealmBuff: { rewardBoost: 0.30 } };
const boostedRewards = context.getSecretRealmRewards(boosted, 'herb', 'normal', false);
assert.strictEqual(boostedRewards.xp, 104, 'rewardBoost 0.30 should increase 80 base xp to 104');
assert.strictEqual(boostedRewards.spiritStones, 78, 'rewardBoost 0.30 should increase 60 base stones to 78');

// Secret realm optimization: previews should expose real readable rewards/risk instead of requiring blind entry.
const preview = context.getSecretRealmPreview({ realmIndex: 1, spiritStones: 100, secretRealmClears: {} }, 'herb', 'normal', {});
assert(preview.entry.ok, 'preview should include entry status');
assert.strictEqual(preview.rooms, context.SECRET_REALMS.herb.rooms, 'preview should include node count');
assert(preview.featured.includes('灵草'), 'preview should include readable featured drops');
assert(preview.materialLines.some(line => line.includes('灵草')), 'preview should include material reward range');
assert(preview.danger.includes('生命×'), 'preview should explain risk multipliers');
const artifactPreview = context.getSecretRealmPreview({ realmIndex: 4, spiritStones: 100, secretRealmClears: {} }, 'artifact', 'normal', {});
assert(artifactPreview.featured.includes('碎片'), 'artifact realm preview should advertise usable artifact shards');
assert(!artifactPreview.featured.includes('神器尘'), 'artifact realm preview should not advertise unused artifact dust');
assert(artifactPreview.materialLines.some(line => line.includes('碎片')), 'artifact realm reward ranges should include usable shards');
const artifactRewards = context.getSecretRealmRewards({ realmIndex: 4, spiritStones: 100 }, 'artifact', 'normal', true);
assert(artifactRewards.materials.length > 0, 'artifact realm should grant artifact materials on clear');
assert(artifactRewards.materials.every(mat => mat.id.startsWith('artifact_shard_') || mat.id === 'artifact_essence' || mat.id === 'artifact_core' || mat.id === 'secret_key_artifact'), 'artifact realm rewards should only use real artifact upgrade materials plus its own realm token');
assert(!JSON.stringify(context.SECRET_REALMS.artifact).includes('artifact_dust'), 'artifact_dust should not remain in artifact realm data');
assert(!secretRealms.includes('神器尘'), 'secret realm copy should not mention unused artifact dust');
assert(!main.includes('神器尘'), 'main UI copy should not mention unused artifact dust');
assert(!save.includes('神器尘'), 'save migration comments/copy should not leak unused artifact dust label');
assert(main.includes("MATERIALS.filter(mat => mat?.id !== 'artifact_dust')"), 'materials panel should hide legacy artifact_dust definitions');
assert(main.includes('playerMaterials = normalizeMaterialIds(playerMaterials)'), 'materials panel should normalize legacy artifact_dust before rendering');
assert(secretRealms.includes('featuredDrops'), 'realm metadata should include featured drop hints');
assert(secretRealms.includes('getSecretRealmMaterialName'), 'secret realm should provide readable material names');
assert(main.includes('sr-preview'), 'secret realm panel should render selected realm preview');
assert(main.includes('lastSecretRealmRun'), 'secret realm panel should show last run summary');
assert(css.includes('sr-layout'), 'secret realm CSS should use a list + preview layout');
assert(css.includes('sr-card-drops'), 'realm cards should show concise drop hints');
assert(css.includes('@media (max-width: 620px)'), 'secret realm UI should remain mobile responsive');
assert(entities.includes('lastSecretRealmRun'), 'Player should have last secret realm run summary');
assert(save.includes('lastSecretRealmRun'), 'save should persist last secret realm run summary');
assert(html.includes('20260527invfix1'), 'index cache version should be bumped for secret realm result panel');
assert(!html.includes('20260524secretQuick2'), 'previous secret realm quick cache version should be removed');
assert(!html.includes('20260524secretQuick1'), 'older secret realm quick cache version should be removed');
assert(!html.includes('20260524secretRealmOpt1'), 'old secret realm cache version should be removed');

// Regression: secret realm events must be wired into actual node advancement, not dead data
assert(main.includes('generateSecretRealmRoomEvents'), 'advanceSecretRealmNode should roll non-boss secret realm events');
assert(main.includes('event.apply(player)'), 'secret realm events should apply their effect before combat');
assert(combat.includes('_secretRealmDebuffs'), 'combat damage multiplier should apply secret realm debuffs such as takenDmgUp');
assert(combat.includes('onSecretRealmDefeat'), 'defeat should call failure handler, not completion rewards');
assert(!combat.includes('onSecretRealmComplete();\n    }, 500);'), 'defeat path must not call complete handler');
assert(main.includes('_savedDungeonBeforeSecretRealm'), 'secret realm should save and restore the real dungeon');

// Regression: realm cards should select first; the footer button should be the only explicit enter action.
// The previous UI displayed “选择秘境进入” but the button had no handler, while tapping a card entered immediately.
assert(main.includes('selectSecretRealm'), 'secret realm panel should have an explicit selection helper');
assert(main.includes('selectedRealmId'), 'render should track selected realm id');
assert(main.includes('data-sr-selected'), 'realm cards should expose selected state for styling/tests');
assert(main.includes("p.querySelector('.sr-enter-btn')"), 'footer enter button should have a click/touch handler');
assert(main.includes('enterSecretRealm(secretRealmSelectedId'), 'enter button should enter the selected realm');
assert(main.includes('sr-cost-hint'), 'secret realm panel should show readable cost/requirement hint');
assert(main.includes('costText'), 'secret realm panel should use readable cost text instead of raw ids');
assert(main.includes('function closeSecretRealmPanel'), 'secret realm close should use a dedicated immediate close helper');
assert(main.includes("p.addEventListener('pointerdown', onCloseHit"), 'secret realm close should respond on pointerdown instead of waiting for delayed click');
assert(main.includes("if (p) p.style.display = 'none'"), 'secret realm close should hide the panel immediately before broader sync');
assert(!main.includes('enterSecretRealm(realmId, secretRealmSelectedDifficulty);\n      });\n      card.addEventListener'), 'card click should not immediately enter before explicit confirmation');

// Regression: active secret realm runs should support an in-run quick challenge action, distinct from stage sweep/quick-clear.
assert(html.includes('btn-secret-quick-challenge'), 'HUD should include a secret realm quick challenge button');
assert(html.includes('btn-secret-exit'), 'HUD should include a secret realm exit button');
assert(main.includes('quickChallengeSecretRealm'), 'main should expose secret realm quick challenge handler');
assert(main.includes('buildSecretRealmEnemy'), 'quick challenge should reuse shared secret realm enemy creation');
assert(main.includes('window.grantSecretRealmNodeRewards = grantSecretRealmNodeRewards'), 'quick challenge should settle per-node rewards consistently and expose it to combat');
assert(main.includes('secretRealmResultPanel'), 'secret realm completion should render a result panel instead of only flashing a toast');
assert(main.includes('sr-result'), 'secret realm result panel should have dedicated result markup');
assert(css.includes('sr-result-grid'), 'secret realm result panel should style reward totals');
assert(combat.includes('grantSecretRealmNodeRewards(currentEnemy'), 'manual secret realm combat should use the same node reward summary as quick challenge');
assert(main.includes('applySecretRealmEventForNode'), 'quick challenge should apply secret realm node events');
assert(main.includes('secret-realm-run-active'), 'body should expose active secret realm run class');
assert(main.includes("document.getElementById('btn-secret-quick-challenge')"), 'quick challenge button should be bound');
assert(main.includes("document.getElementById('btn-secret-exit')"), 'secret realm exit button should be bound');
assert(main.includes("Date.now() - secretQuickLastTouchAt < 700"), 'quick challenge touch/click should suppress synthetic double fire');
assert(main.includes('sr-run-quick'), 'secret realm in-run panel should expose quick challenge action');
assert(main.includes('sr-quick-enter-btn'), 'secret realm selection footer should expose pre-entry quick challenge');
assert(main.includes('enterSecretRealm(secretRealmSelectedId, secretRealmSelectedDifficulty, true)'), 'pre-entry quick challenge should start realm in quick mode before combat begins');
assert(main.includes('quickMode = false'), 'enterSecretRealm should support normal and quick modes');
assert(main.includes('rendering an intermediate “结算中” state still produces a visible one-frame flash'), 'quick mode should not render an intermediate pending result state');
assert(main.includes('if (typeof quickChallengeSecretRealm === \'function\') quickChallengeSecretRealm();\n      return;'), 'quick mode should settle synchronously without hiding/reopening the panel');
assert(main.includes('applySecretRealmEventForNode(realm, idx, { silent: true })'), 'quick challenge should not stack event toasts behind the result panel');
assert(main.includes('if (!showSecretRealmUI) showMessage(`⚡ 快速挑战'), 'quick challenge should suppress redundant toast while the result panel is visible');
assert(css.includes('.secret-quick-btn'), 'CSS should style secret realm quick challenge button');
assert(css.includes('sr-enter-actions'), 'CSS should lay out normal enter and quick enter buttons');
assert(css.includes('secret-realm-run-active:not(.combat-active):not(.panel-open) .secret-quick-btn'), 'CSS should show quick button only during active non-combat realm runs');
assert(css.includes('sr-progress-actions'), 'CSS should style in-run secret realm quick actions');

console.log('secret realm static tests passed');
