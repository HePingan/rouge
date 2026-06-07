const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = process.cwd();
const PORT = 18189;
const SHOT = '/tmp/rouge-bottom-strip-fullpage.png';

function send(res, status, body, type = 'text/html') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    let clean = decodeURIComponent((req.url.split('?')[0] || '/').replace(/^\/+/, '')) || 'index.html';
    if (clean === '') clean = 'index.html';
    const file = path.join(ROOT, clean);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'not found', 'text/plain');
    const ext = path.extname(file);
    const type = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : ext === '.png' ? 'image/png' : 'text/html';
    send(res, 200, fs.readFileSync(file), type);
  } catch (err) {
    send(res, 500, String(err && err.stack || err), 'text/plain');
  }
});

function chromium() {
  return ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(fs.existsSync) || 'chromium';
}
function probeDims(file) {
  const p = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file], { encoding: 'utf8' });
  if (p.status !== 0) throw new Error(p.stderr || p.stdout || 'ffprobe failed');
  return JSON.parse(p.stdout).streams[0];
}
function rawRgb(file) {
  const p = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (p.status !== 0) throw new Error(String(p.stderr || p.stdout || 'ffmpeg failed'));
  return p.stdout;
}
function bandStats(raw, w, h, y0, y1) {
  let r = 0, g = 0, b = 0, dark = 0, n = 0, longestDarkRun = 0;
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
    let run = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const R = raw[i], G = raw[i + 1], B = raw[i + 2];
      const isDark = R < 45 && G < 45 && B < 45;
      r += R; g += G; b += B; n++;
      if (isDark) { dark++; run++; if (run > longestDarkRun) longestDarkRun = run; }
      else run = 0;
    }
  }
  return { y0, y1, avg: [Math.round(r / n), Math.round(g / n), Math.round(b / n)], darkPct: dark / n, longestDarkRun };
}

(async () => {
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  try {
    const child = spawn(chromium(), [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--window-size=1080,2400',
      `--screenshot=${SHOT}`,
      `http://127.0.0.1:${PORT}/index.html?fullpage-bottom-strip=1&v=20260607safearea12`,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => stderr += chunk);
    const code = await new Promise(resolve => child.on('exit', resolve));
    assert.strictEqual(code, 0, stderr);
    const { width: w, height: h } = probeDims(SHOT);
    const raw = rawRgb(SHOT);
    const bands = [];
    for (let y = h - 500; y < h; y += 50) bands.push(bandStats(raw, w, h, y, y + 50));
    const bad = bands.filter(s => s.darkPct > 0.12 || s.longestDarkRun > Math.floor(w * 0.78));
    assert.deepStrictEqual(bad, [], `full-page screenshot should not contain code-level bottom black strips: ${JSON.stringify(bands)}`);
    console.log('full-page bottom strip screenshot smoke passed', JSON.stringify({ w, h, bands }));
  } finally {
    server.close();
  }
})().catch(err => {
  server.close();
  console.error(err && err.stack || err);
  process.exit(1);
});
