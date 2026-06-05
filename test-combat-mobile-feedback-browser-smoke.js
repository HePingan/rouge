const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = process.cwd();
function findBrowser() {
  return [process.env.CHROME_BIN, process.env.CHROMIUM_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']
    .filter(Boolean)
    .find(bin => fs.existsSync(bin));
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
  const browserBin = findBrowser();
  assert(browserBin, 'Chromium/Chrome is required for combat mobile feedback browser smoke');
  const server = await serve();
  const port = server.address().port;
  const proc = spawn(browserBin, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--virtual-time-budget=14000', '--run-all-compositor-stages-before-draw', '--dump-dom',
    '--window-size=390,844',
    `http://127.0.0.1:${port}/test-combat-mobile-feedback-browser-smoke.html`
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const killer = setTimeout(() => proc.kill('SIGKILL'), 60000);
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
  assert(out.includes('feedback-toggle'), 'toggle feedback evidence missing in dumped DOM');
  assert(out.includes('combat mobile feedback viewport smoke passed'), 'pass marker missing');
  const markerIdx = out.lastIndexOf('combat mobile feedback viewport smoke passed');
  const marker = markerIdx >= 0 ? out.slice(markerIdx).match(/combat mobile feedback viewport smoke passed[^<\n]*/)?.[0] : 'combat mobile feedback viewport smoke passed';
  console.log(marker);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
