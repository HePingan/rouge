const fs = require('fs');
const assert = require('assert');

const skills = fs.readFileSync('js/skills.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(skills.includes('function getSkillCodexSummary'), 'skill codex summary helper missing');
assert(skills.includes('claimableSynergies') && skills.includes('treeStats'), 'codex should summarize claimable synergies and tree stats');
assert(skills.includes('headline: (claimableSynergies.length + claimableMasteries.length)'), 'codex should prioritize claimable reward headline');

assert(main.includes('const skillCodex = typeof getSkillCodexSummary'), 'skill panel should read codex summary');
assert(main.includes('skill-codex-panel'), 'skill panel should render codex summary card');
assert(main.includes('待领奖励') && main.includes('共鸣成型') && main.includes('单系专精'), 'codex summary stats missing');
assert(main.includes('codex-claim-guide'), 'codex claim guidance missing');
assert(main.includes("syn.claimable ? 'claimable'"), 'claimable synergy cards should get a visual class');

assert(ui.includes('getSkillCodexSummary().claimableCount'), 'HUD should check claimable skill rewards');
assert(ui.includes("#btn-skills") && ui.includes("has-claim") && ui.includes("dataset.claimCount"), 'skills menu should expose claim badge state');

assert(css.includes('.skill-codex-panel'), 'codex panel CSS missing');
assert(css.includes('.codex-stats-row span.claimable'), 'claimable codex stat CSS missing');
assert(css.includes('#btn-skills.has-claim::after'), 'skills button claim badge CSS missing');
assert(css.includes('.synergy-card.claimable'), 'claimable synergy card CSS missing');

const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === '20260607safearea11'), 'all linked assets should use current cachebuster');

console.log('skill codex static checks passed');
