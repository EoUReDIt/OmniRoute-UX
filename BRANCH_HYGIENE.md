# Branch hygiene

Verified 2026-11-24 against the GitHub branch and PR APIs. Release tip `24550c54`. Replaces the earlier 2026-11-24 note that cited tip `a5fbc2fa`.

## Rules

| Rule | Fact |
| --- | --- |
| Upstream | `cheaper-inference/OmniRoute`. This fork does not push there and does not open PRs there. |
| Default branch | `release/v3.8.55` (tip `24550c54`). Never delete it. GitHub branch API `protected`: `false`. |
| Branches | Start each one from `release/v3.8.55`. One feature per branch. Names: `ux/<feature>-<phase>`. |
| `cursor/*` | Agent branches. Open PR heads also use these names: `cursor/simple-view-phase2-8062` (#30), `cursor/faster-queue-retry-defaults-c1e3` (#2). |
| Stacked PRs | A PR whose base is not `main` or `release/**` gets no CI: `ci.yml`, `quality.yml` and `api-route-typecheck.yml` run on `pull_request` only for those bases. Retarget before relying on checks (#34 is in this state). |
| Owner OK | Required before every merge, PR close, branch delete, force-push, and repo settings change. Agents do not auto-delete. Delete a branch only after merge, verification, and owner OK. |

## Remote branch inventory

| Branch | PR | State | Action |
| --- | --- | --- | --- |
| `release/v3.8.55` | n/a | Default. | Keep. |
| `cursor/simple-view-phase2-8062` | #30 open | Active. CI red. | Keep until #30 resolves. |
| `ux/settings-export-mask-secrets` | #34 open | Stacked on #30. | Keep. Retarget after #30 merges. |
| `cursor/faster-queue-retry-defaults-c1e3` | #2 open | Proposal. Needs an owner decision. | Keep. |
| `merge-safe-fixes-v2` | #38 open | Five CI-fix commits. | Keep until the owner decides. See `HANDOFF.md`. |
| `ux/ci-infra-fixes-v8` | #17 open | Old CI-fix attempt. | Keep until the owner decides. |
| `ux/ci-remove-broken-files` | #32 merged | Merged. | Delete candidate. Owner OK pending. |
| `ux/ci-disable-fork-docker-publish` | #33 merged | Merged. | Delete candidate. Owner OK pending. |
| `ux/readme-fork-accuracy` | #36 merged | Merged. | Delete candidate. Owner OK pending. |
| `cursor/ux-simple-mode-phase1-16f6` | #1 merged | Merged. | Delete candidate. Owner OK pending. |
| `merge-safe-fixes` | #29 closed | Closed, not merged. Replaced by #38. | Delete candidate. Owner OK pending. |
| `ux/ci-infra-fixes-v2` | #11 closed | Closed, not merged. | Delete candidate. Owner OK pending. |
| `ux/ci-infra-fixes-v13` | #21 closed | Closed, not merged. | Delete candidate. Owner OK pending. |

Branches deleted with owner OK on 2026-11-23: `ux/cursor-skills-compression`, `ux/docs-handoff-branch-hygiene`.

## Corrections to earlier notes

| Old claim | Correction |
| --- | --- |
| Upstream `diegosouzapw/OmniRoute` (main) | Upstream is `cheaper-inference/OmniRoute`. |
| `release/v3.8.55` is protected | `protected` is `false` (2026-11-24). |
| PR #8 merged | Owner correction: #8 was closed, not merged. |
| Release tip `a5fbc2fa` | `a5fbc2fa` was the tip after #31. The tip is now `24550c54` (after #32, #33, #36). |
| #32, #33, #36 open | Merged. |
| #11, #21, #29 open | Closed, not merged. |
