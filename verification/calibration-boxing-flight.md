# Calibration, close boxing hits, and vertical flight — 12 September 2026

Calibration firmware now accepts gyro standard deviation up to 0.20 rad/s and acceleration standard deviation up to 0.15 g. Brief outliers pause sample collection rather than immediately discarding progress; 30 consecutive rejected samples (150 ms at the nominal 200 Hz rate) restart the window. Each pose averages 600 accepted sample pairs. Instantaneous gyro above 0.95 rad/s, sustained mean rotation above 0.40 rad/s per axis, invalid acceleration, and persistent instability still fail. Both pose geometry checks and existing BLE sampling/notification rates remain intact. The downloadable sketch matches the firmware source; uploading it is necessary to apply the new tolerance.

Boxing now uses separate head and torso capsules transformed by the actual animated bones, with a glove-radius allowance and swept collision checks. First classification includes the stroke's earlier trajectory. The front zombie stops at -0.78 m. An 8 cm retraction rearms the live detector without requiring the exact previous guard or a perfectly still interval. Recovery cannot deal damage through the smoothing tail; one stroke still hits only once.

Bird Flight is now vertical obstacle survival: constant 4 m/s forward movement, no lateral steering, and downward flaps for lift. It has upper/lower obstacle pairs, progressively narrower gaps, continuous collision through the entire obstacle depth, 100 points per completely cleared gap, distance/gap HUD, and a run ending on ground or obstacle contact. The sky limit clamps height without an invisible ceiling collision. Stronger flaps give more lift. Practice supports Space, the Flap button, and clicking/tapping the scene. It retains the bird rig, first-person wings, sounds and fullscreen flow.

Verification:
- All 45 Node tests passed. New regressions cover close/head/body/inside/fast punches, partial retraction and missed-stroke recovery, earlier trajectory contact, no sideways flight, bounded forward speed, upper/lower gate collisions, score-once-after-clear, reset and crash freezing.
- All 16 JavaScript syntax checks passed; `git diff --check` passed.
- Actual C++ calibration code passed 2,000 arbitrary sensor mount cases, final T-pose orientation checks, gentle and larger wobble acceptance, spike grace, sustained rotation rejection and bad-pose rejection.
- Arduino-ESP32 3.3.11 / NimBLE-Arduino 2.5.1 compile passed: 620,244 bytes flash and 37,732 bytes global RAM. No device was flashed.
- Browser: waited for zombies to reach their stopping distance; repeated jabs scored a knockout with full player health. Close uppercuts also scored a knockout. Flight buttons and scene taps each cleared the first obstacle for 100 points. Repeated flaps hit the upper obstacle, ended the run with zero gaps, and showed the restart screen. Pause and returning to the lobby work. Practice stayed at zero calories. No browser console errors.

The physical wearable has not been tested. Changes are saved locally; the existing hosted Site was not replaced or deployed by this update.
