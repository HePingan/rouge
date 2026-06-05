const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const ROOT = process.cwd();

function chromiumCanReachNodeServer() {
  const probe = spawnSync(process.execPath, ['-e', `
    const http = require('http');
    const { spawn } = require('child_process');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<!doctype html><body data-probe="ok">ok</body>');
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const proc = spawn('chromium', [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
        '--dump-dom', '--virtual-time-budget=1000',
        'http://127.0.0.1:' + port + '/'
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      proc.stdout.on('data', d => out += d);
      const killer = setTimeout(() => proc.kill('SIGKILL'), 2500);
      proc.on('close', () => {
        clearTimeout(killer);
        server.close(() => process.exit(out.includes('data-probe="ok"') ? 0 : 1));
      });
    });
  `], { timeout: 5000, stdio: 'ignore' });
  return probe.status === 0;
}

function serve(root) {
  let resolveMetrics;
  const metricsPromise = new Promise(resolve => { resolveMetrics = resolve; });
  const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (req.method === 'POST' && pathname === '/__stage_perf_metrics') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        server.lastMetrics = body;
        resolveMetrics(body);
        res.writeHead(204);
        res.end();
      });
      return;
    }
    if (pathname === '/') pathname = '/test-stage-performance-budget-browser-smoke.html';
    const file = path.join(root, pathname);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(file);
    const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    fs.createReadStream(file).pipe(res);
  });
  server.metricsPromise = metricsPromise;
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  if (!chromiumCanReachNodeServer()) {
    console.log('stage performance budget browser smoke skipped: local Chromium cannot reach Node HTTP server in this environment');
    return;
  }
  const server = await serve(ROOT);
  const port = server.address().port;
  const procUrl = `http://127.0.0.1:${port}/test-stage-performance-budget-browser-smoke.html`;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rouge-stage-perf-'));
  const proc = spawn('chromium', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--virtual-time-budget=18000', '--run-all-compositor-stages-before-draw', '--dump-dom',
    `--user-data-dir=${userDataDir}`,
    '--window-size=390,844',
    procUrl
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  let timedOut = false;
  proc.stdout.on('data', d => out += d);
  proc.stderr.on('data', d => err += d);
  const killer = setTimeout(() => { timedOut = true; proc.kill('SIGKILL'); }, 25000);
  const closePromise = new Promise(resolve => proc.on('close', (code, signal) => resolve({ code, signal })));
  const metricText = await Promise.race([
    server.metricsPromise,
    closePromise.then(() => null),
    new Promise(resolve => setTimeout(() => resolve(null), 22000)),
  ]);
  const code = metricText ? { code: null, signal: 'METRICS_ONLY' } : await closePromise;
  clearTimeout(killer);
  const postedMetrics = metricText ? JSON.parse(metricText) : (server.lastMetrics ? JSON.parse(server.lastMetrics) : null);
  if (metricText && !proc.killed) proc.kill('SIGKILL');
  server.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
  if (!postedMetrics && !timedOut && code.code !== 0 && code.signal !== 'METRICS_ONLY') {
    console.error(out || '[no stdout]');
    console.error(err || '[no stderr]');
    console.error(`chromium exit code=${code.code} signal=${code.signal}`);
    process.exit(1);
  }
  const match = out.match(/stage performance budget smoke passed (\{.*\})/);
  const metrics = postedMetrics || (match ? JSON.parse(match[1]) : null);
  if (metrics) {
    assert(metrics.movedX > 0, 'metrics should show movement');
    console.log('stage performance budget browser smoke passed', JSON.stringify(metrics));
  } else {
    const domMatch = out.match(/data-metrics="([^\"]+)"/);
    if (domMatch) {
      const html = domMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const domMetrics = JSON.parse(html);
      assert(domMetrics.movedX > 0, 'DOM metrics should show movement');
      console.log('stage performance budget browser smoke passed', JSON.stringify(domMetrics));
    } else {
      throw new Error(`stage performance metrics missing; browser exit=${code.code} signal=${code.signal} timedOut=${timedOut}\nSTDOUT:\n${out.slice(-3000)}\nSTDERR:\n${err.slice(-3000)}`);
    }
  }
})().catch(err => { console.error(err); process.exit(1); });
