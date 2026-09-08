# Animated Pixel Clock — Web

Browser adaptation of AnimatedPixelClock's 128 × 64 RGB matrix. Includes 13 styles, automatic rotation, local clock time with IANA timezone and DST support, 12/24-hour time, date, color, brightness, glow, animation pause/replay, and fullscreen. Preferences are saved in this browser.

## Running

Install with `pnpm install`, then use `pnpm dev`. Build with `pnpm build`. The static export is generated in `out/`.

## Adaptation scope

The original Tetris/Pac-Man 5 × 7 numeral patterns are retained. Arcade scenes are browser recreations, not a direct execution of the firmware's physics and game logic. Weather, ESP32 device settings, OTA, ambient GIFs, notifications, and PC performance monitoring are not included.

## Validation

TypeScript checks and production export pass. Renderer checks cover all 13 styles at six animation times and both sides of midnight; time checks cover 12/24-hour format and Sydney daylight saving. No browser interaction testing was requested. Optional WebMCP style selection is feature-detected; no supported WebMCP validation context was available.

## Attribution

Based on Keralots/AnimatedPixelClock. The original MIT license is included in LICENSE. Original project source was used as read-only reference.
