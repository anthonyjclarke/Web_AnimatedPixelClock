# Animated Pixel Clock Web roadmap

Initial web release v0.1.0 — 15 September 2026. Target: faithful ESP32 v2.3 clock behavior, then a self-hosted Docker deployment on the user's Synology DS423 NAS. Current work stays local; NAS packaging and installation are future steps.

## Current status

All 14 listed clock styles and six visualizers are implemented. **No listed arcade ports remain; Weather and other original functions are still missing.** Current regression suite: **117 passing tests** (15 September 2026); latest TypeScript and production build checks pass. Full visual/pixel acceptance is still open. See [documentation index](reports/README.md).

## Delivered

- Initial GitHub release packaging, portable getting-started instructions, dependency-free static server, and Linux/macOS/Windows CI checks.


- Ambient screensaver: five original built-in scenes, custom PCA playback with local persistence, manual/scheduled operation and corner clock. See [validation](reports/ambient-validation.md); procedural full-frame parity remains unverified.
- Configurable saved cycle interval under Display settings (5–3600 seconds).
- macOS and Windows startup launchers; Windows execution acceptance remains open.


- Doom Fire (upstream style 17), added from current GitHub source: 4,320 exact heat-buffer frames across 36 settings combinations. This was outside the older local source snapshot; it is not a web extra.

- Optional Pac-Man ghost chases (off by default), documented separately in [Web-only extras](WEB-EXTRAS.md).

- Shared framebuffer, timing, cached wall time and audio input pipeline.
- Six audio visualizers including Oscilloscope and Starfield Overdrive.
- Audio display timing fix: newly arrived packets no longer cause a one-frame clock fallback; genuine 10-second timeout behaviour remains. Regression coverage includes the timestamp race.
- Tetris's 12 settings and animation/game modes, with native state comparisons.
- Mario's 7 settings and idle encounters; Pac-Man's 6 settings and pellet behavior, with native state comparisons.
- Bomberman native corridor routing, escape planning, bombs, brick rebuilding and bonus collection; 8,000 native update ticks compared. No mode-specific settings in source.
- Pong native Arkanoid ball/paddle physics, digit spring/shatter/assembly and six settings; 24,000 native update ticks compared across 12 combinations.
- TRON native light-cycle duel, collision trails and continuous digit tracing with both motorcycle variants; 6,000 native state ticks compared. Full-frame parity remains unverified.
- Matrix Rain native glyph columns, mutation/fading and simultaneous decode with four native settings plus the saved browser-only Small/Original rain font option; 18,000 native state ticks compared across speed/density combinations. Full-frame parity remains unverified.
- Dino Runner native running/jumping, cacti/clouds, pterodactyl courier and four settings; 54,000 native state ticks compared across speed/frequency/date combinations. Full-frame parity remains unverified.
- Asteroids native ship/rock physics, shooting, digit shatter and five settings; 9,600 host-native state ticks compared across date/transparency combinations. Full-frame parity remains unverified.
- Space native Invader/Ship attack sequence and five settings; native state and sprite comparisons pass.
- Snake native routing, food and digit-pellet phases with all four settings; 84,000 native state ticks match.
- Standard/Large native font and layouts, four date formats, weekday and AM/PM. 672 complete reference frames match the native display routines through a host GFX text renderer.

These are scoped validation results, not a blanket claim of pixel parity for every animation.

## Remaining sequence

1. **Next — shared configuration and persistence:** colon on/blink/off and rate, date format across the remaining clocks, per-sprite colors and consistent shared bounce settings. Preserve visualizer preferences when switching tabs. Add validated settings export/import so preferences can move from localhost to the NAS origin.
   Completion criteria: common controls visibly affect every applicable mode, settings survive reload/tab changes, and a validated export/import roundtrip transfers preferences to a different origin.
2. **Animation acceptance:** all 14 listed clock styles now have their scoped ports; no arcade ports remain. Review live appearance and transitions, address reported differences, and extend full-frame native comparisons where needed. State comparisons do not establish complete pixel parity.
   Include live audio regression acceptance: no intermittent full-clock frames during continuous audio; deliberate stop and genuine timeout still show the clock.
3. **Docker packaging for Synology:** production static export served by a lightweight web server in a container, built on the development machine or CI. Do not run the Vite development server or perform dependency installation on each NAS boot. Keep the runtime independent of Sites/Cloudflare services. Deliver Dockerfile, .dockerignore, compose.yaml and a NAS installation/upgrade guide.
4. **NAS acceptance and release:** install the container, test desktop/tablet browsers, audio, settings persistence, NAS reboot recovery, updates and rollback. Document resource use and any remaining fidelity differences.

The [original-function audit](reports/outstanding-functions.md) is the current gap list. Further original-function work includes:

- Night dimming and scheduled blanking, with precedence over ambient/audio and overnight tests.
- Rotation enable/order and per-style durations; alignment/offset controls.
- Weather clock, notifications/home-automation API and PC stats/layout. These need explicit data/service designs before implementation.
- Integrated GIF conversion and multiple custom-animation storage.
- Correct the inherited ambient Pac-Man board-completion counter with a documented fix and regression.

ESP32 NTP/OTA/Wi-Fi/DMA settings are replaced by OS/browser/server facilities rather than emulated hardware controls.

## macOS and Windows target

Keep core rendering, schedules, media and storage browser-native. Provide both launchers and portable install commands; validate Windows Chrome/Edge and macOS Safari/Chrome, fullscreen, reload, audio permissions, custom PCA storage and timezone changes. Existing native C++ reference harness regeneration uses developer tools and may require path/compiler adaptation on Windows; normal app use and JS regressions do not require the firmware checkout. Decide native OS screensaver packaging, inactivity activation, wake-lock and login startup separately. PC telemetry/system-audio capture needs platform-specific collectors; do not reuse the Windows-only sensor stack for macOS.

## Synology delivery design

- Confirm exact model (DS423 versus DS423+), installed DSM version, Container Manager version and available LAN port before selecting the image. The DS423 datasheet lists a Realtek RTD1619B 64-bit CPU; Synology maps that platform to ARMv8. Plan a Linux ARM64 image for DS423, with AMD64 as an optional second build for other NAS models. Verify on-device architecture at packaging time rather than assuming an Intel NAS. Sources: [DS423 datasheet](https://global.download.synology.com/download/Document/Hardware/DataSheet/DiskStation/23-year/DS423/enu/Synology_DS423_Data_Sheet_enu.pdf), [Synology architecture mapping](https://help.synology.com/developer-guide/appendix/platarchs.html).
- Check Package Center compatibility on the installed DSM. Synology lists DS423 among models affected by Container Manager version availability; a listed package version is not a guarantee that every DSM version has the same features. [Synology Container Manager version guidance](https://kb.synology.com/en-sg/DSM/tutorial/Why_is_Container_Manager_1630_not_available_on_my_Synology_NAS).
- Serve immutable built assets with correct JavaScript/audio-worklet MIME types and cache rules. Bind the container's web server to its container interface, publish a chosen NAS port and provide an HTTP health endpoint.
- Compose should include a restart policy such as `unless-stopped`, bounded logs and a versioned image. Verify actual recovery after a NAS reboot. Keep the previous image available for rollback.
- Use DSM reverse proxy and a browser-trusted HTTPS certificate for normal access. Microphone capture requires a secure context; the localhost exception does not extend to ordinary HTTP NAS addresses. Validate AudioWorklet and file/microphone input over the final HTTPS origin. [MDN secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts), [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- Animation, browser time/timezone and audio analysis continue on the viewing device. The NAS serves files; its microphone and system audio are not inputs. No audio upload or server-side audio processing is planned.
- Settings remain per-browser/per-origin initially. Changing from localhost to a NAS hostname starts a separate browser-storage scope; use the planned export/import facility. A NAS volume alone does not persist or synchronize browser localStorage. Shared settings across devices would require a separately scoped API/storage feature.
- Keep access on the LAN initially. Public exposure, authentication and remote access are separate decisions. No NAS credentials or configuration changes are required for the current development step.

## Container acceptance checks

- Fresh image starts without development tools, compiler or source mounts; root page and all assets work through the NAS hostname.
- Every clock and visualizer runs, including direct refresh and switching between clock/audio modes.
- Settings persist after browser reload and container replacement; export/import transfers existing local preferences.
- HTTPS microphone permissions and audio worklet initialization succeed; audio stays on the browser device.
- NAS reboot restarts the service; failed upgrades can return to the previous version.
- Record final model, architecture, DSM/package versions, host port, image version and installation commands in the delivered guide.
