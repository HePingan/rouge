const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = process.cwd();
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitFor(fn, label, timeout = 6000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (err) { last = err; }
    await wait(60);
  }
  throw new Error(`timeout waiting for ${label}${last ? `: ${last.message}` : ''}`);
}
function serve() {
  const server = http.createServer((req, res) => {
    const clean = decodeURIComponent(req.url.split('?')[0]);
    const file = clean === '/' ? '/index.html' : clean;
    const target = path.join(ROOT, file);
    if (!target.startsWith(ROOT) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    const ext = path.extname(target);
    const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}
(async () => {
  const server = await serve();
  const port = server.address().port;
  const proc = spawn('chromium', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--virtual-time-budget=12000', '--run-all-compositor-stages-before-draw', '--dump-dom',
    `--window-size=390,844`,
    `http://127.0.0.1:${port}/test-combat-combo-readability-browser-smoke.html`
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const killer = setTimeout(() => proc.kill('SIGKILL'), 45000);
  let out = '', err = '';
  proc.stdout.on('data', d => { out += d; });
  proc.stderr.on('data', d => { err += d; });
  const code = await new Promise(resolve => proc.on('exit', resolve));
  clearTimeout(killer);
  server.close();
  if (code !== 0) {
    console.error(out || '[no stdout]');
    console.error(err || '[no stderr]');
    console.error(`chromium exited with ${code}`);
    process.exit(1);
  }
  assert(out.includes('data-result="passed"'), out || err);
  assert(out.includes('comboWhiteSpace') && out.includes('actionsBottom'), 'combo geometry evidence missing');
  console.log('combat combo readability smoke passed (data-result=passed)');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
