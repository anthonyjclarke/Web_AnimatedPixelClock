> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

# Asteroids port validation

13 September 2026. Reference: `AnimatedPixelClock/src/clocks/clock_asteroids.cpp`, updated ESP32 source.

Replaced the decorative triangle/starfield with native inertial flight, thrust bursts, gradual aiming, wraparound, seven-vertex tumbling rocks, idle shots, big-rock splitting and small-rock debris. Changed digits are targeted at second 56, shot, shattered and revealed sequentially with shared bounce physics. Native layer order, solid plates/repulsion, transparent digits, two-pixel bullet tracer, GFX numerals and optional date are implemented.

All five controls use firmware defaults/ranges: ship speed 5–25 (12), rock speed 3–20 (8), rock count 1–4 (2), show date (false), transparent digits (true). Values persist with the existing browser preferences. Rock speed affects new spawns; lowering count does not remove existing rocks, matching source. The shared date-format dropdown now retains readable option labels.

## Verification

- 78 repository tests passed; four Asteroids tests cover validated persistence, all digit phases across date/transparency combinations, independent split children, pause, replay and changed rendering options.
- TypeScript check and production build passed. Local preview returned HTTP 200 at `http://127.0.0.1:3000/`.
- Native harness compiles the original update/helpers without changing their code. Its host shim supplies deterministic random/time and digit globals. 9,600 ticks match phase, displayed digits, thrust, current digit, bullet-active and rock-active/size states. Ship position/velocity/heading and rock position maximum difference: 0.001967 (tolerance 0.02), using JavaScript doubles with float-rounded timers.
- Reference run covers default speeds and all four date/transparency combinations, a four-digit rollover, then continued idle activity. Results: `asteroids-reference-results.json`.

Run from project root:

```sh
python3 tests/reference/asteroids.py ../AnimatedPixelClock /private/tmp/asteroids-reference
node tests/reference/asteroids.mjs
node --test tests/asteroids.test.mjs
```

## Limits

Full native framebuffer parity has not been established. The native comparison stubs shared bounce and does not compare shard coordinates, bullet coordinates, or nondefault speed traces. Rendering and shared bounce were ported from source and exercised by local tests, not measured against full native frames. Shared configurable sprite colors and colon modes/rates remain on the roadmap. AM/PM follows live wall time during the anticipatory change. ESP32 Wi-Fi status chrome is not applicable to the browser.

Next arcade port: Dino Runner. Docker/NAS packaging remains a later roadmap step.
