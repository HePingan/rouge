const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = process.cwd();
function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'text/plain; charset=utf-8';
}
function chromiumArgs(url) {
  return [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--window-size=390,844', '--virtual-time-budget=22000', '--run-all-compositor-stages-before-draw', '--dump-dom', url
  ];
}
async function main() {
  const server = http.createServer((req, res) => {
    const clean = decodeURIComponent(req.url.split('?')[0]);
    const rel = clean === '/' ? '/test-character-inventory-equip-loop-browser-smoke.html' : clean;
    const file = path.join(ROOT, rel.replace(/^\//, ''));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': contentType(file) });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/test-character-inventory-equip-loop-browser-smoke.html`;
  try {
    const browser = spawn('chromium', chromiumArgs(url), { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    browser.stdout.on('data', chunk => { out += chunk.toString(); });
    browser.stderr.on('data', chunk => { err += chunk.toString(); });
    const code = await new Promise(resolve => browser.on('close', resolve));
    assert.strictEqual(code, 0, err || out);
    assert(out.includes('data-result="passed"'), out || err);
    assert(out.includes('inventory touch smoke passed') || out.includes('data-metrics='), 'inventory touch smoke evidence missing');
    console.log('character inventory equip loop browser smoke passed');
  } finally {
    server.close();
  }
}
main().catch(err => { console.error(err.stack || err.message); process.exit(1); });
