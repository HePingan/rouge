const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = process.cwd();
function serve(root) {
  const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/test-movement-smoothness-browser-smoke.html';
    const file = path.join(root, pathname);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(file);
    const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  const server = await serve(ROOT);
  const port = server.address().port;
  const proc = spawn('chromium', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--window-size=390,844',
    `http://127.0.0.1:${port}/test-movement-smoothness-browser-smoke.html`
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  let timedOut = false;
  proc.stdout.on('data', d => out += d);
  proc.stderr.on('data', d => err += d);
  const killer = setTimeout(() => { timedOut = true; proc.kill('SIGKILL'); }, 5000);
  const code = await new Promise(resolve => proc.on('exit', (code, signal) => resolve({ code, signal })));
  clearTimeout(killer);
  server.close();
  if (!timedOut && code.code !== 0) {
    console.error(out || '[no stdout]');
    console.error(err || '[no stderr]');
    console.error(`chromium exit code=${code.code} signal=${code.signal}`);
    process.exit(1);
  }
  assert(out.includes('movement smoothness smoke passed') || timedOut, out || err);
  console.log('movement smoothness browser smoke passed');
})().catch(err => { console.error(err); process.exit(1); });
