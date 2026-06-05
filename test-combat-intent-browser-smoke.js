const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const ROOT = process.cwd();
function findBrowser() {
  return [process.env.CHROME_BIN, process.env.CHROMIUM_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].filter(Boolean).find(bin => fs.existsSync(bin));
}
function serve() {
  const server = http.createServer((req, res) => {
    const clean = decodeURIComponent(req.url.split('?')[0]);
    const file = clean === '/' ? '/test-combat-intent-browser-smoke.html' : clean;
    const target = path.join(ROOT, file);
    if (!target.startsWith(ROOT) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(target);
    res.writeHead(200, { 'Content-Type': ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}
(async () => {
  const browserBin = findBrowser();
  assert(browserBin, 'Chromium/Chrome is required for combat intent browser smoke');
  const server = await serve();
  const port = server.address().port;
  const proc = spawn(browserBin, ['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--virtual-time-budget=8000','--run-all-compositor-stages-before-draw','--dump-dom','--window-size=390,844',`http://127.0.0.1:${port}/test-combat-intent-browser-smoke.html`], { stdio:['ignore','pipe','pipe'] });
  const killer = setTimeout(() => proc.kill('SIGKILL'), 60000);
  let out='', err='';
  proc.stdout.on('data', d => out += d);
  proc.stderr.on('data', d => err += d);
  const code = await new Promise(resolve => proc.on('close', resolve));
  clearTimeout(killer); server.close();
  if (code !== 0) { console.error(out || '[no stdout]'); console.error(err || '[no stderr]'); process.exit(code); }
  assert(out.includes('data-result="passed"'), out || err);
  assert(out.includes('combat intent browser smoke passed'), 'pass marker missing');
  const markerIdx = out.lastIndexOf('combat intent browser smoke passed');
  console.log(out.slice(markerIdx).match(/combat intent browser smoke passed[^<\n]*/)?.[0]);
})().catch(err => { console.error(err); process.exit(1); });
