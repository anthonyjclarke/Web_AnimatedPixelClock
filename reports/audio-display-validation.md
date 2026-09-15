# Audio display timing fix

14 September 2026. User reported intermittent one-frame clock bleed-through during audio visualization and supplied a CleanShot recording. Sampled recording frames show the Classic EQ display and corner clock; the exact transient was not independently isolated frame by frame.

## Cause and change

Worklet packets were stamped with `performance.now()`. The visualizer's animation callback used the older requestAnimationFrame timestamp. A packet received after that timestamp but before callback execution made `now < receivedAt`. `AudioFrameStore.recent()` rejected the packet, and after the initial forced grace the panel chose its full-clock fallback for that frame.

The callback now samples `performance.now()` when it executes. Freshness treats a newer packet as age zero instead of a disconnected source. The two-second stale indicator and ten-second fallback boundary remain. The change is in `app/audio-frame.ts` and `app/visualizer-panel.tsx`.

## Verification

A regression reproduces 120 packets arriving two milliseconds after their render timestamps, beyond the initial forced grace. Every packet remains eligible/fresh. Existing stale, expiry and explicit-clear boundaries still pass. All 28 related audio/input/framebuffer tests passed when the fix landed; the current complete suite passes 101 tests. TypeScript and production build pass.

```sh
node --test tests/audio.test.mjs tests/audio-input.test.mjs tests/framebuffer.test.mjs
```

Live acceptance after reload remains: play continuous audio beyond ten seconds and check for clock flashes; stop the source and confirm intended fallback. The user has not yet confirmed post-fix visual acceptance. This is a display-selection race fix, not removal of the intentional clock fallback.
