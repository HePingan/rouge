const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = process.cwd();
const PORT = 18186;

function send(res, status, body, type = 'text/html') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/__result') {
      let raw = '';
      req.on('data', chunk => raw += chunk);
      req.on('end', () => {
        server.emit('result', JSON.parse(raw || '{}'));
        send(res, 200, 'ok', 'text/plain');
      });
      return;
    }
    let clean = decodeURIComponent((req.url.split('?')[0] || '/').replace(/^\/+/, '')) || 'test-bottom-canvas-safe-area-browser-smoke.html';
    if (clean === '') clean = 'test-bottom-canvas-safe-area-browser-smoke.html';
    const file = path.join(ROOT, clean);
    if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden', 'text/plain');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'not found', 'text/plain');
    const ext = path.extname(file);
    const type = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/html';
    send(res, 200, fs.readFileSync(file), type);
  } catch (err) {
    send(res, 500, String(err && err.stack || err), 'text/plain');
  }
});

function chromium() {
  return ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(fs.existsSync) || 'chromium';
}

(async () => {
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  const resultPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for bottom safe-area smoke result')), 25000);
    server.once('result', payload => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
  const child = spawn(chromium(), [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=390,844',
    `http://127.0.0.1:${PORT}/test-bottom-canvas-safe-area-browser-smoke.html`,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', chunk => stderr += chunk);
  try {
    const result = await resultPromise;
    assert(result.ok, `bottom canvas safe-area smoke failed: ${JSON.stringify(result)}`);
    console.log('bottom canvas safe-area browser smoke passed', JSON.stringify(result));
  } finally {
    child.kill('SIGTERM');
    server.close();
  }
})().catch(err => {
  server.close();
  console.error(err && err.stack || err);
  process.exit(1);
});
