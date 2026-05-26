// Particle System — combat effects, skill animations, screen shake
// Fully DOM HD — no canvas dependency

let particles = [];
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };

// DOM particle pool
const PARTICLE_POOL_SIZE = 300;
let domParticlePool = [];
let domParticleLayer = null;

function initParticlePool() {
  domParticleLayer = document.getElementById('particle-layer');
  if (!domParticleLayer) {
    domParticleLayer = document.createElement('div');
    domParticleLayer.id = 'particle-layer';
    document.getElementById('game-container').appendChild(domParticleLayer);
  }
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const el = document.createElement('div');
    el.className = 'particle-dom';
    el.style.display = 'none';
    domParticleLayer.appendChild(el);
    domParticlePool.push(el);
  }
}

function spawnParticles(x, y, count, color, speedMult = 1.0, size = 3) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (1 + Math.random() * 3) * speedMult;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color,
      size: size + Math.random() * 3,
    });
  }
}

function triggerScreenShake(intensity = 5, duration = 10) {
  screenShake.intensity = Math.max(screenShake.intensity, intensity);
  screenShake.duration = Math.max(screenShake.duration, duration);
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  if (screenShake.duration > 0) {
    screenShake.x = (Math.random() - 0.5) * screenShake.intensity * 2;
    screenShake.y = (Math.random() - 0.5) * screenShake.intensity * 2;
    screenShake.duration--;
    screenShake.intensity *= 0.85;
  } else {
    screenShake.x = 0;
    screenShake.y = 0;
  }
}

function drawParticlesDom(camera) {
  const poolSize = domParticlePool.length;
  let idx = 0;
  for (const p of particles) {
    if (idx >= poolSize) break;
    const el = domParticlePool[idx++];
    el.style.display = 'block';
    el.style.width = p.size + 'px';
    el.style.height = p.size + 'px';
    el.style.background = p.color;
    el.style.opacity = p.life / p.maxLife;
    el.style.transform = 'translate(' +
      (p.x - camera.x - p.size / 2) + 'px,' +
      (p.y - camera.y - p.size / 2) + 'px)';
  }
  // Hide unused pool elements
  while (idx < poolSize) {
    domParticlePool[idx++].style.display = 'none';
  }
}

function applyScreenShake() {
  const container = document.getElementById('game-container');
  if (container && screenShake.duration > 0) {
    container.style.transform = 'translate(' + screenShake.x + 'px,' + screenShake.y + 'px)';
  } else if (container) {
    container.style.transform = '';
  }
}

// Combat-specific spawn helpers (called from combat.js or main.js)
function spawnAttackEffect(fromX, fromY, toX, toY) {
  const worldX = toX * CELL_SIZE + CELL_SIZE / 2;
  const worldY = toY * CELL_SIZE + CELL_SIZE / 2;
  spawnParticles(worldX, worldY, 8, '#ffaa44', 1.5, 4);
  triggerScreenShake(2, 5);
}

function spawnSkillEffect(worldX, worldY, color) {
  spawnParticles(worldX, worldY, 15, color, 2.0, 5);
  triggerScreenShake(6, 8);
}

function spawnHitEffect(worldX, worldY) {
  spawnParticles(worldX, worldY, 5, '#ff6644', 1.0, 3);
  triggerScreenShake(2, 4);
}

function spawnCritEffect(worldX, worldY) {
  spawnParticles(worldX, worldY, 20, '#ffdd44', 2.5, 6);
  triggerScreenShake(8, 10);
}

function spawnLootDropEffect(worldX, worldY, rarityColor) {
  spawnParticles(worldX, worldY, 12, rarityColor, 1.2, 4);
  triggerScreenShake(1, 3);
}

function spawnBreakthroughEffect(worldX, worldY) {
  spawnParticles(worldX, worldY, 40, '#ffdd44', 3.0, 6);
  spawnParticles(worldX, worldY, 20, '#ffffff', 2.0, 4);
  triggerScreenShake(12, 15);
}

function spawnDeathEffect(worldX, worldY) {
  spawnParticles(worldX, worldY, 30, '#ff3333', 2.0, 6);
  triggerScreenShake(10, 12);
}

function spawnHealEffect(worldX, worldY) {
  spawnParticles(worldX, worldY, 10, '#55ff55', 1.5, 4);
}

function spawnArtifactTriggerEffect(worldX, worldY, color = '#ffdd66') {
  spawnParticles(worldX, worldY, 18, color, 2.1, 5);
  spawnParticles(worldX, worldY, 8, '#ffffff', 1.2, 3);
  triggerScreenShake(4, 6);
}
