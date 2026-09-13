# Ongoing hackathon polish

The active goal is to improve UI, functionality, latency, sound, animation, dynamic game rules, enemy variety and additional games, with a strong short-demo experience. It remains active; this file records verified checkpoints rather than declaring the entire goal complete.

## Current pass

- Removed calibration/status DOM writes from the 100 Hz Bluetooth callback. Quaternions and gesture samples still update immediately; labels/HUD run at 10 Hz. Avoided repeated unchanged label writes, game-canvas layout reads and idle particle-matrix uploads.
- Added Auto / Low / High graphics quality. Auto starts at up to 1.5 pixel ratio, reduces it after sustained slow rendering and recovers slowly. Rendering diagnostics are inside Settings and do not represent physical sensor-to-screen latency.
- Bundled the existing Three.js 0.180.0 engine and both fonts locally. Registry tarballs were checked against their published SHA-512 integrity values; licenses and provenance are included. Startup no longer depends on engine/font CDNs.
- Added sword duels: actual opposing swords, telegraphed blade contact, parry stagger, an opening requiring a fresh counter-slash, and a one-hit finish. Vanguard, Duelist and Warden have different timings/rewards. Guarded armor cannot be bypassed with repeated attacks. Practice has a visible Guard toggle and G key; live play uses actual blade placement.
- Added distinct warning, parry and counter sounds plus matching impact arcs and opening cues. First parry per opponent earns 25 points; results report parries and finishes.
- Added brawlers, runners and armored brutes with different health, movement, attack timing, models and rewards. Brute hitboxes scale with the wider torso. A brute survives two maximum-power strikes.
- Added Quick 45-second rounds, enabled by default, alongside Standard rules. The countdown and a clean result/replay flow suit a short presentation; this is independent of the cumulative fitness targets. Practice remains explicitly labeled and adds no calories.

## Verified behavior

- Browser: a placed guard parried the first sword, then a separate counter killed it while preserving full health. A held guard continued to parry subsequent cycles; the 45-second round ended with “Round complete.” and replay controls.
- Browser: brawler and runner knockouts scored 225 combined. Brute health progressed 220 → 146 → 71 → defeated over three distinct strikes; total score became 450. Full player health remained.
- Browser rendering diagnostics read approximately 55–60 FPS and 17–18 ms 90th-percentile frame intervals during the checked scenes. This is a local observation, not a guarantee for other devices or measured BLE end-to-end latency.
- Browser: bundled modules/styles loaded, no console errors, and the 390-pixel Settings panel stayed within the viewport with vertical scrolling. No physical wearable session was performed.
- Node: 54 tests and 18 source syntax checks passed. Coverage includes duel timing/contact/recovery, damage variety, graphics adaptation, unchanged text writes, action sound envelopes and local asset completeness, alongside the existing tracking/calibration/flight tests.
- Browser: Round and Graphics preferences survived reload; the preview was restored to Quick / Auto, connected-arm input and the normal viewport.

## Spell Rush and sensor-sweep pass

- Added a seventh game, Spell Rush: jab / hook / uppercut cast Firebolt / Arc / Rise. Readable front-ward prompts teach all three; later enemies require two different gestures. Every fifth defeat enables a six-second double-points phase. Wrong spells deflect, missed wards cost health, and results report matches, defeated wards and best chain.
- Added a crystal-portal environment, animated rune enemies, a hand rune, twelve reusable curved spell trails, gesture-colored pooled impact effects, four sound cues and a seventh original music theme. The lobby stays a single-game carousel. Practice 1 / 2 / 3 shortcuts and Cast use the same trajectory classifier; live input and calorie rules are unchanged.
- Sword and saber collision checks reconstruct actual blades at intermediate sensor poses. They consume at most twelve samples from the latest 100 ms, reject duplicate timestamps, and prevent stale backlog jumps from becoming strikes. Displayed arm pose remains immediate. Reconstructed geometry matches the rendered quaternion grip in tests.
- Fixed saber’s late “CUT NOW” cue and practice animation that swung away from the blocks. The cue now leads the strike plane and the animation crosses the blocks before recovering; tests cover all six block positions and 0–120 ms cue response delays.
- Fixed conflicting 60-second versus 45-second HUD timers in quick rounds, retained the selected practice gesture/effort throughout each animation, cleared stale wrist readouts on new rounds, and made lost health visible as empty pips.

### Verification

- 62 Node tests and 20 JavaScript syntax checks passed; no diff whitespace errors.
- Browser sword: Guard earned 25, a fresh counter earned 200, full health remained. This validates the new sample-history integration in practice; intermediate physical sensor traces are covered by deterministic tests.
- Browser saber: followed the visible cue for three consecutive hits, scoring 330 / 3× with full health.
- Browser Spell Rush: verified all three keyboard shortcuts, multi-stage wards, overdrive, pause/resume and a complete 45-second round. Result: 8,475 points, 18 defeated wards, 100% matched casts, best chain 34. Practice added no calories. Rendering read 60 FPS / 18 ms frame intervals during play; no console errors.
- Physical IMU motion and end-to-end latency have not been measured. No firmware change or hardware flashing occurred in this pass.

## Results, challenges and rendering pass

- Added compact per-game round challenges, completion chimes, a redesigned score/results panel with three meaningful stats, and a Next game button that starts the next mode directly. Live results show estimated calories for the round and session; practice remains explicitly labeled and uncounted.
- Separated new personal records by game, live/practice input and Quick/Standard duration. Existing mixed records remain untouched in their old storage key. Abandoned rounds no longer save a personal best. Invalid/unavailable storage is tolerated.
- Reused Target Rush ring geometry and saber outline geometry/materials instead of allocating them repeatedly. Batched immutable street, boxing, castle, saber and target-room scenery, preserving animated exclusions and transparent objects. The lobby avatar reuses layout measurements until resize/scroll/layout changes. Settings now includes total scene draw and geometry counts.
- Fixed the zombie jaw losing its initial vertical offset during animation and provided an explicit fullscreen accessible name at narrow widths.

### Verification

- 68 tests and 22 JavaScript syntax checks passed. Static-batch tests compare every instance against the original nested world transforms and verify exclusions; record tests verify input/duration separation and reload behavior.
- Browser Target Rush: 25 hits / 25 bullseyes scored 4,346; the 12-target challenge completed, the round finished, and results showed the correct 45-second time and practice status. Geometry count stayed at 26 from 12 through 25 hits; rendering read 60 FPS / 18 ms frame intervals. Draw counts ranged 53–58 with active effects.
- Browser: result panel fits desktop and 390×844 layouts without horizontal overflow. Next game started Zombie Boxing with a fresh score, full health and 45 seconds, keeping practice input.
- Browser: after reload, Target Rush Practice/Quick best was 4,346; Live/Quick and Practice/Standard remained zero. Restored Quick and live input after testing. Batched castle/lobby visuals inspected; no console errors.
- This is local rendering evidence, not a controlled before/after hardware latency benchmark. No physical IMU session or firmware changes in this pass.

## Flight launch and Orbit Guard pass

- Flight waits for the first valid downstroke before applying gravity, moving obstacles, advancing the round clock or accruing live fitness time. A compact launch cue disappears once flying. Bright-sky status labels now have suitable contrast, and the footer instruction has a small translucent backing.
- Replaced Orbit Guard's frame-rate-dependent arrow smoothing with direct time-scaled movement and immediate tracked positions. Dragging projects the pointer onto the actual shield plane; practice hand animation follows the shield.
- Added shrinking landing markers, centered-block bonuses, four-perfect-block shield surges, arcing meteors and faster ion bolts across escalating waves. The six hazards and markers are pooled. New layered perfect-block and surge sounds accompany the effects; results show perfect blocks.
- The existing forgiving two-pose calibration and animated close-range zombie hit volumes remain present. The downloadable sketch matches the firmware source. Applying calibration changes to hardware still requires uploading that sketch.

### Verification

- All 74 Node tests and 24 JavaScript syntax checks passed. Guard tests cover movement at multiple frame rates, exact crossing-time collision, normal/perfect catches, surge expiry, bounded waves and one-time misses. Flight tests cover idle launch and invalid flaps as well as the existing obstacle-depth regressions.
- The actual C++ calibration code again passed 2,000 arbitrary mounting cases, current T-pose initialization, relaxed tremor tolerance, brief-bump grace, bias averaging and sustained-movement rejection. No firmware changes or hardware flashing occurred in this pass.
- Browser flight remained at 0 m / READY between checks; the first Flap changed the cue, advanced distance and enabled the round clock. Pause worked and practice calories remained zero.
- Browser Orbit Guard: four directed perfect blocks scored 660, retained all five health points and activated a five-second wider-shield surge. A stationary run also reached mixed later waves, registered misses and displayed Blocks / Perfect / Best chain results correctly. Direction controls disable while paused or over.
- Browser boxing: repeated recovered jabs at close range reduced a brawler's health and a further jab scored a 100-point knockout, advancing focus to the next runner. The test included a pause/resume. No browser console warnings or errors were recorded.
- This verifies simulated controls and deterministic motion traces. Physical wearable feel and sensor-to-screen latency remain unmeasured.

## Continuing work

- Further tune first-time game cues and character/impact animations without adding lobby clutter.
- Profile sustained play and allocation/resource behavior across every game; validate physical end-to-end latency and wearable parry feel when hardware input is available.

The working app is served locally. The previously inaccessible hosted Site has not been replaced.
