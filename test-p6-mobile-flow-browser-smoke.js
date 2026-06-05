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
  let resolveResult;
  const resultPromise = new Promise(resolve => { resolveResult = resolve; });
  const server = http.createServer((req, res) => {
    const clean = decodeURIComponent(req.url.split('?')[0]);
    if (clean === '/__p6_result' && req.method === 'POST') {
      let body = '';
      req.on('data', d => { body += d; });
      req.on('end', () => {
        res.writeHead(204); res.end();
        resolveResult(body || '');
      });
      return;
    }
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
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, resultPromise })));
}
(async () => {
  const browserBin = findBrowser();
  assert(browserBin, 'Chromium/Chrome is required for P6 mobile flow browser smoke');
  const { server, resultPromise } = await serve();
  const port = server.address().port;
  const proc = spawn(browserBin, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--window-size=390,844',
    `http://127.0.0.1:${port}/test-p6-mobile-flow-browser-smoke.html`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  proc.stderr.on('data', d => { err += d; });
  const timeout = new Promise(resolve => setTimeout(() => resolve(null), 45000));
  const result = await Promise.race([resultPromise, timeout]);
  proc.kill('SIGKILL');
  server.close();
  if (!result) {
    console.error(err.slice(-2000) || 'p6 mobile flow browser smoke timed out waiting for result beacon');
    process.exit(1);
  }
  if (!result.includes('p6 mobile flow browser smoke passed')) {
    console.error(result.slice(0, 4000));
    process.exit(1);
  }
  const line = result.match(/p6 mobile flow browser smoke passed[^\n]*/)?.[0] || 'p6 mobile flow browser smoke passed';
  console.log(line);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
