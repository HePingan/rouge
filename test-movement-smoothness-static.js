const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');

assert(main.includes('startGameLoop();'), 'init should start the requestAnimationFrame game loop');
assert(!main.includes('setInterval(gameLoop, 1000 / 30)'), 'movement should not rely on fixed 30 FPS setInterval loop');
assert(/function startGameLoop\(\)\s*{[\s\S]*requestAnimationFrame\(tick\)/.test(main), 'game loop should use requestAnimationFrame for smoother mobile input');
assert(main.includes('currentFrameDt = Math.min(MAX_MOVEMENT_DT'), 'frame delta should be capped to avoid teleport jumps after lag');
assert(main.includes('const speed = playerSpeed * frameDt * analogBoost') && main.includes('currentFrameDt'), 'handleInput should scale movement by capped real frame delta plus analog joystick strength');
assert(main.includes('let playerSpeed = 5.2;'), 'player speed should be tuned down after moving to 60fps delta movement');
assert(main.includes('const follow = Math.min(0.68') && main.includes('frameDt / TARGET_FRAME_DT'), 'camera should be dt-aware and catch up faster to reduce not-following feel');
assert(main.includes("touchControls.addEventListener('lostpointercapture', e =>"), 'movement should reset joystick when pointer capture is lost');
assert(main.includes("window.addEventListener('blur', resetJoystickVisual)"), 'movement should reset stuck touch state when the page loses focus');
assert(main.includes('if (joystick?.active && typeof clearTouchMovementState === \'function\') clearTouchMovementState();'), 'handleInput should clear stale joystick state when combat or panels interrupt movement');
assert(main.includes('jsTouchId = null;') && main.includes('window.__resetMovementTouchInput'), 'external movement clears should also reset the active touch id');
assert(main.includes("let jsPointerMode = null;") && main.includes("if (jsPointerMode === 'pointer') return;"), 'pointer and touch paths should be separated to avoid duplicate mobile events wedging the input id');
assert(main.includes('setInterval(() => {') && main.includes('performance.now() - lastJoystickMoveAt > 4500'), 'movement input should self-recover if a browser drops end/cancel events');
assert(main.includes('if (dx === 0 && dy === 0) {') && main.includes('Keep an active joystick alive while the finger is still inside the dead zone.'), 'dead-zone frames should keep active joystick ownership until touchmove/end instead of dropping the drag');

const setupTouchControlsStart = main.indexOf('function setupTouchControls()');
assert(setupTouchControlsStart >= 0, 'setupTouchControls should exist');
const setupTouchControlsEnd = main.indexOf('     // Action buttons', setupTouchControlsStart);
assert(setupTouchControlsEnd > setupTouchControlsStart, 'setupTouchControls joystick section should be extractable');
const joystickSection = main.slice(setupTouchControlsStart, setupTouchControlsEnd);
function extractFunctionBlock(source, signature) {
  const start = source.indexOf(signature);
  assert(start >= 0, `${signature} should exist`);
  const open = source.indexOf('{', start);
  assert(open > start, `${signature} should have a body`);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${signature} body should close`);
}

const updateJoystickPosBlock = extractFunctionBlock(joystickSection, 'function updateJoystickPos(touch)');
const forbiddenUpdateLayoutReads = /\b(?:offsetWidth|offsetHeight|clientWidth|clientHeight|offsetTop|offsetLeft|offsetParent|getBoundingClientRect)\b/;
assert(!forbiddenUpdateLayoutReads.test(updateJoystickPosBlock), 'pointermove/touchmove update path must use cached joystick metrics, not DOM layout reads');
assert(joystickSection.includes('function refreshJoystickMetrics()'), 'joystick metrics cache refresh helper should exist');
assert(/\brefreshJoystickMetrics\(\);/.test(joystickSection), 'joystick metrics should be initialized once during touch control setup');
assert(/window\.addEventListener\('resize', refreshJoystickMetrics\)/.test(joystickSection), 'joystick metrics should refresh on resize');
assert(/window\.addEventListener\('orientationchange', refreshJoystickMetrics\)/.test(joystickSection), 'joystick metrics should refresh on orientationchange');

const touchStartMatch = joystickSection.match(/touchControls\.addEventListener\('touchstart', e => \{[\s\S]*?\n    \}, \{ passive: false \}\);/);
assert(touchStartMatch, 'touchstart movement start handler should be extractable');
assert(/\brefreshJoystickMetrics\(\);/.test(touchStartMatch[0]), 'touchstart movement start path should refresh cached joystick metrics before dragging');

const pointerDownMatch = joystickSection.match(/touchControls\.addEventListener\('pointerdown', e => \{[\s\S]*?\n    \}, \{ passive: false \}\);/);
assert(pointerDownMatch, 'pointerdown movement start handler should be extractable');
assert(/\brefreshJoystickMetrics\(\);/.test(pointerDownMatch[0]), 'pointerdown movement start path should refresh cached joystick metrics before dragging');

console.log('movement smoothness static checks passed');
