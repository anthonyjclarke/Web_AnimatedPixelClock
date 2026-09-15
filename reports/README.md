# Documentation and validation index

Current as of 15 September 2026. [Project README](../README.md) describes use and startup; [roadmap](../ROADMAP.md) owns remaining work. All 14 listed clock ports and six visualizers are delivered. The full regression suite passes 117 tests; complete pixel parity/live acceptance is not claimed.

See [Web-only extras](../WEB-EXTRAS.md) for optional deviations from source, including Pac-Man ghost chases.

## Implementation records

| Area | Validation record |
| --- | --- |
| Tetris and 12 controls | [Tetris](tetris-settings-validation.md) |
| Mario/Pac-Man controls and encounters | [Characters](character-settings-validation.md) |
| Standard/Large layouts | [Classic clocks](classic-clocks-validation.md) |
| Snake | [Snake](snake-validation.md) |
| Invader/Ship and five controls | [Space](space-validation.md) |
| Asteroids | [Asteroids](asteroids-validation.md) |
| Dino Runner | [Dino](dino-validation.md) |
| Matrix and compact rain font | [Matrix](matrix-validation.md) |
| Doom Fire | [Doom Fire](doom-validation.md) |
| TRON | [TRON](tron-validation.md) |
| Bomberman/Pong | [Final arcade ports](final-arcade-validation.md) |
| One-frame audio clock flash | [Audio display fix](audio-display-validation.md) |
| Reference commands | [Harness guide](../tests/reference/README.md) |

Reports record the checks run at their implementation date. Earlier counts are historical, not the current suite total. JSON reference results beside the reports retain their measured scope and tolerances.

## Historical stages and audits

The documents below preserve the findings and plans that drove the work. Their descriptions of missing features or next steps are historical; use the current roadmap for outstanding tasks.

- [Original source audit](animation-source-audit.md)
- [v2.3 integration plan](v2.3-integration-plan.md)
- [Full fidelity review](full-fidelity-review.md)
- [Step 1: character corrections](step1-validation.md)
- [Step 2: shared rendering/time](step2-validation.md)
- [Step 3: audio pipeline](step3-validation.md)
- [Step 4: scope/starfield](step4-validation.md)

## Remaining acceptance

Validate live transitions, settings and sustained audio; expand exact frame comparisons where needed. Shared configuration/persistence and NAS packaging remain. No Docker image, Compose installation or reboot-tested NAS deployment has been delivered.

- [Ambient screensaver validation](ambient-validation.md)
- [Original-function and platform gap audit](outstanding-functions.md)

- [Initial web release validation](release-v0.1.0.md)
