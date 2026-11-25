# Handoff

Verified 2026-11-24 against the GitHub PR, branch and Actions APIs. Release tip `0951a9f4` (the #30 merge commit). Replaces the note that listed #30 as open.

## Open PRs

| PR                                                      | Verified                                                                                                                                                                                                                                                        | Next                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#41](https://github.com/EoUReDIt/OmniRoute-UX/pull/41) | `docs(agents): replace the upstream workflow with the source repository policy`. Head `41ca7a7a` on `claude/magical-pasteur-fgfiyd`. `AGENTS.md` only, +10 / −2 lines.                                                                                          | Agent-instruction file: the owner's explicit approval is required before it merges.                                                                                                                                                                                                     |
| [#34](https://github.com/EoUReDIt/OmniRoute-UX/pull/34) | `fix(api): mask credential settings in the JSON backup`. Head `49566887` on `ux/settings-export-mask-secrets`. GitHub retargeted it to `release/v3.8.55` when #30 merged, so full CI now runs on it. `Gate / Quality` is red there; the cause was not examined. | Three MEDIUM review findings (from #30's owner handoff) are still open: the import writes OIDC/Entra secrets without a password re-check; a fresh-install restore silently leaves secrets unset; the "shared backup" comment is misleading. Review and report them, fix, then owner OK. |
| [#2](https://github.com/EoUReDIt/OmniRoute-UX/pull/2)   | `PROPOSAL: opt-in faster gap and gated hintless-429 failover`. Head `36345d90`. Defaults unchanged: gap 350 ms, `failoverHintless429` false. Its Actions run on that head failed.                                                                               | Needs the owner's decision on the 350 ms queue gap and the 2000 ms same-key retry. Then re-review.                                                                                                                                                                                      |

## Done

| PR  | Merge      | Change                                                                                                                                                                                                                                                                        |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #30 | `0951a9f4` | Simple view switch and short navigation (`dashboardUiMode`). Merge commit of 12 commits: removes the #3–#10 stub files, restores the real settings route, and splits the settings `PATCH`, the feature-flags `PUT`, the Sidebar and `SimpleHomeChecklist` into smaller units. |
| #40 | `5bd4d53b` | README and `BRANCH_HYGIENE.md` state that this fork deviates from its source on purpose.                                                                                                                                                                                      |
| #39 | `829deaf2` | Earlier refresh of this file and `BRANCH_HYGIENE.md`.                                                                                                                                                                                                                         |
| #31 | `a5fbc2fa` | `.cursor/skills/` compression skills.                                                                                                                                                                                                                                         |
| #32 | `295a21d0` | Removed the invalid stub test and `ci-test-comparison.yml`.                                                                                                                                                                                                                   |
| #33 | `07f0ab12` | Docker Hub publish runs only on `cheaper-inference/OmniRoute`.                                                                                                                                                                                                                |
| #36 | `24550c54` | README accurate for this fork.                                                                                                                                                                                                                                                |

Closed without merging: #7, #8, #11 through #29 (the `ci-infra-fixes` series and `merge-safe-fixes`), and #38. #17 and #38 were closed on 2026-11-24, after #30 merged.

## CI

#30's last full run (head `2461f400`):

| Result | Jobs                                                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pass   | Unit Tests 1/8–8/8, Docs Sync (Strict), API Route Typecheck, Lint, Build, Vitest, Coverage, Security Tests, i18n jobs, semgrep                                                                                      |
| Fail   | Quality Gates (Extended), Fast Quality Gates, Gate / Quality. All three are the vulnerability ratchet: 12 moderate advisories against a baseline of 7. Fast Quality Gates reports `1 gate(s) failed: vuln-ratchet`. |

`ci.yml` runs on pull requests, not on pushes to `release/**`, so the merge commit `0951a9f4` itself has not been run through it. The cycle scan (14 components, recorded earlier) was not re-measured. `ci-release.yml` and `ci-test-comparison.yml` no longer exist.

## Links to the source repository that still change behavior

Verified in the tree at `0951a9f4`. The policy is in `AGENTS.md` (once #41 merges) and `BRANCH_HYGIENE.md`. These are the places that do more than mention the source:

| Where                                                                                                                                           | What it does                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/api/system/version/route.ts`                                                                                                           | GET reports the latest version on npm. POST starts an update when a newer version is on npm. `OMNIROUTE_NO_UPDATE_NOTIFIER` turns off the npm, GitHub and news egress and the banner, per the route's own comment; POST still updates on an explicit request.                                                                                                            |
| `src/app/(dashboard)/dashboard/HomePageClient.tsx`                                                                                              | Builds download and release links to the source's GitHub Releases from that version.                                                                                                                                                                                                                                                                                     |
| `electron/package.json`, `electron/main.js`                                                                                                     | `build.publish` points at owner `cheaper-inference`, repo `OmniRoute`. The app uses `electron-updater` with `autoDownload` off.                                                                                                                                                                                                                                          |
| `docker-compose.selfhost.yml`, `docker-compose.ollama-local.yml`, `deploy/helm/omniroute/values.yaml`, `deploy/kubernetes/base/deployment.yaml` | Pull the image `diegosouzapw/omniroute`, not an image built from this fork.                                                                                                                                                                                                                                                                                              |
| `.github/CODEOWNERS`, `.github/FUNDING.yml`, `.mergify.yml`, `sonar-project.properties`                                                         | Name `diegosouzapw` as code owner, funding target, Mergify author rule and Sonar project.                                                                                                                                                                                                                                                                                |
| 18 workflows                                                                                                                                    | Hold 46 guard lines of the form `github.repository == 'cheaper-inference/OmniRoute'`, so those jobs are skipped on this fork: `docker-publish`, `forward-port`, `i18n-mirror-refresh`, `omni-queue`, `radar-export`, `scorecard`, `test-quarantine`, `ui-kit-upstream-watch` and ten `nightly-*` workflows (including `nightly-release-green` and `nightly-resilience`). |

Only links, no behavior: the landing page and docs footer, the changelog viewer, the skill preview's "copy raw URL" and "open on GitHub" (`SkillPreviewPane.tsx` builds the URLs and does not fetch them), and the providers and quota-share help links. About 72 test files and 50 docs files mention the source as text.

## Next

Each step needs the owner's OK.

1. #41: read the diff and approve or reject it.
2. #34: review report on the three MEDIUM findings, then fix and merge.
3. Vulnerability ratchet: leave failing, re-baseline 7 to 12 with a tracking issue, or a dependency-bump PR.
4. #2: decide the queue gap and retry policy.
5. Decide which of the links above to change (update check and one-click update first, since they can replace this fork's build with the source's).
6. Delete the branches marked "Approved, UI" in `BRANCH_HYGIENE.md` in the GitHub UI.
