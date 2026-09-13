# Angled boxing and three-game lineup — 12 September 2026

- The carousel and Next game flow now contain Zombie Boxing, Bird Flight, and Orbit Guard. Spell Rush, Sword Arena, Neon Saber, and Target Rush are removed from the playable lineup and current guide. Their scenes and weapons are no longer constructed by startup code. Historical records remain preserved.
- Zombies maintain varied approach angles (roughly ±22°), with the current opponent locked until defeated. Waiting enemies approach separate angles without crowding the player's immediate hit range. Knockouts select the nearest living opponent and turn the complete camera and avatar together.
- Sensor trajectories remain in the calibrated body frame for punch classification and speed measurement. Collision paths rotate into the same world space as the rendered gloves and animated zombie capsules. Camera turns therefore cannot create punches or require physical torso turns; the player keeps facing the calibration direction.
- Calories and speed now use large, separate readouts (48 px desktop, 34 px at narrow widths). Boxing and Orbit Guard show estimated wrist speed with a brief peak hold for legibility; flight shows forward speed. Pause resets displayed movement speed, and practice still earns no calorie credit.
- Practice Strike/Flap buttons reflect their existing recovery interval instead of appearing ready while a press would be ignored.

Verification:
- 77 automated tests passed, including angle-preserving close hits/misses, target-lock transitions, frame-rate-independent turns, and no phantom punches during automatic turns. All 26 configured JavaScript syntax checks and diff whitespace checks passed.
- Browser carousel loop contained exactly the three retained games and wrapped back to Zombie Boxing.
- Browser boxing: a brawler knockout scored 100 and turned toward the right-side runner. Forward jabs hit after the turn, defeated that runner, scored 225 total and selected the brute on the opposite angle, retaining five health points. Wrist speed displayed 2.0 m/s during the sequence. The rotated environment, aligned gloves and enlarged counters were visually inspected.
- Browser Orbit Guard: moving the shield updated the large wrist-speed counter to 4.1 m/s; the game continued registering blocks. Browser flight: first flap changed the speed from 0.0 to 4.0 m/s and started the round. Pause and lobby navigation worked. Practice calories remained zero; no console warnings/errors were reported.
- Physical BLE hardware and sensor-to-screen latency were not measured. Firmware and Bluetooth rates are unchanged. Changes are local; no hosted Site deployment occurred.
