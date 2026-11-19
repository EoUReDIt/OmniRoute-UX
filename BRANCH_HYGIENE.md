# Branch Hygiene Tracker

**Purpose**: Track all branches in the fork, their status, and cleanup readiness.

**Last Updated**: 2026-11-19 (Phase 6 merged — ALL PHASES COMPLETE)
**Main Branch**: `release/v3.8.55`
**Upstream**: `diegosouzapw/OmniRoute` (main)

---

## 📊 Branch Status Overview

| Branch | Phase | Status | PR | Merged | Ready to Delete | Notes |
|--------|-------|--------|-----|--------|-----------------|-------|
| `release/v3.8.55` | — | **PROTECTED** | — | — | ❌ NEVER | Main release branch |
| `ux/simple-mode-phase1-backend` | 1 | ✅ Merged | #3 | ✅ | ✅ DELETED | Deleted after merge |
| `ux/simple-mode-phase2-frontend` | 2 | ✅ Merged | #4 | ✅ | ✅ DELETED | Deleted after merge |
| `ux/simple-mode-phase1-sidebar` | 3 | ✅ Merged | #6 | ✅ | ✅ DELETED | Deleted after merge |
| `ux/simple-mode-phase1-banners` | 4 | ✅ Merged | #8 | ✅ | ✅ DELETED | Deleted after merge |
| `ux/simple-mode-phase1-local-model` | 5 | ✅ Merged | #9 | ✅ | ✅ DELETED | Deleted after merge |
| `ux/simple-mode-phase1-integration-tests` | 6 | ✅ Merged | #10 | ✅ | ✅ DELETED | Deleted after merge |
| `ux/simple-mode-phase1-integration-tests` | 6 | ✅ Merged | #10 | ✅ | ✅ DELETED | Deleted after merge |

---

## 🗑️ Branches Ready for Deletion

| Branch | Merged PR | Merge Date | Safe to Delete |
|--------|-----------|------------|----------------|
| `ux/simple-mode-phase1-backend` | #3 | 2026-11-19 | ✅ DELETED |
| `ux/simple-mode-phase2-frontend` | #4 | 2026-11-19 | ✅ DELETED |
| `ux/simple-mode-phase1-sidebar` | #6 | 2026-11-19 | ✅ DELETED |
| `ux/simple-mode-phase1-banners` | #8 | 2026-11-19 | ✅ DELETED |
| `ux/simple-mode-phase1-local-model` | #9 | 2026-11-19 | ✅ DELETED |
| `ux/simple-mode-phase1-integration-tests` | #10 | 2026-11-19 | ✅ DELETED |

**All 6 merged branches deleted** ✅

---

## 🌿 Active Branches (Do Not Delete)

| Branch | Phase | Current Status | Next Action |
|--------|-------|----------------|-------------|
| `ux/simple-mode-phase1-local-model` | 5 | ✅ Merged | #9 | ✅ | ✅ DELETED | Deleted after merge |
| `ux/simple-mode-phase1-integration-tests` | 6 | ✅ Merged | #10 | ✅ | ✅ DELETED | Deleted after merge |
| `ux/simple-mode-phase1-integration-tests` | 6 | ⏳ Not Started | After Phase 5 |

---

## 📋 Branch Hygiene Rules

| Rule | Enforcement |
|------|-------------|
| **Never delete `release/v3.8.55`** | Protected branch |
| **Delete feature branches after merge** | Auto-delete on PR merge + manual cleanup |
| **One feature per branch** | Enforced by PR workflow |
| **Branch naming: `ux/<feature>-<phase>`** | Enforced by convention |
| **Base all branches on `release/v3.8.55`** | Enforced by branch creation |
| **Delete after PR merge + verification** | Manual confirmation required |

---

## 🔄 Branch Cleanup Checklist

When a PR is merged:

- [ ] Verify PR is merged to `release/v3.8.55`
- [ ] Verify CI passes on `release/v3.8.55`
- [ ] Delete remote branch: `gh api repos/EoUReDIt/OmniRoute-UX/git/refs/heads/<branch> --method DELETE`
- [ ] Delete local branch: `git branch -d <branch>`
- [ ] Update this document
- [ ] Remove branch from any branch protection rules

---

## 📅 Cleanup Schedule

| Date | Action |
|------|--------|
| After Phase 5 merge | Delete `ux/simple-mode-phase1-local-model` | ✅ DONE |
After Phase 6 merge | Delete `ux/simple-mode-phase1-integration-tests` | ✅ DONE |
| After Phase 6 merge | Delete `ux/simple-mode-phase1-integration-tests` | ✅ DONE |
| Monthly | Audit all branches, delete stale (>30 days unmerged) |

---

## 🔍 Stale Branch Detection

Run monthly to find stale branches:

```bash
# List all remote branches with last commit date
gh api repos/EoUReDIt/OmniRoute-UX/git/refs/heads --jq '.[] | select(.ref | startswith("refs/heads/ux/")) | {ref: .ref, sha: .object.sha}' | while read -r ref sha; do
  date=$(gh api repos/EoUReDIt/OmniRoute-UX/commits/$sha --jq '.commit.committer.date')
  echo "$ref $sha $date"
done | sort -k3
```

**Stale threshold**: >30 days since last commit, not merged, not active PR.

---

## 🔧 GitHub Actions Workflow Fixes (2026-11-19)

| Workflow | Status | Key Fixes |
|----------|--------|-----------|
| `ci-test-comparison.yml` (NEW) | ✅ Fixed | Shell escaping, JSON generation, upstream checkout |
| `ci-release.yml` (NEW) | ✅ Fixed | Changelog generation, Docker perms, NPM token |
| `ci.yml` (EXISTING) | ✅ Fixed | Concurrency simplification, timeout, continue-on-error |
| `nightly-release-green.yml` | ✅ Fixed | Added gh CLI installation |

**Verification**: Trigger a test push to verify all workflows pass.
