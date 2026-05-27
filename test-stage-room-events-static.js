const fs = require('fs');
const assert = require('assert');

const stages = fs.readFileSync('js/stages.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const CURRENT_TOKEN = '20260527invfix1';
const PREVIOUS_TOKEN = '20260525demonstate' + '1';

for (const key of ['STAGE_ROOM_EVENTS', 'treasure', 'rest', 'trap', 'fortune']) {
  assert(stages.includes(key), `missing room event data: ${key}`);
}
assert(stages.includes('function getStageRoomEventType'), 'room event resolver missing');
assert(stages.includes('lastRoomEvents'), 'stage event save field missing');
assert(main.includes('function applyStageRoomEvent'), 'room event runtime helper missing');
assert(main.includes("['treasure', 'rest', 'trap', 'fortune'].includes(event.type)"), 'non-combat room monster skip missing');
assert(main.includes('pushStageEventLog'), 'room event logging missing');
assert(main.includes('房间事件：'), 'clear summary room event display missing');
assert(!index.includes(PREVIOUS_TOKEN), 'index should not keep stale demonstate token');
assert(index.includes(`js/stages.js?v=${CURRENT_TOKEN}`), 'stage cachebuster missing');
console.log('stage room events static ok');
