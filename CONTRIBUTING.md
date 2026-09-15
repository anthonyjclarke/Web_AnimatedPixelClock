# Contributing

Start with the README's clone and installation steps. Use Node 22.18+ and the pinned pnpm version. `main` holds releases; `dev` is the integration branch. Create a feature branch from `dev`, then open a pull request to `dev`. Release preparation merges `dev` into `main`, updates package.json and CHANGELOG.md, and tags the release `vX.Y.Z`.

Before a pull request, run `pnpm test`, `pnpm typecheck` and `pnpm build`. GitHub Actions runs those checks on Linux, macOS and Windows. Browser acceptance is separate from CI: mention which browser and OS you tested. Do not commit node_modules, generated dist output, environment files or local caches.

Keep original animation behavior distinguishable from browser additions. Update WEB-EXTRAS.md for intentional changes beyond the ESP32 reference. Credit upstream code and keep its MIT notice. Native C++ comparisons are optional developer tools described in tests/reference/README.md; they require a separately checked-out firmware source and compiler.

Versioning uses Semantic Versioning. During 0.x releases, behavior and configuration may still change; record compatibility changes and storage migrations in the changelog. Keep known gaps in ROADMAP.md and reports/outstanding-functions.md. File bug reports with style/effect, settings, browser/OS, reproduction steps and, if useful, a short recording without personal information.
