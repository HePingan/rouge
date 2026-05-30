const fs = require('fs');
const assert = require('assert');

const skills = fs.readFileSync('js/skills.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const save = fs.readFileSync('js/save.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

assert(skills.includes('reward: { baseAtk: 4, baseMp: 12 }'), '雷火焚天 should define a permanent formation reward');
assert(skills.includes('let claimedSkillSynergies = {}'), 'claimed synergy state missing');
assert(skills.includes('function claimSkillSynergyReward'), 'claim helper missing');
assert(skills.includes('function normalizeClaimedSkillSynergies'), 'claimed synergy normalizer missing');
assert(skills.includes('claimable: missingTotal <= 0 && !isSkillSynergyClaimed(id)'), 'synergy progress should expose claimable state');
assert(skills.includes('const SKILL_MASTERY_MILESTONES'), 'mastery milestone reward data missing');
assert(skills.includes('let claimedSkillMasteries = {}'), 'claimed mastery state missing');
assert(skills.includes('function claimSkillMasteryReward'), 'mastery claim helper missing');
assert(skills.includes('function normalizeClaimedSkillMasteries'), 'claimed mastery normalizer missing');

assert(main.includes('synergy-claim-btn'), 'synergy claim button missing from skill panel');
assert(main.includes('claimSkillSynergyReward(id)'), 'skill panel should call real claim helper');
assert(main.includes('mastery-claim-btn'), 'mastery claim button missing from skill panel');
assert(main.includes('claimSkillMasteryReward(tree, count)'), 'skill panel should call mastery claim helper');
assert(main.includes('奖励已领取'), 'claimed reward UI state missing');

assert(save.includes('const SAVE_VERSION = 8'), 'save version should bump for mastery rewards');
assert(save.includes('skillSynergyReward: 1'), 'save feature flag for synergy rewards missing');
assert(save.includes('skillMasteryReward: 1'), 'save feature flag for mastery rewards missing');
assert(save.includes('claimedSkillSynergies'), 'save/load should persist claimed synergy rewards');
assert(save.includes('claimedSkillMasteries'), 'save/load should persist claimed mastery rewards');
assert(save.includes('normalizeClaimedSkillSynergies(data.claimedSkillSynergies)'), 'load should normalize claimed synergies');
assert(save.includes('normalizeClaimedSkillSynergies(migrated.claimedSkillSynergies)'), 'migration should normalize claimed synergies');
assert(save.includes('normalizeClaimedSkillMasteries(data.claimedSkillMasteries)'), 'load should normalize claimed masteries');
assert(save.includes('normalizeClaimedSkillMasteries(migrated.claimedSkillMasteries)'), 'migration should normalize claimed masteries');

assert(css.includes('.synergy-claim-btn'), 'claim button CSS missing');
assert(css.includes('.synergy-card.claimed'), 'claimed card CSS missing');
assert(css.includes('.synergy-card.mastery-card'), 'mastery card CSS missing');

console.log('skill synergy reward static checks passed');
