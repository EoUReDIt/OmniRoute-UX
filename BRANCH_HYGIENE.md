# Branch Hygiene Tracker

**Purpose**: Track all branches in the fork, their status, and cleanup readiness.

**Last Updated**: 2026-11-19
**Main Branch**: `release/v3.8.55`
**Upstream**: `diegosouzapw/OmniRoute` (main)

---

## 📊 Branch Status Overview

| Branch | Phase | Status | PR | Merged | Ready to Delete | Notes |
|--------|-------|--------|-----|--------|-----------------|-------|
| `release/v3.8.55` | — | **PROTECTED** | — | — | ❌ NEVER | Main release branch |
| `ux/simple-mode-phase1-backend` | 1 | ✅ Merged | #3 | ✅ | ✅ YES | Deleted after merge |
| `ux/simple-mode-phase2-frontend` | 2 | ✅ Merged | #4 | ✅ | ✅ YES | Deleted after merge |
| `ux/simple-mode-phase1-sidebar` | 3 | ✅ Merged | #6 | ✅ | ✅ YES | Deleted after merge |
| `ux/simple-mode-phase1-banners` | 4 | 🟢 GREEN Phase | #8 | ❌ | ❌ NO | Active - GREEN phase |
| `ux/simple-mode-phase1-local-model` | 5 | ⏳ Not Started | — | ❌ | ❌ NO | Next: Routing Hint Cache |
| `ux/simple-mode-phase1-integration-tests` | 6 | ⏳ Not Started | — | ❌ | ❌ NO | After Phase 5 |

---

## 🗑️ Branches Ready for Deletion

| Branch | Merged PR | Merge Date | Safe to Delete |
|--------|-----------|------------|----------------|
| `ux/simple-mode-phase1-backend` | #3 | 2026-11-19 | ✅ YES |
| `ux/simple-mode-phase2-frontend` | #4 | 2026-11-19 | ✅ YES |
| `ux/simple-mode-phase1-sidebar` | #6 | 2026-11-19 | ✅ YES |

**Command to delete**:
```bash
# Local
git branch -d ux/simple-mode-phase1-backend ux/simple-mode-phase2-frontend ux/simple-mode-phase1-sidebar

# Remote (after confirming merge)
gh api repos/EoUReDIt/OmniRoute-UX/git/refs/heads/ux/simple-mode-phase1-backend --method DELETE
gh api repos/EoUReDIt/OmniRoute-UX/git/refs/heads/ux/simple-mode-phase2-frontend --method DELETE
gh api repos/EoUReDIt/OmniRoute-UX/git/refs/heads/ux/simple-mode-phase1-sidebar --method DELETE
```

---

## 🌿 Active Branches (Do Not Delete)

| Branch | Phase | Current Status | Next Action |
|--------|-------|----------------|-------------|
| `ux/simple-mode-phase1-banners` | 4 | 🟢 GREEN Phase | @stackier implementing components |
| `ux/simple-mode-phase1-local-model` | 5 | ⏳ Not Started | Create branch + PR for Routing Hint Cache |
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
| After Phase 4 merge | Delete `ux/simple-mode-phase1-banners` |
| After Phase 5 merge | Delete `ux/simple-mode-phase1-local-model` |
| After Phase 6 merge | Delete `ux/simple-mode-phase1-integration-tests` |
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

## 📝 Notes

- Phase 1-3 branches already merged and ready for deletion
- Phase 4 (banners) currently in GREEN phase - do not delete
- Phase 5 (local model) and Phase 6 (integration) not started
- All branches based on `release/v3.8.55` - no direct upstream tracking
- Upstream (`diegosouzapw/OmniRoute`) is reference only - no pushes
