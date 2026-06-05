const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = process.cwd();
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
    '--window-size=390,844',
    `http://127.0.0.1:${port}/test-skill-affinity-browser-smoke.html`
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const killer = setTimeout(() => proc.kill('SIGKILL'), 50000);
  let out = '', err = '';
  proc.stdout.on('data', d => { out += d; });
  proc.stderr.on('data', d => { err += d; });
  const code = await new Promise(resolve => proc.on('close', resolve));
  clearTimeout(killer);
  server.close();
  if (code !== 0) {
    console.error(out || '[no stdout]');
    console.error(err || '[no stderr]');
    console.error(`chromium exited with ${code}`);
    process.exit(1);
  }
  assert(out.includes('data-result="passed"'), out || err);
  assert(out.includes('weak&quot;:&quot;弱 水/木') || out.includes('weak":"弱 水/木') || out.includes('弱 水/木'), 'affinity weak tags missing in dumped DOM');
  assert(out.includes('resist&quot;:&quot;抗 剑/土') || out.includes('resist":"抗 剑/土') || out.includes('抗 剑/土'), 'affinity resist tags missing in dumped DOM');
  assert(out.includes('建议换水/木'), 'resisted skill counter guidance missing in dumped DOM');
  assert(out.includes('相性：克制已覆盖') && (out.includes('克水+') || out.includes('克水+16%')), 'build match or combat damage marker missing in dumped DOM');
  const markerIdx = out.lastIndexOf('skill affinity combat browser smoke passed');
  const marker = markerIdx >= 0 ? out.slice(markerIdx).match(/skill affinity combat browser smoke passed[^<\n]*/)?.[0] : 'skill affinity combat browser smoke passed';
  console.log(marker);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
