const assert = require('assert');
const fs = require('fs');

const particles = fs.readFileSync('js/particles.js', 'utf8');

function extractFunctionBlock(source, signature) {
  const start = source.indexOf(signature);
  assert(start >= 0, `${signature} should exist`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${signature} should close`);
}

assert(particles.includes('const PARTICLE_POOL_SIZE = 180'), 'DOM particle pool should be mobile-budgeted, not 300 nodes');
assert(particles.includes('const PARTICLE_MOBILE_ACTIVE_BUDGET = 96'), 'mobile stage runs should have an active particle budget');
const spawn = extractFunctionBlock(particles, 'function spawnParticles');
assert(spawn.includes('activeBudget'), 'spawnParticles should cap active particle count');
assert(spawn.includes('mobileRunActive ? 12 : count'), 'mobile runs should cap burst spawn count');
const draw = extractFunctionBlock(particles, 'function drawParticlesDom');
assert(draw.includes('domParticleVisibleCount'), 'drawParticlesDom should hide only previously visible unused nodes');
assert(draw.includes("if (el.style.display !== 'block')"), 'particle display writes should be diffed');
assert(draw.includes('if (el.style.transform !== transform)'), 'particle transform writes should be diffed');
assert(!/while \(idx < poolSize\) \{\s*domParticlePool\[idx\+\+\]\.style\.display = 'none';\s*\}/.test(draw), 'drawParticlesDom should not write display:none to the whole pool every frame');

console.log('particle budget static checks passed');
