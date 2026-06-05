const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const assert = require('assert');

const ROOT = process.cwd();
const PAGE = 'test-stage-affinity-detail-browser-smoke.html';

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.ico')) return 'image/x-icon';
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
  const proc = spawn('chromium', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--virtual-time-budget=16000', '--run-all-compositor-stages-before-draw', '--dump-dom',
    '--window-size=390,844',
    `http://127.0.0.1:${port}/${PAGE}`
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  proc.stdout.on('data', d => out += d.toString());
  proc.stderr.on('data', d => err += d.toString());
  const killer = setTimeout(() => proc.kill('SIGKILL'), 55000);
  const code = await new Promise(resolve => proc.on('close', resolve));
  clearTimeout(killer);
  server.close();
  if (code !== 0) {
    console.error(out);
    console.error(err);
    process.exit(1);
  }
  assert(out.includes('data-result="passed"'), out || err);
  assert(out.includes('stage affinity detail browser smoke passed'), 'pass marker missing');
  assert(out.includes('水木续航') && out.includes('当前构筑') && out.includes('克制已覆盖'), 'stage affinity detail text missing in dumped DOM');
  const markerIdx = out.lastIndexOf('stage affinity detail browser smoke passed');
  const marker = markerIdx >= 0 ? out.slice(markerIdx).match(/stage affinity detail browser smoke passed[^<\n]*/)?.[0] : 'stage affinity detail browser smoke passed';
  console.log(marker);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
