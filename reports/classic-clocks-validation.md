> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

# Standard and Large clocks — 13 September 2026

Restored src/clocks/clock_common.cpp layouts with classic Adafruit GFX bitmap text. Standard time is at (19,8), size 3; date at (34,38); full weekday centered at y=52. Large time is at (4,4), size 4; date at (34,54). AM/PM is white at (110,8) or (110,54). Both use a black native background. Removed the browser-only Standard seconds counter and generic block-digit layout.

Added all four native date formats for these two styles, stored with validated preferences. The existing Show date toggle remains a browser extension; it hides Standard's date and weekday together. AM/PM remains visible when the date is hidden. Other clocks' date formatting and shared colon modes/rates remain on the roadmap.

Validation: 64 automated tests, TypeScript and the production export build pass. Native fixture harness compiles unchanged Standard/Large and meridiem functions with host time/display APIs. Its text renderer uses the original GFX font column data and integer scaling. 672 frames / 5,505,024 pixels match exactly: both styles, all seven weekdays, all four date formats, 12/24-hour modes, visible/hidden colon, and midnight/noon/23:05. Fixture date is September 2026; tests separately cover timezone crossing midnight, date hiding and removal of synthetic seconds. Hardware Wi-Fi/error indicators are outside the valid-time/connected reference scenario. This is host-renderer parity, not a physical LED-panel measurement.

Commands:

```sh
python3 tests/reference/classic.py ../AnimatedPixelClock '/path/to/Adafruit GFX Library/glcdfont.c' /private/tmp/classic-reference
node tests/reference/classic.mjs
```

Reference output is `classic-reference-results.json`. Added `ROADMAP.md` with the remaining fidelity work and planned Synology DS423 Docker packaging, HTTPS, settings migration and reboot/rollback acceptance. No container or NAS deployment was performed.
