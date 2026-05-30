const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert(main.includes('function getInventoryBulkSelectableRaritiesDom()'), 'bulk sell should derive selectable rarities from real inventory items');
assert(main.includes('const allRarities = getInventoryBulkSelectableRaritiesDom();'), 'inventory render should use dynamic rarity list for bulk actions');
assert(main.includes("if (!allRarities.includes(inventoryBulkRarity)) inventoryBulkRarity = allRarities[0] || '普通';"), 'bulk rarity fallback should choose first actual inventory rarity');
assert(main.includes('allRarities.map(rarity => `<option'), 'bulk select options should include actual item rarities, not only fixed CN defaults');
assert(main.includes('allRarities.map(rarity => {'), 'bulk rarity chips should include actual item rarities');
assert(main.includes('data-bulk-rarity-chip="${escapeHtml(rarity)}"'), 'bulk chips should preserve exact rarity values for action routing');
assert(main.includes('executeBulkInventoryActionDom(mode, rarity)'), 'confirm button should execute the selected bulk action');

const CURRENT_TOKEN = '20260530ascguard1';
const PREVIOUS_TOKEN = '20260527bulk' + 'sell1';
assert(html.includes(CURRENT_TOKEN), 'index cachebuster should use bulk sell fix token');
assert(!html.includes(PREVIOUS_TOKEN), 'index cachebuster should be bumped from inventory cleanup token');
for (const file of ['css/style.css', 'js/main.js']) {
  const re = new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=${CURRENT_TOKEN}`);
  assert(re.test(html), `${file} should use bulk sell fix cachebuster`);
}

console.log('inventory bulk sell static tests passed');
