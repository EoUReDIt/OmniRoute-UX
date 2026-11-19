# Environment Incompatibility Report

**Date**: 2026-11-19
**Reported By**: @frankie (GitHub Repo Manager)
**Context**: Codebase failure investigation by @protecor-kiar

---

## 📋 Summary

**Node.js v27.0.0-nightly is the USER'S ENVIRONMENT** and works correctly for local development. The incompatibility is with:
1. **CI/CD environments** (GitHub Actions runners) that may not have v27 nightly
2. **Agent environments** (@protecor-kiar's environment) that have Node.js v27.0.0-nightly but incompatible npm v12.1.0
3. **Other developer environments** that may not have v27 nightly

---

## 📋 Compatibility Matrix

| Environment | Node.js Version | npm Version | Status |
|-------------|-----------------|-------------|--------|
| **User's Local** | v27.0.0-nightly | Compatible | ✅ **WORKS** |
| **GitHub Actions** | Configurable (v27 default) | npm latest | ✅ **CONFIGURED** |
| **@protecor-kiar Agent** | v27.0.0-nightly | npm v12.1.0 | ❌ **INCOMPATIBLE** |
| **Standard CI/CD** | Typically v22/v24 LTS | npm latest | ⚠️ **NEEDS CONFIG** |

---

## 📋 npm v12.1.0 Supported Range
```
^22.22.2 || ^24.15.0 || >=26.0.0
```

**v27.0.0-nightly falls OUTSIDE this range** → causes "Missing script" errors in @protecor-kiar's environment.

---

## ✅ Resolution Strategy

### 1. CI/CD Configuration (DONE)
- **All workflows updated** to use Node.js v27 default
- **Minimum version check** added: `>= 21` (allows v21, v22, v24, v26, v27+)
- **Fails fast** with clear error if Node.js < 21

### 2. Local Development (USER'S ENV)
- User's v27 nightly works perfectly
- No changes needed for local development

### 3. CI/CD Environments
- GitHub Actions configured with `NODE_VERSION: "27"` 
- `actions/setup-node@v4` will install v27 on runners
- Minimum version check prevents accidental downgrade

---

## 📋 Action Items

| Item | Status | Owner |
|------|--------|-------|
| CI/CD Node.js v27 default | ✅ Done | @frankie |
| Minimum version check (>=21) | ✅ Done | @frankie |
| Workflow syntax fixes | ✅ Done | @frankie |
| **@protecor-kiar environment fix** | ⏳ **NEEDS ACTION** | @protecor-kiar |
| Branch cleanup (3 merged) | ⏳ Pending | @frankie |
| Phase 4 GREEN completion | 🟢 In Progress | @stackier |

---

## 🎯 Next Steps

1. **@protecor-kiar**: Fix local environment (install Node.js v22/v24 LTS, activate pnpm)
2. **@frankie**: Delete 3 merged branches, continue Phase 4
2. **@stackier**: Complete Phase 4 GREEN phase (banners)
3. **Phase 5**: Create `ux/simple-mode-phase1-local-model` for Routing Hint Cache

---

## 📋 Conclusion

**User's v27 nightly environment is FINE**. The incompatibility is isolated to:
- CI/CD runners that don't have v27 nightly pre-installed
- Agent environments with npm version mismatches

**Resolution**: CI/CD configured to install v27 explicitly, minimum version check prevents regressions. No changes needed to user's local workflow.
