const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = process.cwd();
const PAGE = 'test-stage-enter-browser-smoke.html';

function findBrowser() {
  const candidates = [process.env.CHROME_BIN, process.env.CHROMIUM_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].filter(Boolean);
  return candidates.find(bin => fs.existsSync(bin));
}
function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  if (file.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}
function startServer() {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const rel = decodeURIComponent(url.pathname === '/' ? `/${PAGE}` : url.pathname);
      const file = path.normalize(path.join(ROOT, rel));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
        res.end(data);
      });
    } catch (err) { res.writeHead(500); res.end(String(err && err.stack || err)); }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}
function decodeHtml(text) {
  return text.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
async function main() {
  const browserBin = findBrowser();
  assert(browserBin, 'Chromium/Chrome is required for browser smoke (install chromium or set CHROME_BIN)');
  assert(fs.existsSync(path.join(ROOT, PAGE)), `${PAGE} should exist`);
  const server = await startServer();
  const port = server.address().port;
  const userDataDir = fs.mkdtempSync('/tmp/rouge-stage-enter-smoke-profile-');
  const browser = spawn(browserBin, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--virtual-time-budget=15000', '--dump-dom', `--user-data-dir=${userDataDir}`,
    `http://127.0.0.1:${port}/${PAGE}`,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  browser.stdout.on('data', d => { stdout += d.toString(); });
  browser.stderr.on('data', d => { stderr += d.toString(); });
  const exitCode = await new Promise(resolve => browser.on('exit', code => resolve(code)));
  server.close();
  const match = stdout.match(/SMOKE_RESULT:(\{[\s\S]*?\})<\/pre>/);
  if (!match) throw new Error(`smoke result marker missing; browser exit=${exitCode}\nSTDERR:\n${stderr.slice(-3000)}\nSTDOUT:\n${stdout.slice(-3000)}`);
  const result = JSON.parse(decodeHtml(match[1]));
  if (!result.ok) throw new Error(`${result.message}\n${result.stack || ''}\nstate=${JSON.stringify(result.state)}`);
  console.log(result.message);
}
main().catch(err => { console.error(err.stack || err); process.exit(1); });
