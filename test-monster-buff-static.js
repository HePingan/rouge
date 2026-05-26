const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const entities = fs.readFileSync('js/entities.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert(entities.includes('Math.pow(depth, 1.30) * 0.026'), 'monster HP depth curve should be strengthened');
assert(entities.includes('Math.pow(depth, 1.24) * 0.018'), 'monster ATK depth curve should be strengthened');
assert(entities.includes('Math.pow(depth, 1.20) * 0.014'), 'monster DEF depth curve should be strengthened');
assert(entities.includes('hp * 1.22') && entities.includes('atk * 1.18') && entities.includes('def * 1.12'), 'boss scale should be stronger than normal monsters');
assert(entities.includes('hp: 2.05, atk: 1.42, def: 1.28'), 'elite multipliers should be stronger');
assert(entities.includes('eliteFury') && entities.includes('bossEnrage'), 'elite and boss extra skill ids should exist');
assert(entities.includes("if (isElite && !skillIds.includes('eliteFury')) skillIds.push('eliteFury')"), 'elite monsters should gain eliteFury automatically');
assert(entities.includes("if (template.isBoss && !skillIds.includes('bossEnrage')) skillIds.push('bossEnrage')"), 'bosses should gain bossEnrage automatically');
assert(combat.includes('function getEnemyAttackBuffMultiplier()'), 'combat should expose enemy attack buff multiplier');
assert(combat.includes('* getEnemyAttackBuffMultiplier()'), 'enemy damage should consume attack buffs');
assert(combat.includes('if (currentEnemy.isElite) chance += 0.08'), 'elite skill chance should be higher');
assert(combat.includes('if (currentEnemy.isBoss) chance += 0.16'), 'boss skill chance should be higher');
assert(combat.includes('攻击+${Math.round(buff.atkRatio * 100)}%'), 'self buff log should surface attack buffs');
assert(main.includes('getEnemyAttackBuffMultiplier'), 'combat UI should display buff-aware enemy attack');
assert(!html.includes('20260521bagequip1'), 'cachebuster should move past bag-equip token');
assert(!html.includes('20260521monsterbuff1'), 'cachebuster should move past monster-buff token');
assert(html.includes('20260526nexthint1'), 'index.html should use secret-realm cachebuster');

const context = {
  console,
  Math,
  ROOM_TYPE: { ELITE: 'elite' },
  TILE: { FLOOR: 1, STAIRS_DOWN: 3 },
};
vm.createContext(context);
vm.runInContext(entities + '\nthis.MONSTER_SKILLS = MONSTER_SKILLS; this.MONSTERS = MONSTERS; this.BOSSES = BOSSES; this.getMonsterScale = getMonsterScale; this.createScaledEnemy = createScaledEnemy; this.getEnemySkills = getEnemySkills;', context);

const s1 = context.getMonsterScale(1, false);
const s30 = context.getMonsterScale(30, false);
const boss30 = context.getMonsterScale(30, true);
assert(s30.hp > s1.hp * 8, 'deep floor HP scale should grow substantially');
assert(s30.atk > s1.atk * 5, 'deep floor ATK scale should grow substantially');
assert(boss30.hp > s30.hp && boss30.atk > s30.atk && boss30.def > s30.def, 'boss scale should exceed same-floor normal scale');

const elite = context.createScaledEnemy(context.MONSTERS[0], 10, {}, 1, 2, { isElite: true });
assert(elite.skillIds.includes('eliteFury'), 'created elite should include eliteFury');
assert(elite.maxHp > context.MONSTERS[0].hp * 3, 'created elite should have much higher HP than base template');

const boss = context.createScaledEnemy(context.BOSSES[1], 10, {}, 3, 4);
assert(boss.skillIds.includes('bossEnrage'), 'created boss should include bossEnrage');
assert(context.getEnemySkills(elite).some(s => s.name === '精英狂暴'), 'eliteFury should resolve to a real skill');
assert(context.getEnemySkills(boss).some(s => s.name === '首领威压'), 'bossEnrage should resolve to a real skill');

console.log('monster buff static tests passed');
