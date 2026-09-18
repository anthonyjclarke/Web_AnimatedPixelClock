# Code EQ validation

Source: [NickoScope/AnimatedPixelClock commit 85c9be92](https://github.com/NickoScope/AnimatedPixelClock/commit/85c9be92a5b33b17c126ab63db6bc2ae7c9cc331), by [Nikolay Miroshnichenko (NickoScope)](https://github.com/NickoScope).

## Repository checks

Development snapshot, 18 September 2026: all 123 tests, TypeScript and production export pass. macOS launcher syntax and targeted warning filtering were checked. Windows execution and interactive browser/audio-device acceptance remain open.

## Reference checks

- 300 consecutive 60 Hz RGB frames match the upstream Python CodeEQ renderer exactly by SHA-256. Inputs exercise initial silence, variable bar heights and held peaks, four isolated beats, and all-band saturation. Original upstream font data and RGB565 conversion are used by the reference.
- 160 packet-analysis frames agree with the compiled upstream C++ PcFrameDeriver: beat decisions match exactly; levels, peaks, grouped energy and beat strength agree within 0.00001. JavaScript uses double precision while this C++ reference uses float.
- Additional tests cover peak hold/decay, silence beat suppression, invalid band count, non-finite timing, disabled glitches, bounded packet retention and consumption of intermediate beats exactly once.

These comparisons establish parity for the recorded inputs, not every possible input or browser. No interactive browser/audio-device acceptance was performed for this change.

## Integration decisions

Waterfall remains ID 2. Code EQ is ID 15; IDs 7–14 are reserved. No clock-style IDs or Matrix clock settings change. Audio analysis runs once per packet; a 128-packet history bounds memory and retains approximately five seconds at the current 40 ms packet rate. Packets older than the existing two-second freshness threshold are skipped. Source changes reset analysis and effect state; a prolonged display suspension resets the scene. The existing ten-second eligibility fallback remains intact.

The optional Beat glitch control gates beat events, preserving reference behavior when enabled. It is a toggle rather than a percentage slider because the reference Code EQ flash has a fixed duration/intensity whenever beat reactivity is greater than zero.

## Reproducing reference fixtures

Use `python3 tests/reference/code-eq.py /path/to/NickoScope/AnimatedPixelClock` with the reference checkout at the pinned commit. It requires Python with NumPy/Pillow and a C++17 compiler. This developer-only script generates the two fixtures; ordinary `pnpm test` uses the checked-in fixtures and needs no network, Python, firmware checkout or compiler.
