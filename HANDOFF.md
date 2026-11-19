# HANDOFF.md — Phase 4: Advanced Screen Banners

**Branch:** `ux/simple-mode-phase1-banners` → `release/v3.8.55`
**Base Commit:** `61ea2be701161e8a55f5400bc4be8f7b7605691e`
**Status:** 🔴 RED PHASE — Writing failing tests
**Updated:** 2026-11-19

---

## 🎯 Phase 4 Goal

Implement **Advanced Screen Banners** per `docs/ux-simplification/PHASE1-feature-map-and-design.md` (Section 13):

1. **Banner Component** — "This is an advanced screen" message
2. **Action Buttons** — "Back to Home" / "Open in Full View"
3. **Visibility Logic** — Show only on advanced pages in Simple Mode
4. **Mode Integration** — "Open in Full View" writes `original` to localStorage, navigates to `/`
5. **Banner Variants** — Per-page customization support

---

## 🛡️ Security Gates (from @protecor-kiar)

### 🔴 CRITICAL — Secret Redaction
- Banner MUST NOT expose secrets or config values
- No secret data in banner text or action handlers

### 🟠 HIGH — Feature Flag Security
- `dashboardUiMode` defaults to `original` (missing = original)
- "Open in Full View" writes `original` to localStorage (per design doc)
- Explicit opt-in to Simple Mode required

### 🟡 MEDIUM — Auth & Error Hygiene
- Banner action handlers use existing auth guards
- No auth bypass through banner interactions
- Error messages sanitized via `sanitizeErrorMessage`

---

## 🔴 RED Phase — Failing Tests to Write

| Test | Path | Status |
|------|------|--------|
| Banner unit test | `src/components/__tests__/AdvancedBanner.test.tsx` | ⏳ Pending |
| Banner E2E test | `tests/e2e/advanced-banner.spec.ts` | ⏳ Pending |
| Banner visibility test | `tests/e2e/banner-visibility.spec.ts` | ⏳ Pending |
| Banner action test | `tests/e2e/banner-actions.spec.ts` | ⏳ Pending |
| Banner mode integration test | `tests/e2e/banner-mode-integration.spec.ts` | ⏳ Pending |

---

## ✅ GREEN Phase Targets (for @stackier)

| Component | Implementation |
|-----------|----------------|
| `AdvancedBanner.tsx` | Banner with message + action buttons |
| `useBannerVisibility.ts` | Hook for banner visibility logic |
| `bannerActions.ts` | Action handlers (Back to Home, Open in Full View) |
| `tests/e2e/*.spec.ts` | Playwright E2E tests |

---

## 📋 Team Coordination

| Agent | Role |
|-------|------|
| **@frankie** | Repo manager — GitHub gateway, PR workflow, HANDOFF.md |
| **@stackier** | Frontend implementation — Banner component, hooks, actions |
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
6. **Phase 5** begins: `ux/simple-mode-phase1-local-model` (Local Model / Routing Hint Cache)

---

## 📝 Notes

- Phase 3 already created `AdvancedBanner.tsx` (basic) — Phase 4 enhances it
- Phase 2 created `useLocalStorage.ts` hook — reuse for banner localStorage
- Design doc Section 13 defines banner behavior
- Phase 5 will integrate the Routing Hint Cache (local model) from `C:/Users/michaela/routing_hint_cache/`
