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
4. **Mode Integration** — "Open in Full View" writes `original` to localStorage
5. **Accessibility** — `role="alert"`, `aria-live="polite"`

---

## 🛡️ Security Gates (from @protecor-kiar)

### 🔴 CRITICAL — Secret Redaction
- Banner MUST NOT expose any secrets
- No secret data in banner text or buttons

### 🟠 HIGH — Feature Flag Security
- Banner only shows in Simple Mode (explicit opt-in)
- `dashboardUiMode` defaults to `original` (Full View)

### 🟡 MEDIUM — Auth & Error Hygiene
- No auth bypass through banner actions
- Rate limits apply to any banner-triggered endpoints

---

## 🔴 RED Phase — Failing Tests to Write

| Test | Path | Status |
|------|------|--------|
| Advanced Banner unit test | `src/components/__tests__/AdvancedBanner.test.tsx` | ⏳ Pending |
| Banner E2E flow test | `tests/e2e/advanced-banner.spec.ts` | ⏳ Pending |
| Banner accessibility test | `tests/e2e/a11y.spec.ts` (banner section) | ⏳ Pending |
| Banner visual regression | `tests/e2e/visual.spec.ts` (banner section) | ⏳ Pending |

---

## ✅ GREEN Phase Targets (for @stackier)

| Component | Implementation |
|-----------|----------------|
| `AdvancedBanner.tsx` | Banner with actions, hides in Full Mode |
| `useAdvancedBanner.ts` | Hook for banner visibility logic |
| `tests/e2e/*.spec.ts` | Playwright E2E, a11y, visual tests |

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

1. **@stackier** writes all 4 failing tests (RED phase)
2. **@protecor-kiar** reviews test assertions for security compliance
3. **@stackier** implements components to pass tests (GREEN phase)
4. **@protecor-kiar** reviews implementations
5. **@frankie** merges to `release/v3.8.55`
6. **Phase 5** begins: `ux/simple-mode-phase1-local-model` (Routing Hint Cache / Local Model)

---

## 📝 Phase Order (Updated)

| Phase | Scope | Status |
|-------|-------|--------|
| 1. Backend | Feature flags, auth, cache, rate limits | ✅ Merged |
| 2. Frontend | Header Toggle, localStorage, Banner (basic), Sidebar, Guide Prompt | ✅ Merged |
| 3. Sidebar Gating | Enhanced sidebar visibility, protected items | ✅ Merged |
| **4. Banners** | **Advanced screen banners, actions, visibility** | 🔴 **ACTIVE** |
| **5. Local Model** | **Routing Hint Cache (GLiNER + Qwen)** | ⏳ Next |
| **6. Integration Tests** | **Full Vitest + Playwright suite** | ⏳ Last |

---

## 📝 Notes

- Phase 2 already created basic `AdvancedBanner.tsx` — Phase 4 enhances with full visibility logic, actions, and tests
- Design doc Section 13 defines banner behavior
- Phase 5 (Local Model) already implemented as standalone module in `C:/Users/michaela/routing_hint_cache/`
- Phase 6 (Integration Tests) runs after all features complete
