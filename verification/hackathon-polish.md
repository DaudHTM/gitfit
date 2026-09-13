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

## Continuing work

- Add a distinct new game that demonstrates arm gestures quickly, with the same live/practice separation and fitness accounting.
- Extend sword collision analysis to all recent sensor samples, while bounding work and avoiding stale-sample actions.
- Further improve short-round results, game-specific challenges and readability; preserve the minimal lobby.
- Profile sustained play and allocation/resource behavior across every game; validate physical end-to-end latency and wearable parry feel when hardware input is available.

The working app is served locally. The previously inaccessible hosted Site has not been replaced.
