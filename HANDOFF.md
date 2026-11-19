# HANDOFF.md — Phase 2: UX Simple Mode Frontend

**Branch:** `ux/simple-mode-phase2-frontend` → `release/v3.8.55`
**Base Commit:** `790af231bc7fbde1da6a2657c87240cdc16f485d`
**Status:** 🔴 RED PHASE — Writing failing tests
**Updated:** 2026-11-19

---

## 🎯 Phase 2 Goal

Implement Frontend for UX Simple Mode per `docs/ux-simplification/PHASE1-feature-map-and-design.md`:

1. **Header Toggle** — Simple/Full mode switch in header
2. **localStorage Persistence** — Mode persists across reloads, cross-tab sync
3. **Advanced Screen Banner** — "This is an advanced screen" with "Back to Home" / "Open in Full View"
4. **Sidebar Section Visibility Gating** — Hide advanced sections in Simple mode
5. **Guide Prompt Construction** — Server-built from allowlisted DDT (boolean flags only)
6. **Vitest + Playwright Tests** — Unit, E2E, accessibility, visual regression

---

## 🛡️ Security Gates (from @protecor-kiar)

### 🔴 CRITICAL — Secret Redaction
- Guide prompt = boolean flags ONLY (`hasOidcClientSecret: true`, `hasEnterGraphClientSecret: true`, `mcpEnabled: true`, `transport: "streamable"`, `hasClientKey: true`, `lastQuestion: "..."`) — **never decrypted secrets**
- Server-side proxy if guide needs secrets (client never sees secrets)

### 🟠 HIGH — Feature Flag Security
- `localGuideEnabled` OFF by default, explicit opt-in, audit-logged
- `localGuideModel` validated against allowlist (no arbitrary model loading)
- Local model sandboxed (no network, no FS beyond weights, resource limits)

### 🟡 MEDIUM — Auth & Error Hygiene
- `requireAuth` on all new routes
- `sanitizeErrorMessage` strips stack traces, internal paths, config values, connection strings
- Rate limit `/api/settings` and guide endpoint aggressively

---

## 🔴 RED Phase — Failing Tests to Write

| Test | Path | Status |
|------|------|--------|
| Header Toggle unit test | `src/components/__tests__/ModeToggle.test.tsx` | ⏳ Pending |
| localStorage persistence unit test | `src/components/__tests__/localStorage-persistence.test.tsx` | ⏳ Pending |
| Advanced Banner unit test | `src/components/__tests__/AdvancedBanner.test.tsx` | ⏳ Pending |
| E2E Mode Toggle flow | `tests/e2e/mode-toggle.spec.ts` | ⏳ Pending |
| E2E Advanced Banner flow | `tests/e2e/advanced-banner.spec.ts` | ⏳ Pending |
| E2E localStorage persistence | `tests/e2e/localStorage-persistence.spec.ts` | ⏳ Pending |
| E2E Accessibility (a11y) | `tests/e2e/a11y.spec.ts` | ⏳ Pending |
| E2E Visual regression | `tests/e2e/visual.spec.ts` | ⏳ Pending |
| Guide Prompt unit test | `tests/unit/guide-prompt.test.ts` | ⏳ Pending |

---

## ✅ GREEN Phase Targets (for @stackier)

| Component | Implementation |
|-----------|----------------|
| `ModeToggle.tsx` | Header toggle with localStorage, cross-tab sync |
| `AdvancedBanner.tsx` | Banner with Back to Home / Open in Full View |
| `useLocalStorage.ts` | Hydration-safe localStorage hook |
| `sidebarVisibility.ts` | Section gating for Simple mode |
| `guide-prompt.ts` | Server-side DDT allowlist builder |
| `tests/e2e/*.spec.ts` | Playwright E2E, a11y, visual tests |

---

## 📋 Team Coordination

| Agent | Role |
|-------|------|
| **@frankie** | Repo manager — GitHub gateway, PR workflow, HANDOFF.md |
| **@stackier** | Frontend implementation — React/Next.js components, hooks, tests |
| **@protecor-kiar** | Security review — Secret redaction, feature flags, auth, rate limits |
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

- **Branch:** `ux/simple-mode-phase2-frontend`
- **Base:** `release/v3.8.55` (SHA `790af231bc7fbde1da6a2657c87240cdc16f485d`)
- **Commits:** 1 (this HANDOFF.md)

---

## 🔄 Next Actions

1. **@stackier** writes all 9 failing tests (RED phase)
2. **@protecor-kiar** reviews test assertions for security compliance
3. **@stackier** implements components to pass tests (GREEN phase)
4. **@protecor-kiar** reviews implementations
5. **@frankie** merges to `release/v3.8.55`
6. **Phase 3** begins: Integration/QA (end-to-end flows, auth verification, error sanitization)

---

## 📝 Notes

- Phase 1 backend complete and merged (PR #3)
- Using `frontend-testing-patterns` skill for Playwright, localStorage, a11y, visual regression patterns
- Using `popular-web-designs` for Linear/Vercel-style Header toggle and Banner component patterns
- Design doc: `docs/ux-simplification/PHASE1-feature-map-and-design.md`
