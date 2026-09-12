# Recovery verification — 12 September 2026

The crash preserved the working files. The previous published checkpoint was the calibration fix (c7888233dce59eb40b07a95719763979ba924a16); the arcade expansion and redesign were still uncommitted and unfinished.

Recovered and completed locally:
- Six games: Zombie Boxing, Bird Flight, Neon Saber, Sword Arena, Orbit Guard, Target Rush; Motion Lab retained.
- Minimal interface, working device/calibration dialog, collapsible diagnostics.
- Estimated calorie counter, active live-play minutes, weight/effort controls, workout-time goals, session reset.
- Articulated zombies and gloves, gait/attack/recoil/knockout animation, smoothed practice punches, next-opponent camera focus.
- Procedural sound effects with gesture unlock and mute, local personal bests.

Verification:
- All JavaScript files pass syntax checking.
- 16 Node tests pass: packet decoding, calibration UI state, collision/retraction, two-hit kills, camera target selection, practice punch curve, calorie integration and exclusions.
- Browser: first punch leaves the zombie alive; second punch produces score 100 and opponent 2. Death/run-over also verified.
- Browser: each of six games starts and pauses, without console errors.
- Browser: setup dialog, Motion Lab demo, sound mute, and 5-minute goal (300 seconds) work.
- Browser: keyboard play accrues 0 kcal; 390px layout has no document horizontal overflow. Desktop dimensions checked at 1440px.
- Firmware and wiring were not changed. No physical ESP32/IMU test was performed.

Publication is blocked: Sites get_site returns NOT_FOUND for the existing manifest project. The live browser is signed out and reaches the ChatGPT login page. No new Site was created and no production replacement was attempted. Reconnect the original owning account/workspace, then publish the existing Site.
