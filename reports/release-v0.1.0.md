# Web v0.1.0 release validation

15 September 2026. Initial web version is separate from the firmware v2.3 numbering. Release branches: main (releases) and dev (integration); tag v0.1.0.

A fresh temporary checkout copy excluded node_modules, generated build directories, next-env.d.ts and the local Sites manifest. pnpm 10.11.0 installed successfully with --frozen-lockfile. The checked-in build-script allowlist replaces the starter placeholder values. This verifies the application can install independently of the original development directory and Sites credentials.

The standard suite has 117 passing tests. TypeScript and production build pass in the fresh installation. Static-server checks cover root/assets, audio-worklet MIME, PCA content, HEAD, missing paths, method rejection and traversal rejection. GitHub Actions runs these on Linux, macOS and Windows with Node 22.18. The local validation host uses macOS; CI is not a substitute for target-browser visual/audio acceptance.

The built ZIP contains only static dist/client assets, scripts/serve.mjs, README.md and LICENSE. It needs Node 22.18+ but no dependency installation. SHA256SUMS.txt verifies the ZIP. Source archives and Git history remain available from GitHub. Existing development history is retained; generated TypeScript cache is no longer tracked.

Known gaps are recorded in ROADMAP.md and reports/outstanding-functions.md, including the inherited ambient Pac-Man board counter issue. No native OS screensaver, NAS deployment, sensor collector or firmware APIs are included.
