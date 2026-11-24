# Handoff

Verified 2026-11-24 against the GitHub PR and Actions APIs. Release tip `24550c54`. Replaces the note that cited tip `a5fbc2fa` and listed #32, #33 and #36 as open.

## Open PRs

| PR | Verified | Next |
| --- | --- | --- |
| [#30](https://github.com/EoUReDIt/OmniRoute-UX/pull/30) | `feat(dashboard): Simple view switch and short navigation`. Head `4a809cff` on `cursor/simple-view-phase2-8062`, base `release/v3.8.55`. Removes the #3–#10 stub files and carries the real `dashboardUiMode` work. Latest CI run `45329328127`: 15 jobs pass, 9 skipped, 6 fail. | Fix the 6 failing jobs below, then owner OK. |
| [#34](https://github.com/EoUReDIt/OmniRoute-UX/pull/34) | `fix(api): mask credential settings in the JSON backup`. Head `56e9905d`. Base is `cursor/simple-view-phase2-8062`, so no CI runs on it. | After #30 merges, fix the three MEDIUM review findings in #30's owner handoff, retarget to `release/v3.8.55`, then review. |
| [#38](https://github.com/EoUReDIt/OmniRoute-UX/pull/38) | `fix: merge safe CI infrastructure fixes (v2 - clean)`. Head `7aed9db9`, base `release/v3.8.55`. Five commits that replace #29. | Owner decision. Two of its changes target files that no longer exist or are removed: one edits `ci-test-comparison.yml` (deleted by #32), and the `rateLimiter.ts` fixes target a stub file that #30 removes. Compare against #30 before merging anything from it. |
| [#17](https://github.com/EoUReDIt/OmniRoute-UX/pull/17) | `fix: CI infrastructure failures v8`. Head `417bb1bd`. Old CI-fix attempt. Its base SHA is from 2026-11-21. | Owner decision: close or rewrite. |
| [#2](https://github.com/EoUReDIt/OmniRoute-UX/pull/2) | `PROPOSAL: opt-in faster gap and gated hintless-429 failover`. Head `36345d90`. Its Actions run on that head failed. | Needs the owner's decision on the 350 ms queue gap and 2000 ms same-key retry. Then re-review. |

## Done

| PR | Merge | Change |
| --- | --- | --- |
| #31 | `a5fbc2fa` | `.cursor/skills/` compression skills. |
| #37 | `d1efadd9` | Earlier `HANDOFF.md` and `BRANCH_HYGIENE.md`. |
| #32 | `295a21d0` | Removed the invalid stub test and `ci-test-comparison.yml`. |
| #33 | `07f0ab12` | Docker Hub publish runs only on `cheaper-inference/OmniRoute`. |
| #36 | `24550c54` | README accurate for this fork. |

Closed without merging: #11 through #16, #18 through #29 (the `ci-infra-fixes` series and `merge-safe-fixes`), and #7 and #8.

## CI

Failing jobs on #30, run `45329328127`:

| Job | Failing step |
| --- | --- |
| Unit Tests 4/8, 5/8, 6/8, 7/8 | Unit tests with V8 coverage |
| Docs Sync (Strict) | `npm run check:docs-all` |
| Quality Gates (Extended) | Vulnerability ratchet (osv-scanner) |

Release-branch debt recorded in #30's owner handoff of 2026-11-23. I did not re-run these on the current tip:

| Gate | Fact |
| --- | --- |
| API Route Typecheck | 5 errors in `src/app/api/hint/route.ts`, `src/app/api/settings/route.ts`, `src/lib/rate-limit/rateLimiter.ts`. #30 removes or restores those files. |
| Docs Sync | `.env.example` is missing `DASHBOARD_PASSWORD` and `OMNIROUTE_STAGE_TIMING`. |
| Vulnerability ratchet | #30 and #34 report 12 against baseline 7. #38 reports 8 against 7. The two figures disagree; re-measure. |
| Cycle scan | 14 components. |
| Unit | `api-key-forced-model` test. |

`ci-test-comparison.yml` no longer exists on this tip. `ci-release.yml` does.

## Merge order

Each step needs review and owner OK.

1. #30. Fix its failing jobs first.
2. #34, after the three MEDIUM findings, retargeted to `release/v3.8.55`.
3. Re-measure typecheck on the release tip, then fix what remains.
4. Docs Sync: add the two env vars to `.env.example`.
5. Vulnerability ratchet, cycle scan and the `api-key-forced-model` test: one PR each.
6. #38 and #17: owner decision after #30 lands.
7. #2: after the owner's queue-gap decision and a re-review.
8. Branch deletes listed in `BRANCH_HYGIENE.md`: owner OK for each.
