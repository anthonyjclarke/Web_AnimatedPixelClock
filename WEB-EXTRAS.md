# Web-only extras

These features extend the ESP32 reference. They are not claims about original firmware behaviour or original arcade-game AI. Native controls and validation are documented separately in reports/.

## Pac-Man: random ghost chase

Enable **Random ghost chase · Web extra** in Pac-Man settings. Off by default and saved in browser preferences; resetting Pac-Man restores the original mode.

During idle patrol, a chase starts after a random 10–24 seconds of simulation time. Pac-Man crosses the bottom lane pursued by red, pink, cyan and orange ghosts (Blinky, Pinky, Inky and Clyde), with random direction and order. Ghosts have directional eyes and animated feet. This is a decorative chase, not maze pathfinding or the four ghosts' individual arcade AI.

The scene finishes after the last ghost leaves the panel. Minute changes/replay take priority and cancel the chase. Disabling the option restores valid patrol coordinates immediately. Pause uses the shared animation clock, so the chase timer and motion pause together. No chase RNG is consumed when disabled, preserving original-mode random sequences.

Tests cover disabled/default/persisted settings, both crossing directions, all four ghost colors, completion/rescheduling and cancellation. The enabled scene is outside firmware parity comparisons.

## Matrix Rain: compact font

**Rain font size → Small (3 × 5)** uses a browser-specific compact font. **Original (5 × 7)** is the default. Rain grid spacing, timing and clock/decode digits remain unchanged. The choice is saved.

## Shared browser conveniences

Timezone selection, canvas glow/scaling, fullscreen, animation pause/replay, automatic style rotation and local audio/demo input are browser-facing features. They should not be interpreted as ESP32 settings. See README.md and individual validation reports for other port-specific adaptations and limits.

## Ambient browser conveniences

The six ambient selections themselves come from the original firmware. Browser adaptations: one local PCA file is kept in IndexedDB instead of a device flash library; Stop suppresses the current scheduled window until it ends or the page reloads. Original auto-mode can immediately resume an active schedule. Pause/Replay also work on ambient scenes. These are browser conveniences, not new upstream animations. Configurable rotation already exists upstream; this web version currently exposes one shared interval rather than the original per-style order/durations.

## Code EQ alongside Waterfall

[NickoScope's fork](https://github.com/NickoScope/AnimatedPixelClock) replaces Waterfall at visualizer ID 2 in selected hardware builds. This browser adaptation retains Waterfall and adds Code EQ at ID 15. IDs 7–14 remain reserved for possible ports of the fork's other effects. A browser Beat glitch switch can disable the reference effect's 100 ms beat flash; the default remains enabled. The Matrix clock's compact font setting does not affect Code EQ's reference 5 × 7 glyphs.
