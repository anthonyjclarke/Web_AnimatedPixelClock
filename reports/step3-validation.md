> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

# Step 3 — audio input and visualizer mode

Implemented locally on 10 September 2026. Step 4 remains pending.

## Delivered

- A separate Audio visualizer tab, with Audio source, Visualizer effect, and Color & display cards.
- Local audio-file playback (up to 100 MB), microphone capture on explicit button press, and a clearly labelled silent deterministic demo. Files are decoded in browser memory and never uploaded. Microphone input is not monitored through speakers.
- The existing firmware effects: Classic EQ (0), Neon Mirror (1), Phosphor Waterfall (2), Purple LED Stage (3). The registry reserves original IDs 5 and 6 for Step 4; there is no effect ID 4 and no placeholder effect selectable in the interface.
- Native 128×64 rendering via the shared complete-frame presenter; Classic EQ's three color zones, original fixed palettes for the other effects, brightness/glow, and a cached corner clock using the clock's timezone/format.
- Audio packets containing `FFT1`, 32 unsigned band bytes and optional 128 waveform bytes, monotonic receipt time, packet serial and waveform serial. Short legacy packets clear any previous waveform. Parser behavior accepts extended packets as the firmware does.
- A 2-second stale threshold and 10-second eligibility/grace window. After eligibility expires, the panel shows the clock while leaving audio controls available. Stop, mode exit, and source replacement immediately clear the old input.
- Capture uses an AudioWorklet to collect mono 40 ms blocks independently of display refresh. Processing ports the companion's 2048-point FFT, Hann window, 32 logarithmic bands, spectrum AGC, 8-sample waveform averaging, first rising-crossing trigger, and waveform AGC/headroom. The worklet can resample device PCM to 48 kHz if necessary.
- Stop, end-of-file, input failures, mode exit and source changes close the AudioContext and release tracks/nodes. A late microphone-permission result cannot resurrect an input that was stopped.

## Validation

- 44 automated tests pass, including all existing animation/framebuffer regressions and new packet, expiry-boundary, signal, rendering, resampling and lifecycle cases.
- `tests/reference/audio.py` extracts and runs the unchanged `_process_block` and `_process_wave` methods from the local companion with NumPy. Across 32 sequential signal blocks, 1,024 band bytes matched exactly; 4,096 waveform bytes differed by at most 1 byte due to floating-point rounding. Results and source hash: `step3-audio-results.json`.
- TypeScript validation and production build pass.
- In-app browser: Step 3 marker verified; demo displayed all four effects; a generated low-volume WAV file reached “Receiving audio”; Stop cleared its source; original-palette guidance appeared for non-EQ effects. Responsive tab layout was corrected during this check.
- Pause/resume, microphone permission races and failure cleanup are covered with mocked browser audio resources. The browser pause attempt did not visibly confirm the state transition; explicit pause/resume status handling was subsequently hardened. Physical microphone capture/permission was not exercised, and no claim is made about every browser/audio device.
- The four baseline effects follow the current firmware formulas, but this step does not claim exhaustive pixel-for-pixel C++ render parity. Audio processing comparisons are separate from those visual smoke checks.

## Reference and limits

Reference: `../AnimatedPixelClock/src/viz/visualizer.{h,cpp}`, `src/config/config.h`, color defaults in `src/config/settings.cpp`, and `PC-Companion-App-v4/companion-common/audio_spectrum.py`.

The local browser does not capture arbitrary PC system audio or ingest UDP. A future companion bridge needs an explicitly designed transport. Microphone capture requires an available device and browser permission on a secure origin. Audio autoplay/device behavior may vary by browser. Effect/color choices currently last for the visualizer session; audio never auto-starts when reopening the tab.

No firmware, companion configuration, source upload or deployment was changed. Next: Oscilloscope, then Starfield Overdrive, with reference signal and frame checks.
