# Immersion update — 12 September 2026

Added six original procedural scores with quieter lobby arrangements, game percussion, stereo placement and short reverb. Web Audio uses an interactive context, separate music/effects gains, a compressor and a bounded 120 ms scheduling window. Music responds to wave/combo intensity; flight ambience responds to speed. Pause, hidden tabs and scene transitions stop scheduled sources and timers. No audio or music downloads are required.

Action cues cover punch, knockout, swing, armor, slash, shield, hurt, ring, target, footsteps, enemy warning, flap, round start, completion and defeat. Punch intensity changes the mix. Explicit cue types fix successful enemy damage being mistaken for player damage by text matching.

Visual feedback uses fixed pools of 144 instanced shards, 12 expanding rings and eight slash arcs, plus a short light/vignette response. Camera recoil and opponent reaction follow impacts. Flight has peripheral speed streaks; saber's strike plane pulses with its 120 BPM score, with blocks arriving on every second beat. Sword opponents fall away when defeated. The new effects do not add a motion-input queue or change BLE/firmware timing.

Music and Sound effects sliders live inside Settings, persist locally, and start audio only after interaction. Impact effects and Camera motion can be disabled; reduced-motion preferences default both off. The mute button remains accessible over pause/results overlays. The minimal home layout is preserved.

Verification:
- All 36 Node tests and 15 JavaScript syntax checks pass, plus `git diff --check`.
- Audio tests cover every score/cue, finite envelopes, initial autoplay lock, independent volume channels, pause, mute/unmute, scene changes, delayed schedulers, and source/timer cleanup.
- Browser practice: boxing scored 100 with a knockout, then a successful punch reported `data-kind=punch`; saber scored 100; sword scored 210 and showed armor-break feedback; Target Rush scored 519 with `data-kind=target`. Flight flaps reached 6.1 m/s. Orbit Guard starts/pauses. Practice remained at zero calories.
- Desktop screenshots show boxing fragments/recoil, flight view, and sword armor feedback. Mute/unmute verified on both results and pause overlays. Sliders changed independently and restored to 48/80; values survived reload.
- Mobile 390 × 844 Settings is usable without horizontal overflow. No browser console errors in the tested games. Temporary viewport override reset afterward.
- Audio graph behavior was tested, not a subjective listening assessment. No physical wearable session was performed; firmware is unchanged.

The existing Sites project still returns NOT_FOUND in the current account/workspace. This update is saved locally and available through the retained localhost preview; it is not deployed to the existing hosted URL. No replacement Site was created.
