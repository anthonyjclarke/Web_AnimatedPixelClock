# Animated Pixel Clock — Web

**Initial release: v0.1.0** · 15 September 2026. Browser adaptation of the ESP32 AnimatedPixelClock 128 × 64 RGB display. All 14 listed clock styles now have scoped source ports, and all six audio visualizers are available. Ambient now includes five built-in scenes and custom PCA playback. Development remains local; Docker deployment to the Synology DS423 is planned, not installed.

## Getting started (macOS and Windows)

This is a browser application. No ESP32 board, PlatformIO, original firmware checkout, API key or PC companion is needed. Rendering and audio processing happen on the viewing computer.

### Option A — Download the ready-built release

1. Open [Releases](https://github.com/anthonyjclarke/Web_AnimatedPixelClock/releases) and download `Web_AnimatedPixelClock-v0.1.0-web.zip` (the built web app, not GitHub's automatic source archive).
2. Extract the ZIP and install [Node.js](https://nodejs.org/) 22.18 or newer.
3. Open Terminal on macOS, or PowerShell/Command Prompt on Windows, in the extracted folder.
4. Run `node scripts/serve.mjs`, then open [Pixel Clock](http://127.0.0.1:3000/).

No dependency installation is needed for the built ZIP. Keep the terminal open; Ctrl+C stops the server. Do not double-click index.html: the audio worklet and assets need an HTTP server. SHA256SUMS.txt on the release page contains the ZIP's checksum.

### Option B — Clone and develop

Install [Git](https://git-scm.com/downloads) and Node.js 22.18+ (including npm). Open a new terminal after installing them. These commands work in Terminal, PowerShell and Command Prompt:

```sh
git clone https://github.com/anthonyjclarke/Web_AnimatedPixelClock.git
cd Web_AnimatedPixelClock
npm install --global pnpm@10.11.0
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by the server, normally [127.0.0.1:3000](http://127.0.0.1:3000/). Keep the terminal open. If global package installation is unavailable, use `npm exec --yes --package=pnpm@10.11.0 -- pnpm install --frozen-lockfile`, then `npm run dev`.

After the first installation, you can also double-click **Start Pixel Clock.command** on macOS or **Start Pixel Clock.cmd** on Windows from this checkout. macOS terminal alternative: `zsh "Start Pixel Clock.command"`. Launchers start the development server; they are not automatic login services.

### Production build and checks

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

Stop the development server first if it occupies port 3000. `pnpm start` serves the built `dist/client/` folder with the included dependency-free Node server. It binds to 127.0.0.1 by default. The exported folder can also be served by another static HTTP server; no Cloudflare account or runtime is needed. Docker/Synology packaging is still planned.

To use another production port: macOS `PORT=3001 pnpm start`; PowerShell `$env:PORT=3001; pnpm start`; Command Prompt `set PORT=3001` followed by `pnpm start`. To update a clone, stop the server, run `git pull --ff-only`, repeat `pnpm install --frozen-lockfile`, and rebuild if using production mode. For the exact initial version, `git checkout v0.1.0`; use `git switch main` to return to releases or `git switch dev` for development.

### Troubleshooting and platform notes

- **Page fails after reboot:** start the server again. No background startup service is installed.
- **Command not found:** install Node/Git as above and reopen the terminal. `node --version` should be at least 22.18; `npm --version` should succeed. On Homebrew macOS, ensure `/opt/homebrew/bin` is on PATH.
- **Port in use:** stop the other server or select another port. Use the URL printed by the development server if it picks a fallback.
- **Microphone unavailable:** allow browser permission and use localhost or trusted HTTPS. Plain HTTP on a NAS/LAN hostname does not provide the same secure-context exception as localhost.
- **Settings seem lost:** preferences belong to the browser and exact origin. `localhost`, `127.0.0.1` and a NAS hostname have separate storage. Private browsing may not retain settings. Export/import is still planned.
- **System sound is not captured:** the microphone input records the microphone. Use a local audio file or the demo; system-output capture is not implemented.
- **Screensaver does not start when idle:** ambient is a manual/scheduled browser mode. It is not a native macOS/Windows screensaver, does not prevent sleep, and cannot wake a sleeping computer.

macOS has been tested locally. Windows is a target with its own launcher and CI build/tests; actual Windows browser/fullscreen/audio acceptance remains outstanding. No installation of OS-level components is performed.

## Ambient screensaver

Under **Display settings → Ambient screensaver**, choose Space Invaders battle, Pac-Man maze, Starfield, Aquarium, This Is Fine, or Custom animation. Use **Start now**, or enable an hour-based schedule in the selected timezone. Overnight windows are supported; equal hours disable the window. The optional corner clock follows your time format. Stop returns to the clock for the rest of the current window; reload clears that session override. Audio takes priority while its tab is open.

Custom animation accepts the original `.pca` format (use the original GIF converter). One file is saved locally in this browser's IndexedDB; it is not uploaded. Missing media falls back to Invaders. Scene/schedule/rotation settings use `pixel-clock-display` localStorage. The original multi-file library and integrated GIF conversion are still pending. See [ambient validation](reports/ambient-validation.md) and the [complete function audit](reports/outstanding-functions.md).

## Clock styles and settings

Choose a clock card, then use its controls below Display settings. Clock settings persist in this browser's `pixel-clock` localStorage record. Reset buttons restore only the selected mode's settings. Pause freezes motion; Replay demonstrates digit changes; the cycle toggle and interval (5–3600 seconds, default 20) are under Display settings and persist after reload. Cycling pauses during ambient/audio. Timezone, 12/24-hour time, digit color, brightness, glow and fullscreen are available.

| Style | Mode controls and implementation |
| --- | --- |
| Tetris | 12 controls, falling dots/slabs, game modes, bounce and small clock |
| Mario | 7 controls, digit hits, walk variants and idle encounters |
| Pac-Man | 6 native controls, patrol pellets, digit eating and bounce; optional web-only random ghost chase |
| Snake | 4 controls, food/routing, length, border and date |
| Space Invaders | 5 controls, Invader/Ship choice, attack and fragment physics |
| Asteroids | 5 controls, ship/rocks, shooting, shattering, date and transparency |
| Dino Runner | 4 controls, run speed, cactus frequency, clouds and date |
| Matrix Rain | 4 native controls plus browser-only rain font size: Original 5 × 7 or Small 3 × 5 |
| Doom Fire | Upstream style 17: six animation controls and ember/flame/core colors |
| TRON | Motorcycle profile/overhead variant, duelling and neon digit tracing |
| Bomberman | Native routes, bombs, escapes and brick rebuilding; no mode-specific settings in source |
| Pong | 6 controls, Arkanoid ball/paddle, digit springs and shatter/reassembly |
| Standard / Large | Native fonts/layouts and shared date-format controls |

Date behaviour follows each port: some have their own date toggle, TRON/Bomberman omit the date, and Pong always displays it. Four date formats are exposed for Standard, Large, Snake, Space, Asteroids, Dino, Matrix, Doom Fire and Pong; remaining shared date/colon consistency is roadmap work. TRON, Bomberman and Pong respond to current time changes; several earlier modes anticipate the next minute at second 56.

Matrix's smaller rain font changes background glyphs only, retaining native grid spacing/timing and full-size clock/decode digits. It applies immediately and is saved. Numeric selectors provide readable labels for the newly added mode controls.

## Web-only extras

See [WEB-EXTRAS.md](WEB-EXTRAS.md) for features beyond the ESP32 reference, including optional Pac-Man ghost chases and Matrix's compact rain font. Extras are labelled in controls and preserve an original-mode default.

## Audio visualizer

The Audio visualizer tab offers **Classic EQ, Neon Mirror, Phosphor Waterfall, Purple LED Stage, Starfield Overdrive and Oscilloscope**. Choose a local audio file, microphone or silent synthetic demo. Files/audio processing stay in the browser. Microphone capture does not capture system audio and is not monitored through the speakers. Leaving the tab stops audio and releases resources.

Controls include effect, corner clock, brightness and glow; Classic EQ has bar colors, and Oscilloscope has gain, ghost traces, grid/fill/flat-color options and trace/grid/peak colors. The corner clock inherits clock timezone/time format. Visualizer preferences currently reset when the panel is unmounted; persistent visualizer settings remain planned.

The clock is intentionally shown when audio is stopped or after the 10-second eligibility grace expires. A September 14 fix prevents fresh packets arriving after an animation-frame timestamp from causing a one-frame clock flash. It preserves genuine stale/disconnected-audio fallback. Refresh the page and restart the source to load the fix. See [audio-display validation](reports/audio-display-validation.md).

## Validation and limits

The current full suite passes **117 tests**. TypeScript and the latest production build pass. Native C++ harnesses compare selected state sequences and some exact frames/sprites against the local ESP32 source. These checks establish scoped parity, not complete pixel equivalence or live visual acceptance for every mode. See [changelog](CHANGELOG.md), [validation index](reports/README.md) and [reference harness guide](tests/reference/README.md).

Remaining work includes night dimming/blanking, weather, notifications, richer rotation and PC companion integration (see the function audit), plus shared sprite colors and colon modes/rates, date/bounce consistency, visualizer persistence, settings export/import, visual acceptance and Docker/NAS packaging. Clock localStorage is per browser/origin; moving from localhost to a NAS hostname does not transfer preferences automatically. Microphone use on the NAS will require trusted HTTPS. See [ROADMAP.md](ROADMAP.md).

Weather, ambient libraries, ESP32 administration/OTA, notifications and PC performance monitoring are outside the delivered scope. No firmware was flashed or NAS configuration changed. Optional WebMCP style selection is feature-detected; supported browser-tool validation remains limited.

## Attribution

Based on Keralots/AnimatedPixelClock under the included [MIT license](LICENSE). The local ESP32 project is a read-only reference. Pong's numerical helpers are generated into TypeScript using `scripts/port-pong.py` and its wrapper templates; these are development tools, not runtime dependencies.

## Attribution and license

Adapted for the browser by [Anthony J Clarke](https://github.com/anthonyjclarke) from [AnimatedPixelClock by Keralots](https://github.com/Keralots/AnimatedPixelClock). Original source and this adaptation are distributed under the [MIT license](LICENSE); preserve the original copyright notice when redistributing. See [WEB-EXTRAS.md](WEB-EXTRAS.md) for browser-specific additions.

Game names, characters and the This Is Fine artwork belong to their respective rights holders. This project is an unofficial fan adaptation, with no affiliation or endorsement; the software license does not grant rights to third-party trademarks or artwork.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the `main`/`dev` workflow and versioning, and [CHANGELOG.md](CHANGELOG.md) for release history. Report problems via [GitHub Issues](https://github.com/anthonyjclarke/Web_AnimatedPixelClock/issues).
