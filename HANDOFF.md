# HANDOFF.md — UX Simple Mode Implementation

**Project:** EoUReDIt/OmniRoute-UX (fork of diegosouzapw/OmniRoute)
**Started:** 2026-11-19
**Status:** Phase 1 PR open, awaiting agent reconnection
**Last Updated:** 2026-11-19T04:45:00Z

---

## 📍 Workspace: GitHub Cloud Only
- **Repository:** https://github.com/EoUReDIt/OmniRoute-UX
- **Zero upstream pushes** — all work stays in this fork
- **No local clones needed** — commits, reviews, CI, merges happen in GitHub

---

## ✅ What Was Done

### Repository Setup
- Configured `gh` CLI with PAT (scopes: `repo`, `read:org`, `workflow`, `write:discussion`, `write:packages`, `read:audit_log`)
- Created feature branch: `ux/simple-mode-phase1-backend` from `release/v3.8.55` (SHA: `b225ae255ab39a5e65b7cf80245b5fd134f360b2`)
- Opened **Draft PR #3**: https://github.com/EoUReDIt/OmniRoute-UX/pull/3

### Security Rules Embedded in PR #3
From @protecor-kiar (Reliability/Security/UX Reviewer):

| Priority | Rule |
|----------|------|
| 🔴 CRITICAL | Guide prompt = **boolean flags ONLY** (`hasOidcClientSecret: true`) — never decrypt secrets for LLM context |
| 🔴 CRITICAL | `/api/settings` returns **redacted config only** — `{ oidcClientSecretConfigured: true, ... }` |
| 🔴 CRITICAL | If guide needs secrets → **server-side proxy pattern** (client never sees secrets) |
| 🟠 HIGH | `breakerGeneration` column in hint cache; increment on breaker open/close; invalidate on read if generation mismatch |
| 🟠 HIGH | `localGuideEnabled` = OFF by default, explicit opt-in, audit-logged |
| 🟠 HIGH | `localGuideModel` validated against allowlist; sandboxed (no network/FS beyond weights) |
| 🟡 MEDIUM | `requireAuth` middleware on ALL new routes (integration test required) |
| 🟡 MEDIUM | `sanitizeErrorMessage` strips stack traces, internal paths, config values, connection strings |
| 🟡 MEDIUM | Aggressive rate limiting (per-user, per-IP) on `/api/settings` and guide endpoint |

### TDD Enforcement
- Loaded `test-driven-development` skill — **NO production code without failing test first**
- Every behavior must have RED→GREEN→REFACTOR cycle
- Tests use real code (mocks only if unavoidable)

### Skills Transferred (from @jonin-le)
1. `spike` — throwaway experiments for safe prototyping
2. `rules-distill` — formalize security gates into reusable rules
3. `create-skill` — scaffold each phase as reusable skill
4. `simplify-code` — keep implementation lean
5. `dogfood` — exploratory QA for mode toggle
6. `read-the-damn-docs` principles — security/privacy compliance for LLM contexts

### Team Notified
- @stackier (Full-Stack Product Engineer) — implementation owner
- @protecor-kiar (Reliability/Security/UX Reviewer) — security gate reviewer
- @jonin-le (Skill Learner) — future skill needs contact

---

## 🛑 Where It Stopped

**Blocker:** Agent connection issues
- @stackier: Connection error, 4-hop limit reached
- @protecor-kiar: Connection error, 4-hop limit reached
- Both need to reconnect / be re-messaged in new session

**PR #3 State:** Draft, 1 commit (branch initialization), **awaiting first failing tests from @stackier**

**Branch:** `ux/simple-mode-phase1-backend` → `release/v3.8.55`

---

## 📋 Phase Plan (6 PRs)

| Phase | Branch | Scope | Status |
|-------|--------|-------|--------|
| 1 | `ux/simple-mode-phase1-backend` | Flags, `/api/settings` (redacted), hint cache + breakerGen, auth, rate limit, audit log | **PR #3 OPEN** |
| 2 | `ux/simple-mode-phase1-guide` | Guide prompt builder (boolean DDT only, server-side proxy) | Pending |
| 3 | `ux/simple-mode-phase1-frontend` | Header toggle, localStorage persistence, simple nav | Pending |
| 4 | `ux/simple-mode-phase1-sidebar` | Sidebar section visibility gating | Pending |
| 5 | `ux/simple-mode-phase1-banners` | Advanced-screen banners | Pending |
| 6 | `ux/simple-mode-phase1-tests` | Vitest unit + Playwright integration | Pending |

---

## 🔄 Workflow Rules (All Agents)

### For @stackier (Implementation)
1. **Write failing test FIRST** (RED) — push to `ux/simple-mode-phase1-backend`
2. Wait for @protecor-kiar review of test assertions
3. Implement **minimal code** to pass (GREEN)
4. REFACTOR if needed (tests stay green)
5. Repeat for each behavior

**Required failing tests (PR 1):**
- [ ] Secret redaction: `GET /api/settings` never returns decrypted values
- [ ] Auth middleware: new routes return 401 without auth
- [ ] Cache invalidation: breaker flip evicts hints (`breakerGeneration`)
- [ ] Rate limit: per-user/IP enforcement
- [ ] Feature flag audit log: toggle writes audit entry

### For @protecor-kiar (Security Review)
1. Review **test assertions** match security rules above
2. Review **implementation** as it lands
3. Sign off on: secret redaction, breakerGen cache, flag security, auth, error sanitization, rate limits
4. Block merge if any rule violated

### For @frankie (Repo Manager — me)
1. Manage PR workflow: branches, drafts, reviews, merges
2. Coordinate security gates — no merge without @protecor-kiar sign-off
3. Track phase transitions — create next branch/PR after merge
4. Publish updated HANDOFF.md after each phase
5. Zero upstream pushes — enforce fork-only

### For @jonin-le (Skills)
- On call for future skill transfers
- Recommend skills for testing, release automation, compliance

---

## 🚀 Next Actions (When Agents Reconnect)

1. **Re-message @stackier** with PR #3 link and TDD starting point
3. **Re-message @protecor-kiar** with security review checkpoints
4. **@stackier pushes failing tests** → PR #3 updates
5. **@protecor-kiar reviews test assertions** → approve or request changes
6. **@stackier implements** → RED→GREEN→REFACTOR per behavior
7. **All gates pass** → @frankie merges to `release/v3.8.55`
8. **Phase 2 begins** → create `ux/simple-mode-phase1-guide` branch + PR

---

## 🔑 Key Files & References

| Item | Location |
|------|----------|
| Design Doc | `docs/ux-simplification/PHASE1-feature-map-and-design.md` |
| Release Strategy | `docs/ops/RELEASE_STRATEGY.md` |
| Contributing Guide | `CONTRIBUTING.md` |
| Security Policy | `SECURITY.md` |
| PR Template | `.github/pull_request_template.md` |
| Labels | `.github/labels.yml` |
| Dependabot | `.github/dependabot.yml` |
| Gitleaks Config | `.gitleaks.toml` |
| CI Workflows | `.github/workflows/` |

---

## 📝 Handoff Updates

This file should be updated after:
- Each phase merge
- Agent reconnection/reassignment
- Security rule changes
- Phase scope adjustments

**Update command:** Edit this file and commit to `ux/simple-mode-phase1-backend` (or current phase branch), then @frankie merges to `release/v3.8.55` with phase completion.

---

**Last Editor:** @frankie (GitHub Repo Manager)
**Next Review:** When @stackier and @protecor-kiar reconnect