# Quick Reference: Fork vs Upstream Comparison

## One-Page Decision Matrix

### 🔴 ALWAYS Cherry-Pick (Security)
| Pattern | Action |
|---------|--------|
| `CVE-` | ✅ Immediate |
| `security:` | ✅ Immediate |
| `vuln:` | ✅ Immediate |
| `auth bypass` | ✅ Immediate |
| `secret leak` | ✅ Immediate |

### 🟡 USUALLY Cherry-Pick (Bug Fixes)
| Pattern | Condition | Action |
|---------|-----------|--------|
| `fix: regression` | Affects your code paths | ✅ Test → Cherry-pick |
| `fix: provider` | Your providers affected | ✅ Test → Cherry-pick |
| `fix: cache` | Your hintCache/localModel | ✅ Test → Cherry-pick |
| `fix: rate-limit` | Your rate limiter | ✅ Test → Cherry-pick |

### 🟢 EVALUATE Case-by-Case
| Pattern | When to Accept |
|---------|----------------|
| `perf:` | Benchmark shows improvement |
| `refactor:` | Simplifies code you maintain |
| `chore: deps` | Security updates only |
| `feat:` | Only if users request it |

### ❌ USUALLY SKIP
| Pattern | Reason |
|---------|--------|
| `feat(ui):` | Your Simple Mode replaces UI |
| `feat(dashboard):` | Your sidebar gating replaces |
| `feat(settings):` | Your boolean-flags settings replace |
| Breaking changes | Unless security-critical |

---

## 🎯 Your Fork's Protected Areas (Prefer Your Implementation)

| File/Module | Your Security Gates | Upstream Changes to Watch |
|-------------|---------------------|---------------------------|
| `src/app/api/settings/route.ts` | Boolean flags ONLY, secret redaction | New settings endpoints |
| `src/lib/cache/hintCache.ts` | breakerGeneration, TTL 120s | Cache architecture |
| `src/lib/localModel/localModel.ts` | Qwen3-0.6B, sandboxed, OFF-by-default | Local model changes |
| `src/components/ModeToggle.tsx` | OFF-by-default, clickable text | Header/UI redesign |
| `src/components/Sidebar.tsx` | Section gating, protected items | Sidebar restructuring |
| `src/lib/guide/prompt.ts` | Boolean flags ONLY | Prompt construction |

---

## 🔧 Quick Commands

```bash
# Weekly: Check for security fixes
git fetch upstream
git log --oneline release/v3.8.55..upstream/main --grep="security\|CVE\|vuln" --since="7 days ago"

# Monthly: Full diff
git diff release/v3.8.55 upstream/main -- '*.ts' '*.tsx' '*.mjs' | head -200

# Cherry-pick a fix
git checkout release/v3.8.55
git checkout -b cherrypick/<description>
git cherry-pick <sha>
# resolve conflicts → test → PR
```

---

## 📋 Sync Log Template (Keep in Repo)

| Date | Upstream Commit | Type | Cherry-Picked? | PR | Notes |
|------|-----------------|------|----------------|----|-------|
| 2024-11-20 | abc1234 | Security | ✅ | #15 | Auth bypass fix |
| 2024-11-18 | def5678 | Bug Fix | ✅ | #14 | Provider fallback |
| 2024-11-15 | ghi9012 | Feature | ❌ | — | Not needed |

---

*Keep this file in repo root as `UPSTREAM_SYNC_QUICKREF.md`*