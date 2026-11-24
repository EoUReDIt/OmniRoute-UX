# Branch hygiene

Verified 2026-11-24. Replaces the 2026-11-19 note on this branch.

| Rule | Fact |
| --- | --- |
| Upstream | `cheaper-inference/OmniRoute`. This fork does not push there and does not open PRs there. |
| Default branch | `release/v3.8.55` (tip `a5fbc2fa`). Never delete it. GitHub branch API `protected`: `false`. |
| Branches | Start each one from `release/v3.8.55`. One feature per branch. Names: `ux/<feature>-<phase>`. |
| `cursor/*` | Open PR heads also use agent branch names: `cursor/simple-view-phase2-8062` (#30), `cursor/faster-queue-retry-defaults-c1e3` (#2). |
| Owner OK | Required before every merge, PR close, branch delete, force-push, and repo settings change. Agents do not auto-delete. Delete a branch only after merge, verification, and owner OK. |

## Corrections to the 2026-11-19 note

| Old claim | Correction |
| --- | --- |
| Upstream `diegosouzapw/OmniRoute` (main) | Upstream is `cheaper-inference/OmniRoute`. |
| `release/v3.8.55` is protected | `protected` is `false` (2026-11-24). |
| PR #8 merged | Owner correction: #8 was closed, not merged. It is not in the open list. |
