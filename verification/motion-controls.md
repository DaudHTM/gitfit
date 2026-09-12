# Motion controls verification — 12 September 2026

Implemented on the existing local Site:
- Fullscreen entry inside the viewport, with in-view exit, pause/resume and practice action controls. Expanded-page fallback covers unavailable/pending native fullscreen.
- First-person defaults and hidden player head/torso; close shoulder and opponent focus alternatives.
- Rigid perpendicular sword grip shared by the rendered blade and its collision segment, trails and cut effects.
- Directional downstroke flight with lift, thrust, drag, gravity, gliding and low-altitude penalties. Practice flaps have selectable effort and directional aim.
- Trajectory-based jab/hook/uppercut classification and bounded speed-based boxing damage. Reconstructed wrist samples are processed from the existing 100 Hz notification sequence; no firmware changes.
- Target accuracy/reaction bonuses and more detailed sword/shield/saber visuals and cues.

Checks:
- 30 automated tests pass, covering all three trajectory classes, small noise, rearming, stale gaps, damage scaling, flap strength/direction, flight dynamics, arbitrary-pose blade perpendicularity, fullscreen pending-promise fallback, calorie exclusions and the existing protocol/calibration behavior.
- Browser: hook recognized at estimated 2.5 m/s (59 damage); uppercut recognized at estimated 3.2 m/s (75 damage).
- Browser: repeated sword swings scored 330; timed saber cuts scored; fullscreen exit/pause/action controls were visible and usable.
- Browser: flaps increased speed and altitude, mobile Bird Flight start/pause was accessible, Target Rush scored 526 across three test strikes, and keyboard calories remained 0.0.
- Browser: no horizontal document overflow at 390 px; Orbit Guard start/pause works; no console errors in checked flows.

Limits: no physical wearable test, and speed/damage are game estimates rather than measured impact force. Publication is still blocked by the existing Sites project's NOT_FOUND response; changes are saved locally, not yet deployed.
