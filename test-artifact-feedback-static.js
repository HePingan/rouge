const fs = require('fs');
const assert = require('assert');

const combat = fs.readFileSync('js/combat.js', 'utf8');
const loot = fs.readFileSync('js/loot.js', 'utf8');
const particles = fs.readFileSync('js/particles.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert(combat.includes('function notifyArtifactTrigger'), 'combat should centralize artifact trigger feedback');
assert(combat.includes('spawnArtifactTriggerEffect'), 'artifact trigger feedback should spawn a lightweight visual effect');
assert(combat.includes('诛仙剑气') && combat.includes('雷罚天雷'), 'attack artifact labels should stay visible in combat feedback');
assert(combat.includes("label: '昊天塔护体'"), 'death-save should use explicit artifact feedback copy');
assert(combat.includes("label: '乾坤镜机缘回响'"), 'treasure echo should show explicit artifact feedback copy');
assert(combat.includes('机缘回响：${echoDrop.name}'), 'victory reward message should mention treasure echo drops');
assert(loot.includes('function generateArtifactTreasureEchoDrop'), 'loot should implement qiankun treasure echo drop generator');
assert(loot.includes("getActiveArtifact(p)?.id !== 'qiankun'"), 'treasure echo should only trigger for active qiankun mirror');
assert(particles.includes('function spawnArtifactTriggerEffect'), 'particles should expose artifact trigger visual helper');

for (const file of ['css/style.css', 'js/combat.js', 'js/loot.js', 'js/artifacts.js', 'js/particles.js', 'js/main.js']) {
  const re = new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=20260526nexthint1`);
  assert(re.test(html), `${file} should use artifact feedback cachebuster`);
}

console.log('artifact feedback static tests passed');
