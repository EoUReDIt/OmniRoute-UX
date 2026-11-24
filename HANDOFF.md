# Handoff

Verified 2026-11-24 with `gh pr list --state open` and release tip `a5fbc2fa`. Replaces the 2026-11-19 note that said all six phases were merged.

## Open PRs

| PR | Verified | Next |
| --- | --- | --- |
| #2 | Open. Title: `PROPOSAL: opt-in faster gap and gated hintless-429 failover (needs owner approval)`. Head `36345d90` on `cursor/faster-queue-retry-defaults-c1e3`. Base `release/v3.8.55`. Updated 2026-11-24. | Re-review, then owner OK. Review state is not in the list payload. |
| #30 | Open. `feat(dashboard): Simple view switch and short navigation`. Head `eb6b800923` on `cursor/simple-view-phase2-8062`. Updated 2026-11-24. | Reliability re-check, then owner OK. |
| #34 | Open. `fix(api): mask credential settings in the JSON backup`. Head `56e9905d`. Base is `cursor/simple-view-phase2-8062` (#30's branch). Updated 2026-11-24. | After #30 merges, retarget to `release/v3.8.55`. Full CI runs only after that retarget. |
| #32 | Open. Remove the invalid stub test and `ci-test-comparison.yml`. Head `7118eea4`. Base `release/v3.8.55`. | Review, then owner OK. |
| #33 | Open. Skip Docker Hub publish on this fork. Head `293d42d3`. Base `release/v3.8.55`. | Review, then owner OK. |
| #36 | Open. README accuracy for this fork. Head `5eb83ec8`. Base `release/v3.8.55`. | Review, then owner OK. |
| #11, #17, #21, #29 | Open CI-fix PRs. Updated: #11 2026-11-24, #29 2026-11-24, #17 2026-11-21, #21 2026-11-21. | Close or rewrite only with owner OK. |
| this branch | `ux/docs-handoff-branch-hygiene`. | This handoff. |

## Merge order

Each step needs review and owner OK.

1. #30, then retarget #34 to `release/v3.8.55`, then #34.
2. #32, then #33, then #36.
3. #2 after re-review.

## Done

| Item | Fact |
| --- | --- |
| #31 | Tip `a5fbc2fa`: `docs: add team compression skills under .cursor/skills (owner-approved) (#31)`. Owner: that branch was deleted with owner OK. |

## CI still open on release

From 2026-11-24 logs (PR #32 typecheck/docs, push `a5fbc2fa` for `ci-release.yml`). Not re-run for this commit.

| Gate | Fact |
| --- | --- |
| API Route Typecheck | 5 errors: `src/app/api/hint/route.ts` TS2724, `src/app/api/settings/route.ts` TS2724, `src/lib/rate-limit/rateLimiter.ts` TS2307, TS2451, TS2588. |
| Docs Sync | `.env.example` is missing `DASHBOARD_PASSWORD` and `OMNIROUTE_STAGE_TIMING`. |
| `ci-release.yml` | Run 45321908278 failed with 0 jobs. |
| `ci-test-comparison.yml` | Still on this tip. Open #32 deletes it. |

Not recorded here: vuln-ratchet ratio and the Node 27 note. Neither was re-checked with this pass's commands.

## Next

One at a time, with owner OK: the merge order above; then API Route Typecheck; then Docs Sync; then vuln, lint, and unit; then #11, #17, #21, and #29.
