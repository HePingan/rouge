const fs = require('fs');
const assert = require('assert');

const readme = fs.readFileSync('README.md', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const scripts = [...index.matchAll(/<script src="([^"]+)"/g)].map(m => m[1].split('?')[0]);
const expectedScripts = [
  'js/debug.js',
  'js/dungeon.js',
  'js/stages.js',
  'js/entities.js',
  'js/combat.js',
  'js/loot.js',
  'js/artifacts.js',
  'js/skills.js',
  'js/alchemy.js',
  'js/ascension.js',
  'js/particles.js',
  'js/ui.js',
  'js/save.js',
  'js/secretRealms.js',
  'js/tribulation.js',
  'js/main.js',
];
assert.deepStrictEqual(scripts, expectedScripts, 'index.html script order changed unexpectedly');

for (const script of expectedScripts) {
  assert(readme.includes(`<script src="${script}"></script>`), `README script order missing ${script}`);
}

const requiredDocSnippets = [
  'stages.js      # 副本章节、关卡、扫荡、章节标题与材料来源',
  'artifacts.js   # 神器解锁、升级、觉醒与神器属性加成',
  'ascension.js   # 飞升三劫、叩仙门、仙躯、仙职、法则、仙魔战场',
  'secretRealms.js # 秘境入口、房间事件、难度、奖励与钥匙消耗',
  'tribulation.js # 天劫配置、词缀、敌人、奖励与失败惩罚',
  '当前内容规模',
  '35 个副本关卡',
  '4 类秘境',
  '4 档天劫',
  '5 件神器',
  'for f in test-*.js; do node "$f" || exit 1; done',
  '移动端冒烟',
];
for (const snippet of requiredDocSnippets) {
  assert(readme.includes(snippet), `README missing required snippet: ${snippet}`);
}

console.log('README entrypoint sync static tests passed');
