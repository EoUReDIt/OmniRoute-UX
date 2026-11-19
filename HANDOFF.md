# HANDOFF.md — Phase 4: Advanced Screen Banners

**Branch:** `ux/simple-mode-phase1-banners` → `release/v3.8.55`
**Base Commit:** `61ea2be701161e8a55f5400bc4be8f7b7605691e`
**Status:** 🔴 RED PHASE — Writing failing tests
**Updated:** 2026-11-19

---

## 🎯 Phase 4 Goal

Implement **Advanced Screen Banners** per `docs/ux-simplification/PHASE1-feature-map-and-design.md` (Section 13):

1. **Banner Text** — "This is an advanced screen"
2. **Action Buttons** — "Back to Home" / "Open in Full View"
3. **Banner Visibility** — Shows on advanced pages when in Simple Mode
4. **localStorage Integration** — "Open in Full View" writes `original` to localStorage
4. **Mode Integration** — Header Simple/Full toggle controls `dashboardUiMode`

---

## 🛡️ Security Gates (from @protecor-kiar)

### 🔴 CRITICAL — Secret Redaction
- Banner MUST NOT expose secrets
- No secret data in banner text or buttons

### 🟠 HIGH — Feature Flag Security
- `dashboardUiMode` defaults to `original` (missing = original)
- Explicit opt-in to Simple Mode
- Banner visibility gated by mode

### 🟡 MEDIUM — Auth & Error Hygiene
- Banner logic server-side accessible
- No auth bypass through Simple Mode

---

## 🔴 RED Phase — Failing Tests to Write

| Test | Path | Status |
|------|------|--------|
| Advanced Banner unit test | `src/components/__tests__/AdvancedBanner.test.tsx` | ⏳ Pending |
| Banner E2E test | `tests/e2e/advanced-banner.spec.ts` | ⏳ Pending |
| Banner visibility test | `tests/e2e/banner-visibility.spec.ts` | ⏳ Pending |
| Banner localStorage test | `tests/e2e/banner-localStorage.spec.ts` | ⏳ Pending |
| Banner a11y test | `tests/e2e/banner-a11y.spec.ts` | ⏳ Pending |

---

## ✅ GREEN Phase Targets (for @stackier)

| Component | Implementation |
|-----------|----------------|
| `AdvancedBanner.tsx` | Enhanced with mode gating, localStorage, actions |
| `useBannerVisibility.ts` | Hook for banner visibility logic |
| `tests/e2e/*.spec.ts` | Playwright E2E, a11y tests |

---

## 📋 Team Coordination

| Agent | Role |
|-------|------|
| **@frankie** | Repo manager — GitHub gateway, PR workflow, HANDOFF.md |
| **@stackier** | Frontend implementation — Banner component, hooks, tests |
| **@protecor-kiar** | Security review — Secret redaction, feature flags, auth |
| **@jonin-le** | Skill governance — `frontend-testing-patterns`, `popular-web-designs` |

---

## 🚫 Rules (Non-Negotiable)

1. **TDD enforced** — Tests written FIRST (RED), then minimal implementation (GREEN)
2. **Security gates** — All @protecor-kiar gates must pass before merge
3. **Zero upstream pushes** — Work only in fork `EoUReDIt/OmniRoute-UX`
4. **Single GitHub gateway** — All API mutations through @frankie
5. **Repo = single source of truth** — No local-only artifacts

---

## 📁 Current Branch State

- **Branch:** `ux/simple-mode-phase1-banners`
- **Base:** `release/v3.8.55` (SHA `61ea2be701161e8a55f5400bc4be8f7b7605691e`)
- **Commits:** 1 (this HANDOFF.md)

---

## 🔄 Next Actions

1. **@stackier** writes all 5 failing tests (RED phase)
2. **@protecor-kiar** reviews test assertions for security compliance
3. **@stackier** implements components to pass tests (GREEN phase)
4. **@protecor-kiar** reviews implementations
5. **@frankie** merges to `release/v3.8.55`
6. **Phase 5** begins: Local Model (Routing Hint Cache)

---

## 📝 Notes

- Phase 3 already created `src/components/AdvancedBanner.tsx` (basic)
- Phase 4 enhances it with full mode gating, localStorage, actions
- Design doc Section 13 defines banner behavior
- Existing `AdvancedBanner.tsx` from Phase 3 should be enhanced
