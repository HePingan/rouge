const fs = require('fs');
const assert = require('assert');

const entities = fs.readFileSync('js/entities.js', 'utf8');
const alchemy = fs.readFileSync('js/alchemy.js', 'utf8');
const stages = fs.readFileSync('js/stages.js', 'utf8');

for (const skill of ['wolfHowl', 'bloodBurst', 'bloodDrain', 'thunderParalyze']) {
  assert(entities.includes(skill), `monster skill missing: ${skill}`);
}
for (const mat of ['qingyun_fur', 'blood_crystal', 'thunder_core']) {
  assert(alchemy.includes(mat), `material missing: ${mat}`);
  assert(stages.includes(mat), `stage reward missing: ${mat}`);
}
assert(stages.includes("mechanics: ['狼王号令"), 'qingyun boss mechanics missing');
assert(stages.includes("mechanics: ['血祭汲取"), 'blood boss mechanics missing');
assert(stages.includes("mechanics: ['雷击预警"), 'thunder boss mechanics missing');
console.log('stage boss/drop static ok');
