const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const assert = require('assert');

const ROOT = process.cwd();
const PAGE = 'test-skill-strip-density-browser-smoke.html';

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

(async () => {
  const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/' + PAGE;
    const file = path.join(ROOT, pathname);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const browser = spawn('chromium', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--virtual-time-budget=18000', '--run-all-compositor-stages-before-draw', '--dump-dom',
    '--window-size=390,844', `http://127.0.0.1:${port}/${PAGE}`
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  browser.stdout.on('data', d => out += d.toString());
  browser.stderr.on('data', d => err += d.toString());
  const kill = setTimeout(() => browser.kill('SIGKILL'), 60000);
  const code = await new Promise(resolve => browser.on('close', resolve));
  clearTimeout(kill);
  server.close();
  if (code !== 0) throw new Error(`browser exited ${code}\n${err}\n${out.slice(-2000)}`);
  assert(out.includes('data-result="passed"'), out || err);
  assert(out.includes('skill strip density browser smoke passed'), 'pass marker missing');
  const markerIdx = out.lastIndexOf('skill strip density browser smoke passed');
  const marker = out.slice(markerIdx).match(/skill strip density browser smoke passed[^<\n]*/)?.[0] || 'skill strip density browser smoke passed';
  console.log(marker);
})().catch(err => { console.error(err.stack || err); process.exit(1); });
