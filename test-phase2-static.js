const fs = require('fs');
const vm = require('vm');
const path = require('path');

function createBaseContext() {
  const consoleErrors = [];
  const context = {
    console: {
      ...console,
      error(...args) {
        consoleErrors.push(args.join(' '));
        console.error(...args);
      },
    },
    window: { innerWidth: 390, innerHeight: 844, addEventListener() {}, dispatchEvent() {} },
    document: {
      body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild() {} },
      documentElement: { clientWidth: 390, clientHeight: 844 },
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      createElement() { return { addEventListener() {}, classList: { add() {}, remove() {} }, style: {}, appendChild() {}, querySelector() { return null; }, querySelectorAll() { return [] } }; },
      addEventListener() {},
    },
    navigator: { maxTouchPoints: 1 },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    setTimeout() { return 0; },
    clearTimeout() {},
    requestAnimationFrame() {},
    Math,
  };
  vm.createContext(context);
  const files = ['js/dungeon.js', 'js/stages.js', 'js/entities.js', 'js/loot.js', 'js/alchemy.js', 'js/combat.js', 'js/secretRealms.js', 'js/main.js'];
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context, { filename: file });
  }
  if (consoleErrors.some(msg => msg.includes('[致命]'))) {
    throw new Error(`main.js emitted fatal load-order errors in VM harness: ${consoleErrors.join(' | ')}`);
  }
  return context;
}

function runGameTest(testSource) {
  const context = createBaseContext();
  vm.runInContext(`
    function assert(condition, message) { if (!condition) throw new Error(message); }
    function silenceBrowserSideEffects() {
      showMessage = function() {};
      autoSave = function() {};
      updateUI = function() {};
      resetDomMapCache = function() {};
      sfxDrop = function() {};
      spawnDeathEffect = function() {};
    }
    ${testSource}
  `, context);
}

runGameTest(`
  silenceBrowserSideEffects();
  dungeonLevel = 3;
  player = new Player();
  playerMaterials = {};
  generateNewFloor();
  const treasureRoom = dungeon.rooms.find(r => r.type === ROOM_TYPE.TREASURE);
  assert(treasureRoom, 'dungeon should mark a treasure room');
  assert(Array.isArray(dungeon._chests), 'generateNewFloor should create dungeon._chests array');
  assert(dungeon._chests.length >= 1, 'treasure room should spawn at least one chest');
  const chest = dungeon._chests[0];
  assert(chest.x >= treasureRoom.x && chest.x < treasureRoom.x + treasureRoom.w, 'chest should be inside treasure room x bounds');
  assert(chest.y >= treasureRoom.y && chest.y < treasureRoom.y + treasureRoom.h, 'chest should be inside treasure room y bounds');
  const beforeInv = player.inventory.length;
  const beforeStones = player.spiritStones;
  player.x = chest.x;
  player.y = chest.y;
  const opened = checkTreasureChestPickup();
  assert(opened === true, 'standing on chest should open it');
  assert(dungeon._chests.length === 0, 'opened chest should be removed');
  assert(player.inventory.length > beforeInv, 'chest should award equipment');
  assert(player.spiritStones > beforeStones, 'chest should award spirit stones');
`);

runGameTest(`
  silenceBrowserSideEffects();
  dungeonLevel = 4;
  player = new Player();
  playerMaterials = {};
  generateNewFloor();
  const eliteRoom = dungeon.rooms.find(r => r.type === ROOM_TYPE.ELITE);
  assert(eliteRoom, 'dungeon should mark an elite room');
  const eliteEntry = [...dungeon._monsters.entries()].find(([, mon]) => mon.isElite);
  assert(eliteEntry, 'elite room should spawn one elite monster');
  const [key, mon] = eliteEntry;
  const [x, y] = key.split(',').map(Number);
  assert(x >= eliteRoom.x && x < eliteRoom.x + eliteRoom.w && y >= eliteRoom.y && y < eliteRoom.y + eliteRoom.h, 'elite monster should be inside elite room');
  assert(mon.maxHp > 0 && mon.hp === mon.maxHp, 'elite monster should have valid hp');
  assert(mon.eliteRewardMult > 1, 'elite monster should carry reward multiplier');
`);

console.log('phase2 static tests passed');
