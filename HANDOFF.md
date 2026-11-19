# HANDOFF.md — Phase 3: Sidebar Section Visibility Gating

**Branch:** `ux/simple-mode-phase3-sidebar` → `release/v3.8.55`
**Base Commit:** `043e830aa55c81ac72c8ef4d9ed569abfc4d1fcf`
**Status:** 🔴 RED PHASE — Writing failing tests
**Updated:** 2026-11-19

---

## 🎯 Phase 3 Goal

Complete Sidebar Section Visibility Gating per `docs/ux-simplification/PHASE1-feature-map-and-design.md`:

1. **Sidebar Sections Hidden in Simple Mode** — Only "Essentials" sections visible
2. **Sidebar Sections Shown in Full Mode** — All 10 sections visible (Home, OmniProxy, Analytics, Costs, Monitoring, Dev Tools, Agentic Features, Other Features, Configuration, Help)
3. **Protected Items Always Visible** — `proxy` and `settings-sidebar` cannot be hidden (from `PROTECTED_SIDEBAR_ITEM_IDS`)
4. **PATCH `/api/settings` Mode Toggle** — `dashboardUiMode` toggles between `simple` and `original` (Full)
5. **Round-trip PATCH** — `simple` ↔ `original` leaves `hiddenSidebarItems` and `sidebarActivePreset` untouched

---

## 🛡️ Security Gates (from @protecor-kiar)

### 🔴 CRITICAL — Secret Redaction
- [ ] Guide prompt = boolean flags ONLY (never decrypted secrets)
- [ ] Server-side proxy if guide needs secrets

### 🟠 HIGH — Feature Flag Security
- [ ] `localGuideEnabled` OFF by default, explicit opt-in, audit-logged
- [ ] `localGuideModel` validated against allowlist

### 🟡 MEDIUM — Auth & Error Hygiene
- [ ] `requireAuth` on new routes
- [ ] `sanitizeErrorMessage` on all new endpoints
- [ ] Rate limiting on guide endpoint

---

## 🔴 RED Phase — Failing Tests to Write

| Test | Path | Status |
|------|------|--------|
| Sidebar visibility unit test | `src/lib/__tests__/sidebar-visibility.test.ts` | ⏳ Pending |
| Sidebar PATCH round-trip test | `src/app/api/settings/__tests__/mode-toggle.test.ts` | ⏳ Pending |
| E2E sidebar visibility flow | `tests/e2e/sidebar-visibility.spec.ts` | ⏳ Pending |
| E2E mode toggle round-trip | `tests/e2e/mode-roundtrip.spec.ts` | ⏳ Pending |

---

## ✅ GREEN Phase Targets (for @stackier)

| Component | Implementation |
|-----------|----------------|
| `sidebarVisibility.ts` | Enhanced: `useSidebarSections()` returns filtered sections based on mode |
| `Sidebar.tsx` | Integration: consumes `useSidebarSections()` |
| `/api/settings` PATCH | Handles `dashboardUiMode` toggle, preserves `hiddenSidebarItems` and `sidebarActivePreset` |
| `mode-toggle.test.ts` | Unit test for PATCH round-trip |
| `sidebar-visibility.spec.ts` | E2E test for sidebar filtering |

---

## 📋 Team Coordination

| Agent | Role |
|-------|------|
| **@frankie** | Repo manager — GitHub gateway, PR workflow, HANDOFF.md |
| **@stackier** | Frontend implementation — Sidebar gating, PATCH handler, tests |
| **@protecor-kiar** | Security review — No auth bypass, no secret leakage, feature flags default OFF |
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

- **Branch:** `ux/simple-mode-phase3-sidebar`
- **Base:** `release/v3.8.55` (SHA `043e830aa55c81ac72c8ef4d9ed569abfc4d1fcf`)
- **Commits:** 1 (this HANDOFF.md)

---

## 🔄 Next Actions

1. **@stackier** writes 4 failing tests (RED phase)
2. **@protecor-kiar** reviews test assertions for security compliance
3. **@stackier** implements components to pass tests (GREEN phase)
4. **@protecor-kiar** reviews implementations
5. **@frankie** merges to `release/v3.8.55`
6. **Phase 4** begins: `ux/simple-mode-phase4-banners`

---

## 📝 Notes

- Phase 1 backend complete and merged (PR #3)
- Phase 2 frontend complete and merged (PR #4)
- Using `frontend-testing-patterns` skill for Playwright, localStorage, a11y, visual regression patterns
- Using `popular-web-designs` for Linear/Vercel-style component patterns
- Design doc: `docs/ux-simplification/PHASE1-feature-map-and-design.md` (Sections 2.3, 6.3, 6.4, 9)
