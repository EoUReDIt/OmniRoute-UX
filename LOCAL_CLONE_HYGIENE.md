# Local Clone Hygiene Document

**Purpose:** Track lifecycle of locally cloned repositories and their branches, synchronized with cloud GitHub repository state.

**Repository:** `EoUReDIt/OmniRoute-UX` (fork of `cheaper-inference/OmniRoute` / `diegosouzapw/OmniRoute`)
**Primary Branch:** `release/v3.8.55`
**Last Updated:** 2024-11-19

---

## 📋 Local Clone Registry

| Clone Path | Purpose | Base Branch | Status | Last Sync | Notes |
|------------|---------|-------------|--------|-----------|-------|
| `C:/Users/michaela/OmniRoute-UX-clone2` | Primary development | `release/v3.8.55` | 🟢 Active | 2024-11-19 | Has uncommitted changes |
| `C:/Users/michaela/OmniRoute-UX-test` | CI verification | `release/v3.8.55` | 🔴 Stale | N/A | Failed clone (timeout) |

---

## 🌿 Local Branch Tracking (Per Clone)

### Clone: `OmniRoute-UX-clone2`

| Local Branch | Remote Tracking | Status | Upstream Sync | Commits Ahead/Behind | Last Action |
|--------------|-----------------|--------|---------------|---------------------|-------------|
| `release/v3.8.55` | `origin/release/v3.8.55` | 🟢 Current | ✅ Synced | 0/0 | Reset hard to origin |
| `ux/simple-mode-phase2-frontend` | `origin/ux/simple-mode-phase2-frontend` | 🔴 Stale (merged) | ❌ Deleted remote | N/A | Ready for deletion |
| `ux/simple-mode-phase1-sidebar` | `origin/ux/simple-mode-phase1-sidebar` | 🔴 Stale (merged) | ❌ Deleted remote | N/A | Ready for deletion |
| `ux/simple-mode-phase1-banners` | `origin/ux/simple-mode-phase1-banners` | 🔴 Stale (merged) | ❌ Deleted remote | N/A | Ready for deletion |
| `ux/simple-mode-phase1-local-model` | `origin/ux/simple-mode-phase1-local-model` | 🔴 Stale (merged) | ❌ Deleted remote | N/A | Ready for deletion |
| `ux/simple-mode-phase1-integration-tests` | `origin/ux/simple-mode-phase1-integration-tests` | 🔴 Stale (merged) | ❌ Deleted remote | N/A | Ready for deletion |

---

## 🔄 Sync Status Matrix

| Operation | Clone 1 | Clone 2 | Cloud Repo |
|-----------|---------|---------|------------|
| `git fetch --all` | ✅ Recent | ❌ Never | N/A |
| `git pull` | ⚠️ Has local changes | ❌ N/A | N/A |
| `git push` | ❌ No pending | ❌ N/A | N/A |
| Branch cleanup | ⚠️ 5 stale branches | ❌ N/A | ✅ Cloud clean |

---

## 📦 Lifecycle State Machine

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CREATE    │────▶│    SYNC     │────▶│   WORK      │────▶│   COMMIT    │
│  (clone)    │     │ (fetch/pull)│     │ (develop)   │     │  (stage)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                                        │               │
       │                                        ▼               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  ARCHIVE    │◀────│   CLEANUP   │◀────│    PUSH     │◀────│    PR       │
│  (merged)   │     │ (delete)    │     │  (remote)   │     │  (create)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### State Definitions

| State | Criteria | Actions |
|-------|----------|---------|
| **CREATE** | Fresh clone, no local changes | `git clone`, `git checkout <branch>` |
| **SYNC** | `git fetch --all`, verify remote tracking | `git pull --ff-only` |
| **WORK** | Local commits exist, not pushed | `git status`, develop features |
| **COMMIT** | Staged changes ready | `git commit -m "msg"` |
| **PR** | Push branch, create PR | `git push -u origin <branch>`, `gh pr create` |
| **PUSH** | Force push if needed | `git push --force-with-lease` |
| **CLEANUP** | PR merged, branch deleted remote | `git branch -d <branch>`, `git fetch --prune` |
| **ARCHIVE** | Long-term reference needed | `git tag archive/<branch>`, then cleanup |

---

## 🧹 Cleanup Checklist (Per Clone)

### After PR Merge (Automatic via CI)
- [ ] Verify PR merged to `release/v3.8.55`
- [ ] `git fetch --prune` (removes deleted remote branches)
- [ ] `git branch -d <local-branch>` (delete local merged branch)
- [ ] `git checkout release/v3.8.55 && git pull` (sync main)

### Manual Cleanup (When CI Doesn't Auto-Clean)
- [ ] `git branch -D <stale-branch>` (force delete if not merged)
- [ ] `git fetch --prune` (clean remote tracking branches)
- [ ] `git gc --prune=now` (garbage collect)

### Archive Before Delete (If Needed)
- [ ] `git tag archive/<branch-name> <commit-sha>`
- [ ] `git push origin archive/<branch-name>` (optional, for reference)
- [ ] Then proceed with cleanup

---

## 🔍 Health Checks (Run Weekly)

```bash
# 1. Check all clones
for clone in /path/to/clones/*; do
  cd "$clone"
  echo "=== $(basename $clone) ==="
  git status --short
  git branch -vv
  echo "---"
done

# 2. Detect stale branches (>30 days no commit)
git for-each-ref --format='%(refname:short) %(committerdate:relative) %(authorname)' refs/heads/ | while read branch date author; do
  if [[ "$date" == *"months ago"* ]] || [[ "$date" == *"years ago"* ]]; then
    echo "STALE: $branch ($date by $author)"
  fi
done

# 3. Check unpushed commits
git log --oneline @{u}..HEAD 2>/dev/null || echo "No upstream or no unpushed commits"

# 4. Check uncommitted changes
git status --porcelain
```

---

## 🚨 Conflict Resolution Protocol

| Conflict Type | Detection | Resolution |
|---------------|-----------|------------|
| **Diverged History** | `git status` shows "diverged" | `git pull --rebase` or `git merge` |
| **Force Push Needed** | `git push` rejected | `git push --force-with-lease` (after review) |
| **Local Uncommitted** | `git status` shows changes | `git stash`, sync, `git stash pop` |
| **Merge Conflict** | `git pull` stops | Manual resolve, `git add`, `git commit` |
| **Deleted Remote** | `git fetch --prune` shows gone | `git branch -d <branch>` |

---

## 📊 Reporting Format (Unified View)

### Per Clone Status Report
```
Clone: OmniRoute-UX-clone2
Path: C:/Users/michaela/OmniRoute-UX-clone2
Base: release/v3.8.55 (synced 2024-11-19)
Status: 🟡 Has uncommitted changes
Branches: 6 total (1 current, 5 stale/merged)
Last Sync: 2024-11-19 21:00 UTC
Actions Needed:
  - Delete 5 stale local branches (merged upstream)
  - Commit or stash uncommitted changes
  - Sync with origin/release/v3.8.55
```

### Cloud Sync Status
```
Repo: EoUReDIt/OmniRoute-UX
Default: release/v3.8.55
Open PRs: 0
Merged Branches (pending cleanup): 6
Stale Remote Branches: 0 (auto-cleaned via PR merge)
Last CI Run: 2024-11-19 22:14 UTC (FAILED - build errors)
```

---

## 🛠️ Automation Hooks

### Git Hooks (Local)
- `pre-commit`: Run lint, typecheck
- `pre-push`: Run tests, block if failing
- `post-merge`: Auto-cleanup merged branches

### GitHub Actions (Cloud)
- `branch-cleanup.yml`: Auto-delete merged branches
- `stale-branch.yml`: Label stale branches after 30 days
- `sync-report.yml`: Weekly sync status report

---

## 📝 Quick Commands Reference

| Action | Command |
|--------|---------|
| Full sync | `git fetch --all --prune && git pull --ff-only` |
| Delete merged branches | `git branch --merged | grep -v "release/v3.8.55" | xargs git branch -d` |
| Force sync to remote | `git fetch origin && git reset --hard origin/release/v3.8.55` |
| Stash & sync | `git stash && git pull && git stash pop` |
| Create PR from current | `gh pr create --base release/v3.8.55 --title "..." --body "..."` |
| Archive branch | `git tag archive/<branch> && git branch -d <branch>` |
| View all remotes | `git remote -v && git branch -vv` |

---

## 📌 Integration with Cloud BRANCH_HYGIENE.md

This document **complements** `BRANCH_HYGIENE.md` (cloud-only):

| Aspect | BRANCH_HYGIENE.md (Cloud) | This Doc (Local) |
|--------|---------------------------|------------------|
| Scope | Remote branches only | Local + remote tracking |
| Sync | Manual update after merge | Auto-detected via git |
| Cleanup | Manual after PR merge | Semi-auto via hooks |
| State | Point-in-time | Real-time via `git status` |

**Sync Rule:** After any cloud merge → update both docs.

---

*Document Version: 1.0*  
*Created: 2024-11-19*  
*For: Local clone lifecycle management of EoUReDIt/OmniRoute-UX forks*