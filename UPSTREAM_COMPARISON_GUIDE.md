# OmniRoute-UX Fork vs Upstream Comparison Guide

**Purpose:** Enable systematic comparison between your fork (`EoUReDIt/OmniRoute-UX`) and upstream (`cheaper-inference/OmniRoute` / `diegosouzapw/OmniRoute`) to identify bugs, fixes, and features for selective cherry-picking.

**Audience:** Fork maintainers, contributors, users evaluating which build to use.

---

## 📊 Quick Reference: Fork vs Upstream

| Aspect | Your Fork (`EoUReDIt/OmniRoute-UX`) | Upstream (`cheaper-inference/OmniRoute`) |
|--------|--------------------------------------|------------------------------------------|
| **Primary Branch** | `release/v3.8.55` | `main` (or `release/v3.8.x`) |
| **UX Simple Mode** | ✅ **Complete** (6 phases merged) | ❌ Not implemented |
| **App ID (Desktop)** | `online.omniroute.desktop` (configurable) | `online.omniroute.desktop` |
| **Config Directory** | `%APPDATA%/OmniRoute` (shared) | `%APPDATA%/OmniRoute` (shared) |
| **GitHub Releases** | Your fork's releases | `cheaper-inference/OmniRoute` releases |
| **Auto-update Source** | Your fork's GitHub releases | Upstream GitHub releases |

---

## 🔍 How to Compare: Step-by-Step

### 1. Set Up Local Comparison Environment

```bash
# Clone your fork
git clone https://github.com/EoUReDIt/OmniRoute-UX.git
cd OmniRoute-UX

# Add upstream remote
git remote add upstream https://github.com/cheaper-inference/OmniRoute.git
# OR if using diegosouzapw:
# git remote add upstream https://github.com/diegosouzapw/OmniRoute.git

# Fetch all branches
git fetch --all --tags
```

### 2. Compare Release Branches

```bash
# See what's in your release branch vs upstream main
git log --oneline --graph --all --decorate -30

# Compare specific branches
git log --oneline release/v3.8.55..upstream/main     # Commits in upstream NOT in your fork
git log --oneline upstream/main..release/v3.8.55     # Commits in your fork NOT in upstream (your changes)

# Show diff summary
git diff --stat release/v3.8.55 upstream/main        # File-level changes
git diff release/v3.8.55 upstream/main -- '*.ts' '*.tsx' '*.mjs'  # Code changes only
```

### 3. Identify Categories of Differences

```bash
# Your fork's unique commits (Simple Mode + fixes)
git log --oneline --author="EoUReDIt" release/v3.8.55

# Upstream commits since your base
git log --oneline release/v3.8.55..upstream/main --grep="fix\|bug\|patch" --author="diegosouzapw"

# Security-related upstream commits
git log --oneline release/v3.8.55..upstream/main --grep="security\|vuln\|CVE"
```

### 4. Use GitHub Compare View

**Web UI:** `https://github.com/EoUReDIt/OmniRoute-UX/compare/release/v3.8.55...cheaper-inference:main`

This shows:
- Files changed
- Commits unique to each side
- Line-by-line diffs

---

## 🎯 What to Look For: Bug/Fix Classification

### Priority 1: Critical Security Fixes (Cherry-Pick Immediately)

| Pattern | Example | Action |
|---------|---------|--------|
| `CVE-` | `fix: CVE-2024-xxxx in dependency` | Cherry-pick |
| `security:` | `security: sanitize input in /api/settings` | Cherry-pick |
| `vuln:` | `vuln: update vulnerable dependency` | Cherry-pick |
| `auth bypass` | `fix: prevent auth bypass in feature flags` | Cherry-pick |

**Check commands:**
```bash
git log --oneline release/v3.8.55..upstream/main \
  --grep="CVE\|security\|vuln\|auth bypass" --since="2024-01-01"
```

### Priority 2: Regression Fixes (Cherry-Pick If Affecting You)

| Pattern | Example | Action |
|---------|---------|--------|
| `fix: regression` | `fix: regression in provider fallback` | Test → Cherry-pick |
| `revert:` | `revert: breaking change in compression` | Evaluate |
| `hotfix` | `hotfix: provider connection timeout` | Cherry-pick |

### Priority 3: Performance/Quality (Evaluate)

| Pattern | Example | Action |
|---------|---------|--------|
| `perf:` | `perf: optimize routing cache` | Benchmark → Decide |
| `refactor:` | `refactor: simplify provider selection` | Review |
| `chore: deps` | `chore: update dependencies` | Update your deps |

### Priority 4: New Features (Decide Case-by-Case)

| Pattern | Example | Action |
|---------|---------|--------|
| `feat:` | `feat: new provider support` | If needed → Cherry-pick |
| `feat(ui):` | `feat(ui): new dashboard widget` | Skip (Simple Mode replaces) |

---

## 🍒 Cherry-Pick Workflow

### 1. Create a Cherry-Pick Branch

```bash
# From your release branch
git checkout release/v3.8.55
git checkout -b cherrypick/upstream-fixes-2024-11
```

### 2. Cherry-Pick Specific Commits

```bash
# Cherry-pick a single commit
git cherry-pick <commit-sha>

# Cherry-pick a range
git cherry-pick <start-sha>^..<end-sha>

# If conflicts (common with your Simple Mode changes)
git status
# Resolve conflicts manually
git add .
git cherry-pick --continue
```

### 3. Test the Cherry-Picked Changes

```bash
# Run relevant tests
npm run test:unit -- tests/unit/security*.test.ts
npm run test:unit -- tests/unit/api/settings.test.ts

# Build and smoke test
npm run build:fast
npm run dev  # Manual verification
```

### 4. Create PR to Your Release Branch

```bash
git push origin cherrypick/upstream-fixes-2024-11
# Create PR: cherrypick/upstream-fixes-2024-11 → release/v3.8.55
```

---

## 🔄 Automated Comparison (CI Integration)

### Add to Your Workflow (`.github/workflows/upstream-comparison.yml`)

```yaml
name: Upstream Comparison

on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6 AM
  workflow_dispatch:

jobs:
  compare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Add upstream remote
        run: git remote add upstream https://github.com/cheaper-inference/OmniRoute.git
      
      - name: Fetch upstream
        run: git fetch upstream --tags
      
      - name: Generate comparison report
        id: compare
        run: |
          echo "## Upstream Changes Since Last Sync" > report.md
          echo "" >> report.md
          echo "| Category | Count |" >> report.md
          echo "|----------|-------|" >> report.md
          
          SECURITY=$(git log --oneline release/v3.8.55..upstream/main --grep="CVE\|security\|vuln" --since="$(date -d '7 days ago' +%Y-%m-%d)" | wc -l)
          FIXES=$(git log --oneline release/v3.8.55..upstream/main --grep="fix\|bug\|patch" --since="$(date -d '7 days ago' +%Y-%m-%d)" | wc -l)
          FEATURES=$(git log --oneline release/v3.8.55..upstream/main --grep="feat" --since="$(date -d '7 days ago' +%Y-%m-%d)" | wc -l)
          
          echo "| Security Fixes | $SECURITY |" >> report.md
          echo "| Bug Fixes | $FIXES |" >> report.md
          echo "| New Features | $FEATURES |" >> report.md
          echo "" >> report.md
          
          echo "### Recent Security Fixes" >> report.md
          git log --oneline release/v3.8.55..upstream/main --grep="CVE\|security\|vuln" --since="$(date -d '7 days ago' +%Y-%m-%d)" >> report.md
      
      - name: Create issue if security fixes found
        if: ${{ steps.compare.outputs.security > 0 }}
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: 'EoUReDIt',
              repo: 'OmniRoute-UX',
              title: '⚠️ Upstream Security Fixes Available',
              body: require('fs').readFileSync('report.md', 'utf8'),
              labels: ['security', 'upstream-sync']
            })
```

---

## 📦 Version Switching Strategy (Option B Context)

### User Migration Flow

```
User on Upstream v3.8.x
        │
        ▼
Install Fork v3.8.55 (side-by-side via portable or different appId)
        │
        ▼
Configure Fork (manual setup - Option B)
        │
        ▼
Use Fork → Decide to return to Upstream
        │
        ▼
Uninstall Fork → Reinstall Upstream
        │
        ▼
Reconfigure Upstream (manual - Option B reverse)
```

### Configuration Files to Migrate (If User Wants)

| Config File | Location | Contains |
|-------------|----------|----------|
| `config.yaml` | `%APPDATA%/OmniRoute/` | Provider settings, API keys, routing rules |
| `i18n.json` | `%APPDATA%/OmniRoute/` | Language preferences |
| `ui-state.json` | `%APPDATA%/OmniRoute/` | Window positions, sidebar state |
| `providers/*.json` | `%APPDATA%/OmniRoute/providers/` | Custom provider configs |

**Migration Script Idea** (for future):
```bash
# scripts/migration/migrate-config.ts
# 1. Detect both installations
# 2. Backup current config
# 3. Copy compatible settings
# 4. Prompt for API keys (never auto-migrate secrets)
# 5. Restore on rollback
```

---

## 🛡️ Security Gate Compliance (Your Fork)

When cherry-picking from upstream, **verify these gates pass**:

| Gate | Your Implementation | Upstream Must Not Break |
|------|---------------------|-------------------------|
| **Secret Redaction** | `/api/settings` returns boolean flags only | No raw secrets in new endpoints |
| **Feature Flags** | `localGuideEnabled` OFF by default, audit-logged | New flags follow same pattern |
| **Auth/Error Hygiene** | `requireManagementAuth`, rate limits, sanitized errors | New endpoints use same middleware |

**Test after cherry-pick:**
```bash
npm run test:unit -- tests/unit/api/__tests__/secret-redaction.test.ts
npm run test:unit -- tests/unit/api/__tests__/auth-middleware.test.ts
npm run test:unit -- tests/unit/rate-limit/__tests__/rate-limit-settings.test.ts
```

---

## 📅 Recommended Sync Schedule

| Frequency | Action | Tool |
|-----------|--------|------|
| **Weekly** | Run upstream comparison CI | GitHub Actions (auto) |
| **Weekly** | Review security fixes | GitHub Issue (auto) |
| **Bi-weekly** | Manual cherry-pick session | Local git + PR |
| **Monthly** | Full diff review | `git diff release/v3.8.55 upstream/main` |
| **Per Release** | Sync before your release | Full comparison + testing |

---

## 🎯 Decision Matrix for Each Upstream Commit

```
                    ┌─────────────────────┐
                    │ Upstream Commit     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         ┌─────────┐    ┌─────────────┐  ┌─────────────┐
         │ Security│    │ Bug Fix     │  │ Feature/Ref │
         └────┬────┘    └──────┬──────┘  └──────┬──────┘
              │                │                │
              ▼                ▼                ▼
         ┌─────────┐    ┌─────────────┐  ┌─────────────┐
         │ AFFECTS │    │ AFFECTS YOUR│  │ NEEDED FOR  │
         │ YOUR    │    │ CODE PATHS? │  │ YOUR USERS? │
         │ FORK?   │    └──────┬──────┘  └──────┬──────┘
         └────┬────┘           │                │
              │                ▼                ▼
              │           ┌─────────┐    ┌──────────┐
              │           │ YES     │    │ YES      │
              │           └────┬────┘    └────┬─────┘
              │                │              │
              ▼                ▼              ▼
         ┌─────────────────────────────────────────┐
         │ CHERRY-PICK → TEST → PR → MERGE         │
         │ (Run security tests, verify gates pass) │
         └─────────────────────────────────────────┘
```

---

## 📝 Tracking Document Template

Create `UPSTREAM_SYNC_LOG.md` in your repo:

```markdown
# Upstream Sync Log

| Date | Upstream Commit | Type | Cherry-Picked? | PR | Notes |
|------|-----------------|------|----------------|----|-------|
| 2024-11-20 | abc1234 | Security (CVE-2024-xxxx) | ✅ | #15 | Fixed auth bypass in /api/providers |
| 2024-11-18 | def5678 | Bug Fix (provider fallback) | ✅ | #14 | Regression from v3.8.50 |
| 2024-11-15 | ghi9012 | Feature (new provider) | ❌ | — | Not needed, Simple Mode replaces UI |
| 2024-11-10 | jkl3456 | Perf (routing cache) | 🔄 | — | Benchmarking, decision pending |
```

---

## 🚀 Quick Start Commands Summary

```bash
# 1. One-time setup
git clone https://github.com/EoUReDIt/OmniRoute-UX.git
cd OmniRoute-UX
git remote add upstream https://github.com/cheaper-inference/OmniRoute.git
git fetch --all --tags

# 2. Weekly comparison
git fetch upstream
git log --oneline release/v3.8.55..upstream/main --grep="security\|CVE\|vuln" --since="7 days ago"

# 3. Cherry-pick a security fix
git checkout release/v3.8.55
git checkout -b cherrypick/security-fix-<date>
git cherry-pick <commit-sha>
# resolve conflicts if any
npm run test:unit -- tests/unit/security*.test.ts
git push origin cherrypick/security-fix-<date>
# Create PR via GitHub UI

# 4. Full diff review (monthly)
git diff release/v3.8.55 upstream/main -- '*.ts' '*.tsx' '*.mjs' > monthly-diff.patch
# Review patch file for relevant changes
```

---

## ⚠️ Known Conflicts with Your Fork

| Area | Your Changes | Upstream Likely Conflicts |
|------|--------------|---------------------------|
| `/api/settings` | Secret redaction, boolean flags | New settings endpoints |
| `Sidebar.tsx` | Section gating, Simple Mode | UI restructuring |
| `ModeToggle.tsx` | Clickable text, OFF-by-default | Header redesign |
| `localModel.ts` | Qwen3-0.6B, sandboxed | Local model experiments |
| `hintCache.ts` | breakerGeneration, TTL | Cache architecture changes |

**Strategy:** When conflicts arise in these files, **prefer your fork's implementation** (security gates verified) and manually apply upstream's logic if it's a genuine fix.

---

## 📞 Escalation

If a cherry-pick is complex or breaks your Simple Mode:

1. **Document the conflict** in the PR
2. **Tag @protecor-kiar** for security review
3. **Consider**: Is the upstream fix already addressed by your Simple Mode architecture?
4. **Decision**: Accept upstream fix, adapt it, or reject with rationale

---

*Document Version: 1.0*  
*Created: 2024-11-19*  
*For: EoUReDIt/OmniRoute-UX fork maintenance*