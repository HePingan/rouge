const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = { console, Math, Date, playerMaterials: {} };
context.window = context;
context.globalThis = context;
vm.createContext(context);

function runFile(path, expose = '') {
  vm.runInContext(`${fs.readFileSync(path, 'utf8')}\n${expose}`, context, { filename: path });
}

runFile('js/artifacts.js', 'this.ARTIFACT_MATERIALS = ARTIFACT_MATERIALS;');
runFile('js/alchemy.js', 'this.MATERIALS = MATERIALS;');
runFile('js/ascension.js', `
this.getAscensionTrialActionState = getAscensionTrialActionState;
this.getDemonWarActionState = getDemonWarActionState;
this.getImmortalRefineActionState = getImmortalRefineActionState;
`);

const unstarted = { ascension: { ascended: false, trial: { active: false, index: 0, cleared: [] } } };
const trialNoToken = context.getAscensionTrialActionState(unstarted, { ascension_trial_token: 0 });
assert.strictEqual(trialNoToken.canStart, false, 'missing trial token should disable trial start');
assert(trialNoToken.startReason.includes('飞升试炼令（0/1）'), 'trial start reason should include readable token count');

const ascended = { ascension: { ascended: true, demonWar: { active: false, progress: 0, nodes: [] } } };
const demonNoBanner = context.getDemonWarActionState(ascended, { demon_war_banner: 0 });
assert.strictEqual(demonNoBanner.canStart, false, 'missing demon banner should disable demon war start');
assert(demonNoBanner.startReason.includes('仙魔战旗（0/1）'), 'demon-war reason should keep readable banner count');

const refineNoStone = context.getImmortalRefineActionState({
  ascension: { ascended: true },
  spiritStones: 999999,
  equipment: { weapon: { name: '真仙剑', rarity: 'mythic', enhanceLevel: 12, stats: {}, affixes: [] } },
}, { immortal_refine_stone: 0, immortal_jade_ascended: 9 });
assert.strictEqual(refineNoStone.canRefine, false, 'missing refine stone should disable immortal refine');
assert(refineNoStone.reason.includes('仙炼石 0/3'), 'refine reason should include readable material count');

const main = fs.readFileSync('js/main.js', 'utf8');
assert(main.includes('renderAscensionResourceGuide'), 'ascension panel should render a reusable material/source guide');
assert(main.includes('asc-resource-guide'), 'ascension resource guide should have a mobile-friendly class');
assert(main.includes('飞升试炼令') && main.includes('仙魔战旗') && main.includes('仙炼石'), 'resource guide should cover trial token, demon banner, and refine stone');
assert(main.includes('材料来源'), 'ascension panels should label material source guidance');
assert(main.includes('materialSourceTextDom'), 'resource guide should reuse real MATERIALS source metadata rather than hardcoded-only text');

console.log('ascension resource guidance static tests passed');
