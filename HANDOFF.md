# HANDOFF.md — Phase 5: Local Model / Routing Hint Cache

**Branch:** `ux/simple-mode-phase1-local-model` → `release/v3.8.55`
**Base Commit:** `ea3a039366178fa60cf1823baa31c206042dfd17`
**Status:** 🔴 RED PHASE — Writing failing tests
**Updated:** 2026-11-19

---

## 🎯 Phase 5 Goal

Implement **Local Model / Routing Hint Cache** per `docs/ux-simplification/PHASE1-feature-map-and-design.md` (Section 7):

1. **Routing Hint Cache** — SQLite cache for provider failure hints
2. **Local Guide Model** — Optional local model (<1B params) for setup assistance
3. **Feature Flags** — `localGuideEnabled` (OFF by default), `localGuideModel` (validated allowlist)
4. **Guide Prompt Construction** — Server-side, boolean flags ONLY (no secrets)
5. **Hint Cache Schema** — `connectionId`, `hint`, `expiresAt`, `breakerGeneration`

---

## 🛡️ Security Gates (from @protecor-kiar)

### 🔴 CRITICAL — Secret Redaction
- Guide prompt = boolean flags ONLY (`hasOidcClientSecret`, `hasEnterGraphClientSecret`, `mcpEnabled`, `transport`, `hasClientKey`, `lastQuestion`) — **never decrypted secrets**
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
| Hint Cache unit test | `src/lib/cache/__tests__/hintCache.test.ts` | ⏳ Pending |
| Hint Cache integration test | `tests/e2e/hintCache.spec.ts` | ⏳ Pending |
| Guide Prompt unit test | `tests/unit/guide-prompt.test.ts` | ⏳ Pending |
| Local Model unit test | `src/lib/localModel/__tests__/localModel.test.ts` | ⏳ Pending |
| Feature Flag audit test | `src/lib/audit/__tests__/featureFlagAudit.test.ts` | ⏳ Pending |
| Routing Hint E2E test | `tests/e2e/routingHint.spec.ts` | ⏳ Pending |

---

## ✅ GREEN Phase Targets (for @stackier)

| Component | Implementation |
|-----------|----------------|
| `hintCache.ts` | SQLite cache with `breakerGeneration` invalidation |
| `guidePrompt.ts` | Boolean flags ONLY prompt builder |
| `localModel.ts` | Local model loader (sandboxed, OFF by default) |
| `featureFlags.ts` | `localGuideEnabled`, `localGuideModel` with audit |
| `tests/unit/guide-prompt.test.ts` | Boolean flags ONLY tests |
| `tests/e2e/routingHint.spec.ts` | E2E routing hint flow |

---

## 📋 Team Coordination

| Agent | Role |
|-------|------|
| **@frankie** | Repo manager — GitHub gateway, PR workflow, HANDOFF.md |
| **@stackier** | Implementation — SQLite cache, guide prompt, local model |
| **@protecor-kiar** | Security review — Secret redaction, feature flags, auth |
| **@jonin-le** | Skill governance — `frontend-testing-patterns`, `rate-limit-governance` |

---

## 🚫 Rules (Non-Negotiable)

1. **TDD enforced** — Tests written FIRST (RED), then minimal implementation (GREEN)
2. **Security gates** — All @protecor-kiar gates must pass before merge
3. **Zero upstream pushes** — Work only in fork `EoUReDIt/OmniRoute-UX`
4. **Single GitHub gateway** — All API mutations through @frankie
5. **Repo = single source of truth** — No local-only artifacts

---

## 📁 Current Branch State

- **Branch:** `ux/simple-mode-phase1-local-model`
- **Base:** `release/v3.8.55` (SHA `ea3a039366178fa60cf1823baa31c206042dfd17`)
- **Commits:** 1 (this HANDOFF.md)

---

## 🔄 Next Actions

1. **@stackier** writes all 6 failing tests (RED phase)
2. **@protecor-kiar** reviews test assertions for security compliance
3. **@stackier** implements components to pass tests (GREEN phase)
4. **@protecor-kiar** reviews implementations
5. **@frankie** merges to `release/v3.8.55`
6. **Phase 6** begins: `ux/simple-mode-phase1-integration-tests`

---

## 📝 Notes

- Phase 1-4 complete and merged
- Phase 5 focuses on **local model + routing hint cache** (Section 7 of design doc)
- **Critical**: Guide prompt MUST use boolean flags ONLY — no decrypted secrets
- Local model: Qwen3-0.6B approved, OFF by default, sandboxed
- Routing hint cache: SQLite, `breakerGeneration` invalidation, async worker
