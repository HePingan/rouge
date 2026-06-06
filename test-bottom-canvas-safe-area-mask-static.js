const assert = require('assert');
const fs = require('fs');
const main = fs.readFileSync('js/main.js', 'utf8');
const smokeHtml = fs.readFileSync('test-bottom-canvas-safe-area-browser-smoke.html', 'utf8');
const smokeJs = fs.readFileSync('test-bottom-canvas-safe-area-browser-smoke.js', 'utf8');

assert(main.includes('function drawBottomSafeAreaCanvasMask()'), 'main.js should define canvas-level bottom safe-area mask');
assert(main.includes("g.addColorStop(0.22, 'rgba(36,56,86,0.88)')"), 'canvas bottom mask should use visible blue-purple gradient');
assert(main.includes('ctx.fillRect(0, y, canvasW, h);'), 'canvas bottom mask should cover full width');
assert(main.includes('drawBottomSafeAreaCanvasMask();\n    drawParticlesDom(camera);'), 'canvas bottom mask should run late in the render loop after normal canvas UI');
assert(smokeHtml.includes('getImageData(0, h - bandHeight, w, bandHeight)'), 'browser smoke should inspect the rendered canvas bottom pixel band');
assert(smokeHtml.includes('darkPct === 0'), 'browser smoke should fail if the bottom strip contains dark/black pixels');
assert(smokeHtml.includes('overflowX <= 0') && smokeHtml.includes('errors.length === 0'), 'browser smoke should guard overflow and console errors');
assert(smokeJs.includes('--window-size=390,844'), 'browser smoke should run in the target phone frame');
console.log('bottom canvas safe-area mask static passed');
