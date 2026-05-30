const fs = require('fs');
const assert = require('assert');

const stages = fs.readFileSync('js/stages.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(stages.includes('const STAGE_CHAPTERS'), 'stage chapters missing');
assert(stages.includes('const STAGES'), 'stages missing');
assert(stages.includes('stageStars'), 'stage stars progress missing');
assert(stages.includes('bestClearTurns'), 'best clear turns missing');
assert(stages.includes('function canSweepStage'), 'sweep availability helper missing');
assert(stages.includes('function calculateStageStars'), 'star calculation helper missing');
assert(main.includes('function generateHomeMap'), 'home map/mainline entry missing');
assert(main.includes('panelStack.push'), 'stage panel should open via panel stack (replaces direct showStageSelectUI = true)');
assert(
  main.includes("const selectedStage = (typeof STAGES !== 'undefined' && STAGES) ? STAGES[selectedStageId] : null;"),
  'stage panel open should guard STAGES lookup so a missing data module cannot leave the mobile button dead'
);
assert(
  main.includes("selectedStageChapterId = selectedStage?.chapterId || selectedStageChapterId;"),
  'stage panel open should use the guarded selectedStage chapter lookup'
);
assert(main.includes('function sweepStage'), 'sweep action missing');
assert(main.includes('data-stage-sweep'), 'sweep button binding missing');
assert(main.includes('calculateStageStars(stage'), 'completion must calculate stars');
assert(index.includes('btn-stages'), 'bottom stage button missing');
assert(stages.includes('wolfHowl') && stages.includes('bloodDrain') && stages.includes('thunderParalyze'), 'stage boss exclusive skills missing');
assert(stages.includes('getStageBossMechanicText'), 'boss mechanic text helper missing');
assert(stages.includes('getStageDropText'), 'drop text helper missing');
assert(stages.includes('qingyun_fur') && stages.includes('blood_crystal') && stages.includes('thunder_core'), 'stage exclusive drops missing');
assert(main.includes('首领机制') && main.includes('bossText') && main.includes('getStageBossMechanicText(selected)'), 'stage UI boss mechanic display missing');
assert(main.includes('掉落') && main.includes('getStageDropText(selected)'), 'stage UI drop display missing');
assert(stages.includes('chapterBonus'), 'chapter bonus data missing');
assert(stages.includes('chapterBonusClaimed'), 'chapter bonus claim tracking missing');
assert(stages.includes('function getChapterProgress'), 'chapter progress helper missing');
assert(stages.includes('function canClaimChapterBonus'), 'chapter bonus check helper missing');
assert(stages.includes('function getStageStarConditionText'), 'star condition text helper missing');
assert(main.includes('三星') && main.includes('starCond') && main.includes('getStageStarConditionText(selected)'), 'star condition UI missing');
assert(main.includes('data-claim-chapter'), 'chapter claim button binding missing');
assert(main.includes('claimChapterBonus'), 'chapter claim function missing');
const turnIncrement = "if (isInStageRun && player?.stageProgress?.currentRun) player.stageProgress.currentRun.turns = Number(player.stageProgress.currentRun.turns || 0) + 1;";
assert(main.includes(turnIncrement), 'stage turns should still increment after real movement');
const handleInputStart = main.indexOf('function handleInput()');
const handleInputMovement = main.indexOf('player.x = newX;', handleInputStart);
const handleInputTurn = main.indexOf(turnIncrement, handleInputStart);
assert(handleInputStart >= 0 && handleInputMovement > handleInputStart && handleInputTurn > handleInputMovement, 'stage turn counter must not increment before dx/dy movement checks or idle frames will make stage entry look frozen');
const linkedTokens = Array.from(index.matchAll(/\?v=([^"']+)/g), m => m[1]);
assert(linkedTokens.length >= 10, 'index should expose cache tokens for linked assets');
assert(linkedTokens.every(token => token === '20260530ascguard1'), 'all linked assets should use current stage top overlay cachebuster');
assert(!index.includes('20260530stageclose1'), 'index should not keep stale stage close cache token');
console.log('stage static integration ok');
