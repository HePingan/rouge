const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = {
  console,
  window: {},
  document: {},
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

function runFile(path, expose = '') {
  const source = fs.readFileSync(path, 'utf8');
  vm.runInContext(`${source}\n${expose}`, context, { filename: path });
}

runFile('js/artifacts.js', 'this.ARTIFACTS = ARTIFACTS; this.createDefaultArtifactsState = createDefaultArtifactsState; this.getArtifactState = getArtifactState; this.getActiveArtifact = getActiveArtifact;');
runFile('js/ui.js', 'this.updateHUD = updateHUD;');

function createHudDocument() {
  const nodes = {};
  function makeNode(id = '') {
    return {
      id,
      textContent: '',
      classList: {
        values: new Set(['empty']),
        add(name) { this.values.add(name); },
        remove(name) { this.values.delete(name); },
        contains(name) { return this.values.has(name); },
      },
      style: {
        values: {},
        setProperty(name, value) { this.values[name] = value; },
      },
      query: {},
      querySelector(selector) { return this.query[selector] || null; },
    };
  }

  ['hud-realm', 'hud-floor', 'hud-biome', 'hud-spirit-stones', 'hp-fill', 'mp-fill', 'xp-fill', 'hp-text', 'mp-text', 'xp-text'].forEach(id => nodes[id] = makeNode(id));
  const artifactHud = makeNode('hud-artifact');
  artifactHud.query['.artifact-icon-wrap'] = makeNode('artifact-icon-wrap');
  artifactHud.query['.artifact-icon'] = makeNode('artifact-icon');
  artifactHud.query['.artifact-name'] = makeNode('artifact-name');
  artifactHud.query['.artifact-level-badge'] = makeNode('artifact-level-badge');
  artifactHud.query['.rarity-corner'] = artifactHud.query['.artifact-level-badge'];
  nodes['hud-artifact'] = artifactHud;

  return {
    nodes,
    getElementById(id) { return nodes[id] || null; },
  };
}

function makePlayer(artifacts) {
  return {
    realm: { name: '金丹期', xpNeeded: 300 },
    realmIndex: 2,
    spiritStones: 999,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    xp: 20,
    artifacts,
  };
}

const docInactive = createHudDocument();
context.document = docInactive;
context.updateHUD(makePlayer({ activeId: null, owned: {} }), 3);
assert(docInactive.nodes['hud-artifact'].classList.contains('empty'), 'artifact HUD should be empty when no artifact is active');
assert.strictEqual(docInactive.nodes['hud-artifact'].query['.artifact-icon'].textContent, '🗡️', 'empty artifact HUD should hint the artifact system');
assert.strictEqual(docInactive.nodes['hud-artifact'].query['.artifact-name'].textContent, '未激活神器', 'empty artifact HUD should use artifact copy');
assert.strictEqual(docInactive.nodes['hud-artifact'].query['.artifact-level-badge'].textContent, '-', 'empty artifact HUD should show no level');

const docActive = createHudDocument();
context.document = docActive;
context.updateHUD(makePlayer({ activeId: 'haotian', owned: { haotian: { level: 4, awakened: false } } }), 5);
assert(!docActive.nodes['hud-artifact'].classList.contains('empty'), 'artifact HUD should be active when an artifact is active');
assert.strictEqual(docActive.nodes['hud-artifact'].query['.artifact-icon'].textContent, '🗼', 'artifact HUD should show active artifact icon');
assert.strictEqual(docActive.nodes['hud-artifact'].query['.artifact-name'].textContent, '昊天塔', 'artifact HUD should show active artifact name');
assert.strictEqual(docActive.nodes['hud-artifact'].query['.artifact-level-badge'].textContent, '4', 'artifact HUD should show active artifact level');
assert.strictEqual(docActive.nodes['hud-artifact'].style.values['--artifact-color'], '#ffd166', 'artifact HUD should use active artifact color');

console.log('artifact HUD static tests passed');
