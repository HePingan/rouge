const assert = require('assert');
const fs = require('fs');
const main = fs.readFileSync('js/main.js', 'utf8');
assert(main.includes('function drawBottomSafeAreaCanvasMask()'), 'main.js should define canvas-level bottom safe-area mask');
assert(main.includes("g.addColorStop(0.22, 'rgba(36,56,86,0.88)')"), 'canvas bottom mask should use visible blue-purple gradient');
assert(main.includes('ctx.fillRect(0, y, canvasW, h);'), 'canvas bottom mask should cover full width');
assert(main.includes('drawBottomSafeAreaCanvasMask();\n    drawParticlesDom(camera);'), 'canvas bottom mask should run late in the render loop after normal canvas UI');
console.log('bottom canvas safe-area mask static passed');
