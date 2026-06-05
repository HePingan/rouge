const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('js/main.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

const touchStart = main.indexOf("touchControls.addEventListener('touchstart'");
const lostCapture = main.indexOf("touchControls.addEventListener('lostpointercapture', e =>");
const handleInput = main.indexOf('function handleInput()');
assert(touchStart >= 0, 'movement touchstart handler should exist');
assert(lostCapture > touchStart, 'joystick should handle lost pointer capture after movement listeners are installed');
assert(main.includes('Do not clear the active joystick here;'), 'lostpointercapture should not kill active mobile drags before pointermove arrives');
assert(main.includes("window.addEventListener('blur', resetJoystickVisual)"), 'page blur should clear active movement input');
assert(main.includes("document.addEventListener('visibilitychange', () =>"), 'visibility change should clear active movement input');
assert(main.includes("window.__resetMovementTouchInput = () => resetJoystickVisual();"), 'panel/combat interrupts need a closure bridge to reset jsTouchId');
assert(main.includes('function hasVisibleBlockingPanel()'), 'movement blocking should inspect visible DOM panels instead of stale panel stack flags');
assert(main.includes('function isMovementBlockedByUi()'), 'movement block logic should be centralized');
assert(main.includes('if (!isInStageRun && !isInSecretRealm && isAnyPanelOpen()) return true;'), 'active dungeon runs should not let stale hidden panel flags block joystick starts');
assert(main.includes("closeAllPanels({ sync: false });\n    showStageSelectUI = false;\n    showStageClearPanel = false;"), 'entering a stage should clear the entire panel stack before enabling movement');
assert(handleInput >= 0 && main.indexOf('if (isMovementBlockedByUi())', handleInput) > handleInput, 'handleInput should use visible-panel movement gating');
assert(handleInput >= 0 && main.indexOf("if (joystick?.active && typeof clearTouchMovementState === 'function') clearTouchMovementState();", handleInput) > handleInput, 'handleInput should clear stale joystick when combat/panels interrupt movement');
assert(!main.includes('if (joystick?.active) clearTouchMovementState();'), 'idle input should not clear an active joystick before the first touchmove');
assert(main.includes('Keep an active joystick alive while the finger is still inside the dead zone.'), 'dead-zone frames should preserve active joystick ownership');
assert(/#touch-controls\s*\{[\s\S]*(?:inset:\s*0|top:\s*0;[\s\S]*bottom:\s*0;[\s\S]*left:\s*0;[\s\S]*right:\s*0)[\s\S]*touch-action:\s*none;/.test(css), 'touch controls should remain full-screen for fresh drag starts');
assert(/body\.stage-run-active:not\(\.combat-active\):not\(\.panel-open\) #touch-controls\.show[\s\S]*display:\s*block !important;[\s\S]*pointer-events:\s*auto !important;[\s\S]*touch-action:\s*none;[\s\S]*z-index:\s*54;/.test(css), 'stage run touch overlay should receive full-screen movement drags above menu chrome but below action buttons');
assert(/body\.secret-realm-run-active:not\(\.combat-active\):not\(\.panel-open\) #touch-controls\.show[\s\S]*display:\s*block !important;[\s\S]*pointer-events:\s*auto !important;[\s\S]*touch-action:\s*none;[\s\S]*z-index:\s*54;/.test(css), 'secret realm touch overlay should receive full-screen movement drags above menu chrome but below action buttons');
assert(/body\.stage-run-active:not\(\.combat-active\):not\(\.panel-open\) #joystick-zone,[\s\S]*body\.secret-realm-run-active:not\(\.combat-active\):not\(\.panel-open\) #joystick-zone[\s\S]*pointer-events:\s*auto !important;/.test(css), 'run joystick zone should not inherit the late pointer-events:none cleanup');
assert(/#action-buttons\s*\{[\s\S]*z-index:\s*55;[\s\S]*pointer-events:\s*auto;/.test(css), 'stage quick buttons should remain above the movement overlay');
assert(/body\.stage-run-active:not\(\.combat-active\):not\(\.panel-open\) #action-buttons[\s\S]*pointer-events:\s*auto !important;[\s\S]*z-index:\s*55;/.test(css), 'stage run quick actions should keep a late touchable z-index override');

console.log('stage movement freeze static checks passed');
