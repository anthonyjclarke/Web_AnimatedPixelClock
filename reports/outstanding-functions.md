# Original-function audit — 15 September 2026

Compared the local ESP32 README, `src/config/config.h`, ambient modules, and release/v2.3.0/CHANGELOG.md against this web application. Doom Fire is separately pinned to the newer GitHub source recorded in its validation report. This audit does not claim the local firmware snapshot is the latest upstream commit.

| Original capability | Web status / remaining work |
| --- | --- |
| Arcade clocks | 14 listed browser styles implemented, including newer Doom Fire. Weather is a separate missing clock. Source ID 4 is a legacy alias and ID 13/Missile Command is retired, not a missing active arcade port. |
| Ambient screensaver | Now implemented: Invaders battle, Pac-Man maze, stars, aquarium, original 33-frame This Is Fine, custom PCA playback, manual start, hour schedule and optional corner clock. |
| Custom animation library/converter | One local PCA file persists in IndexedDB. Original multi-file library, integrated GIF conversion, crop/pad/stretch/anchor preview and editing remain absent. Use the original converter for now. Hardware flash capacity management does not apply. |
| Custom clock rotation | Saved global 5–3600-second interval and cycle toggle now available. Original enable/disable list, reorder and individual durations remain outstanding. |
| Shared display settings | Brightness, time format, timezone, glow, digit color and basic colon blinking implemented. Still missing: always-off colon, blink rate, general clock alignment/fine offset, full sprite/effect palette, and remaining shared date/bounce consistency. |
| Scheduled night dimming | Missing: minute-level start/end and dim brightness. Plan for browser brightness, with midnight-wrap tests. |
| Scheduled display off / live blanking | Missing. A black browser canvas is distinct from powering off a monitor; do not promise physical power control. Must define precedence over ambient, audio and dimming. |
| Weather clock (14) | Missing: location, units, Open-Meteo data, conditions/range/humidity/sunrise/sunset, offline/error handling and rotation eligibility. The v2.3 weather-fetch fix is not applicable until this is ported. |
| Audio visualizers | All six present, including v2.3 scope/starfield. Local file, microphone and demo inputs. Visualizer settings still reset on tab exit; persistence outstanding. System-output capture and automatic music-triggered switching are not implemented. |
| PC stats / companion layout | Missing metrics screen, host telemetry, live/offline switching, layout editor, bars and sensor formatting. The original Windows/Linux companion and LibreHardwareMonitor cannot be assumed to work on macOS. Needs a separate cross-platform collector/bridge design; browser code alone does not expose these sensors. |
| Settings export/import | Missing. Include clock/display/visualizer settings and versioned validation; define separate custom-media export. Local storage is per browser and origin. |
| Notifications and HTTP control | Missing scrolling banners, icon/duration/position controls and home-automation endpoints. Current WebMCP style selection is not the original HTTP API. A static NAS host cannot directly control every open browser without an explicit bridge/session design. |
| Network, NTP, OTA, hardware diagnostics | ESP32-specific; not browser features to copy. Use host OS time, normal web-server configuration and application upgrades. Optional browser diagnostics can report app errors/storage, not device heap/DMA/Wi-Fi details. |
| Refresh control | Browser requestAnimationFrame and bounded simulation replace DMA refresh/animation boost. Ambient runs at 30 simulation steps/sec. Firmware panel tuning is not a browser setting. |
| Native OS screensaver / login startup | Not implemented on either OS. Current ambient works inside the open web page and is scheduled/manual, not inactivity-triggered. macOS `.command` and Windows `.cmd` launchers are included. Login startup, kiosk packaging and wake-lock policy are roadmap decisions. |

## Fidelity limits and identified source issue

Procedural ambient logic is generated from the four original C++ modules using `scripts/port-ambient.py`. Browser number precision and shared raster helpers mean full pixel parity remains unverified. This Is Fine's packed frames and palette are copied exactly into PCA format. Custom PCA playback uses elapsed simulation time and avoids firmware filesystem/prefetch stalls.

The original Pac-Man maze's `dotsLeft` includes corner power cells and the cleared starting cell without corresponding decrements. Its all-dots-cleared reset can therefore fail. The current translation retains this upstream behavior; a separately documented corrective change and board-completion regression are outstanding. This does not affect the Pac-Man clock's patrol pellets.

## Platform acceptance still needed

macOS browser smoke checks and repository checks were run locally. Windows launcher/runtime validation and Safari/Edge-specific fullscreen/audio checks need actual target systems. No claim of tested Windows execution is made. Runtime has no OS shell dependency: after local startup, or when served from the NAS, rendering, schedules and audio processing run in the viewing browser.
