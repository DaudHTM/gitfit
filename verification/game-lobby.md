# Game lobby and forgiving calibration — 12 September 2026

Implemented:
- A full-window lobby with six game choices, Play, time and calorie session targets on the left.
- A shared stylized human rig with a face, hair, jacket, trousers, shoes and articulated hands. The lobby shows the right arm live after calibration; before calibration it demonstrates the required reference pose. Stale tracking freezes the last calibrated pose.
- Connection-only dialog under the avatar. Successful Bluetooth connection closes it. Both calibration captures, progress, cancellation and errors stay inline in the lobby.
- Play enters gameplay immediately, requests native fullscreen, and keeps a full-window fallback. Pause/resume and return-to-lobby remain in the game. Keyboard focus moves into the game so Space works after Play.
- The selected game's actual environment is the lobby background. Added castle details, neon arches, an orbital planet/stars and target-room details.
- A shaped steel sword with guard, wrapped handle and jewel; a separate glowing saber; feathered bird with face, beak, tail and layered wings. The visible blade uses the existing perpendicular grip transform and collision length.
- Calorie and time targets track cumulative live play across rounds. Practice is excluded, as are paused, hidden and disconnected intervals. Existing session totals survive game switching, but reload/reset clears them.
- Calibration firmware: gyro variation tolerance 0.05 → 0.10 rad/s standard deviation; acceleration variation 0.08 → 0.10 g; per-axis rotation guard 0.50 → 0.65 rad/s. Three-second averaging, geometry checks and sample/notification rates remain unchanged. Uploading the updated sketch is required.

Verification:
- All JavaScript syntax checks and 32 Node tests passed. Fullscreen tests include direct Play entry, pending native entry cancelled by return-to-lobby, and Escape fallback pause.
- Actual firmware calibration code compiled into a C++ regression test: 2,000 arbitrary mounting orientations, invalid poses, stationary noise, 8 Hz small tremor accepted with accurate mean pose/bias, larger motion rejected.
- Arduino CLI full ESP32 compile passed: 620,184 bytes flash, 37,732 bytes global RAM. Downloaded sketch exactly matches firmware source.
- Browser: shared rig boxing with hooks scored 200; new sword arena scored 210; bird flaps gave 5.7 m/s and 2.6 m altitude with ring score 100; saber scored 200; Target Rush scored 525; Orbit Guard starts and pauses. All returned to the lobby.
- Browser: connection-only modal opens/closes; avatar demo moves; 20-minute and 100-kcal targets update progress maximums to 1,200 seconds and 100 kcal. Practice stays at zero calories.
- Browser: desktop and 390 × 844 mobile layout checked; no horizontal overflow. Fixed mobile CSS that exposed the lobby during gameplay; verified it is hidden in-game and restored on exit. Native fullscreen screenshots sometimes resize incorrectly in the in-app test browser; controls and DOM bounds were checked separately.
- No browser console errors. Actual ESP32 connection and physical wearable calibration were not performed; the new firmware was compiled, not flashed.

Publishing remains blocked because the existing Sites project returns NOT_FOUND for the current account/workspace. No replacement Site was created. The updated app is available in the retained local preview.

## Single-game selector follow-up

Replaced the six-button grid with one game name, category and position counter between Previous/Next buttons. Verified all six choices in order, wrapping in both directions, keyboard navigation, and matching scene titles. The same selection function continues to update the 3D world and launch the selected game. Desktop and mobile layout checked; no new runtime errors.
