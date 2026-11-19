# HANDOFF.md — Phase 3: Sidebar Section Visibility Gating

**Branch:** `ux/simple-mode-phase1-sidebar` → `release/v3.8.55`
**Base Commit:** `be8c3b3c65ac37368fe2b7466256a6a5e6338904`
**Status:** 🔴 RED PHASE — Writing failing tests
**Updated:** 2026-11-19

---

## 🎯 Phase 3 Goal

Complete **Sidebar Section Visibility Gating** per `docs/ux-simplification/PHASE1-feature-map-and-design.md`:

1. **Sidebar Sections** — Hide advanced sections in Simple Mode (Dev Tools, Agentic Features, Other Features, Configuration, Help)
2. **Protected Items** — `proxy` and `settings-sidebar` always visible (`PROTECTED_SIDEBAR_ITEM_IDS`)
3. **Short Nav** — Only show `ESSENTIALS_SIMPLE_ITEMS` in Simple Mode
4. **Full View** — All sections visible, presets work as before
5. **Toggle Integration** — Header Simple/Full toggle controls `dashboardUiMode`

---

## 🛡️ Security Gates (from @protecor-kiar)

### 🔴 CRITICAL — Secret Redaction
- Sidebar gating MUST NOT expose secrets
- No secret data in sidebar items or visibility logic

### 🟠 HIGH — Feature Flag Security
- `dashboardUiMode` defaults to `original` (missing = original)
- Explicit opt-in to Simple Mode
- Toggle writes to localStorage, audit-logged

### 🟡 MEDIUM — Auth & Error Hygiene
- Sidebar gating logic server-side accessible
- No auth bypass through Simple Mode

---

## 🔴 RED Phase — Failing Tests to Write

| Test | Path | Status |
|------|------|--------|
| Sidebar visibility unit test | `src/lib/__tests__/sidebarVisibility.test.ts` | ⏳ Pending |
| Sidebar gating E2E test | `tests/e2e/sidebar-gating.spec.ts` | ⏳ Pending |
| Protected items test | `tests/e2e/protected-sidebar-items.spec.ts` | ⏳ Pending |
| Simple nav test | `tests/e2e/simple-nav.spec.ts` | ⏳ Pending |
| Full view test | `tests/e2e/full-view.spec.ts` | ⏳ Pending |

---

## ✅ GREEN Phase Targets (for @stackier)

| Component | Implementation |
|-----------|----------------|
| `sidebarVisibility.ts` | Enhanced with section gating logic |
| `useSidebarVisibility.ts` | Hook for section visibility |
| `Sidebar.tsx` modifications | Apply visibility gating |
| `tests/e2e/*.spec.ts` | Playwright E2E tests |

---

## 📋 Team Coordination

| Agent | Role |
|-------|------|
| **@frankie** | Repo manager — GitHub gateway, PR workflow, HANDOFF.md |
| **@stackier** | Frontend implementation — Sidebar gating, visibility logic |
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

- **Branch:** `ux/simple-mode-phase1-sidebar`
- **Base:** `release/v3.8.55` (SHA `be8c3b3c65ac37368fe2b7466256a6a5e6338904`)
- **Commits:** 1 (this HANDOFF.md)

---

## 🔄 Next Actions

1. **@stackier** writes all 5 failing tests (RED phase)
2. **@protecor-kiar** reviews test assertions for security compliance
3. **@stackier** implements components to pass tests (GREEN phase)
4. **@protecor-kiar** reviews implementations
5. **@frankie** merges to `release/v3.8.55`
6. **Phase 4** begins: `ux/simple-mode-phase1-banners`

---

## 📝 Notes

- Phase 2 already created `src/lib/sidebarVisibility.ts` (basic hook)
- Phase 3 enhances it with full section gating logic
- Design doc Section 2.3 defines `SIDEBAR_SECTIONS` (10 sections)
- Design doc Section 5 defines `ESSENTIALS_SIMPLE_ITEMS` and `PROTECTED_SIDEBAR_ITEM_IDS`
