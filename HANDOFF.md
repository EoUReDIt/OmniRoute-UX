# HANDOFF.md — Phase 6: Integration Tests

**Branch:** \`ux/simple-mode-phase1-integration-tests\` → \`release/v3.8.55\`
**Base Commit:** \`3fe48ca17b5ea301e527d200cfff16a0f06d6e2b\`
**Status:** 🔴 RED PHASE — Writing failing integration tests
**Updated:** 2026-11-19

---

## 🎯 Phase 6 Goal

Implement **Integration Tests** per \`docs/ux-simplification/PHASE1-feature-map-and-design.md\`:

1. **End-to-End Simple Mode Flow** — Toggle Simple/Full mode, verify UI changes
2. **Local Model Integration** — Guide prompt → local model → hint generation
3. **Hint Cache Integration** — Routing failure → cache store → hint display → breaker invalidation
4. **Feature Flag Persistence** — localStorage sync, SSR hydration, cross-tab sync
5. **Security Regression Tests** — Secret redaction, auth bypass attempts, rate limit enforcement
6. **Performance Baselines** — Toggle latency, hint generation time, cache hit/miss

---

## 🛡️ Security Gates (from @protecor-kiar)

### 🔴 CRITICAL — Secret Redaction
- [ ] Integration tests MUST verify no secrets in any response
- [ ] Guide prompt + local model + hint cache = boolean flags ONLY

### 🟠 HIGH — Feature Flag Security
- [ ] Tests verify \`localGuideEnabled\` OFF by default
- [ ] Tests verify \`localGuideModel\` allowlist enforcement
- [ ] Tests verify audit logging on every toggle

### 🟡 MEDIUM — Auth & Error Hygiene
- [ ] Tests verify \`requireAuth\` on all integration endpoints
- [ ] Tests verify \`sanitizeErrorMessage\` on error responses
- [ ] Tests verify rate limiting on guide/hint endpoints

---

## 🔴 RED Phase — Failing Integration Tests to Write

| Test | Path | Status |
|------|------|--------|
| Simple Mode Toggle E2E | \`tests/integration/simple-mode-toggle.test.ts\` | ⏳ Pending |
| Local Model Integration | \`tests/integration/local-model-integration.test.ts\` | ⏳ Pending |
| Hint Cache Integration | \`tests/integration/hint-cache-integration.test.ts\` | ⏳ Pending |
| Feature Flag Persistence | \`tests/integration/feature-flag-persistence.test.ts\` | ⏳ Pending |
| Security Regression | \`tests/integration/security-regression.test.ts\` | ⏳ Pending |
| Performance Baselines | \`tests/integration/performance-baselines.test.ts\` | ⏳ Pending |

---

## ✅ GREEN Phase Targets (for @stackier)

| Test | Implementation |
|------|----------------|
| Simple Mode Toggle | Playwright: toggle → verify sidebar, banners, routing hints |
| Local Model Integration | Vitest: guide prompt → local model → hint (boolean flags) |
| Hint Cache Integration | Vitest: failure → store → retrieve → breaker evict |
| Feature Flag Persistence | Playwright: localStorage ↔ server sync, SSR hydration |
| Security Regression | Vitest: secret redaction, auth bypass, rate limits |
| Performance Baselines | Custom: measure toggle latency, hint gen time, cache ops |

---

## 🔧 Test Infrastructure

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit/integration tests for logic |
| **Playwright** | E2E browser tests for UI flows |
| **MSW** | Mock service worker for API mocking |
| **Testcontainers** | SQLite for hint cache integration tests |

---

## 👥 Agent Coordination

| Agent | Role |
|-------|------|
| **@frankie** | Repo manager — GitHub gateway, PR workflow, HANDOFF.md |
| **@stackier** | Implementation — Integration test suites |
| **@protecor-kiar** | Security review — Secret redaction, feature flags, auth |
| **@jonin-le** | Skill governance — \`frontend-testing-patterns\`, \`test-driven-development\` |

---

## 📁 Current Branch State

- **Branch:** \`ux/simple-mode-phase1-integration-tests\`
- **Base:** \`release/v3.8.55\` (SHA \`3fe48ca17b5ea301e527d200cfff16a0f06d6e2b\`)
- **Commits:** 1 (this HANDOFF.md)

---

## 🔄 Next Actions

1. **@stackier** writes all 6 failing integration tests (RED phase)
2. **@protecor-kiar** reviews test assertions for security compliance
3. **@stackier** implements any missing integration infrastructure
4. **@protecor-kiar** reviews integration test coverage
5. **@frankie** merges to \`release/v3.8.55\`
6. **Release** — Version bump, changelog, Docker publish

---

## 📝 Notes

- Phase 1-5 complete and merged to \`release/v3.8.55\`
- Phase 6 validates **all 5 phases work together** in integration
- **Critical**: Every integration path must verify boolean flags ONLY
- **Critical**: Security regression tests must catch any secret leaks
- Performance baselines establish benchmarks for future regressions
