const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');

assert(
  /<div id="more-menu"[^>]*aria-hidden="true"[^>]*\binert\b/.test(html),
  'closed mobile more menu should be inert on first paint so hidden buttons cannot receive focus/taps'
);
assert(
  /moreMenu\.setAttribute\('inert',\s*''\)/.test(main),
  'closing the mobile more menu should restore inert'
);
assert(
  /moreMenu\.toggleAttribute\('inert',\s*!open\)/.test(main),
  'toggle path should sync inert with the open state, including removing inert when open'
);

console.log('more menu inert static assertions passed');
