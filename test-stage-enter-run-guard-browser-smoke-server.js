const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = process.cwd();
function serveFile(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = urlPath === '/' ? '/test-stage-enter-run-guard-browser-smoke.html' : urlPath;
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  const ext = path.extname(file).toLowerCase();
  const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(serveFile);
server.listen(8126, '127.0.0.1', () => {
  console.log('stage enter run guard browser smoke server ready on http://127.0.0.1:8126/test-stage-enter-run-guard-browser-smoke.html');
});
